import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';

const router = Router();

router.get('/cloudinary/unsigned-config', requireAuth, requireRole('host','admin'), (req, res) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UNSIGNED_PRESET;
  const folder = process.env.CLOUDINARY_FOLDER || 'airbnb-clone';

  if (!cloudName || !uploadPreset) {
    const err = new Error('Cloudinary unsigned not configured'); err.status = 500; throw err;
  }

  res.json({
    cloudName,
    uploadPreset,
    folder,
    apiUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
  });
});

export default router;
