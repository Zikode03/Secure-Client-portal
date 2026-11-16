import { useCallback, useMemo, useState } from "react";
import { privateStateKey } from "../../utils/privateBrowserState";

function read(key: string | null): Set<string> {
  if (!key) return new Set();
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(key) ?? "[]");
    return new Set(Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);
  } catch { return new Set(); }
}

export function useInboxReadState(audience: "client" | "firm", userId?: string) {
  const key = privateStateKey(userId, `read:${audience}`);
  const [state, setState] = useState(() => ({ key, ids: read(key) }));
  const readThreadIds = useMemo(() => state.key === key ? state.ids : read(key), [key, state]);
  const hydrateRead = useCallback((ids: string[]) => {
    setState((previous) => {
      const next = new Set([...(previous.key === key ? previous.ids : read(key)), ...ids]);
      if (key) window.sessionStorage.setItem(key, JSON.stringify([...next]));
      return { key, ids: next };
    });
  }, [key]);
  const markRead = useCallback((id: string) => hydrateRead([id]), [hydrateRead]);
  return useMemo(() => ({ hydrateRead, markRead, readThreadIds }), [hydrateRead, markRead, readThreadIds]);
}
