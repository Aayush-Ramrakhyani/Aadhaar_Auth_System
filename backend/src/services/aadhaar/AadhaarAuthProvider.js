/**
 * AadhaarAuthProvider — abstract base class.
 * All authentication providers must implement these methods.
 *
 * Switch providers via AADHAAR_PROVIDER env variable:
 *   mock  → MockAadhaarProvider  (development only)
 *   uidai → UidaiAadhaarProvider (requires official credentials)
 */
class AadhaarAuthProvider {
  /**
   * @param {string} aadhaar - 12-digit Aadhaar number
   * @returns {{ valid: boolean, reason?: string }}
   */
  async validateAadhaar(aadhaar) {
    throw new Error('validateAadhaar() must be implemented by provider');
  }

  /**
   * Request OTP for the given Aadhaar.
   * @param {string} aadhaar
   * @param {string} transactionId - internal transaction ID
   * @returns {{ success: boolean, maskedMobile?: string, providerTxnId?: string, error?: string }}
   */
  async requestOtp(aadhaar, transactionId) {
    throw new Error('requestOtp() must be implemented by provider');
  }

  /**
   * Verify OTP.
   * @param {string} otp
   * @param {string} transactionId
   * @param {object} transaction - full transaction record
   * @returns {{ success: boolean, authenticated: boolean, error?: string }}
   */
  async verifyOtp(otp, transactionId, transaction) {
    throw new Error('verifyOtp() must be implemented by provider');
  }

  /**
   * Resend OTP.
   * @param {string} transactionId
   * @param {object} transaction
   * @returns {{ success: boolean, maskedMobile?: string, error?: string }}
   */
  async resendOtp(transactionId, transaction) {
    throw new Error('resendOtp() must be implemented by provider');
  }

  /** Provider name shown in logs. */
  get name() {
    return 'AadhaarAuthProvider';
  }
}

module.exports = AadhaarAuthProvider;
