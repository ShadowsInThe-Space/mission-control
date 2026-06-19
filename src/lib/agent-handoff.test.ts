import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fsSync from 'fs';
import * as fsp from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { handoff, transformForPattern } from './agent-handoff';
import { RuntimeResult, RunnerInput, spawnRunner } from './agent-runtime';

const tmpRoots: string[] = [];

function makeTmpVault() {
  const dir = fsSync.mkdtempSync(path.join(os.tmpdir(), 'handoff-test-'));
  tmpRoots.push(dir);
  return dir;
}

afterEach(async () => {
  for (const dir of tmpRoots.splice(0)) {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

beforeEach(() => {
  vi.clearAllMocks();
});

function mockRunner() {
  const fn = vi.fn<(input: RunnerInput) => Promise<RuntimeResult>>();
  return fn;
}

// Suppress unused-import warning for the type import we re-export below.
void spawnRunner;

describe('handoff()', () => {
  it('runs from then to with transformed payload (research-to-build)', async () => {
    const runner = mockRunner();
    runner
      .mockResolvedValueOnce({ stdout: 'Research findings: A, B, C', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: 'Spec: Goals, Constraints...', stderr: '', exitCode: 0 });

    const result = await handoff({
      from: 'claude',
      to: 'claude',
      pattern: 'research-to-build',
      payload: 'Build me a tool for X',
      runner,
    });

    expect(result.ok).toBe(true);
    expect(result.stages).toHaveLength(2);
    expect(result.stages[0].agent).toBe('claude');
    expect(result.stages[1].agent).toBe('claude');
    expect(runner).toHaveBeenCalledTimes(2);
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns ok: false when from agent is not chat-capable', async () => {
    const runner = mockRunner();
    const result = await handoff({
      from: 'openclaw', // no chatCommand in registry
      to: 'claude',
      pattern: 'custom',
      payload: 'test',
      runner,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('not chat-capable');
    expect(runner).not.toHaveBeenCalled();
  });

  it('returns ok: false when to agent is not chat-capable', async () => {
    const runner = mockRunner();
    const result = await handoff({
      from: 'claude',
      to: 'openclaw',
      pattern: 'custom',
      payload: 'test',
      runner,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('not chat-capable');
    expect(runner).not.toHaveBeenCalled();
  });

  it('returns ok: false when from agent does not exist', async () => {
    const runner = mockRunner();
    const result = await handoff({
      from: 'nonexistent' as never,
      to: 'claude',
      pattern: 'custom',
      payload: 'test',
      runner,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Unknown agent');
  });

  it('returns ok: false on stage 1 failure', async () => {
    const runner = mockRunner();
    runner.mockResolvedValueOnce({
      stdout: '',
      stderr: 'oops',
      exitCode: 1,
    });

    const result = await handoff({
      from: 'claude',
      to: 'claude',
      pattern: 'research-to-build',
      payload: 'Test',
      runner,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Stage 1');
    expect(result.stages).toHaveLength(1);
  });

  it('returns ok: false on stage 2 failure', async () => {
    const runner = mockRunner();
    runner
      .mockResolvedValueOnce({ stdout: 'Research', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: '', stderr: 'build failed', exitCode: 1 });

    const result = await handoff({
      from: 'claude',
      to: 'claude',
      pattern: 'research-to-build',
      payload: 'Test',
      runner,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Stage 2');
    expect(result.stages).toHaveLength(2);
  });

  it('passes stage 1 output to stage 2 unchanged on custom pattern', async () => {
    const runner = mockRunner();
    runner
      .mockResolvedValueOnce({ stdout: 'A out', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: 'B out', stderr: '', exitCode: 0 });

    await handoff({
      from: 'claude',
      to: 'claude',
      pattern: 'custom',
      payload: 'hello',
      runner,
    });

    const secondCallArgs = runner.mock.calls[1][0].args;
    expect(secondCallArgs).toEqual(['--print', 'A out']);
  });

  it('writes vault session when vaultSessionName and vaultPath are set', async () => {
    const vaultPath = makeTmpVault();
    const runner = mockRunner();
    runner
      .mockResolvedValueOnce({ stdout: 'A', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: 'B', stderr: '', exitCode: 0 });

    const result = await handoff({
      from: 'claude',
      to: 'claude',
      pattern: 'custom',
      payload: 'test',
      vaultSessionName: '2026-06-19-handoff-test',
      vaultPath,
      runner,
    });

    expect(result.ok).toBe(true);
    expect(result.vaultSessionPath).toBeDefined();
    const written = await fsp.readFile(result.vaultSessionPath!, 'utf-8');
    expect(written).toContain('# Cross-Agent Handoff: custom');
    expect(written).toContain('## Stage 1 — claude');
    expect(written).toContain('## Stage 2 — claude');
  });

  it('does not write vault session when vaultSessionName is unset', async () => {
    const vaultPath = makeTmpVault();
    const runner = mockRunner();
    runner
      .mockResolvedValueOnce({ stdout: 'A', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: 'B', stderr: '', exitCode: 0 });

    const result = await handoff({
      from: 'claude',
      to: 'claude',
      pattern: 'custom',
      payload: 'test',
      vaultPath,
      runner,
    });

    expect(result.ok).toBe(true);
    expect(result.vaultSessionPath).toBeUndefined();
  });

  it('records duration for each stage and total', async () => {
    const runner = mockRunner();
    runner
      .mockResolvedValueOnce({ stdout: 'A', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: 'B', stderr: '', exitCode: 0 });

    const result = await handoff({
      from: 'claude',
      to: 'claude',
      pattern: 'custom',
      payload: 'test',
      runner,
    });

    expect(result.stages[0].durationMs).toBeGreaterThanOrEqual(0);
    expect(result.stages[1].durationMs).toBeGreaterThanOrEqual(0);
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('defaults pattern to custom when not provided', async () => {
    const runner = mockRunner();
    runner
      .mockResolvedValueOnce({ stdout: 'A', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: 'B', stderr: '', exitCode: 0 });

    const result = await handoff({
      from: 'claude',
      to: 'claude',
      payload: 'test',
      runner,
    });

    expect(result.pattern).toBe('custom');
  });

  it('preserves stderr in stage result', async () => {
    const runner = mockRunner();
    runner
      .mockResolvedValueOnce({ stdout: 'A', stderr: 'warn A', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: 'B', stderr: '', exitCode: 0 });

    const result = await handoff({
      from: 'claude',
      to: 'claude',
      pattern: 'custom',
      payload: 'test',
      runner,
    });

    expect(result.stages[0].stderr).toBe('warn A');
  });

  it('handles large input payloads without error', async () => {
    const runner = mockRunner();
    const big = 'X'.repeat(10_000);
    runner
      .mockResolvedValueOnce({ stdout: 'A', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: 'B', stderr: '', exitCode: 0 });

    const result = await handoff({
      from: 'claude',
      to: 'claude',
      pattern: 'custom',
      payload: big,
      runner,
    });

    expect(result.ok).toBe(true);
    expect(runner.mock.calls[0][0].args[runner.mock.calls[0][0].args.length - 1]).toBe(big);
  });
});

describe('transformForPattern()', () => {
  it('research-to-build includes research output and original brief', () => {
    const out = transformForPattern('research-to-build', 'R1, R2, R3', 'My brief');
    expect(out).toContain('R1, R2, R3');
    expect(out).toContain('My brief');
    expect(out).toContain('RESEARCH:');
  });

  it('audit-to-report wraps in audit data label', () => {
    const out = transformForPattern('audit-to-report', 'AUDIT_JSON', 'req');
    expect(out).toContain('AUDIT_JSON');
    expect(out).toContain('AUDIT DATA:');
  });

  it('brief-to-spec wraps in brief label', () => {
    const out = transformForPattern('brief-to-spec', 'short brief', 'orig');
    expect(out).toContain('short brief');
    expect(out).toContain('BRIEF:');
  });

  it('custom pattern returns prevOutput unchanged', () => {
    const out = transformForPattern('custom', 'passthrough', 'orig');
    expect(out).toBe('passthrough');
  });
});
