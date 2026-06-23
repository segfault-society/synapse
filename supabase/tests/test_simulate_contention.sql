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
