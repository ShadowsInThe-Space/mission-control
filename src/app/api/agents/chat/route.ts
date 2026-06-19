import { NextRequest, NextResponse } from 'next/server';

import { buildAgentChatCommand, parseAgentChatRequest } from '@/lib/agent-chat';
import { buildMinimalEnv, spawnRunner } from '@/lib/agent-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const request = parseAgentChatRequest(await req.json());
    const command = buildAgentChatCommand(request.agentId, request.message);

    if (!command) {
      return NextResponse.json(
        { error: `Agent ${request.agentId} does not have a safe chat adapter yet` },
        { status: 503 },
      );
    }

    const result = await spawnRunner({
      bin: command.bin,
      args: command.args,
      timeoutMs: command.timeoutMs,
      options: {
        shell: false,
        env: {
          ...buildMinimalEnv(),
          CLAUDE_NO_INTERACTIVE: '1',
        },
      },
    });

    if (result.exitCode !== 0) {
      return NextResponse.json(
        { error: result.stderr.slice(0, 2000) || `Agent exited with code ${result.exitCode}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply: result.stdout.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
