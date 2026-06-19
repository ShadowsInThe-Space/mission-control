import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { buildAgentCommand } from './agent-registry';

export interface RuntimeResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface RunnerInput {
  bin: string;
  args: string[];
  timeoutMs: number;
  options: {
    shell: false;
    env: Record<string, string | undefined>;
  };
}

export type AgentRunner = (input: RunnerInput) => Promise<RuntimeResult>;

export interface RunAllowedAgentActionOptions {
  runner?: AgentRunner;
}

export async function runAllowedAgentAction(
  agentId: string,
  action: string,
  options: RunAllowedAgentActionOptions = {}
): Promise<RuntimeResult> {
  const command = buildAgentCommand(agentId, action);
  const runner = options.runner ?? spawnRunner;

  return runner({
    bin: command.bin,
    args: command.args,
    timeoutMs: command.timeoutMs,
    options: {
      shell: false,
      env: buildMinimalEnv(),
    },
  });
}

export function buildMinimalEnv(): Record<string, string | undefined> {
  return {
    HOME: process.env.HOME,
    PATH: process.env.PATH,
    NO_COLOR: '1',
  };
}

export async function spawnRunner(input: RunnerInput): Promise<RuntimeResult> {
  return new Promise((resolve) => {
    const proc: ChildProcessWithoutNullStreams = spawn(input.bin, input.args, {
      shell: input.options.shell,
      env: input.options.env as NodeJS.ProcessEnv,
    });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill();
      resolve({ stdout, stderr: `${stderr}TIMEOUT`, exitCode: 124 });
    }, input.timeoutMs);

    proc.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on('error', (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr: error.message, exitCode: 1 });
    });
    proc.on('close', (code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });
  });
}
