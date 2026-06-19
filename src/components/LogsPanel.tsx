'use client';

import { useState } from 'react';
import { useStore, type AgentType } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';
import { ScrollText, Trash2, Download, AlertTriangle, Info, Bug, AlertCircle } from 'lucide-react';

const LEVEL_COLORS = {
  info: 'var(--color-accent)',
  warn: 'var(--color-warning)',
  error: 'var(--color-danger)',
  debug: 'var(--color-muted)',
};

const LEVEL_ICONS = {
  info: Info,
  warn: AlertTriangle,
  error: AlertCircle,
  debug: Bug,
};

const SOURCE_COLORS: Record<AgentType | 'system', string> = {
  hermes: 'var(--color-hermes)',
  openclaw: 'var(--color-openclaw)',
  claude: 'var(--color-claude)',
  system: 'var(--color-muted)',
};

export default function LogsPanel() {
  const { logs, clearLogs, addLog } = useStore();
  const [filter, setFilter] = useState<'all' | AgentType | 'system'>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error' | 'debug'>('all');

  const filtered = logs.filter((l) => {
    if (filter !== 'all' && l.source !== filter) return false;
    if (levelFilter !== 'all' && l.level !== levelFilter) return false;
    return true;
  });

  async function handleExport() {
    const date = new Date().toISOString().split('T')[0];
    const content = logs
      .map((l) => `## [${new Date(l.timestamp).toLocaleTimeString()}] ${l.level.toUpperCase()} | ${l.source}\n${l.message}\n`)
      .join('\n---\n\n');

    try {
      const res = await fetch('/api/obsidian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'journal', date, content }),
      });
      const data = await res.json();
      addLog({ level: 'info', source: 'system', message: `Journal exported to Obsidian: ${data.path}` });
    } catch (e) {
      addLog({ level: 'error', source: 'system', message: `Export failed: ${String(e)}` });
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <ScrollText size={16} style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>System Logs</h1>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface)', color: 'var(--color-muted)' }}>
            {filtered.length} entries
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Source filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="text-xs px-2 py-1.5 rounded-lg border appearance-none cursor-pointer"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          >
            <option value="all">All Sources</option>
            <option value="hermes">Hermes</option>
            <option value="openclaw">OpenClaw</option>
            <option value="claude">Claude</option>
            <option value="system">System</option>
          </select>
          {/* Level filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as typeof levelFilter)}
            className="text-xs px-2 py-1.5 rounded-lg border appearance-none cursor-pointer"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            <Download size={12} /> Export to Obsidian
          </button>
          <button
            onClick={clearLogs}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)' }}
            title="Clear logs"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--color-muted)' }}>
            <ScrollText size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No log entries</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((entry) => {
              const Icon = LEVEL_ICONS[entry.level];
              const sourceColor = SOURCE_COLORS[entry.source as keyof typeof SOURCE_COLORS] ?? 'var(--color-muted)';
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 px-3 py-2 rounded-lg group hover:bg-opacity-50 transition-colors"
                  style={{ background: 'var(--color-surface)' }}
                >
                  {/* Time */}
                  <div className="text-xs flex-shrink-0 mt-0.5" style={{ color: 'var(--color-muted)', minWidth: '80px' }}>
                    {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                  </div>
                  {/* Level */}
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon size={12} style={{ color: LEVEL_COLORS[entry.level] }} />
                  </div>
                  {/* Source */}
                  <div
                    className="text-xs font-semibold uppercase tracking-wider flex-shrink-0 px-1.5 py-0.5 rounded"
                    style={{ color: sourceColor, background: `${sourceColor}15`, minWidth: '70px', textAlign: 'center' }}
                  >
                    {entry.source}
                  </div>
                  {/* Message */}
                  <div className="text-sm flex-1" style={{ color: 'var(--color-foreground)' }}>
                    {entry.message}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
