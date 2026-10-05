const crypto = require('crypto');
const { generateCaptchaId } = require('../utils/secureId');
const { logger } = require('../utils/logger');
const config = require('../config');

// In-memory captcha store { captchaId -> { answer, expiresAt, attempts } }
const captchaStore = new Map();

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateText(length) {
  let text = '';
  for (let i = 0; i < length; i++) {
    text += CHARS[crypto.randomInt(CHARS.length)];
  }
  return text;
}

// Generate a simple SVG-based captcha (no canvas dependency required)
function generateSvgCaptcha(text) {
  const width = 160;
  const height = 50;
  const colors = ['#1a237e', '#004d40', '#b71c1c', '#4a148c', '#e65100'];

  let svgChars = '';
  for (let i = 0; i < text.length; i++) {
    const x = 15 + i * 27;
    const y = 33 + crypto.randomInt(8) - 4;
    const rotate = crypto.randomInt(20) - 10;
    const color = colors[crypto.randomInt(colors.length)];
    svgChars += `<text x="${x}" y="${y}" fill="${color}" font-size="22" font-family="monospace" font-weight="bold" transform="rotate(${rotate},${x},${y})">${text[i]}</text>`;
  }

  // Add noise lines
  let lines = '';
  for (let i = 0; i < 4; i++) {
    const x1 = crypto.randomInt(width);
    const y1 = crypto.randomInt(height);
    const x2 = crypto.randomInt(width);
    const y2 = crypto.randomInt(height);
    const color = colors[crypto.randomInt(colors.length)];
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1" opacity="0.4"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f5f5f5" rx="4"/>
  ${lines}
  ${svgChars}
</svg>`;

  return Buffer.from(svg).toString('base64');
}

function create() {
  const text = generateText(config.CAPTCHA.LENGTH);
  const id = generateCaptchaId();
  const expiresAt = Date.now() + config.CAPTCHA.EXPIRY_SECONDS * 1000;

  captchaStore.set(id, { answer: text, expiresAt, attempts: 0 });

  const svgBase64 = generateSvgCaptcha(text);

  logger.debug('Captcha created', { captchaId: id });

  return {
    captchaId: id,
    image: `data:image/svg+xml;base64,${svgBase64}`,
    expiresIn: config.CAPTCHA.EXPIRY_SECONDS,
  };
}

function validate(captchaId, userValue) {
  const entry = captchaStore.get(captchaId);

  if (!entry) {
    return { valid: false, reason: 'CAPTCHA_NOT_FOUND' };
  }

  if (Date.now() > entry.expiresAt) {
    captchaStore.delete(captchaId);
    return { valid: false, reason: 'CAPTCHA_EXPIRED' };
  }

  entry.attempts += 1;

  if (entry.attempts > config.CAPTCHA.MAX_ATTEMPTS) {
    captchaStore.delete(captchaId);
    return { valid: false, reason: 'CAPTCHA_MAX_ATTEMPTS' };
  }

  if (String(userValue).toUpperCase().trim() !== entry.answer) {
    return { valid: false, reason: 'CAPTCHA_INVALID' };
  }

  // Delete after successful use — one-time
  captchaStore.delete(captchaId);
  return { valid: true };
}

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of captchaStore.entries()) {
    if (now > entry.expiresAt) captchaStore.delete(id);
  }
}, 60 * 1000);

module.exports = { create, validate };
