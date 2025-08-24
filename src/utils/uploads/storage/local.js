import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { uploadsConfig } from '../../../config/uploads.js';

export function ensureLocalDir() {
  if (!fs.existsSync(uploadsConfig.localDir)) fs.mkdirSync(uploadsConfig.localDir, { recursive: true });
}

export function localStorage() {
  ensureLocalDir();
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsConfig.localDir),
    filename: (_req, file, cb) => {
      const ts = Date.now();
      const safe = file.originalname.replace(/\s+/g, '_');
      cb(null, `${ts}-${safe}`);
    },
  });
}
