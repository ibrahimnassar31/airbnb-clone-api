import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import { uploadsConfig } from '../../../config/uploads.js';
import { customAlphabet } from 'nanoid';

const nano = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 20);

const s3 = new S3Client({ region: uploadsConfig.s3.region });

export function s3Storage() {
  return multerS3({
    s3,
    bucket: uploadsConfig.s3.bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req, file, cb) => {
      const ext = (file.originalname.match(/\.[a-zA-Z0-9]+$/) || [''])[0] || '';
      cb(null, `airbnb-clone/${Date.now()}-${nano()}${ext}`);
    },
  });
}
