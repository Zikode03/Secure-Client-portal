import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Keep OCR engines and language files on the portal origin; no external CDN.
export function ocrAssetsPlugin() {
  const files = new Map([
    ['worker.min.js', resolve('node_modules/tesseract.js/dist/worker.min.js')],
    ['eng.traineddata.gz', resolve('node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz')],
    ...readdirSync('node_modules/tesseract.js-core').filter(name => /\.(wasm|wasm\.js)$/.test(name))
      .map(name => [name, resolve('node_modules/tesseract.js-core', name)]),
  ]);
  return {
    name: 'portal-local-ocr',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split('?')[0]?.replace(/^\/ocr\//, '');
        const file = req.url?.startsWith('/ocr/') && files.get(name);
        if (!file) return next();
        res.setHeader('Content-Type', name.endsWith('.js') ? 'application/javascript' : name.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream');
        res.end(readFileSync(file));
      });
    },
    generateBundle() {
      for (const [name, path] of files) this.emitFile({ type: 'asset', fileName: `ocr/${name}`, source: readFileSync(path) });
    },
  };
}
