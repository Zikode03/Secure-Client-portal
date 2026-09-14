import { describe, expect, it } from "vitest";
import { formatDocumentSource, getDocumentSource } from "../components/documents/documentSource";

describe("document source", () => {
  it("classifies monthly-pack documents from their slot relationship", () => {
    expect(getDocumentSource({ documentId: "doc-1", documentSlotId: "slot-1" }, new Set(["doc-1"]))).toBe("monthly_pack");
  });

  it("classifies request-linked documents", () => {
    expect(getDocumentSource({ documentId: "doc-2" }, new Set(["doc-2"]))).toBe("request");
  });

  it("falls back to direct upload", () => {
    expect(getDocumentSource({ documentId: "doc-3" }, new Set())).toBe("direct_upload");
    expect(formatDocumentSource("direct_upload")).toBe("Direct Upload");
  });
});
