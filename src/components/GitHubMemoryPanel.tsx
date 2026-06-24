'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Brain,
  Search,
  RefreshCw,
  FileText,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Save,
  Edit3,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

// `Github` isn't exported by all lucide-react majors. We render a simple
// inline SVG so the UI doesn't depend on the icon set.
function GithubIcon({ size = 12, color }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color || 'currentColor'}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.11.79-.25.79-.56v-2.18c-3.2.7-3.88-1.37-3.88-1.37-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18.92-.26 1.91-.39 2.89-.39s1.97.13 2.89.39c2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.26 5.69.41.35.78 1.05.78 2.12v3.14c0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

interface TreeEntry {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

interface FileResult {
  path: string;
  content: string;
  sha: string;
  size: number;
  htmlUrl?: string;
}

interface SearchHit {
  path: string;
  snippet: string;
  htmlUrl?: string;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading-tree' }
  | { kind: 'loading-file' }
  | { kind: 'searching' }
  | { kind: 'saving' }
  | { kind: 'saved'; commitUrl: string }
  | { kind: 'error'; message: string };

export default function GitHubMemoryPanel() {
  const [repo, setRepo] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tree, setTree] = useState<TreeEntry[]>([]);
  const [treeFetchedAt, setTreeFetchedAt] = useState<number | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<FileResult | null>(null);
  const [editContent, setEditContent] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchHits, setSearchHits] = useState<SearchHit[] | null>(null);
  const [openDirs, setOpenDirs] = useState<Set<string>>(new Set(['']));
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const loadTree = useCallback(async () => {
    setStatus({ kind: 'loading-tree' });
    try {
      const res = await fetch('/api/github/memory?tree=true');
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus({ kind: 'error', message: data.error || `HTTP ${res.status}` });
        return;
      }
      setRepo(data.repo);
      setAuthed(true);
      setTree(data.tree);
      setTreeFetchedAt(Date.now());
      setStatus({ kind: 'idle' });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  const loadFile = useCallback(async (path: string) => {
    setStatus({ kind: 'loading-file' });
    setEditContent(null);
    setSearchHits(null);
    try {
      const res = await fetch(`/api/github/memory?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus({ kind: 'error', message: data.error || `HTTP ${res.status}` });
        setCurrentFile(null);
        return;
      }
      setCurrentFile(data.file as FileResult);
      setSelectedPath(path);
      setStatus({ kind: 'idle' });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchHits(null);
      return;
    }
    setStatus({ kind: 'searching' });
    try {
      const res = await fetch(`/api/github/memory?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus({ kind: 'error', message: data.error || `HTTP ${res.status}` });
        setSearchHits(null);
        return;
      }
      setSearchHits(data.hits as SearchHit[]);
      setStatus({ kind: 'idle' });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        void runSearch(searchQuery);
      } else {
        setSearchHits(null);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, runSearch]);

  const saveFile = async () => {
    if (!currentFile || editContent === null) return;
    const message = editMessage.trim() || `Update ${currentFile.path} from Mission Control`;
    setStatus({ kind: 'saving' });
    try {
      const res = await fetch('/api/github/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentFile.path,
          content: editContent,
          message,
          sha: currentFile.sha,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus({ kind: 'error', message: data.error || `HTTP ${res.status}` });
        return;
      }
      setStatus({ kind: 'saved', commitUrl: data.commit.commitUrl });
      setEditContent(null);
      setEditMessage('');
      // Reload the file to get its new sha, and refresh the tree.
      await loadFile(currentFile.path);
      void loadTree();
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  // Build the tree structure: nested folders from flat paths.
  const treeStructure = useMemo(() => buildTree(tree), [tree]);

  const isDirty = editContent !== null && currentFile !== null && editContent !== currentFile.content;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 md:px-6 py-4 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Brain size={16} style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>
            Memory
          </h1>
          {repo && (
            <span className="text-xs flex items-center gap-1 truncate" style={{ color: 'var(--color-muted)' }}>
              <GithubIcon size={11} />
              {repo}
            </span>
          )}
        </div>
        <button
          onClick={() => loadTree()}
          disabled={status.kind === 'loading-tree'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
          data-testid="memory-refresh-tree"
        >
          <RefreshCw size={14} className={status.kind === 'loading-tree' ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Status banner */}
      {status.kind === 'error' && (
        <div
          className="mx-4 md:mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 text-sm"
          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-danger)' }}
        >
          <AlertCircle size={14} />
          <span className="flex-1">{status.message}</span>
          <button onClick={() => setStatus({ kind: 'idle' })} className="text-xs underline">
            dismiss
          </button>
        </div>
      )}
      {status.kind === 'saved' && (
        <div
          className="mx-4 md:mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 text-sm"
          style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--color-success)' }}
        >
          <CheckCircle2 size={14} />
          <span className="flex-1">Committed successfully.</span>
          <a
            href={status.commitUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs underline"
            style={{ color: 'var(--color-success)' }}
          >
            View <ExternalLink size={10} />
          </a>
          <button onClick={() => setStatus({ kind: 'idle' })} className="text-xs underline">
            dismiss
          </button>
        </div>
      )}

      {/* Search bar */}
      <div className="px-4 md:px-6 pt-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
          <input
            type="text"
            placeholder="Search repo (min 2 chars)…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-foreground)',
            }}
            data-testid="memory-search"
          />
        </div>
        {searchHits && (
          <div
            className="mt-2 rounded-lg overflow-hidden"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            {searchHits.length === 0 ? (
              <div className="px-3 py-2 text-xs" style={{ color: 'var(--color-muted)' }}>
                No matches for &quot;{searchQuery}&quot;.
              </div>
            ) : (
              searchHits.map((hit) => (
                <button
                  key={hit.path}
                  onClick={() => loadFile(hit.path)}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--color-surface-hover)] border-b last:border-0"
                  style={{ borderColor: 'var(--color-border)' }}
                  data-testid={`search-hit-${hit.path}`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--color-accent)' }}>
                    <FileText size={11} />
                    {hit.path}
                  </div>
                  {hit.snippet && (
                    <div className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-muted)' }}>
                      {hit.snippet}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Body: tree + viewer */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[280px_1fr] gap-0 md:gap-4 p-4 md:p-6">
        {/* Tree */}
        <div
          className="hidden md:block rounded-lg overflow-y-auto p-2"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', maxHeight: '60vh' }}
          data-testid="memory-tree"
        >
          {treeStructure.length === 0 ? (
            <div className="text-xs px-2 py-3" style={{ color: 'var(--color-muted)' }}>
              {authed === false ? 'gh CLI not authenticated.' : 'Loading tree…'}
            </div>
          ) : (
            treeStructure.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                depth={0}
                openDirs={openDirs}
                setOpenDirs={setOpenDirs}
                selectedPath={selectedPath}
                onSelect={loadFile}
              />
            ))
          )}
        </div>

        {/* Mobile file picker */}
        <div className="md:hidden mb-3">
          <select
            value={selectedPath || ''}
            onChange={(e) => e.target.value && loadFile(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-foreground)',
            }}
            data-testid="memory-mobile-select"
          >
            <option value="">Select a file…</option>
            {tree.filter((e) => e.type === 'blob').map((e) => (
              <option key={e.path} value={e.path}>
                {e.path}
              </option>
            ))}
          </select>
        </div>

        {/* File viewer / editor */}
        <div
          className="rounded-lg overflow-hidden flex flex-col"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          {!currentFile ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center" style={{ color: 'var(--color-muted)' }}>
              <div>
                <FileText size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a file from the tree to read or edit.</p>
                {treeFetchedAt && (
                  <p className="text-xs mt-2">
                    {tree.length} files indexed. Tree cached for 60s.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <div
                className="flex items-center justify-between gap-2 px-3 py-2 border-b"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono truncate" style={{ color: 'var(--color-accent)' }}>
                    {currentFile.path}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {currentFile.size} bytes · sha {currentFile.sha.slice(0, 8)}
                    {currentFile.htmlUrl && (
                      <>
                        {' · '}
                        <a
                          href={currentFile.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 underline"
                        >
                          GitHub <ExternalLink size={9} />
                        </a>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {editContent === null ? (
                    <button
                      onClick={() => {
                        setEditContent(currentFile.content);
                        setEditMessage('');
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                      style={{ background: 'var(--color-surface-hover)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' }}
                      data-testid="memory-edit-btn"
                    >
                      <Edit3 size={11} />
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditContent(null);
                          setEditMessage('');
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: 'transparent', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveFile}
                        disabled={!isDirty || status.kind === 'saving'}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                        style={{
                          background: isDirty ? 'var(--color-accent)' : 'var(--color-surface-hover)',
                          color: isDirty ? '#fff' : 'var(--color-muted)',
                          border: '1px solid var(--color-border)',
                          opacity: status.kind === 'saving' ? 0.5 : 1,
                        }}
                        data-testid="memory-save-btn"
                      >
                        {status.kind === 'saving' ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                        Save
                      </button>
                    </>
                  )}
                </div>
              </div>
              {editContent !== null ? (
                <div className="flex-1 flex flex-col">
                  <input
                    type="text"
                    placeholder="Commit message (default: 'Update <path> from Mission Control')"
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                    className="mx-3 mt-3 px-3 py-2 rounded-lg text-xs"
                    style={{
                      background: 'var(--color-surface-hover)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-foreground)',
                    }}
                    data-testid="memory-commit-msg"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="flex-1 m-3 p-3 rounded-lg font-mono text-xs"
                    style={{
                      background: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-foreground)',
                      minHeight: '300px',
                      resize: 'vertical',
                    }}
                    spellCheck={false}
                    data-testid="memory-editor"
                  />
                </div>
              ) : (
                <pre
                  className="flex-1 overflow-auto p-4 text-xs font-mono"
                  style={{ color: 'var(--color-foreground)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  data-testid="memory-content"
                >
                  {currentFile.content}
                </pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface TreeNode {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  children?: TreeNode[];
}

function buildTree(entries: TreeEntry[]): TreeNode[] {
  type Mutable = { name: string; path: string; type: 'blob' | 'tree'; children?: Map<string, Mutable> };
  const root = new Map<string, Mutable>();
  for (const e of entries) {
    const parts = e.path.split('/');
    let level = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join('/');
      let node = level.get(part);
      if (!node) {
        node = { name: part, path, type: isLast ? e.type : 'tree' };
        if (!isLast) node.children = new Map();
        level.set(part, node);
      }
      if (isLast) {
        node.type = e.type;
      } else if (node.children) {
        level = node.children;
      }
    }
  }
  // Sort + convert
  const sortNodes = (nodes: Map<string, Mutable>): TreeNode[] => {
    return Array.from(nodes.values())
      .sort((a, b) => {
        if ((a.type === 'tree') !== (b.type === 'tree')) return a.type === 'tree' ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map<TreeNode>((n) => ({
        name: n.name,
        path: n.path,
        type: n.type,
        children: n.children ? sortNodes(n.children) : undefined,
      }));
  };
  return sortNodes(root);
}

function TreeNode({
  node,
  depth,
  openDirs,
  setOpenDirs,
  selectedPath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  openDirs: Set<string>;
  setOpenDirs: (s: Set<string>) => void;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const isOpen = openDirs.has(node.path);
  const isSelected = selectedPath === node.path;
  if (node.type === 'tree') {
    return (
      <div>
        <button
          onClick={() => {
            const next = new Set(openDirs);
            if (isOpen) next.delete(node.path);
            else next.add(node.path);
            setOpenDirs(next);
          }}
          className="w-full flex items-center gap-1 px-2 py-1 text-left text-xs hover:bg-[var(--color-surface-hover)] rounded"
          style={{ paddingLeft: `${depth * 12 + 8}px`, color: 'var(--color-foreground)' }}
        >
          {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          {isOpen ? <FolderOpen size={11} /> : <Folder size={11} />}
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen && node.children && (
          <div>
            {node.children.map((c) => (
              <TreeNode
                key={c.path}
                node={c}
                depth={depth + 1}
                openDirs={openDirs}
                setOpenDirs={setOpenDirs}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <button
      onClick={() => onSelect(node.path)}
      className="w-full flex items-center gap-1 px-2 py-1 text-left text-xs rounded"
      style={{
        paddingLeft: `${depth * 12 + 8}px`,
        background: isSelected ? 'rgba(99,102,241,0.15)' : 'transparent',
        color: isSelected ? 'var(--color-accent)' : 'var(--color-foreground)',
      }}
      data-testid={`tree-file-${node.path}`}
    >
      <FileText size={11} />
      <span className="truncate">{node.name}</span>
    </button>
  );
}
