'use client';

import { useStore } from '@/lib/store';
import {
  MessageSquare,
  Kanban,
  ScrollText,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Terminal,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'sessions' as const, icon: MessageSquare, label: 'Sessions' },
  { id: 'kanban' as const, icon: Kanban, label: 'Kanban' },
  { id: 'logs' as const, icon: ScrollText, label: 'Logs' },
  { id: 'agents' as const, icon: Cpu, label: 'Agents' },
];

export default function Sidebar() {
  const { activeView, setActiveView, sidebarCollapsed, toggleSidebar, sessions, activeSessionId } = useStore();

  const onlineCount = sessions.filter((s) => s.status === 'active').length;

  return (
    <aside
      className="flex flex-col h-full transition-all duration-200"
      style={{
        width: sidebarCollapsed ? '56px' : '240px',
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'var(--color-accent)' }}>
          <Terminal size={16} className="text-white" />
        </div>
        {!sidebarCollapsed && (
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Mission Control</div>
            <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{onlineCount} agents online</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const isActive = activeView === id;
          return (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors rounded-lg mx-1"
              style={{
                background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-muted)',
              }}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon size={18} />
              {!sidebarCollapsed && (
                <span className="text-sm font-medium">{label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Session preview */}
      {!sidebarCollapsed && activeSessionId && (
        <div className="px-3 pb-3">
          <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted)' }}>ACTIVE SESSION</div>
          {(() => {
            const s = sessions.find((x) => x.id === activeSessionId);
            if (!s) return null;
            const color = s.agentType === 'hermes' ? 'var(--color-hermes)' : s.agentType === 'openclaw' ? 'var(--color-openclaw)' : 'var(--color-claude)';
            return (
              <div className="p-2 rounded-lg" style={{ background: 'var(--color-surface-hover)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  <span className="text-xs font-medium capitalize" style={{ color }}>{s.agentType}</span>
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--color-foreground)' }}>{s.title}</div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center p-3 border-t transition-colors"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
      >
        {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
