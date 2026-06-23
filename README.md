# SYNAPSE — Smart University Resource Allocation Engine

> **CIPHER 2.0 · Segfault Society · Scenario 01**
> Conflict-free, priority-aware, fairness-driven resource booking for universities.

---

## The Problem

University shared resources — computer labs, meeting rooms, AV equipment, testing benches — are allocated on a first-come-first-served basis today. The result: chronic double-bookings, students with high-urgency needs blocked by casual reservations, and monopolisation by a subset of users while others rarely get access. There is no transparency about why a request was denied, and no mechanism to rebalance fairness over time.

## The Solution

SYNAPSE replaces ad-hoc booking with a **server-authoritative allocation engine** built entirely in Postgres. Every booking request goes through four interacting mechanisms:

1. **Conflict-free arbitration** — a GiST exclusion constraint makes double-booking physically impossible; an advisory lock ensures the winner is the highest-priority requester, not the fastest network packet.
2. **Transparent priority scoring** — each request is scored on five dimensions (urgency, role, fairness deficit, recency, academic purpose); the full breakdown is surfaced in a **Decision Explainer** so users know exactly why they won or lost.
3. **Fairness rebalancing** — a periodic recalculation of served-hours vs. fair-share boosts the γ (fairness) component for under-served users and zeros it for over-served ones, closing the gap over time.
4. **Smart waitlist & swap** — cancellations auto-promote the highest-scoring waiter; mutual-gain swap proposals are evaluated and executed atomically.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Database + Engine | Supabase Postgres 17 — SECURITY DEFINER RPCs |
| Conflict prevention | `tstzrange` + `EXCLUDE USING gist` (btree_gist) |
| Realtime | Supabase Realtime CDC (`bookings`, `waitlists`, `audit_log`) |
| State management | Zustand 5 (persona switcher, optimistic UI) |
| UI | Tailwind CSS v4, shadcn/ui (new-york), Lucide icons |
| Language | TypeScript (strict) |
| Tests | Vitest + React Testing Library (unit + component), Playwright (E2E), psql (SQL engine) |

---

## Prerequisites

- Node.js 18 or later
- pnpm (`npm install -g pnpm`)
- Docker (required by Supabase local development)
- Supabase CLI (`brew install supabase/tap/supabase` or see [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli))

---

## Setup & Run

```bash
# 1. Install dependencies
pnpm install

# 2. Start the local Supabase stack (Postgres, Auth, Studio, Realtime)
supabase start

# 3. Copy the URLs shown by "supabase start" into a new .env.local file
#    Look for "API URL" → NEXT_PUBLIC_SUPABASE_URL
#    and "anon key" → NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon key from supabase start output>
EOF

# 4. Apply all migrations and seed the database (personas, resources, history)
supabase db reset

# 5. Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Supabase Studio is at [http://127.0.0.1:54323](http://127.0.0.1:54323).

> **Persona switcher note:** There is no login screen. A dropdown in the top-right header lets you act as any of the seven seeded personas (Sarah, Mihir, Dr. Perera, Nimal, System Admin, Tariq, Ana). The selected persona's ID is passed as `p_actor_id` to every RPC. This is intentional for the demo — the production path replaces `p_actor_id` with `auth.uid()` and re-enables route guards.

---

## Running the Tests

| Command | Suite | What it tests |
| --- | --- | --- |
| `pnpm test` | Unit + RTL component | 155 Vitest tests: pure-function formatting helpers (`lib/synapse/__tests__/format.test.ts`) and React Testing Library render tests for every SYNAPSE component (15 component test files in `components/synapse/__tests__/`) |
| `pnpm test:e2e` | Playwright E2E | 10 browser tests across 5 spec files: smoke (page loads), full booking flow (Mihir then Sarah on Lab-A), N-way contention simulation, admin console access gate + ops, and My Bookings actions |
| `pnpm test:db` | SQL engine assertions | 6 SQL test suites run against the live local Postgres via `psql`: schema constraints, helper functions, `priority_score`, `book_request` (conflict + auto-promote), `simulate_contention`, and lifecycle RPCs (check-in, reaper, rebalance, swap) |
| `pnpm test:all` | All of the above | Runs `pnpm test` then `pnpm test:db` sequentially (E2E requires a running dev server; run it separately with `pnpm test:e2e`) |

---

## Guided Demo (Judge Walkthrough)

Follow these steps after `supabase db reset && pnpm dev`:

1. **Discovery** — Open `/`. Browse the live resource grid. Use the type/building/capacity filters to narrow to "Computer Lab". See Lab-A (30 seats, dual-monitor + GPU, Block A) and Lab-B.

2. **Book as Mihir (year-1 student)** — Switch persona to **Mihir Jain**. Click Lab-A → click any free slot → enter a purpose (e.g. "lab session") → click **Request booking**. The Decision Modal opens showing **Confirmed** with Mihir's score breakdown.

3. **Sarah conflicts and wins by priority** — Without closing Lab-A, switch persona to **Sarah Fernando** (final-year, capstone project). Click the same slot that Mihir just booked → enter purpose "capstone project" → click **Request booking**. The modal shows **Confirmed by priority**: Sarah's score (high role weight + fairness boost) beat Mihir's. Open the Decision Explainer to see each score component as a bar chart, plus two counterfactual alternate slots.

4. **My Bookings** — Navigate to `/me`. See your active bookings. Try **Check in** on a booking, or click **Cancel** to trigger the auto-promote flow (the top waitlisted user is immediately promoted to confirmed).

5. **Admin console** — Switch to **System Admin** and navigate to `/admin`. Explore:
   - **Fairness tab** — Tariq (over-served, γ≈0) vs. Ana (under-served, γ near 1.0) side by side.
   - **Policy tab** — Edit the γ (fairness) weight slider and save. Subsequent bookings pick up the new weight instantly.
   - **Ops tab** — Click **Run rebalance** to recompute the fairness ledger; click **Run reaper** to mark no-shows and auto-promote their waitlisted replacements.
   - **Audit tab** — Every engine decision is logged with an expandable explainer.

6. **N-way contention** — Navigate to `/demo`. Select Lab-A, leave Sarah, Mihir, and Dr. Perera checked, then click **Fire simultaneous requests**. The arbiter scores all three order-independently; Dr. Perera (faculty, role weight 1.0) wins. The ranked contender list and score bars appear instantly.

---

## Feature Map

| Feature | Description | Where it lives |
| --- | --- | --- |
| F-01 | Resource discovery + filters | `/` — resource grid with type/building/capacity filters |
| F-02 | PWA offline access | **Cut** — stretch goal; not implemented |
| F-03 | Priority-scored booking | `/resources/[id]` → `book_request` RPC |
| F-04 | Decision explainer | Decision Modal on `/resources/[id]` + expandable in `/admin` audit viewer |
| F-05 | Fairness ledger | `fairness_ledger` table + `run_fairness_rebalance` RPC |
| F-06 | Waitlist + auto-promote | `waitlists` table; `cancel_booking` and `run_no_show_reaper` auto-promote top waiter |
| F-07 | Check-in + no-show reaper | `check_in` RPC on `/me`; `run_no_show_reaper` RPC on `/admin` Ops tab |
| F-08 | Swap proposal | `propose_swap` RPC surfaced on `/me` |
| F-09 | Demand forecasting (Holt-Winters) | **Cut** — stretch goal; not implemented |
| F-10 | Fairness dashboard | `/admin` Fairness tab — served vs. fair-share bars per member/class |
| F-11 | Audit log viewer | `/admin` Audit tab — reverse-chronological, expandable explainers |
| F-12 | Open policy editor | `/admin` Policy tab — live α/β/γ/δ/ε sliders + role weights; `update_policy` RPC |

---

## Honest Limitations

The following were explicitly cut to keep the prototype focused on the core allocation engine. Each is documented in the technical submission.

- **PWA service worker / offline mode (F-02)** — Scope cut; adds no value to the allocation logic demo.
- **Holt-Winters demand forecast (F-09)** — Requires historical time-series data beyond a 3-day prototype window; the fairness ledger provides the served-hours baseline the forecast would build on.
- **Scheduled operations (pg_cron / Trigger.dev)** — Rebalance and reaper are triggered by buttons in the admin console for the demo. The `pg_cron` production SQL is straightforward: `SELECT cron.schedule('reaper', '*/15 * * * *', 'SELECT run_no_show_reaper()')`.
- **Real authentication + JWT-gated RLS** — The persona switcher passes an explicit `p_actor_id` to every RPC; RLS allows open reads. Production replaces `p_actor_id` with `auth.uid()` inside each SECURITY DEFINER function and re-enables route middleware guards. The auth wiring from the base template remains in the repo — it was deliberately left dormant, not removed.

---

## Project Structure (SYNAPSE-relevant paths)

```text
supabase/
  migrations/          # Engine — schema, helpers, 8 RPCs
  seed.sql             # 7 personas, 8 resources, 3-week history
  tests/               # 6 SQL assertion suites
app/
  page.tsx             # / discovery
  resources/[id]/      # booking + decision modal
  me/                  # my bookings
  admin/               # admin console
  demo/                # contention control room
lib/
  synapse/             # types, utility functions, hooks
  store/persona-store.ts
components/
  synapse/             # all UI components + __tests__/
e2e/                   # Playwright specs
```
