'use client';

import { useState, useEffect } from 'react';
import { Cpu, RefreshCw, Terminal, Wifi, WifiOff, CircleDot } from 'lucide-react';
import { listAgentDefinitions } from '@/lib/agent-registry';

interface AgentInfo {
  type: string;
  name: string;
  version: string;
  status: 'online' | 'offline' | 'error' | 'unknown';
  lastSeen: number;
  info: Record<string, string>;
}

const AGENT_COLORS = [
  'var(--color-hermes)',
  'var(--color-openclaw)',
  'var(--color-claude)',
  '#38bdf8',
  '#a3e635',
  '#f59e0b',
  '#14b8a6',
  '#f472b6',
  '#60a5fa',
  '#fb7185',
  '#c084fc',
  '#22c55e',
];

const STATUS_LABELS: Record<AgentInfo['status'], string> = {
  online: 'Online',
  offline: 'Offline',
  error: 'Error',
  unknown: 'Configured',
};

function colorAt(index: number) {
  return AGENT_COLORS[index % AGENT_COLORS.length];
}

export default function AgentsPanel() {
  const [agents, setAgents] = useState<Record<string, AgentInfo>>({});
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/api/agents/status');
      const data = await res.json();
      setAgents(data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Failed to fetch agent status', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const tick = () => setTimeout(() => refresh(), 0);
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, []);

  const agentList = listAgentDefinitions();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <Cpu size={16} style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>Agent Bridge</h1>
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Loading...'}
          </span>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Agent cards */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4 max-w-3xl">
          {agentList.map((definition, index) => {
            const info = agents[definition.id];
            const color = colorAt(index);
            const bg = `${color}1a`;
            const isOnline = info?.status === 'online';
            const isConfigured = info?.status === 'unknown';
            return (
              <div
                key={definition.id}
                className="rounded-lg p-5"
                style={{ background: 'var(--color-surface)', border: `1px solid ${isOnline ? color : 'var(--color-border)'}40` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
                      style={{ background: bg, color }}
                    >
                      {definition.label.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{definition.label}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isOnline ? (
                          <>
                            <Wifi size={10} style={{ color }} />
                            <span className="text-xs" style={{ color }}>{STATUS_LABELS.online}</span>
                          </>
                        ) : isConfigured ? (
                          <>
                            <CircleDot size={10} style={{ color }} />
                            <span className="text-xs" style={{ color }}>{STATUS_LABELS.unknown}</span>
                          </>
                        ) : (
                          <>
                            <WifiOff size={10} style={{ color: 'var(--color-danger)' }} />
                            <span className="text-xs" style={{ color: 'var(--color-danger)' }}>{STATUS_LABELS[info?.status || 'offline']}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-lg font-mono" style={{ background: bg, color }}>
                    {isOnline ? info?.version : '—'}
                  </div>
                </div>

                <p className="text-xs mb-4" style={{ color: 'var(--color-muted)' }}>{definition.description}</p>

                {/* Info grid */}
                {info?.info && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {Object.entries(info.info).map(([k, v]) => (
                      <div key={k} className="flex flex-col p-2 rounded-lg" style={{ background: 'var(--color-surface-hover)' }}>
                        <span className="text-xs capitalize" style={{ color: 'var(--color-muted)' }}>{k}</span>
                        <span className="text-xs font-mono truncate" style={{ color: 'var(--color-foreground)' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}

                {!isOnline && !isConfigured && (
                  <div className="flex items-center gap-2 p-2 rounded-lg mb-4" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <Terminal size={12} style={{ color: 'var(--color-danger)' }} />
                    <code className="text-xs font-mono" style={{ color: 'var(--color-danger)' }}>
                      {definition.actions.version ? `${definition.actions.version.bin} ${definition.actions.version.args.join(' ')}`.trim() : 'adapter pending'}
                    </code>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CLI Bridge section */}
        <div className="mt-8 max-w-3xl">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-foreground)' }}>CLI Bridge Commands</h2>
          <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="space-y-2">
              {[
                ...agentList
                  .filter((agent) => agent.actions.version)
                  .map((agent) => ({
                    cmd: `${agent.actions.version!.bin} ${agent.actions.version!.args.join(' ')}`.trim(),
                    desc: `${agent.label} version check`,
                    agent: agent.id,
                  })),
              ].map(({ cmd, desc, agent }, index) => (
                <div key={cmd} className="flex items-center gap-3 py-2 border-b border-opacity-30 last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                  <code className="text-xs font-mono px-2 py-1 rounded" style={{ background: 'var(--color-surface-hover)', color: 'var(--color-accent)' }}>
                    {cmd}
                  </code>
                  <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{desc}</span>
                  <span className="ml-auto text-xs capitalize" style={{ color: colorAt(index) }}>
                    {agent}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
