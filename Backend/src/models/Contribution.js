const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    ngoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NGO',
      required: true,
    },
    type: {
      type: String,
      enum: ['monetary', 'hours', 'supplies'],
      required: true,
    },
    amount: { type: Number, default: 0 },   // INR (if monetary)
    hours: { type: Number, default: 0 },    // volunteer hours
    note: { type: String, maxlength: 500 },
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null,
    },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

contributionSchema.index({ ngoId: 1 });
contributionSchema.index({ userId: 1 });
contributionSchema.index({ date: -1 });
contributionSchema.index({ type: 1 });

module.exports = mongoose.model('Contribution', contributionSchema);
