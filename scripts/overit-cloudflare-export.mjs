import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve('out');
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(root, `.${path}`);
    assert.ok(file === root || file.startsWith(`${root}/`), 'Cesta musí zostať vo výstupe exportu.');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const content = await readFile(file);
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff': 'font/woff', '.woff2': 'font/woff2' };
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    response.end(content);
  } catch {
    response.writeHead(404); response.end('Súbor neexistuje.');
  }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const assets = new Set();
  for (const route of ['/', '/report', '/report/', '/', '/report/']) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 200, `Cesta ${route} musí fungovať aj pri opakovanom načítaní.`);
    const html = await response.text();
    assert.match(html, /<html[^>]*lang="sk"/, 'Export musí obsahovať slovenský dokument.');
    for (const match of html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)) {
      if (match[1].startsWith('/_next/')) assets.add(match[1]);
    }
  }
  assert.ok(assets.size > 0, 'Export musí obsahovať odkazy na lokálne skripty a štýly.');
  for (const asset of assets) {
    const response = await fetch(`${base}${asset}`);
    assert.equal(response.status, 200, `Chýba lokálny súbor ${asset}.`);
    if (asset.endsWith('.css')) {
      for (const match of (await response.text()).matchAll(/url\(["']?(\/fonts\/[^)"']+)/g)) assets.add(match[1]);
    }
  }
  for (const name of ['montserrat-latin.woff2', 'montserrat-latin-ext.woff2', 'MDX_ics.woff']) {
    const response = await fetch(`${base}/fonts/${name}`);
    assert.equal(response.status, 200, `Chýba font ${name}.`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(`public/fonts/${name}`), `Font ${name} sa pri exporte nesmie zmeniť.`);
  }
  console.log(`PASS: koreň, Report, opakované HTTP načítanie, ${assets.size} lokálnych súborov a 3 nezmenené fonty.`);
  console.log('Táto CLI kontrola nevykonáva JavaScript v prehliadači ani vizuálnu kontrolu.');
} finally {
  await new Promise(resolve => server.close(resolve));
}
