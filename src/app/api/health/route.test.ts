import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/agent-registry', () => ({
  AGENT_DEFINITIONS: [
    { id: 'hermes' },
    { id: 'buzz' },
    { id: 'lepsy' },
  ],
}));

vi.mock('@/lib/env-validation', () => ({
  validateEnv: vi.fn(),
}));

import { GET } from './route';
import { validateEnv } from '@/lib/env-validation';

const mockedValidateEnv = vi.mocked(validateEnv);

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns ok with a live summary when env validation passes', async () => {
    mockedValidateEnv.mockReturnValue({
      rankForge: { url: 'http://localhost:13001', hasApiKey: false },
      firecrawl: { url: 'http://localhost:3002' },
      notebooklm: { url: 'http://127.0.0.1:8766' },
      contentStudios: {
        blog: { url: 'http://127.0.0.1:8770' },
        image: { url: 'http://127.0.0.1:8771' },
        video: { url: 'http://127.0.0.1:8772' },
        podcast: { url: 'http://127.0.0.1:8773' },
        vision: { url: 'http://127.0.0.1:8774' },
      },
      ollama: { url: 'http://127.0.0.1:11434' },
      mywiki: { path: '/home/z3r0b1nary/workspace/mywiki' },
      isProduction: false,
    } as never);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');

    const body = await response.json();
    expect(body).toMatchObject({
      status: 'ok',
      agentCount: 3,
      registeredAgents: ['hermes', 'buzz', 'lepsy'],
      env: {
        rankForge: { configured: true, hasApiKey: false },
        production: false,
      },
    });
    expect(body.uptimeSeconds).toBeTypeOf('number');
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns 503 with the error when env validation throws', async () => {
    mockedValidateEnv.mockImplementation(() => {
      throw new Error('RANKFORGE_URL is not a valid URL');
    });

    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.status).toBe('down');
    expect(body.error).toContain('RANKFORGE_URL');
  });
});
