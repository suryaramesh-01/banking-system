const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

router.use(protect);

// Helper: verify PIN
const verifyPin = async (account, pin) => {
  if (!account.transactionPin) return true; // No PIN set yet
  return bcrypt.compare(pin, account.transactionPin);
};

// Helper: create txn record
const createTxn = (data) => Transaction.create({
  txnId: 'TXN' + uuidv4().replace(/-/g, '').toUpperCase().slice(0, 12),
  ...data,
});

// ── GET /api/v1/transactions  — List all transactions ──
router.get('/', async (req, res, next) => {
  try {
    const { type, page = 1, limit = 20, search, startDate, endDate, category } = req.query;
    const query = { user: req.user._id };
    if (type && type !== 'all') query.type = type;
    if (category) query.category = category;
    if (search) query.description = { $regex: search, $options: 'i' };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: transactions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});

// ── POST /api/v1/transactions/deposit ──
router.post('/deposit', async (req, res, next) => {
  try {
    const { amount, description, mode = 'CASH', category = 'other' } = req.body;
    if (!amount || amount < 1) return res.status(400).json({ success: false, message: 'Invalid amount' });

    const account = await Account.findOne({ user: req.user._id });
    if (!account || account.status !== 'active')
      return res.status(400).json({ success: false, message: 'Account not active' });

    const before = account.balance;
    account.balance += parseFloat(amount);
    await account.save();

    const txn = await createTxn({
      user: req.user._id, toAccount: account._id,
      type: 'credit', amount: parseFloat(amount),
      description: description || 'Cash Deposit',
      mode, category,
      balanceBefore: before, balanceAfter: account.balance,
    });

    await Notification.create({
      user: req.user._id, type: 'transaction',
      title: `₹${amount} Credited`,
      message: `${description || 'Cash Deposit'} — Bal: ₹${account.balance.toLocaleString('en-IN')}`,
      icon: '💰',
    });

    sendEmail({ to: req.user.email, type: 'transactionAlert', data: [req.user.name, 'credit', amount, account.balance, txn.txnId] });

    res.status(201).json({ success: true, message: 'Deposit successful', data: { txn, balance: account.balance } });
  } catch (err) { next(err); }
});

// ── POST /api/v1/transactions/withdraw ──
router.post('/withdraw', async (req, res, next) => {
  try {
    const { amount, pin, description, mode = 'ATM', category = 'atm' } = req.body;
    if (!amount || amount < 1) return res.status(400).json({ success: false, message: 'Invalid amount' });

    const account = await Account.findOne({ user: req.user._id }).select('+transactionPin');
    if (!account || account.status !== 'active')
      return res.status(400).json({ success: false, message: 'Account not active' });

    const pinOk = await verifyPin(account, pin);
    if (!pinOk) return res.status(401).json({ success: false, message: 'Incorrect transaction PIN' });

    if (parseFloat(amount) > account.balance)
      return res.status(400).json({ success: false, message: 'Insufficient balance' });

    if (parseFloat(amount) > account.dailyLimit)
      return res.status(400).json({ success: false, message: `Daily limit is ₹${account.dailyLimit.toLocaleString('en-IN')}` });

    const before = account.balance;
    account.balance -= parseFloat(amount);
    await account.save();

    const txn = await createTxn({
      user: req.user._id, fromAccount: account._id,
      type: 'debit', amount: parseFloat(amount),
      description: description || 'Cash Withdrawal',
      mode, category,
      balanceBefore: before, balanceAfter: account.balance,
    });

    await Notification.create({
      user: req.user._id, type: 'transaction',
      title: `₹${amount} Debited`,
      message: `${description || 'Cash Withdrawal'} — Bal: ₹${account.balance.toLocaleString('en-IN')}`,
      icon: '🏧',
    });

    sendEmail({ to: req.user.email, type: 'transactionAlert', data: [req.user.name, 'debit', amount, account.balance, txn.txnId] });

    res.status(201).json({ success: true, message: 'Withdrawal successful', data: { txn, balance: account.balance } });
  } catch (err) { next(err); }
});

// ── POST /api/v1/transactions/transfer ──
router.post('/transfer', async (req, res, next) => {
  try {
    const { toAccountNumber, amount, pin, description, mode = 'IMPS', category = 'transfer' } = req.body;
    if (!toAccountNumber || !amount || amount < 1)
      return res.status(400).json({ success: false, message: 'Account number and amount required' });

    const fromAccount = await Account.findOne({ user: req.user._id }).select('+transactionPin');
    if (!fromAccount || fromAccount.status !== 'active')
      return res.status(400).json({ success: false, message: 'Your account is not active' });

    const pinOk = await verifyPin(fromAccount, pin);
    if (!pinOk) return res.status(401).json({ success: false, message: 'Incorrect transaction PIN' });

    const toAccount = await Account.findOne({ accountNumber: toAccountNumber.trim() }).populate('user', 'name email');
    if (!toAccount) return res.status(404).json({ success: false, message: 'Beneficiary account not found' });
    if (toAccount.user._id.toString() === req.user._id.toString())
      return res.status(400).json({ success: false, message: 'Cannot transfer to your own account' });
    if (toAccount.status !== 'active')
      return res.status(400).json({ success: false, message: 'Beneficiary account is not active' });

    const amt = parseFloat(amount);
    if (amt > fromAccount.balance) return res.status(400).json({ success: false, message: 'Insufficient balance' });

    // Atomic balance update
    const txnRef = 'REF' + uuidv4().replace(/-/g, '').toUpperCase().slice(0, 10);
    const fromBefore = fromAccount.balance;
    fromAccount.balance -= amt;
    await fromAccount.save();
    toAccount.balance += amt;
    await toAccount.save();

    const [debitTxn] = await Promise.all([
      createTxn({
        user: req.user._id, fromAccount: fromAccount._id, toAccount: toAccount._id,
        type: 'debit', amount: amt, description: description || `Transfer to ${toAccount.user.name}`,
        mode, category, reference: txnRef,
        balanceBefore: fromBefore, balanceAfter: fromAccount.balance,
      }),
      createTxn({
        user: toAccount.user._id, fromAccount: fromAccount._id, toAccount: toAccount._id,
        type: 'credit', amount: amt, description: `Transfer from ${req.user.name}`,
        mode, category, reference: txnRef,
        balanceBefore: toAccount.balance - amt, balanceAfter: toAccount.balance,
      }),
      Notification.create({ user: req.user._id, type: 'transaction', title: `₹${amt} Transferred`, message: `To ${toAccount.user.name} — Ref: ${txnRef}`, icon: '⚡' }),
      Notification.create({ user: toAccount.user._id, type: 'transaction', title: `₹${amt} Received`, message: `From ${req.user.name} — Ref: ${txnRef}`, icon: '💸' }),
    ]);

    sendEmail({ to: req.user.email, type: 'transactionAlert', data: [req.user.name, 'debit', amt, fromAccount.balance, debitTxn.txnId] });

    res.status(201).json({
      success: true, message: `₹${amt.toLocaleString('en-IN')} transferred to ${toAccount.user.name}`,
      data: { txn: debitTxn, balance: fromAccount.balance, beneficiary: toAccount.user.name, reference: txnRef },
    });
  } catch (err) { next(err); }
});

// ── GET /api/v1/transactions/summary ──
router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthlyCredit, monthlyDebit, totalCount, account] = await Promise.all([
      Transaction.aggregate([{ $match: { user: userId, type: 'credit', createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Transaction.aggregate([{ $match: { user: userId, type: 'debit', createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Transaction.countDocuments({ user: userId }),
      Account.findOne({ user: userId }).select('balance accountType status'),
    ]);

    res.json({
      success: true,
      data: {
        balance: account?.balance || 0,
        monthlyCredit: monthlyCredit[0]?.total || 0,
        monthlyDebit: monthlyDebit[0]?.total || 0,
        totalTransactions: totalCount,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
