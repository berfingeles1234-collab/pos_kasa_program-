const config = require('../config');
const { AppError } = require('../utils/appError');

function notFoundMiddleware(req, res, next) {
  next(new AppError(`Endpoint bulunamadı: ${req.method} ${req.originalUrl}`, 404));
}

function errorMiddleware(err, req, res, next) {
  let statusCode = err.statusCode || 500;

  if (err.name === 'TenantRequiredError') {
    statusCode = 403;
  }

  const isDevelopment = config.nodeEnv === 'development';

  const response = {
    error: err.message || 'Sunucu hatası',
  };

  if (isDevelopment) {
    if (err.code) {
      response.code = err.code;
    }
    if (err.stack) {
      response.detail = err.stack;
    }
  }

  if (statusCode >= 500) {
    console.error('[API ERROR]', err);
  }

  res.status(statusCode).json(response);
}

module.exports = {
  notFoundMiddleware,
  errorMiddleware,
};
