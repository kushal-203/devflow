import { z } from 'zod';
import { safeText } from './common.js';

export const CreateProjectBody = z.object({
  key: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9]{1,9}$/, 'Must be 2–10 letters/digits starting with a letter, e.g. "DF"'),
  name: safeText(100, { min: 3 }),
  description: safeText(2000, { multiline: true }).optional(),
}).strict();

export const UpdateProjectBody = z.object({
  name: safeText(100, { min: 3 }).optional(),
  description: safeText(2000, { multiline: true }).optional(),
}).strict().refine((b) => Object.keys(b).length > 0, 'Provide at least one field to update');

export const BoardQuery = z.object({
  sprintId: z.union([z.uuid(), z.literal('backlog')]).optional(),
}).strict();
