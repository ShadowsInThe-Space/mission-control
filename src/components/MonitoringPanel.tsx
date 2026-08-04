'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, ExternalLink, RefreshCw, Server, TriangleAlert } from 'lucide-react';
import type { MonitoringSnapshot, MonitoringService } from '@/lib/monitoring-service';
import Hint from '@/components/Hint';

const GROUPS: Array<{ id: MonitoringService['category']; label: string; description: string }> = [
  { id: 'local', label: 'Arbeitsplatz', description: 'Lokale Hermes- und Mission-Control-Dienste' },
  { id: 'mothership', label: 'Mothership', description: 'Hetzner-Metriken und Container-Logs über den geschützten Tunnel' },
  { id: 'application', label: 'Produkte', description: 'Lokale Produkt- und Crawler-Dienste' },
];

function formatUpdated(timestamp: number | null) {
  if (!timestamp) return 'noch nicht geladen';
  return new Date(timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function statusColor(status: MonitoringService['status']) {
  return status === 'online' ? 'var(--color-success)' : 'var(--color-danger)';
}

export default function MonitoringPanel() {
  const [snapshot, setSnapshot] = useState<MonitoringSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/monitoring', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Monitoring API: ${response.status}`);
      setSnapshot(await response.json() as MonitoringSnapshot);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Monitoring konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer refresh() out of the synchronous effect to avoid cascading renders.
    // Same pattern as AgentsPanel (commit e80f96a): mount + periodic refresh.
    const tick = () => setTimeout(() => void refresh(), 0);
    tick();
    const interval = window.setInterval(tick, 15_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const overall = snapshot?.overall ?? 'down';
  const overallLabel = overall === 'healthy' ? 'Alles läuft' : overall === 'degraded' ? 'Eingeschränkt' : 'Nicht erreichbar';
  const overallColor = overall === 'healthy' ? 'var(--color-success)' : overall === 'degraded' ? 'var(--color-warning)' : 'var(--color-danger)';
  const offlineCount = snapshot?.services.filter((service) => service.status === 'offline').length ?? 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <Activity size={18} style={{ color: 'var(--color-accent)' }} />
          <div>
            <h1 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>System Monitor <Hint tip="Überwacht lokale Dienste und Mothership-Tunnel. Auto-Update alle 15 Sekunden." /></h1>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Auto-Update alle 15 Sekunden · {formatUpdated(snapshot?.generatedAt ?? null)}</p>
          </div>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Aktualisieren
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <section className="max-w-5xl mb-6 rounded-xl p-5" style={{ background: 'var(--color-surface)', border: `1px solid ${overallColor}` }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{ background: overallColor }} aria-hidden="true" />
              <div>
                <div className="font-semibold" style={{ color: 'var(--color-foreground)' }}>{overallLabel}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                  {snapshot ? `${snapshot.services.length - offlineCount} von ${snapshot.services.length} Diensten erreichbar` : 'Prüfe Dienste …'}
                </div>
              </div>
            </div>
            {offlineCount > 0 && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-warning)' }}>
                <TriangleAlert size={16} /> {offlineCount} Dienst{offlineCount === 1 ? '' : 'e'} brauchen Aufmerksamkeit
              </div>
            )}
          </div>
          {error && <p className="mt-4 text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>}
        </section>

        <div className="max-w-5xl space-y-6">
          {GROUPS.map((group) => {
            const services = snapshot?.services.filter((service) => service.category === group.id) ?? [];
            return (
              <section key={group.id}>
                <div className="mb-3">
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{group.label}</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{group.description}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {services.map((service) => (
                    <article key={service.id} className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <Server size={16} className="mt-0.5" style={{ color: statusColor(service.status) }} />
                          <div>
                            <h3 className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>{service.label}</h3>
                            <p className="mt-1 text-xs font-mono break-all" style={{ color: 'var(--color-muted)' }}>{service.url}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium" style={{ color: statusColor(service.status) }}>
                          {service.status === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-4 text-xs" style={{ color: 'var(--color-muted)' }}>
                        <span>{service.statusCode ? `HTTP ${service.statusCode}` : 'keine Antwort'}</span>
                        <span>{service.latencyMs} ms</span>
                        {(service.id === 'mothership-netdata' || service.id === 'mothership-dozzle') && service.status === 'online' && (
                          <a href={service.url.replace('/api/v1/info', '')} target="_blank" rel="noreferrer" className="flex items-center gap-1" style={{ color: 'var(--color-accent)' }}>
                            Öffnen <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                  {!snapshot && loading && <div className="text-sm" style={{ color: 'var(--color-muted)' }}>Lade Status …</div>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
