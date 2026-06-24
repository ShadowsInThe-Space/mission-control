import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PodcastRequest {
  topic: string;
  durationMinutes?: number;
}

/**
 * POST /api/studios/podcast
 *
 * Podcast script + TTS. NotebookLM doesn't expose a public HTTP API, so
 * the production path is: NotebookLM skill + TTS + mix pipeline running
 * locally. We attempt PODCAST_STUDIO_URL; on failure return a clear 503
 * with the manual workflow.
 */
export async function POST(request: Request) {
  let body: PodcastRequest;
  try { body = (await request.json()) as PodcastRequest; } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body?.topic || !body.topic.trim()) {
    return NextResponse.json({ ok: false, error: 'topic is required' }, { status: 400 });
  }
  const url = process.env.PODCAST_STUDIO_URL || 'http://127.0.0.1:8773';
  try {
    const upstream = await fetch(`${url.replace(/\/$/, '')}/api/script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    const text = await upstream.text();
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = text; }
    return NextResponse.json(
      { ok: upstream.ok, status: upstream.status, body: json, source: 'podcast-studio' },
      { status: upstream.ok ? 200 : 502 }
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: `Podcast Studio backend not reachable at ${url}: ${e instanceof Error ? e.message : String(e)}`,
        hint: 'Podcast pipeline needs NotebookLM MCP + TTS service. See: https://docs.openclaw.ai for the local pipeline setup.',
        source: 'podcast-studio',
        manualWorkflow: [
          '1. Use NotebookLM to research the topic and draft a two-host script',
          '2. Route the script through the music_generate tool with voice=host-a and voice=host-b for TTS',
          '3. Mix the segments with ffmpeg',
          '4. Publish to your podcast host',
        ],
      },
      { status: 503 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    studio: 'podcast',
    capabilities: ['script', 'tts', 'mix', 'publish'],
    status: 'pipeline-not-wired',
    note: 'NotebookLM MCP + TTS pipeline required. See manual workflow in POST 503 response.',
  });
}
