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
