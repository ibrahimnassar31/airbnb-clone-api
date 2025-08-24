// Only one block of imports and function definition should exist
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/user.model.js';
import Listing from '../models/listing.model.js';
import Review from '../models/review.model.js';
import bcrypt from 'bcryptjs';

async function run() {
  await connectDB();
  await Promise.all([User.deleteMany({}), Listing.deleteMany({}), Review.deleteMany({})]);

  const passwordHash = await bcrypt.hash('P@ssw0rd!', 10);
  const admin = await User.create({ email: 'admin@example.com', passwordHash, name: 'Admin', role: 'admin', isVerified: true });
  const host = await User.create({ email: 'host@example.com', passwordHash, name: 'Host', role: 'host', isVerified: true });

  await Listing.create({
    host: host._id,
    title: 'Central Apartment',
    description: 'Nice place',
    address: { city: 'Gaza', country: 'PS' },
    coordinates: { lat: 31.5, lng: 34.47 },
    location: { type: 'Point', coordinates: [34.47, 31.5] },
    pricePerNight: 40,
    maxGuests: 3,
    amenities: ['wifi','parking'],
    photos: [],
    isActive: true,
  });

  // Seed review for deletion test
  const review = await Review.create({
    listing: new mongoose.Types.ObjectId('68a9b6c6692b310278d430dd'),
    author: new mongoose.Types.ObjectId('68a9a141de0536d65b9fe2f2'),
    rating: 5,
    comment: 'Test review for deletion.'
  });
  console.log('Seeded review:', review);

  console.log('Seed done:', { admin: admin.email, host: host.email });
  await mongoose.connection.close();
}

run().catch(err => { console.error(err); process.exit(1); });
