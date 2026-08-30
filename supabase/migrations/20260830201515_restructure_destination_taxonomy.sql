-- Replace the flat, data-derived destination list with a closed two-level taxonomy.
drop trigger if exists sync_destination_category_option on public.destinations;
drop trigger if exists sync_suggestion_category_option on public.destination_suggestions;
drop function if exists public.sync_destination_category_option();

delete from public.app_options where kind = 'destination_category';

alter table public.app_options
  drop constraint if exists app_options_parent_not_self;
alter table public.app_options
  add constraint app_options_parent_not_self check (parent_id is null or parent_id <> id);

insert into public.app_options
  (kind, id, label_es, label_en, icon, parent_id, allowed_targets, sort_order)
values
  ('destination_category','beaches','Playas','Beaches','waves',null,array['playa','beach'],10),
  ('destination_category','waterfalls','Cataratas','Waterfalls','waterfall',null,array['catarata','waterfall'],20),
  ('destination_category','volcanoes','Volcanes','Volcanoes','image-filter-hdr',null,array['volcan','volcano'],30),
  ('destination_category','rivers-pools','Ríos y Pozas','Rivers & Pools','water',null,array['rio','poza','lago','laguna','river','pool','lake'],40),
  ('destination_category','viewpoints','Miradores','Viewpoints','binoculars',null,array['mirador','viewpoint'],50),
  ('destination_category','hiking','Senderismo','Hiking','hiking',null,array['sender','caminata','hiking','trail'],60),
  ('destination_category','national-parks','Parques Nacionales','National Parks','pine-tree',null,array['parque nacional','national park'],70),
  ('destination_category','wildlife-reserves','Reservas Silvestres','Wildlife Reserves','forest',null,array['reserva','refugio de vida silvestre','wildlife refuge','nature reserve'],80),
  ('destination_category','animal-sanctuaries','Santuarios de Animales','Animal Sanctuaries','paw',null,array['santuario','animal sanctuary'],90),
  ('destination_category','hot-springs','Termales','Hot Springs','hot-tub',null,array['termal','hot spring'],100),
  ('destination_category','gastronomy','Experiencia Gastronómica','Gastronomic Experience','silverware-fork-knife',null,array['gastronom','comida','restaurante','cafe','cacao','food'],110),
  ('destination_category','nightlife','Vida Nocturna','Nightlife','glass-cocktail',null,array['bar','discoteca','vida nocturna','nightlife','club'],120);

insert into public.app_options
  (kind, id, label_es, label_en, icon, parent_id, allowed_targets, sort_order)
values
  ('destination_category','beaches-isolated','Aislada','Secluded',null,'beaches',array['aislada','remota','secluded','remote'],10),
  ('destination_category','beaches-surf','Surf','Surf',null,'beaches',array['surf'],20),
  ('destination_category','beaches-white-sand','Arena blanca','White sand',null,'beaches',array['arena blanca','white sand'],30),
  ('destination_category','beaches-black-sand','Arena negra','Black sand',null,'beaches',array['arena negra','black sand'],40),
  ('destination_category','beaches-snorkeling','Snorkel','Snorkeling',null,'beaches',array['snorkel','buceo','diving'],50),
  ('destination_category','waterfalls-swimming','Para nadar','Swimming',null,'waterfalls',array['nadar','natacion','swimming'],10),
  ('destination_category','waterfalls-hiking','Con sendero','With trail',null,'waterfalls',array['sender','caminata','trail','hiking'],20),
  ('destination_category','waterfalls-rappel','Rappel','Rappelling',null,'waterfalls',array['rappel','canyoning'],30),
  ('destination_category','volcanoes-active','Activos','Active',null,'volcanoes',array['activo','active'],10),
  ('destination_category','volcanoes-craters','Cráteres','Craters',null,'volcanoes',array['crater'],20),
  ('destination_category','volcanoes-hot-springs','Aguas termales','Hot springs',null,'volcanoes',array['termal','hot spring'],30),
  ('destination_category','rivers','Ríos','Rivers',null,'rivers-pools',array['rio','river'],10),
  ('destination_category','pools','Pozas','Pools',null,'rivers-pools',array['poza','pool'],20),
  ('destination_category','lakes-lagoons','Lagos y Lagunas','Lakes & Lagoons',null,'rivers-pools',array['lago','laguna','lake','lagoon'],30),
  ('destination_category','viewpoints-mountain','Montaña','Mountain',null,'viewpoints',array['montana','mountain'],10),
  ('destination_category','viewpoints-coast','Costa','Coast',null,'viewpoints',array['costa','oceano','mar','coast','ocean'],20),
  ('destination_category','viewpoints-sunset','Atardecer','Sunset',null,'viewpoints',array['atardecer','sunset'],30),
  ('destination_category','hiking-easy','Fácil','Easy',null,'hiking',array['facil','easy'],10),
  ('destination_category','hiking-moderate','Moderado','Moderate',null,'hiking',array['moderad','moderate'],20),
  ('destination_category','hiking-hard','Difícil','Hard',null,'hiking',array['dificil','hard'],30),
  ('destination_category','hiking-caves','Cuevas','Caves',null,'hiking',array['cueva','caverna','cave'],40),
  ('destination_category','parks-rainforest','Bosque tropical','Rainforest',null,'national-parks',array['bosque tropical','rainforest'],10),
  ('destination_category','parks-marine','Marino','Marine',null,'national-parks',array['marino','marine'],20),
  ('destination_category','parks-volcanic','Volcánico','Volcanic',null,'national-parks',array['volcan'],30),
  ('destination_category','reserves-birds','Aves','Birds',null,'wildlife-reserves',array['ave','bird'],10),
  ('destination_category','reserves-cloud-forest','Bosque nuboso','Cloud forest',null,'wildlife-reserves',array['bosque nuboso','cloud forest'],20),
  ('destination_category','reserves-wetlands','Humedales','Wetlands',null,'wildlife-reserves',array['humedal','wetland'],30),
  ('destination_category','sanctuaries-sloths','Perezosos','Sloths',null,'animal-sanctuaries',array['perezoso','sloth'],10),
  ('destination_category','sanctuaries-cats','Felinos','Wild cats',null,'animal-sanctuaries',array['felino','jaguar','puma','ocelote','cat'],20),
  ('destination_category','sanctuaries-birds','Aves','Birds',null,'animal-sanctuaries',array['ave','bird'],30),
  ('destination_category','sanctuaries-turtles','Tortugas','Turtles',null,'animal-sanctuaries',array['tortuga','turtle'],40),
  ('destination_category','hot-springs-volcanic','Volcánicas','Volcanic',null,'hot-springs',array['volcan'],10),
  ('destination_category','hot-springs-natural','Naturales','Natural',null,'hot-springs',array['natural'],20),
  ('destination_category','hot-springs-wellness','Bienestar','Wellness',null,'hot-springs',array['spa','bienestar','wellness'],30),
  ('destination_category','gastronomy-coffee-cacao','Café y cacao','Coffee & cacao',null,'gastronomy',array['cafe','cacao','coffee'],10),
  ('destination_category','gastronomy-traditional','Cocina tradicional','Traditional cuisine',null,'gastronomy',array['tradicional','tipica','traditional'],20),
  ('destination_category','gastronomy-seafood','Mariscos','Seafood',null,'gastronomy',array['marisco','seafood'],30),
  ('destination_category','nightlife-bars','Bares','Bars',null,'nightlife',array['bar'],10),
  ('destination_category','nightlife-clubs','Discotecas','Nightclubs',null,'nightlife',array['discoteca','nightclub','club'],20),
  ('destination_category','nightlife-live-music','Música en vivo','Live music',null,'nightlife',array['musica en vivo','live music'],30);

create index if not exists app_options_kind_parent_sort_idx
  on public.app_options (kind, parent_id, sort_order)
  where active;

create or replace function public.validate_destination_category_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind = 'destination_category'
     and new.parent_id is not null
     and not exists (
       select 1
       from public.app_options parent
       where parent.kind = 'destination_category'
         and parent.id = new.parent_id
         and parent.parent_id is null
     ) then
    raise exception 'invalid destination category parent: %', new.parent_id
      using errcode = '23503';
  end if;
  return new;
end
$$;

drop trigger if exists validate_destination_category_parent on public.app_options;
create trigger validate_destination_category_parent
before insert or update of kind, parent_id on public.app_options
for each row execute function public.validate_destination_category_parent();

revoke all on function public.validate_destination_category_parent() from public, anon, authenticated;

do $$
begin
  if (select count(*) from public.app_options where kind = 'destination_category' and parent_id is null) <> 12 then
    raise exception 'destination taxonomy must contain exactly 12 root categories';
  end if;
  if exists (
    select 1
    from public.app_options child
    left join public.app_options parent
      on parent.kind = child.kind and parent.id = child.parent_id
    where child.kind = 'destination_category'
      and child.parent_id is not null
      and (parent.id is null or parent.parent_id is not null)
  ) then
    raise exception 'destination taxonomy contains an invalid level-2 parent';
  end if;
end
$$;
