import { create } from 'zustand';

export type AgentType = 'hermes' | 'openclaw' | 'claude';
export type TaskStatus = 'backlog' | 'in-progress' | 'review' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: AgentType;
  createdAt: number;
  updatedAt: number;
}

export interface Session {
  id: string;
  agentType: AgentType;
  title: string;
  preview: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  status: 'active' | 'paused' | 'ended';
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: AgentType | 'system';
  message: string;
}

interface AppState {
  // UI
  activeView: 'sessions' | 'kanban' | 'logs' | 'agents';
  sidebarCollapsed: boolean;
  setActiveView: (v: AppState['activeView']) => void;
  toggleSidebar: () => void;

  // Sessions
  sessions: Session[];
  activeSessionId: string | null;
  addSession: (s: Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'messageCount'>) => void;
  updateSession: (id: string, updates: Partial<Session>) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;

  // Tasks (Kanban)
  tasks: Task[];
  addTask: (t: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  moveTask: (id: string, status: TaskStatus) => void;

  // Logs
  logs: LogEntry[];
  addLog: (e: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
}

let taskCounter = 0;
let sessionCounter = 0;
let logCounter = 0;

export const useStore = create<AppState>((set) => ({
  // UI
  activeView: 'sessions',
  sidebarCollapsed: false,
  setActiveView: (v) => set({ activeView: v }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // Sessions
  sessions: [
    {
      id: 's1',
      agentType: 'hermes',
      title: 'Hermes Agent — Current Session',
      preview: 'Managing mission-control dashboard setup...',
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now() - 60000,
      messageCount: 47,
      status: 'active',
    },
    {
      id: 's2',
      agentType: 'openclaw',
      title: 'OpenClaw — Discord Bot',
      preview: 'Processing webhook events from Discord...',
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 7200000,
      messageCount: 312,
      status: 'active',
    },
    {
      id: 's3',
      agentType: 'claude',
      title: 'Claude Code — Feature Branch',
      preview: 'Implementing auth flow for mission-control...',
      createdAt: Date.now() - 172800000,
      updatedAt: Date.now() - 86400000,
      messageCount: 89,
      status: 'paused',
    },
  ],
  activeSessionId: 's1',
  addSession: (s) =>
    set((st) => ({
      sessions: [
        ...st.sessions,
        {
          ...s,
          id: `s${++sessionCounter}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messageCount: 0,
        },
      ],
    })),
  updateSession: (id, updates) =>
    set((st) => ({
      sessions: st.sessions.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
      ),
    })),
  removeSession: (id) =>
    set((st) => ({
      sessions: st.sessions.filter((s) => s.id !== id),
      activeSessionId: st.activeSessionId === id ? null : st.activeSessionId,
    })),
  setActiveSession: (id) => set({ activeSessionId: id }),

  // Tasks
  tasks: [
    {
      id: 't1',
      title: 'Design sidebar navigation',
      description: 'Persistent sidebar with session list and agent status indicators',
      status: 'done',
      priority: 'high',
      assignee: 'hermes',
      createdAt: Date.now() - 7200000,
      updatedAt: Date.now() - 3600000,
    },
    {
      id: 't2',
      title: 'Build Kanban board',
      description: 'Drag-and-drop task board with Hermes/OpenClaw/Claude columns',
      status: 'in-progress',
      priority: 'high',
      assignee: 'hermes',
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now() - 600000,
    },
    {
      id: 't3',
      title: 'Integrate Hermes CLI bridge',
      description: 'Connect to Hermes Agent via CLI for command execution and status',
      status: 'review',
      priority: 'critical',
      assignee: 'hermes',
      createdAt: Date.now() - 1800000,
      updatedAt: Date.now() - 300000,
    },
    {
      id: 't4',
      title: 'Obsidian journal export',
      description: 'Export daily logs and memories to ~/obsidian-vault/',
      status: 'backlog',
      priority: 'medium',
      assignee: 'openclaw',
      createdAt: Date.now() - 900000,
      updatedAt: Date.now() - 900000,
    },
    {
      id: 't5',
      title: 'OpenClaw extension panel',
      description: 'Show OpenClaw extension status and controls',
      status: 'backlog',
      priority: 'low',
      assignee: 'openclaw',
      createdAt: Date.now() - 900000,
      updatedAt: Date.now() - 900000,
    },
    {
      id: 't6',
      title: 'Claude Code status widget',
      description: 'Display Claude CLI session status and active branch',
      status: 'backlog',
      priority: 'medium',
      assignee: 'claude',
      createdAt: Date.now() - 900000,
      updatedAt: Date.now() - 900000,
    },
  ],
  addTask: (t) =>
    set((st) => ({
      tasks: [
        ...st.tasks,
        { ...t, id: `t${++taskCounter}`, createdAt: Date.now(), updatedAt: Date.now() },
      ],
    })),
  updateTask: (id, updates) =>
    set((st) => ({
      tasks: st.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
      ),
    })),
  removeTask: (id) => set((st) => ({ tasks: st.tasks.filter((t) => t.id !== id) })),
  moveTask: (id, status) =>
    set((st) => ({
      tasks: st.tasks.map((t) =>
        t.id === id ? { ...t, status, updatedAt: Date.now() } : t
      ),
    })),

  // Logs
  logs: [
    {
      id: 'l1',
      timestamp: Date.now() - 300000,
      level: 'info',
      source: 'hermes',
      message: 'Mission-control project initialized. Next.js + Tailwind stack ready.',
    },
    {
      id: 'l2',
      timestamp: Date.now() - 240000,
      level: 'info',
      source: 'openclaw',
      message: 'OpenClaw extensions loaded: matrix, discord, web',
    },
    {
      id: 'l3',
      timestamp: Date.now() - 180000,
      level: 'warn',
      source: 'system',
      message: 'Claude CLI not found in PATH — install with: npm i -g @anthropic-ai/claude-code',
    },
    {
      id: 'l4',
      timestamp: Date.now() - 120000,
      level: 'info',
      source: 'hermes',
      message: 'Hermes Agent v0.13.0 connected. Project: /home/z3r0b1nary/.hermes/hermes-agent',
    },
    {
      id: 'l5',
      timestamp: Date.now() - 60000,
      level: 'debug',
      source: 'hermes',
      message: 'Memory: 1,575/2,200 chars used. MCP servers: serena, context7, firecrawl, postgres',
    },
    {
      id: 'l6',
      timestamp: Date.now() - 30000,
      level: 'info',
      source: 'system',
      message: 'Obsidian vault detected at ~/obsidian-vault — journal export enabled',
    },
  ],
  addLog: (e) =>
    set((st) => ({
      logs: [
        { ...e, id: `l${++logCounter}`, timestamp: Date.now() },
        ...st.logs,
      ].slice(0, 500),
    })),
  clearLogs: () => set({ logs: [] }),
}));
