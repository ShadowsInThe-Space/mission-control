import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { getVaultPath, writeJournalEntry, writeMemoryNote, writeSessionLog } from './obsidian-export';

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

  delete process.env.MISSION_CONTROL_MYWIKI_PATH;
  delete process.env.MYWIKI_PATH;
});

describe('obsidian export mywiki integration', () => {
  it('defaults to the shared mywiki vault path', () => {
    expect(getVaultPath()).toBe('/home/z3r0b1nary/workspace/mywiki');
  });

  it('prefers MISSION_CONTROL_MYWIKI_PATH when explicitly set', () => {
    process.env.MISSION_CONTROL_MYWIKI_PATH = '/tmp/mission-control-mywiki';

    expect(getVaultPath()).toBe('/tmp/mission-control-mywiki');
  });

  it('falls back to legacy MYWIKI_PATH when the canonical env var is unset', () => {
    process.env.MYWIKI_PATH = '/tmp/legacy-mywiki';

    expect(getVaultPath()).toBe('/tmp/legacy-mywiki');
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

  it('writes a structured session log into the mywiki sessions folder', () => {
    const vaultPath = makeTempVault();

    const result = writeSessionLog('2026-06-19-handoff-test', '# Cross-Agent Handoff\n\nstage data', { vaultPath });

    expect(result.success).toBe(true);
    expect(result.path).toBe(path.join(vaultPath, 'sessions', '2026-06-19-handoff-test.md'));
    expect(fs.readFileSync(result.path, 'utf-8')).toContain('Cross-Agent Handoff');
  });

  it('sanitizes unsafe characters in session log names', () => {
    const vaultPath = makeTempVault();

    const result = writeSessionLog('2026/06/19 *FOO* handoff!', 'content', { vaultPath });

    expect(result.success).toBe(true);
    expect(result.path).toBe(path.join(vaultPath, 'sessions', '2026-06-19-foo-handoff.md'));
  });
});
