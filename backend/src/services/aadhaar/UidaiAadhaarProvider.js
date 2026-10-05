const axios = require('axios');
const AadhaarAuthProvider = require('./AadhaarAuthProvider');
const { logger, maskAadhaar } = require('../../utils/logger');
const config = require('../../config');

// ─────────────────────────────────────────────────────────────────────────────
// UidaiAadhaarProvider — Official UIDAI Auth API v2.5 (test sandbox)
//
// Test credentials (from UIDAI developer portal):
//   AADHAAR_PROVIDER=uidai
//   UIDAI_BASE_URL=https://developer.uidai.gov.in
//   UIDAI_AUA_CODE=public
//   UIDAI_SUB_AUA_CODE=public
//   UIDAI_LICENSE_KEY=MOw-DpjjHGxPlnKDXZlGh72zoPoryq4q5K1AhJL58HKfsoeCklXadcw
//
// OTP endpoint  : https://developer.uidai.gov.in/uidotp/2.5
// Auth endpoint : https://developer.uidai.gov.in/authserver/2.5
//
// verifyOtp still needs: UIDAI public cert + AUA p12 keystore
//   Request from: authsupport@uidai.net.in
// ─────────────────────────────────────────────────────────────────────────────

class UidaiAadhaarProvider extends AadhaarAuthProvider {
  constructor() {
    super();
    this._validateConfig();
    this._baseUrl    = config.UIDAI.BASE_URL || 'https://developer.uidai.gov.in';
    this._auaCode    = config.UIDAI.AUA_CODE;
    this._subAuaCode = config.UIDAI.SUB_AUA_CODE || config.UIDAI.AUA_CODE;
    this._licenseKey = config.UIDAI.LICENSE_KEY;
  }

  _validateConfig() {
    const required = ['AUA_CODE', 'LICENSE_KEY'];
    const missing = required.filter(k => !config.UIDAI[k]);
    if (missing.length > 0) {
      throw new Error(
        `UidaiAadhaarProvider: missing config — ${missing.join(', ')}. ` +
        `Set AADHAAR_PROVIDER=mock for development.`
      );
    }
  }

  get name() { return 'UidaiAadhaarProvider [UIDAI test sandbox]'; }

  async validateAadhaar(aadhaar) {
    if (!/^\d{12}$/.test(aadhaar)) {
      return { valid: false, reason: 'Must be exactly 12 digits' };
    }
    return { valid: true };
  }

  // Build the OTP request XML per UIDAI Auth API v2.5 spec
  _buildOtpXml(aadhaar, txnId) {
    const ts = new Date().toISOString().slice(0, 19);
    return (
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Auth uid="${aadhaar}" tid="public"` +
      ` ac="${this._auaCode}" sa="${this._subAuaCode}"` +
      ` ver="2.5" txn="${txnId}" ts="${ts}"` +
      ` lk="${this._licenseKey}">` +
      `<Uses otp="y" pi="n" pa="n" pfa="n" bio="n" bt=""/>` +
      `<Meta udc="NTR" rdsId="" rdsVer="" dpId="" dcId="" mi="" mc=""/>` +
      `</Auth>`
    );
  }

  // Extract a single XML attribute value from a response string
  _attr(xml, name) {
    const m = String(xml).match(new RegExp(`\\b${name}="([^"]*)"`));
    return m ? m[1] : null;
  }

  async requestOtp(aadhaar, transactionId) {
    // ── API CALL: UIDAI OTP v2.5 ─────────────────────────────────────────
    // POST https://developer.uidai.gov.in/uidotp/2.5/{AUA}/{SUB_AUA}/{d1}/{d2}
    // Content-Type: application/xml
    // Body: XML built by _buildOtpXml()
    //
    // Success response: <OtpRes ret="y" err="0" txn="..." ts="..." .../>
    // Failure response: <OtpRes ret="n" err="<code>" .../>
    //   err="566" → UID not found in test/production database
    //   err="520" → request signature required (need AUA p12 signing)
    //   err="567" → XML format error
    //   err="300" → invalid license key
    //   err="200" → invalid AUA code
    //   err="800" → OTP rate-limited (try after 30 s)
    // ─────────────────────────────────────────────────────────────────────
    const d1 = aadhaar[0];
    const d2 = aadhaar[1];
    const url = `${this._baseUrl}/uidotp/2.5/${this._auaCode}/${this._subAuaCode}/${d1}/${d2}`;
    const xml = this._buildOtpXml(aadhaar, transactionId);

    logger.info('[UIDAI] Sending OTP request to test sandbox', {
      aadhaar: maskAadhaar(aadhaar),
      transactionId,
      url,
    });

    let response;
    try {
      response = await axios.post(url, xml, {
        headers: {
          'Content-Type': 'application/xml',
          'Accept': 'application/xml, */*',
        },
        validateStatus: () => true,
        timeout: 15000,
      });
    } catch (err) {
      logger.error('[UIDAI] Network error on OTP request', { message: err.message });
      return { success: false, error: `Network error: ${err.message}` };
    }

    const body = typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data);

    logger.info('[UIDAI] OTP raw response', {
      httpStatus: response.status,
      body: body.slice(0, 500),
    });

    const ret = this._attr(body, 'ret');
    const err = this._attr(body, 'err');
    const txn = this._attr(body, 'txn');

    if (ret === 'y') {
      logger.info('[UIDAI] OTP sent successfully by UIDAI', { transactionId });
      return {
        success: true,
        maskedMobile: null,
        providerTxnId: txn || transactionId,
      };
    }

    // Map known UIDAI error codes
    const errorMap = {
      '200': 'Invalid or blocked AUA code',
      '210': 'Invalid or blocked Sub-AUA code',
      '300': 'Invalid license key',
      '520': 'Request signature verification failed — AUA p12 signing required',
      '560': 'Invalid transaction ID',
      '565': 'Duplicate transaction ID',
      '566': 'Aadhaar number not found in UIDAI database',
      '567': 'XML format error in OTP request',
      '568': 'Aadhaar is suspended',
      '569': 'Aadhaar is locked',
      '800': 'OTP already sent — please wait 30 seconds before requesting again',
    };

    return {
      success: false,
      error: errorMap[err] || `UIDAI error: ${err || 'unknown'} (HTTP ${response.status})`,
    };
  }

  async verifyOtp(otp, transactionId, _transaction) {
    // ── API CALL: UIDAI Auth v2.5 ─────────────────────────────────────────
    // POST https://developer.uidai.gov.in/authserver/2.5
    //
    // This requires:
    //   1. PID XML built: <Pid ts="..." ver="1.0"><Pv otp="<otp>"/></Pid>
    //   2. AES-256 random session key → encrypt PID → base64 → <Data type="X">
    //   3. Encrypt session key with UIDAI RSA public cert → base64 → <Skey ci="...">
    //   4. HMAC-SHA256 of PID bytes → base64 → <Hmac>
    //   5. Sign entire Auth XML with AUA private key from .p12
    //
    // MISSING: UIDAI public certificate file + AUA p12 keystore
    // Request them from: authsupport@uidai.net.in
    //   Subject: "Request for public AUA p12 and UIDAI staging certificate"
    // ─────────────────────────────────────────────────────────────────────

    logger.warn('[UIDAI] verifyOtp: certificates not yet available', { transactionId });

    return {
      success: false,
      authenticated: false,
      error: 'UIDAI certificate not yet configured. Email authsupport@uidai.net.in to request test p12.',
    };
  }

  async resendOtp(transactionId, transaction) {
    // Resend = re-call OTP endpoint with same Aadhaar
    if (!transaction.aadhaar) {
      return { success: false, error: 'Aadhaar not available in transaction' };
    }
    return this.requestOtp(transaction.aadhaar, transactionId);
  }
}

module.exports = UidaiAadhaarProvider;
