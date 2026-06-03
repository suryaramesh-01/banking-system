// ══════════════════════════════════════════════════
//  NexaBank — Main Server Entry Point
//  Node.js + Express + MongoDB Atlas
// ══════════════════════════════════════════════════
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const adminRoutes = require('./routes/admin');
const loanRoutes = require('./routes/loans');
const notificationRoutes = require('./routes/notifications');

const app = express();

// ── Connect Database ──
connectDB();

// ── Security Middleware ──
app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));

// ── Rate Limiting ──
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// ── General Middleware ──
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// ── Health Check ──
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'NexaBank API',
    version: process.env.API_VERSION || 'v1',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── API Routes ──
const apiBase = `/api/${process.env.API_VERSION || 'v1'}`;
app.use(`${apiBase}/auth`, authRoutes);
app.use(`${apiBase}/users`, userRoutes);
app.use(`${apiBase}/accounts`, accountRoutes);
app.use(`${apiBase}/transactions`, transactionRoutes);
app.use(`${apiBase}/admin`, adminRoutes);
app.use(`${apiBase}/loans`, loanRoutes);
app.use(`${apiBase}/notifications`, notificationRoutes);

// ── 404 ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Error Handler ──
app.use(errorHandler);

// ── Start Server ──
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`🏦 NexaBank API running on port ${PORT} [${process.env.NODE_ENV}]`);
});

// ── Graceful Shutdown ──
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated.');
    process.exit(0);
  });
});

module.exports = app;
