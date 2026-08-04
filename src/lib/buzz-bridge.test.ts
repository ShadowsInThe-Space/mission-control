import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock child_process.spawn so tests don't call the real buzz CLI.
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'child_process';
import {
  resolveAgentKey,
  hasBuzzKey,
  sendToChannel,
  readChannel,
  createChannel,
} from './buzz-bridge';

const mockedSpawn = vi.mocked(spawn);

/** Build a fake child process that emits stdout/stderr and exits. */
function fakeChild(opts: { stdout?: string; stderr?: string; exitCode?: number }) {
  const handlers: Record<string, ((...args: any[]) => void)[]> = {};
  const child = {
    stdout: { on: (ev: string, cb: (c: Buffer) => void) => {
      if (ev === 'data' && opts.stdout) setTimeout(() => cb(Buffer.from(opts.stdout!)), 1);
    }},
    stderr: { on: (ev: string, cb: (c: Buffer) => void) => {
      if (ev === 'data' && opts.stderr) setTimeout(() => cb(Buffer.from(opts.stderr!)), 1);
    }},
    on: (ev: string, cb: (...args: any[]) => void) => {
      (handlers[ev] ??= []).push(cb);
      if (ev === 'close') setTimeout(() => cb(opts.exitCode ?? 0), 5);
    },
    kill: () => {},
  };
  return child;
}

describe('resolveAgentKey', () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it('reads the key from BUZZ_<AGENT>_KEY env var', () => {
    vi.stubEnv('BUZZ_HERMES_KEY', 'abc123');
    expect(resolveAgentKey('hermes')).toBe('abc123');
  });

  it('uppercases and replaces hyphens for the env var name', () => {
    vi.stubEnv('BUZZ_OPENCLAW_KEY', 'def456');
    expect(resolveAgentKey('openclaw')).toBe('def456');
  });

  it('returns null when no key is configured', () => {
    vi.stubEnv('BUZZ_NONEXISTENT_KEY', '');
    expect(resolveAgentKey('nonexistent')).toBeNull();
  });
});

describe('hasBuzzKey', () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it('returns true when key exists', () => {
    vi.stubEnv('BUZZ_HERMES_KEY', 'abc123');
    expect(hasBuzzKey('hermes')).toBe(true);
  });

  it('returns false when key is missing', () => {
    expect(hasBuzzKey('nonexistent')).toBe(false);
  });
});

describe('sendToChannel', () => {
  beforeEach(() => {
    vi.stubEnv('BUZZ_HERMES_KEY', 'test-key-hermes');
    vi.stubEnv('BUZZ_RELAY_HTTP_URL', 'http://127.0.0.1:33110');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns an error result when no key is configured', async () => {
    vi.stubEnv('BUZZ_HERMES_KEY', '');
    const result = await sendToChannel('ch-123', 'hermes', 'hello');
    expect(result.ok).toBe(false);
    expect(result.stderr).toContain('No Buzz key');
    expect(mockedSpawn).not.toHaveBeenCalled();
  });

  it('returns an error when channelId is empty', async () => {
    const result = await sendToChannel('', 'hermes', 'hello');
    expect(result.ok).toBe(false);
    expect(result.stderr).toContain('No channel ID');
    expect(mockedSpawn).not.toHaveBeenCalled();
  });

  it('calls the buzz CLI with correct args on success', async () => {
    mockedSpawn.mockReturnValue(fakeChild({
      stdout: '{"id":"evt-1","ok":true}',
      exitCode: 0,
    }) as any);

    const result = await sendToChannel('channel-uuid', 'hermes', 'Hello agents!');
    expect(result.ok).toBe(true);
    expect(mockedSpawn).toHaveBeenCalledTimes(1);

    const [bin, args] = mockedSpawn.mock.calls[0];
    expect(bin).toBe('buzz');
    expect(args).toContain('messages');
    expect(args).toContain('send');
    expect(args).toContain('--channel');
    expect(args).toContain('channel-uuid');
    expect(args).toContain('Hello agents!');
    expect(args).toContain('--private-key');
    expect(args).toContain('test-key-hermes');
  });
});

describe('readChannel', () => {
  beforeEach(() => {
    vi.stubEnv('BUZZ_HERMES_KEY', 'test-key-hermes');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('parses CLI JSON output into BuzzMessage objects', async () => {
    mockedSpawn.mockReturnValue(fakeChild({
      stdout: JSON.stringify([
        { id: 'evt-1', content: 'Hello', pubkey: 'pk1', created_at: 1700000000 },
        { id: 'evt-2', content: 'World', pubkey: 'pk2', created_at: 1700000001, reply_to: 'evt-1' },
      ]),
      exitCode: 0,
    }) as any);

    const result = await readChannel('ch-1', 'hermes', 10);
    expect(result.ok).toBe(true);
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]).toMatchObject({ id: 'evt-1', content: 'Hello', author: 'pk1' });
    expect(result.messages[0].createdAt).toBe(1700000000000); // ms
    expect(result.messages[1].replyTo).toBe('evt-1');
  });

  it('returns ok=false on CLI error', async () => {
    mockedSpawn.mockReturnValue(fakeChild({
      stderr: '{"error":"auth_error"}',
      exitCode: 3,
    }) as any);

    const result = await readChannel('ch-1', 'hermes');
    expect(result.ok).toBe(false);
    expect(result.messages).toHaveLength(0);
  });
});

describe('createChannel', () => {
  beforeEach(() => {
    vi.stubEnv('BUZZ_HERMES_KEY', 'test-key-hermes');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('creates a channel and returns its UUID', async () => {
    mockedSpawn.mockReturnValue(fakeChild({
      stdout: JSON.stringify({ id: 'new-uuid-1234', name: 'test-channel', type: 'stream', visibility: 'open' }),
      exitCode: 0,
    }) as any);

    const result = await createChannel('test-channel', 'hermes');
    expect(result.ok).toBe(true);
    expect(result.channel?.id).toBe('new-uuid-1234');
    expect(result.channel?.name).toBe('test-channel');
  });
});
