import { describe, expect, it } from 'vitest';

import {
  getSeoOpsConfig,
  normalizeAuditPages,
  validatePublicAuditUrl,
} from './seo-ops';

describe('seo ops config', () => {
  it('uses the local RankForge service default and requires an explicit internal key', () => {
    const config = getSeoOpsConfig({
      RANKFORGE_API_KEY: 'configured-secret',
    });

    expect(config.rankForgeUrl).toBe('http://localhost:13001');
    expect(config.rankForgeApiKey).toBe('configured-secret');
  });

  it('does not provide a hardcoded RankForge API key fallback', () => {
    expect(() => getSeoOpsConfig({})).toThrow(/RANKFORGE_API_KEY/);
  });
});

describe('validatePublicAuditUrl', () => {
  it.each([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://0.0.0.0:3000',
    'http://10.0.0.4',
    'http://172.16.0.10',
    'http://192.168.1.20',
    'http://169.254.10.10',
    'http://rankforge.local',
    'file:///etc/passwd',
  ])('rejects internal or non-http crawl target %s', (url) => {
    expect(() => validatePublicAuditUrl(url)).toThrow(/public http/);
  });

  it('returns a normalized public http crawl target', () => {
    expect(validatePublicAuditUrl('https://example.com/path?q=mission')).toBe(
      'https://example.com/path?q=mission',
    );
  });
});

describe('normalizeAuditPages', () => {
  it('normalizes RankForge page records and tolerates invalid JSON issue fields', () => {
    expect(
      normalizeAuditPages([
        {
          url: 'https://example.com',
          statusCode: 200,
          title: 'Home',
          description: 'Meta',
          h1: 'Mission',
          wordCount: 500,
          score: 88,
          issues: '[{"type":"title"}]',
        },
        {
          url: 'https://example.com/bad',
          issues: 'not json',
        },
      ]),
    ).toEqual([
      {
        url: 'https://example.com',
        statusCode: 200,
        title: 'Home',
        metaDescription: 'Meta',
        h1: 'Mission',
        wordCount: 500,
        score: 88,
        issues: [{ type: 'title' }],
      },
      {
        url: 'https://example.com/bad',
        statusCode: null,
        title: null,
        metaDescription: null,
        h1: null,
        wordCount: null,
        score: null,
        issues: [],
      },
    ]);
  });
});
