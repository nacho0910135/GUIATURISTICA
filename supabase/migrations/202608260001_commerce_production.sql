alter table public.commercial_services
  add column if not exists has_parking boolean not null default false;

update public.commercial_services
set has_parking = true
where osm_tags ? 'parking'
  and lower(coalesce(osm_tags ->> 'parking', '')) not in ('', 'no', 'none');

create index if not exists commercial_services_main_category_idx
  on public.commercial_services (main_category);

create table if not exists public.business_events (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.commercial_services(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  event_type text not null check (event_type in ('impression', 'whatsapp_click')),
  created_at timestamptz not null default now()
);

create index if not exists business_events_service_created_idx
  on public.business_events (service_id, created_at desc);

alter table public.business_events enable row level security;

drop policy if exists "Visitas registran métricas anónimas" on public.business_events;
create policy "Visitas registran métricas anónimas"
on public.business_events for insert to anon, authenticated
with check (
  (user_id is null or user_id = (select auth.uid()))
  and exists (select 1 from public.commercial_services s where s.id = service_id)
);

drop policy if exists "Comerciantes leen métricas propias" on public.business_events;
create policy "Comerciantes leen métricas propias"
on public.business_events for select to authenticated
using (
  exists (
    select 1 from public.commercial_services s
    where s.id = service_id and s.owner_id = (select auth.uid())
  )
  or exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.role = 'admin'
  )
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_id uuid references public.commercial_services(id) on delete cascade,
  plan text not null check (plan in ('no_ads', 'business', 'sponsored')),
  status text not null default 'pending' check (status in ('pending', 'active', 'past_due', 'canceled', 'expired')),
  price_usd numeric(8,2) not null check (price_usd >= 0),
  provider text,
  provider_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_status_idx
  on public.subscriptions (user_id, status);

alter table public.subscriptions enable row level security;

drop policy if exists "Usuarios leen sus suscripciones" on public.subscriptions;
create policy "Usuarios leen sus suscripciones"
on public.subscriptions for select to authenticated
using (user_id = (select auth.uid()));

drop view if exists public.vw_ranked_commercial_services;
create view public.vw_ranked_commercial_services
with (security_invoker = true)
as
select
  s.*,
  coalesce(r.avg_rating, 0::numeric) as avg_rating,
  coalesce(r.total_reviews, 0) as total_reviews
from public.commercial_services s
left join public.vw_target_ratings r
  on r.target_type = 'service' and r.target_id = s.id;

grant select on public.vw_ranked_commercial_services to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-photos', 'business-photos', true, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Fotos de comercios son públicas" on storage.objects;
create policy "Fotos de comercios son públicas"
on storage.objects for select to public
using (bucket_id = 'business-photos');

drop policy if exists "Comerciantes suben fotos propias" on storage.objects;
create policy "Comerciantes suben fotos propias"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'business-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Comerciantes administran fotos propias" on storage.objects;
create policy "Comerciantes administran fotos propias"
on storage.objects for delete to authenticated
using (
  bucket_id = 'business-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
