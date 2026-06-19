export interface SeoOpsEnv {
  [key: string]: string | undefined;
  RANKFORGE_URL?: string;
  RANKFORGE_API_KEY?: string;
}

export interface SeoOpsConfig {
  rankForgeUrl: string;
  rankForgeApiKey: string;
}

export interface RankForgePageRecord {
  url: string;
  statusCode?: number | null;
  title?: string | null;
  description?: string | null;
  h1?: string | null;
  wordCount?: number | null;
  score?: number | null;
  issues?: unknown;
}

export interface NormalizedAuditPage {
  url: string;
  statusCode: number | null;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  wordCount: number | null;
  score: number | null;
  issues: unknown[];
}

const DEFAULT_RANKFORGE_URL = 'http://localhost:13001';
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^.*\.local$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
];

export function getSeoOpsConfig(env: SeoOpsEnv = process.env): SeoOpsConfig {
  const rankForgeApiKey = env.RANKFORGE_API_KEY?.trim();
  if (!rankForgeApiKey) {
    throw new Error('RANKFORGE_API_KEY must be configured for SEO Ops');
  }

  return {
    rankForgeUrl: normalizeServiceBaseUrl(env.RANKFORGE_URL || DEFAULT_RANKFORGE_URL),
    rankForgeApiKey,
  };
}

export function validatePublicAuditUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Audit target must be a public http URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Audit target must be a public http URL');
  }

  const hostname = url.hostname.toLowerCase();
  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname))) {
    throw new Error('Audit target must be a public http URL');
  }

  return url.toString();
}

export function buildRankForgeUrl(path: string, config: SeoOpsConfig): URL {
  return new URL(path, `${config.rankForgeUrl}/`);
}

export function normalizeAuditPages(pages: RankForgePageRecord[] | undefined): NormalizedAuditPage[] {
  return (pages || []).map((page) => ({
    url: page.url,
    statusCode: page.statusCode ?? null,
    title: page.title ?? null,
    metaDescription: page.description ?? null,
    h1: page.h1 ?? null,
    wordCount: page.wordCount ?? null,
    score: page.score ?? null,
    issues: normalizeIssues(page.issues),
  }));
}

function normalizeServiceBaseUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function normalizeIssues(issues: unknown): unknown[] {
  if (Array.isArray(issues)) return issues;
  if (typeof issues !== 'string') return [];

  try {
    const parsed = JSON.parse(issues);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
