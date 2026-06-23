create or replace function public.update_policy(p_actor_id uuid, p_key text, p_value numeric)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor public.members;
begin
  select * into actor from public.members where id = p_actor_id;
  if actor.role not in ('admin','lab_manager') then
    return jsonb_build_object('ok', false, 'reason', 'not authorised'); end if;
  update public.policy_settings set numeric_value = p_value, updated_at = now() where key = p_key;
  insert into public.audit_log (kind, actor_id, payload)
    values ('admin_override', p_actor_id, jsonb_build_object('policy_key', p_key, 'value', p_value));
  return jsonb_build_object('ok', true, 'key', p_key, 'value', p_value);
end;
$$;
grant execute on function public.update_policy to anon, authenticated;
