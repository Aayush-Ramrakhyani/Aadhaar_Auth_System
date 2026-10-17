# Aadhaar OTP Authentication

A complete Aadhaar OTP authentication web application — React + Node.js.

> ⚠ **Development Application** — This is not affiliated with or endorsed by UIDAI.
> Authentication in this build uses a **mock provider** for development and testing.
> Real Aadhaar authentication requires official UIDAI AUA/ASA authorization.

Built for **Technowire Data Science** as part of a freelance contract (Sep 2026).


---

## Architecture

```
React Frontend
      │
Node.js / Express API
      │
AadhaarAuthProvider (abstraction)
      │
 ┌────┴──────────┐
 │               │
MockProvider  UidaiProvider
(dev only)    (pending credentials)
```

---

## Project Structure

```
aadhaar-auth/
├── frontend/                   React + Vite
│   └── src/
│       ├── components/         Header, Footer, CaptchaWidget, OtpInput
│       ├── pages/              LoginPage, OtpPage, SuccessPage, FailurePage
│       ├── services/api.js     Axios client
│       └── utils/verhoeff.js   Client-side checksum
│
└── backend/                    Node.js + Express
    └── src/
        ├── config/             Env-based configuration
        ├── controllers/        Request handlers
        ├── routes/             Express routers
        ├── middleware/         Rate limiter, validator, error handler
        ├── services/
        │   ├── captchaService.js
        │   ├── transactionService.js
        │   └── aadhaar/
        │       ├── AadhaarAuthProvider.js  (abstract base)
        │       ├── MockAadhaarProvider.js  (development)
        │       └── UidaiAadhaarProvider.js (pending)
        └── utils/
            ├── verhoeff.js
            ├── logger.js
            └── secureId.js
```

---

## API Endpoints

| Method | Path                                  | Description              |
|--------|---------------------------------------|--------------------------|
| GET    | /health                               | Health check             |
| GET    | /api/captcha                          | Generate CAPTCHA         |
| POST   | /api/aadhaar/validate                 | Validate Aadhaar format  |
| POST   | /api/aadhaar/request-otp              | Request OTP              |
| POST   | /api/aadhaar/verify-otp               | Verify OTP               |
| POST   | /api/aadhaar/resend-otp               | Resend OTP               |
| GET    | /api/aadhaar/transaction/:id          | Transaction status       |

### Response format

```json
// Success
{ "success": true, "data": {}, "message": "..." }

// Failure
{ "success": false, "error": { "code": "...", "message": "..." } }
```

---

## Aadhaar Checksum (Verhoeff)

Both frontend and backend validate the 12-digit Aadhaar number using the Verhoeff algorithm.

**Important**: Passing Verhoeff validation only confirms the number is mathematically well-formed.
It does **not** prove that the Aadhaar exists, belongs to the user, or that a mobile number is linked.
Real existence/authentication is confirmed only by the authorized UIDAI authentication system.

---

## CAPTCHA Flow

1. Frontend calls `GET /api/captcha` → receives `captchaId` + SVG image (base64).
2. User types the 5-character code.
3. `captchaId` + typed value sent with OTP request.
4. Backend validates and deletes the CAPTCHA (one-time use).
5. CAPTCHAs expire after 5 minutes; max 3 wrong attempts per CAPTCHA.

---

## OTP Flow

```
Login page → [Aadhaar + CAPTCHA] → POST /request-otp
    → transaction created → provider.requestOtp()
    → OTP page → user types OTP → POST /verify-otp
    → provider.verifyOtp() → success/failure
```

- OTP expires after **5 minutes** (transaction expires after **10 minutes**).
- Max **3** wrong OTP attempts per transaction.
- Max **3** resend requests; 60-second cooldown between resends.

---

## Mock Authentication

Active when `AADHAAR_PROVIDER=mock` (default in development).

| Setting    | Value           |
|------------|-----------------|
| Mock OTP   | `123456`        |
| Provider   | MockAadhaarProvider |
| Allowed in | development / test only |

**The mock provider refuses to start in `NODE_ENV=production`.**
Mock authentication is clearly labelled in the UI and is not real UIDAI authentication.

---

## Transaction Management

Transactions are stored in-memory (no database required for development).

```json
{
  "transactionId": "txn_<ts>_<hex>",
  "status": "OTP_SENT | OTP_VERIFIED | OTP_FAILED | EXPIRED",
  "createdAt": "ISO string",
  "expiresAt": "ISO string",
  "otpAttempts": 0,
  "resendCount": 0
}
```

Expired transactions are cleaned up automatically every 5 minutes.

---

## Security

- **Helmet** — security headers
- **CORS** — restricted to `FRONTEND_URL`
- **Rate limiting** — OTP requests, verification, global
- **Verhoeff validation** — frontend + backend
- **CAPTCHA** — expiry, one-time use, attempt limits
- **OTP limits** — max attempts, max resends, cooldown
- **Secure IDs** — cryptographically random transaction/captcha IDs
- **No secrets in source** — all credentials via `.env`
- **No stack traces** exposed to clients
- **Aadhaar masked in logs**: `XXXX-XXXX-1234`

---

## Environment Variables

Copy `.env.example` to `backend/.env`:

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
AADHAAR_PROVIDER=mock
MOCK_OTP=123456

# Required only when AADHAAR_PROVIDER=uidai
UIDAI_BASE_URL=
UIDAI_CLIENT_ID=
UIDAI_CLIENT_SECRET=
UIDAI_AUA_CODE=
UIDAI_SUB_AUA_CODE=
UIDAI_LICENSE_KEY=
UIDAI_CERTIFICATE_PATH=
```

---

## Development Setup

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Backend

```bash
cd aadhaar-auth/backend
npm install
npm run dev        # starts on http://localhost:5000
```

### Frontend

```bash
cd aadhaar-auth/frontend
npm install
npm run dev        # starts on http://localhost:5173
```

The Vite dev server proxies `/api` requests to `localhost:5000` automatically.

---

## Running Tests

```bash
cd backend
npm test                  # run all tests
npm run test:coverage     # with coverage report
```

Test files in `backend/tests/`:
- `verhoeff.test.js` — Verhoeff algorithm
- `captcha.test.js`  — CAPTCHA service
- `transaction.test.js` — Transaction service
- `api.test.js` — Full API integration tests

---

## Official UIDAI Integration (Production)

`UidaiAadhaarProvider.js` is the integration point. To activate it:

1. **Obtain AUA/ASA authorization** from UIDAI:
   https://uidai.gov.in/en/ecosystem/authentication-devices-documents/developer-section.html

2. **Receive credentials**: AUA code, sub-AUA code, license key, and digital certificate (.pem / .p12).

3. **Implement** the UIDAI Authentication API v2.5/v3.0 (XML-based, digitally signed)
   inside `UidaiAadhaarProvider.js`.

4. **Set env vars**:
   ```env
   AADHAAR_PROVIDER=uidai
   UIDAI_BASE_URL=<official endpoint>
   UIDAI_AUA_CODE=<your code>
   UIDAI_LICENSE_KEY=<your key>
   UIDAI_CERTIFICATE_PATH=<path to cert>
   ```

### What is NOT a public API

The following URLs were observed in the browser Network tab of the Tathya portal
and are **not** public APIs:

- `https://tathya.uidai.gov.in/access/generateCaptcha`
- `https://tathya.uidai.gov.in/access/generateOTPForOAuth`

These are internal endpoints of the Tathya web application.
**Do not** use them as a backend dependency — they are undocumented, may change
without notice, and using them without authorization would violate UIDAI's terms.

### What real integration requires

- Digitally signed XML requests (RSA/AES encryption)
- UIDAI public key for OTP encryption
- Your AUA digital certificate for request signing
- Use only officially documented UIDAI API endpoints

---

## Notes

- Never commit `.env` or certificate files to Git (covered by `.gitignore`).
- The mock provider is for **development and testing only**.
- This application does not bypass any UIDAI security controls.
- Verhoeff validation ≠ real Aadhaar existence check.



## License

This project was built under a freelance contract for **Technowire Data Science**.
All rights reserved. Not open for redistribution.
