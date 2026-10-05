const config = require('../../config');
const { logger } = require('../../utils/logger');

let provider;

function getProvider() {
  if (provider) return provider;

  const name = (config.AADHAAR_PROVIDER || 'mock').toLowerCase();

  if (name === 'mock') {
    const MockAadhaarProvider = require('./MockAadhaarProvider');
    provider = new MockAadhaarProvider();
  } else if (name === 'uidai') {
    const UidaiAadhaarProvider = require('./UidaiAadhaarProvider');
    provider = new UidaiAadhaarProvider();
  } else if (name === 'surepass') {
    // ── API CALL PROVIDER ──────────────────────────────────────────────────
    // Requires in .env:
    //   AADHAAR_PROVIDER=surepass
    //   SUREPASS_BASE_URL=https://kyc-api.surepass.io/api/v1
    //   SUREPASS_API_KEY=<key from Surepass dashboard>
    // ──────────────────────────────────────────────────────────────────────
    const SurepassAadhaarProvider = require('./SurepassAadhaarProvider');
    provider = new SurepassAadhaarProvider();
  } else if (name === 'sandbox') {
    // Requires: SANDBOX_API_KEY in .env
    const SandboxAadhaarProvider = require('./SandboxAadhaarProvider');
    provider = new SandboxAadhaarProvider();
  } else if (name === 'tathya') {
    const TathyaAadhaarProvider = require('./TathyaAadhaarProvider');
    provider = new TathyaAadhaarProvider();
  } else {
    throw new Error(`Unknown AADHAAR_PROVIDER: "${name}". Use "mock", "sandbox", "surepass", "uidai", or "tathya".`);
  }

  logger.info(`Aadhaar provider initialized: ${provider.name}`);
  return provider;
}

module.exports = { getProvider };
