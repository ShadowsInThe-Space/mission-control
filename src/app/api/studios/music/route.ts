import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface MusicRequest {
  prompt: string;
  durationSeconds?: number;
  instrumental?: boolean;
}

/**
 * POST /api/studios/music
 *
 * Music generation. Routes to a backend if reachable, otherwise returns
 * 503 with the OpenClaw fallback command: `music_generate '...'`.
 */
export async function POST(request: Request) {
  let body: MusicRequest;
  try { body = (await request.json()) as MusicRequest; } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body?.prompt || !body.prompt.trim()) {
    return NextResponse.json({ ok: false, error: 'prompt is required' }, { status: 400 });
  }
  const url = process.env.PODCAST_STUDIO_URL || 'http://127.0.0.1:8773';
  try {
    const upstream = await fetch(`${url.replace(/\/$/, '')}/api/music`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
    const text = await upstream.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = text; }
    return NextResponse.json(
      { ok: upstream.ok, status: upstream.status, body: json, source: 'music-studio' },
      { status: upstream.ok ? 200 : 502 }
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: `Music backend not reachable at ${url}: ${e instanceof Error ? e.message : String(e)}`,
        hint: `Run the generation directly with the OpenClaw tool: music_generate '${body.prompt.replace(/'/g, "'\\''")}'`,
        source: 'music-studio',
      },
      { status: 503 }
    );
  }
}

export async function GET() {
  const url = process.env.PODCAST_STUDIO_URL || 'http://127.0.0.1:8773';
  return NextResponse.json({
    ok: true,
    studio: 'music',
    backend: { url, up: false },
    capabilities: ['generate', 'lyrics', 'instrumental'],
    fallbackCommand: 'music_generate',
  });
}
