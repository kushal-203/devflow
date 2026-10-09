import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors.js';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}`, requestId: res.locals.requestId } });
}

// Consistent error contract: { error: { code, message, details?, requestId } }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = res.locals.requestId;
  const e = err as { type?: string; status?: number; limit?: number };
  if (e?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'MALFORMED_JSON', message: 'Request body is not valid JSON', requestId } });
  }
  if (e?.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: `Request body exceeds ${e.limit} bytes`, requestId } });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}), requestId } });
  }
  // Prisma "record not found" / FK violations surfaced as 404 / 400 rather than 500.
  const code = (err as { code?: string })?.code;
  if (code === 'P2025') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found', requestId } });
  if (code === 'P2003') return res.status(400).json({ error: { code: 'INVALID_REFERENCE', message: 'A referenced record does not exist', requestId } });
  if (code === 'P2002') return res.status(409).json({ error: { code: 'DUPLICATE', message: 'A record with these unique values already exists', requestId } });

  console.error(`[${new Date().toISOString()}] ${requestId} ${req.method} ${req.originalUrl}`, err);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', requestId } });
}
