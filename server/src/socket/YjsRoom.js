import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

// ── Message type constants (mirrors y-protocols) ──────────────
export const MESSAGE_SYNC       = 0;
export const MESSAGE_AWARENESS  = 1;
export const MESSAGE_AUTH       = 2;
export const MESSAGE_QUERY_AWARENESS = 3;

// Broadcast batching settings (ms)
const BATCH_TIMEOUT    = 10;   // Server-side batch window
const AWARENESS_TIMEOUT = 30;  // Slightly faster awareness broadcast

/**
 * YjsRoom manages one Y.Doc per board room.
 * Handles:
 *   - Yjs sync protocol (step1/step2/update)
 *   - Awareness (cursors, user presence metadata)
 *   - Persistent state serialization to/from MongoDB
 *   - High-performance message batching for broadcasting
 */
export class YjsRoom {
  constructor(boardId) {
    this.boardId   = boardId;
    this.doc       = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.sockets   = new Map(); // socketId -> socket

    // Broadcast batching
    this._updateQueue = [];
    this._batchTimer = null;
    this._awarenessQueue = [];
    this._awarenessTimer = null;

    // When doc updates, queue for batched broadcast
    this.doc.on('update', (update, origin) => {
      this._queueUpdate(update, origin);
    });

    // When awareness changes, queue for batched broadcast
    this.awareness.on('update', ({ added, updated, removed }, origin) => {
      this._queueAwareness({ added, updated, removed }, origin);
    });
  }

  // ── Socket management ───────────────────────────────────────

  addSocket(socket) {
    this.sockets.set(socket.id, socket);
  }

  removeSocket(socketId) {
    this.sockets.delete(socketId);
    // Remove awareness state for this client
    awarenessProtocol.removeAwarenessStates(
      this.awareness,
      [this.doc.clientID],
      'socket-disconnect'
    );
  }

  get size() { return this.sockets.size; }

  // ── Update queueing for batched broadcasts ──────────────────

  _queueUpdate(update, origin) {
    this._updateQueue.push({ update, origin });
    this._scheduleBatch();
  }

  _scheduleBatch() {
    if (this._batchTimer) return;
    this._batchTimer = setTimeout(() => this._flushUpdates(), BATCH_TIMEOUT);
  }

  _flushUpdates() {
    if (this._batchTimer) {
      clearTimeout(this._batchTimer);
      this._batchTimer = null;
    }

    if (this._updateQueue.length === 0) return;

    // Deduplicate origin and batch all updates
    const updatesByOrigin = new Map();
    this._updateQueue.forEach(({ update, origin }) => {
      if (!updatesByOrigin.has(origin)) {
        updatesByOrigin.set(origin, []);
      }
      updatesByOrigin.get(origin).push(update);
    });

    // Create a single batched message
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    
    this._updateQueue.forEach(({ update }) => {
      syncProtocol.writeUpdate(encoder, update);
    });

    const msg = encoding.toUint8Array(encoder);
    this._updateQueue = [];

    // Broadcast to all sockets except origins
    for (const [id, socket] of this.sockets) {
      // Check if this socket was an origin (avoid echo)
      let isOrigin = false;
      for (const [origin] of updatesByOrigin) {
        if (origin === socket) {
          isOrigin = true;
          break;
        }
      }
      if (!isOrigin) {
        socket.emit('yjs:message', msg);
      }
    }
  }

  // ── Awareness queueing for batched broadcasts ───────────────

  _queueAwareness({ added, updated, removed }, origin) {
    this._awarenessQueue.push({ added, updated, removed, origin });
    this._scheduleAwarenessBatch();
  }

  _scheduleAwarenessBatch() {
    if (this._awarenessTimer) return;
    this._awarenessTimer = setTimeout(() => this._flushAwareness(), AWARENESS_TIMEOUT);
  }

  _flushAwareness() {
    if (this._awarenessTimer) {
      clearTimeout(this._awarenessTimer);
      this._awarenessTimer = null;
    }

    if (this._awarenessQueue.length === 0) return;

    // Deduplicate all changed clients
    const changedClients = new Set();
    let origin = null;
    this._awarenessQueue.forEach(({ added, updated, removed, origin: o }) => {
      added?.forEach(c => changedClients.add(c));
      updated?.forEach(c => changedClients.add(c));
      removed?.forEach(c => changedClients.add(c));
      if (!origin && o) origin = o;
    });

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, Array.from(changedClients))
    );
    const msg = encoding.toUint8Array(encoder);
    this._awarenessQueue = [];

    // Broadcast to all sockets except origin
    for (const [id, socket] of this.sockets) {
      if (socket !== origin) {
        socket.emit('yjs:message', msg);
      }
    }
  }

  // ── Sync protocol handling ─────────────────────────────────

  /**
   * Handle an incoming binary message from a socket.
   * Returns a Uint8Array reply to send back, or null.
   */
  handleMessage(socket, message) {
    const decoder = decoding.createDecoder(message);
    const encoder = encoding.createEncoder();
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {

      case MESSAGE_SYNC: {
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        const syncMessageType = syncProtocol.readSyncMessage(
          decoder, encoder, this.doc, socket
        );

        // After processing step1, send current doc state
        if (syncMessageType === syncProtocol.messageYjsSyncStep1) {
          // Client needs our state — reply is already encoded by readSyncMessage
        }

        const reply = encoding.toUint8Array(encoder);
        return reply.length > 1 ? reply : null;
      }

      case MESSAGE_AWARENESS: {
        awarenessProtocol.applyAwarenessUpdate(
          this.awareness,
          decoding.readVarUint8Array(decoder),
          socket
        );
        return null;
      }

      default:
        return null;
    }
  }

  /**
   * Send sync step1 to a newly connected socket.
   * This bootstraps the full document state to the new client.
   */
  sendSyncStep1(socket) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    // Use writeSyncStep2 to send the server's full state to the client
    syncProtocol.writeSyncStep2(encoder, this.doc);
    const msg = encoding.toUint8Array(encoder);
    socket.emit('yjs:message', msg);
  }

  /**
   * Send current awareness to a newly connected socket.
   */
  sendAwareness(socket) {
    const clients = Array.from(this.awareness.states.keys());
    if (clients.length === 0) return;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, clients)
    );
    socket.emit('yjs:message', encoding.toUint8Array(encoder));
  }

  // ── Persistence helpers ────────────────────────────────────

  /**
   * Serialize current doc state to base64 for MongoDB storage.
   */
  serializeState() {
    const state = Y.encodeStateAsUpdate(this.doc);
    return Buffer.from(state).toString('base64');
  }

  /**
   * Restore doc state from a base64 string (from MongoDB).
   */
  restoreState(base64) {
    if (!base64) return;
    try {
      const bytes = Buffer.from(base64, 'base64');
      Y.applyUpdate(this.doc, new Uint8Array(bytes));
    } catch (err) {
      console.error(`[YjsRoom:${this.boardId}] Failed to restore state:`, err.message);
    }
  }

  /**
   * Get canvas JSON from the Yjs shared map.
   */
  getCanvasData() {
    const shared = this.doc.getMap('canvas');
    return shared.get('data') ?? null;
  }

  /**
   * Set canvas JSON in the Yjs shared map.
   */
  setCanvasData(data) {
    const shared = this.doc.getMap('canvas');
    this.doc.transact(() => {
      shared.set('data', data);
    });
  }

  destroy() {
    // Flush pending batches before destroy
    this._flushUpdates();
    this._flushAwareness();
    
    this.awareness.destroy();
    this.doc.destroy();
    this.sockets.clear();
  }
}

// ── Global room registry ────────────────────────────────────
const rooms = new Map(); // boardId -> YjsRoom

export const getOrCreateRoom = (boardId) => {
  if (!rooms.has(boardId)) {
    rooms.set(boardId, new YjsRoom(boardId));
  }
  return rooms.get(boardId);
};

export const getRoom = (boardId) => rooms.get(boardId);

export const destroyRoom = (boardId) => {
  const room = rooms.get(boardId);
  if (room) {
    room.destroy();
    rooms.delete(boardId);
  }
};

export const getRoomCount = () => rooms.size;
