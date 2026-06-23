import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { AuditViewer } from "@/components/synapse/audit-viewer";
import { useAuditLog } from "@/hooks/use-audit-log";
import type { AuditRow } from "@/lib/synapse/types";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/hooks/use-audit-log", () => ({
  useAuditLog: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fullExplainer = {
  status: "confirmed",
  winner: {
    member_id: "member-audit-w",
    name: "Winner Alice",
    role: "phd_student",
    score: 0.91,
    components: {
      urgency: 0.8,
      role_weight: 0.6,
      fairness_deficit: 0.4,
      recency_penalty: 0.1,
      academic_purpose: 0.7,
    },
  },
  contenders: [
    {
      member_id: "member-audit-c",
      name: "Contender Bob",
      role: "student",
      score: 0.55,
      components: {
        urgency: 0.4,
        role_weight: 0.3,
        fairness_deficit: 0.2,
        recency_penalty: 0.05,
        academic_purpose: 0.3,
      },
    },
  ],
  counterfactuals: [],
};

const minimalExplainer = {
  status: "confirmed",
  // winner present but no components
  winner: {
    member_id: "member-audit-m",
    name: "Minimal Winner",
    role: "student",
    score: 0.75,
    // components intentionally absent
  },
  contenders: [],
  counterfactuals: [],
};

const fullRow: AuditRow = {
  id: "audit-1",
  kind: "booking_confirmed",
  actor_id: "actor-abc12345",
  resource_id: "res-def12345",
  booking_id: "booking-ghi12345",
  occurred_at: "2026-06-20T10:00:00Z",
  decision_explainer: fullExplainer as unknown as AuditRow["decision_explainer"],
  payload: { foo: "bar" } as unknown as AuditRow["payload"],
  request_id: null,
};

const minimalRow: AuditRow = {
  id: "audit-2",
  kind: "booking_cancelled",
  actor_id: "actor-xyz12345",
  resource_id: null,
  booking_id: null,
  occurred_at: "2026-06-19T09:00:00Z",
  decision_explainer: minimalExplainer as unknown as AuditRow["decision_explainer"],
  payload: null as unknown as AuditRow["payload"],
  request_id: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockAuditLog(rows: AuditRow[], loading = false) {
  vi.mocked(useAuditLog).mockReturnValue({
    rows,
    loading,
    refetch: vi.fn(),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockAuditLog([fullRow, minimalRow]);
});

describe("AuditViewer", () => {
  it("a) shows loading state", () => {
    mockAuditLog([], true);
    render(<AuditViewer />);
    expect(screen.getByText(/loading audit log/i)).toBeInTheDocument();
  });

  it("b) shows empty state when no rows", () => {
    mockAuditLog([]);
    render(<AuditViewer />);
    expect(screen.getByText(/no audit entries yet/i)).toBeInTheDocument();
  });

  it("c) renders audit rows with kind badges", () => {
    render(<AuditViewer />);
    // humanizeKind("booking_confirmed") => "Booking Confirmed"
    expect(screen.getByText("Booking Confirmed")).toBeInTheDocument();
    // humanizeKind("booking_cancelled") => "Booking Cancelled"
    expect(screen.getByText("Booking Cancelled")).toBeInTheDocument();
  });

  it("d) rows appear in reverse-chronological order (most recent first)", () => {
    render(<AuditViewer />);
    const badges = screen.getAllByText(/booking confirmed|booking cancelled/i);
    // fullRow (Jun 20) should come before minimalRow (Jun 19)
    expect(badges[0].textContent).toMatch(/booking confirmed/i);
    expect(badges[1].textContent).toMatch(/booking cancelled/i);
  });

  it("e) actor and resource IDs are sliced to 8 chars in cells", () => {
    render(<AuditViewer />);
    expect(screen.getByText("actor-ab")).toBeInTheDocument(); // actor-abc12345.slice(0,8)
    expect(screen.getByText("res-def1")).toBeInTheDocument(); // res-def12345.slice(0,8)
  });

  it("f) expanding a full row reveals the decision explainer and payload JSON", async () => {
    render(<AuditViewer />);
    const user = userEvent.setup();

    // Click the expand button for the first (full) row
    const expandBtns = screen.getAllByRole("button", { name: /expand/i });
    await user.click(expandBtns[0]);
    await act(async () => {});

    // Winner name visible
    expect(screen.getByText(/winner alice/i)).toBeInTheDocument();
    // Status rendered in explainer — "Decision explainer — status: confirmed"
    expect(screen.getByText(/decision explainer/i)).toBeInTheDocument();
    // ScoreBars labels (may appear multiple times — winner + contender each have bars)
    expect(screen.getAllByText("Urgency").length).toBeGreaterThan(0);
    // Payload JSON rendered
    expect(screen.getByText(/"foo"/)).toBeInTheDocument();
  });

  it("g) expanding a full row reveals contender name", async () => {
    render(<AuditViewer />);
    const user = userEvent.setup();

    const expandBtns = screen.getAllByRole("button", { name: /expand/i });
    await user.click(expandBtns[0]);
    await act(async () => {});

    expect(screen.getByText(/contender bob/i)).toBeInTheDocument();
  });

  it("h) Fix A: expanding the minimal-winner row (no components) does NOT crash", async () => {
    render(<AuditViewer />);
    const user = userEvent.setup();

    // Expand second row (minimalRow)
    const expandBtns = screen.getAllByRole("button", { name: /expand/i });
    await user.click(expandBtns[1]);
    await act(async () => {});

    // Row should expand and show the winner name without crashing
    expect(screen.getByText(/minimal winner/i)).toBeInTheDocument();
  });

  it("i) collapsing a row hides the explainer again", async () => {
    render(<AuditViewer />);
    const user = userEvent.setup();

    const expandBtns = screen.getAllByRole("button", { name: /expand/i });
    await user.click(expandBtns[0]);
    await act(async () => {});

    // Winner Alice visible
    expect(screen.getByText(/winner alice/i)).toBeInTheDocument();

    // Collapse
    const collapseBtn = screen.getByRole("button", { name: /collapse/i });
    await user.click(collapseBtn);
    await act(async () => {});

    // Winner Alice should be hidden
    expect(screen.queryByText(/winner alice/i)).not.toBeInTheDocument();
  });
});
