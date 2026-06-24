/**
 * GitHub-backed memory layer for Mission Control.
 *
 * Reads and writes Sonny's `Shadows-In-The-Space/mywiki` repository using
 * the local `gh` CLI (already authenticated). We deliberately avoid putting
 * a GitHub token in the app — `gh` handles auth, rate limits, and TLS.
 *
 * Three operations:
 *   - listTree()         → repo file tree (60s in-memory cache)
 *   - readFile(path)     → decoded text + sha + size
 *   - writeFile(...)     → commit a single file (PUT to /contents)
 *   - searchText(q)      → keyword grep via search/code
 *
 * All errors propagate as `GithubMemoryError` with the actual gh stderr
 * so the UI can show the real reason.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execFileAsync = promisify(execFile);

const DEFAULT_REPO = 'Shadows-In-The-Space/mywiki';
const TREE_CACHE_TTL_MS = 60_000;

export class GithubMemoryError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'GithubMemoryError';
  }
}

interface TreeEntry {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

interface TreeCache {
  fetchedAt: number;
  tree: TreeEntry[];
}

let treeCache: TreeCache | null = null;

function resolveRepo(): string {
  return process.env.MISSION_CONTROL_GITHUB_REPO || DEFAULT_REPO;
}

/** Internal: run `gh` and return stdout. Throws GithubMemoryError on failure. */
async function gh(args: string[], opts: { timeoutMs?: number; allowEmpty?: boolean } = {}) {
  const { timeoutMs = 30_000, allowEmpty = false } = opts;
  try {
    const { stdout, stderr } = await execFileAsync('gh', args, {
      timeout: timeoutMs,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: '1' },
    });
    if (!stdout && !allowEmpty) {
      // gh prints errors on stderr; surface them.
      if (stderr && stderr.trim()) {
        throw new GithubMemoryError(`gh failed: ${stderr.trim()}`);
      }
    }
    return { stdout, stderr };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new GithubMemoryError(`gh ${args[0]} failed: ${message}`, err);
  }
}

/** Returns the full file tree (60s cached). Empty array on hard failure. */
export async function listTree(): Promise<TreeEntry[]> {
  if (treeCache && Date.now() - treeCache.fetchedAt < TREE_CACHE_TTL_MS) {
    return treeCache.tree;
  }
  const repo = resolveRepo();
  const { stdout } = await gh([
    'api',
    `repos/${repo}/git/trees/HEAD?recursive=1`,
  ]);
  let parsed: { tree?: Array<{ path: string; type: string; sha: string; size?: number }> };
  try {
    parsed = JSON.parse(stdout);
  } catch (err) {
    throw new GithubMemoryError('Could not parse gh tree response as JSON', err);
  }
  const tree: TreeEntry[] = (parsed.tree || [])
    .filter((e) => e.type === 'blob' || e.type === 'tree')
    .map((e) => ({
      path: e.path,
      type: e.type === 'tree' ? 'tree' : 'blob',
      sha: e.sha,
      size: e.size,
    }));
  treeCache = { fetchedAt: Date.now(), tree };
  return tree;
}

export function clearTreeCache() {
  treeCache = null;
}

export interface ReadResult {
  path: string;
  content: string;
  sha: string;
  size: number;
  htmlUrl?: string;
  truncated?: boolean;
}

const MAX_FILE_BYTES = 512 * 1024; // 512 KB cap to keep payloads sane

/** Reads a file by path, decodes base64 to utf-8. */
export async function readFile(path: string): Promise<ReadResult> {
  const repo = resolveRepo();
  if (!path || path.includes('..')) {
    throw new GithubMemoryError(`Refusing to read unsafe path: ${path}`);
  }
  const { stdout } = await gh(['api', `repos/${repo}/contents/${encodeURI(path)}`]);
  const parsed = JSON.parse(stdout) as {
    content?: string;
    encoding?: string;
    sha: string;
    size: number;
    html_url?: string;
    name: string;
    path: string;
    truncated?: boolean;
  };
  if (!parsed.content) {
    throw new GithubMemoryError(`No content in response for ${path}`);
  }
  if (parsed.size > MAX_FILE_BYTES) {
    throw new GithubMemoryError(
      `File too large (${parsed.size} bytes > ${MAX_FILE_BYTES} limit): ${path}`
    );
  }
  const content = Buffer.from(parsed.content, 'base64').toString('utf8');
  return {
    path: parsed.path,
    content,
    sha: parsed.sha,
    size: parsed.size,
    htmlUrl: parsed.html_url,
    truncated: parsed.truncated,
  };
}

export interface WriteResult {
  commitSha: string;
  commitUrl: string;
  contentSha: string;
  path: string;
}

interface WriteOptions {
  path: string;
  content: string;
  message: string;
  /** Required when updating an existing file; omit to create a new one. */
  sha?: string;
}

/** Commits a single file. For new files omit `sha`; for updates pass the current sha. */
export async function writeFile(opts: WriteOptions): Promise<WriteResult> {
  const repo = resolveRepo();
  if (!opts.path || opts.path.includes('..')) {
    throw new GithubMemoryError(`Refusing to write unsafe path: ${opts.path}`);
  }
  if (!opts.message || opts.message.trim().length === 0) {
    throw new GithubMemoryError('Commit message is required');
  }
  if (opts.content.length > MAX_FILE_BYTES) {
    throw new GithubMemoryError(
      `Content too large (${opts.content.length} bytes > ${MAX_FILE_BYTES} limit)`
    );
  }
  // Stage the content in a temp file so the `gh api` PUT uses a clean
  // JSON envelope without argv escaping issues.
  const tmpFile = `/tmp/mc-gh-write-${Date.now()}-${process.pid}.json`;
  const payload: Record<string, string> = {
    message: opts.message,
    content: Buffer.from(opts.content, 'utf8').toString('base64'),
  };
  if (opts.sha) payload.sha = opts.sha;
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(payload), { mode: 0o600 });
  } catch (err) {
    throw new GithubMemoryError(`Could not stage commit payload: ${String(err)}`);
  }
  try {
    const { stdout } = await gh([
      'api',
      `repos/${repo}/contents/${encodeURI(opts.path)}`,
      '--input',
      tmpFile,
      '-X',
      'PUT',
      '--header',
      'Content-Type: application/json',
    ], { timeoutMs: 30_000 });
    const parsed = JSON.parse(stdout) as {
      content?: { sha: string };
      commit?: { sha: string; html_url: string };
    };
    if (!parsed.commit || !parsed.content) {
      throw new GithubMemoryError('Unexpected gh response: missing commit or content');
    }
    return {
      commitSha: parsed.commit.sha,
      commitUrl: parsed.commit.html_url,
      contentSha: parsed.content.sha,
      path: opts.path,
    };
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* best effort */ }
  }
}

export interface SearchHit {
  path: string;
  snippet: string;
  htmlUrl?: string;
}

/** Simple keyword search via GitHub's search/code API. Returns up to 30 hits. */
export async function searchText(query: string): Promise<SearchHit[]> {
  const repo = resolveRepo();
  if (!query || query.trim().length < 2) {
    throw new GithubMemoryError('Query must be at least 2 characters');
  }
  const { stdout } = await gh([
    'api',
    `search/code?q=repo:${repo}+${encodeURIComponent(query)}&per_page=30`,
  ]);
  const parsed = JSON.parse(stdout) as {
    items?: Array<{ path: string; html_url: string; text_matches?: Array<{ fragment: string }> }>;
  };
  return (parsed.items || []).map((item) => ({
    path: item.path,
    snippet: item.text_matches?.[0]?.fragment || '',
    htmlUrl: item.html_url,
  }));
}

/** Returns the connected repo (for the UI to display). */
export function getConnectedRepo(): string {
  return resolveRepo();
}

/** Probes the gh auth status. Returns true if `gh auth status` exits 0. */
export async function isGhAuthed(): Promise<boolean> {
  try {
    await gh(['auth', 'status'], { timeoutMs: 5_000 });
    return true;
  } catch {
    return false;
  }
}
