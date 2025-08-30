import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, trim: true },
    role: { type: String, enum: ['guest', 'host', 'admin'], default: 'guest' },

    refreshTokenHash: { type: String, select: false },

    avatarUrl: String,
    isVerified: { type: Boolean, default: false },

    verifyEmailTokenHash: { type: String, select: false },
    verifyEmailTokenExpires: { type: Date, select: false },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordTokenExpires: { type: Date, select: false },
  },
  { timestamps: true, strict: 'throw' } 
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.refreshTokenHash;
    delete ret.verifyEmailTokenHash;
    delete ret.verifyEmailTokenExpires;
    delete ret.resetPasswordTokenHash;
    delete ret.resetPasswordTokenExpires;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
