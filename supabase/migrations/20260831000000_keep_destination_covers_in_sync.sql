-- A destination photo can also be the catalogue cover. Keep that reference
-- valid even when the photo is deleted outside the mobile client.
create or replace function public.refresh_deleted_destination_photo_cover()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.destinations
  set cover_image_url = (
    select photo.image_url
    from public.destination_photos photo
    where photo.destination_id = old.destination_id
    order by photo.sort_order, photo.created_at
    limit 1
  )
  where id = old.destination_id
    and cover_image_url = old.image_url;

  return old;
end;
$$;

revoke all on function public.refresh_deleted_destination_photo_cover() from public, anon, authenticated;

drop trigger if exists refresh_deleted_destination_photo_cover on public.destination_photos;
create trigger refresh_deleted_destination_photo_cover
after delete on public.destination_photos
for each row execute function public.refresh_deleted_destination_photo_cover();

-- Repair only orphaned covers from the managed bucket. External covers are
-- intentionally untouched because they may be the sole verified image.
update public.destinations destination
set cover_image_url = (
  select photo.image_url
  from public.destination_photos photo
  where photo.destination_id = destination.id
  order by photo.sort_order, photo.created_at
  limit 1
)
where destination.cover_image_url like '%/storage/v1/object/public/destination-photos/%'
  and not exists (
    select 1
    from public.destination_photos photo
    where photo.destination_id = destination.id
      and photo.image_url = destination.cover_image_url
  );
