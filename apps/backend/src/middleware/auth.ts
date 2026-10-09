import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import type { Role } from '../generated/prisma/client.js';

export const AUTH_COOKIE = 'devflow_token';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface TokenPayload {
  sub: string;
  role: Role;
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, role: user.role } satisfies TokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'devflow',
  });
}

/**
 * Accepts either `Authorization: Bearer <jwt>` (API clients, tests) or the httpOnly session
 * cookie set at login (browser). The user is re-loaded from the database on every request so
 * a role change or deleted user takes effect immediately.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.[AUTH_COOKIE];
  if (!token) throw unauthorized();

  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { issuer: 'devflow' }) as unknown as TokenPayload;
  } catch {
    throw unauthorized('Invalid or expired token');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, name: true, role: true } });
  if (!user) throw unauthorized('User no longer exists');
  res.locals.user = user satisfies AuthUser;
  next();
}

/** Route-level role guard, e.g. requireRole('ADMIN'). */
export const requireRole = (...roles: Role[]) => (req: Request, res: Response, next: NextFunction) => {
  const user = res.locals.user as AuthUser | undefined;
  if (!user) throw unauthorized();
  if (!roles.includes(user.role)) throw forbidden(`This action requires one of these roles: ${roles.join(', ')}`);
  next();
};

/** Anyone signed in except read-only viewers. */
export const requireWriter = requireRole('ADMIN', 'QA', 'DEVELOPER');

export const currentUser = (res: Response) => res.locals.user as AuthUser;
