export function securityHeaders(apiBaseUrl) {
  const apiOrigin = new URL(apiBaseUrl).origin;
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // React progress bars and positioning use style attributes.
    `connect-src 'self' ${apiOrigin}`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "frame-src 'self' blob:", // In-app PDF previews use object URLs.
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
  return {
    'Content-Security-Policy': policy,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=2592000',
  };
}

export function productionSecurityPlugin(apiBaseUrl) {
  const headers = securityHeaders(apiBaseUrl);
  return {
    name: 'portal-production-security',
    apply: 'build',
    transformIndexHtml() {
      // frame-ancestors is enforced only by HTTP headers, not CSP meta tags.
      return [{ tag: 'meta', attrs: {
        'http-equiv': 'Content-Security-Policy',
        content: headers['Content-Security-Policy'].replace("; frame-ancestors 'none'", ''),
      }, injectTo: 'head-prepend' }];
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_headers', source:
        `/*\n${Object.entries(headers).map(([key, value]) => `  ${key}: ${value}`).join('\n')}\n` });
      this.emitFile({ type: 'asset', fileName: 'security-headers.nginx.conf', source:
        Object.entries(headers).map(([key, value]) => `add_header ${key} "${value}" always;`).join('\n') + '\n' });
      const xml = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
      this.emitFile({ type: 'asset', fileName: 'web.config', source:
        `<?xml version="1.0" encoding="utf-8"?>\n<configuration>\n  <system.webServer>\n    <httpProtocol>\n      <customHeaders>\n${Object.entries(headers).map(([key, value]) => `        <remove name="${key}" />\n        <add name="${key}" value="${xml(value)}" />`).join('\n')}\n      </customHeaders>\n    </httpProtocol>\n  </system.webServer>\n</configuration>\n` });
    },
  };
}
