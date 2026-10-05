const axios = require('axios');
const AadhaarAuthProvider = require('./AadhaarAuthProvider');
const { verhoeffValidate } = require('../../utils/verhoeff');
const { logger, maskAadhaar } = require('../../utils/logger');

// ─────────────────────────────────────────────────────────────────────────────
// SurepassAadhaarProvider — Surepass KYC API (third-party licensed AUA)
//
// ACTIVATE BY SETTING IN .env:
//   AADHAAR_PROVIDER=surepass
//   SUREPASS_BASE_URL=https://kyc-api.surepass.io/api/v1
//   SUREPASS_API_KEY=<API key from Surepass dashboard>
//
// Sign up / get API key: https://surepass.io  → "Aadhaar Authentication API"
// ─────────────────────────────────────────────────────────────────────────────

class SurepassAadhaarProvider extends AadhaarAuthProvider {
  constructor() {
    super();
    if (!process.env.SUREPASS_API_KEY || !process.env.SUREPASS_BASE_URL) {
      throw new Error(
        'SurepassAadhaarProvider: SUREPASS_API_KEY and SUREPASS_BASE_URL must be set in .env'
      );
    }
    this._client = axios.create({
      baseURL: process.env.SUREPASS_BASE_URL,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${process.env.SUREPASS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
  }

  get name() { return 'SurepassAadhaarProvider'; }

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
      logger.info('[SUREPASS] Requesting OTP', {
        aadhaar: maskAadhaar(aadhaar),
        transactionId,
      });

      const res = await this._client.post('/aadhaar-v2/send-otp', {
        id_number: aadhaar,
      });

      const body = res.data;

      if (!body.success) {
        logger.warn('[SUREPASS] OTP request failed', { message: body.message });
        return { success: false, error: body.message || 'OTP request failed' };
      }

      const clientId = body.data?.client_id;
      if (!clientId) {
        return { success: false, error: 'Surepass did not return a client_id' };
      }

      logger.info('[SUREPASS] OTP sent successfully', { transactionId });

      return {
        success: true,
        providerTxnId: clientId,   // required for verify step
        maskedMobile: null,        // Surepass doesn't return masked mobile at this step
      };
    } catch (err) {
      return this._handleError(err, transactionId, 'requestOtp');
    }
  }

  async verifyOtp(otp, transactionId, transaction) {
    const clientId = transaction.providerTransactionId;
    if (!clientId) {
      return { success: false, authenticated: false, error: 'Missing provider client_id in transaction' };
    }

    try {
      logger.info('[SUREPASS] Verifying OTP', { transactionId });

      const res = await this._client.post('/aadhaar-v2/submit-otp', {
        client_id: clientId,
        otp: String(otp),
      });

      const body = res.data;

      if (!body.success) {
        logger.warn('[SUREPASS] OTP verification failed', { message: body.message });
        return { success: false, authenticated: false, error: body.message };
      }

      logger.info('[SUREPASS] OTP verified successfully', { transactionId });
      return { success: true, authenticated: true };
    } catch (err) {
      // 400/422 from Surepass = wrong/expired OTP — not a server error
      if (err.response?.status === 400 || err.response?.status === 422) {
        const msg = err.response?.data?.message || 'Invalid or expired OTP';
        logger.warn('[SUREPASS] OTP rejected', { transactionId, message: msg });
        return { success: false, authenticated: false, error: msg };
      }
      return this._handleError(err, transactionId, 'verifyOtp');
    }
  }

  async resendOtp(transactionId, transaction) {
    // Surepass has no dedicated resend endpoint — re-call generate-otp.
    // The Aadhaar is stored in the transaction record.
    const aadhaar = transaction.aadhaar;
    if (!aadhaar) {
      return { success: false, error: 'Cannot resend: Aadhaar not in transaction' };
    }
    logger.info('[SUREPASS] Resending OTP (re-calling generate-otp)', { transactionId });
    return this.requestOtp(aadhaar, transactionId);
  }

  _handleError(err, transactionId, method) {
    const status = err.response?.status;
    const msg = err.response?.data?.message || err.message;

    logger.error(`[SUREPASS] ${method} error`, { transactionId, status, message: msg });

    if (status === 401) {
      return { success: false, authenticated: false, error: 'Invalid Surepass API key. Check SUREPASS_API_KEY in .env.' };
    }
    if (status === 422) {
      return { success: false, authenticated: false, error: msg || 'Aadhaar not found or mobile not linked.' };
    }
    if (err.code === 'ECONNABORTED') {
      return { success: false, authenticated: false, error: 'Surepass API timed out. Please try again.' };
    }
    return { success: false, authenticated: false, error: 'Surepass API error. Please try again.' };
  }
}

module.exports = SurepassAadhaarProvider;
