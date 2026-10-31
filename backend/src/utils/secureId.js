/*
 * utils/secureId.js
 * Generates cryptographically secure unique identifiers: prefixed transaction
 * IDs (timestamp + 16 random bytes) and hex CAPTCHA IDs (12 random bytes).
 */

const crypto = require('crypto');

function generateSecureId(prefix = 'txn') {
  const random = crypto.randomBytes(16).toString('hex'); // 128 bits of cryptographic randomness
  const ts = Date.now().toString(36); // base-36 timestamp prefix aids chronological sorting
  return `${prefix}_${ts}_${random}`;
}

function generateCaptchaId() {
  return crypto.randomBytes(12).toString('hex'); // 96 bits of randomness — sufficient for a short-lived CAPTCHA token
}

module.exports = { generateSecureId, generateCaptchaId };
