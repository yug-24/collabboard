import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { authApi, setAccessToken, clearAccessToken } from '../utils/api';
import { connectSocket, disconnectSocket, reconnectSocket } from '../utils/socket';

// ── State shape ───────────────────────────────────────────────
const initialState = {
  user:        null,
  isLoading:   true,   // True during initial session restore
  isLoggedIn:  false,
  error:       null,
};

// ── Reducer ───────────────────────────────────────────────────
const reducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    case 'AUTH_SUCCESS':
      return { ...state, isLoading: false, isLoggedIn: true, user: action.payload, error: null };
    case 'AUTH_FAILURE':
      return { ...state, isLoading: false, isLoggedIn: false, user: null, error: action.payload };
    case 'AUTH_LOGOUT':
      return { ...state, isLoading: false, isLoggedIn: false, user: null, error: null };
    case 'RESTORE_DONE':
      return { ...state, isLoading: false };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
};

// ── Context ───────────────────────────────────────────────────
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // ── Restore session on app load ───────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Try to get a fresh access token using the HttpOnly refresh cookie
        const { data } = await authApi.refresh();
        setAccessToken(data.data.accessToken);

        // Fetch the current user profile
        const meRes = await authApi.me();
        dispatch({ type: 'AUTH_SUCCESS', payload: meRes.data.data.user });
        // Socket will connect when token is present
        connectSocket();
      } catch {
        // No valid session — that's fine, user needs to log in
        clearAccessToken();
        dispatch({ type: 'RESTORE_DONE' });
      }
    };

    restoreSession();
  }, []);

  // ── Listen for expired event from axios interceptor ───────
  useEffect(() => {
    const handleExpired = () => {
      clearAccessToken();
      disconnectSocket();
      dispatch({ type: 'AUTH_LOGOUT' });
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  // ── Actions ───────────────────────────────────────────────
  const register = useCallback(async ({ name, email, password }) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const { data } = await authApi.register({ name, email, password });
      setAccessToken(data.data.accessToken);
      dispatch({ type: 'AUTH_SUCCESS', payload: data.data.user });
      // Use reconnect helper to connect socket with fresh token
      reconnectSocket();
      return { success: true };
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message ||
        'Registration failed.';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      return { success: false, message };
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const { data } = await authApi.login({ email, password });
      setAccessToken(data.data.accessToken);
      dispatch({ type: 'AUTH_SUCCESS', payload: data.data.user });
      // Use reconnect helper to connect socket with fresh token
      reconnectSocket();
      return { success: true };
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        'Invalid email or password.';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Logout best-effort — clear locally regardless
    } finally {
      clearAccessToken();
      disconnectSocket();
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  }, []);

  const updateUser = useCallback((updates) => {
    dispatch({ type: 'UPDATE_USER', payload: updates });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, register, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;
