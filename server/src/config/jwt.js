import jwt from 'jsonwebtoken';

/**
 * Signs a short-lived access token (15 min default)
 */
export const signAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    issuer: 'collabboard',
    audience: 'collabboard-client',
  });
};

/**
 * Signs a long-lived refresh token (7 days default)
 */
export const signRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'collabboard',
    audience: 'collabboard-client',
  });
};

/**
 * Verifies an access token — throws on invalid/expired
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    issuer: 'collabboard',
    audience: 'collabboard-client',
  });
};

/**
 * Verifies a refresh token — throws on invalid/expired
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    issuer: 'collabboard',
    audience: 'collabboard-client',
  });
};

/**
 * Builds the token pair returned on login/register
 */
export const createTokenPair = (user) => {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    name: user.name,
  };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
};

/**
 * Cookie options — HttpOnly prevents JS access (XSS protection)
 * Path: '/' ensures cookie is sent to both /api/* and socket.io endpoints
 */
export const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/', // Send on all routes including socket.io
};
