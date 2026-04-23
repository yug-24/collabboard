import { verifyAccessToken } from '../config/jwt.js';
import User from '../models/User.model.js';

/**
 * Protects routes — extracts and verifies Bearer token from Authorization header.
 * Attaches req.user for downstream handlers.
 */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Access token expired.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }

    // Verify user still exists and is active
    const user = await User.findById(decoded.sub).select('-password -refreshTokens');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists or is inactive.',
      });
    }

    // Update last seen (non-blocking)
    User.findByIdAndUpdate(user._id, { lastSeen: new Date() }).exec();

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, message: 'Authentication error.' });
  }
};

/**
 * Optional auth — attaches user if token present but doesn't block if not.
 * Useful for public boards that show extra info when logged in.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub).select('-password -refreshTokens');
    if (user?.isActive) req.user = user;
  } catch {
    // Silently ignore — optional auth never blocks
  }
  next();
};
