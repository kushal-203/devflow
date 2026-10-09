import type { TriageRequest, TriageResult } from '../../schemas/ai.js';

/**
 * Deterministic, offline "AI" used by default and in CI. Same input → same output, so tests can
 * assert on it. It scores the text against severity keyword lists and builds test steps from the
 * reported reproduction steps. It is a stand-in for an LLM, not a replacement.
 */
const SEVERITY_RULES: Array<{ severity: TriageResult['severity']; words: RegExp[] }> = [
  { severity: 'CRITICAL', words: [/\bcrash(es|ed|ing)?\b/, /data loss|lost (all )?data|deleted .* data/, /secur(e|ity)|vulnerab|injection|\bxss\b|breach|unauthori[sz]ed access/, /charged twice|double charge|payment(s)? (fail|lost)/, /outage|production (is )?down|site (is )?down/, /corrupt(ed|ion)?/] },
  { severity: 'HIGH', words: [/\b5\d\d\b|internal server error/, /exception|stack ?trace/, /\b(fails?|failing|failure|broken)\b/, /\b(cannot|can't|unable to)\b/, /time(s|d)? ?out/, /\bblock(s|ed|er|ing)\b/, /regression/] },
  { severity: 'MEDIUM', words: [/\b(incorrect|wrong|inaccurate)\b/, /\bslow\b|takes? \d+ ?s(econds)?/, /inconsisten/, /\bmissing\b/, /does not (update|refresh|save)/] },
  { severity: 'LOW', words: [/typo|spelling/, /align(ment|ed)?|padding|margin/, /cosmetic|colou?r|font/, /tooltip|placeholder/] },
];

const AREAS: Array<[string, RegExp]> = [
  ['authentication', /log ?in|sign ?in|password|session|auth/],
  ['payments', /payment|checkout|invoice|charge|refund/],
  ['kanban', /board|kanban|drag|column|card/],
  ['api', /\bapi\b|endpoint|\b5\d\d\b|request|response/],
  ['ui', /button|layout|modal|dialog|page|screen|ui\b/],
  ['performance', /slow|latency|performance|time(s|d)? ?out/],
  ['security', /secur|injection|xss|unauthori[sz]ed/],
  ['data', /data|database|export|import|csv/],
  ['mobile', /mobile|android|ios|iphone/],
];

const PRIORITY_FOR = { CRITICAL: 'URGENT', HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' } as const;

function reproductionSteps(input: TriageRequest): string[] {
  const source = input.stepsToReproduce?.trim();
  if (source) {
    const lines = source.split(/\r?\n/).map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, '').trim()).filter(Boolean);
    if (lines.length) return lines.slice(0, 8);
  }
  const sentences = input.description.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 3);
  return sentences.slice(0, 3).map((s) => `Reproduce: ${s.replace(/[.!?]$/, '')}`);
}

export function mockTriage(input: TriageRequest): TriageResult {
  const text = `${input.title ?? ''}\n${input.description}\n${input.stepsToReproduce ?? ''}`.toLowerCase();

  let severity: TriageResult['severity'] = 'MEDIUM';
  let matched: string[] = [];
  for (const rule of SEVERITY_RULES) {
    const hits = rule.words.filter((re) => re.test(text)).map((re) => re.source);
    if (hits.length) { severity = rule.severity; matched = hits; break; }
  }
  const confidence = matched.length ? Math.min(0.95, 0.6 + 0.1 * matched.length) : 0.4;
  const labels = AREAS.filter(([, re]) => re.test(text)).map(([name]) => name).slice(0, 5);
  const repro = reproductionSteps(input);
  const subject = input.title?.trim() || input.description.split(/[.!?\n]/)[0].trim().slice(0, 120);

  const suggestedTestSteps = [
    'Sign in as a user with access to the affected feature',
    ...repro,
    `Verify the defect no longer occurs: ${subject}`,
    'Repeat with edge-case inputs (empty values, maximum length, special characters)',
  ];
  if (labels.includes('security')) suggestedTestSteps.push('Attempt the action as an unauthorised role and confirm it is rejected (401/403)');
  if (labels.includes('performance')) suggestedTestSteps.push('Measure response time under load and compare against the agreed threshold');

  const suggestedTestCases = [
    { title: `Verify fix: ${subject}`.slice(0, 200), steps: [suggestedTestSteps[0], ...repro], expected: 'The operation completes successfully with no error and the UI reflects the change' },
    { title: `Negative / edge cases: ${subject}`.slice(0, 200), steps: ['Repeat the flow with empty, very long and special-character inputs', 'Repeat as a user without permission'], expected: 'Invalid input is rejected with a clear validation message; unauthorised users receive 403' },
  ];
  if (labels.length) {
    suggestedTestCases.push({ title: `Regression: ${labels[0]} area`, steps: [`Run the existing ${labels[0]} regression suite`, 'Compare results with the last passing build'], expected: 'No new failures in the affected area' });
  }

  return {
    severity,
    suggestedPriority: PRIORITY_FOR[severity],
    confidence: Number(confidence.toFixed(2)),
    rationale: matched.length
      ? `Classified as ${severity} because the report matches ${matched.length} ${severity.toLowerCase()}-impact signal(s)${labels.length ? ` in the ${labels.join(', ')} area` : ''}.`
      : 'No strong impact signals found; defaulting to MEDIUM. A human should confirm the severity.',
    labels,
    suggestedTestSteps: suggestedTestSteps.slice(0, 15),
    suggestedTestCases,
  };
}
