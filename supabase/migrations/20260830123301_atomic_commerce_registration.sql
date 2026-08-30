create or replace function public.register_commercial_service_v2(p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  service_id uuid;
  category_id text := nullif(btrim(p_payload ->> 'category'), '');
  subcategory_ids text[] := array(select jsonb_array_elements_text(coalesce(p_payload -> 'subcategories', '[]'::jsonb)));
  latitude double precision := (p_payload ->> 'latitude')::double precision;
  longitude double precision := (p_payload ->> 'longitude')::double precision;
begin
  if actor_id is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if nullif(btrim(p_payload ->> 'title'), '') is null then raise exception 'title_required' using errcode = '23514'; end if;
  if latitude not between -90 and 90 or longitude not between -180 and 180 then raise exception 'invalid_coordinates' using errcode = '23514'; end if;

  insert into public.commercial_services (
    owner_id, category, subcategories, main_category, subcategory, title, description,
    price_range, location, phone_whatsapp, whatsapp, booking_url, menu_url,
    opening_hours, parking, has_parking, payment_methods, accessibility, languages,
    experience_type, certifications, photos, cover_image_url, claim_status, source,
    is_claimed, business_updated_at
  ) values (
    actor_id, category_id, subcategory_ids, category_id,
    coalesce(nullif(array_to_string(subcategory_ids, ', '), ''), category_id),
    left(btrim(p_payload ->> 'title'), 160), nullif(left(btrim(coalesce(p_payload ->> 'description', '')), 2000), ''),
    nullif(left(btrim(coalesce(p_payload ->> 'priceRange', '')), 40), ''),
    public.st_setsrid(public.st_makepoint(longitude, latitude), 4326),
    nullif(left(btrim(coalesce(p_payload ->> 'phone', '')), 80), ''),
    nullif(left(btrim(coalesce(p_payload ->> 'whatsapp', '')), 80), ''),
    nullif(left(btrim(coalesce(p_payload ->> 'bookingUrl', '')), 500), ''),
    nullif(left(btrim(coalesce(p_payload ->> 'menuUrl', '')), 500), ''),
    nullif(left(btrim(coalesce(p_payload ->> 'openingHours', '')), 160), ''),
    nullif(left(btrim(coalesce(p_payload ->> 'parking', '')), 500), ''),
    coalesce((p_payload ->> 'hasParking')::boolean, false),
    array(select jsonb_array_elements_text(coalesce(p_payload -> 'paymentMethods', '[]'::jsonb))),
    nullif(left(btrim(coalesce(p_payload ->> 'accessibility', '')), 500), ''),
    array(select jsonb_array_elements_text(coalesce(p_payload -> 'languages', '[]'::jsonb))),
    nullif(left(btrim(coalesce(p_payload ->> 'experienceType', '')), 160), ''),
    array(select jsonb_array_elements_text(coalesce(p_payload -> 'certifications', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_payload -> 'photos', '[]'::jsonb))),
    nullif(btrim(coalesce(p_payload ->> 'coverImageUrl', '')), ''),
    'claimed', 'owner_registered', true, now()
  ) returning id into service_id;
  return service_id;
end;
$$;

revoke all on function public.register_commercial_service_v2(jsonb) from public, anon;
grant execute on function public.register_commercial_service_v2(jsonb) to authenticated;
