const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accountNumber: { type: String, unique: true, required: true },
  accountType: { type: String, enum: ['Savings', 'Current', 'Salary', 'Fixed Deposit'], default: 'Savings' },
  balance:     { type: Number, default: 0, min: [0, 'Balance cannot be negative'] },
  currency:    { type: String, default: 'INR' },
  ifsc:        { type: String, default: 'NEXA0000001' },
  branch:      { type: String, default: 'Main Branch' },
  status:      { type: String, enum: ['active', 'frozen', 'closed'], default: 'active' },
  transactionPin: { type: String, select: false },        // hashed 4-digit PIN
  dailyLimit:  { type: Number, default: 100000 },
  monthlyLimit:{ type: Number, default: 500000 },
  interestRate:{ type: Number, default: 3.5 },
  minBalance:  { type: Number, default: 500 },
}, { timestamps: true });

// Generate unique 16-digit account number
AccountSchema.statics.generateAccountNumber = async function () {
  let num, exists;
  do {
    num = Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 9000)).join(' ');
    exists = await this.findOne({ accountNumber: num });
  } while (exists);
  return num;
};

module.exports = mongoose.model('Account', AccountSchema);
