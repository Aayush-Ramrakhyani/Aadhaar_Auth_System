const { NODE_ENV } = require('../config');

function maskAadhaar(aadhaar) {
  if (!aadhaar || aadhaar.length < 4) return 'XXXX-XXXX-XXXX';
  return `XXXX-XXXX-${aadhaar.slice(-4)}`;
}

const logger = {
  info: (msg, meta = {}) => {
    if (NODE_ENV !== 'test') {
      console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, meta);
    }
  },
  warn: (msg, meta = {}) => {
    if (NODE_ENV !== 'test') {
      console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, meta);
    }
  },
  error: (msg, meta = {}) => {
    if (NODE_ENV !== 'test') {
      console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, meta);
    }
  },
  debug: (msg, meta = {}) => {
    if (NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`, meta);
    }
  },
};

module.exports = { logger, maskAadhaar };
