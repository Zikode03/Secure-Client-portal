import { useEffect, useState } from "react";

export function useInboxDraft(audience: "client" | "firm", threadId: string) {
  const storageKey = `inbox-draft:${audience}:${threadId}`;
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft(window.localStorage.getItem(storageKey) ?? "");
  }, [storageKey]);

  useEffect(() => {
    if (draft.trim()) {
      window.localStorage.setItem(storageKey, draft);
    } else {
      window.localStorage.removeItem(storageKey);
    }
  }, [draft, storageKey]);

  return [draft, setDraft] as const;
}
