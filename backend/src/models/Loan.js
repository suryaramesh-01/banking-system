const mongoose = require('mongoose');

const LoanSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  loanType:    { type: String, enum: ['Personal', 'Home', 'Vehicle', 'Education', 'Business'], required: true },
  amount:      { type: Number, required: true, min: 10000 },
  tenure:      { type: Number, required: true },           // months
  interestRate:{ type: Number, required: true },           // % per annum
  emi:         { type: Number },
  status:      { type: String, enum: ['pending', 'approved', 'rejected', 'active', 'closed'], default: 'pending' },
  purpose:     { type: String, maxlength: 300 },
  documents:   [{ name: String, url: String }],
  approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt:  { type: Date },
  disbursedAt: { type: Date },
  nextDueDate: { type: Date },
  paidInstallments: { type: Number, default: 0 },
}, { timestamps: true });

// Calculate EMI before save
LoanSchema.pre('save', function (next) {
  if (this.isModified('amount') || this.isModified('tenure') || this.isModified('interestRate')) {
    const P = this.amount;
    const r = this.interestRate / 12 / 100;
    const n = this.tenure;
    this.emi = Math.round(P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
  }
  next();
});

module.exports = mongoose.model('Loan', LoanSchema);
