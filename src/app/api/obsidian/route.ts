import { NextResponse } from 'next/server';
import { writeJournalEntry, writeMemoryNote, isVaultAvailable, listJournalEntries } from '@/lib/obsidian-export';

export async function GET() {
  if (!isVaultAvailable()) {
    return NextResponse.json({ error: 'Vault not available' }, { status: 503 });
  }
  const entries = listJournalEntries();
  return NextResponse.json({ vault: true, entries });
}

export async function POST(request: Request) {
  if (!isVaultAvailable()) {
    return NextResponse.json({ error: 'Vault not available' }, { status: 503 });
  }
  try {
    const body = await request.json();
    const { type, date, title, content, tags } = body;

    if (type === 'journal') {
      const result = writeJournalEntry(date, content);
      return NextResponse.json(result);
    } else if (type === 'memory') {
      const result = writeMemoryNote(title, content, tags || []);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: 'Unknown export type' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
