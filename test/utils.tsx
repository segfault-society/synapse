/**
 * Shared RTL mock utilities for SYNAPSE tests.
 *
 * --- Usage patterns ---
 *
 * 1. Mock @/lib/store/persona-store (selector-based store):
 *
 *    import { usePersonaStore } from "@/lib/store/persona-store";
 *    vi.mock("@/lib/store/persona-store", () => ({
 *      usePersonaStore: vi.fn((selector) => selector({
 *        persona: makeMember(),
 *        personas: [makeMember()],
 *        loadPersonas: vi.fn(),
 *        setPersona: vi.fn(),
 *      })),
 *    }));
 *    // To change state mid-test:
 *    vi.mocked(usePersonaStore).mockImplementation((selector) => selector({ ... }));
 *
 * 2. Mock @/hooks/use-resources:
 *
 *    vi.mock("@/hooks/use-resources", () => ({
 *      useResources: vi.fn(() => ({ resources: [], loading: false, refetch: vi.fn() })),
 *    }));
 *
 * 3. Mock @/lib/supabase/client:
 *
 *    import { mockSupabaseClient } from "@/test/utils";
 *    const fakeSupa = mockSupabaseClient();
 *    vi.mock("@/lib/supabase/client", () => ({ createClient: () => fakeSupa }));
 *
 * 4. Mock next/navigation useParams:
 *
 *    vi.mock("next/navigation", () => ({ useParams: () => ({ id: "abc" }) }));
 */

import React from "react";
import { render } from "@testing-library/react";
import type { Member, Resource, Booking, Explainer, ScoreComponents } from "@/lib/synapse/types";

// ---------------------------------------------------------------------------
// Factory builders
// ---------------------------------------------------------------------------

let _seq = 0;
function seq() {
  return String(++_seq).padStart(4, "0");
}

export function makeMember(overrides?: Partial<Member>): Member {
  const id = `member-${seq()}`;
  return {
    id,
    full_name: "Test User",
    role: "student",
    created_at: "2025-01-01T00:00:00Z",
    department: "Computer Science",
    email: `test-${id}@uni.edu`,
    is_final_year: false,
    year_level: 2,
    ...overrides,
  };
}

export function makeResource(overrides?: Partial<Resource>): Resource {
  const id = `resource-${seq()}`;
  return {
    id,
    name: "Test Room",
    resource_class: "meeting_room",
    building: "Main Building",
    capacity: 10,
    equipment: ["Projector", "Whiteboard"],
    is_available: true,
    policy_overrides: null,
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeBooking(overrides?: Partial<Booking>): Booking {
  const id = `booking-${seq()}`;
  return {
    id,
    member_id: `member-${seq()}`,
    resource_id: `resource-${seq()}`,
    status: "confirmed",
    during: '["2025-06-01 10:00:00+00","2025-06-01 11:00:00+00")',
    created_at: "2025-01-01T00:00:00Z",
    checked_in_at: null,
    purpose: "Study session",
    request_id: null,
    ...overrides,
  };
}

export function makeScoreComponents(overrides?: Partial<ScoreComponents>): ScoreComponents {
  return {
    urgency: 0.8,
    role_weight: 0.6,
    fairness_deficit: 0.4,
    recency_penalty: 0.1,
    academic_purpose: 0.7,
    ...overrides,
  };
}

export function makeExplainer(overrides?: Partial<Explainer>): Explainer {
  const winner = {
    member_id: `member-${seq()}`,
    name: "Test Winner",
    role: "student",
    score: 0.85,
    components: makeScoreComponents(),
  };
  return {
    status: "confirmed",
    winner,
    contenders: [],
    counterfactuals: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// renderWithMocks — thin wrapper over RTL render (no providers needed)
// ---------------------------------------------------------------------------

export function renderWithMocks(ui: React.ReactElement) {
  return render(ui);
}

// ---------------------------------------------------------------------------
// mockSupabaseClient — chainable fake Supabase client
// ---------------------------------------------------------------------------

export interface SupabaseMockImpl {
  /** Override the resolved data for a specific table */
  tableData?: Record<string, unknown[]>;
  /** Override the resolved data for specific rpc calls */
  rpcData?: Record<string, unknown>;
}

export function mockSupabaseClient(impl?: SupabaseMockImpl) {
  const makeChain = (table: string) => {
    const data = impl?.tableData?.[table] ?? [];
    const result = { data, error: null };

    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select = self;
    chain.eq = self;
    chain.order = self;
    chain.limit = self;
    chain.single = () => Promise.resolve({ data: data[0] ?? null, error: null });
    chain.then = (resolve: (v: typeof result) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    // Make the chain itself a thenable (awaitable)
    Object.defineProperty(chain, Symbol.toStringTag, { value: "MockSupabaseChain" });

    return chain;
  };

  return {
    from: (table: string) => makeChain(table),
    rpc: (name: string) => {
      const data = impl?.rpcData?.[name] ?? null;
      return Promise.resolve({ data, error: null });
    },
  };
}
