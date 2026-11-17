import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, RefreshCw, Search } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { hasApiBaseUrl } from "../../services/apiClient";
import { getTeamProgress, type TeamProgress } from "../../services/teamProgressApi";
import "./teamProgress.css";

function label(value: string) { return value.replace(/[._]/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()); }
function period(year: number, month: number) { return new Intl.DateTimeFormat("en-ZA", { month: "short", year: "numeric" }).format(new Date(year, month - 1, 1)); }
function time(value: string) { return new Date(value).toLocaleString(); }

export function AdminTeamProgressPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [snapshot, setSnapshot] = useState<TeamProgress | null>(null);
  const selectedId = searchParams.get("accountantId") ?? "";
  const [view, setView] = useState<"all" | "review" | "waiting">("all");
  const [clientQuery, setClientQuery] = useState("");
  const previousSelection = useRef(selectedId);
  useEffect(() => {
    if (selectedId && snapshot) document.getElementById("team-assignment-details")?.focus();
    else if (previousSelection.current) document.getElementById("team-search")?.focus();
    previousSelection.current = selectedId;
  }, [selectedId, Boolean(snapshot)]);
  function selectAccountant(id: string) {
    setClientQuery("");
    setSearchParams(current => { const next = new URLSearchParams(current); if (id) next.set("accountantId", id); else next.delete("accountantId"); return next; });
  }
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setFailed(false);
    if (!hasApiBaseUrl()) { setFailed(true); setLoading(false); return; }
    void getTeamProgress().then(result => {
      if (!result?.checkedAtUtc || !Array.isArray(result.accountants)) throw new Error("Invalid progress response");
      if (active) setSnapshot(result);
    }).catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") setAttempt(value => value + 1); }, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const people = snapshot?.accountants ?? [];
  const visible = people.filter(person => {
    const matches = `${person.name} ${person.clients.map(client => client.clientName).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase());
    return matches && (view === "all" || (view === "review" ? person.awaitingReview + person.inReview > 0 : person.waitingOnClient > 0));
  });
  const selected = people.find(person => person.accountantId === selectedId);
  const clients = selected?.clients.filter(client => client.clientName.toLowerCase().includes(clientQuery.trim().toLowerCase())) ?? [];
  const refresh = <button className="team-refresh" type="button" aria-label="Refresh progress" title="Refresh progress" disabled={loading} onClick={() => setAttempt(value => value + 1)}><RefreshCw size={16} aria-hidden="true" /></button>;
  return <div className="team-progress">
    <PageHeader title="Team progress" description="Review assigned work and follow each client’s progress." actions={<Button variant="secondary" onClick={() => navigate("/firm/admin/assignments")}>Manage assignments</Button>} />
    {failed && <p className="team-progress-error" role="status">{snapshot ? "Could not refresh. Showing the last recorded snapshot; figures may be out of date." : "Team progress is unavailable. Check your connection and access permissions, then try Refresh progress."}</p>}
    {!snapshot ? <div className="team-progress-initial"><p role="status">{loading ? "Loading team progress…" : "No progress data loaded."}</p>{refresh}</div> : selectedId && !selected ? <div className="team-progress-initial"><p>This accountant is not in the current team snapshot.</p><button type="button" onClick={() => selectAccountant("")}>Back to team</button>{refresh}</div> : selected ? <section id="team-assignment-details" tabIndex={-1} className="team-work-register" aria-label={`Assigned work for ${selected.name}`}>
      <header className="team-person-heading">
        <button type="button" className="team-back" onClick={() => selectAccountant("")}><ArrowLeft size={16} aria-hidden="true" />Back to team</button>
        <div className="team-person-title"><div><h2>{selected.name}</h2><p>{label(selected.accountStatus)} account · {selected.primaryClients} primary {selected.primaryClients === 1 ? "client" : "clients"} · {selected.backupClients} backup · {selected.decisionsToday} decisions recorded today (SAST)</p></div>{refresh}</div>
      </header>
      <div className="team-register-tools"><h3>Assigned client work</h3><label className="team-search"><Search size={16} aria-hidden="true" /><span className="sr-only">Find assigned client</span><input type="search" value={clientQuery} onChange={event => setClientQuery(event.target.value)} placeholder="Find a client" /></label></div>
      {clients.length ? <div className="team-progress-table-wrap"><table className="team-client-table"><caption className="sr-only">Client monthly work assigned to {selected.name}</caption><thead><tr><th scope="col">Client</th><th scope="col">Period</th><th scope="col">Status</th><th scope="col">Required items approved</th><th scope="col">Review work</th><th scope="col">Waiting on client</th><th scope="col" className="team-action-cell">Action</th></tr></thead><tbody>
        {clients.flatMap(client => client.packs.length ? client.packs.map((pack, index) => <tr key={pack.packId}>
          {index === 0 && <th scope="row" rowSpan={client.packs.length}><strong>{client.clientName}</strong><small>{client.assignment === "primary" ? "Primary owner" : "Backup coverage"}</small></th>}
          <td>{period(pack.year, pack.month)}</td><td><span className="team-work-status">{label(pack.status)}</span></td>
          <td>{pack.requiredItems ? <><span>{pack.approvedItems} / {pack.requiredItems}</span><progress max={pack.requiredItems} value={pack.approvedItems} aria-label={`Approved required items for ${client.clientName}, ${period(pack.year, pack.month)}`} /></> : "Not applicable"}</td>
          <td>{pack.awaitingReview} awaiting<small>{pack.inReview} in review</small></td><td>{pack.waitingOnClient}</td>
          {index === 0 && <td rowSpan={client.packs.length} className="team-action-cell"><button type="button" className="team-open" aria-label={`Open ${client.clientName} profile`} onClick={() => navigate(`/firm/clients/${encodeURIComponent(client.clientId)}/profile`)}><ArrowRight size={17} aria-hidden="true" /></button></td>}
        </tr>) : [<tr key={client.clientId}><th scope="row"><strong>{client.clientName}</strong><small>{client.assignment === "primary" ? "Primary owner" : "Backup coverage"}</small></th><td colSpan={5} className="team-muted">No monthly pack created</td><td className="team-action-cell"><button type="button" className="team-open" aria-label={`Open ${client.clientName} profile`} onClick={() => navigate(`/firm/clients/${encodeURIComponent(client.clientId)}/profile`)}><ArrowRight size={17} aria-hidden="true" /></button></td></tr>])}
      </tbody></table></div> : <p className="team-progress-empty">{selected.clients.length ? "No assigned clients match your search." : "No clients are assigned to this accountant."}</p>}
      <footer className="team-register-footer"><span>{clients.length} {clients.length === 1 ? "client" : "clients"} shown</span><span>Open periods shown first; otherwise the latest completed pack.</span></footer>
    </section> : <section className="team-work-register" aria-label="Accountant progress">
      <div className="team-register-tools"><div role="group" aria-label="Work filters" className="team-work-filters">{([{ key: "all", text: "All accountants" }, { key: "review", text: "Review outstanding" }, { key: "waiting", text: "Waiting on clients" }] as const).map(filter => <button type="button" key={filter.key} aria-pressed={view === filter.key} onClick={() => setView(filter.key)}>{filter.text}</button>)}</div><div className="team-search-actions"><label className="team-search"><Search size={16} aria-hidden="true" /><span className="sr-only">Find accountant or client</span><input id="team-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find accountant or client" /></label>{refresh}</div></div>
      {visible.length ? <div className="team-progress-table-wrap"><table><caption className="sr-only">Recorded progress by accountant</caption><thead><tr><th scope="col">Accountant</th><th scope="col">Assigned clients</th><th scope="col">Review work</th><th scope="col">Required items approved</th><th scope="col">Latest recorded work</th><th scope="col" className="team-action-cell">Action</th></tr></thead><tbody>{visible.map(person => <tr key={person.accountantId}>
        <th scope="row"><strong>{person.name}</strong><small>{label(person.accountStatus)} account</small></th>
        <td>{person.primaryClients} primary<small>{person.backupClients} backup</small></td>
        <td>{person.awaitingReview} awaiting<small>{person.inReview} in review · {person.waitingOnClient} waiting on client</small></td>
        <td>{person.requiredItems ? <><span>{person.approvedItems} / {person.requiredItems}</span><progress max={person.requiredItems} value={person.approvedItems} aria-label={`Approved required items for ${person.name}`} /></> : <span>Not applicable</span>}</td>
        <td className="team-activity">{person.latestActivity ? <><span>{person.latestActivity.documentName ?? person.latestActivity.clientName ?? "Recorded work event"}</span><small>{label(person.latestActivity.action)}</small><time dateTime={person.latestActivity.atUtc}>{time(person.latestActivity.atUtc)}</time></> : <span className="team-muted">No recorded work activity</span>}</td>
        <td className="team-action-cell"><button type="button" className="team-open" aria-label={`View assignments for ${person.name}`} onClick={() => selectAccountant(person.accountantId)}><ArrowRight size={17} aria-hidden="true" /></button></td>
      </tr>)}</tbody></table></div> : <p className="team-progress-empty">{people.length ? "No accountants match this view. Adjust the search or work filter." : "No accountant accounts have been created yet."}</p>}
      <footer className="team-register-footer"><span>{visible.length} of {people.length} accountants</span>{snapshot.unassignedClients > 0 && <span className="team-unassigned">{snapshot.unassignedClients} active {snapshot.unassignedClients === 1 ? "client needs" : "clients need"} a primary accountant.</span>}</footer>
    </section>}
    <div className="team-progress-footnote"><p>Progress reflects saved work, not live presence. Updates every 30 seconds.{snapshot ? ` Last checked ${time(snapshot.checkedAtUtc)}.` : ""}</p><details><summary>How progress is counted</summary><p>Team totals cover primary assignments. Backup coverage is listed in each accountant’s work view. Approved requirements describe client progress; decisions today belong to the person who recorded them. Opening a document records an event, not proof that someone is still working on it.</p></details></div>
  </div>;
}
