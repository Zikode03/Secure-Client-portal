// Friendly guide: this module (permissions.test) supports the Secure Client Portal workflow.
// The goal is clear, maintainable code so future edits feel safe and straightforward.

import { portalService } from "../services/portalData";
import type { DocumentRecord, SessionUser } from "../types/portal";
import {
  canAccessRoute,
  getScopedClients,
  getScopedDocuments,
} from "../utils/permissions";

const adminUser: SessionUser = {
  id: "user-admin-1",
  name: "Priya",
  fullName: "Priya Naidoo",
  email: "admin@example.com",
  role: "admin",
  title: "Operations Lead",
  company: "Finwell Advisory",
  initials: "PN",
  clientIds: [],
  assignedClientIds: [],
};

const accountantUser: SessionUser = {
  id: "user-accountant-1",
  name: "Daniel",
  fullName: "Daniel Mokoena",
  email: "accountant@example.com",
  role: "accountant",
  title: "Senior Accountant",
  company: "Finwell Advisory",
  initials: "DM",
  clientIds: [],
  assignedClientIds: ["client-apex", "firm-client-1", "firm-client-3", "firm-client-4"],
};

const clientUser: SessionUser = {
  id: "user-client-1",
  name: "Sarah",
  fullName: "Sarah Jacobs",
  email: "client@example.com",
  role: "client",
  title: "Finance Manager",
  company: "Apex Trading Ltd",
  initials: "SJ",
  clientIds: ["client-apex"],
  assignedClientIds: [],
};

describe("permission and scoping helpers", () => {
  const clients = portalService.getAdminClients();

  it("admin can see all clients", () => {
    expect(getScopedClients(adminUser, clients)).toHaveLength(clients.length);
  });

  it("accountant can only see assigned clients", () => {
    const scopedClients = getScopedClients(accountantUser, clients);
    const visibleNames = scopedClients.map((client) => client.clientName);

    expect(visibleNames).toEqual([
      "Apex Trading Ltd",
      "Cloud Nine Retail",
      "Coastal Auto Group",
    ]);
    expect(visibleNames).not.toContain("Blue Peak Logistics");
  });

  it("client can only see own business", () => {
    const scopedClients = getScopedClients(clientUser, clients);

    expect(scopedClients).toHaveLength(1);
    expect(scopedClients[0]?.clientName).toBe("Apex Trading Ltd");
  });

  it("accountant cannot see unassigned client documents", () => {
    const apexDocument = portalService.getDocumentById("doc-1001");
    const bluePeakDocument: DocumentRecord = {
      ...apexDocument,
      id: "doc-blue-peak",
      clientId: "firm-client-2",
      clientName: "Blue Peak Logistics",
      fileName: "BluePeak_Payroll_April_2026.pdf",
    };

    const scopedDocuments = getScopedDocuments(
      accountantUser,
      [apexDocument, bluePeakDocument],
      clients,
    );

    expect(scopedDocuments.map((document) => document.id)).toEqual([apexDocument.id]);
  });

  it("admin can access system settings while accountants cannot", () => {
    expect(canAccessRoute(adminUser, "/firm/admin/system-settings")).toBe(true);
    expect(canAccessRoute(accountantUser, "/firm/admin/system-settings")).toBe(false);
  });
});
