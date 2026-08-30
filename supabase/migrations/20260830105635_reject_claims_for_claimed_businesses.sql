create or replace function public.request_commercial_service_claim(
  p_service_id uuid,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_claim_id uuid;
  v_owner_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  select owner_id into v_owner_id
  from public.commercial_services
  where id = p_service_id
  for update;
  if not found then
    raise exception 'service_not_found';
  end if;
  if v_owner_id is not null then
    raise exception 'service_already_claimed';
  end if;

  insert into public.commercial_service_claims (service_id, user_id, message)
  values (p_service_id, v_user_id, nullif(left(trim(coalesce(p_message, '')), 1000), ''))
  on conflict (service_id, user_id) do update
    set message = excluded.message, status = 'pending', reviewed_at = null;

  select id into v_claim_id
  from public.commercial_service_claims
  where service_id = p_service_id and user_id = v_user_id;
  update public.commercial_services
  set claim_status = 'pending'
  where id = p_service_id;
  return v_claim_id;
end;
$$;

revoke all on function public.request_commercial_service_claim(uuid, text) from public;
grant execute on function public.request_commercial_service_claim(uuid, text) to authenticated;
