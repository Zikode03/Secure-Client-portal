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

export async function pullCipcState(client) {
  const now = new Date();
  const seed = `${client.id}:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}:cipc`;
  const arDays = seededInt(`${seed}:ar`, -20, 30);
  const boDays = seededInt(`${seed}:bo`, -8, 22);

  const obligations = [
    {
      source: "CIPC",
      obligationType: "Annual Return",
      periodLabel: "Current annual cycle",
      dueDate: addDays(now, arDays),
      status: arDays < 0 ? "overdue" : arDays <= 7 ? "due_soon" : "compliant",
    },
    {
      source: "CIPC",
      obligationType: "Beneficial Ownership",
      periodLabel: "Current BO cycle",
      dueDate: addDays(now, boDays),
      status: boDays < 0 ? "overdue" : boDays <= 7 ? "due_soon" : "compliant",
    },
  ];

  const health = obligations.some((item) => item.status === "overdue") ? "red" : "green";

  return {
    source: "CIPC",
    status: health,
    obligations,
    raw: {
      annualReturnState: obligations[0].status,
      beneficialOwnershipState: obligations[1].status,
    },
    fetchedAt: now.toISOString(),
  };
}
