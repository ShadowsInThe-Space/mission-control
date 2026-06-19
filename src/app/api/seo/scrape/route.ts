import { NextRequest, NextResponse } from 'next/server';

import { buildRankForgeUrl, getSeoOpsConfig, validatePublicAuditUrl } from '@/lib/seo-ops';

export async function POST(req: NextRequest) {
  try {
    const { url, keywords = [] } = await req.json();
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

    const auditUrl = validatePublicAuditUrl(url);
    const config = getSeoOpsConfig();
    const response = await fetch(buildRankForgeUrl('/api/internal/audit', config), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': config.rankForgeApiKey,
      },
      body: JSON.stringify({ url: auditUrl, keywords }),
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
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes('public http URL') ? 400 : message.includes('RANKFORGE_API_KEY') ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
