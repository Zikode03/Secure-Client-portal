import crypto from "crypto";

function nowIso() {
  return new Date().toISOString();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export const store = {
  users: [
    {
      id: "u_acc_1",
      fullName: "Sarah Johnson",
      email: "accountant@prospera.com",
      passwordHash: sha256("Password123!"),
      role: "accountant",
      clientIds: ["c_1001", "c_1002", "c_1003"],
      profile: {
        firstName: "Sarah",
        lastName: "Johnson",
        phone: "+1 (555) 101-1001",
      },
      security: {
        twoFactorEnabled: true,
        smsEnabled: false,
        backupCodesGeneratedAt: null,
        passwordUpdatedAt: nowIso(),
      },
      createdAt: nowIso(),
    },
    {
      id: "u_client_1",
      fullName: "Jane Doe",
      email: "jane@acmecorp.com",
      passwordHash: sha256("Password123!"),
      role: "client",
      clientIds: ["c_1001"],
      profile: {
        firstName: "Jane",
        lastName: "Doe",
        phone: "+1 (555) 222-1234",
      },
      security: {
        twoFactorEnabled: true,
        smsEnabled: true,
        backupCodesGeneratedAt: null,
        passwordUpdatedAt: nowIso(),
      },
      createdAt: nowIso(),
    },
    {
      id: "u_client_2",
      fullName: "Mark Smith",
      email: "mark@velocityretail.io",
      passwordHash: sha256("Password123!"),
      role: "client",
      clientIds: ["c_1002"],
      profile: {
        firstName: "Mark",
        lastName: "Smith",
        phone: "+1 (555) 333-1234",
      },
      security: {
        twoFactorEnabled: false,
        smsEnabled: false,
        backupCodesGeneratedAt: null,
        passwordUpdatedAt: nowIso(),
      },
      createdAt: nowIso(),
    },
  ],
  sessions: new Map(),
  clients: [
    {
      id: "c_1001",
      name: "Acme Corp",
      entityType: "S-Corp",
      status: "active",
      complianceHealth: 92,
      assignedAccountantId: "u_acc_1",
      primaryContact: "Jane Doe",
      email: "finance@acmecorp.com",
      createdAt: nowIso(),
    },
    {
      id: "c_1002",
      name: "Velocity Retail Group",
      entityType: "LLC",
      status: "pending",
      complianceHealth: 45,
      assignedAccountantId: "u_acc_1",
      primaryContact: "Mark Smith",
      email: "ops@velocityretail.io",
      createdAt: nowIso(),
    },
    {
      id: "c_1003",
      name: "Sunrise Trading",
      entityType: "Ltd",
      status: "active",
      complianceHealth: 81,
      assignedAccountantId: "u_acc_1",
      primaryContact: "Tina James",
      email: "accounts@sunrisetrading.com",
      createdAt: nowIso(),
    },
  ],
  messages: [
    {
      id: "m_1",
      clientId: "c_1001",
      fromUserId: "u_client_1",
      toRole: "accountant",
      body: "Hi Sarah, I uploaded Q4 statements.",
      deliveryStatus: "delivered",
      readBy: [],
      createdAt: nowIso(),
    },
  ],
  requests: [
    {
      id: "r_1",
      clientId: "c_1001",
      title: "Bank Statements",
      description: "Please upload your bank statements for February 2026",
      priority: "high",
      status: "pending",
      dueDate: "2026-02-28",
      requestedByUserId: "u_acc_1",
      requestedAt: nowIso(),
      history: [
        {
          at: nowIso(),
          byUserId: "u_acc_1",
          action: "created",
          note: "Initial request created.",
        },
      ],
    },
    {
      id: "r_2",
      clientId: "c_1001",
      title: "Invoices",
      description: "Please upload all invoices for January 2026",
      priority: "medium",
      status: "pending",
      dueDate: "2026-03-05",
      requestedByUserId: "u_acc_1",
      requestedAt: nowIso(),
      history: [
        {
          at: nowIso(),
          byUserId: "u_acc_1",
          action: "created",
          note: "Initial request created.",
        },
      ],
    },
  ],
  tasks: [
    {
      id: "t_1",
      clientId: "c_1001",
      title: "Review VAT return Q4",
      status: "pending",
      dueDate: "2026-03-05",
      priority: "high",
      createdBy: "u_acc_1",
      createdAt: nowIso(),
    },
  ],
  documents: [
    {
      id: "d_1",
      clientId: "c_1001",
      name: "Tax Return 2025.pdf",
      category: "Tax Documents",
      status: "in-review",
      sizeBytes: 2400000,
      key: null,
      uploadedBy: "u_client_1",
      uploadedAt: nowIso(),
    },
  ],
  notifications: [
    {
      id: "n_1",
      userId: "u_acc_1",
      type: "document_uploaded",
      title: "New document uploaded",
      message: "Acme Corp uploaded a document for review.",
      read: false,
      createdAt: nowIso(),
    },
    {
      id: "n_2",
      userId: "u_client_1",
      type: "document_request",
      title: "Document request",
      message: "Please upload your February statements.",
      read: false,
      createdAt: nowIso(),
    },
  ],
  loginActivities: [
    {
      id: "la_1",
      userId: "u_client_1",
      device: "Chrome on Windows",
      location: "New York",
      ipAddress: "192.168.1.45",
      createdAt: nowIso(),
    },
    {
      id: "la_2",
      userId: "u_acc_1",
      device: "Chrome on macOS",
      location: "Johannesburg",
      ipAddress: "102.132.140.xxx",
      createdAt: nowIso(),
    },
  ],
  audits: [],
  uploadSessions: new Map(),
};

export const utils = {
  sha256,
  nowIso,
  makeId(prefix) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  },
};
