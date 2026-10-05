const { verhoeffValidate } = require('../utils/verhoeff');

function validateAadhaarFormat(aadhaar) {
  if (!aadhaar) return 'Aadhaar number is required';
  if (typeof aadhaar !== 'string') return 'Aadhaar must be a string';
  if (!/^\d{12}$/.test(aadhaar)) return 'Aadhaar must be exactly 12 digits';
  if (!verhoeffValidate(aadhaar)) return 'Invalid Aadhaar number (checksum failed)';
  return null;
}

function validateOtp(otp) {
  if (!otp) return 'OTP is required';
  if (!/^\d{6}$/.test(String(otp))) return 'OTP must be exactly 6 digits';
  return null;
}

function validateTransactionId(id) {
  if (!id) return 'Transaction ID is required';
  if (typeof id !== 'string' || id.length < 10) return 'Invalid transaction ID';
  return null;
}

// Express middleware for POST /request-otp
function validateOtpRequest(req, res, next) {
  const { aadhaar, captchaId, captchaValue } = req.body;
  const errors = [];

  const aadhaarErr = validateAadhaarFormat(aadhaar);
  if (aadhaarErr) errors.push(aadhaarErr);

  if (!captchaId) errors.push('captchaId is required');
  if (!captchaValue) errors.push('captchaValue is required');

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: errors.join('; ') },
    });
  }
  next();
}

// Express middleware for POST /verify-otp
function validateVerifyOtp(req, res, next) {
  const { transactionId, otp } = req.body;
  const errors = [];

  const txnErr = validateTransactionId(transactionId);
  if (txnErr) errors.push(txnErr);

  const otpErr = validateOtp(otp);
  if (otpErr) errors.push(otpErr);

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: errors.join('; ') },
    });
  }
  next();
}

// Express middleware for POST /resend-otp
function validateResendOtp(req, res, next) {
  const { transactionId } = req.body;
  const err = validateTransactionId(transactionId);
  if (err) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err },
    });
  }
  next();
}

module.exports = {
  validateAadhaarFormat,
  validateOtpRequest,
  validateVerifyOtp,
  validateResendOtp,
};
