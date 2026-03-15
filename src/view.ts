import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, watch, type FSWatcher } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import open from 'open';

const templateDir = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  'preview',
);

const SSE_SCRIPT = `<script>
(function(){
  var es = new EventSource('/events');
  es.onmessage = function(){ location.reload(); };
  es.onerror = function(){ es.close(); };
})();
</script>`;

export interface ViewOptions {
  port?: number;
  openBrowser?: boolean;
}

export interface ViewServer {
  url: string;
  close(): void;
}

function renderHtml(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  let template: string;
  let html: string;

  if (ext === '.lottie') {
    template = readFileSync(join(templateDir, 'template-interactive.html'), 'utf-8');
    const base64 = readFileSync(filePath).toString('base64');
    html = template.replace('__DOTLOTTIE_DATA_BASE64__', base64);
  } else {
    template = readFileSync(join(templateDir, 'template.html'), 'utf-8');
    const json = readFileSync(filePath, 'utf-8');
    html = template.replace('__ANIMATION_DATA__', json);
  }

  return html.replace('</body>', SSE_SCRIPT + '</body>');
}

export function startViewServer(filePath: string, options?: ViewOptions): Promise<ViewServer> {
  const clients = new Set<ServerResponse>();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let watcher: FSWatcher | null = null;

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/' || req.url === '') {
      try {
        const html = renderHtml(filePath);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    if (req.url === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write('\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    if (req.url === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });

  // Watch for file changes
  watcher = watch(filePath, () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      for (const client of clients) {
        client.write('data: reload\n\n');
      }
    }, 100);
  });

  const requestedPort = options?.port ?? 0;

  return new Promise((resolve) => {
    server.listen(requestedPort, () => {
      const port = (server.address() as AddressInfo).port;
      const url = `http://localhost:${port}`;

      if (options?.openBrowser !== false) {
        open(url);
      }

      resolve({
        url,
        close() {
          if (debounceTimer) clearTimeout(debounceTimer);
          watcher?.close();
          for (const client of clients) {
            client.end();
          }
          clients.clear();
          server.close();
        },
      });
    });
  });
}
