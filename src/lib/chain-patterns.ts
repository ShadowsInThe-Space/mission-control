/**
 * Named cross-agent handoff patterns (M7 v0).
 *
 * Each helper is a thin wrapper over `handoff()` with sensible defaults
 * for Sonny's most common cross-agent pipelines. They keep callers from
 * hand-rolling prompts and let the wiki/UI reference the pattern by name.
 */

import { handoff, HandoffRequest } from './agent-handoff';

export interface ChainPatternOptions {
  outSession: string;
  from?: HandoffRequest['from'];
  to?: HandoffRequest['to'];
  timeoutMs?: number;
  /** Inject a custom runner (used by tests). Defaults to `spawnRunner`. */
  runner?: HandoffRequest['runner'];
  /** Override the mywiki path. Pass `''` to disable vault write. */
  vaultPath?: HandoffRequest['vaultPath'];
}

export interface ResearchToBuildOptions extends ChainPatternOptions {
  topic: string;
  domain: string;
}

export async function researchToBuild(opts: ResearchToBuildOptions) {
  return handoff({
    from: opts.from ?? 'claude',
    to: opts.to ?? 'claude',
    pattern: 'research-to-build',
    payload: `Research the top 3 competitor approaches to: ${opts.topic} (in the context of ${opts.domain}). Include pricing, positioning, and key features. Output as concise bullet points.`,
    vaultSessionName: opts.outSession,
    timeoutMs: opts.timeoutMs,
    runner: opts.runner,
    vaultPath: opts.vaultPath,
  });
}

export interface AuditToReportOptions extends ChainPatternOptions {
  auditData: string;
}

export async function auditToReport(opts: AuditToReportOptions) {
  return handoff({
    from: opts.from ?? 'claude',
    to: opts.to ?? 'claude',
    pattern: 'audit-to-report',
    payload: opts.auditData,
    vaultSessionName: opts.outSession,
    timeoutMs: opts.timeoutMs,
    runner: opts.runner,
    vaultPath: opts.vaultPath,
  });
}

export interface BriefToSpecOptions extends ChainPatternOptions {
  brief: string;
}

export async function briefToSpec(opts: BriefToSpecOptions) {
  return handoff({
    from: opts.from ?? 'claude',
    to: opts.to ?? 'claude',
    pattern: 'brief-to-spec',
    payload: opts.brief,
    vaultSessionName: opts.outSession,
    timeoutMs: opts.timeoutMs,
    runner: opts.runner,
    vaultPath: opts.vaultPath,
  });
}
