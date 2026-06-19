/**
 * POST /api/handoff
 *
 * Body shapes (one per pattern):
 *
 *   research-to-build:
 *     { pattern: 'research-to-build', topic: string, domain: string, outSession?: string, timeoutMs?: number }
 *
 *   audit-to-report:
 *     { pattern: 'audit-to-report', auditData: string, outSession?: string }
 *
 *   brief-to-spec:
 *     { pattern: 'brief-to-spec', brief: string, outSession?: string }
 *
 *   custom:
 *     { pattern: 'custom', from: AgentId, to: AgentId, payload: string, outSession?: string, timeoutMs?: number }
 *
 * Returns the HandoffResult JSON from `src/lib/agent-handoff.ts`.
 */

import { NextRequest, NextResponse } from 'next/server';

import { handoff, HandoffPattern } from '@/lib/agent-handoff';
import { auditToReport, briefToSpec, researchToBuild } from '@/lib/chain-patterns';

const VALID_PATTERNS: HandoffPattern[] = [
  'research-to-build',
  'audit-to-report',
  'brief-to-spec',
  'custom',
];

const CHAT_AGENTS = [
  'claude',
  'gemini',
  'mmx',
  'codex',
  'ollama',
  'antigravity',
  'hermes',
] as const;

type ChatAgentId = (typeof CHAT_AGENTS)[number];

function isChatAgent(x: unknown): x is ChatAgentId {
  return typeof x === 'string' && (CHAT_AGENTS as readonly string[]).includes(x);
}

function isPattern(x: unknown): x is HandoffPattern {
  return typeof x === 'string' && (VALID_PATTERNS as readonly string[]).includes(x);
}

function asString(x: unknown): string | undefined {
  return typeof x === 'string' ? x : undefined;
}

function asNumber(x: unknown): number | undefined {
  return typeof x === 'number' ? x : undefined;
}

export async function POST(req: NextRequest) {
  const parsed: unknown = await req.json().catch(() => null);
  if (!parsed || typeof parsed !== 'object') {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const body = parsed as Record<string, unknown>;

  // Validate pattern
  if (!isPattern(body.pattern)) {
    return NextResponse.json(
      { error: `invalid pattern: must be one of ${VALID_PATTERNS.join(', ')}` },
      { status: 400 }
    );
  }

  if (body.pattern === 'research-to-build') {
    const topic = asString(body.topic);
    const domain = asString(body.domain);
    if (!topic || !topic.trim()) {
      return NextResponse.json(
        { error: 'topic is required for research-to-build' },
        { status: 400 }
      );
    }
    if (!domain || !domain.trim()) {
      return NextResponse.json(
        { error: 'domain is required for research-to-build' },
        { status: 400 }
      );
    }
    const result = await researchToBuild({
      topic,
      domain,
      outSession: asString(body.outSession) ?? `rtb-${Date.now()}`,
      timeoutMs: asNumber(body.timeoutMs),
    });
    return NextResponse.json(result);
  }

  if (body.pattern === 'audit-to-report') {
    const auditData = asString(body.auditData);
    if (!auditData || !auditData.trim()) {
      return NextResponse.json(
        { error: 'auditData is required for audit-to-report' },
        { status: 400 }
      );
    }
    const result = await auditToReport({
      auditData,
      outSession: asString(body.outSession) ?? `a2r-${Date.now()}`,
    });
    return NextResponse.json(result);
  }

  if (body.pattern === 'brief-to-spec') {
    const brief = asString(body.brief);
    if (!brief || !brief.trim()) {
      return NextResponse.json(
        { error: 'brief is required for brief-to-spec' },
        { status: 400 }
      );
    }
    const result = await briefToSpec({
      brief,
      outSession: asString(body.outSession) ?? `b2s-${Date.now()}`,
    });
    return NextResponse.json(result);
  }

  // custom
  const from = body.from;
  const to = body.to;
  const payload = asString(body.payload);
  if (!isChatAgent(from)) {
    return NextResponse.json(
      { error: 'invalid or non-chat-capable from agent' },
      { status: 400 }
    );
  }
  if (!isChatAgent(to)) {
    return NextResponse.json(
      { error: 'invalid or non-chat-capable to agent' },
      { status: 400 }
    );
  }
  if (!payload || !payload.trim()) {
    return NextResponse.json({ error: 'payload is required' }, { status: 400 });
  }

  const result = await handoff({
    from,
    to,
    pattern: 'custom',
    payload,
    vaultSessionName: asString(body.outSession),
    timeoutMs: asNumber(body.timeoutMs),
  });
  return NextResponse.json(result);
}
