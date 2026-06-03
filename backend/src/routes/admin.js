const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

// GET /api/v1/admin/dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, blockedUsers, totalFunds, totalTxns, recentTxns] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', status: 'active' }),
      User.countDocuments({ role: 'user', status: 'blocked' }),
      Account.aggregate([{ $group: { _id: null, total: { $sum: '$balance' } } }]),
      Transaction.countDocuments(),
      Transaction.find().sort({ createdAt: -1 }).limit(10).populate('user', 'name email'),
    ]);
    res.json({ success: true, data: { totalUsers, activeUsers, blockedUsers, totalFunds: totalFunds[0]?.total || 0, totalTxns, recentTxns } });
  } catch (err) { next(err); }
});

// GET /api/v1/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = { role: 'user' };
    if (status && status !== 'all') query.status = status;
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    const total = await User.countDocuments(query);
    const users = await User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    // Populate account data
    const usersWithAccounts = await Promise.all(users.map(async u => {
      const account = await Account.findOne({ user: u._id }).select('accountNumber accountType balance status');
      return { ...u.toObject(), account };
    }));
    res.json({ success: true, data: usersWithAccounts, pagination: { page: parseInt(page), total, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// PATCH /api/v1/admin/users/:id/block
router.patch('/users/:id/block', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.status = user.status === 'active' ? 'blocked' : 'active';
    await user.save({ validateBeforeSave: false });
    if (user.status === 'blocked') await Account.findOneAndUpdate({ user: user._id }, { status: 'frozen' });
    else await Account.findOneAndUpdate({ user: user._id }, { status: 'active' });
    res.json({ success: true, message: `User ${user.status}`, data: user });
  } catch (err) { next(err); }
});

// GET /api/v1/admin/transactions
router.get('/transactions', async (req, res, next) => {
  try {
    const { page = 1, limit = 30, type, search } = req.query;
    const query = {};
    if (type && type !== 'all') query.type = type;
    const total = await Transaction.countDocuments(query);
    const txns = await Transaction.find(query).sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(parseInt(limit))
      .populate('user', 'name email');
    res.json({ success: true, data: txns, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// GET /api/v1/admin/reports/summary
router.get('/reports/summary', async (req, res, next) => {
  try {
    const [totalFunds, creditTotal, debitTotal, usersByStatus, txnsByType] = await Promise.all([
      Account.aggregate([{ $group: { _id: null, total: { $sum: '$balance' } } }]),
      Transaction.aggregate([{ $match: { type: 'credit' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Transaction.aggregate([{ $match: { type: 'debit' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      User.aggregate([{ $match: { role: 'user' } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Transaction.aggregate([{ $group: { _id: '$type', count: { $sum: 1 }, total: { $sum: '$amount' } } }]),
    ]);
    res.json({ success: true, data: { totalFunds: totalFunds[0]?.total || 0, creditTotal: creditTotal[0] || {}, debitTotal: debitTotal[0] || {}, usersByStatus, txnsByType } });
  } catch (err) { next(err); }
});

module.exports = router;
