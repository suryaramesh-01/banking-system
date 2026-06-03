# 🏦 NexaBank — Cloud Digital Banking System v2.0

> Full-stack cloud banking application: Node.js + Express + MongoDB Atlas + Docker + AWS

---

## 🏗️ Architecture

```
User Browser
     ↓
Frontend (HTML/CSS/JS) — Served by Nginx (Docker)
     ↓  REST API calls
Node.js + Express Backend (Docker container)
     ↓  Mongoose ODM
MongoDB Atlas Database (Cloud)
     ↓
AWS EC2 Hosting (Docker Compose orchestration)
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js ≥ 18, Docker + Docker Compose

### 1. Clone & Setup
```bash
git clone https://github.com/yourorg/nexabank.git
cd nexabank
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB URI and credentials
```

### 2. Run with Docker Compose
```bash
docker compose up --build
# Frontend: http://localhost
# Backend API: http://localhost:5000
# Mongo Express UI: docker compose --profile dev up
```

### 3. Run Backend Locally (without Docker)
```bash
cd backend
npm install
npm run dev
# API runs on http://localhost:5000
```

---

## 🔐 Demo Credentials

| Role | Email | Password | PIN |
|------|-------|----------|-----|
| 👤 User (Arjun) | arjun@example.com | User@123 | 4521 |
| 👤 User (Priya) | priya@example.com | User@123 | 7834 |
| 🛡️ Admin | admin@nexabank.com | Admin@123 | — |

**Demo OTP:** `1 2 3 4 5 6`
**Test Transfer:** Account `7834 2210 5643 8821` (Priya Patel)

---

## 📁 Project Structure

```
nexabank/
├── frontend/
│   ├── public/
│   │   ├── index.html          ← Complete SPA
│   │   ├── css/style.css       ← Full design system
│   │   └── js/
│   │       ├── api.js          ← API client (fetch wrapper)
│   │       └── app.js          ← Full application logic
│   ├── nginx.conf              ← Nginx proxy config
│   └── Dockerfile              ← Nginx container
│
├── backend/
│   ├── src/
│   │   ├── server.js           ← Express app entry point
│   │   ├── config/
│   │   │   ├── database.js     ← MongoDB Atlas connection
│   │   │   └── logger.js       ← Winston logger
│   │   ├── models/
│   │   │   ├── User.js         ← User schema + bcrypt
│   │   │   ├── Account.js      ← Bank account schema
│   │   │   ├── Transaction.js  ← Transaction schema
│   │   │   ├── Loan.js         ← Loan schema + EMI calc
│   │   │   └── Notification.js ← Notifications schema
│   │   ├── routes/
│   │   │   ├── auth.js         ← Login, register, OTP, JWT
│   │   │   ├── accounts.js     ← Balance, mini statement, PIN
│   │   │   ├── transactions.js ← Deposit, withdraw, transfer
│   │   │   ├── users.js        ← Profile, password change
│   │   │   ├── admin.js        ← Admin dashboard & controls
│   │   │   ├── loans.js        ← Loan apply & management
│   │   │   └── notifications.js← Notification management
│   │   ├── middleware/
│   │   │   ├── auth.js         ← JWT protect + authorize
│   │   │   └── errorHandler.js ← Global error handling
│   │   └── utils/
│   │       ├── token.js        ← JWT sign & send helper
│   │       └── email.js        ← Nodemailer email templates
│   ├── Dockerfile              ← Multi-stage Node.js build
│   ├── .env.example            ← Environment variables template
│   └── package.json
│
├── docker/
│   └── mongo-init.js           ← MongoDB init + indexes
├── docker-compose.yml          ← Full stack orchestration
├── docs/
│   └── AWS_DEPLOYMENT.md       ← AWS deployment guide
└── README.md
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Register user + create account |
| POST | /api/v1/auth/login | Login → JWT tokens |
| POST | /api/v1/auth/logout | Invalidate session |
| POST | /api/v1/auth/forgot-password | Send OTP to email |
| POST | /api/v1/auth/verify-otp | Verify 6-digit OTP |
| POST | /api/v1/auth/reset-password | Reset with OTP |
| POST | /api/v1/auth/refresh-token | Get new access token |
| GET | /api/v1/auth/me | Get current user |

### Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/accounts/my | Full account details |
| GET | /api/v1/accounts/balance | **Live balance check** |
| GET | /api/v1/accounts/mini-statement | Last 5 transactions |
| POST | /api/v1/accounts/set-pin | Set/change transaction PIN |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/transactions | Paginated transaction list |
| GET | /api/v1/transactions/summary | Balance + monthly stats |
| POST | /api/v1/transactions/deposit | Deposit money |
| POST | /api/v1/transactions/withdraw | Withdraw (PIN required) |
| POST | /api/v1/transactions/transfer | Fund transfer (PIN required) |

### Admin (admin role only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/admin/dashboard | System overview |
| GET | /api/v1/admin/users | All users |
| PATCH | /api/v1/admin/users/:id/block | Block/unblock user |
| GET | /api/v1/admin/transactions | All transactions |
| GET | /api/v1/admin/reports/summary | Aggregated report |

---

## 🐳 Docker Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| frontend | nginx:1.25-alpine | 80 | Static files + API proxy |
| backend | node:18-alpine | 5000 | REST API |
| mongo | mongo:7.0 | 27017 | Local dev DB |
| mongo-express | mongo-express | 8081 | DB admin UI (dev only) |

---

## 🔒 Security Features

- ✅ bcrypt password hashing (salt rounds: 12)
- ✅ JWT access tokens (15min) + refresh tokens (7 days)
- ✅ OTP email verification (Nodemailer, 10-min expiry)
- ✅ Transaction PIN (bcrypt hashed in MongoDB)
- ✅ Rate limiting (100/15min global, 10/15min auth)
- ✅ Helmet.js security headers (XSS, CSRF, clickjacking)
- ✅ CORS with allowed origins whitelist
- ✅ Non-root Docker user
- ✅ Account lockout after 5 failed login attempts
- ✅ Input validation on all endpoints

---

## ✅ Features

### User Authentication
- Register, Login, Logout
- Forgot Password → OTP → Reset
- 6-digit OTP via email
- Role-based access (Admin / User)

### Account Management
- Auto account number generation
- View account details, IFSC, branch
- Update profile, change password
- Transaction PIN management

### Banking Operations
- Deposit (Cash, NEFT, RTGS, Cheque)
- Withdraw (ATM, Branch, UPI) — PIN required
- Fund Transfer (IMPS, NEFT, RTGS, UPI) — PIN required
- Live balance check from API
- Paginated transaction history with search & filter
- Mini statement popup
- CSV export

### Admin Panel
- Dashboard with system-wide stats
- View, block/unblock users
- View all transactions
- Generate reports (Users, Transactions, Funds)

### New Features
- 🏛️ Loan management (Personal, Home, Vehicle, Education, Business)
- 📈 EMI calculator
- 🔔 Notification system
- 📊 Investment module placeholder
- 📧 Email alerts for transactions

---

*NexaBank Cloud Banking System v2.0 — Built with Node.js, MongoDB Atlas, Docker & AWS*
