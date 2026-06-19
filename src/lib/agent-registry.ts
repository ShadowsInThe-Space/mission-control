export type AgentId =
  | 'hermes'
  | 'openclaw'
  | 'claude'
  | 'gemini'
  | 'mmx'
  | 'codex'
  | 'ollama'
  | 'antigravity'
  | 'rankforge'
  | 'firecrawl'
  | 'mywiki'
  | 'notebooklm'
  | 'blog-studio'
  | 'image-studio'
  | 'video-studio'
  | 'podcast-studio'
  | 'vision-studio';

export type AgentKind = 'cli' | 'http' | 'workspace' | 'feature';

export interface AgentDefinition {
  id: AgentId;
  label: string;
  kind: AgentKind;
  description: string;
  capabilities: string[];
  actions: Record<string, AgentCommandTemplate>;
  health?: AgentHealthTemplate;
  chatCommand?: AgentChatCommandTemplate;
}

export interface AgentCommandTemplate {
  bin: string;
  args: string[];
  timeoutMs: number;
}

export interface AgentChatCommandTemplate {
  /**
   * Template for invoking this agent as a chat responder.
   * Use `{{message}}` to interpolate the user's message into args; if absent,
   * the runtime appends the message as the last positional arg.
   */
  bin: string;
  args: string[];
  timeoutMs: number;
  /** When true, the message is passed via stdin instead of argv (safer for long messages). */
  useStdin?: boolean;
  /**
   * Per-agent chat mode override. If unset, the runtime uses the default
   * "append message as final positional arg" behaviour.
   */
  mode?: 'append' | 'print' | 'stdin' | 'pipe';
}

export interface AgentHealthTemplate {
  envVar: string;
  defaultUrl: string;
  path: string;
  timeoutMs: number;
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: 'hermes',
    label: 'Hermes Agent',
    kind: 'cli',
    description: 'Local Hermes agent with workspace, gateway, memory, and MCP support.',
    capabilities: ['status', 'chat', 'workspace', 'memory'],
    actions: {
      version: { bin: 'hermes', args: ['--version'], timeoutMs: 10_000 },
    },
    chatCommand: {
      bin: 'hermes',
      args: ['-z', '-p', '{{message}}'],
      timeoutMs: 120_000,
    },
  },
  {
    id: 'openclaw',
    label: 'OpenClaw',
    kind: 'cli',
    description: 'Local OpenClaw harness for channels, devices, tasks, flows, and agent extensions.',
    capabilities: ['status', 'channels', 'tasks', 'extensions'],
    actions: {
      version: { bin: 'openclaw', args: ['--version'], timeoutMs: 10_000 },
    },
  },
  {
    id: 'claude',
    label: 'Claude CLI',
    kind: 'cli',
    description: 'Claude Code CLI for local coding-agent sessions and repository work.',
    capabilities: ['status', 'chat', 'code'],
    actions: {
      version: { bin: 'claude', args: ['--version'], timeoutMs: 10_000 },
    },
    chatCommand: {
      bin: 'claude',
      args: ['--print', '{{message}}'],
      timeoutMs: 120_000,
      mode: 'print',
    },
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    kind: 'cli',
    description: 'Gemini CLI for Google model workflows, MCP tools, and research tasks.',
    capabilities: ['status', 'chat', 'mcp'],
    actions: {
      version: { bin: 'gemini', args: ['--version'], timeoutMs: 10_000 },
    },
    chatCommand: {
      bin: 'gemini',
      args: ['-p', '{{message}}'],
      timeoutMs: 120_000,
    },
  },
  {
    id: 'mmx',
    label: 'MMX CLI',
    kind: 'cli',
    description: 'MiniMax CLI used for fast local model and media-oriented workflows.',
    capabilities: ['status', 'chat'],
    actions: {
      version: { bin: 'mmx', args: ['--version'], timeoutMs: 10_000 },
    },
    chatCommand: {
      bin: 'mmx',
      args: ['--prompt', '{{message}}'],
      timeoutMs: 120_000,
    },
  },
  {
    id: 'codex',
    label: 'Codex',
    kind: 'cli',
    description: 'OpenAI Codex CLI for coding-agent tasks and local workspace automation.',
    capabilities: ['status', 'chat', 'code'],
    actions: {
      version: { bin: 'codex', args: ['--version'], timeoutMs: 10_000 },
    },
    chatCommand: {
      bin: 'codex',
      args: ['exec', '{{message}}'],
      timeoutMs: 180_000,
    },
  },
  {
    id: 'ollama',
    label: 'Ollama',
    kind: 'http',
    description: 'Local Ollama model server for private model inference and model inventory.',
    capabilities: ['status', 'models', 'chat'],
    actions: {
      version: { bin: 'ollama', args: ['--version'], timeoutMs: 10_000 },
    },
    health: {
      envVar: 'OLLAMA_HOST',
      defaultUrl: 'http://127.0.0.1:11434',
      path: '/api/tags',
      timeoutMs: 5_000,
    },
    chatCommand: {
      bin: 'ollama',
      args: ['run', 'llama3.2', '{{message}}'],
      timeoutMs: 120_000,
    },
  },
  {
    id: 'antigravity',
    label: 'Google Antigravity',
    kind: 'cli',
    description: 'Google Antigravity CLI and IDE harness exposed through the local agy command.',
    capabilities: ['status', 'chat', 'ide', 'agentapi'],
    actions: {
      version: { bin: 'agy', args: ['--version'], timeoutMs: 10_000 },
    },
    chatCommand: {
      bin: 'agy',
      args: ['chat', '{{message}}'],
      timeoutMs: 120_000,
    },
  },
  {
    id: 'rankforge',
    label: 'RankForge',
    kind: 'feature',
    description: 'Local SEO/GEO audit application used by the SEO Ops feature module.',
    capabilities: ['health', 'audit', 'keywords', 'reports'],
    actions: {},
    health: {
      envVar: 'RANKFORGE_URL',
      defaultUrl: 'http://localhost:13001',
      path: '/api/health',
      timeoutMs: 5_000,
    },
  },
  {
    id: 'firecrawl',
    label: 'Firecrawl',
    kind: 'feature',
    description: 'Local Firecrawl crawling service used by RankForge for SEO audits.',
    capabilities: ['health', 'crawl', 'scrape'],
    actions: {},
    health: {
      envVar: 'FIRECRAWL_API_URL',
      defaultUrl: 'http://localhost:3002',
      path: '/v0/health',
      timeoutMs: 5_000,
    },
  },
  {
    id: 'mywiki',
    label: 'MyWiki Knowledge Graph',
    kind: 'workspace',
    description: 'Obsidian Markdown knowledge graph synced to GitHub for durable agent memory.',
    capabilities: ['read', 'write', 'search', 'sync'],
    actions: {},
  },
  {
    id: 'notebooklm',
    label: 'NotebookLM',
    kind: 'feature',
    description: 'Google NotebookLM research and artifact pipeline exposed through skills or MCP.',
    capabilities: ['sources', 'research', 'artifacts', 'podcast'],
    actions: {},
    health: {
      envVar: 'NOTEBOOKLM_MCP_URL',
      defaultUrl: 'http://127.0.0.1:8766',
      path: '/mcp/health',
      timeoutMs: 5_000,
    },
  },
  {
    id: 'blog-studio',
    label: 'Blog Studio',
    kind: 'feature',
    description: 'Long-form blog post generation pipeline (rankforge, mmx, claude, vision inputs).',
    capabilities: ['outline', 'draft', 'edit', 'seo-check'],
    actions: {},
    health: {
      envVar: 'BLOG_STUDIO_URL',
      defaultUrl: 'http://127.0.0.1:8770',
      path: '/api/health',
      timeoutMs: 5_000,
    },
  },
  {
    id: 'image-studio',
    label: 'Image Studio',
    kind: 'feature',
    description: 'Image generation and editing pipeline (FAL, local diffusion, vision feedback).',
    capabilities: ['generate', 'edit', 'upscale', 'vision-check'],
    actions: {},
    health: {
      envVar: 'IMAGE_STUDIO_URL',
      defaultUrl: 'http://127.0.0.1:8771',
      path: '/api/health',
      timeoutMs: 5_000,
    },
  },
  {
    id: 'video-studio',
    label: 'Video Studio',
    kind: 'feature',
    description: 'Video generation and editing pipeline (ComfyUI video, mmx, ffmpeg post).',
    capabilities: ['generate', 'edit', 'transcribe', 'render'],
    actions: {},
    health: {
      envVar: 'VIDEO_STUDIO_URL',
      defaultUrl: 'http://127.0.0.1:8772',
      path: '/api/health',
      timeoutMs: 5_000,
    },
  },
  {
    id: 'podcast-studio',
    label: 'Podcast Studio',
    kind: 'feature',
    description: 'Podcast generation pipeline (NotebookLM podcast skill, TTS, mmx-audio).',
    capabilities: ['script', 'tts', 'mix', 'publish'],
    actions: {},
    health: {
      envVar: 'PODCAST_STUDIO_URL',
      defaultUrl: 'http://127.0.0.1:8773',
      path: '/api/health',
      timeoutMs: 5_000,
    },
  },
  {
    id: 'vision-studio',
    label: 'Vision Studio',
    kind: 'feature',
    description: 'Vision model gateway (LLaVA, Claude vision, MiniMax vision) for image understanding.',
    capabilities: ['describe', 'ocr', 'classify', 'embed'],
    actions: {},
    health: {
      envVar: 'VISION_STUDIO_URL',
      defaultUrl: 'http://127.0.0.1:8774',
      path: '/api/health',
      timeoutMs: 5_000,
    },
  },
];

export function listAgentDefinitions(): AgentDefinition[] {
  return AGENT_DEFINITIONS;
}

export function getAgentDefinition(id: string): AgentDefinition {
  const definition = AGENT_DEFINITIONS.find((agent) => agent.id === id);
  if (!definition) throw new Error(`Unknown agent: ${id}`);
  return definition;
}

export function buildAgentCommand(agentId: string, action: string): AgentCommandTemplate {
  const definition = getAgentDefinition(agentId);
  const command = definition.actions[action];
  if (!command) throw new Error(`Action is not allowlisted for ${agentId}: ${action}`);
  return command;
}
