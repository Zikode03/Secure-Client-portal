import { describe, expect, it } from 'vitest';
import { securityHeaders, productionSecurityPlugin } from './security-headers.mjs';

describe('frontend security headers', () => {
  it('limits scripts and API connections while permitting document previews', () => {
    const headers = securityHeaders('https://portal.example');
    expect(headers['Content-Security-Policy']).toContain("script-src 'self';");
    expect(headers['Content-Security-Policy']).not.toContain('unsafe-eval');
    expect(headers['Content-Security-Policy']).toContain("connect-src 'self' https://portal.example;");
    expect(headers['Content-Security-Policy']).toContain("frame-src 'self' blob:");
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(headers['Referrer-Policy']).toBe('no-referrer');
  });
  it('emits HTTP headers for hosting and a valid CSP meta fallback', () => {
    const plugin = productionSecurityPlugin('https://portal.example');
    const files = [];
    plugin.generateBundle.call({ emitFile: file => files.push(file) });
    expect(files.find(file => file.fileName === '_headers').source).toContain('X-Frame-Options: DENY');
    expect(files.find(file => file.fileName.endsWith('.nginx.conf')).source).toContain('always;');
    expect(files.find(file => file.fileName === 'web.config').source).toContain('<add name="X-Frame-Options" value="DENY" />');
    expect(plugin.transformIndexHtml()[0].attrs.content).not.toContain('frame-ancestors');
  });
});
