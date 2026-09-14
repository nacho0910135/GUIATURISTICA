-- Cover the filters and stable cursor order used by high-growth client lists.
create index if not exists notifications_unread_recipient_created_idx
on public.notifications (recipient_id, created_at desc, id desc)
where read_status = false;

create index if not exists notifications_unread_social_idx
on public.notifications (recipient_id, type, created_at desc)
where read_status = false;

create index if not exists fauna_photos_fauna_created_idx
on public.fauna_photos (fauna_id, created_at desc, id desc);

create index if not exists fauna_photos_user_created_idx
on public.fauna_photos (user_id, created_at desc, id desc);

create index if not exists fauna_comments_photo_created_idx
on public.fauna_comments (photo_id, created_at, id);

create index if not exists reviews_target_created_idx
on public.reviews (target_type, target_id, created_at desc, id desc);

create index if not exists traveler_messages_sender_created_idx
on public.traveler_messages (sender_id, created_at desc, id desc);

create or replace function public.toggle_traveler_message_reaction(p_message_id uuid, p_emoji text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null or char_length(p_emoji) not between 1 and 12 then
    raise exception 'invalid_reaction' using errcode = '22023';
  end if;

  delete from public.traveler_message_reactions
  where message_id = p_message_id and user_id = caller and emoji = p_emoji;
  if found then return false; end if;

  insert into public.traveler_message_reactions(message_id, user_id, emoji)
  values (p_message_id, caller, p_emoji)
  on conflict do nothing;
  return true;
end;
$$;
revoke all on function public.toggle_traveler_message_reaction(uuid, text) from public, anon;
grant execute on function public.toggle_traveler_message_reaction(uuid, text) to authenticated;

create or replace function public.get_owner_dashboard_metrics()
returns table (
  service_id uuid,
  views bigint,
  whatsapp_clicks bigint,
  calls bigint,
  directions bigint,
  saves bigint,
  reservations bigint,
  coupons bigint,
  attributed_leads bigint,
  qr_leads bigint,
  utm_leads bigint,
  last_30_days bigint,
  previous_30_days bigint,
  daily_views jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e.service_id,
    count(*) filter (where e.event_type = 'impression'),
    count(*) filter (where e.event_type = 'whatsapp_click'),
    count(*) filter (where e.event_type = 'call'),
    count(*) filter (where e.event_type = 'directions'),
    count(*) filter (where e.event_type = 'save'),
    count(*) filter (where e.event_type = 'reservation'),
    count(*) filter (where e.event_type in ('coupon_redeem', 'coupon_redeemed')),
    count(*) filter (where e.event_type in ('whatsapp_click', 'call', 'directions') and e.attribution <> '{}'::jsonb),
    count(*) filter (where e.event_type in ('whatsapp_click', 'call', 'directions') and e.attribution -> 'qr' = 'true'::jsonb),
    count(*) filter (where e.event_type in ('whatsapp_click', 'call', 'directions') and e.attribution ?| array['utm_source','utm_medium','utm_campaign','utm_content','utm_term']),
    count(*) filter (where e.created_at >= now() - interval '30 days'),
    count(*) filter (where e.created_at >= now() - interval '60 days' and e.created_at < now() - interval '30 days'),
    (select jsonb_agg(coalesce(day.views, 0) order by series.day)
       from generate_series(current_date - 6, current_date, interval '1 day') series(day)
       left join lateral (
         select count(*) as views from public.business_events d
         where d.service_id = e.service_id and d.event_type = 'impression'
           and d.created_at >= series.day and d.created_at < series.day + interval '1 day'
       ) day on true)
  from public.business_events e
  group by e.service_id;
$$;
revoke all on function public.get_owner_dashboard_metrics() from public, anon;
grant execute on function public.get_owner_dashboard_metrics() to authenticated;

notify pgrst, 'reload schema';
