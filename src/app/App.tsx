// Friendly guide: this module (App) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { defaultPathForRole, useAuth } from "./auth";
import type { Permission, Role } from "../types/portal";
import { canAccessRoute, hasPermission } from "../utils/permissions";

const WorkspaceLayout = lazy(() =>
  import("../layouts/WorkspaceLayout").then((module) => ({ default: module.WorkspaceLayout })),
);
const AdminDashboardPage = lazy(() =>
  import("../pages/admin/AdminDashboardPage").then((module) => ({
    default: module.AdminDashboardPage,
  })),
);
const AdminClientsPage = lazy(() =>
  import("../pages/admin/AdminClientsPage").then((module) => ({
    default: module.AdminClientsPage,
  })),
);
const AdminUsersPage = lazy(() =>
  import("../pages/admin/AdminUsersPage").then((module) => ({
    default: module.AdminUsersPage,
  })),
);
const AdminRolesPage = lazy(() =>
  import("../pages/admin/AdminRolesPage").then((module) => ({
    default: module.AdminRolesPage,
  })),
);
const AdminAuditPage = lazy(() =>
  import("../pages/admin/AdminAuditPage").then((module) => ({
    default: module.AdminAuditPage,
  })),
);
const AdminAccountantsPage = lazy(() =>
  import("../pages/admin/AdminAccountantsPage").then((module) => ({
    default: module.AdminAccountantsPage,
  })),
);
const AdminAssignmentsPage = lazy(() =>
  import("../pages/admin/AdminAssignmentsPage").then((module) => ({
    default: module.AdminAssignmentsPage,
  })),
);
const AdminSettingsPage = lazy(() =>
  import("../pages/admin/AdminSettingsPage").then((module) => ({
    default: module.AdminSettingsPage,
  })),
);
const ClientComplianceCentrePage = lazy(() =>
  import("../pages/client/ClientComplianceCentrePage").then((module) => ({
    default: module.ClientComplianceCentrePage,
  })),
);
const ClientDashboardPage = lazy(() =>
  import("../pages/client/ClientDashboardPage").then((module) => ({
    default: module.ClientDashboardPage,
  })),
);
const ClientDocumentsPage = lazy(() =>
  import("../pages/client/ClientDocumentsPage").then((module) => ({
    default: module.ClientDocumentsPage,
  })),
);
const ClientMonthlyPacksPage = lazy(() =>
  import("../pages/client/ClientMonthlyPacksPage").then((module) => ({
    default: module.ClientMonthlyPacksPage,
  })),
);
const ClientNotificationsPage = lazy(() =>
  import("../pages/client/ClientNotificationsPage").then((module) => ({
    default: module.ClientNotificationsPage,
  })),
);
const ClientRequestsPage = lazy(() =>
  import("../pages/client/ClientRequestsPage").then((module) => ({
    default: module.ClientRequestsPage,
  })),
);
const ClientSettingsPage = lazy(() =>
  import("../pages/client/ClientSettingsPage").then((module) => ({
    default: module.ClientSettingsPage,
  })),
);
const AccountantClientWorkspacePage = lazy(() =>
  import("../pages/accountant/AccountantClientWorkspacePage").then((module) => ({
    default: module.AccountantClientWorkspacePage,
  })),
);
const AccountantPortfolioPage = lazy(() =>
  import("../pages/accountant/AccountantPortfolioPage").then((module) => ({
    default: module.AccountantPortfolioPage,
  })),
);
const AccountantComplianceCentrePage = lazy(() =>
  import("../pages/accountant/AccountantComplianceCentrePage").then((module) => ({
    default: module.AccountantComplianceCentrePage,
  })),
);
const AccountantDashboardPage = lazy(() =>
  import("../pages/accountant/AccountantDashboardPage").then((module) => ({
    default: module.AccountantDashboardPage,
  })),
);
const AccountantDocumentsPage = lazy(() =>
  import("../pages/accountant/AccountantDocumentsPage").then((module) => ({
    default: module.AccountantDocumentsPage,
  })),
);
const AccountantFilingPage = lazy(() =>
  import("../pages/accountant/AccountantFilingPage").then((module) => ({
    default: module.AccountantFilingPage,
  })),
);
const AccountantNotificationsPage = lazy(() =>
  import("../pages/accountant/AccountantNotificationsPage").then((module) => ({
    default: module.AccountantNotificationsPage,
  })),
);
const FirmRequestsPage = lazy(() =>
  import("../pages/firm/FirmRequestsPage").then((module) => ({ default: module.FirmRequestsPage })),
);
const FirmReviewQueuePage = lazy(() =>
  import("../pages/firm/FirmReviewQueuePage").then((module) => ({
    default: module.FirmReviewQueuePage,
  })),
);
const FirmSettingsPage = lazy(() =>
  import("../pages/firm/FirmSettingsPage").then((module) => ({ default: module.FirmSettingsPage })),
);
const FirmRequestDetailPage = lazy(() =>
  import("../pages/firm/FirmRequestDetailPage").then((module) => ({
    default: module.FirmRequestDetailPage,
  })),
);
const FirmActivityFeedPage = lazy(() =>
  import("../pages/firm/FirmActivityFeedPage").then((module) => ({
    default: module.FirmActivityFeedPage,
  })),
);
const FirmComplianceCalendarPage = lazy(() =>
  import("../pages/firm/FirmComplianceCalendarPage").then((module) => ({
    default: module.FirmComplianceCalendarPage,
  })),
);
const FirmExceptionsQueuePage = lazy(() =>
  import("../pages/firm/FirmExceptionsQueuePage").then((module) => ({
    default: module.FirmExceptionsQueuePage,
  })),
);
const FirmClient360Page = lazy(() =>
  import("../pages/firm/FirmClient360Page").then((module) => ({
    default: module.FirmClient360Page,
  })),
);
const NotificationPreferencesPage = lazy(() =>
  import("../pages/shared/NotificationPreferencesPage").then((module) => ({
    default: module.NotificationPreferencesPage,
  })),
);
const AdminRequestStateMachinePage = lazy(() =>
  import("../pages/admin/AdminRequestStateMachinePage").then((module) => ({
    default: module.AdminRequestStateMachinePage,
  })),
);
const AccessDeniedPage = lazy(() =>
  import("../pages/shared/AccessDeniedPage").then((module) => ({
    default: module.AccessDeniedPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("../pages/shared/ForgotPasswordPage").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const InviteSetupPage = lazy(() =>
  import("../pages/shared/InviteSetupPage").then((module) => ({
    default: module.InviteSetupPage,
  })),
);
const LoginPage = lazy(() =>
  import("../pages/shared/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const NotFoundPage = lazy(() =>
  import("../pages/shared/NotFoundPage").then((module) => ({ default: module.NotFoundPage })),
);

function LoadingShell() {
  return <div className="min-h-screen bg-slate-100" />;
}

function SessionLanding() {
  const { ready, user } = useAuth();
  if (!ready) return <LoadingShell />;
  return <Navigate replace to={user ? defaultPathForRole(user.role) : "/login"} />;
}

function PublicRoute({ children }: { children: JSX.Element }) {
  const { ready, user } = useAuth();
  if (!ready) return <LoadingShell />;
  if (user) return <Navigate replace to={defaultPathForRole(user.role)} />;
  return children;
}

function RequireClientWorkspace() {
  const { ready, user } = useAuth();
  if (!ready) return <LoadingShell />;
  if (!user) return <Navigate replace to="/login" />;
  if (user.role !== "client") return <AccessDeniedPage />;
  return <WorkspaceLayout role="client" />;
}

function RequireFirmWorkspace() {
  const { ready, user } = useAuth();
  if (!ready) return <LoadingShell />;
  if (!user) return <Navigate replace to="/login" />;
  if (!canAccessRoute(user, "/firm")) return <AccessDeniedPage />;
  return <WorkspaceLayout role={user.role} />;
}

function RequirePermission({ children, permission }: { children: JSX.Element; permission: Permission }) {
  const { ready, user } = useAuth();
  if (!ready) return <LoadingShell />;
  if (!user) return <Navigate replace to="/login" />;
  if (!hasPermission(user, permission)) return <AccessDeniedPage />;
  return children;
}

function FirmDashboardRoute() {
  const { ready, user } = useAuth();
  if (!ready) return <LoadingShell />;
  if (!user) return <Navigate replace to="/login" />;
  return user.role === "admin" ? <AdminDashboardPage /> : <AccountantDashboardPage />;
}

function FirmClientsRoute() {
  const { ready, user } = useAuth();
  if (!ready) return <LoadingShell />;
  if (!user) return <Navigate replace to="/login" />;
  return user.role === "admin" ? <AdminClientsPage /> : <AccountantPortfolioPage />;
}

function redirectAccountantPath(pathname: string) {
  if (pathname.startsWith("/accountant/messages")) {
    return pathname.replace("/accountant/messages", "/firm/inbox");
  }
  return pathname.replace("/accountant", "/firm");
}

function redirectAdminPath(pathname: string) {
  if (pathname.startsWith("/admin/users")) {
    return pathname.replace("/admin/users", "/firm/admin/users");
  }
  if (pathname.startsWith("/admin/roles")) {
    return pathname.replace("/admin/roles", "/firm/admin/roles");
  }
  if (pathname.startsWith("/admin/audit")) {
    return pathname.replace("/admin/audit", "/firm/admin/audit");
  }
  if (pathname.startsWith("/admin/accountants")) {
    return pathname.replace("/admin/accountants", "/firm/admin/accountants");
  }
  if (pathname.startsWith("/admin/assignments")) {
    return pathname.replace("/admin/assignments", "/firm/admin/assignments");
  }
  if (pathname.startsWith("/admin/system-settings")) {
    return pathname.replace("/admin/system-settings", "/firm/admin/system-settings");
  }
  if (pathname.startsWith("/admin/request-state-machine")) {
    return pathname.replace("/admin/request-state-machine", "/firm/admin/request-state-machine");
  }
  if (
    pathname.startsWith("/admin/templates") ||
    pathname.startsWith("/admin/deadlines") ||
    pathname.startsWith("/admin/policies")
  ) {
    return pathname.replace(/^\/admin(?:\/templates|\/deadlines|\/policies)/, "/firm/admin/system-settings");
  }
  if (pathname.startsWith("/admin/settings")) {
    return pathname.replace("/admin/settings", "/firm/admin/system-settings");
  }
  return pathname.replace("/admin", "/firm");
}

function LegacyWorkspaceRedirect({ role }: { role: Extract<Role, "admin" | "accountant"> }) {
  const location = useLocation();
  const { ready, user } = useAuth();
  if (!ready) return <LoadingShell />;
  if (!user) return <Navigate replace to="/login" />;
  if (user.role !== role) return <AccessDeniedPage />;

  const nextPath = role === "accountant" ? redirectAccountantPath(location.pathname) : redirectAdminPath(location.pathname);
  return <Navigate replace to={`${nextPath}${location.search}`} />;
}

function LegacyFirmRequestDetailRedirect() {
  const { requestId } = useParams();
  if (!requestId) return <Navigate replace to="/firm/inbox" />;
  return <Navigate replace to={`/firm/inbox/${requestId}`} />;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <Routes>
        <Route element={<SessionLanding />} path="/" />
        <Route element={<PublicRoute><LoginPage /></PublicRoute>} path="/login" />
        <Route element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} path="/forgot-password" />
        <Route element={<PublicRoute><InviteSetupPage /></PublicRoute>} path="/invite-setup" />
        <Route element={<AccessDeniedPage />} path="/access-denied" />

        <Route element={<RequireClientWorkspace />} path="/client">
          <Route element={<Navigate replace to="dashboard" />} index />
          <Route element={<ClientDashboardPage />} path="dashboard" />
          <Route element={<ClientMonthlyPacksPage />} path="packs" />
          <Route element={<Navigate replace to="/client/inbox" />} path="requests" />
          <Route element={<ClientRequestsPage />} path="inbox" />
          <Route element={<ClientDocumentsPage />} path="documents" />
          <Route element={<Navigate replace to="/client/documents" />} path="invoices" />
          <Route element={<ClientComplianceCentrePage />} path="compliance" />
          <Route element={<ClientNotificationsPage />} path="notifications" />
          <Route element={<NotificationPreferencesPage />} path="notifications/preferences" />
          <Route element={<Navigate replace to="/client/inbox" />} path="messages" />
          <Route element={<ClientSettingsPage />} path="settings" />
        </Route>

        <Route element={<RequireFirmWorkspace />} path="/firm">
          <Route element={<Navigate replace to="dashboard" />} index />
          <Route element={<FirmDashboardRoute />} path="dashboard" />
          <Route element={<FirmClientsRoute />} path="clients" />
          <Route element={<AccountantClientWorkspacePage />} path="clients/:clientId" />
          <Route element={<AccountantClientWorkspacePage />} path="clients/:clientId/packs" />
          <Route element={<AccountantDocumentsPage />} path="documents" />
          <Route element={<AccountantFilingPage />} path="filing" />
          <Route element={<FirmReviewQueuePage />} path="review" />
          <Route element={<Navigate replace to="/firm/inbox" />} path="requests" />
          <Route element={<FirmRequestsPage />} path="inbox" />
          <Route element={<FirmRequestDetailPage />} path="inbox/:requestId" />
          <Route element={<LegacyFirmRequestDetailRedirect />} path="requests/:requestId" />
          <Route element={<FirmActivityFeedPage />} path="activity" />
          <Route element={<FirmExceptionsQueuePage />} path="exceptions" />
          <Route element={<AccountantComplianceCentrePage />} path="compliance" />
          <Route element={<FirmComplianceCalendarPage />} path="compliance/calendar" />
          <Route element={<AccountantNotificationsPage />} path="notifications" />
          <Route element={<NotificationPreferencesPage />} path="notifications/preferences" />
          <Route element={<FirmSettingsPage />} path="settings" />
          <Route element={<FirmClient360Page />} path="clients/:clientId/profile" />

          <Route
            element={<RequirePermission permission="manage:users"><AdminUsersPage /></RequirePermission>}
            path="admin/users"
          />
          <Route
            element={<RequirePermission permission="manage:roles"><AdminRolesPage /></RequirePermission>}
            path="admin/roles"
          />
          <Route
            element={<RequirePermission permission="manage:users"><AdminAccountantsPage /></RequirePermission>}
            path="admin/accountants"
          />
          <Route
            element={<RequirePermission permission="manage:assignments"><AdminAssignmentsPage /></RequirePermission>}
            path="admin/assignments"
          />
          <Route
            element={<RequirePermission permission="manage:system_settings"><AdminAuditPage /></RequirePermission>}
            path="admin/audit"
          />
          <Route
            element={<RequirePermission permission="manage:system_settings"><AdminSettingsPage /></RequirePermission>}
            path="admin/system-settings"
          />
          <Route
            element={<RequirePermission permission="manage:system_settings"><AdminRequestStateMachinePage /></RequirePermission>}
            path="admin/request-state-machine"
          />
        </Route>

        <Route element={<LegacyWorkspaceRedirect role="accountant" />} path="/accountant/*" />
        <Route element={<LegacyWorkspaceRedirect role="admin" />} path="/admin/*" />
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </Suspense>
  );
}
