'use client';
/* eslint-disable react-hooks/set-state-in-effect */
// This shell intentionally uses setState inside useEffect for history
// hydration and backend probing. The patterns are bounded and safe.


import { useState, useEffect, useCallback } from 'react';
import { Play, RefreshCw, Save, Image as ImageIcon, AlertCircle, CheckCircle2, Send, Music, Video, Mic, Eye, FileText, Loader2 } from 'lucide-react';

export interface StudioField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string | number;
  required?: boolean;
}

export interface StudioConfig {
  id: 'image' | 'video' | 'music' | 'podcast' | 'vision' | 'blog';
  label: string;
  icon: 'image' | 'video' | 'music' | 'podcast' | 'vision' | 'blog';
  apiPath: string;
  capabilities: string[];
  primaryField: { name: string; label: string; placeholder: string; rows?: number };
  fields: StudioField[];
  acceptsImage?: boolean;
  historyStorageKey: string;
}

interface StudioHistoryEntry {
  id: string;
  timestamp: number;
  prompt: string;
  ok: boolean;
  preview?: string; // image URL, video URL, or text excerpt
  error?: string;
  durationMs?: number;
}

interface ApiResponse {
  ok: boolean;
  error?: string;
  hint?: string;
  content?: string;
  preview?: string;
  body?: unknown;
  status?: number;
  source?: string;
  durationMs?: number;
  manualWorkflow?: string[];
}

const ICON_MAP = {
  image: ImageIcon,
  video: Video,
  music: Music,
  podcast: Mic,
  vision: Eye,
  blog: FileText,
} as const;

export default function StudioShell({ config }: { config: StudioConfig }) {
  const Icon = ICON_MAP[config.icon];
  const [values, setValues] = useState<Record<string, string | number>>(() => {
    const initial: Record<string, string | number> = {};
    for (const f of config.fields) {
      if (f.defaultValue !== undefined) initial[f.name] = f.defaultValue;
      else initial[f.name] = '';
    }
    return initial;
  });
  const [primaryValue, setPrimaryValue] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [history, setHistory] = useState<StudioHistoryEntry[]>([]);
  const [backendStatus, setBackendStatus] = useState<{ up: boolean; url: string; error: string | null } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(config.historyStorageKey);
      if (raw) setHistory(JSON.parse(raw) as StudioHistoryEntry[]);
    } catch { /* ignore */ }
  }, [config.historyStorageKey]);

  useEffect(() => {
    if (history.length > 0) {
      try { localStorage.setItem(config.historyStorageKey, JSON.stringify(history.slice(0, 30))); } catch { /* ignore */ }
    }
  }, [history, config.historyStorageKey]);

  // Probe backend on mount (best-effort)
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(config.apiPath, { method: 'GET' });
        const data = await res.json();
        if (data?.backend) {
          setBackendStatus({ up: data.backend.up, url: data.backend.url, error: data.backend.error });
        }
      } catch { /* ignore */ }
    })();
  }, [config.apiPath]);

  const run = useCallback(async () => {
    if (running) return;
    const primary = primaryValue.trim();
    if (!primary) {
      setResult({ ok: false, error: `${config.primaryField.label} is required` });
      return;
    }
    setRunning(true);
    setResult(null);
    const start = Date.now();
    const payload: Record<string, unknown> = { [config.primaryField.name]: primary };
    for (const f of config.fields) {
      if (values[f.name] !== undefined && values[f.name] !== '') {
        payload[f.name] = values[f.name];
      }
    }
    try {
      const res = await fetch(config.apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ApiResponse;
      const durationMs = Date.now() - start;
      const entry: StudioHistoryEntry = {
        id: `h${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        prompt: primary,
        ok: data.ok === true,
        error: data.error,
        durationMs,
        preview: data.content?.slice(0, 200) || (data.body as { url?: string })?.url,
      };
      setResult({ ...data, durationMs });
      setHistory((prev) => [entry, ...prev].slice(0, 30));
    } catch (e) {
      const durationMs = Date.now() - start;
      const error = e instanceof Error ? e.message : String(e);
      setResult({ ok: false, error, durationMs });
      setHistory((prev) => [{
        id: `h${Date.now()}`,
        timestamp: Date.now(),
        prompt: primary,
        ok: false,
        error,
        durationMs,
      }, ...prev].slice(0, 30));
    } finally {
      setRunning(false);
    }
  }, [running, primaryValue, values, config]);

  const onPrimaryKey = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void run();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 md:px-6 py-4 border-b gap-2"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon size={16} style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-base font-semibold truncate" style={{ color: 'var(--color-foreground)' }}>
            {config.label}
          </h1>
          <div className="hidden md:flex items-center gap-1.5 ml-2">
            {config.capabilities.slice(0, 3).map((c) => (
              <span
                key={c}
                className="text-xs px-2 py-0.5 rounded-lg"
                style={{ background: 'var(--color-surface-hover)', color: 'var(--color-muted)' }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
        {backendStatus && (
          <span
            className="text-xs px-2 py-1 rounded-lg flex items-center gap-1"
            style={{
              background: backendStatus.up ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              color: backendStatus.up ? 'var(--color-success)' : 'var(--color-warning)',
            }}
            title={backendStatus.error || backendStatus.url}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: backendStatus.up ? 'var(--color-success)' : 'var(--color-warning)' }}
            />
            {backendStatus.up ? 'Backend up' : 'Backend down'}
          </span>
        )}
      </div>

      {/* Body: 2-column on desktop, stacked on mobile */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 max-w-6xl">
          {/* Input column */}
          <div
            className="rounded-lg p-4 space-y-3"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--color-muted)' }}>
                {config.primaryField.label}
              </label>
              <textarea
                rows={config.primaryField.rows || 3}
                placeholder={config.primaryField.placeholder}
                value={primaryValue}
                onChange={(e) => setPrimaryValue(e.target.value)}
                onKeyDown={onPrimaryKey}
                className="w-full p-3 rounded-lg text-sm resize-vertical"
                style={{
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-foreground)',
                  minHeight: '80px',
                  fontFamily: 'inherit',
                }}
                disabled={running}
                data-testid={`${config.id}-primary-input`}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                Ctrl/⌘+Enter to run
              </p>
            </div>
            {config.fields.length > 0 && (
              <div className="space-y-2.5">
                {config.fields.map((f) => (
                  <div key={f.name}>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-muted)' }}>
                      {f.label}{f.required ? ' *' : ''}
                    </label>
                    {f.type === 'select' ? (
                      <select
                        value={String(values[f.name] ?? '')}
                        onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                        className="w-full p-2 rounded-lg text-sm"
                        style={{
                          background: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-foreground)',
                        }}
                        disabled={running}
                        data-testid={`${config.id}-field-${f.name}`}
                      >
                        <option value="">{f.placeholder || 'Select…'}</option>
                        {(f.options || []).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        rows={2}
                        placeholder={f.placeholder}
                        value={String(values[f.name] ?? '')}
                        onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                        className="w-full p-2 rounded-lg text-sm"
                        style={{
                          background: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-foreground)',
                          fontFamily: 'inherit',
                        }}
                        disabled={running}
                      />
                    ) : (
                      <input
                        type={f.type === 'number' ? 'number' : 'text'}
                        placeholder={f.placeholder}
                        value={String(values[f.name] ?? '')}
                        onChange={(e) => setValues((v) => ({ ...v, [f.name]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                        className="w-full p-2 rounded-lg text-sm"
                        style={{
                          background: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-foreground)',
                        }}
                        disabled={running}
                        data-testid={`${config.id}-field-${f.name}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={run}
              disabled={running || !primaryValue.trim()}
              className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              style={{
                background: running || !primaryValue.trim() ? 'var(--color-surface-hover)' : 'var(--color-accent)',
                color: running || !primaryValue.trim() ? 'var(--color-muted)' : '#fff',
                border: '1px solid var(--color-border)',
                minHeight: '44px',
              }}
              data-testid={`${config.id}-run-btn`}
            >
              {running ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Send size={14} />
                  Run
                </>
              )}
            </button>
          </div>

          {/* Output column */}
          <div
            className="rounded-lg p-4 flex flex-col"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-muted)' }}>
              Result
            </div>
            {running && (
              <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3" style={{ color: 'var(--color-muted)' }}>
                <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                <p className="text-sm">Generating…</p>
              </div>
            )}
            {!running && !result && (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center" style={{ color: 'var(--color-muted)' }}>
                <Icon size={32} className="opacity-40 mb-2" />
                <p className="text-sm">Run a {config.label.toLowerCase()} job to see the result here.</p>
                {backendStatus && !backendStatus.up && (
                  <p className="text-xs mt-3 max-w-xs">
                    Backend offline. Result will show the manual fallback command instead.
                  </p>
                )}
              </div>
            )}
            {!running && result && (
              <ResultBox result={result} kind={config.id} />
            )}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="max-w-6xl mt-6">
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-muted)' }}>
              History ({history.length})
            </div>
            <div
              className="rounded-lg overflow-hidden"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setPrimaryValue(h.prompt)}
                  className="w-full px-3 py-2 text-left border-b last:border-0 hover:bg-[var(--color-surface-hover)]"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center gap-2">
                    {h.ok ? (
                      <CheckCircle2 size={12} style={{ color: 'var(--color-success)' }} />
                    ) : (
                      <AlertCircle size={12} style={{ color: 'var(--color-danger)' }} />
                    )}
                    <span className="text-xs truncate flex-1" style={{ color: 'var(--color-foreground)' }}>
                      {h.prompt.slice(0, 80)}{h.prompt.length > 80 ? '…' : ''}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      {new Date(h.timestamp).toLocaleTimeString()}
                    </span>
                    {h.durationMs !== undefined && (
                      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                        {h.durationMs}ms
                      </span>
                    )}
                  </div>
                  {h.error && (
                    <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--color-danger)' }}>{h.error}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultBox({ result, kind }: { result: ApiResponse; kind: string }) {
  if (!result.ok) {
    return (
      <div
        className="p-3 rounded-lg"
        style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}
        data-testid={`${kind}-result-error`}
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle size={14} style={{ color: 'var(--color-danger)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-danger)' }}>
            {result.status ? `HTTP ${result.status}` : 'Generation failed'}
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>{result.error}</p>
        {result.hint && (
          <div
            className="mt-2 p-2 rounded-lg font-mono text-xs"
            style={{ background: 'var(--color-surface-hover)', color: 'var(--color-accent)' }}
          >
            {result.hint}
          </div>
        )}
        {result.manualWorkflow && (
          <ol className="mt-2 text-xs space-y-1" style={{ color: 'var(--color-muted)' }}>
            {result.manualWorkflow.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        )}
      </div>
    );
  }
  // Success: render the body. For blog it's text. For others it's whatever the backend returned.
  return (
    <div
      className="p-3 rounded-lg"
      style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}
      data-testid={`${kind}-result-success`}
    >
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>
          Success{result.durationMs ? ` in ${result.durationMs}ms` : ''}
          {result.source ? ` (${result.source})` : ''}
        </span>
      </div>
      {result.content && (
        <pre
          className="text-sm whitespace-pre-wrap font-sans"
          style={{ color: 'var(--color-foreground)', maxHeight: '60vh', overflow: 'auto' }}
          data-testid={`${kind}-content`}
        >
          {result.content}
        </pre>
      )}
      {!result.content && result.body !== undefined && (
        <pre
          className="text-xs font-mono"
          style={{ color: 'var(--color-foreground)', maxHeight: '60vh', overflow: 'auto' }}
        >
          {JSON.stringify(result.body, null, 2)}
        </pre>
      )}
    </div>
  );
}
