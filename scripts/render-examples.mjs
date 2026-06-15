/**
 * Reproducibly render the example charts to PNGs for the README.
 *
 * Serves the repo root over a throwaway local HTTP server (so the examples'
 * bare `import 'd3'` import map and `fetch('./data/*.json')` both resolve),
 * loads each example in headless Chromium via Playwright, waits for the chart
 * to signal `window.__chartReady`, and screenshots the `#chart` node into
 * `docs/assets/`.
 *
 * Usage:
 *   npm install --no-save playwright   # if not already available
 *   npx playwright install chromium    # one-time browser download
 *   npm run render:examples
 *
 * Upstream dependencies: node:http, node:fs, node:path, playwright (peer/dev).
 */

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

// Charts to render: [example path relative to root, output PNG, viewport].
const TARGETS = [
  {
    url: '/examples/line_chart.html',
    out: 'docs/assets/line-chart.png',
    viewport: { width: 1040, height: 600 },
  },
  {
    url: '/examples/beeswarm.html',
    out: 'docs/assets/beeswarm-chart.png',
    viewport: { width: 920, height: 460 },
  },
];

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const filePath = path.join(ROOT, urlPath);
      // Prevent path traversal outside the repo root.
      if (!filePath.startsWith(ROOT) || !existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const body = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
      res.end(body);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error(
      'Playwright is not installed. Run:\n' +
        '  npm install --no-save playwright && npx playwright install chromium'
    );
    process.exit(1);
  }

  const server = await startServer();
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();

  try {
    for (const target of TARGETS) {
      const page = await browser.newPage({ viewport: target.viewport, deviceScaleFactor: 2 });
      await page.goto(`${base}${target.url}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__chartReady === true, { timeout: 15000 });
      // Let fonts/transitions settle.
      await page.waitForTimeout(400);
      const node = await page.$('#chart');
      const outPath = path.join(ROOT, target.out);
      await node.screenshot({ path: outPath });
      console.log(`Rendered ${target.url} -> ${target.out}`);
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
