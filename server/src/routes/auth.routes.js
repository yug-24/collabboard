import express from 'express';
import rateLimit from 'express-rate-limit';
import User from '../models/User.model.js';
import {
  createTokenPair,
  verifyRefreshToken,
  refreshCookieOptions,
  signAccessToken,
} from '../config/jwt.js';
import { protect } from '../middleware/auth.middleware.js';
import {
  registerValidator,
  loginValidator,
} from '../middleware/validation.middleware.js';

const router = express.Router();

// Strict rate limit on auth endpoints — prevents brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  message: { success: false, message: 'Too many refresh attempts.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', authLimiter, registerValidator, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const user = await User.create({ name, email, password });
    const { accessToken, refreshToken } = createTokenPair(user);

    // Store refresh token hash in DB (rotation strategy)
    user.refreshTokens.push(refreshToken);
    await user.save({ validateBeforeSave: false });

    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: {
        user: user.toPublicProfile(),
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', authLimiter, loginValidator, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Must explicitly select password since it's excluded by default
    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated.',
      });
    }

    const { accessToken, refreshToken } = createTokenPair(user);

    // Limit stored refresh tokens to last 5 sessions (prevent unbounded growth)
    user.refreshTokens = [...user.refreshTokens.slice(-4), refreshToken];
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    res.json({
      success: true,
      message: 'Logged in successfully.',
      data: {
        user: user.toPublicProfile(),
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/auth/refresh ────────────────────────────────────
// Called automatically by frontend when access token expires
// Simple and reliable token rotation with atomic operations
router.post('/refresh', refreshLimiter, async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token.' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      res.clearCookie('refreshToken', { path: '/' });
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    // Fetch user and verify token exists
    const user = await User.findById(decoded.sub).select('+refreshTokens');
    if (!user) {
      res.clearCookie('refreshToken', { path: '/' });
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    if (!user.refreshTokens.includes(token)) {
      // Token reuse detected — clear all sessions for security
      await User.findByIdAndUpdate(decoded.sub, { refreshTokens: [] }).catch(() => {});
      res.clearCookie('refreshToken', { path: '/' });
      return res.status(401).json({
        success: false,
        message: 'Refresh token reuse detected. Please log in again.',
      });
    }

    // Generate new token pair
    const { accessToken, refreshToken: newRefreshToken } = createTokenPair(user);

    // Simple atomic update: filter old token, add new one, limit to 5 tokens
    // Using set instead of pull/push to avoid concurrency issues
    const newTokens = [
      ...user.refreshTokens.filter((t) => t !== token),
      newRefreshToken,
    ].slice(-5); // Keep only last 5 tokens

    const updatedUser = await User.findByIdAndUpdate(
      decoded.sub,
      { refreshTokens: newTokens },
      { new: true, select: '+refreshTokens', runValidators: false }
    );

    if (!updatedUser) {
      res.clearCookie('refreshToken', { path: '/' });
      return res.status(401).json({ success: false, message: 'Failed to refresh token.' });
    }

    // Set new refresh token cookie
    res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);

    res.json({
      success: true,
      data: { accessToken },
    });
  } catch (error) {
    console.error('🔴 [refresh] error:', error.message);
    next(error);
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', protect, async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;

    if (token) {
      // Use atomic operation to remove token
      await User.findByIdAndUpdate(
        req.user._id,
        { $pull: { refreshTokens: token } },
        { new: false }
      );
    }

    // Clear cookie with correct path
    res.clearCookie('refreshToken', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', protect, (req, res) => {
  res.json({
    success: true,
    data: { user: req.user.toPublicProfile() },
  });
});

export default router;
