// Fail builds if historical sample records or demo credentials re-enter shipped JS.
export function noSampleDataPlugin() {
  const forbidden = ['Apex Trading Ltd', 'Sarah Jacobs', 'Daniel Mokoena', 'Priya Naidoo', 'client@example.com', 'admin@example.com', 'Client@2026', 'Admin@2026', 'Reload demo queue', 'Mock supporting file seeded'];
  return {
    name: 'portal-no-sample-data',
    generateBundle(_options, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type !== 'chunk') continue;
        for (const text of forbidden) if (item.code.includes(text)) this.error(`Sample data is not allowed in the application bundle: ${text} (${item.fileName})`);
      }
    },
  };
}
