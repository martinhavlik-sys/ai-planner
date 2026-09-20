import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = name => readFileSync(new URL(`../${name}`, import.meta.url));

test('v7 retains byte-identical v6 data, persistence and neutral CSS source', () => {
  for (const name of ['model.ts','repository.ts','supabase-client.ts','globals.css']) {
    const suffix = name.endsWith('.ts') ? '.txt' : '';
    assert.deepEqual(read(`app/${name}`), read(`visual-baseline/v6/${name}${suffix}`), name);
  }
});

test('local fonts are valid binary assets with recorded hashes and full OFL license', () => {
  const sources = read('public/fonts/SOURCES.md').toString();
  for (const name of ['montserrat-latin.woff2','montserrat-latin-ext.woff2','MDX_ics.woff']) {
    const data = read(`public/fonts/${name}`);
    assert.equal(data.subarray(0,4).toString(), name.endsWith('woff2') ? 'wOF2' : 'wOFF');
    assert.ok(sources.includes(createHash('sha256').update(data).digest('hex')));
  }
  assert.ok(read('public/fonts/OFL.txt').toString().includes('SIL OPEN FONT LICENSE Version 1.1'));
  const urls = [...read('app/fonts.css').toString().matchAll(/url\(['"]?([^'"\)]+)/g)].map(m => m[1]);
  assert.equal(urls.length,3);
  urls.forEach(url => { assert.ok(url.startsWith('/fonts/')); assert.ok(read(`public${url}`).length > 1000); });
});
