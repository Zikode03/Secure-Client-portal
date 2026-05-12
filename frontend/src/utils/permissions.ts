import type {
  ComplianceClientStatus,
  ComplianceDocumentRecord,
  DocumentRecord,
  FirmClientAccount,
  Permission,
  ReviewQueueItem,
  Role,
  SessionUser,
  WorkflowRequest,
} from "../types/portal";

const allPermissions: Permission[] = [
  "view:assigned_clients",
  "view:all_clients",
  "view:assigned_documents",
  "view:all_documents",
  "view:assigned_review_queue",
  "view:firm_review_queue",
  "view:assigned_compliance",
  "view:firm_compliance",
  "manage:users",
  "manage:roles",
  "manage:assignments",
  "manage:templates",
  "manage:deadline_rules",
  "manage:system_settings",
  "export:firm_reports",
  "export:client_reports",
  "request:documents",
  "review:documents",
  "comment:documents",
  "comment:requests",
];

const rolePermissions: Record<Role, Permission[]> = {
  admin: allPermissions,
  accountant: [
    "view:assigned_clients",
    "view:assigned_documents",
    "view:assigned_review_queue",
    "view:assigned_compliance",
    "export:client_reports",
    "request:documents",
    "review:documents",
    "comment:documents",
    "comment:requests",
  ],
  client: [
    "export:client_reports",
    "comment:documents",
    "comment:requests",
  ],
};

const clientIdAliases: Record<string, string[]> = {
  "client-apex": ["firm-client-1"],
  "firm-client-1": ["client-apex"],
};

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function expandClientIds(clientIds: string[]) {
  const expanded = [...clientIds];

  clientIds.forEach((clientId) => {
    expanded.push(...(clientIdAliases[clientId] ?? []));
  });

  return uniqueStrings(expanded);
}

export function getPermissionsForRole(role: Role) {
  return [...rolePermissions[role]];
}

export function getUserPermissions(user: SessionUser | null | undefined) {
  if (!user) {
    return [] as Permission[];
  }

  return Array.from(new Set([...(user.permissions ?? []), ...getPermissionsForRole(user.role)]));
}

export function hasPermission(
  user: SessionUser | null | undefined,
  permission: Permission,
) {
  return getUserPermissions(user).includes(permission);
}

function getAssignedClientIds(
  user: SessionUser,
  clients: FirmClientAccount[],
) {
  if (user.role === "admin") {
    return clients.map((client) => client.id);
  }

  if (user.role === "client") {
    return expandClientIds(user.clientIds);
  }

  const assignmentIdsFromUser = expandClientIds(user.assignedClientIds);
  const assignmentIdsFromPortfolio = clients
    .filter((client) => client.assignedAccountant === user.fullName)
    .map((client) => client.id);

  return uniqueStrings([...assignmentIdsFromUser, ...expandClientIds(assignmentIdsFromPortfolio)]);
}

export function canViewClient(
  user: SessionUser | null | undefined,
  clientId: string,
  clients: FirmClientAccount[],
) {
  if (!user) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  return getAssignedClientIds(user, clients).includes(clientId);
}

function canViewByClientName(
  user: SessionUser | null | undefined,
  clientName: string,
  clients: FirmClientAccount[],
) {
  if (!user) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  const visibleNames = getScopedClients(user, clients).map((client) => client.clientName);
  return visibleNames.includes(clientName);
}

export function canViewDocument(
  user: SessionUser | null | undefined,
  document: DocumentRecord,
  clients: FirmClientAccount[],
) {
  return (
    canViewClient(user, document.clientId, clients) ||
    canViewByClientName(user, document.clientName, clients)
  );
}

export function canViewRequest(
  user: SessionUser | null | undefined,
  request: WorkflowRequest,
  clients: FirmClientAccount[],
) {
  return (
    canViewClient(user, request.clientId, clients) ||
    canViewByClientName(user, request.clientName, clients)
  );
}

export function canViewComplianceItem(
  user: SessionUser | null | undefined,
  item: ComplianceDocumentRecord,
  clients: FirmClientAccount[],
) {
  return (
    canViewClient(user, item.clientId, clients) ||
    canViewByClientName(user, item.clientName, clients)
  );
}

export function getScopedClients(
  user: SessionUser | null | undefined,
  clients: FirmClientAccount[],
) {
  if (!user) {
    return [];
  }

  if (user.role === "admin") {
    return clients;
  }

  const visibleIds = new Set(getAssignedClientIds(user, clients));
  return clients.filter((client) => visibleIds.has(client.id));
}

export function getScopedDocuments(
  user: SessionUser | null | undefined,
  documents: DocumentRecord[],
  clients: FirmClientAccount[],
) {
  if (!user) {
    return [];
  }

  return documents.filter((document) => canViewDocument(user, document, clients));
}

export function getScopedRequests(
  user: SessionUser | null | undefined,
  requests: WorkflowRequest[],
  clients: FirmClientAccount[],
) {
  if (!user) {
    return [];
  }

  return requests.filter((request) => canViewRequest(user, request, clients));
}

export function getScopedReviewQueue(
  user: SessionUser | null | undefined,
  queue: ReviewQueueItem[],
  clients: FirmClientAccount[],
) {
  if (!user) {
    return [];
  }

  if (user.role === "admin") {
    return queue;
  }

  if (user.role === "accountant") {
    return queue.filter((item) => item.assignedAccountant === user.fullName);
  }

  const visibleNames = new Set(getScopedClients(user, clients).map((client) => client.clientName));
  return queue.filter((item) => visibleNames.has(item.clientName));
}

export function getScopedComplianceItems(
  user: SessionUser | null | undefined,
  items: ComplianceDocumentRecord[],
  clients: FirmClientAccount[],
) {
  if (!user) {
    return [];
  }

  return items.filter((item) => canViewComplianceItem(user, item, clients));
}

export function getScopedComplianceStatuses(
  user: SessionUser | null | undefined,
  statuses: ComplianceClientStatus[],
  clients: FirmClientAccount[],
) {
  if (!user) {
    return [];
  }

  if (user.role === "admin") {
    return statuses;
  }

  const visibleIds = new Set(getAssignedClientIds(user, clients));
  const visibleNames = new Set(getScopedClients(user, clients).map((client) => client.clientName));

  return statuses.filter(
    (status) => visibleIds.has(status.clientId) || visibleNames.has(status.clientName),
  );
}

export function canAccessRoute(
  user: SessionUser | null | undefined,
  route: string,
) {
  if (!user) {
    return false;
  }

  if (route.startsWith("/client")) {
    return user.role === "client";
  }

  if (route.startsWith("/firm/admin/users")) {
    return hasPermission(user, "manage:users");
  }

  if (route.startsWith("/firm/admin/roles")) {
    return hasPermission(user, "manage:roles");
  }

  if (route.startsWith("/firm/admin/assignments")) {
    return hasPermission(user, "manage:assignments");
  }

  if (route.startsWith("/firm/admin/templates")) {
    return hasPermission(user, "manage:templates");
  }

  if (route.startsWith("/firm/admin/deadline-rules")) {
    return hasPermission(user, "manage:deadline_rules");
  }

  if (route.startsWith("/firm/admin/system-settings")) {
    return hasPermission(user, "manage:system_settings");
  }

  if (route.startsWith("/firm/admin/accountants")) {
    return hasPermission(user, "manage:users");
  }

  if (route.startsWith("/firm")) {
    return user.role === "admin" || user.role === "accountant";
  }

  if (route.startsWith("/accountant")) {
    return user.role === "accountant";
  }

  if (route.startsWith("/admin")) {
    return user.role === "admin";
  }

  return true;
}

// Frontend permissions are only a UX layer. The backend and database must still
// enforce real authorization, ownership, and assignment checks for every request.
