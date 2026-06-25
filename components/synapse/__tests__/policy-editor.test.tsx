import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { PolicyEditor } from "@/components/synapse/policy-editor";
import { usePolicy } from "@/hooks/use-policy";
import { usePersonaStore } from "@/lib/store/persona-store";
import { makeMember } from "@/test/utils";
import { toast } from "sonner";
import type { PolicyRow } from "@/lib/synapse/types";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/hooks/use-policy", () => ({
  usePolicy: vi.fn(),
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

const persona = makeMember({ id: "actor-policy", full_name: "Admin User" });

const policyRows: PolicyRow[] = [
  {
    id: "p-1",
    key: "urgency_weight",
    label: "Urgency Weight",
    numeric_value: 0.8,
    category: "scoring",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "p-2",
    key: "role_weight_student",
    label: "Role Weight Student",
    numeric_value: 0.5,
    category: "scoring",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "p-3",
    key: "max_booking_hours",
    label: "Max Booking Hours",
    numeric_value: 4,
    category: "limits",
    updated_at: "2025-01-01T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockPersona(p: ReturnType<typeof makeMember> | null) {
  vi.mocked(usePersonaStore).mockReturnValue({
    persona: p,
    personas: p ? [p] : [],
    loadPersonas: vi.fn(),
    setPersona: vi.fn(),
  } as unknown as ReturnType<typeof usePersonaStore>);
}

function mockPolicy(rows: PolicyRow[], loading = false) {
  vi.mocked(usePolicy).mockReturnValue({
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
  mockPersona(persona);
  mockPolicy(policyRows);
  mockRpc.mockResolvedValue({ data: { ok: true }, error: null });
});

describe("PolicyEditor", () => {
  it("a) shows loading state", () => {
    mockPolicy([], true);
    render(<PolicyEditor />);
    expect(screen.getByText(/loading policy settings/i)).toBeInTheDocument();
  });

  it("b) shows empty state when no rows", () => {
    mockPolicy([]);
    render(<PolicyEditor />);
    expect(screen.getByText(/no policy settings found/i)).toBeInTheDocument();
  });

  it("c) renders policy rows grouped by category", () => {
    render(<PolicyEditor />);

    // Category headers: humanizeCategory("scoring") => "Scoring", "limits" => "Limits"
    expect(screen.getByText("Scoring")).toBeInTheDocument();
    expect(screen.getByText("Limits")).toBeInTheDocument();

    // Row labels
    expect(screen.getByText("Urgency Weight")).toBeInTheDocument();
    expect(screen.getByText("Role Weight Student")).toBeInTheDocument();
    expect(screen.getByText("Max Booking Hours")).toBeInTheDocument();
  });

  it("d) inputs render with correct initial numeric values", () => {
    render(<PolicyEditor />);

    const inputs = screen.getAllByRole("spinbutton");
    const values = inputs.map((i) => (i as HTMLInputElement).value);
    expect(values).toContain("0.8");
    expect(values).toContain("0.5");
    expect(values).toContain("4");
  });

  it("e) Save buttons are initially disabled (no dirty state)", () => {
    render(<PolicyEditor />);
    const saveBtns = screen.getAllByRole("button", { name: /save/i });
    saveBtns.forEach((btn) => expect(btn).toBeDisabled());
  });

  it("f) editing a value enables its Save button", async () => {
    render(<PolicyEditor />);
    const user = userEvent.setup();

    const inputs = screen.getAllByRole("spinbutton");
    const firstInput = inputs[0];
    await user.clear(firstInput);
    await user.type(firstInput, "0.9");

    const saveBtns = screen.getAllByRole("button", { name: /save/i });
    // At least one Save button should now be enabled
    const enabledSave = saveBtns.find((btn) => !btn.hasAttribute("disabled"));
    expect(enabledSave).toBeDefined();
  });

  it("g) clicking Save calls rpc('update_policy') with correct args", async () => {
    render(<PolicyEditor />);
    const user = userEvent.setup();

    const inputs = screen.getAllByRole("spinbutton");
    const firstInput = inputs[0];
    await user.clear(firstInput);
    await user.type(firstInput, "0.9");

    const saveBtns = screen.getAllByRole("button", { name: /save/i });
    const enabledSave = saveBtns.find((btn) => !btn.hasAttribute("disabled"))!;
    await user.click(enabledSave);
    await act(async () => {});

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [rpcName, rpcArgs] = mockRpc.mock.calls[0];
    expect(rpcName).toBe("update_policy");
    expect(rpcArgs).toMatchObject({
      p_actor_id: persona.id,
      p_key: "urgency_weight",
      p_value: 0.9,
    });
  });

  it("h) success path — toast.success appears", async () => {
    render(<PolicyEditor />);
    const user = userEvent.setup();

    const inputs = screen.getAllByRole("spinbutton");
    await user.clear(inputs[0]);
    await user.type(inputs[0], "0.9");

    const saveBtns = screen.getAllByRole("button", { name: /save/i });
    const enabledSave = saveBtns.find((btn) => !btn.hasAttribute("disabled"))!;
    await user.click(enabledSave);
    await act(async () => {});

    expect(vi.mocked(toast.success)).toHaveBeenCalled();
  });

  it("i) error path — ok:false response surfaces the reason via toast.error", async () => {
    mockRpc.mockResolvedValue({
      data: { ok: false, reason: "Not authorised to change this key" },
      error: null,
    });

    render(<PolicyEditor />);
    const user = userEvent.setup();

    const inputs = screen.getAllByRole("spinbutton");
    await user.clear(inputs[0]);
    await user.type(inputs[0], "0.9");

    const saveBtns = screen.getAllByRole("button", { name: /save/i });
    const enabledSave = saveBtns.find((btn) => !btn.hasAttribute("disabled"))!;
    await user.click(enabledSave);
    await act(async () => {});

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
      "Not authorised to change this key",
    );
  });

  it("j) error path — rpc error object surfaces message via toast.error", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "DB constraint violation" },
    });

    render(<PolicyEditor />);
    const user = userEvent.setup();

    const inputs = screen.getAllByRole("spinbutton");
    await user.clear(inputs[0]);
    await user.type(inputs[0], "0.9");

    const saveBtns = screen.getAllByRole("button", { name: /save/i });
    const enabledSave = saveBtns.find((btn) => !btn.hasAttribute("disabled"))!;
    await user.click(enabledSave);
    await act(async () => {});

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
      "Save failed: DB constraint violation",
    );
  });

  it("k) no persona — toast.error('No persona selected') when saving", async () => {
    mockPersona(null);
    render(<PolicyEditor />);
    const user = userEvent.setup();

    const inputs = screen.getAllByRole("spinbutton");
    await user.clear(inputs[0]);
    await user.type(inputs[0], "0.9");

    const saveBtns = screen.getAllByRole("button", { name: /save/i });
    const enabledSave = saveBtns.find((btn) => !btn.hasAttribute("disabled"))!;
    await user.click(enabledSave);
    await act(async () => {});

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("No persona selected");
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
