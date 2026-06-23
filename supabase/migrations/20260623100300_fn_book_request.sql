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
