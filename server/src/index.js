import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

import connectDB from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import boardRoutes from './routes/board.routes.js';
import { initSocket } from './socket/boardHandlers.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';

const app = express();
app.set('trust proxy', 1);

const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// ── Socket.io setup with enhanced CORS for production ────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: false,
  },
  transports: ['websocket', 'polling'],
});

// ── Security middleware ───────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ── Standard middleware ───────────────────────────────────────
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Favicon (prevent 404 errors) ─────────────────────────────
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);

// ── Error handling and Socket.io ──────────────────────────────
app.use(notFound);
app.use(errorHandler);
initSocket(io);

// ── Error handling for unhandled rejections ────────────────────
process.on('unhandledRejection', (err) => {
  console.error('⚠️  Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught Exception:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// ── Start server ──────────────────────────────────────────────
const startServer = async () => {
  try {
    // Validate required environment variables
    const requiredEnvs = [
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'MONGODB_URI',
    ];

    if (process.env.NODE_ENV === 'production') {
      requiredEnvs.push('CLIENT_URL');
    }

    const missing = requiredEnvs.filter((env) => !process.env[env]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}\n` +
        `Please set them in .env file or as environment variables.`
      );
    }

    await connectDB();
    
    httpServer.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║  🚀 CollabBoard Server Running         ║
║                                        ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(24)} ║
║  Port:        ${String(PORT).padEnd(24)} ║
║  Client URL:  ${(process.env.CLIENT_URL || 'http://localhost:5173').slice(0, 24).padEnd(24)} ║
╚════════════════════════════════════════╝
      `);
      if (process.env.NODE_ENV !== 'production') {
        console.log('📋 Quick Test:');
        console.log(`   • Health: http://localhost:${PORT}/health`);
        console.log(`   • Auth: POST http://localhost:${PORT}/api/auth/login\n`);
      }
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

export default app;
