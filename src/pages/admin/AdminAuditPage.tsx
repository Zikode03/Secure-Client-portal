import { useEffect, useMemo, useState } from "react";
import { FeedbackBanner } from "../../components/ui/FeedbackBanner";
import { PageHeader } from "../../components/ui/PageHeader";
import { SelectField } from "../../components/ui/SelectField";
import { SurfaceCard } from "../../components/ui/SurfaceCard";
import { TextField } from "../../components/ui/TextField";
import { ApiError, apiGetJson, hasApiBaseUrl } from "../../services/apiClient";
import type { Tone } from "../../types/portal";

interface AuditLogRecord {
  id: string;
  actorUserId?: string | null;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  clientId?: string | null;
  metadataJson?: string | null;
  createdAtUtc: string;
}

interface AdminUserRecord {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface FeedbackNotice {
  tone: Tone;
  title: string;
  message: string;
}

export function AdminAuditPage() {
  const backendMode = hasApiBaseUrl();
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);

  useEffect(() => {
    if (!backendMode) {
      setFeedback({ tone: "warning", title: "Backend required", message: "Audit and security monitoring requires the live backend API." });
      return;
    }

    let mounted = true;
    async function load() {
      try {
        const [auditRows, userRows] = await Promise.all([
          apiGetJson<AuditLogRecord[]>("/api/audit-logs?limit=300"),
          apiGetJson<AdminUserRecord[]>("/api/admin/users"),
        ]);
        if (!mounted) return;
        setLogs(auditRows);
        setUsers(userRows);
        setFeedback(null);
      } catch (error) {
        if (!mounted) return;
        setFeedback({ tone: "danger", title: "Audit data could not be loaded", message: error instanceof ApiError ? error.message : "The system audit trail could not be loaded." });
      }
    }

    void load();
    return () => { mounted = false; };
  }, [backendMode]);

  const userMap = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const entityTypes = useMemo(() => Array.from(new Set(logs.map((log) => log.entityType))).sort(), [logs]);
  const actorRoles = useMemo(() => Array.from(new Set(logs.map((log) => log.actorRole))).sort(), [logs]);

  const filteredLogs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return logs.filter((log) => {
      const actor = log.actorUserId ? userMap.get(log.actorUserId) : undefined;
      const matchesQuery = !needle || [log.action, log.entityType, log.entityId, actor?.fullName, actor?.email, log.metadataJson]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
      const matchesRole = roleFilter === "all" || log.actorRole === roleFilter;
      const matchesEntity = entityFilter === "all" || log.entityType === entityFilter;
      return matchesQuery && matchesRole && matchesEntity;
    });
  }, [entityFilter, logs, query, roleFilter, userMap]);

  const adminActions = logs.filter((log) => log.actorRole === "admin").length;
  const uniqueActors = new Set(logs.map((log) => log.actorUserId).filter(Boolean)).size;
  const recent24h = logs.filter((log) => Date.now() - new Date(log.createdAtUtc).getTime() <= 24 * 60 * 60 * 1000).length;

  return (
    <div className="space-y-6">
      <PageHeader
        description="Review who changed what, when it changed, and which records were affected."
        eyebrow="Administration"
        title="Audit & security"
      />

      {feedback ? <FeedbackBanner message={feedback.message} onDismiss={() => setFeedback(null)} title={feedback.title} tone={feedback.tone} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Audit events", logs.length, "Latest 300 recorded events"],
          ["Last 24 hours", recent24h, "Recent system activity"],
          ["Unique actors", uniqueActors, "Users represented in the trail"],
          ["Admin actions", adminActions, "Administrative changes recorded"],
        ].map(([label, value, helper]) => (
          <SurfaceCard className="space-y-2" key={String(label)}>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="text-[2rem] font-semibold tracking-tight text-slate-950">{value}</p>
            <p className="text-sm text-slate-500">{helper}</p>
          </SurfaceCard>
        ))}
      </div>

      <SurfaceCard className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="portal-section-title text-slate-950">System audit trail</h2>
            <p className="mt-1 text-sm text-slate-500">Use this register to investigate changes and verify administrative activity.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[720px]">
            <TextField label="Search" onChange={(event) => setQuery(event.target.value)} value={query} />
            <SelectField
              label="Actor role"
              onChange={(event) => setRoleFilter(event.target.value)}
              options={[{ label: "All roles", value: "all" }, ...actorRoles.map((role) => ({ label: role, value: role }))]}
              value={roleFilter}
            />
            <SelectField
              label="Entity"
              onChange={(event) => setEntityFilter(event.target.value)}
              options={[{ label: "All entities", value: "all" }, ...entityTypes.map((entity) => ({ label: entity, value: entity }))]}
              value={entityFilter}
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredLogs.map((log) => {
                const actor = log.actorUserId ? userMap.get(log.actorUserId) : undefined;
                return (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">{new Date(log.createdAtUtc).toLocaleString()}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">{actor?.fullName ?? "System / unknown"}</p>
                      <p className="mt-1 text-xs text-slate-500">{actor?.email ?? log.actorRole}</p>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-800">{log.action}</td>
                    <td className="px-4 py-4 text-slate-600">{log.entityType}</td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-500">{log.entityId}</td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={5}>No audit events match the current filters.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
