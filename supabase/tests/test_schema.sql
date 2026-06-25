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
