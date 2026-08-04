/**
 * buzz-bridge.ts — Bridge between Mission Control agents and the Buzz relay.
 *
 * Provides functions to send/read messages in a shared Buzz channel, create
 * channels, and resolve per-agent Nostr private keys. All relay interaction
 * goes through the `buzz` CLI (which signs NIP-42 events correctly).
 *
 * Private keys are NEVER returned in any response — they are read from env
 * vars (BUZZ_<AGENT>_KEY) and passed directly to the CLI as args.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { buildMinimalEnv } from './agent-runtime';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BuzzMessage {
  id: string;
  content: string;
  author: string; // pubkey hex
  createdAt: number; // unix ms
  replyTo?: string;
}

export interface BuzzChannel {
  id: string; // UUID
  name: string;
  type: string;
  visibility: string;
}

interface BuzzResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  data?: unknown;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const BUZZ_BIN = 'buzz';
const DEFAULT_RELAY = 'http://127.0.0.1:33110';
const DEFAULT_TIMEOUT = 15_000;

function getRelayUrl(): string {
  return process.env.BUZZ_RELAY_HTTP_URL?.trim() || DEFAULT_RELAY;
}

/**
 * Resolve the Nostr private key for a given agent from env vars.
 * Convention: BUZZ_<AGENT_ID_UPPERCASE>_KEY (e.g. BUZZ_HERMES_KEY).
 * Returns null if the key is not configured — callers should handle gracefully.
 */
export function resolveAgentKey(agentId: string): string | null {
  const envVar = `BUZZ_${agentId.toUpperCase().replace(/-/g, '_')}_KEY`;
  const key = process.env[envVar]?.trim();
  return key || null;
}

/** Returns true if the agent has a Buzz key configured. */
export function hasBuzzKey(agentId: string): boolean {
  return resolveAgentKey(agentId) !== null;
}

// ─── Internal: CLI runner ────────────────────────────────────────────────────

function runBuzz(
  args: string[],
  privateKey: string,
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<BuzzResult> {
  return new Promise((resolve) => {
    // Build args: --relay <url> --private-key <key> --format json <subcommand...>
    const fullArgs = [
      '--relay', getRelayUrl(),
      '--private-key', privateKey,
      '--format', 'json',
      ...args,
    ];

    const proc: ChildProcessWithoutNullStreams = spawn(BUZZ_BIN, fullArgs, {
      shell: false,
      env: {
        ...buildMinimalEnv(),
        NODE_ENV: process.env.NODE_ENV || 'production',
        BUZZ_RELAY_URL: getRelayUrl(),
        BUZZ_PRIVATE_KEY: privateKey,
      } as NodeJS.ProcessEnv,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill();
      resolve({ ok: false, stdout, stderr: stderr + 'TIMEOUT', exitCode: 124 });
    }, timeoutMs);

    proc.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.on('error', (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, stdout, stderr: error.message, exitCode: 1 });
    });

    proc.on('close', (code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const exitCode = code ?? 1;
      let data: unknown = undefined;
      if (exitCode === 0 && stdout.trim()) {
        try { data = JSON.parse(stdout); } catch { /* not JSON, leave undefined */ }
      }
      resolve({ ok: exitCode === 0, stdout, stderr, exitCode, data });
    });
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Send a message to a Buzz channel as a specific agent.
 * @param channelId - UUID of the target channel
 * @param agentId   - Agent whose identity signs the message
 * @param content   - Message content (markdown supported)
 * @returns The result from the CLI (ok=true on success)
 */
export async function sendToChannel(
  channelId: string,
  agentId: string,
  content: string
): Promise<BuzzResult> {
  const key = resolveAgentKey(agentId);
  if (!key) {
    return {
      ok: false,
      stdout: '',
      stderr: `No Buzz key configured for agent "${agentId}". Set BUZZ_${agentId.toUpperCase().replace(/-/g, '_')}_KEY.`,
      exitCode: 1,
    };
  }
  if (!channelId) {
    return { ok: false, stdout: '', stderr: 'No channel ID. Run bootstrap first.', exitCode: 1 };
  }

  return runBuzz(
    ['messages', 'send', '--channel', channelId, '--content', content],
    key,
    10_000
  );
}

/**
 * Read recent messages from a Buzz channel.
 * @param channelId - UUID of the channel
 * @param agentId   - Agent whose identity authenticates the read
 * @param limit     - Max messages to return (default 20)
 * @returns Parsed array of BuzzMessage objects
 */
export async function readChannel(
  channelId: string,
  agentId: string,
  limit: number = 20
): Promise<{ ok: boolean; messages: BuzzMessage[]; error?: string }> {
  const key = resolveAgentKey(agentId);
  if (!key) {
    return { ok: false, messages: [], error: `No Buzz key for "${agentId}".` };
  }

  const result = await runBuzz(
    ['messages', 'get', '--channel', channelId, '--limit', String(limit)],
    key,
    10_000
  );

  if (!result.ok) {
    return { ok: false, messages: [], error: result.stderr || `CLI exited ${result.exitCode}` };
  }

  // Parse the JSON array returned by `buzz messages get`
  const raw = Array.isArray(result.data) ? result.data : [];
  const messages: BuzzMessage[] = raw.map((entry: any) => ({
    id: entry.id ?? '',
    content: entry.content ?? '',
    author: entry.pubkey ?? entry.author ?? '',
    createdAt: entry.created_at ? entry.created_at * 1000 : (entry.createdAt ?? 0),
    replyTo: entry.reply_to ?? undefined,
  }));

  return { ok: true, messages };
}

/**
 * Create a new Buzz channel.
 * @param name      - Channel display name
 * @param agentId   - Agent whose identity creates the channel (becomes owner)
 * @returns The created channel info including its UUID
 */
export async function createChannel(
  name: string,
  agentId: string = 'hermes'
): Promise<{ ok: boolean; channel?: BuzzChannel; error?: string }> {
  const key = resolveAgentKey(agentId);
  if (!key) {
    return { ok: false, error: `No Buzz key for "${agentId}".` };
  }

  const result = await runBuzz(
    ['channels', 'create', '--name', name, '--type', 'stream', '--visibility', 'open'],
    key,
    15_000
  );

  if (!result.ok) {
    return { ok: false, error: result.stderr || `CLI exited ${result.exitCode}` };
  }

  // The CLI returns the created channel object
  const ch = result.data as any;
  const channel: BuzzChannel = {
    id: ch?.id ?? ch?.h ?? '',
    name: ch?.name ?? name,
    type: ch?.type ?? 'stream',
    visibility: ch?.visibility ?? 'open',
  };

  return { ok: true, channel };
}

/**
 * List channels the agent has access to.
 */
export async function listChannels(
  agentId: string
): Promise<{ ok: boolean; channels: BuzzChannel[]; error?: string }> {
  const key = resolveAgentKey(agentId);
  if (!key) {
    return { ok: false, channels: [], error: `No Buzz key for "${agentId}".` };
  }

  const result = await runBuzz(
    ['channels', 'list', '--limit', '50'],
    key,
    10_000
  );

  if (!result.ok) {
    return { ok: false, channels: [], error: result.stderr || `CLI exited ${result.exitCode}` };
  }

  const raw = Array.isArray(result.data) ? result.data : [];
  const channels: BuzzChannel[] = raw.map((ch: any) => ({
    id: ch.id ?? ch.h ?? '',
    name: ch.name ?? '',
    type: ch.type ?? '',
    visibility: ch.visibility ?? '',
  }));

  return { ok: true, channels };
}
