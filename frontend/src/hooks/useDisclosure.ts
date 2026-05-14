// Friendly guide: this module (useDisclosure) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useCallback, useState } from "react";

// Component flow: gather data first, then render a focused UI state.
export function useDisclosure(initialState = false) {
// Local UI state: keeps track of what the user is seeing or editing right now.
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((current) => !current), []);

  return { isOpen, open, close, toggle };
}