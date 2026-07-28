import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'root');
const port = Number(process.env.PORT) || 3000;
const debugAllCards = process.argv.includes('--debug-all-cards');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };

http.createServer((req, res) => {
    const requestUrl = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(requestUrl.pathname);
    if (debugAllCards && pathname === '/' && requestUrl.searchParams.get('debug') !== 'all-cards') {
        res.writeHead(302, { Location: '/?debug=all-cards' }).end();
        return;
    }
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) && file !== root) {
        res.writeHead(403).end('Forbidden'); return;
    }
    fs.readFile(file, (error, data) => {
        if (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
    });
}).listen(port, '127.0.0.1', () => {
    const suffix = debugAllCards ? '/?debug=all-cards' : '';
    console.log(`育成っちバトル: http://localhost:${port}${suffix}${debugAllCards ? ' [全カード解放デバッグ]' : ''}`);
});
