import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { VerificationCodeInput } from "../components/auth/VerificationCodeInput";
function Harness() {
  const [value, setValue] = useState("");
  return (
    <>
      <VerificationCodeInput value={value} onChange={setValue} />
      <output data-testid="code">{value}</output>
    </>
  );
}
it("renders six separate boxes and advances focus as digits are typed", () => {
  render(<Harness />);
  const boxes = screen.getAllByRole("textbox");
  expect(boxes).toHaveLength(6);
  expect(boxes[0]).toHaveFocus();
  fireEvent.change(boxes[0], { target: { value: "0" } });
  expect(boxes[0]).toHaveValue("0");
  expect(boxes[1]).toHaveFocus();
  fireEvent.change(boxes[1], { target: { value: "7" } });
  expect(boxes[2]).toHaveFocus();
});
it("pastes an entire code with leading zeros and ignores separators", () => {
  render(<Harness />);
  const boxes = screen.getAllByRole("textbox");
  fireEvent.paste(boxes[0], { clipboardData: { getData: () => "012 345" } });
  expect(boxes.map((b) => (b as HTMLInputElement).value).join("")).toBe(
    "012345",
  );
  expect(boxes[5]).toHaveFocus();
});
it("supports backspace and arrows without shifting digits into other boxes", () => {
  render(<Harness />);
  const boxes = screen.getAllByRole("textbox");
  fireEvent.change(boxes[0], { target: { value: "123456" } });
  fireEvent.keyDown(boxes[3], { key: "Backspace" });
  expect(boxes[3]).toHaveValue("");
  expect(boxes[4]).toHaveValue("5");
  fireEvent.keyDown(boxes[3], { key: "Backspace" });
  expect(boxes[2]).toHaveValue("");
  expect(boxes[2]).toHaveFocus();
  fireEvent.keyDown(boxes[2], { key: "ArrowLeft" });
  expect(boxes[1]).toHaveFocus();
  fireEvent.keyDown(boxes[1], { key: "ArrowRight" });
  expect(boxes[2]).toHaveFocus();
});
it("ignores non-digit input and disables every box while verification is pending", () => {
  const change = vi.fn();
  const { rerender } = render(
    <VerificationCodeInput value="" onChange={change} />,
  );
  fireEvent.change(screen.getAllByRole("textbox")[0], {
    target: { value: "letters" },
  });
  expect(change).not.toHaveBeenCalled();
  rerender(<VerificationCodeInput value="" onChange={change} disabled />);
  for (const box of screen.getAllByRole("textbox")) expect(box).toBeDisabled();
});
