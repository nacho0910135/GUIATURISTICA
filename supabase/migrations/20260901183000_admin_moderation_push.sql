-- User submissions are private until an administrator reviews them.
alter table public.destination_suggestions alter column status set default 'pending';

alter table public.fauna_species
  add column if not exists moderation_status text not null default 'approved'
  constraint fauna_species_moderation_status_check check (moderation_status in ('pending', 'approved', 'rejected'));

alter table public.commercial_services
  add column if not exists moderation_status text not null default 'approved'
  constraint commercial_services_moderation_status_check check (moderation_status in ('pending', 'approved', 'rejected'));

create index if not exists fauna_species_moderation_status_idx on public.fauna_species (moderation_status, created_at desc);
create index if not exists commercial_services_moderation_status_idx on public.commercial_services (moderation_status, created_at desc);
create index if not exists destination_suggestions_status_created_idx on public.destination_suggestions (status, created_at desc);

drop policy if exists "Users publish their own destinations" on public.destination_suggestions;
create policy "Users submit their own destinations for review" on public.destination_suggestions for insert to authenticated
with check ((select auth.uid()) = user_id and status = 'pending');
drop policy if exists "Usuarios leen sugerencias publicadas o propias" on public.destination_suggestions;
create policy "Usuarios leen sugerencias publicadas propias o administrables" on public.destination_suggestions for select to authenticated
using (status='published' or user_id=(select auth.uid()) or exists(select 1 from public.users u where u.id=(select auth.uid()) and u.role='admin'));

drop policy if exists "Invitados leen fauna pública" on public.fauna_species;
drop policy if exists "Lectura pública de fauna de Costa Rica" on public.fauna_species;
create policy "Invitados leen fauna aprobada" on public.fauna_species for select to anon using (moderation_status = 'approved');
create policy "Usuarios leen fauna aprobada propia o administrable" on public.fauna_species for select to authenticated
using (moderation_status = 'approved' or created_by = (select auth.uid()) or exists (select 1 from public.users u where u.id=(select auth.uid()) and u.role='admin'));

drop policy if exists "Usuarios agregan especies para todos" on public.fauna_species;
create policy "Usuarios envían especies a revisión" on public.fauna_species for insert to authenticated
with check ((select auth.uid()) = created_by and community_submitted and moderation_status='pending' and not tour_observable and not is_endemic and not is_national_symbol and approx_location is null and (image_url is null or image_url like ('%/storage/v1/object/public/fauna-photos/' || (select auth.uid())::text || '/%')) and sound_url is null and sound_name is null and vulnerability_status='Sin evaluar' and char_length(btrim(common_name_es)) between 2 and 100 and char_length(btrim(common_name_en)) between 2 and 100 and char_length(btrim(scientific_name)) between 3 and 150 and char_length(btrim(category)) between 2 and 80);

drop policy if exists "Invitados leen directorio comercial" on public.commercial_services;
drop policy if exists "Lectura pública de comercios y servicios turísticos" on public.commercial_services;
create policy "Invitados leen comercios aprobados" on public.commercial_services for select to anon using (moderation_status='approved');
create policy "Usuarios leen comercios aprobados propios o administrables" on public.commercial_services for select to authenticated
using (moderation_status='approved' or owner_id=(select auth.uid()) or exists (select 1 from public.users u where u.id=(select auth.uid()) and u.role='admin'));

drop policy if exists "Usuarios autenticados pueden registrar comercios pymes" on public.commercial_services;
create policy "Usuarios envían comercios a revisión" on public.commercial_services for insert to authenticated
with check ((select auth.uid())=owner_id and moderation_status='pending');

-- An owner may edit content but can never approve their own submission.
create or replace function private.guard_submission_moderation_status()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.moderation_status is distinct from old.moderation_status
     and (select auth.uid()) is not null
     and not exists (select 1 from public.users u where u.id=(select auth.uid()) and u.role='admin') then
    raise exception 'admin_approval_required' using errcode='42501';
  end if;
  return new;
end; $$;
revoke all on function private.guard_submission_moderation_status() from public, anon, authenticated;
drop trigger if exists guard_commercial_moderation_status on public.commercial_services;
create trigger guard_commercial_moderation_status before update of moderation_status on public.commercial_services for each row execute function private.guard_submission_moderation_status();

create table if not exists public.admin_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  expo_push_token text not null unique check (expo_push_token ~ '^ExponentPushToken\\[[A-Za-z0-9_-]+\\]$|^ExpoPushToken\\[[A-Za-z0-9_-]+\\]$'),
  platform text not null check (platform in ('android','ios')),
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.admin_push_tokens enable row level security;
create policy "Administradores registran su token push" on public.admin_push_tokens for insert to authenticated
with check (user_id=(select auth.uid()) and exists(select 1 from public.users u where u.id=(select auth.uid()) and u.role='admin'));
create policy "Administradores actualizan su token push" on public.admin_push_tokens for update to authenticated
using (user_id=(select auth.uid()) and exists(select 1 from public.users u where u.id=(select auth.uid()) and u.role='admin'))
with check (user_id=(select auth.uid()) and exists(select 1 from public.users u where u.id=(select auth.uid()) and u.role='admin'));
create policy "Administradores leen su token push" on public.admin_push_tokens for select to authenticated using (user_id=(select auth.uid()));
grant select,insert,update on public.admin_push_tokens to authenticated;

insert into public.app_options(kind,id,label_es,label_en,icon,sort_order,active)
values ('notification_type','admin_approval','hay una inserción que requiere moderación','a submission requires moderation','shield-check-outline',100,true)
on conflict(kind,id) do update set label_es=excluded.label_es,label_en=excluded.label_en,icon=excluded.icon,active=true;

create or replace function private.notify_admins_of_submission()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  submission_kind text := tg_argv[0];
  submitter uuid;
  item_title text;
  tokens jsonb;
begin
  if submission_kind='destination' then submitter:=new.user_id; item_title:=new.name;
  elsif submission_kind='fauna' then submitter:=new.created_by; item_title:=new.common_name_es;
  else submitter:=new.owner_id; item_title:=new.title;
  end if;

  insert into public.notifications(recipient_id,actor_id,type,target_id)
  select u.id,submitter,'admin_approval',new.id from public.users u where u.role='admin';

  select jsonb_agg(jsonb_build_object(
    'to',t.expo_push_token,
    'title','Nueva solicitud por moderar',
    'body',case submission_kind when 'destination' then 'Nuevo sitio: ' when 'fauna' then 'Nuevo animal: ' else 'Nuevo comercio: ' end || coalesce(item_title,'Sin nombre'),
    'sound','default','channelId','admin-moderation',
    'data',jsonb_build_object('type','admin_approval','kind',submission_kind,'targetId',new.id)
  )) into tokens
  from public.admin_push_tokens t join public.users u on u.id=t.user_id
  where t.active and u.role='admin';

  if tokens is not null then
    perform net.http_post(url:='https://exp.host/--/api/v2/push/send', body:=tokens,
      headers:='{"Content-Type":"application/json","Accept":"application/json"}'::jsonb,
      timeout_milliseconds:=5000);
  end if;
  return new;
end; $$;
revoke all on function private.notify_admins_of_submission() from public,anon,authenticated;

drop trigger if exists notify_admin_destination_submission on public.destination_suggestions;
create trigger notify_admin_destination_submission after insert on public.destination_suggestions for each row when (new.status='pending') execute function private.notify_admins_of_submission('destination');
drop trigger if exists notify_admin_fauna_submission on public.fauna_species;
create trigger notify_admin_fauna_submission after insert on public.fauna_species for each row when (new.moderation_status='pending') execute function private.notify_admins_of_submission('fauna');
drop trigger if exists notify_admin_commercial_submission on public.commercial_services;
create trigger notify_admin_commercial_submission after insert on public.commercial_services for each row when (new.moderation_status='pending') execute function private.notify_admins_of_submission('commerce');

create or replace function private.review_user_submission(p_kind text,p_id uuid,p_decision text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.users u where u.id=(select auth.uid()) and u.role='admin') then raise exception 'admin_required' using errcode='42501'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_decision' using errcode='22023'; end if;
  if p_kind='destination' then update public.destination_suggestions set status=case p_decision when 'approved' then 'published' else 'rejected' end where id=p_id and status='pending';
  elsif p_kind='fauna' then update public.fauna_species set moderation_status=p_decision where id=p_id and moderation_status='pending';
  elsif p_kind='commerce' then update public.commercial_services set moderation_status=p_decision where id=p_id and moderation_status='pending';
  else raise exception 'invalid_submission_kind' using errcode='22023'; end if;
  if not found then raise exception 'pending_submission_not_found' using errcode='P0002'; end if;
end; $$;
revoke all on function private.review_user_submission(text,uuid,text) from public,anon,authenticated;
create or replace function public.review_user_submission(p_kind text,p_id uuid,p_decision text)
returns void language sql security invoker set search_path='' as $$ select private.review_user_submission(p_kind,p_id,p_decision) $$;
revoke all on function public.review_user_submission(text,uuid,text) from public,anon;
grant execute on function public.review_user_submission(text,uuid,text) to authenticated;

-- Keep registration atomic while forcing owner-created businesses to moderation.
create or replace function public.register_commercial_service_v2(p_payload jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare actor_id uuid := (select auth.uid()); service_id uuid; category_id text := nullif(btrim(p_payload->>'category'),''); subcategory_ids text[]:=array(select jsonb_array_elements_text(coalesce(p_payload->'subcategories','[]'::jsonb))); latitude double precision:=(p_payload->>'latitude')::double precision; longitude double precision:=(p_payload->>'longitude')::double precision;
begin
 if actor_id is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if nullif(btrim(p_payload->>'title'),'') is null then raise exception 'title_required' using errcode='23514'; end if;
 if latitude not between -90 and 90 or longitude not between -180 and 180 then raise exception 'invalid_coordinates' using errcode='23514'; end if;
 insert into public.commercial_services(owner_id,category,subcategories,main_category,subcategory,title,description,price_range,location,phone_whatsapp,whatsapp,booking_url,menu_url,opening_hours,parking,has_parking,payment_methods,accessibility,languages,experience_type,certifications,photos,cover_image_url,claim_status,source,is_claimed,business_updated_at,moderation_status)
 values(actor_id,category_id,subcategory_ids,category_id,coalesce(nullif(array_to_string(subcategory_ids,', '),''),category_id),left(btrim(p_payload->>'title'),160),nullif(left(btrim(coalesce(p_payload->>'description','')),2000),''),nullif(left(btrim(coalesce(p_payload->>'priceRange','')),40),''),public.st_setsrid(public.st_makepoint(longitude,latitude),4326),nullif(left(btrim(coalesce(p_payload->>'phone','')),80),''),nullif(left(btrim(coalesce(p_payload->>'whatsapp','')),80),''),nullif(left(btrim(coalesce(p_payload->>'bookingUrl','')),500),''),nullif(left(btrim(coalesce(p_payload->>'menuUrl','')),500),''),nullif(left(btrim(coalesce(p_payload->>'openingHours','')),160),''),nullif(left(btrim(coalesce(p_payload->>'parking','')),500),''),coalesce((p_payload->>'hasParking')::boolean,false),array(select jsonb_array_elements_text(coalesce(p_payload->'paymentMethods','[]'::jsonb))),nullif(left(btrim(coalesce(p_payload->>'accessibility','')),500),''),array(select jsonb_array_elements_text(coalesce(p_payload->'languages','[]'::jsonb))),nullif(left(btrim(coalesce(p_payload->>'experienceType','')),160),''),array(select jsonb_array_elements_text(coalesce(p_payload->'certifications','[]'::jsonb))),array(select jsonb_array_elements_text(coalesce(p_payload->'photos','[]'::jsonb))),nullif(btrim(coalesce(p_payload->>'coverImageUrl','')),''),'claimed','owner_registered',true,now(),'pending') returning id into service_id;
 return service_id;
end; $$;
revoke all on function public.register_commercial_service_v2(jsonb) from public,anon;
grant execute on function public.register_commercial_service_v2(jsonb) to authenticated;
