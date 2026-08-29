-- Persistent commercial favorites belong to the signed-in user.
create table if not exists public.commercial_service_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  service_id uuid not null references public.commercial_services(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, service_id)
);

create index if not exists commercial_service_favorites_user_created_idx
  on public.commercial_service_favorites (user_id, created_at desc);

alter table public.commercial_service_favorites enable row level security;

create policy "Usuarios leen sus comercios favoritos"
on public.commercial_service_favorites for select to authenticated
using (user_id = (select auth.uid()));

create policy "Usuarios guardan comercios favoritos"
on public.commercial_service_favorites for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Usuarios eliminan comercios favoritos"
on public.commercial_service_favorites for delete to authenticated
using (user_id = (select auth.uid()));

grant select, insert, delete on public.commercial_service_favorites to authenticated;

-- A user has one current review per business. Existing data has no duplicates.
create unique index if not exists reviews_target_user_uidx
  on public.reviews (target_type, target_id, user_id);

-- Rebuild after the marketplace columns were added so the ranked view exposes all of them.
drop view if exists public.vw_ranked_commercial_services;
create view public.vw_ranked_commercial_services
with (security_invoker = true)
as
select
  service.*,
  coalesce(rating.avg_rating, 0::numeric) as avg_rating,
  coalesce(rating.total_reviews, 0) as total_reviews
from public.commercial_services service
left join public.vw_target_ratings rating
  on rating.target_type = 'service' and rating.target_id = service.id;

revoke all on public.vw_ranked_commercial_services from anon, authenticated;
grant select on public.vw_ranked_commercial_services to anon, authenticated;

-- Every approval item creates a notification for every administrator.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'like','review','follow','system_alert','claim_verified','comment','new_post','message','admin_approval'
));

create or replace function public.notify_admins_of_approval()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, target_id)
  select admin.id,
         case when tg_table_name = 'commercial_service_claims' then new.user_id else new.reporter_id end,
         'admin_approval',
         new.id
  from public.users admin
  where admin.role = 'admin';
  return new;
end;
$$;

revoke all on function public.notify_admins_of_approval() from public;

drop trigger if exists notify_admins_of_commercial_claim on public.commercial_service_claims;
create trigger notify_admins_of_commercial_claim
after insert on public.commercial_service_claims
for each row when (new.status = 'pending')
execute function public.notify_admins_of_approval();

drop trigger if exists notify_admins_of_information_report on public.information_reports;
create trigger notify_admins_of_information_report
after insert on public.information_reports
for each row when (new.status = 'open')
execute function public.notify_admins_of_approval();

create policy "Administradores leen reclamos comerciales"
on public.commercial_service_claims for select to authenticated
using (exists (
  select 1 from public.users admin
  where admin.id = (select auth.uid()) and admin.role = 'admin'
));

create or replace function public.review_commercial_service_claim(p_claim_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  claim public.commercial_service_claims%rowtype;
begin
  if not exists (
    select 1 from public.users admin
    where admin.id = auth.uid() and admin.role = 'admin'
  ) then raise exception 'admin_required'; end if;
  if p_status not in ('approved', 'rejected') then raise exception 'invalid_status'; end if;

  select * into claim from public.commercial_service_claims where id = p_claim_id for update;
  if claim.id is null then raise exception 'claim_not_found'; end if;

  update public.commercial_service_claims
  set status = p_status, reviewed_at = now()
  where id = claim.id;

  if p_status = 'approved' then
    update public.commercial_services
    set owner_id = claim.user_id, claim_status = 'claimed', is_claimed = true
    where id = claim.service_id;
    update public.commercial_service_claims
    set status = 'rejected', reviewed_at = now()
    where service_id = claim.service_id and id <> claim.id and status = 'pending';
  else
    update public.commercial_services service
    set claim_status = case when service.owner_id is null then 'unclaimed' else 'claimed' end
    where service.id = claim.service_id
      and not exists (
        select 1 from public.commercial_service_claims pending
        where pending.service_id = claim.service_id and pending.status = 'pending'
      );
  end if;

  insert into public.notifications (recipient_id, type, target_id)
  values (claim.user_id, 'claim_verified', claim.id);
end;
$$;

revoke all on function public.review_commercial_service_claim(uuid, text) from public;
grant execute on function public.review_commercial_service_claim(uuid, text) to authenticated;

-- The canonical business table is commercial_services; this RPC now returns every
-- legacy and marketplace field, rating data, coordinates and calculated distance.
drop function if exists public.nearby_commercial_services(double precision, double precision, double precision, integer);
create function public.nearby_commercial_services(
  user_lat double precision,
  user_lng double precision,
  max_distance_km double precision default 25,
  result_limit integer default 100
)
returns table (
  id uuid, owner_id uuid, main_category varchar, subcategory varchar, title varchar,
  description text, price_range varchar, location geometry, phone_whatsapp varchar,
  external_url text, accepts_sinpe boolean, accepts_cards boolean, pet_friendly boolean,
  is_verified_ict boolean, cst_stars integer, is_sponsored boolean, sponsored_tier integer,
  photos text[], created_at timestamptz, osm_type text, osm_id bigint, osm_tags jsonb,
  data_source text, source_license text, source_updated_at timestamptz, imported_at timestamptz,
  has_parking boolean, business_verified_at timestamptz,
  business_verification_evidence_url text, business_updated_at timestamptz, whatsapp text,
  menu_url text, opening_hours text, parking text, payment_methods text[], accessibility text,
  languages text[], experience_type text, booking_url text, certifications text[],
  cover_image_url text, claim_status text, category text, subcategories text[], region_id text,
  is_claimed boolean, source text, source_record_id text, avg_rating numeric,
  total_reviews integer, latitude double precision, longitude double precision,
  distance_km double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select ranked.*,
    st_y(ranked.location) as latitude,
    st_x(ranked.location) as longitude,
    st_distance(
      ranked.location::geography,
      st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography
    ) / 1000.0 as distance_km
  from public.vw_ranked_commercial_services ranked
  where max_distance_km > 0
    and ranked.location is not null
    and st_dwithin(
      ranked.location::geography,
      st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography,
      max_distance_km * 1000
    )
  order by ranked.location <-> st_setsrid(st_makepoint(user_lng, user_lat), 4326)
  limit least(greatest(result_limit, 1), 500)
$$;

revoke all on function public.nearby_commercial_services(double precision, double precision, double precision, integer) from public;
grant execute on function public.nearby_commercial_services(double precision, double precision, double precision, integer) to anon, authenticated;
