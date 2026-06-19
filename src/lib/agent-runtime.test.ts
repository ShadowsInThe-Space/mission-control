import { describe, expect, it, vi } from 'vitest';
import { runAllowedAgentAction } from './agent-runtime';

describe('agent runtime', () => {
  it('runs only allowlisted agent actions through the injected runner', async () => {
    const runner = vi.fn().mockResolvedValue({ stdout: '2.1.150\n', stderr: '', exitCode: 0 });

    const result = await runAllowedAgentAction('claude', 'version', { runner });

    expect(result).toEqual({ stdout: '2.1.150\n', stderr: '', exitCode: 0 });
    expect(runner).toHaveBeenCalledWith({
      bin: 'claude',
      args: ['--version'],
      timeoutMs: 10_000,
      options: {
        shell: false,
        env: {
          HOME: process.env.HOME,
          PATH: process.env.PATH,
          NO_COLOR: '1',
        },
      },
    });
  });

  it('rejects unknown actions before spawning anything', async () => {
    const runner = vi.fn();

    await expect(runAllowedAgentAction('claude', 'print arbitrary command', { runner })).rejects.toThrow(
      'Action is not allowlisted for claude: print arbitrary command'
    );
    expect(runner).not.toHaveBeenCalled();
  });

  it('does not pass ambient secrets into child process environments', async () => {
    const previous = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'sk-test-secret';
    const runner = vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

    try {
      await runAllowedAgentAction('gemini', 'version', { runner });
    } finally {
      if (previous === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previous;
    }

    const call = runner.mock.calls[0][0];
    expect(call.options.env.OPENAI_API_KEY).toBeUndefined();
  });
});
