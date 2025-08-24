import * as authService from '../services/auth.service.js';
import { env } from '../config/env.js';

import {
  requestEmailVerification,
  confirmEmailVerification,
  requestPasswordReset,
  confirmPasswordReset,
} from '../services/auth.service.js';
export async function registerCtrl(req, res) {
  const result = await authService.register(req.body, res);
  return res.status(201).json(result);
}

export async function loginCtrl(req, res) {
  const result = await authService.login(req.body, res);
  return res.json(result);
}

export async function refreshCtrl(req, res) {
  const result = await authService.refresh(req, res);
  return res.json(result);
}

export async function logoutCtrl(req, res) {
  const result = await authService.logout(req, res);
  return res.json(result);
}

export async function verifyEmailRequestCtrl(req, res) {
  const out = await requestEmailVerification(req.user.id);
  res.json(out);
}

export async function verifyEmailConfirmCtrl(req, res) {
  const { uid, token } = { uid: req.query.uid || req.body.uid, token: req.query.token || req.body.token };
  const out = await confirmEmailVerification({ uid, token });

  const wantsHtml = req.accepts('html') || req.query.redirect === '1';
  if (wantsHtml && process.env.FRONTEND_ORIGIN) {
    const url = `${process.env.FRONTEND_ORIGIN}/auth/verified?status=success`;
    return res.redirect(302, url);
  }
  res.json(out);
}

export async function passwordResetRequestCtrl(req, res) {
  const { email } = req.body;
  const out = await requestPasswordReset(email);
  res.json(out);
}

export async function passwordResetConfirmCtrl(req, res) {
  const { uid, token, password } = req.body;
  const out = await confirmPasswordReset({ uid, token, password });
  res.json(out);
}

export default { registerCtrl, loginCtrl, refreshCtrl, logoutCtrl, verifyEmailRequestCtrl, verifyEmailConfirmCtrl, passwordResetRequestCtrl, passwordResetConfirmCtrl };
