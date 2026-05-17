'use client';

/**
 * Agent Bridge — communicates with:
 * - Hermes Agent  (hermes CLI)
 * - OpenClaw     (openclaw CLI)
 * - Claude Code  (claude CLI via @anthropic-ai/claude-code)
 * 
 * NOTE: Shell execution (runCommand) is in agent-shell.ts and must only
 * be imported from Next.js API routes, never from client components.
 */

export type AgentType = 'hermes' | 'openclaw' | 'claude';

export interface AgentStatus {
  type: AgentType;
  name: string;
  version: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: number;
  info: Record<string, string>;
}

export interface AgentCommand {
  agent: AgentType;
  command: string;
  args?: string[];
  timeout?: number;
}

// Re-export server-only shell runner for use in API routes
export { runShellCommand } from './agent-shell';

let hermesCache: AgentStatus | null = null;
let hermesCacheTime = 0;

export async function getHermesStatus(): Promise<AgentStatus> {
  if (hermesCache && Date.now() - hermesCacheTime < 30000) return hermesCache;
  try {
    const { stdout } = await runHermesCmd(['--version']);
    const version = stdout.trim();
    hermesCache = {
      type: 'hermes',
      name: 'Hermes Agent',
      version,
      status: 'online',
      lastSeen: Date.now(),
      info: { version, project: '/home/z3r0b1nary/.hermes/hermes-agent', python: '3.11.13' },
    };
    hermesCacheTime = Date.now();
    return hermesCache;
  } catch {
    return { type: 'hermes', name: 'Hermes Agent', version: 'unknown', status: 'offline', lastSeen: Date.now(), info: {} };
  }
}

export async function getOpenClawStatus(): Promise<AgentStatus> {
  try {
    const { stdout } = await runOpenClawCmd(['--version']);
    return {
      type: 'openclaw', name: 'OpenClaw', version: stdout.trim(), status: 'online',
      lastSeen: Date.now(), info: { version: stdout.trim(), repo: 'https://github.com/openclaw/openclaw' },
    };
  } catch {
    return { type: 'openclaw', name: 'OpenClaw', version: 'unknown', status: 'offline', lastSeen: Date.now(), info: {} };
  }
}

export async function getClaudeStatus(): Promise<AgentStatus> {
  try {
    const bin = '/home/z3r0b1nary/mission-control/node_modules/.bin/claude-code';
    const { stdout } = await runClaudeCmd(bin, ['--version']);
    return { type: 'claude', name: 'Claude Code', version: stdout.trim(), status: 'online', lastSeen: Date.now(), info: {} };
  } catch {
    return { type: 'claude', name: 'Claude Code', version: 'not installed', status: 'offline', lastSeen: Date.now(), info: { install: 'npm i @anthropic-ai/claude-code' } };
  }
}

// Placeholder functions — these are overridden by the API route using server-side shell calls
async function runHermesCmd(_args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return { stdout: '', stderr: 'client-side', exitCode: 1 };
}
async function runOpenClawCmd(_args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return { stdout: '', stderr: 'client-side', exitCode: 1 };
}
async function runClaudeCmd(_bin: string, _args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return { stdout: '', stderr: 'client-side', exitCode: 1 };
}
