import { describe, expect, it } from "vitest";
import { mapStatementRows, parseStatementCsv, type StatementMapping } from "../services/bankStatementCsv";

const mapping: StatementMapping = { date: 0, description: 1, amount: 2, reference: -1, debit: -1, credit: -1, balance: -1, dateFormat: "iso", decimalSeparator: "." };

describe("statement CSV validation", () => {
  it("supports BOM, quoted commas, escaped quotes and newlines", () => {
    const table = parseStatementCsv('\uFEFFDate,Description,Amount\r\n2026-11-01,"Shop, ""Main""\nBranch",-12.50\r\n');
    expect(mapStatementRows(table, mapping)).toEqual([{ date: "2026-11-01", description: 'Shop, "Main"\nBranch', amount: -12.5, reference: "", balance: null }]);
  });
  it("supports semicolons, explicit local dates and decimal commas", () => {
    const table = parseStatementCsv('Date;Details;Amount\n10/11/2026;Sale;1.234,56');
    expect(mapStatementRows(table, { ...mapping, dateFormat: "dmy", decimalSeparator: "," })[0].amount).toBe(1234.56);
  });
  it("maps separate debit and credit columns", () => {
    const table = parseStatementCsv('Date,Description,Debit,Credit\n2026-11-01,Rent,1200,\n2026-11-02,Sale,,2000');
    expect(mapStatementRows(table, { ...mapping, amount: -1, debit: 2, credit: 3 }).map((r) => r.amount)).toEqual([-1200, 2000]);
  });
  it("detects delimiters without counting punctuation in quoted headers", () => {
    expect(parseStatementCsv('"Date, posted";"Description, long";"Amount, signed"\n2026-11-01;Sale;20').headers).toHaveLength(3);
  });
  it.each(['2026-02-30,Rent,10', '2026-11-01,Rent,0', '2026-11-01,Rent,12oops', '2026-11-01,Rent,1.12345', '2026-11-01,,10'])('rejects invalid transaction %s', (row) => {
    expect(() => mapStatementRows(parseStatementCsv(`Date,Description,Amount\n${row}`), mapping)).toThrow();
  });
  it("rejects malformed CSV and duplicate mappings", () => {
    expect(() => parseStatementCsv('Date,Description,Amount\n"unclosed')).toThrow();
    expect(() => parseStatementCsv('Date,Date\n1,2')).toThrow();
    expect(() => mapStatementRows(parseStatementCsv('Date,Description,Amount\n2026-11-01,Rent,10'), { ...mapping, description: 0 })).toThrow();
  });
});
