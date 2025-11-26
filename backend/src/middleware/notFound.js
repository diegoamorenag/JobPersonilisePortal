const AppError = require('../utils/AppError');

/**
 * 404 Not Found middleware
 * Catches all unmatched routes and passes to error handler
 * Should be registered after all valid routes
 */
const notFound = (req, res, next) => {
  const message = `Route not found: ${req.method} ${req.originalUrl}`;
  next(new AppError(message, 404));
};

module.exports = notFound;
