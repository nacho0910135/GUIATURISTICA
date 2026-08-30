alter table public.destination_photos
  add column if not exists source_provider text,
  add column if not exists source_url text,
  add column if not exists attribution text,
  add column if not exists license text;

alter table public.destination_photos drop constraint if exists destination_photos_sort_order_check;
alter table public.destination_photos add constraint destination_photos_sort_order_check check (sort_order between 0 and 9);
