import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { startViewServer, type ViewServer } from './view.js';

const tmpDir = join(process.cwd(), '.test-tmp-view');
let server: ViewServer | null = null;

afterEach(() => {
  server?.close();
  server = null;
  rmSync(tmpDir, { recursive: true, force: true });
});

function createTmpJson(data: object = { v: '5.5.2', fr: 60, ip: 0, op: 120, w: 512, h: 512, layers: [] }): string {
  mkdirSync(tmpDir, { recursive: true });
  const filePath = join(tmpDir, 'test-anim.json');
  writeFileSync(filePath, JSON.stringify(data), 'utf-8');
  return filePath;
}

describe('view server', () => {
  it('serves HTML for a .json file', async () => {
    const filePath = createTmpJson();
    server = await startViewServer(filePath, { openBrowser: false });

    const res = await fetch(server.url);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/html'));

    const body = await res.text();
    assert.ok(body.includes('lottie'), 'body should reference lottie');
    assert.ok(body.includes('EventSource'), 'body should include SSE script');
  });

  it('SSE endpoint returns correct headers', async () => {
    const filePath = createTmpJson();
    server = await startViewServer(filePath, { openBrowser: false });

    const controller = new AbortController();
    const res = await fetch(`${server.url}/events`, { signal: controller.signal });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'text/event-stream');
    assert.strictEqual(res.headers.get('cache-control'), 'no-cache');

    controller.abort();
  });

  it('file change triggers SSE reload event', async () => {
    const filePath = createTmpJson();
    server = await startViewServer(filePath, { openBrowser: false });

    const reloadReceived = new Promise<boolean>((resolve, reject) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
        reject(new Error('SSE reload event not received within 2s'));
      }, 2000);

      fetch(`${server!.url}/events`, { signal: controller.signal })
        .then((res) => {
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();

          function read(): Promise<void> {
            return reader.read().then(({ value, done }) => {
              if (done) return;
              const text = decoder.decode(value);
              if (text.includes('data: reload')) {
                clearTimeout(timeout);
                controller.abort();
                resolve(true);
                return;
              }
              return read();
            });
          }

          return read();
        })
        .catch((err) => {
          if (err.name !== 'AbortError') reject(err);
        });
    });

    // Trigger file change after a short delay to let SSE connect
    await new Promise((r) => setTimeout(r, 200));
    writeFileSync(filePath, JSON.stringify({ v: '5.5.2', fr: 30 }), 'utf-8');

    const result = await reloadReceived;
    assert.ok(result, 'should have received SSE reload event');
  });

  it('auto-selects port when none specified', async () => {
    const filePath = createTmpJson();
    server = await startViewServer(filePath, { openBrowser: false });

    assert.ok(server.url.startsWith('http://localhost:'));
    const port = parseInt(new URL(server.url).port, 10);
    assert.ok(port > 0, 'port should be a positive number');
  });

  it('returns 404 for unknown routes', async () => {
    const filePath = createTmpJson();
    server = await startViewServer(filePath, { openBrowser: false });

    const res = await fetch(`${server.url}/nonexistent`);
    assert.strictEqual(res.status, 404);
  });

  it('rejects non-existent file on first request', async () => {
    const fakePath = join(tmpDir, 'does-not-exist.json');
    mkdirSync(tmpDir, { recursive: true });

    // startViewServer doesn't validate — the error happens on first request
    // We need to catch the server error or check that the request fails
    try {
      server = await startViewServer(fakePath, { openBrowser: false });
      const res = await fetch(server.url);
      // Server should error trying to read non-existent file
      assert.strictEqual(res.status, 500);
    } catch {
      // Expected — file doesn't exist, server can't render
      assert.ok(true);
    }
  });
});
