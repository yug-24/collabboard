import { io } from 'socket.io-client';
import { getAccessToken } from './api';

let socket = null;

export const getSocket = () => socket;

export const connectSocket = () => {
  if (!socket) {
    // Use VITE_SOCKET_URL when set, then VITE_SERVER_URL, then Vite proxy root '/'.
    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_SERVER_URL || '/';

    socket = io(socketUrl, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      // Use a factory function that gets token dynamically at connection time
      auth: (cb) => {
        const token = getAccessToken();
        if (!token) {
          return cb(new Error('NO_TOKEN'));
        }
        cb({ token });
      },
      // Aggressive reconnection with exponential backoff
      reconnection: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      // Timeout before considering connection failed
      connectTimeout: 10000,
    });

    // Expose globally for cleanup on page unload
    window.__collabSocket = socket;

    if (import.meta.env.DEV) {
      socket.on('connect', () => console.log('🔌 Socket connected:', socket.id));
      socket.on('disconnect', (r) => console.log('🔌 Socket disconnected:', r));
      socket.on('connect_error', (e) => {
        const msg = e.data?.content || e.message;
        console.warn('🔌 Socket error:', msg);
      });
    }
  }

  // Only connect if we have a valid token
  if (!socket.connected && getAccessToken()) {
    socket.connect();
  } else if (!getAccessToken()) {
    if (import.meta.env.DEV) console.warn('🔌 Socket connect deferred: no token');
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};

/**
 * Attempt reconnection with validated token.
 * Call this after successfully obtaining a token (e.g., after login).
 */
export const reconnectSocket = () => {
  if (socket?.disconnected && getAccessToken()) {
    socket.connect();
  }
};
