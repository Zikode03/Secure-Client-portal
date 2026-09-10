import { useCallback, useEffect, useMemo, useState } from "react";

function readStoredIds(key: string) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []);
  } catch {
    return new Set<string>();
  }
}

export function useInboxReadState(audience: "client" | "firm", userId?: string) {
  const storageKey = `inbox-read:${audience}:${userId || "anonymous"}`;
  const [readThreadIds, setReadThreadIds] = useState<Set<string>>(() => readStoredIds(storageKey));

  useEffect(() => {
    setReadThreadIds(readStoredIds(storageKey));
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify([...readThreadIds]));
  }, [readThreadIds, storageKey]);

  const markRead = useCallback((requestId: string) => {
    setReadThreadIds((current) => {
      if (current.has(requestId)) return current;
      return new Set(current).add(requestId);
    });
  }, []);

  const hydrateRead = useCallback((requestIds: string[]) => {
    setReadThreadIds((current) => new Set([...current, ...requestIds]));
  }, []);

  return useMemo(() => ({ hydrateRead, markRead, readThreadIds }), [hydrateRead, markRead, readThreadIds]);
}
