/**
 * Shared mywiki export
 * Writes session logs and memory exports to the Obsidian-backed mywiki vault.
 */

import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_VAULT_PATH = '/home/z3r0b1nary/workspace/mywiki';

function resolveVaultPathFromEnv(): string {
  return process.env.MISSION_CONTROL_MYWIKI_PATH?.trim()
    || process.env.MYWIKI_PATH?.trim()
    || DEFAULT_VAULT_PATH;
}

interface ExportOptions {
  vaultPath?: string;
}

function getResolvedVaultPath(options: ExportOptions = {}): string {
  return options.vaultPath || resolveVaultPathFromEnv();
}

function ensureVault(options: ExportOptions = {}): boolean {
  const vaultPath = getResolvedVaultPath(options);
  if (!fs.existsSync(vaultPath)) {
    console.error('[ObsidianExport] Vault not found at', vaultPath);
    return false;
  }
  return true;
}

export function getVaultPath(): string {
  return resolveVaultPathFromEnv();
}

export function isVaultAvailable(): boolean {
  return fs.existsSync(resolveVaultPathFromEnv());
}

/** Write a daily journal entry */
export function writeJournalEntry(date: string, content: string, options: ExportOptions = {}): { success: boolean; path: string } {
  if (!ensureVault(options)) return { success: false, path: '' };
  const vaultPath = getResolvedVaultPath(options);
  const sessionsDir = path.join(vaultPath, 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
  }
  const filePath = path.join(sessionsDir, `${date}-mission-control-log.md`);
  const frontmatter = `---
date: ${date}
tags: [journal, mission-control]
---\n\n`;
  fs.writeFileSync(filePath, frontmatter + content);
  return { success: true, path: filePath };
}

/** Export a memory note */
export function writeMemoryNote(title: string, content: string, tags: string[] = [], options: ExportOptions = {}): { success: boolean; path: string } {
  if (!ensureVault(options)) return { success: false, path: '' };
  const vaultPath = getResolvedVaultPath(options);
  const memoriesDir = path.join(vaultPath, 'agent-memory');
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
  const sessionsDir = path.join(resolveVaultPathFromEnv(), 'sessions');
  if (!fs.existsSync(sessionsDir)) return [];
  return fs.readdirSync(sessionsDir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .reverse();
}

/** Read a journal entry */
export function readJournalEntry(date: string): string | null {
  const filePath = path.join(resolveVaultPathFromEnv(), 'sessions', `${date}-mission-control-log.md`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

/** Write a structured session log to sessions/ (handoff, agent, or any structured log) */
export function writeSessionLog(name: string, content: string, options: ExportOptions = {}): { success: boolean; path: string } {
  if (!ensureVault(options)) return { success: false, path: '' };
  const vaultPath = getResolvedVaultPath(options);
  const sessionsDir = path.join(vaultPath, 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
  }
  const safeName = name
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  const filePath = path.join(sessionsDir, `${safeName}.md`);
  fs.writeFileSync(filePath, content);
  return { success: true, path: filePath };
}
