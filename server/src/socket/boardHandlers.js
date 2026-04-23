import { verifyAccessToken } from '../config/jwt.js';
import User from '../models/User.model.js';
import Board from '../models/Board.model.js';
import {
  getOrCreateRoom,
  destroyRoom,
} from './YjsRoom.js';

// How long a room stays alive after last user disconnects (ms)
const ROOM_GC_DELAY = 5 * 60 * 1000; // 5 minutes
const gcTimers = new Map();

// ── Socket auth middleware with better error handling ────────────
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    
    if (!token) {
      const error = new Error('NO_TOKEN');
      error.data = { content: 'Authentication token required' };
      return next(error);
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (tokenErr) {
      const error = new Error('INVALID_TOKEN');
      error.data = { content: `Token verification failed: ${tokenErr.message}` };
      return next(error);
    }

    const user = await User.findById(decoded.sub).select('-password -refreshTokens');
    
    if (!user) {
      const error = new Error('USER_NOT_FOUND');
      error.data = { content: 'User not found' };
      return next(error);
    }

    if (!user.isActive) {
      const error = new Error('USER_INACTIVE');
      error.data = { content: 'User account is inactive' };
      return next(error);
    }

    socket.user = user;
    socket.userId = user._id.toString();
    next();
  } catch (err) {
    const error = new Error('AUTH_ERROR');
    error.data = { content: `Authentication error: ${err.message}` };
    next(error);
  }
};

// ── Main init ─────────────────────────────────────────────────
export const initSocket = (io) => {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userName = socket.user?.name || 'Unknown';
    console.log(` [Socket] ${userName} connected (${socket.id})`);

    // ── JOIN ROOM ───────────────────────────────────────────
    socket.on('room:join', async ({ roomId }) => {
      try {
        const board = await Board.findById(roomId);
        if (!board) {
          socket.emit('room:error', { message: 'Board not found.' });
          console.warn(`[room:join] Board ${roomId} not found for user ${socket.user.name}`);
          return;
        }

        // Cancel pending GC
        if (gcTimers.has(roomId)) {
          clearTimeout(gcTimers.get(roomId));
          gcTimers.delete(roomId);
        }

        const room = getOrCreateRoom(roomId);

        // Restore state if room freshly created
        if (room.size === 0 && board.yjsState) {
          room.restoreState(board.yjsState);
        } else if (room.size === 0 && board.canvasData) {
          room.setCanvasData(board.canvasData);
        }

        room.addSocket(socket);
        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.yjsRoom     = room;

        // Bootstrap new client with full Yjs doc state efficiently
        room.sendSyncStep1(socket);
        room.sendAwareness(socket);

        // Fetch all sockets in room for user list
        const connectedSockets = await io.in(roomId).fetchSockets();
        const users = connectedSockets
          .filter((s) => s.user)
          .map((s) => ({
            socketId:    s.id,
            userId:      s.user._id.toString(),
            name:        s.user.name,
            cursorColor: s.user.cursorColor,
          }));

        socket.emit('room:joined', {
          boardId:    roomId,
          users,
          boardTitle: board.title,
          roomCode:   board.roomCode,
        });

        socket.to(roomId).emit('room:user-joined', {
          socketId:    socket.id,
          userId:      socket.user._id.toString(),
          name:        socket.user.name,
          cursorColor: socket.user.cursorColor,
        });

        console.log(` [Room:${roomId}] ${socket.user.name} joined (${room.size} users)`);

        // Track collaborator non-blocking
        const isOwner = board.owner.toString() === socket.user._id.toString();
        const isCollab = board.collaborators.some(
          (c) => c.user?.toString() === socket.user._id.toString()
        );
        if (!isOwner && !isCollab) {
          Board.findByIdAndUpdate(roomId, {
            $push: { collaborators: { user: socket.user._id } },
          }).exec().catch(err => console.error('[collab:track]', err.message));
        }
      } catch (err) {
        console.error(`[room:join] error for user ${socket.user.name}:`, err.message);
        socket.emit('room:error', { message: 'Failed to join room.' });
      }
    });

    // ── YJS BINARY MESSAGES with error isolation ────────────
    socket.on('yjs:message', (message) => {
      const room = socket.yjsRoom;
      if (!room) {
        console.warn('[yjs:message] No current room for socket', socket.id);
        return;
      }
      try {
        const uint8 = message instanceof Uint8Array
          ? message
          : new Uint8Array(message);
        const reply = room.handleMessage(socket, uint8);
        if (reply) socket.emit('yjs:message', reply);
      } catch (err) {
        console.error('[yjs:message] Error processing Yjs message:', err.message);
        // Don't emit error to client — just log and continue
      }
    });

    // ── PERSIST canvas state ────────────────────────────────
    socket.on('canvas:save', async ({ canvasJSON }) => {
      const room = socket.yjsRoom;
      if (!room || !socket.currentRoom) return;
      try {
        const board = await Board.findById(socket.currentRoom).select('owner collaborators');
        if (!board) return;

        const isOwner = board.owner.toString() === socket.user._id.toString();
        const isCollaborator = board.collaborators.some(
          (c) => c.user?.toString() === socket.user._id.toString()
        );

        if (!isOwner && !isCollaborator) {
          console.warn(`[canvas:save] Unauthorized save attempt by ${socket.user.name}`);
          return;
        }

        const update = {
          yjsState:       room.serializeState(),
          lastModifiedBy: socket.user._id,
        };
        if (canvasJSON) update.canvasData = canvasJSON;
        await Board.findByIdAndUpdate(socket.currentRoom, update);
      } catch (err) {
        console.error('[canvas:save]', err.message);
      }
    });

    // ── CURSOR (bypasses Yjs for raw speed) ─────────────────
    socket.on('cursor:move', ({ x, y }) => {
      if (!socket.currentRoom) return;
      if (typeof x !== 'number' || !Number.isFinite(x) || 
          typeof y !== 'number' || !Number.isFinite(y)) {
        return;
      }
      socket.to(socket.currentRoom).emit('cursor:moved', {
        socketId:    socket.id,
        userId:      socket.user._id.toString(),
        name:        socket.user.name,
        cursorColor: socket.user.cursorColor,
        x, y,
      });
    });

    // ── BOARD TITLE live sync ────────────────────────────────
    socket.on('board:title-update', async ({ title }) => {
      if (!socket.currentRoom) return;
      try {
        const board = await Board.findById(socket.currentRoom).select('owner');
        if (!board || board.owner.toString() !== socket.user._id.toString()) {
          return;
        }
        socket.to(socket.currentRoom).emit('board:title-updated', { title });
      } catch (err) {
        console.error('[board:title-update]', err.message);
      }
    });

    // ── LEAVE / DISCONNECT ──────────────────────────────────
    socket.on('room:leave',  () => handleLeave(socket, io));
    socket.on('disconnect',  (reason) => {
      handleLeave(socket, io);
      console.log(` [Socket] ${userName} disconnected (reason: ${reason})`);
    });
  });
};

// ── Leave handler ─────────────────────────────────────────────
const handleLeave = async (socket, io) => {
  const roomId = socket.currentRoom;
  if (!roomId) return;

  const room = socket.yjsRoom;
  if (room) {
    room.removeSocket(socket.id);

    if (room.size === 0) {
      // Schedule GC + persistence when last user leaves
      const timer = setTimeout(async () => {
        try {
          const state = room.serializeState();
          if (state) {
            await Board.findByIdAndUpdate(roomId, { yjsState: state });
            console.log(` [Room:${roomId}] State persisted (no active users)`);
          }
        } catch (err) {
          console.error('[room:gc]', err.message);
        } finally {
          destroyRoom(roomId);
          gcTimers.delete(roomId);
        }
      }, ROOM_GC_DELAY);
      gcTimers.set(roomId, timer);
    }
  }

  socket.to(roomId).emit('room:user-left', {
    socketId: socket.id,
    userId:   socket.user?._id?.toString(),
    name:     socket.user?.name,
  });

  socket.leave(roomId);
  socket.currentRoom = null;
  socket.yjsRoom     = null;
};
