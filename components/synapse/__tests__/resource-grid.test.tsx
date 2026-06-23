import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ResourceGrid } from "@/components/synapse/resource-grid";
import { makeResource } from "@/test/utils";
import { useResources } from "@/hooks/use-resources";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/use-resources", () => ({
  useResources: vi.fn(),
}));

// Mock scrollIntoView for Radix Select in jsdom
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

const mockResources = [
  makeResource({ id: "r1", name: "CS Lab A", resource_class: "computer_lab", building: "Tech Block" }),
  makeResource({ id: "r2", name: "Meeting Room 1", resource_class: "meeting_room", building: "Admin Block" }),
  makeResource({ id: "r3", name: "Multimedia Studio", resource_class: "multimedia_equipment", building: "Tech Block" }),
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useResources).mockReturnValue({
    resources: mockResources,
    loading: false,
    refetch: vi.fn(),
  });
});

describe("ResourceGrid", () => {
  it("shows a spinner while loading (loading: true)", () => {
    vi.mocked(useResources).mockReturnValue({
      resources: [],
      loading: true,
      refetch: vi.fn(),
    });
    const { container } = render(<ResourceGrid />);
    // When loading=true, spinner is always shown (even after hasMounted)
    // The spinner may appear synchronously or after act
    const spinner = container.querySelector(".animate-spin");
    // Either the spinner is visible right away, or hasMounted isn't set yet
    // Either way, after effects there's still a spinner due to loading=true
    expect(spinner || container.querySelector('[class*="animate-spin"]')).toBeTruthy();
  });

  it("shows spinner before and/or immediately after render with loading=true", async () => {
    vi.mocked(useResources).mockReturnValue({
      resources: [],
      loading: true,
      refetch: vi.fn(),
    });
    const { container } = render(<ResourceGrid />);
    await act(async () => {});
    // After effects, loading=true so spinner still shows
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders cards for each resource after mount", async () => {
    render(<ResourceGrid />);
    await act(async () => {});
    expect(screen.getByText("CS Lab A")).toBeInTheDocument();
    expect(screen.getByText("Meeting Room 1")).toBeInTheDocument();
    expect(screen.getByText("Multimedia Studio")).toBeInTheDocument();
  });

  it("shows empty state message when no resources match filters", async () => {
    vi.mocked(useResources).mockReturnValue({
      resources: [],
      loading: false,
      refetch: vi.fn(),
    });
    render(<ResourceGrid />);
    await act(async () => {});
    expect(screen.getByText("No resources match the selected filters.")).toBeInTheDocument();
  });

  it("does not crash with an empty resources array", async () => {
    vi.mocked(useResources).mockReturnValue({
      resources: [],
      loading: false,
      refetch: vi.fn(),
    });
    render(<ResourceGrid />);
    await act(async () => {});
    // If render or the effect threw, the test would have failed at the await above.
    expect(screen.getByText("No resources match the selected filters.")).toBeInTheDocument();
  });

  it("filters cards by class when a class filter is applied via Select", async () => {
    render(<ResourceGrid />);
    await act(async () => {});

    // All 3 resources should be visible initially
    expect(screen.getByText("CS Lab A")).toBeInTheDocument();
    expect(screen.getByText("Meeting Room 1")).toBeInTheDocument();

    // Find the class filter Select trigger (first combobox in the grid)
    const triggers = screen.getAllByRole("combobox");
    const classFilterTrigger = triggers[0];

    const user = userEvent.setup();
    await user.click(classFilterTrigger);

    // After clicking trigger, look for the select item specifically by role option
    // or by finding text that only appears in the open dropdown (not elsewhere in the DOM).
    // Radix renders items in a portal with role="option".
    const option = await screen.findByRole("option", { name: /computer lab/i });
    expect(option).toBeInTheDocument(); // fails loudly if Radix Select didn't open

    await user.click(option);
    await waitFor(() => {
      expect(screen.getByText("CS Lab A")).toBeInTheDocument();
      expect(screen.queryByText("Meeting Room 1")).not.toBeInTheDocument();
    });
  });
});
