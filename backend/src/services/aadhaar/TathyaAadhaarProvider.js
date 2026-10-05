  const AadhaarAuthProvider = require('./AadhaarAuthProvider');
  const axios = require('axios');
const { logger, maskAadhaar } = require('../../utils/logger');
const config = require('../../config');

// Tathya endpoints observed in the authorized browser session.
// The request bodies, required headers, and OAuth/PKCE hand-off must be supplied
// from the authorized integration specification before these calls are enabled.
class TathyaAadhaarProvider extends AadhaarAuthProvider {
  constructor() {
    super();
    if (!config.TATHYA.BASE_URL) {
      throw new Error(
        'TathyaAadhaarProvider: TATHYA_BASE_URL must be set in .env'
      );
    }
    this._baseUrl = config.TATHYA.BASE_URL;
    this._sessions = new Map();
  }

  get name() {
    return 'TathyaAadhaarProvider [PAYLOADS REQUIRED]';
  }

  async validateAadhaar(aadhaar) {
    if (!/^\d{12}$/.test(aadhaar)) {
      return { valid: false, reason: 'Must be exactly 12 digits' };
    }
    return { valid: true };
  }

  async generateCaptcha() {
    const response = await axios.get(
      `${this._baseUrl}/access/generateCaptcha`,
      {
        headers: {
          Accept: 'application/json, text/plain, */*',
          Origin: this._baseUrl,
          Referer: `${this._baseUrl}/`,
        },
        validateStatus: () => true,
      }
    );
    const body = this._parseBody(response.data);
    const captcha = this._parseBody(body.message);

    if (response.status < 200 || response.status >= 300 || !captcha?.imageBase64 || !captcha.transactionId) {
      throw new Error(
        `Tathya CAPTCHA request failed (HTTP ${response.status}; sessionActive=${body?.sessionActive})`
      );
    }

    return {
      captchaId: captcha.transactionId,
      image: `data:image/jpeg;base64,${captcha.imageBase64}`,
      audio: captcha.audioBase64 ? `data:audio/wav;base64,${captcha.audioBase64}` : null,
      expiresIn: 300,
    };
  }

  _parseBody(value) {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch (_err) {
      return null;
    }
  }

  async requestOtp(aadhaar, transactionId, { captchaId, captchaValue } = {}) {
    if (!captchaId || !captchaValue) {
      throw new Error('Tathya CAPTCHA transaction and value are required');
    }

    const response = await axios.post(
      `${this._baseUrl}/access/generateOTPForOAuth`,
      { uid: aadhaar, captcha: captchaValue, captchaTxnId: captchaId },
      { validateStatus: () => true }
    );
    const body = this._parseBody(response.data);

    logger.info('[TATHYA] OTP request completed', {
      aadhaar: maskAadhaar(aadhaar),
      transactionId,
    });

    if (response.status < 200 || response.status >= 300 || body?.status !== true || !body.txnId) {
      return { success: false, error: body?.message || 'Tathya OTP request failed' };
    }

    this._sessions.set(transactionId, {
      aadhaar,
      providerTxnId: body.txnId,
    });
    return { success: true, providerTxnId: body.txnId, maskedMobile: null };
  }

  async verifyOtp(otp, transactionId, transaction) {
    logger.info('[TATHYA] OTP login is not enabled until OAuth redirect handling is configured', {
      transactionId,
    });

    const session = this._sessions.get(transactionId);
    if (!session || session.aadhaar !== transaction.aadhaar) {
      return { success: false, authenticated: false, error: 'TATHYA_SESSION_NOT_FOUND' };
    }

    const response = await axios.post(
      `${this._baseUrl}/access/login`,
      { uid: session.aadhaar, otp: String(otp) },
      { validateStatus: () => true }
    );
    const body = this._parseBody(response.data);
    if (response.status < 200 || response.status >= 300 || body?.status !== 'Y' || !body.redirectURL) {
      return { success: false, authenticated: false, error: body?.errorMessage || 'Tathya OTP verification failed' };
    }

    // Tathya requires a browser authorization redirect to produce the code
    // consumed by /access/oauth/token. Do not guess or persist this code.
    throw new Error(
      'Tathya OAuth authorization redirect handling is required before OTP verification can complete'
    );
  }

  async resendOtp(transactionId, transaction) {
    logger.info('[TATHYA] resendOtp requires the original Tathya CAPTCHA flow', {
      transactionId,
    });

    const session = this._sessions.get(transactionId);
    if (!session || session.aadhaar !== transaction.aadhaar) {
      return { success: false, error: 'TATHYA_SESSION_NOT_FOUND' };
    }
    throw new Error(
      'Tathya resend requires a new CAPTCHA before generateOTPForOAuth can be called'
    );
  }
}

module.exports = TathyaAadhaarProvider;
