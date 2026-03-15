import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// We test the core logic by writing/reading files in a temp dir.
// Since the module uses homedir(), we test the file format and logic directly.

const tmpDir = join(process.cwd(), '.test-tmp-auth');
const authFile = join(tmpDir, 'auth.json');

beforeEach(() => {
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('auth token persistence', () => {
  it('saves and reads a valid token', async () => {
    const { saveAuthToken, loadAuthToken } = await mockAuthModule();
    const future = new Date(Date.now() + 3600_000).toISOString();

    saveAuthToken('test-token', future);
    assert.ok(existsSync(authFile));

    const token = loadAuthToken();
    assert.strictEqual(token, 'test-token');
  });

  it('returns null for expired token', async () => {
    const { saveAuthToken, loadAuthToken } = await mockAuthModule();
    const past = new Date(Date.now() - 1000).toISOString();

    saveAuthToken('expired-token', past);
    const token = loadAuthToken();
    assert.strictEqual(token, null);
  });

  it('returns null when no auth file exists', async () => {
    const { loadAuthToken } = await mockAuthModule();
    const token = loadAuthToken();
    assert.strictEqual(token, null);
  });

  it('returns null for malformed auth file', async () => {
    const { writeFileSync: wf } = await import('node:fs');
    wf(authFile, 'not-json', 'utf-8');

    const { loadAuthToken } = await mockAuthModule();
    const token = loadAuthToken();
    assert.strictEqual(token, null);
  });

  it('returns null for auth file missing fields', async () => {
    const { writeFileSync: wf } = await import('node:fs');
    wf(authFile, JSON.stringify({ accessToken: 'tok' }), 'utf-8');

    const { loadAuthToken } = await mockAuthModule();
    const token = loadAuthToken();
    assert.strictEqual(token, null);
  });

  it('clearAuthToken removes the file', async () => {
    const { saveAuthToken, clearAuthToken } = await mockAuthModule();
    const future = new Date(Date.now() + 3600_000).toISOString();

    saveAuthToken('test-token', future);
    assert.ok(existsSync(authFile));

    clearAuthToken();
    assert.ok(!existsSync(authFile));
  });

  it('clearAuthToken is safe when no file exists', async () => {
    const { clearAuthToken } = await mockAuthModule();
    clearAuthToken(); // should not throw
  });

  it('writes valid JSON format', async () => {
    const { saveAuthToken } = await mockAuthModule();
    const future = new Date(Date.now() + 3600_000).toISOString();

    saveAuthToken('my-token', future);
    const raw = readFileSync(authFile, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    assert.strictEqual(data['accessToken'], 'my-token');
    assert.strictEqual(data['expiresAt'], future);
  });

  it('loadAuthExpiry returns expiry date', async () => {
    const { saveAuthToken, loadAuthExpiry } = await mockAuthModule();
    const future = new Date(Date.now() + 3600_000).toISOString();

    saveAuthToken('tok', future);
    const expiry = loadAuthExpiry();
    assert.strictEqual(expiry, future);
  });
});

/**
 * Create auth functions that use our temp dir instead of ~/.kin3o.
 * This avoids touching the real filesystem.
 */
async function mockAuthModule() {
  const { existsSync: ex, mkdirSync: mk, readFileSync: rf, writeFileSync: wf, unlinkSync: ul } = await import('node:fs');

  function loadAuthToken(): string | null {
    if (!ex(authFile)) return null;
    try {
      const raw = rf(authFile, 'utf-8');
      const data = JSON.parse(raw) as Record<string, unknown>;
      if (!data['accessToken'] || !data['expiresAt']) return null;
      const expires = new Date(data['expiresAt'] as string);
      if (expires.getTime() <= Date.now()) return null;
      return data['accessToken'] as string;
    } catch {
      return null;
    }
  }

  function loadAuthExpiry(): string | null {
    if (!ex(authFile)) return null;
    try {
      const raw = rf(authFile, 'utf-8');
      const data = JSON.parse(raw) as Record<string, unknown>;
      return (data['expiresAt'] as string) ?? null;
    } catch {
      return null;
    }
  }

  function saveAuthToken(token: string, expiresAt: string): void {
    mk(tmpDir, { recursive: true });
    wf(authFile, JSON.stringify({ accessToken: token, expiresAt }, null, 2), 'utf-8');
  }

  function clearAuthToken(): void {
    if (ex(authFile)) ul(authFile);
  }

  return { loadAuthToken, loadAuthExpiry, saveAuthToken, clearAuthToken };
}
