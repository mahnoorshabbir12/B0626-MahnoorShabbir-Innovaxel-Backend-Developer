/**
 * Centralized error-handling middleware.
 * All route errors are funneled here for consistent API responses.
 */
function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred.';

  res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
}

/**
 * Helper to create a structured API error.
 */
class ApiError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

module.exports = { errorHandler, ApiError };
