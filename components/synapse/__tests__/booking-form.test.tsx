import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { BookingForm } from "@/components/synapse/booking-form";
import { makeMember } from "@/test/utils";
import { usePersonaStore } from "@/lib/store/persona-store";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Mock SlotPicker to a simple stub that lets tests trigger onSelect
vi.mock("@/components/synapse/slot-picker", () => ({
  SlotPicker: ({
    onSelect,
  }: {
    onSelect: (start: Date, end: Date) => void;
  }) => (
    <button
      type="button"
      data-testid="pick-slot"
      onClick={() =>
        onSelect(
          new Date("2026-07-01T10:00:00Z"),
          new Date("2026-07-01T11:00:00Z"),
        )
      }
    >
      Pick slot
    </button>
  ),
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

// We will set up rpc mock per test via vi.mock factory + mockRpc ref
const mockRpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ rpc: mockRpc }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const persona = makeMember({ id: "actor-1", full_name: "Test User" });

function mockPersona(p: ReturnType<typeof makeMember> | null) {
  vi.mocked(usePersonaStore).mockReturnValue({
    persona: p,
    personas: p ? [p] : [],
    loadPersonas: vi.fn(),
    setPersona: vi.fn(),
  } as unknown as ReturnType<typeof usePersonaStore>);
}

beforeEach(() => {
  vi.clearAllMocks();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  // Default: confirmed booking response
  mockRpc.mockResolvedValue({
    data: {
      status: "confirmed",
      booking_id: "book-123",
    },
    error: null,
  });
  mockPersona(persona);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BookingForm", () => {
  it("a) shows 'Select a persona' warning when persona is null", () => {
    mockPersona(null);
    render(<BookingForm resourceId="res-1" />);
    expect(screen.getByText(/select a persona/i)).toBeInTheDocument();
  });

  it("b) Book button is disabled when no slot selected (even with persona)", () => {
    render(<BookingForm resourceId="res-1" />);
    const bookBtn = screen.getByRole("button", { name: /request booking/i });
    expect(bookBtn).toBeDisabled();
  });

  it("c) Book button is disabled when persona is null (even with slot selected)", async () => {
    mockPersona(null);
    render(<BookingForm resourceId="res-1" />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("pick-slot"));
    const bookBtn = screen.getByRole("button", { name: /request booking/i });
    expect(bookBtn).toBeDisabled();
  });

  it("d) selecting a slot enables the Book button", async () => {
    render(<BookingForm resourceId="res-1" />);
    const bookBtn = screen.getByRole("button", { name: /request booking/i });
    expect(bookBtn).toBeDisabled();

    const user = userEvent.setup();
    await user.click(screen.getByTestId("pick-slot"));

    expect(bookBtn).not.toBeDisabled();
  });

  it("e) clicking Book calls supabase.rpc with correct args", async () => {
    render(<BookingForm resourceId="res-42" />);
    const user = userEvent.setup();

    // Select a slot
    await user.click(screen.getByTestId("pick-slot"));

    // Click book
    const bookBtn = screen.getByRole("button", { name: /request booking/i });
    await user.click(bookBtn);

    // Wait for async rpc call
    await act(async () => {});

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [rpcName, rpcArgs] = mockRpc.mock.calls[0];
    expect(rpcName).toBe("book_request");
    expect(rpcArgs).toMatchObject({
      p_actor_id: "actor-1",
      p_resource_id: "res-42",
      p_start: "2026-07-01T10:00:00.000Z",
      p_end: "2026-07-01T11:00:00.000Z",
    });
    // p_request_id should be a UUID
    expect(rpcArgs.p_request_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("f) on success (confirmed), DecisionModal opens and shows 'Confirmed'", async () => {
    mockRpc.mockResolvedValue({
      data: { status: "confirmed", booking_id: "book-999" },
      error: null,
    });

    render(<BookingForm resourceId="res-1" />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("pick-slot"));
    await user.click(screen.getByRole("button", { name: /request booking/i }));

    // Wait for modal to appear
    const confirmed = await screen.findByText("Confirmed");
    expect(confirmed).toBeInTheDocument();
  });

  it("g) ERROR PATH: rpc returns error → toast.error called, modal does NOT open", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Server error" },
    });

    render(<BookingForm resourceId="res-1" />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("pick-slot"));
    await user.click(screen.getByRole("button", { name: /request booking/i }));

    await act(async () => {});

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Server error");
    // Modal should not be open — no dialog role present
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("h) ERROR PATH: rpc throws → toast.error called", async () => {
    mockRpc.mockRejectedValue(new Error("Network failure"));

    render(<BookingForm resourceId="res-1" />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("pick-slot"));
    await user.click(screen.getByRole("button", { name: /request booking/i }));

    await act(async () => {});

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Network failure");
  });
});
