import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import type { ClientWorkspaceView } from "../../app/portal";
import type { FirmClientAccount, WorkflowRequest } from "../../types/portal";
import { formatDateLabel } from "../../utils/formatters";
import { getScopedClients, getScopedRequests } from "../../utils/permissions";

interface NeededDocument {
  id: string;
  name: string;
  status: "requested" | "needed";
  dueDate: string;
}

function ClientListPanel({
  clients,
  selectedClientId,
  onSelectClient,
}: {
  clients: FirmClientAccount[];
  selectedClientId: string;
  onSelectClient: (id: string) => void;
}) {
  return (
    <aside className="w-72 shrink-0 border-r border-slate-200 bg-white p-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Clients</h2>
        <p className="text-xs text-slate-500">Requests workspace</p>
      </div>
      <div className="space-y-2">
        {clients.map((client) => {
          const active = client.id === selectedClientId;
          return (
            <button
              key={client.id}
              onClick={() => onSelectClient(client.id)}
              className={`w-full rounded-2xl border p-3 text-left transition ${
                active
                  ? "border-violet-300 bg-violet-50/70 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              type="button"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{client.clientName}</p>
                <span className="text-xs text-slate-500">{client.completionRate}%</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{client.status.replace(/_/g, " ")}</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function ClientWorkspaceHeader({
  client,
  activeTab,
  onTabChange,
}: {
  client: FirmClientAccount;
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const tabs = ["Overview", "Requests", "Documents", "Details"];

  return (
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{client.clientName}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-rose-50 px-2 py-1 font-medium text-rose-700">
              {client.status.replace(/_/g, " ")}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
              Accountant: {client.assignedAccountant}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
              Industry: {client.industry}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 border-b border-slate-200">
        <div className="flex flex-wrap gap-5">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`pb-3 text-sm font-medium ${
                activeTab === tab
                  ? "border-b-2 border-violet-600 text-violet-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function RequestWorkflowCard({ request }: { request: WorkflowRequest }) {
  const steps = [
    { label: "Requested", active: true },
    { label: "Client Reply", active: request.status !== "awaiting_client" },
    {
      label: "Review",
      active: ["client_replied", "open", "awaiting_accountant", "resolved", "closed"].includes(
        request.status,
      ),
    },
    { label: "Resolved", active: ["resolved", "closed"].includes(request.status) },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
            {request.priority} Priority
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">{request.title}</h2>
          <p className="mt-2 text-sm text-slate-600">{request.description}</p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          {request.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {steps.map((step, idx) => (
          <div key={step.label} className="relative">
            {idx < steps.length - 1 ? (
              <div className="absolute left-6 top-5 hidden h-[2px] w-full bg-slate-200 md:block" />
            ) : null}
            <div className="relative z-10 flex items-center gap-3">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${
                  step.active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {idx + 1}
              </span>
              <div>
                <p className="text-xs font-medium text-slate-800">{step.label}</p>
                <p className="text-xs text-slate-500">{formatDateLabel(request.createdAt)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConversationTimeline({ request }: { request: WorkflowRequest }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Case Timeline</h3>
      <div className="mt-4 space-y-4">
        {request.auditTrail.slice(0, 8).map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-violet-500" />
            <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-800">{item.status}</p>
              {item.note ? <p className="mt-1 text-xs text-slate-600">{item.note}</p> : null}
              <p className="mt-1 text-xs text-slate-500">
                {item.actor} · {formatDateLabel(item.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RequestRows({
  requests,
  onViewDetails,
}: {
  requests: WorkflowRequest[];
  onViewDetails: (request: WorkflowRequest) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Other Requests</h3>
      <div className="mt-3 divide-y divide-slate-200">
        {requests.map((r) => (
          <div key={r.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{r.title}</p>
              <p className="text-xs text-slate-500">Due {formatDateLabel(r.dueDate)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                {r.status.replace(/_/g, " ")}
              </span>
              <button
                className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700"
                onClick={() => onViewDetails(r)}
                type="button"
              >
                Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RequestDetailView({ request }: { request: WorkflowRequest }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Request Details</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Title</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{request.title}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Status</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{request.status.replace(/_/g, " ")}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Priority</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{request.priority}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Due Date</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{formatDateLabel(request.dueDate)}</p>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs text-slate-500">Description</p>
        <p className="mt-1 text-sm text-slate-700">{request.description}</p>
      </div>
    </section>
  );
}

function OverviewPanel({ client, workspace }: { client: FirmClientAccount; workspace: ClientWorkspaceView }) {
  const summary = `${client.clientName} operates in ${client.industry}. Current completion is ${client.completionRate}%, with ${workspace.requests.filter((r) => !["resolved", "closed"].includes(r.status)).length} open request(s).`;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Company Overview</h3>
      <p className="mt-3 text-sm leading-7 text-slate-700">{summary}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Compliance Status</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{client.status.replace(/_/g, " ")}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Assigned Accountant</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{client.assignedAccountant}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Progress</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{client.completionRate}%</p>
        </div>
      </div>
    </section>
  );
}

function DocumentsPanel({
  neededDocuments,
  upcomingCompliance,
  onViewDetails,
}: {
  neededDocuments: NeededDocument[];
  upcomingCompliance: WorkflowRequest[];
  onViewDetails: (request: WorkflowRequest) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Documents Needed / Requested</h3>
        <div className="mt-3 space-y-2">
          {neededDocuments.map((doc) => (
            <div
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              key={doc.id}
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                <p className="text-xs text-slate-500">Due {formatDateLabel(doc.dueDate)}</p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  doc.status === "requested" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"
                }`}
              >
                {doc.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Upcoming Compliance Requests</h3>
        <div className="mt-3 space-y-2">
          {upcomingCompliance.map((request) => (
            <div
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              key={request.id}
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{request.title}</p>
                <p className="text-xs text-slate-500">Due {formatDateLabel(request.dueDate)}</p>
              </div>
              <button
                className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700"
                onClick={() => onViewDetails(request)}
                type="button"
              >
                Details
              </button>
            </div>
          ))}
          {upcomingCompliance.length === 0 ? (
            <p className="text-xs text-slate-500">No upcoming compliance requests.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function RightInsightPanel({
  client,
  activeRequest,
  workspace,
}: {
  client: FirmClientAccount;
  activeRequest: WorkflowRequest;
  workspace: ClientWorkspaceView;
}) {
  return (
    <aside className="w-full space-y-4 xl:w-80">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Progress</h3>
        <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-violet-600" style={{ width: `${client.completionRate}%` }} />
        </div>
        <p className="mt-2 text-sm text-slate-600">{client.completionRate}% completion</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Request Details</h3>
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-slate-600">Priority: {activeRequest.priority}</p>
          <p className="text-slate-600">Due: {formatDateLabel(activeRequest.dueDate)}</p>
          <p className="text-slate-600">Status: {activeRequest.status.replace(/_/g, " ")}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Attachments</h3>
        <div className="mt-3 space-y-2">
          {workspace.documents.slice(0, 3).map((document) => (
            <div key={document.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-900">{document.fileName}</p>
              <p className="text-xs text-slate-500">{document.sizeLabel}</p>
            </div>
          ))}
          {workspace.documents.length === 0 ? (
            <p className="text-xs text-slate-500">No attachments yet.</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
        <div className="mt-3 space-y-2">
          {activeRequest.auditTrail.slice(0, 4).map((item) => (
            <p key={item.id} className="text-xs text-slate-600">
              {item.status} · {formatDateLabel(item.timestamp)}
            </p>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function AccountantFollowUpsPage() {
  const { user } = useAuth();
  const portal = usePortal();
  const navigate = useNavigate();
  const scopedClients = useMemo(() => getScopedClients(user, portal.adminClients), [user, portal.adminClients]);

  const [selectedClientId, setSelectedClientId] = useState(scopedClients[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState("Requests");
  const [detailRequest, setDetailRequest] = useState<WorkflowRequest | null>(null);

  const selectedClient = useMemo(
    () => scopedClients.find((client) => client.id === selectedClientId) ?? scopedClients[0] ?? null,
    [scopedClients, selectedClientId],
  );

  const selectedWorkspace = useMemo(() => {
    if (!selectedClient) {
      return null;
    }

    return portal.getClientWorkspace(selectedClient.id);
  }, [portal, selectedClient]);

  const scopedRequests = useMemo(() => {
    if (!selectedWorkspace) {
      return [] as WorkflowRequest[];
    }

    return getScopedRequests(user, selectedWorkspace.requests, portal.adminClients);
  }, [portal.adminClients, selectedWorkspace, user]);

  const activeRequest = scopedRequests[0] ?? null;
  const otherRequests = scopedRequests.slice(1);

  const neededDocuments = useMemo<NeededDocument[]>(() => {
    if (!selectedWorkspace) {
      return [];
    }

    return selectedWorkspace.monthPack.slots
      .filter((slot) => ["missing", "rejected", "pending", "partial"].includes(slot.status))
      .slice(0, 6)
      .map((slot) => ({
        id: slot.id,
        name: slot.documentType,
        status: slot.status === "missing" ? "needed" : "requested",
        dueDate: slot.dueDate ?? new Date().toISOString(),
      }));
  }, [selectedWorkspace]);

  const complianceUpcoming = useMemo(() => {
    return scopedRequests
      .filter((request) => {
        const title = request.title.toLowerCase();
        return (
          request.requestType !== undefined ||
          title.includes("vat") ||
          title.includes("coida") ||
          title.includes("cipc") ||
          title.includes("tax") ||
          title.includes("compliance")
        );
      })
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  }, [scopedRequests]);

  if (!selectedClient || !selectedWorkspace) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        No accessible clients found for this workspace.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7fb] text-slate-900">
      <div className="flex rounded-2xl border border-slate-200">
        <ClientListPanel
          clients={scopedClients}
          selectedClientId={selectedClient.id}
          onSelectClient={(clientId) => {
            setSelectedClientId(clientId);
            setActiveTab("Requests");
            setDetailRequest(null);
          }}
        />

        <main className="flex min-w-0 flex-1 flex-col p-4 md:p-6">
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-4 pr-1">
              <ClientWorkspaceHeader
                client={selectedClient}
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab);
                  if (tab !== "Details") {
                    setDetailRequest(null);
                  }
                }}
              />

              {detailRequest || activeTab === "Details" ? (
                <RequestDetailView request={detailRequest ?? activeRequest!} />
              ) : activeTab === "Overview" ? (
                <OverviewPanel client={selectedClient} workspace={selectedWorkspace} />
              ) : activeTab === "Documents" ? (
                <DocumentsPanel
                  neededDocuments={neededDocuments}
                  upcomingCompliance={complianceUpcoming}
                  onViewDetails={(request) => {
                    navigate(`/firm/requests/${request.id}`);
                  }}
                />
              ) : activeRequest ? (
                <>
                  <div className="flex justify-end">
                    <button
                      className="rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700"
                      onClick={() => {
                        navigate(`/firm/requests/${activeRequest.id}`);
                      }}
                      type="button"
                    >
                      Details
                    </button>
                  </div>
                  <RequestWorkflowCard request={activeRequest} />
                  <ConversationTimeline request={activeRequest} />
                  <RequestRows
                    requests={otherRequests}
                    onViewDetails={(request) => {
                      navigate(`/firm/requests/${request.id}`);
                    }}
                  />
                </>
              ) : (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">No Requests Yet</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    This client does not have any active requests yet.
                  </p>
                </section>
              )}
            </div>

            <div className="pr-1">
              {activeRequest ? (
                <RightInsightPanel
                  client={selectedClient}
                  activeRequest={detailRequest ?? activeRequest}
                  workspace={selectedWorkspace}
                />
              ) : (
                <aside className="w-full space-y-4 xl:w-80">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900">Client Snapshot</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Add a request to populate request insights and activity.
                    </p>
                  </div>
                </aside>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}




