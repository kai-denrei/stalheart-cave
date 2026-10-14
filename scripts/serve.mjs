import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.bin':'application/octet-stream', '.woff2':'font/woff2', '.mp3':'audio/mpeg', '.wav':'audio/wav', '.svg':'image/svg+xml', '.jpg':'image/jpeg' };
export function serve(port = Number(process.env.PORT || 5186)) {
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(403); res.end(); return; }
      const data = await readFile(path);
      res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control':'no-store' });
      res.end(data);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  server.listen(port, '127.0.0.1', () => console.log(`STÅLHEART / BELOW — http://localhost:${server.address().port}`));
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) serve();
