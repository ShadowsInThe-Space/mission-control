import { NextResponse } from 'next/server';
import { createChannel, listChannels } from '@/lib/buzz-bridge';
import * as fs from 'fs';
import * as path from 'path';
import { getVaultPath } from '@/lib/obsidian-export';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHANNEL_NAME = 'mission-control-agents';

/**
 * POST /api/buzz/bootstrap
 *
 * Creates the shared "mission-control-agents" channel on first run and
 * persists the channel UUID to .env.local as BUZZ_AGENT_CHANNEL_ID.
 * If the channel already exists (by name), reuses it.
 *
 * Uses the 'hermes' agent identity as the channel owner.
 */
export async function POST() {
  // Check if already bootstrapped
  const existingId = process.env.BUZZ_AGENT_CHANNEL_ID?.trim();
  if (existingId) {
    return NextResponse.json({
      ok: true,
      message: 'Channel already bootstrapped',
      channelId: existingId,
      channelName: CHANNEL_NAME,
    });
  }

  // First, try to find an existing channel by listing
  try {
    const listResult = await listChannels('hermes');
    if (listResult.ok) {
      const existing = listResult.channels.find(
        (c) => c.name === CHANNEL_NAME || c.name?.toLowerCase() === CHANNEL_NAME
      );
      if (existing?.id) {
        await persistChannelId(existing.id);
        return NextResponse.json({
          ok: true,
          message: 'Found existing channel',
          channelId: existing.id,
          channelName: existing.name,
        });
      }
    }
  } catch {
    // Listing failed — proceed to create
  }

  // Create the channel
  const result = await createChannel(CHANNEL_NAME, 'hermes');
  if (!result.ok || !result.channel?.id) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error || 'Failed to create channel. Is the buzz CLI installed and is BUZZ_HERMES_KEY set?',
      },
      { status: 502 }
    );
  }

  await persistChannelId(result.channel.id);

  return NextResponse.json({
    ok: true,
    message: 'Channel created',
    channelId: result.channel.id,
    channelName: result.channel.name,
  });
}

/** Append BUZZ_AGENT_CHANNEL_ID to .env.local so it persists across restarts. */
async function persistChannelId(channelId: string): Promise<void> {
  // Try .env.local in the project root
  const envPaths = [
    path.join(process.cwd(), '.env.local'),
  ];

  // Also try the vault-adjacent path as fallback
  const vault = getVaultPath();
  if (vault) {
    envPaths.push(path.join(path.dirname(vault), 'hermes', 'mission-control', '.env.local'));
  }

  for (const envPath of envPaths) {
    try {
      let content = '';
      if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf-8');
        // Replace existing line if present
        content = content.replace(/^BUZZ_AGENT_CHANNEL_ID=.*$/m, '');
      }
      content += `\nBUZZ_AGENT_CHANNEL_ID=${channelId}\n`;
      fs.writeFileSync(envPath, content, 'utf-8');
      // Also set in process.env for the current runtime
      process.env.BUZZ_AGENT_CHANNEL_ID = channelId;
      return;
    } catch {
      // Try next path
    }
  }

  // If we can't write the file, at least set it in-process
  process.env.BUZZ_AGENT_CHANNEL_ID = channelId;
}
