import { Navigate, Route, Routes } from "react-router-dom";
import { defaultPathForRole, useAuth } from "./auth";
import { WorkspaceLayout } from "../layouts/WorkspaceLayout";
import { AccountantClientWorkspacePage } from "../pages/accountant/AccountantClientWorkspacePage";
import { AccountantComplianceCentrePage } from "../pages/accountant/AccountantComplianceCentrePage";
import { AccountantComplianceExceptionsPage } from "../pages/accountant/AccountantComplianceExceptionsPage";
import { AccountantDashboardPage } from "../pages/accountant/AccountantDashboardPage";
import { AccountantDocumentsPage } from "../pages/accountant/AccountantDocumentsPage";
import { AccountantFollowUpsPage } from "../pages/accountant/AccountantFollowUpsPage";
import { AccountantMessagesPage } from "../pages/accountant/AccountantMessagesPage";
import { AccountantNotificationsPage } from "../pages/accountant/AccountantNotificationsPage";
import { AccountantPortfolioPage } from "../pages/accountant/AccountantPortfolioPage";
import { AccountantReviewPage } from "../pages/accountant/AccountantReviewPage";
import { AccountantSettingsPage } from "../pages/accountant/AccountantSettingsPage";
import { AdminAccountantsPage } from "../pages/admin/AdminAccountantsPage";
import { AdminAssignmentsPage } from "../pages/admin/AdminAssignmentsPage";
import { AdminClientsPage } from "../pages/admin/AdminClientsPage";
import { AdminCompliancePage } from "../pages/admin/AdminCompliancePage";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { AdminDeadlinesPage } from "../pages/admin/AdminDeadlinesPage";
import { AdminPoliciesPage } from "../pages/admin/AdminPoliciesPage";
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
import { AccessDeniedPage } from "../pages/shared/AccessDeniedPage";
import { ForgotPasswordPage } from "../pages/shared/ForgotPasswordPage";
import { InviteSetupPage } from "../pages/shared/InviteSetupPage";
import { LoginPage } from "../pages/shared/LoginPage";
import { NotFoundPage } from "../pages/shared/NotFoundPage";
import type { Role } from "../types/portal";

function SessionLanding() {
  const { ready, user } = useAuth();

  if (!ready) {
    return <div className="min-h-screen bg-slate-100" />;
  }

  return <Navigate replace to={user ? defaultPathForRole(user.role) : "/login"} />;
}

function PublicRoute({ children }: { children: JSX.Element }) {
  const { ready, user } = useAuth();

  if (!ready) {
    return <div className="min-h-screen bg-slate-100" />;
  }

  if (user) {
    return <Navigate replace to={defaultPathForRole(user.role)} />;
  }

  return children;
}

function RequireRole({
  children,
  role,
}: {
  children: JSX.Element;
  role: Role;
}) {
  const { ready, user } = useAuth();

  if (!ready) {
    return <div className="min-h-screen bg-slate-100" />;
  }

  if (!user) {
    return <Navigate replace to="/login" />;
  }

  if (user.role !== role) {
    return <AccessDeniedPage />;
  }

  return children;
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

      <Route
        element={
          <RequireRole role="client">
            <WorkspaceLayout role="client" />
          </RequireRole>
        }
        path="/client"
      >
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

      <Route
        element={
          <RequireRole role="accountant">
            <WorkspaceLayout role="accountant" />
          </RequireRole>
        }
        path="/accountant"
      >
        <Route element={<Navigate replace to="dashboard" />} index />
        <Route element={<AccountantDashboardPage />} path="dashboard" />
        <Route element={<AccountantPortfolioPage />} path="clients" />
        <Route element={<AccountantClientWorkspacePage />} path="clients/:clientId" />
        <Route element={<AccountantClientWorkspacePage />} path="clients/:clientId/packs" />
        <Route element={<AccountantDocumentsPage />} path="documents" />
        <Route element={<AccountantReviewPage />} path="review" />
        <Route element={<AccountantFollowUpsPage />} path="follow-ups" />
        <Route element={<AccountantComplianceExceptionsPage />} path="compliance-exceptions" />
        <Route element={<AccountantComplianceCentrePage />} path="compliance" />
        <Route element={<AccountantNotificationsPage />} path="notifications" />
        <Route element={<AccountantMessagesPage />} path="messages" />
        <Route element={<AccountantSettingsPage />} path="settings" />
      </Route>

      <Route
        element={
          <RequireRole role="admin">
            <WorkspaceLayout role="admin" />
          </RequireRole>
        }
        path="/admin"
      >
        <Route element={<Navigate replace to="dashboard" />} index />
        <Route element={<AdminDashboardPage />} path="dashboard" />
        <Route element={<AdminClientsPage />} path="clients" />
        <Route element={<AdminAccountantsPage />} path="accountants" />
        <Route element={<AdminUsersPage />} path="users" />
        <Route element={<AdminAssignmentsPage />} path="assignments" />
        <Route element={<AdminTemplatesPage />} path="templates" />
        <Route element={<AdminDeadlinesPage />} path="deadlines" />
        <Route element={<AdminCompliancePage />} path="compliance" />
        <Route element={<AdminPoliciesPage />} path="policies" />
        <Route element={<AdminSettingsPage />} path="settings" />
      </Route>

      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  );
}
