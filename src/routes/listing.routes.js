import { Router } from 'express';
import { validate } from '../middlewares/validationMiddleware.js';
import { listingCreateSchema, listingUpdateSchema, listingQuerySchema } from '../validation/validationSchemas.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';
import { cacheMiddleware } from '../middlewares/cacheMiddleware.js';
import {
  createListingCtrl, updateListingCtrl, deleteListingCtrl, getListingCtrl, listListingsCtrl
} from '../controllers/listing.controller.js';

const router = Router();

router.get('/', validate(listingQuerySchema, 'query'), cacheMiddleware({ ttlSec: 30 }), listListingsCtrl);
router.get('/:id', cacheMiddleware({ ttlSec: 60 }), getListingCtrl);

router.post('/', requireAuth, requireRole('host', 'admin'), validate(listingCreateSchema), createListingCtrl);
router.patch('/:id', requireAuth, requireRole('host', 'admin'), validate(listingUpdateSchema), updateListingCtrl);
router.delete('/:id', requireAuth, requireRole('host', 'admin'), deleteListingCtrl);

export default router;
