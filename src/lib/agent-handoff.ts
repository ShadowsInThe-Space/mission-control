/**
 * Cross-Agent Handoff (M7 — Goldie Mission Stack pattern).
 *
 * The "killer feature" of the Goldie Agentic OS: agent A's output is
 * transformed and piped into agent B as input, so a single user request
 * becomes a multi-agent pipeline with no copy-paste between sessions.
 *
 * v0 supports 2-stage chains:
 *   - research-to-build:  research agent → spec-builder agent
 *   - audit-to-report:    audit extractor → report writer
 *   - brief-to-spec:      brief expander → spec refiner
 *   - custom:             pass-through, no transformation
 *
 * Vault logging: when `vaultSessionName` is set, a markdown log of every
 * handoff is written to mywiki via `obsidian-export.writeSessionLog()`.
 */

import { AgentId, getAgentDefinition } from './agent-registry';
import { buildAgentChatCommand } from './agent-chat';
import { spawnRunner, RuntimeResult } from './agent-runtime';
import { buildMinimalEnv } from './agent-runtime';
import { validateEnv } from './env-validation';
import { writeSessionLog } from './obsidian-export';

export type HandoffPattern =
  | 'research-to-build'
  | 'audit-to-report'
  | 'brief-to-spec'
  | 'custom';

export interface HandoffRequest {
  from: AgentId;
  to: AgentId;
  payload: string;
  pattern?: HandoffPattern;
  vaultSessionName?: string;
  timeoutMs?: number;
  /** Override the mywiki path. Defaults to `validateEnv().mywiki.path`. */
  vaultPath?: string;
  /** Inject a custom runner (used by tests). Defaults to `spawnRunner`. */
  runner?: typeof spawnRunner;
}

export interface HandoffStage {
  agent: AgentId;
  input: string;
  output: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface HandoffResult {
  ok: boolean;
  pattern: HandoffPattern;
  from: AgentId;
  to: AgentId;
  stages: HandoffStage[];
  vaultSessionPath?: string;
  totalDurationMs: number;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Run a 2-stage cross-agent handoff. Returns a structured result with
 * per-stage inputs, outputs, durations, and (optionally) the path to a
 * mywiki session log.
 */
export async function handoff(req: HandoffRequest): Promise<HandoffResult> {
  const pattern: HandoffPattern = req.pattern ?? 'custom';
  const start = Date.now();
  const stages: HandoffStage[] = [];
  const runner = req.runner ?? spawnRunner;
  const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Pre-flight: both agents must be chat-capable
  try {
    const fromDef = getAgentDefinition(req.from);
    if (!fromDef.chatCommand || !fromDef.capabilities.includes('chat')) {
      return fail(req.from, req.to, pattern, stages, start, `${req.from} is not chat-capable`);
    }
    const toDef = getAgentDefinition(req.to);
    if (!toDef.chatCommand || !toDef.capabilities.includes('chat')) {
      return fail(req.from, req.to, pattern, stages, start, `${req.to} is not chat-capable`);
    }
  } catch (err) {
    return fail(
      req.from,
      req.to,
      pattern,
      stages,
      start,
      err instanceof Error ? err.message : String(err)
    );
  }

  // Stage 1: from-agent runs on payload
  const stage1 = await runStage(req.from, req.payload, timeoutMs, runner);
  stages.push(stage1);
  if (stage1.exitCode !== 0) {
    return fail(
      req.from,
      req.to,
      pattern,
      stages,
      start,
      `Stage 1 (${req.from}) failed: exit ${stage1.exitCode}: ${stage1.stderr || '(no stderr)'}`
    );
  }

  // Apply pattern transformation
  const stage2Input = transformForPattern(pattern, stage1.output, req.payload);

  // Stage 2: to-agent runs on transformed input
  const stage2 = await runStage(req.to, stage2Input, timeoutMs, runner);
  stages.push(stage2);
  if (stage2.exitCode !== 0) {
    return fail(
      req.from,
      req.to,
      pattern,
      stages,
      start,
      `Stage 2 (${req.to}) failed: exit ${stage2.exitCode}: ${stage2.stderr || '(no stderr)'}`
    );
  }

  // Vault write (opt-in via vaultSessionName; non-fatal on failure)
  let vaultSessionPath: string | undefined;
  if (req.vaultSessionName) {
    try {
      const env = validateEnv();
      const basePath = req.vaultPath || env.mywiki.path;
      if (!basePath) {
        // No vault path → skip silently. Better than throwing.
      } else {
        const content = renderVaultSession(req, stages, Date.now() - start);
        const result = writeSessionLog(req.vaultSessionName, content, { vaultPath: basePath });
        if (result.success) {
          vaultSessionPath = result.path;
        }
      }
    } catch {
      // Vault failure is non-fatal; the handoff result still stands.
    }
  }

  return {
    ok: true,
    pattern,
    from: req.from,
    to: req.to,
    stages,
    vaultSessionPath,
    totalDurationMs: Date.now() - start,
  };
}

async function runStage(
  agent: AgentId,
  input: string,
  timeoutMs: number,
  runner: typeof spawnRunner
): Promise<HandoffStage> {
  const start = Date.now();
  const cmd = buildAgentChatCommand(agent, input);
  if (!cmd) {
    return {
      agent,
      input,
      output: '',
      stderr: `${agent} has no chat command template`,
      exitCode: 1,
      durationMs: Date.now() - start,
    };
  }
  const result: RuntimeResult = await runner({
    bin: cmd.bin,
    args: cmd.args,
    timeoutMs: cmd.timeoutMs ?? timeoutMs,
    options: {
      shell: false,
      env: buildMinimalEnv(),
    },
  });
  return {
    agent,
    input,
    output: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    durationMs: Date.now() - start,
  };
}

export function transformForPattern(
  pattern: HandoffPattern,
  prevOutput: string,
  originalPayload: string
): string {
  switch (pattern) {
    case 'research-to-build':
      return `Based on the following research, generate a buildable spec.

RESEARCH:
${prevOutput}

ORIGINAL BRIEF:
${originalPayload}

Output: a spec with sections Goals, Constraints, Acceptance Criteria, File Tree.`;
    case 'audit-to-report':
      return `Convert this audit data into a customer-facing report.

AUDIT DATA:
${prevOutput}

ORIGINAL REQUEST:
${originalPayload}

Output: a markdown report with Executive Summary, Findings table, Recommendations, Next Steps.`;
    case 'brief-to-spec':
      return `Expand this brief into a full spec suitable for direct execution.

BRIEF:
${prevOutput}

ORIGINAL REQUEST:
${originalPayload}

Output: a detailed spec.`;
    case 'custom':
    default:
      return prevOutput;
  }
}

function renderVaultSession(
  req: HandoffRequest,
  stages: HandoffStage[],
  totalDurationMs: number
): string {
  const now = new Date().toISOString();
  return `---
title: Cross-Agent Handoff — ${req.pattern}
created: ${now}
type: session
tags: [session-memory, agent-handoff, mission-control, m7]
sources: []
confidence: medium
---

# Cross-Agent Handoff: ${req.pattern}

## Request
- **From:** ${req.from}
- **To:** ${req.to}
- **Pattern:** ${req.pattern}
- **Total duration:** ${totalDurationMs}ms

### Original payload
\`\`\`
${truncate(req.payload, 2000)}
\`\`\`

${stages
  .map(
    (s, i) => `## Stage ${i + 1} — ${s.agent}

**Input (${s.input.length} chars):**
\`\`\`
${truncate(s.input, 2000)}
\`\`\`

**Output (${s.output.length} chars):**
\`\`\`
${s.output}
\`\`\`

${s.stderr ? `**Stderr:**\n\`\`\`\n${truncate(s.stderr, 1000)}\n\`\`\`\n` : ''}**Duration:** ${s.durationMs}ms
**Exit code:** ${s.exitCode}
`
  )
  .join('\n')}
`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '\n…[truncated]';
}

function fail(
  from: AgentId,
  to: AgentId,
  pattern: HandoffPattern,
  stages: HandoffStage[],
  start: number,
  message: string
): HandoffResult {
  return {
    ok: false,
    pattern,
    from,
    to,
    stages,
    totalDurationMs: Date.now() - start,
    error: message,
  };
}
