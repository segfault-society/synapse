import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { DecisionModal } from "@/components/synapse/decision-modal";
import { makeExplainer, makeScoreComponents } from "@/test/utils";
import type { Decision } from "@/lib/synapse/types";

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

function renderModal(
  decision: Decision | null,
  open = true,
  onClose = vi.fn(),
) {
  return render(<DecisionModal decision={decision} open={open} onClose={onClose} />);
}

describe("DecisionModal", () => {
  it("a) renders nothing when decision is null", () => {
    const { container } = renderModal(null);
    expect(container).toBeEmptyDOMElement();
  });

  it("b) confirmed status shows 'Confirmed' (not 'Confirmed by priority')", () => {
    const decision: Decision = { status: "confirmed", booking_id: "b-1" };
    renderModal(decision);
    // The title text is in the dialog header
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.queryByText("Confirmed by priority")).not.toBeInTheDocument();
  });

  it("c) confirmed_by_priority status shows 'Confirmed by priority'", () => {
    const decision: Decision = { status: "confirmed_by_priority", booking_id: "b-2" };
    renderModal(decision);
    expect(screen.getByText("Confirmed by priority")).toBeInTheDocument();
  });

  it("d) waitlisted with rank=3 shows 'rank 3'", () => {
    const decision: Decision = { status: "waitlisted", rank: 3 };
    renderModal(decision);
    // Scope to the dialog heading so partial DOM text elsewhere does not give a
    // false positive (e.g. a counterfactual label that happens to mention rank 3).
    const heading = screen.getByRole("heading");
    expect(heading.textContent).toMatch(/rank 3/i);
  });

  it("e) rejected with reason shows reason text", () => {
    const decision: Decision = { status: "rejected", reason: "No capacity" };
    renderModal(decision);
    expect(screen.getByText("No capacity")).toBeInTheDocument();
  });

  it("f) renders winner name + score, contenders, and counterfactual label+score", () => {
    const explainer = makeExplainer({
      winner: {
        member_id: "w-1",
        name: "Alice Winner",
        role: "student",
        score: 0.92,
        components: makeScoreComponents(),
      },
      contenders: [
        {
          member_id: "c-1",
          name: "Bob Contender",
          role: "lecturer",
          score: 0.55,
          components: makeScoreComponents(),
        },
      ],
      counterfactuals: [
        { kind: "swap", label: "If time was later", score: 0.78 },
      ],
    });
    const decision: Decision = { status: "confirmed", explainer };
    renderModal(decision);
    // Winner name
    expect(screen.getByText("Alice Winner")).toBeInTheDocument();
    // Winner score (displayed as 0.920)
    expect(screen.getByText("0.920")).toBeInTheDocument();
    // Contender name
    expect(screen.getByText("Bob Contender")).toBeInTheDocument();
    // Counterfactual label
    expect(screen.getByText("If time was later")).toBeInTheDocument();
    // Counterfactual score
    expect(screen.getByText("0.780")).toBeInTheDocument();
  });

  it("g) CRASH SAFETY: waitlisted decision with explainer having contenders/counterfactuals=undefined", () => {
    const explainer = makeExplainer({
      status: "waitlisted",
      contenders: undefined as unknown as never[],
      counterfactuals: undefined as unknown as never[],
    });
    const decision: Decision = { status: "waitlisted", rank: 1, explainer };
    expect(() => renderModal(decision)).not.toThrow();
    expect(screen.getByRole("heading").textContent).toMatch(/waitlisted/i);
  });

  it("h) CRASH SAFETY: rejected decision with no explainer", () => {
    const decision: Decision = { status: "rejected", reason: "Capacity full" };
    expect(() => renderModal(decision)).not.toThrow();
    expect(screen.getByText("Capacity full")).toBeInTheDocument();
  });

  it("i) clicking Close button calls onClose", async () => {
    const onClose = vi.fn();
    const decision: Decision = { status: "confirmed" };
    renderModal(decision, true, onClose);
    const user = userEvent.setup();
    // DialogContent has an X close button (sr-only "Close") AND our explicit "Close" button.
    // Target the explicit "Close" button in DialogFooter by its visible text.
    const closeBtns = screen.getAllByRole("button", { name: /close/i });
    // The footer Close button is the one with visible text (no svg child).
    const footerCloseBtn = closeBtns.find(
      (btn) => btn.textContent?.trim() === "Close",
    );
    expect(footerCloseBtn).toBeDefined();
    await user.click(footerCloseBtn!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
