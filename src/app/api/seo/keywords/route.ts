import { NextRequest, NextResponse } from 'next/server';

// Keyword suggestions via Hermes Agent
export async function POST(req: NextRequest) {
  try {
    const { keywords = [], domain, topic } = await req.json();

    const prompt = `Du bist ein SEO-Keyword-Experte. Analysiere die gegebenen Keywords und schlage 10 neue verwandte Keywords vor.
Bestehende Keywords: ${keywords.join(', ') || 'keine'}
Domain: ${domain || 'unbekannt'}
Hauptthema: ${topic || 'unbekannt'}

Gib NUR ein JSON-Array mit Objekten zurück im Format:
[{"term": "keyword phrase", "volume": 1000, "difficulty": 45, "intent": "informational|transactional|navigational"}]

Regeln:
- Volume in monatlichen Suchen schätzen
- Difficulty 0-100 (wie schwer es ist zu ranken)
- Mischung aus short-tail und long-tail Keywords
- Maximal 10 Vorschläge
- Nur deutsche oder englische Keywords
- Keine Erklärungen, nur JSON`;

    const hermesRes = await fetch('http://localhost:3001/api/agents/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'seo-keywords', agentType: 'hermes', content: prompt }),
      signal: AbortSignal.timeout(35000),
    });

    const data = await hermesRes.json();
    let suggestions: Array<{ term: string; volume: number; difficulty: number; intent: string }> = [];

    if (data.reply) {
      try {
        // Extract JSON from reply
        const match = data.reply.match(/\[[\s\S]*\]/);
        if (match) suggestions = JSON.parse(match[0]);
      } catch {
        // If parsing fails, return raw text as suggestions
        suggestions = [];
      }
    }

    return NextResponse.json({ ok: true, suggestions, raw: data.reply || '' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
