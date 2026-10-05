import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import OtpInput from '../components/OtpInput';
import { aadhaarApi } from '../services/api';
import './OtpPage.css';

const RESEND_COOLDOWN = 60;

export default function OtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state;

  // Redirect if reached without proper state
  useEffect(() => {
    if (!state?.transactionId) navigate('/', { replace: true });
  }, [state, navigate]);

  const { transactionId, maskedMobile, expiresIn = 600, isMock } = state || {};

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Countdown for transaction expiry
  const [timeLeft, setTimeLeft] = useState(expiresIn);
  const timerRef = useRef(null);
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendTimerRef = useRef(null);
  const startResendCooldown = useCallback(() => {
    setResendCooldown(RESEND_COOLDOWN);
    resendTimerRef.current = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(resendTimerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  }, []);
  useEffect(() => () => clearInterval(resendTimerRef.current), []);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (loading || otp.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const result = await aadhaarApi.verifyOtp(transactionId, otp);
      if (result.data?.authenticated) {
        setSuccess(true);
        setTimeout(() => navigate('/success', { replace: true }), 800);
      } else {
        navigate('/failure', { replace: true });
      }
    } catch (err) {
      const code = err.code || '';
      if (code === 'TRANSACTION_EXPIRED') {
        setError('Session expired. Please start again.');
      } else if (code === 'OTP_MAX_ATTEMPTS') {
        setError('Maximum attempts exceeded. Please start again.');
        setTimeout(() => navigate('/', { replace: true }), 2500);
      } else {
        setError(err.message || 'OTP verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending || resendCooldown > 0) return;
    setResending(true);
    setError(null);
    setOtp('');
    try {
      await aadhaarApi.resendOtp(transactionId);
      startResendCooldown();
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  if (!state?.transactionId) return null;

  return (
    <div className="page-wrap">
      <Header />
      <main className="main-content">
        <div className="otp-card">
          <div className="otp-card-header">
            <div className="otp-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="5" y="2" width="14" height="20" rx="2"/>
                <line x1="12" y1="18" x2="12" y2="18.01"/>
                <path d="M9 7h6M9 11h4"/>
              </svg>
            </div>
            <div>
              <h1 className="otp-title">OTP Verification</h1>
              <p className="otp-subtitle">
                {maskedMobile
                  ? <>OTP sent to mobile ending in <strong>{maskedMobile}</strong></>
                  : 'An OTP has been sent through the configured authentication provider.'}
              </p>
            </div>
          </div>


          {error && (
            <div className="alert alert-error" role="alert">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success" role="status">
              <span>✓</span>
              <span>Authentication successful! Redirecting…</span>
            </div>
          )}

          <form onSubmit={handleVerify} noValidate>
            <div className="form-group">
              <label className="form-label" style={{ textAlign: 'center', display: 'block' }}>
                Enter OTP
              </label>
              <OtpInput value={otp} onChange={setOtp} disabled={loading || success} />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full verify-btn"
              disabled={loading || otp.length !== 6 || success || timeLeft === 0}
            >
              {loading ? (
                <><span className="spinner" /> Verifying…</>
              ) : (
                <>✓ Verify OTP</>
              )}
            </button>
          </form>

          <div className="otp-footer-row">
            <div className="expiry-timer">
              {timeLeft > 0 ? (
                <span className={timeLeft < 60 ? 'timer-urgent' : ''}>
                  Session expires in: <strong>{formatTime(timeLeft)}</strong>
                </span>
              ) : (
                <span className="timer-expired">Session expired. <a href="/">Start again</a></span>
              )}
            </div>

            <button
              type="button"
              className="btn btn-secondary resend-btn"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0 || timeLeft === 0}
            >
              {resending ? (
                <><span className="spinner spinner-dark" /> Resending…</>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                '↺ Resend OTP'
              )}
            </button>
          </div>

          <button
            type="button"
            className="back-link"
            onClick={() => navigate('/')}
            disabled={loading}
          >
            ← Back to Login
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
