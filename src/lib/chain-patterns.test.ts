import { beforeEach, describe, expect, it, vi } from 'vitest';

import { auditToReport, briefToSpec, researchToBuild } from './chain-patterns';
import { RuntimeResult, RunnerInput } from './agent-runtime';

function mockRunner() {
  const fn = vi.fn<(input: RunnerInput) => Promise<RuntimeResult>>();
  return fn;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('chain-patterns', () => {
  it('researchToBuild uses research-to-build pattern and includes topic+domain in payload', async () => {
    const runner = mockRunner();
    runner
      .mockResolvedValueOnce({ stdout: 'r', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: 'b', stderr: '', exitCode: 0 });

    const result = await researchToBuild({
      topic: 'AI SEO tools',
      domain: 'DACH Mittelstand',
      outSession: 'rtb-test',
      vaultPath: '', // test escape hatch — don't write to the real mywiki
      runner,
    });

    expect(result.ok).toBe(true);
    expect(result.pattern).toBe('research-to-build');
    const stage1Args = runner.mock.calls[0][0].args;
    const stage1Input = stage1Args[stage1Args.length - 1];
    expect(stage1Input).toContain('AI SEO tools');
    expect(stage1Input).toContain('DACH Mittelstand');
  });

  it('auditToReport passes audit data as payload and uses audit-to-report pattern', async () => {
    const runner = mockRunner();
    runner
      .mockResolvedValueOnce({ stdout: 'r', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: 'r2', stderr: '', exitCode: 0 });

    const result = await auditToReport({
      auditData: 'SCORE: 24, ISSUES: slow LCP, missing meta',
      outSession: 'a2r-test',
      vaultPath: '',
      runner,
    });

    expect(result.ok).toBe(true);
    expect(result.pattern).toBe('audit-to-report');
    const stage1Args = runner.mock.calls[0][0].args;
    expect(stage1Args[stage1Args.length - 1]).toBe(
      'SCORE: 24, ISSUES: slow LCP, missing meta'
    );
  });

  it('briefToSpec uses brief-to-spec pattern', async () => {
    const runner = mockRunner();
    runner
      .mockResolvedValueOnce({ stdout: 'b1', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: 'b2', stderr: '', exitCode: 0 });

    const result = await briefToSpec({
      brief: 'Build a tool for X',
      outSession: 'b2s-test',
      vaultPath: '',
      runner,
    });

    expect(result.ok).toBe(true);
    expect(result.pattern).toBe('brief-to-spec');
  });
});
