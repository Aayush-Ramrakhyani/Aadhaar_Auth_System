/*
 * routes/captchaRoutes.js
 * Mounts the CAPTCHA generation endpoint at GET /api/captcha with its
 * per-route rate limiter applied before the controller handler.
 */

const express = require('express');
const router = express.Router();
const { captchaLimiter } = require('../middleware/rateLimiter');
const { generateCaptcha } = require('../controllers/captchaController');

router.get('/', captchaLimiter, generateCaptcha);

module.exports = router;
