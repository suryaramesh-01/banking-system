// ══════════════════════════════════════════════════
//  Zinc Bank API Client
//  Connects Frontend ↔ Node.js + Express Backend
// ══════════════════════════════════════════════════

const API_BASE = (window.ZINCBANK_API_URL || window.SIMPLEBANK_API_URL || window.NEXABANK_API_URL || 'http://localhost:5000') + '/api/v1';

// ── Token management ──
const TokenStore = {
  get: ()  => localStorage.getItem('nb_token'),
  set: (t) => localStorage.setItem('nb_token', t),
  clear: () => { localStorage.removeItem('nb_token'); localStorage.removeItem('nb_refresh'); },
  getRefresh: () => localStorage.getItem('nb_refresh'),
  setRefresh: (t) => localStorage.setItem('nb_refresh', t),
};

// ── Core fetch wrapper ──
async function apiRequest(method, path, body = null, retry = true) {
  const headers = { 'Content-Type': 'application/json' };
  const token = TokenStore.get();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API_BASE + path, opts);

  // Auto-refresh token on 401
  if (res.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiRequest(method, path, body, false);
    TokenStore.clear();
    window.dispatchEvent(new Event('nb:logout'));
    throw new Error('Session expired. Please login again.');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

async function refreshAccessToken() {
  try {
    const rt = TokenStore.getRefresh();
    if (!rt) return false;
    const data = await fetch(API_BASE + '/auth/refresh-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    }).then(r => r.json());
    if (data.token) { TokenStore.set(data.token); return true; }
    return false;
  } catch { return false; }
}

// ── API Methods ──
const Api = {
  // Auth
  auth: {
    register: (d) => apiRequest('POST', '/auth/register', d),
    login:    (d) => apiRequest('POST', '/auth/login', d),
    logout:   ()  => apiRequest('POST', '/auth/logout'),
    me:       ()  => apiRequest('GET',  '/auth/me'),
    forgotPassword: (email) => apiRequest('POST', '/auth/forgot-password', { email }),
    verifyOtp:      (email, otp) => apiRequest('POST', '/auth/verify-otp', { email, otp }),
    resetPassword:  (email, otp, newPassword) => apiRequest('POST', '/auth/reset-password', { email, otp, newPassword }),
    refreshToken:   (rt) => apiRequest('POST', '/auth/refresh-token', { refreshToken: rt }),
  },

  // Account
  account: {
    get:        () => apiRequest('GET',   '/accounts/my'),
    balance:    () => apiRequest('GET',   '/accounts/balance'),
    miniStatement: () => apiRequest('GET', '/accounts/mini-statement'),
    setPin:     (d) => apiRequest('POST', '/accounts/set-pin', d),
    update:     (d) => apiRequest('PATCH','/accounts/update', d),
  },

  // Transactions
  transactions: {
    list:     (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiRequest('GET', '/transactions' + (qs ? '?' + qs : ''));
    },
    summary:  () => apiRequest('GET',  '/transactions/summary'),
    deposit:  (d) => apiRequest('POST', '/transactions/deposit', d),
    withdraw: (d) => apiRequest('POST', '/transactions/withdraw', d),
    transfer: (d) => apiRequest('POST', '/transactions/transfer', d),
  },

  // User
  user: {
    profile:        () => apiRequest('GET',   '/users/profile'),
    updateProfile:  (d) => apiRequest('PATCH', '/users/profile', d),
    changePassword: (d) => apiRequest('PATCH', '/users/change-password', d),
  },

  // Admin
  admin: {
    dashboard:    () => apiRequest('GET',   '/admin/dashboard'),
    users:        (p) => apiRequest('GET',   '/admin/users?' + new URLSearchParams(p)),
    blockUser:    (id) => apiRequest('PATCH', `/admin/users/${id}/block`),
    transactions: (p) => apiRequest('GET',   '/admin/transactions?' + new URLSearchParams(p)),
    reports:      () => apiRequest('GET',   '/admin/reports/summary'),
  },

  // Notifications
  notifications: {
    list:       () => apiRequest('GET',   '/notifications'),
    markAllRead:() => apiRequest('PATCH', '/notifications/read-all'),
    markRead:   (id) => apiRequest('PATCH', `/notifications/${id}/read`),
  },

  // Loans
  loans: {
    apply: (d) => apiRequest('POST', '/loans/apply', d),
    my:    () => apiRequest('GET',  '/loans/my'),
  },
};

window.Api = Api;
window.TokenStore = TokenStore;
