// MongoDB init script — runs on first container start
db = db.getSiblingDB('nexabank');

db.createCollection('users');
db.createCollection('accounts');
db.createCollection('transactions');
db.createCollection('notifications');
db.createCollection('loans');

// Indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.accounts.createIndex({ accountNumber: 1 }, { unique: true });
db.accounts.createIndex({ user: 1 });
db.transactions.createIndex({ user: 1, createdAt: -1 });
db.transactions.createIndex({ txnId: 1 }, { unique: true });
db.notifications.createIndex({ user: 1, read: 1 });

print('✅ NexaBank MongoDB initialized');
