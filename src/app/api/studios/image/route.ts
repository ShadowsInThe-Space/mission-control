import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ImageRequest {
  prompt: string;
  model?: string;
  size?: string;
}

/**
 * POST /api/studios/image
 *
 * Image generation. Two paths:
 *   1. IMAGE_STUDIO_URL is set + reachable  → POST to <url>/api/generate
 *   2. Otherwise, fail honestly with 503 + the exact OpenClaw command
 *      the user can run from the host: `image_generate 'prompt'`
 *
 * Body: { prompt: string, model?: string, size?: string }
 */
export async function POST(request: Request) {
  let body: ImageRequest;
  try { body = (await request.json()) as ImageRequest; } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body?.prompt || !body.prompt.trim()) {
    return NextResponse.json({ ok: false, error: 'prompt is required' }, { status: 400 });
  }

  const url = process.env.IMAGE_STUDIO_URL || 'http://127.0.0.1:8771';
  try {
    const upstream = await fetch(`${url.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: body.prompt, model: body.model, size: body.size }),
      signal: AbortSignal.timeout(60_000),
    });
    const text = await upstream.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = text; }
    return NextResponse.json(
      { ok: upstream.ok, status: upstream.status, body: json, source: 'image-studio' },
      { status: upstream.ok ? 200 : 502 }
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: `Image Studio backend not reachable at ${url}: ${e instanceof Error ? e.message : String(e)}`,
        hint: `Run the generation directly with the OpenClaw tool: image_generate '${body.prompt.replace(/'/g, "'\\''")}'`,
        source: 'image-studio',
      },
      { status: 503 }
    );
  }
}

/** GET → capabilities / health summary */
export async function GET() {
  const url = process.env.IMAGE_STUDIO_URL || 'http://127.0.0.1:8771';
  let backendUp = false;
  let backendError: string | null = null;
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/api/health`, { signal: AbortSignal.timeout(3_000) });
    backendUp = res.ok;
  } catch (e) {
    backendError = e instanceof Error ? e.message : String(e);
  }
  return NextResponse.json({
    ok: true,
    studio: 'image',
    backend: { url, up: backendUp, error: backendError },
    capabilities: ['generate', 'edit', 'upscale', 'vision-check'],
    fallbackCommand: 'image_generate',
  });
}
