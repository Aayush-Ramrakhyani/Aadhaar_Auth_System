import React from 'react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p className="footer-notice">
          ⚠ This is a <strong>development application</strong>. It is not affiliated with or endorsed by UIDAI.
          Authentication is routed through the configured provider.
          Real Aadhaar authentication requires official UIDAI authorization.
        </p>
        <p className="footer-copy">
          © {new Date().getFullYear()} Aadhaar Auth — Development Build
        </p>
      </div>
    </footer>
  );
}
