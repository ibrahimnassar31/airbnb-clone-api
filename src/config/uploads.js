import { env } from './env.js';

export const uploadsConfig = {
  provider: process.env.UPLOADS_PROVIDER || 'cloudinary',
  localDir: process.env.LOCAL_UPLOADS_DIR || 'uploads',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || 'airbnb-clone',
  },
  s3: {
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_S3_BUCKET,
  },
};
