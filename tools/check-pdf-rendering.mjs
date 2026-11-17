import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Generate a private, disposable PDF in memory; no client documents or fake application records.
const stream = '0.1 0.2 0.4 rg 20 20 160 160 re f';
const objects = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << >> >>',
  `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
];
let content = '%PDF-1.4\n';
const offsets = [0];
objects.forEach((object, index) => { offsets.push(Buffer.byteLength(content)); content += `${index + 1} 0 obj\n${object}\nendobj\n`; });
const xref = Buffer.byteLength(content);
content += `xref\n0 5\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
const task = getDocument({ data: new Uint8Array(Buffer.from(content)), useSystemFonts: true });
try {
  const pdf = await task.promise;
  assert.equal(pdf.numPages, 1);
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = createCanvas(viewport.width, viewport.height);
  await page.render({ canvas, viewport }).promise;
  const pixel = canvas.getContext('2d').getImageData(200, 200, 1, 1).data;
  assert.ok(pixel[2] > pixel[0] && pixel[3] === 255, 'The document must paint visible content, not a blank canvas.');
  console.log('PASS: real PDF.js parsed a PDF and painted verified nonblank pixels.');
} finally { await task.destroy(); }
