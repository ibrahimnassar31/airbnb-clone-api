import { v2 as cloudinary } from 'cloudinary';
import { uploadsConfig } from '../../../config/uploads.js';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: uploadsConfig.cloudinary.cloudName,
  api_key: uploadsConfig.cloudinary.apiKey,
  api_secret: uploadsConfig.cloudinary.apiSecret,
});

export function cloudinaryStorage() {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: uploadsConfig.cloudinary.folder,
      resource_type: 'image',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    },
  });
}
