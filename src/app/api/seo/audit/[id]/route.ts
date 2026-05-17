import { NextRequest, NextResponse } from 'next/server';

const RANKFORGE_URL = process.env.RANKFORGE_URL || 'http://localhost:13002';
const INTERNAL_API_KEY = process.env.RANKFORGE_API_KEY || 'mc-rankforge-secret-23e31f055bad31967a0222f9dfb2dbe2';

// GET /api/seo/audit/[id]?auditId=xxx — Poll RankForge for audit result
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const auditId = searchParams.get('auditId');
    if (!auditId) return NextResponse.json({ error: 'auditId required' }, { status: 400 });

    const response = await fetch(`${RANKFORGE_URL}/api/internal/audit/${auditId}`, {
      method: 'GET',
      headers: { 'x-internal-api-key': INTERNAL_API_KEY },
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
      pages: data.pages?.map((p: {
        url: string; statusCode: number | null; title: string | null;
        description: string | null; h1: string | null; wordCount: number | null;
        score: number | null; issues: unknown;
      }) => ({
        url: p.url,
        statusCode: p.statusCode,
        title: p.title,
        metaDescription: p.description,
        h1: p.h1,
        wordCount: p.wordCount,
        score: p.score,
        issues: typeof p.issues === 'string' ? JSON.parse(p.issues) : (p.issues || []),
      })) || [],
      keywords: data.keywords || [],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
