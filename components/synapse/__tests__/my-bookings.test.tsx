import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MyBookings } from "@/components/synapse/my-bookings";
import { makeMember, makeBooking, makeResource } from "@/test/utils";
import { usePersonaStore } from "@/lib/store/persona-store";
import { useBookings } from "@/hooks/use-bookings";
import { useWaitlists } from "@/hooks/use-waitlists";
import { useResources } from "@/hooks/use-resources";
import type { Waitlist } from "@/lib/synapse/types";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/store/persona-store", () => ({
  usePersonaStore: vi.fn(),
}));

vi.mock("@/hooks/use-bookings", () => ({
  useBookings: vi.fn(),
}));

vi.mock("@/hooks/use-waitlists", () => ({
  useWaitlists: vi.fn(),
}));

vi.mock("@/hooks/use-resources", () => ({
  useResources: vi.fn(),
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

const persona = makeMember({ id: "actor-99", full_name: "Alice Smith" });

// Far-future during so isUpcoming() returns true
const FUTURE_DURING = '["2027-01-01 10:00:00+00","2027-01-01 11:00:00+00")';
const FUTURE_DURING_2 = '["2027-02-01 14:00:00+00","2027-02-01 15:00:00+00")';

const resource1 = makeResource({ id: "res-a", name: "Meeting Room A" });
const resource2 = makeResource({ id: "res-b", name: "Computer Lab B" });

const booking1 = makeBooking({
  id: "bk-1",
  member_id: persona.id,
  resource_id: resource1.id,
  status: "confirmed",
  during: FUTURE_DURING,
  checked_in_at: null,
});

const booking2 = makeBooking({
  id: "bk-2",
  member_id: persona.id,
  resource_id: resource2.id,
  status: "confirmed",
  during: FUTURE_DURING_2,
  checked_in_at: null,
});

const checkedInBooking = makeBooking({
  id: "bk-ci",
  member_id: persona.id,
  resource_id: resource1.id,
  status: "confirmed",
  during: FUTURE_DURING,
  checked_in_at: "2027-01-01T09:50:00Z",
});

const waitlistEntry: Waitlist = {
  id: "wl-1",
  member_id: persona.id,
  resource_id: resource1.id,
  status: "waiting",
  rank: 2,
  score: 0.75,
  during: '["2027-03-01 10:00:00+00","2027-03-01 11:00:00+00")',
  created_at: "2026-01-01T00:00:00Z",
  request_id: null,
  score_components: null,
};

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

function mockHooks({
  bookings = [booking1],
  waitlists = [] as Waitlist[],
  resources = [resource1, resource2] as ReturnType<typeof makeResource>[],
} = {}) {
  vi.mocked(useBookings).mockReturnValue({
    bookings,
    loading: false,
    refetch: vi.fn(),
  });
  vi.mocked(useWaitlists).mockReturnValue({
    waitlists,
    loading: false,
    refetch: vi.fn(),
  });
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
  mockRpc.mockResolvedValue({ data: { ok: true }, error: null });
  mockPersona(persona);
  mockHooks();
});

describe("MyBookings", () => {
  it("a) shows 'Select a persona' prompt when persona is null", async () => {
    mockPersona(null);
    render(<MyBookings />);
    await act(async () => {});
    expect(
      screen.getByText(/select a persona from the header/i),
    ).toBeInTheDocument();
  });

  it("b) confirmed bookings render with resource name and formatted slot", async () => {
    render(<MyBookings />);
    await act(async () => {});

    const resourceHeading = screen.getByText("Meeting Room A");
    expect(resourceHeading).toBeInTheDocument();

    // Scope the badge lookup to the booking card that contains the resource name
    // so a stray "confirmed" string elsewhere in the DOM can't produce a false
    // positive.  shadcn Card renders as div[data-slot="card"].
    const card = resourceHeading.closest('[data-slot="card"]') as HTMLElement;
    expect(card).not.toBeNull();
    expect(within(card).getByText("confirmed")).toBeInTheDocument();

    // formatSlot produces something like "Fri, 1 Jan 2027 · 10:00–11:00" (en-AU)
    // Verify the slot text is rendered (not "Unknown time")
    expect(screen.queryByText("Unknown time")).not.toBeInTheDocument();
  });

  it("c) Check-in button calls rpc('check_in') with p_actor_id and p_booking_id", async () => {
    render(<MyBookings />);
    await act(async () => {});

    const user = userEvent.setup();
    const checkInBtn = screen.getByRole("button", { name: /check in/i });
    await user.click(checkInBtn);
    await act(async () => {});

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [rpcName, rpcArgs] = mockRpc.mock.calls[0];
    expect(rpcName).toBe("check_in");
    expect(rpcArgs).toEqual({
      p_actor_id: persona.id,
      p_booking_id: booking1.id,
    });
  });

  it("d) Check-in button is disabled when booking already has checked_in_at set", async () => {
    mockHooks({ bookings: [checkedInBooking] });
    render(<MyBookings />);
    await act(async () => {});

    const checkInBtn = screen.getByRole("button", { name: /check in/i });
    expect(checkInBtn).toBeDisabled();
  });

  it("e) Cancel button opens AlertDialog", async () => {
    render(<MyBookings />);
    await act(async () => {});

    const user = userEvent.setup();
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelBtn);

    // AlertDialog should be visible
    expect(screen.getByText(/cancel booking\?/i)).toBeInTheDocument();
    expect(
      screen.getByText(/this will release your slot/i),
    ).toBeInTheDocument();
  });

  it("f) Confirming cancel calls rpc('cancel_booking') with p_actor_id and p_booking_id", async () => {
    render(<MyBookings />);
    await act(async () => {});

    const user = userEvent.setup();
    // Open the dialog
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelBtn);

    // Confirm cancel in dialog
    const confirmBtn = screen.getByRole("button", { name: /cancel booking/i });
    await user.click(confirmBtn);
    await act(async () => {});

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [rpcName, rpcArgs] = mockRpc.mock.calls[0];
    expect(rpcName).toBe("cancel_booking");
    expect(rpcArgs).toEqual({
      p_actor_id: persona.id,
      p_booking_id: booking1.id,
    });
  });

  it("g) Propose swap calls rpc('propose_swap') with correct booking IDs", async () => {
    // Need 2+ confirmed upcoming bookings
    mockHooks({ bookings: [booking1, booking2] });

    render(<MyBookings />);
    await act(async () => {});

    const user = userEvent.setup();

    // Scope the combobox lookup to booking1's card by finding the "Meeting Room A"
    // heading and walking up to its card container.  This avoids fragile DOM-order
    // indexing (getAllByRole("combobox")[0]) which would break if card order changes.
    // shadcn Card renders as div[data-slot="card"].
    const booking1Heading = screen.getByText("Meeting Room A");
    const booking1Card = booking1Heading.closest('[data-slot="card"]') as HTMLElement;
    expect(booking1Card).not.toBeNull();
    const booking1Combo = within(booking1Card).getByRole("combobox");

    // First booking's SwapSelect should have booking2 as option
    await user.click(booking1Combo);

    // Wait for Radix Select dropdown to open and find the option for booking2
    const option = await screen.findByRole("option", {
      name: /Computer Lab B/i,
    });
    await user.click(option);
    await act(async () => {});

    // Now click "Propose swap" for the first booking
    const swapBtns = screen.getAllByRole("button", { name: /propose swap/i });
    await user.click(swapBtns[0]);
    await act(async () => {});

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [rpcName, rpcArgs] = mockRpc.mock.calls[0];
    expect(rpcName).toBe("propose_swap");
    expect(rpcArgs).toEqual({
      p_actor_id: persona.id,
      p_booking_a: booking1.id,
      p_booking_b: booking2.id,
    });
  });

  it("h) Waitlist section shows rank and score", async () => {
    mockHooks({ waitlists: [waitlistEntry] });
    render(<MyBookings />);
    await act(async () => {});

    // Rank shown as #2
    expect(screen.getByText("#2")).toBeInTheDocument();
    // Score shown as 0.75
    expect(screen.getByText("0.75")).toBeInTheDocument();
  });
});
