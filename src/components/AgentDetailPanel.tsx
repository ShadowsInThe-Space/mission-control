'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  X,
  ArrowLeft,
  Cpu,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Terminal,
  Wifi,
  WifiOff,
  CircleDot,
  MessageSquare,
  Send,
  Globe,
} from 'lucide-react';
import { useStore } from '@/lib/store';

interface AgentAction {
  id: string;
  label: string;
  bin: string;
  args: string[];
  timeoutMs: number;
}

interface AgentHttpEndpoint {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  label: string;
  description: string;
  params?: Array<{ name: string; label: string; required?: boolean; placeholder?: string }>;
}

interface AgentChatCommand {
  bin: string;
  args: string[];
  timeoutMs: number;
  useStdin?: boolean;
  mode?: 'append' | 'print' | 'stdin' | 'pipe';
}

interface AgentDetail {
  id: string;
  label: string;
  kind: 'cli' | 'http' | 'workspace' | 'feature';
  description: string;
  capabilities: string[];
  actions: AgentAction[];
  httpEndpoints?: AgentHttpEndpoint[];
  chatCommand?: AgentChatCommand;
  health?: {
    envVar: string;
    defaultUrl: string;
    resolvedUrl?: string;
    path: string;
    timeoutMs: number;
  };
  env: { envVarSet: boolean; resolvedUrl?: string };
}

interface ActionResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  error?: string;
  command?: { bin: string; args: string[]; timeoutMs: number };
}

interface EndpointResult {
  ok: boolean;
  status?: number;
  body?: string;
  error?: string;
}

const KIND_COLORS: Record<AgentDetail['kind'], string> = {
  cli: 'var(--color-hermes)',
  http: 'var(--color-openclaw)',
  workspace: 'var(--color-claude)',
  feature: 'var(--color-accent)',
};

export default function AgentDetailPanel() {
  const { selectedAgentId, setSelectedAgent } = useStore();
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionResults, setActionResults] = useState<Record<string, ActionResult>>({});
  const [runningAction, setRunningAction] = useState<string | null>(null);

  const [endpointResults, setEndpointResults] = useState<Record<string, EndpointResult>>({});
  const [runningEndpoint, setRunningEndpoint] = useState<string | null>(null);
  const [endpointParams, setEndpointParams] = useState<Record<string, Record<string, string>>>({});

  const [chatInput, setChatInput] = useState('');
  const [chatReply, setChatReply] = useState<string | null>(null);
  const [chatRunning, setChatRunning] = useState(false);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    actions: true,
    http: true,
    chat: true,
    raw: false,
  });

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setDetail(null);
    setActionResults({});
    setEndpointResults({});
    setChatReply(null);
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setDetail(data.agent as AgentDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAgentId) load(selectedAgentId);
  }, [selectedAgentId, load]);

  if (!selectedAgentId) return null;

  const close = () => setSelectedAgent(null);

  const runAction = async (actionId: string) => {
    if (!detail || runningAction) return;
    setRunningAction(actionId);
    setActionResults((prev) => ({
      ...prev,
      [actionId]: { ok: false, stdout: '', stderr: '', exitCode: -1, durationMs: 0 },
    }));
    try {
      const res = await fetch('/api/agents/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: detail.id, action: actionId }),
      });
      const data = await res.json();
      setActionResults((prev) => ({
        ...prev,
        [actionId]: {
          ok: data.ok === true,
          stdout: data.stdout || '',
          stderr: data.stderr || '',
          exitCode: typeof data.exitCode === 'number' ? data.exitCode : -1,
          durationMs: data.durationMs || 0,
          error: data.error,
          command: data.command,
        },
      }));
    } catch (e) {
      setActionResults((prev) => ({
        ...prev,
        [actionId]: {
          ok: false,
          stdout: '',
          stderr: '',
          exitCode: -1,
          durationMs: 0,
          error: e instanceof Error ? e.message : String(e),
        },
      }));
    } finally {
      setRunningAction(null);
    }
  };

  const runEndpoint = async (endpoint: AgentHttpEndpoint) => {
    if (!detail || runningEndpoint) return;
    setRunningEndpoint(endpoint.id);
    setEndpointResults((prev) => ({
      ...prev,
      [endpoint.id]: { ok: false },
    }));
    const params = endpointParams[endpoint.id] || {};
    try {
      const res = await fetch('/api/agents/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: detail.id, endpointId: endpoint.id, params }),
      });
      const data = await res.json();
      setEndpointResults((prev) => ({
        ...prev,
        [endpoint.id]: {
          ok: data.ok === true,
          status: data.status,
          body: data.body,
          error: data.error,
        },
      }));
    } catch (e) {
      setEndpointResults((prev) => ({
        ...prev,
        [endpoint.id]: {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        },
      }));
    } finally {
      setRunningEndpoint(null);
    }
  };

  const sendChat = async () => {
    if (!detail || !chatInput.trim() || chatRunning) return;
    setChatRunning(true);
    setChatReply(null);
    try {
      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: detail.id, message: chatInput }),
      });
      const data = await res.json();
      if (data.reply) {
        setChatReply(data.reply);
      } else {
        setChatReply(`Error: ${data.error || 'No reply'}`);
      }
    } catch (e) {
      setChatReply(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setChatRunning(false);
      setChatInput('');
    }
  };

  const toggleSection = (k: string) =>
    setOpenSections((s) => ({ ...s, [k]: !s[k] }));

  const color = detail ? KIND_COLORS[detail.kind] : 'var(--color-accent)';

  return (
    <>
      <div
        className="agent-detail-overlay"
        onClick={close}
        aria-hidden="true"
        data-testid="agent-detail-overlay"
      />
      <aside
        className="agent-detail-drawer"
        style={{ borderLeft: `1px solid var(--color-border)` }}
        role="dialog"
        aria-modal="true"
        aria-label={detail ? `${detail.label} details` : 'Agent details'}
        data-testid="agent-detail-drawer"
      >
        {/* Header */}
        <header className="agent-detail-header">
          <button
            onClick={close}
            className="agent-detail-back"
            aria-label="Back to agent list"
            data-testid="agent-detail-back"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="agent-detail-title">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
              style={{ background: `${color}1a`, color }}
            >
              {detail?.label?.charAt(0) || <Cpu size={14} />}
            </div>
            <div>
              <h2 className="agent-detail-h2" style={{ color: 'var(--color-foreground)' }}>
                {detail?.label || selectedAgentId}
              </h2>
              <div className="flex items-center gap-1.5 text-xs" style={{ color }}>
                {detail ? (
                  <>
                    <CircleDot size={10} />
                    <span>{detail.kind} · {detail.capabilities.length} capabilities</span>
                  </>
                ) : (
                  <span style={{ color: 'var(--color-muted)' }}>Loading…</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={close}
            className="agent-detail-close"
            aria-label="Close"
            data-testid="agent-detail-close"
          >
            <X size={16} />
          </button>
        </header>

        {/* Content */}
        <div className="agent-detail-body">
          {loading && (
            <div className="agent-detail-loading">
              <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Loading agent definition…
              </p>
            </div>
          )}

          {error && !loading && (
            <div
              className="p-4 rounded-lg text-sm"
              style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-danger)' }}
            >
              {error}
            </div>
          )}

          {detail && !loading && (
            <>
              <section className="agent-detail-section">
                <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{detail.description}</p>
              </section>

              {/* Health probe summary */}
              {detail.health && (
                <section className="agent-detail-section">
                  <div
                    className="p-3 rounded-lg flex items-center gap-2"
                    style={{ background: 'var(--color-surface-hover)' }}
                  >
                    {detail.env.envVarSet ? <Wifi size={14} style={{ color }} /> : <WifiOff size={14} style={{ color: 'var(--color-danger)' }} />}
                    <code className="text-xs font-mono" style={{ color: 'var(--color-foreground)' }}>
                      {detail.health.envVar}={detail.env.resolvedUrl || detail.health.defaultUrl}
                    </code>
                    <span className="text-xs ml-auto" style={{ color: 'var(--color-muted)' }}>
                      {detail.env.envVarSet ? 'env set' : 'default'}
                    </span>
                  </div>
                </section>
              )}

              {/* Capabilities */}
              <section className="agent-detail-section">
                <SectionHeader title="Capabilities" />
                <div className="flex flex-wrap gap-1.5">
                  {detail.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{ background: 'var(--color-surface-hover)', color: 'var(--color-foreground)' }}
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </section>

              {/* Actions */}
              {detail.actions.length > 0 && (
                <section className="agent-detail-section">
                  <button
                    onClick={() => toggleSection('actions')}
                    className="agent-detail-section-toggle"
                    aria-expanded={openSections.actions}
                  >
                    {openSections.actions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Terminal size={14} />
                    <span>Actions ({detail.actions.length})</span>
                  </button>
                  {openSections.actions && (
                    <div className="space-y-2 mt-2">
                      {detail.actions.map((action) => {
                        const result = actionResults[action.id];
                        const running = runningAction === action.id;
                        return (
                          <div
                            key={action.id}
                            className="p-3 rounded-lg"
                            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div>
                                <div className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                                  {action.label}
                                </div>
                                <code className="text-xs font-mono" style={{ color: 'var(--color-accent)' }}>
                                  {action.bin} {action.args.join(' ')}
                                </code>
                              </div>
                              <button
                                onClick={() => runAction(action.id)}
                                disabled={running}
                                className="agent-detail-run-btn"
                                data-testid={`run-action-${action.id}`}
                              >
                                {running ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                                <span>Run</span>
                              </button>
                            </div>
                            {result && (
                              <ActionResultBox result={result} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* HTTP Endpoints */}
              {detail.httpEndpoints && detail.httpEndpoints.length > 0 && (
                <section className="agent-detail-section">
                  <button
                    onClick={() => toggleSection('http')}
                    className="agent-detail-section-toggle"
                    aria-expanded={openSections.http}
                  >
                    {openSections.http ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Globe size={14} />
                    <span>HTTP Endpoints ({detail.httpEndpoints.length})</span>
                  </button>
                  {openSections.http && (
                    <div className="space-y-2 mt-2">
                      {detail.httpEndpoints.map((endpoint) => {
                        const result = endpointResults[endpoint.id];
                        const running = runningEndpoint === endpoint.id;
                        const params = endpointParams[endpoint.id] || {};
                        return (
                          <div
                            key={endpoint.id}
                            className="p-3 rounded-lg"
                            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className="text-xs font-mono px-1.5 py-0.5 rounded"
                                    style={{ background: endpoint.method === 'GET' ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)', color: endpoint.method === 'GET' ? 'var(--color-openclaw)' : 'var(--color-accent)' }}
                                  >
                                    {endpoint.method}
                                  </span>
                                  <code className="text-xs font-mono" style={{ color: 'var(--color-foreground)' }}>
                                    {endpoint.path}
                                  </code>
                                </div>
                                <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                                  {endpoint.description}
                                </div>
                              </div>
                              <button
                                onClick={() => runEndpoint(endpoint)}
                                disabled={running}
                                className="agent-detail-run-btn"
                                data-testid={`run-endpoint-${endpoint.id}`}
                              >
                                {running ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                                <span>Call</span>
                              </button>
                            </div>
                            {endpoint.params && endpoint.params.length > 0 && (
                              <div className="space-y-1.5 mb-2">
                                {endpoint.params.map((p) => (
                                  <input
                                    key={p.name}
                                    type="text"
                                    placeholder={p.placeholder || `${p.label}${p.required ? ' (required)' : ''}`}
                                    value={params[p.name] || ''}
                                    onChange={(e) =>
                                      setEndpointParams((prev) => ({
                                        ...prev,
                                        [endpoint.id]: { ...(prev[endpoint.id] || {}), [p.name]: e.target.value },
                                      }))
                                    }
                                    className="agent-detail-input"
                                    data-testid={`param-${endpoint.id}-${p.name}`}
                                  />
                                ))}
                              </div>
                            )}
                            {result && (
                              <EndpointResultBox result={result} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* Inline chat */}
              {detail.chatCommand && (
                <section className="agent-detail-section">
                  <button
                    onClick={() => toggleSection('chat')}
                    className="agent-detail-section-toggle"
                    aria-expanded={openSections.chat}
                  >
                    {openSections.chat ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <MessageSquare size={14} />
                    <span>Chat</span>
                  </button>
                  {openSections.chat && (
                    <div className="space-y-2 mt-2">
                      <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                        Routes to <code style={{ color: 'var(--color-accent)' }}>{detail.chatCommand.bin} {detail.chatCommand.args.join(' ')}</code>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                          placeholder="Type a message…"
                          className="agent-detail-input flex-1"
                          disabled={chatRunning}
                          data-testid="agent-chat-input"
                        />
                        <button
                          onClick={sendChat}
                          disabled={!chatInput.trim() || chatRunning}
                          className="agent-detail-run-btn"
                          data-testid="agent-chat-send"
                        >
                          {chatRunning ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                          <span>Send</span>
                        </button>
                      </div>
                      {chatReply !== null && (
                        <pre
                          className="agent-detail-pre"
                          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        >
                          {chatReply}
                        </pre>
                      )}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3
      className="text-xs font-semibold uppercase tracking-wider mb-2"
      style={{ color: 'var(--color-muted)' }}
    >
      {title}
    </h3>
  );
}

function ActionResultBox({ result }: { result: ActionResult }) {
  return (
    <div
      className="p-2 rounded-lg text-xs font-mono mt-2"
      style={{
        background: 'var(--color-surface-hover)',
        border: `1px solid ${result.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: result.ok ? 'var(--color-openclaw)' : 'var(--color-danger)' }}>
          exit {result.exitCode}
        </span>
        <span style={{ color: 'var(--color-muted)' }}>{result.durationMs}ms</span>
        {result.error && <span style={{ color: 'var(--color-danger)' }}>· {result.error}</span>}
      </div>
      {result.stdout && (
        <pre className="agent-detail-pre" style={{ color: 'var(--color-foreground)' }}>{result.stdout}</pre>
      )}
      {result.stderr && (
        <pre className="agent-detail-pre" style={{ color: 'var(--color-danger)' }}>{result.stderr}</pre>
      )}
      {!result.stdout && !result.stderr && !result.error && (
        <div style={{ color: 'var(--color-muted)' }}>(no output)</div>
      )}
    </div>
  );
}

function EndpointResultBox({ result }: { result: EndpointResult }) {
  return (
    <div
      className="p-2 rounded-lg text-xs font-mono mt-2"
      style={{
        background: 'var(--color-surface-hover)',
        border: `1px solid ${result.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
      }}
    >
      {result.status !== undefined && (
        <div className="flex items-center gap-2 mb-1">
          <span style={{ color: result.ok ? 'var(--color-openclaw)' : 'var(--color-danger)' }}>
            HTTP {result.status}
          </span>
          {result.error && <span style={{ color: 'var(--color-danger)' }}>· {result.error}</span>}
        </div>
      )}
      {result.error && !result.status && (
        <div style={{ color: 'var(--color-danger)' }}>{result.error}</div>
      )}
      {result.body && (
        <pre className="agent-detail-pre" style={{ color: 'var(--color-foreground)', maxHeight: '200px', overflow: 'auto' }}>{result.body}</pre>
      )}
    </div>
  );
}
