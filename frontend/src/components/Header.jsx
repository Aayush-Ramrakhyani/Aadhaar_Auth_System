import React from 'react';
import './Header.css';

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-top">
        <div className="header-inner">
          <div className="header-logo">
            <div className="logo-emblem">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="19" stroke="#ffffff" strokeWidth="2"/>
                <circle cx="20" cy="20" r="8" fill="#ffffff" opacity="0.15"/>
                <path d="M20 8 L23 17 L32 17 L25 23 L27 32 L20 27 L13 32 L15 23 L8 17 L17 17 Z" fill="#ffffff" opacity="0.8"/>
              </svg>
            </div>
            <div className="logo-text">
              <span className="logo-title">Aadhaar Authentication</span>
              <span className="logo-subtitle">Resident Identity Verification</span>
            </div>
          </div>
          <div className="header-right">
            <span className="dev-badge">Development Mode</span>
          </div>
        </div>
      </div>
      <div className="header-stripe" />
    </header>
  );
}
