const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const templates = {
  otp: (name, code) => ({
    subject: `${code} — Your NexaBank OTP`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#070d1f;padding:32px;border-radius:16px;color:#f8fafc">
        <div style="font-size:1.5rem;font-weight:800;color:#c9a84c;margin-bottom:24px">🏦 NexaBank</div>
        <h2 style="margin:0 0 8px">Hello, ${name}</h2>
        <p style="color:#94a3b8;margin:0 0 24px">Your One-Time Password is:</p>
        <div style="background:#1a2748;border:2px solid #c9a84c;border-radius:12px;padding:20px;text-align:center;font-size:2.5rem;font-weight:800;letter-spacing:0.3em;color:#c9a84c;margin-bottom:24px">${code}</div>
        <p style="color:#94a3b8;font-size:.85rem">This OTP expires in <strong style="color:#f8fafc">10 minutes</strong>. Never share it with anyone.</p>
        <hr style="border-color:#1a2748;margin:24px 0"/>
        <p style="color:#64748b;font-size:.75rem">If you didn't request this, please contact support immediately.</p>
      </div>`,
  }),
  transactionAlert: (name, type, amount, balance, txnId) => ({
    subject: `Transaction Alert — ${type === 'credit' ? '✅ Credit' : '⚠️ Debit'} of ₹${amount.toLocaleString('en-IN')}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#070d1f;padding:32px;border-radius:16px;color:#f8fafc">
        <div style="font-size:1.5rem;font-weight:800;color:#c9a84c;margin-bottom:24px">🏦 NexaBank</div>
        <h2>Transaction Alert</h2>
        <div style="background:#1a2748;border-radius:12px;padding:20px;margin:20px 0">
          <p><strong>Account:</strong> ${name}</p>
          <p><strong>Transaction ID:</strong> ${txnId}</p>
          <p><strong>Type:</strong> <span style="color:${type === 'credit' ? '#10b981' : '#ef4444'}">${type.toUpperCase()}</span></p>
          <p><strong>Amount:</strong> ₹${amount.toLocaleString('en-IN')}</p>
          <p><strong>Available Balance:</strong> ₹${balance.toLocaleString('en-IN')}</p>
        </div>
        <p style="color:#94a3b8;font-size:.8rem">If this transaction was not made by you, contact us immediately.</p>
      </div>`,
  }),
  welcome: (name, accountNumber) => ({
    subject: '🎉 Welcome to NexaBank — Account Opened Successfully',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#070d1f;padding:32px;border-radius:16px;color:#f8fafc">
        <div style="font-size:1.5rem;font-weight:800;color:#c9a84c;margin-bottom:24px">🏦 NexaBank</div>
        <h2>Welcome, ${name}! 🎉</h2>
        <p style="color:#94a3b8">Your NexaBank account has been created successfully.</p>
        <div style="background:#1a2748;border:1px solid #c9a84c33;border-radius:12px;padding:20px;margin:20px 0">
          <p><strong>Account Number:</strong> ${accountNumber}</p>
          <p><strong>Status:</strong> <span style="color:#10b981">Active</span></p>
        </div>
        <p style="color:#94a3b8;font-size:.8rem">Start banking at nexabank.example.com</p>
      </div>`,
  }),
};

const sendEmail = async ({ to, type, data }) => {
  try {
    const tpl = templates[type]?.(...data) || {};
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'NexaBank <noreply@nexabank.com>',
      to,
      subject: tpl.subject,
      html: tpl.html,
    });
    logger.info(`📧 Email [${type}] sent to ${to}`);
  } catch (err) {
    logger.error(`Email send failed: ${err.message}`);
    // Non-blocking: don't throw
  }
};

module.exports = { sendEmail };
