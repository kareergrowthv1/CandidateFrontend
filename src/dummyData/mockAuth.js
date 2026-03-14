/**
 * Mock auth helpers for local/dev testing (e.g. when backend is unavailable).
 * Use a known email/OTP/password to bypass real auth.
 */

export const MOCK_CREDENTIALS = {
  email: 'mock@example.com',
  otp: '123456',
  password: 'mock123',
};

/** Returns true if the identifier (email/phone) is the mock one. */
export function isMockIdentifier(value) {
  if (!value || typeof value !== 'string') return false;
  const v = value.trim().toLowerCase();
  return v === 'mock@example.com' || v === 'mock' || v === 'test@test.com';
}

/** Returns true if the OTP matches the mock OTP. */
export function isMockOtp(value) {
  return String(value).trim() === MOCK_CREDENTIALS.otp;
}

/** Returns true if the password matches the mock password. */
export function isMockPassword(value) {
  return String(value).trim() === MOCK_CREDENTIALS.password;
}
