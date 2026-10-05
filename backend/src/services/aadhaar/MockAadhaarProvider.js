const AadhaarAuthProvider = require('./AadhaarAuthProvider');
const { verhoeffValidate } = require('../../utils/verhoeff');
const { logger, maskAadhaar } = require('../../utils/logger');

/**
 * MockAadhaarProvider — development-only mock.
 *
 * ⚠  DEVELOPMENT / MOCK AUTHENTICATION ONLY
 * This provider does NOT contact any UIDAI service.
 * It WILL REFUSE to run in production mode.
 *
 * OTP is randomly generated per transaction and printed only to server console.
 */
class MockAadhaarProvider extends AadhaarAuthProvider {
  constructor() {
    super();
    this._assertNotProduction();
    this._otpStore = new Map(); // transactionId -> otp (in-memory, never sent to client)
  }

  _assertNotProduction() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'MockAadhaarProvider cannot be used in production. ' +
        'Set AADHAAR_PROVIDER=authorized and provide official credentials.'
      );
    }
  }

  _generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  get name() {
    return 'MockAadhaarProvider [DEVELOPMENT ONLY]';
  }

  async validateAadhaar(aadhaar) {
    if (!/^\d{12}$/.test(aadhaar)) {
      return { valid: false, reason: 'Must be exactly 12 digits' };
    }
    if (!verhoeffValidate(aadhaar)) {
      return { valid: false, reason: 'Invalid Aadhaar checksum (Verhoeff)' };
    }
    return { valid: true };
  }

  async requestOtp(aadhaar, transactionId) {
    this._assertNotProduction();
    const otp = this._generateOtp();
    this._otpStore.set(transactionId, otp);
    // OTP is printed only to server console — never sent to the browser
    process.stdout.write(`\n[MOCK] OTP for ${maskAadhaar(aadhaar)} → ${otp}\n\n`);
    logger.info('[MOCK] OTP requested', { aadhaar: maskAadhaar(aadhaar), transactionId });
    const maskedMobile = '*******' + String(Math.floor(1000 + Math.random() * 9000)).slice(-4);
    return {
      success: true,
      maskedMobile,
      providerTxnId: `mock_${transactionId}`,
    };
  }

  async verifyOtp(otp, transactionId, _transaction) {
    this._assertNotProduction();
    logger.info('[MOCK] OTP verify attempt', { transactionId });
    const expectedOtp = this._otpStore.get(transactionId);
    if (!expectedOtp) {
      return { success: false, authenticated: false, error: 'OTP_NOT_FOUND' };
    }
    if (otp === expectedOtp) {
      this._otpStore.delete(transactionId);
      return { success: true, authenticated: true };
    }
    return { success: false, authenticated: false, error: 'OTP_MISMATCH' };
  }

  async resendOtp(transactionId, transaction) {
    this._assertNotProduction();
    const otp = this._generateOtp();
    this._otpStore.set(transactionId, otp);
    process.stdout.write(`\n[MOCK] Resent OTP for txn ${transactionId} → ${otp}\n\n`);
    logger.info('[MOCK] OTP resent', { transactionId });
    const maskedMobile = transaction.maskedMobile || '*******0000';
    return { success: true, maskedMobile };
  }

  /** For automated tests only — do not call from production code. */
  getOtpForTest(transactionId) {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('getOtpForTest() is only available in test environment');
    }
    return this._otpStore.get(transactionId);
  }
}

module.exports = MockAadhaarProvider;
