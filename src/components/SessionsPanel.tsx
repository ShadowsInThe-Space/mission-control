'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore, type ChatMessage, type AgentType } from '@/lib/store';
import { MessageSquare, Plus, Trash2, Clock, Hash, Send, Bot, User, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Hint from '@/components/Hint';

const AGENT_COLORS = {
  hermes: 'var(--color-hermes)',
  openclaw: 'var(--color-openclaw)',
  claude: 'var(--color-claude)',
};

function RelativeTime({ date }: { date: Date | number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return <span suppressHydrationWarning>...</span>;
  }

  return (
    <span suppressHydrationWarning suppressContentEditableWarning>
      {formatDistanceToNow(date, { addSuffix: true })}
    </span>
  );
}

function ChatMessageBubble({ msg, agentType }: { msg: ChatMessage; agentType: AgentType }) {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';
  const color = isSystem ? 'var(--color-warning)' : isUser ? 'var(--color-accent)' : AGENT_COLORS[agentType];

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} mb-4`}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}20` }}
      >
        {isUser ? <User size={14} style={{ color }} /> : isSystem ? <Info size={14} style={{ color }} /> : <Bot size={14} style={{ color }} />}
      </div>
      <div className={`max-w-[70%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className="px-3 py-2 rounded-2xl text-sm"
          style={{
            background: isUser ? 'var(--color-accent)' : isSystem ? 'rgba(234,179,8,0.1)' : 'var(--color-surface)',
            color: isUser ? '#fff' : 'var(--color-foreground)',
            border: isUser || isSystem ? 'none' : '1px solid var(--color-border)',
            borderBottomLeftRadius: isUser ? '12px' : '4px',
            borderBottomRightRadius: isUser ? '4px' : '12px',
          }}
        >
          {msg.content}
        </div>
        <div className="text-xs mt-1 px-1" style={{ color: 'var(--color-muted)' }}>
          <RelativeTime date={msg.timestamp} />
        </div>
      </div>
    </div>
  );
}

function ChatInput({ onSend, disabled }: { onSend: (msg: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!value.trim() || sending || disabled) return;
    setSending(true);
    await onSend(value.trim());
    setValue('');
    setSending(false);
  }

  return (
    <div className="flex items-end gap-2 px-4 pb-4">
      <Hint tip="Schreibe eine Nachricht an den aktiven Agenten. Enter senden, Shift+Enter für neue Zeile. Die Antwort kommt über /api/agents/chat." />
      <textarea
        autoFocus
        rows={1}
        className="flex-1 px-4 py-3 rounded-2xl text-sm resize-none outline-none"
        style={{
          background: 'var(--color-surface-hover)',
          color: 'var(--color-foreground)',
          border: '1px solid var(--color-border)',
        }}
        placeholder="Ask your agent..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />
      <button
        onClick={handleSend}
        disabled={!value.trim() || sending || disabled}
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-40"
        style={{ background: 'var(--color-accent)', color: '#fff' }}
      >
        <Send size={16} />
      </button>
    </div>
  );
}

function NewSessionModal({ onClose }: { onClose: () => void }) {
  const { addSession, setActiveSession } = useStore();
  const [agentType, setAgentType] = useState<AgentType>('hermes');
  const [title, setTitle] = useState('');

  function handleCreate() {
    if (!title.trim()) return;
    addSession({
      agentType,
      title: title.trim(),
      preview: 'New session started...',
      status: 'active',
    });
    // setActiveSession to the newly created session
    setTimeout(() => {
      const st = useStore.getState();
      const newS = st.sessions.find((s) => s.title === title.trim());
      if (newS) setActiveSession(newS.id);
    }, 50);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--color-foreground)' }}>Start New Session</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted)' }}>Agent</label>
            <div className="grid grid-cols-3 gap-2">
              {(['hermes', 'openclaw', 'claude'] as AgentType[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setAgentType(a)}
                  className="py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
                  style={{
                    background: agentType === a ? `${AGENT_COLORS[a]}20` : 'var(--color-surface-hover)',
                    color: agentType === a ? AGENT_COLORS[a] : 'var(--color-muted)',
                    border: `1px solid ${agentType === a ? AGENT_COLORS[a] : 'var(--color-border)'}`,
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted)' }}>Session Title</label>
            <input
              autoFocus
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--color-surface-hover)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
              placeholder="What do you want to work on?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Cancel</button>
          <button onClick={handleCreate} disabled={!title.trim()} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40" style={{ background: 'var(--color-accent)', color: '#fff' }}>
            Start Session
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SessionsPanel() {
  const { sessions, activeSessionId, setActiveSession, removeSession, sendMessage } = useStore();
  const [showNewSession, setShowNewSession] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages]);

  async function handleSend(content: string) {
    if (!activeSessionId || sending) return;
    setSending(true);
    await sendMessage(activeSessionId, content);
    setSending(false);
  }

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
            onClick={() => setShowNewSession(true)}
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
                style={{ background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent' }}
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
                <div className="text-sm truncate mb-0.5" style={{ color: 'var(--color-foreground)' }}>{s.title}</div>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-muted)' }}>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    <RelativeTime date={s.updatedAt} />
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

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeSession ? (
          <>
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: AGENT_COLORS[activeSession.agentType] }} />
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{activeSession.title}</h2>
                  <span className="text-xs capitalize" style={{ color: AGENT_COLORS[activeSession.agentType] }}>{activeSession.agentType} agent</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)' }}
                >
                  {activeSession.status}
                </span>
                <button
                  onClick={() => removeSession(activeSession.id)}
                  className="p-1.5 rounded-lg"
                  style={{ color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 pt-4">
              {activeSession.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot size={40} className="mb-3 opacity-20" style={{ color: AGENT_COLORS[activeSession.agentType] }} />
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Start the conversation</p>
                  <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                    Send a message to {activeSession.agentType}
                  </p>
                </div>
              ) : (
                activeSession.messages.map((msg) => (
                  <ChatMessageBubble key={msg.id} msg={msg} agentType={activeSession.agentType} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <ChatInput onSend={handleSend} disabled={sending} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--color-muted)' }}>
            <div className="text-center">
              <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a session or start a new one</p>
              <button
                onClick={() => setShowNewSession(true)}
                className="mt-3 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                New Session
              </button>
              <div className="mt-2"><Hint tip="Startet eine neue Session mit einem Agenten deiner Wahl (Hermes, OpenClaw oder Claude)." /></div>
            </div>
          </div>
        )}
      </div>

      {showNewSession && <NewSessionModal onClose={() => setShowNewSession(false)} />}
    </div>
  );
}
