import axios from 'axios';

// ── Base URL ────────────────────────────────────────────────────
// VITE_API_URL = bare server root, e.g. https://railway.app (NO trailing /api)
// All API calls below explicitly include /api/ in the path.
// In pure local dev (no env var set), baseURL is '' so Vite proxy handles /api/*
const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Send cookies (refresh token)
  headers: { 'Content-Type': 'application/json' },
});

// Track if a refresh is already in flight to prevent multiple parallel refreshes
let isRefreshing = false;
let refreshQueue = []; // Callbacks waiting for new token

const processQueue = (error, token = null) => {
  refreshQueue.forEach((cb) => (error ? cb.reject(error) : cb.resolve(token)));
  refreshQueue = [];
};

// ── Request interceptor — attach access token ─────────────────
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — handle 401 with token refresh ──────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // If not a 401 or already retried, reject immediately
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Don't refresh on auth routes themselves (prevents infinite loops)
    if (original.url?.includes('/api/auth/')) {
      return Promise.reject(error);
    }

    // Token expired — try to refresh
    if (error.response?.data?.code === 'TOKEN_EXPIRED' || error.response?.status === 401) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = data.data.accessToken;
        setAccessToken(newToken);
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAccessToken();
        // Redirect to login — token refresh failed (session expired)
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Token storage (memory-only) ───────────────────────────────
// Tokens are strictly kept in memory. On page refresh, the HttpOnly
// refresh token cookie is used to acquire a new access token.
let _accessToken = null;

export const setAccessToken = (token) => {
  _accessToken = token;
};

export const getAccessToken = () => {
  return _accessToken;
};

export const clearAccessToken = () => {
  _accessToken = null;
};

// ── Named API functions ───────────────────────────────────────
// All paths explicitly include /api/ prefix
export const authApi = {
  register: (data) => api.post('/api/auth/register', data),
  login:    (data) => api.post('/api/auth/login', data),
  logout:   ()     => api.post('/api/auth/logout'),
  refresh:  ()     => api.post('/api/auth/refresh'),
  me:       ()     => api.get('/api/auth/me'),
};

export const boardApi = {
  list:       ()           => api.get('/api/boards'),
  create:     (data)       => api.post('/api/boards', data),
  get:        (id)         => api.get(`/api/boards/${id}`),
  update:     (id, data)   => api.patch(`/api/boards/${id}`, data),
  delete:     (id)         => api.delete(`/api/boards/${id}`),
  joinByCode: (roomCode)   => api.get(`/api/boards/join/${roomCode}`),
};

export default api;
