import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function nowIso() {
  return new Date().toISOString();
}

async function main() {
  await prisma.audit.deleteMany();
  await prisma.loginActivity.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.task.deleteMany();
  await prisma.request.deleteMany();
  await prisma.message.deleteMany();
  await prisma.session.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      {
        id: "u_acc_1",
        fullName: "Sarah Johnson",
        email: "accountant@prospera.com",
        passwordHash: sha256("Password123!"),
        role: "accountant",
        clientIds: ["c_1001", "c_1002", "c_1003"],
        profile: { firstName: "Sarah", lastName: "Johnson", phone: "+1 (555) 101-1001" },
        security: {
          twoFactorEnabled: true,
          smsEnabled: false,
          backupCodesGeneratedAt: null,
          passwordUpdatedAt: nowIso(),
        },
      },
      {
        id: "u_client_1",
        fullName: "Jane Doe",
        email: "jane@acmecorp.com",
        passwordHash: sha256("Password123!"),
        role: "client",
        clientIds: ["c_1001"],
        profile: { firstName: "Jane", lastName: "Doe", phone: "+1 (555) 222-1234" },
        security: {
          twoFactorEnabled: true,
          smsEnabled: true,
          backupCodesGeneratedAt: null,
          passwordUpdatedAt: nowIso(),
        },
      },
      {
        id: "u_client_2",
        fullName: "Mark Smith",
        email: "mark@velocityretail.io",
        passwordHash: sha256("Password123!"),
        role: "client",
        clientIds: ["c_1002"],
        profile: { firstName: "Mark", lastName: "Smith", phone: "+1 (555) 333-1234" },
        security: {
          twoFactorEnabled: false,
          smsEnabled: false,
          backupCodesGeneratedAt: null,
          passwordUpdatedAt: nowIso(),
        },
      },
    ],
  });

  await prisma.client.createMany({
    data: [
      {
        id: "c_1001",
        name: "Acme Corp",
        entityType: "S-Corp",
        status: "active",
        complianceHealth: 92,
        assignedAccountantId: "u_acc_1",
        primaryContact: "Jane Doe",
        email: "finance@acmecorp.com",
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
      },
    ],
  });

  await prisma.message.create({
    data: {
      id: "m_1",
      clientId: "c_1001",
      fromUserId: "u_client_1",
      toRole: "accountant",
      body: "Hi Sarah, I uploaded Q4 statements.",
      deliveryStatus: "delivered",
      readBy: [],
    },
  });

  await prisma.request.createMany({
    data: [
      {
        id: "r_1",
        clientId: "c_1001",
        title: "Bank Statements",
        description: "Please upload your bank statements for February 2026",
        priority: "high",
        status: "pending",
        dueDate: new Date("2026-02-28"),
        requestedByUserId: "u_acc_1",
        history: [{ at: nowIso(), byUserId: "u_acc_1", action: "created", note: "Initial request created." }],
      },
      {
        id: "r_2",
        clientId: "c_1001",
        title: "Invoices",
        description: "Please upload all invoices for January 2026",
        priority: "medium",
        status: "pending",
        dueDate: new Date("2026-03-05"),
        requestedByUserId: "u_acc_1",
        history: [{ at: nowIso(), byUserId: "u_acc_1", action: "created", note: "Initial request created." }],
      },
    ],
  });

  await prisma.task.create({
    data: {
      id: "t_1",
      clientId: "c_1001",
      title: "Review VAT return Q4",
      status: "pending",
      dueDate: new Date("2026-03-05"),
      priority: "high",
      createdBy: "u_acc_1",
    },
  });

  await prisma.document.create({
    data: {
      id: "d_1",
      clientId: "c_1001",
      name: "Tax Return 2025.pdf",
      category: "Tax Documents",
      status: "in-review",
      sizeBytes: 2_400_000,
      key: null,
      uploadedBy: "u_client_1",
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        id: "n_1",
        userId: "u_acc_1",
        type: "document_uploaded",
        title: "New document uploaded",
        message: "Acme Corp uploaded a document for review.",
        read: false,
      },
      {
        id: "n_2",
        userId: "u_client_1",
        type: "document_request",
        title: "Document request",
        message: "Please upload your February statements.",
        read: false,
      },
    ],
  });

  await prisma.loginActivity.createMany({
    data: [
      {
        id: "la_1",
        userId: "u_client_1",
        device: "Chrome on Windows",
        location: "New York",
        ipAddress: "192.168.1.45",
      },
      {
        id: "la_2",
        userId: "u_acc_1",
        device: "Chrome on macOS",
        location: "Johannesburg",
        ipAddress: "102.132.140.xxx",
      },
    ],
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

