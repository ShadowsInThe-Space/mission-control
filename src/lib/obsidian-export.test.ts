import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { getVaultPath, writeJournalEntry, writeMemoryNote } from './obsidian-export';

const tempRoots: string[] = [];

function makeTempVault() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mission-control-wiki-'));
  tempRoots.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempRoots.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('obsidian export mywiki integration', () => {
  it('defaults to the shared mywiki vault path', () => {
    expect(getVaultPath()).toBe('/home/z3r0b1nary/workspace/mywiki');
  });

  it('writes session journal exports into the mywiki sessions folder', () => {
    const vaultPath = makeTempVault();

    const result = writeJournalEntry('2026-05-25', 'Agent OS progress', { vaultPath });

    expect(result.success).toBe(true);
    expect(result.path).toBe(path.join(vaultPath, 'sessions', '2026-05-25-mission-control-log.md'));
    expect(fs.readFileSync(result.path, 'utf-8')).toContain('Agent OS progress');
  });

  it('writes durable memory notes into the mywiki agent-memory folder', () => {
    const vaultPath = makeTempVault();

    const result = writeMemoryNote('Agent Registry', 'Current registry notes', ['agents'], { vaultPath });

    expect(result.success).toBe(true);
    expect(result.path).toBe(path.join(vaultPath, 'agent-memory', 'agent-registry.md'));
    expect(fs.readFileSync(result.path, 'utf-8')).toContain('Current registry notes');
  });
});
