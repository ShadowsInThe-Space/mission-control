import { NextRequest, NextResponse } from 'next/server';

import { buildRankForgeUrl, getSeoOpsConfig, normalizeAuditPages } from '@/lib/seo-ops';

// GET /api/seo/audit/[id] — Poll RankForge for audit result
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const pollUntilComplete = searchParams.get('pollUntilComplete') === 'true';

    const config = getSeoOpsConfig();
    const rfUrl = buildRankForgeUrl(`/api/internal/audit/${id}`, config);
    if (pollUntilComplete) rfUrl.searchParams.set('pollUntilComplete', 'true');
    const response = await fetch(rfUrl.toString(), {
      method: 'GET',
      headers: { 'x-internal-api-key': config.rankForgeApiKey },
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `RankForge ${response.status}: ${err}` }, { status: response.status });
    }

    const data = await response.json();

    // Normalize to what SEOPanel expects from the old analyze endpoint
    return NextResponse.json({
      ok: true,
      auditId: data.id,
      status: data.status,
      progress: data.progress,
      url: data.url,
      domain: data.domain,
      score: data.score,
      grade: data.grade,
      pagesFound: data.pagesFound,
      pages: normalizeAuditPages(data.pages),
      keywords: data.keywords || [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes('RANKFORGE_API_KEY') ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
