import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema({
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  address: { country: String, city: String, street: String },
  coordinates: { lat: { type: Number, index: true }, lng: { type: Number, index: true } },
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number], default: undefined } 
  },
  pricePerNight: { type: Number, required: true, min: 0 },
  maxGuests: { type: Number, default: 1, min: 1 },
  bedrooms: { type: Number, default: 1, min: 0 },
  bathrooms: { type: Number, default: 1, min: 0 },
  amenities: [{ type: String }],
  photos: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length >= 1 && v.every(s => typeof s === 'string' && s.trim().length > 0);
      },
      message: 'At least one photo is required',
    },
  },
  isActive: { type: Boolean, default: true },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

listingSchema.index({ title: 'text', description: 'text', 'address.city': 'text', 'address.country': 'text' });
listingSchema.index({ location: '2dsphere' });
listingSchema.index({ isActive: 1, createdAt: -1 });
listingSchema.index({ isActive: 1, pricePerNight: 1 });
listingSchema.index({ isActive: 1, averageRating: -1, reviewCount: -1 });
listingSchema.index({ 'address.city': 1, isActive: 1 });
// Compound index optimized for city + price filters on active listings
listingSchema.index({ isActive: 1, 'address.city': 1, pricePerNight: 1 });

listingSchema.pre('save', function(next) {
  const hasCoords = this.coordinates?.lat != null && this.coordinates?.lng != null;
  if (hasCoords) {
    this.location = { type: 'Point', coordinates: [this.coordinates.lng, this.coordinates.lat] };
  } else {
    this.location = undefined;
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
