'use client';

import { useStore } from '@/lib/store';
import { MessageSquare, Plus, Trash2, Clock, Hash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const AGENT_COLORS = {
  hermes: 'var(--color-hermes)',
  openclaw: 'var(--color-openclaw)',
  claude: 'var(--color-claude)',
};

export default function SessionsPanel() {
  const { sessions, activeSessionId, setActiveSession, addSession, removeSession } = useStore();

  return (
    <div className="flex h-full gap-0">
      {/* Session list */}
      <div className="w-64 flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <MessageSquare size={16} style={{ color: 'var(--color-accent)' }} />
            <span className="text-sm font-semibold">Sessions</span>
          </div>
          <button
            onClick={() =>
              addSession({
                agentType: 'hermes',
                title: 'New Session',
                preview: 'Session started...',
                status: 'active',
              })
            }
            className="p-1 rounded hover:bg-opacity-10 transition-colors"
            style={{ color: 'var(--color-accent)' }}
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {sessions.map((s) => {
            const color = AGENT_COLORS[s.agentType];
            const isActive = s.id === activeSessionId;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSession(s.id)}
                className="w-full text-left px-3 py-2.5 transition-colors"
                style={{
                  background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
                    {s.agentType}
                  </span>
                  <span
                    className="ml-auto text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: s.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                      color: s.status === 'active' ? 'var(--color-success)' : 'var(--color-muted)',
                    }}
                  >
                    {s.status}
                  </span>
                </div>
                <div className="text-sm truncate mb-0.5" style={{ color: 'var(--color-foreground)' }}>
                  {s.title}
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-muted)' }}>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {formatDistanceToNow(s.updatedAt, { addSuffix: true })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Hash size={10} />
                    {s.messageCount}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Session detail */}
      <div className="flex-1 flex flex-col">
        {activeSessionId ? (
          (() => {
            const s = sessions.find((x) => x.id === activeSessionId);
            if (!s) return null;
            return (
              <>
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <div>
                    <h2 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>
                      {s.title}
                    </h2>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
                      {s.preview}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
                      Active
                    </div>
                    <button
                      onClick={() => removeSession(s.id)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-opacity-10"
                      style={{ color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-5 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Agent', value: s.agentType.toUpperCase() },
                      { label: 'Messages', value: String(s.messageCount) },
                      { label: 'Status', value: s.status },
                      { label: 'Created', value: formatDistanceToNow(s.createdAt, { addSuffix: true }) },
                      { label: 'Last Update', value: formatDistanceToNow(s.updatedAt, { addSuffix: true }) },
                      { label: 'Session ID', value: s.id },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 rounded-lg" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>{label}</div>
                        <div className="text-sm font-medium capitalize" style={{ color: 'var(--color-foreground)' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-muted)' }}>
            <div className="text-center">
              <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a session to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
