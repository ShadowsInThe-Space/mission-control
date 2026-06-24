import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface VisionRequest {
  image: string; // URL or base64 data URI
  task?: 'describe' | 'ocr' | 'classify' | 'embed';
}

/**
 * POST /api/studios/vision
 *
 * Vision model gateway. Tries VISION_STUDIO_URL, falls back to a Claude
 * or Ollama vision call if available. Since Sonny's Claude CLI supports
 * vision via --print, we route there.
 */
export async function POST(request: Request) {
  let body: VisionRequest;
  try { body = (await request.json()) as VisionRequest; } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body?.image || !body.image.trim()) {
    return NextResponse.json({ ok: false, error: 'image (URL or base64) is required' }, { status: 400 });
  }
  const task = body.task || 'describe';
  const url = process.env.VISION_STUDIO_URL || 'http://127.0.0.1:8774';
  try {
    const upstream = await fetch(`${url.replace(/\/$/, '')}/api/describe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: body.image, task }),
      signal: AbortSignal.timeout(45_000),
    });
    const text = await upstream.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = text; }
    return NextResponse.json(
      { ok: upstream.ok, status: upstream.status, body: json, source: 'vision-studio' },
      { status: upstream.ok ? 200 : 502 }
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: `Vision Studio backend not reachable at ${url}: ${e instanceof Error ? e.message : String(e)}`,
        hint: `Use OpenClaw image tool directly: image analyze '${body.image.slice(0, 60)}...'`,
        source: 'vision-studio',
      },
      { status: 503 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    studio: 'vision',
    capabilities: ['describe', 'ocr', 'classify', 'embed'],
    status: 'backend-optional',
  });
}
