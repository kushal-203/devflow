import { z } from 'zod';

export const uuid = z.uuid({ message: 'Must be a valid UUID' });
export const IdParams = z.object({ id: uuid }).strict();
export const ProjectIdParams = z.object({ projectId: uuid }).strict();

/** Rejects ASCII control characters (except normal whitespace for multi-line fields). */
export const safeText = (max: number, { multiline = false, min = 0 } = {}) =>
  z.string()
    .trim()
    .min(min, min ? `Must be at least ${min} characters` : undefined)
    .max(max, `Must be at most ${max} characters`)
    .refine((s) => !(multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/ : /[\u0000-\u001F\u007F]/).test(s), 'Must not contain control characters');
