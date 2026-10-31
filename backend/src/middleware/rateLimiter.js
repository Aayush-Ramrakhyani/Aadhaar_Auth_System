/*
 * middleware/rateLimiter.js
 * Defines express-rate-limit instances for each sensitive endpoint (OTP request,
 * OTP verify, CAPTCHA generation) plus a global per-IP limiter applied to all routes.
 * Limits are relaxed in test mode so integration tests are never blocked.
 */

const rateLimit = require('express-rate-limit');

const IS_TEST = process.env.NODE_ENV === 'test';

// In test mode use very high limits so integration tests don't get blocked.
const otpRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10-minute sliding window
  max: IS_TEST ? 1000 : 5,  // 5 OTP requests per IP per window in production
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many OTP requests. Please try again after 10 minutes.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5-minute sliding window
  max: IS_TEST ? 1000 : 10, // 10 verify attempts per IP per window in production
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many verification attempts. Please wait before retrying.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const captchaLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: IS_TEST ? 1000 : 30,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many CAPTCHA requests.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15-minute window applied to all routes
  max: IS_TEST ? 10000 : 200,  // 200 requests per IP per window in production
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many requests from this IP.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { otpRequestLimiter, otpVerifyLimiter, captchaLimiter, globalLimiter };
