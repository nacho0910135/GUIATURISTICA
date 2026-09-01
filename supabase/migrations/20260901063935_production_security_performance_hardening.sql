create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- Keep sensitive fauna coordinates inaccessible while allowing the public
-- projection to run with the caller's privileges.
alter view public.fauna_species_public set (security_invoker = true);
revoke select on table public.fauna_species from anon, authenticated;
grant select (
  id, common_name_es, common_name_en, scientific_name, category,
  description, description_en, habitat, habitat_en, vulnerability_status,
  province, tour_observable, is_endemic, is_national_symbol, image_url,
  sound_url, sound_name, created_at
) on table public.fauna_species to anon, authenticated;
drop policy if exists "Invitados leen fauna pública" on public.fauna_species;
create policy "Invitados leen fauna pública"
on public.fauna_species for select to anon
using (true);

-- Move privileged implementations out of the exposed API schema. Public RPC
-- names remain stable through SECURITY INVOKER wrappers.
alter function public.get_destination_freshness(uuid) set schema private;
revoke all on function private.get_destination_freshness(uuid) from public;
grant execute on function private.get_destination_freshness(uuid) to anon, authenticated;
create function public.get_destination_freshness(p_destination_id uuid)
returns table(check_type text, confirmed_count bigint, not_confirmed_count bigint)
language sql stable security invoker set search_path = ''
as $$ select * from private.get_destination_freshness(p_destination_id) $$;
revoke all on function public.get_destination_freshness(uuid) from public;
grant execute on function public.get_destination_freshness(uuid) to anon, authenticated;

alter function public.get_destination_suggestion_verification(uuid) set schema private;
revoke all on function private.get_destination_suggestion_verification(uuid) from public;
grant execute on function private.get_destination_suggestion_verification(uuid) to anon, authenticated;
create function public.get_destination_suggestion_verification(p_suggestion_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select private.get_destination_suggestion_verification(p_suggestion_id) $$;
revoke all on function public.get_destination_suggestion_verification(uuid) from public;
grant execute on function public.get_destination_suggestion_verification(uuid) to anon, authenticated;

alter function public.get_public_app_options(text[]) set schema private;
revoke all on function private.get_public_app_options(text[]) from public;
grant execute on function private.get_public_app_options(text[]) to anon, authenticated;
create function public.get_public_app_options(p_kinds text[])
returns table(kind text, id text, label_es text, label_en text, icon text, parent_id text, allowed_targets text[])
language sql stable security invoker set search_path = ''
as $$ select * from private.get_public_app_options(p_kinds) $$;
revoke all on function public.get_public_app_options(text[]) from public;
grant execute on function public.get_public_app_options(text[]) to anon, authenticated;

alter function public.request_commercial_service_claim(uuid, text) set schema private;
revoke all on function private.request_commercial_service_claim(uuid, text) from public;
grant execute on function private.request_commercial_service_claim(uuid, text) to authenticated;
create function public.request_commercial_service_claim(p_service_id uuid, p_message text default null)
returns uuid language sql security invoker set search_path = ''
as $$ select private.request_commercial_service_claim(p_service_id, p_message) $$;
revoke all on function public.request_commercial_service_claim(uuid, text) from public, anon;
grant execute on function public.request_commercial_service_claim(uuid, text) to authenticated;

alter function public.review_commercial_service_claim(uuid, text) set schema private;
revoke all on function private.review_commercial_service_claim(uuid, text) from public;
grant execute on function private.review_commercial_service_claim(uuid, text) to authenticated;
create function public.review_commercial_service_claim(p_claim_id uuid, p_status text)
returns void language sql security invoker set search_path = ''
as $$ select private.review_commercial_service_claim(p_claim_id, p_status) $$;
revoke all on function public.review_commercial_service_claim(uuid, text) from public, anon;
grant execute on function public.review_commercial_service_claim(uuid, text) to authenticated;

alter function public.refresh_destination_suggestion_verification_status() set schema private;
revoke all on function private.refresh_destination_suggestion_verification_status() from public, anon, authenticated;

revoke execute on function public.st_estimatedextent(text, text) from public, anon, authenticated;
revoke execute on function public.st_estimatedextent(text, text, text) from public, anon, authenticated;
revoke execute on function public.st_estimatedextent(text, text, text, boolean) from public, anon, authenticated;

create index if not exists commercial_service_favorites_service_id_idx on public.commercial_service_favorites(service_id);
create index if not exists destination_freshness_votes_user_id_idx on public.destination_freshness_votes(user_id);
create index if not exists destination_photo_likes_user_id_idx on public.destination_photo_likes(user_id);
create index if not exists destination_suggestion_verifications_user_id_idx on public.destination_suggestion_verifications(user_id);
create index if not exists destinations_featured_community_photo_id_idx on public.destinations(featured_community_photo_id);
create index if not exists traveler_message_reactions_user_id_idx on public.traveler_message_reactions(user_id);
create index if not exists traveler_messages_sender_id_idx on public.traveler_messages(sender_id);
create index if not exists traveler_posts_user_id_idx on public.traveler_posts(user_id);
create index if not exists traveler_reactions_user_id_idx on public.traveler_reactions(user_id);

drop policy if exists "Administradores leen reclamos comerciales" on public.commercial_service_claims;
drop policy if exists "Usuarios leen sus reclamos comerciales" on public.commercial_service_claims;
create policy "Usuarios o administradores leen reclamos comerciales"
on public.commercial_service_claims for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.users admin
    where admin.id = (select auth.uid()) and admin.role = 'admin'
  )
);

drop policy if exists "Published destination suggestions are public" on public.destination_suggestions;
drop policy if exists "Users can read their destination suggestions" on public.destination_suggestions;
create policy "Usuarios leen sugerencias publicadas o propias"
on public.destination_suggestions for select to authenticated
using (status = 'published' or user_id = (select auth.uid()));

drop policy if exists "Usuarios administran sus reacciones" on public.traveler_reactions;
create policy "Usuarios crean sus reacciones"
on public.traveler_reactions for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "Usuarios actualizan sus reacciones"
on public.traveler_reactions for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy "Usuarios eliminan sus reacciones"
on public.traveler_reactions for delete to authenticated
using (user_id = (select auth.uid()));

drop index if exists public.idx_commercial_services_owner;

notify pgrst, 'reload schema';
