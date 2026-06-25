import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import { FairnessDashboard } from "@/components/synapse/fairness-dashboard";
import { useFairness } from "@/hooks/use-fairness";
import type { FairnessRow } from "@/lib/synapse/types";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/hooks/use-fairness", () => ({
  useFairness: vi.fn(),
}));

// FairnessDashboard fetches member names via supabase.from("members")
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MEMBER_A_ID = "member-fairness-a";
const MEMBER_B_ID = "member-fairness-b";
const MEMBER_C_ID = "member-fairness-c";

// under-served: fairness_term > 0.3
const underServedRow: FairnessRow = {
  id: "fr-1",
  member_id: MEMBER_A_ID,
  resource_class: "meeting_room",
  served_hours: 2,
  fair_share: 10,
  fairness_term: 2.5,
  updated_at: "2025-01-01T00:00:00Z",
  window_start: null,
  window_end: null,
};

// over-served: fairness_term < 0.05 AND served_hours > fair_share
const overServedRow: FairnessRow = {
  id: "fr-2",
  member_id: MEMBER_B_ID,
  resource_class: "meeting_room",
  served_hours: 20,
  fair_share: 10,
  fairness_term: 0.01,
  updated_at: "2025-01-01T00:00:00Z",
  window_start: null,
  window_end: null,
};

// balanced
const balancedRow: FairnessRow = {
  id: "fr-3",
  member_id: MEMBER_C_ID,
  resource_class: "computer_lab",
  served_hours: 10,
  fair_share: 10,
  fairness_term: 0.1,
  updated_at: "2025-01-01T00:00:00Z",
  window_start: null,
  window_end: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeChain(data: unknown[]) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = self;
  chain.eq = self;
  chain.order = self;
  chain.limit = self;
  chain.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
    Promise.resolve({ data, error: null }).then(resolve);
  return chain;
}

function mockFairness(rows: FairnessRow[], loading = false) {
  vi.mocked(useFairness).mockReturnValue({
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
  // Default: return member name map via from("members")
  mockFrom.mockReturnValue(
    makeChain([
      { id: MEMBER_A_ID, full_name: "Alice Under" },
      { id: MEMBER_B_ID, full_name: "Bob Over" },
      { id: MEMBER_C_ID, full_name: "Carol Balanced" },
    ]),
  );
  mockFairness([underServedRow, overServedRow, balancedRow]);
});

describe("FairnessDashboard", () => {
  it("a) shows loading state", () => {
    mockFairness([], true);
    render(<FairnessDashboard />);
    expect(screen.getByText(/loading fairness data/i)).toBeInTheDocument();
  });

  it("b) shows empty state message when no rows and not loading", () => {
    mockFairness([]);
    render(<FairnessDashboard />);
    expect(
      screen.getByText(/no fairness data yet/i),
    ).toBeInTheDocument();
  });

  it("c) renders served hours and fair share values for member rows", async () => {
    render(<FairnessDashboard />);
    await act(async () => {});

    // served_hours and fair_share rendered as toFixed(1)
    expect(screen.getByText("2.0")).toBeInTheDocument(); // underServedRow served
    // "10.0" appears multiple times (fair_share=10 for both underServed and balancedRow)
    expect(screen.getAllByText("10.0").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("20.0")).toBeInTheDocument(); // overServedRow served
  });

  it("d) renders gamma (fairness_term) values", async () => {
    render(<FairnessDashboard />);
    await act(async () => {});

    // fairness_term shown as toFixed(3)
    expect(screen.getByText("2.500")).toBeInTheDocument(); // underServed
    expect(screen.getByText("0.010")).toBeInTheDocument(); // overServed
    expect(screen.getByText("0.100")).toBeInTheDocument(); // balanced
  });

  it("e) under-served member gets 'Under-served' badge", async () => {
    render(<FairnessDashboard />);
    await act(async () => {});

    const badges = screen.getAllByText(/under-served/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("f) over-served member gets 'Over-served' badge", async () => {
    render(<FairnessDashboard />);
    await act(async () => {});

    const badges = screen.getAllByText(/over-served/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("g) balanced member gets 'Balanced' badge", async () => {
    render(<FairnessDashboard />);
    await act(async () => {});

    // "Balanced" badge appears — may also match "Carol Balanced" member name so use getAllByText
    const balancedMatches = screen.getAllByText(/balanced/i);
    // At least one should be the badge span
    const badgeEl = balancedMatches.find((el) => el.getAttribute("data-slot") === "badge");
    expect(badgeEl).toBeDefined();
  });

  it("h) rows grouped by resource_class — class header rendered", async () => {
    render(<FairnessDashboard />);
    await act(async () => {});

    // humanizeClass("meeting_room") => "Meeting Room"
    expect(screen.getByText(/meeting room/i)).toBeInTheDocument();
    // humanizeClass("computer_lab") => "Computer Lab"
    expect(screen.getByText(/computer lab/i)).toBeInTheDocument();
  });

  it("i) member names resolved from supabase members table", async () => {
    render(<FairnessDashboard />);
    await act(async () => {});

    expect(screen.getByText("Alice Under")).toBeInTheDocument();
    expect(screen.getByText("Bob Over")).toBeInTheDocument();
    expect(screen.getByText("Carol Balanced")).toBeInTheDocument();
  });

  it("j) empty/no-data state does not crash", () => {
    mockFairness([]);
    expect(() => render(<FairnessDashboard />)).not.toThrow();
  });
});
