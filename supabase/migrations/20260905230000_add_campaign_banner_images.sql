alter table public.commerce_ad_campaigns
  add column if not exists image_url text;

alter table public.commerce_ad_campaigns
  add constraint commerce_ad_campaigns_image_url_check check (
    image_url is null or (
      campaign_type = 'banner'
      and length(image_url) <= 500
      and image_url ~ '^https://'
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campaign-banners', 'campaign-banners', true, 3145728, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Banners publicitarios son públicos"
on storage.objects for select to public
using (bucket_id = 'campaign-banners');

create policy "Propietarios suben banners propios"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'campaign-banners'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.commercial_services service
    where service.id::text = (storage.foldername(name))[2]
      and service.owner_id = (select auth.uid())
      and service.moderation_status = 'approved'
  )
);

create policy "Propietarios eliminan banners propios"
on storage.objects for delete to authenticated
using (bucket_id = 'campaign-banners' and owner_id = (select auth.uid())::text);

revoke all on table public.commerce_ad_campaigns from public, anon, authenticated;
grant select (id, service_id, campaign_type, target_url, image_url, status, starts_at, ends_at, created_at)
  on public.commerce_ad_campaigns to anon, authenticated;

notify pgrst, 'reload schema';
