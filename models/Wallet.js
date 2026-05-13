const mongoose = require('mongoose');

const { Schema } = mongoose;

const WalletSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  meta: { type: Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model('Wallet', WalletSchema);
