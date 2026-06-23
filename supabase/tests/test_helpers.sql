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
