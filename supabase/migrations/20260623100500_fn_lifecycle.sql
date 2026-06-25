create or replace function public.cancel_booking(p_actor_id uuid, p_booking_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b public.bookings; promoted uuid; v_count integer;
begin
  select * into b from public.bookings where id = p_booking_id;
  if not found then return jsonb_build_object('status','rejected','reason','not found'); end if;
  perform pg_advisory_xact_lock(hashtext(b.resource_id::text));
  update public.bookings set status='cancelled' where id = p_booking_id and status='confirmed';
  get diagnostics v_count = row_count;
  if v_count = 0 then
    return jsonb_build_object('status','noop','reason','not confirmed or already cancelled');
  end if;
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
      where exists (
        select 1 from public.bookings b join public.resources r on r.id=b.resource_id
        where b.member_id=m.id and r.resource_class=cls
          and b.status in ('confirmed','completed')
          and lower(b.during) >= now() - make_interval(days => win)
      )
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
        key_a bigint; key_b bigint;
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
  key_a := hashtext(a.resource_id::text);
  key_b := hashtext(b.resource_id::text);
  perform pg_advisory_xact_lock(least(key_a, key_b));
  if key_a <> key_b then
    perform pg_advisory_xact_lock(greatest(key_a, key_b));
  end if;
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
