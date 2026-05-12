import { useParams } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { usePortal } from "../../app/portal";
import { AccountantClientWorkspacePage } from "../accountant/AccountantClientWorkspacePage";
import { AccessDeniedPage } from "../shared/AccessDeniedPage";
import { canViewClient } from "../../utils/permissions";

export function FirmClientWorkspacePage() {
  const { clientId = "" } = useParams();
  const { user } = useAuth();
  const portal = usePortal();

  if (clientId && user && !canViewClient(user, clientId, portal.adminClients)) {
    return <AccessDeniedPage />;
  }

  return <AccountantClientWorkspacePage />;
}
