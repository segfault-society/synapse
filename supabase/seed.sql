-- Named personas (stable UUIDs so the UI can reference them if needed)
insert into public.members (id, full_name, email, role, year_level, is_final_year, department) values
  ('11111111-1111-1111-1111-111111111111','Sarah Fernando','sarah@uni.edu','student',4,true,'CS'),
  ('22222222-2222-2222-2222-222222222222','Mihir Jain','mihir@uni.edu','student',1,false,'CS'),
  ('33333333-3333-3333-3333-333333333333','Dr. Perera','perera@uni.edu','faculty',null,false,'CS'),
  ('44444444-4444-4444-4444-444444444444','Nimal (Lab Manager)','nimal@uni.edu','lab_manager',null,false,'Innovation Centre'),
  ('55555555-5555-5555-5555-555555555555','System Admin','admin@uni.edu','admin',null,false,'IT'),
  ('66666666-6666-6666-6666-666666666666','Tariq (over-served)','tariq@uni.edu','student',2,false,'CS'),
  ('77777777-7777-7777-7777-777777777777','Ana (under-served)','ana@uni.edu','student',3,false,'SE');

insert into public.resources (id, name, resource_class, building, capacity, equipment) values
  ('aaaaaaa1-0000-0000-0000-000000000001','Lab-A','computer_lab','Block A',30,'["dual-monitor","GPU"]'),
  ('aaaaaaa1-0000-0000-0000-000000000002','Lab-B','computer_lab','Block A',24,'["dual-monitor"]'),
  ('aaaaaaa1-0000-0000-0000-000000000003','Meeting Room 1','meeting_room','Block B',8,'["whiteboard","TV"]'),
  ('aaaaaaa1-0000-0000-0000-000000000004','Meeting Room 2','meeting_room','Block B',6,'["whiteboard"]'),
  ('aaaaaaa1-0000-0000-0000-000000000005','AV Studio','multimedia_equipment','Block C',4,'["4K camera","mics","lights"]'),
  ('aaaaaaa1-0000-0000-0000-000000000006','VR Kit','multimedia_equipment','Block C',2,'["VR headset"]'),
  ('aaaaaaa1-0000-0000-0000-000000000007','Oscilloscope Bench','testing_device','Lab Wing',2,'["scope","probes"]'),
  ('aaaaaaa1-0000-0000-0000-000000000008','3D Printer','testing_device','Lab Wing',1,'["PLA"]');

-- ~3 weeks of history: Tariq monopolises Lab-A (over-served), Ana barely books (under-served)
insert into public.bookings (member_id, resource_id, during, status) values
  ('66666666-6666-6666-6666-666666666666','aaaaaaa1-0000-0000-0000-000000000001', tstzrange(now()-interval '18 days', now()-interval '18 days'+interval '3 hours','[)'),'completed'),
  ('66666666-6666-6666-6666-666666666666','aaaaaaa1-0000-0000-0000-000000000001', tstzrange(now()-interval '15 days', now()-interval '15 days'+interval '3 hours','[)'),'completed'),
  ('66666666-6666-6666-6666-666666666666','aaaaaaa1-0000-0000-0000-000000000001', tstzrange(now()-interval '11 days', now()-interval '11 days'+interval '4 hours','[)'),'completed'),
  ('66666666-6666-6666-6666-666666666666','aaaaaaa1-0000-0000-0000-000000000001', tstzrange(now()-interval '7 days',  now()-interval '7 days'+interval '3 hours','[)'),'completed'),
  ('66666666-6666-6666-6666-666666666666','aaaaaaa1-0000-0000-0000-000000000001', tstzrange(now()-interval '3 days',  now()-interval '3 days'+interval '3 hours','[)'),'completed'),
  ('22222222-2222-2222-2222-222222222222','aaaaaaa1-0000-0000-0000-000000000001', tstzrange(now()-interval '9 days',  now()-interval '9 days'+interval '2 hours','[)'),'completed'),
  ('77777777-7777-7777-7777-777777777777','aaaaaaa1-0000-0000-0000-000000000001', tstzrange(now()-interval '12 days', now()-interval '12 days'+interval '1 hours','[)'),'completed'),
  ('11111111-1111-1111-1111-111111111111','aaaaaaa1-0000-0000-0000-000000000001', tstzrange(now()-interval '5 days',  now()-interval '5 days'+interval '2 hours','[)'),'completed');

-- Populate the fairness ledger from this history
select public.run_fairness_rebalance(30);
