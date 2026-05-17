/**
 * Server-only shell command execution
 * Only import this from API routes — never from client components
 */

import { spawn } from 'child_process';

export function runShellCommand(cmd: string, args: string[], timeout = 10000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { shell: false, timeout });
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d: Buffer) => (stdout += d.toString()));
    proc.stderr?.on('data', (d: Buffer) => (stderr += d.toString()));
    proc.on('close', (code: number) => resolve({ stdout, stderr, exitCode: code ?? 0 }));
    proc.on('error', (e: Error) => resolve({ stdout, stderr: e.message, exitCode: 1 }));
    setTimeout(() => { proc.kill(); resolve({ stdout, stderr: 'TIMEOUT', exitCode: 124 }); }, timeout);
  });
}
