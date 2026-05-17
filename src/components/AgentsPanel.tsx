'use client';

import { useState, useEffect } from 'react';
import { Cpu, RefreshCw, Terminal, Wifi, WifiOff } from 'lucide-react';

interface AgentInfo {
  type: string;
  name: string;
  version: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: number;
  info: Record<string, string>;
}

const AGENT_META = {
  hermes: {
    label: 'Hermes Agent',
    color: 'var(--color-hermes)',
    bg: 'rgba(249,115,22,0.1)',
    description: 'Dein persönlicher AI Agent — Memory, Cron, MCP-Server',
    installCmd: 'Already installed at ~/.local/bin/hermes',
  },
  openclaw: {
    label: 'OpenClaw',
    color: 'var(--color-openclaw)',
    bg: 'rgba(34,197,94,0.1)',
    description: 'Multi-Channel Messaging Gateway — Discord, Telegram, Matrix...',
    installCmd: 'npm i -g openclaw',
  },
  claude: {
    label: 'Claude Code',
    color: 'var(--color-claude)',
    bg: 'rgba(221,119,245,0.1)',
    description: 'Anthropic\'s CLI für Coding-Agent-Interaktion',
    installCmd: 'npm i @anthropic-ai/claude-code',
  },
};

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
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  const agentList = [
    { key: 'hermes', ...AGENT_META.hermes },
    { key: 'openclaw', ...AGENT_META.openclaw },
    { key: 'claude', ...AGENT_META.claude },
  ];

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
          {agentList.map(({ key, label, color, bg, description, installCmd }) => {
            const info = agents[key];
            const isOnline = info?.status === 'online';
            return (
              <div
                key={key}
                className="rounded-xl p-5"
                style={{ background: 'var(--color-surface)', border: `1px solid ${isOnline ? color : 'var(--color-border)'}40` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
                      style={{ background: bg, color }}
                    >
                      {label.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{label}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isOnline ? (
                          <>
                            <Wifi size={10} style={{ color }} />
                            <span className="text-xs" style={{ color }}>Online</span>
                          </>
                        ) : (
                          <>
                            <WifiOff size={10} style={{ color: 'var(--color-danger)' }} />
                            <span className="text-xs" style={{ color: 'var(--color-danger)' }}>Offline</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-lg font-mono" style={{ background: bg, color }}>
                    {isOnline ? info?.version : '—'}
                  </div>
                </div>

                <p className="text-xs mb-4" style={{ color: 'var(--color-muted)' }}>{description}</p>

                {/* Info grid */}
                {isOnline && info?.info && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {Object.entries(info.info).map(([k, v]) => (
                      <div key={k} className="flex flex-col p-2 rounded-lg" style={{ background: 'var(--color-surface-hover)' }}>
                        <span className="text-xs capitalize" style={{ color: 'var(--color-muted)' }}>{k}</span>
                        <span className="text-xs font-mono truncate" style={{ color: 'var(--color-foreground)' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}

                {!isOnline && (
                  <div className="flex items-center gap-2 p-2 rounded-lg mb-4" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <Terminal size={12} style={{ color: 'var(--color-danger)' }} />
                    <code className="text-xs font-mono" style={{ color: 'var(--color-danger)' }}>{installCmd}</code>
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
                { cmd: 'hermes status', desc: 'Hermes Agent Status', agent: 'hermes' },
                { cmd: 'openclaw channels status', desc: 'OpenClaw Channel Status', agent: 'openclaw' },
                { cmd: 'claude-code --version', desc: 'Claude Code Version', agent: 'claude' },
              ].map(({ cmd, desc, agent }) => (
                <div key={cmd} className="flex items-center gap-3 py-2 border-b border-opacity-30 last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                  <code className="text-xs font-mono px-2 py-1 rounded" style={{ background: 'var(--color-surface-hover)', color: 'var(--color-accent)' }}>
                    {cmd}
                  </code>
                  <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{desc}</span>
                  <span className="ml-auto text-xs capitalize" style={{ color: AGENT_META[agent as keyof typeof AGENT_META].color }}>
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
