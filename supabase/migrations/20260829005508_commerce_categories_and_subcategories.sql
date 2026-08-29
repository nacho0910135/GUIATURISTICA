-- Canonical marketplace taxonomy. Keep main_category/subcategory for imports
-- and backwards compatibility, while the app filters by these normalized fields.
alter table public.commercial_services
  add column if not exists category text not null default 'emergency',
  add column if not exists subcategories text[] not null default '{}';

update public.commercial_services
set
  category = case
    when lower(trim(main_category)) in ('food', 'restaurant', 'comida', 'gastronomia', 'cafe', 'bar', 'bakery') then 'food'
    when lower(trim(main_category)) in ('lodging', 'hotel', 'hospedaje', 'hostel', 'cabinas', 'alojamiento') then 'lodging'
    when lower(trim(main_category)) in ('water_activities', 'tours_acuaticos', 'pesca', 'pesca_deportiva', 'boat_tour', 'lancha', 'rafting', 'kayak', 'surf') then 'water_activities'
    when lower(trim(main_category)) in ('adventure', 'aventura', 'tour', 'tours', 'canopy') then 'adventure'
    when lower(trim(main_category)) in ('nature', 'naturaleza', 'parque', 'reserva', 'senderismo', 'ecoturismo') then 'nature'
    when lower(trim(main_category)) in ('wellness', 'termales', 'spa', 'bienestar', 'masaje') then 'wellness'
    when lower(trim(main_category)) in ('guides_experiences', 'guias', 'guia', 'experiencias_locales') then 'guides_experiences'
    when lower(trim(main_category)) in ('rentals_equipment', 'alquiler', 'alquiler_equipo', 'rentacar', 'alquiler_autos') then 'rentals_equipment'
    when lower(trim(main_category)) in ('transport', 'transporte', 'taxi', 'shuttle') then 'transport'
    when lower(trim(main_category)) in ('shopping', 'compras', 'artesanias', 'mercado', 'tienda') then 'shopping'
    else 'emergency'
  end,
  subcategories = case
    when coalesce(array_length(subcategories, 1), 0) > 0 then subcategories
    when nullif(trim(subcategory), '') is not null then array[lower(trim(subcategory))]
    else '{}'
  end;

alter table public.commercial_services
  drop constraint if exists commercial_services_category_check,
  add constraint commercial_services_category_check
    check (category in (
      'food', 'lodging', 'adventure', 'water_activities', 'nature',
      'wellness', 'guides_experiences', 'rentals_equipment', 'transport',
      'shopping', 'emergency'
    ));

create index if not exists commercial_services_category_idx
  on public.commercial_services (category);

create index if not exists commercial_services_subcategories_gin_idx
  on public.commercial_services using gin (subcategories);

comment on column public.commercial_services.category is
  'Canonical marketplace category used by the app; main_category is retained for legacy imports.';
comment on column public.commercial_services.subcategories is
  'Zero or more normalized marketplace tags, such as fishing or kayak_sup.';

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
  v_category text := lower(trim(p_main_category));
  v_subcategory text := nullif(lower(trim(coalesce(p_subcategory, ''))), '');
  v_subcategories text[];
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'title_required'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'invalid_coordinates'; end if;
  if v_category = 'assistance' then v_category := 'emergency'; end if;
  if v_category not in ('food', 'lodging', 'adventure', 'water_activities', 'nature', 'wellness', 'guides_experiences', 'rentals_equipment', 'transport', 'shopping', 'emergency') then raise exception 'invalid_category'; end if;
  v_subcategories := array(
    select left(trim(value), 80)
    from unnest(string_to_array(coalesce(p_subcategory, ''), ',')) as value
    where nullif(trim(value), '') is not null
  );

  insert into public.commercial_services (
    owner_id, category, subcategories, main_category, subcategory, title, description, price_range,
    location, phone_whatsapp, whatsapp, booking_url, opening_hours, claim_status
  ) values (
    v_user_id, v_category, coalesce(v_subcategories, '{}'),
    v_category, coalesce(left(v_subcategory, 120), v_category), left(trim(p_title), 160),
    nullif(left(trim(coalesce(p_description, '')), 2000), ''),
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
