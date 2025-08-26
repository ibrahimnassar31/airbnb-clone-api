import multer from 'multer';
import sharp from 'sharp';
import { uploadsConfig } from '../config/uploads.js';
import { cloudinaryStorage } from '../utils/uploads/storage/cloudinary.js';
import { s3Storage } from '../utils/uploads/storage/s3.js';
import { localStorage } from '../utils/uploads/storage/local.js';
import { StatusCodes } from 'http-status-codes';

const IMAGE_TYPES = ['image/jpeg','image/png','image/webp','image/avif'];
const MAX_SIZE = uploadsConfig.maxSize || 5 * 1024 * 1024; 

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

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

  return async (req, res, next) => {
    upload(req, res, async (err) => {
      if (err) {
        const e = new Error(err.message || 'Upload error'); e.status = StatusCodes.BAD_REQUEST;
        return next(e);
      }
      if (req.files && req.files.length) {
        for (const file of req.files) {
          file.originalname = sanitizeFilename(file.originalname);
          file.fieldname = sanitizeFilename(file.fieldname);
          if (file.filename) file.filename = sanitizeFilename(file.filename);
          if (file.path) file.path = sanitizeFilename(file.path);
          if (file.metadata && typeof file.metadata === 'object') {
            for (const k in file.metadata) {
              if (typeof file.metadata[k] === 'string') file.metadata[k] = sanitizeFilename(file.metadata[k]);
            }
          }
          if (file.buffer) {
            try {
              const processed = await sharp(file.buffer)
                .toFormat('jpeg')
                .jpeg({ quality: 90 })
                .withMetadata({ exif: false })
                .toBuffer();
              file.buffer = processed;
            } catch (ex) {
              const e = new Error('Image processing failed'); e.status = StatusCodes.BAD_REQUEST;
              return next(e);
            }
          }
        }
      }
      next();
    });
  };
}
