import { describe, expect, it } from 'vitest';
import { validateEnv } from './env-validation';

describe('env validation', () => {
  it('uses sensible defaults for every service URL', () => {
    const result = validateEnv({});
    expect(result.rankForge.url).toBe('http://localhost:13001');
    expect(result.rankForge.hasApiKey).toBe(false);
    expect(result.firecrawl.url).toBe('http://localhost:3002');
    expect(result.notebooklm.url).toBe('http://127.0.0.1:8766');
    expect(result.contentStudios.blog.url).toBe('http://127.0.0.1:8770');
    expect(result.contentStudios.vision.url).toBe('http://127.0.0.1:8774');
    expect(result.ollama.url).toBe('http://127.0.0.1:11434');
    expect(result.mywiki.path).toBe('/home/z3r0b1nary/workspace/mywiki');
    expect(result.isProduction).toBe(false);
  });

  it('honours explicit overrides and reports the API key as present', () => {
    const result = validateEnv({
      RANKFORGE_URL: 'https://rankforge.example.com',
      RANKFORGE_API_KEY: '  secret ',
      NOTEBOOKLM_MCP_URL: 'http://mcp.local:9999',
      NODE_ENV: 'production',
    });
    expect(result.rankForge.url).toBe('https://rankforge.example.com');
    expect(result.rankForge.hasApiKey).toBe(true);
    expect(result.notebooklm.url).toBe('http://mcp.local:9999');
    expect(result.isProduction).toBe(true);
  });

  it('trims trailing slashes from user-provided URLs', () => {
    const result = validateEnv({ RANKFORGE_URL: 'http://localhost:13001///' });
    expect(result.rankForge.url).toBe('http://localhost:13001');
  });

  it('rejects non-http(s) protocols so operators catch misconfiguration at boot', () => {
    expect(() => validateEnv({ RANKFORGE_URL: 'ftp://example.com' })).toThrow(/protocol/);
  });

  it('rejects unparseable URLs', () => {
    expect(() => validateEnv({ RANKFORGE_URL: 'not a url' })).toThrow(/Invalid service URL/);
  });

  it('reports the API key as missing when the value is whitespace-only', () => {
    const result = validateEnv({ RANKFORGE_API_KEY: '   ' });
    expect(result.rankForge.hasApiKey).toBe(false);
  });
});
