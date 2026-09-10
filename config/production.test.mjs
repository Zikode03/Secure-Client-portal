import { describe, expect, it } from 'vitest';
import { validateProductionEnvironment } from './production.mjs';

const valid = { VITE_USE_BACKEND: 'true', VITE_API_BASE_URL: 'https://api.portal.example' };
describe('deployment environment', () => {
  it('accepts an explicit live HTTPS backend', () => {
    expect(() => validateProductionEnvironment(valid)).not.toThrow();
  });
  it.each([{}, { ...valid, VITE_USE_BACKEND: 'false' }, { ...valid, VITE_USE_BACKEND: '' }])('rejects implicit or explicit demo mode: %j', env => {
    expect(() => validateProductionEnvironment(env)).toThrow();
  });
  it.each(['', '/api', 'http://api.portal.example', 'https://localhost:4000', 'https://localhost.', 'https://127.0.0.1', 'https://[::1]', 'https://dev.localhost', 'https://portal.local', 'https://user:secret@api.portal.example', 'https://api.portal.example?token=secret'])('rejects unsafe API URL: %s', url => {
    expect(() => validateProductionEnvironment({ ...valid, VITE_API_BASE_URL: url })).toThrow();
  });
});
