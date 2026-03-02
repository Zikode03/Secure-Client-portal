import crypto from "crypto";

function seededInt(seed, min, max) {
  const hash = crypto.createHash("sha256").update(seed).digest("hex");
  const value = parseInt(hash.slice(0, 8), 16);
  return min + (value % (max - min + 1));
}

function addDays(base, days) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export async function pullCsdState(client) {
  const now = new Date();
  const seed = `${client.id}:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}:csd`;

  const registrationDays = seededInt(`${seed}:registration`, -5, 40);
  const taxClearanceDays = seededInt(`${seed}:tax-clearance`, -10, 25);

  const obligations = [
    {
      source: "CSD",
      obligationType: "Supplier Registration Review",
      periodLabel: "Current review cycle",
      dueDate: addDays(now, registrationDays),
      status: registrationDays < 0 ? "overdue" : registrationDays <= 7 ? "due_soon" : "compliant",
    },
    {
      source: "CSD",
      obligationType: "CSD Tax Compliance Link",
      periodLabel: "Current tax linkage",
      dueDate: addDays(now, taxClearanceDays),
      status: taxClearanceDays < 0 ? "overdue" : taxClearanceDays <= 7 ? "due_soon" : "compliant",
    },
  ];

  const status = obligations.some((item) => item.status === "overdue")
    ? "red"
    : obligations.some((item) => item.status === "due_soon")
      ? "amber"
      : "green";

  return {
    source: "CSD",
    status,
    obligations,
    raw: {
      supplierState: obligations[0].status,
      taxComplianceState: obligations[1].status,
    },
    fetchedAt: now.toISOString(),
  };
}
