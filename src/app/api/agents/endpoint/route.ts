import { NextResponse } from 'next/server';
import { getAgentDefinition, getHttpEndpoint } from '@/lib/agent-registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface EndpointRequest {
  agentId: string;
  endpointId: string;
  params?: Record<string, string | number | boolean>;
}

interface UpstreamRequestShape {
  body?: string;
  headers?: Record<string, string>;
}

/**
 * POST /api/agents/endpoint
 *
 * Server-side proxy for HTTP-kind agents' declared `httpEndpoints`. The
 * AgentDetailPanel UI calls this so the browser never has to talk to
 * localhost services directly (and so we can resolve the right base URL
 * from the env var).
 *
 * Body: { agentId, endpointId, params? }
 * 200:   { ok: true, status, body, url }
 * 4xx/5xx: { ok: false, error }
 */
export async function POST(request: Request) {
  let body: EndpointRequest;
  try {
    body = (await request.json()) as EndpointRequest;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { agentId, endpointId, params } = body || {};
  if (!agentId || !endpointId) {
    return NextResponse.json(
      { ok: false, error: 'agentId and endpointId are required' },
      { status: 400 }
    );
  }

  let definition;
  try {
    definition = getAgentDefinition(agentId);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 404 }
    );
  }

  const endpoint = getHttpEndpoint(agentId, endpointId);
  if (!endpoint) {
    return NextResponse.json(
      {
        ok: false,
        error: `Endpoint '${endpointId}' not declared for agent '${agentId}'. Available: ${(definition.httpEndpoints || []).map((e) => e.id).join(', ') || '(none)'}`,
      },
      { status: 404 }
    );
  }

  // Resolve the base URL for the agent's service. We use the env var from
  // the agent's health template, fall back to its default URL.
  const baseUrl = resolveBaseUrl(agentId, definition);
  if (!baseUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: `Agent '${agentId}' has no resolvable base URL (no health env var, no default)`,
      },
      { status: 503 }
    );
  }

  // Build the full URL. GET requests get params in the query string,
  // POST requests get them in the JSON body.
  let url: string;
  let fetchInit: RequestInit;
  let upstreamShape: UpstreamRequestShape;
  try {
    upstreamShape = buildUpstreamRequestShape(agentId, endpoint.method, params);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
  if (endpoint.method === 'GET') {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params || {})) {
      if (v !== undefined && v !== null && String(v).length > 0) qs.set(k, String(v));
    }
    const queryString = qs.toString();
    url = `${baseUrl.replace(/\/$/, '')}${endpoint.path}${queryString ? `?${queryString}` : ''}`;
    fetchInit = { method: 'GET', signal: AbortSignal.timeout(endpoint.path === '/api/health' ? 5_000 : 15_000) };
  } else {
    url = `${baseUrl.replace(/\/$/, '')}${endpoint.path}`;
    fetchInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(upstreamShape.headers || {}) },
      body: upstreamShape.body ?? JSON.stringify(params || {}),
      signal: AbortSignal.timeout(15_000),
    };
  }

  try {
    const upstream = await fetch(url, fetchInit);
    const text = await upstream.text();
    return NextResponse.json({
      ok: upstream.ok,
      status: upstream.status,
      body: text,
      url,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Upstream fetch failed: ${e instanceof Error ? e.message : String(e)}`, url },
      { status: 502 }
    );
  }
}

/**
 * Best-effort base URL resolution:
 *   1. env var from health template, if set
 *   2. defaultUrl from health template
 *   3. empty string (caller will return 503)
 */
function resolveBaseUrl(agentId: string, definition: ReturnType<typeof getAgentDefinition>): string {
  if (definition.health?.envVar) {
    const envVal = process.env[definition.health.envVar];
    if (envVal && envVal.trim()) return envVal.trim();
  }
  return definition.health?.defaultUrl || '';
}

function buildUpstreamRequestShape(
  agentId: string,
  method: 'GET' | 'POST',
  params?: Record<string, string | number | boolean>
): UpstreamRequestShape {
  const headers: Record<string, string> = {};

  if (agentId === 'buzz') {
    const pubkey = process.env.BUZZ_DEV_PUBKEY?.trim();
    if (pubkey) headers['X-Pubkey'] = pubkey;
  }

  if (method !== 'POST') return { headers };

  const rawPayload = params?.payload;
  if (typeof rawPayload === 'string' && rawPayload.trim()) {
    try {
      return {
        headers,
        body: JSON.stringify(JSON.parse(rawPayload)),
      };
    } catch (error) {
      throw new Error(`payload must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { headers };
}
