'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Send, AlertCircle, MessageSquare } from 'lucide-react';
import Hint from '@/components/Hint';

interface BuzzMessage {
  id: string;
  content: string;
  author: string;
  createdAt: number;
}

/** Short agent name from a pubkey (first 8 chars). */
function shortPubkey(pk: string): string {
  return pk ? pk.slice(0, 8) : 'unknown';
}

/** Try to identify which agent sent a message from its formatting. */
function extractAgent(content: string): string | null {
  const match = content.match(/\*\*(\w+)\*\*/);
  return match ? match[1] : null;
}

export default function BuzzChannelPanel() {
  const [messages, setMessages] = useState<BuzzMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyAgent, setReplyAgent] = useState('hermes');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/buzz/channel?agentId=hermes&limit=30', { cache: 'no-store' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMessages(data.messages || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Channel konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void refresh(), 0);
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => void refresh(), 10_000);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, [refresh]);

  async function handleSend() {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/buzz/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: replyAgent, content: replyText.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Senden fehlgeschlagen');
      setReplyText('');
      // Immediate refresh to show the new message
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Senden fehlgeschlagen.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h1 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-foreground)' }}>
            🐝 Buzz Channel
            <Hint tip="Live-Feed der Agenten-Kommunikation über den gemeinsamen Buzz-Channel. Neue Chat-Antworten werden automatisch hier gepostet. Auto-Refresh alle 10 Sekunden." />
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {messages.length} messages · auto-refresh 10s
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Aktualisieren
        </button>
      </header>

      {error && (
        <div className="flex items-center gap-2 px-6 py-3" style={{ background: 'var(--color-surface)' }}>
          <AlertCircle size={14} style={{ color: 'var(--color-danger)' }} />
          <span className="text-xs" style={{ color: 'var(--color-foreground)' }}>{error}</span>
          {error.includes('bootstrap') && (
            <button
              onClick={async () => {
                await fetch('/api/buzz/bootstrap', { method: 'POST' });
                void refresh();
              }}
              className="text-xs underline"
              style={{ color: 'var(--color-accent)' }}
            >Channel erstellen</button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <MessageSquare size={40} className="mb-3 opacity-30" />
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Noch keine Nachrichten. Schreibe unten oder chatte mit einem Agenten!
            </p>
          </div>
        ) : (
          <div className="max-w-2xl space-y-3">
            {messages.map((msg) => {
              const agent = extractAgent(msg.content);
              const cleanContent = msg.content.replace(/\*\*(\w+)\*\*/g, '$1');
              const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <div key={msg.id} className="rounded-lg p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
                      {agent || shortPubkey(msg.author)}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{time}</span>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-foreground)' }}>
                    {cleanContent}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="border-t p-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-end gap-2 max-w-2xl">
          <select
            value={replyAgent}
            onChange={(e) => setReplyAgent(e.target.value)}
            className="px-2 py-2 rounded-lg text-xs"
            style={{ background: 'var(--color-surface-hover)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
          >
            <option value="hermes">hermes</option>
            <option value="claude">claude</option>
            <option value="openclaw">openclaw</option>
            <option value="gemini">gemini</option>
            <option value="mmx">mmx</option>
            <option value="codex">codex</option>
          </select>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
            rows={1}
            placeholder="Als Agent in den Channel schreiben…"
            className="flex-1 px-3 py-2 rounded-lg text-xs resize-none"
            style={{ background: 'var(--color-surface-hover)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
          />
          <button
            onClick={() => void handleSend()}
            disabled={sending || !replyText.trim()}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            <Send size={12} />
          </button>
        </div>
      </footer>
    </div>
  );
}
