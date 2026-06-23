import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { DemoControlRoom } from "@/components/synapse/demo-control-room";
import { useResources } from "@/hooks/use-resources";
import { usePersonaStore } from "@/lib/store/persona-store";
import { makeMember, makeResource, makeScoreComponents } from "@/test/utils";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/hooks/use-resources", () => ({
  useResources: vi.fn(),
}));

vi.mock("@/lib/store/persona-store", () => ({
  usePersonaStore: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockRpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ rpc: mockRpc }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Personas — include DEFAULT_NAMES: Sarah, Mihir, Dr. Perera
const sarah = makeMember({ id: "member-sarah", full_name: "Sarah Chen", role: "student" });
const mihir = makeMember({ id: "member-mihir", full_name: "Mihir Patel", role: "student" });
const drPerera = makeMember({ id: "member-perera", full_name: "Dr. Perera", role: "faculty" });
const otherPerson = makeMember({ id: "member-other", full_name: "Other Person", role: "student" });

const personas = [sarah, mihir, drPerera, otherPerson];

const resource1 = makeResource({ id: "res-demo-1", name: "Simulation Lab" });
const resource2 = makeResource({ id: "res-demo-2", name: "Conference Room" });

const simulationResult = {
  status: "confirmed",
  winner: {
    member_id: sarah.id,
    name: sarah.full_name,
    role: "student",
    score: 0.88,
    components: makeScoreComponents(),
  },
  contenders: [
    {
      member_id: mihir.id,
      name: mihir.full_name,
      role: "student",
      score: 0.72,
      components: makeScoreComponents({ urgency: 0.5 }),
    },
  ],
  counterfactuals: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockPersonaStore(state = {
  personas,
  loadPersonas: vi.fn(),
}) {
  vi.mocked(usePersonaStore).mockImplementation(
    (selector: unknown) => {
      if (typeof selector === "function") {
        return selector(state);
      }
      return state;
    },
  );
}

function mockResources(resources = [resource1, resource2]) {
  vi.mocked(useResources).mockReturnValue({
    resources,
    loading: false,
    refetch: vi.fn(),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  mockPersonaStore();
  mockResources();
  mockRpc.mockResolvedValue({ data: simulationResult, error: null });
});

describe("DemoControlRoom", () => {
  it("a) renders simulation controls card", () => {
    render(<DemoControlRoom />);
    expect(screen.getByText(/simulation controls/i)).toBeInTheDocument();
  });

  it("b) renders all persona checkboxes", () => {
    render(<DemoControlRoom />);
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
    expect(screen.getByText("Mihir Patel")).toBeInTheDocument();
    expect(screen.getByText("Dr. Perera")).toBeInTheDocument();
    expect(screen.getByText("Other Person")).toBeInTheDocument();
  });

  it("c) default member preselection — Sarah, Mihir, Dr. Perera are pre-selected", () => {
    render(<DemoControlRoom />);
    // The selected count shown in the label
    expect(screen.getByText(/3 selected/i)).toBeInTheDocument();
  });

  it("d) Other Person is NOT pre-selected", () => {
    render(<DemoControlRoom />);
    // 3 selected (not 4)
    expect(screen.queryByText(/4 selected/i)).not.toBeInTheDocument();
  });

  it("e) Fix B(i): default start slot value ends with T14:00 (local time, not UTC-shifted)", () => {
    render(<DemoControlRoom />);
    const startInput = screen.getByDisplayValue(/T14:00$/);
    expect(startInput).toBeInTheDocument();
    expect((startInput as HTMLInputElement).value).toMatch(/T14:00$/);
  });

  it("f) Fix B(i): default end slot value ends with T15:00", () => {
    render(<DemoControlRoom />);
    const endInput = screen.getByDisplayValue(/T15:00$/);
    expect(endInput).toBeInTheDocument();
    expect((endInput as HTMLInputElement).value).toMatch(/T15:00$/);
  });

  it("g) Fire button is disabled when no resource selected (even with 3 members)", () => {
    render(<DemoControlRoom />);
    const fireBtn = screen.getByRole("button", { name: /fire simultaneous/i });
    expect(fireBtn).toBeDisabled();
  });

  it("h) Fire button is disabled with resource but fewer than 2 members selected", async () => {
    render(<DemoControlRoom />);
    const user = userEvent.setup();

    // Select a resource
    const trigger = screen.getByRole("combobox");
    await user.click(trigger);
    const option = await screen.findByRole("option", { name: /simulation lab/i });
    await user.click(option);

    // Deselect Sarah and Mihir (leaving only Dr. Perera)
    const sarahLabel = screen.getByText("Sarah Chen").closest("label")!;
    const mihirLabel = screen.getByText("Mihir Patel").closest("label")!;
    await user.click(sarahLabel);
    await user.click(mihirLabel);

    const fireBtn = screen.getByRole("button", { name: /fire simultaneous/i });
    expect(fireBtn).toBeDisabled();
  });

  it("i) Fire button is enabled with resource + ≥2 members selected", async () => {
    render(<DemoControlRoom />);
    const user = userEvent.setup();

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);
    const option = await screen.findByRole("option", { name: /simulation lab/i });
    await user.click(option);

    const fireBtn = screen.getByRole("button", { name: /fire simultaneous/i });
    expect(fireBtn).not.toBeDisabled();
  });

  it("j) clicking Fire calls rpc('simulate_contention') with correct args", async () => {
    render(<DemoControlRoom />);
    const user = userEvent.setup();

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);
    const option = await screen.findByRole("option", { name: /simulation lab/i });
    await user.click(option);

    const fireBtn = screen.getByRole("button", { name: /fire simultaneous/i });
    await user.click(fireBtn);
    await act(async () => {});

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [rpcName, rpcArgs] = mockRpc.mock.calls[0];
    expect(rpcName).toBe("simulate_contention");
    expect(rpcArgs.p_resource_id).toBe(resource1.id);
    // p_start and p_end must be ISO strings (produced by new Date(localStr).toISOString())
    expect(rpcArgs.p_start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(rpcArgs.p_end).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    // p_member_ids is array of selected member IDs (Sarah, Mihir, Dr. Perera)
    expect(Array.isArray(rpcArgs.p_member_ids)).toBe(true);
    expect(rpcArgs.p_member_ids).toContain(sarah.id);
    expect(rpcArgs.p_member_ids).toContain(mihir.id);
    expect(rpcArgs.p_member_ids).toContain(drPerera.id);
  });

  it("k) winner and contenders render with ScoreBars after successful simulation", async () => {
    render(<DemoControlRoom />);
    const user = userEvent.setup();

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);
    const option = await screen.findByRole("option", { name: /simulation lab/i });
    await user.click(option);

    await user.click(screen.getByRole("button", { name: /fire simultaneous/i }));
    await act(async () => {});

    // Winner card shown
    expect(screen.getByText("Winner")).toBeInTheDocument();
    // Sarah Chen appears in winner badge and in the member checkbox list
    expect(screen.getAllByText("Sarah Chen").length).toBeGreaterThan(0);
    // ScoreBars rendered (urgency label)
    expect(screen.getAllByText("Urgency").length).toBeGreaterThan(0);
    // Contender shown (may appear in both results card and persona list)
    expect(screen.getAllByText("Mihir Patel").length).toBeGreaterThan(0);
  });

  it("l) error path — rpc error shows toast", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Simulation failed: insufficient members" },
    });

    render(<DemoControlRoom />);
    const user = userEvent.setup();

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);
    const option = await screen.findByRole("option", { name: /simulation lab/i });
    await user.click(option);

    await user.click(screen.getByRole("button", { name: /fire simultaneous/i }));
    await act(async () => {});

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
      "Simulation failed: insufficient members",
    );
  });

  it("m) Fix B(ii): useRef guard prevents re-seeding when personas reference changes", async () => {
    const { rerender } = render(<DemoControlRoom />);
    const user = userEvent.setup();

    // Initially 3 selected (Sarah, Mihir, Dr. Perera seeded by default)
    expect(screen.getByText(/3 selected/i)).toBeInTheDocument();

    // Deselect Sarah
    const sarahLabel = screen.getByText("Sarah Chen").closest("label")!;
    await user.click(sarahLabel);

    // Should now show 2 selected
    expect(screen.getByText(/2 selected/i)).toBeInTheDocument();

    // Now force the seeding useEffect to re-evaluate by handing the store a
    // BRAND-NEW personas array reference (same members, fresh array identity).
    // This is exactly what would re-run the seeding effect — without the
    // `seeded` useRef guard, the effect would re-seed and restore Sarah,
    // flipping the count back to 3. With the guard, selection stays at 2.
    const freshPersonas = [...personas];
    expect(freshPersonas).not.toBe(personas); // new reference, same members
    mockPersonaStore({ personas: freshPersonas, loadPersonas: vi.fn() });

    await act(async () => {
      rerender(<DemoControlRoom />);
    });

    // Guard held: still 2 selected, Sarah stays deselected (NOT re-seeded to 3).
    expect(screen.getByText(/2 selected/i)).toBeInTheDocument();
    expect(screen.queryByText(/3 selected/i)).not.toBeInTheDocument();
  });
});
