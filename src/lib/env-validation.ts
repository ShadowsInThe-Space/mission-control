/**
 * Environment validation for Mission Control.
 *
 * Validates that the required server-side env vars are present and well-formed
 * before any handler tries to use them. We deliberately do NOT add a runtime
 * dependency (e.g. zod) for this — the surface is small and stable, and a
 * tiny hand-rolled validator is easier to audit than a heavy schema lib.
 */

export interface MissionControlEnv {
  RANKFORGE_URL?: string;
  RANKFORGE_API_KEY?: string;
  FIRECRAWL_API_URL?: string;
  NOTEBOOKLM_MCP_URL?: string;
  BLOG_STUDIO_URL?: string;
  IMAGE_STUDIO_URL?: string;
  VIDEO_STUDIO_URL?: string;
  PODCAST_STUDIO_URL?: string;
  VISION_STUDIO_URL?: string;
  OLLAMA_HOST?: string;
  MISSION_CONTROL_MYWIKI_PATH?: string;
  NODE_ENV?: string;
}

export interface ValidatedEnv {
  rankForge: {
    url: string;
    /** Whether the API key is set. Audits will 503 without it. */
    hasApiKey: boolean;
  };
  firecrawl: { url: string };
  notebooklm: { url: string };
  contentStudios: {
    blog: { url: string };
    image: { url: string };
    video: { url: string };
    podcast: { url: string };
    vision: { url: string };
  };
  ollama: { url: string };
  mywiki: { path: string };
  isProduction: boolean;
}

const DEFAULT_RANKFORGE_URL = 'http://localhost:13001';
const DEFAULT_FIRECRAWL_URL = 'http://localhost:3002';
const DEFAULT_NOTEBOOKLM_URL = 'http://127.0.0.1:8766';
const DEFAULT_BLOG_STUDIO_URL = 'http://127.0.0.1:8770';
const DEFAULT_IMAGE_STUDIO_URL = 'http://127.0.0.1:8771';
const DEFAULT_VIDEO_STUDIO_URL = 'http://127.0.0.1:8772';
const DEFAULT_PODCAST_STUDIO_URL = 'http://127.0.0.1:8773';
const DEFAULT_VISION_STUDIO_URL = 'http://127.0.0.1:8774';
const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_MYWIKI_PATH = '/home/z3r0b1nary/workspace/mywiki';

function normalizeUrl(raw: string | undefined, fallback: string): string {
  if (!raw || !raw.trim()) return fallback;
  // Trust-but-verify: throw on obviously broken inputs so the operator
  // notices misconfiguration at boot rather than at first request.
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch (err) {
    throw new Error(
      `Invalid service URL "${raw}": ${err instanceof Error ? err.message : String(err)}`
    );
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('protocol must be http or https');
  }
  // Strip trailing slashes from the path. URL.toString() re-emits a single
  // trailing slash when one was present in the input, so we replace
  // any run of trailing slashes explicitly.
  return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, '')}${parsed.search}${parsed.hash}`;
}

export function validateEnv(env: MissionControlEnv = process.env): ValidatedEnv {
  return {
    rankForge: {
      url: normalizeUrl(env.RANKFORGE_URL, DEFAULT_RANKFORGE_URL),
      hasApiKey: Boolean(env.RANKFORGE_API_KEY && env.RANKFORGE_API_KEY.trim()),
    },
    firecrawl: {
      url: normalizeUrl(env.FIRECRAWL_API_URL, DEFAULT_FIRECRAWL_URL),
    },
    notebooklm: {
      url: normalizeUrl(env.NOTEBOOKLM_MCP_URL, DEFAULT_NOTEBOOKLM_URL),
    },
    contentStudios: {
      blog: { url: normalizeUrl(env.BLOG_STUDIO_URL, DEFAULT_BLOG_STUDIO_URL) },
      image: { url: normalizeUrl(env.IMAGE_STUDIO_URL, DEFAULT_IMAGE_STUDIO_URL) },
      video: { url: normalizeUrl(env.VIDEO_STUDIO_URL, DEFAULT_VIDEO_STUDIO_URL) },
      podcast: { url: normalizeUrl(env.PODCAST_STUDIO_URL, DEFAULT_PODCAST_STUDIO_URL) },
      vision: { url: normalizeUrl(env.VISION_STUDIO_URL, DEFAULT_VISION_STUDIO_URL) },
    },
    ollama: {
      url: normalizeUrl(env.OLLAMA_HOST, DEFAULT_OLLAMA_URL),
    },
    mywiki: {
      path: env.MISSION_CONTROL_MYWIKI_PATH?.trim() || DEFAULT_MYWIKI_PATH,
    },
    isProduction: env.NODE_ENV === 'production',
  };
}
