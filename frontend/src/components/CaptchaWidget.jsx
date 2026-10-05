import React, { useEffect, useState, useCallback } from 'react';
import { captchaApi } from '../services/api';
import './CaptchaWidget.css';

export default function CaptchaWidget({ onCaptchaReady, disabled }) {
  const [captcha, setCaptcha] = useState(null);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setValue('');
    onCaptchaReady(null, '');
    try {
      const data = await captchaApi.generate();
      setCaptcha(data);
    } catch (err) {
      setError('Failed to load CAPTCHA. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChange = (e) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    setValue(v);
    onCaptchaReady(captcha?.captchaId || null, v);
  };

  return (
    <div className="captcha-widget">
      <div className="captcha-image-row">
        {loading ? (
          <div className="captcha-placeholder">
            <span className="spinner spinner-dark" />
            <span>Loading CAPTCHA…</span>
          </div>
        ) : error ? (
          <div className="captcha-error-box">{error}</div>
        ) : captcha ? (
          <img
            src={captcha.image}
            alt="CAPTCHA — type the characters shown"
            className="captcha-img"
            draggable={false}
          />
        ) : null}
        <button
          type="button"
          className="captcha-refresh"
          onClick={load}
          disabled={loading || disabled}
          title="Refresh CAPTCHA"
          aria-label="Refresh CAPTCHA"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 .49-3.78"/>
          </svg>
        </button>
      </div>
      <input
        type="text"
        className={`form-input captcha-input${value && value.length < 5 ? ' partial' : ''}`}
        placeholder="Enter CAPTCHA"
        value={value}
        onChange={handleChange}
        disabled={disabled || loading || !captcha}
        autoComplete="off"
        spellCheck={false}
        maxLength={5}
        aria-label="CAPTCHA value"
      />
    </div>
  );
}
