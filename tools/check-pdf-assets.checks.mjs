import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pdfAssetsPlugin } from '../config/pdf-assets.mjs';

test('PDF worker is served byte-for-byte without Vite browser-client injection', () => {
  const plugin = pdfAssetsPlugin();
  let middleware;
  plugin.configureServer({ middlewares: { use(handler) { middleware = handler; } } });
  let body;
  const headers = {};
  middleware({ url: '/pdf/pdf.worker.min.mjs' }, { setHeader(key, value) { headers[key] = value; }, end(value) { body = value; } }, () => assert.fail('Worker must be handled locally'));
  assert.deepEqual(body, readFileSync('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs'));
  assert.equal(headers['Content-Type'], 'application/javascript');
  assert.ok(!body.toString().includes('/@vite/client'));
});
test('production bundles include the worker and local fonts, character maps and decoders', () => {
  const emitted = [];
  pdfAssetsPlugin().generateBundle.call({ emitFile(asset) { emitted.push(asset.fileName); } });
  for (const prefix of ['pdf/pdf.worker.min.mjs', 'pdf/cmaps/', 'pdf/standard_fonts/', 'pdf/wasm/', 'pdf/iccs/']) {
    assert.ok(emitted.some(name => name.startsWith(prefix)), `Missing ${prefix}`);
  }
});
test('unknown asset paths fall through instead of reading arbitrary files', () => {
  let middleware;
  pdfAssetsPlugin().configureServer({ middlewares: { use(handler) { middleware = handler; } } });
  let passed = false;
  middleware({ url: '/pdf/../package.json' }, { end() { assert.fail('Invalid path must not be served'); } }, () => { passed = true; });
  assert.ok(passed);
});
