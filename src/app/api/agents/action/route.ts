import { NextResponse } from 'next/server';
import { getAgentDefinition } from '@/lib/agent-registry';
import { runAllowedAgentAction } from '@/lib/agent-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ActionRequest {
  agentId: string;
  action: string;
  params?: Record<string, unknown>;
}

/**
 * POST /api/agents/action
 *
 * Runs an allowlisted action for a registered agent and returns the raw result.
 * Uses `runAllowedAgentAction` (never a free shell) — only commands declared
 * in the agent registry can be invoked. Unknown agents / actions return 4xx
 * with an explicit error.
 *
 * Body: { agentId: string, action: string, params?: object }
 * 200:   { ok: true, agentId, action, stdout, stderr, exitCode, durationMs, command }
 * 400/404/501: { ok: false, error, agentId?, action? }
 */
export async function POST(request: Request) {
  let body: ActionRequest;
  try {
    body = (await request.json()) as ActionRequest;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { agentId, action, params: _params } = body || {};
  if (!agentId || typeof agentId !== 'string') {
    return NextResponse.json({ ok: false, error: 'agentId is required' }, { status: 400 });
  }
  if (!action || typeof action !== 'string') {
    return NextResponse.json({ ok: false, error: 'action is required' }, { status: 400 });
  }

  let definition;
  try {
    definition = getAgentDefinition(agentId);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err), agentId },
      { status: 404 }
    );
  }

  if (!definition.actions[action]) {
    return NextResponse.json(
      {
        ok: false,
        error: `Action '${action}' is not declared for agent '${agentId}'. Available: ${Object.keys(definition.actions).join(', ') || '(none)'}`,
        agentId,
        action,
      },
      { status: 501 }
    );
  }

  const start = Date.now();
  try {
    const result = await runAllowedAgentAction(agentId, action);
    const command = definition.actions[action];
    return NextResponse.json({
      ok: result.exitCode === 0,
      agentId,
      action,
      command: { bin: command.bin, args: command.args, timeoutMs: command.timeoutMs },
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      durationMs: Date.now() - start,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        agentId,
        action,
        durationMs: Date.now() - start,
      },
      { status: 500 }
    );
  }
}
