import { fireEvent, render, screen } from "@testing-library/react";
import { ClientComplianceCentrePage } from "../pages/client/ClientComplianceCentrePage";

describe("ClientComplianceCentrePage", () => {
  it("renders the compliance centre workspace", () => {
    render(<ClientComplianceCentrePage />);

    expect(screen.getByText("Compliance Centre")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Track compliance readiness, expiry risk, and audit activity across all regulated records.",
      ),
    ).toBeInTheDocument();
  });

  it("renders summary insight widgets", () => {
    render(<ClientComplianceCentrePage />);

    expect(screen.getAllByText("Compliance Score").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Expiring Soon").length).toBeGreaterThan(0);
    expect(screen.getByText("Missing Records")).toBeInTheDocument();
    expect(screen.getByText("Audit Activity")).toBeInTheDocument();
    expect(screen.getByText("Storage Health")).toBeInTheDocument();
  });

  it("shows expired documents as requiring a new version", () => {
    render(<ClientComplianceCentrePage />);

    expect(screen.getAllByText("Expired - new version required").length).toBeGreaterThan(0);
  });

  it("shows days remaining for expiring documents", () => {
    render(<ClientComplianceCentrePage />);

    expect(
      screen.getAllByText((content) => /days remaining|expires in/i.test(content)).length,
    ).toBeGreaterThan(0);
  });

  it("shows missing required documents as compliance blockers", () => {
    render(<ClientComplianceCentrePage />);

    expect(screen.getAllByText("Missing - required for compliance").length).toBeGreaterThan(0);
  });

  it("renders clean priority filters", () => {
    render(<ClientComplianceCentrePage />);

    expect(screen.getByRole("button", { name: "All priorities" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expired" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expiring" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Missing" })).toBeInTheDocument();
  });

  it("shows feedback when the compliance report is downloaded", () => {
    render(<ClientComplianceCentrePage />);

    fireEvent.click(screen.getByRole("button", { name: "Download compliance report" }));

    expect(screen.getByText("Compliance report ready")).toBeInTheDocument();
    expect(
      screen.getByText(
        /includes expiry queues, missing records, audit activity, and the current readiness summary/i,
      ),
    ).toBeInTheDocument();
  });

  it("lets the user dismiss feedback", () => {
    render(<ClientComplianceCentrePage />);

    fireEvent.click(screen.getByRole("button", { name: "Secure storage" }));

    expect(screen.getByText("Secure storage active")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByText("Secure storage active")).not.toBeInTheDocument();
  });

  it("renders the compliance report preview", () => {
    render(<ClientComplianceCentrePage />);

    expect(screen.getByText("Compliance Report")).toBeInTheDocument();
    expect(screen.getByText("Monthly Compliance Summary")).toBeInTheDocument();
    expect(screen.getByText("Audit Readiness")).toBeInTheDocument();
  });
});
