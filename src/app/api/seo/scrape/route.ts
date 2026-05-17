import { NextRequest, NextResponse } from 'next/server';

const FIRECRAWL_URL = process.env.FIRECRAWL_URL || 'http://localhost:3002';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

    const start = Date.now();
    const response = await fetch(`${FIRECRAWL_URL}/v1/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ ok: false, error: `Firecrawl ${response.status}: ${err}` }, { status: 200 });
    }

    const data = await response.json();
    const loadTime = Date.now() - start;

    return NextResponse.json({
      ok: true,
      url,
      title: data.data?.metadata?.title || '',
      metaDescription: '',
      markdown: data.data?.markdown || '',
      loadTime,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 200 });
  }
}
