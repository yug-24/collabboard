/**
 * Global error handler — must be the last middleware registered.
 * Catches all errors passed via next(err).
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join(', ');
  }

  // Mongoose duplicate key error (e.g. email already exists)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Mongoose VersionError (optimistic concurrency)
  if (err.name === 'VersionError') {
    statusCode = 409;
    message = 'Document was modified. Please try again.';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired.';
  }

  // Log error with full details
  if (process.env.NODE_ENV === 'development') {
    console.error(`\n❌ [${req.method}] ${req.path}`);
    console.error(`   Status: ${statusCode}`);
    console.error(`   Message: ${message}`);
    console.error(`   Name: ${err.name}`);
    console.error(`   Stack: ${err.stack}\n`);
  } else {
    console.error(`[${req.method}] ${req.path} - ${statusCode}: ${message}`);
  }

  // Never expose full stack traces in production
  const response = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      name: err.name,
      stack: err.stack,
      details: err
    }),
  };

  res.status(statusCode).json(response);
};

/**
 * 404 handler — catches requests to undefined routes.
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};
