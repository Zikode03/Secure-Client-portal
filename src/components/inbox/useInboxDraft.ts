import { useCallback, useState } from "react";
import { useAuth } from "../../app/auth";
import { privateStateKey } from "../../utils/privateBrowserState";

export function useInboxDraft(audience: "client" | "firm", threadId: string) {
  const auth = useAuth();
  const key = privateStateKey(auth?.user?.id, `draft:${audience}:${threadId}`);
  const read = () => key ? window.sessionStorage.getItem(key) ?? "" : "";
  const [state, setState] = useState(() => ({ key, value: read() }));
  // Never render or copy the previous user's/thread's draft while the key changes.
  const draft = state.key === key ? state.value : read();
  const setDraft = useCallback((value: string | ((previous: string) => string)) => {
    const previous = key ? window.sessionStorage.getItem(key) ?? "" : "";
    const next = typeof value === "function" ? value(previous) : value;
    if (key) {
      if (next.trim()) window.sessionStorage.setItem(key, next);
      else window.sessionStorage.removeItem(key);
    }
    setState({ key, value: next });
  }, [key]);
  return [draft, setDraft] as const;
}
