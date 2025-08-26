import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';
import { photosUpload } from '../middlewares/uploadMiddleware.js';


const uploadsLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, message: 'Too many uploads, please try again later.' });
const router = Router();

router.post('/photos', uploadsLimiter, requireAuth, requireRole('host','admin'), photosUpload('photos', 10), (req, res) => {

  const files = (req.files || []).map(f => f.path || f.location || f.filename);
  res.status(201).json({ files });
});

export default router;
