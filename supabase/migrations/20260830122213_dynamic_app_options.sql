create table public.app_options (
  kind text not null,
  id text not null,
  label_es text not null,
  label_en text not null,
  icon text,
  parent_id text,
  allowed_targets text[],
  sort_order integer not null default 0,
  active boolean not null default true,
  primary key (kind, id)
);

alter table public.app_options enable row level security;
grant select on public.app_options to authenticated;
create policy "Usuarios consultan opciones activas" on public.app_options
  for select to authenticated using (active);

insert into public.app_options (kind,id,label_es,label_en,icon,parent_id,allowed_targets,sort_order) values
('commerce_category','food','Comida','Food','silverware-fork-knife',null,null,10),
('commerce_category','lodging','Hospedaje','Lodging','bed',null,null,20),
('commerce_category','adventure','Aventura','Adventure','hiking',null,null,30),
('commerce_category','water_activities','Tours Acuáticos y Pesca','Water Tours & Fishing','ferry',null,null,40),
('commerce_category','nature','Naturaleza','Nature','tree',null,null,50),
('commerce_category','wellness','Termales y bienestar','Wellness','hot-tub',null,null,60),
('commerce_category','guides_experiences','Guías y Experiencias','Guides & Experiences','compass-outline',null,null,70),
('commerce_category','rentals_equipment','Alquileres','Rentals','key-variant',null,null,80),
('commerce_category','transport','Transporte','Transport','car',null,null,90),
('commerce_category','shopping','Compras','Shopping','storefront-outline',null,null,100),
('commerce_category','emergency','Asistencia y emergencias','Assistance & emergencies','lifebuoy',null,null,110),
('commerce_subcategory','canopy_zipline','Canopy / Tirolesa','Canopy / zipline',null,'adventure',null,10),
('commerce_subcategory','atv','Cuadraciclos (ATV)','ATV',null,'adventure',null,20),
('commerce_subcategory','rappel_canyoning','Rappel / Canyoning','Rappel / canyoning',null,'adventure',null,30),
('commerce_subcategory','hiking','Senderismo','Hiking',null,'adventure',null,40),
('commerce_subcategory','cycling','Ciclismo','Cycling',null,'adventure',null,50),
('commerce_subcategory','fishing','Pesca deportiva','Sport fishing',null,'water_activities',null,10),
('commerce_subcategory','boat_tours','Tours en lancha','Boat tours',null,'water_activities',null,20),
('commerce_subcategory','surf','Surf','Surf',null,'water_activities',null,30),
('commerce_subcategory','kayak_sup','Kayak / SUP','Kayak / SUP',null,'water_activities',null,40),
('commerce_subcategory','diving_snorkeling','Buceo / Snorkel','Diving / snorkeling',null,'water_activities',null,50),
('commerce_subcategory','catamaran','Catamarán','Catamaran',null,'water_activities',null,60),
('commerce_subcategory','rafting','Rafting','Rafting',null,'water_activities',null,70),
('commerce_subcategory','certified_guides','Guías certificados','Certified guides',null,'guides_experiences',null,10),
('commerce_subcategory','birdwatching','Avistamiento de aves','Birdwatching',null,'guides_experiences',null,20),
('commerce_subcategory','night_walks','Caminatas nocturnas','Night walks',null,'guides_experiences',null,30),
('commerce_subcategory','coffee_cacao','Tour café / cacao','Coffee / cacao tour',null,'guides_experiences',null,40),
('commerce_subcategory','surf_cooking_classes','Clases de surf / cocina','Surf / cooking classes',null,'guides_experiences',null,50),
('commerce_subcategory','rent_a_car','Rent a car local','Local rent-a-car',null,'rentals_equipment',null,10),
('commerce_subcategory','atv_bikes','Cuadraciclos / Bikes','ATV / bikes',null,'rentals_equipment',null,20),
('commerce_subcategory','boards_kayaks','Tablas / Kayaks','Boards / kayaks',null,'rentals_equipment',null,30),
('commerce_subcategory','camping_equipment','Equipo de camping','Camping equipment',null,'rentals_equipment',null,40),
('traveler_topic','general','Comunidad Viajera','Traveler Community','account-group',null,null,0),
('traveler_topic','moteros','Moteros 🏍️','Bikers 🏍️','motorbike',null,null,10),
('traveler_topic','enduro','Enduro 🏁','Enduro 🏁','flag-checkered',null,null,20),
('traveler_topic','convoy_4x4','Convoy 4x4 🛣️','4x4 Convoy 🛣️','car-traction-control',null,null,30),
('traveler_reaction','like','Me gusta','Like','👍',null,null,10),
('traveler_reaction','love','Me encanta','Love','❤️',null,null,20),
('traveler_reaction','laugh','Me divierte','Funny','😂',null,null,30),
('traveler_reaction','wow','Me asombra','Wow','😮',null,null,40),
('traveler_reaction','angry','Me enoja','Angry','😡',null,null,50),
('traveler_reaction','sad','Me disgusta','Dislike','🤢',null,null,60),
('report_type','incorrect_information','Reportar información incorrecta','Report incorrect information','flag-outline',null,array['destination','commercial_service','road'],10),
('report_type','destination_closed','Destino cerrado','Destination closed','map-marker-off',null,array['destination'],20),
('report_type','price_changed','Precio cambió','Price changed','cash-edit',null,array['destination','commercial_service'],30),
('report_type','hours_outdated','Horario no actualizado','Hours are outdated','clock-alert-outline',null,array['destination','commercial_service'],40),
('report_type','road_affected','Carretera afectada','Road affected','road-variant',null,array['road'],50),
('report_type','business_closed','Negocio ya no opera','Business no longer operates','store-off-outline',null,array['commercial_service'],60);

create or replace function public.validate_app_option()
returns trigger language plpgsql set search_path = '' as $$
declare
  option_value text := to_jsonb(new) ->> tg_argv[1];
  target_value text := case when tg_nargs > 2 then to_jsonb(new) ->> tg_argv[2] end;
begin
  if not exists (
    select 1 from public.app_options
    where kind = tg_argv[0] and id = option_value and active
      and (target_value is null or allowed_targets is null or target_value = any(allowed_targets))
  ) then raise exception 'invalid % option: %', tg_argv[0], option_value using errcode = '23514'; end if;
  return new;
end $$;

create or replace function public.validate_commerce_taxonomy()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.app_options where kind='commerce_category' and id=new.category and active) then
    raise exception 'invalid commerce category: %', new.category using errcode='23514';
  end if;
  if exists (select 1 from unnest(coalesce(new.subcategories, '{}'::text[])) item where not exists (
    select 1 from public.app_options where kind='commerce_subcategory' and id=item and parent_id=new.category and active
  )) then raise exception 'invalid commerce subcategory' using errcode='23514'; end if;
  return new;
end $$;

alter table public.commercial_services drop constraint if exists commercial_services_category_check;
alter table public.traveler_posts drop constraint if exists traveler_posts_topic_check;
alter table public.traveler_reactions drop constraint if exists traveler_reactions_reaction_check;
alter table public.information_reports drop constraint if exists information_reports_report_type_check;

create trigger validate_commerce_taxonomy before insert or update of category,subcategories on public.commercial_services for each row execute function public.validate_commerce_taxonomy();
create trigger validate_traveler_topic before insert or update of topic on public.traveler_posts for each row execute function public.validate_app_option('traveler_topic','topic');
create trigger validate_traveler_reaction before insert or update of reaction on public.traveler_reactions for each row execute function public.validate_app_option('traveler_reaction','reaction');
create trigger validate_information_report_type before insert or update of report_type,target_type on public.information_reports for each row execute function public.validate_app_option('report_type','report_type','target_type');

revoke all on function public.validate_app_option() from public, anon, authenticated;
revoke all on function public.validate_commerce_taxonomy() from public, anon, authenticated;
