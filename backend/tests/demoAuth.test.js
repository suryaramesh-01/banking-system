const { resolveDemoUser, createDemoFallbackUser } = require('../../frontend/public/js/demoAuth');

describe('resolveDemoUser', () => {
  test('accepts the documented admin demo credential', () => {
    const user = resolveDemoUser('admin@nexabank.com', 'Admin@123');
    expect(user).toMatchObject({ email: 'admin@nexabank.com', role: 'admin' });
  });

  test('accepts the legacy admin alias as well', () => {
    const user = resolveDemoUser('admin@zincbank.com', 'Admin@123');
    expect(user).toMatchObject({ email: 'admin@zincbank.com', role: 'admin' });
  });

  test('accepts the documented user demo credential', () => {
    const user = resolveDemoUser('arjun@example.com', 'User@123');
    expect(user).toMatchObject({ email: 'arjun@example.com', role: 'user' });
  });

  test('returns null for invalid credentials', () => {
    expect(resolveDemoUser('wrong@example.com', 'nope')).toBeNull();
  });

  test('creates a fallback demo user for connection failures', () => {
    const user = createDemoFallbackUser('vijay12@gmail.com');
    expect(user).toMatchObject({ email: 'vijay12@gmail.com', role: 'user' });
  });
});
