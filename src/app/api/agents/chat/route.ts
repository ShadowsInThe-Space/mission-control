import { NextRequest, NextResponse } from 'next/server';
import { runShellCommand } from '@/lib/agent-shell';

interface ChatRequest {
  sessionId: string;
  agentType: string;
  content: string;
}

const AGENT_COMMANDS: Record<string, { bin: string; args: (input: string) => string[] }> = {
  hermes: {
    bin: 'hermes',
    // -z = --oneshot, -Q = quiet (no banner/spinner, just response text)
    args: (input) => ['-z', input],
  },
  claude: {
    bin: 'claude-code',
    args: (input) => ['--print', input],
  },
  openclaw: {
    bin: 'openclaw',
    args: (input) => ['chat', input],
  },
};

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { agentType, content } = body;

    const agent = AGENT_COMMANDS[agentType];
    if (!agent) {
      return NextResponse.json({ error: `Unknown agent: ${agentType}` }, { status: 400 });
    }

    const args = agent.args(content);

    const result = await runShellCommand(agent.bin, args, 30000);

    if (result.exitCode !== 0) {
      return NextResponse.json({
        reply: `Agent exited with code ${result.exitCode}.\n\nstderr: ${result.stderr || '(none)'}\n\nstdout: ${result.stdout || '(none)'}`,
      });
    }

    return NextResponse.json({ reply: result.stdout.trim() || '(no output)' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
