import { AGENT_DEFINITIONS, type AgentId } from './agent-registry';
import { type AgentRunner, runAllowedAgentAction } from './agent-runtime';

export type AgentHealth = 'online' | 'offline' | 'error' | 'unknown';

export interface AgentStatus {
  type: AgentId;
  name: string;
  version: string;
  status: AgentHealth;
  lastSeen: number;
  info: Record<string, string>;
}

export interface AgentStatusSnapshotOptions {
  runner?: AgentRunner;
  fetcher?: AgentHealthFetcher;
  env?: Record<string, string | undefined>;
}

export type AgentHealthFetcher = (
  url: string,
  init: { signal: AbortSignal }
) => Promise<{ ok: boolean; status: number }>;

export async function getAgentStatusSnapshot(
  options: AgentStatusSnapshotOptions = {}
): Promise<Record<AgentId, AgentStatus>> {
  const entries = await Promise.all(
    AGENT_DEFINITIONS.map(async (definition) => {
      if (definition.health && options.fetcher) {
        return [
          definition.id,
          await getHealthStatus(definition, options.fetcher, options.env ?? process.env),
        ] as const;
      }

      if (!definition.actions.version) {
        return [
          definition.id,
          {
            type: definition.id,
            name: definition.label,
            version: 'n/a',
            status: 'unknown' as const,
            lastSeen: Date.now(),
            info: { kind: definition.kind },
          },
        ] as const;
      }

      try {
        const result = await runAllowedAgentAction(definition.id, 'version', {
          runner: options.runner,
        });
        if (result.exitCode !== 0) {
          return [
            definition.id,
            {
              type: definition.id,
              name: definition.label,
              version: 'unknown',
              status: 'offline' as const,
              lastSeen: Date.now(),
              info: { error: result.stderr || `exit ${result.exitCode}` },
            },
          ] as const;
        }

        return [
          definition.id,
          {
            type: definition.id,
            name: definition.label,
            version: result.stdout.trim(),
            status: 'online' as const,
            lastSeen: Date.now(),
            info: { kind: definition.kind },
          },
        ] as const;
      } catch (error) {
        return [
          definition.id,
          {
            type: definition.id,
            name: definition.label,
            version: 'unknown',
            status: 'offline' as const,
            lastSeen: Date.now(),
            info: { error: error instanceof Error ? error.message : String(error) },
          },
        ] as const;
      }
    })
  );

  return Object.fromEntries(entries) as Record<AgentId, AgentStatus>;
}

async function getHealthStatus(
  definition: (typeof AGENT_DEFINITIONS)[number],
  fetcher: AgentHealthFetcher,
  env: Record<string, string | undefined>,
): Promise<AgentStatus> {
  const health = definition.health!;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), health.timeoutMs);
  const baseUrl = env[health.envVar] || health.defaultUrl;
  const url = new URL(health.path, `${baseUrl.replace(/\/+$/, '')}/`).toString();

  try {
    const result = await fetcher(url, { signal: controller.signal });
    return {
      type: definition.id,
      name: definition.label,
      version: 'n/a',
      status: result.ok ? 'online' : 'offline',
      lastSeen: Date.now(),
      info: {
        kind: definition.kind,
        url,
        status: String(result.status),
      },
    };
  } catch (error) {
    return {
      type: definition.id,
      name: definition.label,
      version: 'n/a',
      status: 'offline',
      lastSeen: Date.now(),
      info: {
        kind: definition.kind,
        url,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
