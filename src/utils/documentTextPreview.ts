/** Document metadata and OCR output are untrusted text, never HTML. */
export function buildDocumentTextPreview(fileName: string, text: string) {
  const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escape(fileName)}</title>
    <style>
      body { margin: 0; padding: 24px; font-family: Calibri, system-ui, -apple-system, Segoe UI, sans-serif; background: #f8fafc; color: #0f172a; }
      pre { white-space: pre-wrap; line-height: 1.6; font-size: 14px; }
    </style>
  </head>
  <body>
    <h1 style="font-size:20px; margin:0 0 12px;">${escape(fileName)}</h1>
    <pre>${escape(text)}</pre>
  </body>
</html>`;
}
