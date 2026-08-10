// Friendly guide: this module (setup) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

configure({ asyncUtilTimeout: 3000 });

Object.defineProperty(URL, "createObjectURL", {
  configurable: true,
  value: vi.fn(() => "blob:test-download"),
});

Object.defineProperty(URL, "revokeObjectURL", {
  configurable: true,
  value: vi.fn(),
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
