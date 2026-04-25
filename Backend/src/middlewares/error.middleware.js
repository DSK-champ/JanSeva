const logger = require('../utils/logger');

/**
 * Global error handling middleware.
 * Must be registered LAST in Express middleware chain.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // ── Mongoose Validation Error ─────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    logger.error(`Validation Failed: ${JSON.stringify(errors)}`);
    return res.status(statusCode).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // ── MongoDB Document Validation Error (Code 121) ──────────────────────────
  if (err.code === 121) {
    statusCode = 400;
    message = 'Document failed validation. Check database schema constraints.';
    logger.error(`MongoDB Schema Validation Failed: ${err.message}`);
  }

  // ── Mongoose Duplicate Key ────────────────────────────────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
  }

  // ── Mongoose Cast Error (Invalid ObjectId) ────────────────────────────────
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field: ${err.path}`;
  }

  // ── JWT Errors ────────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please login again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired. Please login again.';
  }

  // ── Log non-operational errors (bugs) ────────────────────────────────────
  if (!err.isOperational) {
    logger.error(`UNEXPECTED ERROR: ${err.stack}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 handler for unknown routes
 */
const notFound = (req, res, next) => {
  const message = `Route not found: ${req.method} ${req.originalUrl}`;
  res.status(404).json({
    success: false,
    message,
  });
};

module.exports = { errorHandler, notFound };
