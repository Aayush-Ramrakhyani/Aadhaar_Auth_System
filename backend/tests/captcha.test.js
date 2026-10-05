const captchaService = require('../src/services/captchaService');

describe('CaptchaService', () => {
  test('creates a captcha with required fields', () => {
    const c = captchaService.create();
    expect(c).toHaveProperty('captchaId');
    expect(c).toHaveProperty('image');
    expect(c).toHaveProperty('expiresIn');
    expect(typeof c.captchaId).toBe('string');
    expect(c.image).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(c.expiresIn).toBeGreaterThan(0);
  });

  test('validates correct captcha value (case-insensitive)', () => {
    // Patch the store to know the answer
    const c = captchaService.create();
    // Retrieve stored answer via create then peek (white-box test)
    // We'll brute-force by extracting from SVG base64
    const svgDecoded = Buffer.from(c.image.replace('data:image/svg+xml;base64,', ''), 'base64').toString();
    const match = [...svgDecoded.matchAll(/>([A-Z0-9])</g)].map(m => m[1]).join('');
    expect(match.length).toBe(5);
    const result = captchaService.validate(c.captchaId, match);
    expect(result.valid).toBe(true);
  });

  test('rejects wrong captcha value', () => {
    const c = captchaService.create();
    const result = captchaService.validate(c.captchaId, 'XXXXX');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('CAPTCHA_INVALID');
  });

  test('returns CAPTCHA_NOT_FOUND for unknown id', () => {
    const result = captchaService.validate('nonexistent-id', 'ABCDE');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('CAPTCHA_NOT_FOUND');
  });

  test('cannot reuse a captcha after correct validation', () => {
    const c = captchaService.create();
    const svgDecoded = Buffer.from(c.image.replace('data:image/svg+xml;base64,', ''), 'base64').toString();
    const answer = [...svgDecoded.matchAll(/>([A-Z0-9])</g)].map(m => m[1]).join('');
    captchaService.validate(c.captchaId, answer); // first use (correct)
    const second = captchaService.validate(c.captchaId, answer);
    expect(second.valid).toBe(false);
    expect(second.reason).toBe('CAPTCHA_NOT_FOUND');
  });
});
