/**
 * Obsidian Vault Export
 * Writes journal entries and memory exports to ~/obsidian-vault/
 */

import * as fs from 'fs';
import * as path from 'path';

const VAULT_PATH = '/home/z3r0b1nary/obsidian-vault';

function ensureVault(): boolean {
  if (!fs.existsSync(VAULT_PATH)) {
    console.error('[ObsidianExport] Vault not found at', VAULT_PATH);
    return false;
  }
  return true;
}

export function getVaultPath(): string {
  return VAULT_PATH;
}

export function isVaultAvailable(): boolean {
  return fs.existsSync(VAULT_PATH);
}

/** Write a daily journal entry */
export function writeJournalEntry(date: string, content: string): { success: boolean; path: string } {
  if (!ensureVault()) return { success: false, path: '' };
  const journalsDir = path.join(VAULT_PATH, 'journals');
  if (!fs.existsSync(journalsDir)) {
    fs.mkdirSync(journalsDir, { recursive: true });
  }
  const filePath = path.join(journalsDir, `${date}.md`);
  const frontmatter = `---
date: ${date}
tags: [journal, mission-control]
---\n\n`;
  fs.writeFileSync(filePath, frontmatter + content);
  return { success: true, path: filePath };
}

/** Export a memory note */
export function writeMemoryNote(title: string, content: string, tags: string[] = []): { success: boolean; path: string } {
  if (!ensureVault()) return { success: false, path: '' };
  const memoriesDir = path.join(VAULT_PATH, 'memories');
  if (!fs.existsSync(memoriesDir)) {
    fs.mkdirSync(memoriesDir, { recursive: true });
  }
  const safeTitle = title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase();
  const filePath = path.join(memoriesDir, `${safeTitle}.md`);
  const frontmatter = `---
title: ${title}
tags: [memory, ${tags.join(', ')}]
created: ${new Date().toISOString().split('T')[0]}
---\n\n`;
  fs.writeFileSync(filePath, frontmatter + content);
  return { success: true, path: filePath };
}

/** List journal entries */
export function listJournalEntries(): string[] {
  if (!ensureVault()) return [];
  const journalsDir = path.join(VAULT_PATH, 'journals');
  if (!fs.existsSync(journalsDir)) return [];
  return fs.readdirSync(journalsDir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .reverse();
}

/** Read a journal entry */
export function readJournalEntry(date: string): string | null {
  const filePath = path.join(VAULT_PATH, 'journals', `${date}.md`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}
