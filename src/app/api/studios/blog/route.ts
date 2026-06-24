import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface BlogRequest {
  topic: string;
  tone?: string;
  audience?: string;
  lengthWords?: number;
}

/**
 * POST /api/studios/blog
 *
 * Blog post generation. Routes through the Claude CLI (`claude --print`)
 * with a structured prompt. This is REAL — claude is installed (verified
 * in the previous test, 2.1.143). If claude is missing or fails, we return
 * 503 with a clear error and the manual fallback.
 *
 * Body: { topic: string, tone?: string, audience?: string, lengthWords?: number }
 */
export async function POST(request: Request) {
  let body: BlogRequest;
  try { body = (await request.json()) as BlogRequest; } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body?.topic || !body.topic.trim()) {
    return NextResponse.json({ ok: false, error: 'topic is required' }, { status: 400 });
  }
  const tone = body.tone || 'editorial';
  const audience = body.audience || 'tech-savvy founders and developers';
  const lengthWords = body.lengthWords || 600;

  const prompt = `Write a ${lengthWords}-word blog post on the topic: "${body.topic}".
Tone: ${tone}. Audience: ${audience}.
Structure:
- Catchy H1
- 1-2 sentence lede that states the thesis
- 3-5 H2 sections, each with a clear claim
- Concrete examples or code where useful
- Short conclusion with a single concrete next step
Style: no fluff, no clichés, no emojis, German if the topic implies German, English otherwise.`;

  // Invoke claude --print with the prompt. Match the agent-runtime spawn pattern
  // (shell:false, minimal env, hard timeout). Return whatever stdout claude emits.
  const start = Date.now();
  try {
    const result = await runClaude(prompt, 90_000);
    if (result.exitCode === 0 && result.stdout.trim().length > 0) {
      return NextResponse.json({
        ok: true,
        source: 'claude-cli',
        topic: body.topic,
        tone,
        audience,
        lengthWords,
        content: result.stdout,
        durationMs: Date.now() - start,
        command: 'claude --print <prompt>',
      });
    }
    return NextResponse.json(
      {
        ok: false,
        source: 'claude-cli',
        error: `claude exited with code ${result.exitCode}`,
        stderr: result.stderr,
        stdout: result.stdout,
        durationMs: Date.now() - start,
        hint: 'Verify `claude --version` works on the host.',
      },
      { status: 502 }
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        hint: 'Could not invoke claude CLI. Verify with `claude --version`.',
      },
      { status: 503 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    studio: 'blog',
    backend: 'claude-cli',
    capabilities: ['outline', 'draft', 'edit', 'seo-check', 'generate'],
    promptRequired: ['topic'],
    promptOptional: ['tone', 'audience', 'lengthWords'],
  });
}

function runClaude(prompt: string, timeoutMs: number): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    let settled = false;
    let stdout = '';
    let stderr = '';
    const proc = spawn('claude', ['--print', prompt], {
      shell: false,
      env: {
        HOME: process.env.HOME,
        PATH: process.env.PATH,
        NO_COLOR: '1',
        NODE_ENV: process.env.NODE_ENV || 'production',
      } as NodeJS.ProcessEnv,
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill();
      resolve({ stdout, stderr: stderr + '\nTIMEOUT', exitCode: 124 });
    }, timeoutMs);
    proc.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    proc.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr: stderr + '\n' + err.message, exitCode: 1 });
    });
    proc.on('exit', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });
  });
}
