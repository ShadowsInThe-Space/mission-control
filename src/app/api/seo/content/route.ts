import { NextRequest, NextResponse } from 'next/server';

interface ContentRequest {
  type: 'blog' | 'newsletter' | 'social';
  keyword: string;
  projectName?: string;
  tone?: string;
  cta?: string;
  targetWords?: number;
}

const PROMPTS = {
  blog: (kw: string, tone: string, words: number, project: string) =>
    `Du bist ein erfahrener SEO-Copywriter. Schreibe einen vollständigen Blog-Artikel.

Keyword/Thema: "${kw}"
Tone: ${tone || 'professionell und engageant'}
Projekt: ${project || 'unbekannt'}
Zielwortzahl: ${words || 800}

Anforderungen:
- SEO-optimiert für das Keyword
- H1, Einleitung (Hook), 3-4 Zwischenüberschriften (H2), Fazit
- natürlicher Keyword-Einsatz (2-3% Dichte)
- Call-to-Action am Ende
- Faktenbasiert, keine Halluzinationen
- Deutsche Sprache
- Gib NUR den fertigen Artikel aus, keine Erklärungen`,

  newsletter: (kw: string, tone: string, words: number, project: string) =>
    `Du bist ein Newsletter-Autor. Schreibe einen ansprechenden Newsletter.

Hauptthema: "${kw}"
Tone: ${tone || 'freundlich und direkt'}
Projekt/Marke: ${project || 'unbekannt'}
Zielwortzahl: ${words || 400}

Anforderungen:
- Betreffzeile (Subject) + Vorschau-Text
- Personalisierter Einstieg
- 2-3 Hauptpunkte mit konkreten Tipps
- Einbindung des Keywords organisch
- Starker CTA (Call-to-Action)
- PS am Ende für Social Proof
- Deutsche Sprache
- Gib NUR den Newsletter aus (Betreff + Text), keine Erklärungen`,

  social: (kw: string, tone: string, _words: number, project: string) =>
    `Du bist ein Social-Media-Content-Experte. Erstelle einen viralen Social-Post.

Thema: "${kw}"
Tone: ${tone || 'lifestyle, trendy, kurz'}
Marke: ${project || 'unbekannt'}

Anforderungen:
- 3 Versionen: LinkedIn, Twitter/X, Instagram
- LinkedIn: max 3000 Zeichen, professionell, mit Hashtags
- Twitter/X: max 280 Zeichen, punchy, mit Emojis
- Instagram: max 2200 Zeichen, Storytelling, mit Emojis und 5 Hashtags
- Jede Version muss das Keyword natürlich einbinden
- Gib die 3 Posts im Format aus:
  [LINKEDIN]
  ...
  [TWITTER]
  ...
  [INSTAGRAM]
  - keine Erklärungen, nur Posts`,
};

export async function POST(req: NextRequest) {
  try {
    const body: ContentRequest = await req.json();
    const { type, keyword, projectName, tone, cta, targetWords } = body;

    if (!keyword || !type) {
      return NextResponse.json({ error: 'type and keyword required' }, { status: 400 });
    }

    const promptFn = PROMPTS[type];
    if (!promptFn) {
      return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    const prompt = promptFn(keyword, tone || '', targetWords || 0, projectName || '');

    const hermesRes = await fetch('http://localhost:3001/api/agents/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'seo-content', agentType: 'hermes', content: prompt }),
      signal: AbortSignal.timeout(60000),
    });

    const data = await hermesRes.json();
    const content = data.reply || '';

    return NextResponse.json({
      ok: true,
      type,
      keyword,
      content,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      tone: tone || 'professional',
      cta: cta || '',
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
