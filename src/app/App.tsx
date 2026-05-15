// Friendly guide: this module (App) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { defaultPathForRole, useAuth } from "./auth";
import type { Permission, Role } from "../types/portal";
import { canAccessRoute, hasPermission } from "../utils/permissions";

const WorkspaceLayout = lazy(() =>
  import("../layouts/WorkspaceLayout").then((module) => ({ default: module.WorkspaceLayout })),
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
const FirmClientWorkspacePage = lazy(() =>
  import("../pages/firm/FirmClientWorkspacePage").then((module) => ({
    default: module.FirmClientWorkspacePage,
  })),
);
const FirmClientsPage = lazy(() =>
  import("../pages/firm/FirmClientsPage").then((module) => ({ default: module.FirmClientsPage })),
);
const FirmComplianceCentrePage = lazy(() =>
  import("../pages/firm/FirmComplianceCentrePage").then((module) => ({
    default: module.FirmComplianceCentrePage,
  })),
);
const FirmDashboardPage = lazy(() =>
  import("../pages/firm/FirmDashboardPage").then((module) => ({
    default: module.FirmDashboardPage,
  })),
);
const FirmDocumentsPage = lazy(() =>
  import("../pages/firm/FirmDocumentsPage").then((module) => ({
    default: module.FirmDocumentsPage,
  })),
);
const FirmNotificationsPage = lazy(() =>
  import("../pages/firm/FirmNotificationsPage").then((module) => ({
    default: module.FirmNotificationsPage,
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

// Component flow: gather data first, then render a focused UI state.
function LoadingShell() {
  return <div className="min-h-screen bg-slate-100" />;
}

function SessionLanding() {
  const { ready, user } = useAuth();

  if (!ready) {
    return <LoadingShell />;
  }

  return <Navigate replace to={user ? defaultPathForRole(user.role) : "/login"} />;
}

function PublicRoute({ children }: { children: JSX.Element }) {
  const { ready, user } = useAuth();

  if (!ready) {
    return <LoadingShell />;
  }

  if (user) {
    return <Navigate replace to={defaultPathForRole(user.role)} />;
  }

  return children;
}

function RequireClientWorkspace() {
  const { ready, user } = useAuth();

  if (!ready) {
    return <LoadingShell />;
  }

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  if (user.role !== "client") {
    return <AccessDeniedPage />;
  }

  return <WorkspaceLayout role="client" />;
}

function RequireFirmWorkspace() {
  const { ready, user } = useAuth();

  if (!ready) {
    return <LoadingShell />;
  }

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  // Frontend route checks improve UX only. The API and database must still
  // enforce role, assignment, and record ownership before serving real data.
  if (!canAccessRoute(user, "/firm")) {
    return <AccessDeniedPage />;
  }

  return <WorkspaceLayout role={user.role} />;
}

function RequirePermission({
  children,
  permission,
}: {
  children: JSX.Element;
  permission: Permission;
}) {
  const { ready, user } = useAuth();

  if (!ready) {
    return <LoadingShell />;
  }

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  if (!hasPermission(user, permission)) {
    return <AccessDeniedPage />;
  }

  return children;
}

function redirectAccountantPath(pathname: string) {
  if (pathname.startsWith("/accountant/messages")) {
    return pathname.replace("/accountant/messages", "/firm/inbox");
  }

  return pathname.replace("/accountant", "/firm");
}

function redirectAdminPath(pathname: string) {
  if (pathname.startsWith("/admin/users") || pathname.startsWith("/admin/roles")) {
    return pathname.replace(/^\/admin\/(?:users|roles)/, "/firm/settings");
  }

  if (pathname.startsWith("/admin/accountants")) {
    return pathname.replace("/admin/accountants", "/firm/admin/accountants");
  }

  if (pathname.startsWith("/admin/assignments")) {
    return pathname.replace("/admin/assignments", "/firm/admin/assignments");
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

  if (!ready) {
    return <LoadingShell />;
  }

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  if (user.role !== role) {
    return <AccessDeniedPage />;
  }

  const nextPath =
    role === "accountant"
      ? redirectAccountantPath(location.pathname)
      : redirectAdminPath(location.pathname);

  return <Navigate replace to={`${nextPath}${location.search}`} />;
}

export default function App() {
// Render output: this is the visual state users interact with.
  return (
    <Suspense fallback={<LoadingShell />}>
      <Routes>
        <Route element={<SessionLanding />} path="/" />

        <Route
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
          path="/login"
        />
        <Route
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
          path="/forgot-password"
        />
        <Route
          element={
            <PublicRoute>
              <InviteSetupPage />
            </PublicRoute>
          }
          path="/invite-setup"
        />
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
          <Route element={<FirmDashboardPage />} path="dashboard" />
          <Route element={<FirmClientsPage />} path="clients" />
          <Route element={<FirmClientWorkspacePage />} path="clients/:clientId" />
          <Route element={<FirmClientWorkspacePage />} path="clients/:clientId/packs" />
          <Route element={<FirmDocumentsPage />} path="documents" />
          <Route element={<FirmReviewQueuePage />} path="review" />
          <Route element={<Navigate replace to="/firm/inbox" />} path="requests" />
          <Route element={<FirmRequestsPage />} path="inbox" />
          <Route element={<FirmRequestDetailPage />} path="inbox/:requestId" />
          <Route element={<FirmRequestsPage />} path="requests" />
          <Route element={<FirmRequestDetailPage />} path="requests/:requestId" />
          <Route element={<FirmActivityFeedPage />} path="activity" />
          <Route element={<FirmExceptionsQueuePage />} path="exceptions" />
          <Route element={<FirmComplianceCentrePage />} path="compliance" />
          <Route element={<FirmComplianceCalendarPage />} path="compliance/calendar" />
          <Route element={<FirmNotificationsPage />} path="notifications" />
          <Route element={<NotificationPreferencesPage />} path="notifications/preferences" />
          <Route element={<FirmSettingsPage />} path="settings" />
          <Route element={<FirmClient360Page />} path="clients/:clientId/profile" />

          <Route
            element={
              <RequirePermission permission="manage:users">
                <AdminAccountantsPage />
              </RequirePermission>
            }
            path="admin/accountants"
          />
          <Route
            element={
              <RequirePermission permission="manage:assignments">
                <AdminAssignmentsPage />
              </RequirePermission>
            }
            path="admin/assignments"
          />
          <Route
            element={
              <RequirePermission permission="manage:system_settings">
                <AdminSettingsPage />
              </RequirePermission>
            }
            path="admin/system-settings"
          />
          <Route
            element={
              <RequirePermission permission="manage:system_settings">
                <AdminRequestStateMachinePage />
              </RequirePermission>
            }
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
