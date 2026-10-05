const transactionService = require('../src/services/transactionService');

describe('TransactionService', () => {
  test('creates a transaction with required fields', () => {
    const txn = transactionService.create('1234');
    expect(txn).toHaveProperty('transactionId');
    expect(txn.status).toBe('PENDING');
    expect(txn.otpAttempts).toBe(0);
    expect(txn.resendCount).toBe(0);
    expect(new Date(txn.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  test('retrieves a transaction by id', () => {
    const txn = transactionService.create('5678');
    const found = transactionService.get(txn.transactionId);
    expect(found).not.toBeNull();
    expect(found.transactionId).toBe(txn.transactionId);
  });

  test('returns null for unknown transaction', () => {
    expect(transactionService.get('nonexistent_id')).toBeNull();
  });

  test('updates transaction fields', () => {
    const txn = transactionService.create('9012');
    transactionService.update(txn.transactionId, { otpAttempts: 2 });
    const updated = transactionService.get(txn.transactionId);
    expect(updated.otpAttempts).toBe(2);
  });

  test('isExpired returns false for fresh transaction', () => {
    const txn = transactionService.create('3456');
    expect(transactionService.isExpired(txn)).toBe(false);
  });

  test('removes a transaction', () => {
    const txn = transactionService.create('7890');
    transactionService.remove(txn.transactionId);
    expect(transactionService.get(txn.transactionId)).toBeNull();
  });
});
