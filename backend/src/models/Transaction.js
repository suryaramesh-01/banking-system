const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  txnId:       { type: String, unique: true, required: true },
  fromAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  toAccount:   { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:        { type: String, enum: ['credit', 'debit', 'transfer', 'deposit', 'withdrawal', 'interest', 'fee', 'reversal'], required: true },
  amount:      { type: Number, required: true, min: [1, 'Amount must be positive'] },
  currency:    { type: String, default: 'INR' },
  description: { type: String, required: true, maxlength: 200 },
  category:    { type: String, enum: ['salary', 'shopping', 'food', 'utility', 'transfer', 'atm', 'upi', 'emi', 'investment', 'other'], default: 'other' },
  mode:        { type: String, enum: ['NEFT', 'RTGS', 'IMPS', 'UPI', 'ATM', 'CASH', 'CHEQUE', 'AUTO'], default: 'CASH' },
  status:      { type: String, enum: ['pending', 'success', 'failed', 'reversed'], default: 'success' },
  balanceBefore: { type: Number },
  balanceAfter:  { type: Number },
  reference:   { type: String },
  note:        { type: String, maxlength: 100 },
  ipAddress:   { type: String },
  deviceInfo:  { type: String },
}, { timestamps: true });

TransactionSchema.index({ user: 1, createdAt: -1 });
TransactionSchema.index({ txnId: 1 });
TransactionSchema.index({ fromAccount: 1 });
TransactionSchema.index({ toAccount: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
