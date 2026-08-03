export type MonitoringStatus = 'online' | 'offline';
export type MonitoringOverall = 'healthy' | 'degraded' | 'down';
export type MonitoringCategory = 'local' | 'mothership' | 'application';

export interface MonitoringService {
  id: string;
  label: string;
  category: MonitoringCategory;
  url: string;
  status: MonitoringStatus;
  statusCode?: number;
  latencyMs: number;
  essential: boolean;
}

export interface MonitoringSnapshot {
  generatedAt: number;
  overall: MonitoringOverall;
  services: MonitoringService[];
}

export type MonitoringFetcher = (url: string, init: { signal: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
}>;

interface MonitoringTarget {
  id: string;
  label: string;
  category: MonitoringCategory;
  url: string;
  essential: boolean;
}

function createMonitoringTargets(origin: string): MonitoringTarget[] {
  return [
    { id: 'mission-control', label: 'Mission Control', category: 'local', url: `${origin.replace(/\/$/, '')}/api/health`, essential: true },
  { id: 'hermes-gateway', label: 'Hermes Gateway', category: 'local', url: 'http://127.0.0.1:8642/health', essential: true },
  { id: 'hermes-dashboard', label: 'Hermes Dashboard', category: 'local', url: 'http://127.0.0.1:9119/api/status', essential: true },
  { id: 'hermes-workspace', label: 'Hermes Workspace', category: 'local', url: 'http://127.0.0.1:3000/', essential: false },
  { id: 'firecrawl', label: 'Firecrawl', category: 'application', url: 'http://127.0.0.1:3002/v0/health', essential: false },
  { id: 'rankforge', label: 'RankForge', category: 'application', url: 'http://127.0.0.1:13001/api/health', essential: false },
  { id: 'mothership-netdata', label: 'Mothership Metrics', category: 'mothership', url: 'http://127.0.0.1:19999/api/v1/info', essential: true },
  { id: 'mothership-dozzle', label: 'Mothership Logs', category: 'mothership', url: 'http://127.0.0.1:8080/', essential: false },
  ];
}

export async function getMonitoringSnapshot(options: { fetcher?: MonitoringFetcher; origin?: string } = {}): Promise<MonitoringSnapshot> {
  const fetcher = options.fetcher ?? ((url, init) => fetch(url, init));
  const targets = createMonitoringTargets(options.origin ?? 'http://127.0.0.1:3001');
  const services = await Promise.all(targets.map((target) => probeTarget(target, fetcher)));
  const essential = services.filter((service) => service.essential);
  const onlineEssential = essential.filter((service) => service.status === 'online').length;
  const offlineCount = services.filter((service) => service.status === 'offline').length;

  return {
    generatedAt: Date.now(),
    overall: onlineEssential === 0 ? 'down' : offlineCount > 0 ? 'degraded' : 'healthy',
    services,
  };
}

async function probeTarget(target: MonitoringTarget, fetcher: MonitoringFetcher): Promise<MonitoringService> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000);
  const startedAt = Date.now();

  try {
    const result = await fetcher(target.url, { signal: controller.signal });
    return {
      ...target,
      status: result.ok ? 'online' : 'offline',
      statusCode: result.status,
      latencyMs: Date.now() - startedAt,
    };
  } catch {
    return {
      ...target,
      status: 'offline',
      latencyMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}
