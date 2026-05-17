import { NextRequest, NextResponse } from 'next/server';

interface SEOIssue {
  severity: 'critical' | 'warning' | 'info';
  code: string;
  message: string;
  element?: string;
}

interface SEORecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  action: string;
  impact: string;
}

interface AnalyzeBody {
  url: string;
  title?: string;
  metaDescription?: string;
  h1s?: string[];
  wordCount?: number;
  images?: number;
  links?: string[];
  loadTime?: number;
  raw?: string;
}

function scoreSEO(data: AnalyzeBody): number {
  let score = 70; // base
  if (!data.title) score -= 15;
  else if (data.title.length < 30) score -= 5;
  else if (data.title.length > 60) score -= 5;

  if (!data.metaDescription) score -= 15;
  else if (data.metaDescription.length < 120) score -= 5;

  if (!data.h1s || data.h1s.length === 0) score -= 15;
  else if (data.h1s.length > 1) score -= 5;

  if (data.wordCount && data.wordCount < 300) score -= 10;
  else if (data.wordCount && data.wordCount > 3000) score -= 3;

  if (data.images && data.images > 0) {
    // assume some are missing alt — penalise proportionally
    score -= Math.min(5, data.images);
  }

  if (data.loadTime && data.loadTime > 3000) score -= 10;
  else if (data.loadTime && data.loadTime < 1500) score += 5;

  return Math.max(0, Math.min(100, score));
}

function buildIssues(data: AnalyzeBody): SEOIssue[] {
  const issues: SEOIssue[] = [];

  if (!data.title) {
    issues.push({ severity: 'critical', code: 'TITLE_MISSING', message: 'Page has no <title> tag' });
  } else {
    if (data.title.length < 30) issues.push({ severity: 'warning', code: 'TITLE_TOO_SHORT', message: `Title is only ${data.title.length} chars (min 30 recommended)` });
    if (data.title.length > 60) issues.push({ severity: 'info', code: 'TITLE_TOO_LONG', message: `Title is ${data.title.length} chars (max 60 recommended)` });
  }

  if (!data.metaDescription) {
    issues.push({ severity: 'critical', code: 'META_DESC_MISSING', message: 'Missing meta description' });
  } else {
    if (data.metaDescription.length < 120) issues.push({ severity: 'warning', code: 'META_DESC_TOO_SHORT', message: `Meta description only ${data.metaDescription.length} chars (min 120 recommended)` });
    if (data.metaDescription.length > 160) issues.push({ severity: 'info', code: 'META_DESC_TOO_LONG', message: `Meta description ${data.metaDescription.length} chars (max 160)` });
  }

  if (!data.h1s || data.h1s.length === 0) {
    issues.push({ severity: 'critical', code: 'H1_MISSING', message: 'No H1 heading found on page' });
  } else if (data.h1s.length > 1) {
    issues.push({ severity: 'warning', code: 'MULTIPLE_H1', message: `${data.h1s.length} H1 headings found (only 1 recommended)` });
  }

  if (data.wordCount !== undefined && data.wordCount < 300) {
    issues.push({ severity: 'warning', code: 'THIN_CONTENT', message: `Only ${data.wordCount} words — thin content (aim for 300+)` });
  }

  if (data.loadTime !== undefined && data.loadTime > 3000) {
    issues.push({ severity: 'warning', code: 'SLOW_LOAD', message: `Load time ${(data.loadTime/1000).toFixed(1)}s — slow (target < 3s)` });
  }

  return issues;
}

function buildRecommendations(issues: SEOIssue[], data: AnalyzeBody): SEORecommendation[] {
  const recs: SEORecommendation[] = [];

  for (const issue of issues) {
    if (issue.code === 'TITLE_MISSING' || issue.code === 'TITLE_TOO_SHORT') {
      recs.push({ priority: 'high', category: 'On-Page', action: 'Add a descriptive title between 30-60 characters', impact: 'Directly affects CTR in search results' });
    }
    if (issue.code === 'META_DESC_MISSING') {
      recs.push({ priority: 'high', category: 'On-Page', action: 'Write a compelling meta description (120-160 chars) with target keywords', impact: 'Improves click-through rate from SERPs' });
    }
    if (issue.code === 'H1_MISSING' || issue.code === 'MULTIPLE_H1') {
      recs.push({ priority: 'high', category: 'Content', action: 'Use exactly one H1 per page with primary keyword', impact: 'Helps search engines understand page topic' });
    }
    if (issue.code === 'THIN_CONTENT') {
      recs.push({ priority: 'medium', category: 'Content', action: 'Expand content to at least 600-1000 words for target keywords', impact: 'Better ranking potential for competitive keywords' });
    }
    if (issue.code === 'SLOW_LOAD') {
      recs.push({ priority: 'medium', category: 'Technical', action: 'Optimize images, enable compression, consider CDN', impact: 'Faster pages rank higher, reduce bounce rate' });
    }
  }

  // Positive signals
  if (data.wordCount && data.wordCount >= 1000) {
    recs.push({ priority: 'low', category: 'Content', action: 'Content depth is good — add internal links to other pages', impact: 'Distributes page authority' });
  }

  return recs;
}

export async function POST(req: NextRequest) {
  try {
    const body: AnalyzeBody = await req.json();

    const score = scoreSEO(body);
    const issues = buildIssues(body);
    const recommendations = buildRecommendations(issues, body);

    const record: {
      url: string;
      scrapedAt: number;
      score: number;
      title?: string;
      metaDescription?: string;
      h1s: string[];
      wordCount?: number;
      images?: number;
      loadTime?: number;
      issues: SEOIssue[];
      recommendations: SEORecommendation[];
    } = {
      url: body.url,
      scrapedAt: Date.now(),
      score,
      title: body.title,
      metaDescription: body.metaDescription,
      h1s: body.h1s || [],
      wordCount: body.wordCount,
      images: body.images,
      loadTime: body.loadTime,
      issues,
      recommendations,
    };

    return NextResponse.json({ ok: true, ...record });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
