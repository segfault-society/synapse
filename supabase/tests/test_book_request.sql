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
