const crypto = require('crypto');

function generateSecureId(prefix = 'txn') {
  const random = crypto.randomBytes(16).toString('hex');
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${random}`;
}

function generateCaptchaId() {
  return crypto.randomBytes(12).toString('hex');
}

module.exports = { generateSecureId, generateCaptchaId };
