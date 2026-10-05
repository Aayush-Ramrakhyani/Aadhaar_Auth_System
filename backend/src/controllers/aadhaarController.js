const { getProvider } = require('../services/aadhaar');
const captchaService = require('../services/captchaService');
const transactionService = require('../services/transactionService');
const { logger, maskAadhaar } = require('../utils/logger');
const config = require('../config');

// POST /api/aadhaar/validate
// Tathya equivalent: none — Tathya does client-side format check only before calling generateOTPForOAuth
async function validateAadhaar(req, res) {
  try {
    const { aadhaar } = req.body;
    if (!aadhaar) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Aadhaar number is required' },
      });
    }
    const provider = getProvider();
    const result = await provider.validateAadhaar(String(aadhaar));
    if (result.valid) {
      return res.json({ success: true, data: { valid: true }, message: 'Aadhaar format is valid' });
    }
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_AADHAAR', message: result.reason || 'Invalid Aadhaar number' },
    });
  } catch (err) {
    logger.error('validateAadhaar error', { message: err.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Validation failed' },
    });
  }
}

// POST /api/aadhaar/request-otp
// Tathya equivalent: POST https://tathya.uidai.gov.in/access/generateOTPForOAuth
//   → sends Aadhaar + CAPTCHA, triggers OTP to registered mobile
//   → provider.requestOtp() is where that external call goes
async function requestOtp(req, res) {
  try {
    const { aadhaar, captchaId, captchaValue } = req.body;

    const provider = getProvider();
    const captchaResult = config.AADHAAR_PROVIDER.toLowerCase() === 'tathya'
      ? { valid: true }
      : captchaService.validate(captchaId, captchaValue);
    if (!captchaResult.valid) {
      const messages = {
        CAPTCHA_NOT_FOUND: 'CAPTCHA not found. Please refresh and try again.',
        CAPTCHA_EXPIRED: 'CAPTCHA has expired. Please refresh.',
        CAPTCHA_INVALID: 'Incorrect CAPTCHA. Please try again.',
        CAPTCHA_MAX_ATTEMPTS: 'Too many CAPTCHA attempts. Please refresh.',
      };
      return res.status(400).json({
        success: false,
        error: {
          code: captchaResult.reason,
          message: messages[captchaResult.reason] || 'CAPTCHA validation failed',
        },
      });
    }

    // Validate Aadhaar via provider
    const aadhaarResult = await provider.validateAadhaar(String(aadhaar));
    if (!aadhaarResult.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AADHAAR', message: aadhaarResult.reason || 'Invalid Aadhaar number' },
      });
    }

    // Create transaction
    const transaction = transactionService.create(aadhaar.slice(-4));

    // Request OTP from provider
    const otpResult = await provider.requestOtp(String(aadhaar), transaction.transactionId, {
      captchaId,
      captchaValue,
    });
    if (!otpResult.success) {
      transactionService.remove(transaction.transactionId);
      return res.status(502).json({
        success: false,
        error: { code: 'OTP_REQUEST_FAILED', message: otpResult.error || 'OTP request failed' },
      });
    }

    // Update transaction with provider data
    transactionService.update(transaction.transactionId, {
      status: transactionService.STATUS.OTP_SENT,
      maskedMobile: otpResult.maskedMobile || null,
      providerTransactionId: otpResult.providerTxnId || null,
      aadhaar: String(aadhaar), // stored only for OTP verification; cleared after
    });

    logger.info('OTP requested successfully', {
      transactionId: transaction.transactionId,
      aadhaar: maskAadhaar(aadhaar),
    });

    return res.json({
      success: true,
      data: {
        transactionId: transaction.transactionId,
        maskedMobile: otpResult.maskedMobile || null,
        expiresIn: config.TRANSACTION.EXPIRY_SECONDS,
        isMock: config.AADHAAR_PROVIDER === 'mock',
      },
      message: 'OTP request initiated',
    });
  } catch (err) {
    logger.error('requestOtp error', { message: err.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to request OTP. Please try again.' },
    });
  }
}

// POST /api/aadhaar/verify-otp
// Tathya equivalent (two-step):
// POST https://tathya.uidai.gov.in/access/oauth/token
//              ?client_id=revamp.myaadhaar&grant_type=authorization_code
//              &code_verifier=<pkce>&code=<auth_code>
//              → returns access_token + SESSION cookie
// POST https://tathya.uidai.gov.in/access/login   (establishes session)
//   → provider.verifyOtp() is where those external calls go
async function verifyOtp(req, res) {
  try {
    const { transactionId, otp } = req.body;

    const transaction = transactionService.get(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: { code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found or expired' },
      });
    }

    if (transactionService.isExpired(transaction)) {
      return res.status(410).json({
        success: false,
        error: { code: 'TRANSACTION_EXPIRED', message: 'Transaction has expired. Please start again.' },
      });
    }

    if (transaction.status === transactionService.STATUS.OTP_VERIFIED) {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_VERIFIED', message: 'OTP already verified for this transaction.' },
      });
    }

    if (transaction.otpAttempts >= config.OTP.MAX_ATTEMPTS) {
      transactionService.update(transactionId, { status: transactionService.STATUS.OTP_FAILED });
      return res.status(429).json({
        success: false,
        error: { code: 'OTP_MAX_ATTEMPTS', message: 'Maximum OTP attempts exceeded. Please start again.' },
      });
    }

    // Increment attempt count
    transactionService.update(transactionId, { otpAttempts: transaction.otpAttempts + 1 });

    const provider = getProvider();
    const result = await provider.verifyOtp(String(otp), transactionId, transaction);

    if (result.authenticated) {
      transactionService.update(transactionId, { status: transactionService.STATUS.OTP_VERIFIED, aadhaar: null });
      logger.info('Authentication successful', { transactionId });
      return res.json({
        success: true,
        data: { authenticated: true },
        message: 'Aadhaar authentication successful',
      });
    }

    logger.info('Authentication failed — wrong OTP', { transactionId, providerError: result.error });
    // Surface provider-level errors (e.g. "Insufficient credits") separately from wrong-OTP
    if (result.providerError) {
      return res.status(502).json({
        success: false,
        error: { code: 'PROVIDER_ERROR', message: result.error },
      });
    }
    return res.status(401).json({
      success: false,
      error: { code: 'OTP_INVALID', message: result.error || 'Invalid OTP. Please check and try again.' },
    });
  } catch (err) {
    logger.error('verifyOtp error', { message: err.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'OTP verification failed. Please try again.' },
    });
  }
}

// POST /api/aadhaar/resend-otp
// Tathya equivalent: POST https://tathya.uidai.gov.in/access/generateOTPForOAuth  (same as request-otp)
//   Tathya has no separate resend endpoint — it re-calls generateOTPForOAuth
//   → provider.resendOtp() is where that repeat call goes
async function resendOtp(req, res) {
  try {
    const { transactionId } = req.body;

    const transaction = transactionService.get(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: { code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found or expired' },
      });
    }

    if (transactionService.isExpired(transaction)) {
      return res.status(410).json({
        success: false,
        error: { code: 'TRANSACTION_EXPIRED', message: 'Transaction expired. Please start again.' },
      });
    }

    if (transaction.resendCount >= config.OTP.MAX_RESENDS) {
      return res.status(429).json({
        success: false,
        error: { code: 'RESEND_LIMIT', message: 'Maximum OTP resend limit reached. Please start again.' },
      });
    }

    // Enforce resend cooldown
    if (transaction.lastResendAt) {
      const elapsed = (Date.now() - new Date(transaction.lastResendAt).getTime()) / 1000;
      if (elapsed < config.OTP.RESEND_COOLDOWN_SECONDS) {
        const remaining = Math.ceil(config.OTP.RESEND_COOLDOWN_SECONDS - elapsed);
        return res.status(429).json({
          success: false,
          error: { code: 'RESEND_COOLDOWN', message: `Please wait ${remaining} seconds before resending OTP.` },
        });
      }
    }

    const provider = getProvider();
    const result = await provider.resendOtp(transactionId, transaction);

    if (!result.success) {
      return res.status(502).json({
        success: false,
        error: { code: 'RESEND_FAILED', message: result.error || 'Failed to resend OTP' },
      });
    }

    transactionService.update(transactionId, {
      resendCount: transaction.resendCount + 1,
      lastResendAt: new Date().toISOString(),
      otpAttempts: 0, // reset attempts on resend
    });

    logger.info('OTP resent', { transactionId });
    return res.json({
      success: true,
      data: { maskedMobile: result.maskedMobile || null },
      message: 'OTP resent successfully',
    });
  } catch (err) {
    logger.error('resendOtp error', { message: err.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to resend OTP.' },
    });
  }
}

// GET /api/aadhaar/transaction/:transactionId
async function getTransaction(req, res) {
  try {
    const { transactionId } = req.params;
    const transaction = transactionService.get(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: { code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found' },
      });
    }
    // Return only safe fields — never return stored Aadhaar or OTP
    return res.json({
      success: true,
      data: {
        transactionId: transaction.transactionId,
        status: transaction.status,
        createdAt: transaction.createdAt,
        expiresAt: transaction.expiresAt,
        otpAttempts: transaction.otpAttempts,
        resendCount: transaction.resendCount,
        maskedMobile: transaction.maskedMobile || null,
      },
    });
  } catch (err) {
    logger.error('getTransaction error', { message: err.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve transaction.' },
    });
  }
}

module.exports = { validateAadhaar, requestOtp, verifyOtp, resendOtp, getTransaction };
