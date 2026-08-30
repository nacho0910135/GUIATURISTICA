alter table public.fauna_sanctuaries
  add column if not exists photo_attributions jsonb not null default '[]'::jsonb;

alter table public.fauna_sanctuaries
  drop constraint if exists fauna_sanctuaries_photo_attributions_array;

alter table public.fauna_sanctuaries
  add constraint fauna_sanctuaries_photo_attributions_array check (jsonb_typeof(photo_attributions) = 'array');

grant update (photo_attributions) on public.fauna_sanctuaries to authenticated;
