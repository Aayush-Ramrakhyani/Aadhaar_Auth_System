require('dotenv').config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5001,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5174',
  AADHAAR_PROVIDER: process.env.AADHAAR_PROVIDER || 'mock',
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
    EXPIRY_SECONDS: 300,
    LENGTH: 5,
    MAX_ATTEMPTS: 3,
  },
  OTP: {
    EXPIRY_SECONDS: 300,
    MAX_ATTEMPTS: 3,
    MAX_RESENDS: 3,
    RESEND_COOLDOWN_SECONDS: 60,
    LENGTH: 6,
  },
  TRANSACTION: {
    EXPIRY_SECONDS: 600,
  },
};
