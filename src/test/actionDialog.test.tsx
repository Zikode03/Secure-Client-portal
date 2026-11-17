import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useActionDialog } from "../components/ui/useActionDialog";
function Harness({ apply }: { apply: (value: string) => void }) {
  const dialog = useActionDialog();
  return <><button onClick={async () => { const result = await dialog.prompt("Delete the selected client?", "", { expected: "DELETE", destructive: true, confirmLabel: "Delete client" }); if (result) apply(result); }}>Delete</button>{dialog.dialog}</>;
}
it("cancels with Escape, restores focus and never performs a cancelled action", async () => {
  const apply=vi.fn();render(<Harness apply={apply} />);
  const trigger=screen.getByRole("button",{name:"Delete"});trigger.focus();fireEvent.click(trigger);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("dialog"),{key:"Escape"});
  await waitFor(()=>expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(apply).not.toHaveBeenCalled();expect(trigger).toHaveFocus();
});
it("requires the exact confirmation text before performing deletion", async () => {
  const apply=vi.fn();render(<Harness apply={apply} />);fireEvent.click(screen.getByRole("button",{name:"Delete"}));
  expect(screen.getByRole("button",{name:"Delete client"})).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Type DELETE to confirm"),{target:{value:"DELETE"}});
  fireEvent.click(screen.getByRole("button",{name:"Delete client"}));
  await waitFor(()=>expect(apply).toHaveBeenCalledWith("DELETE"));
});
