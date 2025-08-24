import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';
import { photosUpload } from '../middlewares/uploadMiddleware.js';

const router = Router();

router.post('/photos', requireAuth, requireRole('host','admin'), photosUpload('photos', 10), (req, res) => {

  const files = (req.files || []).map(f => f.path || f.location || f.filename);
  res.status(201).json({ files });
});

export default router;
