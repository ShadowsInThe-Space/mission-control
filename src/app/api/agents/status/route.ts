import { NextResponse } from 'next/server';
import { runShellCommand } from '@/lib/agent-shell';
import { isVaultAvailable } from '@/lib/obsidian-export';
import { writeJournalEntry, writeMemoryNote, listJournalEntries } from '@/lib/obsidian-export';

async function getHermesStatus() {
  try {
    const { stdout } = await runShellCommand('hermes', ['--version']);
    return { type: 'hermes' as const, name: 'Hermes Agent', version: stdout.trim(), status: 'online' as const, lastSeen: Date.now(), info: { version: stdout.trim() } };
  } catch { return { type: 'hermes' as const, name: 'Hermes Agent', version: '?', status: 'offline' as const, lastSeen: Date.now(), info: {} }; }
}
async function getOpenClawStatus() {
  try {
    const { stdout } = await runShellCommand('openclaw', ['--version']);
    return { type: 'openclaw' as const, name: 'OpenClaw', version: stdout.trim(), status: 'online' as const, lastSeen: Date.now(), info: {} };
  } catch { return { type: 'openclaw' as const, name: 'OpenClaw', version: '?', status: 'offline' as const, lastSeen: Date.now(), info: {} }; }
}
async function getClaudeStatus() {
  try {
    const bin = '/home/z3r0b1nary/mission-control/node_modules/.bin/claude-code';
    const { stdout } = await runShellCommand(bin, ['--version']);
    return { type: 'claude' as const, name: 'Claude Code', version: stdout.trim(), status: 'online' as const, lastSeen: Date.now(), info: {} };
  } catch { return { type: 'claude' as const, name: 'Claude Code', version: '?', status: 'offline' as const, lastSeen: Date.now(), info: { install: 'npm i @anthropic-ai/claude-code' } }; }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.pathname.endsWith('/agents/status')) {
    const [hermes, openclaw, claude] = await Promise.all([getHermesStatus(), getOpenClawStatus(), getClaudeStatus()]);
    return NextResponse.json({ hermes, openclaw, claude });
  }
  if (url.pathname.endsWith('/obsidian')) {
    if (!isVaultAvailable()) return NextResponse.json({ error: 'Vault not available' }, { status: 503 });
    return NextResponse.json({ vault: true, entries: listJournalEntries() });
  }
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!url.pathname.endsWith('/obsidian')) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!isVaultAvailable()) return NextResponse.json({ error: 'Vault not available' }, { status: 503 });
  try {
    const body = await request.json();
    const { type, date, title, content, tags } = body;
    if (type === 'journal') return NextResponse.json(writeJournalEntry(date, content));
    if (type === 'memory') return NextResponse.json(writeMemoryNote(title, content, tags || []));
    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
