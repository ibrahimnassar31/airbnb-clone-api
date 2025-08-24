import { Router } from 'express';
import { validate } from '../middlewares/validationMiddleware.js';
import {
  registerSchema, loginSchema,
  verifyEmailRequestSchema, verifyEmailConfirmSchema,
  passwordResetRequestSchema, passwordResetConfirmSchema,
} from '../validation/validationSchemas.js';
import { optionalAuth, requireAuth } from '../middlewares/authMiddleware.js';
import {
  registerCtrl, loginCtrl, refreshCtrl, logoutCtrl,
  verifyEmailRequestCtrl, verifyEmailConfirmCtrl,
  passwordResetRequestCtrl, passwordResetConfirmCtrl,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', validate(registerSchema), registerCtrl);
router.post('/login', validate(loginSchema), loginCtrl);
router.post('/refresh', optionalAuth, refreshCtrl);
router.post('/logout', optionalAuth, logoutCtrl);

router.post('/verify/request', requireAuth, validate(verifyEmailRequestSchema), verifyEmailRequestCtrl);
router.get('/verify/confirm', validate(verifyEmailConfirmSchema), verifyEmailConfirmCtrl);
router.post('/verify/confirm', validate(verifyEmailConfirmSchema), verifyEmailConfirmCtrl);

router.post('/password/request', validate(passwordResetRequestSchema), passwordResetRequestCtrl);
router.post('/password/confirm', validate(passwordResetConfirmSchema), passwordResetConfirmCtrl);

export default router;
