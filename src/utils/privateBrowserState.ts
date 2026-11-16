const privatePrefixes = ["accounting-document-control-client-portal", "inbox-draft:", "inbox-read:", "portal-private:"];

/** Clear only private workflow caches, preserving display/theme preferences. */
export function clearPrivateBrowserState(keepUserId?: string) {
  if (typeof window === "undefined") return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of Object.keys(storage)) {
      if (privatePrefixes.some((prefix) => key.startsWith(prefix)) &&
          !(keepUserId && key.startsWith(`portal-private:${encodeURIComponent(keepUserId)}:`))) storage.removeItem(key);
    }
  }
}

export function privateStateKey(userId: string | undefined, resource: string) {
  return userId ? `portal-private:${encodeURIComponent(userId)}:${resource}` : null;
}

export function clearLegacyPrivateState() {
  if (typeof window === "undefined") return;
  for (const storage of [window.localStorage, window.sessionStorage])
    for (const key of Object.keys(storage))
      if (privatePrefixes.slice(0, 3).some((prefix) => key.startsWith(prefix))) storage.removeItem(key);
}
