import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync.js';
import * as awarenessProtocol from 'y-protocols/awareness.js';
import * as encoding from 'lib0/encoding.js';
import * as decoding from 'lib0/decoding.js';

const MESSAGE_SYNC      = 0;
const MESSAGE_AWARENESS = 1;

// Debounce times (ms) — balance responsiveness vs. network efficiency
const BATCH_TIMEOUT    = 16;   // ~60fps for frequent updates
const AWARENESS_TIMEOUT = 50;  // Presence updates less frequently

/**
 * SocketYjsProvider
 * -----------------
 * High-performance Yjs sync over Socket.io with message batching.
 * Batches frequent updates to reduce network traffic significantly.
 */
export class SocketYjsProvider {
  constructor(socket, doc, { awareness } = {}) {
    this.socket    = socket;
    this.doc       = doc;
    this.awareness = awareness ?? new awarenessProtocol.Awareness(doc);
    this.synced    = false;

    // Message batching
    this._messageQueue = [];
    this._batchTimer = null;

    // Awareness batching (separate to optimize presence updates)
    this._awarenessQueue = [];
    this._awarenessTimer = null;

    this._onMessage       = this._onMessage.bind(this);
    this._onDocUpdate     = this._onDocUpdate.bind(this);
    this._onAwarenessUpdate = this._onAwarenessUpdate.bind(this);
    this._onConnect       = this._onConnect.bind(this);
    this._onDisconnect    = this._onDisconnect.bind(this);
    this._flushMessages   = this._flushMessages.bind(this);
    this._flushAwareness  = this._flushAwareness.bind(this);

    // Socket events
    socket.on('yjs:message',  this._onMessage);
    socket.on('connect',      this._onConnect);
    socket.on('disconnect',   this._onDisconnect);

    // Doc events
    doc.on('update',          this._onDocUpdate);
    this.awareness.on('update', this._onAwarenessUpdate);

    // If already connected, kick off sync
    if (socket.connected) this._sendSyncStep1();
  }

  // ── Connection ──────────────────────────────────────────────
  _onConnect() {
    this.synced = false;
    this._sendSyncStep1();
  }

  _onDisconnect() {
    this.synced = false;
    // Flush pending messages before disconnect
    this._flushMessages();
    this._flushAwareness();
    
    // Remove our own awareness state
    awarenessProtocol.removeAwarenessStates(
      this.awareness,
      [this.doc.clientID],
      'disconnect'
    );
  }

  // ── Outbound: send sync step1 (our current state vector) ───
  _sendSyncStep1() {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, this.doc);
    this._send(encoding.toUint8Array(encoder));
  }

  // ── Outbound: batch doc updates for efficient transmission ──
  _onDocUpdate(update, origin) {
    // Don't re-broadcast updates that came from the socket
    if (origin === this) return;

    // Queue the update for batching
    this._messageQueue.push(update);
    this._scheduleBatch();
  }

  // ── Schedule and execute message batching ───────────────────
  _scheduleBatch() {
    if (this._batchTimer) return; // Already scheduled

    this._batchTimer = setTimeout(this._flushMessages, BATCH_TIMEOUT);
  }

  _flushMessages() {
    if (this._batchTimer) {
      clearTimeout(this._batchTimer);
      this._batchTimer = null;
    }

    if (this._messageQueue.length === 0) return;

    // Batch all queued updates into a single message
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    
    this._messageQueue.forEach(update => {
      syncProtocol.writeUpdate(encoder, update);
    });

    this._messageQueue = [];
    this._send(encoding.toUint8Array(encoder));
  }

  // ── Outbound: batch awareness updates ────────────────────────
  _onAwarenessUpdate({ added, updated, removed }, origin) {
    if (origin === 'local') return; // avoid double-send
    
    // Queue awareness changes
    this._awarenessQueue.push({ added, updated, removed });
    this._scheduleAwarenessFlush();
  }

  _scheduleAwarenessFlush() {
    if (this._awarenessTimer) return; // Already scheduled

    this._awarenessTimer = setTimeout(this._flushAwareness, AWARENESS_TIMEOUT);
  }

  _flushAwareness() {
    if (this._awarenessTimer) {
      clearTimeout(this._awarenessTimer);
      this._awarenessTimer = null;
    }

    if (this._awarenessQueue.length === 0) return;

    // Deduplicate and batch awareness changes
    const allClients = new Set();
    this._awarenessQueue.forEach(({ added, updated, removed }) => {
      added.forEach(c => allClients.add(c));
      updated.forEach(c => allClients.add(c));
      removed.forEach(c => allClients.add(c));
    });

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, Array.from(allClients))
    );

    this._awarenessQueue = [];
    this._send(encoding.toUint8Array(encoder));
  }

  // ── Inbound: handle binary message from server ──────────────
  _onMessage(data) {
    const message = data instanceof Uint8Array ? data : new Uint8Array(data);
    const decoder = decoding.createDecoder(message);
    const encoder = encoding.createEncoder();
    const msgType = decoding.readVarUint(decoder);

    switch (msgType) {
      case MESSAGE_SYNC: {
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        const syncType = syncProtocol.readSyncMessage(decoder, encoder, this.doc, this);

        // Step1 received from server → reply with step2 (our full state)
        if (syncType === syncProtocol.messageYjsSyncStep1) {
          const reply = encoding.toUint8Array(encoder);
          if (reply.length > 1) this._send(reply);
        }

        // Step2 or Update means server sent state — we're synced
        if (syncType === syncProtocol.messageYjsSyncStep2 ||
            syncType === syncProtocol.messageYjsUpdate) {
          if (!this.synced) {
            this.synced = true;
            this.emit('synced', true);
          }
        }
        break;
      }

      case MESSAGE_AWARENESS: {
        awarenessProtocol.applyAwarenessUpdate(
          this.awareness,
          decoding.readVarUint8Array(decoder),
          this
        );
        break;
      }
    }
  }

  // ── Update our own awareness (cursor, name, color) ──────────
  setLocalAwareness(state) {
    this.awareness.setLocalStateField('user', state);
  }

  setLocalCursor(cursor) {
    this.awareness.setLocalStateField('cursor', cursor);
  }

  // ── Send binary to server ───────────────────────────────────
  _send(message) {
    if (this.socket.connected) {
      this.socket.emit('yjs:message', message);
    }
  }

  // ── Minimal event emitter ───────────────────────────────────
  _listeners = {};

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return this;
  }

  emit(event, ...args) {
    (this._listeners[event] || []).forEach((fn) => fn(...args));
  }

  // ── Cleanup ─────────────────────────────────────────────────
  destroy() {
    // Flush any pending messages before cleanup
    this._flushMessages();
    this._flushAwareness();

    this.socket.off('yjs:message',  this._onMessage);
    this.socket.off('connect',      this._onConnect);
    this.socket.off('disconnect',   this._onDisconnect);
    this.doc.off('update',          this._onDocUpdate);
    this.awareness.off('update',    this._onAwarenessUpdate);

    awarenessProtocol.removeAwarenessStates(
      this.awareness,
      [this.doc.clientID],
      'destroy'
    );
  }
}
