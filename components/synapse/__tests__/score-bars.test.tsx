import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreBars } from "@/components/synapse/score-bars";
import { makeScoreComponents } from "@/test/utils";

describe("ScoreBars", () => {
  it("renders 5 labelled bars", () => {
    render(<ScoreBars components={makeScoreComponents()} />);
    expect(screen.getByText("Urgency")).toBeInTheDocument();
    expect(screen.getByText(/Role weight/i)).toBeInTheDocument();
    expect(screen.getByText(/Fairness deficit/i)).toBeInTheDocument();
    // Recency penalty has "−" appended via span
    expect(screen.getByText(/Recency penalty/i)).toBeInTheDocument();
    expect(screen.getByText(/Academic purpose/i)).toBeInTheDocument();
  });

  it("recency penalty renders with '−' suffix and amber styling", () => {
    render(<ScoreBars components={makeScoreComponents()} />);
    const penaltyEl = screen.getByText(/Recency penalty/);
    // The deduction label is inside a span with amber styling
    expect(penaltyEl.closest("span")).toHaveClass("text-amber-500");
    expect(penaltyEl.textContent).toContain("−");
  });

  it("renders 0% bar without crashing when a value is 0", () => {
    const components = makeScoreComponents({ urgency: 0 });
    expect(() => render(<ScoreBars components={components} />)).not.toThrow();
    // Should show 0.00 for urgency
    expect(screen.getAllByText("0.00").length).toBeGreaterThan(0);
  });

  it("does not crash with a >1 value (clamps to 100%)", () => {
    const components = makeScoreComponents({ urgency: 1.5, role_weight: 2.0 });
    expect(() => render(<ScoreBars components={components} />)).not.toThrow();
  });

  it("does not crash when a key value is null/undefined (cast as any)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const components = makeScoreComponents({ urgency: null as any, recency_penalty: undefined as any });
    expect(() => render(<ScoreBars components={components} />)).not.toThrow();
    // Should show 0.00 for null/undefined values
    expect(screen.getAllByText("0.00").length).toBeGreaterThan(0);
  });
});
