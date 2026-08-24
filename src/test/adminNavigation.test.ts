import { navigationByRole } from "../utils/navigation";

describe("admin navigation", () => {
  it("exposes the full administration control surface", () => {
    const routes = navigationByRole.admin.map((item) => item.to);

    expect(routes).toContain("/firm/dashboard");
    expect(routes).toContain("/firm/admin/users");
    expect(routes).toContain("/firm/admin/roles");
    expect(routes).toContain("/firm/clients");
    expect(routes).toContain("/firm/admin/accountants");
    expect(routes).toContain("/firm/admin/assignments");
    expect(routes).toContain("/firm/admin/audit");
    expect(routes).toContain("/firm/admin/request-state-machine");
    expect(routes).toContain("/firm/admin/system-settings");
  });

  it("keeps management and configuration controls grouped as admin functions", () => {
    const managementLabels = navigationByRole.admin
      .filter((item) => item.section === "Management")
      .map((item) => item.label);
    const configurationLabels = navigationByRole.admin
      .filter((item) => item.section === "Configuration")
      .map((item) => item.label);

    expect(managementLabels).toEqual(
      expect.arrayContaining([
        "Users & Access",
        "Roles & Permissions",
        "Clients",
        "Accountants",
        "Assignments",
        "Audit & Security",
      ]),
    );
    expect(configurationLabels).toEqual(
      expect.arrayContaining(["Request SLA Rules", "System Settings"]),
    );
  });
});
