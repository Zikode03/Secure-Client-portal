-- CreateTable
CREATE TABLE "ComplianceAccount" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "credentialsMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceObligation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "obligationType" TEXT NOT NULL,
    "periodLabel" TEXT,
    "dueDate" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "amountDue" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceStatusSnapshot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "overallStatus" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "sarsStatus" TEXT NOT NULL,
    "cipcStatus" TEXT NOT NULL,
    "compliantCount" INTEGER NOT NULL,
    "nonCompliantCount" INTEGER NOT NULL,
    "overdueCount" INTEGER NOT NULL,
    "dueSoonCount" INTEGER NOT NULL,
    "sourceTimestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceStatusSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceEvent" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "obligationRef" TEXT,
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceAlert" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "obligationType" TEXT,
    "assignedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "ComplianceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceAuditLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComplianceAccount_clientId_source_idx" ON "ComplianceAccount"("clientId", "source");

-- CreateIndex
CREATE INDEX "ComplianceObligation_clientId_source_obligationType_idx" ON "ComplianceObligation"("clientId", "source", "obligationType");

-- CreateIndex
CREATE INDEX "ComplianceObligation_clientId_status_idx" ON "ComplianceObligation"("clientId", "status");

-- CreateIndex
CREATE INDEX "ComplianceStatusSnapshot_clientId_createdAt_idx" ON "ComplianceStatusSnapshot"("clientId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ComplianceEvent_clientId_occurredAt_idx" ON "ComplianceEvent"("clientId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "ComplianceAlert_clientId_status_createdAt_idx" ON "ComplianceAlert"("clientId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ComplianceAuditLog_clientId_createdAt_idx" ON "ComplianceAuditLog"("clientId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ComplianceAccount" ADD CONSTRAINT "ComplianceAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceObligation" ADD CONSTRAINT "ComplianceObligation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceStatusSnapshot" ADD CONSTRAINT "ComplianceStatusSnapshot_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceEvent" ADD CONSTRAINT "ComplianceEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceAlert" ADD CONSTRAINT "ComplianceAlert_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceAuditLog" ADD CONSTRAINT "ComplianceAuditLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
