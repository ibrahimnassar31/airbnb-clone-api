import { Router } from 'express';
import { presignUploadLimiter } from '../middlewares/rateLimitMiddleware.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';
import { photosUpload } from '../middlewares/uploadMiddleware.js';


const uploadsLimiter = presignUploadLimiter;
const router = Router();

router.post('/photos', uploadsLimiter, requireAuth, requireRole('host','admin'), photosUpload('photos', 10), (req, res) => {

  const files = (req.files || []).map(f => f.path || f.location || f.filename);
  res.status(201).json({ files });
});

export default router;
