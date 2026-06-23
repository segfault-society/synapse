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
