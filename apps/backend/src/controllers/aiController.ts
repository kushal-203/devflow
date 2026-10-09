import type { Request, Response } from 'express';
import { valid } from '../middleware/validate.js';
import type { TriageRequest } from '../schemas/ai.js';
import { triage } from '../services/ai/triageService.js';

export async function triageBug(req: Request, res: Response) {
  res.json({ data: await triage(valid<TriageRequest>(res, 'body')) });
}
