do $$
declare a uuid; b uuid; r uuid; bid uuid; res jsonb;
        s timestamptz := now()+interval '3 hours'; e timestamptz := now()+interval '4 hours';
begin
  insert into public.members(full_name, role, year_level, is_final_year) values ('A','student',4,true) returning id into a;
  insert into public.members(full_name, role, year_level) values ('B','student',1) returning id into b;
  insert into public.resources(name, resource_class) values ('LLab','computer_lab') returning id into r;

  -- A books, B waitlists, cancel A -> B auto-promoted
  perform public.book_request(a, r, s, e, 'capstone', gen_random_uuid());
  perform public.book_request(b, r, s, e, 'casual', gen_random_uuid());
  select id into bid from public.bookings where resource_id=r and status='confirmed' and member_id=a;
  res := public.cancel_booking(a, bid);
  assert res->>'promoted_booking' is not null, 'cancel should auto-promote waitlisted B';
  assert (select count(*) from public.bookings where resource_id=r and member_id=b and status='confirmed')=1, 'B now confirmed';

  -- fairness rebalance produces a report
  res := public.run_fairness_rebalance(30);
  assert jsonb_array_length(res->'report') >= 1, 'rebalance report non-empty';

  raise notice 'LIFECYCLE TESTS PASSED';
end $$;
