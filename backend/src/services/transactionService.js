/*
 * services/transactionService.js
 * In-memory transaction store that tracks each Aadhaar OTP session from creation
 * through OTP verification, enforcing expiry, attempt counts, and automatic
 * cleanup of stale records to prevent memory leaks.
 */

const { generateSecureId } = require('../utils/secureId');
const { logger, maskAadhaar } = require('../utils/logger');
const config = require('../config');

// In-memory transaction store
// { transactionId -> TransactionRecord }
const store = new Map();

const STATUS = {
  PENDING: 'PENDING',
  OTP_SENT: 'OTP_SENT',
  OTP_VERIFIED: 'OTP_VERIFIED',
  OTP_FAILED: 'OTP_FAILED',
  EXPIRED: 'EXPIRED',
};

function create(aadhaarLast4) {
  const id = generateSecureId('txn');
  const now = Date.now();
  const record = {
    transactionId: id,
    aadhaarLast4,        // only the last 4 digits stored — full Aadhaar is never persisted here
    status: STATUS.PENDING,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + config.TRANSACTION.EXPIRY_SECONDS * 1000).toISOString(),
    otpAttempts: 0,
    resendCount: 0,
    lastResendAt: null,
    providerTransactionId: null,  // populated by provider after a successful OTP request (e.g. Surepass client_id)
  };
  store.set(id, record);
  logger.debug('Transaction created', { transactionId: id });
  return record;
}

function get(transactionId) {
  const record = store.get(transactionId);
  if (!record) return null;
  // Auto-expire: lazily mark the record as expired on next read rather than via a separate timer
  if (Date.now() > new Date(record.expiresAt).getTime()) {
    record.status = STATUS.EXPIRED;
    store.set(transactionId, record);
  }
  return record;
}

function isExpired(record) {
  return record.status === STATUS.EXPIRED ||
    Date.now() > new Date(record.expiresAt).getTime();
}

function update(transactionId, fields) {
  const record = store.get(transactionId);
  if (!record) return null;
  Object.assign(record, fields);
  store.set(transactionId, record);
  return record;
}

function remove(transactionId) {
  store.delete(transactionId);
}

// Cleanup expired transactions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, rec] of store.entries()) {
    if (now > new Date(rec.expiresAt).getTime()) {
      store.delete(id);
    }
  }
}, 5 * 60 * 1000);

module.exports = { create, get, update, remove, isExpired, STATUS };
