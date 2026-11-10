import assert from 'node:assert/strict';
import {build} from 'esbuild';

const source = await build({entryPoints: ['server/opening-media.ts'], bundle: true, write: false, format: 'esm'});
const {openingMediaResponse} = await import('data:text/javascript;base64,' + Buffer.from(source.outputFiles[0].text).toString('base64'));
const bytes = Uint8Array.from({length: 19}, (_, i) => i);

function response(range, {method = 'GET', ifRange, status = 200} = {}) {
  const headers = new Headers();
  if (range) headers.set('Range', range);
  if (ifRange) headers.set('If-Range', ifRange);
  let offset = 0;
  const body = method === 'HEAD' ? null : new ReadableStream({
    pull(controller) {
      if (offset >= bytes.length) { controller.close(); return; }
      controller.enqueue(bytes.slice(offset, offset + 4));
      offset += 4;
    },
  });
  const asset = new Response(body, {status, headers: {
    'Content-Type': 'audio/mpeg', ETag: '"music"',
    'Last-Modified': 'Tue, 10 Nov 2026 10:00:00 GMT',
  }});
  return openingMediaResponse(new Request('https://game.test/song', {headers, method}), asset, bytes.length);
}

for (const [range, start, end] of [
  ['bytes=0-1', 0, 1], ['bytes=3-12', 3, 12], ['bytes=0-', 0, 18],
  ['bytes=15-', 15, 18], ['bytes=-3', 16, 18], ['bytes=17-100', 17, 18],
]) {
  const reply = response(range);
  assert.equal(reply.status, 206, range);
  assert.equal(reply.headers.get('Content-Range'), `bytes ${start}-${end}/19`);
  assert.equal(reply.headers.get('Content-Length'), String(end - start + 1));
  assert.equal(reply.headers.get('Content-Type'), 'audio/mpeg');
  assert.deepEqual(new Uint8Array(await reply.arrayBuffer()), bytes.slice(start, end + 1));
}
for (const range of ['bytes=19-', 'bytes=16-4', 'bytes=-0']) {
  const reply = response(range);
  assert.equal(reply.status, 416);
  assert.equal(reply.headers.get('Content-Range'), 'bytes */19');
  assert.equal((await reply.arrayBuffer()).byteLength, 0);
}
for (const range of [null, 'bytes=-', 'bytes=0-1,3-5', 'invalid']) {
  const reply = response(range);
  assert.equal(reply.status, 200);
  assert.equal(reply.headers.get('Accept-Ranges'), 'bytes');
  assert.deepEqual(new Uint8Array(await reply.arrayBuffer()), bytes);
}
const head = response('bytes=0-1', {method: 'HEAD'});
assert.equal(head.status, 200);
assert.equal(head.body, null);
assert.equal(head.headers.get('Content-Length'), '19');
assert.equal(response('bytes=0-1', {ifRange: '"older"'}).status, 200);
assert.equal(response('bytes=0-1', {ifRange: '"music"'}).status, 206);
assert.equal(response('bytes=0-1', {ifRange: 'Tue, 10 Nov 2026 09:00:00 GMT'}).status, 200);
assert.equal(response('bytes=0-1', {status: 404}).status, 404);
console.log('PASS: media probes, partial streams, seek and suffix ranges, HEAD and validators.');
