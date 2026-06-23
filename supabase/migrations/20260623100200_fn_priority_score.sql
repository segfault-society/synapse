create or replace function public.priority_score(
  p_member_id uuid, p_resource_id uuid,
  p_start timestamptz, p_end timestamptz, p_purpose text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  m public.members; r public.resources;
  w_alpha numeric; w_beta numeric; w_gamma numeric; w_delta numeric; w_eps numeric;
  horizon numeric; recency_window int;
  hours_until numeric; urgency numeric; role_w numeric; fairness numeric;
  recency numeric; purpose_match numeric; recent_count int; total numeric;
begin
  select * into m from public.members where id = p_member_id;
  select * into r from public.resources where id = p_resource_id;

  select numeric_value into w_alpha from public.policy_settings where key='alpha';
  select numeric_value into w_beta  from public.policy_settings where key='beta';
  select numeric_value into w_gamma from public.policy_settings where key='gamma';
  select numeric_value into w_delta from public.policy_settings where key='delta';
  select numeric_value into w_eps   from public.policy_settings where key='epsilon';
  select numeric_value into horizon from public.policy_settings where key='urgency_horizon_hours';
  select numeric_value::int into recency_window from public.policy_settings where key='recency_window_days';

  hours_until := greatest(0, extract(epoch from (p_start - now()))/3600.0);
  urgency := greatest(0, 1 - hours_until / nullif(horizon,0));
  if hours_until <= 48 then urgency := least(1, urgency + 0.15); end if;

  role_w := case
    when m.role = 'faculty' then (select numeric_value from public.policy_settings where key='role_weight_faculty')
    when m.role in ('lab_manager','admin') then (select numeric_value from public.policy_settings where key='role_weight_faculty')
    when m.role = 'student' and m.is_final_year then (select numeric_value from public.policy_settings where key='role_weight_final_year')
    when m.role = 'student' and coalesce(m.year_level,1) >= 4 then (select numeric_value from public.policy_settings where key='role_weight_postgrad')
    else (select numeric_value from public.policy_settings where key='role_weight_undergrad')
  end;
  role_w := coalesce(role_w, 0.4);

  select coalesce(fairness_term,0) into fairness from public.fairness_ledger
    where member_id = p_member_id and resource_class = r.resource_class;
  fairness := coalesce(fairness, 0);

  select count(*) into recent_count from public.bookings b
    where b.member_id = p_member_id and b.resource_id = p_resource_id and b.status='confirmed'
      and lower(b.during) >= now() - make_interval(days => recency_window);
  recency := least(1, recent_count / 2.0);

  purpose_match := case
    when p_purpose is null then 0
    when r.resource_class='multimedia_equipment' and p_purpose ~* '(thesis|defen[cs]e|present|viva)' then 1
    when r.resource_class='computer_lab' and p_purpose ~* '(capstone|project|exam|test|lab)' then 1
    when r.resource_class='meeting_room' and p_purpose ~* '(meeting|standup|review|interview)' then 1
    when r.resource_class='testing_device' and p_purpose ~* '(test|qa|device|measure)' then 1
    else 0 end;

  total := w_alpha*urgency + w_beta*role_w + w_gamma*fairness - w_delta*recency + w_eps*purpose_match;

  return jsonb_build_object(
    'total', round(total, 4),
    'components', jsonb_build_object(
      'urgency', round(urgency,4), 'role_weight', round(role_w,4),
      'fairness_deficit', round(fairness,4), 'recency_penalty', round(recency,4),
      'academic_purpose', purpose_match));
end;
$$;

grant execute on function public.priority_score to anon, authenticated;
