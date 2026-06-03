const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

// All routes require auth
router.use(protect);

// ── GET /api/v1/accounts/my  — Get logged-in user's account ──
router.get('/my', async (req, res, next) => {
  try {
    const account = await Account.findOne({ user: req.user._id });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({ success: true, data: account });
  } catch (err) { next(err); }
});

// ── GET /api/v1/accounts/balance  — Quick balance check ──
router.get('/balance', async (req, res, next) => {
  try {
    const account = await Account.findOne({ user: req.user._id }).select('balance accountNumber accountType currency status');
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({
      success: true,
      data: {
        balance: account.balance,
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        currency: account.currency,
        status: account.status,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) { next(err); }
});

// ── GET /api/v1/accounts/mini-statement  — Last 5 transactions ──
router.get('/mini-statement', async (req, res, next) => {
  try {
    const account = await Account.findOne({ user: req.user._id });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    const transactions = await Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 }).limit(5).select('txnId type amount description createdAt balanceAfter');

    res.json({ success: true, data: { balance: account.balance, transactions } });
  } catch (err) { next(err); }
});

// ── POST /api/v1/accounts/set-pin  — Set/change transaction PIN ──
router.post('/set-pin', async (req, res, next) => {
  try {
    const { pin, currentPin } = req.body;
    if (!pin || !/^\d{4}$/.test(pin))
      return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits' });

    const account = await Account.findOne({ user: req.user._id }).select('+transactionPin');
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    // If PIN already set, verify current
    if (account.transactionPin) {
      if (!currentPin) return res.status(400).json({ success: false, message: 'Current PIN required' });
      const match = await bcrypt.compare(currentPin, account.transactionPin);
      if (!match) return res.status(400).json({ success: false, message: 'Current PIN incorrect' });
    }

    account.transactionPin = await bcrypt.hash(pin, 10);
    await account.save();
    res.json({ success: true, message: 'Transaction PIN updated successfully' });
  } catch (err) { next(err); }
});

// ── PATCH /api/v1/accounts/update  — Update account settings ──
router.patch('/update', async (req, res, next) => {
  try {
    const allowed = ['dailyLimit', 'branch'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const account = await Account.findOneAndUpdate({ user: req.user._id }, updates, { new: true, runValidators: true });
    res.json({ success: true, data: account });
  } catch (err) { next(err); }
});

module.exports = router;
