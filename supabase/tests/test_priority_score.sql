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
