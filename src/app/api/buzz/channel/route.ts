import { NextRequest, NextResponse } from 'next/server';
import { readChannel, resolveAgentKey } from '@/lib/buzz-bridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/buzz/channel?agentId=<agent>&limit=<n>
 *
 * Reads recent messages from the shared agent channel.
 * Defaults to the 'hermes' agent identity and 20 messages.
 */
export async function GET(request: NextRequest) {
  const channelId = process.env.BUZZ_AGENT_CHANNEL_ID?.trim();
  if (!channelId) {
    return NextResponse.json(
      { ok: false, error: 'No channel bootstrapped. Call POST /api/buzz/bootstrap first.' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId') || 'hermes';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

  // Check key availability
  if (!resolveAgentKey(agentId)) {
    return NextResponse.json(
      { ok: false, error: `No Buzz key for agent "${agentId}". Set BUZZ_${agentId.toUpperCase().replace(/-/g, '_')}_KEY.` },
      { status: 503 }
    );
  }

  const result = await readChannel(channelId, agentId, limit);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, channelId },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    channelId,
    messages: result.messages,
  });
}
