'use client';

import { useStore } from '@/lib/store';
import Sidebar from '@/components/Sidebar';
import SessionsPanel from '@/components/SessionsPanel';
import KanbanBoard from '@/components/KanbanBoard';
import LogsPanel from '@/components/LogsPanel';
import AgentsPanel from '@/components/AgentsPanel';
import SEOPanel from '@/components/SEOPanel';
import HandoffPanel from '@/components/HandoffPanel';
import AgentDetailPanel from '@/components/AgentDetailPanel';

export default function Home() {
  const { activeView } = useStore();

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {activeView === 'sessions' && <SessionsPanel />}
        {activeView === 'kanban' && <KanbanBoard />}
        {activeView === 'logs' && <LogsPanel />}
        {activeView === 'seo' && <SEOPanel />}
        {activeView === 'agents' && <AgentsPanel />}
        {activeView === 'handoff' && <HandoffPanel />}
      </main>
      <AgentDetailPanel />
    </div>
  );
}
