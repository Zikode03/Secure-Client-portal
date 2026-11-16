import type { ManualTransactionRow } from "./bankingApi";

export interface CsvTable { headers: string[]; rows: string[][] }
export interface StatementMapping {
  date: number; description: number; reference: number; amount: number;
  debit: number; credit: number; balance: number;
  dateFormat: "iso" | "dmy" | "mdy"; decimalSeparator: "." | ",";
}

// Parse quoted fields (including escaped quotes/newlines) without executing cell contents.
export function parseStatementCsv(source: string): CsvTable {
  if (source.length > 4_000_000) throw new Error("CSV must be smaller than 4 MB.");
  const text = source.replace(/^\uFEFF/, "");
  let inHeaderQuotes = false, commas = 0, semicolons = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && inHeaderQuotes && text[i + 1] === '"') { i++; continue; }
    if (c === '"') inHeaderQuotes = !inHeaderQuotes;
    if (!inHeaderQuotes) {
      if (c === "\n" || c === "\r") break;
      if (c === ",") commas++;
      if (c === ";") semicolons++;
    }
  }
  const delimiter = semicolons > commas ? ";" : ",";
  const records: string[][] = [];
  let row: string[] = [], field = "", quoted = false, closed = false;
  function finishField() { row.push(field.trim()); field = ""; closed = false; }
  function finishRow() {
    finishField();
    if (row.some(Boolean)) records.push(row);
    row = [];
    if (records.length > 5001) throw new Error("Import at most 5,000 transactions at a time.");
  }
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === delimiter) finishField();
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; finishRow(); }
    else if (c === '"' && !field && !closed) quoted = true;
    else if (c === '"') throw new Error("Quote must start at the beginning of a CSV field.");
    else if (closed && c.trim()) throw new Error("Unexpected text after a quoted CSV field.");
    else if (!closed) field += c;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  if (field || row.length) finishRow();
  const headers = records.shift();
  if (!headers?.length || !records.length) throw new Error("CSV needs a header row and at least one transaction.");
  if (headers.some((h) => !h) || new Set(headers).size !== headers.length) throw new Error("CSV headers must be nonempty and unique.");
  if (records.some((r) => r.length !== headers.length)) throw new Error("Every CSV row must have the same number of columns as the header.");
  return { headers, rows: records };
}

function amount(raw: string, separator: "." | ","): number {
  let text = raw.trim().replace(/\s/g, "");
  if (/^\(.*\)$/.test(text)) text = "-" + text.slice(1, -1);
  const grouping = separator === "." ? "," : ".";
  const escaped = grouping === "." ? "\\." : ",";
  const decimal = separator === "." ? "\\." : ",";
  const pattern = new RegExp(`^[+-]?(?:\\d+|\\d{1,3}(?:${escaped}\\d{3})+)(?:${decimal}\\d{1,4})?$`);
  if (!pattern.test(text)) throw new Error(`Invalid amount: ${raw}`);
  const value = Number(text.split(grouping).join("").replace(separator, "."));
  if (!Number.isFinite(value) || Math.abs(value) >= 1e15) throw new Error("Amount exceeds the supported range.");
  return value;
}

export function mapStatementRows(table: CsvTable, mapping: StatementMapping): ManualTransactionRow[] {
  const indexes = [mapping.date, mapping.description, mapping.reference, mapping.amount, mapping.debit, mapping.credit, mapping.balance].filter((i) => i >= 0);
  if (indexes.some((i) => !Number.isInteger(i) || i >= table.headers.length)) throw new Error("Choose a valid CSV column for each field.");
  if (mapping.amount >= 0 && (mapping.debit >= 0 || mapping.credit >= 0)) throw new Error("Choose signed amounts or separate debit/credit columns, then unmap the unused columns.");
  if (mapping.date < 0 || mapping.description < 0 || (mapping.amount < 0 && (mapping.debit < 0 || mapping.credit < 0)))
    throw new Error("Map date, description, and either a signed amount or both debit and credit columns.");
  if (new Set(indexes).size !== indexes.length) throw new Error("Map each CSV column to only one field.");
  return table.rows.map((row, index) => {
    try {
      const rawDate = row[mapping.date];
      const parts = rawDate.split(/[-/]/);
      if (parts.length !== 3) throw new Error("Date must contain day, month and four-digit year.");
      const [y, m, d] = mapping.dateFormat === "iso" ? parts : mapping.dateFormat === "dmy" ? [parts[2], parts[1], parts[0]] : [parts[2], parts[0], parts[1]];
      if (!/^\d{4}$/.test(y) || !/^\d{1,2}$/.test(m) || !/^\d{1,2}$/.test(d) || +y < 2000 || +y > 2200) throw new Error("Invalid date format.");
      const date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      const parsed = new Date(`${date}T00:00:00Z`);
      if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error("Invalid calendar date.");
      const debit = mapping.debit >= 0 && row[mapping.debit] ? amount(row[mapping.debit], mapping.decimalSeparator) : 0;
      const credit = mapping.credit >= 0 && row[mapping.credit] ? amount(row[mapping.credit], mapping.decimalSeparator) : 0;
      if (mapping.amount < 0 && (debit < 0 || credit < 0 || (debit > 0 && credit > 0))) throw new Error("Use one positive debit or credit per row.");
      const value = mapping.amount >= 0 ? amount(row[mapping.amount], mapping.decimalSeparator) : credit - debit;
      if (!value) throw new Error("Transaction amount cannot be zero.");
      const description = row[mapping.description]?.trim();
      if (!description || description.length > 1000) throw new Error("Description is required (maximum 1,000 characters).");
      const reference = mapping.reference >= 0 ? row[mapping.reference] : "";
      if (reference.length > 500) throw new Error("Reference exceeds 500 characters.");
      return { date, description, reference, amount: value, balance: mapping.balance >= 0 && row[mapping.balance] ? amount(row[mapping.balance], mapping.decimalSeparator) : null };
    } catch (error) { throw new Error(`CSV row ${index + 2}: ${error instanceof Error ? error.message : "Invalid row."}`); }
  });
}
