# SYNAPSE — Phase 2 Prototype Design Spec

**Team:** Segfault Society · **Event:** CIPHER 2.0, IIT Sri Lanka · **Scenario:** 01 — Smart University Resource Allocation System
**Phase:** Prototype & Solution Development · **Deadline:** 26 June 2026, 10:00 AM (≈3 days from 23 June)
**Status:** Approved design — ready for implementation planning.

---

## 1. Purpose & framing

Build a working prototype that demonstrates the **core allocation logic** of the Synapse proposal, not the full production fabric. The CIPHER 2.0 Phase 2 rubric makes scope decisions for us:

| Criterion | Marks | What it means for us |
|---|---|---|
| Functionality | 30 | It works; judges can interact and see correct outputs. |
| Algorithm & Logic | 25 | Conflict detection + priority handling work as proposed. |
| Feasibility & Impact | 20 | Prototype proves the solution is practical and reflects the Case Analysis. |
| Technical Implementation | 15 | Clean, structured code; clear docs. |
| Innovation & Presentation | 10 | Creative approach. |

**55% rests on the engine working and being visibly smart.** The phase guidance explicitly says NOT to build login, payments, fancy animations, cloud deployment, or large feature lists — and to focus on core allocation logic, conflict detection, and a clear input → processing → output flow.

### Locked decisions (from brainstorming)
1. **Scope:** Core engine + key UX. Keep the four §3 engine pieces; cut PWA + Holt-Winters to stretch.
2. **Access:** Persona switcher, **no login** (login is not assessed).
3. **Engine location:** **Postgres `SECURITY DEFINER` RPCs** + native **GiST exclusion constraint** (a documented refinement of the Phase 1 "Edge Function + in-memory interval tree").
4. **Deployment:** Local-first; deploy to Vercel + Supabase Cloud only if time remains (live link is an optional bonus).

### Documented deviations from Phase 1 (must appear in the submission docs)
- Edge Function (Deno) → **Postgres RPC** (more robust, transactional, less code, still server-authoritative).
- In-memory interval tree → **`tstzrange` + `EXCLUDE USING gist`** (double-booking becomes physically impossible; same `O(log n)` GiST behaviour, bulletproof under concurrency).
- Trigger.dev cron → **button-triggered ops** in the admin console for the live demo (`pg_cron` SQL included as the production path).
- Real auth (Supabase + JWT/RLS) → **persona switcher**; production swaps `p_actor_id` for `auth.uid()`.

---

## 2. Existing template (starting point)

Next.js **16.2.6** + React **19.2.6**, Supabase (Postgres **17**, `@supabase/ssr` 0.9, `@supabase/supabase-js` 2.100), Zustand **5**, Tailwind **v4** (OKLCH theme, currently purple hue 270°), 54 shadcn/ui components (style "new-york", neutral base, lucide icons), TypeScript strict, `@/*` path alias.

Reusable conventions:
- Migrations: lowercase SQL, `create or replace function … language plpgsql … set search_path = …`, partial/`(select auth.uid())` policy pattern, `revoke … from authenticated, anon, public`, `grant execute … to supabase_auth_admin` for the auth hook. Migration files are timestamp-prefixed (`YYYYMMDDHHMMSS_name.sql`). Existing: `20250101000000_init.sql`, `20250103000000_rbac.sql`.
- Client wiring: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server, per-request), `proxy.ts` + `lib/supabase/proxy.ts` (middleware/session). Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Data hook pattern: `hooks/use-items.ts` (client hook, `createClient()`, optimistic local state, `sanitizeError()`). Component pattern: `components/items-list.tsx` (uses hook + `useAuthStore` + sonner toasts + AlertDialog).
- Types: `lib/types/database.types.ts` is auto-generated and the single source of truth (`supabase gen types typescript --local > lib/types/database.types.ts`).
- Local workflow: `supabase start`, `supabase db reset` (applies migrations + seed), `supabase gen types …`, `pnpm dev`. Studio at `http://127.0.0.1:54323`.

The template's auth/RBAC stays in the repo (unused on the demo path) so the production story is intact.

---

## 3. Architecture

```
Persona switcher (Zustand, localStorage)  ── actor_id ──┐
  "Acting as: Sarah (final-year) ▾"                      │
                                                         ▼
Next.js 16 (App Router)  /  /resources/[id]  /me  /admin  /demo
  client hooks (use-resources, use-bookings, …)  +  supabase.rpc(...)
        │ writes via RPC only                    ▲ Realtime postgres_changes
        ▼                                         │ (bookings · waitlists · audit_log)
Postgres 17 — the engine (SECURITY DEFINER RPCs)
  book_request · priority_score · simulate_contention · cancel_booking
  check_in · run_no_show_reaper · run_fairness_rebalance · propose_swap
  bookings.during tstzrange
  EXCLUDE USING gist (resource_id WITH =, during WITH &&) WHERE status='confirmed'   [btree_gist]
```

**Security model (reconciles "no login" with RLS):** RLS enabled on all new tables. `SELECT` is granted to `anon`/`authenticated` (the availability feed is public — the proposal's "Public Screens"). `INSERT/UPDATE/DELETE` are `REVOKE`d from clients. The **only** way to mutate state is through `SECURITY DEFINER` RPCs that take an explicit `p_actor_id` and enforce the actor's role/permission inside the function. This is genuinely server-authoritative: clients cannot write directly. Production swaps `p_actor_id` → `auth.uid()`.

---

## 4. Data model — 7 tables

New migration creates these (exact types refined during implementation). All `id uuid primary key default gen_random_uuid()` unless noted; all have `created_at timestamptz default now()`.

### 4.1 Enums
- `synapse_role` = `('student','faculty','lab_manager','admin')`
- `resource_class` = `('meeting_room','computer_lab','multimedia_equipment','testing_device')`
- `booking_status` = `('confirmed','cancelled','completed','no_show')`
- `waitlist_status` = `('waiting','promoted','expired','cancelled')`
- `audit_kind` = `('booking_confirmed','booking_waitlisted','conflict_resolved','booking_cancelled','check_in','no_show_released','fairness_rebalance','swap','admin_override','mass_cancel')`

### 4.2 `members`
The people (independent of `auth.users`; persona-switcher source).
`full_name text not null`, `email text`, `role synapse_role not null default 'student'`, `year_level int` (1–4; null for non-students), `is_final_year boolean default false`, `department text`.

### 4.3 `resources`
`name text not null`, `resource_class resource_class not null`, `building text`, `capacity int default 1`, `equipment jsonb default '[]'`, `is_available boolean default true`, `policy_overrides jsonb default '{}'`.

### 4.4 `bookings`
`member_id uuid → members`, `resource_id uuid → resources`, `during tstzrange not null`, `status booking_status not null default 'confirmed'`, `checked_in_at timestamptz`, `purpose text`, `request_id uuid` (idempotency).
**Constraint:** `EXCLUDE USING gist (resource_id WITH =, during WITH &&) WHERE (status = 'confirmed')` (requires `btree_gist`). Index on `(resource_id, status)`; GiST index on `during`.

### 4.5 `waitlists`
`request_id uuid`, `member_id uuid`, `resource_id uuid`, `during tstzrange`, `score numeric`, `rank int`, `score_components jsonb`, `status waitlist_status default 'waiting'`.

### 4.6 `fairness_ledger`
`member_id uuid`, `resource_class resource_class`, `served_hours numeric default 0`, `fair_share numeric default 0`, `fairness_term numeric default 0` (the γ boost, 0–1), `window_start date`, `window_end date`, `updated_at timestamptz default now()`. Unique on `(member_id, resource_class)`.

### 4.7 `audit_log` (append-only)
`kind audit_kind not null`, `actor_id uuid`, `resource_id uuid`, `booking_id uuid`, `payload jsonb default '{}'`, `decision_explainer jsonb`, `occurred_at timestamptz default now()`. No update/delete granted to anyone.

### 4.8 `policy_settings` (Open Policy, F-12)
`key text unique not null`, `numeric_value numeric`, `label text`, `category text`. Seeded:
- Weights: `alpha=0.25` (urgency), `beta=0.30` (role), `gamma=0.30` (fairness), `delta=0.10` (recency), `epsilon=0.05` (purpose). Sum = 1.0.
- Role weights: `role_weight_faculty=1.0`, `role_weight_final_year=0.8`, `role_weight_postgrad=0.6`, `role_weight_undergrad=0.4`.
- Ops: `no_show_grace_minutes=10`, `fairness_window_days=30`, `recency_window_days=7`, `urgency_horizon_hours=168`.

---

## 5. The engine — RPC contracts

All `SECURITY DEFINER`, `set search_path = ''`, fully-qualified names, atomic (single transaction). Privileged RPCs assert `actor.role in (...)`.

### 5.1 `priority_score(p_member_id, p_resource_id, p_start, p_end) → jsonb`
Implements **Formula 1**: `score = α·urgency + β·role_weight + γ·fairness_deficit − δ·recency_penalty + ε·academic_purpose_match`. Weights read live from `policy_settings`. Component definitions (all clamped to 0–1, all tunable via policy):
- `urgency` = `greatest(0, 1 − hours_until_start / urgency_horizon_hours)`, plus a sharpening boost when `hours_until_start ≤ 48`.
- `role_weight` = `policy_settings` lookup by member role; students resolve to final-year/postgrad/undergrad via `is_final_year`/`year_level`.
- `fairness_deficit` = `fairness_ledger.fairness_term` for `(member, resource_class)`, default 0.
- `recency_penalty` = `least(1, confirmed_bookings_same_resource_in_last_{recency_window_days} / 2)`.
- `academic_purpose_match` = 1 if `purpose` keyword matches the resource class affinity (e.g. "thesis"/"defence" → multimedia_equipment; "capstone"/"project" → computer_lab), else 0.

Returns `{ total, components: { urgency, role_weight, fairness_deficit, recency_penalty, academic_purpose } }`. Ties broken by lower `member_id`.

### 5.2 `book_request(p_actor_id, p_resource_id, p_start, p_end, p_purpose, p_request_id) → jsonb`
1. **Idempotency:** if `audit_log` already has `p_request_id`, return the prior decision (`status='idempotent_replay'`).
2. `pg_advisory_xact_lock(hashtext(p_resource_id::text))` — serialises arbitration per resource (deterministic by score, not arrival order) — the proposal's "SERIALIZABLE lock on the resource calendar".
3. Reject if resource unavailable.
4. **No overlap:** insert booking (`confirmed`), update `fairness_ledger.served_hours`, write `audit_log(booking_confirmed)`. Return `{status:'confirmed', booking_id, explainer}`.
5. **Overlap:** compute `priority_score` for the requester and each incumbent.
   - **Requester wins:** demote incumbent(s) → `waitlists`, cancel their booking, insert requester booking, `audit_log(conflict_resolved)`. Return `{status:'confirmed_by_priority', booking_id, demoted:[...], explainer}`.
   - **Requester loses:** enqueue requester → `waitlists` with score + rank, `audit_log(booking_waitlisted)`. Return `{status:'waitlisted', rank, ahead_of:[...], explainer}`.

The `EXCLUDE` constraint is the backstop if two transactions race past the lock.

### 5.3 `simulate_contention(p_resource_id, p_start, p_end, p_member_ids uuid[]) → jsonb` ⭐ showpiece
Clears the slot, scores **all** contenders, picks the winner by score (order-independent), confirms the winner, waitlists the rest by rank, writes one `conflict_resolved` audit row with the full multi-contender explainer. Returns winner + ranked losers + every score breakdown. Proves "deterministic winner by priority, not arrival time."

### 5.4 Lifecycle RPCs
- `cancel_booking(p_actor_id, p_booking_id) → jsonb` — cancel; **auto-promote** top `waiting` waitlist entry for that slot to a confirmed booking; audit. (F-06)
- `check_in(p_actor_id, p_booking_id) → jsonb` — set `checked_in_at`; audit. (F-07)
- `run_no_show_reaper(p_grace_minutes int default null) → jsonb` — confirmed bookings past `start + grace` with no check-in → `no_show`, release, auto-promote waitlist, audit. Returns reaped + promoted lists. (F-07)
- `run_fairness_rebalance(p_window_days int default null) → jsonb` — **Pseudocode 2**: per `(member, resource_class)` over the window, `fair_share = total_served_in_class / active_members_in_class`; `deficit = fair_share − served`; `fairness_term = greatest(0, deficit/fair_share)` bounded 0–1; over-served → 0. Writes `fairness_ledger`, audits, returns under/over-served report. (F-05, F-10)
- `propose_swap(p_actor_id, p_booking_a, p_booking_b) → jsonb` — **Pseudocode 3**: utility before/after for both sides; reject if either side loses (`{ok:false, reason}`); else atomically reassign both, audit. (F-08)
- `mass_cancel(p_actor_id, p_resource_id, p_reason) → jsonb` — bulk cancel a resource's bookings, credit affected members' fairness ledger, audit. (edge case)

### 5.5 Decision-explainer contract (§3.8) — the transparency/innovation hook
Every outcome carries:
```json
{
  "status": "...",
  "winner": { "member_id": "...", "name": "...", "score": 0.72,
              "components": { "urgency": ..., "role_weight": ..., "fairness_deficit": ...,
                              "recency_penalty": ..., "academic_purpose": ... } },
  "contenders": [ { "member_id": "...", "name": "...", "score": 0.31, "components": { ... } } ],
  "counterfactuals": [ { "kind": "alternate_slot", "label": "Wed 14:00", "score": 0.61 },
                       { "kind": "alternate_resource", "label": "Lab-B", "score": 0.58 } ]
}
```
Counterfactuals: scan the next few same-resource open slots and same-class available resources, score them, surface the best two.

---

## 6. Frontend surfaces

Brand: retheme accent to SYNAPSE cyan/teal (OKLCH ~200° hue) in `globals.css`; "SYNAPSE" wordmark. Keep UI clean, not animated (rubric). Hooks mirror `use-items.ts`; persona in a Zustand store like `auth-store.ts`. Realtime subscriptions on `bookings`/`waitlists`/`audit_log` keep every screen live (<200ms target).

- **`/` Discovery** — persona switcher in header; resource grid with live availability; filters by type/building/capacity. (F-01)
- **`/resources/[id]`** — resource detail, slot picker, booking form → **Decision Modal** showing confirmed / confirmed-by-priority / waitlisted with score-component bars + counterfactual alternates. (F-03, F-04)
- **`/me`** — current persona's bookings + waitlist entries; cancel, check-in, propose-swap. (F-06, F-07, F-08)
- **`/admin`** (gated by persona role `lab_manager`/`admin`) — live occupancy + waitlists; **fairness dashboard** (served vs fair-share bars, F-10); **policy editor** (tune α…ε + role weights live, F-12); **audit log viewer** with expandable explainers (F-11); ops buttons: *Run fairness rebalance*, *Run no-show reaper*, *Mass cancel*.
- **`/demo` Control room** ⭐ — fire `simulate_contention` at a slot; watch the arbiter decide; all explainers side-by-side. The clean input → processing → output flow for judges.

### Hooks / stores
`use-persona` (Zustand, the actor), `use-resources`, `use-bookings`, `use-waitlists`, `use-fairness`, `use-audit-log`, `use-policy`, and a generic `use-realtime-table` helper. All RPC calls pass `actor_id = persona.id`.

---

## 7. Seed data (essential for a believable demo)

`supabase/seed.sql` (referenced by `config.toml`, currently missing) creates:
- **Members / personas:** Sarah (final-year capstone), Mihir (year-1, casual), Dr. Perera (faculty), Nimal (lab manager), Admin. A few extra students to make fairness meaningful.
- **Resources:** ~8–10 across all four classes (Lab-A, Lab-B computer labs; 2 meeting rooms; multimedia kit; testing devices), with buildings/capacity/equipment.
- **History:** ~2–4 weeks of past bookings so the fairness ledger shows real over-/under-served drift (e.g. a couple of students monopolising prime slots).
- **Policy settings** seeded with proposal defaults (§4.8).
- A scripted "Sarah vs Mihir, Lab-A, 14:00 Tue" setup so the marquee demo is one click.

---

## 8. Explicitly cut → stretch (state in the limitations section)

PWA service worker / offline (F-02) · Holt-Winters demand forecast (F-09) · live Trigger.dev/pg_cron scheduling (replaced by demo buttons; `pg_cron` SQL provided, optional) · Edge Functions (→ RPC) · real auth (→ persona switcher). Each gets a one-line honest "why" — judges reward this.

---

## 9. Deliverables & what's needed from the team

| Deliverable | Owner | Notes |
|---|---|---|
| Public GitHub repo + README (setup/run) | Claude drafts | Team makes repo public, pushes, submits link |
| `CIPHER2_SegfaultSociety_Documentation.pdf` (3–5 pp: problem, solution, core logic, architecture, limitations) | Claude drafts content | **Team exports to PDF + verifies name** |
| Demo video (core workflow in action) | Claude writes storyboard/script | **Team records + uploads to Google Drive (shared)** |
| Live link (optional) | If time | **Team provides Vercel + Supabase Cloud creds** if we deploy |

**From your end:** (1) confirm team name string is exactly **"SegfaultSociety"** for the file name; (2) record + upload the demo video; (3) export the docs to PDF and submit through the portal before **26 June 10:00 AM**; (4) optionally provide deploy creds if we go for the live link; (5) make the GitHub repo public and push.

---

## 10. Build sequence (high level; granular commit plan in the implementation plan)

1. Branch `synapse-prototype`; rebrand (cyan theme, wordmark); strip/neutralise the unused demo home.
2. Migration: enums + 7 tables + `btree_gist` + EXCLUDE constraint + RLS (open SELECT, revoked writes) + indexes.
3. Migration: engine RPCs (`priority_score`, `book_request`, `simulate_contention`, lifecycle RPCs). Regenerate types.
4. `seed.sql` + `supabase db reset`; verify the marquee scenario via Studio/SQL.
5. Persona store + switcher + cyan shell.
6. Discovery + resource detail + Decision Modal (the core booking flow E2E).
7. `/me` (cancel/check-in/swap) + Realtime wiring.
8. `/admin` (fairness dashboard, policy editor, audit viewer, ops buttons).
9. `/demo` control room (simulate_contention).
10. README + documentation draft + demo storyboard; type-check + manual QA pass; (optional) deploy.

---

## 11. Risks & mitigations

- **Time (3 days):** ruthless scope; engine first (Symbiote's Guide: "Start with the algorithm, not the interface"). Surfaces degrade gracefully if cut.
- **Realtime flakiness locally:** hooks fall back to refetch-on-mutation (the `use-items` pattern already does optimistic local updates), so the demo works even if a socket drops.
- **`btree_gist` availability:** standard in Supabase Postgres; `create extension if not exists btree_gist` in the migration.
- **Persona/RLS confusion:** writes only via RPC; a single documented rule keeps it consistent.
- **Over-claiming:** docs are honest about cuts; matches the rubric's stated preference.
