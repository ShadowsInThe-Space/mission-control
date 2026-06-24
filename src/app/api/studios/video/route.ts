import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface VideoRequest {
  prompt: string;
  durationSeconds?: number;
}

/**
 * POST /api/studios/video
 *
 * Video generation. Routes to VIDEO_STUDIO_URL if reachable, otherwise
 * returns 503 with the OpenClaw fallback command.
 */
export async function POST(request: Request) {
  let body: VideoRequest;
  try { body = (await request.json()) as VideoRequest; } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body?.prompt || !body.prompt.trim()) {
    return NextResponse.json({ ok: false, error: 'prompt is required' }, { status: 400 });
  }
  const url = process.env.VIDEO_STUDIO_URL || 'http://127.0.0.1:8772';
  try {
    const upstream = await fetch(`${url.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: body.prompt, durationSeconds: body.durationSeconds }),
      signal: AbortSignal.timeout(120_000),
    });
    const text = await upstream.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = text; }
    return NextResponse.json(
      { ok: upstream.ok, status: upstream.status, body: json, source: 'video-studio' },
      { status: upstream.ok ? 200 : 502 }
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: `Video Studio backend not reachable at ${url}: ${e instanceof Error ? e.message : String(e)}`,
        hint: `Run the generation directly with the OpenClaw tool: video_generate '${body.prompt.replace(/'/g, "'\\''")}'`,
        source: 'video-studio',
      },
      { status: 503 }
    );
  }
}

export async function GET() {
  const url = process.env.VIDEO_STUDIO_URL || 'http://127.0.0.1:8772';
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
    studio: 'video',
    backend: { url, up: backendUp, error: backendError },
    capabilities: ['generate', 'edit', 'transcribe', 'render'],
    fallbackCommand: 'video_generate',
  });
}
