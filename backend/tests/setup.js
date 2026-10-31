/*
 * tests/setup.js
 * Jest setupFiles entry point: forces test environment variables before any
 * module is loaded, ensuring the mock provider is active and rate limits are
 * relaxed for integration tests.
 */

process.env.NODE_ENV = 'test'; // must be set before config/index.js loads to suppress logger output
process.env.AADHAAR_PROVIDER = 'mock'; // use mock provider so tests never call real UIDAI or third-party APIs
process.env.PORT = '5002';
process.env.FRONTEND_URL = 'http://localhost:5174';
