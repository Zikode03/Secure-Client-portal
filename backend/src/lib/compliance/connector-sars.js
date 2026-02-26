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

export async function pullSarsState(client) {
  const now = new Date();
  const seed = `${client.id}:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;
  const risk = seededInt(seed, 0, 100);
  const vatDays = seededInt(`${seed}:vat`, -14, 20);
  const payeDays = seededInt(`${seed}:paye`, -10, 18);
  const itDays = seededInt(`${seed}:it`, -25, 35);

  const obligations = [
    {
      source: "SARS",
      obligationType: "VAT Return",
      periodLabel: "Current VAT period",
      dueDate: addDays(now, vatDays),
      status: vatDays < 0 ? "overdue" : vatDays <= 5 ? "due_soon" : "compliant",
    },
    {
      source: "SARS",
      obligationType: "PAYE",
      periodLabel: "Current PAYE cycle",
      dueDate: addDays(now, payeDays),
      status: payeDays < 0 ? "overdue" : payeDays <= 5 ? "due_soon" : "compliant",
    },
    {
      source: "SARS",
      obligationType: "Income Tax",
      periodLabel: "Current filing window",
      dueDate: addDays(now, itDays),
      status: itDays < 0 ? "overdue" : itDays <= 5 ? "due_soon" : "compliant",
    },
  ];

  const tcsStatus = risk < 75 ? "green" : "red";

  return {
    source: "SARS",
    tcsStatus,
    obligations,
    raw: {
      riskScore: risk,
      paymentsCurrent: risk < 80,
    },
    fetchedAt: now.toISOString(),
  };
}
