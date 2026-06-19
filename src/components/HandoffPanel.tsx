'use client';

import { useState } from 'react';
import { ArrowRightLeft, Play, RefreshCw, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, FileText } from 'lucide-react';

type HandoffPattern = 'research-to-build' | 'audit-to-report' | 'brief-to-spec' | 'custom';
type ChatAgentId = 'claude' | 'gemini' | 'mmx' | 'codex' | 'ollama' | 'antigravity' | 'hermes';

const CHAT_AGENTS: ChatAgentId[] = ['claude', 'gemini', 'mmx', 'codex', 'ollama', 'antigravity', 'hermes'];

const PATTERNS: { id: HandoffPattern; label: string; description: string }[] = [
  { id: 'research-to-build', label: 'Research → Build', description: 'Research agent gathers data, build agent generates a spec' },
  { id: 'audit-to-report', label: 'Audit → Report', description: 'Convert audit data into a customer-facing report' },
  { id: 'brief-to-spec', label: 'Brief → Spec', description: 'Expand a brief into a detailed spec' },
  { id: 'custom', label: 'Custom', description: 'Pass-through chain with no transformation' },
];

interface HandoffStage {
  agent: string;
  input: string;
  output: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

interface HandoffResult {
  ok: boolean;
  pattern: HandoffPattern;
  from: string;
  to: string;
  stages: HandoffStage[];
  vaultSessionPath?: string;
  totalDurationMs: number;
  error?: string;
}

export default function HandoffPanel() {
  const [pattern, setPattern] = useState<HandoffPattern>('research-to-build');
  const [from, setFrom] = useState<ChatAgentId>('claude');
  const [to, setTo] = useState<ChatAgentId>('claude');
  const [outSession, setOutSession] = useState('');

  // Pattern-specific inputs
  const [topic, setTopic] = useState('');
  const [domain, setDomain] = useState('');
  const [auditData, setAuditData] = useState('');
  const [brief, setBrief] = useState('');
  const [payload, setPayload] = useState('');

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<HandoffResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function defaultSessionName() {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${pattern}-${ts}`;
  }

  function isReady(): boolean {
    if (pattern === 'research-to-build') return topic.trim().length > 0 && domain.trim().length > 0;
    if (pattern === 'audit-to-report') return auditData.trim().length > 0;
    if (pattern === 'brief-to-spec') return brief.trim().length > 0;
    return payload.trim().length > 0;
  }

  async function run() {
    if (!isReady() || running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const body: Record<string, unknown> = { pattern, outSession: outSession || defaultSessionName() };
      if (pattern === 'research-to-build') {
        body.topic = topic;
        body.domain = domain;
      } else if (pattern === 'audit-to-report') {
        body.auditData = auditData;
      } else if (pattern === 'brief-to-spec') {
        body.brief = brief;
      } else {
        body.from = from;
        body.to = to;
        body.payload = payload;
      }
      const res = await fetch('/api/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
      } else {
        setResult(data as HandoffResult);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <ArrowRightLeft size={16} style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>
            Cross-Agent Handoff
          </h1>
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
            M7 v0 — Goldie Mission Stack pattern
          </span>
        </div>
        <button
          onClick={run}
          disabled={!isReady() || running}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          {running ? (
            <>
              <RefreshCw size={14} className="animate-spin" /> Running…
            </>
          ) : (
            <>
              <Play size={14} /> Run Handoff
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-4xl">
        {/* Pattern + agents */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Field label="Pattern">
            <select
              value={pattern}
              onChange={(e) => setPattern(e.target.value as HandoffPattern)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--color-surface)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
            >
              {PATTERNS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
              {PATTERNS.find((p) => p.id === pattern)?.description}
            </div>
          </Field>

          {pattern === 'custom' && (
            <>
              <Field label="From agent">
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value as ChatAgentId)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
                >
                  {CHAT_AGENTS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="To agent">
                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value as ChatAgentId)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
                >
                  {CHAT_AGENTS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

          <Field label="Out session (optional)">
            <input
              type="text"
              value={outSession}
              onChange={(e) => setOutSession(e.target.value)}
              placeholder={defaultSessionName()}
              className="w-full px-3 py-2 rounded-lg text-sm font-mono"
              style={{ background: 'var(--color-surface)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
            />
            <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
              Filename in mywiki/sessions/
            </div>
          </Field>
        </div>

        {/* Pattern-specific inputs */}
        {pattern === 'research-to-build' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Field label="Topic">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="AI SEO tools"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-surface)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
              />
            </Field>
            <Field label="Domain">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="DACH Mittelstand"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-surface)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
              />
            </Field>
          </div>
        )}

        {pattern === 'audit-to-report' && (
          <div className="mb-6">
            <Field label="Audit data">
              <textarea
                value={auditData}
                onChange={(e) => setAuditData(e.target.value)}
                placeholder="SCORE: 24, ISSUES: slow LCP, missing meta…"
                rows={6}
                className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                style={{ background: 'var(--color-surface)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
              />
            </Field>
          </div>
        )}

        {pattern === 'brief-to-spec' && (
          <div className="mb-6">
            <Field label="Brief">
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Build me a tool for X with Y, Z, W."
                rows={6}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-surface)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
              />
            </Field>
          </div>
        )}

        {pattern === 'custom' && (
          <div className="mb-6">
            <Field label="Payload">
              <textarea
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                placeholder="The text to pipe from agent A to agent B (unchanged)."
                rows={6}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-surface)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
              />
            </Field>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="flex items-start gap-2 p-4 rounded-lg mb-4"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)' }}
          >
            <AlertCircle size={16} style={{ color: '#ef4444', marginTop: 2 }} />
            <div className="text-sm" style={{ color: '#fca5a5' }}>
              {error}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className="rounded-lg p-4 mb-4"
            style={{
              background: 'var(--color-surface)',
              border: `1px solid ${result.ok ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              {result.ok ? (
                <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
              ) : (
                <AlertCircle size={16} style={{ color: '#ef4444' }} />
              )}
              <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                {result.ok ? 'Handoff complete' : 'Handoff failed'}
              </span>
              <span className="text-xs ml-auto" style={{ color: 'var(--color-muted)' }}>
                {result.totalDurationMs}ms total
              </span>
            </div>

            {result.error && (
              <div className="text-xs mb-3" style={{ color: '#fca5a5' }}>
                {result.error}
              </div>
            )}

            {result.vaultSessionPath && (
              <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
                <FileText size={12} />
                <span className="font-mono">{result.vaultSessionPath}</span>
              </div>
            )}

            <div className="space-y-2">
              {result.stages.map((stage, i) => (
                <StageCard key={i} index={i + 1} stage={stage} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !error && !running && (
          <div className="text-center py-16" style={{ color: 'var(--color-muted)' }}>
            <ArrowRightLeft size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Pick a pattern, fill the inputs, hit Run Handoff.</p>
            <p className="text-xs mt-1">Each handoff writes a session log to mywiki (when outSession is set).</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function StageCard({ index, stage }: { index: number; stage: HandoffStage }) {
  const [open, setOpen] = useState(false);
  const ok = stage.exitCode === 0;
  return (
    <div className="rounded-lg" style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full p-3 text-left"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>
          Stage {index}
        </span>
        <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--color-accent)', color: '#fff' }}>
          {stage.agent}
        </span>
        <span className="text-xs" style={{ color: ok ? '#22c55e' : '#ef4444' }}>
          {ok ? '✓' : '✗'} exit {stage.exitCode}
        </span>
        <span className="text-xs ml-auto" style={{ color: 'var(--color-muted)' }}>
          {stage.durationMs}ms · {stage.output.length} chars out
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <details>
            <summary className="text-xs cursor-pointer" style={{ color: 'var(--color-muted)' }}>
              Input ({stage.input.length} chars)
            </summary>
            <pre
              className="mt-1 p-2 rounded text-xs whitespace-pre-wrap overflow-auto max-h-48"
              style={{ background: 'var(--color-surface)', color: 'var(--color-foreground)' }}
            >
              {stage.input}
            </pre>
          </details>
          <details>
            <summary className="text-xs cursor-pointer" style={{ color: 'var(--color-muted)' }}>
              Output ({stage.output.length} chars)
            </summary>
            <pre
              className="mt-1 p-2 rounded text-xs whitespace-pre-wrap overflow-auto max-h-64"
              style={{ background: 'var(--color-surface)', color: 'var(--color-foreground)' }}
            >
              {stage.output || '(empty)'}
            </pre>
          </details>
          {stage.stderr && (
            <details>
              <summary className="text-xs cursor-pointer" style={{ color: 'var(--color-muted)' }}>
                Stderr
              </summary>
              <pre
                className="mt-1 p-2 rounded text-xs whitespace-pre-wrap overflow-auto max-h-32"
                style={{ background: 'var(--color-surface)', color: '#fca5a5' }}
              >
                {stage.stderr}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
