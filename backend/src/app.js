require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { globalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const aadhaarRoutes = require('./routes/aadhaarRoutes');
const captchaRoutes = require('./routes/captchaRoutes');
const config = require('./config');

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: config.FRONTEND_URL,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Global rate limiter
app.use(globalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      provider: config.AADHAAR_PROVIDER,
      env: config.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
});

// API routes
app.use('/api/captcha', captchaRoutes);
app.use('/api/aadhaar', aadhaarRoutes);

// 404 + error handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;
