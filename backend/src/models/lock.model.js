const mongoose = require('mongoose');

const LockSchema = new mongoose.Schema(
  {
    lockKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ownerId: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    acquiredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index to help query active locks by key and expiry status
LockSchema.index({ lockKey: 1, expiresAt: 1 });

module.exports = mongoose.models.Lock || mongoose.model('Lock', LockSchema);
