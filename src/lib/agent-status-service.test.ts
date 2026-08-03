import { describe, expect, it, vi } from 'vitest';
import { getAgentStatusSnapshot } from './agent-status-service';

describe('agent status service', () => {
  it('returns a status entry for every registered agent', async () => {
    const runner = vi.fn().mockResolvedValue({ stdout: 'ok\n', stderr: '', exitCode: 0 });

    const snapshot = await getAgentStatusSnapshot({ runner });

    expect(Object.keys(snapshot)).toEqual([
      'hermes',
      'lepsy',
      'openclaw',
      'buzz',
      'claude',
      'gemini',
      'mmx',
      'codex',
      'ollama',
      'antigravity',
      'rankforge',
      'firecrawl',
      'mywiki',
      'notebooklm',
      'blog-studio',
      'image-studio',
      'video-studio',
      'podcast-studio',
      'vision-studio',
    ]);
    expect(snapshot.claude.status).toBe('online');
    expect(snapshot.claude.version).toBe('ok');
    expect(snapshot.lepsy.status).toBe('unknown');
    expect(snapshot.buzz.status).toBe('unknown');
    expect(snapshot.rankforge.status).toBe('unknown');
  });

  it('converts version command failures into offline status instead of throwing', async () => {
    const runner = vi.fn().mockRejectedValue(new Error('not found'));

    const snapshot = await getAgentStatusSnapshot({ runner });

    expect(snapshot.claude.status).toBe('offline');
    expect(snapshot.claude.info.error).toBe('not found');
  });

  it('checks feature service health endpoints when a fetcher is provided', async () => {
    const requestedUrls: string[] = [];
    const snapshot = await getAgentStatusSnapshot({
      runner: vi.fn().mockResolvedValue({ stdout: 'ok\n', stderr: '', exitCode: 0 }),
      fetcher: async (url) => {
        requestedUrls.push(url);
        const ok = url.includes('18642') || url.includes('33110') || url.includes('13001');
        return { ok, status: ok ? 200 : 503 };
      },
      env: {},
    });

    // Only lepsy + buzz + rankforge respond online; every other feature service is offline.
    expect(snapshot.lepsy.status).toBe('online');
    expect(snapshot.buzz.status).toBe('online');
    expect(snapshot.rankforge.status).toBe('online');
    expect(snapshot.firecrawl.status).toBe('offline');
    expect(snapshot.notebooklm.status).toBe('offline');
    expect(snapshot['blog-studio'].status).toBe('offline');
    expect(snapshot['image-studio'].status).toBe('offline');
    expect(snapshot['video-studio'].status).toBe('offline');
    expect(snapshot['podcast-studio'].status).toBe('offline');
    expect(snapshot['vision-studio'].status).toBe('offline');
    expect(requestedUrls).toContain('http://127.0.0.1:18642/health');
    expect(requestedUrls).toContain('http://127.0.0.1:33110/health');
    expect(requestedUrls).toContain('http://localhost:13001/api/health');
    expect(requestedUrls).toContain('http://127.0.0.1:8770/api/health');
    expect(requestedUrls).toContain('http://127.0.0.1:8774/api/health');
  });

  it('marks a CLI agent offline when its version command exits non-zero', async () => {
    const runner = vi.fn().mockResolvedValue({
      stdout: '',
      stderr: 'command not found',
      exitCode: 127,
    });

    const snapshot = await getAgentStatusSnapshot({ runner });

    expect(snapshot.gemini.status).toBe('offline');
    expect(snapshot.gemini.info.error).toBe('command not found');
  });

  it('marks a feature agent offline when its health fetcher throws', async () => {
    const snapshot = await getAgentStatusSnapshot({
      runner: vi.fn().mockResolvedValue({ stdout: 'ok\n', stderr: '', exitCode: 0 }),
      fetcher: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      env: {},
    });

    expect(snapshot.rankforge.status).toBe('offline');
    expect(snapshot.rankforge.info.error).toBe('ECONNREFUSED');
    expect(snapshot.buzz.status).toBe('offline');
    expect(snapshot.buzz.info.error).toBe('ECONNREFUSED');
    expect(snapshot.firecrawl.status).toBe('offline');
    expect(snapshot.firecrawl.info.error).toBe('ECONNREFUSED');
  });
});
