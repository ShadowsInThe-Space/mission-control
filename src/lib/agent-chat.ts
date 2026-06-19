import {
  AgentId,
  getAgentDefinition,
  type AgentChatCommandTemplate,
} from './agent-registry';

export interface NormalizedAgentChatRequest {
  agentId: AgentId;
  message: string;
}

export interface AgentChatCommand {
  bin: string;
  args: string[];
  timeoutMs: number;
  mode: AgentChatCommandTemplate['mode'];
}

interface RawAgentChatRequest {
  agentId?: unknown;
  message?: unknown;
  agentType?: unknown;
  content?: unknown;
}

export function parseAgentChatRequest(body: RawAgentChatRequest): NormalizedAgentChatRequest {
  const rawAgentId = body.agentId ?? body.agentType;
  const rawMessage = body.message ?? body.content;

  if (typeof rawAgentId !== 'string' || !rawAgentId.trim()) {
    throw new Error('agentId is required');
  }

  if (typeof rawMessage !== 'string' || !rawMessage.trim()) {
    throw new Error('message is required');
  }

  const agentId = rawAgentId.trim() as AgentId;
  getAgentDefinition(agentId);

  return {
    agentId,
    message: rawMessage.trim(),
  };
}

/**
 * Resolve a chat command for the given agent using its registry-defined template.
 * Returns null when the agent does not advertise a chat capability — callers
 * should surface a 400 in that case so the UI can show "not chat-capable".
 */
export function buildAgentChatCommand(agentId: AgentId, message: string): AgentChatCommand | null {
  const definition = getAgentDefinition(agentId);
  const template = definition.chatCommand;
  if (!template) return null;

  const args = template.args.map((arg) => (arg === '{{message}}' ? message : arg));
  // Default mode: append the message as the final positional arg when no placeholder is present.
  const hasPlaceholder = template.args.includes('{{message}}');
  const mode: AgentChatCommandTemplate['mode'] = template.mode
    ? template.mode
    : hasPlaceholder
      ? 'append'
      : 'print';

  if (!hasPlaceholder && mode === 'append') {
    args.push(message);
  }

  return {
    bin: template.bin,
    args,
    timeoutMs: template.timeoutMs,
    mode,
  };
}

/**
 * Returns true when the agent can answer chat messages (has a `chatCommand`
 * template in the registry AND advertises the `chat` capability).
 */
export function isAgentChatCapable(agentId: AgentId): boolean {
  try {
    const definition = getAgentDefinition(agentId);
    return Boolean(definition.chatCommand) && definition.capabilities.includes('chat');
  } catch {
    return false;
  }
}
