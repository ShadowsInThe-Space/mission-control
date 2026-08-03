import { describe, expect, it } from 'vitest';
import {
  AGENT_DEFINITIONS,
  buildAgentCommand,
  getAgentDefinition,
  listAgentDefinitions,
} from './agent-registry';

describe('agent registry', () => {
  it('registers every local agentic OS harness we need to manage', () => {
    const ids = listAgentDefinitions().map((agent) => agent.id);

    expect(ids).toEqual([
      'hermes',
      'lepsy',
      'openclaw',
      'buzz',
      'claude',
      'gemini',
      'mmx',
      'codex',
      'ollama',
      'antigravity',
      'rankforge',
      'firecrawl',
      'mywiki',
      'notebooklm',
      'blog-studio',
      'image-studio',
      'video-studio',
      'podcast-studio',
      'vision-studio',
    ]);
  });

  it('keeps registry entries structured and UI-ready', () => {
    for (const agent of AGENT_DEFINITIONS) {
      expect(agent.id).toMatch(/^[a-z0-9-]+$/);
      expect(agent.label.length).toBeGreaterThan(1);
      expect(agent.kind).toMatch(/^(cli|http|workspace|feature)$/);
      expect(agent.description.length).toBeGreaterThan(10);
      expect(agent.capabilities.length).toBeGreaterThan(0);
    }
  });

  it('declares health checks for every feature service', () => {
    for (const featureId of ['lepsy', 'buzz', 'rankforge', 'firecrawl', 'notebooklm', 'blog-studio', 'image-studio', 'video-studio', 'podcast-studio', 'vision-studio']) {
      const agent = getAgentDefinition(featureId);
      expect(agent.health).toBeDefined();
      expect(agent.health?.defaultUrl).toMatch(/^https?:\/\//);
      expect(agent.health?.path).toMatch(/^\//);
      expect(agent.health?.timeoutMs).toBeGreaterThan(0);
    }
  });

  it('declares chatCommand for chat-capable CLI agents', () => {
    expect(getAgentDefinition('claude').chatCommand?.bin).toBe('claude');
    expect(getAgentDefinition('hermes').chatCommand?.bin).toBe('hermes');
    expect(getAgentDefinition('gemini').chatCommand?.bin).toBe('gemini');
    expect(getAgentDefinition('codex').chatCommand?.bin).toBe('codex');
    expect(getAgentDefinition('ollama').chatCommand?.bin).toBe('ollama');
  });

  it('omits chatCommand for non-chat agents', () => {
    expect(getAgentDefinition('openclaw').chatCommand).toBeUndefined();
    expect(getAgentDefinition('buzz').chatCommand).toBeUndefined();
    expect(getAgentDefinition('blog-studio').chatCommand).toBeUndefined();
    expect(getAgentDefinition('notebooklm').chatCommand).toBeUndefined();
  });

  it('builds commands only from allowlisted actions', () => {
    expect(buildAgentCommand('claude', 'version')).toEqual({
      bin: 'claude',
      args: ['--version'],
      timeoutMs: 10_000,
    });

    expect(buildAgentCommand('antigravity', 'version')).toEqual({
      bin: 'agy',
      args: ['--version'],
      timeoutMs: 10_000,
    });
  });

  it('rejects unknown agents and unknown actions instead of accepting free shell text', () => {
    expect(() => getAgentDefinition('missing')).toThrow('Unknown agent: missing');
    expect(() => buildAgentCommand('claude', 'rm -rf /')).toThrow(
      'Action is not allowlisted for claude: rm -rf /'
    );
  });
});
