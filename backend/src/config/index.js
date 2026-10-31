/*
 * config/index.js
 * Central configuration module: reads environment variables with safe defaults
 * and exposes structured config objects for provider credentials, OTP policy,
 * CAPTCHA settings, and transaction lifetime.
 */

require('dotenv').config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5001,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5174',
  AADHAAR_PROVIDER: process.env.AADHAAR_PROVIDER || 'mock', // selects which AadhaarAuthProvider implementation is loaded at startup
  UIDAI: {
    BASE_URL: process.env.UIDAI_BASE_URL || '',
    CLIENT_ID: process.env.UIDAI_CLIENT_ID || '',
    CLIENT_SECRET: process.env.UIDAI_CLIENT_SECRET || '',
    AUA_CODE: process.env.UIDAI_AUA_CODE || '',
    SUB_AUA_CODE: process.env.UIDAI_SUB_AUA_CODE || '',
    LICENSE_KEY: process.env.UIDAI_LICENSE_KEY || '',
    CERTIFICATE_PATH: process.env.UIDAI_CERTIFICATE_PATH || '',
  },
  TATHYA: {
    BASE_URL: process.env.TATHYA_BASE_URL || 'https://tathya.uidai.gov.in',
  },
  CAPTCHA: {
    EXPIRY_SECONDS: 300, // CAPTCHA tokens expire after 5 minutes
    LENGTH: 5,           // number of characters in the generated CAPTCHA string
    MAX_ATTEMPTS: 3,     // max failed attempts before the CAPTCHA is invalidated
  },
  OTP: {
    EXPIRY_SECONDS: 300,          // OTP window before the transaction auto-expires
    MAX_ATTEMPTS: 3,              // wrong OTPs allowed before the transaction is locked
    MAX_RESENDS: 3,               // how many times a user may request a resend
    RESEND_COOLDOWN_SECONDS: 60,  // enforced wait between consecutive resend calls
    LENGTH: 6,
  },
  TRANSACTION: {
    EXPIRY_SECONDS: 600, // full session lifetime from OTP request to verification
  },
};
