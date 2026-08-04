import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { getVaultPath, isVaultAvailable } from '@/lib/obsidian-export';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HELP_DIR = 'mission-control-help';

/**
 * GET /api/help
 *   → lists all .md files in the mission-control-help/ vault subdir.
 * GET /api/help?file=<filename>
 *   → returns the raw markdown content of a single help file.
 *
 * Security: paths are constrained to the help subdir; any traversal
 * attempt (.., absolute paths) is rejected with 400.
 */
export async function GET(request: Request) {
  if (!isVaultAvailable()) {
    return NextResponse.json(
      { ok: false, error: 'mywiki vault not found. Set MISSION_CONTROL_MYWIKI_PATH.' },
      { status: 503 }
    );
  }

  const vault = getVaultPath();
  const helpDir = path.join(vault, HELP_DIR);

  if (!fs.existsSync(helpDir)) {
    return NextResponse.json(
      { ok: false, error: `Help directory not found: ${HELP_DIR}/. Create it in your vault.` },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');

  // ── Read a single file ──
  if (file) {
    // Reject traversal / absolute paths
    if (file.includes('..') || file.includes('/') || file.includes('\\') || file.startsWith('.')) {
      return NextResponse.json({ ok: false, error: 'Invalid filename' }, { status: 400 });
    }
    const safeName = file.endsWith('.md') ? file : `${file}.md`;
    const filePath = path.join(helpDir, safeName);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ ok: false, error: `File not found: ${safeName}` }, { status: 404 });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json({ ok: true, file: safeName, content });
  }

  // ── List all help files ──
  const files = fs
    .readdirSync(helpDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      // Extract title from YAML frontmatter, fall back to filename
      const raw = fs.readFileSync(path.join(helpDir, f), 'utf-8');
      const titleMatch = raw.match(/^title:\s*(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : f.replace(/\.md$/, '');
      return { file: f, title };
    })
    .sort((a, b) => {
      // index.md always first
      if (a.file === 'index.md') return -1;
      if (b.file === 'index.md') return 1;
      return a.title.localeCompare(b.title);
    });

  return NextResponse.json({ ok: true, files, dir: HELP_DIR });
}
