import { z } from 'zod';
import { safeText } from './common.js';
import { PRIORITIES, SEVERITIES } from './issue.js';

export const TriageRequestBody = z.object({
  title: safeText(200).optional(),
  description: safeText(5_000, { multiline: true, min: 10 }),
  stepsToReproduce: safeText(5_000, { multiline: true }).optional(),
}).strict();
export type TriageRequest = z.infer<typeof TriageRequestBody>;

/** Contract every AI provider must satisfy – LLM output is validated against it before use. */
export const TriageResult = z.object({
  severity: z.enum(SEVERITIES),
  suggestedPriority: z.enum(PRIORITIES),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1).max(1_000),
  labels: z.array(z.string().min(1).max(40)).max(10),
  suggestedTestSteps: z.array(z.string().min(1).max(300)).min(1).max(15),
  suggestedTestCases: z.array(z.object({
    title: z.string().min(1).max(200),
    steps: z.array(z.string().min(1).max(300)).min(1).max(15),
    expected: z.string().min(1).max(500),
  })).min(1).max(5),
});
export type TriageResult = z.infer<typeof TriageResult>;
