import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// PDF workers run outside the browser window. Serve their bytes unchanged:
// Vite's normal module transform injects browser-only development client code.
export function pdfAssetsPlugin() {
  const root = resolve('node_modules/pdfjs-dist');
  const files = new Map([['pdf.worker.min.mjs', resolve(root, 'legacy/build/pdf.worker.min.mjs')]]);
  for (const directory of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
    for (const item of readdirSync(resolve(root, directory), { withFileTypes: true })) {
      if (item.isFile()) files.set(`${directory}/${item.name}`, resolve(root, directory, item.name));
    }
  }
  return {
    name: 'portal-local-pdf-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0];
        const file = path?.startsWith('/pdf/') && files.get(path.slice(5));
        if (!file) return next();
        res.setHeader('Content-Type', file.endsWith('.mjs') ? 'application/javascript' : file.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(readFileSync(file));
      });
    },
    generateBundle() {
      for (const [name, path] of files) this.emitFile({ type: 'asset', fileName: `pdf/${name}`, source: readFileSync(path) });
    },
  };
}
