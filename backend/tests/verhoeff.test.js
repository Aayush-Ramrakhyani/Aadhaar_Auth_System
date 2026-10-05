const { verhoeffValidate, verhoeffGenerate } = require('../src/utils/verhoeff');

// Generate valid 12-digit numbers dynamically so the test never depends on
// hardcoded values that might be wrong.
const bases = ['23412341234', '11111111111', '99999999999'];
const validNumbers = bases.map((b) => b + verhoeffGenerate(b));

describe('Verhoeff Algorithm', () => {
  test('validates numbers produced by verhoeffGenerate', () => {
    validNumbers.forEach((n) => {
      expect(verhoeffValidate(n)).toBe(true);
    });
  });

  test('rejects numbers with wrong check digit', () => {
    validNumbers.forEach((n) => {
      const bad = n.slice(0, -1) + String((parseInt(n.slice(-1)) + 1) % 10);
      expect(verhoeffValidate(bad)).toBe(false);
    });
  });

  test('generates correct check digit', () => {
    const base = '23412341234';
    const digit = verhoeffGenerate(base);
    expect(verhoeffValidate(base + digit)).toBe(true);
  });

  test('rejects strings with non-digit characters', () => {
    expect(verhoeffValidate('12345678901X')).toBe(false);
  });

  test('rejects strings shorter than 12 digits', () => {
    expect(verhoeffValidate('123456789')).toBe(false);
  });
});
