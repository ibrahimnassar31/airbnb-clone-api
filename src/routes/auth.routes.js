import { Router } from 'express';
import rateLimit from 'express-rate-limit';
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


const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts, please try again later.' });
const passwordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: 'Too many password reset attempts, please try again later.' });

const router = Router();

router.post('/register', validate(registerSchema), registerCtrl);
router.post('/login', loginLimiter, validate(loginSchema), loginCtrl);
router.post('/refresh', optionalAuth, refreshCtrl);
router.post('/logout', optionalAuth, logoutCtrl);

router.post('/verify/request', requireAuth, validate(verifyEmailRequestSchema), verifyEmailRequestCtrl);
router.get('/verify/confirm', validate(verifyEmailConfirmSchema), verifyEmailConfirmCtrl);
router.post('/verify/confirm', validate(verifyEmailConfirmSchema), verifyEmailConfirmCtrl);

router.post('/password/request', passwordLimiter, validate(passwordResetRequestSchema), passwordResetRequestCtrl);
router.post('/password/confirm', passwordLimiter, validate(passwordResetConfirmSchema), passwordResetConfirmCtrl);

export default router;
