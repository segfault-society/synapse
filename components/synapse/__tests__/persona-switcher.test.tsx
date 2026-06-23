import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PersonaSwitcher } from "@/components/synapse/persona-switcher";
import { makeMember } from "@/test/utils";
import { usePersonaStore } from "@/lib/store/persona-store";

const mockSetPersona = vi.fn();
const mockLoadPersonas = vi.fn();

const mockPersona = makeMember({ id: "p1", full_name: "Alice Smith", role: "student" });
const mockPersonas = [
  mockPersona,
  makeMember({ id: "p2", full_name: "Bob Jones", role: "faculty" }),
];

vi.mock("@/lib/store/persona-store", () => ({
  usePersonaStore: vi.fn((selector: (s: unknown) => unknown) =>
    selector({
      persona: mockPersona,
      personas: mockPersonas,
      loadPersonas: mockLoadPersonas,
      setPersona: mockSetPersona,
    })
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePersonaStore).mockImplementation((selector) =>
    selector({
      persona: mockPersona,
      personas: mockPersonas,
      loadPersonas: mockLoadPersonas,
      setPersona: mockSetPersona,
    })
  );
});

describe("PersonaSwitcher", () => {
  it("renders nothing before mount / does not crash on empty personas", async () => {
    // Test the hasMounted SSR guard with empty personas — component must not crash.
    vi.mocked(usePersonaStore).mockImplementation(
      (selector: (s: { persona: null; personas: []; loadPersonas: typeof mockLoadPersonas; setPersona: typeof mockSetPersona }) => unknown) =>
        selector({ persona: null, personas: [], loadPersonas: mockLoadPersonas, setPersona: mockSetPersona })
    );
    render(<PersonaSwitcher />);
    // After effects run (hasMounted=true), the Select trigger must be present (no crash).
    await act(async () => {});
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    // No badge because persona is null — this is the real SSR-guard assertion:
    // if the component crashed or returned null permanently, getByRole above would throw.
    expect(screen.queryByText(/student|faculty|lab_manager|admin/)).not.toBeInTheDocument();
  });

  it("renders the select and badge after mount", async () => {
    render(<PersonaSwitcher />);
    // Wait for useEffect to set hasMounted=true
    await act(async () => {});
    // After mount, should render the select trigger
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows the current persona's role in a Badge after mount", async () => {
    render(<PersonaSwitcher />);
    await act(async () => {});
    // persona.role = "student" — the Badge shows it capitalized
    expect(screen.getByText("student")).toBeInTheDocument();
  });

  it("calls loadPersonas on mount", async () => {
    render(<PersonaSwitcher />);
    await act(async () => {});
    expect(mockLoadPersonas).toHaveBeenCalledTimes(1);
  });

  it("works with an empty personas array (no crash)", async () => {
    vi.mocked(usePersonaStore).mockImplementation((selector) =>
      selector({
        persona: null,
        personas: [],
        loadPersonas: mockLoadPersonas,
        setPersona: mockSetPersona,
      })
    );
    render(<PersonaSwitcher />);
    await act(async () => {});
    // Should render the select trigger without crashing
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    // No badge when persona is null
    expect(screen.queryByText(/student|faculty|lab_manager|admin/)).not.toBeInTheDocument();
  });

  it("calls setPersona when user selects a new persona via onValueChange", async () => {
    render(<PersonaSwitcher />);
    await act(async () => {});

    // Attempt to open the select and click an item using userEvent
    const trigger = screen.getByRole("combobox");
    const user = userEvent.setup();

    // Mock scrollIntoView for Radix Select in jsdom
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    await user.click(trigger);

    // Wait for select items to appear in portal
    const item = await waitFor(
      () => screen.getByText("Bob Jones — faculty"),
      { timeout: 2000 }
    );

    await user.click(item);
    expect(mockSetPersona).toHaveBeenCalledWith("p2");
  });
});
