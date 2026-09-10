export function validateProductionEnvironment(env) {
  const errors = [];
  if (!['true', '1'].includes(env.VITE_USE_BACKEND?.trim().toLowerCase())) {
    errors.push('VITE_USE_BACKEND must be true for a production build.');
  }
  try {
    const url = new URL(env.VITE_API_BASE_URL?.trim() || '');
    const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
        host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
        host === '::1' || host === '0.0.0.0' || host.startsWith('127.') || !host.includes('.')) {
      throw new Error('Unsafe API URL');
    }
  } catch {
    errors.push('VITE_API_BASE_URL must be an absolute HTTPS API URL with a non-local hostname and no credentials, query or fragment.');
  }
  if (errors.length) throw new Error(`Production configuration is invalid:\n${errors.join('\n')}`);
}
