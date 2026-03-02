function countByStatus(obligations) {
  const counts = {
    compliant: 0,
    due_soon: 0,
    overdue: 0,
    non_compliant: 0,
  };
  for (const obligation of obligations) {
    const status = String(obligation.status || "compliant").toLowerCase();
    if (status === "compliant") counts.compliant += 1;
    else if (status === "due_soon") counts.due_soon += 1;
    else if (status === "overdue") counts.overdue += 1;
    else counts.non_compliant += 1;
  }
  return counts;
}

export function deriveSnapshot({ sarsState, cipcState, csdState }) {
  const obligations = [
    ...(Array.isArray(sarsState?.obligations) ? sarsState.obligations : []),
    ...(Array.isArray(cipcState?.obligations) ? cipcState.obligations : []),
    ...(Array.isArray(csdState?.obligations) ? csdState.obligations : []),
  ];
  const counts = countByStatus(obligations);
  const total = obligations.length || 1;
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(((counts.compliant + counts.due_soon * 0.5) / total) * 100)
    )
  );

  let overallStatus = "green";
  if (counts.overdue > 0 || counts.non_compliant > 0) overallStatus = "red";
  else if (counts.due_soon > 0) overallStatus = "amber";

  return {
    overallStatus,
    score,
    sarsStatus: String(sarsState?.tcsStatus || "green"),
    cipcStatus: String(cipcState?.status || "green"),
    csdStatus: String(csdState?.status || "green"),
    compliantCount: counts.compliant,
    nonCompliantCount: counts.non_compliant,
    overdueCount: counts.overdue,
    dueSoonCount: counts.due_soon,
    obligations,
  };
}

export function buildEvents({ client, obligations }) {
  const now = new Date().toISOString();
  const events = [];
  for (const item of obligations) {
    if (item.status === "overdue") {
      events.push({
        source: item.source,
        eventType: "status.non_compliant",
        severity: "high",
        title: `${item.obligationType} overdue`,
        description: `${client.name}: ${item.obligationType} is overdue.`,
        obligationRef: item.obligationType,
        occurredAt: now,
        payload: { dueDate: item.dueDate },
      });
    } else if (item.status === "due_soon") {
      events.push({
        source: item.source,
        eventType: "status.due_soon",
        severity: "medium",
        title: `${item.obligationType} due soon`,
        description: `${client.name}: ${item.obligationType} is due soon.`,
        obligationRef: item.obligationType,
        occurredAt: now,
        payload: { dueDate: item.dueDate },
      });
    }
  }
  return events;
}
