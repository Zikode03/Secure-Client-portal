/** Display labels only; category identifiers remain unchanged in API calls and filters. */
export function formatDocumentType(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
