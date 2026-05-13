const mongoose = require('mongoose');

const { Schema } = mongoose;

const RefundSchema = new Schema({
  amount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
  date: { type: Date },
  note: { type: String },
});

const TransactionSchema = new Schema({
  type: { type: String, enum: ['debit', 'credit'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  refund: { type: RefundSchema, default: () => ({}) },
  meta: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Transaction', TransactionSchema);
