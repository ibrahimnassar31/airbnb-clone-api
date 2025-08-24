import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guestsCount: { type: Number, default: 1, min: 1 },
    totalPrice: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending','confirmed','cancelled'], default: 'confirmed' },
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelReason: { type: String },
    refundAmount: { type: Number, min: 0 },
    currency: { type: String, default: process.env.DEFAULT_CURRENCY || 'usd' },
    paidAmount: { type: Number, min: 0 }, // إجمالي المدفوع (بوحدة العملة، مثل 100.00)
    paymentProvider: { type: String, enum: ['stripe','paypal', null], default: null },
    paymentIntentId: { type: String },
  },
  { timestamps: true }
);

bookingSchema.index({ guest: 1, listing: 1, checkIn: 1 });

bookingSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id; delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Booking', bookingSchema);
