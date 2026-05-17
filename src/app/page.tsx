'use client';

import { useStore } from '@/lib/store';
import Sidebar from '@/components/Sidebar';
import SessionsPanel from '@/components/SessionsPanel';
import KanbanBoard from '@/components/KanbanBoard';
import LogsPanel from '@/components/LogsPanel';
import AgentsPanel from '@/components/AgentsPanel';

export default function Home() {
  const { activeView } = useStore();

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {activeView === 'sessions' && <SessionsPanel />}
        {activeView === 'kanban' && <KanbanBoard />}
        {activeView === 'logs' && <LogsPanel />}
        {activeView === 'agents' && <AgentsPanel />}
      </main>
    </div>
  );
}
