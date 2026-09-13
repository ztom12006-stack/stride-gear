import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readState, writeState } from './state-store.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist-self');
const port = Number(process.env.PORT || 4173);
const host = process.env.STRIDE_HOST || '127.0.0.1';
const maximumBody = 32 * 1024 * 1024;
const types = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

function reply(res, status, payload, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
  res.end(typeof payload === 'string' ? payload : JSON.stringify(payload));
}

async function body(req) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > maximumBody) throw new Error('请求内容过大。');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function hasSafeOrigin(req) {
  if (!req.headers.origin) return true;
  return req.headers.origin === `http://${req.headers.host}` || req.headers.origin === `https://${req.headers.host}`;
}

async function serveFile(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const absolute = path.resolve(root, `.${requested}`);
  if (!absolute.startsWith(root + path.sep) && absolute !== path.join(root, 'index.html')) return reply(res, 403, 'Forbidden');
  let source = absolute;
  try {
    if (!(await stat(source)).isFile()) throw new Error('not file');
  } catch {
    source = path.join(root, 'index.html');
  }
  try {
    const extension = path.extname(source).toLowerCase();
    const cache = extension === '.html' || source.endsWith('sw.js') ? 'no-store' : 'public, max-age=31536000, immutable';
    res.writeHead(200, { 'Content-Type': types[extension] || 'application/octet-stream', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' });
    res.end(await readFile(source));
  } catch {
    reply(res, 404, 'Not found');
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/api/health') return reply(res, 200, { ok: true, storage: 'sqlite' });
    if (url.pathname === '/api/state' && req.method === 'GET') return reply(res, 200, readState());
    if (url.pathname === '/api/state' && req.method === 'PUT') {
      if (!hasSafeOrigin(req)) return reply(res, 403, { error: '请求来源不匹配。' });
      const update = await body(req);
      const result = writeState(update.state, update.revision);
      return reply(res, 200, { revision: result.revision });
    }
    if (url.pathname.startsWith('/api/')) return reply(res, 404, { error: '未找到接口。' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return reply(res, 405, 'Method not allowed');
    return serveFile(req, res, url.pathname);
  } catch (error) {
    const status = error?.code === 'REVISION_CONFLICT' ? 409 : 400;
    return reply(res, status, { error: error instanceof Error ? error.message : '服务器错误。' });
  }
});

server.listen(port, host, () => {
  console.log(`STRIDE self-hosted is ready at http://${host}:${port}`);
});
