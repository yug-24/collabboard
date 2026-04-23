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

const NODE_ENV = process.env.NODE_ENV || 'development';

// ── Allowed origins ──────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://collabboard-sigma.vercel.app',       // production Vercel URL
  /^https:\/\/collabboard-.*\.vercel\.app$/,    // all Vercel preview deployments
];

// Add CLIENT_URL from env if provided (extra safety)
if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

const corsOriginFn = (origin, callback) => {
  // Allow server-to-server / Postman / Railway health checks (no origin)
  if (!origin) return callback(null, true);

  const isAllowed = allowedOrigins.some((o) =>
    typeof o === 'string' ? o === origin : o.test(origin)
  );

  if (isAllowed) {
    callback(null, true);
  } else {
    console.warn(`️  CORS blocked: ${origin}`);
    callback(new Error(`CORS: origin '${origin}' is not allowed`));
  }
};

const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// ── Socket.IO ─────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: corsOriginFn,
    methods: ['GET', 'POST'],
    credentials: true,
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
    origin: corsOriginFn,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Handle preflight for all routes
app.options('*', cors({ origin: corsOriginFn, credentials: true }));

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

// Morgan in all environments so Railway logs show requests
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Favicon ───────────────────────────────────────────────────
app.get('/favicon.ico', (_req, res) => res.status(204).end());

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ── API Routes ────────────────────────────────────────────────
// All routes are prefixed with /api
// Frontend must call: https://your-railway-url.app/api/auth/login
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);

// ── 404 + Error handlers ──────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Socket.IO handlers ────────────────────────────────────────
initSocket(io);

// ── Process error handlers ────────────────────────────────────
process.on('unhandledRejection', (err) => {
  console.error('️  Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('️  Uncaught Exception:', err);
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
    // Required env vars always
    const requiredEnvs = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'];

    const missing = requiredEnvs.filter((env) => !process.env[env]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}\n` +
        `Please set them in .env or as Railway environment variables.`
      );
    }

    await connectDB();

    httpServer.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   CollabBoard Server Running         ║
║                                        ║
║  Environment: ${NODE_ENV.padEnd(24)} ║
║  Port:        ${String(PORT).padEnd(24)} ║
╚════════════════════════════════════════╝
      `);
      console.log(' Endpoints:');
      console.log(`   • Health:   /health`);
      console.log(`   • Auth:     POST /api/auth/login`);
      console.log(`   • Auth:     POST /api/auth/register`);
      console.log(`   • Auth:     POST /api/auth/refresh`);
      console.log(`   • Boards:   /api/boards\n`);
    });
  } catch (err) {
    console.error(' Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

export default app;