import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness.js';
import { fabric } from 'fabric';
import { getSocket, connectSocket } from '../utils/socket';
import { SocketYjsProvider } from '../utils/SocketYjsProvider';
import { useAuth } from '../context/AuthContext';

// Debounce save triggers (ms)
const SAVE_DEBOUNCE = 2500;

// How often we flush canvas → Yjs (ms) — only on actual changes
const CANVAS_SYNC_DEBOUNCE = 80;

/**
 * useCollaboration
 * ----------------
 * The central Phase 3 hook. Connects everything:
 *   Fabric.js canvas ←→ Y.Map (shared canvas state)
 *   Y.Doc ←→ SocketYjsProvider ←→ Socket.io ←→ Server ←→ Other clients
 *   Y.Awareness ←→ Live cursors + presence
 *
 * @param {string}   boardId    - MongoDB board _id
 * @param {object}   fabricRef  - Ref to fabric.Canvas instance
 * @param {boolean}  isCanvasReady - Flag indicating fabric is ready
 */
const useCollaboration = ({ boardId, fabricRef, isCanvasReady, onSave }) => {
  const { user } = useAuth();

  // Yjs internals
  const ydocRef      = useRef(null);
  const providerRef  = useRef(null);
  const yCanvasRef   = useRef(null); // Y.Map<'data', string>

  // State
  const [isConnected,    setIsConnected]    = useState(false);
  const [isSynced,       setIsSynced]       = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [remoteCursors,  setRemoteCursors]  = useState(new Map());

  // Sync control
  const applyingRemoteRef  = useRef(false); // prevents echo loop
  const canvasSyncTimer    = useRef(null);
  const saveTimer          = useRef(null);
  const lastCanvasHash     = useRef(null);   // skip unchanged syncs
  const containerRef       = useRef(null);   // set by board page

  // ── Init Yjs + Provider ────────────────────────────────────
  useEffect(() => {
    if (!boardId || !user) return;

    const socket = connectSocket();

    // Create Y.Doc
    const ydoc       = new Y.Doc();
    const awareness  = new awarenessProtocol.Awareness(ydoc);
    const yCanvas    = ydoc.getMap('canvas');

    ydocRef.current   = ydoc;
    yCanvasRef.current = yCanvas;

    // Create provider
    const provider = new SocketYjsProvider(socket, ydoc, { awareness });
    providerRef.current = provider;

    // Set our own presence
    awareness.setLocalState({
      user: {
        id:          user._id,
        name:        user.name,
        cursorColor: user.cursorColor,
      },
      cursor: null,
    });

    // ── Provider events ────────────────────────────────────
    provider.on('synced', () => {
      setIsSynced(true);
    });

    // ── Socket room events ─────────────────────────────────
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => {
      setIsConnected(false);
      setIsSynced(false);
      setConnectedUsers([]);
      setRemoteCursors(new Map());
    };

    const onRoomJoined = ({ users }) => {
      setConnectedUsers(users);
    };

    const onUserJoined = (userInfo) => {
      setConnectedUsers((prev) => {
        if (prev.find((u) => u.socketId === userInfo.socketId)) return prev;
        return [...prev, userInfo];
      });
    };

    const onUserLeft = ({ socketId }) => {
      setConnectedUsers((prev) => prev.filter((u) => u.socketId !== socketId));
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    };

    const onCursorMoved = ({ socketId, name, cursorColor, x, y }) => {
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.set(socketId, { name, cursorColor, x, y });
        return next;
      });
    };

    const onTitleUpdated = ({ title }) => {
      // Bubble up to board page if needed
      document.dispatchEvent(new CustomEvent('board:title-updated', { detail: { title } }));
    };

    socket.on('connect',           onConnect);
    socket.on('disconnect',        onDisconnect);
    socket.on('room:joined',       onRoomJoined);
    socket.on('room:user-joined',  onUserJoined);
    socket.on('room:user-left',    onUserLeft);
    socket.on('cursor:moved',      onCursorMoved);
    socket.on('board:title-updated', onTitleUpdated);

    if (socket.connected) {
      setIsConnected(true);
      socket.emit('room:join', { roomId: boardId });
    } else {
      socket.once('connect', () => {
        setIsConnected(true);
        socket.emit('room:join', { roomId: boardId });
      });
    }

    // ── Yjs shared map observer ────────────────────────────
    // When remote users update the canvas map, apply to Fabric
    const onYCanvasChange = (event, transaction) => {
      if (transaction.origin === 'local') return;
      if (!fabricRef.current) return;

      const data = yCanvas.get('data');
      if (!data) return;

      applyingRemoteRef.current = true;
      try {
        const json = typeof data === 'string' ? JSON.parse(data) : data;
        fabricRef.current.loadFromJSON(json, () => {
          fabricRef.current.renderAll();
          applyingRemoteRef.current = false;
        });
      } catch {
        applyingRemoteRef.current = false;
      }
    };

    yCanvas.observe(onYCanvasChange);

    return () => {
      // Cleanup
      if (canvasSyncTimer.current) clearTimeout(canvasSyncTimer.current);
      if (saveTimer.current)       clearTimeout(saveTimer.current);

      socket.emit('room:leave');
      socket.off('connect',              onConnect);
      socket.off('disconnect',           onDisconnect);
      socket.off('room:joined',          onRoomJoined);
      socket.off('room:user-joined',     onUserJoined);
      socket.off('room:user-left',       onUserLeft);
      socket.off('cursor:moved',         onCursorMoved);
      socket.off('board:title-updated',  onTitleUpdated);

      yCanvas.unobserve(onYCanvasChange);
      provider.destroy();
      ydoc.destroy();

      ydocRef.current    = null;
      providerRef.current = null;
      yCanvasRef.current  = null;
    };
  }, [boardId, user]); // eslint-disable-line

  // ── Apply Yjs state to Fabric when both are ready ───────────
  useEffect(() => {
    if (isSynced && isCanvasReady && fabricRef.current && yCanvasRef.current) {
      const data = yCanvasRef.current.get('data');
      if (data) {
        applyingRemoteRef.current = true;
        try {
          const json = typeof data === 'string' ? JSON.parse(data) : data;
          fabricRef.current.loadFromJSON(json, () => {
            fabricRef.current.renderAll();
            applyingRemoteRef.current = false;
          });
        } catch (err) {
          applyingRemoteRef.current = false;
        }
      }
    }
  }, [isSynced, isCanvasReady]);

  // ── Push local canvas change → Yjs → all peers ─────────────
  const pushCanvasChange = useCallback((canvasJSON) => {
    if (applyingRemoteRef.current) return;
    if (!yCanvasRef.current || !ydocRef.current) return;

    const serialized = typeof canvasJSON === 'string'
      ? canvasJSON
      : JSON.stringify(canvasJSON);

    // Skip if canvas hasn't actually changed
    if (serialized === lastCanvasHash.current) return;
    lastCanvasHash.current = serialized;

    // Debounce rapid drawing strokes
    if (canvasSyncTimer.current) clearTimeout(canvasSyncTimer.current);
    canvasSyncTimer.current = setTimeout(() => {
      if (!ydocRef.current) return;
      ydocRef.current.transact(() => {
        yCanvasRef.current.set('data', serialized);
      }, 'local');

      // Schedule DB save
      scheduleSaveRef.current?.(serialized);
    }, CANVAS_SYNC_DEBOUNCE);
  }, []); // eslint-disable-line

  // ── Debounced DB save via socket ────────────────────────────
  const scheduleSaveRef = useRef((canvasJSON) => {});
  useEffect(() => {
    scheduleSaveRef.current = (canvasJSON) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit('canvas:save', { canvasJSON });
        }
        onSave?.(canvasJSON);
      }, SAVE_DEBOUNCE);
    };
  }, [onSave]);

  // ── Emit cursor position (throttled externally by caller) ───
  const emitCursor = useCallback((x, y) => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('cursor:move', { x, y });
    }
    // Also update Yjs awareness for richer presence
    providerRef.current?.setLocalCursor({ x, y });
  }, []);

  // ── Emit title change ────────────────────────────────────────
  const emitTitleChange = useCallback((title) => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('board:title-update', { title });
    }
  }, []);

  // ── Set container ref (for cursor coordinate transform) ─────
  const setContainerRef = useCallback((el) => {
    containerRef.current = el;
  }, []);

  return {
    isConnected,
    isSynced,
    connectedUsers,
    remoteCursors,
    pushCanvasChange,
    emitCursor,
    emitTitleChange,
    setContainerRef,
    ydoc: ydocRef.current,
  };
};

export default useCollaboration;
