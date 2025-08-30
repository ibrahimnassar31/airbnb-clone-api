import { z } from 'zod';

export const objectId = () => z.string().regex(/^[a-fA-F0-9]{24}$/);

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const verifyEmailRequestSchema = z.object({}); 
export const verifyEmailConfirmSchema = z.object({
  uid: z.string().min(1),
  token: z.string().min(1),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetConfirmSchema = z.object({
  uid: z.string().min(1),
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

// Listing
export const listingCreateSchema = z.object({
  title: z.string().min(3).max(140),
  description: z.string().max(2000).optional(),
  address: z.object({
    country: z.string().min(2).optional(),
    city: z.string().min(1).optional(),
    street: z.string().optional(),
  }).optional(),
  coordinates: z.object({
    lat: z.number().gte(-90).lte(90),
    lng: z.number().gte(-180).lte(180),
  }).optional(),
  pricePerNight: z.number().positive(),
  maxGuests: z.number().int().min(1).default(1),
  bedrooms: z.number().int().min(0).default(1),
  bathrooms: z.number().int().min(0).default(1),
  amenities: z.array(z.string()).default([]),
  // Require at least one non-empty photo reference (URL or path)
  photos: z.array(z.string().min(1, 'Photo path/URL cannot be empty')).min(1, 'At least one photo is required'),
  isActive: z.boolean().optional(),
});

export const listingUpdateSchema = listingCreateSchema.partial();

export const listingQuerySchema = z.object({
  city: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  guests: z.coerce.number().int().min(1).optional(),
  q: z.string().optional(),
  amenities: z.string().transform(s => s.split(',')).optional(), 
  sort: z.enum(['priceAsc','priceDesc','ratingDesc','newest']).optional(),
  near: z.string().regex(/^[-+]?\d+(\.\d+)?\,[-+]?\d+(\.\d+)?$/).optional(), 
  radiusKm: z.coerce.number().min(0.1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  bbox: z.string().regex(/^[-+]?\d+(\.\d+)?\,[-+]?\d+(\.\d+)?;[-+]?\d+(\.\d+)?\,[-+]?\d+(\.\d+)?$/).optional(),
  polygon: z.string().regex(/^([-+]?\d+(\.\d+)?\,[-+]?\d+(\.\d+)?)(\|[-+]?\d+(\.\d+)?\,[-+]?\d+(\.\d+)?){2,}$/).optional(),
});

export const listingIdParamSchema = z.object({ id: objectId() });


export const bookingCreateSchema = z.object({
  listingId: z.string().min(1),
  checkIn: z.coerce.date(),
  checkOut: z.coerce.date(),
  guestsCount: z.number().int().min(1).default(1),
});

export const reviewCreateSchema = z.object({
  listingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export const reviewCreateForBookingSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export const reviewDeleteForBookingParams = z.object({
  bookingId: objectId(),
});

export const bookingCancelParams = z.object({ id: objectId() });
export const bookingCancelBody = z.object({ reason: z.string().max(1000).optional() });


