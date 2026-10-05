import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Normalise errors — always throw { code, message }
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err.response?.data;
    const code = data?.error?.code || 'NETWORK_ERROR';
    const message =
      data?.error?.message ||
      (err.code === 'ECONNABORTED' ? 'Request timed out. Please try again.' : 'Network error. Please check your connection.');
    return Promise.reject({ code, message });
  }
);

export const captchaApi = {
  generate: () => api.get('/captcha').then((r) => r.data.data),
};

export const aadhaarApi = {
  validate: (aadhaar) =>
    api.post('/aadhaar/validate', { aadhaar }).then((r) => r.data),

  requestOtp: (aadhaar, captchaId, captchaValue) =>
    api.post('/aadhaar/request-otp', { aadhaar, captchaId, captchaValue }).then((r) => r.data),

  verifyOtp: (transactionId, otp) =>
    api.post('/aadhaar/verify-otp', { transactionId, otp }).then((r) => r.data),

  resendOtp: (transactionId) =>
    api.post('/aadhaar/resend-otp', { transactionId }).then((r) => r.data),

  getTransaction: (transactionId) =>
    api.get(`/aadhaar/transaction/${transactionId}`).then((r) => r.data),
};
