import { useCallback, useEffect, useMemo, useState } from "react";
import { bankingApi, type BankingOverviewDto } from "../../services/bankingApi";

const tabs = ["accounts", "transactions", "sync"] as const;
type Tab = (typeof tabs)[number];

function money(value: number | null, currency = "ZAR") {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(value);
}

function dateTime(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ClientBankingPage() {
  const [tab, setTab] = useState<Tab>("accounts");
  const [data, setData] = useState<BankingOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      setData(await bankingApi.getOverview());
    } catch {
      setError("Could not load banking data. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeConnections = useMemo(
    () => data?.connections.filter((connection) => connection.status !== "disconnected") ?? [],
    [data],
  );

  async function run(action: () => Promise<BankingOverviewDto>) {
    try {
      setWorking(true);
      setError("");
      setData(await action());
    } catch {
      setError("The banking action could not be completed. Please refresh before trying again.");
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading banking…</div>;
  if (!data) return <section className="space-y-3 p-6">
    <h1 className="text-2xl font-semibold text-slate-950">Banking</h1>
    <p role="alert" className="text-sm text-red-700">{error || "Banking data is unavailable."}</p>
    <button type="button" className="text-sm font-semibold text-brand-700" onClick={() => void load()}>Retry</button>
  </section>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Financial data</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Banking</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Connect business bank accounts, keep transaction data current, and track sync health without sharing internet-banking credentials with the portal.
          </p>
        </div>
        <button
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          disabled={working}
          onClick={() => void load()}
          type="button"
        >
          Refresh
        </button>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="border-b border-slate-200">
        <nav className="flex gap-6" aria-label="Banking sections">
          {tabs.map((item) => (
            <button
              className={`border-b-2 px-1 py-3 text-sm font-medium ${tab === item ? "border-brand-700 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              key={item}
              onClick={() => setTab(item)}
              type="button"
            >
              {item === "accounts" ? "Accounts" : item === "transactions" ? "Transactions" : "Sync history"}
            </button>
          ))}
        </nav>
      </div>

      {tab === "accounts" ? (
        <section className="space-y-4">
          {activeConnections.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="text-base font-semibold text-slate-950">No bank account connected</h2>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                A live provider will use its own secure consent screen. Your portal stores connection and account metadata, not bank usernames, passwords, PINs, or OTPs.
              </p>
              {data?.sandboxEnabled ? (
                <button
                  className="mt-4 rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
                  disabled={working}
                  onClick={() => void run(() => bankingApi.connectSandbox())}
                  type="button"
                >
                  Connect sandbox bank
                </button>
              ) : (
                <p className="mt-4 text-sm font-medium text-slate-700">Bank provider connection is not enabled in this environment yet.</p>
              )}
            </div>
          ) : null}

          {activeConnections.map((connection) => {
            const accounts = data?.accounts.filter((account) => account.bankConnectionId === connection.id) ?? [];
            return (
              <div className="rounded-lg border border-slate-200 bg-white" key={connection.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-slate-950">{connection.provider === "sandbox" ? "Sandbox connection" : connection.provider}</h2>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{statusLabel(connection.status)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Last synced {dateTime(connection.lastSyncedAtUtc)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50" disabled={working} onClick={() => void run(() => bankingApi.sync(connection.id))} type="button">Sync now</button>
                    <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-50" disabled={working} onClick={() => void run(() => bankingApi.disconnect(connection.id))} type="button">Disconnect</button>
                  </div>
                </div>
                {accounts.map((account) => (
                  <div className="grid gap-4 px-5 py-4 md:grid-cols-[1.4fr_1fr_1fr]" key={account.id}>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{account.bankName} · {account.accountName}</p>
                      <p className="mt-1 text-sm text-slate-500">{account.accountNumberMasked} · {account.accountType}</p>
                    </div>
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Current balance</p><p className="mt-1 font-medium text-slate-900">{money(account.currentBalance, account.currency)}</p></div>
                    <div><p className="text-xs uppercase tracking-wide text-slate-500">Available balance</p><p className="mt-1 font-medium text-slate-900">{money(account.availableBalance, account.currency)}</p></div>
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      ) : null}

      {tab === "transactions" ? (
        <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <div className="grid min-w-[640px] grid-cols-[130px_1fr_130px_140px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Date</span><span>Description</span><span>Reference</span><span className="text-right">Amount</span>
          </div>
          {data?.recentTransactions.length ? data.recentTransactions.map((transaction) => (
            <div className="grid min-w-[640px] grid-cols-[130px_1fr_130px_140px] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0" key={transaction.id}>
              <span className="text-slate-600">{new Date(transaction.transactionDateUtc).toLocaleDateString("en-ZA")}</span>
              <span><span className="font-medium text-slate-900">{transaction.description}</span><span className="ml-2 text-xs text-slate-400">{transaction.providerCategory}</span></span>
              <span className="truncate text-slate-500">{transaction.reference || "—"}</span>
              <span className={`text-right font-medium ${transaction.direction === "credit" ? "text-emerald-700" : "text-slate-900"}`}>{transaction.direction === "debit" ? "−" : "+"}{money(transaction.amount)}</span>
            </div>
          )) : <p className="p-6 text-sm text-slate-500">No bank transactions have been imported yet.</p>}
        </section>
      ) : null}

      {tab === "sync" ? (
        <section className="rounded-lg border border-slate-200 bg-white">
          {data?.syncRuns.length ? data.syncRuns.map((run) => (
            <div className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 md:grid-cols-[1fr_160px_160px_140px]" key={run.id}>
              <div><p className="text-sm font-medium text-slate-900">{statusLabel(run.status)}</p><p className="mt-1 text-xs text-slate-500">{run.status === "failed" ? "Sync could not be completed. Please try again." : run.provider}</p></div>
              <div><p className="text-xs text-slate-500">Started</p><p className="mt-1 text-sm text-slate-700">{dateTime(run.startedAtUtc)}</p></div>
              <div><p className="text-xs text-slate-500">Finished</p><p className="mt-1 text-sm text-slate-700">{dateTime(run.finishedAtUtc)}</p></div>
              <div><p className="text-xs text-slate-500">Transactions</p><p className="mt-1 text-sm font-medium text-slate-900">{run.transactionsReceived}</p></div>
            </div>
          )) : <p className="p-6 text-sm text-slate-500">No bank syncs have run yet.</p>}
        </section>
      ) : null}
    </div>
  );
}
