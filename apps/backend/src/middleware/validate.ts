import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { badRequest } from '../lib/errors.js';

type Part = 'body' | 'query' | 'params';

/**
 * Validates and normalises one part of the request with a Zod schema.
 * The parsed value is stored on res.locals.valid[part] (Express 5 makes req.query read-only).
 */
export const validate = (part: Part, schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req[part] ?? {});
  if (!result.success) {
    throw badRequest(`Invalid request ${part}`, result.error.issues.map((i) => ({
      field: i.path.join('.') || part,
      message: i.message,
    })));
  }
  res.locals.valid = { ...(res.locals.valid ?? {}), [part]: result.data };
  next();
};

export function valid<T>(res: Response, part: Part): T {
  return res.locals.valid[part] as T;
}
