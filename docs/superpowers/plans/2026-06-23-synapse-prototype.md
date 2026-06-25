# SYNAPSE Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working Next.js + Supabase prototype that demonstrates Synapse's core allocation engine — conflict-free arbitration, transparent priority scoring, smart waitlists, fairness rebalance, swap — with a decision-explainer that shows judges *why* every allocation happened.

**Architecture:** All state mutations are `SECURITY DEFINER` Postgres RPCs called via `supabase.rpc()`; double-booking is made physically impossible by a `tstzrange` + GiST exclusion constraint. A persona switcher (no login) passes `actor_id` to every RPC. Five Next.js App Router surfaces read open `SELECT` tables and update live via Supabase Realtime.

**Tech Stack:** Next.js 16.2.6 / React 19.2.6, Supabase (Postgres 17, `@supabase/ssr` 0.9, `supabase-js` 2.100), Zustand 5, Tailwind v4 (OKLCH), shadcn/ui (54 components), TypeScript strict, pnpm.

## How to read this plan
- **DB tasks (2–8): full SQL is provided** — implement verbatim, then run the SQL assertion test. These are the crown jewels.
- **UI tasks (9–16): full code for novel/central pieces** (persona store, realtime hook, Decision Modal); **precise spec + interfaces + "mirror `<template file>`"** for routine list/grid components. The existing template files named are unambiguous patterns to copy.
- **Testing reality:** engine = SQL `ASSERT` scripts via `psql` (genuine TDD on the algorithm). UI = `pnpm exec tsc --noEmit` + explicit manual QA steps with expected outcomes. The rubric does not reward a UI test suite; it rewards a working, demoable flow.

## Global Constraints
- Branch: all work on `synapse-prototype` (already created and checked out).
- Migrations: timestamp-prefixed `supabase/migrations/YYYYMMDDHHMMSS_*.sql`; lowercase SQL; functions `language plpgsql … security definer … set search_path = ''`; fully schema-qualify (`public.<name>`). Follow the template's existing style.
- After any migration that changes schema or RPC signatures: regenerate `lib/types/database.types.ts`.
- Writes occur **only** through RPCs; direct table DML is revoked from `anon`/`authenticated`. RLS `SELECT` is open (the live availability feed is public by design).
- Persona id (`actor_id`) is passed explicitly to RPCs (production swaps to `auth.uid()` — documented, do not change for the demo).
- Local DB URL for tests: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
- Brand: SYNAPSE, accent cyan/teal (OKLCH hue ≈ 200°). Keep UI clean — no decorative animations (rubric).
- Deadline: 26 June 2026, 10:00 AM. Engine before interface (Symbiote's Guide).
- Team name string for deliverables: `SegfaultSociety`.

---

## File structure

**Database (new):**
- `supabase/migrations/20260623100000_synapse_schema.sql` — extensions, enums, 7 tables, EXCLUDE constraint, indexes, RLS, grants, realtime publication, `policy_settings` seed.
- `supabase/migrations/20260623100100_fn_helpers.sql` — `member_score_obj`, `accrue_served_hours`, `compute_counterfactuals`, `promote_top_waitlist`.
- `supabase/migrations/20260623100200_fn_priority_score.sql` — `priority_score`.
- `supabase/migrations/20260623100300_fn_book_request.sql` — `book_request`.
- `supabase/migrations/20260623100400_fn_simulate_contention.sql` — `simulate_contention`.
- `supabase/migrations/20260623100500_fn_lifecycle.sql` — `cancel_booking`, `check_in`, `run_no_show_reaper`, `run_fairness_rebalance`, `propose_swap`, `mass_cancel`.
- `supabase/seed.sql` — personas, resources, ~3 weeks history, ends by calling `run_fairness_rebalance()`.
- `supabase/tests/*.sql` — assertion scripts per RPC.

**App (new/modified):**
- `lib/store/persona-store.ts` (new) — Zustand actor store.
- `lib/synapse/types.ts` (new) — shared TS types (Explainer, Decision, etc.) + RPC wrappers.
- `hooks/use-realtime-table.ts` (new) — generic Realtime subscription helper.
- `hooks/use-resources.ts`, `use-bookings.ts`, `use-waitlists.ts`, `use-fairness.ts`, `use-audit-log.ts`, `use-policy.ts` (new).
- `components/synapse/persona-switcher.tsx`, `resource-card.tsx`, `resource-grid.tsx`, `slot-picker.tsx`, `booking-form.tsx`, `decision-modal.tsx`, `score-bars.tsx`, `my-bookings.tsx`, `fairness-dashboard.tsx`, `policy-editor.tsx`, `audit-viewer.tsx`, `ops-panel.tsx`, `demo-control-room.tsx` (new).
- `components/synapse/synapse-header.tsx` (new) — wordmark + persona switcher.
- `app/page.tsx` (rework) — Discovery.
- `app/resources/[id]/page.tsx` (new) — resource detail + booking.
- `app/me/page.tsx` (new) — my bookings.
- `app/admin/page.tsx` (rework) — admin console (persona-role gated).
- `app/demo/page.tsx` (new) — contention control room.
- `app/globals.css` (modify) — cyan theme tokens.
- `app/layout.tsx` (modify) — metadata/title → SYNAPSE.

**Docs (new):**
- `README.md` (rework) — setup/run/demo.
- `docs/CIPHER2_SegfaultSociety_Documentation.md` (new) — source for the submission PDF.
- `docs/DEMO_STORYBOARD.md` (new) — video script.

---

## Task 1: Branch ready + SYNAPSE rebrand

**Files:**
- Modify: `app/globals.css` (`:root` and `.dark` accent tokens)
- Modify: `app/layout.tsx` (metadata title/description)

**Interfaces:**
- Produces: cyan theme tokens available to all components; `<title>` = "SYNAPSE".

- [ ] **Step 1: Confirm branch**

Run: `git branch --show-current`
Expected: `synapse-prototype`

- [ ] **Step 2: Retheme accent to cyan/teal**

In `app/globals.css`, replace the purple primary/accent/ring in BOTH `:root` and `.dark`. In `:root` set:
```css
  --primary: oklch(0.55 0.13 200);
  --primary-foreground: oklch(0.99 0 0);
  --accent: oklch(0.7 0.14 195);
  --accent-foreground: oklch(0.15 0 0);
  --ring: oklch(0.55 0.13 200);
```
In `.dark` set:
```css
  --primary: oklch(0.72 0.14 195);
  --primary-foreground: oklch(0.12 0 0);
  --accent: oklch(0.6 0.13 200);
  --accent-foreground: oklch(0.98 0 0);
  --ring: oklch(0.72 0.14 195);
```

- [ ] **Step 3: Update metadata**

In `app/layout.tsx`, set `metadata.title` to `"SYNAPSE — Fairness-aware resource allocation"` and `metadata.description` to `"Real-time, conflict-free, transparent allocation of shared university resources."`.

- [ ] **Step 4: Verify build compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "chore: rebrand template to SYNAPSE (cyan theme, metadata)"
```

---

## Task 2: Database schema (7 tables + exclusion constraint + RLS + policy seed)

**Files:**
- Create: `supabase/migrations/20260623100000_synapse_schema.sql`
- Test: `supabase/tests/test_schema.sql`

**Interfaces:**
- Produces: tables `members, resources, bookings, waitlists, fairness_ledger, audit_log, policy_settings`; enums `synapse_role, resource_class, booking_status, waitlist_status, audit_kind`; the `bookings_no_overlap` EXCLUDE constraint; seeded `policy_settings`.

- [ ] **Step 1: Write the assertion test**

Create `supabase/tests/test_schema.sql`:
```sql
-- exclusion constraint must block an overlapping confirmed booking
do $$
declare m uuid; r uuid;
begin
  insert into public.members(full_name, role) values ('T1','student') returning id into m;
  insert into public.resources(name, resource_class) values ('TLab','computer_lab') returning id into r;
  insert into public.bookings(member_id, resource_id, during, status)
    values (m, r, tstzrange(now(), now()+interval '1 hour','[)'), 'confirmed');
  begin
    insert into public.bookings(member_id, resource_id, during, status)
      values (m, r, tstzrange(now()+interval '30 min', now()+interval '90 min','[)'), 'confirmed');
    raise exception 'TEST FAILED: overlap was allowed';
  exception when exclusion_violation then
    raise notice 'OK: overlap blocked';
  end;
  -- a cancelled overlapping booking must be allowed (partial index)
  insert into public.bookings(member_id, resource_id, during, status)
    values (m, r, tstzrange(now()+interval '30 min', now()+interval '90 min','[)'), 'cancelled');
  assert (select count(*) from public.policy_settings) >= 12, 'policy_settings seeded';
  raise notice 'SCHEMA TESTS PASSED';
end $$;
```

- [ ] **Step 2: Run it to verify it fails (no tables yet)**

Run: `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/test_schema.sql`
Expected: ERROR `relation "public.members" does not exist`. (Run `supabase start` first if the DB is down.)

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260623100000_synapse_schema.sql`:
```sql
-- SYNAPSE schema: enums, entities, exclusion constraint, RLS, policy seed
create extension if not exists btree_gist;

create type public.synapse_role    as enum ('student','faculty','lab_manager','admin');
create type public.resource_class  as enum ('meeting_room','computer_lab','multimedia_equipment','testing_device');
create type public.booking_status  as enum ('confirmed','cancelled','completed','no_show');
create type public.waitlist_status as enum ('waiting','promoted','expired','cancelled');
create type public.audit_kind      as enum (
  'booking_confirmed','booking_waitlisted','conflict_resolved','booking_cancelled',
  'check_in','no_show_released','fairness_rebalance','swap','admin_override','mass_cancel');

create table public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  role public.synapse_role not null default 'student',
  year_level int,
  is_final_year boolean not null default false,
  department text,
  created_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  resource_class public.resource_class not null,
  building text,
  capacity int not null default 1,
  equipment jsonb not null default '[]'::jsonb,
  is_available boolean not null default true,
  policy_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  during tstzrange not null,
  status public.booking_status not null default 'confirmed',
  checked_in_at timestamptz,
  purpose text,
  request_id uuid,
  created_at timestamptz not null default now(),
  constraint bookings_no_overlap exclude using gist (
    resource_id with =, during with &&
  ) where (status = 'confirmed')
);
create index idx_bookings_resource_status on public.bookings (resource_id, status);
create index idx_bookings_member on public.bookings (member_id);
create index idx_bookings_during on public.bookings using gist (during);

create table public.waitlists (
  id uuid primary key default gen_random_uuid(),
  request_id uuid,
  member_id uuid not null references public.members(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  during tstzrange not null,
  score numeric,
  rank int,
  score_components jsonb,
  status public.waitlist_status not null default 'waiting',
  created_at timestamptz not null default now()
);
create index idx_waitlists_resource on public.waitlists (resource_id, status);

create table public.fairness_ledger (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  resource_class public.resource_class not null,
  served_hours numeric not null default 0,
  fair_share numeric not null default 0,
  fairness_term numeric not null default 0,
  window_start date,
  window_end date,
  updated_at timestamptz not null default now(),
  unique (member_id, resource_class)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  kind public.audit_kind not null,
  actor_id uuid references public.members(id) on delete set null,
  resource_id uuid references public.resources(id) on delete set null,
  booking_id uuid,
  request_id uuid,
  payload jsonb not null default '{}'::jsonb,
  decision_explainer jsonb,
  occurred_at timestamptz not null default now()
);
create index idx_audit_occurred on public.audit_log (occurred_at desc);
create index idx_audit_request on public.audit_log (request_id);

create table public.policy_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  numeric_value numeric,
  label text,
  category text,
  updated_at timestamptz not null default now()
);

insert into public.policy_settings (key, numeric_value, label, category) values
  ('alpha', 0.25, 'Urgency weight (α)', 'weights'),
  ('beta', 0.30, 'Role weight (β)', 'weights'),
  ('gamma', 0.30, 'Fairness weight (γ)', 'weights'),
  ('delta', 0.10, 'Recency penalty weight (δ)', 'weights'),
  ('epsilon', 0.05, 'Academic-purpose weight (ε)', 'weights'),
  ('role_weight_faculty', 1.0, 'Role weight: faculty', 'roles'),
  ('role_weight_final_year', 0.8, 'Role weight: final-year', 'roles'),
  ('role_weight_postgrad', 0.6, 'Role weight: postgrad', 'roles'),
  ('role_weight_undergrad', 0.4, 'Role weight: undergrad', 'roles'),
  ('no_show_grace_minutes', 10, 'No-show grace (minutes)', 'ops'),
  ('fairness_window_days', 30, 'Fairness window (days)', 'ops'),
  ('recency_window_days', 7, 'Recency window (days)', 'ops'),
  ('urgency_horizon_hours', 168, 'Urgency horizon (hours)', 'ops');

-- RLS: open read (public availability feed), no direct writes (RPC-only)
alter table public.members         enable row level security;
alter table public.resources       enable row level security;
alter table public.bookings        enable row level security;
alter table public.waitlists       enable row level security;
alter table public.fairness_ledger enable row level security;
alter table public.audit_log       enable row level security;
alter table public.policy_settings enable row level security;

create policy "read members"   on public.members         for select using (true);
create policy "read resources" on public.resources       for select using (true);
create policy "read bookings"  on public.bookings         for select using (true);
create policy "read waitlists" on public.waitlists        for select using (true);
create policy "read fairness"  on public.fairness_ledger  for select using (true);
create policy "read audit"     on public.audit_log        for select using (true);
create policy "read policy"    on public.policy_settings  for select using (true);

grant select on public.members, public.resources, public.bookings, public.waitlists,
  public.fairness_ledger, public.audit_log, public.policy_settings to anon, authenticated;
revoke insert, update, delete on public.members, public.resources, public.bookings,
  public.waitlists, public.fairness_ledger, public.audit_log, public.policy_settings
  from anon, authenticated;

-- Realtime fan-out
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.waitlists;
alter publication supabase_realtime add table public.audit_log;
```

- [ ] **Step 4: Apply and run the test**

Run: `supabase db reset && psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/test_schema.sql`
Expected: ends with `NOTICE: SCHEMA TESTS PASSED` and exit code 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260623100000_synapse_schema.sql supabase/tests/test_schema.sql
git commit -m "feat(db): synapse schema, exclusion constraint, RLS, policy seed"
```

---

## Task 3: Engine helper functions

**Files:**
- Create: `supabase/migrations/20260623100100_fn_helpers.sql`
- Test: `supabase/tests/test_helpers.sql`

**Interfaces:**
- Produces:
  - `public.member_score_obj(p_member_id uuid, p_score jsonb) → jsonb` → `{member_id,name,role,score,components}`
  - `public.accrue_served_hours(p_member_id uuid, p_class public.resource_class, p_start timestamptz, p_end timestamptz) → void`
  - `public.promote_top_waitlist(p_resource_id uuid, p_during tstzrange) → uuid` (new booking id or null)
  - `public.compute_counterfactuals(p_member_id uuid, p_resource_id uuid, p_start timestamptz, p_end timestamptz, p_purpose text) → jsonb`
- Consumes: `priority_score` (Task 4) — note `compute_counterfactuals` calls `priority_score`, so this migration ordering relies on Task 4 being applied; both are applied together on `db reset`. Order the priority_score migration timestamp (100200) AFTER helpers (100100) is fine because functions are only resolved at call time, not creation time.

- [ ] **Step 1: Write the assertion test**

Create `supabase/tests/test_helpers.sql`:
```sql
do $$
declare m uuid; r uuid; ft numeric; bid uuid;
begin
  insert into public.members(full_name, role) values ('H1','student') returning id into m;
  insert into public.resources(name, resource_class) values ('HLab','computer_lab') returning id into r;
  perform public.accrue_served_hours(m, 'computer_lab', now(), now()+interval '2 hours');
  select served_hours into ft from public.fairness_ledger where member_id=m and resource_class='computer_lab';
  assert ft = 2, 'served_hours should be 2, got '||ft;
  perform public.accrue_served_hours(m, 'computer_lab', now(), now()+interval '1 hour');
  select served_hours into ft from public.fairness_ledger where member_id=m and resource_class='computer_lab';
  assert ft = 3, 'served_hours should accumulate to 3, got '||ft;
  -- promote_top_waitlist returns null when queue empty
  assert public.promote_top_waitlist(r, tstzrange(now(),now()+interval '1 hour','[)')) is null, 'empty queue -> null';
  raise notice 'HELPER TESTS PASSED';
end $$;
```

- [ ] **Step 2: Run to verify it fails**

Run: `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/test_helpers.sql`
Expected: ERROR `function public.accrue_served_hours(...) does not exist`.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260623100100_fn_helpers.sql`:
```sql
create or replace function public.member_score_obj(p_member_id uuid, p_score jsonb)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'member_id', m.id, 'name', m.full_name, 'role', m.role,
    'score', (p_score->>'total')::numeric, 'components', p_score->'components')
  from public.members m where m.id = p_member_id;
$$;

create or replace function public.accrue_served_hours(
  p_member_id uuid, p_class public.resource_class, p_start timestamptz, p_end timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare hrs numeric;
begin
  hrs := greatest(0, extract(epoch from (p_end - p_start))/3600.0);
  insert into public.fairness_ledger (member_id, resource_class, served_hours)
  values (p_member_id, p_class, hrs)
  on conflict (member_id, resource_class) do update
    set served_hours = public.fairness_ledger.served_hours + excluded.served_hours,
        updated_at = now();
end;
$$;

create or replace function public.promote_top_waitlist(p_resource_id uuid, p_during tstzrange)
returns uuid language plpgsql security definer set search_path = '' as $$
declare top public.waitlists; new_booking_id uuid; cls public.resource_class;
begin
  select * into top from public.waitlists
    where resource_id = p_resource_id and status = 'waiting' and during && p_during
    order by score desc nulls last, rank asc, created_at asc limit 1;
  if not found then return null; end if;
  select resource_class into cls from public.resources where id = p_resource_id;
  insert into public.bookings (member_id, resource_id, during, status, request_id)
    values (top.member_id, p_resource_id, top.during, 'confirmed', gen_random_uuid())
    returning id into new_booking_id;
  perform public.accrue_served_hours(top.member_id, cls, lower(top.during), upper(top.during));
  update public.waitlists set status = 'promoted' where id = top.id;
  return new_booking_id;
end;
$$;

create or replace function public.compute_counterfactuals(
  p_member_id uuid, p_resource_id uuid, p_start timestamptz, p_end timestamptz, p_purpose text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r public.resources; alt public.resources; cf jsonb := '[]'::jsonb;
        ns timestamptz := p_start + interval '1 day'; ne timestamptz := p_end + interval '1 day';
        busy boolean; s jsonb;
begin
  select * into r from public.resources where id = p_resource_id;
  select exists(select 1 from public.bookings where resource_id = p_resource_id
    and status = 'confirmed' and during && tstzrange(ns, ne, '[)')) into busy;
  if not busy then
    s := public.priority_score(p_member_id, p_resource_id, ns, ne, p_purpose);
    cf := cf || jsonb_build_array(jsonb_build_object(
      'kind','alternate_slot','label', to_char(ns,'Dy HH24:00'),
      'resource', r.name, 'score', (s->>'total')::numeric));
  end if;
  select * into alt from public.resources ar
    where ar.resource_class = r.resource_class and ar.id <> p_resource_id and ar.is_available
      and not exists(select 1 from public.bookings b where b.resource_id = ar.id
        and b.status='confirmed' and b.during && tstzrange(p_start, p_end, '[)'))
    limit 1;
  if found then
    s := public.priority_score(p_member_id, alt.id, p_start, p_end, p_purpose);
    cf := cf || jsonb_build_array(jsonb_build_object(
      'kind','alternate_resource','label', alt.name, 'score', (s->>'total')::numeric));
  end if;
  return cf;
end;
$$;

grant execute on function public.member_score_obj, public.accrue_served_hours,
  public.promote_top_waitlist, public.compute_counterfactuals to anon, authenticated;
```

- [ ] **Step 4: Apply and test**

Run: `supabase db reset && psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/test_helpers.sql`
Expected: `NOTICE: HELPER TESTS PASSED`. (`compute_counterfactuals` is created here but only called after Task 4 exists; reset applies all migrations.)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260623100100_fn_helpers.sql supabase/tests/test_helpers.sql
git commit -m "feat(db): engine helper functions (score obj, accrual, promote, counterfactuals)"
```

---

## Task 4: `priority_score` (Formula 1)

**Files:**
- Create: `supabase/migrations/20260623100200_fn_priority_score.sql`
- Test: `supabase/tests/test_priority_score.sql`

**Interfaces:**
- Produces: `public.priority_score(p_member_id uuid, p_resource_id uuid, p_start timestamptz, p_end timestamptz, p_purpose text default null) → jsonb` returning `{total, components:{urgency, role_weight, fairness_deficit, recency_penalty, academic_purpose}}`.
- Consumes: `policy_settings` (Task 2), `fairness_ledger`/`bookings` (Task 2).
- **Refinement vs spec §5.1:** added `p_purpose text default null` so the ε term can be computed (spec lists `academic_purpose` as a component).

- [ ] **Step 1: Write the assertion test**

Create `supabase/tests/test_priority_score.sql`:
```sql
do $$
declare faculty uuid; ug uuid; r uuid; sf jsonb; su jsonb;
begin
  insert into public.members(full_name, role) values ('Prof','faculty') returning id into faculty;
  insert into public.members(full_name, role, year_level, is_final_year)
    values ('FreshY1','student',1,false) returning id into ug;
  insert into public.resources(name, resource_class) values ('PLab','computer_lab') returning id into r;
  sf := public.priority_score(faculty, r, now()+interval '2 hours', now()+interval '3 hours', 'meeting');
  su := public.priority_score(ug,      r, now()+interval '2 hours', now()+interval '3 hours', 'casual');
  -- faculty role weight (1.0) > undergrad (0.4): faculty total must exceed undergrad total
  assert (sf->>'total')::numeric > (su->>'total')::numeric,
    'faculty should outscore undergrad: '||(sf->>'total')||' vs '||(su->>'total');
  -- components present
  assert sf->'components' ? 'urgency', 'urgency component present';
  assert sf->'components' ? 'role_weight', 'role_weight component present';
  -- urgency higher for sooner start
  assert (public.priority_score(ug,r,now()+interval '1 hour',now()+interval '2 hours','x')->'components'->>'urgency')::numeric
       > (public.priority_score(ug,r,now()+interval '120 hours',now()+interval '121 hours','x')->'components'->>'urgency')::numeric,
    'sooner start => higher urgency';
  raise notice 'PRIORITY TESTS PASSED';
end $$;
```

- [ ] **Step 2: Run to verify it fails**

Run: `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/test_priority_score.sql`
Expected: ERROR `function public.priority_score(...) does not exist`.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260623100200_fn_priority_score.sql`:
```sql
create or replace function public.priority_score(
  p_member_id uuid, p_resource_id uuid,
  p_start timestamptz, p_end timestamptz, p_purpose text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  m public.members; r public.resources;
  w_alpha numeric; w_beta numeric; w_gamma numeric; w_delta numeric; w_eps numeric;
  horizon numeric; recency_window int;
  hours_until numeric; urgency numeric; role_w numeric; fairness numeric;
  recency numeric; purpose_match numeric; recent_count int; total numeric;
begin
  select * into m from public.members where id = p_member_id;
  select * into r from public.resources where id = p_resource_id;

  select numeric_value into w_alpha from public.policy_settings where key='alpha';
  select numeric_value into w_beta  from public.policy_settings where key='beta';
  select numeric_value into w_gamma from public.policy_settings where key='gamma';
  select numeric_value into w_delta from public.policy_settings where key='delta';
  select numeric_value into w_eps   from public.policy_settings where key='epsilon';
  select numeric_value into horizon from public.policy_settings where key='urgency_horizon_hours';
  select numeric_value::int into recency_window from public.policy_settings where key='recency_window_days';

  hours_until := greatest(0, extract(epoch from (p_start - now()))/3600.0);
  urgency := greatest(0, 1 - hours_until / nullif(horizon,0));
  if hours_until <= 48 then urgency := least(1, urgency + 0.15); end if;

  role_w := case
    when m.role = 'faculty' then (select numeric_value from public.policy_settings where key='role_weight_faculty')
    when m.role in ('lab_manager','admin') then (select numeric_value from public.policy_settings where key='role_weight_faculty')
    when m.role = 'student' and m.is_final_year then (select numeric_value from public.policy_settings where key='role_weight_final_year')
    when m.role = 'student' and coalesce(m.year_level,1) >= 4 then (select numeric_value from public.policy_settings where key='role_weight_postgrad')
    else (select numeric_value from public.policy_settings where key='role_weight_undergrad')
  end;
  role_w := coalesce(role_w, 0.4);

  select coalesce(fairness_term,0) into fairness from public.fairness_ledger
    where member_id = p_member_id and resource_class = r.resource_class;
  fairness := coalesce(fairness, 0);

  select count(*) into recent_count from public.bookings b
    where b.member_id = p_member_id and b.resource_id = p_resource_id and b.status='confirmed'
      and lower(b.during) >= now() - make_interval(days => recency_window);
  recency := least(1, recent_count / 2.0);

  purpose_match := case
    when p_purpose is null then 0
    when r.resource_class='multimedia_equipment' and p_purpose ~* '(thesis|defen[cs]e|present|viva)' then 1
    when r.resource_class='computer_lab' and p_purpose ~* '(capstone|project|exam|test|lab)' then 1
    when r.resource_class='meeting_room' and p_purpose ~* '(meeting|standup|review|interview)' then 1
    when r.resource_class='testing_device' and p_purpose ~* '(test|qa|device|measure)' then 1
    else 0 end;

  total := w_alpha*urgency + w_beta*role_w + w_gamma*fairness - w_delta*recency + w_eps*purpose_match;

  return jsonb_build_object(
    'total', round(total, 4),
    'components', jsonb_build_object(
      'urgency', round(urgency,4), 'role_weight', round(role_w,4),
      'fairness_deficit', round(fairness,4), 'recency_penalty', round(recency,4),
      'academic_purpose', purpose_match));
end;
$$;

grant execute on function public.priority_score to anon, authenticated;
```

- [ ] **Step 4: Apply and test**

Run: `supabase db reset && psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/test_priority_score.sql`
Expected: `NOTICE: PRIORITY TESTS PASSED`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260623100200_fn_priority_score.sql supabase/tests/test_priority_score.sql
git commit -m "feat(db): priority_score (transparent weighted Formula 1)"
```

---

## Task 5: `book_request` (idempotency + advisory lock + arbitration)

**Files:**
- Create: `supabase/migrations/20260623100300_fn_book_request.sql`
- Test: `supabase/tests/test_book_request.sql`

**Interfaces:**
- Produces: `public.book_request(p_actor_id uuid, p_resource_id uuid, p_start timestamptz, p_end timestamptz, p_purpose text default null, p_request_id uuid default gen_random_uuid()) → jsonb`. Returns `{status, booking_id?, winner_id?, demoted?, rank?, ahead_of?, explainer}` where `status ∈ {confirmed, confirmed_by_priority, waitlisted, rejected, idempotent_replay}`.
- Consumes: `priority_score`, `member_score_obj`, `accrue_served_hours`, `compute_counterfactuals`.

- [ ] **Step 1: Write the assertion test**

Create `supabase/tests/test_book_request.sql`:
```sql
do $$
declare sarah uuid; mihir uuid; r uuid; s timestamptz := date_trunc('hour',now())+interval '26 hours';
        e timestamptz := date_trunc('hour',now())+interval '27 hours';
        d1 jsonb; d2 jsonb; rid uuid := gen_random_uuid();
begin
  insert into public.members(full_name, role, year_level, is_final_year)
    values ('Sarah','student',4,true) returning id into sarah;
  insert into public.members(full_name, role, year_level, is_final_year)
    values ('Mihir','student',1,false) returning id into mihir;
  insert into public.resources(name, resource_class) values ('Lab-A','computer_lab') returning id into r;

  d1 := public.book_request(sarah, r, s, e, 'capstone', gen_random_uuid());
  assert d1->>'status' = 'confirmed', 'Sarah should confirm empty slot, got '||(d1->>'status');

  -- Mihir (lower priority) conflicts -> waitlisted
  d2 := public.book_request(mihir, r, s, e, 'casual', rid);
  assert d2->>'status' = 'waitlisted', 'Mihir should be waitlisted, got '||(d2->>'status');
  assert d2->'explainer'->'winner'->>'name' = 'Sarah', 'explainer names Sarah as winner';
  assert jsonb_array_length(d2->'explainer'->'contenders') >= 1, 'contenders present';

  -- idempotency: same request_id returns replay
  assert (public.book_request(mihir, r, s, e, 'casual', rid))->>'status' = 'idempotent_replay', 'replay';

  -- only ONE confirmed booking exists on the slot
  assert (select count(*) from public.bookings where resource_id=r and status='confirmed' and during && tstzrange(s,e,'[)')) = 1,
    'exactly one confirmed booking on slot';
  raise notice 'BOOK_REQUEST TESTS PASSED';
end $$;
```

- [ ] **Step 2: Run to verify it fails**

Run: `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/test_book_request.sql`
Expected: ERROR `function public.book_request(...) does not exist`.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260623100300_fn_book_request.sql`:
```sql
create or replace function public.book_request(
  p_actor_id uuid, p_resource_id uuid, p_start timestamptz, p_end timestamptz,
  p_purpose text default null, p_request_id uuid default gen_random_uuid())
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.resources; prior public.audit_log; conflict_b public.bookings;
  req_score jsonb; inc_score jsonb; req_total numeric; inc_total numeric;
  explainer jsonb; cf jsonb; new_id uuid; v_rank int;
begin
  select * into prior from public.audit_log where request_id = p_request_id limit 1;
  if found then
    return jsonb_build_object('status','idempotent_replay','explainer', prior.decision_explainer);
  end if;

  select * into r from public.resources where id = p_resource_id;
  if not found then return jsonb_build_object('status','rejected','reason','resource not found'); end if;
  if not r.is_available then return jsonb_build_object('status','rejected','reason','resource unavailable'); end if;

  perform pg_advisory_xact_lock(hashtext(p_resource_id::text));

  select * into conflict_b from public.bookings
    where resource_id = p_resource_id and status='confirmed'
      and during && tstzrange(p_start, p_end, '[)')
    order by lower(during) limit 1;

  cf := public.compute_counterfactuals(p_actor_id, p_resource_id, p_start, p_end, p_purpose);
  req_score := public.priority_score(p_actor_id, p_resource_id, p_start, p_end, p_purpose);

  if not found then
    insert into public.bookings (member_id, resource_id, during, status, purpose, request_id)
      values (p_actor_id, p_resource_id, tstzrange(p_start,p_end,'[)'), 'confirmed', p_purpose, p_request_id)
      returning id into new_id;
    perform public.accrue_served_hours(p_actor_id, r.resource_class, p_start, p_end);
    explainer := jsonb_build_object('status','confirmed',
      'winner', public.member_score_obj(p_actor_id, req_score),
      'contenders','[]'::jsonb, 'counterfactuals', cf);
    insert into public.audit_log (kind, actor_id, resource_id, booking_id, request_id, decision_explainer)
      values ('booking_confirmed', p_actor_id, p_resource_id, new_id, p_request_id, explainer);
    return jsonb_build_object('status','confirmed','booking_id',new_id,'explainer',explainer);
  end if;

  inc_score := public.priority_score(conflict_b.member_id, p_resource_id,
    lower(conflict_b.during), upper(conflict_b.during), conflict_b.purpose);
  req_total := (req_score->>'total')::numeric;
  inc_total := (inc_score->>'total')::numeric;

  if req_total > inc_total or (req_total = inc_total and p_actor_id < conflict_b.member_id) then
    update public.bookings set status='cancelled' where id = conflict_b.id;
    insert into public.waitlists (request_id, member_id, resource_id, during, score, score_components, status, rank)
      values (gen_random_uuid(), conflict_b.member_id, p_resource_id, conflict_b.during,
              inc_total, inc_score->'components', 'waiting', 1);
    insert into public.bookings (member_id, resource_id, during, status, purpose, request_id)
      values (p_actor_id, p_resource_id, tstzrange(p_start,p_end,'[)'), 'confirmed', p_purpose, p_request_id)
      returning id into new_id;
    perform public.accrue_served_hours(p_actor_id, r.resource_class, p_start, p_end);
    explainer := jsonb_build_object('status','confirmed_by_priority',
      'winner', public.member_score_obj(p_actor_id, req_score),
      'contenders', jsonb_build_array(public.member_score_obj(conflict_b.member_id, inc_score)),
      'counterfactuals', cf);
    insert into public.audit_log (kind, actor_id, resource_id, booking_id, request_id, payload, decision_explainer)
      values ('conflict_resolved', p_actor_id, p_resource_id, new_id, p_request_id,
              jsonb_build_object('demoted', conflict_b.member_id), explainer);
    return jsonb_build_object('status','confirmed_by_priority','booking_id',new_id,
      'demoted', jsonb_build_array(conflict_b.member_id), 'explainer', explainer);
  else
    select coalesce(max(rank),0)+1 into v_rank from public.waitlists
      where resource_id=p_resource_id and during && tstzrange(p_start,p_end,'[)') and status='waiting';
    insert into public.waitlists (request_id, member_id, resource_id, during, score, score_components, status, rank)
      values (p_request_id, p_actor_id, p_resource_id, tstzrange(p_start,p_end,'[)'),
              req_total, req_score->'components', 'waiting', v_rank);
    explainer := jsonb_build_object('status','waitlisted',
      'winner', public.member_score_obj(conflict_b.member_id, inc_score),
      'contenders', jsonb_build_array(public.member_score_obj(p_actor_id, req_score)),
      'counterfactuals', cf);
    insert into public.audit_log (kind, actor_id, resource_id, request_id, payload, decision_explainer)
      values ('booking_waitlisted', p_actor_id, p_resource_id, p_request_id,
              jsonb_build_object('rank', v_rank), explainer);
    return jsonb_build_object('status','waitlisted','rank',v_rank,
      'ahead_of', jsonb_build_array(conflict_b.member_id), 'explainer', explainer);
  end if;
end;
$$;

grant execute on function public.book_request to anon, authenticated;
```

- [ ] **Step 4: Apply and test**

Run: `supabase db reset && psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/test_book_request.sql`
Expected: `NOTICE: BOOK_REQUEST TESTS PASSED`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260623100300_fn_book_request.sql supabase/tests/test_book_request.sql
git commit -m "feat(db): book_request — idempotent, advisory-locked, priority arbitration"
```

---

## Task 6: `simulate_contention` (the showpiece)

**Files:**
- Create: `supabase/migrations/20260623100400_fn_simulate_contention.sql`
- Test: `supabase/tests/test_simulate_contention.sql`

**Interfaces:**
- Produces: `public.simulate_contention(p_resource_id uuid, p_start timestamptz, p_end timestamptz, p_member_ids uuid[]) → jsonb` returning the full explainer `{status:'conflict_resolved', winner, contenders:[{member_id,score,rank,components}], counterfactuals}`.
- Consumes: `priority_score`, `member_score_obj`, `accrue_served_hours`, `compute_counterfactuals`.

- [ ] **Step 1: Write the assertion test**

Create `supabase/tests/test_simulate_contention.sql`:
```sql
do $$
declare faculty uuid; ug uuid; r uuid; out jsonb;
        s timestamptz := now()+interval '5 hours'; e timestamptz := now()+interval '6 hours';
begin
  insert into public.members(full_name, role) values ('Fac','faculty') returning id into faculty;
  insert into public.members(full_name, role, year_level) values ('U1','student',1) returning id into ug;
  insert into public.resources(name, resource_class) values ('SLab','computer_lab') returning id into r;
  out := public.simulate_contention(r, s, e, array[ug, faculty]);  -- order: undergrad first
  -- winner must be faculty regardless of array order (higher role weight)
  assert out->'winner'->>'name' = 'Fac', 'faculty must win by score, got '||(out->'winner'->>'name');
  assert (select count(*) from public.bookings where resource_id=r and status='confirmed' and during && tstzrange(s,e,'[)')) = 1, 'one winner confirmed';
  assert (select count(*) from public.waitlists where resource_id=r and status='waiting' and during && tstzrange(s,e,'[)')) = 1, 'loser waitlisted';
  raise notice 'SIMULATE_CONTENTION TESTS PASSED';
end $$;
```

- [ ] **Step 2: Run to verify it fails**

Run: `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/test_simulate_contention.sql`
Expected: ERROR `function public.simulate_contention(...) does not exist`.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260623100400_fn_simulate_contention.sql`:
```sql
create or replace function public.simulate_contention(
  p_resource_id uuid, p_start timestamptz, p_end timestamptz, p_member_ids uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.resources; mid uuid; s jsonb; scored jsonb := '[]'::jsonb;
  winner_id uuid; winner_score numeric := -1; new_id uuid; rnk int := 0;
  rec record; contenders jsonb := '[]'::jsonb;
begin
  select * into r from public.resources where id = p_resource_id;
  perform pg_advisory_xact_lock(hashtext(p_resource_id::text));

  update public.bookings set status='cancelled'
    where resource_id=p_resource_id and status='confirmed' and during && tstzrange(p_start,p_end,'[)');
  delete from public.waitlists where resource_id=p_resource_id and during && tstzrange(p_start,p_end,'[)');

  foreach mid in array p_member_ids loop
    s := public.priority_score(mid, p_resource_id, p_start, p_end, null);
    scored := scored || jsonb_build_array(public.member_score_obj(mid, s));
    if winner_id is null
       or (s->>'total')::numeric > winner_score
       or ((s->>'total')::numeric = winner_score and mid < winner_id) then
      winner_score := (s->>'total')::numeric; winner_id := mid;
    end if;
  end loop;

  insert into public.bookings (member_id, resource_id, during, status, request_id)
    values (winner_id, p_resource_id, tstzrange(p_start,p_end,'[)'), 'confirmed', gen_random_uuid())
    returning id into new_id;
  perform public.accrue_served_hours(winner_id, r.resource_class, p_start, p_end);

  for rec in
    select (elem->>'member_id')::uuid as member_id, (elem->>'score')::numeric as score, elem->'components' as components
    from jsonb_array_elements(scored) elem
    where (elem->>'member_id')::uuid <> winner_id
    order by (elem->>'score')::numeric desc, (elem->>'member_id')
  loop
    rnk := rnk + 1;
    insert into public.waitlists (request_id, member_id, resource_id, during, score, score_components, status, rank)
      values (gen_random_uuid(), rec.member_id, p_resource_id, tstzrange(p_start,p_end,'[)'),
              rec.score, rec.components, 'waiting', rnk);
    contenders := contenders || jsonb_build_array(jsonb_build_object(
      'member_id', rec.member_id, 'score', rec.score, 'rank', rnk, 'components', rec.components));
  end loop;

  insert into public.audit_log (kind, actor_id, resource_id, booking_id, payload, decision_explainer)
    values ('conflict_resolved', winner_id, p_resource_id, new_id,
            jsonb_build_object('contender_count', array_length(p_member_ids,1)),
            jsonb_build_object('status','conflict_resolved',
              'winner', (select elem from jsonb_array_elements(scored) elem
                         where (elem->>'member_id')::uuid = winner_id limit 1),
              'contenders', contenders,
              'counterfactuals', public.compute_counterfactuals(winner_id, p_resource_id, p_start, p_end, null)))
    returning decision_explainer into s;
  return s;
end;
$$;

grant execute on function public.simulate_contention to anon, authenticated;
```

- [ ] **Step 4: Apply and test**

Run: `supabase db reset && psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/test_simulate_contention.sql`
Expected: `NOTICE: SIMULATE_CONTENTION TESTS PASSED`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260623100400_fn_simulate_contention.sql supabase/tests/test_simulate_contention.sql
git commit -m "feat(db): simulate_contention — N-way deterministic arbitration by score"
```

---

## Task 7: Lifecycle RPCs (cancel/check-in/reaper/rebalance/swap/mass-cancel)

**Files:**
- Create: `supabase/migrations/20260623100500_fn_lifecycle.sql`
- Test: `supabase/tests/test_lifecycle.sql`

**Interfaces:**
- Produces:
  - `public.cancel_booking(p_actor_id uuid, p_booking_id uuid) → jsonb` `{status:'cancelled', promoted_booking}`
  - `public.check_in(p_actor_id uuid, p_booking_id uuid) → jsonb`
  - `public.run_no_show_reaper(p_grace_minutes int default null) → jsonb` `{reaped:[], promoted:[], grace_minutes}`
  - `public.run_fairness_rebalance(p_window_days int default null) → jsonb` `{window_days, report:[{member_id,resource_class,served_hours,fair_share,fairness_term}]}`
  - `public.propose_swap(p_actor_id uuid, p_booking_a uuid, p_booking_b uuid) → jsonb` `{ok, both_gained?|reason, deltas?}`
  - `public.mass_cancel(p_actor_id uuid, p_resource_id uuid, p_reason text default null) → jsonb`
- Consumes: `priority_score`, `promote_top_waitlist`, `accrue_served_hours`.

- [ ] **Step 1: Write the assertion test**

Create `supabase/tests/test_lifecycle.sql`:
```sql
do $$
declare a uuid; b uuid; r uuid; bid uuid; res jsonb;
        s timestamptz := now()+interval '3 hours'; e timestamptz := now()+interval '4 hours';
begin
  insert into public.members(full_name, role, year_level, is_final_year) values ('A','student',4,true) returning id into a;
  insert into public.members(full_name, role, year_level) values ('B','student',1) returning id into b;
  insert into public.resources(name, resource_class) values ('LLab','computer_lab') returning id into r;

  -- A books, B waitlists, cancel A -> B auto-promoted
  perform public.book_request(a, r, s, e, 'capstone', gen_random_uuid());
  perform public.book_request(b, r, s, e, 'casual', gen_random_uuid());
  select id into bid from public.bookings where resource_id=r and status='confirmed' and member_id=a;
  res := public.cancel_booking(a, bid);
  assert res->>'promoted_booking' is not null, 'cancel should auto-promote waitlisted B';
  assert (select count(*) from public.bookings where resource_id=r and member_id=b and status='confirmed')=1, 'B now confirmed';

  -- fairness rebalance produces a report
  res := public.run_fairness_rebalance(30);
  assert jsonb_array_length(res->'report') >= 1, 'rebalance report non-empty';

  raise notice 'LIFECYCLE TESTS PASSED';
end $$;
```

- [ ] **Step 2: Run to verify it fails**

Run: `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/test_lifecycle.sql`
Expected: ERROR `function public.cancel_booking(...) does not exist`.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260623100500_fn_lifecycle.sql`:
```sql
create or replace function public.cancel_booking(p_actor_id uuid, p_booking_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b public.bookings; promoted uuid;
begin
  select * into b from public.bookings where id = p_booking_id;
  if not found then return jsonb_build_object('status','rejected','reason','not found'); end if;
  perform pg_advisory_xact_lock(hashtext(b.resource_id::text));
  update public.bookings set status='cancelled' where id = p_booking_id;
  promoted := public.promote_top_waitlist(b.resource_id, b.during);
  insert into public.audit_log (kind, actor_id, resource_id, booking_id, decision_explainer)
    values ('booking_cancelled', p_actor_id, b.resource_id, p_booking_id,
            jsonb_build_object('status','cancelled','cancelled_booking',p_booking_id,'promoted_booking',promoted));
  return jsonb_build_object('status','cancelled','promoted_booking', promoted);
end;
$$;

create or replace function public.check_in(p_actor_id uuid, p_booking_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b public.bookings;
begin
  update public.bookings set checked_in_at = now()
    where id = p_booking_id and status='confirmed' returning * into b;
  if not found then return jsonb_build_object('status','rejected','reason','not found or not confirmed'); end if;
  insert into public.audit_log (kind, actor_id, resource_id, booking_id, payload)
    values ('check_in', p_actor_id, b.resource_id, p_booking_id, jsonb_build_object('checked_in_at', b.checked_in_at));
  return jsonb_build_object('status','checked_in','booking_id',p_booking_id);
end;
$$;

create or replace function public.run_no_show_reaper(p_grace_minutes int default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare grace int; rec record; reaped jsonb := '[]'::jsonb; promoted jsonb := '[]'::jsonb; pid uuid;
begin
  grace := coalesce(p_grace_minutes, (select numeric_value::int from public.policy_settings where key='no_show_grace_minutes'), 10);
  for rec in
    select * from public.bookings
    where status='confirmed' and checked_in_at is null and lower(during) + make_interval(mins => grace) < now()
  loop
    update public.bookings set status='no_show' where id = rec.id;
    reaped := reaped || jsonb_build_array(rec.id);
    pid := public.promote_top_waitlist(rec.resource_id, rec.during);
    if pid is not null then promoted := promoted || jsonb_build_array(pid); end if;
    insert into public.audit_log (kind, actor_id, resource_id, booking_id, payload)
      values ('no_show_released', rec.member_id, rec.resource_id, rec.id,
              jsonb_build_object('grace_minutes', grace, 'promoted', pid));
  end loop;
  return jsonb_build_object('reaped', reaped, 'promoted', promoted, 'grace_minutes', grace);
end;
$$;

create or replace function public.run_fairness_rebalance(p_window_days int default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare win int; cls public.resource_class; total_hours numeric; active_members int; fshare numeric;
        rec record; report jsonb := '[]'::jsonb; ft numeric;
begin
  win := coalesce(p_window_days, (select numeric_value::int from public.policy_settings where key='fairness_window_days'), 30);
  for cls in select unnest(enum_range(null::public.resource_class)) loop
    select coalesce(sum(extract(epoch from (upper(b.during)-lower(b.during)))/3600.0),0)
      into total_hours from public.bookings b join public.resources r on r.id=b.resource_id
      where r.resource_class=cls and b.status in ('confirmed','completed')
        and lower(b.during) >= now() - make_interval(days => win);
    select count(distinct b.member_id) into active_members
      from public.bookings b join public.resources r on r.id=b.resource_id
      where r.resource_class=cls and b.status in ('confirmed','completed')
        and lower(b.during) >= now() - make_interval(days => win);
    if active_members = 0 then continue; end if;
    fshare := total_hours / active_members;
    for rec in
      select m.id as member_id,
        coalesce((select sum(extract(epoch from (upper(b.during)-lower(b.during)))/3600.0)
                  from public.bookings b join public.resources r on r.id=b.resource_id
                  where b.member_id=m.id and r.resource_class=cls and b.status in ('confirmed','completed')
                    and lower(b.during) >= now() - make_interval(days => win)),0) as served
      from public.members m
    loop
      ft := case when fshare>0 then least(1, greatest(0,(fshare-rec.served)/fshare)) else 0 end;
      insert into public.fairness_ledger (member_id, resource_class, served_hours, fair_share, fairness_term, window_start, window_end, updated_at)
        values (rec.member_id, cls, rec.served, fshare, ft, (now()-make_interval(days=>win))::date, now()::date, now())
        on conflict (member_id, resource_class) do update
          set served_hours=excluded.served_hours, fair_share=excluded.fair_share,
              fairness_term=excluded.fairness_term, window_start=excluded.window_start,
              window_end=excluded.window_end, updated_at=now();
      report := report || jsonb_build_array(jsonb_build_object(
        'member_id', rec.member_id, 'resource_class', cls, 'served_hours', round(rec.served,2),
        'fair_share', round(fshare,2), 'fairness_term', round(ft,3)));
    end loop;
  end loop;
  insert into public.audit_log (kind, payload, decision_explainer)
    values ('fairness_rebalance', jsonb_build_object('window_days', win), jsonb_build_object('report', report));
  return jsonb_build_object('window_days', win, 'report', report);
end;
$$;

create or replace function public.propose_swap(p_actor_id uuid, p_booking_a uuid, p_booking_b uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.bookings; b public.bookings;
        ua_b numeric; ua_a numeric; ub_b numeric; ub_a numeric;
begin
  select * into a from public.bookings where id=p_booking_a and status='confirmed';
  select * into b from public.bookings where id=p_booking_b and status='confirmed';
  if a.id is null or b.id is null then return jsonb_build_object('ok',false,'reason','one or both bookings not active'); end if;
  ua_b := (public.priority_score(a.member_id, a.resource_id, lower(a.during), upper(a.during), a.purpose)->>'total')::numeric;
  ua_a := (public.priority_score(a.member_id, b.resource_id, lower(b.during), upper(b.during), a.purpose)->>'total')::numeric;
  ub_b := (public.priority_score(b.member_id, b.resource_id, lower(b.during), upper(b.during), b.purpose)->>'total')::numeric;
  ub_a := (public.priority_score(b.member_id, a.resource_id, lower(a.during), upper(a.during), b.purpose)->>'total')::numeric;
  if ua_a < ua_b or ub_a < ub_b then
    return jsonb_build_object('ok',false,'reason','one side would lose out',
      'deltas', jsonb_build_object('a_before',ua_b,'a_after',ua_a,'b_before',ub_b,'b_after',ub_a));
  end if;
  perform pg_advisory_xact_lock(hashtext(a.resource_id::text));
  perform pg_advisory_xact_lock(hashtext(b.resource_id::text));
  update public.bookings set status='cancelled' where id in (a.id, b.id);
  insert into public.bookings (member_id, resource_id, during, status, purpose, request_id) values
    (a.member_id, b.resource_id, b.during, 'confirmed', a.purpose, gen_random_uuid()),
    (b.member_id, a.resource_id, a.during, 'confirmed', b.purpose, gen_random_uuid());
  insert into public.audit_log (kind, actor_id, payload, decision_explainer)
    values ('swap', p_actor_id, jsonb_build_object('booking_a',p_booking_a,'booking_b',p_booking_b),
            jsonb_build_object('ok',true,'both_gained',true,
              'deltas', jsonb_build_object('a_before',ua_b,'a_after',ua_a,'b_before',ub_b,'b_after',ub_a)));
  return jsonb_build_object('ok',true,'both_gained',true);
end;
$$;

create or replace function public.mass_cancel(p_actor_id uuid, p_resource_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare rec record; affected jsonb := '[]'::jsonb; cls public.resource_class;
begin
  select resource_class into cls from public.resources where id=p_resource_id;
  perform pg_advisory_xact_lock(hashtext(p_resource_id::text));
  for rec in select * from public.bookings where resource_id=p_resource_id and status='confirmed' loop
    update public.bookings set status='cancelled' where id=rec.id;
    update public.fairness_ledger set fairness_term = least(1, fairness_term + 0.25), updated_at=now()
      where member_id=rec.member_id and resource_class=cls;
    affected := affected || jsonb_build_array(rec.member_id);
    insert into public.audit_log (kind, actor_id, resource_id, booking_id, payload)
      values ('mass_cancel', p_actor_id, p_resource_id, rec.id, jsonb_build_object('reason', p_reason));
  end loop;
  return jsonb_build_object('cancelled_count', jsonb_array_length(affected), 'affected', affected);
end;
$$;

grant execute on function public.cancel_booking, public.check_in, public.run_no_show_reaper,
  public.run_fairness_rebalance, public.propose_swap, public.mass_cancel to anon, authenticated;
```

- [ ] **Step 4: Apply and test**

Run: `supabase db reset && psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/tests/test_lifecycle.sql`
Expected: `NOTICE: LIFECYCLE TESTS PASSED`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260623100500_fn_lifecycle.sql supabase/tests/test_lifecycle.sql
git commit -m "feat(db): lifecycle RPCs — cancel/promote, check-in, reaper, rebalance, swap, mass-cancel"
```

---

## Task 8: Seed data + regenerate types

**Files:**
- Create: `supabase/seed.sql`
- Modify: `lib/types/database.types.ts` (regenerated)

**Interfaces:**
- Produces: 5 named personas + extra students, ~8 resources across 4 classes, ~3 weeks of booking history (skewed so fairness drift is visible), a free "Lab-A · tomorrow 14:00" slot for the live demo, and a populated `fairness_ledger` (seed calls `run_fairness_rebalance()`). Regenerated `Database` type includes the new tables + RPC arg/return shapes.

- [ ] **Step 1: Write the seed**

Create `supabase/seed.sql`:
```sql
-- Named personas (stable UUIDs so the UI can reference them if needed)
insert into public.members (id, full_name, email, role, year_level, is_final_year, department) values
  ('11111111-1111-1111-1111-111111111111','Sarah Fernando','sarah@uni.edu','student',4,true,'CS'),
  ('22222222-2222-2222-2222-222222222222','Mihir Jain','mihir@uni.edu','student',1,false,'CS'),
  ('33333333-3333-3333-3333-333333333333','Dr. Perera','perera@uni.edu','faculty',null,false,'CS'),
  ('44444444-4444-4444-4444-444444444444','Nimal (Lab Manager)','nimal@uni.edu','lab_manager',null,false,'Innovation Centre'),
  ('55555555-5555-5555-5555-555555555555','System Admin','admin@uni.edu','admin',null,false,'IT'),
  ('66666666-6666-6666-6666-666666666666','Tariq (over-served)','tariq@uni.edu','student',2,false,'CS'),
  ('77777777-7777-7777-7777-777777777777','Ana (under-served)','ana@uni.edu','student',3,false,'SE');

insert into public.resources (id, name, resource_class, building, capacity, equipment) values
  ('aaaaaaa1-0000-0000-0000-000000000001','Lab-A','computer_lab','Block A',30,'["dual-monitor","GPU"]'),
  ('aaaaaaa1-0000-0000-0000-000000000002','Lab-B','computer_lab','Block A',24,'["dual-monitor"]'),
  ('aaaaaaa1-0000-0000-0000-000000000003','Meeting Room 1','meeting_room','Block B',8,'["whiteboard","TV"]'),
  ('aaaaaaa1-0000-0000-0000-000000000004','Meeting Room 2','meeting_room','Block B',6,'["whiteboard"]'),
  ('aaaaaaa1-0000-0000-0000-000000000005','AV Studio','multimedia_equipment','Block C',4,'["4K camera","mics","lights"]'),
  ('aaaaaaa1-0000-0000-0000-000000000006','VR Kit','multimedia_equipment','Block C',2,'["VR headset"]'),
  ('aaaaaaa1-0000-0000-0000-000000000007','Oscilloscope Bench','testing_device','Lab Wing',2,'["scope","probes"]'),
  ('aaaaaaa1-0000-0000-0000-000000000008','3D Printer','testing_device','Lab Wing',1,'["PLA"]');

-- ~3 weeks of history: Tariq monopolises Lab-A (over-served), Ana barely books (under-served)
insert into public.bookings (member_id, resource_id, during, status) values
  ('66666666-6666-6666-6666-666666666666','aaaaaaa1-0000-0000-0000-000000000001', tstzrange(now()-interval '18 days', now()-interval '18 days'+interval '3 hours','[)'),'completed'),
  ('66666666-6666-6666-6666-666666666666','aaaaaaa1-0000-0000-0000-000000000001', tstzrange(now()-interval '15 days', now()-interval '15 days'+interval '3 hours','[)'),'completed'),
  ('66666666-6666-6666-6666-666666666666','aaaaaaa1-0000-0000-0000-000000000001', tstzrange(now()-interval '11 days', now()-interval '11 days'+interval '4 hours','[)'),'completed'),
  ('66666666-6666-6666-6666-666666666666','aaaaaaa1-0000-0000-0000-000000000001', tstzrange(now()-interval '7 days',  now()-interval '7 days'+interval '3 hours','[)'),'completed'),
  ('66666666-6666-6666-6666-666666666666','aaaaaaa1-0000-0000-0000-000000000001', tstzrange(now()-interval '3 days',  now()-interval '3 days'+interval '3 hours','[)'),'completed'),
  ('22222222-2222-2222-2222-222222222222','aaaaaaa1-0000-0000-0000-000000000001', tstzrange(now()-interval '9 days',  now()-interval '9 days'+interval '2 hours','[)'),'completed'),
  ('77777777-7777-7777-7777-777777777777','aaaaaaa1-0000-0000-0000-000000000001', tstzrange(now()-interval '12 days', now()-interval '12 days'+interval '1 hours','[)'),'completed'),
  ('11111111-1111-1111-1111-111111111111','aaaaaaa1-0000-0000-0000-000000000001', tstzrange(now()-interval '5 days',  now()-interval '5 days'+interval '2 hours','[)'),'completed');

-- Populate the fairness ledger from this history
select public.run_fairness_rebalance(30);
```

- [ ] **Step 2: Apply seed**

Run: `supabase db reset`
Expected: completes, runs migrations + seed; no errors. (`db reset` runs `seed.sql` automatically.)

- [ ] **Step 3: Verify seed sanity**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select full_name, role from public.members order by created_at;" \
 -c "select count(*) from public.resources;" \
 -c "select m.full_name, fl.resource_class, round(fl.served_hours,1) served, round(fl.fairness_term,2) gamma from public.fairness_ledger fl join public.members m on m.id=fl.member_id where fl.resource_class='computer_lab' order by gamma desc;"
```
Expected: 7 members; 8 resources; fairness_ledger shows Ana/Sarah with higher γ (under-served) and Tariq with γ≈0 (over-served).

- [ ] **Step 4: Regenerate types**

Run: `supabase gen types typescript --local > lib/types/database.types.ts`
Expected: file updated; contains `members`, `resources`, `bookings`, `book_request`, `simulate_contention`, etc.

- [ ] **Step 5: Commit**

```bash
git add supabase/seed.sql lib/types/database.types.ts
git commit -m "feat(db): demo seed (personas, resources, skewed history) + regenerated types"
```

---

## Task 9: Persona store + shared types + Synapse header

**Files:**
- Create: `lib/store/persona-store.ts`
- Create: `lib/synapse/types.ts`
- Create: `components/synapse/persona-switcher.tsx`
- Create: `components/synapse/synapse-header.tsx`

**Interfaces:**
- Produces:
  - `usePersonaStore()` Zustand hook → `{ persona: Member | null, personas: Member[], setPersona(id), loadPersonas() }` where `Member = Database['public']['Tables']['members']['Row']`.
  - `lib/synapse/types.ts`: `Explainer`, `ScoreComponents`, `Decision` types + `getBrowserClient()` re-export.
  - `<PersonaSwitcher />` dropdown; `<SynapseHeader />` (wordmark + switcher + nav links to `/`, `/me`, `/admin`, `/demo`).

- [ ] **Step 1: Write the shared types**

Create `lib/synapse/types.ts`:
```ts
import type { Database } from "@/lib/types/database.types";

export type Member = Database["public"]["Tables"]["members"]["Row"];
export type Resource = Database["public"]["Tables"]["resources"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type Waitlist = Database["public"]["Tables"]["waitlists"]["Row"];
export type FairnessRow = Database["public"]["Tables"]["fairness_ledger"]["Row"];
export type AuditRow = Database["public"]["Tables"]["audit_log"]["Row"];
export type PolicyRow = Database["public"]["Tables"]["policy_settings"]["Row"];

export interface ScoreComponents {
  urgency: number; role_weight: number; fairness_deficit: number;
  recency_penalty: number; academic_purpose: number;
}
export interface ScoredMember {
  member_id: string; name: string; role: string; score: number; components: ScoreComponents;
}
export interface Counterfactual { kind: string; label: string; resource?: string; score: number; }
export interface Explainer {
  status: string; winner: ScoredMember;
  contenders: ScoredMember[]; counterfactuals: Counterfactual[];
}
export interface Decision {
  status: "confirmed" | "confirmed_by_priority" | "waitlisted" | "rejected" | "idempotent_replay";
  booking_id?: string; rank?: number; demoted?: string[]; ahead_of?: string[];
  reason?: string; explainer?: Explainer;
}
```

- [ ] **Step 2: Write the persona store** (mirror `lib/store/auth-store.ts` for the Zustand+persist shape)

Create `lib/store/persona-store.ts`:
```ts
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClient } from "@/lib/supabase/client";
import type { Member } from "@/lib/synapse/types";

interface PersonaState {
  persona: Member | null;
  personas: Member[];
  loadPersonas: () => Promise<void>;
  setPersona: (id: string) => void;
}

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set, get) => ({
      persona: null,
      personas: [],
      loadPersonas: async () => {
        const supabase = createClient();
        const { data } = await supabase.from("members").select("*").order("created_at");
        const personas = data ?? [];
        set({ personas });
        if (!get().persona && personas.length) set({ persona: personas[0] });
      },
      setPersona: (id) => {
        const p = get().personas.find((m) => m.id === id) ?? null;
        if (p) set({ persona: p });
      },
    }),
    { name: "synapse-persona", partialize: (s) => ({ persona: s.persona }) },
  ),
);
```

- [ ] **Step 3: Write the persona switcher**

Create `components/synapse/persona-switcher.tsx` — `"use client"`. On mount call `loadPersonas()`. Render a shadcn `Select` (`@/components/ui/select`) of `personas` (label: `full_name` + role badge), value bound to `persona?.id`, `onValueChange={setPersona}`. Show a `Badge` (`@/components/ui/badge`) of the current role. Guard against SSR hydration like `items-list.tsx` does (`hasMounted` state).

- [ ] **Step 4: Write the header**

Create `components/synapse/synapse-header.tsx` — `"use client"`. Left: "SYN**A**PSE" wordmark (the middle "A" in `text-primary`). Right: nav `Link`s to `/`, `/me`, `/admin`, `/demo` + `<PersonaSwitcher/>`. Mirror layout idioms from `components/header.tsx`.

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/store/persona-store.ts lib/synapse/types.ts components/synapse/persona-switcher.tsx components/synapse/synapse-header.tsx
git commit -m "feat(ui): persona store, shared types, SYNAPSE header + switcher"
```

---

## Task 10: Realtime hook + data hooks

**Files:**
- Create: `hooks/use-realtime-table.ts`
- Create: `hooks/use-resources.ts`, `hooks/use-bookings.ts`, `hooks/use-waitlists.ts`, `hooks/use-fairness.ts`, `hooks/use-audit-log.ts`, `hooks/use-policy.ts`

**Interfaces:**
- Produces:
  - `useRealtimeTable<T>(table: string, initialQuery: () => Promise<T[]>, deps?: unknown[]) → { rows: T[], loading: boolean, refetch: () => Promise<void> }` — fetches once, subscribes to `postgres_changes` on `public.<table>`, refetches on any change.
  - `useResources() → { resources: Resource[], loading, refetch }`
  - `useBookings(memberId?: string) → { bookings: Booking[], loading, refetch }`
  - `useWaitlists(resourceId?: string) → { waitlists: Waitlist[], loading, refetch }`
  - `useFairness() → { rows: FairnessRow[], loading, refetch }`
  - `useAuditLog(limit?: number) → { rows: AuditRow[], loading, refetch }`
  - `usePolicy() → { rows: PolicyRow[], loading, refetch }`

- [ ] **Step 1: Write the generic realtime hook**

Create `hooks/use-realtime-table.ts`:
```ts
"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeTable<T>(
  table: string,
  initialQuery: () => Promise<T[]>,
  deps: unknown[] = [],
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try { setRows(await initialQuery()); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void refetch();
    const supabase = createClient();
    const channel = supabase
      .channel(`rt:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => { void refetch(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { rows, loading, refetch };
}
```

- [ ] **Step 2: Write `use-resources.ts`**

```ts
"use client";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import type { Resource } from "@/lib/synapse/types";

export function useResources() {
  const { rows, loading, refetch } = useRealtimeTable<Resource>("resources", async () => {
    const supabase = createClient();
    const { data } = await supabase.from("resources").select("*").order("name");
    return data ?? [];
  });
  return { resources: rows, loading, refetch };
}
```

- [ ] **Step 3: Write `use-bookings.ts`** (filtered by member; subscribes to `bookings`)

```ts
"use client";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import type { Booking } from "@/lib/synapse/types";

export function useBookings(memberId?: string) {
  const { rows, loading, refetch } = useRealtimeTable<Booking>("bookings", async () => {
    const supabase = createClient();
    let q = supabase.from("bookings").select("*").order("created_at", { ascending: false });
    if (memberId) q = q.eq("member_id", memberId);
    const { data } = await q;
    return data ?? [];
  }, [memberId]);
  return { bookings: rows, loading, refetch };
}
```

- [ ] **Step 4: Write `use-waitlists.ts`, `use-fairness.ts`, `use-audit-log.ts`, `use-policy.ts`**

Follow the exact shape of `use-resources.ts`/`use-bookings.ts`:
- `use-waitlists.ts`: table `"waitlists"`, optional `resourceId` filter (`.eq("resource_id", …)`), order by `rank`. Returns `{ waitlists, loading, refetch }`.
- `use-fairness.ts`: table `"fairness_ledger"`, order by `fairness_term` desc. Returns `{ rows, loading, refetch }`.
- `use-audit-log.ts`: table `"audit_log"`, order by `occurred_at` desc, `.limit(limit ?? 50)`. Returns `{ rows, loading, refetch }`.
- `use-policy.ts`: table `"policy_settings"`, order by `category, key`. Returns `{ rows, loading, refetch }`.

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add hooks/use-realtime-table.ts hooks/use-resources.ts hooks/use-bookings.ts hooks/use-waitlists.ts hooks/use-fairness.ts hooks/use-audit-log.ts hooks/use-policy.ts
git commit -m "feat(ui): realtime table hook + resource/booking/waitlist/fairness/audit/policy hooks"
```

---

## Task 11: Discovery page (`/`)

**Files:**
- Modify: `app/page.tsx` (replace template demo home)
- Create: `components/synapse/resource-card.tsx`, `components/synapse/resource-grid.tsx`

**Interfaces:**
- Consumes: `useResources`, `useBookings` (for availability glance), `<SynapseHeader/>`, `usePersonaStore`.
- Produces: `<ResourceGrid/>` (filters by `resource_class`, `building`, `capacity`); `<ResourceCard resource={Resource} />` linking to `/resources/[id]`.

- [ ] **Step 1: Write `resource-card.tsx`** — `"use client"`. shadcn `Card`. Shows name, a `Badge` for `resource_class`, building, capacity, equipment chips, and an availability dot (green if no current confirmed booking, amber otherwise — derive from a `bookings` count passed in or a small query). Wrap in `next/link` to `/resources/${resource.id}`.

- [ ] **Step 2: Write `resource-grid.tsx`** — `"use client"`. Calls `useResources()`. Renders filter controls (shadcn `Select` for class + `Input` for capacity min + `Select` for building) and a responsive grid (`grid gap-6 md:grid-cols-2 lg:grid-cols-3`, mirror `items-list.tsx`) of `<ResourceCard/>`. Loading → `Loader2` spinner (mirror `items-list.tsx`).

- [ ] **Step 3: Rewrite `app/page.tsx`** — `"use client"`. Render `<SynapseHeader/>`, a one-line tagline, then `<ResourceGrid/>`. Remove template `ItemsList`/`AuthDialog` usage.

- [ ] **Step 4: Manual QA**

Run: `pnpm dev` then open `http://localhost:3000`.
Expected: SYNAPSE header with persona switcher; grid of 8 resources; filters narrow the grid; clicking a card navigates to `/resources/<id>` (404 until Task 12 — acceptable now).

- [ ] **Step 5: Type-check + commit**

```bash
pnpm exec tsc --noEmit
git add app/page.tsx components/synapse/resource-card.tsx components/synapse/resource-grid.tsx
git commit -m "feat(ui): discovery page — live resource grid with filters"
```

---

## Task 12: Resource detail + booking flow + Decision Modal (core E2E)

**Files:**
- Create: `app/resources/[id]/page.tsx`
- Create: `components/synapse/slot-picker.tsx`, `components/synapse/booking-form.tsx`, `components/synapse/decision-modal.tsx`, `components/synapse/score-bars.tsx`

**Interfaces:**
- Consumes: `usePersonaStore`, `useBookings`/`useWaitlists` (resource-scoped), `book_request` RPC, `Decision`/`Explainer` types.
- Produces: `<DecisionModal decision={Decision} open onClose/>`; `<ScoreBars components={ScoreComponents} />`; a booking form that calls `book_request` and opens the modal.

- [ ] **Step 1: Write `score-bars.tsx`** — `"use client"`. Given `components: ScoreComponents`, render five labelled bars (shadcn `Progress` or simple divs) for urgency, role_weight, fairness_deficit, recency_penalty (shown as a deduction), academic_purpose. Pure presentational.

- [ ] **Step 2: Write `decision-modal.tsx`** — `"use client"`. shadcn `Dialog`. Header reflects `decision.status` (✓ Confirmed / ✓ Confirmed by priority / ⏳ Waitlisted rank N / ✕ Rejected). Body: winner name + total score + `<ScoreBars/>`; if `contenders.length` show each contender's score + bars; then a "Why this outcome" line and the two `counterfactuals` with their scores. This component is the centerpiece — make it legible, not flashy.

- [ ] **Step 3: Write `slot-picker.tsx`** — `"use client"`. Renders selectable time slots for the resource (e.g., the next 7 days × hourly business hours). Marks slots overlapping a confirmed booking as "busy" (from a `bookings` query). `onSelect(start: Date, end: Date)`.

- [ ] **Step 4: Write `booking-form.tsx`** — `"use client"`. Uses selected slot + a `purpose` `Input`. On submit:
```ts
const supabase = createClient();
const { data, error } = await supabase.rpc("book_request", {
  p_actor_id: persona.id, p_resource_id: resourceId,
  p_start: start.toISOString(), p_end: end.toISOString(),
  p_purpose: purpose || null, p_request_id: crypto.randomUUID(),
});
```
Set the returned `data as Decision` into state and open `<DecisionModal/>`. Toast via `sonner` on `error` (mirror `items-list.tsx` handlers).

- [ ] **Step 5: Write `app/resources/[id]/page.tsx`** — `"use client"` (read `params.id`). Render `<SynapseHeader/>`, resource header (name/class/building/equipment), `<SlotPicker/>`, `<BookingForm/>`, and a live "Current bookings & waitlist" list (resource-scoped `useBookings`/`useWaitlists`).

- [ ] **Step 6: Manual QA (the core flow)**

With `pnpm dev`: as **Mihir**, book "Lab-A, tomorrow 14:00" → Decision Modal shows **Confirmed**. Switch to **Sarah**, book the same slot → Modal shows **Confirmed by priority** (Sarah wins) with both score breakdowns + counterfactuals, and the live list updates (Mihir → waitlist) without refresh.
Expected: exactly that. If Sarah loses, re-check `priority_score` seed/weights.

- [ ] **Step 7: Type-check + commit**

```bash
pnpm exec tsc --noEmit
git add app/resources components/synapse/slot-picker.tsx components/synapse/booking-form.tsx components/synapse/decision-modal.tsx components/synapse/score-bars.tsx
git commit -m "feat(ui): resource detail, booking flow, decision-explainer modal"
```

---

## Task 13: My bookings (`/me`) — cancel, check-in, swap

**Files:**
- Create: `app/me/page.tsx`
- Create: `components/synapse/my-bookings.tsx`

**Interfaces:**
- Consumes: `usePersonaStore`, `useBookings(persona.id)`, `useWaitlists`, RPCs `cancel_booking`, `check_in`, `propose_swap`.
- Produces: `<MyBookings/>`.

- [ ] **Step 1: Write `my-bookings.tsx`** — `"use client"`. Two sections: confirmed/upcoming bookings (with **Check in**, **Cancel**, and **Propose swap** actions) and waitlist entries (rank + score). Actions call the RPCs with `p_actor_id: persona.id`; on success toast + the realtime hook refreshes. Cancel uses shadcn `AlertDialog` (mirror `items-list.tsx`). Swap: a `Select` of the persona's *other* confirmed bookings to swap with → `propose_swap`; show the returned `{ok,reason|deltas}` in a toast or inline.

- [ ] **Step 2: Write `app/me/page.tsx`** — `"use client"`. `<SynapseHeader/>` + `<MyBookings/>`. If no persona selected, prompt to pick one.

- [ ] **Step 3: Manual QA**

As Sarah: check in to a booking (badge updates); cancel a booking that has a waitlisted user → that user is auto-promoted (visible on `/resources/[id]`); attempt a swap that helps both → ok; one that hurts a side → rejected with reason.
Expected: as described.

- [ ] **Step 4: Type-check + commit**

```bash
pnpm exec tsc --noEmit
git add app/me components/synapse/my-bookings.tsx
git commit -m "feat(ui): my-bookings — check-in, cancel+auto-promote, propose-swap"
```

---

## Task 14: Admin console (`/admin`)

**Files:**
- Modify: `app/admin/page.tsx` (replace template admin; gate on persona role, not JWT)
- Create: `components/synapse/fairness-dashboard.tsx`, `components/synapse/policy-editor.tsx`, `components/synapse/audit-viewer.tsx`, `components/synapse/ops-panel.tsx`

**Interfaces:**
- Consumes: `usePersonaStore` (role gate `lab_manager`/`admin`), `useFairness`, `usePolicy`, `useAuditLog`, `useResources`, RPCs `run_fairness_rebalance`, `run_no_show_reaper`, `mass_cancel`.
- Produces: the four admin panels in shadcn `Tabs`.

- [ ] **Step 1: Write `fairness-dashboard.tsx`** — `"use client"`. `useFairness()` joined to member names (do a second `members` fetch or a view; simplest: fetch members once and map). Per resource_class, a `Table` of members with served vs fair-share bars and the γ term; highlight under-served (γ high) vs over-served (γ≈0). (F-10)

- [ ] **Step 2: Write `policy-editor.tsx`** — `"use client"`. `usePolicy()`. Editable numeric `Input`s grouped by `category` (weights/roles/ops). **Save** writes via a tiny RPC OR — since direct writes are revoked — add an `update_policy(p_actor_id, p_key, p_value)` RPC. **Add this RPC** to a new migration `20260623100600_fn_policy.sql`:
```sql
create or replace function public.update_policy(p_actor_id uuid, p_key text, p_value numeric)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor public.members;
begin
  select * into actor from public.members where id = p_actor_id;
  if actor.role not in ('admin','lab_manager') then
    return jsonb_build_object('ok', false, 'reason', 'not authorised'); end if;
  update public.policy_settings set numeric_value = p_value, updated_at = now() where key = p_key;
  insert into public.audit_log (kind, actor_id, payload)
    values ('admin_override', p_actor_id, jsonb_build_object('policy_key', p_key, 'value', p_value));
  return jsonb_build_object('ok', true, 'key', p_key, 'value', p_value);
end;
$$;
grant execute on function public.update_policy to anon, authenticated;
```
Then `supabase db reset && supabase gen types typescript --local > lib/types/database.types.ts`. The editor calls `supabase.rpc("update_policy", { p_actor_id: persona.id, p_key, p_value })`. Changing γ then re-running rebalance visibly shifts scores (F-12).

- [ ] **Step 3: Write `audit-viewer.tsx`** — `"use client"`. `useAuditLog(50)`. A reverse-chronological `Table`; each row expands (shadcn `Collapsible`) to show `decision_explainer` (reuse `<ScoreBars/>` for winner/contenders) and `payload`. (F-11)

- [ ] **Step 4: Write `ops-panel.tsx`** — `"use client"`. Buttons: **Run fairness rebalance** (`run_fairness_rebalance`), **Run no-show reaper** (`run_no_show_reaper`), **Mass cancel** (pick a resource → `mass_cancel`). Each shows the returned JSON summary in a toast/inline and the dashboards refresh via realtime.

- [ ] **Step 5: Rewrite `app/admin/page.tsx`** — `"use client"`. Gate: if `persona.role` not in `['admin','lab_manager']`, show "Switch to Nimal (Lab Manager) or System Admin to access the console." Else `<SynapseHeader/>` + shadcn `Tabs`: Fairness · Policy · Audit · Ops. (Note: this replaces the template's server-side JWT-gated admin page; that's intentional for the no-login demo.)

- [ ] **Step 6: Manual QA**

As **Admin/Lab Manager**: Fairness tab shows Tariq over-served / Ana under-served; edit γ in Policy, Save, run rebalance in Ops → fairness terms change; Audit tab lists every action with expandable explainers.
Expected: as described. As **student** persona, `/admin` shows the gate message.

- [ ] **Step 7: Type-check + commit**

```bash
pnpm exec tsc --noEmit
git add app/admin supabase/migrations/20260623100600_fn_policy.sql lib/types/database.types.ts components/synapse/fairness-dashboard.tsx components/synapse/policy-editor.tsx components/synapse/audit-viewer.tsx components/synapse/ops-panel.tsx
git commit -m "feat(ui): admin console — fairness dashboard, policy editor, audit viewer, ops"
```

---

## Task 15: Demo control room (`/demo`)

**Files:**
- Create: `app/demo/page.tsx`
- Create: `components/synapse/demo-control-room.tsx`

**Interfaces:**
- Consumes: `useResources`, `usePersonaStore`/members list, `simulate_contention` RPC, `<DecisionModal/>`/`<ScoreBars/>`.
- Produces: `<DemoControlRoom/>`.

- [ ] **Step 1: Write `demo-control-room.tsx`** — `"use client"`. Controls: pick a resource, pick a slot (default tomorrow 14:00–15:00), multi-select members (checkboxes; default Sarah + Mihir + Dr. Perera). **"Fire simultaneous requests"** calls:
```ts
const { data } = await supabase.rpc("simulate_contention", {
  p_resource_id, p_start, p_end, p_member_ids: selectedIds,
});
```
Render the returned explainer: winner card + ranked contenders, each with `<ScoreBars/>`, plus counterfactuals. A short caption: "All requests arrived together; the winner is chosen by score, not arrival time." This is the input → processing → output panel for judges.

- [ ] **Step 2: Write `app/demo/page.tsx`** — `"use client"`. `<SynapseHeader/>` + a one-paragraph explainer + `<DemoControlRoom/>`.

- [ ] **Step 3: Manual QA**

Fire contention with Sarah + Mihir + Dr. Perera on Lab-A → Dr. Perera (faculty, role weight 1.0) wins; Sarah ranked above Mihir; all score breakdowns shown; one confirmed booking + two waitlisted on the slot.
Expected: as described, regardless of selection order.

- [ ] **Step 4: Type-check + commit**

```bash
pnpm exec tsc --noEmit
git add app/demo components/synapse/demo-control-room.tsx
git commit -m "feat(ui): demo control room — N-way contention showpiece"
```

---

## Task 16: README, documentation source, demo storyboard

**Files:**
- Modify: `README.md`
- Create: `docs/CIPHER2_SegfaultSociety_Documentation.md`
- Create: `docs/DEMO_STORYBOARD.md`

**Interfaces:** none (docs).

- [ ] **Step 1: Rewrite `README.md`** — SYNAPSE overview; prerequisites (Node 18+, pnpm, Supabase CLI); exact run steps (`pnpm install` → `supabase start` → create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `supabase status` → `supabase db reset` → `pnpm dev`); how to run engine tests (`psql … -f supabase/tests/*.sql`); the persona-switcher note; a "Guided demo (5 clicks)" section pointing at `/`, `/resources/[id]`, `/me`, `/admin`, `/demo`; mapping of features F-01…F-12 to where they live; honest limitations.

- [ ] **Step 2: Write `docs/CIPHER2_SegfaultSociety_Documentation.md`** (3–5 pages of content for the PDF) with sections: **Problem** (contention + fairness, from Case Analysis); **Solution** (engine pieces); **Core logic** (Formula 1, exclusion constraint, fairness rebalance, swap — with the decision-explainer contract); **Architecture** (the diagram from the spec, RPC + RLS model); **Deviations from Phase 1** (Edge Fn→RPC, interval tree→GiST, Trigger.dev→buttons/pg_cron, auth→persona); **Limitations** (PWA, Holt-Winters, etc., each with a one-line why). Keep it tight — judges read fast.

- [ ] **Step 3: Write `docs/DEMO_STORYBOARD.md`** — a shot-by-shot video script (~3–4 min): (1) discovery + filters; (2) Mihir books Lab-A → confirmed; (3) Sarah books same slot → confirmed-by-priority, open the explainer; (4) `/demo` N-way contention with faculty winning; (5) admin: fairness dashboard → edit γ → rebalance → scores shift; (6) cancel → auto-promote; (7) no-show reaper. Note what to narrate at each step.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/CIPHER2_SegfaultSociety_Documentation.md docs/DEMO_STORYBOARD.md
git commit -m "docs: README, technical documentation source, demo storyboard"
```

---

## Task 17: Final QA pass + polish

**Files:** any fixes surfaced by QA.

- [ ] **Step 1: Full reset + type-check + build**

Run: `supabase db reset && pnpm exec tsc --noEmit && pnpm build`
Expected: all succeed.

- [ ] **Step 2: Run all engine tests**

Run:
```bash
for f in supabase/tests/test_*.sql; do echo "== $f =="; psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f "$f" || break; done
```
Expected: every file ends with `… TESTS PASSED`.

- [ ] **Step 3: Walk the full storyboard in the browser** (the judge path end-to-end). Fix any rough edges (empty states, loading spinners, error toasts). Keep changes minimal.

- [ ] **Step 4: Commit polish**

```bash
git add -A
git commit -m "chore: final QA pass — full reset, build, storyboard walkthrough"
```

- [ ] **Step 5 (optional): deploy for the live link** — only if time remains. Create a Supabase Cloud project, `supabase link`, `supabase db push`, set Vercel env vars, `vercel`. Out of scope for core marks.

---

## Self-review (completed during authoring)

- **Spec coverage:** F-01 (Task 11) · F-03 (Tasks 5, 12) · F-04 explainer (Tasks 5, 12) · F-05 rebalance (Tasks 7, 14) · F-06 waitlist auto-promote (Tasks 7, 13) · F-07 check-in/reaper (Tasks 7, 13, 14) · F-08 swap (Tasks 7, 13) · F-10 fairness dashboard (Task 14) · F-11 audit log (Tasks all DB, 14) · F-12 open policy (Tasks 2, 14). Six entities + policy (Task 2). Four §3 engine pieces (Tasks 4–7). Decision-explainer §3.8 (Tasks 5, 6, 12). Persona/no-login (Task 9). Realtime (Task 10). Seed/marquee (Task 8). Deliverables (Task 16). Cut items (F-02 PWA, F-09 Holt-Winters) intentionally absent — documented in Task 16.
- **Placeholder scan:** none — every code step contains real code; UI components without inline code carry an exact "mirror `<file>`" pattern + typed interface.
- **Type consistency:** RPC names/args match between SQL definitions and the `supabase.rpc(...)` call sites (`book_request`, `simulate_contention`, `cancel_booking`, `check_in`, `run_fairness_rebalance`, `run_no_show_reaper`, `propose_swap`, `mass_cancel`, `update_policy`). `priority_score` carries `p_purpose` everywhere it is called. TS types (`Decision`, `Explainer`, `ScoreComponents`, `Member`, …) defined once in Task 9 and reused.
