import { Sparkles } from 'lucide-react';
import { SeverityBadge } from './Badges';
import type { Triage } from '@/lib/types';

export function AiTriagePanel({ triage, onApply }: { triage: Triage; onApply?: () => void }) {
  return (
    <section aria-label="AI triage suggestion" data-testid="ai-triage" className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Sparkles className="size-4 text-violet-600" aria-hidden />
        <h3 className="text-sm font-semibold text-violet-900">AI triage</h3>
        <SeverityBadge severity={triage.severity} />
        <span className="text-xs text-slate-600">Priority <strong data-testid="ai-priority">{triage.suggestedPriority}</strong></span>
        <span className="text-xs text-slate-600">Confidence <strong data-testid="ai-confidence">{Math.round(triage.confidence * 100)}%</strong></span>
        <span className="ml-auto rounded bg-white px-1.5 py-0.5 text-[11px] text-slate-500" title={triage.fallbackReason}>
          {triage.provider}{triage.model ? ` · ${triage.model}` : ''}
        </span>
      </div>
      <p className="mb-3 text-sm text-slate-700" data-testid="ai-rationale">{triage.rationale}</p>
      {triage.labels.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-1" aria-label="Suggested labels">
          {triage.labels.map((l) => <li key={l} className="rounded-full bg-white px-2 py-0.5 text-xs text-violet-800 ring-1 ring-violet-200">{l}</li>)}
        </ul>
      )}
      <h4 className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Suggested test steps</h4>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700" data-testid="ai-test-steps">
        {triage.suggestedTestSteps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      {onApply && (
        <button type="button" onClick={onApply} className="btn btn-secondary mt-3">Apply severity &amp; priority</button>
      )}
    </section>
  );
}
