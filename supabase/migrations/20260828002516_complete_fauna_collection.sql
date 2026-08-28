-- Complete the Costa Rica life-list catalog with reusable, credited-source images.
update public.fauna_species
set image_url = case scientific_name
  when 'Nasua narica' then 'https://inaturalist-open-data.s3.amazonaws.com/photos/5022455/medium.jpeg'
  when 'Crocodylus acutus' then 'https://inaturalist-open-data.s3.amazonaws.com/photos/9155899/medium.jpeg'
  when 'Amazilia boucardi' then 'https://inaturalist-open-data.s3.amazonaws.com/photos/311298/medium.jpg'
  when 'Trichechus manatus' then 'https://inaturalist-open-data.s3.amazonaws.com/photos/61186254/medium.jpg'
  when 'Pinaroloxias inornata' then 'https://inaturalist-open-data.s3.amazonaws.com/photos/56340085/medium.jpg'
  when 'Hyalinobatrachium dianae' then 'https://inaturalist-open-data.s3.amazonaws.com/photos/47826535/medium.jpeg'
  when 'Odocoileus virginianus' then 'https://inaturalist-open-data.s3.amazonaws.com/photos/58166047/medium.jpg'
  when 'Turdus grayi' then 'https://inaturalist-open-data.s3.amazonaws.com/photos/85503922/medium.jpg'
  else image_url
end
where scientific_name in (
  'Nasua narica', 'Crocodylus acutus', 'Amazilia boucardi', 'Trichechus manatus',
  'Pinaroloxias inornata', 'Hyalinobatrachium dianae', 'Odocoileus virginianus', 'Turdus grayi'
);

-- Bradypus tridactylus does not occur in Costa Rica; preserve the row/id by correcting it.
update public.fauna_species set
  common_name_es = 'Perezoso de Dos Dedos', common_name_en = 'Hoffmann''s Two-toed Sloth',
  scientific_name = 'Choloepus hoffmanni', category = 'Mamífero',
  description = 'Perezoso nocturno de pelaje largo que habita bosques húmedos y secundarios.',
  description_en = 'Nocturnal long-haired sloth of humid and secondary forests.',
  habitat = 'Bosques húmedos del Caribe y Pacífico', habitat_en = 'Caribbean and Pacific humid forests',
  vulnerability_status = 'Preocupación Menor (LC)', province = 'Costa Rica', tour_observable = true,
  is_endemic = false, is_national_symbol = true,
  image_url = 'https://inaturalist-open-data.s3.amazonaws.com/photos/144252981/medium.jpeg'
where scientific_name = 'Bradypus tridactylus';

insert into public.fauna_species (
  common_name_es, common_name_en, scientific_name, category, description, description_en,
  habitat, habitat_en, vulnerability_status, province, tour_observable, is_endemic,
  is_national_symbol, image_url
) values
('Mono Aullador de Manto','Mantled Howler Monkey','Alouatta palliata','Mamífero','Primate conocido por sus potentes vocalizaciones al amanecer.','Primate known for its powerful dawn calls.','Bosques secos, húmedos y ribereños','Dry, humid and riverine forests','Vulnerable (VU)','Costa Rica',true,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/522694169/medium.jpg'),
('Mono Araña Centroamericano','Central American Spider Monkey','Ateles geoffroyi','Mamífero','Primate arborícola de extremidades largas que necesita bosques bien conservados.','Long-limbed arboreal primate that depends on well-preserved forests.','Bosques tropicales maduros','Mature tropical forests','En Peligro (EN)','Costa Rica',true,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/506421718/medium.jpg'),
('Ocelote','Ocelot','Leopardus pardalis','Mamífero','Felino nocturno y sigiloso con pelaje manchado.','Secretive nocturnal wild cat with a spotted coat.','Bosques y humedales','Forests and wetlands','Preocupación Menor (LC)','Costa Rica',false,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/624962198/medium.jpg'),
('Puma','Cougar','Puma concolor','Mamífero','Gran felino adaptable presente en áreas boscosas protegidas.','Adaptable large cat found in protected forest areas.','Bosques montanos y tierras bajas','Mountain and lowland forests','Preocupación Menor (LC)','Costa Rica',false,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/10820975/medium.jpg'),
('Caucel','Margay','Leopardus wiedii','Mamífero','Pequeño felino arborícola de grandes ojos y cola larga.','Small arboreal wild cat with large eyes and a long tail.','Bosques tropicales densos','Dense tropical forests','Casi Amenazada (NT)','Costa Rica',false,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/121068071/medium.gif'),
('Saíno','Collared Peccary','Pecari tajacu','Mamífero','Mamífero social que recorre el bosque en grupos familiares.','Social mammal that travels through forests in family groups.','Bosques secos y húmedos','Dry and humid forests','Preocupación Menor (LC)','Costa Rica',true,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/505661570/medium.jpg'),
('Oso Hormiguero Norteño','Northern Tamandua','Tamandua mexicana','Mamífero','Especialista en hormigas y termitas, activo tanto en árboles como en el suelo.','Ant and termite specialist active in trees and on the ground.','Bosques y manglares','Forests and mangroves','Preocupación Menor (LC)','Costa Rica',true,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/83800281/medium.jpg'),
('Guatusa','Central American Agouti','Dasyprocta punctata','Mamífero','Roedor diurno importante para dispersar semillas del bosque.','Diurnal rodent important for forest seed dispersal.','Bosques y jardines arbolados','Forests and wooded gardens','Preocupación Menor (LC)','Costa Rica',true,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/25796566/medium.jpg'),
('Tepezcuintle','Spotted Paca','Cuniculus paca','Mamífero','Roedor nocturno de cuerpo robusto y manchas blancas laterales.','Stocky nocturnal rodent with white side spots.','Bosques cerca de ríos','Forests near rivers','Preocupación Menor (LC)','Costa Rica',false,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/271854591/medium.jpg'),
('Martilla o Kinkajú','Kinkajou','Potos flavus','Mamífero','Mamífero nocturno y arborícola que se alimenta principalmente de frutos.','Nocturnal arboreal mammal that feeds mainly on fruit.','Dosel de bosques tropicales','Tropical forest canopy','Preocupación Menor (LC)','Costa Rica',false,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/143955539/medium.jpeg'),
('Lapa Verde','Great Green Macaw','Ara ambiguus','Ave','Gran guacamaya dependiente de bosques de almendro de montaña.','Large macaw dependent on mountain almond forests.','Bosques húmedos del Caribe norte','Northern Caribbean humid forests','En Peligro Crítico (CR)','Caribe Norte',true,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/331568941/medium.jpeg'),
('Tucán Pico Castaño','Yellow-throated Toucan','Ramphastos ambiguus','Ave','Tucán grande de garganta amarilla y pico bicolor.','Large toucan with a yellow throat and two-toned bill.','Bosques húmedos de tierras bajas','Humid lowland forests','Casi Amenazada (NT)','Costa Rica',true,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/110613335/medium.jpg'),
('Momoto Cejiceleste','Turquoise-browed Motmot','Eumomota superciliosa','Ave','Ave colorida de cola larga frecuente en áreas abiertas arboladas.','Colorful long-tailed bird common in wooded open areas.','Bosque seco y bordes de bosque','Dry forest and forest edges','Preocupación Menor (LC)','Guanacaste',true,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/143303345/medium.jpeg'),
('Espátula Rosada','Roseate Spoonbill','Platalea ajaja','Ave','Ave acuática rosada que barre aguas someras con su pico plano.','Pink waterbird that sweeps shallow water with its flat bill.','Manglares, esteros y humedales','Mangroves, estuaries and wetlands','Preocupación Menor (LC)','Costa Rica',true,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/174351446/medium.jpeg'),
('Garza Tigre Cuellinuda','Bare-throated Tiger-Heron','Tigrisoma mexicanum','Ave','Garza grande de cuello desnudo que acecha peces en aguas tranquilas.','Large bare-throated heron that stalks fish in calm water.','Ríos, lagunas y manglares','Rivers, lagoons and mangroves','Preocupación Menor (LC)','Costa Rica',true,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/256276616/medium.jpg'),
('Basilisco Verde','Green Basilisk','Basiliscus plumifrons','Reptil','Lagarto verde capaz de correr brevemente sobre el agua.','Green lizard able to run briefly across water.','Riberas y bosques húmedos','Riverbanks and humid forests','Preocupación Menor (LC)','Caribe',true,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/203589937/medium.jpeg'),
('Iguana Verde','Green Iguana','Iguana iguana','Reptil','Lagarto arborícola grande y común cerca de ríos y costas.','Large arboreal lizard common near rivers and coasts.','Bosques ribereños y manglares','Riverine forests and mangroves','Preocupación Menor (LC)','Costa Rica',true,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/19063248/medium.jpeg'),
('Tortuga Baula','Leatherback Sea Turtle','Dermochelys coriacea','Reptil','La tortuga marina más grande del mundo anida en ambas costas del país.','The world''s largest sea turtle nests on both coasts of the country.','Océano abierto y playas de anidación','Open ocean and nesting beaches','Vulnerable (VU)','Costa Rica',true,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/23833432/medium.jpg'),
('Tortuga Lora','Olive Ridley Sea Turtle','Lepidochelys olivacea','Reptil','Tortuga marina conocida por sus arribadas masivas de anidación.','Sea turtle known for mass nesting arrivals.','Pacífico y playas de anidación','Pacific Ocean and nesting beaches','Vulnerable (VU)','Guanacaste',true,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/158956388/medium.jpg'),
('Rana Venenosa Fresa','Strawberry Poison Dart Frog','Oophaga pumilio','Anfibio','Pequeña rana de vivos colores con numerosas variantes regionales.','Small brightly colored frog with many regional color forms.','Bosques húmedos del Caribe','Caribbean humid forests','Preocupación Menor (LC)','Caribe',true,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/52637/medium.jpg'),
('Terciopelo','Fer-de-lance','Bothrops asper','Reptil','Víbora terrestre importante en el equilibrio ecológico del bosque.','Terrestrial pit viper important to forest ecological balance.','Bosques húmedos y áreas rurales','Humid forests and rural areas','Preocupación Menor (LC)','Costa Rica',false,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/26010733/medium.jpg'),
('Boa Centroamericana','Central American Boa','Boa imperator','Reptil','Serpiente constrictora robusta de hábitos principalmente nocturnos.','Robust constrictor snake with mainly nocturnal habits.','Bosques secos y húmedos','Dry and humid forests','Preocupación Menor (LC)','Costa Rica',false,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/129121475/medium.jpeg'),
('Zorro Pelón','Southern Opossum','Didelphis marsupialis','Mamífero','Marsupial nocturno adaptable que también habita zonas urbanizadas.','Adaptable nocturnal marsupial also found in urban areas.','Bosques, cultivos y ciudades','Forests, farmland and cities','Preocupación Menor (LC)','Costa Rica',true,false,false,'https://inaturalist-open-data.s3.amazonaws.com/photos/173131417/medium.jpeg')
on conflict (scientific_name) do update set
  common_name_es = excluded.common_name_es,
  common_name_en = excluded.common_name_en,
  category = excluded.category,
  description = excluded.description,
  description_en = excluded.description_en,
  habitat = excluded.habitat,
  habitat_en = excluded.habitat_en,
  vulnerability_status = excluded.vulnerability_status,
  province = excluded.province,
  tour_observable = excluded.tour_observable,
  is_endemic = excluded.is_endemic,
  is_national_symbol = excluded.is_national_symbol,
  image_url = excluded.image_url;
