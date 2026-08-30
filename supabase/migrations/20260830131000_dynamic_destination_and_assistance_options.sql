insert into public.app_options (kind,id,label_es,label_en,icon,parent_id,allowed_targets,sort_order) values
('destination_difficulty','Fácil','Fácil','Easy','walk',null,null,10),
('destination_difficulty','Moderada','Moderada','Moderate','hiking',null,null,20),
('destination_difficulty','Difícil','Difícil','Difficult','terrain',null,null,30),
('assistance_category','hospitals','Hospitales','Hospitals','hospital-building',null,array['hospital'],10),
('assistance_category','firefighters','Bomberos','Fire stations','fire-truck',null,array['bomberos','fire_station'],20),
('assistance_category','police','Estaciones de policía','Police stations','police-badge',null,array['policia'],30),
('assistance_category','red-cross','Cruz Roja','Red Cross','medical-bag',null,array['cruz_roja','red_cross'],40),
('assistance_category','embassies','Embajadas y Consulados','Embassies and Consulates','flag-variant',null,array['embajada','consulado','embassy','consulate'],50),
('assistance_category','immigration','Migración y Extranjería','Immigration','passport',null,array['migracion_extranjeria','migracion','extranjeria','immigration'],60),
('assistance_category','coast-guard','Guardacostas','Coast Guard','lifebuoy',null,array['guardacostas','coast_guard'],70),
('assistance_category','traffic-police','Tránsito / Policía de Tráfico','Traffic Police','car-emergency',null,array['policia_transito','transito','traffic_police'],80),
('assistance_category','private-emergency','Clínicas y urgencias 24/7','Private urgent care / 24/7 clinics','hospital-box-outline',null,array['clinica','urgencias_privadas','clinica_24_7'],90),
('notification_type','like','reaccionó a tu publicación','reacted to your post','thumb-up-outline',null,null,10),
('notification_type','review','publicó una reseña','published a review','star-outline',null,null,20),
('notification_type','follow','empezó a seguirte','started following you','account-plus-outline',null,null,30),
('notification_type','system_alert','generó una alerta del sistema','created a system alert','alert-outline',null,null,40),
('notification_type','claim_verified','tu reclamo comercial fue revisado','your business claim was reviewed','check-decagram-outline',null,null,50),
('notification_type','comment','respondió a tu conversación','replied to your conversation','comment-outline',null,null,60),
('notification_type','new_post','publicó algo nuevo','published something new','post-outline',null,null,70),
('notification_type','message','te envió un mensaje','sent you a message','message-outline',null,null,80),
('notification_type','photo_featured','hizo que tu foto sea la portada del destino','made your photo the destination cover','image-star-outline',null,null,90),
('notification_type','admin_approval','hay una solicitud que requiere tu decisión','there is a request that needs your decision','shield-check-outline',null,null,100)
on conflict (kind,id) do update set label_es=excluded.label_es,label_en=excluded.label_en,icon=excluded.icon,allowed_targets=excluded.allowed_targets,sort_order=excluded.sort_order;

insert into public.app_options (kind,id,label_es,label_en,icon,sort_order)
select 'destination_category', category, category, category, 'map-marker-outline', row_number() over (order by category) * 10
from (select distinct trim(category) category from public.destinations where status='Activo' and trim(category)<>'') categories
on conflict (kind,id) do nothing;

insert into public.app_options (kind,id,label_es,label_en,icon,sort_order) values
('destination_category','Playa','Playa','Beaches','waves',10),
('destination_category','Catarata','Catarata','Waterfalls','waterfall',20),
('destination_category','Volcán','Volcán','Volcanoes','image-filter-hdr',30),
('destination_category','Parque Nacional','Parque Nacional','National Parks','pine-tree',40),
('destination_category','Cultura','Cultura','Culture','bank-outline',50),
('destination_category','Río','Río','Rivers','waves',60),
('destination_category','Mirador','Mirador','Viewpoints','binoculars',70),
('destination_category','Termales','Termales','Hot springs','hot-tub',80),
('destination_category','Senderismo','Senderismo','Hiking','hiking',90),
('destination_category','Pozas / Lagos','Pozas / Lagos','Pools / Lakes','water',100),
('destination_category','Santuarios de animales','Santuarios de animales','Animal Sanctuaries','paw',110),
('destination_category','Reservas naturales y forestales','Reservas naturales y forestales','Nature Reserves','forest',120),
('destination_category','Refugios de vida silvestre','Refugios de vida silvestre','Wildlife Refuges','bird',130),
('destination_category','Experiencia Gastronómica','Experiencia Gastronómica','Food Experiences','silverware-fork-knife',140),
('destination_category','Bares / Discotecas','Bares / Discotecas','Bars / Nightclubs','glass-cocktail',150)
on conflict (kind,id) do update set label_en=excluded.label_en,icon=excluded.icon,sort_order=excluded.sort_order;

create or replace function public.sync_destination_category_option()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if nullif(trim(new.category),'') is not null then
    insert into public.app_options(kind,id,label_es,label_en,icon,sort_order)
    values('destination_category',trim(new.category),trim(new.category),trim(new.category),'map-marker-outline',1000)
    on conflict (kind,id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists sync_destination_category_option on public.destinations;
create trigger sync_destination_category_option after insert or update of category on public.destinations for each row execute function public.sync_destination_category_option();
drop trigger if exists sync_suggestion_category_option on public.destination_suggestions;
create trigger sync_suggestion_category_option after insert or update of category on public.destination_suggestions for each row execute function public.sync_destination_category_option();

alter table public.destination_suggestions drop constraint if exists destination_suggestions_difficulty_check;
create trigger validate_destination_suggestion_difficulty before insert or update of difficulty on public.destination_suggestions for each row execute function public.validate_app_option('destination_difficulty','difficulty');

alter table public.notifications drop constraint if exists notifications_type_check;
create trigger validate_notification_type before insert or update of type on public.notifications for each row execute function public.validate_app_option('notification_type','type');

create or replace function public.get_public_app_options(p_kinds text[])
returns table(kind text,id text,label_es text,label_en text,icon text,parent_id text,allowed_targets text[])
language sql stable security definer set search_path='' as $$
  select o.kind,o.id,o.label_es,o.label_en,o.icon,o.parent_id,o.allowed_targets
  from public.app_options o where o.active and o.kind=any(p_kinds)
  order by o.kind,o.sort_order,o.id
$$;
revoke all on function public.get_public_app_options(text[]) from public;
grant execute on function public.get_public_app_options(text[]) to anon, authenticated;
revoke all on function public.sync_destination_category_option() from public, anon, authenticated;
