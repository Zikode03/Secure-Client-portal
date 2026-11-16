import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { bankingApi, type BankingOverviewDto, type ManualImportRequest, type ManualImportResult } from "../../services/bankingApi";
import { mapStatementRows, parseStatementCsv, type CsvTable, type StatementMapping } from "../../services/bankStatementCsv";

const initialMapping: StatementMapping = { date: -1, description: -1, reference: -1, amount: -1, debit: -1, credit: -1, balance: -1, dateFormat: "iso", decimalSeparator: "." };
const inputClass = "mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm";
const buttonClass = "rounded border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50";
const money = (value: number, currency = "ZAR") => new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(value);

export function ManualBankingWorkspace({ clientId }: { clientId?: string }) {
  const [overview, setOverview] = useState<BankingOverviewDto | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [table, setTable] = useState<CsvTable | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [mapping, setMapping] = useState(initialMapping);
  const [preview, setPreview] = useState<{ request: ManualImportRequest; result: ManualImportResult } | null>(null);
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [lastFourDigits, setLastFourDigits] = useState("");
  const [registrationId, setRegistrationId] = useState(() => crypto.randomUUID());
  const generation = useRef(0);
  const fileRevision = useRef(0);

  const load = useCallback(async () => {
    const revision = ++generation.current;
    setLoading(true); setError("");
    try {
      const data = await bankingApi.getOverview(clientId);
      if (revision === generation.current) setOverview(data);
    } catch {
      if (revision === generation.current) setError("Could not load banking data. Please retry.");
    } finally { if (revision === generation.current) setLoading(false); }
  }, [clientId]);

  useEffect(() => {
    setOverview(null); setAccountId(""); setTable(null); setPreview(null); setNotice("");
    setBankName(""); setAccountName(""); setLastFourDigits("");
    fileRevision.current++;
    void load();
    return () => { generation.current++; fileRevision.current++; };
  }, [load]);

  async function addAccount(event: React.FormEvent) {
    event.preventDefault();
    const revision = generation.current;
    setBusy(true); setError(""); setNotice("");
    try {
      const data = await bankingApi.addManualAccount({ clientId, bankName, accountName, lastFourDigits, registrationId });
      if (revision !== generation.current) return;
      setOverview(data); setBankName(""); setAccountName(""); setLastFourDigits("");
      setRegistrationId(crypto.randomUUID());
      setNotice("Account saved. Upload its monthly statements in Monthly Packs.");
    } catch { if (revision === generation.current) setError("Could not save the account. Refresh before trying again."); }
    finally { setBusy(false); }
  }

  async function readFile(file?: File) {
    const revision = ++fileRevision.current;
    setTable(null); setPreview(null); setError(""); setNotice("");
    if (!file) return;
    try {
      if (file.size > 4_000_000 || !file.name.toLowerCase().endsWith(".csv")) throw new Error("Choose a CSV file smaller than 4 MB.");
      const parsed = parseStatementCsv(await file.text());
      if (revision !== fileRevision.current) return;
      setTable(parsed); setSourceName(file.name);
      const guess = (names: string[]) => parsed.headers.findIndex((h) => names.includes(h.toLowerCase().trim()));
      setMapping({ ...initialMapping, date: guess(["date", "transaction date"]), description: guess(["description", "details"]),
        reference: guess(["reference"]), amount: guess(["amount"]), balance: guess(["balance"]),
        debit: guess(["debit", "debits"]), credit: guess(["credit", "credits"]) });
    } catch (cause) { if (revision === fileRevision.current) setError(cause instanceof Error ? cause.message : "Could not read the CSV."); }
  }

  async function prepareImport() {
    if (!table || !accountId) return;
    const revision = generation.current;
    setBusy(true); setError(""); setNotice(""); setPreview(null);
    try {
      const request = { accountId, sourceName, rows: mapStatementRows(table, mapping), preview: true };
      const result = await bankingApi.importManualTransactions(request);
      if (revision === generation.current) setPreview({ request, result });
    } catch (cause) {
      if (revision === generation.current) setError(cause instanceof Error && cause.name !== "ApiError" ? cause.message : "Could not preview the import. Check the selected account and CSV, then retry.");
    } finally { setBusy(false); }
  }

  async function confirmImport() {
    if (!preview) return;
    const revision = generation.current;
    setBusy(true); setError("");
    try {
      const result = await bankingApi.importManualTransactions({ ...preview.request, preview: false });
      if (revision !== generation.current) return;
      setPreview(null); setTable(null);
      setNotice(`Imported ${result.imported} transactions; skipped ${result.duplicates} duplicates. Accountant review is still required.`);
      await load();
    } catch { if (revision === generation.current) { setPreview(null); setError("Import could not be confirmed. Preview again before retrying; already saved rows will be checked for duplicates."); } }
    finally { setBusy(false); }
  }

  const accounts = overview?.accounts.filter((a) => a.accountType === "manual") ?? [];
  return <section className="space-y-5" aria-label="Manual bank statements">
    <header>
      <h1 className="text-2xl font-semibold text-slate-950">Bank statements</h1>
      <p className="mt-2 text-sm text-slate-600">Register each business account and upload its statements in Monthly Packs. Import CSV transactions here for accountant review.</p>
      <p className="mt-2 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Direct bank connections are paused. Statements, invoices, receipts and accountant approval control monthly completion.</p>
      {!clientId && <Link to="/client/packs" className="mt-3 inline-block text-sm font-semibold text-brand-700">Upload statements in Monthly Packs</Link>}
    </header>
    {error && <div role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    {notice && <p role="status" className="rounded bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {loading ? <p>Loading bank statements…</p> : !overview ? <button type="button" className={buttonClass} onClick={() => void load()}>Retry</button> : <>
      <form onSubmit={(event) => void addAccount(event)} className="rounded border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Business accounts</h2>
        <p className="mt-1 text-sm text-slate-600">Register every active account. Only the last four account digits are needed. Currency: ZAR.</p>
        <fieldset disabled={busy} className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">Bank name<input required maxLength={120} value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClass} /></label>
          <label className="text-sm">Account label<input required maxLength={200} value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inputClass} /></label>
          <label className="text-sm">Last four digits<input required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={lastFourDigits} onChange={(e) => setLastFourDigits(e.target.value)} className={inputClass} /></label>
          <button className={buttonClass} type="submit">Save account</button>
        </fieldset>
        <ul className="mt-3 space-y-2 text-sm">{accounts.map((a) => <li key={a.id}>{a.bankName} · {a.accountName} · {a.accountNumberMasked}</li>)}</ul>
        {!accounts.length && <p className="mt-3 text-sm text-slate-500">No manual accounts registered yet. The general bank-statement upload remains required.</p>}
      </form>
      <div className="rounded border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Import CSV transactions</h2>
        <p className="mt-1 text-sm text-slate-600">Use a header row. Choose the date and number formats explicitly. Negative signed amounts are money out; positive amounts are money in. CSV data does not replace the statement evidence.</p>
        <fieldset disabled={busy} className="mt-3 space-y-3">
          <label className="block text-sm">Account<select className={inputClass} value={accountId} onChange={(e) => { setAccountId(e.target.value); setPreview(null); }}><option value="">Select account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.bankName} · {a.accountName} · {a.accountNumberMasked}</option>)}</select></label>
          <label className="block text-sm">Statement CSV<input className={inputClass} type="file" accept=".csv,text/csv" onChange={(e) => void readFile(e.target.files?.[0])} /></label>
          {table && <>
            <div className="grid gap-3 sm:grid-cols-3">{([['date', 'Date'], ['description', 'Description'], ['reference', 'Reference (optional)'], ['amount', 'Signed amount'], ['debit', 'Debit (if no signed amount)'], ['credit', 'Credit (if no signed amount)'], ['balance', 'Balance (optional)']] as const).map(([key, label]) => <label className="text-sm" key={key}>{label}<select className={inputClass} value={mapping[key]} onChange={(e) => { setMapping((m) => ({ ...m, [key]: Number(e.target.value) })); setPreview(null); }}><option value={-1}>Not mapped</option>{table.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}</select></label>)}
              <label className="text-sm">Date format<select className={inputClass} value={mapping.dateFormat} onChange={(e) => { setMapping((m) => ({ ...m, dateFormat: e.target.value as StatementMapping['dateFormat'] })); setPreview(null); }}><option value="iso">YYYY-MM-DD</option><option value="dmy">DD/MM/YYYY</option><option value="mdy">MM/DD/YYYY</option></select></label>
              <label className="text-sm">Decimal separator<select className={inputClass} value={mapping.decimalSeparator} onChange={(e) => { setMapping((m) => ({ ...m, decimalSeparator: e.target.value as '.' | ',' })); setPreview(null); }}><option value=".">Point (1,234.56)</option><option value=",">Comma (1.234,56)</option></select></label>
            </div>
            <button type="button" disabled={!accountId} className={buttonClass} onClick={() => void prepareImport()}>Preview {table.rows.length} transactions</button>
          </>}
        </fieldset>
        {preview && <div className="mt-4 space-y-3 rounded bg-slate-50 p-3">
          <p className="text-sm">{preview.result.imported} new transactions · {preview.result.duplicates} likely duplicates skipped · Money in {money(preview.result.credits)} · Money out {money(preview.result.debits)}</p>
          <p className="text-xs text-slate-600">Duplicates match account, date, description, reference, amount and balance. Identical rows within one file are counted separately. Check overlapping statements before confirming.</p>
          <TransactionPreview rows={preview.request.rows.slice(0, 20)} />
          <p className="text-xs text-slate-500">Showing the first 20 source rows. Totals above cover new rows across the full file.</p>
          <button type="button" className={buttonClass} disabled={busy || preview.result.imported === 0} onClick={() => void confirmImport()}>Confirm import</button>
        </div>}
      </div>
      <div className="rounded border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Recent transactions</h2><p className="mt-1 text-sm text-slate-600">Latest 50 transactions, including retained bank history. Manual imports require review against statements, invoices and receipts.</p>
        <TransactionPreview rows={overview.recentTransactions.map((t) => {
          const account = overview.accounts.find((a) => a.id === t.bankAccountId);
          return { date: t.transactionDateUtc.slice(0, 10), description: t.description, reference: t.reference,
            amount: t.direction === 'debit' ? -t.amount : t.amount, currency: account?.currency ?? 'ZAR',
            account: account ? `${account.bankName} · ${account.accountName} · ${account.accountNumberMasked}` : '—' };
        })} />
      </div>
    </>}
  </section>;
}

function TransactionPreview({ rows }: { rows: { date: string; description: string; reference: string; amount: number; account?: string; currency?: string }[] }) {
  return <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Date', 'Description', 'Reference / account', 'Amount'].map((h) => <th key={h} scope="col" className="border-b p-2">{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}><td className="whitespace-nowrap p-2">{r.date}</td><td className="min-w-48 p-2">{r.description}</td><td className="p-2">{r.reference} {r.account}</td><td className="whitespace-nowrap p-2">{money(r.amount, r.currency)}</td></tr>)}</tbody></table>{!rows.length && <p className="py-3 text-sm text-slate-500">No transactions imported.</p>}</div>;
}
