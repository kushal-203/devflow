import { env } from '../../config/env.js';
import { TriageResult, type TriageRequest } from '../../schemas/ai.js';
import { claudeTriage } from './claudeProvider.js';
import { mockTriage } from './mockProvider.js';

export interface TriageResponse extends TriageResult {
  provider: 'mock' | 'claude' | 'mock-fallback';
  model: string | null;
  latencyMs: number;
  fallbackReason?: string;
}

/**
 * Runs AI triage with the configured provider. If the real LLM fails (network, timeout, invalid
 * JSON, schema mismatch) the request still succeeds using the deterministic mock, and the response
 * says so – triage is advisory and must never block filing a bug.
 */
export async function triage(input: TriageRequest): Promise<TriageResponse> {
  const started = Date.now();
  if (env.AI_PROVIDER === 'claude') {
    try {
      const result = await claudeTriage(input);
      return { ...result, provider: 'claude', model: env.AI_MODEL, latencyMs: Date.now() - started };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`[ai] Claude triage failed, using mock fallback: ${reason}`);
      return { ...TriageResult.parse(mockTriage(input)), provider: 'mock-fallback', model: null, latencyMs: Date.now() - started, fallbackReason: reason };
    }
  }
  return { ...TriageResult.parse(mockTriage(input)), provider: 'mock', model: null, latencyMs: Date.now() - started };
}
