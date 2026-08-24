import { formatMonthlyPackStatus, formatRequestStatus, formatStatusLabel } from "../utils/formatters";

describe("workflow terminology", () => {
  it("presents request states in business language", () => {
    expect(formatRequestStatus("awaiting_client")).toBe("Waiting for client");
    expect(formatRequestStatus("client_replied")).toBe("Client responded");
    expect(formatRequestStatus("awaiting_accountant")).toBe("Waiting for accountant");
    expect(formatRequestStatus("resolved")).toBe("Resolved");
  });

  it("presents document review states consistently", () => {
    expect(formatStatusLabel("under_review")).toBe("Under review");
    expect(formatStatusLabel("reupload_required")).toBe("Changes required");
    expect(formatStatusLabel("rejected")).toBe("Changes required");
    expect(formatStatusLabel("filed")).toBe("Filed");
  });

  it("presents monthly pack states consistently", () => {
    expect(formatMonthlyPackStatus("not_started")).toBe("Not started");
    expect(formatMonthlyPackStatus("in_progress")).toBe("In progress");
    expect(formatMonthlyPackStatus("under_accountant_review")).toBe("With accountant");
    expect(formatMonthlyPackStatus("complete")).toBe("Complete");
  });
});
