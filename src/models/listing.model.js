import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema({
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  address: { country: String, city: String, street: String },
  coordinates: { lat: { type: Number, index: true }, lng: { type: Number, index: true } },
  // GeoJSON
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], index: '2dsphere', default: undefined } // [lng, lat]
  },
  pricePerNight: { type: Number, required: true, min: 0 },
  maxGuests: { type: Number, default: 1, min: 1 },
  bedrooms: { type: Number, default: 1, min: 0 },
  bathrooms: { type: Number, default: 1, min: 0 },
  amenities: [{ type: String }],
  photos: [{ type: String }],
  isActive: { type: Boolean, default: true },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

listingSchema.index({ title: 'text', description: 'text', 'address.city': 'text', 'address.country': 'text' });

listingSchema.pre('save', function(next) {
  if (!this.location && this.coordinates?.lat != null && this.coordinates?.lng != null) {
    this.location = { type: 'Point', coordinates: [this.coordinates.lng, this.coordinates.lat] };
  }
  next();
});

listingSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id; delete ret.__v;
    return ret;
  },
});

export default mongoose.model('Listing', listingSchema);
