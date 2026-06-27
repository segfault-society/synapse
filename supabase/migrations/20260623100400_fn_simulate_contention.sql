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
    select elem,
           (elem->>'member_id')::uuid as member_id,
           (elem->>'score')::numeric as score,
           elem->'components' as components
    from jsonb_array_elements(scored) elem
    where (elem->>'member_id')::uuid <> winner_id
    order by (elem->>'score')::numeric desc, (elem->>'member_id')
  loop
    rnk := rnk + 1;
    insert into public.waitlists (request_id, member_id, resource_id, during, score, score_components, status, rank)
      values (gen_random_uuid(), rec.member_id, p_resource_id, tstzrange(p_start,p_end,'[)'),
              rec.score, rec.components, 'waiting', rnk);
    -- carry full identity (member_id, name, role, score, components) + rank
    contenders := contenders || jsonb_build_array(
      rec.elem || jsonb_build_object('rank', rnk));
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
