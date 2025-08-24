import multer from 'multer';
import sharp from 'sharp';
import { uploadsConfig } from '../config/uploads.js';
import { cloudinaryStorage } from '../utils/uploads/storage/cloudinary.js';
import { s3Storage } from '../utils/uploads/storage/s3.js';
import { localStorage } from '../utils/uploads/storage/local.js';
import { StatusCodes } from 'http-status-codes';

const IMAGE_TYPES = ['image/jpeg','image/png','image/webp','image/avif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function fileFilter(_req, file, cb) {
  if (!IMAGE_TYPES.includes(file.mimetype)) return cb(new Error('Unsupported file type'));
  cb(null, true);
}

function pickStorage() {
  const p = uploadsConfig.provider;
  if (p === 'cloudinary') return cloudinaryStorage();
  if (p === 's3') return s3Storage();
  return localStorage();
}

export function photosUpload(field = 'photos', maxCount = 10) {
  const upload = multer({
    storage: pickStorage(),
    fileFilter,
    limits: { fileSize: MAX_SIZE, files: maxCount },
  }).array(field, maxCount);

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        const e = new Error(err.message || 'Upload error'); e.status = StatusCodes.BAD_REQUEST;
        return next(e);
      }
      next();
    });
  };
}
