export type AgentId =
  | 'hermes'
  | 'lepsy'
  | 'openclaw'
  | 'buzz'
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
  /**
   * Optional hint describing a sub-endpoint exposed by HTTP-kind or feature agents.
   * The Mission Control API uses this to wire `GET/POST /api/agents/[id]/<endpoint>`
   * calls from the AgentDetailPanel UI.
   */
  httpEndpoints?: AgentHttpEndpoint[];
}

export interface AgentHttpEndpoint {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  label: string;
  description: string;
  params?: Array<{ name: string; label: string; required?: boolean; placeholder?: string }>;
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
    capabilities: ['status', 'chat', 'workspace', 'memory', 'help'],
    actions: {
      version: { bin: 'hermes', args: ['--version'], timeoutMs: 10_000 },
      help: { bin: 'hermes', args: ['--help'], timeoutMs: 10_000 },
    },
    chatCommand: {
      bin: 'hermes',
      args: ['-z', '{{message}}'],
      timeoutMs: 120_000,
    },
  },
  {
    id: 'lepsy',
    label: 'Lepsy Hermes',
    kind: 'feature',
    description: 'SSH-tunnel-backed Hermes API server from the secondary dev laptop lepsy for LAN multi-agent orchestration.',
    capabilities: ['health', 'secondary-dev', 'multiagent', 'remote-hermes'],
    actions: {},
    health: {
      envVar: 'LEPSY_HERMES_URL',
      defaultUrl: 'http://127.0.0.1:18642',
      path: '/health',
      timeoutMs: 5_000,
    },
  },
  {
    id: 'openclaw',
    label: 'OpenClaw',
    kind: 'cli',
    description: 'Local OpenClaw harness for channels, devices, tasks, flows, and agent extensions.',
    capabilities: ['status', 'channels', 'tasks', 'extensions', 'help'],
    actions: {
      version: { bin: 'openclaw', args: ['--version'], timeoutMs: 10_000 },
      help: { bin: 'openclaw', args: ['--help'], timeoutMs: 10_000 },
    },
  },
  {
    id: 'buzz',
    label: 'Buzz Relay',
    kind: 'feature',
    description: 'Self-hosted Buzz relay and workspace backend for rooms, agents, workflows, and signed team events.',
    capabilities: ['health', 'relay', 'workspace', 'events', 'agents'],
    actions: {},
    health: {
      envVar: 'BUZZ_RELAY_HTTP_URL',
      defaultUrl: 'http://127.0.0.1:33110',
      path: '/health',
      timeoutMs: 5_000,
    },
    httpEndpoints: [
      {
        id: 'liveness',
        method: 'GET',
        path: '/_liveness',
        label: 'Relay liveness',
        description: 'Fast unauthenticated liveness probe exposed by the Buzz relay.',
      },
      {
        id: 'readiness',
        method: 'GET',
        path: '/_readiness',
        label: 'Relay readiness',
        description: 'Readiness probe for the Buzz relay and its backing dependencies.',
      },
      {
        id: 'count-events',
        method: 'POST',
        path: '/count',
        label: 'Count events',
        description: 'Run a NIP-45 count query against the Buzz relay. Pass raw filter-array JSON in payload.',
        params: [{ name: 'payload', label: 'Raw JSON payload', required: true, placeholder: '[{"kinds":[39002]}]' }],
      },
      {
        id: 'query-events',
        method: 'POST',
        path: '/query',
        label: 'Query events',
        description: 'Run a NIP-01 query against the Buzz relay. Pass raw filter-array JSON in payload.',
        params: [{ name: 'payload', label: 'Raw JSON payload', required: true, placeholder: '[{"kinds":[39002],"limit":5}]' }],
      },
    ],
  },
  {
    id: 'claude',
    label: 'Claude CLI',
    kind: 'cli',
    description: 'Claude Code CLI for local coding-agent sessions and repository work.',
    capabilities: ['status', 'chat', 'code', 'help'],
    actions: {
      version: { bin: 'claude', args: ['--version'], timeoutMs: 10_000 },
      help: { bin: 'claude', args: ['--help'], timeoutMs: 10_000 },
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
    capabilities: ['status', 'chat', 'mcp', 'help'],
    actions: {
      version: { bin: 'gemini', args: ['--version'], timeoutMs: 10_000 },
      help: { bin: 'gemini', args: ['--help'], timeoutMs: 10_000 },
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
    capabilities: ['status', 'chat', 'help'],
    actions: {
      version: { bin: 'mmx', args: ['--version'], timeoutMs: 10_000 },
      help: { bin: 'mmx', args: ['--help'], timeoutMs: 10_000 },
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
    capabilities: ['status', 'chat', 'code', 'help'],
    actions: {
      version: { bin: 'codex', args: ['--version'], timeoutMs: 10_000 },
      help: { bin: 'codex', args: ['--help'], timeoutMs: 10_000 },
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
    capabilities: ['status', 'models', 'chat', 'help'],
    actions: {
      version: { bin: 'ollama', args: ['--version'], timeoutMs: 10_000 },
      help: { bin: 'ollama', args: ['--help'], timeoutMs: 10_000 },
    },
    health: {
      envVar: 'OLLAMA_HOST',
      defaultUrl: 'http://127.0.0.1:11434',
      path: '/api/tags',
      timeoutMs: 5_000,
    },
    httpEndpoints: [
      {
        id: 'list-models',
        method: 'GET',
        path: '/api/tags',
        label: 'List local models',
        description: 'Returns all models currently pulled into the local Ollama cache.',
      },
      {
        id: 'show-model',
        method: 'POST',
        path: '/api/show',
        label: 'Show model info',
        description: 'Returns metadata for a named model (modelfile, template, params).',
        params: [{ name: 'name', label: 'Model name', required: true, placeholder: 'llama3.2' }],
      },
    ],
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
    capabilities: ['status', 'chat', 'ide', 'agentapi', 'help'],
    actions: {
      version: { bin: 'agy', args: ['--version'], timeoutMs: 10_000 },
      help: { bin: 'agy', args: ['--help'], timeoutMs: 10_000 },
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
    capabilities: ['health', 'audit', 'keywords', 'reports', 'projects'],
    actions: {},
    health: {
      envVar: 'RANKFORGE_URL',
      defaultUrl: 'http://localhost:13001',
      path: '/api/health',
      timeoutMs: 5_000,
    },
    httpEndpoints: [
      {
        id: 'projects',
        method: 'GET',
        path: '/api/projects',
        label: 'List SEO projects',
        description: 'Returns all SEO projects known to RankForge.',
      },
      {
        id: 'audit',
        method: 'POST',
        path: '/api/audit',
        label: 'Trigger audit',
        description: 'Starts an SEO/GEO audit for the given URL.',
        params: [
          { name: 'url', label: 'URL', required: true, placeholder: 'https://example.com' },
          { name: 'projectId', label: 'Project ID (optional)', required: false },
        ],
      },
    ],
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
    httpEndpoints: [
      {
        id: 'scrape',
        method: 'POST',
        path: '/v1/scrape',
        label: 'Scrape URL',
        description: 'Returns clean markdown for a given URL.',
        params: [
          { name: 'url', label: 'URL', required: true, placeholder: 'https://example.com' },
        ],
      },
    ],
  },
  {
    id: 'mywiki',
    label: 'MyWiki Knowledge Graph',
    kind: 'workspace',
    description: 'Obsidian Markdown knowledge graph synced to GitHub for durable agent memory.',
    capabilities: ['read', 'write', 'search', 'sync', 'github'],
    actions: {},
    httpEndpoints: [
      {
        id: 'list',
        method: 'GET',
        path: '/api/list',
        label: 'List vault files',
        description: 'Returns a tree of files currently in the mywiki vault.',
      },
      {
        id: 'read',
        method: 'GET',
        path: '/api/read',
        label: 'Read file',
        description: 'Returns the contents of a single vault file.',
        params: [{ name: 'path', label: 'Path', required: true, placeholder: 'MEMORY.md' }],
      },
      {
        id: 'search',
        method: 'GET',
        path: '/api/search',
        label: 'Search vault',
        description: 'Full-text search across the vault.',
        params: [{ name: 'q', label: 'Query', required: true, placeholder: 'AGENTIC' }],
      },
    ],
  },
  {
    id: 'notebooklm',
    label: 'NotebookLM',
    kind: 'feature',
    description: 'Google NotebookLM research and artifact pipeline exposed through skills or MCP.',
    capabilities: ['sources', 'research', 'artifacts', 'podcast', 'mcp'],
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
    capabilities: ['outline', 'draft', 'edit', 'seo-check', 'generate'],
    actions: {},
    health: {
      envVar: 'BLOG_STUDIO_URL',
      defaultUrl: 'http://127.0.0.1:8770',
      path: '/api/health',
      timeoutMs: 5_000,
    },
    httpEndpoints: [
      {
        id: 'generate',
        method: 'POST',
        path: '/api/generate',
        label: 'Generate blog post',
        description: 'Generate a long-form blog post from a topic + tone.',
        params: [
          { name: 'topic', label: 'Topic', required: true, placeholder: 'AI agents for SEO' },
          { name: 'tone', label: 'Tone (optional)', required: false, placeholder: 'editorial' },
        ],
      },
    ],
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
    httpEndpoints: [
      {
        id: 'generate',
        method: 'POST',
        path: '/api/generate',
        label: 'Generate image',
        description: 'Generate an image from a text prompt (provider selected by the studio).',
        params: [{ name: 'prompt', label: 'Prompt', required: true }],
      },
    ],
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
    httpEndpoints: [
      {
        id: 'generate',
        method: 'POST',
        path: '/api/generate',
        label: 'Generate video',
        description: 'Generate a short video clip from a text prompt.',
        params: [{ name: 'prompt', label: 'Prompt', required: true }],
      },
    ],
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
    httpEndpoints: [
      {
        id: 'script',
        method: 'POST',
        path: '/api/script',
        label: 'Generate podcast script',
        description: 'Generate a two-host podcast script from a topic.',
        params: [{ name: 'topic', label: 'Topic', required: true }],
      },
    ],
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
    httpEndpoints: [
      {
        id: 'describe',
        method: 'POST',
        path: '/api/describe',
        label: 'Describe image',
        description: 'Returns a textual description of an image (URL or base64).',
        params: [{ name: 'image', label: 'Image URL or base64', required: true }],
      },
    ],
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

/** Returns the httpEndpoint by id, or undefined. */
export function getHttpEndpoint(agentId: string, endpointId: string) {
  const definition = getAgentDefinition(agentId);
  return definition.httpEndpoints?.find((e) => e.id === endpointId);
}

/** Returns the list of declared actions for an agent (id + command preview). */
export function listActionSummaries(agentId: string) {
  const def = getAgentDefinition(agentId);
  return Object.entries(def.actions).map(([id, cmd]) => ({
    id,
    label: id,
    bin: cmd.bin,
    args: cmd.args,
    timeoutMs: cmd.timeoutMs,
  }));
}
