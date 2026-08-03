import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/agent-registry', () => ({
  getAgentDefinition: vi.fn(),
  getHttpEndpoint: vi.fn(),
}));

import { POST } from './route';
import { getAgentDefinition, getHttpEndpoint } from '@/lib/agent-registry';

const mockedGetAgentDefinition = vi.mocked(getAgentDefinition);
const mockedGetHttpEndpoint = vi.mocked(getHttpEndpoint);

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/agents/endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/agents/endpoint', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('BUZZ_DEV_PUBKEY', 'dev-pubkey-123');
    mockedGetAgentDefinition.mockReturnValue({
      id: 'buzz',
      label: 'Buzz Relay',
      kind: 'feature',
      description: 'test',
      capabilities: ['events'],
      actions: {},
      health: {
        envVar: 'BUZZ_RELAY_HTTP_URL',
        defaultUrl: 'http://127.0.0.1:33110',
        path: '/health',
        timeoutMs: 5000,
      },
      httpEndpoints: [],
    } as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('passes raw Buzz filter-array payloads upstream and adds the dev X-Pubkey header', async () => {
    mockedGetHttpEndpoint.mockReturnValue({
      id: 'query-events',
      method: 'POST',
      path: '/query',
      label: 'Query events',
      description: 'test',
      params: [{ name: 'payload', label: 'Raw JSON payload', required: true }],
    } as never);

    const fetchMock = vi.fn().mockResolvedValue(new Response('{"events":[]}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      jsonRequest({
        agentId: 'buzz',
        endpointId: 'query-events',
        params: { payload: '[{"kinds":[39002],"limit":3}]' },
      })
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:33110/query',
      expect.objectContaining({
        method: 'POST',
        body: '[{"kinds":[39002],"limit":3}]',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Pubkey': 'dev-pubkey-123',
        }),
      })
    );

    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      status: 200,
      body: '{"events":[]}',
      url: 'http://127.0.0.1:33110/query',
    });
  });

  it('returns 400 when the raw payload is not valid JSON', async () => {
    mockedGetHttpEndpoint.mockReturnValue({
      id: 'count-events',
      method: 'POST',
      path: '/count',
      label: 'Count events',
      description: 'test',
      params: [{ name: 'payload', label: 'Raw JSON payload', required: true }],
    } as never);

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      jsonRequest({
        agentId: 'buzz',
        endpointId: 'count-events',
        params: { payload: '[{"kinds":[39002]' },
      })
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: expect.stringMatching(/payload must be valid JSON/),
    });
  });
});
