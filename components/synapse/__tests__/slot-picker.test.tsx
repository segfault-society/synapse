import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { SlotPicker } from "@/components/synapse/slot-picker";

// Lock time to 2026-06-24 08:00:00 UTC so generated slots are predictable.
// generateSlots() finds next full hour = 09:00 UTC on Jun 24.
const FAKE_NOW = new Date("2026-06-24T08:00:00.000Z");

// ---------------------------------------------------------------------------
// Supabase mock with mutable busy rows
// ---------------------------------------------------------------------------
let currentBusyRows: Array<{ during: string }> = [];

const mockChannel = { on: vi.fn(), subscribe: vi.fn() };
mockChannel.on.mockReturnValue(mockChannel);
mockChannel.subscribe.mockReturnValue(mockChannel);
const mockRemoveChannel = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => {
    const busySnapshot = currentBusyRows.slice(); // capture at call time
    return {
      from: () => ({
        select: function () { return this; },
        eq: function () { return this; },
        then(resolve: (v: { data: typeof busySnapshot; error: null }) => unknown) {
          return Promise.resolve({ data: busySnapshot, error: null }).then(resolve);
        },
      }),
      channel: () => mockChannel,
      removeChannel: mockRemoveChannel,
    };
  },
}));

// ---------------------------------------------------------------------------
// Time setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FAKE_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  currentBusyRows = [];
  vi.setSystemTime(FAKE_NOW);
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SlotPicker", () => {
  it("a) renders time slot buttons for business hours when no busy slots", async () => {
    const onSelect = vi.fn();
    render(<SlotPicker resourceId="res-1" onSelect={onSelect} />);
    await act(async () => {});

    const buttons = screen.getAllByRole("button");
    // Should have many slot buttons across 7 days x ~10 business hours each
    expect(buttons.length).toBeGreaterThan(5);

    // At FAKE_NOW = 08:00 UTC → first slot is 09:00 UTC.
    // Check at least one button exists with a valid time
    const nineOClock = buttons.find(
      (btn) => btn.textContent?.trim() === "09:00",
    );
    expect(nineOClock).toBeDefined();
  });

  it("b) a slot overlapping a confirmed booking is NOT disabled, is marked booked/contendable, and clicking it DOES call onSelect", async () => {
    // Cover ALL first-day business hours across both UTC and UTC+14 offsets to ensure
    // at least one slot in the generated set matches this busy interval.
    // Busy: June 24 00:00 UTC through June 25 18:00 UTC — covers the full first
    // generated day regardless of the test runner's local timezone.
    currentBusyRows = [
      { during: '["2026-06-24 00:00:00+00","2026-06-25 18:00:00+00")' },
    ];

    const onSelect = vi.fn();
    render(<SlotPicker resourceId="res-1" onSelect={onSelect} />);
    await act(async () => {});

    const allButtons = screen.getAllByRole("button");
    // Booked slots are now identified by their "(booked …" aria-label, NOT by
    // a disabled attribute — they must stay clickable so a higher-priority
    // request can contend the slot through the booking UI.
    const busyButtons = allButtons.filter((btn) =>
      btn.getAttribute("aria-label")?.includes("(booked"),
    );

    // At least one slot should overlap the wide busy interval
    expect(busyButtons.length).toBeGreaterThan(0);

    const busyButton = busyButtons[0];

    // It must NOT be disabled (contendable), and must carry the amber/booked styling.
    expect(busyButton).not.toBeDisabled();
    expect(busyButton.getAttribute("aria-label")).toContain(
      "(booked — your request will contend)",
    );
    expect(busyButton.className).toContain("amber");

    // Use .click() directly rather than userEvent because userEvent v14+ has an
    // internal pointer-delay that conflicts with vi.useFakeTimers(), causing
    // the click to hang.
    busyButton.click();
    expect(onSelect).toHaveBeenCalledTimes(1);
    const [start, end] = onSelect.mock.calls[0] as [Date, Date];
    expect(start).toBeInstanceOf(Date);
    expect(end).toBeInstanceOf(Date);
  });

  it("c) clicking a free slot calls onSelect with two Date objects", async () => {
    const onSelect = vi.fn();
    render(<SlotPicker resourceId="res-2" onSelect={onSelect} />);
    await act(async () => {});

    const buttons = screen.getAllByRole("button");
    const freeButton = buttons.find((btn) => !btn.hasAttribute("disabled"));
    expect(freeButton).toBeDefined();

    // Use .click() directly to avoid fake-timer conflicts with userEvent pointer delay
    freeButton!.click();

    expect(onSelect).toHaveBeenCalledTimes(1);
    const [start, end] = onSelect.mock.calls[0] as [Date, Date];
    expect(start).toBeInstanceOf(Date);
    expect(end).toBeInstanceOf(Date);
    // Each slot is exactly 1 hour
    expect(end.getTime() - start.getTime()).toBe(60 * 60 * 1000);
  });

  it("d) selected slot gets aria-pressed='true'", async () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <SlotPicker resourceId="res-3" onSelect={onSelect} />,
    );
    await act(async () => {});

    const buttons = screen.getAllByRole("button");
    const freeButton = buttons.find((btn) => !btn.hasAttribute("disabled"));
    expect(freeButton).toBeDefined();

    const ariaLabel = freeButton!.getAttribute("aria-label") ?? "";

    // Click to capture start/end (direct .click() avoids fake-timer userEvent delays)
    freeButton!.click();
    const [start, end] = onSelect.mock.calls[0] as [Date, Date];

    // Rerender with selected prop pointing to that slot
    rerender(
      <SlotPicker resourceId="res-3" onSelect={onSelect} selected={{ start, end }} />,
    );
    await act(async () => {});

    // That button should now have aria-pressed="true"
    const pressedButton = screen.getByRole("button", { name: ariaLabel });
    expect(pressedButton).toHaveAttribute("aria-pressed", "true");
  });
});
