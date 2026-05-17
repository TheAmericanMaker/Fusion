import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DuplicateWarningModal } from "../DuplicateWarningModal";
import type { DuplicateMatch } from "../../api";

const matches: DuplicateMatch[] = [
  { id: "FN-101", title: "Fix duplicate task flow", description: "...", column: "todo", score: 0.81 },
  { id: "FN-102", title: "Another duplicate", description: "...", column: "in-progress", score: 0.67 },
];

describe("DuplicateWarningModal", () => {
  it("renders one row per match with id and title", () => {
    render(<DuplicateWarningModal matches={matches} onOpen={vi.fn()} onProceed={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText("FN-101")).toBeInTheDocument();
    expect(screen.getByText("FN-102")).toBeInTheDocument();
    expect(screen.getByText("Fix duplicate task flow")).toBeInTheDocument();
    expect(screen.getByText("Another duplicate")).toBeInTheDocument();
  });

  it("calls onOpen with the selected id", () => {
    const onOpen = vi.fn();
    render(<DuplicateWarningModal matches={matches} onOpen={onOpen} onProceed={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Open" })[1]);
    expect(onOpen).toHaveBeenCalledWith("FN-102");
  });

  it("calls onProceed", () => {
    const onProceed = vi.fn();
    render(<DuplicateWarningModal matches={matches} onOpen={vi.fn()} onProceed={onProceed} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Create anyway" }));
    expect(onProceed).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel for cancel click and Escape", () => {
    const onCancel = vi.fn();
    render(<DuplicateWarningModal matches={matches} onOpen={vi.fn()} onProceed={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
