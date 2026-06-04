const DEMO_USERS = {
  'admin@nexabank.com': {
    _id: 'ADM001',
    name: 'Admin Manager',
    email: 'admin@nexabank.com',
    role: 'admin',
    status: 'active',
  },
  'admin@zincbank.com': {
    _id: 'ADM001',
    name: 'Admin Manager',
    email: 'admin@zincbank.com',
    role: 'admin',
    status: 'active',
  },
  'arjun@example.com': {
    _id: 'USR001',
    name: 'Arjun Sharma',
    email: 'arjun@example.com',
    role: 'user',
    status: 'active',
  },
  'priya@example.com': {
    _id: 'USR002',
    name: 'Priya Patel',
    email: 'priya@example.com',
    role: 'user',
    status: 'active',
  },
};

const DEMO_PASSWORDS = {
  'admin@nexabank.com': 'Admin@123',
  'admin@zincbank.com': 'Admin@123',
  'arjun@example.com': 'User@123',
  'priya@example.com': 'User@123',
};

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function resolveDemoUser(email, password) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) return null;

  const expectedPassword = DEMO_PASSWORDS[normalizedEmail];
  if (expectedPassword && password === expectedPassword) {
    return DEMO_USERS[normalizedEmail] || null;
  }

  return null;
}

function createDemoFallbackUser(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const name = normalizedEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ').trim() || 'Demo User';

  return {
    _id: 'DEMO_USER',
    name,
    email: normalizedEmail,
    role: 'user',
    status: 'active',
  };
}

if (typeof module !== 'undefined') {
  module.exports = { DEMO_USERS, DEMO_PASSWORDS, normalizeEmail, resolveDemoUser, createDemoFallbackUser };
}

if (typeof window !== 'undefined') {
  window.resolveDemoUser = resolveDemoUser;
  window.createDemoFallbackUser = createDemoFallbackUser;
}
