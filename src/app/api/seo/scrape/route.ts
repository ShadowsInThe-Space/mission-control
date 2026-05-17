import { NextRequest, NextResponse } from 'next/server';

const RANKFORGE_URL = process.env.RANKFORGE_URL || 'http://localhost:13002';
const INTERNAL_API_KEY = process.env.RANKFORGE_API_KEY || 'mc-rankforge-secret-23e31f055bad31967a0222f9dfb2dbe2';

export async function POST(req: NextRequest) {
  try {
    const { url, keywords = [] } = await req.json();
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

    const response = await fetch(`${RANKFORGE_URL}/api/internal/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({ url, keywords }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `RankForge ${response.status}: ${err}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
      ok: true,
      auditId: data.id,
      status: data.status,
      url: data.url,
      domain: data.domain,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
