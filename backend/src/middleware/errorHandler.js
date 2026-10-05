const { logger } = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', { message: err.message });

  // Never expose stack traces or internal messages to the client
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again.',
    },
  });
}

function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
}

module.exports = { errorHandler, notFound };
