import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const root = path.resolve(process.env.SITE_ROOT || 'site');
const types = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.woff2', 'font/woff2'],
  ['.mp3', 'audio/mpeg'],
]);
const compressible = new Set(['.css', '.html', '.js', '.json', '.svg', '.xml', '.txt']);
const productionCsp = "default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self' https://static.cloudflareinsights.com https://js.stripe.com https://*.js.stripe.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https://cdn.discordapp.com https://*.stripe.com https://*.link.com; connect-src 'self' https://cloudflareinsights.com https://api.vozen.org https://api.stripe.com https://checkout.stripe.com https://r.stripe.com https://*.stripe.com https://link.com https://*.link.com; frame-src https://checkout.stripe.com https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com https://link.com https://*.link.com; media-src 'self'; form-action 'self'; frame-ancestors 'none'";

// Loopback-only development bridge. Never accepts a caller-supplied upstream URL
// or forwards cookies/authorization; production keeps its existing CORS policy.
const publicStatusEndpoints = {
  tts: 'https://api.vozen.org/api/public/status',
  helper: 'https://api.vozen.org/rust/health',
  history: 'https://api.vozen.org/api/public/status/history',
  stats: 'https://api.vozen.org/api/public/stats',
};

async function handleRequest(request, response, fetchPublic, publicStatusPreview) {
  const pathname = decodeURIComponent(new URL(request.url || '/', 'http://local.test').pathname);
  if (pathname.startsWith('/__preview/public-status/')) {
    if (!publicStatusPreview) { response.writeHead(404); response.end(); return; }
    const key = pathname.slice('/__preview/public-status/'.length);
    const endpoint = Object.hasOwn(publicStatusEndpoints, key) ? publicStatusEndpoints[key] : null;
    if (!endpoint || request.method !== 'GET') {
      response.writeHead(endpoint ? 405 : 404);
      response.end();
      return;
    }
    const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' };
    try {
      const upstream = await fetchPublic(endpoint, { headers: { accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(8000) });
      if (!upstream.ok) throw new Error('Public check failed');
      const body = await upstream.text();
      if (body.length > (key === 'history' ? 131072 : 16384)) throw new Error('Oversized public check');
      JSON.parse(body);
      response.writeHead(200, headers);
      response.end(body);
    } catch {
      response.writeHead(502, headers);
      response.end('{"error":"public_check_unavailable"}');
    }
    return;
  }
  const relative = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const filename = path.resolve(root, `.${relative}`);
  if (!filename.startsWith(`${root}${path.sep}`) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  const extension = path.extname(filename).toLowerCase();
  const headers = {
    'content-type': types.get(path.extname(filename).toLowerCase()) || 'application/octet-stream',
    'cache-control': 'no-store',
  };
  if (extension === '.html') headers['content-security-policy'] = productionCsp;
  const acceptsGzip = /(?:^|,)\s*gzip\s*(?:,|$)/i.test(request.headers['accept-encoding'] || '');
  if (acceptsGzip && compressible.has(extension)) {
    headers['content-encoding'] = 'gzip';
    headers.vary = 'Accept-Encoding';
    response.writeHead(200, headers);
    fs.createReadStream(filename).pipe(zlib.createGzip()).pipe(response);
    return;
  }
  response.writeHead(200, headers);
  fs.createReadStream(filename).pipe(response);
}

export function createSiteServer(port = 0, { fetchPublic = fetch, publicStatusPreview = false } = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => { void handleRequest(request, response, fetchPublic, publicStatusPreview); });
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

export function closeSiteServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    // Browser preconnections and unfinished requests can outlive a Lighthouse
    // run. This server is temporary; none of its sockets need to survive it.
    server.closeAllConnections();
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] || process.env.PREVIEW_PORT || 4177);
  const { server, origin } = await createSiteServer(port, { publicStatusPreview: true });
  console.log(`Serving site at ${origin}`);
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => { void closeSiteServer(server); });
  }
}
