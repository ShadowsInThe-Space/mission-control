import { describe, expect, it } from 'vitest';
import { getMonitoringSnapshot, type MonitoringService } from './monitoring-service';

describe('monitoring service', () => {
  it('reports the essential local and mothership services from an allowlisted probe set', async () => {
    const requestedUrls: string[] = [];

    const snapshot = await getMonitoringSnapshot({
      fetcher: async (url) => {
        requestedUrls.push(url);
        return { ok: !url.includes('13001'), status: url.includes('13001') ? 503 : 200 };
      },
    });

    expect(snapshot.overall).toBe('degraded');
    expect(snapshot.services.find((service) => service.id === 'hermes-gateway')).toMatchObject({
      status: 'online',
      category: 'local',
    });
    expect(snapshot.services.find((service) => service.id === 'lepsy-hermes')).toMatchObject({
      status: 'online',
      category: 'application',
    });
    expect(snapshot.services.find((service) => service.id === 'mothership-netdata')).toMatchObject({
      status: 'online',
      category: 'mothership',
    });
    expect(snapshot.services.find((service) => service.id === 'rankforge')).toMatchObject({
      status: 'offline',
    });
    expect(requestedUrls).toContain('http://127.0.0.1:8642/health');
    expect(requestedUrls).toContain('http://127.0.0.1:18642/health');
    expect(requestedUrls).toContain('http://127.0.0.1:19999/api/v1/info');
  });

  it('uses the request origin for Mission Control instead of assuming a fixed port', async () => {
    const requestedUrls: string[] = [];

    await getMonitoringSnapshot({
      origin: 'http://127.0.0.1:3737',
      fetcher: async (url) => {
        requestedUrls.push(url);
        return { ok: true, status: 200 };
      },
    });

    expect(requestedUrls).toContain('http://127.0.0.1:3737/api/health');
  });

  it('reports a down system when every essential service is unavailable', async () => {
    const snapshot = await getMonitoringSnapshot({
      fetcher: async () => ({ ok: false, status: 503 }),
    });

    expect(snapshot.overall).toBe('down');
    const essentialServices: MonitoringService[] = snapshot.services.filter((service: MonitoringService) => service.essential);
    expect(essentialServices.every((service) => service.status === 'offline')).toBe(true);
  });
});
