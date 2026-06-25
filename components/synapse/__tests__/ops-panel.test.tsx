import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { OpsPanel } from "@/components/synapse/ops-panel";
import { useResources } from "@/hooks/use-resources";
import { usePersonaStore } from "@/lib/store/persona-store";
import { makeMember, makeResource } from "@/test/utils";
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

const persona = makeMember({ id: "actor-ops", full_name: "Ops Admin" });

const resource1 = makeResource({ id: "res-ops-1", name: "Lab Alpha" });
const resource2 = makeResource({ id: "res-ops-2", name: "Meeting Room Beta" });

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
  mockPersona(persona);
  mockResources();
  mockRpc.mockResolvedValue({
    data: { affected: 3, status: "ok" },
    error: null,
  });
});

describe("OpsPanel", () => {
  it("a) renders three operation cards", () => {
    render(<OpsPanel />);
    expect(screen.getByText(/run fairness rebalance/i)).toBeInTheDocument();
    expect(screen.getByText(/run no-show reaper/i)).toBeInTheDocument();
    expect(screen.getByText(/mass cancel resource/i)).toBeInTheDocument();
  });

  it("b) clicking 'Run rebalance' calls rpc('run_fairness_rebalance')", async () => {
    render(<OpsPanel />);
    const user = userEvent.setup();

    const rebalanceBtn = screen.getByRole("button", { name: /run rebalance/i });
    await user.click(rebalanceBtn);
    await act(async () => {});

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [rpcName] = mockRpc.mock.calls[0];
    expect(rpcName).toBe("run_fairness_rebalance");
    expect(mockRpc.mock.calls[0][1]).toEqual({});
  });

  it("c) rebalance success — toast.success shown and result card displayed", async () => {
    render(<OpsPanel />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /run rebalance/i }));
    await act(async () => {});

    expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
      "Fairness rebalance complete",
    );
    // Result JSON rendered
    expect(screen.getByText(/"affected"/)).toBeInTheDocument();
  });

  it("d) rebalance error — toast.error shown", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Rebalance failed: permission denied" },
    });
    render(<OpsPanel />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /run rebalance/i }));
    await act(async () => {});

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
      "Rebalance failed: Rebalance failed: permission denied",
    );
  });

  it("e) clicking 'Run reaper' calls rpc('run_no_show_reaper')", async () => {
    render(<OpsPanel />);
    const user = userEvent.setup();

    const reaperBtn = screen.getByRole("button", { name: /run reaper/i });
    await user.click(reaperBtn);
    await act(async () => {});

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [rpcName] = mockRpc.mock.calls[0];
    expect(rpcName).toBe("run_no_show_reaper");
    expect(mockRpc.mock.calls[0][1]).toEqual({});
  });

  it("f) reaper success — toast.success shown", async () => {
    render(<OpsPanel />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /run reaper/i }));
    await act(async () => {});

    expect(vi.mocked(toast.success)).toHaveBeenCalledWith("No-show reaper complete");
  });

  it("g) mass cancel is disabled when no resource selected", () => {
    render(<OpsPanel />);
    const massCancelBtn = screen.getByRole("button", { name: /mass cancel/i });
    expect(massCancelBtn).toBeDisabled();
  });

  it("h) mass cancel — selecting resource enables the button", async () => {
    render(<OpsPanel />);
    const user = userEvent.setup();

    // Open the Select dropdown
    const trigger = screen.getByRole("combobox");
    await user.click(trigger);

    // Pick "Lab Alpha"
    const option = await screen.findByRole("option", { name: /lab alpha/i });
    await user.click(option);

    const massCancelBtn = screen.getByRole("button", { name: /mass cancel/i });
    expect(massCancelBtn).not.toBeDisabled();
  });

  it("i) mass cancel calls rpc('mass_cancel') with correct args", async () => {
    render(<OpsPanel />);
    const user = userEvent.setup();

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);
    const option = await screen.findByRole("option", { name: /lab alpha/i });
    await user.click(option);

    const massCancelBtn = screen.getByRole("button", { name: /mass cancel/i });
    await user.click(massCancelBtn);
    await act(async () => {});

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [rpcName, rpcArgs] = mockRpc.mock.calls[0];
    expect(rpcName).toBe("mass_cancel");
    expect(rpcArgs).toEqual({
      p_actor_id: persona.id,
      p_resource_id: resource1.id,
      p_reason: "Admin mass cancel via ops panel",
    });
  });

  it("j) mass cancel success — toast.success and result JSON shown", async () => {
    render(<OpsPanel />);
    const user = userEvent.setup();

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);
    const option = await screen.findByRole("option", { name: /lab alpha/i });
    await user.click(option);

    await user.click(screen.getByRole("button", { name: /mass cancel/i }));
    await act(async () => {});

    expect(vi.mocked(toast.success)).toHaveBeenCalledWith("Mass cancel complete");
    // Result JSON shown
    expect(screen.getByText(/"status"/)).toBeInTheDocument();
  });

  it("k) mass cancel without persona — toast.error('No persona selected')", async () => {
    mockPersona(null);
    render(<OpsPanel />);
    const user = userEvent.setup();

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);
    const option = await screen.findByRole("option", { name: /lab alpha/i });
    await user.click(option);

    await user.click(screen.getByRole("button", { name: /mass cancel/i }));
    await act(async () => {});

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("No persona selected");
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
