import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { PortalProvider, usePortal } from "../app/portal";

function PortalWrapper({ children }: { children: ReactNode }) {
  return <PortalProvider>{children}</PortalProvider>;
}

describe("admin actions regression", () => {
  it("can disable and re-activate a user account", () => {
    const { result } = renderHook(() => usePortal(), { wrapper: PortalWrapper });
    const targetUser = result.current.userAccounts.find(
      (user) => user.role === "accountant" && user.status === "active",
    );

    expect(targetUser).toBeDefined();

    act(() => {
      const disable = result.current.disableUserAccount(targetUser!.id);
      expect(disable.ok).toBe(true);
    });
    expect(
      result.current.userAccounts.find((user) => user.id === targetUser!.id)?.status,
    ).toBe("suspended");

    act(() => {
      const activate = result.current.activateUserAccount(targetUser!.id);
      expect(activate.ok).toBe(true);
    });
    expect(
      result.current.userAccounts.find((user) => user.id === targetUser!.id)?.status,
    ).toBe("active");
  });

  it("unassigns a primary accountant cleanly", () => {
    const { result } = renderHook(() => usePortal(), { wrapper: PortalWrapper });
    const assignedClient = result.current.adminClients.find(
      (client) => (client.assignedAccountantUserId ?? "").length > 0,
    );

    expect(assignedClient).toBeDefined();

    act(() => {
      const response = result.current.assignClientAccountant(assignedClient!.id, "", undefined);
      expect(response.ok).toBe(true);
    });

    const updated = result.current.adminClients.find((client) => client.id === assignedClient!.id);
    expect(updated?.assignedAccountant).toBe("Unassigned");
    expect(updated?.assignedAccountantUserId).toBeUndefined();
  });

  it("removes accountant from managed list and client assignments when role changes away from accountant", () => {
    const { result } = renderHook(() => usePortal(), { wrapper: PortalWrapper });
    const accountant = result.current.userAccounts.find((user) => user.role === "accountant");

    expect(accountant).toBeDefined();

    act(() => {
      const assignPrimary = result.current.assignClientAccountant(
        "firm-client-3",
        accountant!.name,
        accountant!.id,
      );
      const assignBackup = result.current.assignClientAccountantBackup(
        "firm-client-4",
        accountant!.name,
        accountant!.id,
      );
      expect(assignPrimary.ok).toBe(true);
      expect(assignBackup.ok).toBe(true);
    });

    act(() => {
      const roleUpdate = result.current.assignUserRole(accountant!.id, "client");
      expect(roleUpdate.ok).toBe(true);
    });

    expect(
      result.current.managedAccountants.some((member) => member.id === accountant!.id),
    ).toBe(false);

    const primaryClient = result.current.adminClients.find((client) => client.id === "firm-client-3");
    const backupClient = result.current.adminClients.find((client) => client.id === "firm-client-4");

    expect(primaryClient?.assignedAccountant).toBe("Unassigned");
    expect(primaryClient?.assignedAccountantUserId).toBeUndefined();
    expect(backupClient?.backupAccountant).toBeUndefined();
    expect(backupClient?.backupAccountantUserId).toBeUndefined();
  });
});
