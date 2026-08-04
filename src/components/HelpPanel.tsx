'use client';

import { useEffect, useState, useCallback } from 'react';
import { BookOpen, RefreshCw, AlertCircle } from 'lucide-react';
import Hint from '@/components/Hint';

interface HelpFile {
  file: string;
  title: string;
}

/**
 * Minimal Markdown → React renderer.
 * Covers the subset used by the help pages: headings, bold, inline code,
 * lists, tables, blockquotes, wikilinks, and paragraphs. Intentionally
 * dependency-free — not a full CommonMark parser.
 */
function renderMarkdown(md: string): React.ReactNode {
  // Strip YAML frontmatter
  const body = md.replace(/^---\n[\s\S]*?\n---\n/, '');
  const lines = body.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) { i++; continue; }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = renderInline(headingMatch[2]);
      const sizes = ['text-xl', 'text-lg', 'text-base', 'text-sm'];
      blocks.push(
        <p key={key++} className={`${sizes[level - 1]} font-semibold mt-4 mb-2`} style={{ color: 'var(--color-foreground)' }}>
          {text}
        </p>
      );
      i++; continue;
    }

    // Table
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1].match(/^\|[\s-:|]+\|$/)) {
      const headerCells = line.split('|').slice(1, -1).map((c) => c.trim());
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(lines[i].split('|').slice(1, -1).map((c) => c.trim()));
        i++;
      }
      blocks.push(
        <div key={key++} className="my-3 overflow-x-auto rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
          <table className="w-full text-xs">
            <thead><tr style={{ background: 'var(--color-surface-hover)' }}>
              {headerCells.map((c, ci) => <th key={ci} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--color-foreground)' }}>{renderInline(c)}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ borderTop: '1px solid var(--color-border)' }}>
                  {row.map((c, ci) => <td key={ci} className="px-3 py-2" style={{ color: 'var(--color-muted)' }}>{renderInline(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote key={key++} className="my-2 pl-3 py-2 rounded-r-md text-xs" style={{ borderLeft: '3px solid var(--color-accent)', background: 'var(--color-surface-hover)', color: 'var(--color-muted)' }}>
          {renderInline(quoteLines.join(' '))}
        </blockquote>
      );
      continue;
    }

    // List (unordered)
    if (line.match(/^\s*[-*]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\s*[-*]\s+/)) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-2 ml-4 space-y-1 list-disc text-xs" style={{ color: 'var(--color-muted)' }}>
          {items.map((it, ii) => <li key={ii}>{renderInline(it)}</li>)}
        </ul>
      );
      continue;
    }

    // Paragraph (collect consecutive non-empty, non-special lines)
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !lines[i].match(/^(#{1,4}\s|\s*[-*]\s|>|\|)/)) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="my-2 text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
        {renderInline(paraLines.join(' '))}
      </p>
    );
  }

  return blocks;
}

/** Render inline markdown: **bold**, `code`, [[wikilinks]], [text](url) */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const bold = remaining.match(/^(.*?)\*\*(.+?)\*\*/);
    // Inline code
    const code = remaining.match(/^(.*?)`([^`]+)`/);
    // Wikilink [[name]] or [[name|label]]
    const wiki = remaining.match(/^(.*?)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
    // Link [text](url)
    const link = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)/);

    // Find the earliest match
    const candidates = [bold, code, wiki, link].filter(Boolean) as RegExpMatchArray[];
    if (candidates.length === 0) {
      parts.push(remaining);
      break;
    }
    const earliest = candidates.reduce((a, b) => ((a.index ?? 0) <= (b.index ?? 0) ? a : b));

    if (earliest === bold) {
      if (bold![1]) parts.push(bold![1]);
      parts.push(<strong key={key++} style={{ color: 'var(--color-foreground)' }}>{bold![2]}</strong>);
      remaining = remaining.slice(bold![0].length);
    } else if (earliest === code) {
      if (code![1]) parts.push(code![1]);
      parts.push(<code key={key++} className="px-1 py-0.5 rounded text-[11px]" style={{ background: 'var(--color-surface-hover)', color: 'var(--color-accent)' }}>{code![2]}</code>);
      remaining = remaining.slice(code![0].length);
    } else if (earliest === wiki) {
      if (wiki![1]) parts.push(wiki![1]);
      const target = wiki![2].replace(/\s+/g, '-').toLowerCase() + '.md';
      parts.push(
        <button key={key++} onClick={() => window.dispatchEvent(new CustomEvent('help-navigate', { detail: target }))}
          className="underline" style={{ color: 'var(--color-accent)' }}>
          {wiki![3] || wiki![2]}
        </button>
      );
      remaining = remaining.slice(wiki![0].length);
    } else if (earliest === link) {
      if (link![1]) parts.push(link![1]);
      parts.push(<a key={key++} href={link![3]} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--color-accent)' }}>{link![2]}</a>);
      remaining = remaining.slice(link![0].length);
    } else {
      parts.push(remaining);
      break;
    }
  }
  return parts;
}

export default function HelpPanel() {
  const [files, setFiles] = useState<HelpFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    try {
      const res = await fetch('/api/help', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setFiles(data.files || []);
      // Auto-select index.md on first load
      if (!activeFile && data.files.length > 0) {
        const index = data.files.find((f: HelpFile) => f.file === 'index.md');
        if (index) setActiveFile(index.file);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hilfe konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [activeFile]);

  const loadFile = useCallback(async (file: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/help?file=${encodeURIComponent(file)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setContent(data.content);
      setActiveFile(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Datei konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer to avoid cascading renders (same pattern as AgentsPanel/MonitoringPanel).
    const t = setTimeout(() => void loadList(), 0);
    return () => clearTimeout(t);
  }, [loadList]);

  // Listen for wikilink navigation events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string;
      if (detail) loadFile(detail);
    };
    window.addEventListener('help-navigate', handler);
    return () => window.removeEventListener('help-navigate', handler);
  }, [loadFile]);

  // Load content when activeFile changes
  useEffect(() => {
    if (!activeFile || content) return;
    const t = setTimeout(() => void loadFile(activeFile), 0);
    return () => clearTimeout(t);
  }, [activeFile, content, loadFile]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar: file list */}
      <aside className="w-56 flex-shrink-0 overflow-y-auto border-r p-3" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Hilfe</span>
          <Hint tip="Eingebaute Dokumentation für Mission Control. Liest die Markdown-Dateien aus dem mywiki-Vault (mission-control-help/)." />
        </div>
        {files.map((f) => (
          <button
            key={f.file}
            onClick={() => loadFile(f.file)}
            className="block w-full text-left px-2 py-1.5 rounded-lg text-xs mb-0.5 transition-colors"
            style={{
              background: activeFile === f.file ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: activeFile === f.file ? 'var(--color-accent)' : 'var(--color-muted)',
            }}
          >
            {f.title}
          </button>
        ))}
        {files.length === 0 && !loading && (
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Keine Hilfedateien gefunden. Erstelle Markdown-Dateien in <code>mission-control-help/</code> im mywiki-Vault.
          </p>
        )}
      </aside>

      {/* Main: content */}
      <div className="flex-1 overflow-y-auto p-6">
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>
              {files.find((f) => f.file === activeFile)?.title || 'Hilfe'}
            </h1>
          </div>
          <button
            onClick={() => loadList()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Aktualisieren
          </button>
        </header>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg mb-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-danger)' }}>
            <AlertCircle size={16} style={{ color: 'var(--color-danger)' }} />
            <span className="text-xs" style={{ color: 'var(--color-foreground)' }}>{error}</span>
          </div>
        )}

        {loading && !content ? (
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Lädt…</p>
        ) : (
          <div className="max-w-2xl">
            {renderMarkdown(content)}
          </div>
        )}
      </div>
    </div>
  );
}
