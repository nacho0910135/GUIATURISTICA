alter table public.fauna_sanctuaries
  add column if not exists photos text[] not null default '{}';

alter table public.fauna_sanctuaries
  drop constraint if exists fauna_sanctuaries_photos_limit;

alter table public.fauna_sanctuaries
  add constraint fauna_sanctuaries_photos_limit check (cardinality(photos) <= 10);

grant update (photos) on public.fauna_sanctuaries to authenticated;
