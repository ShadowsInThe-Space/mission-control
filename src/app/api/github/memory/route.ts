import { NextResponse } from 'next/server';
import {
  listTree,
  readFile,
  writeFile,
  searchText,
  isGhAuthed,
  getConnectedRepo,
  GithubMemoryError,
  clearTreeCache,
} from '@/lib/github-memory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/github/memory
 *   ?tree=true               → { ok, repo, tree, cachedForMs }
 *   ?path=MEMORY.md          → { ok, repo, file: { path, content, sha, size, htmlUrl, truncated } }
 *   ?q=keyword               → { ok, repo, hits: [{ path, snippet, htmlUrl }] }
 *   (no params)              → { ok, repo, authed: true, modes: ['tree', 'path', 'q', 'write'] }
 */
export async function GET(request: Request) {
  const authed = await isGhAuthed();
  if (!authed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'gh CLI is not authenticated. Run `gh auth login` on the host.',
        hint: 'Mission Control uses the local `gh` CLI for GitHub access (no token in env).',
      },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const tree = url.searchParams.get('tree');
  const path = url.searchParams.get('path');
  const q = url.searchParams.get('q');
  const refresh = url.searchParams.get('refresh') === 'true';
  const repo = getConnectedRepo();

  try {
    if (refresh) clearTreeCache();

    if (tree === 'true') {
      const t0 = Date.now();
      const entries = await listTree();
      return NextResponse.json({
        ok: true,
        repo,
        tree: entries,
        cachedForMs: 60_000,
        fetchedInMs: Date.now() - t0,
      });
    }

    if (path) {
      const file = await readFile(path);
      return NextResponse.json({ ok: true, repo, file });
    }

    if (q) {
      const hits = await searchText(q);
      return NextResponse.json({ ok: true, repo, hits });
    }

    return NextResponse.json({
      ok: true,
      repo,
      authed: true,
      modes: ['tree', 'path', 'q', 'write (POST)'],
    });
  } catch (err) {
    if (err instanceof GithubMemoryError) {
      return NextResponse.json(
        { ok: false, error: err.message, repo },
        { status: err.message.includes('Not Found') ? 404 : 502 }
      );
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err), repo },
      { status: 500 }
    );
  }
}

interface WriteBody {
  path: string;
  content: string;
  message: string;
  /** Required for updates. Omit to create a new file. */
  sha?: string;
}

/**
 * POST /api/github/memory
 * Body: { path, content, message, sha? }
 * Returns: { ok, commit: { sha, url, contentSha, path } }
 */
export async function POST(request: Request) {
  const authed = await isGhAuthed();
  if (!authed) {
    return NextResponse.json(
      { ok: false, error: 'gh CLI is not authenticated. Run `gh auth login`.' },
      { status: 503 }
    );
  }

  let body: WriteBody;
  try {
    body = (await request.json()) as WriteBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body?.path || !body?.content || !body?.message) {
    return NextResponse.json(
      { ok: false, error: 'path, content, and message are required' },
      { status: 400 }
    );
  }

  try {
    const result = await writeFile({
      path: body.path,
      content: body.content,
      message: body.message,
      sha: body.sha,
    });
    // Invalidate the tree cache — the repo changed.
    clearTreeCache();
    return NextResponse.json({ ok: true, repo: getConnectedRepo(), commit: result });
  } catch (err) {
    if (err instanceof GithubMemoryError) {
      // 409 conflicts usually come from sha mismatch
      const status = err.message.toLowerCase().includes('does not match') ? 409 : 502;
      return NextResponse.json({ ok: false, error: err.message }, { status });
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
