import { NextResponse } from 'next/server';
import { AGENT_DEFINITIONS } from '@/lib/agent-registry';
import { validateEnv } from '@/lib/env-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface HealthReport {
  status: 'ok' | 'degraded' | 'down';
  uptimeSeconds: number;
  agentCount: number;
  registeredAgents: string[];
  version: string;
  timestamp: string;
  env: {
    rankForge: { configured: boolean; hasApiKey: boolean };
    production: boolean;
  };
}

const START_TIME = Date.now();

export async function GET() {
  // Cheap synchronous summary — does not hit the network so it stays fast
  // and avoids amplifying outages by blocking on every probe. The
  // /api/agents/status endpoint remains the source of truth for live
  // agent health; this endpoint is for liveness/readiness probes (k8s,
  // Docker, Hetzner load balancer) that need a single round-trip.
  let envReport: HealthReport['env'];
  try {
    const env = validateEnv();
    envReport = {
      rankForge: { configured: true, hasApiKey: env.rankForge.hasApiKey },
      production: env.isProduction,
    };
  } catch (err) {
    return NextResponse.json(
      {
        status: 'down',
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { 'cache-control': 'no-store' } }
    );
  }

  const report: HealthReport = {
    status: 'ok',
    uptimeSeconds: Math.round((Date.now() - START_TIME) / 1000),
    agentCount: AGENT_DEFINITIONS.length,
    registeredAgents: AGENT_DEFINITIONS.map((a) => a.id),
    version: process.env.npm_package_version ?? '0.0.0',
    timestamp: new Date().toISOString(),
    env: envReport,
  };

  return NextResponse.json(report, {
    status: 200,
    headers: { 'cache-control': 'no-store' },
  });
}
