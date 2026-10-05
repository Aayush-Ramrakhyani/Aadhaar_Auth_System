import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CaptchaWidget from '../components/CaptchaWidget';
import { validateAadhaarClient } from '../utils/verhoeff';
import { aadhaarApi } from '../services/api';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();

  const [aadhaar, setAadhaar] = useState('');
  const [aadhaarError, setAadhaarError] = useState(null);

  const [captchaId, setCaptchaId] = useState(null);
  const [captchaValue, setCaptchaValue] = useState('');
  const [captchaError, setCaptchaError] = useState(null);

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleAadhaarChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    setAadhaar(raw);
    setAadhaarError(null);
    setServerError(null);
  };

  const handleCaptchaReady = useCallback((id, val) => {
    setCaptchaId(id);
    setCaptchaValue(val);
    setCaptchaError(null);
    setServerError(null);
  }, []);

  // Format: XXXX XXXX XXXX for display
  const displayAadhaar = aadhaar
    .match(/.{1,4}/g)
    ?.join(' ') || aadhaar;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Client-side validation
    const err = validateAadhaarClient(aadhaar);
    if (err) { setAadhaarError(err); return; }

    if (!captchaId) { setCaptchaError('Please wait for CAPTCHA to load'); return; }
    if (!captchaValue || captchaValue.length < 5) {
      setCaptchaError('Please enter the complete 5-character CAPTCHA');
      return;
    }

    setLoading(true);
    setServerError(null);

    try {
      const result = await aadhaarApi.requestOtp(aadhaar, captchaId, captchaValue);
      navigate('/otp', {
        state: {
          transactionId: result.data.transactionId,
          maskedMobile: result.data.maskedMobile,
          expiresIn: result.data.expiresIn,
          isMock: result.data.isMock,
        },
      });
    } catch (err) {
      const code = err.code || '';
      if (code === 'INVALID_AADHAAR') {
        setAadhaarError(err.message);
      } else if (code.startsWith('CAPTCHA')) {
        setCaptchaError(err.message);
      } else {
        setServerError(err.message || 'Failed to request OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrap">
      <Header />
      <main className="main-content">
        <div className="login-card">
          <div className="card-header">
            <div className="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="4" width="18" height="16" rx="2"/>
                <circle cx="9" cy="10" r="2"/>
                <path d="M5 20c0-2.2 1.8-4 4-4h6c2.2 0 4 1.8 4 4"/>
                <line x1="15" y1="8" x2="19" y2="8"/>
                <line x1="15" y1="12" x2="17" y2="12"/>
              </svg>
            </div>
            <div>
              <h1 className="card-title">Login to Aadhaar via OTP</h1>
              <p className="card-subtitle">Enter your 12-digit Aadhaar number to receive an OTP</p>
            </div>
          </div>

          {serverError && (
            <div className="alert alert-error" role="alert">
              <span>⚠</span>
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate autoComplete="off">
            <div className="form-group">
              <label className="form-label" htmlFor="aadhaar">
                Enter Aadhaar Number
              </label>
              <input
                id="aadhaar"
                type="text"
                inputMode="numeric"
                className={`form-input aadhaar-input${aadhaarError ? ' error' : ''}`}
                placeholder="XXXX  XXXX  XXXX"
                value={displayAadhaar}
                onChange={handleAadhaarChange}
                disabled={loading}
                maxLength={14}
                autoComplete="off"
                aria-describedby={aadhaarError ? 'aadhaar-err' : undefined}
                aria-invalid={!!aadhaarError}
              />
              {aadhaarError && (
                <p id="aadhaar-err" className="field-error" role="alert">
                  <span>✕</span> {aadhaarError}
                </p>
              )}
              <p className="field-hint">
                Your Aadhaar number is validated locally using the Verhoeff checksum.
                This does <strong>not</strong> confirm that the Aadhaar exists or belongs to you.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Enter Captcha</label>
              <CaptchaWidget
                onCaptchaReady={handleCaptchaReady}
                disabled={loading}
              />
              {captchaError && (
                <p className="field-error" role="alert">
                  <span>✕</span> {captchaError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full submit-btn"
              disabled={loading || aadhaar.length !== 12 || !captchaValue || captchaValue.length < 5}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Generating OTP…
                </>
              ) : (
                <>
                  <span className="btn-icon">→</span>
                  Login With OTP
                </>
              )}
            </button>
          </form>


        </div>
      </main>
      <Footer />
    </div>
  );
}
