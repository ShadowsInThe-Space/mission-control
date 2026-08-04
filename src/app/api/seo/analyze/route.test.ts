import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

function jsonRequest(body: unknown) {
  return new NextRequest('http://localhost/api/seo/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/seo/analyze', () => {
  it('scores a well-optimized page highly and reports no critical issues', async () => {
    const response = await POST(
      jsonRequest({
        url: 'https://example.com/good',
        title: 'A Properly Lengthed Page Title',
        metaDescription: 'A compelling meta description that is long enough to meet the minimum length threshold of one hundred twenty characters for SEO.',
        h1s: ['Main Heading'],
        wordCount: 1200,
        loadTime: 1200,
      })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.score).toBeGreaterThanOrEqual(70);
    expect(body.issues.filter((i: { severity: string }) => i.severity === 'critical')).toHaveLength(0);
    expect(body.url).toBe('https://example.com/good');
  });

  it('flags missing title, meta description, and H1 as critical and lowers the score', async () => {
    const response = await POST(
      jsonRequest({
        url: 'https://example.com/bad',
        wordCount: 100,
        loadTime: 4000,
      })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.score).toBeLessThan(50);
    const codes = body.issues.map((i: { code: string }) => i.code);
    expect(codes).toEqual(expect.arrayContaining(['TITLE_MISSING', 'META_DESC_MISSING', 'H1_MISSING', 'THIN_CONTENT', 'SLOW_LOAD']));
    const highPriorityCategories = body.recommendations
      .filter((r: { priority: string }) => r.priority === 'high')
      .map((r: { category: string }) => r.category);
    expect(highPriorityCategories.length).toBeGreaterThan(0);
  });

  it('returns 500 on malformed JSON', async () => {
    const request = new NextRequest('http://localhost/api/seo/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not valid json',
    });
    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
