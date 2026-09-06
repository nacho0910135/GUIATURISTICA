create or replace function private.activate_admin_test_commerce_campaign(
  p_service_id uuid,
  p_campaign_type text,
  p_target_url text default null,
  p_image_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_campaign_id uuid;
begin
  if v_user_id is null or not exists (
    select 1 from public.users where id = v_user_id and role = 'admin'
  ) then
    raise exception 'admin_required';
  end if;

  if not exists (
    select 1 from public.commercial_services
    where id = p_service_id and owner_id = v_user_id
  ) then
    raise exception 'owned_service_required';
  end if;

  if p_campaign_type not in ('featured', 'banner') then
    raise exception 'invalid_campaign_type';
  end if;

  if p_campaign_type = 'banner' and (
    p_target_url is null or p_target_url !~ '^https?://' or
    p_image_url is null or p_image_url !~ '^https://'
  ) then
    raise exception 'banner_url_and_image_required';
  end if;

  insert into public.commerce_ad_campaigns (
    service_id, user_id, campaign_type, target_url, image_url, status,
    amount_usd, provider_session_id, starts_at, ends_at
  ) values (
    p_service_id,
    v_user_id,
    p_campaign_type,
    case when p_campaign_type = 'banner' then p_target_url else null end,
    case when p_campaign_type = 'banner' then p_image_url else null end,
    'active',
    case when p_campaign_type = 'featured' then 5 else 15 end,
    'admin-test:' || gen_random_uuid()::text,
    now(),
    now() + interval '30 days'
  ) returning id into v_campaign_id;

  return v_campaign_id;
end;
$$;

revoke all on function private.activate_admin_test_commerce_campaign(uuid, text, text, text) from public, anon, authenticated;
grant execute on function private.activate_admin_test_commerce_campaign(uuid, text, text, text) to authenticated;

create or replace function public.activate_admin_test_commerce_campaign(
  p_service_id uuid,
  p_campaign_type text,
  p_target_url text default null,
  p_image_url text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.activate_admin_test_commerce_campaign(
    p_service_id,
    p_campaign_type,
    p_target_url,
    p_image_url
  );
$$;

revoke all on function public.activate_admin_test_commerce_campaign(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.activate_admin_test_commerce_campaign(uuid, text, text, text) to authenticated;

notify pgrst, 'reload schema';
