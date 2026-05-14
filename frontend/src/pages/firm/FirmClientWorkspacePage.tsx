// Friendly guide: this module (FirmClientWorkspacePage) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { useParams } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { AccountantClientWorkspacePage } from "../accountant/AccountantClientWorkspacePage";
import { AccessDeniedPage } from "../shared/AccessDeniedPage";
import { canViewClient } from "../../utils/permissions";

// Component flow: gather data first, then render a focused UI state.
export function FirmClientWorkspacePage() {
  const { clientId = "" } = useParams();
  const { user } = useAuth();
  const portal = usePortal();

  if (clientId && user && !canViewClient(user, clientId, portal.adminClients)) {
    return <AccessDeniedPage />;
  }

  return <AccountantClientWorkspacePage />;
}