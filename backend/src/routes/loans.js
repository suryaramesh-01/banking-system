// ── Loan Routes ──
const express = require('express');
const router = express.Router();
const Loan = require('../models/Loan');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Apply for loan
router.post('/apply', async (req, res, next) => {
  try {
    const { loanType, amount, tenure, purpose } = req.body;
    const rates = { Personal: 12.5, Home: 8.5, Vehicle: 9.5, Education: 7.0, Business: 14.0 };
    const loan = await Loan.create({ user: req.user._id, loanType, amount, tenure, purpose, interestRate: rates[loanType] || 12 });
    res.status(201).json({ success: true, data: loan, message: 'Loan application submitted' });
  } catch (err) { next(err); }
});

// Get user loans
router.get('/my', async (req, res, next) => {
  try {
    const loans = await Loan.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: loans });
  } catch (err) { next(err); }
});

// Admin approve/reject
router.patch('/:id/status', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const loan = await Loan.findByIdAndUpdate(req.params.id, { status, approvedBy: req.user._id, approvedAt: new Date() }, { new: true });
    res.json({ success: true, data: loan });
  } catch (err) { next(err); }
});

module.exports = router;
