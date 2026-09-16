-- Paid community writes are enforced in addition to the existing ownership policies.
create or replace function private.has_paid_personal_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
    or exists (
      select 1 from public.subscriptions
      where user_id = auth.uid()
        and plan = 'no_ads'
        and status in ('active', 'past_due', 'canceled')
        and (current_period_end is null or current_period_end > now())
        and not (provider = 'google_play' and provider_status in ('SUBSCRIPTION_STATE_ON_HOLD', 'SUBSCRIPTION_STATE_PAUSED'))
    )
  );
$$;

revoke all on function private.has_paid_personal_access() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.has_paid_personal_access() to authenticated;

create policy "Solo planes activos crean publicaciones"
on public.traveler_posts as restrictive for insert to authenticated
with check ((select private.has_paid_personal_access()));

create policy "Solo planes activos crean comentarios"
on public.traveler_replies as restrictive for insert to authenticated
with check ((select private.has_paid_personal_access()));

create policy "Solo planes activos reaccionan publicaciones"
on public.traveler_reactions as restrictive for insert to authenticated
with check ((select private.has_paid_personal_access()));

create policy "Solo planes activos actualizan reacciones de publicaciones"
on public.traveler_reactions as restrictive for update to authenticated
using ((select private.has_paid_personal_access()))
with check ((select private.has_paid_personal_access()));

create policy "Solo planes activos reaccionan comentarios"
on public.traveler_reply_reactions as restrictive for insert to authenticated
with check ((select private.has_paid_personal_access()));

create policy "Solo planes activos actualizan reacciones de comentarios"
on public.traveler_reply_reactions as restrictive for update to authenticated
using ((select private.has_paid_personal_access()))
with check ((select private.has_paid_personal_access()));

create policy "Solo planes activos envian mensajes"
on public.traveler_messages as restrictive for insert to authenticated
with check (media_type is distinct from 'audio' or (select private.has_paid_personal_access()));

create policy "Solo planes activos reaccionan mensajes"
on public.traveler_message_reactions as restrictive for insert to authenticated
with check ((select private.has_paid_personal_access()));

create policy "Solo planes activos comentan rodadas"
on public.group_ride_comments as restrictive for insert to authenticated
with check ((select private.has_paid_personal_access()));

create policy "Solo planes activos crean rodadas"
on public.group_rides as restrictive for insert to authenticated
with check ((select private.has_paid_personal_access()));

create policy "Solo planes activos suben archivos comunitarios"
on storage.objects as restrictive for insert to authenticated
with check (
  (bucket_id <> 'traveler-posts' and (bucket_id <> 'chat-media' or coalesce(metadata ->> 'mimetype', '') not like 'audio/%'))
  or (select private.has_paid_personal_access())
);

create or replace function public.get_my_app_access()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with account as (
    select created_at from auth.users where id = auth.uid()
  ), access as (
    select
      account.created_at + interval '15 days' as trial_ends_at,
      (select private.has_paid_personal_access()) as has_paid_access,
      exists (select 1 from public.users where id = auth.uid() and role = 'admin') as is_admin
    from account
  )
  select jsonb_build_object(
    'hasAccess', is_admin or has_paid_access or trial_ends_at > now(),
    'hasPaidAccess', is_admin or has_paid_access,
    'hasPersonalPlan', has_paid_access,
    'trialDaysRemaining', greatest(0, ceil(extract(epoch from (trial_ends_at - now())) / 86400)::integer),
    'trialEndsAt', trial_ends_at,
    'showTrialWarning', not has_paid_access and trial_ends_at > now() and trial_ends_at <= now() + interval '5 days'
  ) from access;
$$;

revoke all on function public.get_my_app_access() from public, anon;
grant execute on function public.get_my_app_access() to authenticated;

notify pgrst, 'reload schema';
