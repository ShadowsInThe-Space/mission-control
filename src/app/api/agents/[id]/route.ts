import { NextResponse } from 'next/server';
import { getAgentDefinition, listActionSummaries } from '@/lib/agent-registry';
import { validateEnv } from '@/lib/env-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AgentDetailResponse {
  id: string;
  label: string;
  kind: 'cli' | 'http' | 'workspace' | 'feature';
  description: string;
  capabilities: string[];
  actions: Array<{ id: string; label: string; bin: string; args: string[]; timeoutMs: number }>;
  httpEndpoints?: Array<{
    id: string;
    method: 'GET' | 'POST';
    path: string;
    label: string;
    description: string;
    params?: Array<{ name: string; label: string; required?: boolean; placeholder?: string }>;
  }>;
  chatCommand?: {
    bin: string;
    args: string[];
    timeoutMs: number;
    useStdin?: boolean;
    mode?: 'append' | 'print' | 'stdin' | 'pipe';
  };
  health?: {
    envVar: string;
    resolvedUrl?: string;
    defaultUrl: string;
    path: string;
    timeoutMs: number;
  };
  env: {
    envVarSet: boolean;
    resolvedUrl?: string;
  };
}

/**
 * GET /api/agents/[id]
 *
 * Returns the full registered definition for a single agent plus the list of
 * declared actions (with their allowlisted command) and HTTP endpoints. The
 * resolved URL for the health probe is computed from the env var (if set)
 * or falls back to the default.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let definition;
  try {
    definition = getAgentDefinition(id);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err), id },
      { status: 404 }
    );
  }

  // Resolve the env var the agent's health probe depends on. We only support
  // the small set of vars validateEnv knows about — unknown env vars return
  // `envVarSet: false` so the UI can show "service not configured".
  const rawEnv = process.env as Record<string, string | undefined>;
  const envVarValue = definition.health?.envVar ? rawEnv[definition.health.envVar] : undefined;
  const envVarSet = Boolean(envVarValue && envVarValue.length > 0);

  const body: AgentDetailResponse = {
    id: definition.id,
    label: definition.label,
    kind: definition.kind,
    description: definition.description,
    capabilities: definition.capabilities,
    actions: listActionSummaries(definition.id),
    httpEndpoints: definition.httpEndpoints,
    chatCommand: definition.chatCommand,
    health: definition.health
      ? {
          envVar: definition.health.envVar,
          defaultUrl: definition.health.defaultUrl,
          resolvedUrl: envVarValue,
          path: definition.health.path,
          timeoutMs: definition.health.timeoutMs,
        }
      : undefined,
    env: {
      envVarSet,
      resolvedUrl: envVarValue,
    },
  };
  // Touch validateEnv to keep the import used — also gives us a cheap way to
  // surface misconfiguration via /api/health. The result is intentionally
  // discarded.
  void validateEnv();
  return NextResponse.json({ ok: true, agent: body });
}
