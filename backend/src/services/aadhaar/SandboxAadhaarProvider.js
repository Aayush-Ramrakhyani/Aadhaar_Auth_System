const axios = require('axios');
const AadhaarAuthProvider = require('./AadhaarAuthProvider');
const { verhoeffValidate } = require('../../utils/verhoeff');
const { logger, maskAadhaar } = require('../../utils/logger');

// ─────────────────────────────────────────────────────────────────────────────
// SandboxAadhaarProvider — Sandbox.co.in Aadhaar OTP API
//
// Required in .env:
//   AADHAAR_PROVIDER=sandbox
//   SANDBOX_API_KEY=key_live_...
//   SANDBOX_API_SECRET=secret_live_...
//
// Endpoints:
//   POST https://api.sandbox.co.in/authenticate               ← get access token
//   POST https://api.sandbox.co.in/kyc/aadhaar/okyc/otp       ← send OTP
//   POST https://api.sandbox.co.in/kyc/aadhaar/okyc/otp/verify ← verify OTP
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://api.sandbox.co.in';

class SandboxAadhaarProvider extends AadhaarAuthProvider {
  constructor() {
    super();
    if (!process.env.SANDBOX_API_KEY || !process.env.SANDBOX_API_SECRET) {
      throw new Error(
        'SandboxAadhaarProvider: SANDBOX_API_KEY and SANDBOX_API_SECRET must be set in .env'
      );
    }
    this._apiKey    = process.env.SANDBOX_API_KEY;
    this._apiSecret = process.env.SANDBOX_API_SECRET;
    this._accessToken    = null;
    this._tokenExpiresAt = 0;
  }

  get name() { return 'SandboxAadhaarProvider'; }

  // Authenticate with Sandbox using API key + secret → get short-lived token.
  // Token is cached for 55 min and auto-refreshed.
  async _getAccessToken() {
    if (this._accessToken && Date.now() < this._tokenExpiresAt) {
      return this._accessToken;
    }
    try {
      const res = await axios.post(
        `${BASE_URL}/authenticate`,
        {},
        {
          headers: {
            'x-api-key':    this._apiKey,
            'x-api-secret': this._apiSecret,
            'x-api-version': '2.0',
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const token = res.data?.access_token || res.data?.data?.access_token;
      if (!token) throw new Error('No access_token in Sandbox auth response');

      this._accessToken    = token;
      this._tokenExpiresAt = Date.now() + 55 * 60 * 1000;
      logger.info('[SANDBOX] Access token obtained');
      return this._accessToken;
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      logger.error('[SANDBOX] Authentication failed', { error: msg });
      throw new Error(`Sandbox authentication failed: ${msg}`);
    }
  }

  _headers(token) {
    return {
      Authorization:   token,
      'x-api-key':     this._apiKey,
      'x-api-version': '2.0',
      'Content-Type':  'application/json',
    };
  }

  async validateAadhaar(aadhaar) {
    if (!/^\d{12}$/.test(aadhaar)) {
      return { valid: false, reason: 'Must be exactly 12 digits' };
    }
    if (!verhoeffValidate(aadhaar)) {
      return { valid: false, reason: 'Invalid Aadhaar number' };
    }
    return { valid: true };
  }

  async requestOtp(aadhaar, transactionId) {
    try {
      const token = await this._getAccessToken();

      logger.info('[SANDBOX] Sending OTP', {
        aadhaar: maskAadhaar(aadhaar),
        transactionId,
      });

      const res = await axios.post(
        `${BASE_URL}/kyc/aadhaar/okyc/otp`,
        {
          '@entity':      'in.co.sandbox.kyc.aadhaar.okyc.otp.request',
          aadhaar_number: aadhaar,
          consent:        'y',
          reason:         'Aadhaar OTP Authentication',
        },
        { headers: this._headers(token), timeout: 30000 }
      );

      const body = res.data;

      logger.info('[SANDBOX] OTP request full response', { body: JSON.stringify(body) });

      // Verify step needs reference_id (numeric, inside data), not transaction_id
      const referenceId = body.data?.reference_id;
      if (!referenceId) {
        logger.error('[SANDBOX] Unexpected OTP response — no reference_id', { body });
        return { success: false, error: 'OTP request failed — no reference_id returned' };
      }

      logger.info('[SANDBOX] OTP sent', { transactionId, referenceId });
      return {
        success: true,
        providerTxnId: String(referenceId),
        maskedMobile:  null,
      };
    } catch (err) {
      return this._handleError(err, transactionId, 'requestOtp');
    }
  }

  async verifyOtp(otp, transactionId, transaction) {
    const sandboxTxnId = transaction.providerTransactionId;
    if (!sandboxTxnId) {
      return { success: false, authenticated: false, error: 'Missing sandbox transaction_id' };
    }

    try {
      const token = await this._getAccessToken();

      const verifyPayload = {
        '@entity':    'in.co.sandbox.kyc.aadhaar.okyc.request',
        reference_id: sandboxTxnId,   // stored as string, Sandbox accepts string or number
        otp:          String(otp),
      };
      logger.info('[SANDBOX] Verifying OTP — payload', { transactionId, referenceId: sandboxTxnId, payload: JSON.stringify(verifyPayload) });

      const res = await axios.post(
        `${BASE_URL}/kyc/aadhaar/okyc/otp/verify`,
        verifyPayload,
        { headers: this._headers(token), timeout: 30000 }
      );

      const body = res.data;
      logger.info('[SANDBOX] Verify full response', { body: JSON.stringify(body) });

      if (body.code === 200 && body.data) {
        logger.info('[SANDBOX] OTP verified successfully', { transactionId });
        return { success: true, authenticated: true };
      }

      return { success: false, authenticated: false, error: body.message || 'OTP verification failed' };
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Invalid or expired OTP';
      logger.warn('[SANDBOX] OTP rejected', { transactionId, status, message: msg, fullResponse: JSON.stringify(err.response?.data) });

      if (status === 403) {
        return { success: false, authenticated: false, providerError: true, error: 'Sandbox account has insufficient credits. Please top up at console.sandbox.co.in.' };
      }
      if (status === 401) {
        return { success: false, authenticated: false, providerError: true, error: 'Invalid Sandbox credentials. Check SANDBOX_API_KEY / SANDBOX_API_SECRET.' };
      }
      if (status >= 400 && status < 500) {
        return { success: false, authenticated: false, error: msg };
      }
      return this._handleError(err, transactionId, 'verifyOtp');
    }
  }

  async resendOtp(transactionId, transaction) {
    const aadhaar = transaction.aadhaar;
    if (!aadhaar) {
      return { success: false, error: 'Cannot resend: Aadhaar not in transaction' };
    }
    logger.info('[SANDBOX] Resending OTP', { transactionId });
    return this.requestOtp(aadhaar, transactionId);
  }

  _handleError(err, transactionId, method) {
    const status = err.response?.status;
    const msg    = err.response?.data?.message || err.message;
    logger.error(`[SANDBOX] ${method} error`, { transactionId, status, message: msg });

    if (status === 401) return { success: false, authenticated: false, error: 'Invalid Sandbox credentials. Check SANDBOX_API_KEY / SANDBOX_API_SECRET.' };
    if (status === 422) return { success: false, authenticated: false, error: msg || 'Aadhaar not found or mobile not linked.' };
    if (err.code === 'ECONNABORTED') return { success: false, authenticated: false, error: 'Request timed out. Please try again.' };
    return { success: false, authenticated: false, error: 'Sandbox API error. Please try again.' };
  }
}

module.exports = SandboxAadhaarProvider;
