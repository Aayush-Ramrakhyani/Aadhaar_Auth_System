const captchaService = require('../services/captchaService');
const config = require('../config');
const { logger } = require('../utils/logger');

async function generateCaptcha(req, res) {
  try {
    if (config.AADHAAR_PROVIDER.toLowerCase() === 'tathya') {
      const { getProvider } = require('../services/aadhaar');
      const captcha = await getProvider().generateCaptcha();
      return res.json({ success: true, data: captcha });
    }
    const captcha = captchaService.create();
    res.json({
      success: true,
      data: {
        captchaId: captcha.captchaId,
        image: captcha.image,
        expiresIn: captcha.expiresIn,
      },
    });
  } catch (err) {
    logger.error('generateCaptcha error', { message: err.message });
    res.status(500).json({
      success: false,
      error: { code: 'CAPTCHA_ERROR', message: 'Failed to generate CAPTCHA' },
    });
  }
}

module.exports = { generateCaptcha };
