import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { AUTH_COOKIE, currentUser } from '../middleware/auth.js';
import { valid } from '../middleware/validate.js';
import type { LoginBody } from '../schemas/auth.js';
import * as auth from '../services/authService.js';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  maxAge: 8 * 60 * 60 * 1000,
  path: '/',
};

export async function login(req: Request, res: Response) {
  const { email, password } = valid<LoginBody>(res, 'body');
  const { token, user } = await auth.login(email, password);
  res.cookie(AUTH_COOKIE, token, cookieOptions);
  res.json({ token, user });
}

export function logout(req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.status(204).end();
}

export function me(req: Request, res: Response) {
  res.json({ user: currentUser(res) });
}
