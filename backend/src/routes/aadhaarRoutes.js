const express = require('express');
const router = express.Router();
const { otpRequestLimiter, otpVerifyLimiter } = require('../middleware/rateLimiter');
const { validateOtpRequest, validateVerifyOtp, validateResendOtp } = require('../middleware/validator');
const {
  validateAadhaar,
  requestOtp,
  verifyOtp,
  resendOtp,
  getTransaction,
} = require('../controllers/aadhaarController');

// ─── LOCAL → TATHYA/PROVIDER ENDPOINT MAPPING ────────────────────────────────
//
//  Our local API              Tathya equivalent (what browser calls)
//  ─────────────────────────  ──────────────────────────────────────────────────
//  POST /api/aadhaar/validate  (client-side Verhoeff only — no Tathya call)
//
//  POST /api/aadhaar/request-otp
//    └─ provider calls ──────► POST https://tathya.uidai.gov.in/access/generateOTPForOAuth
//                               (or Surepass: POST /aadhaar/generate-otp)
//
//  POST /api/aadhaar/verify-otp
//    └─ provider calls ──────► POST https://tathya.uidai.gov.in/access/oauth/token
//                                      ?client_id=revamp.myaadhaar
//                                      &grant_type=authorization_code
//                                      &code_verifier=<pkce>
//                                      &code=<auth_code>
//                              then ► POST https://tathya.uidai.gov.in/access/login
//                               (or Surepass: POST /aadhaar/verify-otp)
//
//  POST /api/aadhaar/resend-otp
//    └─ provider calls ──────► POST https://tathya.uidai.gov.in/access/generateOTPForOAuth
//                               (same endpoint as request-otp — no dedicated resend)
//                               (or Surepass: POST /aadhaar/generate-otp again)
//
//  GET  /api/aadhaar/transaction/:id
//    └─ internal only ───────  (no Tathya equivalent — our session tracking)
//
//  Not in our flow (Tathya-internal, not needed):
//    POST https://tathya.uidai.gov.in/profileService/api/v1/oauth/profile
//    POST https://tathya.uidai.gov.in/ssupService/api/demographics/request/v4/fetch/hof
//    POST https://tathya.uidai.gov.in/lockUnlockBiometrics/ext/v1/oauth/getUidPreferences
//    POST https://tathya.uidai.gov.in/myaadhaarmonitoringservice/api/v1/record-real-user-monitoring
//    POST https://tathya.uidai.gov.in/telemetryservice/send-metrics
// ─────────────────────────────────────────────────────────────────────────────

router.post('/validate',     validateAadhaar);
router.post('/request-otp',  otpRequestLimiter, validateOtpRequest, requestOtp);
router.post('/verify-otp',   otpVerifyLimiter,  validateVerifyOtp,  verifyOtp);
router.post('/resend-otp',   otpVerifyLimiter,  validateResendOtp,  resendOtp);
router.get('/transaction/:transactionId', getTransaction);

module.exports = router;
