const { getLoginErrorMessage } = require('../../frontend/public/js/loginUtils');

describe('getLoginErrorMessage', () => {
  test('returns a clear connection error for fetch/network failures', () => {
    expect(getLoginErrorMessage(new Error('Failed to fetch'))).toContain('Unable to connect');
  });

  test('preserves the backend message when the server returns one', () => {
    expect(getLoginErrorMessage(new Error('Invalid credentials'))).toBe('Invalid credentials');
  });
});
