import { z } from 'zod';
import { safeText } from './common.js';

const SprintBase = z.object({
  name: safeText(80, { min: 2 }),
  goal: safeText(500, { multiline: true }).optional(),
  status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).strict();

const datesInOrder = (b: { startDate?: Date; endDate?: Date }) => !b.startDate || !b.endDate || b.endDate >= b.startDate;

export const CreateSprintBody = SprintBase.refine(datesInOrder, { message: 'endDate must be on or after startDate', path: ['endDate'] });
export const UpdateSprintBody = SprintBase.partial().strict()
  .refine((b) => Object.keys(b).length > 0, 'Provide at least one field to update')
  .refine(datesInOrder, { message: 'endDate must be on or after startDate', path: ['endDate'] });
