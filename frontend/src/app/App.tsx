import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { defaultPathForRole, useAuth } from "./auth";
import { WorkspaceLayout } from "../layouts/WorkspaceLayout";
import { AdminAccountantsPage } from "../pages/admin/AdminAccountantsPage";
import { AdminAssignmentsPage } from "../pages/admin/AdminAssignmentsPage";
import { AdminDeadlinesPage } from "../pages/admin/AdminDeadlinesPage";
import { AdminRolesPage } from "../pages/admin/AdminRolesPage";
import { AdminSettingsPage } from "../pages/admin/AdminSettingsPage";
import { AdminTemplatesPage } from "../pages/admin/AdminTemplatesPage";
import { AdminUsersPage } from "../pages/admin/AdminUsersPage";
import { ClientComplianceCentrePage } from "../pages/client/ClientComplianceCentrePage";
import { ClientDashboardPage } from "../pages/client/ClientDashboardPage";
import { ClientDocumentsPage } from "../pages/client/ClientDocumentsPage";
import { ClientMonthlyPacksPage } from "../pages/client/ClientMonthlyPacksPage";
import { ClientNotificationsPage } from "../pages/client/ClientNotificationsPage";
import { ClientRequestsPage } from "../pages/client/ClientRequestsPage";
import { ClientSettingsPage } from "../pages/client/ClientSettingsPage";
import { FirmClientWorkspacePage } from "../pages/firm/FirmClientWorkspacePage";
import { FirmClientsPage } from "../pages/firm/FirmClientsPage";
import { FirmComplianceCentrePage } from "../pages/firm/FirmComplianceCentrePage";
import { FirmDashboardPage } from "../pages/firm/FirmDashboardPage";
import { FirmDocumentsPage } from "../pages/firm/FirmDocumentsPage";
import { FirmNotificationsPage } from "../pages/firm/FirmNotificationsPage";
import { FirmRequestsPage } from "../pages/firm/FirmRequestsPage";
import { FirmReviewQueuePage } from "../pages/firm/FirmReviewQueuePage";
import { FirmSettingsPage } from "../pages/firm/FirmSettingsPage";
import { AccessDeniedPage } from "../pages/shared/AccessDeniedPage";
import { ForgotPasswordPage } from "../pages/shared/ForgotPasswordPage";
import { InviteSetupPage } from "../pages/shared/InviteSetupPage";
import { LoginPage } from "../pages/shared/LoginPage";
import { NotFoundPage } from "../pages/shared/NotFoundPage";
import type { Permission, Role } from "../types/portal";
import { canAccessRoute, hasPermission } from "../utils/permissions";

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
    return pathname.replace("/accountant/messages", "/firm/requests");
  }

  return pathname.replace("/accountant", "/firm");
}

function redirectAdminPath(pathname: string) {
  if (pathname.startsWith("/admin/users")) {
    return pathname.replace("/admin/users", "/firm/admin/users");
  }

  if (pathname.startsWith("/admin/accountants")) {
    return pathname.replace("/admin/accountants", "/firm/admin/accountants");
  }

  if (pathname.startsWith("/admin/assignments")) {
    return pathname.replace("/admin/assignments", "/firm/admin/assignments");
  }

  if (pathname.startsWith("/admin/templates")) {
    return pathname.replace("/admin/templates", "/firm/admin/templates");
  }

  if (pathname.startsWith("/admin/deadlines")) {
    return pathname.replace("/admin/deadlines", "/firm/admin/deadline-rules");
  }

  if (pathname.startsWith("/admin/policies")) {
    return pathname.replace("/admin/policies", "/firm/admin/templates");
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
  return (
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
        <Route element={<ClientRequestsPage />} path="requests" />
        <Route element={<ClientDocumentsPage />} path="documents" />
        <Route element={<Navigate replace to="/client/documents" />} path="invoices" />
        <Route element={<ClientComplianceCentrePage />} path="compliance" />
        <Route element={<ClientNotificationsPage />} path="notifications" />
        <Route element={<Navigate replace to="/client/requests" />} path="messages" />
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
        <Route element={<FirmRequestsPage />} path="requests" />
        <Route element={<FirmComplianceCentrePage />} path="compliance" />
        <Route element={<FirmNotificationsPage />} path="notifications" />
        <Route element={<FirmSettingsPage />} path="settings" />

        <Route
          element={
            <RequirePermission permission="manage:users">
              <AdminUsersPage />
            </RequirePermission>
          }
          path="admin/users"
        />
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
            <RequirePermission permission="manage:roles">
              <AdminRolesPage />
            </RequirePermission>
          }
          path="admin/roles"
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
            <RequirePermission permission="manage:templates">
              <AdminTemplatesPage />
            </RequirePermission>
          }
          path="admin/templates"
        />
        <Route
          element={
            <RequirePermission permission="manage:deadline_rules">
              <AdminDeadlinesPage />
            </RequirePermission>
          }
          path="admin/deadline-rules"
        />
        <Route
          element={
            <RequirePermission permission="manage:system_settings">
              <AdminSettingsPage />
            </RequirePermission>
          }
          path="admin/system-settings"
        />
      </Route>

      <Route element={<LegacyWorkspaceRedirect role="accountant" />} path="/accountant/*" />
      <Route element={<LegacyWorkspaceRedirect role="admin" />} path="/admin/*" />

      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  );
}
