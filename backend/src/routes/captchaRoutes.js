const express = require('express');
const router = express.Router();
const { captchaLimiter } = require('../middleware/rateLimiter');
const { generateCaptcha } = require('../controllers/captchaController');

router.get('/', captchaLimiter, generateCaptcha);

module.exports = router;
