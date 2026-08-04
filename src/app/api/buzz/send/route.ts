import { NextRequest, NextResponse } from 'next/server';
import { sendToChannel } from '@/lib/buzz-bridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SendRequest {
  agentId: string;
  content: string;
}

/**
 * POST /api/buzz/send
 *
 * Posts a message to the shared agent channel as a specific agent.
 * Body: { agentId: string, content: string }
 */
export async function POST(request: NextRequest) {
  let body: SendRequest;
  try {
    body = (await request.json()) as SendRequest;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body?.agentId || typeof body.agentId !== 'string') {
    return NextResponse.json({ ok: false, error: 'agentId is required' }, { status: 400 });
  }
  if (!body?.content || !body.content.trim()) {
    return NextResponse.json({ ok: false, error: 'content is required' }, { status: 400 });
  }

  const channelId = process.env.BUZZ_AGENT_CHANNEL_ID?.trim();
  if (!channelId) {
    return NextResponse.json(
      { ok: false, error: 'No channel bootstrapped. Call POST /api/buzz/bootstrap first.' },
      { status: 503 }
    );
  }

  const result = await sendToChannel(channelId, body.agentId, body.content);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.stderr || `CLI exited ${result.exitCode}` },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    agentId: body.agentId,
    channelId,
    data: result.data,
  });
}
