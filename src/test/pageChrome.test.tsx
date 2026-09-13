import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PageHeader } from "../components/ui/PageHeader";
import { PageSection } from "../components/ui/PageSection";
import { SurfaceCard } from "../components/ui/SurfaceCard";
import { Button } from "../components/ui/Button";

describe("shared page design", () => {
  it("renders a flat header with accessible, working actions", () => {
    const save = vi.fn();
    const { container } = render(<PageHeader title="Settings" eyebrow="Administration" description="Manage firm settings." actions={<><Button variant="secondary">Cancel</Button><Button onClick={save}>Save changes</Button></>} />);
    const header = container.querySelector("header")!;
    expect(header).toHaveClass("portal-page-header", "border-b");
    expect(header.className).not.toMatch(/rounded|shadow|bg-white/);
    expect(within(header).getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
    fireEvent.click(within(header).getByRole("button", { name: "Save changes" }));
    expect(save).toHaveBeenCalledOnce();
  });

  it("keeps flat form sections independent of cards used for dialogs and summaries", () => {
    render(<><PageSection aria-label="Profile" className="space-y-5" id="profile"><label>Name<input defaultValue="Example firm" /></label></PageSection><SurfaceCard aria-label="Summary">A distinct summary</SurfaceCard></>);
    const section = screen.getByRole("region", { name: "Profile" });
    expect(section).toHaveClass("portal-page-section", "space-y-5");
    expect(section.className).not.toMatch(/rounded|shadow|bg-white/);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Updated firm" } });
    expect(screen.getByDisplayValue("Updated firm")).toBeInTheDocument();
    expect(screen.getByLabelText("Summary").className).toMatch(/rounded/);
  });
});
