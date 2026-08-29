create or replace function public.register_commercial_service(
  p_main_category text,
  p_subcategory text,
  p_title text,
  p_latitude double precision,
  p_longitude double precision,
  p_phone text default null,
  p_whatsapp text default null,
  p_description text default null,
  p_price_range text default null,
  p_opening_hours text default null,
  p_booking_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'title_required'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'invalid_coordinates'; end if;

  insert into public.commercial_services (
    owner_id, main_category, subcategory, title, description, price_range,
    location, phone_whatsapp, whatsapp, booking_url, opening_hours, claim_status
  ) values (
    v_user_id, left(trim(p_main_category), 80), left(trim(p_subcategory), 120),
    left(trim(p_title), 160), nullif(left(trim(coalesce(p_description, '')), 2000), ''),
    nullif(left(trim(coalesce(p_price_range, '')), 40), ''),
    st_setsrid(st_makepoint(p_longitude, p_latitude), 4326),
    nullif(left(trim(coalesce(p_phone, '')), 80), ''),
    nullif(left(trim(coalesce(p_whatsapp, '')), 80), ''),
    nullif(left(trim(coalesce(p_booking_url, '')), 500), ''),
    nullif(left(trim(coalesce(p_opening_hours, '')), 160), ''),
    'claimed'
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.register_commercial_service(text, text, text, double precision, double precision, text, text, text, text, text, text) from public;
grant execute on function public.register_commercial_service(text, text, text, double precision, double precision, text, text, text, text, text, text) to authenticated;
