import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './ResultPage.css';

export default function SuccessPage() {
  const navigate = useNavigate();
  return (
    <div className="page-wrap">
      <Header />
      <main className="main-content">
        <div className="result-card success-card">
          <div className="result-icon success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="7 12 10.5 15.5 17 8.5"/>
            </svg>
          </div>
          <h1 className="result-title success-title">Authentication Successful</h1>
          <p className="result-message">
            Your Aadhaar authentication was successfully completed.
          </p>
          <div className="result-detail">
            <p>The identity verification process has been completed through the configured authentication provider.</p>
          </div>
          <button
            className="btn btn-primary result-btn"
            onClick={() => navigate('/')}
          >
            ← Back to Login
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
