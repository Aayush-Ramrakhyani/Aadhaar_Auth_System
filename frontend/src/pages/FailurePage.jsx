import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './ResultPage.css';

export default function FailurePage() {
  const navigate = useNavigate();
  return (
    <div className="page-wrap">
      <Header />
      <main className="main-content">
        <div className="result-card failure-card">
          <div className="result-icon failure-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h1 className="result-title failure-title">Authentication Failed</h1>
          <p className="result-message">
            We could not authenticate the Aadhaar details.
          </p>
          <div className="result-detail">
            <p>The OTP entered was incorrect or authentication could not be completed. Please try again.</p>
          </div>
          <div className="result-actions">
            <button
              className="btn btn-primary result-btn"
              onClick={() => navigate('/')}
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
