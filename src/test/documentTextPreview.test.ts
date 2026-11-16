import { describe, expect, it } from "vitest";
import { buildDocumentTextPreview } from "../utils/documentTextPreview";

describe("document text preview security", () => {
  it.each([
    '</title><script>alert(document.cookie)</script>',
    '</pre><img src=x onerror="alert(1)">',
    '<svg onload="alert(1)"></svg>',
    '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    "Invoice & receipt <123> \"quoted\" 'supplier'",
  ])("renders untrusted filename and extracted text literally: %s", (payload) => {
    const parsed = new DOMParser().parseFromString(buildDocumentTextPreview(payload, payload), "text/html");
    expect(parsed.title).toBe(payload);
    expect(parsed.querySelector("h1")?.textContent).toBe(payload);
    expect(parsed.querySelector("pre")?.textContent).toBe(payload);
    expect(parsed.querySelector("script,img,svg,iframe,[onerror],[onload]")).toBeNull();
    expect(parsed.querySelectorAll("h1,pre")).toHaveLength(2);
  });
});
