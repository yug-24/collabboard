import axios from 'axios';

// baseURL resolution (in priority order):
//   1. VITE_API_URL  — full API base, e.g. https://railway.app/api  ← must include /api
//   2. VITE_SERVER_URL — server root, /api is appended automatically
//   3. '/api'         — Vite dev proxy (pure local dev, no env vars set)
const _serverUrl = (import.meta.env.VITE_SERVER_URL || '').replace(/\/$/, '');
const baseURL    = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')   // use as-is
  : _serverUrl
    ? `${_serverUrl}/api`                              // append /api to server root
    : '/api';                                          // Vite proxy fallback

const api = axios.create({
  baseURL,
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
    if (original.url?.includes('/auth/')) {
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
          `${baseURL}/auth/refresh`,
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
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  logout:   ()     => api.post('/auth/logout'),
  refresh:  ()     => api.post('/auth/refresh'),
  me:       ()     => api.get('/auth/me'),
};

export const boardApi = {
  list:       ()           => api.get('/boards'),
  create:     (data)       => api.post('/boards', data),
  get:        (id)         => api.get(`/boards/${id}`),
  update:     (id, data)   => api.patch(`/boards/${id}`, data),
  delete:     (id)         => api.delete(`/boards/${id}`),
  joinByCode: (roomCode)   => api.get(`/boards/join/${roomCode}`),
};

export default api;
