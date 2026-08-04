import { describe, expect, it } from 'vitest';

import {
  buildAgentChatCommand,
  isAgentChatCapable,
  parseAgentChatRequest,
} from './agent-chat';

describe('parseAgentChatRequest', () => {
  it('accepts the canonical agent chat payload', () => {
    expect(parseAgentChatRequest({ agentId: 'claude', message: 'status' })).toEqual({
      agentId: 'claude',
      message: 'status',
    });
  });

  it('accepts the legacy store payload while normalizing field names', () => {
    expect(parseAgentChatRequest({ agentType: 'hermes', content: 'hello' })).toEqual({
      agentId: 'hermes',
      message: 'hello',
    });
  });

  it('rejects empty messages and unknown agents', () => {
    expect(() => parseAgentChatRequest({ agentId: 'claude', message: '   ' })).toThrow(/message/);
    expect(() => parseAgentChatRequest({ agentId: 'unknown', message: 'hi' })).toThrow(/Unknown agent/);
  });
});

describe('buildAgentChatCommand', () => {
  it('allows non-interactive Claude CLI chat without npx or shell execution', () => {
    expect(buildAgentChatCommand('claude', 'Summarize status')).toEqual({
      bin: 'claude',
      args: ['--print', 'Summarize status'],
      timeoutMs: 120000,
      mode: 'print',
    });
  });

  it('routes Hermes oneshot chat via hermes -z', () => {
    expect(buildAgentChatCommand('hermes', 'ping')).toEqual({
      bin: 'hermes',
      args: ['-z', 'ping'],
      timeoutMs: 120000,
      mode: 'append',
    });
  });

  it('returns null for agents without a chat capability', () => {
    expect(buildAgentChatCommand('openclaw', 'hello')).toBeNull();
    expect(buildAgentChatCommand('blog-studio', 'hello')).toBeNull();
    expect(buildAgentChatCommand('mywiki', 'hello')).toBeNull();
  });
});

describe('isAgentChatCapable', () => {
  it('flags agents with both a chat command and chat capability', () => {
    expect(isAgentChatCapable('claude')).toBe(true);
    expect(isAgentChatCapable('hermes')).toBe(true);
    expect(isAgentChatCapable('gemini')).toBe(true);
  });

  it('rejects agents that lack either a chat command or the chat capability', () => {
    expect(isAgentChatCapable('openclaw')).toBe(false);
    expect(isAgentChatCapable('blog-studio')).toBe(false);
    expect(isAgentChatCapable('notebooklm')).toBe(false);
  });

  it('returns false for unknown agents instead of throwing', () => {
    expect(isAgentChatCapable('does-not-exist' as never)).toBe(false);
  });
});
