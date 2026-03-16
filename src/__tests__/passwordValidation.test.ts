import { passwordSchema, validatePassword } from '../auth/passwordValidation.js';

describe('password validation', () => {
  it('rejects passwords shorter than the minimum length', () => {
    const result = validatePassword('short password');

    expect(result.success).toBe(false);
  });

  it('rejects passwords longer than the maximum length', () => {
    const longPassword = 'a'.repeat(150);
    const result = validatePassword(longPassword);

    expect(result.success).toBe(false);
  });

  it('rejects blacklisted passwords', () => {
    const candidates = ['password', '123456', 'CREDITPARSERV3', 'credit card expense tracker'];

    for (const candidate of candidates) {
      const result = validatePassword(candidate);

      expect(result.success).toBe(false);
    }
  });

  it('accepts a valid passphrase', () => {
    const validPassword = 'this is a long random passphrase 2026';
    const result = validatePassword(validPassword);

    expect(result.success).toBe(true);
  });

  it('trims whitespace before validation', () => {
    const validPassword = '   this is a long random passphrase 2026   ';
    const result = validatePassword(validPassword);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('this is a long random passphrase 2026');
    }
  });
});

