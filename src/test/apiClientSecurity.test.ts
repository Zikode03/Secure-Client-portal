import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
let client: typeof import('../services/apiClient');
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(async () => {
  vi.resetModules();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  client = await import('../services/apiClient');
});
afterEach(() => vi.unstubAllGlobals());

describe('API CSRF protection', () => {
  it('shares one token bootstrap across concurrent writes and protects JSON, uploads and delete', async () => {
    fetchMock.mockImplementation(async (url: string) => url.endsWith('/csrf') ? json({ requestToken: 'token-one' }) : json({ ok: true }));
    await Promise.all([
      client.apiPostJson('/api/documents', {}), client.apiPutJson('/api/settings', {}),
      client.apiPatchJson('/api/requests/1', {}), client.apiDelete('/api/documents/1'),
      client.apiPostForm('/api/documents/upload', new FormData()),
    ]);
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/csrf'))).toHaveLength(1);
    for (const [url, init] of fetchMock.mock.calls.filter(([url]) => !url.endsWith('/csrf'))) {
      expect(new Headers(init.headers).get('X-CSRF-Token')).toBe('token-one');
      expect(init.credentials).toBe('include');
      if (url.endsWith('/upload')) expect(new Headers(init.headers).has('Content-Type')).toBe(false);
    }
  });

  it('refreshes a stale token and retries only the explicitly rejected request', async () => {
    fetchMock.mockResolvedValueOnce(json({ requestToken: 'stale' }))
      .mockResolvedValueOnce(json({ code: 'CSRF_INVALID' }, 403))
      .mockResolvedValueOnce(json({ requestToken: 'fresh' }))
      .mockResolvedValueOnce(json({ ok: true }));
    await client.apiPostJson('/api/documents', { value: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(new Headers(fetchMock.mock.calls[3][1].headers).get('X-CSRF-Token')).toBe('fresh');
    expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[3][1].body);
  });

  it.each([403, 500])('does not replay an ordinary %s failure', async status => {
    fetchMock.mockResolvedValueOnce(json({ requestToken: 'token' })).mockResolvedValueOnce(json({ code: 'OTHER_ERROR' }, status));
    await expect(client.apiDelete('/api/documents/1')).rejects.toMatchObject({ status });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('stops after a second CSRF rejection', async () => {
    fetchMock.mockImplementation(async (url: string) => url.endsWith('/csrf') ? json({ requestToken: 'token' }) : json({ code: 'CSRF_INVALID' }, 403));
    await expect(client.apiPostJson('/api/documents', {})).rejects.toMatchObject({ code: 'CSRF_INVALID' });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('obtains a new identity-bound token after login and logout', async () => {
    fetchMock.mockImplementation(async (url: string) => url.endsWith('/csrf') ? json({ requestToken: 'token' }) : json({ ok: true }));
    await client.apiPostJson('/api/auth/login', {});
    await client.apiPostJson('/api/auth/logout', {});
    await client.apiPostJson('/api/auth/login', {});
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/csrf'))).toHaveLength(3);
  });

  it('never sends the mutation if token acquisition fails', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 503));
    await expect(client.apiPostJson('/api/documents', {})).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not send credentials or CSRF tokens to another origin', async () => {
    await expect(client.apiPostJson('https://attacker.example/api/documents', {})).rejects.toMatchObject({ code: 'UNTRUSTED_API_URL' });
    await expect(client.apiGetJson('//attacker.example/api/documents')).rejects.toMatchObject({ code: 'UNTRUSTED_API_URL' });
    await expect(client.apiPostJson('/\\attacker.example/api/documents', {})).rejects.toMatchObject({ code: 'UNTRUSTED_API_URL' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps reads free of token bootstrapping', async () => {
    fetchMock.mockResolvedValueOnce(json([]));
    await client.apiGetJson('/api/documents');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new Headers(fetchMock.mock.calls[0][1].headers).has('X-CSRF-Token')).toBe(false);
  });
});
