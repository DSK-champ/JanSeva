require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const passport = require('./src/config/passport');

const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');
const { errorHandler, notFound } = require('./src/middlewares/error.middleware');

// ─── Top-level Error Listeners ────────────────────────────────────────────────
// These catch errors that happen outside of the request-response cycle
process.on('uncaughtException', (err) => {
  logger.error('CRITICAL: Uncaught Exception! 💥');
  logger.error(err.stack || err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('CRITICAL: Unhandled Rejection at promise:', promise);
  logger.error('Reason:', reason.stack || reason);
  process.exit(1);
});

// ─── Route Imports ────────────────────────────────────────────────────────────
const authRoutes = require('./src/routes/auth.routes');
const requestRoutes = require('./src/routes/request.routes');
const volunteerRoutes = require('./src/routes/volunteer.routes');
const statsRoutes = require('./src/routes/stats.routes');
const ngoRoutes = require('./src/routes/ngo.routes');
const contributionRoutes = require('./src/routes/contribution.routes');
const campaignRoutes = require('./src/routes/campaign.routes');
const recommendationRoutes = require('./src/routes/recommendation.routes');
const contactRoutes = require('./src/routes/contact.routes');
const volunteerNgoRoutes = require('./src/routes/volunteer-ngo.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const mlRoutes = require('../ML/routes');

const startServer = async () => {
  try {
    // ─── Bootstrap DB ─────────────────────────────────────────────────────────
    await connectDB();

    const app = express();

    // ─── Security Middlewares ─────────────────────────────────────────────────
    app.use(helmet());

    app.use(
      cors({
        origin: ['http://localhost:5173', 'http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      })
    );

    // ─── Rate Limiting ────────────────────────────────────────────────────────
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests, please try again later.' },
    });

    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 2000,
      message: { success: false, message: 'Too many auth attempts, please try again later.' },
    });

    app.use('/api', limiter);
    app.use('/api/auth', authLimiter);

    // ─── Body Parsing ─────────────────────────────────────────────────────────
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // ─── HTTP Request Logging ─────────────────────────────────────────────────
    if (process.env.NODE_ENV !== 'test') {
      app.use(
        morgan('combined', {
          stream: { write: (message) => logger.http(message.trim()) },
        })
      );
    }

    // ─── Passport ─────────────────────────────────────────────────────────────
    app.use(passport.initialize());

    // ─── Health Check ─────────────────────────────────────────────────────────
    app.get('/api/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'JanSeva API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      });
    });

    // ─── API Routes ───────────────────────────────────────────────────────────
    app.use('/api/auth', authRoutes);
    app.use('/api/requests', requestRoutes);
    app.use('/api/volunteer', volunteerRoutes);
    app.use('/api/stats', statsRoutes);
    app.use('/api/ngos', ngoRoutes);
    app.use('/api/contributions', contributionRoutes);
    app.use('/api/campaigns', campaignRoutes);
    app.use('/api/recommendations', recommendationRoutes);
    app.use('/api/contact', contactRoutes);
    app.use('/api/volunteer-ngo', volunteerNgoRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api', mlRoutes);

    // ─── 404 Handler ─────────────────────────────────────────────────────────
    app.use(notFound);

    // ─── Global Error Handler ────────────────────────────────────────────────
    app.use(errorHandler);

    // ─── Start Server ─────────────────────────────────────────────────────────
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      logger.info(`🚀 JanSeva API server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });

    // Handle server-specific errors (like EADDRINUSE)
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already in use. Nodemon might be restarting too fast.`);
      } else {
        logger.error(`❌ Server error: ${error.message}`);
      }
      process.exit(1);
    });

    // ─── Graceful Shutdown ────────────────────────────────────────────────────
    const gracefulShutdown = (signal) => {
      logger.warn(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error(`❌ Fatal error during server startup: ${error.stack || error}`);
    process.exit(1);
  }
};

startServer();


