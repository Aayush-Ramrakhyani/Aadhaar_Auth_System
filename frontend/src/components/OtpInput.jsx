import React, { useRef } from 'react';
import './OtpInput.css';

export default function OtpInput({ value, onChange, disabled }) {
  const refs = useRef([]);

  const digits = value.padEnd(6, ' ').split('').slice(0, 6);

  const handleKey = (e, idx) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = value.slice(0, idx) + value.slice(idx + 1);
      onChange(next);
      if (idx > 0) refs.current[idx - 1]?.focus();
      return;
    }
    if (e.key === 'ArrowLeft' && idx > 0) { refs.current[idx - 1]?.focus(); return; }
    if (e.key === 'ArrowRight' && idx < 5) { refs.current[idx + 1]?.focus(); return; }
  };

  const handleChange = (e, idx) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    if (!char) return;
    const arr = value.padEnd(6, '').split('');
    arr[idx] = char;
    const next = arr.join('').replace(/ /g, '').slice(0, 6);
    onChange(next);
    if (idx < 5) refs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    refs.current[focusIdx]?.focus();
  };

  return (
    <div className="otp-inputs" role="group" aria-label="OTP input">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKey(e, i)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={`OTP digit ${i + 1}`}
          className="otp-box"
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}
