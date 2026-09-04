-- Generated from ultimo.json. Rewrites the 386 matched active destinations while preserving unrelated fields.
begin;

create table if not exists private.destination_content_backups (
  batch_key text not null,
  destination_id uuid not null,
  snapshot jsonb not null,
  backed_up_at timestamptz not null default now(),
  primary key (batch_key, destination_id)
);
revoke all on table private.destination_content_backups from public, anon, authenticated;

create temporary table destination_refresh_payload (
  match_name text not null,
  match_ordinal integer not null,
  name text not null,
  description_es text not null,
  description_en text not null,
  categories text[] not null,
  latitude double precision not null,
  longitude double precision not null
) on commit drop;

insert into destination_refresh_payload
select * from jsonb_to_recordset($researched_destinations$[
  {
    "match_name": "🌄 Cerro Pelón: un mirador secreto en San Ramón con vista al golfo",
    "match_ordinal": 1,
    "name": "Cerro Pelón",
    "description_es": "El Cerro Pelón es un mirador natural ubicado en Río Jesús de San Ramón, Alajuela, sobre un risco rocoso con vista panorámica del Golfo de Nicoya y las montañas aledañas. Se accede por camino de lastre y una caminata corta hasta la cima, donde hay un rancho rústico con agua y baños para descansar y tomar fotografías. Es un destino de medio día para picnic, atardeceres y senderismo leve, sin servicios comerciales permanentes.",
    "description_en": "Cerro Pelon is a natural viewpoint in Rio Jesus, San Ramon, Alajuela, set on a rocky outcrop with panoramic views of the Gulf of Nicoya and surrounding mountains. It is reached by gravel road and a short hike to the summit, where a rustic shelter with water and restrooms offers space to rest and take photos. It is a half-day destination for picnics, sunsets and easy hiking, with no permanent commercial services.",
    "categories": [
      "Miradores",
      "Senderismo"
    ],
    "latitude": 10.153271,
    "longitude": -84.62216
  },
  {
    "match_name": "🌄 Cerro Urán: El hermano secreto del Chirripó que te roba el aliento",
    "match_ordinal": 1,
    "name": "Cerro Urán",
    "description_es": "El Cerro Urán es una cumbre de alrededor de 3600 a 3660 metros sobre el nivel del mar dentro del Parque Nacional Chirripó, en la Cordillera de Talamanca, considerada la segunda altura de Cartago y una de las más altas del país. Forma parte de la travesía de alta montaña Herradura-Urán-Chirripó, una ruta de varios días por páramo, lagunas de origen glaciar, crestas rocosas y bosque nuboso que exige excelente condición física, guía autorizado y reserva previa. Desde su doble cumbre se obtienen vistas extensas de la cordillera en días despejados.",
    "description_en": "Cerro Uran is a summit of around 3,600 to 3,660 meters above sea level inside Chirripo National Park in the Talamanca Range, regarded as the second highest peak in Cartago and one of the highest in the country. It is part of the Herradura-Uran-Chirripo high-mountain traverse, a multi-day route through paramo, glacial lakes, rocky ridges and cloud forest that requires excellent fitness, an authorized guide and advance booking. From its double summit there are sweeping views of the range on clear days.",
    "categories": [
      "Parques Nacionales",
      "Senderismo"
    ],
    "latitude": 9.48139979252683,
    "longitude": -83.6128177866233
  },
  {
    "match_name": "🌈 Viento Fresco - Tilarán",
    "match_ordinal": 1,
    "name": "Viento Fresco - Tilarán",
    "description_es": "Las cascadas Viento Fresco, actualmente operadas como Manakin Waterfalls, son un conjunto de cuatro a cinco caídas de agua ubicado a unos 11 km del centro de Tilarán, Guanacaste, sobre la ruta hacia Monteverde. El recorrido de aproximadamente 1.3 km desciende por sendero y gradas entre bosque y potreros hasta pozas aptas para el baño como Río Serena, Escondida y Tobogán, con un mirador hacia la última caída. Cuenta con recepción, traslado interno en vehículo 4x4, restaurante y áreas de picnic, y funciona como parada entre La Fortuna y Monteverde.",
    "description_en": "Viento Fresco Waterfalls, now operated as Manakin Waterfalls, are a group of four to five waterfalls located about 11 km from downtown Tilaran, Guanacaste, on the road to Monteverde. The roughly 1.3 km route descends by trail and steps through forest and pasture to swimmable pools such as Rio Serena, Escondida and Tobogan, with a viewpoint toward the last fall. It offers a reception area, internal 4x4 transfer, restaurant and picnic areas, and works as a stop between La Fortuna and Monteverde.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 10.421,
    "longitude": -84.919
  },
  {
    "match_name": "🌲 Cerro Vueltas Lodge: lluvia, senderos y páramo mágico en el Cerro de la Muerte",
    "match_ordinal": 1,
    "name": "Cerro Vueltas Lodge",
    "description_es": "Cerro Vueltas Lodge es un eco-lodge y finca orgánica educativa ubicado a cerca de 2800 metros de altura en Copey de Dota, en el Cerro de la Muerte. Protege alrededor de 80 hectáreas de bosque nuboso, lluvioso y de páramo con árboles milenarios de podocarpus, musgo andino y más de 14 km de senderos autoguiados o con guía para todos los niveles. Es un sitio destacado para la observación del quetzal y otras aves de altura, con hospedaje rústico, alimentación casera y talleres de agricultura orgánica.",
    "description_en": "Cerro Vueltas Lodge is an eco-lodge and educational organic farm located at nearly 2,800 meters of elevation in Copey de Dota, in the Cerro de la Muerte area. It protects around 80 hectares of cloud, rain and paramo forest with thousand-year-old podocarpus trees, Andean moss and over 14 km of self-guided or guided trails for all levels. It is a notable site for resplendent quetzal and other highland birdwatching, with rustic lodging, home-style meals and organic farming workshops.",
    "categories": [
      "Reservas Silvestres",
      "Senderismo",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 9.63338333937459,
    "longitude": -83.8538104164098
  },
  {
    "match_name": "🌲 Monte Sky – Cataratas escondidas en Orosí",
    "match_ordinal": 1,
    "name": "Monte Sky – Cataratas escondidas en Orosí",
    "description_es": "Monte Sky, también conocido como Mirador Ecológico, es una finca privada de conservación en las montañas de Orosí, Cartago, camino al Parque Nacional Tapantí. Tiene una red de unos 3 km de senderos de baja dificultad entre bosque nuboso que conduce a las cataratas Mirando al Cielo y El Duende, con miradores hacia el Valle de Orosí y volcanes cercanos. Ofrece parqueo, casa de montaña para grupos, zonas de picnic y visitas de un día en un ambiente húmedo con neblina frecuente y alta biodiversidad.",
    "description_en": "Monte Sky, also known as Mirador Ecologico, is a private conservation farm in the mountains of Orosi, Cartago, on the way to Tapanti National Park. It has about 3 km of easy trails through cloud forest leading to the Mirando al Cielo and El Duende waterfalls, with viewpoints over the Orosi Valley and nearby volcanoes. It offers parking, a mountain house for groups, picnic areas and day visits in a humid setting with frequent mist and high biodiversity.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Miradores"
    ],
    "latitude": 9.75,
    "longitude": -83.833
  },
  {
    "match_name": "🌿 Cascada Rana Roja: Un paraíso escondido en Platanillo",
    "match_ordinal": 1,
    "name": "Cascada Rana Roja",
    "description_es": "La Cascada Rana Roja es parte del proyecto familiar Rancho Rana Roja, una finca regenerativa en Platanillo y Torito de Barú, Pérez Zeledón. Incluye una catarata principal con poza para el baño, senderos cortos por potrero y bosque con avistamiento de ranas de colores, estanques de tilapia y restaurante de cocina a la leña donde se puede pescar la propia tilapia. Ofrece hospedaje rural en cabaña con alimentación incluida y visitas de un día con coordinación previa por camino de lastre.",
    "description_en": "Rana Roja Waterfall is part of Rancho Rana Roja, a family-run regenerative farm in Platanillo and Torito de Baru, Perez Zeledon. It features a main waterfall with a swimming pool, short trails through pasture and forest with colorful frog sightings, tilapia ponds and a wood-fired restaurant where visitors can catch their own tilapia. It offers rural cabin lodging with meals included and day visits by prior arrangement via gravel road.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Experiencia Gastronómica"
    ],
    "latitude": 9.345,
    "longitude": -83.831
  },
  {
    "match_name": "🌿 Catarata San Fernando – Aventura en Cinchona",
    "match_ordinal": 1,
    "name": "Catarata San Fernando – Cinchona",
    "description_es": "La Catarata San Fernando es la caída principal del proyecto Cinchona Waterfalls Trails, en Cinchona de Alajuela, a pocos minutos de la Catarata La Paz. El recorrido de aproximadamente 4 a 7 km ida y vuelta según la ruta desciende por bosque tropical húmedo hasta cuatro cataratas, incluidas Botos con poza para nadar y Paula, culminando en el mirador de San Fernando, una pared de casi 100 metros que solo se aprecia a distancia, sin poza apta por su fuerza. El sendero es técnico, con barro, pendientes y tramos con cuerdas, y cuenta con parqueo, baños y duchas en la recepción.",
    "description_en": "San Fernando Waterfall is the main fall of the Cinchona Waterfalls Trails project in Cinchona, Alajuela, minutes from La Paz Waterfall. The roughly 4 to 7 km round-trip route depending on the track descends through humid tropical forest to four waterfalls, including Botos with a swimming pool and Paula, ending at the San Fernando viewpoint, a wall of nearly 100 meters seen only from a distance, with no safe pool due to its power. The trail is technical, with mud, steep grades and roped sections, and offers parking, restrooms and showers at reception.",
    "categories": [
      "Cataratas",
      "Senderismo"
    ],
    "latitude": 10.2233867,
    "longitude": -84.1685722
  },
  {
    "match_name": "🌿 Finca Manglar – Sierpe",
    "match_ordinal": 1,
    "name": "Finca Manglar – Sierpe",
    "description_es": "Finca Manglar es una finca privada de 65 acres en Sábalo de Sierpe, Osa, colindante con el Río Sierpe y el Humedal Nacional Térraba-Sierpe, el manglar más extenso del país. Funciona como hospedaje rural con casa equipada, piscina natural de agua dulce, senderos, cabalgatas, kayak en manglar, tubing y paseos en lancha propia hacia playas cercanas y la desembocadura. Es base para contratar tours externos a Corcovado, Isla del Caño, pesca deportiva y avistamiento estacional de delfines y ballenas.",
    "description_en": "Finca Manglar is a 65-acre private farm in Sabalo de Sierpe, Osa, bordering the Sierpe River and the Terraba-Sierpe National Wetland, the largest mangrove in the country. It operates as rural lodging with an equipped house, natural freshwater pool, trails, horseback rides, mangrove kayaking, tubing and private boat trips to nearby beaches and the river mouth. It is a base for booking outside tours to Corcovado, Cano Island, sport fishing and seasonal dolphin and whale watching.",
    "categories": [
      "Islas y Manglares",
      "Reservas Silvestres",
      "Hospedaje en la Naturaleza",
      "Aventura y Deportes"
    ],
    "latitude": 8.828,
    "longitude": -83.512
  },
  {
    "match_name": "🌿 Reserva Targuá: naturaleza, senderos y piscina natural en Santa Ana",
    "match_ordinal": 1,
    "name": "Reserva Targuá",
    "description_es": "La Reserva Targuá es una reserva privada de 14 hectáreas dentro de la Zona Protectora Cerros de Escazú, a unos 15 minutos del centro de Santa Ana, San José. Tiene cerca de 5 km de senderos entre bosque secundario con vistas al valle y a las eólicas, además de una pequeña poza de manantial, ranchos, zonas verdes para picnic y áreas de juego. Opera con reserva previa y abre de martes a domingo con entrada de un día, acepta mascotas y permite llevar alimentos o coordinar menú, como escapada cercana sin caminatas exigentes.",
    "description_en": "Reserva Targua is a 14-hectare private reserve inside the Cerros de Escazu Protected Zone, about 15 minutes from downtown Santa Ana, San Jose. It has nearly 5 km of trails through secondary forest with valley and wind-turbine views, plus a small spring-fed pool, shelters, green picnic areas and play spaces. It operates by prior reservation and opens Tuesday to Sunday with day admission, welcomes pets and allows visitors to bring food or arrange catering, as a nearby getaway without demanding hikes.",
    "categories": [
      "Senderismo",
      "Reservas Silvestres"
    ],
    "latitude": 9.89386943050729,
    "longitude": -84.1882073521964
  },
  {
    "match_name": "🌿 Restaurante Senderos: Cataratas, pozas y comida rica en San Ramón",
    "match_ordinal": 1,
    "name": "Restaurante Senderos",
    "description_es": "Restaurante Senderos es un restaurante de comida típica costarricense en Barranca de Piedades Sur de San Ramón, Alajuela, que combina gastronomía con un circuito de siete cataratas y pozas en bosque y quebradas, según publica el propio negocio. Los senderos de dificultad baja a media permiten recorrer caídas como La Perla, con pozas para refrescarse, en visitas de medio día de unas 2 a 3 horas y unos 5 km en total. Cuenta con parqueo, áreas familiares y atención directa, con acceso señalizado por calle rural.",
    "description_en": "Restaurante Senderos is a Costa Rican traditional restaurant in Barranca de Piedades Sur, San Ramon, Alajuela, combining dining with a circuit of seven waterfalls and pools in forest and streams, as advertised by the business itself. Easy to moderate trails lead to falls such as La Perla, with pools for cooling off, on half-day visits of about 2 to 3 hours and 5 km in total. It has parking, family areas and personal service, accessed by a marked rural road.",
    "categories": [
      "Cataratas",
      "Experiencia Gastronómica",
      "Senderismo"
    ],
    "latitude": 10.1101428,
    "longitude": -84.5098405
  },
  {
    "match_name": "🌿 Talamanca Nature Reserve: 1600 hectáreas de pura aventura en San Gerardo de Rivas",
    "match_ordinal": 1,
    "name": "Talamanca Nature Reserve",
    "description_es": "La Reserva Natural Talamanca es una reserva privada de bosque nuboso ubicada en San Gerardo de Rivas, en Pérez Zeledón, al pie de la cordillera de Talamanca y muy cerca del acceso al Parque Nacional Chirripó. Protege una extensa superficie de bosque con senderos ecológicos, miradores, ríos y cataratas formadas por los ríos Urán y Chirripó-Pacífico, además de pozas naturales para el baño. Es un sitio reconocido para la observación de aves, con más de 300 especies registradas, mariposas, orquídeas y mamíferos de montaña, y ofrece cabañas rústicas, restaurante y visitas de un día con guía.",
    "description_en": "Talamanca Nature Reserve is a private cloud-forest reserve located in San Gerardo de Rivas, Perez Zeledon, at the foot of the Talamanca range and very close to the entrance of Chirripo National Park. It protects an extensive area of forest with ecological trails, viewpoints, rivers and waterfalls formed by the Uran and Chirripo-Pacifico rivers, as well as natural swimming pools. It is a well-known birdwatching site, with more than 300 recorded species, butterflies, orchids and mountain mammals, and offers rustic cabins, a restaurant and guided day visits.",
    "categories": [
      "Reservas Silvestres",
      "Senderismo",
      "Cataratas"
    ],
    "latitude": 9.464,
    "longitude": -83.596
  },
  {
    "match_name": "🍃 La Marta – Naturaleza para todos los niveles en Cartago",
    "match_ordinal": 1,
    "name": "La Marta – Refugio de Vida Silvestre",
    "description_es": "El Refugio de Vida Silvestre La Marta, uno de los primeros refugios privados del país y presentado por sus gestores como el primero, está ubicado en Pejibaye de Jiménez, en Cartago, con más de 1500 hectáreas de bosque húmedo tropical entre bosque primario y secundario. Es atravesado por los ríos Marta y Gato, de agua clara, que forman pozas y balnearios naturales, y cuenta con una red de más de 17 kilómetros de senderos señalizados de dificultad baja a alta. Incluye el Mirador La Mina con vista panorámica, un circuito histórico con antiguo beneficio, trapiche y planta hidroeléctrica, un sendero de concreto accesible y alta diversidad de flora y fauna.",
    "description_en": "La Marta Wildlife Refuge, one of the first private wildlife refuges in the country and presented by its managers as the first, is located in Pejibaye de Jimenez, Cartago, with more than 1,500 hectares of tropical wet forest including primary and secondary forest. It is crossed by the Marta and Gato rivers, with clear water that forms natural pools and swimming areas, and has a network of more than 17 kilometers of marked trails ranging from easy to difficult. It includes the La Mina viewpoint with panoramic views, a historic circuit with an old coffee mill, sugar mill and hydroelectric plant, an accessible concrete trail and high diversity of plants and wildlife.",
    "categories": [
      "Reservas Silvestres",
      "Senderismo",
      "Ríos y Pozas",
      "Cultura e Historia"
    ],
    "latitude": 9.786,
    "longitude": -83.686
  },
  {
    "match_name": "🏖️ Playa Rosada – Nosara",
    "match_ordinal": 1,
    "name": "Playa Rosada – Nosara",
    "description_es": "Playa Rosada, también asociada a Playa Cuarzo, es una pequeña cala rocosa ubicada al sur de Playa Guiones y Playa Pelada, en Nosara, Guanacaste. Debe su nombre al tono rosado de la arena, producido por la mezcla de arena clara con diminutas conchas trituradas y fragmentos de cuarzo, más visible con marea baja y luz suave. Solo es accesible a pie por la costa rocosa durante la marea baja, no tiene servicios ni acceso vehicular directo, y es apta para fotografía, exploración de pozas de marea y snorkel en condiciones tranquilas, no para natación abierta.",
    "description_en": "Playa Rosada, also associated with Playa Cuarzo, is a small rocky cove located south of Playa Guiones and Playa Pelada in Nosara, Guanacaste. It owes its name to the pinkish tone of the sand, produced by light sand mixed with tiny crushed shells and quartz fragments, most visible at low tide and in soft light. It is only accessible on foot over coastal rocks at low tide, has no services or direct vehicle access, and is suitable for photography, tide-pool exploration and snorkeling in calm conditions, not for open swimming.",
    "categories": [
      "Playas",
      "Senderismo"
    ],
    "latitude": 9.91,
    "longitude": -85.662
  },
  {
    "match_name": "🏖️ Playas de La Cruz – Guanacaste",
    "match_ordinal": 1,
    "name": "Playas de La Cruz – Guanacaste",
    "description_es": "Las playas del cantón de La Cruz, en el extremo norte de Guanacaste, forman un conjunto cantonal diverso frente al Pacífico que incluye Playa Rajada, El Jobo, el puerto pesquero de Cuajiniquil, el Refugio Bahía Junquillal y la zona ventosa de Bahía Salinas y Santa Elena. Combinan bahías protegidas de oleaje suave con sectores de viento para kitesurf, rodeadas de bosque tropical seco, manglares como los de Cuajiniquil y comunidades pesqueras. Varias cuentan con Bandera Azul Ecológica y permiten natación, picnic, snorkel, kayak, pesca artesanal y observación estacional de tortugas, delfines y ballenas, con servicios básicos en poblados cercanos.",
    "description_en": "The beaches of La Cruz canton, in far northern Guanacaste, form a diverse coastal group on the Pacific that includes Playa Rajada, El Jobo, the fishing port of Cuajiniquil, the Bahia Junquillal refuge and the windy Salinas and Santa Elena bay area. They combine sheltered low-surf bays with windy kitesurf sectors, surrounded by tropical dry forest, mangroves such as Cuajiniquil and fishing villages. Several hold Ecological Blue Flag status and allow swimming, picnicking, snorkeling, kayaking, artisanal fishing and seasonal sightings of turtles, dolphins and whales, with basic services in nearby towns.",
    "categories": [
      "Playas",
      "Islas y Manglares"
    ],
    "latitude": 11.023,
    "longitude": -85.7
  },
  {
    "match_name": "🏝️ Drake – Parte 1: Aventura en la Península de Osa",
    "match_ordinal": 1,
    "name": "Bahía Drake – Península de Osa",
    "description_es": "Bahía Drake, cuyo núcleo es el pueblo de Agujitas de Drake, es una bahía selvática en la costa norte de la Península de Osa, en Puntarenas, sin carreteras asfaltadas y rodeada de bosque lluvioso. Funciona como base principal para visitar en bote el Parque Nacional Corcovado y la Reserva Biológica Isla del Caño, ubicada mar adentro, con arrecifes de coral y aguas aptas para snorkel y buceo. En sus aguas son frecuentes los delfines manchados y nariz de botella, tortugas marinas y ballenas jorobadas en temporada, y en tierra hay playas como Playa Colorada y senderos costeros cortos. El acceso es por lancha desde Sierpe, avioneta o vehículo alto en época seca, con servicios básicos y sin cajeros automáticos.",
    "description_en": "Bahia Drake, centered on the village of Agujitas de Drake, is a jungle bay on the northern coast of the Osa Peninsula in Puntarenas, with no paved roads and surrounded by rainforest. It serves as a main boat base for visiting Corcovado National Park and the offshore Cano Island Biological Reserve, with coral reefs and waters suitable for snorkeling and diving. Its waters are frequented by spotted and bottlenose dolphins, sea turtles and seasonal humpback whales, while on land there are beaches such as Playa Colorada and short coastal trails. Access is by boat from Sierpe, small plane, or high-clearance vehicle in the dry season, with basic services and no ATMs.",
    "categories": [
      "Playas",
      "Senderismo",
      "Islas y Manglares",
      "Parques Nacionales"
    ],
    "latitude": 8.68735808769815,
    "longitude": -83.7061339
  },
  {
    "match_name": "🏞️ Laguna de Plata: picnic, laguito y naturaleza en Heredia",
    "match_ordinal": 1,
    "name": "Laguna de Plata",
    "description_es": "Laguna de Plata es una finca privada de día de campo ubicada en Montecito, en Los Ángeles de San Rafael de Heredia, en las montañas heredianas. Su atractivo central es una pequeña laguna recreativa de agua de montaña con puente para fotos y botes de alquiler para paseos cortos, rodeada de zonas verdes, ranchos para picnic, caminitos internos, juegos infantiles y animales de granja como patos y conejos. Dispone de cabañas, restaurante de fin de semana, parqueo y áreas para actividades familiares, y funciona como destino cercano para tardear y hacer picnic sin senderismo exigente.",
    "description_en": "Laguna de Plata is a private day-use country farm located in Montecito, Los Angeles de San Rafael de Heredia, in the Heredia mountains. Its central attraction is a small recreational mountain-water lagoon with a photo bridge and rental rowboats for short rides, surrounded by green areas, picnic shelters, short internal paths, a playground and farm animals such as ducks and rabbits. It has cabins, a weekend restaurant, parking and areas for family gatherings, and works as a nearby destination for afternoon visits and picnics without demanding hiking.",
    "categories": [
      "Hospedaje en la Naturaleza",
      "Ríos y Pozas"
    ],
    "latitude": 10.0674625,
    "longitude": -84.0921094
  },
  {
    "match_name": "🐎 Cerro Caballito: una joya en las alturas de Guanacaste",
    "match_ordinal": 1,
    "name": "Cerro Caballito",
    "description_es": "Cerro Caballito es un cerro gestionado como emprendimiento familiar en la comunidad de Caballito, en Nicoya, Guanacaste, cerca del Puente de la Amistad sobre el Tempisque. Alcanza alrededor de 440 metros sobre el nivel del mar y se asciende por un sendero de unos 3 kilómetros entre potreros, pendiente rocosa y bosque seco guanacasteco. En la parte alta hay cuatro miradores, incluido un mirador de 360 grados, además de una caverna visitable, zonas arqueológicas, área de camping y punto de parapente, con vistas amplias de la cordillera volcánica de Guanacaste, el Golfo de Nicoya y la llanura, especialmente al atardecer.",
    "description_en": "Cerro Caballito is a hill managed as a family-run project in the community of Caballito, Nicoya, Guanacaste, near the Friendship Bridge over the Tempisque River. It rises to about 440 meters above sea level and is climbed by a trail of about 3 kilometers through pastures, rocky slopes and Guanacaste dry forest. At the top there are four viewpoints, including a 360-degree viewpoint, plus a walk-in cavern, archaeological areas, a camping area and a paragliding point, with broad views of the Guanacaste volcanic range, the Gulf of Nicoya and the lowlands, especially at sunset.",
    "categories": [
      "Miradores",
      "Senderismo",
      "Montañas y Cerros"
    ],
    "latitude": 10.2642093861971,
    "longitude": -85.3467290260965
  },
  {
    "match_name": "🐒 Refugio de Vida Silvestre Curú – Playas, senderos y bioluminiscencia en Puntarenas",
    "match_ordinal": 1,
    "name": "Refugio de Vida Silvestre Curú",
    "description_es": "El Refugio Nacional de Vida Silvestre Curú es una reserva privada en Paquera, al sur de la Península de Nicoya, en Puntarenas, que combina bosque tropical seco y húmedo, manglares, ríos y playas frente al Golfo de Nicoya. Tiene una red de senderos de baja a media dificultad, como Finca de Monos, Ceiba, Laguna y Mirador, donde se observan monos congo, carablanca y araña reintroducido, venados, pizotes, mapaches, aves y cangrejos. Incluye Playa Curú de arena clara y la virgen Playa Quesera, accesible a pie, en kayak o en bote, además de tours a Isla Tortuga, snorkel, cabalgatas y excursiones nocturnas de bioluminiscencia.",
    "description_en": "Curu National Wildlife Refuge is a private reserve in Paquera, in the southern Nicoya Peninsula, Puntarenas, combining dry and humid tropical forest, mangroves, rivers and beaches on the Gulf of Nicoya. It has a network of easy to moderate trails, such as Finca de Monos, Ceiba, Laguna and Mirador, where white-faced, howler and reintroduced spider monkeys, deer, coatis, raccoons, birds and crabs can be seen. It includes clear-sand Playa Curu and pristine Playa Quesera, reachable on foot, by kayak or by boat, plus tours to Tortuga Island, snorkeling, horseback rides and nighttime bioluminescence trips.",
    "categories": [
      "Reservas Silvestres",
      "Playas",
      "Senderismo"
    ],
    "latitude": 9.776,
    "longitude": -84.944
  },
  {
    "match_name": "🐦 Tierra de Quetzales: senderismo, cascadas y avionetas perdidas en Copey",
    "match_ordinal": 1,
    "name": "Tierra de Quetzales",
    "description_es": "Tierra de Quetzales es un proyecto privado de senderismo en Copey de Dota, en San José, dentro de la Reserva Forestal Los Santos y el bosque nuboso de la zona de Los Santos. Ofrece senderos cortos y moderados entre robles gigantes, helechos arborescentes, musgo, ríos y pequeñas cascadas, con una cascada pequeña, un árbol hueco de gran tamaño y, según relato de la familia operadora, restos de antiguas avionetas accidentadas en el bosque. Es hábitat del quetzal, colibríes, tangaras y otra avifauna de altura, en un ambiente fresco, húmedo y de neblina frecuente, apto para caminatas guiadas de corta duración y observación de naturaleza.",
    "description_en": "Tierra de Quetzales is a private hiking project in Copey de Dota, San Jose, within the Los Santos Forest Reserve and the cloud forest of the Los Santos region. It offers short, moderate trails among giant oaks, tree ferns, moss, rivers and small waterfalls, with a small waterfall, a large hollow tree and, according to the operating family, the remains of old crashed light aircraft in the forest. It is habitat for the resplendent quetzal, hummingbirds, tanagers and other highland birds, in a cool, humid environment with frequent mist, suitable for short guided walks and nature observation.",
    "categories": [
      "Senderismo",
      "Reservas Silvestres",
      "Cataratas"
    ],
    "latitude": 9.636143,
    "longitude": -83.85738
  },
  {
    "match_name": "🐾 Corcovado – Sector La Leona: una probadita de la selva más intensa del mundo",
    "match_ordinal": 1,
    "name": "Corcovado – Sector La Leona",
    "description_es": "El Sector La Leona es el acceso terrestre principal al Parque Nacional Corcovado, en Carate, Osa, Puntarenas, y se llega caminando unos 3.5 kilómetros por playa desde Carate, accesible en 4x4 o transporte colectivo desde Puerto Jiménez. Tiene un sendero lineal de intensidad moderada que pasa por sitios como Madrigal, el antiguo cementerio, Paraíso y formaciones rocosas con cavernas visibles en marea baja, entre selva intensa y playa. Es zona de alta biodiversidad con monos, lapas, tapires y anidación estacional de tortugas, y conecta con la Estación Sirena en una caminata costera larga que requiere reserva previa y guía.",
    "description_en": "La Leona Sector is the main land entrance to Corcovado National Park at Carate, Osa, Puntarenas, reached by walking about 3.5 kilometers along the beach from Carate, accessible by 4x4 or shared transport from Puerto Jimenez. It has a moderate linear trail passing sites such as Madrigal, the old cemetery, Paraiso and rock formations with caves visible at low tide, between intense rainforest and beach. It is an area of high biodiversity with monkeys, scarlet macaws, tapirs and seasonal turtle nesting, and connects to Sirena Station on a long coastal hike that requires advance booking and a guide.",
    "categories": [
      "Parques Nacionales",
      "Senderismo",
      "Playas"
    ],
    "latitude": 8.442,
    "longitude": -83.454
  },
  {
    "match_name": "🐾 Esterillos Oeste: pozas, playa y un hotel con piscina en forma de hueso",
    "match_ordinal": 1,
    "name": "Esterillos Oeste",
    "description_es": "Esterillos Oeste es una playa del Pacífico Central ubicada en el cantón de Parrita, Puntarenas, de arena gris y oleaje moderado a fuerte, frecuentada para surf y caminatas extensas. En su extremo norte rocoso se encuentra la escultura de bronce La Sirena y, durante la marea baja, se forman piscinas naturales entre las rocas aptas para el baño. Es un sector menos masificado que Jacó, sin guardavidas permanentes y con vigilancia solo en temporada alta, por lo que se recomienda precaución ante corrientes de resaca.",
    "description_en": "Esterillos Oeste is a Pacific Central beach in Parrita, Puntarenas, with gray sand and moderate to strong surf, popular for surfing and long beach walks. At its rocky northern end stands the bronze La Sirena sculpture, and at low tide natural rock pools form areas suitable for bathing. It is less crowded than nearby Jaco, with no permanent lifeguards and patrols only in high season, so caution is advised due to rip currents.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.53166948073767,
    "longitude": -84.4987340290704
  },
  {
    "match_name": "🐾 Wildlife Rescue Center (ZooAve) - Un santuario natural en Alajuela",
    "match_ordinal": 1,
    "name": "Wildlife Rescue Center (ZooAve)",
    "description_es": "El Wildlife Rescue Center, anteriormente conocido como ZooAve, es un centro de rescate de fauna sin fines de lucro ubicado en La Garita de Alajuela, a pocos minutos del Aeropuerto Juan Santamaría. Opera un hospital veterinario y programas de rehabilitación, liberación y reproducción de especies amenazadas, y mantiene un santuario con cientos de animales no liberables en recintos naturalizados entre jardines tropicales. Está abierto al público todos los días con senderos accesibles y visitas guiadas enfocadas en conservación y educación ambiental.",
    "description_en": "The Wildlife Rescue Center, formerly known as ZooAve, is a nonprofit wildlife rescue center in La Garita, Alajuela, a few minutes from Juan Santamaria International Airport. It operates a veterinary hospital and rehabilitation, release and endangered-species breeding programs, and maintains a sanctuary for hundreds of non-releasable animals in naturalized enclosures amid tropical gardens. It is open daily to the public with accessible trails and guided visits focused on conservation and environmental education.",
    "categories": [
      "Santuarios de Animales"
    ],
    "latitude": 10.012365,
    "longitude": -84.275541
  },
  {
    "match_name": "💎 Las Gemelas Fantásticas – Bajos del Toro",
    "match_ordinal": 1,
    "name": "Las Gemelas – Blue Falls, Bajos del Toro",
    "description_es": "Las Gemelas son dos cataratas contiguas ubicadas en Bajos del Toro, Sarchí, en las faldas del Volcán Poás, conocidas por el tono azul turquesa del agua por minerales de origen volcánico. Se visitan dentro de una propiedad privada con acceso guiado y senderos de bosque que incluyen cruces de río y tramos lodosos y resbaladizos. El color es más intenso en época seca o después de varias horas sin lluvia fuerte y el baño depende del caudal y las indicaciones del guía.",
    "description_en": "Las Gemelas are two adjacent waterfalls in Bajos del Toro, Sarchi, on the slopes of Poas Volcano, known for their turquoise-blue water caused by volcanic minerals. They are visited on private property with guided access and forest trails that include river crossings and muddy, slippery sections. The blue color is most intense in the dry season or after several hours without heavy rain, and swimming depends on water flow and guide instructions.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 10.251,
    "longitude": -84.268
  },
  {
    "match_name": "💦 Catarata del Río Pozo Azul: Naturaleza salvaje cerca del Caribe",
    "match_ordinal": 1,
    "name": "Catarata del Río Pozo Azul – La Virgen de Sarapiquí",
    "description_es": "La Catarata del Río Pozo Azul es una caída de agua en zona de bosque húmedo caribeño cerca de La Virgen de Sarapiquí, Heredia, en un entorno rural poco desarrollado. El acceso se realiza desde una propiedad privada junto a la vía principal y continúa por un sendero corto en bosque denso hasta una poza de tonos verdes y azules utilizada por visitantes locales para el baño. No se recomienda el ingreso durante lluvias intensas por crecidas repentinas y el sendero puede estar resbaladizo.",
    "description_en": "The Pozo Azul River Waterfall is a waterfall in Caribbean humid forest near La Virgen de Sarapiqui, Heredia, in a rural and little-developed setting. Access is through private property beside the main road, followed by a short trail through dense forest to a green-blue pool used by local visitors for swimming. Visiting during heavy rain is not recommended due to flash flooding, and the trail can be slippery.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas"
    ],
    "latitude": 10.371,
    "longitude": -84.141
  },
  {
    "match_name": "💦 Catarata La 28 - Aventura entre potreros y río en Turrialba",
    "match_ordinal": 1,
    "name": "Catarata La 28 - Turrialba",
    "description_es": "La Catarata La 28 se ubica en Santa Cruz de Turrialba, Cartago, en una zona de potreros ganaderos que descienden hacia un río de bosque ribereño. La caminata combina un tramo abierto sin sombra por fincas y luego el avance río arriba entre piedras grandes, troncos caídos y agua cristalina, con dificultad moderada a alta y regreso en ascenso exigente. La caída es alta y de agua fría, apta para un baño refrescante después de la caminata, con precaución por piedras resbaladizas y cambios de caudal.",
    "description_en": "La 28 Waterfall is located in Santa Cruz de Turrialba, Cartago, in cattle pastureland descending toward a riparian forest river. The hike combines an exposed farm section without shade and then an upstream river section among large boulders, fallen trees and clear water, with moderate to high difficulty and a demanding uphill return. The fall is tall and cold, suitable for a refreshing swim after the hike, with caution for slippery rocks and changing water levels.",
    "categories": [
      "Cataratas",
      "Senderismo"
    ],
    "latitude": 9.959,
    "longitude": -83.716
  },
  {
    "match_name": "💦 Catarata Las Trillizas – Turrialba",
    "match_ordinal": 1,
    "name": "Catarata Las Trillizas – Turrialba",
    "description_es": "Las Trillizas son tres cataratas contiguas dentro de una finca lechera privada entre San Antonio y Guayabito, en Santa Cruz de Turrialba, rodeadas de bosque lluvioso y potreros. El sendero es corto, de aproximadamente un kilómetro en bajada con tramos húmedos, gradas rústicas y un cruce de río poco profundo antes de llegar a las pozas. El baño en agua fría es posible según el caudal y la autorización del guía, generalmente en las pozas de las dos primeras caídas; la tercera tiene corriente y profundidad variables y solo se nada con indicación de la finca.",
    "description_en": "Las Trillizas are three adjacent waterfalls on a private dairy farm between San Antonio and Guayabito in Santa Cruz de Turrialba, surrounded by rainforest and pastureland. The trail is short, about one kilometer downhill with wet sections, rustic steps and a shallow river crossing before reaching the pools. Cold-water swimming is possible depending on flow and guide authorization, usually in the first two pools; the third has variable current and depth and is only swum with farm guidance.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 9.974,
    "longitude": -83.704
  },
  {
    "match_name": "💦 Las Pilas de Parrita – Puntarenas",
    "match_ordinal": 1,
    "name": "Las Pilas de Parrita",
    "description_es": "Las Pilas de Parrita son tres pozas naturales de agua dulce ubicadas en Playón de Parrita, Puntarenas, rodeadas de árboles en una zona de potreros y bosque de galería. Se llega por un sendero sencillo de ida y vuelta de unos tres kilómetros, accesible con automóvil hasta el parqueo cercano, con un cobro modesto de ingreso en propiedad privada. Las pozas, algunas profundas y bordeadas de piedra, se utilizan para nadar y saltar al agua, y es recomendable llevar hidratación y no dejar residuos.",
    "description_en": "Las Pilas de Parrita are three natural freshwater pools in Playon de Parrita, Puntarenas, surrounded by trees in pastureland and gallery forest. They are reached by an easy out-and-back trail of about three kilometers, accessible by regular car to a nearby parking area, with a modest entrance fee on private property. The pools, some deep and edged with rock, are used for swimming and jumping, and visitors should bring water and leave no waste.",
    "categories": [
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 9.610542,
    "longitude": -84.321613
  },
  {
    "match_name": "💦 Poza El Cañón – Finca San Gerardo, San Ramón",
    "match_ordinal": 1,
    "name": "Poza El Cañón – Finca San Gerardo",
    "description_es": "La Poza El Cañón es una poza encajonada entre paredes rocosas dentro de la Finca San Gerardo, en el sector de Cambronero, San Ramón de Alajuela. La finca es una propiedad privada con varios kilómetros de senderos señalizados, además de otras pozas, la catarata Esmeralda, miradores, nacientes y áreas de picnic, con abundante vegetación y fauna local. La caminata hasta El Cañón es de dificultad moderada, con ascensos y tramos húmedos, y el agua es fría y profunda por lo que se requiere precaución.",
    "description_en": "Poza El Canon is a pool enclosed by rocky walls inside Finca San Gerardo in Cambronero, San Ramon de Alajuela. The farm is a private property with several kilometers of marked trails, plus other pools, the Esmeralda waterfall, viewpoints, springs and picnic areas, with dense vegetation and local wildlife. The hike to El Canon is moderately difficult, with climbs and wet sections, and the water is cold and deep, so caution is required.",
    "categories": [
      "Ríos y Pozas",
      "Senderismo",
      "Miradores"
    ],
    "latitude": 10.033,
    "longitude": -84.535
  },
  {
    "match_name": "💧 Finca San Rafael: pozas esmeralda y un rincón mágico en Toro Amarillo",
    "match_ordinal": 1,
    "name": "Finca San Rafael – Toro Amarillo",
    "description_es": "La Finca San Rafael es una propiedad privada en Toro Amarillo, Bajos del Toro, dedicada a senderismo y pozas de montaña de tonos esmeralda y celestes. Cuenta con senderos cortos en bosque, miradores del valle y varias pozas de agua fría y cristalina y una pequeña catarata, utilizadas para nadar y tomar fotografías, con acceso mediante ingreso controlado y parqueo. La zona es húmeda y lluviosa, por lo que los senderos pueden volverse técnicos y resbaladizos después de la lluvia.",
    "description_en": "Finca San Rafael is a private property in Toro Amarillo, Bajos del Toro, dedicated to hiking and emerald and light-blue mountain pools. It has short forest trails, valley viewpoints and several cold, clear pools plus a small waterfall, used for swimming and photography, with controlled entrance and parking. The area is humid and rainy, so trails can become technical and slippery after rainfall.",
    "categories": [
      "Ríos y Pozas",
      "Senderismo",
      "Miradores",
      "Cataratas"
    ],
    "latitude": 10.264772,
    "longitude": -84.263958
  },
  {
    "match_name": "🦅 Reserva Indígena Kekoldi – Talamanca",
    "match_ordinal": 1,
    "name": "Reserva Indígena Kekoldi – Talamanca",
    "description_es": "La Reserva Indígena Kekoldi es un territorio indígena bribri ubicado en Talamanca, Limón, cerca de Hone Creek y Puerto Viejo, en la cordillera de Talamanca. Protege bosque tropical con nacientes de agua, un programa comunitario de cría de iguana verde, cultivos tradicionales como cacao y plantas de uso medicinal, y es reconocida como área importante para la observación de aves migratorias y residentes. Las visitas se realizan con guías locales mediante caminatas por senderos, centros de interpretación y muestras de artesanía y cultura tradicional.",
    "description_en": "The Kekoldi Indigenous Reserve is a Bribri indigenous territory in Talamanca, Limon, near Hone Creek and Puerto Viejo in the Talamanca range. It protects tropical forest with headwaters, a community green iguana breeding program, traditional crops such as cacao and medicinal plants, and is recognized as an important area for migratory and resident birdwatching. Visits are led by local guides with trail hikes, interpretation centers and displays of traditional culture and crafts.",
    "categories": [
      "Cultura e Historia",
      "Senderismo",
      "Turismo Comunitario"
    ],
    "latitude": 9.656,
    "longitude": -82.847
  },
  {
    "match_name": "🦓 Safari, Canopy y Catarata en La Ponderosa - Liberia",
    "match_ordinal": 1,
    "name": "Safari, Canopy y Catarata en La Ponderosa - Liberia",
    "description_es": "La Ponderosa es un parque privado de aventura en El Salto, al sur de Liberia, en zona de bosque seco tropical y sabana guanacasteca, conocido antes como Africa Mia. Combina un safari en carreta o vehículo abierto para observar jirafas, cebras, ñus, avestruces y otros animales en amplios potreros, con canopy sobre la sabana, tubing en el río, cabalgatas y visita a la catarata La Perla, con poza para el baño. Cuenta con restaurante, senderos y servicios para visitas de un día, en un entorno cálido y polvoriento en época seca.",
    "description_en": "La Ponderosa is a private adventure park in El Salto, south of Liberia, in Guanacaste dry tropical forest and savanna, formerly known as Africa Mia. It combines an open-vehicle safari to see giraffes, zebras, wildebeest, ostriches and other animals in large fields with savanna ziplines, river tubing, horseback rides and a visit to La Perla waterfall with a swimming pool. It offers a restaurant, trails and day-visit facilities in a hot, dusty setting in the dry season.",
    "categories": [
      "Santuarios de Animales",
      "Aventura y Deportes",
      "Cataratas"
    ],
    "latitude": 10.556,
    "longitude": -85.397
  },
  {
    "match_name": "Adventure Park",
    "match_ordinal": 1,
    "name": "Adventure Park",
    "description_es": "En la zona de los cerros de Heredia, en los alrededores de San José de la Montaña, el Adventure Park es un espacio de bosque nuboso y bosque montano dedicado al ciclismo de montaña y al senderismo. Dispone de una red de senderos con saltos, peraltes y tramos de descenso para distintos niveles, además de rutas para caminar entre vegetación densa, niebla frecuente y miradores hacia el Valle Central. Es un destino de día para deporte al aire libre, con clima fresco y acceso por calle rural desde Heredia.",
    "description_en": "In the Heredia hills around San Jose de la Montana, Adventure Park is a cloud-forest and montane-forest area devoted to mountain biking and hiking. It has a network of trails with jumps, berms and downhill sections for different levels, plus walking routes through dense vegetation, frequent mist and viewpoints toward the Central Valley. It is a day destination for outdoor sports, with cool weather and rural road access from Heredia.",
    "categories": [
      "Aventura y Deportes",
      "Senderismo",
      "Montañas y Cerros"
    ],
    "latitude": 10.082338,
    "longitude": -84.105642
  },
  {
    "match_name": "Agujas – Bijagual: Kayak, Catarata y Atardecer 🔥",
    "match_ordinal": 1,
    "name": "Agujas – Bijagual: Kayak, Catarata y Atardecer",
    "description_es": "Esta ruta combinada une la costa de Playa Agujas, en el Pacífico Central, con el interior de Bijagual de Turrubares. Inicia con kayak de mar por aguas tranquilas bordeando acantilados selváticos hasta Playa Limoncito, con parada para snorkel en arrecife, y continúa hacia la catarata Manantial Aguas de Vida en Bijagual, una caída alta sobre pared rocosa a la que se llega por un sendero empinado de bajada y subida entre bosque, con pozas en el camino. El cierre habitual es el atardecer desde los acantilados de Playa Guacalillo.",
    "description_en": "This combined route links Playa Agujas on the Central Pacific with inland Bijagual de Turrubares. It starts with sea kayaking in calm waters along jungle cliffs to Limoncito beach, with a reef snorkeling stop, and continues to the Manantial Aguas de Vida waterfall in Bijagual, a tall fall over a rock face reached by a steep forest trail down and up, with pools along the way. The usual finale is sunset from the Guacalillo cliffs.",
    "categories": [
      "Aventura y Deportes",
      "Cataratas",
      "Playas"
    ],
    "latitude": 9.721,
    "longitude": -84.65
  },
  {
    "match_name": "Albergue Socorro- Colonia Virgen de Socorro",
    "match_ordinal": 1,
    "name": "Albergue Socorro - Colonia Virgen de Socorro",
    "description_es": "El Albergue El Socorro es una posada rural en Colonia Virgen del Socorro, San Miguel de Sarapiquí, dentro de una reserva forestal privada de media montaña situada entre los parques nacionales Volcán Poás y Braulio Carrillo. Ofrece hospedaje sencillo, alimentación casera y senderos por bosque lluvioso para caminatas, observación de aves y educación ambiental. Es una base tranquila para explorar la zona norte del Valle Central y el Caribe, con acceso por calle rural y clima húmedo y fresco.",
    "description_en": "Albergue El Socorro is a rural lodge in Colonia Virgen del Socorro, San Miguel de Sarapiqui, inside a mid-elevation private forest reserve located between Poas Volcano and Braulio Carrillo national parks. It offers simple lodging, home cooking and rainforest trails for hiking, birdwatching and environmental education. It is a quiet base for exploring the northern Central Valley and Caribbean side, reached by rural road in humid, cool weather.",
    "categories": [
      "Hospedaje en la Naturaleza",
      "Senderismo",
      "Reservas Silvestres"
    ],
    "latitude": 10.279773,
    "longitude": -84.166817
  },
  {
    "match_name": "Bahía Junquillal: Acampar frente al paraíso en Guanacaste",
    "match_ordinal": 1,
    "name": "Bahía Junquillal: Acampar frente al paraíso en Guanacaste",
    "description_es": "En la zona de Cuajiniquil, en La Cruz, el Refugio Nacional de Vida Silvestre Bahía Junquillal protege una bahía tranquila de arena clara, bosque seco, manglar y un islote rocoso visible desde la costa. Es distinto de Playa Junquillal de Santa Cruz y ofrece área para acampar y pasar el día, con baños, duchas, senderos cortos y zona de baño señalizada, en un entorno poco desarrollado con certificación de limpieza costera. No se permite hacer fogatas ni extraer plantas, conchas o animales, por tratarse de área protegida marina y terrestre.",
    "description_en": "Near Cuajiniquil in La Cruz, the Bahia Junquillal National Wildlife Refuge protects a calm light-sand bay with dry forest, mangrove and a rocky islet seen from shore. Different from Junquillal beach in Santa Cruz, it offers camping and day-use areas with restrooms, showers, short trails and a marked swimming zone in an undeveloped setting recognized for coastal cleanliness. Campfires and collecting plants, shells or animals are prohibited because it is a marine and terrestrial protected area.",
    "categories": [
      "Playas",
      "Reservas Silvestres",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.9222,
    "longitude": -85.7111
  },
  {
    "match_name": "Bajos La Paz – Cabalgata a la catarata La Danta 🐎💧",
    "match_ordinal": 1,
    "name": "Bajos La Paz – Cabalgata a la catarata La Danta",
    "description_es": "En Bajos La Paz, en las montañas de San Ramón de Alajuela, se ofrece una cabalgata guiada por potreros, riachuelos y bosque nuboso hasta la catarata La Danta, una caída alta con poza de agua fría para el baño. La visita, que se coordina con familias locales y se hace en parte a caballo y en parte por sendero estrecho entre nacientes, debe su nombre a una leyenda sobre una danta perseguida por un cazador. El clima es húmedo y neblinoso, con vistas amplias en días despejados y caminos de lastre que piden carro alto.",
    "description_en": "In Bajos La Paz in the San Ramon mountains of Alajuela, a guided horseback ride crosses pastures, streams and cloud forest to La Danta waterfall, a tall fall with a cold swimming pool. The visit, arranged with local families and done partly on horseback and partly on a narrow trail among springs, is named for a legend about a tapir chased by a hunter. The climate is humid and misty, with broad views on clear days and gravel roads where a high-clearance car is advisable.",
    "categories": [
      "Cataratas",
      "Aventura y Deportes",
      "Senderismo"
    ],
    "latitude": 10.166,
    "longitude": -84.55
  },
  {
    "match_name": "BIOLLEY - PUNTARENAS",
    "match_ordinal": 1,
    "name": "BIOLLEY - PUNTARENAS",
    "description_es": "Biolley es un distrito rural de Buenos Aires de Puntarenas, en la zona de amortiguamiento del Parque Internacional La Amistad, de clima montañoso húmedo y paisajes de bosque, cafetales y potreros. Destaca por el turismo rural comunitario, con senderos como Valle del Silencio y Gigantes del Bosque, observación de aves, fincas de café y proyectos gastronómicos y artesanales impulsados por organizaciones locales. El acceso es por caminos de lastre desde Paso Real y la zona es base para exploraciones guiadas de varios días dentro del área protegida.",
    "description_en": "Biolley is a rural district of Buenos Aires in Puntarenas, in the buffer zone of La Amistad International Park, with humid mountain weather and landscapes of forest, coffee farms and pastures. It stands out for community-based rural tourism, with trails such as Valle del Silencio and Gigantes del Bosque, birdwatching, coffee farms and food and craft projects run by local groups. Access is by gravel roads from Paso Real and the area is a base for multi-day guided explorations inside the protected area.",
    "categories": [
      "Parques Nacionales",
      "Cultura e Historia",
      "Experiencia Gastronómica",
      "Turismo Comunitario"
    ],
    "latitude": 9.033,
    "longitude": -83.037
  },
  {
    "match_name": "Bosque de la Hoja",
    "match_ordinal": 1,
    "name": "Bosque de la Hoja",
    "description_es": "El Bosque de la Hoja es un centro recreativo municipal en Montecito de Los Ángeles de San Rafael de Heredia, formado por plantaciones de ciprés, pino y eucalipto y áreas verdes abiertas. Tiene un sendero principal circular y ramales secundarios bajo sombra, ranchos con parrilla para picnic, cancha de fútbol, juegos infantiles, circuito para bicicletas y baños. Es un paseo familiar de un día con clima frío y ventoso, donde se recomienda llevar abrigo, comida y manta, ya que no hay venta de alimentos.",
    "description_en": "Bosque de la Hoja is a municipal recreation center in Montecito de Los Angeles de San Rafael de Heredia, made up of cypress, pine and eucalyptus plantations and open green areas. It has a main loop trail and secondary shaded paths, picnic shelters with grills, a soccer field, playground, bike circuit and restrooms. It is a family day trip with cold, windy weather, so visitors should bring warm clothing, food and a blanket since no food is sold inside.",
    "categories": [
      "Senderismo",
      "Montañas y Cerros"
    ],
    "latitude": 10.0769,
    "longitude": -84.1022
  },
  {
    "match_name": "Bosque Del Niño - Grecia",
    "match_ordinal": 1,
    "name": "Bosque Del Niño - Grecia",
    "description_es": "El Bosque del Niño es el sector visitable de la Reserva Forestal Grecia, en las faldas del Volcán Poás, en San Isidro de Grecia, Alajuela. Su nombre recuerda una reforestación realizada por niños de comunidades vecinas en el año internacional de la niñez, con pino, ciprés y eucalipto dentro de bosque secundario. Tiene senderos cortos como Los Pinos y Carboneras y una ruta hacia mirador de catarata, además de ranchos para picnic, cancha y área para acampar, con función de aula al aire libre para escuelas y clima frío y lluvioso.",
    "description_en": "Bosque del Nino is the visitor sector of the Grecia Forest Reserve on the slopes of Poas Volcano in San Isidro de Grecia, Alajuela. Its name recalls a reforestation carried out by children from nearby communities in the international year of the child, with pine, cypress and eucalyptus within secondary forest. It has short trails such as Los Pinos and Carboneras and a route toward a waterfall viewpoint, plus picnic shelters, a field and a camping area, serving as an outdoor classroom for schools in cold, rainy weather.",
    "categories": [
      "Senderismo",
      "Reservas Silvestres",
      "Cataratas"
    ],
    "latitude": 10.133,
    "longitude": -84.256
  },
  {
    "match_name": "Brasilito & Conchal",
    "match_ordinal": 1,
    "name": "Brasilito & Conchal",
    "description_es": "Brasilito es un pueblo pesquero tranquilo en la costa de Santa Cruz, Guanacaste, que sirve de acceso público a la vecina Playa Conchal, famosa por su orilla de fragmentos de conchas y aguas turquesas claras. Mientras Brasilito tiene arena más oscura, oleaje moderado y ambiente local con sodas y hospedajes sencillos, Conchal ofrece nado, snorkel y caminatas entre almendros, con fuerte sol y poca sombra al mediodía. Ambas forman una base económica para recorrer Flamingo y Tamarindo por carretera pavimentada.",
    "description_en": "Brasilito is a quiet fishing village on the Santa Cruz coast of Guanacaste that provides public access to neighboring Conchal beach, famous for its crushed-shell shore and clear turquoise water. While Brasilito has darker sand, moderate surf and a local atmosphere with sodas and simple lodging, Conchal offers swimming, snorkeling and walks under almond trees, with strong sun and little shade at midday. Together they form an affordable base for touring Flamingo and Tamarindo by paved road.",
    "categories": [
      "Playas",
      "Aventura y Deportes"
    ],
    "latitude": 10.4036923,
    "longitude": -85.78972
  },
  {
    "match_name": "Braulio Carrillo - San José",
    "match_ordinal": 1,
    "name": "Braulio Carrillo - San José",
    "description_es": "En la zona del sector Quebrada González, sobre la ruta San José-Guápiles, el Parque Nacional Braulio Carrillo protege una de las extensiones de bosque lluvioso más grandes y abruptas del centro del país, con montañas, cañones y ríos importantes para la hidroelectricidad. El sector ofrece senderos cortos señalizados entre bosque siempreverde, miradores y el mirador al río Sucio, con servicios básicos, mientras el sector Volcán Barva, al norte de Heredia, concentra rutas más largas hacia lagunas cratéricas. Es un sitio de alta biodiversidad, con lluvias frecuentes y avistamiento de aves.",
    "description_en": "Around the Quebrada Gonzalez sector on the San Jose-Guapiles highway, Braulio Carrillo National Park protects one of the largest and most rugged rainforest expanses in central Costa Rica, with mountains, canyons and rivers important for hydroelectric power. The sector offers short signed trails through evergreen forest, viewpoints and the Sucio River overlook with basic facilities, while the Barva Volcano sector north of Heredia has longer routes to crater lagoons. It is a highly biodiverse site with frequent rain and birdwatching.",
    "categories": [
      "Parques Nacionales",
      "Senderismo",
      "Montañas y Cerros"
    ],
    "latitude": 10.2085702,
    "longitude": -84.0205802
  },
  {
    "match_name": "Bribri (Tours de Cacao y Cataratas Volio/Maqui)",
    "match_ordinal": 1,
    "name": "Bribri (Tours de Cacao y Cataratas Volio/Maqui)",
    "description_es": "En el territorio indígena bribri de Talamanca, Limón, familias de comunidades como Watsi y Bambú reciben visitantes para mostrar la vivienda tradicional, las plantas medicinales, la lengua y la cosmovisión. La experiencia incluye el proceso artesanal del cacao, desde la mazorca hasta la molienda y degustación de chocolate, a veces con almuerzo típico, y se combina con caminatas a caídas cercanas como Volio y otras pozas selváticas aptas para el baño con guía local. Es turismo cultural comunitario que requiere reserva y respeto por las normas del territorio.",
    "description_en": "In the Bribri Indigenous Territory of Talamanca, Limon, families in communities such as Watsi and Bambu welcome visitors to show traditional housing, medicinal plants, language and worldview. The experience includes the artisanal cacao process from pod to grinding and chocolate tasting, sometimes with a traditional lunch, combined with walks to nearby falls such as Volio and other jungle pools for swimming with a local guide. It is community cultural tourism requiring advance booking and respect for territorial rules.",
    "categories": [
      "Cultura e Historia",
      "Experiencia Gastronómica",
      "Cataratas",
      "Turismo Comunitario"
    ],
    "latitude": 9.6263047,
    "longitude": -82.8525167
  },
  {
    "match_name": "Buceo - Isla del Caño",
    "match_ordinal": 1,
    "name": "Buceo - Isla del Caño",
    "description_es": "La Reserva Biológica Isla del Caño, frente a la península de Osa, es uno de los principales puntos de buceo y snorkel del Pacífico costarricense por sus plataformas coralinas, aguas claras y abundante vida marina como tortugas, rayas, morenas, pulpos y cardúmenes tropicales, con paso estacional de delfines y ballenas. Solo se visita en tour diurno con operador y guía autorizados desde Bahía Drake, Uvita o Sierpe, sin pernoctación en la isla, e incluye normalmente dos inmersiones en el lado resguardado según condiciones del mar. En tierra hay bosque tropical y vestigios arqueológicos visibles de forma regulada.",
    "description_en": "Cano Island Biological Reserve, off the Osa Peninsula, is one of the top diving and snorkeling spots on Costa Rica Pacific coast for its coral platforms, clear water and rich marine life such as turtles, rays, morays, octopus and tropical schools, with seasonal dolphins and whales. It is visited only on daytime tours with authorized operators and guides from Drake Bay, Uvita or Sierpe, with no overnight stays, usually including two dives on the sheltered side depending on sea conditions. On land there is tropical forest and regulated archaeological remains.",
    "categories": [
      "Reservas Silvestres",
      "Aventura y Deportes",
      "Islas y Manglares"
    ],
    "latitude": 8.869,
    "longitude": -83.471
  },
  {
    "match_name": "CAHUITA - Limón",
    "match_ordinal": 1,
    "name": "CAHUITA - Limón",
    "description_es": "Cahuita es un pueblo costero tranquilo en Talamanca, Limón, al sur de la ciudad de Limón, de fuerte identidad afrocaribeña con calypso, inglés criollo y gastronomía a base de coco como rice and beans, rondón y patí. Su calle principal concentra hospedajes sencillos, sodas, cafés y bares con ambiente relajado, entre Playa Negra al norte y el Parque Nacional al sur. Es base para snorkel, caminatas y tours culturales hacia comunidades bribris cercanas, sin grandes centros comerciales.",
    "description_en": "Cahuita is a quiet coastal town in Talamanca, Limon, south of Limon city, with a strong Afro-Caribbean identity expressed in calypso, Creole English and coconut-based food such as rice and beans, rundown and patty. Its main street has simple lodging, sodas, cafes and bars with a relaxed mood, between Black Beach to the north and the national park to the south. It is a base for snorkeling, hiking and cultural tours to nearby Bribri communities, without large shopping centers.",
    "categories": [
      "Playas",
      "Cultura e Historia",
      "Experiencia Gastronómica"
    ],
    "latitude": 9.729,
    "longitude": -82.811
  },
  {
    "match_name": "Cahuita - Parque Nacional Cahuita",
    "match_ordinal": 1,
    "name": "Cahuita - Parque Nacional Cahuita",
    "description_es": "El Parque Nacional Cahuita protege el arrecife coralino más desarrollado del Caribe costarricense junto con playas de arena blanca, mar turquesa y bosque húmedo anegado. Un sendero costero entre Kelly Creek y Puerto Vargas permite observar monos congo y cariblanca, perezosos, mapaches, iguanas y aves, con paradas para baño y picnic, mientras el snorkel en el arrecife, con corales cerebro y abanicos de mar, se hace únicamente con guía autorizado. Es un ejemplo de manejo compartido entre la comunidad y el Estado, con dos accesos y horario diurno.",
    "description_en": "Cahuita National Park protects the most developed coral reef on the Costa Rican Caribbean along with white-sand beaches, turquoise sea and swampy wet forest. A coastal trail between Kelly Creek and Puerto Vargas offers views of howler and white-faced monkeys, sloths, raccoons, iguanas and birds, with swim and picnic stops, while reef snorkeling among brain corals and sea fans is allowed only with an authorized guide. It is an example of shared management between the community and the state, with two entrances and daytime hours.",
    "categories": [
      "Parques Nacionales",
      "Playas",
      "Senderismo"
    ],
    "latitude": 9.7751411,
    "longitude": -82.7387587
  },
  {
    "match_name": "Caminata Manuel Antonio",
    "match_ordinal": 1,
    "name": "Caminata Manuel Antonio",
    "description_es": "La caminata por el Parque Nacional Manuel Antonio, en Quepos, Puntarenas, recorre senderos cortos y sombreados por bosque húmedo tropical hasta playas resguardadas como Manuel Antonio y Espadilla Sur y miradores como Punta Catedral. En el trayecto es frecuente ver monos cariblanca, perezosos, iguanas y aves, con paneles interpretativos y guías locales con telescopio. El parque, uno de los más visitados del país, exige entrada con reserva previa, cupo limitado y salida antes del cierre de la tarde.",
    "description_en": "The walk through Manuel Antonio National Park in Quepos, Puntarenas, follows short shaded trails through humid tropical forest to sheltered beaches such as Manuel Antonio and Espadilla Sur and viewpoints such as Punta Catedral. Along the way white-faced monkeys, sloths, iguanas and birds are commonly seen, with interpretive signs and local guides carrying telescopes. One of the most visited parks in the country, it requires advance ticket booking, limited capacity and exit before the afternoon closing.",
    "categories": [
      "Parques Nacionales",
      "Playas",
      "Senderismo"
    ],
    "latitude": 9.424,
    "longitude": -84.158
  },
  {
    "match_name": "Caminata Río Cajón - Coronado",
    "match_ordinal": 1,
    "name": "Caminata Río Cajón - Coronado",
    "description_es": "En la zona montañosa de Coronado, al noreste de San José, la caminata del Río Cajón transcurre entre potreros lecheros, bosque nuboso y quebradas de agua clara, con tramos hacia pozas y una caída de agua en la parte baja del bosque. Es un recorrido rural de medio día para senderismo, observación de aves y fotografía de naturaleza, por senderos que pueden estar lodosos y resbaladizos tras la lluvia. Se recomienda ir con carro alto, ropa de abrigo e impermeable y guía o indicaciones locales, ya que los accesos son por calles de lastre y fincas privadas.",
    "description_en": "In the mountainous zone of Coronado northeast of San Jose, the Cajon River walk passes dairy pastures, cloud forest and clear streams, with stretches toward pools and a waterfall in the lower forest. It is a rural half-day route for hiking, birdwatching and nature photography on trails that can be muddy and slippery after rain. A high-clearance car, warm and rain clothing and local guidance are recommended, as access is by gravel roads and private farms.",
    "categories": [
      "Senderismo",
      "Ríos y Pozas",
      "Montañas y Cerros"
    ],
    "latitude": 9.9767306,
    "longitude": -84.0079501
  },
  {
    "match_name": "Caminos de Osa",
    "match_ordinal": 1,
    "name": "Caminos de Osa",
    "description_es": "Caminos de Osa es una red de turismo rural comunitario en la península de Osa que articula senderos, fincas y hospedajes familiares en comunidades como Rancho Quemado, Dos Brazos, La Palma y alrededores de Puerto Jiménez y Bahía Drake. Ofrece travesías de varios días por bosque, ríos y costa, con caminatas, cabalgatas, kayak en Golfo Dulce, visitas a trapiches, tours de oro artesanal y gastronomía local, guiadas por vecinos. La mayor parte de los ingresos queda en las familias anfitrionas y las rutas bordean reservas forestales y el entorno del Parque Nacional Corcovado.",
    "description_en": "Caminos de Osa is a community-based rural tourism network on the Osa Peninsula linking trails, farms and family lodging in communities such as Rancho Quemado, Dos Brazos, La Palma and areas around Puerto Jimenez and Drake Bay. It offers multi-day journeys through forest, rivers and coast with hiking, horseback riding, kayaking on Golfo Dulce, sugar-mill visits, artisanal gold tours and local food, led by neighbors. Most income stays with host families and routes skirt forest reserves and the surroundings of Corcovado National Park.",
    "categories": [
      "Senderismo",
      "Cultura e Historia",
      "Hospedaje en la Naturaleza",
      "Turismo Comunitario"
    ],
    "latitude": 8.417,
    "longitude": -83.279
  },
  {
    "match_name": "CANOA HAWAIANA AGUJAS",
    "match_ordinal": 1,
    "name": "CANOA HAWAIANA AGUJAS",
    "description_es": "En la misma zona costera de Playa Agujas que la ficha de Agujas-Bijagual, esta experiencia se centra en la travesía en canoa hawaiana con estabilizador, más estable y fácil de remar que el kayak tradicional. El tour de medio día bordea playas, acantilados y formaciones rocosas del Pacífico Central, con guías, paradas para snorkel cuando el mar lo permite, observación de aves marinas y refrigerio de frutas en la playa. No exige experiencia previa y es apto para grupos y familias, con salidas en la mañana y en la tarde desde el centro de remo local.",
    "description_en": "In the same Playa Agujas coastal zone as the Agujas-Bijagual entry, this experience focuses on Hawaiian outrigger canoeing, more stable and easier to paddle than a traditional kayak. The half-day tour skirts Central Pacific beaches, cliffs and rock formations with guides, stops for snorkeling when the sea allows, seabird watching and a fruit snack on the beach. No prior experience is needed and it suits groups and families, with morning and afternoon departures from the local paddling center.",
    "categories": [
      "Aventura y Deportes",
      "Playas"
    ],
    "latitude": 9.721,
    "longitude": -84.65
  },
  {
    "match_name": "Cañón de la Vieja – Aventura entre ríos y spa volcánico",
    "match_ordinal": 1,
    "name": "Cañón de la Vieja – Aventura entre ríos y spa volcánico",
    "description_es": "En la zona de las faldas del Rincón de la Vieja, en los alrededores de Curubandé y Liberia, esta propuesta combina aventura fluvial entre paredes y cañones con descanso en aguas termales y barro volcánico. Las actividades habituales incluyen tubing o flotadas, senderos por bosque seco en transición, pozas y miradores, cerrando con spa natural de lodo y piscinas calientes. Es un destino de día completo con clima caliente, donde se recomienda bloqueador, ropa de cambio y contratación con operadores locales.",
    "description_en": "In the foothills of Rincon de la Vieja around Curubande and Liberia, this outing combines river adventure among walls and canyons with rest in thermal waters and volcanic mud. Usual activities include tubing or floats, trails through transitional dry forest, pools and viewpoints, ending with natural mud and hot-pool spa. It is a full-day destination in hot weather, where sunscreen, a change of clothes and booking with local operators are recommended.",
    "categories": [
      "Aventura y Deportes",
      "Ríos y Pozas",
      "Termales"
    ],
    "latitude": 10.679,
    "longitude": -85.451
  },
  {
    "match_name": "Cañon del Río Aranjuez",
    "match_ordinal": 1,
    "name": "Cañon del Río Aranjuez",
    "description_es": "En la zona del interior puntarenense por donde discurre el río Aranjuez, el cañón forma paredes rocosas, rápidos y pozas de agua clara rodeadas de bosque y potreros. Se recorre con caminatas por orillas y tramos de nado o flotación en época de caudal bajo, con paisajes poco intervenidos y avistamiento de aves. El acceso es por caminos rurales y fincas, por lo que conviene ir con guía local, calzado de río y precaución ante crecidas en época lluviosa.",
    "description_en": "In the inland Puntarenas area crossed by the Aranjuez River, the canyon forms rock walls, rapids and clear-water pools surrounded by forest and pasture. It is explored by riverside walks and short swim or float sections in low-water season, with little-disturbed scenery and birdwatching. Access is by rural roads and farms, so a local guide, river shoes and caution about flash floods in the rainy season are advisable.",
    "categories": [
      "Ríos y Pozas",
      "Senderismo",
      "Aventura y Deportes"
    ],
    "latitude": 10.0832988,
    "longitude": -84.729334
  },
  {
    "match_name": "Cañón Del Río Parismina - Limón",
    "match_ordinal": 1,
    "name": "Cañón Del Río Parismina - Limón",
    "description_es": "En la zona interior caribeña hacia donde se interna el río Parismina, en Limón, el cañón discurre entre bosque húmedo denso, paredes vegetadas y pozas alargadas. Es un entorno remoto para senderismo de orilla, fotografía de naturaleza y recorridos guiados en bote o kayak según el tramo, con alta pluviosidad durante gran parte del año. Por su aislamiento y caudal cambiante, la visita pide planificación, guía local y equipo básico de seguridad acuática.",
    "description_en": "In the inland Caribbean zone where the Parismina River runs in Limon, the canyon winds through dense wet forest, vegetated walls and long pools. It is a remote setting for riverside hiking, nature photography and guided boat or kayak sections depending on the stretch, with heavy rainfall much of the year. Because of its isolation and changing flow, visits call for planning, a local guide and basic water-safety gear.",
    "categories": [
      "Ríos y Pozas",
      "Aventura y Deportes",
      "Senderismo"
    ],
    "latitude": 10.3011648,
    "longitude": -83.3495507
  },
  {
    "match_name": "Canyoning Sitio Mata",
    "match_ordinal": 1,
    "name": "Canyoning Sitio Mata",
    "description_es": "En la zona montañosa de Turrialba, Cartago, Sitio Mata es un punto de cañonismo en cañón selvático con cascadas, paredes verticales y pozas. La actividad consiste en descensos con cuerda, saltos controlados y caminatas por el cauce, siempre con equipo certificado y guías, en un entorno de bosque húmedo con musgo y helechos. Es una aventura de medio día o día completo que exige condición física básica, saber nadar y reserva previa, y puede suspenderse con lluvias fuertes.",
    "description_en": "In the mountains of Turrialba, Cartago, Sitio Mata is a canyoning spot in a jungle canyon with waterfalls, vertical walls and pools. The activity involves rope descents, controlled jumps and riverbed walks, always with certified gear and guides, in a wet-forest setting with moss and ferns. It is a half- or full-day adventure requiring basic fitness, swimming ability and advance booking, and it may be suspended in heavy rain.",
    "categories": [
      "Aventura y Deportes",
      "Cataratas",
      "Ríos y Pozas"
    ],
    "latitude": 9.991,
    "longitude": -83.677
  },
  {
    "match_name": "Carate Península de Osa 1",
    "match_ordinal": 1,
    "name": "Carate Península de Osa 1",
    "description_es": "Carate es un caserío costero al suroeste de la península de Osa, puerta de entrada al sector La Leona del Parque Nacional Corcovado. Combina una playa extensa y salvaje de arena oscura con oleaje fuerte, lodges selváticos y senderos hacia miradores y ríos cercanos. El acceso desde Puerto Jiménez es por calle de lastre que pide vehículo alto y precaución en ríos, y la entrada al parque requiere guía certificado y permiso gestionado con antelación.",
    "description_en": "Carate is a coastal hamlet in the southwest of the Osa Peninsula and gateway to the La Leona sector of Corcovado National Park. It combines a long wild dark-sand beach with strong surf, jungle lodges and trails to nearby viewpoints and rivers. Access from Puerto Jimenez is by gravel road requiring a high vehicle and care at river crossings, and park entry requires a certified guide and a permit arranged in advance.",
    "categories": [
      "Playas",
      "Parques Nacionales",
      "Senderismo"
    ],
    "latitude": 8.4603583,
    "longitude": -83.4616237
  },
  {
    "match_name": "Cascada Elysiana",
    "match_ordinal": 1,
    "name": "Cascada Elysiana",
    "description_es": "En la zona de Pérez Zeledón, en el sur de San José, la cascada Elysiana es una caída de agua de entorno premontano rodeada de vegetación densa y ambiente tranquilo. Se llega por sendero corto desde camino rural, con poza al pie para refrescarse y oportunidades para fotografía y observación de aves. Al ser un punto poco documentado, conviene confirmar acceso, condiciones del sendero y propiedad con vecinos u operadores locales antes de ir.",
    "description_en": "In the Perez Zeledon area in southern San Jose, Elysiana waterfall is a premontane fall surrounded by dense vegetation in a calm setting. It is reached by a short trail from a rural road, with a pool at its base for cooling off and opportunities for photography and birdwatching. As a little-documented spot, access, trail conditions and property should be confirmed with neighbors or local operators before going.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 9.314,
    "longitude": -83.83
  },
  {
    "match_name": "CASCADA MALATOBA",
    "match_ordinal": 1,
    "name": "CASCADA MALATOBA",
    "description_es": "En la zona entre Guápiles y Sarapiquí, en el Caribe norte, la cascada Malatoba desciende entre bosque húmedo con poza para el baño. El acceso combina calle rural y sendero selvático de pendiente moderada, con ambiente de alta humedad, insectos y canto de aves. Es una visita de medio día en entorno rural, donde se recomienda ir con calzado de agarre, repelente y guía o indicaciones locales.",
    "description_en": "In the area between Guapiles and Sarapiqui on the northern Caribbean, Malatoba waterfall drops through wet forest with a swimming pool. Access combines rural road and a moderately sloped jungle trail in very humid conditions with insects and birdsong. It is a half-day rural visit where grippy footwear, repellent and a guide or local directions are recommended.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 10.352,
    "longitude": -83.972
  },
  {
    "match_name": "Cascadas Pozo Azul - Colonia del Toro",
    "match_ordinal": 1,
    "name": "Cascadas Pozo Azul - Colonia del Toro",
    "description_es": "Distintas de Pozo Azul de Sarapiquí, estas cascadas se ubican en la zona de Colonia del Toro, en tierras altas de Zarcero, y son conocidas localmente por caídas como Nieve y Paz. El recorrido une senderos entre potreros lecheros y bosque nuboso con miradores, pozas frías y caídas encajonadas. El clima es fresco y lluvioso, con barro frecuente, por lo que se aconsejan botas de caminata, abrigo y coordinación previa con fincas y guías de la zona.",
    "description_en": "Different from Pozo Azul in Sarapiqui, these waterfalls lie around Colonia del Toro in the Zarcero highlands and are locally known for drops such as Nieve and Paz. The route links trails through dairy pastures and cloud forest with viewpoints, cold pools and boxed falls. Weather is cool and rainy with frequent mud, so hiking boots, warm layers and prior coordination with local farms and guides are advised.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 10.281,
    "longitude": -84.244
  },
  {
    "match_name": "Catamarán Golfo Dulce",
    "match_ordinal": 1,
    "name": "Catamarán Golfo Dulce",
    "description_es": "El Golfo Dulce, entre la península de Osa y la costa de Golfito y Puerto Jiménez, es un golfo tropical tranquilo ideal para navegar en catamarán. Los paseos diurnos o al atardecer bordean manglares, islotes y playas selváticas, con avistamiento frecuente de delfines y tortugas y paso estacional de ballenas, además de paradas para nadar y hacer snorkel. Las salidas se contratan con operadores en Golfito o Puerto Jiménez e incluyen normalmente equipo, refrigerio y guía.",
    "description_en": "Golfo Dulce, between the Osa Peninsula and the Golfito and Puerto Jimenez coast, is a calm tropical gulf ideal for catamaran sailing. Daytime or sunset cruises pass mangroves, islets and jungle beaches, with frequent dolphin and turtle sightings and seasonal whales, plus stops for swimming and snorkeling. Departures are booked with operators in Golfito or Puerto Jimenez and usually include gear, snacks and a guide.",
    "categories": [
      "Aventura y Deportes",
      "Islas y Manglares"
    ],
    "latitude": 8.6040618,
    "longitude": -83.1133792
  },
  {
    "match_name": "CATAMARÁN PLAYA COYOL - Puntarenas",
    "match_ordinal": 1,
    "name": "CATAMARÁN PLAYA COYOL - Puntarenas",
    "description_es": "En la zona costera de Puntarenas hacia el Golfo de Nicoya y el Pacífico Central, este tour en catamarán recorre bahías y ensenadas de aguas tranquilas con paradas para nadar, hacer snorkel y observar el atardecer. La navegación permite ver aves marinas, costa con bosque seco y, en temporada, delfines, en un ambiente relajado con música y refrigerios a bordo. El punto exacto de salida puede variar entre playas cercanas, por lo que conviene confirmar muelle y horario con el operador.",
    "description_en": "In the Puntarenas coastal zone toward the Gulf of Nicoya and Central Pacific, this catamaran tour cruises calm bays and coves with stops for swimming, snorkeling and sunset views. The sailing offers seabirds, dry-forest shoreline and seasonal dolphins in a relaxed atmosphere with music and snacks on board. The exact departure point can vary among nearby beaches, so pier and schedule should be confirmed with the operator.",
    "categories": [
      "Playas",
      "Aventura y Deportes"
    ],
    "latitude": 9.6541742,
    "longitude": -84.6636049
  },
  {
    "match_name": "Catarata Ángel Gabriel - San Ramón",
    "match_ordinal": 1,
    "name": "Catarata Ángel Gabriel - San Ramón",
    "description_es": "La Catarata Ángel Gabriel se ubica en San Antonio de Zapotal, en San Ramón de Alajuela, en una zona rural de potreros, cultivos de caña y café con vistas hacia el Golfo de Nicoya. El acceso es por camino de lastre y un sendero de alrededor de 3 a 5 km entre fincas y bosque, con un tramo final de descenso y caminata por el cauce hasta una caída de alrededor de 30 a 40 metros con pozas aptas para el baño. El ingreso es por finca privada con coordinación previa y se recomienda vehículo alto y calzado para terreno irregular.",
    "description_en": "Angel Gabriel Waterfall is located in San Antonio de Zapotal, San Ramon, Alajuela, in a rural area of pastures, sugarcane and coffee fields with views toward the Gulf of Nicoya. Access is by gravel road and a trail of around 3 to 5 km through farms and forest, with a final descent and riverbed walk to a fall of around 30 to 40 meters with pools suitable for swimming. Entry is through private land by prior arrangement, and a high-clearance vehicle and footwear for uneven terrain are recommended.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 10.0910284,
    "longitude": -84.4703933
  },
  {
    "match_name": "Catarata Aquiares ☕💦 | La joya cafetalera de Turrialba",
    "match_ordinal": 1,
    "name": "Catarata Aquiares, joya cafetalera de Turrialba",
    "description_es": "La Catarata Aquiares se encuentra en la comunidad cafetalera de Aquiares, en Santa Cruz de Turrialba, Cartago, dentro de una de las fincas de café más extensas del país entre los ríos Aquiares y Turrialba. Se llega por camino entre cafetales y un tramo corto de bosque secundario hasta una caída alta con poza de agua fría y clara, rodeada de vegetación y rocas. Es una caminata corta y de baja dificultad, combinable con la visita al pueblo, su iglesia histórica y la cultura cafetalera local.",
    "description_en": "Aquiares Waterfall is located in the coffee community of Aquiares in Santa Cruz de Turrialba, Cartago, within one of the largest coffee farms in the country between the Aquiares and Turrialba rivers. It is reached by a road through coffee fields and a short section of secondary forest to a tall fall with a cold, clear pool surrounded by vegetation and rocks. It is a short, easy walk that can be combined with a visit to the village, its historic church and the local coffee culture.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas",
      "Agroturismo"
    ],
    "latitude": 9.933,
    "longitude": -83.715
  },
  {
    "match_name": "Catarata Bijagual",
    "match_ordinal": 1,
    "name": "Catarata Bijagual",
    "description_es": "La Catarata Bijagual se localiza en la zona de Carara y Turrubares, en el Pacífico Central, sobre terreno privado de bosque lluvioso cercano al corredor biológico de Carara. Es una caída de gran altura, reportada en alrededor de 300 metros, considerada entre las más altas del país, con senderos de varios kilómetros, cruces de río y pozas naturales en la base. El acceso es únicamente mediante tours autorizados en la finca, con caminata o cabalgata guiada, y el entorno es destacado por la observación de aves, monos y bosque tropical.",
    "description_en": "Bijagual Waterfall is located in the Carara and Turrubares area on the Central Pacific, on private rainforest land near the Carara biological corridor. It is a very tall fall, reported at around 300 meters and regarded among the tallest in the country, with several kilometers of trails, river crossings and natural pools at the base. Access is only through authorized tours on the farm, by hiking or guided horseback ride, and the setting is notable for birdwatching, monkeys and tropical forest.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 9.7304182,
    "longitude": -84.5693859
  },
  {
    "match_name": "Catarata Cangreja",
    "match_ordinal": 1,
    "name": "Catarata Cangreja",
    "description_es": "La Catarata La Cangreja se ubica en el sector Las Pailas del Parque Nacional Rincón de la Vieja, en Guanacaste, a unos 5 km del centro de visitantes por el Sendero de las Cataratas. Es una caída de alrededor de 40 metros conocida por el tono azulado de su poza, de origen mineral volcánico, rodeada de bosque seco y formaciones rocosas. El recorrido total es de alrededor de 10 km ida y vuelta, de dificultad media a alta, sin permiso de baño según la normativa vigente del parque, con ingreso en horario regulado.",
    "description_en": "La Cangreja Waterfall is located in the Las Pailas sector of Rincon de la Vieja National Park, Guanacaste, about 5 km from the visitor center along the Waterfalls Trail. It is a fall of around 40 meters known for the bluish tone of its pool, of volcanic mineral origin, surrounded by dry forest and rock formations. The total route is around 10 km round trip, of medium to high difficulty, with no swimming allowed under current park regulations and entry on a regulated schedule.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Parques Nacionales"
    ],
    "latitude": 10.7811,
    "longitude": -85.3522
  },
  {
    "match_name": "Catarata Caño Seco - Turrialba",
    "match_ordinal": 1,
    "name": "Catarata Caño Seco - Turrialba",
    "description_es": "La Catarata Caño Seco, gestionada como La Fuente Waterfall, se encuentra en La Fuente de Santa Teresita, en Turrialba, Cartago, dentro de una finca agropecuaria sobre el río Lajas. El recorrido de alrededor de 2 km atraviesa potreros, una pequeña lechería y un parche de bosque protector hasta una catarata alta y varias pozas de agua cristalina aptas para el baño recreativo. Es un proyecto de turismo rural comunitario con senderismo de dificultad moderada, sujeto a condiciones del caudal en época lluviosa.",
    "description_en": "Cano Seco Waterfall, managed as La Fuente Waterfall, is located in La Fuente de Santa Teresita, Turrialba, Cartago, within a farming estate on the Lajas River. The route of around 2 km crosses pastures, a small dairy and a patch of protective forest to a tall waterfall and several clear-water pools suitable for recreational swimming. It is a community rural tourism project with moderate-difficulty hiking, subject to river conditions in the rainy season.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas",
      "Turismo Comunitario"
    ],
    "latitude": 9.991,
    "longitude": -83.677
  },
  {
    "match_name": "Catarata Chindama – La joya escondida de Guápiles",
    "match_ordinal": 1,
    "name": "Catarata Chindama, joya de Guápiles",
    "description_es": "La Catarata Chindama se ubica en Pococí, Guápiles, Limón, alimentada por el río Mercedes, con una caída reportada en alrededor de 90 metros. El acceso es por fincas privadas y un recorrido de alrededor de 10 a 14 km ida y vuelta que incluye sendero de bosque húmedo y varios cruces del río Toro Amarillo y el río Mercedes, de dificultad intermedia a alta. Es un entorno de selva caribeña con alta humedad, donde se recomienda ir con guía local y salir temprano por cambios del caudal.",
    "description_en": "Chindama Waterfall is located in Pococi, Guapiles, Limon, fed by the Mercedes River, with a drop reported at around 90 meters. Access is through private farms and a route of around 10 to 14 km round trip that includes humid forest trail and several crossings of the Toro Amarillo and Mercedes rivers, of intermediate to high difficulty. It is a Caribbean jungle setting with high humidity, where going with a local guide and starting early due to changing river levels is recommended.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 10.148,
    "longitude": -83.813
  },
  {
    "match_name": "Catarata del Río Blanco – Guápiles, Limón 🌿💦 | Un paraíso oculto digno de National Geographic",
    "match_ordinal": 1,
    "name": "Catarata del Río Blanco – Guápiles",
    "description_es": "La Catarata del Río Blanco se encuentra en Guápiles, Pococí, Limón, sobre el río Blanco de la vertiente atlántica, con una altura reportada en alrededor de 80 metros. La caminata, de alrededor de 9 a 14 km ida y vuelta según el punto de partida, atraviesa fincas y selva húmeda con varios cruces de río, de dificultad intermedia a alta, y debe hacerse con guía local por tratarse de terrenos privados. En la base destacan la pared rocosa, la vegetación densa y una cueva lateral accesible con precaución por rocas resbaladizas.",
    "description_en": "Rio Blanco Waterfall is located in Guapiles, Pococi, Limon, on the Atlantic-slope Blanco River, with a height reported at around 80 meters. The hike, around 9 to 14 km round trip depending on the starting point, crosses farms and humid jungle with several river crossings, of intermediate to high difficulty, and must be done with a local guide as it passes through private land. At the base, the rock wall, dense vegetation and a side cave accessible with caution over slippery rocks stand out.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 10.15,
    "longitude": -83.816
  },
  {
    "match_name": "Catarata del Río Savegre – Magia natural en San Gerardo de Dota 🌿💦✨",
    "match_ordinal": 1,
    "name": "Catarata del Río Savegre, San Gerardo de Dota",
    "description_es": "Las cataratas del río Savegre se localizan en San Gerardo de Dota, en la zona alta del Cerro de la Muerte, junto a uno de los ríos más limpios del país en una cuenca reconocida como Reserva de la Biosfera. El sendero de alrededor de 5 km ida y vuelta bordea el cauce cristalino entre bosque nuboso hasta una primera caída pequeña con formaciones rocosas y una caída principal de más de 20 metros, cuya poza no es apta para nadar por corrientes fuertes. El trayecto incluye tramos con gradas y puentes metálicos en estado variable y es de dificultad media, de acceso gratuito.",
    "description_en": "The Savegre River waterfalls are located in San Gerardo de Dota, in the highlands of Cerro de la Muerte, along one of the cleanest rivers in the country in a basin recognized as a Biosphere Reserve. The trail of around 5 km round trip follows the crystal-clear river through cloud forest to a first small fall with rock formations and a main fall of over 20 meters, whose pool is not safe for swimming due to strong currents. The route includes sections with metal steps and bridges in variable condition and is of medium difficulty, with free access.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 9.547,
    "longitude": -83.811
  },
  {
    "match_name": "Catarata del Toro",
    "match_ordinal": 1,
    "name": "Catarata del Toro",
    "description_es": "La Catarata del Toro se ubica en Bajos del Toro, entre Alajuela y Heredia, dentro de una reserva ecológica privada, con una caída de alrededor de 90 metros que desciende a un antiguo cráter volcánico cubierto de vegetación. El recorrido de alrededor de 3 km por sendero mantenido y varios cientos de gradas incluye miradores, jardines y bosque nuboso, de dificultad fácil a moderada, sin permiso de baño. Opera de lunes a sábado con entrada de pago y es punto central de una zona con múltiples cataratas de tonos azules cercanas.",
    "description_en": "Catarata del Toro is located in Bajos del Toro, between Alajuela and Heredia, within a private ecological reserve, with a drop of around 90 meters falling into an old vegetation-covered volcanic crater. The route of around 3 km on maintained trail and several hundred steps includes viewpoints, gardens and cloud forest, of easy to moderate difficulty, with no swimming allowed. It operates Monday to Saturday with paid entry and is the central point of an area with multiple nearby blue-toned waterfalls.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Miradores"
    ],
    "latitude": 10.2558,
    "longitude": -84.2917
  },
  {
    "match_name": "CATARATA DIAMANTE – Pérez Zeledón",
    "match_ordinal": 1,
    "name": "CATARATA DIAMANTE – Pérez Zeledón",
    "description_es": "La Catarata Diamante se encuentra en Platanillo de Pérez Zeledón, San José, en la ruta hacia Dominical, y figura entre las más altas del país con una caída reportada en alrededor de 180 metros. El sitio destaca por una amplia cueva de piedra detrás de la cortina de agua acondicionada para pernoctar y servicio de alimentación, además de pozas superiores, miradores y actividades como rappel con reserva previa. El acceso requiere caminata exigente de montaña y guía, y solo opera mediante reservación.",
    "description_en": "Diamante Waterfall is located in Platanillo de Perez Zeledon, San Jose, on the road to Dominical, and ranks among the tallest in the country with a drop reported at around 180 meters. The site stands out for a large stone cave behind the water curtain set up for overnight stays and meal service, plus upper pools, viewpoints and activities such as rappelling by prior reservation. Access requires a demanding mountain hike with a guide and operates by reservation only.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 9.279,
    "longitude": -83.778
  },
  {
    "match_name": "Catarata Dos Novillos 2 - Limón",
    "match_ordinal": 1,
    "name": "Catarata Dos Novillos 2 - Limón",
    "description_es": "La Catarata Dos Novillos se ubica en La Argentina de Pocora, en Guácimo, Limón, al pie del Volcán Turrialba, sobre el río Dos Novillos en bosque húmedo tropical. La caminata guiada de alrededor de 7 km ida y vuelta por finca privada bordea el cañón del río, cruza el cauce y asciende por escalinata hasta una caída amplia con poza grande rodeada de paredes rocosas, nacientes y pequeñas cuevas. Es de dificultad moderada, con servicios básicos en la casa de la finca y recomendación de visita temprana por lluvias caribeñas.",
    "description_en": "Dos Novillos Waterfall is located in La Argentina de Pocora, Guacimo, Limon, at the foot of Turrialba Volcano, on the Dos Novillos River in tropical humid forest. The guided hike of around 7 km round trip through private farm borders the river canyon, crosses the river and climbs by staircase to a wide fall with a large pool surrounded by rock walls, springs and small caves. It is of moderate difficulty, with basic services at the farmhouse and early visiting recommended due to Caribbean rains.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 10.1668658,
    "longitude": -83.6055732
  },
  {
    "match_name": "Catarata El Angel & San Alejo - Siquirres",
    "match_ordinal": 1,
    "name": "Catarata El Angel & San Alejo - Siquirres",
    "description_es": "Las cataratas El Ángel y San Alejo se localizan en La Alegría de Siquirres, Limón, en una zona de fincas y bosque tropical húmedo del Caribe. El Ángel es una caída de alrededor de 30 metros con poza, con un acceso corto pero técnico con cuerdas y un paso por detrás de la cortina hacia una pequeña cueva, mientras San Alejo se alcanza por sendero de bosque de alrededor de media hora hasta una caída amplia rodeada de piedra y vegetación. El recorrido total es de alrededor de 4 km, de dificultad media a alta, y requiere guía local por tratarse de accesos privados.",
    "description_en": "El Angel and San Alejo waterfalls are located in La Alegria de Siquirres, Limon, in an area of farms and humid Caribbean tropical forest. El Angel is a fall of around 30 meters with a pool, with a short but technical access with ropes and a passage behind the curtain to a small cave, while San Alejo is reached by a forest trail of about half an hour to a wide fall surrounded by rock and vegetation. The total route is around 4 km, of medium to high difficulty, and requires a local guide as access is private.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 10.07,
    "longitude": -83.593
  },
  {
    "match_name": "Catarata El Encanto – Esparza 🌊 | Un tesoro escondido entre potreros",
    "match_ordinal": 1,
    "name": "Catarata El Encanto – Esparza",
    "description_es": "La Catarata El Encanto se ubica en El Barón de San Rafael, en Esparza, Puntarenas, entre San Mateo y Esparza, en un entorno de potreros secos del Pacífico. Es una caída de alrededor de 40 metros sobre una pared rocosa con poza amplia apta para el baño y pozas adicionales río abajo, accesible por un sendero corto de alrededor de 700 m con gradas y barandas, de dificultad fácil. Cuenta con parqueo, baños y áreas de picnic en finca privada con costo de ingreso y puede cerrar en la época más seca por bajo caudal.",
    "description_en": "El Encanto Waterfall is located in El Baron de San Rafael, Esparza, Puntarenas, between San Mateo and Esparza, in a setting of dry Pacific pastures. It is a fall of around 40 meters over a rock wall with a wide pool suitable for swimming and additional pools downstream, accessible by a short trail of around 700 m with steps and railings, of easy difficulty. It offers parking, restrooms and picnic areas on a private farm with an entrance fee and may close in the driest season due to low flow.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 9.955,
    "longitude": -84.64
  },
  {
    "match_name": "Catarata El Indio",
    "match_ordinal": 1,
    "name": "Catarata El Indio",
    "description_es": "La Catarata El Indio se encuentra en la zona de Mastatal y San Miguel de Puriscal, San José, cerca del Parque Nacional La Cangreja, y se visita desde la Finca Siempre Verde con guía local. Es una pared alta en forma de cortina sobre el río Turbio, reportada en más de cien metros, a la que se llega por una caminata de alrededor de 6 a 7 km entre potreros y bosque tropical. El cauce en la base es poco profundo y permite el acercamiento con precaución, aunque el caudal disminuye notablemente en la época seca.",
    "description_en": "El Indio Waterfall is located in the Mastatal and San Miguel de Puriscal area, San Jose, near La Cangreja National Park, and is visited from Finca Siempre Verde with a local guide. It is a tall curtain-like wall on the Turbio River, reported at over one hundred meters, reached by a hike of around 6 to 7 km through pastures and tropical forest. The stream at the base is shallow and allows careful approach, although flow decreases markedly in the dry season.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 9.667089,
    "longitude": -84.374292
  },
  {
    "match_name": "Catarata El Paraíso - Grecia",
    "match_ordinal": 1,
    "name": "Catarata El Paraíso - Grecia",
    "description_es": "La Catarata El Paraíso se ubica en San Miguel de Grecia, Alajuela, en una finca cafetalera familiar sobre el río Vigía, con una caída reportada en alrededor de 65 metros. El acceso es por sendero corto entre cafetales y bosque hasta un área con ranchos, piscina de manantial y pozas, de dificultad fácil y apto para visita familiar de un día. Opera bajo reserva en propiedad privada con servicios básicos y zonas para picnic y campamento.",
    "description_en": "El Paraiso Waterfall is located in San Miguel de Grecia, Alajuela, on a family coffee farm on the Vigia River, with a drop reported at around 65 meters. Access is by a short trail through coffee fields and forest to an area with shelters, a spring-water pool and swimming holes, of easy difficulty and suitable for a family day visit. It operates by reservation on private property with basic services and picnic and camping areas.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas",
      "Agroturismo"
    ],
    "latitude": 10.141389,
    "longitude": -84.282222
  },
  {
    "match_name": "Catarata El Rey (Zapatón)",
    "match_ordinal": 1,
    "name": "Catarata El Rey (Zapatón)",
    "description_es": "La Catarata El Rey de Zapatón está en el Territorio Indígena Huetar de Zapatón, en Chires de Puriscal, en el límite hacia Puntarenas, gestionada por el proyecto de turismo rural de mujeres emprendedoras. Es la misma formación de gran cortina rocosa de más de 140 metros con caídas planas y anchas, mirador natural y poza contigua, ubicada tras pasar el Parque Nacional La Cangreja por la ruta Puriscal-Parrita. Incluye guía local, caminata corta y opción de alimentación típica en la comunidad.",
    "description_en": "El Rey Waterfall of Zapaton is in the Huetar Indigenous Territory of Zapaton, Chires de Puriscal, on the border toward Puntarenas, managed by the women entrepreneurs rural tourism project. It is the same large curtain-like rock formation of over 140 meters with flat, wide slides, a natural viewpoint and an adjacent pool, located past La Cangreja National Park on the Puriscal-Parrita road. It includes a local guide, a short hike and an optional traditional meal in the community.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas",
      "Turismo Comunitario"
    ],
    "latitude": 9.693564,
    "longitude": -84.33936
  },
  {
    "match_name": "Catarata El Salto de Gamalotillo",
    "match_ordinal": 1,
    "name": "Catarata El Salto de Gamalotillo",
    "description_es": "La Catarata El Salto de Gamalotillo se encuentra en Gamalotillo, entre Puriscal y Parrita, sobre la ruta 239, dentro de una finca con senderos en bosque y áreas de picnic. Es una cascada baja de unos 6 metros que cae a una poza redonda y profunda apta para nadar, con pozas y saltos menores aguas arriba. El recorrido interno es de alrededor de 2 km, de dificultad fácil, con parqueo, hamacas, baños y opciones de camping, frecuentado principalmente por visitantes locales.",
    "description_en": "El Salto de Gamalotillo Waterfall is located in Gamalotillo, between Puriscal and Parrita, on Route 239, within a farm with forest trails and picnic areas. It is a low cascade of about 6 meters falling into a round, deep pool suitable for swimming, with smaller pools and drops upstream. The internal route is around 2 km, of easy difficulty, with parking, hammocks, restrooms and camping options, frequented mainly by local visitors.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 9.607497,
    "longitude": -84.443024
  },
  {
    "match_name": "CATARATA EL SANTUARIO - TURRIALBA",
    "match_ordinal": 1,
    "name": "CATARATA EL SANTUARIO - TURRIALBA",
    "description_es": "El Santuario de Turrialba es un conjunto de cataratas de agua cristalina en Torito de Santa Cruz de Turrialba, Cartago, en las faldas del Volcán Turrialba, al que se ingresa por una vivienda privada. El recorrido de alrededor de 4 km desciende a un cañón de vegetación densa con tres caídas principales, incluida una mayor encajonada entre paredes rocosas con poza fría, además de tramos utilizados para canyoning con descensos de varias decenas de metros. Requiere guía local, buen calzado y precaución por senderos húmedos y resbaladizos.",
    "description_en": "El Santuario of Turrialba is a group of clear-water waterfalls in Torito de Santa Cruz de Turrialba, Cartago, on the slopes of Turrialba Volcano, entered through a private home. The route of around 4 km descends to a densely vegetated canyon with three main falls, including a larger one enclosed between rock walls with a cold pool, plus sections used for canyoning with descents of several dozen meters. It requires a local guide, good footwear and caution on wet, slippery trails.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 9.9067054,
    "longitude": -83.6800512
  },
  {
    "match_name": "Catarata El Tigre Monteverde",
    "match_ordinal": 1,
    "name": "Catarata El Tigre Monteverde",
    "description_es": "Las Cataratas El Tigre se ubican en Los Olivos de Monteverde, Puntarenas, en bosque nuboso privado, cuyo nombre alude al jaguar llamado localmente tigre. Es un circuito autoguiado de alrededor de 8 km y 3 a 4 horas que enlaza cuatro cataratas y nueve puentes rústicos, incluidos colgantes y de árboles, con pozas naturales para nadar y miradores de flora y fauna. Incluye mapa, retorno a caballo o en vehículo 4x4 y almuerzo típico, con menor concurrencia que las reservas principales de Monteverde.",
    "description_en": "El Tigre Waterfalls are located in Los Olivos de Monteverde, Puntarenas, in private cloud forest, whose name refers to the jaguar locally called tigre. It is a self-guided circuit of around 8 km and 3 to 4 hours linking four waterfalls and nine rustic bridges, including hanging and tree bridges, with natural swimming pools and flora and fauna viewpoints. It includes a map, horseback or 4x4 return and a traditional lunch, with fewer crowds than the main Monteverde reserves.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 10.3744369,
    "longitude": -84.8315369
  },
  {
    "match_name": "Catarata La Bruja - Bonilla Turrialba",
    "match_ordinal": 1,
    "name": "Catarata La Bruja - Bonilla Turrialba",
    "description_es": "La Catarata La Bruja se encuentra en el cañón del río Bonilla, en la zona de Bonilla de Turrialba, un sector distinto al de Torito pese a cercanía de registros, y se accede por la Finca Las Perlas. Es una caída principal de más de 100 metros en ambiente selvático, parte de una ruta técnica de 4 a 5 km que también enlaza las caídas La Chalita, La Mula y Las Cuatro Perlas, con cruces de río, barro y tramos con cuerdas. Exige buena condición física, vehículo 4x4, guía local y reserva previa, sin condiciones para principiantes.",
    "description_en": "La Bruja Waterfall is located in the Bonilla River canyon, in the Bonilla area of Turrialba, a different sector from Torito despite nearby records, and is accessed through Finca Las Perlas. It is a main fall of over 100 meters in a jungle setting, part of a technical 4 to 5 km route that also links La Chalita, La Mula and Las Cuatro Perlas falls, with river crossings, mud and roped sections. It requires good fitness, a 4x4 vehicle, a local guide and prior reservation, with no conditions for beginners.",
    "categories": [
      "Cataratas",
      "Senderismo"
    ],
    "latitude": 9.9067054,
    "longitude": -83.6800512
  },
  {
    "match_name": "Catarata La Esmeralda",
    "match_ordinal": 1,
    "name": "Catarata La Esmeralda",
    "description_es": "La Catarata La Esmeralda se ubica en Sabalito de Coto Brus, Puntarenas, en la zona sur cercana a San Vito, en un entorno de bosque tropical y fincas. Es una caída de alrededor de 15 metros sobre roca redondeada que forma una poza de tonos esmeralda apta para el baño, a la que se llega por un sendero de alrededor de 6 km ida y vuelta con un tramo final técnico entre raíces. El acceso requiere vehículo 4x4 o transporte local y guía, y el caudal varía con las lluvias frecuentes de la región.",
    "description_en": "La Esmeralda Waterfall is located in Sabalito de Coto Brus, Puntarenas, in the southern area near San Vito, in a setting of tropical forest and farms. It is a fall of around 15 meters over rounded rock forming an emerald-toned pool suitable for swimming, reached by a trail of around 6 km round trip with a final technical section among roots. Access requires a 4x4 vehicle or local transport and a guide, and flow varies with the region's frequent rains.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 8.8162931,
    "longitude": -82.9098133
  },
  {
    "match_name": "Catarata La Fortuna",
    "match_ordinal": 1,
    "name": "Catarata La Fortuna",
    "description_es": "La Catarata Río Fortuna se encuentra en La Fortuna de San Carlos, Alajuela, en una reserva biológica de alrededor de 210 hectáreas asociada al Parque Nacional Volcán Arenal, a unos 5 km del centro del pueblo. Es una caída de 70 metros sobre pared volcánica rodeada de bosque tropical húmedo, con mirador y poza de tonos turquesa apta para el baño. El acceso es por sendero mantenido de alrededor de 530 gradas, de dificultad media, con entrada de pago independiente gestionada por la asociación de desarrollo local.",
    "description_en": "Rio Fortuna Waterfall is located in La Fortuna de San Carlos, Alajuela, in a biological reserve of around 210 hectares associated with Arenal Volcano National Park, about 5 km from the town center. It is a 70-meter fall over a volcanic wall surrounded by humid tropical forest, with a viewpoint and a turquoise-toned pool suitable for swimming. Access is by a maintained trail of around 530 steps, of medium difficulty, with separate paid entry managed by the local development association.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Parques Nacionales"
    ],
    "latitude": 10.4436,
    "longitude": -84.6744
  },
  {
    "match_name": "Catarata La Gamalota",
    "match_ordinal": 1,
    "name": "Catarata La Gamalota",
    "description_es": "La Catarata La Gamalota se localiza en la misma zona de selva de Guápiles que Chindama y Río Blanco, en Pococí, Limón, y se visita con guías locales desde la base de la zona. Es una caída muy alta y de caudal disperso que desciende como una gran ducha entre bosque primario, con una poza pequeña en la base. La ruta es de alrededor de 17 km ida y vuelta por caminos de finca, ríos y pendientes técnicas con cuerdas, de dificultad alta y solo para excursionistas con experiencia.",
    "description_en": "La Gamalota Waterfall is located in the same Guapiles jungle area as Chindama and Rio Blanco, in Pococi, Limon, and is visited with local guides from the area base. It is a very tall, dispersed-flow fall descending like a giant shower amid primary forest, with a small pool at the base. The route is around 17 km round trip via farm roads, rivers and technical slopes with ropes, of high difficulty and only for experienced hikers.",
    "categories": [
      "Cataratas",
      "Senderismo"
    ],
    "latitude": 10.14847,
    "longitude": -83.812788
  },
  {
    "match_name": "Catarata La Leona",
    "match_ordinal": 1,
    "name": "Catarata La Leona",
    "description_es": "La Catarata La Leona se ubica en Curubandé, camino al Parque Nacional Rincón de la Vieja, en Guanacaste, sobre el río Blanco de origen volcánico en terreno privado. La caminata guiada de alrededor de 4 km ida y vuelta remonta el cauce de aguas turquesa con cruces a pie, nado corto, pasos entre rocas, cuevas y un cañón estrecho con cuerda hasta una caída encajonada con poza apta para el baño. Es una ruta de aventura de dificultad media que exige saber nadar básicamente y uso de guía autorizado.",
    "description_en": "La Leona Waterfall is located in Curubande, on the way to Rincon de la Vieja National Park, Guanacaste, on the volcanic-origin Blanco River on private land. The guided hike of around 4 km round trip follows the turquoise river upstream with wading crossings, a short swim, rock scrambles, caves and a narrow canyon with a rope to an enclosed fall with a pool suitable for swimming. It is a medium-difficulty adventure route requiring basic swimming ability and use of an authorized guide.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 10.7197949,
    "longitude": -85.4104706
  },
  {
    "match_name": "Catarata La Muralla - Turrialba",
    "match_ordinal": 1,
    "name": "Catarata La Muralla - Turrialba",
    "description_es": "La Catarata La Muralla se encuentra sobre el río Guayabo en La Cinchona de San Antonio de Santa Cruz, en Turrialba, Cartago, cercana al Monumento Nacional Guayabo. Es una caída de alrededor de 80 metros con gran fuerza en la base, por lo que el baño directo no es recomendable, aunque existen pozas en el cauce aguas abajo. La caminata supera 1.5 km entre potreros y descenso de dificultad media a alta, con vistas abiertas de la caída y entorno de bosque y cultivos.",
    "description_en": "La Muralla Waterfall is located on the Guayabo River in La Cinchona de San Antonio de Santa Cruz, Turrialba, Cartago, near the Guayabo National Monument. It is a fall of around 80 meters with great force at the base, so direct swimming is not advisable, although there are pools downstream. The hike exceeds 1.5 km through pastures and a descent of medium to high difficulty, with open views of the fall and a setting of forest and farmland.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 9.974,
    "longitude": -83.704
  },
  {
    "match_name": "Catarata Las Cortinas",
    "match_ordinal": 1,
    "name": "Catarata Las Cortinas",
    "description_es": "La Catarata Las Cortinas, también referida como La Cortina o La Roca, se ubica en la zona montañosa de Bonilla entre Turrialba y Siquirres, en el límite de la Reserva Forestal Cordillera Volcánica Central. Es una pared rocosa de alrededor de 125 metros con un chorro principal y velos de agua que escurren como cortinas, con un mirador y un descenso con cuerdas hasta la base. El recorrido es de alrededor de 10 a 18 km ida y vuelta según el punto de partida, de dificultad alta, por fincas privadas con guía y equipo de seguridad.",
    "description_en": "Las Cortinas Waterfall, also referred to as La Cortina or La Roca, is located in the mountainous Bonilla area between Turrialba and Siquirres, on the edge of the Central Volcanic Range Forest Reserve. It is a rock wall of around 125 meters with a main jet and water veils running like curtains, with a viewpoint and a roped descent to the base. The route is around 10 to 18 km round trip depending on the starting point, of high difficulty, through private farms with a guide and safety equipment.",
    "categories": [
      "Cataratas",
      "Senderismo"
    ],
    "latitude": 10.0981388,
    "longitude": -83.5096859
  },
  {
    "match_name": "Catarata Las Gemelas",
    "match_ordinal": 1,
    "name": "Catarata Las Gemelas",
    "description_es": "Las Cataratas Las Gemelas de Puriscal se encuentran en la zona de Mastatal, en el Refugio de Vida Silvestre Jucó, y son distintas de las pozas azules Gemelas de Bajos del Toro. Son dos caídas paralelas de alrededor de 50 metros con poza apta para el baño y una pequeña cueva tras el chorro, además de la cercana cascada Jucó aguas arriba. El acceso es por camino de lastre y un sendero corto de bosque de dificultad moderada, con ingreso por reserva privada y guía local.",
    "description_en": "Las Gemelas Waterfalls of Puriscal are located in the Mastatal area, in the Juco Wildlife Refuge, and are distinct from the blue Gemelas pools of Bajos del Toro. They are two parallel falls of around 50 meters with a pool suitable for swimming and a small cave behind the jet, plus the nearby Juco cascade upstream. Access is by gravel road and a short forest trail of moderate difficulty, with entry through a private reserve and local guide.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 9.68241,
    "longitude": -84.365022
  },
  {
    "match_name": "Catarata Las Golondrinas - Guácimo",
    "match_ordinal": 1,
    "name": "Catarata Las Golondrinas - Guácimo",
    "description_es": "La Catarata Las Golondrinas se ubica en Las Colinas de Guácimo, Limón, en una finca privada de fácil acceso por ruta 32. Es una caída sobre pared rocosa con poza cristalina apta para nadar y piedras para saltos controlados, rodeada de bosque caribeño. El sendero es de alrededor de 2 km ida y vuelta, de dificultad fácil a media, con puente colgante, áreas de camping, baños y parqueo, apto para visita familiar.",
    "description_en": "Las Golondrinas Waterfall is located in Las Colinas de Guacimo, Limon, on a private farm easily accessed via Route 32. It is a fall over a rock wall with a clear pool suitable for swimming and rocks for controlled jumps, surrounded by Caribbean forest. The trail is around 2 km round trip, of easy to medium difficulty, with a hanging bridge, camping areas, restrooms and parking, suitable for family visits.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 10.148,
    "longitude": -83.67
  },
  {
    "match_name": "Catarata Las Nubes - Ciudad Quesada",
    "match_ordinal": 1,
    "name": "Catarata Las Nubes - Ciudad Quesada",
    "description_es": "La Catarata Las Nubes se encuentra en el sector de Las Nubes de San Gerardo, en Ciudad Quesada, San Carlos, al pie del Volcán Platanar. Es una caída de bosque nuboso con poza cristalina y una poza superior con tobogán natural de piedra, a la que se llega por un recorrido de alrededor de 5 km entre potreros, cruces de río y sendero de bosque, de dificultad media. El acceso es por finca privada con vistas hacia la llanura sancarleña y el Volcán Arenal en días despejados.",
    "description_en": "Las Nubes Waterfall is located in the Las Nubes sector of San Gerardo, Ciudad Quesada, San Carlos, at the foot of Platanar Volcano. It is a cloud-forest fall with a clear pool and an upper pool with a natural stone slide, reached by a route of around 5 km through pastures, river crossings and forest trail, of medium difficulty. Access is through a private farm with views toward the San Carlos plains and Arenal Volcano on clear days.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 10.315,
    "longitude": -84.396
  },
  {
    "match_name": "Catarata Las Orquídeas - Guápiles",
    "match_ordinal": 1,
    "name": "Catarata Las Orquídeas - Guápiles",
    "description_es": "La Catarata Las Orquídeas es una caída de agua alta ubicada en la montaña selvática al sur de Guápiles, Pococí, Limón, en la vertiente caribeña. Se accede por calle de lastre hasta la zona de Soda Onde Timbu y luego por un recorrido de ida y vuelta de unos 10 km por potrero, bosque primario y cauce, con barro, cruces de río y tramos empinados que requieren guía local y buena condición física. En el mismo sector se encuentra la catarata Real de Quetzales, sin poza amplia para el baño.",
    "description_en": "Las Orquideas Waterfall is a tall waterfall in the forested mountains south of Guapiles, Pococi, Limon, on the Caribbean slope. It is reached by gravel road to the Soda Onde Timbu area and then by a roughly 10 km round-trip route through pasture, primary forest and streambed, with mud, river crossings and steep sections that require a local guide and good fitness. The nearby Real de Quetzales waterfall is in the same sector, with no large swimming pool.",
    "categories": [
      "Cataratas",
      "Senderismo"
    ],
    "latitude": 10.2133499,
    "longitude": -83.7868871
  },
  {
    "match_name": "Catarata Las Palmas - Cerro de la Muerte",
    "match_ordinal": 1,
    "name": "Catarata Las Palmas - Cerro de la Muerte",
    "description_es": "La Catarata Las Palmas se ubica en una finca privada sobre la Ruta 2 en la zona del Cerro de la Muerte, en bosque nuboso y de altura con pinos, moras silvestres y clima frío. El recorrido es de unos 6 km ida y vuelta con descenso en zigzag de dificultad moderada hasta un mirador y luego hasta el río, donde la caída forma una poza pequeña y poco profunda. El acceso requiere vehículo alto, pago de entrada y caminata de alrededor de una hora por vía.",
    "description_en": "Las Palmas Waterfall is located on a private farm along Route 2 in the Cerro de la Muerte area, in high-elevation cloud forest with pines, wild blackberries and cold weather. The route is about 6 km round trip with a moderate zigzag descent to a viewpoint and then to the river, where the fall forms a small shallow pool. Access requires a high-clearance vehicle, an entrance fee and about one hour of walking each way.",
    "categories": [
      "Cataratas",
      "Senderismo"
    ],
    "latitude": 9.5278082,
    "longitude": -83.6987454
  },
  {
    "match_name": "Catarata Los Montes",
    "match_ordinal": 1,
    "name": "Catarata Los Montes",
    "description_es": "Las Cataratas Los Montes son dos caídas de agua con pozas cristalinas ubicadas en las colinas de Guácimo, Limón, dentro de la propiedad privada Figues Farm, en bosque tropical húmedo del Caribe. El recorrido total es de unos 5 km por senderos entre fincas, lagunas, puente colgante y gradas hasta la base de las caídas, con paredes de roca y pozas aptas para el baño. El sitio cuenta con parqueo, baños, duchas y restaurante.",
    "description_en": "Los Montes Waterfalls are two waterfalls with clear pools located in the hills of Guacimo, Limon, inside the private Figues Farm property in Caribbean humid tropical forest. The total route is about 5 km along trails through farms, lagoons, a hanging bridge and steps to the base of the falls, with rock walls and swimmable pools. The site has parking, restrooms, showers and a restaurant.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 10.1539241,
    "longitude": -83.6674162
  },
  {
    "match_name": "Catarata Los Nogales - Turrialba",
    "match_ordinal": 1,
    "name": "Catarata Los Nogales - Turrialba",
    "description_es": "La Catarata Los Nogales se encuentra en la zona montañosa de Santa Cruz de Turrialba, Cartago, en un entorno de fincas lecheras, bosque y ríos de la falda del Volcán Turrialba. Se llega por la vía hacia Pacayas y Santa Cruz por calle de lastre y luego por un sendero corto hasta una caída con poza de agua cristalina apta para el baño. Es una visita de medio día que se combina con otras cascadas del sector como La Muralla y Las Trillizas.",
    "description_en": "Los Nogales Waterfall is located in the mountainous area of Santa Cruz de Turrialba, Cartago, among dairy farms, forest and rivers on the slopes of Turrialba Volcano. It is reached via Pacayas and Santa Cruz by gravel road and then a short trail to a fall with a clear swimmable pool. It is a half-day visit that can be combined with other nearby waterfalls such as La Muralla and Las Trillizas.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 9.9067054,
    "longitude": -83.6800512
  },
  {
    "match_name": "Catarata Metaponto",
    "match_ordinal": 1,
    "name": "Catarata Metaponto",
    "description_es": "La Catarata Metaponto está en Metaponto de Agua Buena, Sabalito de Coto Brus, Puntarenas, en bosque húmedo premontano de alta biodiversidad. Es una caída de gran caudal y altura, con mirador en la parte alta y descenso de fuerte pendiente hasta la base, donde la brisa y el rocío son intensos, además de una poza para el baño en el sector bajo. El sendero registrado es de unos 2,6 km ida y vuelta y se recomienda calzado adecuado y guía local.",
    "description_en": "Metaponto Waterfall is in Metaponto de Agua Buena, Sabalito de Coto Brus, Puntarenas, in premontane wet forest with high biodiversity. It is a high-volume, tall waterfall with an upper viewpoint and a steep descent to its base, where mist and spray are intense, plus a swimming spot in the lower section. The recorded trail is about 2.6 km out and back, and proper footwear and a local guide are recommended.",
    "categories": [
      "Cataratas",
      "Senderismo"
    ],
    "latitude": 8.7188782,
    "longitude": -82.9489864
  },
  {
    "match_name": "Cataratas Nauyaca",
    "match_ordinal": 1,
    "name": "Catarata Nauyaca",
    "description_es": "Las Cataratas Nauyaca están en el límite entre Barú de Pérez Zeledón y la zona de Dominical, sobre el río Barucito, dentro de un cañón de unos 80 metros de ancho. Son dos caídas: la superior de 45 metros en caída libre y la inferior de 20 metros en caída escalonada, que forma al pie una poza de unos 1000 metros cuadrados y 6 metros de profundidad apta para el baño, además de pozas menores. El acceso es por finca privada con sendero de unos 4 km por vía, con opciones a pie, a caballo y en vehículo 4x4. Este acceso opera desde las entradas privadas del sector de Platanillo, con parqueo, traslados en 4x4 y cabalgatas, baños y áreas de descanso. No se nada en la caída superior por la fuerza del agua y se usa la poza inferior señalizada.",
    "description_en": "Nauyaca Waterfalls are on the border between Baru de Perez Zeledon and the Dominical area, on the Barucito River, inside a canyon about 80 meters wide. They consist of two falls: the upper 45-meter free fall and the lower 20-meter stepped fall, which forms a pool of about 1,000 square meters and 6 meters deep suitable for swimming, plus smaller pools. Access is through private property with a trail of about 4 km each way, with hiking, horseback and 4x4 options. This access operates from the private entrances near Platanillo, with parking, 4x4 transfers and horseback rides, restrooms and rest areas. Swimming is not done at the upper fall due to water force; the marked lower pool is used.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 9.254635,
    "longitude": -83.8075411
  },
  {
    "match_name": "Catarata Oropéndola",
    "match_ordinal": 1,
    "name": "Catarata Oropéndola",
    "description_es": "La Catarata Oropéndola está sobre el río Blanco junto al sector Las Pailas del Parque Nacional Rincón de la Vieja, en Curubandé de Liberia, Guanacaste, en propiedad privada contigua al área protegida. Es una caída de unos 24 a 25 metros que desciende por un cañón de roca volcánica hasta una poza turquesa apta para el baño. Se llega por un sendero corto de alrededor de 1,5 km ida y vuelta que cruza un puente colgante sobre el cañón.",
    "description_en": "Oropendola Waterfall is on the Blanco River next to the Las Pailas sector of Rincon de la Vieja National Park, in Curubande, Liberia, Guanacaste, on private property adjacent to the protected area. It is a fall of about 24 to 25 meters dropping through a volcanic rock canyon into a turquoise swimmable pool. It is reached by a short trail of about 1.5 km round trip that crosses a hanging bridge over the canyon.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 10.7519975,
    "longitude": -85.380336
  },
  {
    "match_name": "Catarata Rio Elia",
    "match_ordinal": 1,
    "name": "Catarata Rio Elia",
    "description_es": "La Catarata Río Elía es una caída de agua en la zona boscosa de Guápiles, Pococí, Limón, en las estribaciones caribeñas de la Cordillera Volcánica Central. Se accede por caminos rurales de lastre y senderos de bosque y cauce que pueden estar embarrados y requieren cruzar el río, por lo que se recomienda ir con guía local y calzado adecuado. No cuenta con servicios formales y es una visita de naturaleza en ambiente húmedo tropical.",
    "description_en": "Rio Elia Waterfall is a waterfall in the forested area of Guapiles, Pococi, Limon, on the Caribbean foothills of the Central Volcanic Range. It is accessed by rural gravel roads and forest and streambed trails that can be muddy and require river crossings, so a local guide and proper footwear are recommended. It has no formal visitor services and is a nature visit in a humid tropical setting.",
    "categories": [
      "Cataratas",
      "Senderismo"
    ],
    "latitude": 10.149,
    "longitude": -83.806
  },
  {
    "match_name": "Catarata Río Perla - Siquirres",
    "match_ordinal": 1,
    "name": "Catarata Río Perla - Siquirres",
    "description_es": "La Catarata Río Perla se ubica en La Alegría de Siquirres, Limón, sobre el río Perla en selva caribeña. Son dos caídas pequeñas de agua cristalina con una poza apta para el baño, a las que se llega por un recorrido corto de unos 3 km que incluye caminar por la orilla y cruzar el río en tramos poco profundos. El vehículo se deja junto al puente sobre el río y hay guías locales en la comunidad con servicios básicos de alimentación.",
    "description_en": "Rio Perla Waterfall is located in La Alegria de Siquirres, Limon, on the Perla River in Caribbean rainforest. It consists of two small clear-water falls with a swimmable pool, reached by a short route of about 3 km that includes walking along the bank and crossing the river in shallow sections. Vehicles park by the bridge over the river, and local community guides offer basic food services.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas"
    ],
    "latitude": 10.102,
    "longitude": -83.628
  },
  {
    "match_name": "Catarata Salto del Ángel",
    "match_ordinal": 1,
    "name": "Catarata Salto del Ángel",
    "description_es": "La Catarata Salto del Ángel está en Sabalito de Coto Brus, Puntarenas, en la misma zona montañosa de Coto Brus donde se ubica la Catarata Esmeralda. Destaca por una pared de columnas basálticas de casi 50 metros de altura formada por lava columnar, con poza en la base para el baño y espacios para picnic. El recorrido total es de unos 9 km ida y vuelta de dificultad intermedia, con subidas y bajadas, cruces de río y tramos de bosque, accesible en la parte inicial solo con vehículo 4x4.",
    "description_en": "Salto del Angel Waterfall is in Sabalito de Coto Brus, Puntarenas, in the same Coto Brus mountain zone as Esmeralda Waterfall. It stands out for a wall of basaltic columns nearly 50 meters high formed by columnar lava, with a pool at its base for swimming and picnic areas. The total route is about 9 km round trip of intermediate difficulty, with ups and downs, river crossings and forest sections, with the initial access only suitable for 4x4 vehicles.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 8.8162931,
    "longitude": -82.9098133
  },
  {
    "match_name": "Catarata Salto La Victoria",
    "match_ordinal": 1,
    "name": "Catarata Salto La Victoria",
    "description_es": "La Catarata Salto La Victoria de este punto se ubica en la zona boscosa de Puriscal, San José, en el sector de La Cangreja, dentro de bosque húmedo con ríos y quebradas. Se accede por caminos rurales y sendero de bosque hasta la base de la caída, en un entorno de alta biodiversidad cercano al Parque Nacional La Cangreja. Es una visita de senderismo de medio día sin infraestructura formal, donde el baño depende del caudal y las condiciones del cauce.",
    "description_en": "The Salto La Victoria waterfall at this location is in the forested area of Puriscal, San Jose, in the La Cangreja sector, within humid forest with rivers and streams. It is reached by rural roads and a forest trail to the base of the fall, in a highly biodiverse setting near La Cangreja National Park. It is a half-day hiking visit with no formal infrastructure, where swimming depends on streamflow and channel conditions.",
    "categories": [
      "Cataratas",
      "Senderismo"
    ],
    "latitude": 9.7034083,
    "longitude": -84.3978752
  },
  {
    "match_name": "Catarata San Gabriel - Pérez Zeledón",
    "match_ordinal": 1,
    "name": "Catarata San Gabriel - Pérez Zeledón",
    "description_es": "La Catarata San Gabriel está en el área rural de Pérez Zeledón, San José, en un entorno de fincas y bosque secundario. Es una caída amplia con una poza profunda apta para el baño, a la que se llega por una caminata corta de unos 500 metros de dificultad baja. No tiene instalaciones desarrolladas, con mesas rústicas para picnic, y se visita en combinación con otras cascadas cercanas de la Ruta del Agua como Namú.",
    "description_en": "San Gabriel Waterfall is in the rural area of Perez Zeledon, San Jose, surrounded by farms and secondary forest. It is a wide fall with a deep swimmable pool, reached by a short walk of about 500 meters with low difficulty. It has no developed facilities, with rustic picnic tables, and is visited in combination with other nearby falls on the Water Route such as Namu.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas"
    ],
    "latitude": 9.197848,
    "longitude": -83.5769671
  },
  {
    "match_name": "CATARATA UVITA & PAVON",
    "match_ordinal": 1,
    "name": "CATARATA UVITA & PAVON",
    "description_es": "Este punto agrupa dos cascadas de la zona de Osa, Puntarenas: la Catarata Uvita, a unos 10 minutos del centro de Uvita, una caída con pozas y un tobogán natural de roca en finca privada con restaurante y jardín de mariposas; y la Cascada El Pavón, entre Ojochal y Punta Mala, reconocida por una gran roca encajada en medio de la caída y una poza cristalina con pequeña playa de arena. Ambas son visitas cortas para el baño y el picnic en selva del Pacífico sur.",
    "description_en": "This point groups two waterfalls in the Osa area, Puntarenas: Uvita Waterfall, about 10 minutes from downtown Uvita, a fall with pools and a natural rock slide on private property with a restaurant and butterfly garden; and El Pavon Waterfall, between Ojochal and Punta Mala, known for a large boulder wedged in the middle of the fall and a clear pool with a small sandy beach. Both are short visits for swimming and picnicking in South Pacific rainforest.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas"
    ],
    "latitude": 9.077,
    "longitude": -83.616
  },
  {
    "match_name": "Catarata Valle Encantado - Puntarenas",
    "match_ordinal": 1,
    "name": "Catarata Valle Encantado - Puntarenas",
    "description_es": "La Catarata Valle Encantado es un conjunto de varias cascadas y pozas ubicado en Pueblo Nuevo de Garabito, Puntarenas, en las montañas interiores entre Jacó y la Ruta 34. El sitio reúne caídas principales y cascadas menores con pozas para el baño, a las que se llega por sendero y tramos de cauce con gradas improvisadas y pendientes. Es una visita de aventura en bosque tropical con parqueo rural y sin servicios urbanos.",
    "description_en": "Valle Encantado Waterfall is a system of several cascades and pools located in Pueblo Nuevo de Garabito, Puntarenas, in the inland mountains between Jaco and Route 34. The site includes main falls and smaller cascades with swimming pools, reached by trail and streambed sections with makeshift steps and slopes. It is an adventure visit in tropical forest with rural parking and no urban services.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 9.6474653,
    "longitude": -84.6290484
  },
  {
    "match_name": "Catarata Vista Real",
    "match_ordinal": 1,
    "name": "Catarata Vista Real",
    "description_es": "La Catarata Vista Real se ubica en la zona rural de Providencia de Dota, San José, en un paisaje de montaña con cafetales, potreros y parches de bosque nuboso propios de la cuenca alta. Se accede por caminos vecinales de lastre y un sendero corto hasta la caída y su poza, en un ambiente frío y húmedo de la zona de Los Santos. Es una parada de naturaleza tranquila dentro de la oferta de turismo rural comunitario de Providencia.",
    "description_en": "Vista Real Waterfall is located in the rural area of Providencia de Dota, San Jose, in a mountain landscape of coffee fields, pastures and cloud forest patches typical of the upper basin. It is accessed by gravel local roads and a short trail to the fall and its pool, in the cool humid climate of the Los Santos zone. It is a quiet nature stop within the community rural tourism offering of Providencia.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Turismo Comunitario"
    ],
    "latitude": 9.686,
    "longitude": -83.936
  },
  {
    "match_name": "Cataratas Bribri y Volio",
    "match_ordinal": 1,
    "name": "Cataratas Bribri y Volio",
    "description_es": "Las Cataratas Bribri y Volio están en el Territorio Indígena Bribri de Talamanca, Limón, a pocos kilómetros de Bribri, en selva caribeña primaria. La Catarata Volio es una caída de unos 15 metros sobre roca basáltica oscura a la que se llega por un recorrido de 1,2 km ida y vuelta con tramos de cauce resbaloso, y la Catarata Bribri es otra caída cercana con poza. La visita se hace con guía local del territorio y se combina con el tour de cacao y plantas medicinales de la cultura bribri.",
    "description_en": "Bribri and Volio Waterfalls are in the Bribri Indigenous Territory of Talamanca, Limon, a few kilometers from Bribri, in primary Caribbean rainforest. Volio Waterfall is a fall of about 15 meters over dark basaltic rock reached by a 1.2 km round-trip route with slippery streambed sections, and Bribri Waterfall is another nearby fall with a pool. Visits are made with a local Territory guide and combined with the cacao and medicinal plant tour of Bribri culture.",
    "categories": [
      "Cataratas",
      "Cultura e Historia",
      "Senderismo",
      "Turismo Comunitario"
    ],
    "latitude": 9.6540146,
    "longitude": -82.7549412
  },
  {
    "match_name": "Cataratas de Montezuma",
    "match_ordinal": 1,
    "name": "Cataratas de Montezuma",
    "description_es": "Las Cataratas de Montezuma son tres caídas escalonadas sobre el río Montezuma, en Montezuma de Cóbano, Puntarenas, al sur de la Península de Nicoya. La caída inferior, la más alta con unos 24 metros, forma una poza grande para el baño; la intermedia tiene pozas menores y la superior es usada para saltos desde rocas. Se llega por el sendero del cauce en unos 20 a 30 minutos o por el sendero del canopy hasta las pozas altas, con rocas resbalosas.",
    "description_en": "Montezuma Waterfalls are three stepped falls on the Montezuma River, in Montezuma de Cobano, Puntarenas, in the south of the Nicoya Peninsula. The lower fall, the tallest at about 24 meters, forms a large swimming pool; the middle has smaller pools and the upper is used for rock jumping. They are reached by the riverbed trail in about 20 to 30 minutes or by the canopy trail to the upper pools, with slippery rocks.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 9.65248,
    "longitude": -85.07232
  },
  {
    "match_name": "Cataratas El Congo",
    "match_ordinal": 1,
    "name": "Cataratas El Congo",
    "description_es": "Las Cataratas El Congo son un conjunto de tres caídas sobre el río María Aguilar, en Ujarrás de Cariblanco, entre Vara Blanca y Sarapiquí, en bosque nuboso. Se ingresa por el proyecto Mi Cafecito Coffee Tour, con un sendero de alrededor de 1 km hasta un mirador al cañón y la catarata principal, cuya poza tiene borde de piscina infinita natural, además de laguna artificial. La visita se combina con el tour de café de la zona.",
    "description_en": "El Congo Waterfalls are a set of three falls on the Maria Aguilar River, in Ujarras de Cariblanco, between Vara Blanca and Sarapiqui, in cloud forest. Entry is through the Mi Cafecito Coffee Tour project, with a trail of about 1 km to a canyon viewpoint and the main waterfall, whose pool has a natural infinity-pool edge, plus an artificial lagoon. The visit is combined with the local coffee tour.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Experiencia Gastronómica",
      "Agroturismo"
    ],
    "latitude": 10.2937238,
    "longitude": -84.1860263
  },
  {
    "match_name": "Cataratas Los Campesinos - San Lorenzo de Tarrazú",
    "match_ordinal": 1,
    "name": "Cataratas Los Campesinos - San Lorenzo de Tarrazú",
    "description_es": "Las Cataratas Los Campesinos forman parte del proyecto comunitario Albergue Turístico Los Campesinos, en Quebrada Arroyo de San Lorenzo de Tarrazú, San José, con acceso habitual desde Quepos. El recorrido atraviesa bosque tropical, puentes colgantes —uno de 127 metros de largo y 40 metros de alto— y quebradas hasta cascadas y pozas naturales para el baño. El acceso es por calle de lastre que requiere vehículo alto y los servicios son rústicos con alimentación local.",
    "description_en": "Los Campesinos Waterfalls are part of the community project Albergue Turistico Los Campesinos, in Quebrada Arroyo, San Lorenzo de Tarrazu, San Jose, usually accessed from Quepos. The route crosses tropical forest, hanging bridges —one 127 meters long and 40 meters high— and streams to waterfalls and natural swimming pools. Access is by gravel road requiring a high-clearance vehicle, with rustic services and local food.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Ríos y Pozas",
      "Turismo Comunitario"
    ],
    "latitude": 9.457,
    "longitude": -84.006
  },
  {
    "match_name": "Cataratas Namú",
    "match_ordinal": 1,
    "name": "Cataratas Namú",
    "description_es": "Las Cataratas Namú están en San Antonio de La Amistad, Pérez Zeledón, San José, en un cañón de montaña con bosque denso. Son tres caídas con pozas grandes para el baño, a las que se llega por un sendero de unos 3 km ida y vuelta con descenso de unos 20 minutos y ascenso exigente de regreso. El sitio cuenta con servicios básicos como duchas y áreas para cambiarse y forma parte de la Ruta del Agua de Pérez Zeledón.",
    "description_en": "Namu Waterfalls are in San Antonio de La Amistad, Perez Zeledon, San Jose, in a mountain canyon with dense forest. They are three falls with large swimming pools, reached by a trail of about 3 km round trip with a 20-minute descent and a demanding climb back. The site has basic services such as showers and changing areas and is part of the Perez Zeledon Water Route.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 9.193,
    "longitude": -83.558
  },
  {
    "match_name": "Cataratas Vino Tinto - Santa María de Dota",
    "match_ordinal": 1,
    "name": "Cataratas Vino Tinto - Santa María de Dota",
    "description_es": "Las Cataratas Vino Tinto son un conjunto de caídas en los bosques de altura de Santa María de Dota, San José, en la zona de Los Santos. Se recorren por senderos de bosque nuboso con pendientes y tramos húmedos hasta miradores y pozas de agua fría de montaña. Es una visita de senderismo de medio día en finca privada con parqueo rural, sin servicios urbanos, en el mismo sector montañoso donde se ubica el Cerro Caricias.",
    "description_en": "Vino Tinto Waterfalls are a group of falls in the highland forests of Santa Maria de Dota, San Jose, in the Los Santos zone. They are visited via cloud forest trails with slopes and wet sections to viewpoints and cold mountain pools. It is a half-day hiking visit on private property with rural parking and no urban services, in the same mountain sector as Cerro Caricias.",
    "categories": [
      "Cataratas",
      "Senderismo"
    ],
    "latitude": 9.6547803,
    "longitude": -83.9762093
  },
  {
    "match_name": "Centro Deportivo La Florencia - Alajuela",
    "match_ordinal": 1,
    "name": "Centro Deportivo La Florencia - Alajuela",
    "description_es": "El Centro Deportivo La Florencia es un complejo recreativo privado en Alajuela, Alajuela, orientado al deporte y la recreación familiar. Cuenta con canchas deportivas, piscina y áreas para actividades grupales y eventos, con acceso por reserva o pase del día. No es un sitio natural protegido, sino una instalación de uso diurno en entorno urbano.",
    "description_en": "Centro Deportivo La Florencia is a private recreational complex in Alajuela, Alajuela, focused on sports and family recreation. It has sports fields, a swimming pool and areas for group activities and events, with access by reservation or day pass. It is not a protected natural site, but a daytime-use facility in an urban setting.",
    "categories": [
      "Aventura y Deportes"
    ],
    "latitude": 9.965671,
    "longitude": -84.3437861
  },
  {
    "match_name": "Cerro Buena Vista - San José",
    "match_ordinal": 1,
    "name": "Cerro Buena Vista - San José",
    "description_es": "El Cerro Buena Vista, conocido popularmente como Cerro de la Muerte, es un macizo de 3491 metros de altitud en la Cordillera de Talamanca, entre San José y Cartago, y el punto más alto de la Carretera Interamericana. Presenta clima frío entre 1 y 13 grados, vegetación de robles, encinos y páramo, con miradores naturales hacia el Valle Central y el Pacífico en días despejados. La visita es de paso por carretera con paradas, senderos cortos y lodges de montaña para avistamiento de aves.",
    "description_en": "Cerro Buena Vista, popularly known as Cerro de la Muerte, is a 3,491-meter massif in the Talamanca Range, between San Jose and Cartago, and the highest point on the Inter-American Highway. It has a cold climate between 1 and 13 degrees, with oak and paramo vegetation and natural viewpoints toward the Central Valley and the Pacific on clear days. It is visited as a roadside stop with viewpoints, short trails and mountain lodges for birdwatching.",
    "categories": [
      "Montañas y Cerros",
      "Miradores",
      "Senderismo"
    ],
    "latitude": 9.4303353,
    "longitude": -83.8418845
  },
  {
    "match_name": "Cerro Caricias – Bosque mágico cerca de la ciudad 🌿✨",
    "match_ordinal": 1,
    "name": "Cerro Caricias – Bosque mágico cerca de la ciudad",
    "description_es": "El Cerro Caricias es una loma boscosa en Santa María de Dota, San José, cubierta de bosque nuboso con árboles, musgo y neblina frecuente. Se recorre por un sendero corto de montaña para caminata contemplativa y fotografía de bosque, en el mismo sector donde se ubican las Cataratas Vino Tinto. Es una visita de medio día en ambiente frío y húmedo de la zona de Los Santos, con acceso rural y sin infraestructura urbana.",
    "description_en": "Cerro Caricias is a forested hill in Santa Maria de Dota, San Jose, covered in cloud forest with trees, moss and frequent mist. It is walked via a short mountain trail for contemplative hiking and forest photography, in the same sector as Vino Tinto Waterfalls. It is a half-day visit in the cool humid climate of the Los Santos zone, with rural access and no urban infrastructure.",
    "categories": [
      "Montañas y Cerros",
      "Senderismo"
    ],
    "latitude": 9.6547803,
    "longitude": -83.9762093
  },
  {
    "match_name": "Cerro Chirripó – Ruta San Jerónimo 🌄",
    "match_ordinal": 1,
    "name": "Cerro Chirripó – Ruta San Jerónimo",
    "description_es": "La Ruta San Jerónimo es una vía alterna de ascenso al macizo del Chirripó dentro del Parque Nacional Chirripó, que parte de San Jerónimo de Pérez Zeledón, San José. Es una travesía de alta montaña de varios días por bosque nuboso, páramo y lagunas glaciares, con campamentos y refugios, desnivel exigente y necesidad de reserva previa, guía autorizado y buena condición física. Conduce a la red de senderos de la cumbre compartida con la ruta tradicional de San Gerardo.",
    "description_en": "The San Jeronimo Route is an alternate ascent to the Chirripo massif inside Chirripo National Park, starting from San Jeronimo de Perez Zeledon, San Jose. It is a multi-day high-mountain traverse through cloud forest, paramo and glacial lakes, with camps and shelters, demanding elevation gain and requiring advance booking, an authorized guide and good fitness. It connects to the summit trail network shared with the traditional San Gerardo route.",
    "categories": [
      "Parques Nacionales",
      "Senderismo",
      "Montañas y Cerros"
    ],
    "latitude": 9.466,
    "longitude": -83.597
  },
  {
    "match_name": "Cerro Chirripó por San Gerardo – La cumbre más alta de Costa Rica",
    "match_ordinal": 1,
    "name": "Cerro Chirripó por San Gerardo – La cumbre más alta",
    "description_es": "El Cerro Chirripó es la cumbre más alta de Costa Rica, con 3819 metros oficiales y 3822,64 metros según cotas fotogramétricas, dentro del Parque Nacional Chirripó en la Cordillera de Talamanca. La ruta tradicional parte de San Gerardo de Rivas por unos 20 km hasta el Refugio El Páramo a 3400 metros y luego 5 km hasta la cima, entre bosque nuboso, páramo y lagos glaciares. En días despejados se observan el Pacífico, el Caribe y gran parte del país, con temperaturas que pueden bajar de cero.",
    "description_en": "Cerro Chirripo is the highest summit in Costa Rica, at 3,819 meters officially and 3,822.64 meters by photogrammetric data, inside Chirripo National Park in the Talamanca Range. The traditional route starts from San Gerardo de Rivas with about 20 km to El Paramo Shelter at 3,400 meters and then 5 km to the summit, through cloud forest, paramo and glacial lakes. On clear days the Pacific, the Caribbean and much of the country can be seen, with temperatures that can drop below freezing.",
    "categories": [
      "Parques Nacionales",
      "Senderismo",
      "Montañas y Cerros"
    ],
    "latitude": 9.463842,
    "longitude": -83.601301
  },
  {
    "match_name": "Cerro Dantas en Heredia: Caminata con cataratas y selva nublada",
    "match_ordinal": 1,
    "name": "Cerro Dantas Heredia: cataratas y selva nublada",
    "description_es": "Cerro Dantas es un refugio privado de vida silvestre en las montañas de Heredia, en la zona de amortiguamiento del Parque Nacional Braulio Carrillo, cubierto de selva nublada. Tiene una red de senderos que conduce a cataratas y pozas entre bosque denso, con hábitat de danta, felinos, quetzal y anfibios. El ingreso es controlado con pago de entrada, guía recomendado y senderos que pueden estar embarrados.",
    "description_en": "Cerro Dantas is a private wildlife refuge in the mountains of Heredia, in the buffer zone of Braulio Carrillo National Park, covered in cloud forest. It has a trail network leading to waterfalls and pools through dense forest, with habitat for tapirs, wild cats, quetzals and amphibians. Entry is controlled with an entrance fee, a recommended guide and trails that can be muddy.",
    "categories": [
      "Reservas Silvestres",
      "Senderismo",
      "Cataratas"
    ],
    "latitude": 10.086,
    "longitude": -84.072
  },
  {
    "match_name": "CERRO DRAGÓN - ASERRÍ",
    "match_ordinal": 1,
    "name": "CERRO DRAGÓN - ASERRÍ",
    "description_es": "El Cerro Dragón es una loma mirador en el cantón de Aserrí, San José, en las montañas al sur del Valle Central. Se accede por caminos vecinales y sendero rural hasta puntos altos con vista hacia la ciudad, el valle y las montañas cercanas. Es una caminata corta de medio día en ambiente rural, sin servicios formales, recomendada en época seca y con calzado adecuado.",
    "description_en": "Cerro Dragon is a viewpoint hill in the canton of Aserri, San Jose, in the mountains south of the Central Valley. It is accessed by local roads and a rural trail to high points with views toward the city, the valley and nearby mountains. It is a short half-day hike in a rural setting with no formal services, best in the dry season and with proper footwear.",
    "categories": [
      "Montañas y Cerros",
      "Miradores",
      "Senderismo"
    ],
    "latitude": 9.752,
    "longitude": -84.133
  },
  {
    "match_name": "Cerro El Encanto - San Buenaventura",
    "match_ordinal": 1,
    "name": "Cerro El Encanto - San Buenaventura",
    "description_es": "El Cerro El Encanto es una elevación rural en San Buenaventura de Abangares, Guanacaste, en la transición entre bosque seco y bosque húmedo del occidente del país. Se visita por caminos de lastre y sendero hasta la parte alta, con vistas a fincas, colinas y el Golfo de Nicoya en días despejados. Es una caminata de medio día en propiedad rural sin infraestructura turística desarrollada.",
    "description_en": "Cerro El Encanto is a rural hill in San Buenaventura de Abangares, Guanacaste, in the transition between dry and humid forest of western Costa Rica. It is visited by gravel roads and a trail to the upper section, with views over farms, hills and the Gulf of Nicoya on clear days. It is a half-day hike on rural property with no developed tourism infrastructure.",
    "categories": [
      "Montañas y Cerros",
      "Miradores",
      "Senderismo"
    ],
    "latitude": 10.173,
    "longitude": -84.73
  },
  {
    "match_name": "Cerro Ena",
    "match_ordinal": 1,
    "name": "Cerro Ena",
    "description_es": "El Cerro Ena es una cumbre de alrededor de 3110 a 3126 metros sobre el nivel del mar en la Cordillera de Talamanca, dentro del Parque Nacional Chirripó, que se recorre desde San Jerónimo de Pérez Zeledón por un ascenso exigente de unos 11 km hasta la zona alta. En la cumbre predominan el páramo, las turberas y el bosque nuboso poco alterado, con amaneceres despejados y vistas hacia Los Crestones, Cerro Dúrika, Kamuk y el Volcán Barú en Panamá, además de hongos, musgos y aves de altura. Es una travesía de montaña de uno o varios días con pernocta, que requiere buena condición física, guía local y coordinación previa con la asociación comunitaria de la zona.",
    "description_en": "Cerro Ena is a summit of around 3,110 to 3,126 meters above sea level in the Talamanca Range inside Chirripo National Park, reached from San Jeronimo de Perez Zeledon by a demanding climb of about 11 km to the high zone. The summit features paramo, peat bogs and largely intact cloud forest, with clear sunrises and views toward Los Crestones, Cerro Durika, Kamuk and Volcan Baru in Panama, plus fungi, mosses and highland birds. It is a one- or multi-day mountain trek with overnight stay that requires good fitness, a local guide and prior arrangement with the community association.",
    "categories": [
      "Montañas y Cerros",
      "Senderismo",
      "Parques Nacionales"
    ],
    "latitude": 9.3675,
    "longitude": -83.4291667
  },
  {
    "match_name": "Cerro Espíritu Santo - Naranjo",
    "match_ordinal": 1,
    "name": "Cerro Espíritu Santo - Naranjo",
    "description_es": "El Cerro Espíritu Santo es un cono volcánico de 1363 metros sobre el nivel del mar ubicado a unos 3 km del centro de Naranjo, Alajuela, entre cafetales y con acceso pavimentado. En la cima se encuentran las ruinas del monumento a Cristo Rey y el anfiteatro de inicios del siglo XX, obras inconclusas tras un terremoto que obligó a destinar los recursos a la iglesia local, que hoy funcionan como mirador gratuito de gran valor histórico y fotográfico. Desde lo alto hay vista panorámica del Valle Central y llanuras cercanas, especialmente al atardecer, en una visita corta y de dificultad fácil.",
    "description_en": "Cerro Espiritu Santo is a 1,363-meter volcanic cone about 3 km from downtown Naranjo, Alajuela, set among coffee fields with paved access. At the summit stand the ruins of the early-20th-century Cristo Rey monument and amphitheater, unfinished works after an earthquake forced resources toward the local church, now serving as a free viewpoint of historic and photographic interest. From the top there are panoramic views of the Central Valley and nearby lowlands, especially at sunset, on a short and easy visit.",
    "categories": [
      "Miradores",
      "Montañas y Cerros",
      "Cultura e Historia"
    ],
    "latitude": 10.0850398,
    "longitude": -84.4065428
  },
  {
    "match_name": "Cerro Indio Jupa Plana - Acosta",
    "match_ordinal": 1,
    "name": "Cerro Indio Jupa Plana - Acosta",
    "description_es": "El Cerro Indio Jupa Plana es una formación rocosa en la zona montañosa de Sabanillas y Cangrejal de Acosta, San José, nombrada por el perfil de la roca que recuerda un rostro humano de rasgos indígenas. Se visita por caminos rurales y senderos cortos entre potreros y bosque, con miradores naturales hacia los cerros y valles de Acosta y la fila de los Cerros de Escazú. Es un destino rural de medio día para caminata leve, fotografía y contemplación del paisaje, con servicios básicos en las comunidades cercanas.",
    "description_en": "Cerro Indio Jupa Plana is a rock formation in the mountain area of Sabanillas and Cangrejal in Acosta, San Jose, named for a rock profile resembling an Indigenous human face. It is visited by rural roads and short trails through pasture and forest, with natural viewpoints over the hills and valleys of Acosta and the Cerros de Escazu range. It is a rural half-day destination for easy hiking, photography and landscape viewing, with basic services in nearby communities.",
    "categories": [
      "Miradores",
      "Montañas y Cerros",
      "Senderismo"
    ],
    "latitude": 9.8000005,
    "longitude": -84.1580225
  },
  {
    "match_name": "Cerro Iztarú - Tres Ríos",
    "match_ordinal": 1,
    "name": "Cerro Iztarú - Tres Ríos",
    "description_es": "El Cerro Iztarú es el Campo Escuela Nacional de la zona protectora Cerros de La Carpintera, en Tres Ríos de La Unión, Cartago, a unos 1700 metros de altura y a pocos minutos del cruce del Ochomogo. Es un centro recreativo y de campamentos con senderos, cabañas, salas, comedor, zonas de camping y pista de retos, además del ascenso al Copete de Pepe con vista hacia Cartago, Tres Ríos y el Volcán Irazú. El ingreso es controlado con reserva entre semana, parqueo y vigilancia, y es apto para visitas familiares, caminatas moderadas y actividades grupales.",
    "description_en": "Cerro Iztaru is the National Field School camp in the Cerros de La Carpintera protected zone in Tres Rios, La Union, Cartago, at about 1,700 meters of elevation and minutes from the Ochomogo junction. It is a recreation and camping center with trails, cabins, meeting rooms, dining hall, camping areas and a challenge course, plus the climb to Copete de Pepe with views toward Cartago, Tres Rios and Irazu Volcano. Entry is controlled with weekday reservations, parking and security, and it suits family visits, moderate walks and group activities.",
    "categories": [
      "Senderismo",
      "Hospedaje en la Naturaleza",
      "Miradores"
    ],
    "latitude": 9.895,
    "longitude": -83.975
  },
  {
    "match_name": "Cerro La Asunción",
    "match_ordinal": 1,
    "name": "Cerro La Asunción",
    "description_es": "El Cerro La Asunción es una cima de alrededor de 3335 a 3396 metros sobre el nivel del mar junto a la Ruta 2 Interamericana Sur, en el km 89 del Cerro de la Muerte, muy cerca del Parque Nacional Los Quetzales. Se asciende por un sendero corto de unos 700 metros desde la orilla de la carretera, sin costo de ingreso, en un ambiente frío de páramo y bosque nuboso donde puede faltar el aire por la altura. Desde la cima hay vista panorámica de 360 grados de la cordillera, ideal para una parada breve, fotografías y aclimatación a la altura.",
    "description_en": "Cerro La Asuncion is a summit of around 3,335 to 3,396 meters above sea level beside the southern Inter-American Highway at km 89 on Cerro de la Muerte, very close to Los Quetzales National Park. It is climbed by a short trail of about 700 meters from the roadside, with no entrance fee, in a cold paramo and cloud-forest setting where the altitude can make breathing harder. From the top there is a 360-degree panoramic view of the range, ideal for a brief stop, photos and altitude acclimatization.",
    "categories": [
      "Miradores",
      "Montañas y Cerros",
      "Senderismo"
    ],
    "latitude": 9.5666667,
    "longitude": -83.7333333
  },
  {
    "match_name": "Cerro Ojo De Agua & Catarata La Maravilla",
    "match_ordinal": 1,
    "name": "Cerro Ojo De Agua & Catarata La Maravilla",
    "description_es": "El Cerro Ojo de Agua y la Catarata La Maravilla forman un entorno rural de lomas, nacientes y bosque en el cantón de Aserrí, al sur de San José. El recorrido combina un ascenso corto al cerro con miradores del valle y el descenso por sendero hacia la catarata y su poza de agua clara, apta para el baño según el caudal. Es una visita de medio día en finca privada con ingreso controlado, que requiere calzado de agarre por barro y pendiente.",
    "description_en": "Cerro Ojo de Agua and La Maravilla Waterfall form a rural setting of hills, springs and forest in Aserri canton, south of San Jose. The visit combines a short climb to the hill with valley viewpoints and a trail descent to the waterfall and its clear pool, suitable for swimming depending on flow. It is a half-day visit on private farmland with controlled entry, requiring grippy footwear for mud and slopes.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 9.752,
    "longitude": -84.138
  },
  {
    "match_name": "Cerro Pelado: Aventura de viento, vértigo y vistas lunares en Cañas 🌬️⛰️",
    "match_ordinal": 1,
    "name": "Cerro Pelado: viento y vistas lunares en Cañas",
    "description_es": "El Cerro Pelado es un volcán extinto y fuertemente erosionado de 680 metros sobre el nivel del mar, ubicado a unos 12 km al sureste de Cañas, Guanacaste, en la Cordillera de Guanacaste. Destaca por sus laderas despejadas y de tonos ocres que recuerdan un paisaje lunar, con fuerte viento en la cima y vista amplia de la llanura guanacasteca y la cadena volcánica. La visita se hace por senderos en propiedades privadas que suman unas 200 hectáreas, con senderos habilitados e instalaciones rústicas desde 2007, de dificultad moderada y sin sombra.",
    "description_en": "Cerro Pelado is an extinct and heavily eroded 680-meter volcano about 12 km southeast of Canas, Guanacaste, in the Guanacaste Range. It stands out for its bare ochre slopes resembling a lunar landscape, with strong wind at the top and broad views of the Guanacaste plains and volcanic chain. The visit follows trails on private properties totaling about 200 hectares, with maintained paths and rustic facilities since 2007, of moderate difficulty and with no shade.",
    "categories": [
      "Montañas y Cerros",
      "Miradores",
      "Senderismo"
    ],
    "latitude": 10.381,
    "longitude": -85.007
  },
  {
    "match_name": "Cerro Tinajitas – ¡Vistas de otro planeta en San Ramón! 🌄",
    "match_ordinal": 1,
    "name": "Cerro Tinajitas, San Ramón",
    "description_es": "En la zona montañosa del cantón de San Ramón, Alajuela, los cerros y lomas rurales como el sector conocido como Tinajitas se recorren entre cafetales, potreros y parches de bosque premontano. Son rutas de caminata y miradores locales con vistas del valle, la llanura y, en días despejados, el Golfo de Nicoya y la cadena volcánica, sin infraestructura turística consolidada. Las visitas se coordinan con fincas y guías locales por caminos de lastre que pueden estar lodosos en época lluviosa.",
    "description_en": "In the mountain zone of San Ramon canton, Alajuela, rural hills and ridges such as the area known as Tinajitas are walked through coffee fields, pastures and premontane forest patches. They are hiking routes and local viewpoints with views of the valley, lowlands and, on clear days, the Gulf of Nicoya and the volcanic chain, without consolidated tourism infrastructure. Visits are arranged with farms and local guides via gravel roads that can be muddy in the rainy season.",
    "categories": [
      "Montañas y Cerros",
      "Miradores",
      "Senderismo"
    ],
    "latitude": 10.011,
    "longitude": -85.504
  },
  {
    "match_name": "Cerro Tortuguero",
    "match_ordinal": 1,
    "name": "Cerro Tortuguero",
    "description_es": "El Cerro Tortuguero, también descrito como Volcán Tortuguero, es un cono piroclástico extinto de 119 metros sobre el nivel del mar ubicado unos 5,5 km al noroeste del pueblo de Tortuguero, dentro del Parque Nacional Tortuguero. Uno de sus flancos fue intervenido durante la construcción de los canales, y en el pasado se permitió el ascenso a la cima con vista de los canales, la llanura caribeña y el bosque húmedo. Actualmente se aprecia desde las zonas turísticas del pueblo y el acceso a la cima está regulado por la administración del parque.",
    "description_en": "Cerro Tortuguero, also described as Tortuguero Volcano, is an extinct 119-meter pyroclastic cone about 5.5 km northwest of Tortuguero village inside Tortuguero National Park. One flank was altered during construction of the canals, and in the past climbing to the summit was allowed for views of the canals, Caribbean plains and wet forest. It is now seen from the tourist areas of the village and summit access is regulated by park authorities.",
    "categories": [
      "Parques Nacionales",
      "Montañas y Cerros",
      "Miradores"
    ],
    "latitude": 10.5839603,
    "longitude": -83.5274727
  },
  {
    "match_name": "Cerro Utyum - Buenos Aires",
    "match_ordinal": 1,
    "name": "Cerro Utyum (Buenos Aires)",
    "description_es": "El Cerro Utyum es una montaña boscosa en el cantón de Buenos Aires, Puntarenas, en las estribaciones de la Cordillera de Talamanca cercanas a territorios indígenas y áreas de bosque premontano y nuboso. Es un entorno remoto de alta biodiversidad, con ríos claros, aves y mamíferos de montaña, al que se accede por caminos rurales y senderos con guía local. Por su aislamiento es una expedición exigente que requiere planificación, equipo adecuado y respeto a las comunidades y zonas protegidas vecinas.",
    "description_en": "Cerro Utyum is a forested mountain in Buenos Aires canton, Puntarenas, in the foothills of the Talamanca Range near Indigenous territories and premontane and cloud-forest areas. It is a remote setting of high biodiversity, with clear rivers, birds and mountain mammals, reached by rural roads and trails with a local guide. Due to its isolation it is a demanding expedition requiring planning, proper gear and respect for neighboring communities and protected areas.",
    "categories": [
      "Montañas y Cerros",
      "Senderismo"
    ],
    "latitude": 9.1672952,
    "longitude": -83.3308421
  },
  {
    "match_name": "Cerro Yarcazú – Puriscal 🌿⛰️",
    "match_ordinal": 1,
    "name": "Cerro Yarcazú – Puriscal",
    "description_es": "El Cerro Yarcazú es una loma rural en el cantón de Puriscal, San José, entre potreros, cafetales y fragmentos de bosque premontano del Pacífico Central. Se recorre por calles de lastre y senderos cortos con miradores hacia los valles y filas montañosas cercanas, en un ambiente tranquilo de fincas. Es una caminata local de baja a moderada dificultad, sin servicios turísticos formales y con coordinación en las comunidades vecinas.",
    "description_en": "Cerro Yarcazu is a rural hill in Puriscal canton, San Jose, among pastures, coffee fields and premontane forest fragments of the Central Pacific region. It is walked by gravel roads and short trails with viewpoints over nearby valleys and mountain ridges, in a quiet farm setting. It is a local easy to moderate hike with no formal tourism services and arrangement in neighboring communities.",
    "categories": [
      "Montañas y Cerros",
      "Senderismo",
      "Miradores"
    ],
    "latitude": 9.682,
    "longitude": -84.631
  },
  {
    "match_name": "Ciudad Esmeralda",
    "match_ordinal": 1,
    "name": "Ciudad Esmeralda",
    "description_es": "Ciudad Esmeralda es una zona de humedal y bosque húmedo tropical en el sector de Boca Tapada de San Carlos, Alajuela, en las llanuras del norte cercanas al Refugio Caño Negro y al Río San Carlos. El entorno combina canales, lagunas y bosque con alta presencia de aves acuáticas, monos, perezosos y caimanes, que se observan en recorridos en bote y caminatas cortas. Es un destino de naturaleza tranquila con hospedaje rural y tours locales, accesible por carretera con último tramo de lastre.",
    "description_en": "Ciudad Esmeralda is a wetland and tropical wet-forest area in Boca Tapada, San Carlos, Alajuela, on the northern plains near Cano Negro Refuge and the San Carlos River. The setting combines channels, lagoons and forest with abundant waterbirds, monkeys, sloths and caimans seen on boat trips and short walks. It is a quiet nature destination with rural lodging and local tours, reached by road with a final gravel section.",
    "categories": [
      "Islas y Manglares",
      "Reservas Silvestres",
      "Senderismo"
    ],
    "latitude": 10.2732727936082,
    "longitude": -84.4357294134919
  },
  {
    "match_name": "Copey Estate Winery - San José",
    "match_ordinal": 1,
    "name": "Copey Estate Winery - San José",
    "description_es": "Copey Estate Winery es un viñedo de altura en Copey de Dota, en la zona de Los Santos, a más de 2000 metros sobre el nivel del mar entre bosque nuboso y fincas cafetaleras. Es uno de los proyectos pioneros de vino tropical de altura en Costa Rica, con visitas guiadas al viñedo, explicación del cultivo de uva en trópico y degustación de vinos. La visita se combina con el paisaje frío y brumoso de la montaña, y requiere reserva previa por acceso rural.",
    "description_en": "Copey Estate Winery is a high-altitude vineyard in Copey de Dota in the Los Santos zone, over 2,000 meters above sea level among cloud forest and coffee farms. It is one of the pioneering tropical highland wine projects in Costa Rica, with guided vineyard visits, explanation of grape growing in the tropics and wine tasting. The visit is set in a cool, misty mountain landscape and requires advance booking due to rural access.",
    "categories": [
      "Experiencia Gastronómica",
      "Miradores",
      "Agroturismo"
    ],
    "latitude": 9.62859085943718,
    "longitude": -83.9132095926017
  },
  {
    "match_name": "Cráter La Olla y Cerro Pasqui",
    "match_ordinal": 1,
    "name": "Cráter La Olla y Cerro Pasqui",
    "description_es": "El Cráter La Olla y el Cerro Pasqui son estructuras volcánicas secundarias ubicadas entre los macizos del Irazú y el Turrialba, en Cartago, entre potreros de altura y bosque. La zona ofrece caminatas rurales con vista a ambos volcanes, lagunas estacionales y depresiones crateriformes cubiertas de vegetación, en un ambiente frío y ventoso. El acceso es por caminos de finca con guía local y no cuenta con servicios de parque nacional.",
    "description_en": "La Olla Crater and Cerro Pasqui are secondary volcanic structures between the Irazu and Turrialba massifs in Cartago, among high pastures and forest. The area offers rural hikes with views of both volcanoes, seasonal ponds and vegetated crater depressions in a cold, windy setting. Access is by farm roads with a local guide and there are no national park services.",
    "categories": [
      "Volcanes",
      "Senderismo",
      "Miradores"
    ],
    "latitude": 9.93398,
    "longitude": -83.854759
  },
  {
    "match_name": "Cruce Golfo Dulce en Kayak 🌊🐬 – Aventura salvaje en el paraíso más azul de Costa Rica",
    "match_ordinal": 1,
    "name": "Cruce Golfo Dulce en Kayak",
    "description_es": "La travesía en kayak recorre el Golfo Dulce, en el Pacífico sur entre la Península de Osa y el continente, un golfo tropical de unos 55 km de largo y 15 km de ancho frente a Rincón, Puerto Jiménez y Golfito. El perímetro está bordeado por bosque protegido de la Reserva Forestal Golfo Dulce y los parques Piedras Blancas y Corcovado, con avistamiento de delfines, tortugas, aves marino-costeras y ballenas jorobadas en temporada. Es una expedición guiada de remo en aguas generalmente calmas que exige chaleco, guía, planificación de mareas y bajo impacto ambiental.",
    "description_en": "The kayak crossing runs through Golfo Dulce in the South Pacific between the Osa Peninsula and the mainland, a tropical gulf about 55 km long and 15 km wide off Rincon, Puerto Jimenez and Golfito. Its shoreline is bordered by protected forest in the Golfo Dulce Forest Reserve and Piedras Blancas and Corcovado parks, with sightings of dolphins, turtles, coastal seabirds and seasonal humpback whales. It is a guided paddling expedition in generally calm waters requiring life jackets, a guide, tide planning and low-impact practices.",
    "categories": [
      "Aventura y Deportes",
      "Islas y Manglares"
    ],
    "latitude": 8.6040618,
    "longitude": -83.1133792
  },
  {
    "match_name": "Cruz de Alajuelita & Cerro Cedral – Un amanecer épico en las montañas de Escazú 🌄🥾🔥",
    "match_ordinal": 1,
    "name": "Cruz de Alajuelita & Cerro Cedral – amanecer Escazú",
    "description_es": "La Cruz de Alajuelita y el Cerro Cedral forman parte de la Zona Protectora Cerros de Escazú, en el límite entre Alajuelita, Escazú y Santa Ana, con el monumento de la cruz como mirador histórico del Valle Central. El ascenso al Cedral es una caminata de montaña de exigencia moderada a alta por bosque nuboso y potreros, muy frecuentada al amanecer por la vista del valle, el Golfo de Nicoya a lo lejos y los volcanes en días despejados. El acceso es por rutas empinadas sin servicios formales, por lo que se recomienda guía, salida temprana y buena condición física.",
    "description_en": "Cruz de Alajuelita and Cerro Cedral are part of the Cerros de Escazu Protected Zone on the border of Alajuelita, Escazu and Santa Ana, with the cross monument as a historic Central Valley viewpoint. The climb to Cedral is a moderate to strenuous mountain hike through cloud forest and pasture, popular at sunrise for views of the valley, the distant Gulf of Nicoya and volcanoes on clear days. Access is by steep routes with no formal services, so a guide, early start and good fitness are advised.",
    "categories": [
      "Miradores",
      "Senderismo",
      "Montañas y Cerros"
    ],
    "latitude": 9.893,
    "longitude": -84.121
  },
  {
    "match_name": "Depósito Libre Comercial de Golfito",
    "match_ordinal": 1,
    "name": "Depósito Libre Comercial de Golfito",
    "description_es": "El Depósito Libre Comercial de Golfito es un centro de compras libres de impuestos frente a la Bahía de Golfito, en Puntarenas, creado para la reactivación económica del Pacífico sur. La visita combina compras de electrodomésticos y artículos variados con el entorno marino del Golfo Dulce, manglares cercanos, paseos en bote y playas vecinas. Funciona con tarjeta de compra y control de montos, y es base para extender el viaje hacia Piedras Blancas y la Península de Osa.",
    "description_en": "The Golfito Duty-Free Commercial Depot is a tax-free shopping center on Golfito Bay in Puntarenas, created for the economic recovery of the South Pacific. A visit combines shopping for appliances and general goods with the marine setting of Golfo Dulce, nearby mangroves, boat trips and neighboring beaches. It operates with a shopping card and purchase limits, and serves as a base to extend travel toward Piedras Blancas and the Osa Peninsula.",
    "categories": [
      "Cultura e Historia",
      "Islas y Manglares",
      "Playas"
    ],
    "latitude": 8.6475548,
    "longitude": -83.1786244
  },
  {
    "match_name": "Dos Novillos – Limón: aventura en la selva hasta una catarata de 40 metros 🌿",
    "match_ordinal": 1,
    "name": "Dos Novillos – Limón aventura selva catarata 40m",
    "description_es": "Dos Novillos es un sector de selva caribeña en el cantón de Guácimo, Limón, recorrido por el Río Dos Novillos entre bosque húmedo primario y fincas. Su atractivo principal es una catarata de alrededor de 40 metros con poza al pie, a la que se llega por sendero y tramos de río con rocas resbaladizas, en visitas guiadas de aventura con caminata, nado y rappel según el operador. Es un entorno lluvioso y caudaloso donde el acceso depende del clima y se exige guía, equipo y precaución ante crecidas.",
    "description_en": "Dos Novillos is a Caribbean rainforest sector in Guacimo canton, Limon, crossed by the Dos Novillos River through primary wet forest and farms. Its main attraction is a waterfall of about 40 meters with a pool at its base, reached by trail and river sections with slippery rocks on guided adventure visits with hiking, swimming and rappelling depending on the operator. It is a rainy, high-flow setting where access depends on weather and requires a guide, equipment and caution for flash floods.",
    "categories": [
      "Cataratas",
      "Aventura y Deportes",
      "Senderismo"
    ],
    "latitude": 10.104,
    "longitude": -83.655
  },
  {
    "match_name": "ECOCHONTALES - PÉREZ ZELEDÓN",
    "match_ordinal": 1,
    "name": "ECOCHONTALES - PÉREZ ZELEDÓN",
    "description_es": "Ecochontales es un proyecto rural de naturaleza en la zona de Barú, Pérez Zeledón, entre bosque secundario, tacotales y quebradas de la fila costera. Ofrece senderos cortos hacia cataratas y pozas naturales de agua clara para el baño, con miradores del valle y avistamiento de aves y mariposas. Es una visita de día en finca privada con ingreso controlado, de dificultad fácil a moderada y caminos que se vuelven resbaladizos con lluvia.",
    "description_en": "Ecochontales is a rural nature project in the Baru area of Perez Zeledon, among secondary forest, regrowth and streams of the coastal range. It offers short trails to waterfalls and clear natural pools for swimming, with valley viewpoints and bird and butterfly watching. It is a day visit on a private farm with controlled entry, of easy to moderate difficulty, with paths that turn slippery in rain.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 9.352,
    "longitude": -83.844
  },
  {
    "match_name": "El Bus Místico - Heredia",
    "match_ordinal": 1,
    "name": "El Bus Místico - Heredia",
    "description_es": "El Bus Místico es un autobús acondicionado como mirador y punto fotográfico en las montañas de Heredia, con vista hacia el Valle Central y los cerros cercanos. La visita es breve y de acceso fácil, con espacios para fotografías, bebidas calientes y bocadillos según la temporada, en un ambiente decorado de estilo alternativo. Funciona como parada de medio día con parqueo cercano y coordinación de horarios con los gestores.",
    "description_en": "El Bus Mistico is a bus converted into a viewpoint and photo spot in the Heredia mountains, with views over the Central Valley and nearby hills. The visit is brief and easily accessed, with photo areas, hot drinks and snacks depending on the season, in an alternatively styled setting. It works as a half-day stop with nearby parking and schedule coordination with the managers.",
    "categories": [
      "Miradores",
      "Experiencia Gastronómica"
    ],
    "latitude": 10.087,
    "longitude": -84.079
  },
  {
    "match_name": "El Caballón y El Morrón - Sarapiquí",
    "match_ordinal": 1,
    "name": "El Caballón y El Morrón - Sarapiquí",
    "description_es": "El Caballón y El Morrón son dos cerros gemelos de bosque húmedo caribeño en el cantón de Sarapiquí, Heredia, entre fincas y bosque secundario de las llanuras del norte. Se ascienden por senderos rurales con pendientes moderadas hasta miradores con vista de la llanura, los ríos cercanos y la Cordillera Volcánica Central a lo lejos. Son caminatas locales guiadas, sin infraestructura formal, en zona caliente y lluviosa donde se recomienda calzado de agarre e hidratación.",
    "description_en": "El Caballon and El Morron are twin Caribbean wet-forest hills in Sarapiqui canton, Heredia, among farms and secondary forest of the northern plains. They are climbed by rural trails with moderate slopes to viewpoints over the plains, nearby rivers and the distant Central Volcanic Range. They are local guided hikes with no formal infrastructure, in a hot and rainy area where grippy footwear and hydration are advised.",
    "categories": [
      "Montañas y Cerros",
      "Senderismo",
      "Miradores"
    ],
    "latitude": 10.316967,
    "longitude": -83.9929944
  },
  {
    "match_name": "El Iral Bosque Nuboso",
    "match_ordinal": 1,
    "name": "El Iral Bosque Nuboso",
    "description_es": "El Iral es una reserva privada de bosque nuboso en las montañas de Coronado, San José, en la zona de amortiguamiento del Parque Nacional Braulio Carrillo. Protege bosque maduro con robles, musgos y epífitas, con senderos señalizados, puentes y miradores para la observación de quetzales, colibríes y otras aves de altura. Opera con reserva previa e ingreso controlado, en un ambiente frío, húmedo y de neblina frecuente.",
    "description_en": "El Iral is a private cloud-forest reserve in the Coronado mountains, San Jose, in the buffer zone of Braulio Carrillo National Park. It protects mature forest with oaks, mosses and epiphytes, with marked trails, bridges and viewpoints for watching quetzals, hummingbirds and other highland birds. It operates by prior reservation with controlled entry in a cold, humid setting with frequent mist.",
    "categories": [
      "Reservas Silvestres",
      "Senderismo"
    ],
    "latitude": 9.995778,
    "longitude": -83.923981
  },
  {
    "match_name": "EL POCERÓN PROVIDENCIA DOTA",
    "match_ordinal": 1,
    "name": "EL POCERÓN PROVIDENCIA DOTA",
    "description_es": "El Pocerón es una poza de montaña en Providencia de Dota, San José, formada por una quebrada clara de la zona de Los Santos entre bosque y cafetales de altura. Es un balneario rural de agua fría con áreas para picnic y descanso, de acceso corto y dificultad fácil, muy frecuentado para el baño en días soleados. La visita es de día con ingreso controlado en propiedad privada y precaución por piedras resbaladizas y cambios de caudal.",
    "description_en": "El Poceron is a mountain pool in Providencia de Dota, San Jose, formed by a clear stream in the Los Santos zone among forest and highland coffee fields. It is a rural cold-water swimming spot with picnic and rest areas, with short easy access, popular for bathing on sunny days. It is a day visit with controlled entry on private property and caution for slippery rocks and changing flows.",
    "categories": [
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 9.686,
    "longitude": -83.936
  },
  {
    "match_name": "El Puerto - Puntarenas",
    "match_ordinal": 1,
    "name": "El Puerto - Puntarenas",
    "description_es": "El Puerto es un sector costero y pesquero en la zona de Jicaral e Isla Chira, en el Golfo de Nicoya, Puntarenas, entre manglares, esteros y playas de arena oscura. La actividad gira en torno a la pesca artesanal, los recorridos en bote por el golfo y la observación de aves acuáticas y atardeceres. Es un entorno rural con servicios básicos, ideal como punto de salida hacia islas e isletas del golfo.",
    "description_en": "El Puerto is a coastal fishing sector in the Jicaral and Chira Island area in the Gulf of Nicoya, Puntarenas, among mangroves, estuaries and dark-sand beaches. Activity centers on artisanal fishing, boat trips around the gulf and watching waterbirds and sunsets. It is a rural setting with basic services, ideal as a departure point to islands and islets in the gulf.",
    "categories": [
      "Islas y Manglares",
      "Playas"
    ],
    "latitude": 9.2169531,
    "longitude": -83.336188
  },
  {
    "match_name": "Escalada Cachí - Cartago",
    "match_ordinal": 1,
    "name": "Escalada Cachí - Cartago",
    "description_es": "La zona de escalada de Cachí es una pared rocosa de unos 60 metros en el Valle de Orosi, Paraíso de Cartago, cercana al embalse de Cachí y al Río Reventazón. Cuenta con rutas equipadas de escalada deportiva de distintos niveles que se practican con guía, equipo certificado y reserva previa. Desde la base y los relevos hay vista del valle, el lago y las montañas verdes de Orosi, en un ambiente cálido y húmedo.",
    "description_en": "The Cachi climbing area is a rock wall of about 60 meters in the Orosi Valley, Paraiso de Cartago, near Lake Cachi and the Reventazon River. It has equipped sport-climbing routes of different levels practiced with a guide, certified gear and prior booking. From the base and belays there are views of the valley, lake and green Orosi mountains in a warm, humid setting.",
    "categories": [
      "Aventura y Deportes",
      "Montañas y Cerros"
    ],
    "latitude": 9.825635,
    "longitude": -83.8022149
  },
  {
    "match_name": "Escape Poasito",
    "match_ordinal": 1,
    "name": "Escape Poasito",
    "description_es": "Escape Poasito es un hospedaje y mirador rural en Poasito de Alajuela, en las faldas del Volcán Poás entre cafetales y bosque nuboso. Ofrece cabañas y áreas de descanso con vista hacia el valle y las montañas cercanas, jardines, senderos cortos y ambiente frío de montaña. Funciona con reserva previa como escapada cercana a la ciudad para parejas y familias.",
    "description_en": "Escape Poasito is a rural lodging and viewpoint in Poasito, Alajuela, on the slopes of Poas Volcano among coffee fields and cloud forest. It offers cabins and rest areas with views over the valley and nearby mountains, gardens, short trails and a cool mountain atmosphere. It operates by advance booking as a nearby getaway for couples and families.",
    "categories": [
      "Hospedaje en la Naturaleza",
      "Miradores"
    ],
    "latitude": 10.167224,
    "longitude": -84.184391
  },
  {
    "match_name": "Espino Blanco - Turrialba",
    "match_ordinal": 1,
    "name": "Espino Blanco - Turrialba",
    "description_es": "Espino Blanco es un sector rural en el cantón de Turrialba, Cartago, entre fincas ganaderas, cañales y parches de bosque húmedo del Caribe. Se recorre por caminos de lastre y senderos cortos con vistas hacia el Volcán Turrialba y los valles cercanos, con ambiente tranquilo y ganadero. Es una visita local de dificultad fácil, sin servicios turísticos formales y con coordinación en las comunidades vecinas.",
    "description_en": "Espino Blanco is a rural sector in Turrialba canton, Cartago, among cattle farms, sugarcane and Caribbean wet-forest patches. It is walked by gravel roads and short trails with views toward Turrialba Volcano and nearby valleys, in a quiet farming setting. It is a local easy visit with no formal tourism services and arrangement in neighboring communities.",
    "categories": [
      "Senderismo",
      "Miradores"
    ],
    "latitude": 9.9067054,
    "longitude": -83.6800512
  },
  {
    "match_name": "Estación Biológica La Selva - Sarapiquí",
    "match_ordinal": 1,
    "name": "Estación Biológica La Selva - Sarapiquí",
    "description_es": "La Estación Biológica La Selva es una estación de investigación tropical de la Organización para Estudios Tropicales en Puerto Viejo de Sarapiquí, Heredia, a 37 metros de altura entre los ríos Puerto Viejo y Sarapiquí. Protege unas 1600 hectáreas de bosque húmedo primario y en regeneración, unidas por un corredor biológico al Parque Nacional Braulio Carrillo, y es uno de los sitios más estudiados del trópico con almendros, gavilanes, zaínos, guatusas y lapas verdes. Dispone de habitaciones, comedor y una amplia red de senderos para investigadores y visitantes con reserva y acompañamiento.",
    "description_en": "La Selva Biological Station is a tropical research station of the Organization for Tropical Studies in Puerto Viejo de Sarapiqui, Heredia, at 37 meters of elevation between the Puerto Viejo and Sarapiqui rivers. It protects about 1,600 hectares of primary and regenerating wet forest, linked by a biological corridor to Braulio Carrillo National Park, and is one of the most studied tropical sites with almendro trees, gavilan, peccaries, agoutis and great green macaws. It offers rooms, dining and an extensive trail network for researchers and visitors by reservation with guidance.",
    "categories": [
      "Reservas Silvestres",
      "Senderismo",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.4232682,
    "longitude": -84.0220298
  },
  {
    "match_name": "Estación Biológica Las Cruces - San Vito",
    "match_ordinal": 1,
    "name": "Estación Biológica Las Cruces - San Vito",
    "description_es": "La Estación Biológica Las Cruces es una estación de la Organización para Estudios Tropicales en San Vito de Coto Brus, Puntarenas, que incluye el Jardín Botánico Wilson con colecciones de plantas tropicales. Protege bosque premontano muy húmedo con alta diversidad de aves, mamíferos e insectos, además de senderos, laboratorios y hospedaje para investigación y educación ambiental. Las visitas guiadas combinan el jardín, los senderos y la observación de naturaleza en un clima fresco de montaña del sur.",
    "description_en": "Las Cruces Biological Station is an Organization for Tropical Studies station in San Vito, Coto Brus, Puntarenas, including the Wilson Botanical Garden with tropical plant collections. It protects very humid premontane forest with high diversity of birds, mammals and insects, plus trails, laboratories and lodging for research and environmental education. Guided visits combine the garden, trails and nature watching in a cool southern mountain climate.",
    "categories": [
      "Reservas Silvestres",
      "Senderismo",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 8.7853325,
    "longitude": -82.9592657
  },
  {
    "match_name": "Extreme Forest Park Providencia de Dota",
    "match_ordinal": 1,
    "name": "Extreme Forest Park Providencia de Dota",
    "description_es": "Extreme Forest Park en Providencia de Dota, en la zona de Los Santos, es un parque comunitario de aventura en bosque de altura con un circuito de escalada interior a un higuerón, rappel de 50 y 25 metros, puente de mono, cuerdas flojas, canopy, columpio Tarzán y vuelo selvático, además de sendero autoguiado en el bosque y visita a dos cataratas cercanas, con almuerzo en restaurante ecológico incluido.",
    "description_en": "Extreme Forest Park in Providencia de Dota, in the Los Santos area, is a community adventure park in highland forest with an inside strangler-fig climb, 50 and 25 meter rappels, monkey bridge, slacklines, canopy, Tarzan swing and jungle flight, plus a self-guided forest trail and visits to two nearby waterfalls, with lunch at an ecological restaurant included.",
    "categories": [
      "Aventura y Deportes",
      "Senderismo"
    ],
    "latitude": 9.607497,
    "longitude": -84.443024
  },
  {
    "match_name": "Finca 6 Maravillas - San José",
    "match_ordinal": 1,
    "name": "Finca 6 Maravillas - San José",
    "description_es": "Finca 6 Maravillas en las montañas de Puriscal, con acceso por Piedades, es una finca con un recorrido total cercano a 10 km que enlaza el puente de piedra, la Cruz de Guatuso con vista amplia al valle, el Piedrón, la Cueva del Tigre, la catarata para baño y las pozas El Jabillo, entre potreros, bosque y río, de dificultad alta y para caminata de día completo.",
    "description_en": "Finca 6 Maravillas in the Puriscal mountains, accessed via Piedades, is a farm with a total route of nearly 10 km linking the stone bridge, the Guatuso Cross with broad valley views, the Big Rock, the Tiger Cave, the swimming waterfall and the El Jabillo pools, through pasture, forest and river, with high difficulty for a full-day hike.",
    "categories": [
      "Senderismo",
      "Miradores",
      "Cataratas"
    ],
    "latitude": 9.84843308331072,
    "longitude": -84.3699628650028
  },
  {
    "match_name": "Finca Bellavista – ¡Dormí en una casa del árbol en medio de la selva! 🌳🏡🌿",
    "match_ordinal": 1,
    "name": "Finca Bellavista, casa del árbol en la selva",
    "description_es": "Finca Bellavista en La Florida de Piedras Blancas, entre Golfito y la Península de Osa, es una comunidad sostenible fuera de la red con casas del árbol en bosque lluvioso, con red de senderos peatonales, río Bellavista para baño, canopy para moverse entre casas, jardines y observación de aves, tucanes, perezosos y fauna tropical, con hospedaje en casas del árbol y áreas comunes.",
    "description_en": "Finca Bellavista in La Florida de Piedras Blancas, between Golfito and the Osa Peninsula, is an off-grid sustainable community with treehouses in rainforest, featuring a network of walking trails, the Bellavista River for swimming, canopy lines between houses, gardens and bird, toucan, sloth and tropical wildlife watching, with treehouse lodging and common areas.",
    "categories": [
      "Hospedaje en la Naturaleza",
      "Reservas Silvestres",
      "Senderismo"
    ],
    "latitude": 8.771,
    "longitude": -83.222
  },
  {
    "match_name": "Finca del ICE: Sendero natural cerca de San José",
    "match_ordinal": 1,
    "name": "Finca del ICE: Sendero natural cerca de San José",
    "description_es": "La Finca del ICE en La Unión, Cartago, en el entorno de la Planta Hidroeléctrica María del Rosario, es un área verde extensa con senderos señalizados entre vegetación secundaria, quebradas y tomas de agua, frecuentada para caminata y ciclismo de montaña, cercana a Tres Ríos y Rancho Redondo, para visita de medio día sin servicios comerciales permanentes.",
    "description_en": "Finca del ICE in La Union, Cartago, around the Maria del Rosario Hydroelectric Plant, is a large green area with marked trails through secondary vegetation, streams and water intakes, popular for hiking and mountain biking, close to Tres Rios and Rancho Redondo, for a half-day visit with no permanent commercial services.",
    "categories": [
      "Senderismo",
      "Reservas Silvestres"
    ],
    "latitude": 9.939,
    "longitude": -83.975
  },
  {
    "match_name": "Finca Don Pachi",
    "match_ordinal": 1,
    "name": "Finca Don Pachi",
    "description_es": "Finca Don Pachi en las montañas de Patarrá, Desamparados, a unos 20 minutos de San José, es una finca de día familiar con amplias áreas verdes, vista a la ciudad y a montañas, sendero circular de alrededor de 1,5 km de dificultad fácil, juegos gigantes, zonas de picnic y servicio de desayunos y almuerzos los fines de semana, apta para mascotas con reserva previa.",
    "description_en": "Finca Don Pachi in the Patarrá mountains, Desamparados, about 20 minutes from San Jose, is a family day farm with large green areas, city and mountain views, an easy circular trail of about 1.5 km, giant games, picnic areas and breakfast and lunch service on weekends, pet friendly with prior reservation.",
    "categories": [
      "Experiencia Gastronómica",
      "Senderismo",
      "Agroturismo"
    ],
    "latitude": 9.8852915,
    "longitude": -84.0299601
  },
  {
    "match_name": "Finca Dos Ríos",
    "match_ordinal": 1,
    "name": "Finca Dos Ríos",
    "description_es": "Finca Dos Ríos en Bajos del Toro, Sarchí, es una propiedad con senderos entre bosque primario y potreros que enlazan la poza El Tobogán de tono celeste, la Cascada Las Pilas, la poza El Colibrí, las cascadas Dos Colores por la unión de quebradas, La Caverna con cortina de agua y la Cascada Amarilla por minerales, con caminata total de 4 a 7 km de dificultad moderada, pozas para baño, sodita y camping.",
    "description_en": "Finca Dos Rios in Bajos del Toro, Sarchi, is a property with trails through primary forest and pasture linking the light-blue El Tobogan pool, Las Pilas Waterfall, El Colibri pool, the Dos Colores falls at the meeting of streams, La Caverna with a water curtain and the mineral-tinted Yellow Waterfall, with a total 4 to 7 km moderate hike, swimming pools, a small restaurant and camping.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 10.245539,
    "longitude": -84.276283
  },
  {
    "match_name": "Finca La Alemana",
    "match_ordinal": 1,
    "name": "Finca La Alemana",
    "description_es": "Finca La Alemana en Guápiles, Pococí, es una finca en selva caribeña con un sendero de unos 5,5 km de dificultad moderada que baja por jardines y gradas hasta un mirador y una catarata mediana de agua cristalina y fría con poza y piedras planas para picnic, además de una poza mayor con cascada río arriba, con parqueo y camping.",
    "description_en": "Finca La Alemana in Guapiles, Pococi, is a farm in Caribbean jungle with a roughly 5.5 km moderate trail descending through gardens and steps to a viewpoint and a medium clear cold waterfall with a pool and flat rocks for picnics, plus a larger upstream pool with a cascade, with parking and camping.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 10.16525,
    "longitude": -83.885572
  },
  {
    "match_name": "Finca La Cayetana",
    "match_ordinal": 1,
    "name": "Finca La Cayetana",
    "description_es": "Finca La Cayetana en lo alto de los Cerros de La Carpintera, entre Patarrá y Coris de Cartago, es una finca con unos 5 km de senderos fáciles y bien marcados bajo sombra entre varios tipos de vegetación, con mirador hacia San José y los Cerros de Escazú, circuito rústico de obstáculos, mariposario de madera, casitas de duendes, túnel de árboles y puerta fotogénica del bosque encantado entre pinos.",
    "description_en": "Finca La Cayetana atop the La Carpintera hills, between Patarrá and Coris de Cartago, is a farm with about 5 km of easy well-marked shaded trails through varied vegetation, with a viewpoint over San Jose and the Escazu hills, a rustic obstacle circuit, wooden butterfly garden, gnome houses, tree tunnel and a photogenic enchanted-forest door among pines.",
    "categories": [
      "Senderismo",
      "Miradores"
    ],
    "latitude": 9.869015,
    "longitude": -84.004725
  },
  {
    "match_name": "Finca La Colasa",
    "match_ordinal": 1,
    "name": "Finca La Colasa",
    "description_es": "Finca La Colasa en Sacramento de Barva, Heredia, es una explanada de zacate en montaña fría con vista abierta a la ciudad para atardeceres, con un sendero corto de alrededor de 1 km que baja a bosque y potreros dorados con árboles dispersos, ambiente para picnic, fotografía y vuelo de cometa, con baño, parqueo, aceptación de mascotas y opción de camping con reserva.",
    "description_en": "Finca La Colasa in Sacramento de Barva, Heredia, is a grassy mountain clearing in cool highlands with open city views for sunsets, with a short trail of about 1 km descending to forest and golden pastures with scattered trees, ideal for picnics, photography and kite flying, with restroom, parking, pets allowed and camping by reservation.",
    "categories": [
      "Miradores",
      "Senderismo",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.099247,
    "longitude": -84.120233
  },
  {
    "match_name": "Finca La Lucha",
    "match_ordinal": 1,
    "name": "Finca La Lucha",
    "description_es": "Finca La Lucha en San Cristóbal Sur, en las alturas entre San José y Cartago, es una propiedad rural en entorno de bosque nuboso y cafetales con senderos para caminata de montaña, ambiente fresco y húmedo con nacientes y vegetación densa, para visita de día con picnic y observación de aves y naturaleza.",
    "description_en": "Finca La Lucha in San Cristobal Sur, in the highlands between San Jose and Cartago, is a rural property amid cloud forest and coffee fields with mountain hiking trails, a cool humid setting with springs and dense vegetation, for day visits with picnics and bird and nature watching.",
    "categories": [
      "Senderismo",
      "Montañas y Cerros"
    ],
    "latitude": 9.7177259,
    "longitude": -83.9844147
  },
  {
    "match_name": "Finca Libertad Pura - San Ramón",
    "match_ordinal": 1,
    "name": "Finca Libertad Pura - San Ramón",
    "description_es": "Finca Libertad Pura en San Ramón, Alajuela, es una propiedad rural en zona montañosa con áreas de potrero y bosque, senderos para caminata y espacios abiertos para descanso y picnic, en entorno de campiña con vistas a montañas cercanas, para escapada de día cercana a la ciudad.",
    "description_en": "Finca Libertad Pura in San Ramon, Alajuela, is a rural property in mountainous countryside with pasture and forest areas, hiking trails and open spaces for rest and picnics, in farmland surroundings with nearby mountain views, for a nearby day getaway.",
    "categories": [
      "Senderismo",
      "Montañas y Cerros"
    ],
    "latitude": 10.091,
    "longitude": -84.533
  },
  {
    "match_name": "Finca Los Rodríguez - Grecia",
    "match_ordinal": 1,
    "name": "Finca Los Rodríguez - Grecia",
    "description_es": "Finca Los Rodríguez en Grecia, Alajuela, es una finca agropecuaria en zona de cafetales y lechería con áreas verdes, senderos cortos y espacios para actividades familiares y degustación rural, en campiña con vistas al Valle Central, para visita de medio día.",
    "description_en": "Finca Los Rodriguez in Grecia, Alajuela, is a working farm in coffee and dairy country with green areas, short trails and spaces for family activities and rural tasting, in countryside with Central Valley views, for a half-day visit.",
    "categories": [
      "Experiencia Gastronómica",
      "Senderismo",
      "Agroturismo"
    ],
    "latitude": 10.0739464,
    "longitude": -84.3147572
  },
  {
    "match_name": "Finca Los Vientos - Santa Ana",
    "match_ordinal": 1,
    "name": "Finca Los Vientos - Santa Ana",
    "description_es": "Finca Los Vientos en Santa Ana, San José, es una propiedad rural en laderas de los Cerros de Escazú con senderos y miradores naturales hacia el valle y las montañas, vegetación de bosque secundario y ambiente fresco y ventoso, para caminata corta y picnic.",
    "description_en": "Finca Los Vientos in Santa Ana, San Jose, is a rural property on the slopes of the Escazu hills with trails and natural viewpoints over the valley and mountains, secondary forest vegetation and a cool breezy setting, for short hikes and picnics.",
    "categories": [
      "Senderismo",
      "Miradores"
    ],
    "latitude": 9.74424628482136,
    "longitude": -83.9258325683341
  },
  {
    "match_name": "FINCA POZA GUÁCIMO - Pococí",
    "match_ordinal": 1,
    "name": "FINCA POZA GUÁCIMO - Pococí",
    "description_es": "Finca Poza Guácimo en Pococí, Limón, es una finca en bosque húmedo caribeño con poza natural rodeada de vegetación densa para baño, sendero corto de acceso y áreas para descanso, en zona lluviosa con alta biodiversidad.",
    "description_en": "Finca Poza Guacimo in Pococi, Limon, is a farm in humid Caribbean forest with a natural pool surrounded by dense vegetation for swimming, a short access trail and rest areas, in a rainy zone with high biodiversity.",
    "categories": [
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 10.473523,
    "longitude": -84.0167423
  },
  {
    "match_name": "Finca Retos del Irazú",
    "match_ordinal": 1,
    "name": "Finca Retos del Irazú",
    "description_es": "Finca Retos del Irazú en Cot, cerca de Prusia, Cartago, es una finca de agroturismo con sendero de unos 3 km de dificultad fácil entre bosque con la naciente del Río Reventazón, área de picnic con ranchos y zacate corto, cocina de leña y opción de camping, ambiente familiar para principiantes y niños.",
    "description_en": "Finca Retos del Irazu in Cot, near Prusia, Cartago, is an agrotourism farm with an easy 3 km trail through forest with the headwaters of the Reventazon River, a picnic area with shelters and short grass, a wood-fired kitchen and camping option, in a family setting for beginners and children.",
    "categories": [
      "Senderismo",
      "Hospedaje en la Naturaleza",
      "Experiencia Gastronómica",
      "Agroturismo"
    ],
    "latitude": 9.947326,
    "longitude": -83.878105
  },
  {
    "match_name": "Finca San Gerardo",
    "match_ordinal": 1,
    "name": "Finca San Gerardo",
    "description_es": "Finca San Gerardo en Cambronero, San Ramón, en la misma zona que Poza El Cañón, es una propiedad privada con varios kilómetros de senderos señalizados que enlazan la catarata Esmeralda de unos 20 m con poza para baño, la Poza El Cañón encajonada entre paredes rocosas, otras pozas, miradores, nacientes y áreas de picnic, con caminatas de dificultad moderada y agua fría y profunda.",
    "description_en": "Finca San Gerardo in Cambronero, San Ramon, in the same area as Poza El Canon, is a private property with several kilometers of marked trails linking the roughly 20 m Esmeralda waterfall with a swimming pool, the Poza El Canon enclosed by rock walls, other pools, viewpoints, springs and picnic areas, with moderate hikes and cold deep water.",
    "categories": [
      "Ríos y Pozas",
      "Senderismo",
      "Cataratas"
    ],
    "latitude": 10.033,
    "longitude": -84.535
  },
  {
    "match_name": "Finca Vikingos",
    "match_ordinal": 1,
    "name": "Finca Vikingos",
    "description_es": "Finca Vikingos camino a San José de la Montaña, entre Santa Bárbara y Barva de Heredia, es una finca recreativa con hasta 5 km de senderos fáciles y señalizados entre cafetales y árboles nativos etiquetados, dos miradores con vista a los Cerros de Escazú y al Golfo de Nicoya, hamaca gigante, granja con gallinas y ovejas, lago pequeño, restaurante y casona para eventos, áreas de picnic con canastas y cabañas para hospedaje.",
    "description_en": "Finca Vikingos on the way to San Jose de la Montana, between Santa Barbara and Barva de Heredia, is a recreational farm with up to 5 km of easy marked trails through coffee fields and labeled native trees, two viewpoints over the Escazu hills and the Gulf of Nicoya, a giant hammock, a farm with hens and sheep, a small lake, restaurant and event hall, picnic areas with baskets and cabins for lodging.",
    "categories": [
      "Senderismo",
      "Miradores",
      "Experiencia Gastronómica",
      "Agroturismo"
    ],
    "latitude": 10.061259,
    "longitude": -84.135562
  },
  {
    "match_name": "Gavilán: Termales escondidos entre lluvia y queso artesanal",
    "match_ordinal": 1,
    "name": "Gavilán: Termales escondidos",
    "description_es": "Gavilán en Curubandé, Liberia, Guanacaste, es un conjunto de pozas termales naturales entre vegetación de bosque seco y cauce de quebrada, con agua caliente de origen volcánico para baño por inmersión, acceso por camino rural y sendero corto, en entorno rústico sin infraestructura hotelera.",
    "description_en": "Gavilan in Curubande, Liberia, Guanacaste, is a group of natural hot-spring pools among dry-forest vegetation and a stream bed, with volcanically heated water for soaking, accessed by rural road and a short trail, in a rustic setting with no hotel infrastructure.",
    "categories": [
      "Termales",
      "Ríos y Pozas"
    ],
    "latitude": 10.881,
    "longitude": -85.352
  },
  {
    "match_name": "Golfito – Más que electrodomésticos, ¡un paraíso de naturaleza marina! 🐋🌴",
    "match_ordinal": 1,
    "name": "Golfito, paraíso naturaleza marina",
    "description_es": "Golfito en el Golfo Dulce, Puntarenas, es un puerto en bahía protegida por la Península de Osa frente a bosque lluvioso siempreverde, con el Refugio Mixto Golfito en el cerro, marinas y pesca deportiva, tours en bote para avistamiento de delfines y ballenas, kayak, senderismo y ferry a Puerto Jiménez como acceso a Corcovado, además de depósito libre comercial.",
    "description_en": "Golfito on Golfo Dulce, Puntarenas, is a port on a bay sheltered by the Osa Peninsula facing evergreen rainforest, with the Golfito Mixed Refuge on the hill, marinas and sport fishing, boat tours for dolphin and whale watching, kayaking, hiking and a ferry to Puerto Jimenez as access to Corcovado, plus a duty-free shopping area.",
    "categories": [
      "Playas",
      "Islas y Manglares",
      "Reservas Silvestres"
    ],
    "latitude": 8.604,
    "longitude": -83.113
  },
  {
    "match_name": "GuanaGlamp Huacas",
    "match_ordinal": 1,
    "name": "GuanaGlamp Huacas",
    "description_es": "GuanaGlamp en Huacas, Santa Cruz, Guanacaste, es una propuesta de glamping con tiendas y domos equipados entre vegetación de bosque seco, con camas, baño, piscina y áreas comunes para descanso, como base para visitar playas cercanas como Tamarindo, Flamingo y Conchal.",
    "description_en": "GuanaGlamp in Huacas, Santa Cruz, Guanacaste, is a glamping site with equipped tents and domes among dry-forest vegetation, with beds, bathrooms, a pool and common rest areas, as a base for visiting nearby beaches such as Tamarindo, Flamingo and Conchal.",
    "categories": [
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.3451487,
    "longitude": -85.7723592
  },
  {
    "match_name": "GUIONES & PELADA",
    "match_ordinal": 1,
    "name": "GUIONES & PELADA",
    "description_es": "Guiones y Pelada en Nosara, Nicoya, Guanacaste, combinan Playa Guiones con unos 7 km de arena para surf de varios niveles y Playa Pelada con arrecifes rocosos, pozas de marea y mirador, rodeadas de bosque y senderos costeros, con escuelas de surf, restaurantes y ambiente para caminatas y atardeceres.",
    "description_en": "Guiones and Pelada in Nosara, Nicoya, Guanacaste, combine Playa Guiones with about 7 km of sand for multi-level surfing and Playa Pelada with rocky reefs, tide pools and a viewpoint, surrounded by forest and coastal trails, with surf schools, restaurants and a setting for walks and sunsets.",
    "categories": [
      "Playas",
      "Aventura y Deportes"
    ],
    "latitude": 9.946,
    "longitude": -85.671
  },
  {
    "match_name": "Hornillas – Volcán Miravalles",
    "match_ordinal": 1,
    "name": "Hornillas – Volcán Miravalles",
    "description_es": "Hornillas en las faldas del Volcán Miravalles, Guanacaste, es un campo de actividad volcánica con fumarolas, ollas de barro hirviendo y aguas termales sulfurosas, con senderos entre bosque seco para observación geológica, baños de barro y pozas termales, en el macizo de 2028 m con planta geotérmica cercana.",
    "description_en": "Hornillas on the slopes of Miravalles Volcano, Guanacaste, is a volcanic activity field with fumaroles, boiling mud pots and sulfurous hot springs, with trails through dry forest for geological viewing, mud baths and thermal pools, on the 2,028 m massif with a nearby geothermal plant.",
    "categories": [
      "Volcanes",
      "Termales",
      "Senderismo"
    ],
    "latitude": 10.713,
    "longitude": -85.177
  },
  {
    "match_name": "Humedal Nacional Térraba-Sierpe",
    "match_ordinal": 1,
    "name": "Humedal Nacional Térraba-Sierpe",
    "description_es": "El Humedal Nacional Térraba-Sierpe en Osa, Puntarenas, es un extenso humedal de manglar con canales, esteros y bosque inundado formado por los ríos Térraba y Sierpe, hábitat de aves, cocodrilos, monos y fauna acuática, recorrido en bote por túneles de mangle para observación de naturaleza y pesca artesanal.",
    "description_en": "Terraba-Sierpe National Wetland in Osa, Puntarenas, is a vast mangrove wetland with channels, estuaries and flooded forest formed by the Terraba and Sierpe rivers, habitat for birds, crocodiles, monkeys and aquatic fauna, explored by boat through mangrove tunnels for nature watching and artisanal fishing.",
    "categories": [
      "Islas y Manglares",
      "Reservas Silvestres"
    ],
    "latitude": 8.8966888,
    "longitude": -83.473969
  },
  {
    "match_name": "Isla Chiquita",
    "match_ordinal": 1,
    "name": "Isla Chiquita",
    "description_es": "Isla Chiquita en el Golfo de Nicoya, frente a Paquera, es una isla pequeña con propuesta de glamping en tiendas equipadas frente al mar, playa tranquila para kayak, paddle, snorkel y avistamiento de bioluminiscencia, con restaurante y tours en bote.",
    "description_en": "Isla Chiquita in the Gulf of Nicoya, off Paquera, is a small island with a glamping proposal in equipped seafront tents, a calm beach for kayaking, paddleboarding, snorkeling and bioluminescence viewing, with a restaurant and boat tours.",
    "categories": [
      "Islas y Manglares",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 9.839773,
    "longitude": -84.894481
  },
  {
    "match_name": "Isla Jesusita",
    "match_ordinal": 1,
    "name": "Isla Jesusita",
    "description_es": "Isla Jesusita en el Golfo de Nicoya es una isla de bosque y manglar con playas tranquilas de arena y concha, aguas calmadas para natación, kayak y paddle, vegetación costera con aves y cangrejos, con acceso solo en bote para visita de día o camping rústico.",
    "description_en": "Jesusita Island in the Gulf of Nicoya is a forest and mangrove island with calm sand-and-shell beaches, sheltered waters for swimming, kayaking and paddleboarding, coastal vegetation with birds and crabs, reached only by boat for day visits or rustic camping.",
    "categories": [
      "Islas y Manglares",
      "Playas"
    ],
    "latitude": 9.83,
    "longitude": -84.904
  },
  {
    "match_name": "Isla San Lucas (Antiguo Penal)",
    "match_ordinal": 1,
    "name": "Isla San Lucas (Antiguo Penal)",
    "description_es": "La Isla San Lucas en el Golfo de Nicoya, Puntarenas, es Parque Nacional desde 2020 y conserva el antiguo penal operado entre 1873 y 1991 con celdas, capilla, muelle y grafitis históricos, además de playas, senderos entre bosque seco, miradores y fauna como monos, venados y aves, con acceso en bote turístico.",
    "description_en": "San Lucas Island in the Gulf of Nicoya, Puntarenas, is a National Park since 2020 preserving the former prison operating between 1873 and 1991 with cells, chapel, dock and historic graffiti, plus beaches, dry-forest trails, viewpoints and wildlife such as monkeys, deer and birds, reached by tour boat.",
    "categories": [
      "Parques Nacionales",
      "Cultura e Historia",
      "Playas"
    ],
    "latitude": 9.9424707,
    "longitude": -84.9082245
  },
  {
    "match_name": "Isla Tortuga",
    "match_ordinal": 1,
    "name": "Isla Tortuga",
    "description_es": "Isla Tortuga en el Golfo de Nicoya es una isla deshabitada de arena blanca y aguas turquesa visitada en tour de un día en catamarán o lancha desde Puntarenas, Paquera o Jacó, con snorkel en arrecife, paseos en banana boat, sendero a mirador y almuerzo en playa.",
    "description_en": "Tortuga Island in the Gulf of Nicoya is an uninhabited island of white sand and turquoise water visited on full-day catamaran or boat tours from Puntarenas, Paquera or Jaco, with reef snorkeling, banana-boat rides, a viewpoint trail and beach lunch.",
    "categories": [
      "Islas y Manglares",
      "Playas"
    ],
    "latitude": 9.768619,
    "longitude": -84.8930975
  },
  {
    "match_name": "Iyok Ami",
    "match_ordinal": 1,
    "name": "Iyok Ami",
    "description_es": "Iyok Ami en Copey de Dota, Cerro de la Muerte, es una reserva privada de bosque nuboso y páramo con rutas de 4 a 13 km entre robledales con musgo, miradores a las montañas, río con pequeña catarata y cañón, árbol milenario y valle para picnic, hábitat de quetzal y aves de altura, con comedor y hospedaje rústico.",
    "description_en": "Iyok Ami in Copey de Dota, Cerro de la Muerte, is a private cloud-forest and paramo reserve with 4 to 13 km routes through mossy oak forest, mountain viewpoints, a river with a small waterfall and canyon, a millenary tree and a picnic valley, habitat for quetzals and highland birds, with a dining room and rustic lodging.",
    "categories": [
      "Senderismo",
      "Reservas Silvestres"
    ],
    "latitude": 9.6393747,
    "longitude": -83.8420437
  },
  {
    "match_name": "Jacó & Herradura - Puntarenas",
    "match_ordinal": 1,
    "name": "Jacó & Herradura - Puntarenas",
    "description_es": "Jacó y Herradura en Garabito, Puntarenas, combinan Playa Jacó de unos 4 km de arena oscura para surf y Playa Herradura en bahía protegida para natación, paseos en bote y pesca, con paseo costero, restaurantes, vida nocturna, escuelas de surf, tours en ATV y canopy, y cercanía a Carara y Manuel Antonio.",
    "description_en": "Jaco and Herradura in Garabito, Puntarenas, combine Playa Jaco with about 4 km of dark sand for surfing and Playa Herradura in a sheltered bay for swimming, boat trips and fishing, with a beachfront strip, restaurants, nightlife, surf schools, ATV and canopy tours, and proximity to Carara and Manuel Antonio.",
    "categories": [
      "Playas",
      "Aventura y Deportes",
      "Vida Nocturna"
    ],
    "latitude": 9.6541742,
    "longitude": -84.6636049
  },
  {
    "match_name": "Jardín Botánico Lankester",
    "match_ordinal": 1,
    "name": "Jardín Botánico Lankester",
    "description_es": "El Jardín Botánico Lankester en Dulce Nombre, Cartago, es un jardín de 11 hectáreas operado por la UCR como centro de investigación de orquídeas y epífitas con más de 3000 especies, con senderos entre colecciones, bromelias, palmas y jardín japonés con lago, casa de té y puente, para caminata educativa y fotografía.",
    "description_en": "Lankester Botanical Garden in Dulce Nombre, Cartago, is an 11-hectare garden operated by the University of Costa Rica as a research center for orchids and epiphytes with over 3,000 species, with paths among collections, bromeliads, palms and a Japanese garden with pond, teahouse and bridge, for educational walks and photography.",
    "categories": [
      "Reservas Silvestres",
      "Senderismo"
    ],
    "latitude": 9.8403,
    "longitude": -83.8906
  },
  {
    "match_name": "Kayak Isla San Lucas & Golfo",
    "match_ordinal": 1,
    "name": "Kayak Isla San Lucas & Golfo",
    "description_es": "El tour en kayak por el Golfo de Nicoya con rumbo a Isla San Lucas parte desde la zona de Puntarenas y Paquera por aguas tranquilas entre islas como San Lucas, Cedros y Jesusita, con avistamiento frecuente de delfines nariz de botella, aves marinas y tortugas. Isla San Lucas es un parque nacional que protege bosque seco, playas como Hacienda Vieja y las antiguas instalaciones del penal, con senderos cortos y áreas para nadar y hacer snorkel. Los recorridos en kayak incluyen remadas guiadas de medio día o al atardecer y salidas nocturnas para observar bioluminiscencia cuando las condiciones lo permiten.",
    "description_en": "The kayak tour across the Gulf of Nicoya toward San Lucas Island departs from the Puntarenas and Paquera area through calm waters among islands such as San Lucas, Cedros and Jesusita, with frequent sightings of bottlenose dolphins, seabirds and turtles. San Lucas Island is a national park protecting dry forest, beaches such as Hacienda Vieja and the former prison buildings, with short trails and areas for swimming and snorkeling. Kayak outings include guided half-day and sunset paddles and nighttime trips to see bioluminescence when conditions allow.",
    "categories": [
      "Islas y Manglares",
      "Aventura y Deportes"
    ],
    "latitude": 9.8697502,
    "longitude": -85.0580083
  },
  {
    "match_name": "Kinkara - Peréz Zeledón",
    "match_ordinal": 1,
    "name": "Kinkara - Pérez Zeledón",
    "description_es": "Kinkara es un retiro de montaña y centro comunitario en Santa Elena de Pérez Zeledón, al pie del Cerro Chirripó, dentro de una reserva privada de alrededor de 400 acres con río, cascadas, finca orgánica y bosque. Funciona con restaurante a cielo abierto de cocina de finca a la mesa, tiendas de glamping tipo Lotus Belle distribuidas en pequeñas aldeas y una programación de retiros familiares, yoga y caminatas a cataratas. Las estancias nocturnas están orientadas a participantes de retiros y a familias interesadas en la comunidad residente, mientras el restaurante y algunas actividades reciben visitantes de la zona.",
    "description_en": "Kinkara is a mountain retreat and community hub in Santa Elena, Perez Zeledon, at the foot of Mount Chirripo, within a private reserve of about 400 acres with a river, waterfalls, an organic farm and forest. It operates an open-air farm-to-table restaurant, Lotus Belle glamping tents arranged in small villages and a program of family retreats, yoga and waterfall hikes. Overnight stays are aimed at retreat participants and families interested in the resident community, while the restaurant and some activities receive local visitors.",
    "categories": [
      "Hospedaje en la Naturaleza",
      "Experiencia Gastronómica",
      "Senderismo"
    ],
    "latitude": 9.3620866,
    "longitude": -83.6238521
  },
  {
    "match_name": "La Angelina - Cartago",
    "match_ordinal": 1,
    "name": "La Angelina - Cartago",
    "description_es": "La Angelina es un parque privado de montaña en los altos de Ochomogo, entre Cartago y San José, con más de 18 km de senderos entre plantaciones de pino y ciprés. Cuenta con circuitos diferenciados para ciclismo de montaña, senderismo y trail running de distintos niveles, además de parqueo y áreas abiertas con vista al Valle Central. Es una salida de un día que permite caminatas cortas o recorridos largos, admite mascotas y mantiene un acceso controlado con horario diurno.",
    "description_en": "La Angelina is a private mountain park in the Ochomogo hills between Cartago and San Jose, with more than 18 km of trails through pine and cypress plantations. It has separate circuits for mountain biking, hiking and trail running at different levels, plus parking and open areas with views of the Central Valley. It is a day-use destination for short walks or long rides, allows pets and keeps controlled access during daytime hours.",
    "categories": [
      "Senderismo",
      "Aventura y Deportes",
      "Miradores"
    ],
    "latitude": 9.9148304,
    "longitude": -83.9976423
  },
  {
    "match_name": "La Ceiba",
    "match_ordinal": 1,
    "name": "La Ceiba",
    "description_es": "La Ceiba Ecoadventures es una reserva privada de más de 200 acres en Platanillo de Barú, Pérez Zeledón, con bosque primario y secundario, ríos y cuatro caídas de agua, entre ellas la Catarata La Raíz con poza para nadar. Los senderos cruzan claros, quebradas y tramos de exigencia física media hasta miradores y pozas naturales donde se observan tucanes, monos y perezosos. La propiedad dispone de cabañas de montaña equipadas, alimentación y caminatas guiadas con ingreso coordinado.",
    "description_en": "La Ceiba Ecoadventures is a private reserve of more than 200 acres in Platanillo de Baru, Perez Zeledon, with primary and secondary forest, rivers and four waterfalls, including La Raiz Waterfall with a swimming pool. Trails cross clearings, streams and moderately demanding sections to viewpoints and natural pools where toucans, monkeys and sloths are seen. The property has equipped mountain cabins, meals and guided hikes with coordinated entry.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 9.277,
    "longitude": -83.799
  },
  {
    "match_name": "La Leona – Corcovado",
    "match_ordinal": 1,
    "name": "La Leona – Corcovado",
    "description_es": "El sector La Leona es el acceso terrestre sur al Parque Nacional Corcovado desde Carate, en Osa, al que se llega por camino de lastre desde Puerto Jiménez y luego por unos 3.5 km a pie por playa hasta la estación. El sendero combina playa y selva y pasa por puntos como Madrigal, el antiguo cementerio, Playa Paraíso y formaciones rocosas con cavernas visibles en marea baja. Es un área de alta biodiversidad con monos, lapas, tapires y anidación estacional de tortugas, y conecta con la Estación Sirena en una travesía larga que exige reserva previa y guía certificado.",
    "description_en": "La Leona sector is the southern land entrance to Corcovado National Park from Carate, Osa, reached by gravel road from Puerto Jimenez and then about 3.5 km on foot along the beach to the ranger station. The trail combines beach and rainforest and passes points such as Madrigal, the old cemetery, Paraiso Beach and rock formations with caves visible at low tide. It is a high-biodiversity area with monkeys, scarlet macaws, tapirs and seasonal turtle nesting, and it connects to Sirena Station on a long trek that requires advance booking and a certified guide.",
    "categories": [
      "Parques Nacionales",
      "Senderismo",
      "Playas"
    ],
    "latitude": 8.4603583,
    "longitude": -83.4616237
  },
  {
    "match_name": "La Lucha - San José",
    "match_ordinal": 1,
    "name": "La Lucha - San José",
    "description_es": "Destinos La Lucha es un área de senderismo en San Cristóbal de Desamparados, en las montañas al sur de San José, con una pequeña laguna y una red de senderos para caminata y ciclismo entre bosque, potreros y quebradas. La zona forma parte del entorno histórico de la Finca La Lucha Sin Fin, vinculada a José Figueres Ferrer y a los hechos de 1948, en un paisaje frío y de neblina con vistas a la Cordillera de Talamanca. Es una escapada cercana para caminatas de medio día, picnic y observación de naturaleza sin infraestructura urbana.",
    "description_en": "Destinos La Lucha is a hiking area in San Cristobal de Desamparados, in the mountains south of San Jose, with a small lake and a network of trails for hiking and biking through forest, pasture and streams. The area is part of the historic setting of La Lucha Sin Fin farm, linked to Jose Figueres Ferrer and the events of 1948, in a cool, misty landscape with views of the Talamanca Range. It is a nearby getaway for half-day hikes, picnics and nature observation without urban infrastructure.",
    "categories": [
      "Senderismo",
      "Cultura e Historia"
    ],
    "latitude": 9.719722,
    "longitude": -83.981389
  },
  {
    "match_name": "LA TIGRA SAN CARLOS - ALAJUELA",
    "match_ordinal": 1,
    "name": "La Tigra San Carlos - Alajuela",
    "description_es": "La experiencia nocturna de La Tigra, en San Carlos de Alajuela, recorre los senderos de una finca familiar con parches de bosque en regeneración y espejos de agua que facilitan la observación de fauna nocturna. El recorrido guiado con focos permite ver ranas como la rana toro y ranas de vidrio en el santuario de ranas, además de insectos, murciélagos, aves y mamíferos nocturnos. La visita cierra con una cena típica cocinada en leña y vistas a las luces de las llanuras de San Carlos.",
    "description_en": "The nighttime experience in La Tigra, San Carlos, Alajuela, follows trails on a family farm with patches of regenerating forest and still-water pools that make nocturnal wildlife easier to see. The guided walk with flashlights reveals frogs such as bullfrogs and glass frogs in the frog sanctuary, along with insects, bats, birds and nocturnal mammals. The visit ends with a traditional wood-fired dinner and views of the lights of the San Carlos plains.",
    "categories": [
      "Vida Nocturna",
      "Senderismo",
      "Experiencia Gastronómica"
    ],
    "latitude": 10.5506353,
    "longitude": -84.77646
  },
  {
    "match_name": "Lago Arenal & Laguna Cote",
    "match_ordinal": 1,
    "name": "Lago Arenal & Laguna Cote",
    "description_es": "El Lago Arenal, entre Guanacaste y Alajuela, es el embalse más grande del país con unos 85 km², ampliado en 1979 para generación hidroeléctrica, rodeado por el Volcán Arenal y colinas verdes. Su extremo oeste concentra viento fuerte de noviembre a abril para windsurf y kitesurf, mientras el sector este es apto para kayak, stand up paddle, pesca de guapote y paseos en bote. Muy cerca, en Guatuso, la Laguna Cote es un lago de cráter de origen maar de casi 2 km², considerado sitio sagrado por el pueblo Maleku y conocido por una fotografía aérea de 1971 asociada a un objeto no identificado.",
    "description_en": "Lake Arenal, between Guanacaste and Alajuela, is the largest reservoir in the country at about 85 sq km, enlarged in 1979 for hydroelectric generation and framed by Arenal Volcano and green hills. Its western end has strong winds from November to April for windsurfing and kitesurfing, while the eastern sector suits kayaking, stand-up paddling, rainbow bass fishing and boat rides. Nearby in Guatuso, Lake Cote is a maar crater lake of almost 2 sq km, regarded as sacred by the Maleku people and known for a 1971 aerial photograph associated with an unidentified object.",
    "categories": [
      "Aventura y Deportes",
      "Miradores"
    ],
    "latitude": 10.505,
    "longitude": -84.922
  },
  {
    "match_name": "Laguna Congo",
    "match_ordinal": 1,
    "name": "Laguna Congo",
    "description_es": "La Laguna Congo es un lago de cráter de unas 15 hectáreas y alrededor de 14.6 metros de profundidad, parte del Refugio Nacional de Vida Silvestre Bosque Alegre en Río Cuarto de Alajuela, junto a las lagunas Hule y Bosque Alegre. Se alcanza por un desvío de unos 3 km desde el sendero a Laguna Hule, por bosque denso con tramos de barro, hasta un espejo de agua de tono verdoso rodeado de laderas boscosas. El conjunto protege bosque premontano y es hábitat de monos, armadillos y unas 170 especies de aves.",
    "description_en": "Laguna Congo is a crater lake of about 15 hectares and around 14.6 meters deep, part of the Bosque Alegre National Wildlife Refuge in Rio Cuarto, Alajuela, together with Hule and Bosque Alegre lagoons. It is reached by a roughly 3 km branch off the trail to Laguna Hule, through dense forest with muddy sections, to a greenish water surface ringed by forested slopes. The complex protects premontane forest and hosts monkeys, armadillos and about 170 bird species.",
    "categories": [
      "Volcanes",
      "Reservas Silvestres",
      "Senderismo"
    ],
    "latitude": 10.2831,
    "longitude": -84.2153
  },
  {
    "match_name": "Laguna de Colores",
    "match_ordinal": 1,
    "name": "Laguna de Colores",
    "description_es": "La Laguna de Colores, también llamada Laguna del Río Blanco, se ubica en el Bosque Nuboso El Iral en Cascajal de Coronado, en las faldas del Volcán Irazú, y se formó por un deslizamiento que represó el cauce del Río Blanco. La ruta guiada ronda los 19 a 20 km con unos 1200 metros de desnivel entre potreros, ríos como el Cajón y bosque nuboso, hasta un mirador y un descenso técnico con cuerdas y casco hacia la orilla. Es una caminata avanzada de 8 a 10 horas por terreno lodoso donde se observan rastros de coyote y tapir, sin servicios en el sendero.",
    "description_en": "Laguna de Colores, also called Rio Blanco Lagoon, lies in El Iral Cloud Forest in Cascajal de Coronado, on the slopes of Irazu Volcano, and was formed by a landslide that dammed the Blanco River. The guided route is about 19 to 20 km with roughly 1,200 meters of elevation change through pastures, rivers such as the Cajon and cloud forest, to a viewpoint and a technical descent with ropes and helmets to the shore. It is an advanced 8 to 10 hour hike over muddy ground where coyote and tapir tracks are seen, with no services on the trail.",
    "categories": [
      "Senderismo",
      "Ríos y Pozas",
      "Montañas y Cerros"
    ],
    "latitude": 9.995778,
    "longitude": -83.923981
  },
  {
    "match_name": "Laguna Fraijanes - Alajuela",
    "match_ordinal": 1,
    "name": "Laguna Fraijanes - Alajuela",
    "description_es": "El Parque Recreativo Laguna de Fraijanes, administrado por el ICODER, se ubica a unos 1650 metros de altura en Sabanilla de Alajuela, en la ruta hacia el Volcán Poás, con una extensión de unas 24 manzanas entre bosque, neblina y clima fresco. Su atractivo central es una laguna donde se permite la pesca cuando el nivel del agua y las vedas lo autorizan, rodeada de senderos cortos, zonas verdes, ranchos con parrilla y dos cabañas rústicas tipo chalet. Es un parque de día para picnic, paseos en bote, caminatas suaves y avistamiento de aves, con parqueo y pago en efectivo.",
    "description_en": "Laguna de Fraijanes Recreational Park, managed by ICODER, sits at about 1,650 meters elevation in Sabanilla, Alajuela, on the road to Poas Volcano, covering about 24 manzanas of forest, mist and cool weather. Its central feature is a lagoon where fishing is allowed when water levels and closures permit, ringed by short trails, lawns, picnic shelters with grills and two rustic chalet-style cabins. It is a day park for picnics, rowboat rides, easy walks and birdwatching, with parking and cash payment.",
    "categories": [
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 10.1256309,
    "longitude": -84.1911489
  },
  {
    "match_name": "Laguna Hule (Refugio Bosque Alegre)",
    "match_ordinal": 1,
    "name": "Laguna Hule (Refugio Bosque Alegre)",
    "description_es": "La Laguna Hule es la mayor de las tres lagunas del Refugio Nacional de Vida Silvestre Mixto Bosque Alegre, en Los Ángeles Sur de Río Cuarto, con unas 55 hectáreas, 1150 metros de largo y más de 26 metros de profundidad a unos 400 metros de altura. Ocupa la caldera del extinto Volcán Congo junto a las lagunas Congo y Bosque Alegre, rodeada de bosque primario con robles, helechos arborescentes y orquídeas. El acceso por lastre lleva a un mirador con restaurante y a un sendero empinado de unos 6 km ida y vuelta hasta la orilla, donde hay tours en kayak y pesca no permitida por ser área protegida.",
    "description_en": "Laguna Hule is the largest of the three lagoons in the Bosque Alegre Mixed National Wildlife Refuge, in Los Angeles Sur de Rio Cuarto, at about 55 hectares, 1,150 meters long and more than 26 meters deep at around 400 meters elevation. It fills the caldera of the extinct Congo Volcano together with Congo and Bosque Alegre lagoons, ringed by primary forest with oaks, tree ferns and orchids. Gravel access leads to a viewpoint with a restaurant and a steep trail of about 6 km round trip to the shore, where kayak tours operate and fishing is prohibited as a protected area.",
    "categories": [
      "Volcanes",
      "Reservas Silvestres",
      "Senderismo"
    ],
    "latitude": 10.2911,
    "longitude": -84.2081
  },
  {
    "match_name": "Laguna Manuel & Cerro de la Muerte – Santa María de Dota",
    "match_ordinal": 1,
    "name": "Laguna Manuel & Cerro de la Muerte – Santa María de Dota",
    "description_es": "La Laguna Manuel, también referida como Don Manuel, es una pequeña laguna de altura en los alrededores de Santa María de Dota, en la zona del Cerro de la Muerte, a la que se llega por caminos de montaña que requieren vehículo alto. El entorno combina potreros, bosque de roble y páramo con senderos cortos para caminata, fotografía y observación de aves de altura como el quetzal. Es una parada tranquila dentro de la región de Los Santos, de clima frío y neblina frecuente, cercana al Parque Nacional Los Quetzales y a fincas de café.",
    "description_en": "Laguna Manuel, also referred to as Don Manuel, is a small highland lagoon near Santa Maria de Dota, in the Cerro de la Muerte area, reached by mountain roads requiring a high-clearance vehicle. The setting combines pastures, oak forest and paramo with short trails for hiking, photography and highland birdwatching including the resplendent quetzal. It is a quiet stop in the Los Santos region, with cold weather and frequent mist, near Los Quetzales National Park and coffee farms.",
    "categories": [
      "Ríos y Pozas",
      "Montañas y Cerros",
      "Senderismo"
    ],
    "latitude": 9.689,
    "longitude": -83.978
  },
  {
    "match_name": "LANGOSTA TAMARINDO - Guanacaste",
    "match_ordinal": 1,
    "name": "Langosta Tamarindo - Guanacaste",
    "description_es": "Playa Langosta se ubica unos 2 km al sur de Tamarindo, en Santa Cruz de Guanacaste, y mantiene un ambiente más tranquilo con arena clara, manglar y rocas que entran al mar. El extremo norte es una ensenada de oleaje suave apta para baño en marea adecuada, mientras el sector sur forma una rompiente de arrecife y desembocadura que supera en tamaño a Tamarindo y funciona mejor con marea media en subida. Colinda con el Parque Nacional Marino Las Baulas, zona de anidación de tortuga baula, y está rodeada de hoteles boutique y casas de alquiler.",
    "description_en": "Playa Langosta lies about 2 km south of Tamarindo, in Santa Cruz, Guanacaste, with a quieter atmosphere of light sand, mangrove and rocks reaching the sea. The northern end is a gentle cove suitable for swimming at suitable tides, while the southern sector forms a reef and rivermouth break that runs larger than Tamarindo and works best on a mid incoming tide. It borders Las Baulas Marine National Park, a leatherback nesting area, and is lined with boutique hotels and rental homes.",
    "categories": [
      "Playas",
      "Aventura y Deportes"
    ],
    "latitude": 10.275,
    "longitude": -85.845
  },
  {
    "match_name": "Las Eólicas de Santa Ana",
    "match_ordinal": 1,
    "name": "Las Eólicas de Santa Ana",
    "description_es": "Las Eólicas de Santa Ana, parte del Parque Eólico Valle Central, reúnen 17 turbinas sobre un filo montañoso al oeste de San José, entre Santa Ana y Ciudad Colón. El acceso es por calle pavimentada empinada hasta una explanada bajo las torres, usada como mirador con vista amplia del Valle Central. Es un paseo corto y de baja dificultad para caminata, picnic y atardeceres, con viento fuerte y sin servicios comerciales en la cima.",
    "description_en": "Las Eolicas de Santa Ana, part of the Valle Central Wind Park, gather 17 turbines on a mountain ridge west of San Jose, between Santa Ana and Ciudad Colon. Access is by steep paved road to an open area beneath the towers, used as a viewpoint with broad views of the Central Valley. It is a short, low-difficulty outing for hiking, picnics and sunsets, with strong winds and no commercial services at the top.",
    "categories": [
      "Miradores",
      "Senderismo",
      "Montañas y Cerros"
    ],
    "latitude": 9.882,
    "longitude": -84.187
  },
  {
    "match_name": "LAS PIEDRITAS - PIEDADES DE SANTA ANA",
    "match_ordinal": 1,
    "name": "Las Piedritas - Piedades de Santa Ana",
    "description_es": "Las Piedritas es un potrero-mirador en Piedades de Santa Ana, sobre la ruta vieja a Ciudad Colón, con una caminata corta de unos 400 metros por zacate y senderos marcados. Desde lo alto hay vista hacia el noroeste sobre Heredia, Alajuela y Puntarenas, y en días despejados se distingue el Golfo de Nicoya en el horizonte, además de las turbinas eólicas montaña arriba. Es un sitio abierto y gratuito para picnic, volar papalotes y ver atardeceres, con parqueo en la calle y presencia de garrapatas por ser potrero.",
    "description_en": "Las Piedritas is a pasture viewpoint in Piedades de Santa Ana, on the old road to Ciudad Colon, with a short walk of about 400 meters over grass and marked paths. From the top there are northwest views over Heredia, Alajuela and Puntarenas, and on clear days the Gulf of Nicoya appears on the horizon, plus the wind turbines higher on the ridge. It is an open, free site for picnics, kite flying and sunsets, with street parking and ticks present as pastureland.",
    "categories": [
      "Miradores",
      "Senderismo"
    ],
    "latitude": 9.928,
    "longitude": -84.225
  },
  {
    "match_name": "Llanos de Cortés: Catarata con playita escondida y poza secreta en Bagaces, Guanacaste 💦🌴",
    "match_ordinal": 1,
    "name": "Llanos de Cortés: Catarata con playita en Bagaces",
    "description_es": "La Catarata Llanos de Cortés, en Bagaces de Guanacaste, es una caída ancha de unos 15 metros que forma una poza amplia con orilla arenosa usada como playita para nadar dentro de la línea de seguridad. Se llega por unas 30 gradas de concreto en una caminata de 3 a 5 minutos desde el parqueo municipal, con horario de 8 a.m. a 4 p.m. y cobro de entrada. En época lluviosa se activa una segunda caída estacional a la derecha y no se permite subir a las rocas bajo la cortina por seguridad.",
    "description_en": "Llanos de Cortes Waterfall, in Bagaces, Guanacaste, is a wide fall of about 15 meters forming a large pool with a sandy shore used as a small beach for swimming inside the safety line. It is reached by about 30 concrete steps on a 3 to 5 minute walk from the municipal parking area, open 8 a.m. to 4 p.m. with an entrance fee. In the rainy season a second seasonal fall appears on the right, and climbing the rocks under the curtain is not allowed for safety.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas"
    ],
    "latitude": 10.524,
    "longitude": -85.298
  },
  {
    "match_name": "Locos por el Bosque - Coronado",
    "match_ordinal": 1,
    "name": "Locos por el Bosque - Coronado",
    "description_es": "Locos por el Bosque es una reserva biológica privada en Monserrat de Coronado, a unos 18 km de San Isidro de Coronado por Las Nubes, dentro del corredor entre el Parque Nacional Braulio Carrillo y el macizo del Irazú. Tiene un circuito de unos 7 a 8 km de dificultad media por bosque nuboso con cintas naranjas hacia el Río Cajón, de tono amarillo por minerales volcánicos y agua fría, y cintas rosadas hacia un mirador con vista a una catarata encajonada. Los senderos están señalizados, hay gradas en la bajada al río y se ofrece área básica para camping con coordinación previa.",
    "description_en": "Locos por el Bosque is a private biological reserve in Monserrat de Coronado, about 18 km from San Isidro de Coronado via Las Nubes, inside the corridor between Braulio Carrillo National Park and the Irazu massif. It has a circuit of about 7 to 8 km of moderate difficulty through cloud forest with orange markers toward the Cajon River, yellowish from volcanic minerals and cold, and pink markers toward a viewpoint over a boxed-in waterfall. Trails are marked, steps lead down to the river, and a basic camping area is offered by prior arrangement.",
    "categories": [
      "Senderismo",
      "Reservas Silvestres",
      "Miradores"
    ],
    "latitude": 10.031,
    "longitude": -83.935
  },
  {
    "match_name": "Los Chorros – Grecia 🌟 Una joya natural a solo hora y media de San José",
    "match_ordinal": 1,
    "name": "Los Chorros – Grecia",
    "description_es": "Los Chorros son dos cataratas en Tacares de Grecia, Alajuela, dentro del Parque Recreativo Municipal Los Chorros, que protege un parche de selva importante para el agua potable de poblados cercanos como Atenas. La Catarata Zamora, de unos 40 metros, se alcanza en 15 a 20 minutos por sendero de tierra con gradas y un tramo plano entre cañales y bosque; la Catarata Prendas requiere cruzar el cauce y solo es accesible con caudal bajo. Es un paseo de medio día para baño en pozas, picnic y observación de tucanes y mariposas, con parqueo y cuota de ingreso en efectivo.",
    "description_en": "Los Chorros are two waterfalls in Tacares de Grecia, Alajuela, inside the Los Chorros Municipal Recreation Park, which protects a patch of forest important for drinking water for nearby towns such as Atenas. Zamora Waterfall, about 40 meters high, is reached in 15 to 20 minutes by dirt trail with steps and a flat stretch between cane fields and forest; Prendas Waterfall requires crossing the stream and is only accessible at low flow. It is a half-day outing for pool swimming, picnics and sightings of toucans and butterflies, with parking and a cash entrance fee.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 10.055,
    "longitude": -84.279
  },
  {
    "match_name": "Macaw Lodge - Turrubares",
    "match_ordinal": 1,
    "name": "Macaw Lodge - Turrubares",
    "description_es": "Macaw Lodge es un eco-lodge en los Cerros de Turrubares, en el Pacífico Central de San José, construido con madera de plantación propia, energía solar y agua de nacientes, con ocho habitaciones y cuatro cabinas entre jardines botánicos y bosque. La reserva tiene senderos por bosque primario hasta una catarata, plantaciones de cacao agroforestal con tour de cosecha, fermentado y chocolate incluida la bebida maya, además de café y mangostán. Es un sitio para avistamiento de lapas y aves vecinas al Parque Nacional Carara, con restaurante de productos de la finca y estudio de yoga al aire libre.",
    "description_en": "Macaw Lodge is an eco-lodge in the Cerros de Turrubares, in the Central Pacific of San Jose, built with timber from its own plantations, solar power and spring water, with eight rooms and four cabins among botanical gardens and forest. The reserve has trails through primary forest to a waterfall, agroforestry cacao plantings with a tour of harvest, fermentation and chocolate including the Maya drink, plus coffee and mangosteen. It is a site for scarlet macaw and birdwatching near Carara National Park, with a farm-produce restaurant and an outdoor yoga studio.",
    "categories": [
      "Hospedaje en la Naturaleza",
      "Senderismo",
      "Experiencia Gastronómica",
      "Agroturismo"
    ],
    "latitude": 9.7283892,
    "longitude": -84.518639
  },
  {
    "match_name": "Manuel Antonio y Catarata El Salto",
    "match_ordinal": 1,
    "name": "Manuel Antonio y Catarata El Salto",
    "description_es": "El Parque Nacional Manuel Antonio, en Quepos de Puntarenas, protege unas 1983 hectáreas terrestres y una amplia zona marina con playas como Manuel Antonio, Espadilla Sur, Tesoro y Playita, unidas por el tómbolo de Punta Catedral y senderos accesibles entre bosque húmedo. Es hábitat de perezosos de dos y tres dedos, monos congo, carablanca y tití, mapaches e iguanas, con ingreso solo en línea y cierre los martes. Muy cerca, fuera del parque, la Catarata El Salto forma una poza de agua dulce entre rocas usada para nadar, a la que se llega por sendero corto.",
    "description_en": "Manuel Antonio National Park, in Quepos, Puntarenas, protects about 1,983 land hectares and a large marine area with beaches such as Manuel Antonio, Espadilla Sur, Tesoro and Playita, joined by the Punta Catedral tombolo and accessible trails through humid forest. It hosts two- and three-toed sloths, howler, white-faced and squirrel monkeys, raccoons and iguanas, with online-only tickets and closure on Tuesdays. Very close, outside the park, El Salto Waterfall forms a freshwater rock pool used for swimming, reached by a short trail.",
    "categories": [
      "Parques Nacionales",
      "Playas",
      "Cataratas"
    ],
    "latitude": 9.397,
    "longitude": -84.16
  },
  {
    "match_name": "Maquengue - Siquirres",
    "match_ordinal": 1,
    "name": "Maquengue - Siquirres",
    "description_es": "El Refugio Nacional de Vida Silvestre Maquenque, entre los ríos San Carlos y Sarapiquí en la zona norte-caribeña, protege unas 51861 hectáreas de bosque húmedo siempreverde creado en 2005 como corredor biológico San Juan-La Selva hasta Tortuguero y Nicaragua. Incluye el humedal Ramsar con lagunas como Maquenque, Canacas, Colpachi y Tamborcito, con bosque primario, yolillales y árboles de almendro que alimentan a la lapa verde. El acceso es por Puerto Viejo de Sarapiquí y Pital por caminos rurales y canales, con lodges ecológicos que ofrecen caminatas guiadas, kayak y avistamiento de aves.",
    "description_en": "Maquenque National Wildlife Refuge, between the San Carlos and Sarapiqui rivers in the northern Caribbean lowlands, protects about 51,861 hectares of evergreen wet forest created in 2005 as the San Juan-La Selva biological corridor to Tortuguero and Nicaragua. It includes the Ramsar wetland with lagoons such as Maquenque, Canacas, Colpachi and Tamborcito, with primary forest, Raphia palm swamps and almendro trees feeding the great green macaw. Access is via Puerto Viejo de Sarapiqui and Pital by rural roads and canals, with eco-lodges offering guided walks, kayaking and birdwatching.",
    "categories": [
      "Reservas Silvestres",
      "Santuarios de Animales",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.07,
    "longitude": -83.616
  },
  {
    "match_name": "Marina Bahía Golfito: Aventura, Naturaleza y Lujo en el Golfo Dulce",
    "match_ordinal": 1,
    "name": "Marina Bahía Golfito",
    "description_es": "La Marina Bahía Golfito es una marina de servicio completo en el Golfo Dulce, en Golfito de Puntarenas, con muelles para veleros y yates, combustible, aprovisionamiento y asistencia para cruceros. Funciona como base para pesca deportiva de picudos y dorado, tours a los parques nacionales Corcovado y Piedras Blancas, kayak en manglares y avistamiento estacional de delfines y ballenas jorobadas. El entorno combina bosque lluvioso, puerto y pueblo con hospedajes y restaurantes cercanos, con acceso por carretera, lancha y aeródromo local.",
    "description_en": "Marina Bahia Golfito is a full-service marina on Golfo Dulce, in Golfito, Puntarenas, with slips for sailboats and yachts, fuel, provisioning and assistance for cruisers. It serves as a base for sport fishing for billfish and mahi-mahi, tours to Corcovado and Piedras Blancas national parks, mangrove kayaking and seasonal dolphin and humpback whale watching. The setting combines rainforest, harbor and town with nearby lodging and restaurants, reached by road, boat and local airstrip.",
    "categories": [
      "Aventura y Deportes",
      "Islas y Manglares"
    ],
    "latitude": 8.63750239516913,
    "longitude": -83.1687149319156
  },
  {
    "match_name": "Marina Pez Vela (Quepos)",
    "match_ordinal": 1,
    "name": "Marina Pez Vela (Quepos)",
    "description_es": "La Marina Pez Vela, en Quepos de Puntarenas, es una marina de clase mundial con muelles, astillero, plaza comercial con restaurantes y tiendas, y villas, rodeada de montañas boscosas junto al Pacífico. Es sede de torneos de pesca deportiva como el Pelagic Rockstar y el Dorado Derby para pez vela, marlín y dorado, con flota de charters disponible. Desde sus muelles salen tours de avistamiento de ballenas, snorkel, vela al atardecer y visitas al Parque Nacional Manuel Antonio.",
    "description_en": "Marina Pez Vela, in Quepos, Puntarenas, is a world-class marina with slips, a boatyard, a commercial plaza with restaurants and shops, and villas, framed by forested mountains beside the Pacific. It hosts sport-fishing tournaments such as the Pelagic Rockstar and Dorado Derby for sailfish, marlin and mahi-mahi, with a charter fleet on site. Whale-watching, snorkeling, sunset sailing and trips to Manuel Antonio National Park depart from its docks.",
    "categories": [
      "Aventura y Deportes",
      "Experiencia Gastronómica"
    ],
    "latitude": 9.4264177,
    "longitude": -84.1687194
  },
  {
    "match_name": "Mi Refugio",
    "match_ordinal": 1,
    "name": "Mi Refugio",
    "description_es": "Mi Refugio es una pequeña propiedad privada de bosque en las montañas entre Santa Ana y Ciudad Colón, con senderos cortos para caminata entre bosque secundario, cafetales y miradores hacia el valle. Los recorridos son de baja a media dificultad y permiten observar aves, mariposas y vegetación de la Zona Protectora Cerros de Escazú. Es una salida de medio día para caminatas suaves, picnic y desconexión cercana a la ciudad, con ingreso coordinado y parqueo limitado.",
    "description_en": "Mi Refugio is a small private forest property in the mountains between Santa Ana and Ciudad Colon, with short hiking trails through secondary forest, coffee groves and viewpoints over the valley. Routes are easy to moderate and allow sightings of birds, butterflies and vegetation of the Cerros de Escazu Protected Zone. It is a half-day outing for gentle hikes, picnics and a nearby nature break, with coordinated entry and limited parking.",
    "categories": [
      "Senderismo",
      "Reservas Silvestres"
    ],
    "latitude": 9.74424628482136,
    "longitude": -83.9258325683341
  },
  {
    "match_name": "Minas de Hacienda el Rodeo - San José",
    "match_ordinal": 1,
    "name": "Minas de Hacienda el Rodeo - San José",
    "description_es": "Las Minas de la Hacienda El Rodeo, en Mora de San José dentro de la Zona Protectora El Rodeo, son antiguos túneles de minería de oro y plata de los siglos XIX y XX excavados en la montaña. La visita guiada recorre socavones cortos con casco y foco, entre bosque seco y húmedo con senderos, quebradas y miradores. El conjunto incluye la casona de hacienda y restos de la actividad minera, en un paseo que combina historia, caminata leve y naturaleza.",
    "description_en": "The Minas of Hacienda El Rodeo, in Mora, San Jose, inside the El Rodeo Protected Zone, are old gold and silver mining tunnels from the 19th and 20th centuries dug into the hillside. The guided visit walks short adits with helmet and flashlight, through dry and humid forest with trails, streams and viewpoints. The complex includes the hacienda manor and remains of mining activity, on an outing combining history, easy walking and nature.",
    "categories": [
      "Cultura e Historia",
      "Senderismo"
    ],
    "latitude": 9.9143307,
    "longitude": -84.2419551
  },
  {
    "match_name": "Mirador del Miro (Jacó)",
    "match_ordinal": 1,
    "name": "Mirador del Miro (Jacó)",
    "description_es": "El Mirador del Miro, en la Montaña Miro al sur de Jacó, ocupa la estructura abandonada de un antiguo hotel en lo alto de un cerro frente al Pacífico. Se llega por un sendero empinado de unos 20 a 30 minutos entre bosque secundario hasta terrazas y balcones abiertos con vista panorámica de la bahía de Jacó. Es un punto gratuito para fotografía y atardeceres, sin servicios, con superficies irregulares y grafitis en las paredes.",
    "description_en": "Mirador El Miro, on Miro Mountain south of Jaco, occupies the abandoned structure of a former hotel atop a hill facing the Pacific. It is reached by a steep trail of about 20 to 30 minutes through secondary forest to open terraces and balconies with panoramic views of Jaco Bay. It is a free spot for photography and sunsets, with no services, uneven surfaces and graffiti on the walls.",
    "categories": [
      "Miradores",
      "Senderismo"
    ],
    "latitude": 9.5957875,
    "longitude": -84.6178967
  },
  {
    "match_name": "MIRADOR FINCA DEL ICE - CARTAGO",
    "match_ordinal": 1,
    "name": "Mirador Finca del ICE - Cartago",
    "description_es": "El Mirador Finca del ICE es un mirador campestre en las tierras altas de Cartago, en la zona de Paraíso y el Valle de Orosi-Cachí, con vista al cañón del Reventazón, plantaciones y montañas. El acceso es por calle rural hasta potreros y áreas abiertas con senderos cortos para caminata y picnic. Es una parada de medio día para fotografía de paisaje y observación de aves, sin servicios comerciales permanentes.",
    "description_en": "Mirador Finca del ICE is a rural viewpoint in the Cartago highlands, in the Paraiso and Orosi-Cachi Valley area, overlooking the Reventazon canyon, plantations and mountains. Access is by rural road to pastures and open areas with short trails for walking and picnics. It is a half-day stop for landscape photography and birdwatching, with no permanent commercial services.",
    "categories": [
      "Miradores",
      "Senderismo"
    ],
    "latitude": 9.8638091,
    "longitude": -83.9161935
  },
  {
    "match_name": "MISTICO PARK - LA FORTUNA",
    "match_ordinal": 1,
    "name": "Mistico Park - La Fortuna",
    "description_es": "Mistico Park, en La Fortuna de San Carlos junto a la represa del Lago Arenal, protege bosque lluvioso primario con un sendero de 3.2 km y 16 puentes, seis de ellos colgantes de hasta 45 metros sobre el dosel. Ofrece recorridos guiados y autoguiados de 2 a 3 horas para observar aves, monos, perezosos y ranas, además de caminatas nocturnas, tour de crepúsculo y cabalgatas. Opera todos los días de 6 a.m. a 3:50 p.m. con boletería, parqueo, baños y cafetería en la entrada.",
    "description_en": "Mistico Park, in La Fortuna, San Carlos, beside the Lake Arenal dam, protects primary rainforest with a 3.2 km trail and 16 bridges, six of them hanging up to 45 meters above the canopy. It offers guided and self-guided 2 to 3 hour walks for watching birds, monkeys, sloths and frogs, plus night walks, twilight tours and horseback rides. It operates daily from 6 a.m. to 3:50 p.m. with ticketing, parking, restrooms and a cafe at the entrance.",
    "categories": [
      "Senderismo",
      "Reservas Silvestres",
      "Aventura y Deportes"
    ],
    "latitude": 10.49,
    "longitude": -84.754
  },
  {
    "match_name": "Montañas de Cariblanco",
    "match_ordinal": 1,
    "name": "Montañas de Cariblanco",
    "description_es": "Las Montañas de Cariblanco se ubican en el corredor entre Vara Blanca, el Volcán Poás y el Parque Nacional Braulio Carrillo, en el límite entre Heredia y Alajuela hacia Sarapiquí. Son laderas de bosque nuboso y lluvioso surcadas por ríos y quebradas de la cuenca del Sarapiquí, con senderos de fincas privadas para caminata y observación de quetzales, tucanes y colibríes. Es una zona de clima fresco y lluvioso para escapadas de montaña, con hospedajes rurales y accesos de lastre.",
    "description_en": "The Cariblanco Mountains lie in the corridor between Vara Blanca, Poas Volcano and Braulio Carrillo National Park, on the Heredia-Alajuela border toward Sarapiqui. They are cloud and rainforest slopes crossed by rivers and streams of the Sarapiqui basin, with private-farm trails for hiking and sightings of quetzals, toucans and hummingbirds. It is a cool, rainy mountain zone for getaways, with rural lodging and gravel access.",
    "categories": [
      "Montañas y Cerros",
      "Senderismo"
    ],
    "latitude": 9.8853678,
    "longitude": -84.1667114
  },
  {
    "match_name": "Monteverde Parte 1",
    "match_ordinal": 1,
    "name": "Monteverde Parte 1",
    "description_es": "La Reserva Bosque Nuboso Monteverde protege alrededor de 10500 hectáreas de bosque nuboso en la Cordillera de Tilarán, con una red de unos 13 km de senderos bien señalizados entre vegetación cargada de musgos, orquídeas, bromelias y helechos. Los recorridos incluyen el puente colgante sobre el dosel, la Cascada Cuecha, higuerones centenarios y miradores como La Ventana hacia la División Continental entre el Pacífico y el Caribe. Es un sitio para caminatas guiadas o autoguiadas y observación de aves como el quetzal, el pájaro campana y más de 200 especies, además de mamíferos, anfibios e insectos.",
    "description_en": "The Monteverde Cloud Forest Reserve protects about 10,500 hectares of cloud forest in the Tilaran Range, with a network of about 13 km of well-marked trails among vegetation covered in mosses, orchids, bromeliads and ferns. Routes include the hanging bridge over the canopy, Cuecha Waterfall, centuries-old fig trees and viewpoints such as La Ventana toward the Continental Divide between the Pacific and the Caribbean. It is a site for guided or self-guided hikes and birdwatching including the resplendent quetzal, three-wattled bellbird and more than 200 species, plus mammals, amphibians and insects.",
    "categories": [
      "Reservas Silvestres",
      "Senderismo",
      "Miradores"
    ],
    "latitude": 10.312,
    "longitude": -84.818
  },
  {
    "match_name": "Monteverde Parte 2",
    "match_ordinal": 1,
    "name": "Monteverde Parte 2",
    "description_es": "La zona de Santa Elena en Monteverde concentra la Reserva Bosque Nuboso Santa Elena, de unas 310 hectáreas a entre 1700 y 1800 metros de altura, con unos 12 km de senderos y una torre de observación sobre el dosel en un ambiente de neblina casi permanente. En el mismo sector operan parques de aventura con recorridos de puentes colgantes de unos 3 km y ocho puentes entre 55 y 157 metros de largo, y tours de canopy con 13 cables, plataformas y hamaca tipo Tarzán. El conjunto combina bosque primario con orquídeas y aguacatillos, avistamiento de quetzales y más de 200 especies de aves, y actividades de tirolesa y caminata elevada.",
    "description_en": "The Santa Elena area in Monteverde holds the Santa Elena Cloud Forest Reserve, about 310 hectares between 1,700 and 1,800 meters elevation, with about 12 km of trails and an observation tower above the canopy in near-permanent mist. The same sector has adventure parks with hanging-bridge walks of about 3 km and eight bridges between 55 and 157 meters long, and canopy tours with 13 cables, platforms and a Tarzan swing. The complex combines primary forest with orchids and wild avocados, quetzal sightings and more than 200 bird species, and zipline and elevated-walk activities.",
    "categories": [
      "Reservas Silvestres",
      "Aventura y Deportes",
      "Senderismo"
    ],
    "latitude": 10.362,
    "longitude": -84.804
  },
  {
    "match_name": "MONTEZUMA - Puntarenas",
    "match_ordinal": 1,
    "name": "MONTEZUMA - Puntarenas",
    "description_es": "Montezuma es un pueblo costero en el extremo sur de la Península de Nicoya, con una calle principal de restaurantes al aire libre, galerías y hospedajes de ambiente relajado. A pocos minutos a pie se encuentra el sistema de tres cataratas de Montezuma en plena selva, con pozas para nadar y senderos entre rocas y vegetación. La franja costera incluye Playa Montezuma frente al pueblo y, a corta distancia, Playa Grande y Playa Cocolito, usadas para baño, snorkel y clases de surf, además de salidas en lancha hacia Isla Tortuga.",
    "description_en": "Montezuma is a coastal town at the southern tip of the Nicoya Peninsula, with a main street of open-air restaurants, galleries and laid-back lodging. A few minutes on foot lies the three-tier Montezuma waterfall system in dense jungle, with swimming pools and trails among rocks and vegetation. The coastline includes Montezuma Beach in front of town and, a short distance away, Playa Grande and Playa Cocolito, used for swimming, snorkeling and surf lessons, plus boat trips to Tortuga Island.",
    "categories": [
      "Playas",
      "Cataratas",
      "Senderismo"
    ],
    "latitude": 9.6713187,
    "longitude": -85.0701001
  },
  {
    "match_name": "Monumento Nacional Guayabo",
    "match_ordinal": 1,
    "name": "Monumento Nacional Guayabo",
    "description_es": "El Monumento Nacional Guayabo, en Santa Teresita de Turrialba en las faldas del Volcán Turrialba, protege 233 hectáreas y contiene el sitio arqueológico con estructuras de piedra más importante del país. La zona excavada muestra montículos, basamentos de viviendas, escalinatas, calzadas empedradas de varios kilómetros, acueductos abiertos y cerrados, tanques de agua y petroglifos como el monolito del jaguar y el lagarto. El asentamiento estuvo ocupado entre el año 1000 a.C. y 1400 d.C., con senderos entre bosque y visitas guiadas de carácter educativo y científico.",
    "description_en": "Guayabo National Monument, in Santa Teresita de Turrialba on the slopes of Turrialba Volcano, protects 233 hectares and holds the country's most important archaeological site with stone structures. The excavated area shows mounds, house foundations, stairways, paved causeways several kilometers long, open and covered aqueducts, water tanks and petroglyphs such as the jaguar and lizard monolith. The settlement was occupied between 1000 BC and AD 1400, with trails through forest and guided visits for education and research.",
    "categories": [
      "Cultura e Historia",
      "Senderismo"
    ],
    "latitude": 9.9709673,
    "longitude": -83.6950458
  },
  {
    "match_name": "Museo de AWA",
    "match_ordinal": 1,
    "name": "Museo de AWA",
    "description_es": "AWA es el primer museo del agua en Costa Rica, ubicado en la comunidad de La Gloria en Arenal de Puriscal, a unos 60 km al sur de San José y unos 8 km después del Parque Nacional La Cangreja. La finca combina espacios educativos sobre el agua con senderos cortos entre bosque y cuatro cataratas con pozas para nadar, incluida Poza Las Juntas. Las visitas se realizan con reserva, incluyen desayuno y almuerzo de cocina tradicional y recorridos por los senderos y las caídas de agua.",
    "description_en": "AWA is the first water museum in Costa Rica, located in the community of La Gloria in Arenal de Puriscal, about 60 km south of San Jose and about 8 km past La Cangreja National Park. The farm combines educational spaces about water with short trails through forest and four waterfalls with swimming pools, including Poza Las Juntas. Visits are by reservation and include breakfast and lunch with traditional cooking and tours of the trails and waterfalls.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Cultura e Historia"
    ],
    "latitude": 9.648853,
    "longitude": -84.410856
  },
  {
    "match_name": "Oasis con sabor a Aguacate",
    "match_ordinal": 1,
    "name": "Oasis con sabor a Aguacate",
    "description_es": "El sitio conocido como Oasis con sabor a Aguacate se encuentra en Minas del Aguacate entre Atenas y San Mateo, donde un sendero corto de unos 400 metros desde un portón rojo lleva a pozas y cascadas de agua cristalina. La poza de arriba cuenta con un tobogán natural de roca y la poza del medio es apta para baño, con agua fresca ideal para el clima cálido de la zona. Sendero arriba se encuentra la mina La Unión, un túnel en roca sólida del tiempo de la fiebre del oro de hace más de 150 años.",
    "description_en": "The site known as Oasis con sabor a Aguacate lies in Minas del Aguacate between Atenas and San Mateo, where a short trail of about 400 meters from a red gate leads to pools and waterfalls with clear water. The upper pool has a natural rock slide and the middle pool is suitable for swimming, with cool water ideal for the warm climate of the area. Further up the trail lies La Union mine, a solid-rock tunnel from the gold-rush time more than 150 years ago.",
    "categories": [
      "Ríos y Pozas",
      "Cataratas",
      "Senderismo"
    ],
    "latitude": 9.966,
    "longitude": -84.473
  },
  {
    "match_name": "OCEAN RANCH",
    "match_ordinal": 1,
    "name": "OCEAN RANCH",
    "description_es": "Ocean Ranch Park es una reserva privada de unas 850 acres en un valle fluvial junto a Jacó, en el Pacífico Central, con bosque lluvioso primario y secundario. Ofrece cabalgatas guiadas entre senderos de montaña y cruces de río hasta la Catarata El Encanto de unos 60 metros, además de canopy con tirolesas, rappel en cascada, tours en cuadraciclo y recorridos en tractor. Los recorridos incluyen guías bilingües y observación de lapas rojas, tucanes, monos, pizotes y mariposas.",
    "description_en": "Ocean Ranch Park is a private reserve of about 850 acres in a river valley beside Jaco, on the Central Pacific, with primary and secondary rainforest. It offers guided horseback rides along mountain trails and river crossings to the roughly 60-meter El Encanto Waterfall, plus canopy ziplines, waterfall rappelling, ATV tours and tractor rides. Tours include bilingual guides and sightings of scarlet macaws, toucans, monkeys, coatis and butterflies.",
    "categories": [
      "Aventura y Deportes",
      "Cataratas",
      "Senderismo"
    ],
    "latitude": 9.581,
    "longitude": -84.543
  },
  {
    "match_name": "Oikoumene: Un refugio natural en Ochomogo, Cartago",
    "match_ordinal": 1,
    "name": "Oikoumene: refugio Ochomogo Cartago",
    "description_es": "Oikoumene, cuyo nombre significa tierra apta para la vida, es un espacio de turismo rural sostenible en Ochomogo de Cartago, a unos 2 km del plantel de Recope y junto al parque La Angelina. Cuenta con cabañas familiares, casa chalet y área de camping, restaurante, salones para eventos y espacios de coworking. Dispone de rutas de senderismo y ciclismo de montaña de 1 a 5 km, de dificultad fácil, además de lago, anfiteatro para fogatas y actividades como canopy y rappel.",
    "description_en": "Oikoumene, whose name means land fit for life, is a sustainable rural tourism space in Ochomogo, Cartago, about 2 km from the Recope plant and beside La Angelina park. It has family cabins, a chalet house and a camping area, a restaurant, event halls and coworking spaces. It offers hiking and mountain-bike routes from 1 to 5 km with easy difficulty, plus a lake, a campfire amphitheater and activities such as canopy and rappelling.",
    "categories": [
      "Hospedaje en la Naturaleza",
      "Senderismo",
      "Experiencia Gastronómica"
    ],
    "latitude": 9.9159487,
    "longitude": -83.9513826
  },
  {
    "match_name": "OLÁN - PUNTARENAS",
    "match_ordinal": 1,
    "name": "OLÁN - PUNTARENAS",
    "description_es": "Olán es una comunidad rural a unos 28 a 30 km de Buenos Aires de Puntarenas, a la que se llega por camino de lastre y piedra solo apto para 4x4, en un entorno de montañas y bosque. La zona reúne más de un centenar de caídas de agua, entre ellas la Catarata Olán de unos 85 metros, además de Las Piletas y otras pozas para baño, higuerones gigantes y senderos de 1 a 15 km. El poblado incluye la Capilla en las Nubes, hospedaje rústico y guías locales para caminatas y turismo comunitario.",
    "description_en": "Olan is a rural community about 28 to 30 km from Buenos Aires, Puntarenas, reached by a gravel and stone road suitable only for 4x4 vehicles, in a mountain and forest setting. The area holds more than a hundred waterfalls, including the roughly 85-meter Olan Waterfall, plus Las Piletas and other swimming pools, giant fig trees and trails from 1 to 15 km. The village includes the Chapel in the Clouds, rustic lodging and local guides for hikes and community tourism.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo",
      "Turismo Comunitario"
    ],
    "latitude": 9.278,
    "longitude": -83.205
  },
  {
    "match_name": "OPEN WATER - Playas del Coco",
    "match_ordinal": 1,
    "name": "OPEN WATER - Playas del Coco",
    "description_es": "Playas del Coco, en el Golfo de Papagayo en Guanacaste, es una de las principales bases de buceo del Pacífico norte, con más de 20 puntos cercanos y trayectos cortos en lancha. Las aguas ofrecen arrecifes rocosos de origen volcánico, pináculos y zonas poco profundas con corrientes suaves, aptas para cursos Open Water y buzos certificados. En las inmersiones se observan tortugas, rayas, bancos de peces tropicales y, según la temporada, mantarrayas gigantes y tiburones toro en islas cercanas como Catalinas y Murciélago.",
    "description_en": "Playas del Coco, in the Gulf of Papagayo in Guanacaste, is one of the main dive bases of the North Pacific, with more than 20 nearby sites and short boat rides. The waters offer volcanic rocky reefs, pinnacles and shallow areas with gentle currents, suitable for Open Water courses and certified divers. Dives reveal turtles, rays, schools of tropical fish and, depending on season, giant mantas and bull sharks at nearby islands such as Catalinas and Murcielago.",
    "categories": [
      "Aventura y Deportes",
      "Islas y Manglares"
    ],
    "latitude": 10.534,
    "longitude": -85.633
  },
  {
    "match_name": "Orchid Garden",
    "match_ordinal": 1,
    "name": "Orchid Garden",
    "description_es": "El Botanical Orchid Garden es un jardín botánico desarrollado desde hace más de 30 años en La Garita de Alajuela, en la ruta entre Grecia, Sarchí y el Pacífico Central, sobre lo que fue un cafetal con árboles nativos conservados. Reúne senderos tropicales, jardines variados, puntos de exhibición y viveros con laboratorio donde se cultivan y reproducen orquídeas, entre palmas, bambúes, heliconias y árboles centenarios. La visita permite recorrer a pie un hábitat de bosque seco tropical con flora y fauna representativa y colecciones de especies e híbridos.",
    "description_en": "The Botanical Orchid Garden is a botanical garden developed over more than 30 years in La Garita, Alajuela, on the route between Grecia, Sarchi and the Central Pacific, on a former coffee farm with preserved native trees. It brings together tropical trails, varied gardens, display points and nurseries with a laboratory where orchids are grown and propagated, among palms, bamboos, heliconias and centuries-old trees. The visit follows footpaths through a dry tropical forest habitat with representative flora and fauna and collections of species and hybrids.",
    "categories": [
      "Reservas Silvestres",
      "Senderismo"
    ],
    "latitude": 9.991443,
    "longitude": -84.30743
  },
  {
    "match_name": "Oxygen Jungle Villas: Un pedacito de Bali en las montañas de Uvita",
    "match_ordinal": 1,
    "name": "Oxygen Jungle Villas: Bali en Uvita",
    "description_es": "Oxygen Jungle Villas es un hotel boutique solo para adultos en la selva de Uvita, a unos 10 minutos en carro de la playa y cerca del Parque Nacional Marino Ballena y la Catarata Uvita. Cuenta con 12 villas de paredes de vidrio de estilo balinés con vista a la selva o al océano, piscina infinita rodeada de palmeras, pabellón de spa y terrazas. El entorno de dosel lluvioso permite escuchar monos aulladores y observar tucanes, con desayuno incluido y ambiente orientado al descanso.",
    "description_en": "Oxygen Jungle Villas is an adults-only boutique hotel in the jungle of Uvita, about a 10-minute drive from the beach and near Marino Ballena National Park and Uvita Waterfall. It has 12 glass-walled Balinese-style villas with jungle or ocean views, a palm-lined infinity pool, a spa pavilion and terraces. The rainforest canopy setting brings sounds of howler monkeys and sightings of toucans, with breakfast included and an atmosphere focused on rest.",
    "categories": [
      "Hospedaje en la Naturaleza",
      "Miradores"
    ],
    "latitude": 9.19177187320815,
    "longitude": -83.7279286779103
  },
  {
    "match_name": "PACUARE",
    "match_ordinal": 1,
    "name": "PACUARE",
    "description_es": "El Río Pacuare, en la vertiente caribeña entre Turrialba y Limón, es uno de los ríos más reconocidos del país para el rafting, con un recorrido de unos 30 km y más de 50 rápidos de clase II a IV. El cañón está flanqueado por paredes verdes con cascadas que caen al cauce, como la cascada Huacas de unos 45 metros, y bosque húmedo con tucanes, monos y perezosos. Las salidas de uno a tres días incluyen equipo, guías naturalistas y tramos de aguas tranquilas para nadar y observar naturaleza.",
    "description_en": "The Pacuare River, on the Caribbean slope between Turrialba and Limon, is one of the country's best-known rivers for rafting, with a run of about 30 km and more than 50 Class II to IV rapids. The canyon is flanked by green walls with waterfalls dropping into the river, such as the roughly 45-meter Huacas waterfall, and humid forest with toucans, monkeys and sloths. One- to three-day trips include equipment, naturalist guides and calm-water stretches for swimming and nature watching.",
    "categories": [
      "Ríos y Pozas",
      "Aventura y Deportes"
    ],
    "latitude": 9.938,
    "longitude": -84.091
  },
  {
    "match_name": "Palo Verde: Humedales, senderos y vida salvaje en Guanacaste",
    "match_ordinal": 1,
    "name": "Palo Verde: Humedales Guanacaste",
    "description_es": "El Parque Nacional Palo Verde, en la cuenca baja del Río Tempisque en Bagaces de Guanacaste, protege unas 19800 hectáreas de humedales estacionales, manglares, bosque seco y cerros calizos. Es sitio Ramsar y concentra de noviembre a marzo cientos de miles de aves como jabirú, cigüeñón, espátula rosada, ibis y patos, además de lapas rojas, monos y cocodrilos americanos de varios metros. La visita combina senderos como La Roca y El Guayacán con miradores y tours en bote por unos 36 km navegables del Tempisque y el Bebedero.",
    "description_en": "Palo Verde National Park, in the lower Tempisque River basin in Bagaces, Guanacaste, protects about 19,800 hectares of seasonal wetlands, mangroves, dry forest and limestone hills. It is a Ramsar site and gathers from November to March hundreds of thousands of birds such as jabiru, wood stork, roseate spoonbill, ibis and ducks, plus scarlet macaws, monkeys and American crocodiles several meters long. Visits combine trails such as La Roca and El Guayacan with viewpoints and boat tours along about 36 navigable kilometers of the Tempisque and Bebedero rivers.",
    "categories": [
      "Parques Nacionales",
      "Santuarios de Animales",
      "Senderismo",
      "Islas y Manglares"
    ],
    "latitude": 10.345967,
    "longitude": -85.33654
  },
  {
    "match_name": "Paracaídas en Quepos 🪂 | La locura más tuanis desde el cielo",
    "match_ordinal": 1,
    "name": "Paracaídas en Quepos",
    "description_es": "El salto en paracaídas en tándem en Quepos despega desde el aeródromo de Boca Naranjo, a pocos minutos de Manuel Antonio, con instructores certificados y equipo completo. Tras un vuelo de unos 20 minutos sobre la costa, el salto incluye unos 30 segundos de caída libre y entre 5 y 8 minutos de vuelo en paracaídas con vista al parque nacional, playas, islas y montañas. La actividad opera en la mañana según condiciones meteorológicas y está disponible para mayores de edad dentro de límites de peso, sin experiencia previa.",
    "description_en": "Tandem skydiving in Quepos takes off from the Boca Naranjo airstrip, a few minutes from Manuel Antonio, with certified instructors and full equipment. After a flight of about 20 minutes over the coast, the jump includes about 30 seconds of freefall and 5 to 8 minutes of parachute flight with views of the national park, beaches, islands and mountains. The activity runs in the morning depending on weather and is available to adults within weight limits, with no prior experience needed.",
    "categories": [
      "Aventura y Deportes",
      "Miradores"
    ],
    "latitude": 9.425476,
    "longitude": -84.112895
  },
  {
    "match_name": "Paraíso de Manantiales, Río Cuarto - Grecia",
    "match_ordinal": 1,
    "name": "Paraíso de Manantiales, Río Cuarto - Grecia",
    "description_es": "Paraíso de Manantiales es una finca familiar en Colonia Toro Amarillo de Río Cuarto, con un recorrido de unos 2 km entre el cañón del Río Toro Amarillo y ocho cataratas de distintas alturas, la mayor de unos 90 metros. El sendero incluye bajadas empinadas, una escalera de caracol y pozas de agua celeste aptas para baño entre piedras de tono amarillento. El lugar cuenta con parqueo frente a la soda de la familia, piscina, restaurante los fines de semana y horario de 8:30 a.m. a 4 p.m.",
    "description_en": "Paraiso de Manantiales is a family farm in Colonia Toro Amarillo, Rio Cuarto, with a route of about 2 km through the Toro Amarillo River canyon and eight waterfalls of different heights, the tallest about 90 meters. The trail includes steep descents, a spiral staircase and light-blue pools suitable for swimming among yellowish rocks. The site has parking in front of the family soda, a swimming pool, a weekend restaurant and hours from 8:30 a.m. to 4 p.m.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 10.302,
    "longitude": -84.243
  },
  {
    "match_name": "Paraíso Quetzal Lodge",
    "match_ordinal": 1,
    "name": "Paraíso Quetzal Lodge",
    "description_es": "Paraíso Quetzal Lodge es un albergue familiar a unos 2650 metros de altura sobre la Ruta 2 en el Cerro de la Muerte, junto al Parque Nacional Los Quetzales. La propiedad abarca unas 80 hectáreas de bosque nuboso de Talamanca con más de 140 especies de aves, incluido el quetzal, además de senderos como El Caracol hacia la cascada mayor del Río Parrita y el sendero Danta por bosque antiguo. Ofrece cabañas de madera de pino con calefacción, tour del quetzal al amanecer y restaurante Los Colibríes de cocina tradicional en fogón de leña.",
    "description_en": "Paraiso Quetzal Lodge is a family-run lodge at about 2,650 meters elevation on Route 2 at Cerro de la Muerte, beside Los Quetzales National Park. The property covers about 80 hectares of Talamanca cloud forest with more than 140 bird species, including the resplendent quetzal, plus trails such as El Caracol to the largest waterfall of the Parrita River and the Danta trail through old-growth forest. It offers pine-wood cabins with heating, a sunrise quetzal tour and the Los Colibries restaurant with traditional wood-stove cooking.",
    "categories": [
      "Hospedaje en la Naturaleza",
      "Santuarios de Animales",
      "Senderismo"
    ],
    "latitude": 9.6443782,
    "longitude": -83.8503199
  },
  {
    "match_name": "Parque Internacional La Amistad",
    "match_ordinal": 1,
    "name": "Parque Internacional La Amistad",
    "description_es": "El Parque Internacional La Amistad es el área protegida terrestre más grande del país, con unas 199147 hectáreas en Costa Rica y unas 207000 en Panamá, en la Cordillera de Talamanca. Protege robledales, bosque nuboso, páramo y turberas de altura, con senderos cortos y largos para observar aves y especies endémicas. Es Reserva de Biosfera, Sitio Ramsar por las turberas y Patrimonio Mundial, y conserva territorios de los pueblos naso, bribri y ngäbe-buglé.",
    "description_en": "La Amistad International Park is the largest terrestrial protected area in the country, with about 199,147 hectares in Costa Rica and about 207,000 in Panama, in the Talamanca Range. It protects oak forests, cloud forest, paramo and high-altitude peat bogs, with short and long trails for watching birds and endemic species. It is a Biosphere Reserve, a Ramsar Site for its peatlands and a World Heritage property, and it preserves territories of the Naso, Bribri and Ngabe-Bugle peoples.",
    "categories": [
      "Parques Nacionales",
      "Montañas y Cerros",
      "Senderismo"
    ],
    "latitude": 9.4268969,
    "longitude": -83.129712
  },
  {
    "match_name": "Parque Nacional Barbilla",
    "match_ordinal": 1,
    "name": "Parque Nacional Barbilla",
    "description_es": "El Parque Nacional Barbilla, entre Limón y Cartago, protege unas 11943 hectáreas de bosque húmedo tropical en la vertiente caribeña y territorios vecinos del pueblo Nairi Awari. La entrada principal está en Brisas de Pacuarito, a unos 20 km de Siquirres por camino de lastre apto para 4x4. Cuenta con el sendero Los Gavilanes de 330 metros y el recorrido hacia el Río Dantas y las cataratas Terciopelo y Dos Caídas, de unos 5.5 km, que se realiza con guía local y permite nadar en pozas cristalinas.",
    "description_en": "Barbilla National Park, between Limon and Cartago, protects about 11,943 hectares of tropical wet forest on the Caribbean slope and neighboring lands of the Nairi Awari people. The main entrance is in Brisas de Pacuarito, about 20 km from Siquirres by gravel road suitable for 4x4. It has the 330-meter Los Gavilanes trail and the route to the Dantas River and the Terciopelo and Dos Caidas waterfalls, about 5.5 km, done with a local guide and with swimming in clear pools.",
    "categories": [
      "Parques Nacionales",
      "Senderismo",
      "Cataratas"
    ],
    "latitude": 9.9427188,
    "longitude": -83.4280004
  },
  {
    "match_name": "Parque Nacional Barbilla",
    "match_ordinal": 2,
    "name": "Parque Nacional Barbilla",
    "description_es": "El Parque Nacional Barbilla resguarda bosque lluvioso del Caribe en las montañas de Talamanca, con el Cerro Tigre como cumbre más alta y el Río Dantas como límite natural. Desde la estación de guardaparques se recorren antiguos pastizales y un sendero empinado y lodoso de alrededor de 1 km hasta el río, con desvío a un ceibo gigante, para luego remontar quebradas hacia pozas y cascadas dentro del parque. La visita requiere reserva y guía local, con una pasarela y mirador recientes junto a la estación.",
    "description_en": "Barbilla National Park safeguards Caribbean rainforest in the Talamanca mountains, with Cerro Tigre as its highest peak and the Dantas River as a natural boundary. From the ranger station visitors cross old pastures and a steep, muddy trail of about 1 km to the river, with a detour to a giant ceiba tree, then head up streams to pools and waterfalls inside the park. Visits require booking and a local guide, with a recent boardwalk and viewpoint beside the station.",
    "categories": [
      "Parques Nacionales",
      "Senderismo",
      "Cataratas"
    ],
    "latitude": 9.972201,
    "longitude": -83.464265
  },
  {
    "match_name": "Parque Nacional Barra Honda",
    "match_ordinal": 1,
    "name": "Parque Nacional Barra Honda",
    "description_es": "El Parque Nacional Barra Honda, a unos 22 km al noreste de Nicoya, protege 2295 hectáreas de bosque seco y un sistema de cavernas de origen calcáreo formado en antiguos arrecifes elevados a unos 423 metros. Se han explorado unas 19 a 40 cavernas con estalactitas y estalagmitas, de las cuales la Caverna Terciopelo está habilitada con descenso vertical de unos 17 metros por escalera metálica con arnés y guía certificado. En la superficie hay senderos, miradores al Río Tempisque y al Golfo de Nicoya, y nacientes que abastecen a comunidades vecinas.",
    "description_en": "Barra Honda National Park, about 22 km northeast of Nicoya, protects 2,295 hectares of dry forest and a cave system of limestone origin formed in ancient reefs uplifted to about 423 meters. About 19 to 40 caverns with stalactites and stalagmites have been explored, of which Terciopelo Cavern is open with a vertical descent of about 17 meters by metal ladder with harness and certified guide. On the surface there are trails, viewpoints to the Tempisque River and the Gulf of Nicoya, and springs supplying neighboring communities.",
    "categories": [
      "Parques Nacionales",
      "Aventura y Deportes",
      "Miradores"
    ],
    "latitude": 10.1711,
    "longitude": -85.3481
  },
  {
    "match_name": "Parque Nacional Carara",
    "match_ordinal": 1,
    "name": "Parque Nacional Carara",
    "description_es": "El Parque Nacional Carara, entre Turrubares y Garabito a 90 km de San José, protege unas 5242 hectáreas del único bosque de transición del Pacífico Central, donde se mezclan especies de bosque seco y húmedo. Es conocido por su población estable de lapa roja, además de monos, cocodrilos en el Río Grande de Tárcoles y cientos de aves. Dispone de senderos planos como Las Araceas de 1.2 km, Quebrada Bonita de 1.3 km, Laguna Meándrica de 2 km y un sendero de acceso universal pavimentado.",
    "description_en": "Carara National Park, between Turrubares and Garabito 90 km from San Jose, protects about 5,242 hectares of the only transitional forest of the Central Pacific, where dry- and wet-forest species mix. It is known for its stable scarlet macaw population, plus monkeys, crocodiles in the Grande de Tarcoles River and hundreds of birds. It has flat trails such as the 1.2 km Las Araceas, 1.3 km Quebrada Bonita, 2 km Meandrica Lagoon and a paved universal-access trail.",
    "categories": [
      "Parques Nacionales",
      "Senderismo",
      "Santuarios de Animales"
    ],
    "latitude": 9.7900999,
    "longitude": -84.5709133
  },
  {
    "match_name": "PARQUE NACIONAL CORCOVADO - PUNTARENAS",
    "match_ordinal": 1,
    "name": "PARQUE NACIONAL CORCOVADO - PUNTARENAS",
    "description_es": "El Parque Nacional Corcovado, en la Península de Osa, protege unas 42560 hectáreas terrestres y unas 3354 marinas de bosque muy húmedo tropical y bosque húmedo, entre los últimos de este tipo intactos en el Pacífico americano. Concentra unas 500 especies de árboles, 367 de aves, 140 de mamíferos y miles de insectos, con poblaciones de jaguar, puma, tapir, chancho de monte, las cuatro especies de monos y lapas rojas. La visita requiere reserva previa y guía certificado, con sectores como Sirena, San Pedrillo, La Leona, Los Patos, Los Planes y El Tigre.",
    "description_en": "Corcovado National Park, on the Osa Peninsula, protects about 42,560 land hectares and about 3,354 marine hectares of very wet tropical forest and moist forest, among the last intact forests of this type on the American Pacific. It holds about 500 tree species, 367 birds, 140 mammals and thousands of insects, with populations of jaguar, puma, tapir, white-lipped peccary, all four monkey species and scarlet macaws. Visits require advance booking and a certified guide, with sectors such as Sirena, San Pedrillo, La Leona, Los Patos, Los Planes and El Tigre.",
    "categories": [
      "Parques Nacionales",
      "Senderismo",
      "Santuarios de Animales"
    ],
    "latitude": 9.779963,
    "longitude": -83.843063
  },
  {
    "match_name": "Parque Nacional Corcovado - Sector San Pedrillo: Aventura pura en la selva",
    "match_ordinal": 1,
    "name": "Parque Nacional Corcovado - Sector San Pedrillo",
    "description_es": "El sector San Pedrillo, en el lado norte de Corcovado frente al Pacífico, se alcanza en lancha desde Bahía Drake, Sierpe o Uvita y ofrece un ambiente de selva cerrada y sensación remota. Cuenta con senderos como Catarata, Río Pargo arriba y abajo y Llorona, por bosque primario y secundario con caminatas de unas 4 horas y unos 5 km. El recorrido permite observar huellas y fauna del bosque húmedo y refrescarse en la cascada San Pedrillo, con tours de un día que incluyen permisos, guía y almuerzo.",
    "description_en": "The San Pedrillo sector, on the northern side of Corcovado facing the Pacific, is reached by boat from Drake Bay, Sierpe or Uvita and offers closed-jungle scenery with a remote feel. It has trails such as Catarata, Rio Pargo upstream and downstream and Llorona, through primary and secondary forest with walks of about 4 hours and 5 km. The route allows seeing tracks and wet-forest wildlife and cooling off at San Pedrillo waterfall, with day tours including permits, guide and lunch.",
    "categories": [
      "Parques Nacionales",
      "Senderismo",
      "Cataratas"
    ],
    "latitude": 8.68735808769815,
    "longitude": -83.7061339
  },
  {
    "match_name": "Parque Nacional Corcovado (Sector San Pedrillo)",
    "match_ordinal": 1,
    "name": "Parque Nacional Corcovado (Sector San Pedrillo)",
    "description_es": "El sector San Pedrillo es la puerta norte del Parque Nacional Corcovado, a unos 20 minutos en bote desde Bahía Drake, con salidas temprano en la mañana para caminatas guiadas. Los senderos recorren selva primaria con vegetación densa, sonidos del bosque y miradores, en recorridos de dificultad media por terreno húmedo e irregular. Es un sector menos denso en fauna visible que Sirena pero apto para familias, con chapuzón en cascada y regreso en lancha por la costa con posibilidad de ver delfines y tortugas.",
    "description_en": "The San Pedrillo sector is the northern gateway to Corcovado National Park, about 20 minutes by boat from Drake Bay, with early-morning departures for guided hikes. Trails cross primary jungle with dense vegetation, forest sounds and viewpoints, on moderate-difficulty walks over wet and uneven ground. It is a sector with less visible wildlife density than Sirena but suitable for families, with a waterfall swim and a coastal boat return with chances to see dolphins and turtles.",
    "categories": [
      "Parques Nacionales",
      "Senderismo",
      "Cataratas"
    ],
    "latitude": 8.6206666,
    "longitude": -83.7349954
  },
  {
    "match_name": "Parque Nacional Corcovado (Sector Sirena)",
    "match_ordinal": 1,
    "name": "Parque Nacional Corcovado (Sector Sirena)",
    "description_es": "La Estación Sirena es el núcleo central y más visitado de Corcovado, sin acceso por carretera y con llegada en lancha de unos 45 a 90 minutos desde Bahía Drake o por caminatas largas desde La Leona y Los Patos. Dispone de unos 20 km en 8 senderos locales planos, incluida la poza del Río Claro y la boca del Río Sirena, donde en marea alta se ven tiburones toro y cocodrilos. Es la mejor base para ver tapires, pecaríes, osos hormigueros y las cuatro especies de monos, con dormitorios, comedor y reserva previa obligatoria con guía.",
    "description_en": "Sirena Station is the central and most visited hub of Corcovado, with no road access and arrival by a 45- to 90-minute boat ride from Drake Bay or by long treks from La Leona and Los Patos. It has about 20 km on 8 flat local trails, including the Claro River pool and the mouth of the Sirena River, where bull sharks and crocodiles appear at high tide. It is the best base to see tapirs, peccaries, anteaters and all four monkey species, with dormitories, a dining hall and mandatory advance booking with a guide.",
    "categories": [
      "Parques Nacionales",
      "Senderismo",
      "Santuarios de Animales"
    ],
    "latitude": 8.4805,
    "longitude": -83.58918
  },
  {
    "match_name": "Parque Nacional Isla del Coco",
    "match_ordinal": 1,
    "name": "Parque Nacional Isla del Coco",
    "description_es": "El Parque Nacional Isla del Coco, a unos 550 km de la costa pacífica, protege unas 2400 hectáreas terrestres y cerca de 199700 marinas, con el único bosque húmedo tropical en isla oceánica del Pacífico Oriental. Es Patrimonio Mundial desde 1997 y sitio Ramsar, con más de 7000 mm de lluvia anual, cascadas, ríos y arrecifes diversos. El acceso es solo por mar en travesías de 32 a 36 horas desde Puntarenas en barcos de buceo, para observar cardúmenes de tiburones martillo, tiburones de punta blanca, mantas, atunes y delfines en sitios como Manuelita, Alcyone y Roca Sucia.",
    "description_en": "Cocos Island National Park, about 550 km off the Pacific coast, protects about 2,400 land hectares and nearly 199,700 marine hectares, with the only tropical wet forest on an oceanic island in the Eastern Pacific. It is a World Heritage property since 1997 and a Ramsar site, with more than 7,000 mm of annual rain, waterfalls, rivers and diverse reefs. Access is only by sea on 32- to 36-hour crossings from Puntarenas on dive liveaboards, to see schools of hammerhead sharks, whitetip sharks, mantas, tuna and dolphins at sites such as Manuelita, Alcyone and Dirty Rock.",
    "categories": [
      "Parques Nacionales",
      "Islas y Manglares",
      "Aventura y Deportes"
    ],
    "latitude": 5.5281101,
    "longitude": -87.0597617
  },
  {
    "match_name": "Parque Nacional Juan Castro Blanco",
    "match_ordinal": 1,
    "name": "Parque Nacional Juan Castro Blanco",
    "description_es": "El Parque Nacional del Agua Juan Castro Blanco, entre San Carlos, Zarcero y Sarchí en Alajuela, protege unas 14453 hectáreas de bosque nuboso de altura creado para resguardar nacientes de cinco ríos. Incluye el lago natural Pozo Verde de aguas verdes cristalinas, cataratas como Toro, Aguas Gatas, Gorrión y Río Claro, conos volcánicos, fumarolas del Volcán Platanar y pozas termales en Fila Chocosuela. Hay senderos como Pozo Verde-Las Minas y servicios en San José de la Montaña, con avistamiento de quetzales, pavas, monos y tapires.",
    "description_en": "Juan Castro Blanco Water National Park, between San Carlos, Zarcero and Sarchi in Alajuela, protects about 14,453 hectares of high-altitude cloud forest created to safeguard headwaters of five rivers. It includes the natural Pozo Verde lake with clear green waters, waterfalls such as Toro, Aguas Gatas, Gorrion and Rio Claro, volcanic cones, fumaroles of Platanar Volcano and hot pools at Fila Chocosuela. There are trails such as Pozo Verde-Las Minas and services at San Jose de la Montana, with sightings of quetzals, guans, monkeys and tapirs.",
    "categories": [
      "Parques Nacionales",
      "Volcanes",
      "Ríos y Pozas"
    ],
    "latitude": 10.2857034,
    "longitude": -84.3293288
  },
  {
    "match_name": "Parque Nacional La Cangreja",
    "match_ordinal": 1,
    "name": "Parque Nacional La Cangreja",
    "description_es": "El Parque Nacional La Cangreja, en Mercedes Sur y Chires de Puriscal a unos 35 km de Santiago de Puriscal, protege bosque con relieve quebrado entre los 300 y 1000 metros. El sendero principal Río Negro es lineal de unos 6 km, 12 km ida y vuelta en unas 4 horas, y se combina en forma de ocho con el sendero Plinia. En el recorrido se cruzan quebradas, el Río Negro de aguas cristalinas, la Cascada El Encanto y pozas naturales, con pendientes de hasta 70 por ciento y buena observación de aves.",
    "description_en": "La Cangreja National Park, in Mercedes Sur and Chires, Puriscal, about 35 km from Santiago de Puriscal, protects forest with broken relief between 300 and 1,000 meters. The main Rio Negro trail is linear at about 6 km, 12 km round trip in about 4 hours, and combines in a figure-eight with the Plinia trail. The route crosses streams, the clear-water Negro River, El Encanto Waterfall and natural pools, with slopes up to 70 percent and good birdwatching.",
    "categories": [
      "Parques Nacionales",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 9.7034083,
    "longitude": -84.3978752
  },
  {
    "match_name": "Parque Nacional Los Quetzales",
    "match_ordinal": 1,
    "name": "Parque Nacional Los Quetzales",
    "description_es": "El Parque Nacional Los Quetzales, en Ojo de Agua de Dota en el km 76.5 de la Interamericana Sur en el Cerro de la Muerte, protege bosque nuboso, páramo y turberas en la cabecera del Río Savegre. Es un área especial para el avistamiento del quetzal, con unas 216 especies de aves registradas. Cuenta con el sendero Zeledonia de 480 metros con pasos elevados y tramo accesible, horario de 8 a.m. a 4:30 p.m. y entorno frío de altura junto a San Gerardo de Dota y Providencia.",
    "description_en": "Los Quetzales National Park, in Ojo de Agua de Dota at km 76.5 of the Interamericana Sur on Cerro de la Muerte, protects cloud forest, paramo and peat bogs at the headwaters of the Savegre River. It is a special area for sighting the resplendent quetzal, with about 216 recorded bird species. It has the 480-meter Zeledonia trail with elevated walkways and an accessible section, hours from 8 a.m. to 4:30 p.m. and a cold highland setting beside San Gerardo de Dota and Providencia.",
    "categories": [
      "Parques Nacionales",
      "Montañas y Cerros",
      "Senderismo"
    ],
    "latitude": 9.5666667,
    "longitude": -83.75
  },
  {
    "match_name": "Parque Nacional Manuel Antonio",
    "match_ordinal": 1,
    "name": "Parque Nacional Manuel Antonio",
    "description_es": "El Parque Nacional Manuel Antonio, en Quepos de Puntarenas, protege alrededor de 1983 hectáreas terrestres y una amplia zona marina con playas de arena clara como Manuel Antonio, Espadilla Sur, Tesoro y Playita, unidas por el tómbolo de Punta Catedral. Combina bosque húmedo tropical con senderos cortos y accesibles, miradores y pozas de marea, y es hábitat de perezosos de dos y tres dedos, monos congo, carablanca y tití, mapaches, iguanas y más de 180 especies de aves. El ingreso es únicamente en línea con aforo limitado y el parque cierra los martes.",
    "description_en": "Manuel Antonio National Park, in Quepos, Puntarenas, protects about 1,983 land hectares and a large marine area with light-sand beaches such as Manuel Antonio, Espadilla Sur, Tesoro and Playita, joined by the Punta Catedral tombolo. It combines humid tropical forest with short accessible trails, viewpoints and tidal pools, and hosts two- and three-toed sloths, howler, white-faced and squirrel monkeys, raccoons, iguanas and more than 180 bird species. Entry is online only with limited capacity and the park closes on Tuesdays.",
    "categories": [
      "Parques Nacionales",
      "Playas",
      "Senderismo"
    ],
    "latitude": 9.0605046,
    "longitude": -84.2449917
  },
  {
    "match_name": "Parque Nacional Marino Ballena",
    "match_ordinal": 1,
    "name": "Parque Nacional Marino Ballena",
    "description_es": "El Parque Nacional Marino Ballena, en Uvita de Osa, protege unas 5160 hectáreas marinas y 171 hectáreas terrestres e incluye las playas Ballena, Bahía Uvita y Piñuela. Su rasgo distintivo es el tómbolo arenoso en forma de cola de ballena que se recorre a pie con marea baja, además de arrecifes, islotes y manglar. Es área de migración y reproducción de la ballena jorobada entre diciembre y abril y de agosto a noviembre, con avistamiento de delfines, tortugas marinas y aves, y condiciones para natación, snorkel y kayak con marea adecuada.",
    "description_en": "Ballena Marine National Park, in Uvita, Osa, protects about 5,160 marine hectares and 171 land hectares and includes Ballena, Uvita Bay and Pinuelo beaches. Its distinctive feature is the sandy tombolo shaped like a whale tail that can be walked at low tide, plus reefs, islets and mangrove. It is a migration and breeding area for humpback whales from December to April and August to November, with dolphins, sea turtles and birds, and conditions for swimming, snorkeling and kayaking at suitable tides.",
    "categories": [
      "Parques Nacionales",
      "Playas",
      "Santuarios de Animales"
    ],
    "latitude": 9.1304772,
    "longitude": -83.7484997
  },
  {
    "match_name": "Parque Nacional Piedras Blancas",
    "match_ordinal": 1,
    "name": "Parque Nacional Piedras Blancas",
    "description_es": "El Parque Nacional Piedras Blancas, en Golfito de Puntarenas, protege alrededor de 14019 hectáreas de bosque lluvioso siempreverde junto al Golfo Dulce y funcionó como sector Esquinas del Parque Nacional Corcovado hasta convertirse en parque separado en 1999. Abarca las cuencas de los ríos Esquinas y Piedras Blancas, con montañas abruptas, selva densa y playas cercanas. Es hábitat de jaguar, puma, ocelote, monos, perezosos, ranas de ojos rojos y gran diversidad de aves y reptiles, con acceso principal por La Gamba y senderos de bosque.",
    "description_en": "Piedras Blancas National Park, in Golfito, Puntarenas, protects about 14,019 hectares of evergreen rainforest beside Golfo Dulce and operated as the Esquinas sector of Corcovado National Park until becoming a separate park in 1999. It covers the Esquinas and Piedras Blancas river basins, with rugged mountains, dense jungle and nearby beaches. It hosts jaguar, puma, ocelot, monkeys, sloths, red-eyed tree frogs and wide bird and reptile diversity, with main access via La Gamba and forest trails.",
    "categories": [
      "Parques Nacionales",
      "Senderismo",
      "Reservas Silvestres"
    ],
    "latitude": 8.7028348,
    "longitude": -83.2779822
  },
  {
    "match_name": "Parque Nacional Tapantí",
    "match_ordinal": 1,
    "name": "Parque Nacional Tapantí",
    "description_es": "El Parque Nacional Tapantí - Macizo Cerro de la Muerte, en Orosi de Cartago, protege unos 583 kilómetros cuadrados de bosque pluvial montano bajo y premontano en la vertiente caribeña de la Cordillera de Talamanca. Es una de las zonas más lluviosas del país y resguarda nacientes y ríos como el Orosí que abastecen de agua al Valle Central. Alberga danta, felinos, monos, quetzal, tucanetas y gran diversidad de orquídeas e insectos, con senderos cortos, puentes, áreas de picnic y un mirador hacia una catarata.",
    "description_en": "Tapanti - Cerro de la Muerte Massif National Park, in Orosi, Cartago, protects about 583 square kilometers of lower montane and premontane rainforest on the Caribbean slope of the Talamanca Range. It is one of the wettest areas in the country and safeguards headwaters and rivers such as the Orosi that supply water to the Central Valley. It hosts tapir, wild cats, monkeys, resplendent quetzal, toucanets and wide orchid and insect diversity, with short trails, bridges, picnic areas and a waterfall overlook.",
    "categories": [
      "Parques Nacionales",
      "Senderismo",
      "Ríos y Pozas"
    ],
    "latitude": 9.7592,
    "longitude": -83.7844
  },
  {
    "match_name": "Parque Nacional Tortuguero",
    "match_ordinal": 1,
    "name": "Parque Nacional Tortuguero",
    "description_es": "El Parque Nacional Tortuguero, en el Caribe norte de Limón, protege unas 31174 hectáreas de humedal con una red de canales, lagunas, ríos, pantanos y bosque lluvioso, accesible solo en bote o avioneta. Reúne once hábitats distintos y una extensa playa de unos 35 km que es sitio clave de anidación de la tortuga verde entre julio y octubre, además de baula, carey y cabezona. En canales y senderos como el Gavilán se observan manatíes, caimanes, cocodrilos, monos, perezosos, jaguares y más de 400 especies de aves.",
    "description_en": "Tortuguero National Park, on the northern Caribbean coast in Limon, protects about 31,174 hectares of wetland with a network of canals, lagoons, rivers, swamps and rainforest, reached only by boat or small plane. It holds eleven distinct habitats and an extensive beach of about 35 km that is a key green turtle nesting site from July to October, plus leatherback, hawksbill and loggerhead turtles. Canals and trails such as Gavilan reveal manatees, caimans, crocodiles, monkeys, sloths, jaguars and more than 400 bird species.",
    "categories": [
      "Parques Nacionales",
      "Islas y Manglares",
      "Santuarios de Animales"
    ],
    "latitude": 10.4874212,
    "longitude": -83.3846426
  },
  {
    "match_name": "Parque Nacional Volcán Poás",
    "match_ordinal": 1,
    "name": "Parque Nacional Volcán Poás",
    "description_es": "El Parque Nacional Volcán Poás, en Alajuela, protege unas 65 kilómetros cuadrados alrededor del macizo con cumbre a 2700 metros. Su cráter principal, de unos 290 metros de ancho, mantiene una laguna ácida de tono turquesa con actividad fumarólica frecuente, mientras el cráter Botos alberga un lago frío de agua verde de unos 370 metros de diámetro, inactivo desde hace miles de años. Cuenta con senderos señalizados al mirador del cráter y a Laguna Botos entre bosque nuboso con colibríes, tucanes y quetzales, con acceso regulado y cierres temporales por gases.",
    "description_en": "Poas Volcano National Park, in Alajuela, protects about 65 square kilometers around the massif with a summit at 2,700 meters. Its main crater, about 290 meters wide, holds an acidic turquoise lagoon with frequent fumarolic activity, while Botos crater holds a cold green-water lake about 370 meters across, inactive for thousands of years. It has marked trails to the crater overlook and Botos Lagoon through cloud forest with hummingbirds, toucans and quetzals, with regulated access and temporary closures for gas.",
    "categories": [
      "Parques Nacionales",
      "Volcanes",
      "Miradores"
    ],
    "latitude": 10.198,
    "longitude": -84.233
  },
  {
    "match_name": "Parque Recreativo Universidad para la Paz - El Rodeo, Cantón de Mora",
    "match_ordinal": 1,
    "name": "Parque Recreativo Universidad para la Paz - El Rodeo Mora",
    "description_es": "El área recreativa y de bosque del campus de la Universidad para la Paz, en Ciudad Colón de Mora, abarca unas 303 hectáreas de bosque protegido colindante con la Zona Protectora El Rodeo. Combina instalaciones universitarias con senderos para caminata, miradores y quebradas entre bosque secundario y cafetal, con presencia de monos, perezosos, tucanes y mariposas. Es un espacio de uso diurno para caminatas suaves, observación de naturaleza y picnic, con ingreso controlado.",
    "description_en": "The recreation and forest area on the University for Peace campus, in Ciudad Colon, Mora, covers about 303 hectares of protected forest adjoining the El Rodeo Protected Zone. It combines university facilities with walking trails, viewpoints and streams through secondary forest and coffee groves, with monkeys, sloths, toucans and butterflies. It is a daytime-use space for easy walks, nature watching and picnics, with controlled entry.",
    "categories": [
      "Senderismo",
      "Reservas Silvestres",
      "Miradores"
    ],
    "latitude": 9.922,
    "longitude": -84.278
  },
  {
    "match_name": "Peñón de Guacalillo y Peñón de Tárcoles",
    "match_ordinal": 1,
    "name": "Peñón de Guacalillo y Peñón de Tárcoles",
    "description_es": "El Peñón de Guacalillo y el Peñón de Tárcoles son islotes rocosos frente a la costa de Tárcoles, en Garabito de Puntarenas, en el Pacífico Central. Se levantan sobre el oleaje como formaciones marinas con paredes verticales, rodeadas de mar abierto y visibles desde la playa y el mirador de la ruta costera. Son sitio de percha y anidación de aves marinas como pelícanos y fragatas, y un punto de referencia para fotografía de paisaje, pesca artesanal y paseos en bote.",
    "description_en": "Guacalillo Rock and Tarcoles Rock are rocky islets off the Tarcoles coast, in Garabito, Puntarenas, on the Central Pacific. They rise above the surf as sea stacks with steep walls, surrounded by open sea and visible from the beach and the coastal road overlook. They are perching and nesting sites for seabirds such as pelicans and frigatebirds, and a landmark for landscape photography, artisanal fishing and boat trips.",
    "categories": [
      "Miradores",
      "Playas",
      "Islas y Manglares"
    ],
    "latitude": 9.8195821,
    "longitude": -84.6625726
  },
  {
    "match_name": "Pico Blanco",
    "match_ordinal": 1,
    "name": "Pico Blanco",
    "description_es": "Pico Blanco es una de las cumbres principales de los Cerros de Escazú, al suroeste de San José, con una altitud de 2271 metros dentro de la Zona Protectora Cerros de Escazú. Se accede por senderos empinados entre bosque nuboso, robledales y potreros de altura, con tramos de roca expuesta cerca de la cima. Desde lo alto hay vista amplia del Valle Central, el Golfo de Nicoya en días despejados y las cumbres vecinas como Pico Alto y Cerro Rabo de Mico, en una ruta exigente para senderismo y trail.",
    "description_en": "Pico Blanco is one of the main summits of the Escazu Hills southwest of San Jose, at 2,271 meters within the Cerros de Escazu Protected Zone. It is reached by steep trails through cloud forest, oak stands and high pastures, with exposed rock near the top. From the summit there are broad views of the Central Valley, the Gulf of Nicoya on clear days and neighboring peaks such as Pico Alto and Rabo de Mico, on a demanding hiking and trail route.",
    "categories": [
      "Montañas y Cerros",
      "Senderismo",
      "Miradores"
    ],
    "latitude": 9.875717,
    "longitude": -84.141937
  },
  {
    "match_name": "Piedra de Fuego – Esparza, Puntarenas",
    "match_ordinal": 1,
    "name": "Piedra de Fuego – Esparza",
    "description_es": "Piedra de Fuego es un mirador natural sobre una formación rocosa en las partes altas de Esparza, Puntarenas. Se llega por camino rural y sendero corto entre potreros y parches de bosque seco, hasta una laja expuesta con vista panorámica de las llanuras, cerros y poblados del entorno. Es un punto abierto para caminata ligera, fotografía y atardeceres, sin servicios comerciales y con superficie irregular.",
    "description_en": "Piedra de Fuego is a natural viewpoint on a rock formation in the highlands of Esparza, Puntarenas. It is reached by rural road and a short trail through pasture and dry-forest patches to an exposed slab with panoramic views of surrounding plains, hills and villages. It is an open spot for light hiking, photography and sunsets, with no commercial services and uneven surfaces.",
    "categories": [
      "Miradores",
      "Montañas y Cerros"
    ],
    "latitude": 10.013,
    "longitude": -84.618
  },
  {
    "match_name": "Piedra del Minero – Aserrí ⛏️🌄",
    "match_ordinal": 1,
    "name": "Piedra del Minero – Aserrí",
    "description_es": "La Piedra del Minero es un mirador rocoso en las montañas de Aserrí, al sur de San José. Se accede por calle de lastre y sendero corto entre cafetales y bosque secundario hasta una roca con vista amplia del Valle Central y los cerros circundantes. Es una salida cercana para caminata suave, picnic y fotografía, con acceso rústico y sin servicios permanentes.",
    "description_en": "Piedra del Minero is a rocky viewpoint in the mountains of Aserri, south of San Jose. It is reached by gravel road and a short trail through coffee groves and secondary forest to a rock with broad views of the Central Valley and surrounding hills. It is a nearby outing for easy hiking, picnics and photography, with rustic access and no permanent services.",
    "categories": [
      "Miradores",
      "Senderismo"
    ],
    "latitude": 9.865,
    "longitude": -84.124
  },
  {
    "match_name": "Playa Agujas Norte",
    "match_ordinal": 1,
    "name": "Playa Agujas Norte",
    "description_es": "Playa Agujas Norte es una playa en el litoral de Santa Cruz, Guanacaste, en el Pacífico norte. Presenta franja arenosa con tramos rocosos que forman pozas intermareales con marea baja y oleaje variable según la época. Es un entorno natural con poco desarrollo, apto para caminatas costeras, baño con precaución y observación de atardeceres.",
    "description_en": "Playa Agujas Norte is a beach on the Santa Cruz shoreline, Guanacaste, on the North Pacific. It has a sandy strip with rocky sections forming intertidal pools at low tide and variable surf by season. It is a natural setting with little development, suited to coastal walks, cautious swimming and sunset watching.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.0267158,
    "longitude": -85.7369133
  },
  {
    "match_name": "Playa Bajo Grande",
    "match_ordinal": 1,
    "name": "Playa Bajo Grande",
    "description_es": "Playa Bajo Grande es una playa en la costa de Santa Cruz, Guanacaste. Es una franja costera de ambiente tranquilo y acceso por caminos rurales, con vegetación de bosque seco en el borde y oleaje del Pacífico norte. Es apta para caminatas, picnic y baño con precaución según marea y oleaje.",
    "description_en": "Playa Bajo Grande is a beach on the Santa Cruz coast, Guanacaste. It is a quiet coastal strip reached by rural roads, with dry-forest vegetation at the edge and North Pacific surf. It suits walks, picnics and cautious swimming depending on tide and surf.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.2654722,
    "longitude": -85.8516074
  },
  {
    "match_name": "Playa Balsal",
    "match_ordinal": 1,
    "name": "Playa Balsal",
    "description_es": "Playa Balsal es una playa extensa en el litoral de Parrita, Puntarenas, en el Pacífico Central. Es una playa abierta de oleaje enérgico, con franja arenosa amplia, línea de palmeras y cercanía de esteros y bosque costero. Es frecuentada para caminatas largas, pesca de orilla y surf en secciones con rompiente, con baño solo con precaución.",
    "description_en": "Playa Balsal is a long beach on the Parrita shoreline, Puntarenas, on the Central Pacific. It is an open beach with energetic surf, a wide sandy strip, palm line and nearby estuaries and coastal forest. It is used for long walks, shore fishing and surfing on breaking sections, with swimming only with caution.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.625954,
    "longitude": -84.6541854
  },
  {
    "match_name": "Playa Balsitas",
    "match_ordinal": 1,
    "name": "Playa Balsitas",
    "description_es": "Playa Balsitas es una pequeña playa en la costa de Cóbano, Puntarenas, en la Península de Nicoya. Es una cala de entorno boscoso con acceso por camino rural, de ambiente apartado y oleaje moderado del Pacífico. Es apta para baño con precaución, caminatas y observación de naturaleza.",
    "description_en": "Playa Balsitas is a small beach on the Cobano coast, Puntarenas, on the Nicoya Peninsula. It is a forested cove reached by rural road, with a secluded atmosphere and moderate Pacific surf. It suits cautious swimming, walks and nature watching.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.571,
    "longitude": -85.105
  },
  {
    "match_name": "Playa Barrigona (Cóbano)",
    "match_ordinal": 1,
    "name": "Playa Barrigona (Cóbano)",
    "description_es": "Playa Barrigona, en la costa de Cóbano de Puntarenas, es una cala de la Península de Nicoya rodeada de vegetación tropical y colinas boscosas. Tiene arena clara y aguas de tono verde-turquesa, generalmente tranquilas para natación y snorkel con marea adecuada, además de sombra natural al borde de la playa. Se accede por caminos rurales y es un punto apartado para baño, picnic y atardeceres.",
    "description_en": "Playa Barrigona, on the Cobano coast of Puntarenas, is a cove on the Nicoya Peninsula ringed by tropical vegetation and forested hills. It has light sand and green-turquoise waters, usually calm for swimming and snorkeling at suitable tides, plus natural shade at the beach edge. It is reached by rural roads and is a secluded spot for swimming, picnics and sunsets.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.9373364,
    "longitude": -84.9176969
  },
  {
    "match_name": "Playa Barrigona (Sámara)",
    "match_ordinal": 1,
    "name": "Playa Barrigona (Sámara)",
    "description_es": "Playa Barrigona, en el sector de Sámara de Nicoya, Guanacaste, es una playa del Pacífico norte con franja arenosa, borde de vegetación costera y oleaje moderado. Es de ambiente tranquilo y acceso rural, apta para baño con precaución, caminatas playeras y observación de fauna costera. En marea baja expone sectores rocosos con pozas intermareales.",
    "description_en": "Playa Barrigona, in the Samara area of Nicoya, Guanacaste, is a North Pacific beach with a sandy strip, coastal vegetation edge and moderate surf. It has a quiet atmosphere and rural access, suited to cautious swimming, beach walks and coastal wildlife watching. At low tide it exposes rocky sections with intertidal pools.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.8823515,
    "longitude": -85.5764406
  },
  {
    "match_name": "Playa Biesanz",
    "match_ordinal": 1,
    "name": "Playa Biesanz",
    "description_es": "Playa Biesanz, en Manuel Antonio de Quepos, es una pequeña cala boscosa al este de Punta Catedral, fuera del límite principal del parque nacional. Se accede por un sendero corto entre bosque húmedo con presencia de monos, mapaches e iguanas, hasta una bahía protegida de aguas generalmente calmas. Es apta para natación, snorkel y kayak con marea adecuada, con sombra natural y espacio reducido en marea alta.",
    "description_en": "Playa Biesanz, in Manuel Antonio, Quepos, is a small forested cove east of Punta Catedral, outside the main national park boundary. It is reached by a short trail through humid forest with monkeys, raccoons and iguanas to a sheltered bay of usually calm waters. It suits swimming, snorkeling and kayaking at suitable tides, with natural shade and limited space at high tide.",
    "categories": [
      "Playas",
      "Aventura y Deportes"
    ],
    "latitude": 9.553904,
    "longitude": -83.86586
  },
  {
    "match_name": "Playa Bochinche",
    "match_ordinal": 1,
    "name": "Playa Bochinche",
    "description_es": "Playa Bochinche es una playa en el litoral de Tárcoles, en Garabito de Puntarenas. Es una franja costera cercana a manglares y desembocaduras, con arena oscura, troncos a la orilla y oleaje del Pacífico Central. Es un entorno natural poco desarrollado, apto para caminatas, fotografía y observación de aves costeras.",
    "description_en": "Playa Bochinche is a beach on the Tarcoles shoreline, in Garabito, Puntarenas. It is a coastal strip near mangroves and river mouths, with dark sand, driftwood on the shore and Central Pacific surf. It is an undeveloped natural setting suited to walks, photography and coastal birdwatching.",
    "categories": [
      "Playas",
      "Islas y Manglares"
    ],
    "latitude": 9.7318429,
    "longitude": -84.6437868
  },
  {
    "match_name": "Playa Bonita (Limón)",
    "match_ordinal": 1,
    "name": "Playa Bonita (Limón)",
    "description_es": "Playa Bonita, al norte del centro de Limón, es una playa caribeña de arena oscura con oleaje consistente usado para surf y bodyboard. Tiene frente a la costa la Isla Uvita y borde de palmeras y almendros de playa, con áreas abiertas para picnic y caminatas. El baño requiere precaución por corrientes y rompiente fuerte.",
    "description_en": "Playa Bonita, north of downtown Limon, is a Caribbean beach of dark sand with consistent surf used for surfing and bodyboarding. It faces Uvita Island offshore and has a fringe of palms and beach almond trees, with open areas for picnics and walks. Swimming requires caution for currents and strong break.",
    "categories": [
      "Playas",
      "Aventura y Deportes"
    ],
    "latitude": 10.0098609,
    "longitude": -83.0634597
  },
  {
    "match_name": "Playa Cabuyal",
    "match_ordinal": 1,
    "name": "Playa Cabuyal",
    "description_es": "Playa Cabuyal es una bahía amplia en la Península de Papagayo, en Liberia, Guanacaste, rodeada de bosque seco y cerros. Tiene franja arenosa extensa, oleaje moderado y áreas de sombra natural, con zona autorizada para acampar y acceso por camino de lastre. Es apta para natación con precaución, snorkel con buena visibilidad estacional, caminatas y campamento.",
    "description_en": "Playa Cabuyal is a wide bay on the Papagayo Peninsula, in Liberia, Guanacaste, framed by dry forest and hills. It has a long sandy strip, moderate surf and natural shade areas, with a designated camping zone and gravel-road access. It suits cautious swimming, snorkeling with good seasonal visibility, walks and camping.",
    "categories": [
      "Playas",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.6755463,
    "longitude": -85.6531442
  },
  {
    "match_name": "Playa Camarita",
    "match_ordinal": 1,
    "name": "Playa Camarita",
    "description_es": "Playa Camarita es una playa en la costa de Nandayure, Guanacaste, hacia el interior del Golfo de Nicoya. Es una franja de oleaje suave por su posición protegida, con borde de manglar y vegetación costera y ambiente rural tranquilo. Es apta para baño con precaución, caminatas, pesca artesanal y paseos en kayak.",
    "description_en": "Playa Camarita is a beach on the Nandayure coast, Guanacaste, toward the inner Gulf of Nicoya. It is a gentle-surf strip in a sheltered position, with mangrove fringe and coastal vegetation and a quiet rural atmosphere. It suits cautious swimming, walks, artisanal fishing and kayak trips.",
    "categories": [
      "Playas",
      "Islas y Manglares"
    ],
    "latitude": 10.116045,
    "longitude": -85.0114448
  },
  {
    "match_name": "Playa Carmen",
    "match_ordinal": 1,
    "name": "Playa Carmen",
    "description_es": "Playa Carmen, en Santa Teresa de Cóbano, es una playa extensa de la Península de Nicoya con rompiente consistente para surf de distintos niveles. Combina franja arenosa amplia, atardeceres sobre el Pacífico y un borde costero con hospedajes, restaurantes y escuelas de surf. Es apta para surf, clases, caminatas y baño con precaución según oleaje y corrientes.",
    "description_en": "Playa Carmen, in Santa Teresa, Cobano, is a long beach on the Nicoya Peninsula with consistent breaks for different surf levels. It combines a wide sandy strip, Pacific sunsets and a shoreline with lodging, restaurants and surf schools. It suits surfing, lessons, walks and cautious swimming depending on surf and currents.",
    "categories": [
      "Playas",
      "Aventura y Deportes"
    ],
    "latitude": 9.6255215,
    "longitude": -85.1514938
  },
  {
    "match_name": "Playa Carrillo",
    "match_ordinal": 1,
    "name": "Playa Carrillo",
    "description_es": "Playa Carrillo, en Hojancha de Guanacaste, es una bahía en forma de herradura con arena clara, aguas generalmente calmas de tono turquesa y borde de palmeras. Cuenta con reconocimiento de Bandera Azul por limpieza y gestión ambiental, además de áreas para picnic, juegos y caminatas al mirador del sector. Es apta para natación, snorkel con marea adecuada, kayak y paseos en bote.",
    "description_en": "Playa Carrillo, in Hojancha, Guanacaste, is a horseshoe bay with light sand, usually calm turquoise waters and a palm fringe. It holds Blue Flag recognition for cleanliness and environmental management, plus picnic, play and viewpoint-walk areas. It suits swimming, snorkeling at suitable tides, kayaking and boat rides.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.8681,
    "longitude": -85.4858
  },
  {
    "match_name": "Playa Chiquita",
    "match_ordinal": 1,
    "name": "Playa Chiquita",
    "description_es": "Playa Chiquita, al sur de Puerto Viejo en Talamanca de Limón, es una playa caribeña bordeada de bosque costero y palmeras. Presenta arrecife coralino cercano a la orilla con condiciones para snorkel con mar calmo, además de tramos arenosos para baño con precaución. Es un punto tranquilo para caminatas playeras, ciclismo costero y observación de perezosos, tucanes y vida marina.",
    "description_en": "Playa Chiquita, south of Puerto Viejo in Talamanca, Limon, is a Caribbean beach edged by coastal forest and palms. It has a coral reef close to shore with snorkeling conditions when the sea is calm, plus sandy stretches for cautious swimming. It is a quiet spot for beach walks, coastal biking and sightings of sloths, toucans and marine life.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.6414105,
    "longitude": -82.7109576
  },
  {
    "match_name": "Playa Conejera - Guanacaste",
    "match_ordinal": 1,
    "name": "Playa Conejera - Guanacaste",
    "description_es": "Playa Conejera es una pequeña playa insular en el sector de Brasilito, en Santa Cruz de Guanacaste. Se accede en bote o kayak desde la costa, con franja arenosa reducida, aguas claras y entorno de bosque seco. Es apta para natación con precaución, snorkel y picnic, sin servicios permanentes.",
    "description_en": "Playa Conejera is a small island beach in the Brasilito area, Santa Cruz, Guanacaste. It is reached by boat or kayak from the coast, with a narrow sandy strip, clear waters and dry-forest surroundings. It suits cautious swimming, snorkeling and picnics, with no permanent services.",
    "categories": [
      "Playas",
      "Islas y Manglares"
    ],
    "latitude": 10.6267399,
    "longitude": -85.4436706
  },
  {
    "match_name": "Playa Coyotera",
    "match_ordinal": 1,
    "name": "Playa Coyotera",
    "description_es": "Playa Coyotera es una playa en la costa de La Cruz, Guanacaste, frente al sector de islas e islotes del Golfo de Santa Elena. Es una franja de oleaje suave con vista a formaciones insulares, borde de bosque seco y ambiente rural apartado. Es apta para baño con precaución, caminatas, pesca de orilla y paseos en bote.",
    "description_en": "Playa Coyotera is a beach on the La Cruz coast, Guanacaste, facing the islands and islets of the Santa Elena Gulf sector. It is a gentle-surf strip with views of island formations, dry-forest edge and a secluded rural atmosphere. It suits cautious swimming, walks, shore fishing and boat trips.",
    "categories": [
      "Playas",
      "Islas y Manglares"
    ],
    "latitude": 11.0298546,
    "longitude": -85.7165893
  },
  {
    "match_name": "Playa Cuevas",
    "match_ordinal": 1,
    "name": "Playa Cuevas",
    "description_es": "Playa Cuevas es una playa en el sector de Malpaís de Cóbano, en la Península de Nicoya. Presenta formaciones rocosas y pequeñas cuevas intermareales que se exploran con marea baja, además de franja arenosa y rompiente para surf. Es un entorno natural para caminatas costeras, fotografía, atardeceres y baño solo con precaución.",
    "description_en": "Playa Cuevas is a beach in the Malpais area of Cobano, on the Nicoya Peninsula. It has rock formations and small intertidal caves explored at low tide, plus a sandy strip and surf break. It is a natural setting for coastal walks, photography, sunsets and swimming only with caution.",
    "categories": [
      "Playas",
      "Aventura y Deportes"
    ],
    "latitude": 9.5942361,
    "longitude": -85.1429154
  },
  {
    "match_name": "Playa Dominical",
    "match_ordinal": 1,
    "name": "Playa Dominical",
    "description_es": "Playa Dominical, en Barú de Puntarenas, es una playa extensa del Pacífico sur con rompiente fuerte y consistente, reconocida para surf de nivel intermedio y avanzado. Tiene desembocadura del Río Barú, borde de almendros de playa y un poblado cercano con hospedajes y restaurantes. El baño requiere precaución por corrientes de resaca y oleaje potente, y es punto para clases de surf, torneos y avistamiento estacional de ballenas mar adentro.",
    "description_en": "Playa Dominical, in Baru, Puntarenas, is a long South Pacific beach with strong consistent break, known for intermediate and advanced surfing. It has the Baru River mouth, beach-almond fringe and a nearby village with lodging and restaurants. Swimming needs caution for rip currents and powerful surf, and it is a base for surf lessons, contests and seasonal offshore whale watching.",
    "categories": [
      "Playas",
      "Aventura y Deportes"
    ],
    "latitude": 9.2502909,
    "longitude": -83.8627532
  },
  {
    "match_name": "Playa Dominicalito",
    "match_ordinal": 1,
    "name": "Playa Dominicalito",
    "description_es": "Playa Dominicalito es una bahía pequeña al sur de Playa Dominical, en Osa de Puntarenas. Por su forma protegida presenta aguas más tranquilas que la playa vecina, con franja arenosa, sectores rocosos y borde de vegetación costera. Es apta para natación con precaución, snorkel con buena visibilidad, kayak, stand up paddle y salidas en bote, con acceso por camino costero.",
    "description_en": "Playa Dominicalito is a small bay south of Playa Dominical, in Osa, Puntarenas. Its sheltered shape gives calmer waters than the neighboring beach, with a sandy strip, rocky sections and coastal vegetation edge. It suits cautious swimming, snorkeling with good visibility, kayaking, stand-up paddling and boat departures, reached by coastal road.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.2344184,
    "longitude": -83.8429333
  },
  {
    "match_name": "Playa Doña Ana",
    "match_ordinal": 1,
    "name": "Playa Doña Ana",
    "description_es": "Playa Doña Ana, junto a la carretera hacia Caldera en el Pacífico central, es una pequeña bahía encajada entre puntas rocosas con mirador hacia el mar, de arena oscura y oleaje generalmente moderado, frecuentada para baño, picnic de fin de semana y pesca de orilla, con atardeceres abiertos al Golfo de Nicoya.",
    "description_en": "Playa Dona Ana, beside the road toward Caldera on the central Pacific, is a small bay set between rocky points with a sea viewpoint, with dark sand and generally moderate surf, popular for swimming, weekend picnics and shore fishing, with open sunsets over the Gulf of Nicoya.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.9563272,
    "longitude": -84.7390864
  },
  {
    "match_name": "Playa Escondida (Jacó)",
    "match_ordinal": 1,
    "name": "Playa Escondida (Jacó)",
    "description_es": "Playa Escondida, en el litoral rocoso al norte de Jacó, es una cala pequeña entre rocas a la que se llega por sendero corto y tramos de roca, para visita en marea baja, con poza y arena gruesa, oleaje variable y entorno de bosque seco, apta para caminata costera y descanso sin servicios.",
    "description_en": "Playa Escondida, on the rocky shore north of Jaco, is a small cove between rocks reached by a short trail and rock sections, best visited at low tide, with a cove pool and coarse sand, variable surf and dry-forest surroundings, suited to coastal walking and rest with no services.",
    "categories": [
      "Playas",
      "Senderismo"
    ],
    "latitude": 9.6230496,
    "longitude": -84.6428834
  },
  {
    "match_name": "Playa Escondida (La Cruz)",
    "match_ordinal": 1,
    "name": "Playa Escondida (La Cruz)",
    "description_es": "Playa Escondida, en la costa de La Cruz en Guanacaste norte, es una playa agreste y poco visitada entre vegetación de bosque seco, de arena clara y oleaje abierto del Pacífico, con acceso por camino rural, para caminata, observación de naturaleza y baño con precaución por corrientes.",
    "description_en": "Playa Escondida, on the La Cruz coast in northern Guanacaste, is a wild little-visited beach backed by dry-forest vegetation, with light sand and open Pacific surf, reached by rural road, for walking, nature watching and swimming with caution because of currents.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.9860849,
    "longitude": -85.6998969
  },
  {
    "match_name": "Playa Espadilla (Quepos)",
    "match_ordinal": 1,
    "name": "Playa Espadilla (Quepos)",
    "description_es": "Playa Espadilla, al norte de la entrada del Parque Nacional Manuel Antonio en Quepos, es una playa extensa de arena gris frente a hoteles y restaurantes, con oleaje abierto para surf y zonas para baño con precaución, desembocadura cercana y vistas a islas rocosas, muy frecuentada al atardecer.",
    "description_en": "Playa Espadilla, north of the Manuel Antonio National Park entrance in Quepos, is a long gray-sand beach lined by hotels and restaurants, with open surf for surfing and swimming areas to be used with caution, a nearby river mouth and views of rocky islets, very busy at sunset.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.3926157,
    "longitude": -84.1519766
  },
  {
    "match_name": "Playa Espadilla Sur",
    "match_ordinal": 1,
    "name": "Playa Espadilla Sur",
    "description_es": "Playa Espadilla Sur, dentro del Parque Nacional Manuel Antonio, es una playa de arena clara unida a Playa Manuel Antonio por el tómbolo de Punta Catedral, con pozas de marea para snorkel, senderos accesibles al mirador, bosque húmedo con monos, perezosos e iguanas, y corrientes de resaca que exigen precaución.",
    "description_en": "Playa Espadilla Sur, inside Manuel Antonio National Park, is a light-sand beach joined to Manuel Antonio Beach by the Punta Catedral tombolo, with tide pools for snorkeling, accessible trails to the viewpoint, humid forest with monkeys, sloths and iguanas, and rip currents that require caution.",
    "categories": [
      "Playas",
      "Parques Nacionales",
      "Senderismo"
    ],
    "latitude": 9.3839353,
    "longitude": -84.1460104
  },
  {
    "match_name": "Playa Esterillos (Oeste, Centro, Este)",
    "match_ordinal": 1,
    "name": "Playa Esterillos (Oeste, Centro, Este)",
    "description_es": "Playa Esterillos, en Parrita en el Pacífico central, reúne los sectores Oeste, Centro y Este en una franja larga de arena oscura con palmeras, oleaje para surf y pozas de marea con rocas en marea baja, para caminatas extensas, pesca de orilla y atardeceres, con accesos y sodas en los pueblos costeros.",
    "description_en": "Playa Esterillos, in Parrita on the central Pacific, groups the West, Center and East sectors along a long dark-sand strip with palms, surf breaks and rocky tide pools at low tide, for long walks, shore fishing and sunsets, with accesses and small eateries in the coastal villages.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.5267392,
    "longitude": -84.5022506
  },
  {
    "match_name": "Playa Flamingo",
    "match_ordinal": 1,
    "name": "Playa Flamingo",
    "description_es": "Playa Flamingo, en Santa Cruz de Guanacaste, es una bahía de arena clara y agua transparente con marina cercana, de oleaje moderado para natación, paseos en bote, pesca deportiva y buceo, rodeada de hoteles y restaurantes y conocida por atardeceres amplios sobre el Pacífico norte.",
    "description_en": "Playa Flamingo, in Santa Cruz, Guanacaste, is a light-sand bay with clear water and a nearby marina, with moderate surf for swimming, boat trips, sport fishing and diving, lined by hotels and restaurants and known for broad sunsets over the northern Pacific.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.4389,
    "longitude": -85.7892
  },
  {
    "match_name": "Playa Frijolar",
    "match_ordinal": 1,
    "name": "Playa Frijolar",
    "description_es": "Playa Frijolar, junto a Junquillal en Santa Cruz de Guanacaste, es una playa tranquila de arena gris entre rocas y vegetación de bosque seco, con oleaje abierto para surf y sectores para caminata y baño con precaución, sin desarrollo intensivo y con ambiente para observación de aves y atardeceres.",
    "description_en": "Playa Frijolar, next to Junquillal in Santa Cruz, Guanacaste, is a quiet gray-sand beach between rocks and dry-forest vegetation, with open surf for surfing and areas for walking and swimming with caution, without intensive development and with a setting for birdwatching and sunsets.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.0856047,
    "longitude": -85.7788106
  },
  {
    "match_name": "PLAYA GRANDE & MINAS",
    "match_ordinal": 1,
    "name": "PLAYA GRANDE & MINAS",
    "description_es": "Playa Grande, dentro del Parque Nacional Marino Las Baulas en Santa Cruz de Guanacaste, es una playa extensa de arena clara y principal sitio de anidación de tortuga baula en el Pacífico americano entre octubre y mayo, con rompientes para surf, estero de Tamarindo y manglares en la desembocadura, y bosque con aves.",
    "description_en": "Playa Grande, inside Las Baulas Marine National Park in Santa Cruz, Guanacaste, is a long light-sand beach and a major leatherback turtle nesting site on the American Pacific between October and May, with surf breaks, the Tamarindo estuary and mangroves at the river mouth, and bird-rich forest.",
    "categories": [
      "Playas",
      "Parques Nacionales",
      "Islas y Manglares"
    ],
    "latitude": 10.314,
    "longitude": -85.833
  },
  {
    "match_name": "Playa Gringos",
    "match_ordinal": 1,
    "name": "Playa Gringos",
    "description_es": "Playa Gringos, en Bahía Salinas de La Cruz, es una playa abierta y ventosa de arena clara entre puntas rocosas, con oleaje y viento constante para windsurf y kitesurf, para caminata costera y pesca, con corrientes y oleaje que piden precaución para el baño y vistas amplias a la bahía.",
    "description_en": "Playa Gringos, in Salinas Bay, La Cruz, is an open windy light-sand beach between rocky points, with steady surf and wind for windsurfing and kitesurfing, for coastal walking and fishing, with currents and surf that call for caution when swimming and broad views over the bay.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.9105564,
    "longitude": -85.899811
  },
  {
    "match_name": "Playa Guarumo",
    "match_ordinal": 1,
    "name": "Playa Guarumo",
    "description_es": "Playa Guarumo, también en Bahía Salinas, es una cala pequeña de arena y roca entre vegetación seca, con oleaje moderado a fuerte según la época, frecuentada para pesca de orilla, caminata y descanso, con acceso rural y ambiente agreste sin servicios permanentes.",
    "description_en": "Playa Guarumo, also in Salinas Bay, is a small sand-and-rock cove backed by dry vegetation, with moderate to strong surf depending on the season, used for shore fishing, walking and rest, with rural access and a wild setting with no permanent services.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.8985674,
    "longitude": -85.916033
  },
  {
    "match_name": "Playa Hermosa (Cóbano)",
    "match_ordinal": 1,
    "name": "Playa Hermosa (Cóbano)",
    "description_es": "Playa Hermosa, al norte de Santa Teresa en Cóbano de Puntarenas, es una franja abierta de arena gris entre bosque, con rompientes para surf y corrientes que exigen precaución para el baño, para caminatas largas, pesca y atardeceres, con accesos desde la ruta costera y lodges cercanos.",
    "description_en": "Playa Hermosa, north of Santa Teresa in Cobano, Puntarenas, is an open gray-sand strip backed by forest, with surf breaks and currents that require caution for swimming, for long walks, fishing and sunsets, with accesses from the coastal route and nearby lodges.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.6662298,
    "longitude": -85.1924656
  },
  {
    "match_name": "Playa Hermosa (Jacó - Surf)",
    "match_ordinal": 1,
    "name": "Playa Hermosa (Jacó - Surf)",
    "description_es": "Playa Hermosa, al sur de Jacó en Garabito, es una playa de arena oscura con rompiente de fondo arenoso constante para surfistas experimentados y sede de competencias, con corrientes fuertes no apta para baño recreativo general, para caminata en orilla y clases en sectores señalizados con precaución.",
    "description_en": "Playa Hermosa, south of Jaco in Garabito, is a dark-sand beach with a consistent sandy beach break for experienced surfers and a venue for competitions, with strong currents not suited to general recreational swimming, for shoreline walking and lessons in marked sectors with caution.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.5740991,
    "longitude": -84.6034681
  },
  {
    "match_name": "Playa Herradura",
    "match_ordinal": 1,
    "name": "Playa Herradura",
    "description_es": "Playa Herradura, en la bahía protegida al norte de Jacó, es una playa de arena oscura y oleaje suave con marina, para natación, stand up paddle, kayak, paseos en bote y pesca deportiva, rodeada de hoteles y restaurantes y punto de salida hacia Isla Tortuga y el Golfo de Nicoya.",
    "description_en": "Playa Herradura, in the sheltered bay north of Jaco, is a dark-sand beach with gentle surf and a marina, for swimming, stand-up paddleboarding, kayaking, boat tours and sport fishing, lined by hotels and restaurants and a departure point toward Tortuga Island and the Gulf of Nicoya.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.6511798,
    "longitude": -84.6600503
  },
  {
    "match_name": "Playa Icaco",
    "match_ordinal": 1,
    "name": "Playa Icaco",
    "description_es": "Playa Icaco, en la zona de Paquera y Curú en el Golfo de Nicoya, es una playa pequeña de arena y concha con aguas calmadas, para natación, kayak y paddle, bordeada de vegetación costera con aves y cangrejos, con acceso por camino rural y en bote, para visita tranquila de día.",
    "description_en": "Playa Icaco, in the Paquera and Curu area in the Gulf of Nicoya, is a small sand-and-shell beach with calm waters, for swimming, kayaking and paddleboarding, fringed by coastal vegetation with birds and crabs, reached by rural road and by boat, for a quiet day visit.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.8890558,
    "longitude": -84.7241677
  },
  {
    "match_name": "Playa Iguanita",
    "match_ordinal": 1,
    "name": "Playa Iguanita",
    "description_es": "Playa Iguanita, en Bahía Culebra de Papagayo en Guanacaste, es una cala protegida de arena clara con manglar y estero en su borde, de aguas tranquilas para natación, kayak y snorkel, rodeada de bosque seco con iguanas, monos y aves, con acceso por camino de tierra y en bote.",
    "description_en": "Playa Iguanita, in Culebra Bay, Papagayo, Guanacaste, is a sheltered light-sand cove with mangrove and estuary at its edge, with calm waters for swimming, kayaking and snorkeling, surrounded by dry forest with iguanas, monkeys and birds, reached by dirt road and by boat.",
    "categories": [
      "Playas",
      "Islas y Manglares"
    ],
    "latitude": 10.6322182,
    "longitude": -85.6310034
  },
  {
    "match_name": "Playa Isidora",
    "match_ordinal": 1,
    "name": "Playa Isidora",
    "description_es": "Playa Isidora, en la zona de Drake en Osa, es una playa agreste bordeada de selva lluviosa, de arena oscura y oleaje abierto, para caminata costera, observación de fauna y descanso, con acceso principalmente en bote o por senderos y mar que exige precaución para el baño.",
    "description_en": "Playa Isidora, in the Drake area of Osa, is a wild beach backed by rainforest, with dark sand and open surf, for coastal walking, wildlife watching and rest, reached mainly by boat or trails, with a sea that calls for caution when swimming.",
    "categories": [
      "Playas"
    ],
    "latitude": 8.7242158,
    "longitude": -83.4670078
  },
  {
    "match_name": "Playa Jacó",
    "match_ordinal": 1,
    "name": "Playa Jacó",
    "description_es": "Playa Jacó, en Garabito de Puntarenas, es una playa urbana de unos 4 km de arena oscura para surf de varios niveles con escuelas y alquiler, con paseo costero de restaurantes, bares y vida nocturna, oleaje con corrientes para baño con precaución y base para tours a Carara, Herradura y Manuel Antonio.",
    "description_en": "Playa Jaco, in Garabito, Puntarenas, is an urban beach of about 4 km of dark sand for multi-level surfing with schools and rentals, with a beachfront strip of restaurants, bars and nightlife, surf with currents for swimming with caution, and a base for tours to Carara, Herradura and Manuel Antonio.",
    "categories": [
      "Playas",
      "Vida Nocturna"
    ],
    "latitude": 9.6093133,
    "longitude": -84.6267353
  },
  {
    "match_name": "Playa Lagartillo",
    "match_ordinal": 1,
    "name": "Playa Lagartillo",
    "description_es": "Playa Lagartillo, al sur de Tamarindo en Santa Cruz, es una media luna de arena gris entre puntas rocosas con rompiente moderada para surf, pozas de marea y sectores para natación con precaución, para caminata, pesca y atardeceres, con accesos vecinales y sodas cercanas.",
    "description_en": "Playa Lagartillo, south of Tamarindo in Santa Cruz, is a gray-sand crescent between rocky points with a moderate break for surfing, tide pools and areas for swimming with caution, for walking, fishing and sunsets, with neighborhood accesses and nearby eateries.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.214954,
    "longitude": -85.8357414
  },
  {
    "match_name": "Playa Macha",
    "match_ordinal": 1,
    "name": "Playa Macha",
    "description_es": "Playa Macha, en el litoral de Manuel Antonio en Quepos, es una cala pequeña entre rocas y bosque a la que se llega por sendero costero y rocas en marea baja, con arena gruesa y oleaje variable, para caminata, fotografía y baño breve con precaución, sin servicios y con fauna de bosque húmedo.",
    "description_en": "Playa Macha, on the Manuel Antonio shore in Quepos, is a small cove between rocks and forest reached by a coastal trail and rocks at low tide, with coarse sand and variable surf, for walking, photography and brief swimming with caution, with no services and humid-forest wildlife.",
    "categories": [
      "Playas",
      "Senderismo"
    ],
    "latitude": 9.415768,
    "longitude": -84.1646469
  },
  {
    "match_name": "Playa Malpaís",
    "match_ordinal": 1,
    "name": "Playa Malpaís",
    "description_es": "Playa Malpaís, en el extremo de Cóbano en la Península de Nicoya, es una playa extensa de arena y roca con rompientes para surf y flota de pesca artesanal, con corrientes y oleaje abierto para baño con precaución, para caminatas, pesca y atardeceres frente al mar abierto.",
    "description_en": "Playa Malpais, at the tip of Cobano on the Nicoya Peninsula, is a long sand-and-rock beach with surf breaks and an artisanal fishing fleet, with currents and open surf for swimming with caution, for walks, fishing and sunsets over the open sea.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.600274,
    "longitude": -85.1424544
  },
  {
    "match_name": "Playa Mansita",
    "match_ordinal": 1,
    "name": "Playa Mansita",
    "description_es": "Playa Mansita, junto a Tamarindo en Santa Cruz, es una cala pequeña de arena gris y oleaje suave a moderado, para natación con precaución, surf de iniciación, paddle y kayak, para caminata entre rocas en marea baja y atardeceres, con hoteles y restaurantes cercanos.",
    "description_en": "Playa Mansita, next to Tamarindo in Santa Cruz, is a small gray-sand cove with gentle to moderate surf, for swimming with caution, beginner surfing, paddleboarding and kayaking, for walking among rocks at low tide and sunsets, with nearby hotels and restaurants.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.244751,
    "longitude": -85.8470989
  },
  {
    "match_name": "Playa Mariquita",
    "match_ordinal": 1,
    "name": "Playa Mariquita",
    "description_es": "Playa Mariquita, en el Golfo de Papagayo en Guanacaste, es una cala pequeña y protegida de arena clara entre bosque seco, de aguas tranquilas para natación, snorkel y kayak, con acceso por tierra y en bote, para visita tranquila y observación de aves y fauna costera.",
    "description_en": "Playa Mariquita, in the Gulf of Papagayo, Guanacaste, is a small sheltered light-sand cove backed by dry forest, with calm waters for swimming, snorkeling and kayaking, reached by land and by boat, for a quiet visit and coastal bird and wildlife watching.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.852946,
    "longitude": -85.8246662
  },
  {
    "match_name": "Playa Matapalo (Dominical)",
    "match_ordinal": 1,
    "name": "Playa Matapalo (Dominical)",
    "description_es": "Playa Matapalo, al sur de Dominical en el Pacífico sur, es una playa larga de arena oscura con desembocadura y oleaje potente para surfistas experimentados, con corrientes y fauna de estero que exigen precaución para el baño, para caminata, pesca de orilla y atardeceres sin desarrollo intensivo.",
    "description_en": "Playa Matapalo, south of Dominical on the southern Pacific, is a long dark-sand beach with a river mouth and powerful surf for experienced surfers, with currents and estuary wildlife that call for caution when swimming, for walking, shore fishing and sunsets without intensive development.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.3256093,
    "longitude": -83.9751251
  },
  {
    "match_name": "Playa Monte del Barco",
    "match_ordinal": 1,
    "name": "Playa Monte del Barco",
    "description_es": "Playa Monte del Barco, en la Península de Papagayo en Guanacaste, es una playa pequeña de arena clara entre rocas y bosque seco, de aguas protegidas para natación, snorkel y kayak, con acceso por sendero y en bote, para descanso y paseos costeros en entorno poco desarrollado.",
    "description_en": "Playa Monte del Barco, on the Papagayo Peninsula in Guanacaste, is a small light-sand beach between rocks and dry forest, with sheltered waters for swimming, snorkeling and kayaking, reached by trail and by boat, for rest and coastal walks in a little-developed setting.",
    "categories": [
      "Playas",
      "Senderismo"
    ],
    "latitude": 10.6085465,
    "longitude": -85.6410551
  },
  {
    "match_name": "Playa Montezuma",
    "match_ordinal": 1,
    "name": "Playa Montezuma",
    "description_es": "Playa Montezuma, frente al pueblo del mismo nombre en el sur de Nicoya, es una playa de arena mixta entre rocas con sectores para baño en marea baja, para caminata a calas vecinas, snorkel con buena visibilidad y base para visitar cataratas cercanas y la Reserva Cabo Blanco, con restaurantes y hospedajes en el pueblo.",
    "description_en": "Playa Montezuma, in front of the town of the same name in southern Nicoya, is a mixed-sand beach among rocks with swimming areas at low tide, for walks to nearby coves, snorkeling in good visibility and as a base for visiting nearby waterfalls and the Cabo Blanco Reserve, with restaurants and lodgings in town.",
    "categories": [
      "Playas",
      "Senderismo"
    ],
    "latitude": 9.6566007,
    "longitude": -85.0652953
  },
  {
    "match_name": "Playa Morros",
    "match_ordinal": 1,
    "name": "Playa Morros",
    "description_es": "Playa Morros, en Bahía Salinas de La Cruz, es una playa rocosa y ventosa junto a morros costeros, con oleaje y viento para caminata, fotografía y pesca de orilla más que para baño, en entorno agreste de bosque seco con vistas amplias a la bahía y a islas cercanas.",
    "description_en": "Playa Morros, in Salinas Bay, La Cruz, is a rocky windy beach beside coastal morros, with surf and wind suited to walking, photography and shore fishing rather than swimming, in a wild dry-forest setting with broad views over the bay and nearby islands.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.9091236,
    "longitude": -85.9071495
  },
  {
    "match_name": "Playa Mostrencal",
    "match_ordinal": 1,
    "name": "Playa Mostrencal",
    "description_es": "Playa Mostrencal, en la costa de La Cruz en Guanacaste norte, es una playa agreste de arena clara entre vegetación seca y rocas, con oleaje abierto y acceso por camino rural, para caminata, observación de naturaleza y pesca, con baño solo con precaución por corrientes y sin servicios.",
    "description_en": "Playa Mostrencal, on the La Cruz coast in northern Guanacaste, is a wild light-sand beach between dry vegetation and rocks, with open surf and access by rural road, for walking, nature watching and fishing, with swimming only with caution because of currents and no services.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.9952175,
    "longitude": -85.7092528
  },
  {
    "match_name": "Playa Muertos",
    "match_ordinal": 1,
    "name": "Playa Muertos",
    "description_es": "Playa Muertos, en la zona de Paquera en el Golfo de Nicoya, es una playa pequeña de arena y concha con aguas calmadas del golfo, para natación, kayak y descanso, bordeada de vegetación costera y con ambiente de pesca artesanal, con acceso por camino rural y en bote.",
    "description_en": "Playa Muertos, in the Paquera area in the Gulf of Nicoya, is a small sand-and-shell beach with calm gulf waters, for swimming, kayaking and rest, fringed by coastal vegetation and with an artisanal-fishing atmosphere, reached by rural road and by boat.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.7450282,
    "longitude": -84.9876129
  },
  {
    "match_name": "Playa Nance",
    "match_ordinal": 1,
    "name": "Playa Nance",
    "description_es": "Playa Nance, en la costa protegida de Santa Rosa en Guanacaste norte, es una playa agreste de arena clara entre bosque seco, con anidación estacional de tortugas marinas y acceso limitado por conservación, para caminata controlada, observación de fauna y baño con precaución por oleaje abierto.",
    "description_en": "Playa Nance, on the protected Santa Rosa coast in northern Guanacaste, is a wild light-sand beach backed by dry forest, with seasonal sea-turtle nesting and limited access for conservation, for controlled walking, wildlife watching and swimming with caution because of open surf.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.8030291,
    "longitude": -85.6990234
  },
  {
    "match_name": "PLAYA PANAMÁ - GOLFO DE PAPAGAYO",
    "match_ordinal": 1,
    "name": "Playa Panamá - Golfo de Papagayo",
    "description_es": "Playa Panamá es una bahía amplia de arena oscura y oleaje suave en el Golfo de Papagayo, Guanacaste, ubicada en el pueblo pesquero del mismo nombre a pocos minutos de Playas del Coco. Es una playa de ambiente familiar y aguas tranquilas apta para nadar, pasear en kayak y stand up paddle, con pescadores artesanales y lanchas en la orilla. Cuenta con restaurantes y hospedajes en el pueblo, sin grandes desarrollos sobre la arena, y funciona como punto de salida de tours en bote por la zona de Papagayo.",
    "description_en": "Playa Panama is a wide dark-sand bay with gentle surf in the Gulf of Papagayo, Guanacaste, set in the fishing village of the same name minutes from Playas del Coco. It is a family-oriented beach with calm water suitable for swimming, kayaking and stand-up paddling, with artisanal fishermen and boats along the shore. It has restaurants and lodging in the village, without large developments on the sand, and serves as a departure point for boat tours around the Papagayo area.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.5916459,
    "longitude": -85.6503797
  },
  {
    "match_name": "Playa Papaturro",
    "match_ordinal": 1,
    "name": "Playa Papaturro",
    "description_es": "Playa Papaturro es una playa extensa del cantón de La Cruz, en el extremo norte de Guanacaste, entre bahías abiertas del Pacífico norte rodeadas de bosque seco. Es un sector poco desarrollado de arena clara y oleaje moderado, apto para caminatas largas, picnic y baño con precaución. Se accede por caminos rurales desde las comunidades cercanas, sin servicios directos sobre la playa, en un entorno de fincas y costa ventosa propio de la zona de Bahía Salinas y Santa Elena.",
    "description_en": "Playa Papaturro is a long beach in La Cruz canton, in far northern Guanacaste, among open Pacific bays framed by dry forest. It is a little-developed stretch of light sand with moderate surf, suitable for long walks, picnics and careful swimming. It is reached by rural roads from nearby communities, with no direct services on the beach, in a windy farm-and-coast setting typical of the Salinas Bay and Santa Elena area.",
    "categories": [
      "Playas"
    ],
    "latitude": 11.0273195,
    "longitude": -85.6933365
  },
  {
    "match_name": "Playa Pavones",
    "match_ordinal": 1,
    "name": "Playa Pavones",
    "description_es": "Playa Pavones es una playa de arena oscura en el distrito de Pavón, Golfito, cerca de la desembocadura del Golfo Dulce, formada por varios sectores como Punta Pavones y la desembocadura del río. Es un destino de surf de nivel intermedio a avanzado por su extensa ola izquierda que corre con oleaje del sur, además de pesca deportiva, caminatas y observación de fauna. El pueblo mantiene un ambiente rústico con hospedajes y sodas, con acceso por carretera larga de lastre y asfalto desde la Interamericana Sur.",
    "description_en": "Playa Pavones is a dark-sand beach in Pavon district, Golfito, near the mouth of Golfo Dulce, made up of sections such as Punta Pavones and the river mouth. It is a surf destination for intermediate to advanced levels because of its long left wave that runs on southern swells, plus sport fishing, beach walks and wildlife watching. The village keeps a rustic atmosphere with lodging and small eateries, reached by a long paved and gravel road from the southern Interamericana highway.",
    "categories": [
      "Playas"
    ],
    "latitude": 8.3951665,
    "longitude": -83.1375292
  },
  {
    "match_name": "Playa Pedregosa (Guanacaste)",
    "match_ordinal": 1,
    "name": "Playa Pedregosa",
    "description_es": "Playa Pedregosa es una pequeña ensenada rocosa al sur de Playa Flamingo, en Santa Cruz de Guanacaste, con arena mezclada con piedra y plataformas rocosas que entran al mar. Es un sector de oleaje moderado apto para exploración de pozas de marea, fotografía y snorkel en condiciones tranquilas, no una playa amplia para nadar. Se accede a pie por la costa o por senderos desde las propiedades vecinas, sin servicios propios, en un entorno residencial y de bosque seco.",
    "description_en": "Playa Pedregosa is a small rocky cove south of Flamingo Beach in Santa Cruz, Guanacaste, with sand mixed with stone and rock platforms reaching the sea. It is a moderate-surf spot suited to tide-pool exploration, photography and snorkeling in calm conditions, not a wide swimming beach. It is reached on foot along the shore or by paths from neighboring properties, with no services of its own, in a residential dry-forest setting.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.3779697,
    "longitude": -85.8455676
  },
  {
    "match_name": "Playa Pelada",
    "match_ordinal": 1,
    "name": "Playa Pelada",
    "description_es": "Playa Pelada es una playa de arena clara entre puntas rocosas en Nosara, Guanacaste, al norte de Playa Guiones, con el islote Chola frente a la costa. En marea baja se forman pozas de marea y chorros de agua entre las rocas, aptos para exploración y fotografía, y hay sectores de oleaje suave para el baño y de rompiente para surfistas con experiencia. Cuenta con restaurantes y escuelas de surf en los accesos, sin paseo marítimo, y es zona de anidación estacional de tortugas con restricciones de iluminación y tránsito.",
    "description_en": "Playa Pelada is a light-sand beach between rocky points in Nosara, Guanacaste, north of Playa Guiones, with the Chola islet offshore. At low tide tide pools and blowholes form among the rocks, good for exploring and photography, and there are gentle areas for bathing alongside breaks for experienced surfers. It has restaurants and surf schools near the accesses, without a boardwalk, and is a seasonal turtle-nesting area with lighting and driving restrictions.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.9546799,
    "longitude": -85.6751755
  },
  {
    "match_name": "Playa Penca",
    "match_ordinal": 1,
    "name": "Playa Penca",
    "description_es": "Playa Penca es una cala pequeña en forma de herradura en la zona de Potrero, Santa Cruz de Guanacaste, de arena blanca y aguas claras protegidas por puntas rocosas. Es una playa de oleaje suave apta para nadar, hacer snorkel y pasear en kayak, con sombra de árboles en partes de la orilla. Se accede por calle de lastre y un tramo final a pie, con parqueo limitado y restaurantes cercanos en Potrero, sin servicios directos sobre la arena.",
    "description_en": "Playa Penca is a small horseshoe-shaped cove in the Potrero area of Santa Cruz, Guanacaste, with white sand and clear water sheltered by rocky points. It is a gentle beach for swimming, snorkeling and kayaking, with tree shade along parts of the shore. It is reached by gravel road and a final walk, with limited parking and nearby restaurants in Potrero, and no direct services on the sand.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.4622111,
    "longitude": -85.7764359
  },
  {
    "match_name": "Playa Piedra Colorada",
    "match_ordinal": 1,
    "name": "Playa Piedra Colorada",
    "description_es": "Playa Piedra Colorada es una playa de arena y cantos de tonos rojizos en la zona de Montezuma y Cóbano, al sur de la Península de Nicoya. Debe su aspecto a las formaciones rocosas de color que bordean la orilla, con pozas de marea y sectores de oleaje moderado a fuerte según la marea. Es un sitio apartado para caminatas, fotografía y contemplación, con acceso por sendero costero y sin servicios, por lo que requiere llevar agua y usar calzado adecuado para roca.",
    "description_en": "Playa Piedra Colorada is a beach of sand and reddish-toned stones near Montezuma and Cobano, in the southern Nicoya Peninsula. Its look comes from the colored rock formations edging the shore, with tide pools and moderate to strong surf depending on the tide. It is a secluded spot for hiking, photography and sightseeing, reached by a coastal path with no services, so visitors should bring water and wear rock-suitable footwear.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.6611217,
    "longitude": -85.0589904
  },
  {
    "match_name": "Playa Piro",
    "match_ordinal": 1,
    "name": "Playa Piro",
    "description_es": "Playa Piro es una playa extensa de arena gris y oleaje abierto en la costa pacífica de Osa, al sur de la zona de Pavones y cerca de Punta Piro. Está respaldada por bosque lluvioso con guacamayas, monos y otra fauna, y forma parte de un litoral poco desarrollado apto para caminatas largas y surf en sectores con rompiente. El acceso es por camino rural desde Carate o Pavones, con lodges y fincas de conservación en los alrededores y sin servicios urbanos sobre la playa.",
    "description_en": "Playa Piro is a long gray-sand beach with open surf on the Pacific coast of Osa, south of the Pavones area near Punta Piro. It is backed by rainforest with scarlet macaws, monkeys and other wildlife, and belongs to a little-developed shoreline suited to long walks and surfing at breaking sections. Access is by rural road from Carate or Pavones, with lodges and conservation farms nearby and no urban services on the beach.",
    "categories": [
      "Playas"
    ],
    "latitude": 8.3925587,
    "longitude": -83.3320299
  },
  {
    "match_name": "Playa Playita (Quepos)",
    "match_ordinal": 1,
    "name": "Playa Playita",
    "description_es": "Playa Playita es una cala de arena clara y vegetación densa en Quepos, al sur de Manuel Antonio, separada de Playa Espadilla por Punta Catedral. Es una rompiente de surf con oleaje consistente y corrientes variables, apta para surfistas con experiencia y para caminatas en marea baja. Es un sector apartado de bajo desarrollo, con presencia de bañistas sin ropa en tramos alejados, acceso por sendero y sin servicios ni guardavidas permanentes.",
    "description_en": "Playa Playita is a light-sand cove with dense vegetation in Quepos, south of Manuel Antonio, separated from Espadilla Beach by Punta Catedral. It is a surf break with consistent waves and shifting currents, suited to experienced surfers and to low-tide walks. It is a secluded, low-development area, with nude bathers in remote stretches, reached by trail and without services or permanent lifeguards.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.3736695,
    "longitude": -84.1229917
  },
  {
    "match_name": "Playa Pleito",
    "match_ordinal": 1,
    "name": "Playa Pleito",
    "description_es": "Playa Pleito es una ensenada pequeña de arena y roca en la costa de Junquillal, Santa Cruz de Guanacaste, entre puntas rocosas con vegetación de bosque seco. Es un sector de oleaje moderado apto para caminatas costeras, fotografía y baño con precaución en marea adecuada. Se llega por caminos vecinales y tramos a pie desde Junquillal, sin servicios directos, en un entorno residencial y de conservación con anidación estacional de tortugas.",
    "description_en": "Playa Pleito is a small sand-and-rock cove on the Junquillal coast in Santa Cruz, Guanacaste, between rocky points with dry-forest vegetation. It is a moderate-surf spot for coastal walks, photography and careful swimming at suitable tides. It is reached by local roads and walking stretches from Junquillal, with no direct services, in a residential and conservation setting with seasonal turtle nesting.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.0357479,
    "longitude": -85.7430245
  },
  {
    "match_name": "Playa Prieta",
    "match_ordinal": 1,
    "name": "Playa Prieta",
    "description_es": "Playa Prieta es una cala de arena oscura en la zona de Potrero y Playa Penca, Santa Cruz de Guanacaste, protegida por formaciones rocosas a ambos lados. Es una playa de oleaje suave a moderado apta para nadar y hacer snorkel en condiciones tranquilas, con sombra natural y ambiente poco concurrido. Se accede por sendero desde los alrededores de Penca y Potrero, sin servicios sobre la arena y con parqueo limitado en la zona.",
    "description_en": "Playa Prieta is a dark-sand cove in the Potrero and Playa Penca area of Santa Cruz, Guanacaste, sheltered by rock formations on both sides. It is a calm to moderate beach for swimming and snorkeling in quiet conditions, with natural shade and a low-key atmosphere. It is reached by trail from around Penca and Potrero, with no services on the sand and limited parking nearby.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.469157,
    "longitude": -85.777938
  },
  {
    "match_name": "Playa Prieta - Guanacaste",
    "match_ordinal": 1,
    "name": "Playa Prieta - Papagayo",
    "description_es": "Playa Prieta de Papagayo es una cala de arena oscura dentro de la Península de Papagayo, en Liberia, Guanacaste, distinta de la Playa Prieta de la zona de Potrero. Es una bahía protegida de aguas tranquilas rodeada de bosque seco y desarrollo hotelero y residencial de bajo impacto, con acceso controlado por las vías del proyecto turístico. Es apta para natación, snorkel y paseos en kayak, sin comercio informal sobre la playa y con Resorts y servicios en los alrededores.",
    "description_en": "Playa Prieta in Papagayo is a dark-sand cove inside the Papagayo Peninsula in Liberia, Guanacaste, distinct from the Playa Prieta near Potrero. It is a sheltered bay with calm water framed by dry forest and low-impact hotel and residential development, with controlled access through the tourism project roads. It suits swimming, snorkeling and kayaking, with no informal vendors on the beach and resorts and services nearby.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.6267399,
    "longitude": -85.4436706
  },
  {
    "match_name": "Playa Punta Uva",
    "match_ordinal": 1,
    "name": "Playa Punta Uva",
    "description_es": "Playa Punta Uva es una playa de arena clara y cocoteros en el Caribe Sur, Talamanca, entre Puerto Viejo y Manzanillo, frente a un arrecife costero que forma piscinas naturales de agua turquesa. Es apta para nadar, hacer snorkel y pasear en kayak en condiciones tranquilas, con sendero costero hacia el mirador de la punta rocosa. Cuenta con sodas y hospedajes cercanos, sin paseo marítimo, dentro de un entorno de bosque húmedo con perezosos, monos y tucanes.",
    "description_en": "Playa Punta Uva is a white-sand beach lined with coconut palms on the Southern Caribbean in Talamanca, between Puerto Viejo and Manzanillo, fronted by a coastal reef that forms turquoise natural pools. It suits swimming, snorkeling and kayaking in calm conditions, with a coastal path to the rocky-point viewpoint. It has nearby sodas and lodging, without a boardwalk, in a humid-forest setting with sloths, monkeys and toucans.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.638763,
    "longitude": -82.6935388
  },
  {
    "match_name": "Playa Respingue",
    "match_ordinal": 1,
    "name": "Playa Respingue",
    "description_es": "Playa Respingue es una pequeña cala de arena clara y aguas transparentes en la zona de Papagayo, Santa Cruz de Guanacaste, rodeada de bosque seco y formaciones rocosas. Es una playa de oleaje suave apta para nadar, hacer snorkel y descansar, con ambiente apartado y sin desarrollo directo sobre la arena. Se accede por mar o por senderos y caminos del sector, por lo que la visita requiere planificar transporte y llevar provisiones.",
    "description_en": "Playa Respingue is a small cove of light sand and clear water in the Papagayo area of Santa Cruz, Guanacaste, framed by dry forest and rock formations. It is a gentle beach for swimming, snorkeling and resting, with a secluded feel and no direct development on the sand. It is reached by sea or by sector paths and roads, so visits require planning transport and bringing supplies.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.8567182,
    "longitude": -85.8449437
  },
  {
    "match_name": "Playa Santa Teresa",
    "match_ordinal": 1,
    "name": "Playa Santa Teresa",
    "description_es": "Playa Santa Teresa es una playa extensa de arena clara y oleaje consistente en Cóbano, al oeste de la Península de Nicoya, con varios picos de surf para niveles intermedio y avanzado. El pueblo combina campamentos de surf, retiros de yoga y hospedajes de todos los niveles, con restaurantes y tiendas frente a caminos de lastre. Es apta para surf, clases de iniciación en sectores adecuados, caminatas y atardeceres, con corrientes variables que exigen precaución al nadar.",
    "description_en": "Playa Santa Teresa is a long light-sand beach with consistent surf in Cobano, on the western Nicoya Peninsula, with several peaks for intermediate and advanced surfing. The town combines surf camps, yoga retreats and lodging at all levels, with restaurants and shops along gravel roads. It suits surfing, beginner lessons in suitable sections, beach walks and sunsets, with shifting currents that require caution when swimming.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.6438065,
    "longitude": -85.1703544
  },
  {
    "match_name": "Playa Suecos",
    "match_ordinal": 1,
    "name": "Playa Suecos",
    "description_es": "Playa Suecos es una cala pequeña de arena y roca en la zona de Malpaís, Cóbano, entre puntas rocosas con vegetación costera. Es un sector de oleaje moderado a fuerte con rompiente para surfistas con experiencia y pozas entre rocas para exploración en marea baja. Se accede por caminos rurales y senderos del sector de Malpaís y Santa Teresa, sin servicios sobre la playa, en un entorno de hospedajes dispersos y bosque.",
    "description_en": "Playa Suecos is a small sand-and-rock cove in the Malpais area of Cobano, between rocky points with coastal vegetation. It is a moderate to strong surf sector with breaks for experienced surfers and rocky pools to explore at low tide. It is reached by rural roads and paths in the Malpais and Santa Teresa area, with no services on the beach, in a setting of scattered lodging and forest.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.6083965,
    "longitude": -85.1349713
  },
  {
    "match_name": "Playa Surco de Piedra",
    "match_ordinal": 1,
    "name": "Playa Surco de Piedra",
    "description_es": "Playa Surco de Piedra es una franja costera rocosa en la zona de Brasilito, Santa Cruz de Guanacaste, con plataformas de piedra, arena por sectores y pozas de marea. Es un sitio para caminatas costeras, fotografía y exploración marina en marea baja, no una playa amplia para natación. Se llega por la costa desde Brasilito y Conchal en marea adecuada o por senderos vecinales, sin servicios, con erizos y roca resbaladiza que exigen calzado adecuado.",
    "description_en": "Playa Surco de Piedra is a rocky coastal strip near Brasilito in Santa Cruz, Guanacaste, with stone platforms, patchy sand and tide pools. It is a place for coastal walks, photography and low-tide marine exploration, not a wide swimming beach. It is reached along the shore from Brasilito and Conchal at suitable tides or by local paths, with no services, and sea urchins and slippery rock require proper footwear.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.1360688,
    "longitude": -85.7997301
  },
  {
    "match_name": "Playa Tambor y Bahía Ballena",
    "match_ordinal": 1,
    "name": "Playa Tambor y Bahía Ballena",
    "description_es": "Playa Tambor es una bahía extensa de arena gris y oleaje suave en la costa del Golfo de Nicoya, Puntarenas, dentro de la zona conocida como Bahía Ballena. Es una playa de ambiente familiar apta para nadar, pasear en kayak y practicar stand up paddle, con hoteles y comunidades residenciales en los alrededores. Se llega por carretera desde Paquera o por ferry de Puntarenas a Paquera con conexión terrestre, y cuenta con restaurantes, tours en bote y avistamiento estacional de fauna marina.",
    "description_en": "Playa Tambor is a long gray-sand bay with gentle surf on the Gulf of Nicoya coast in Puntarenas, within the area known as Bahia Ballena. It is a family-friendly beach for swimming, kayaking and stand-up paddling, with hotels and residential communities nearby. It is reached by road from Paquera or by ferry from Puntarenas to Paquera with a land connection, and offers restaurants, boat tours and seasonal marine wildlife watching.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.7175241,
    "longitude": -85.0169985
  },
  {
    "match_name": "Playa Toyosa",
    "match_ordinal": 1,
    "name": "Playa Toyosa",
    "description_es": "Playa Toyosa es una playa de arena clara y oleaje moderado en el cantón de La Cruz, Guanacaste, en un tramo poco desarrollado de la costa norte del Pacífico. Es un sector apto para caminatas, picnic y baño con precaución, rodeado de bosque seco y fincas ganaderas. Se accede por caminos rurales desde las vías principales de La Cruz, sin servicios directos sobre la arena, por lo que se recomienda llevar agua y provisiones.",
    "description_en": "Playa Toyosa is a light-sand beach with moderate surf in La Cruz canton, Guanacaste, on a little-developed stretch of the northern Pacific coast. It is a sector for walks, picnics and careful swimming, framed by dry forest and cattle farms. It is reached by rural roads from the main La Cruz routes, with no direct services on the sand, so bringing water and supplies is recommended.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.9828391,
    "longitude": -85.6953016
  },
  {
    "match_name": "Playa Tulemar",
    "match_ordinal": 1,
    "name": "Playa Tulemar",
    "description_es": "Playa Tulemar es una cala de arena clara y aguas tranquilas en Manuel Antonio, Quepos, ubicada dentro de la zona del resort y residencial del mismo nombre con acceso controlado. Es una playa protegida apta para nadar, hacer snorkel y pasear en kayak, con restaurante de playa para huéspedes y visitantes registrados. El entorno de bosque húmedo permite observar perezosos, monos e iguanas, y el ingreso requiere coordinación con la administración por ser acceso privado.",
    "description_en": "Playa Tulemar is a light-sand cove with calm water in Manuel Antonio, Quepos, inside the resort and residential area of the same name with controlled access. It is a sheltered beach for swimming, snorkeling and kayaking, with a beach restaurant for guests and registered visitors. The surrounding humid forest allows sightings of sloths, monkeys and iguanas, and entry requires arrangement with the administration as access is private.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.4077568,
    "longitude": -84.1635125
  },
  {
    "match_name": "Playa Ventanas",
    "match_ordinal": 1,
    "name": "Playa Ventanas",
    "description_es": "Playa Ventanas es una playa de arena gris y formaciones rocosas en Osa, entre Uvita y Ojochal, atravesada por dos túneles y cuevas naturales que conectan la playa con una cala posterior en marea baja. Es apta para caminatas, fotografía y baño con precaución, con un tómbolo de arena que permite cruzar a un islote cercano cuando la marea lo permite. Cuenta con parqueo y ventas básicas en temporada, sin guardavidas permanentes, y las cuevas solo se recorren con marea baja por riesgo de atrapamiento.",
    "description_en": "Playa Ventanas is a gray-sand beach with rock formations in Osa, between Uvita and Ojochal, crossed by two natural tunnels and caves linking the beach to a rear cove at low tide. It suits beach walks, photography and careful swimming, with a sand tombolo allowing crossing to a nearby islet when tides permit. It has parking and basic vendors in season, without permanent lifeguards, and the caves should only be entered at low tide because of entrapment risk.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.0898819,
    "longitude": -83.6767857
  },
  {
    "match_name": "Playa Virador",
    "match_ordinal": 1,
    "name": "Playa Virador",
    "description_es": "Playa Virador es una playa de arena blanca y aguas claras en la Península de Papagayo, Guanacaste, de oleaje suave y pendiente gradual apta para nadar y hacer snorkel. Se accede por mar o por sendero desde las instalaciones hoteleras del sector, con acceso regulado y servicios del resort en la zona. Está rodeada de bosque seco con monos y aves, sin comercio informal, y funciona como playa de estadía tranquila dentro del polo turístico de Papagayo.",
    "description_en": "Playa Virador is a white-sand beach with clear water on the Papagayo Peninsula in Guanacaste, with gentle surf and a gradual slope suited to swimming and snorkeling. It is reached by sea or by trail from the area hotels, with regulated access and resort services nearby. It is framed by dry forest with monkeys and birds, without informal vendors, and works as a quiet stay beach within the Papagayo tourism hub.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.649121,
    "longitude": -85.650508
  },
  {
    "match_name": "Playa Vizcaya",
    "match_ordinal": 1,
    "name": "Playa Vizcaya",
    "description_es": "Playa Vizcaya es una playa de arena clara y oleaje moderado en la costa caribeña de Limón, al sur de Cahuita, con arrecifes cercanos y vegetación costera densa. Es un sector poco desarrollado apto para caminatas, fotografía y baño con precaución, dentro de un litoral de alto valor natural con fauna de bosque húmedo. Se accede por caminos rurales desde la ruta costera, sin servicios directos, por lo que conviene visitar con transporte propio y provisiones.",
    "description_en": "Playa Vizcaya is a light-sand beach with moderate surf on the Caribbean coast of Limon, south of Cahuita, with nearby reefs and dense coastal vegetation. It is a little-developed sector for walks, photography and careful swimming, on a shoreline of high natural value with humid-forest wildlife. It is reached by rural roads from the coastal route, with no direct services, so visiting with private transport and supplies is advisable.",
    "categories": [
      "Playas"
    ],
    "latitude": 9.9163026,
    "longitude": -82.9894104
  },
  {
    "match_name": "Playa Zancudo",
    "match_ordinal": 1,
    "name": "Playa Zancudo",
    "description_es": "Playa Zancudo es una playa extensa de arena oscura en Golfito, frente al Golfo Dulce, con oleaje moderado y sectores de rompiente para surf. Es un destino para caminatas largas, pesca deportiva desde playa y bote, kayak y observación de delfines y ballenas en temporada. El poblado ofrece hospedajes rústicos y sodas, con acceso por carretera de lastre desde la Interamericana Sur o por bote desde Golfito, en un ambiente tranquilo y poco masificado.",
    "description_en": "Playa Zancudo is a long dark-sand beach in Golfito facing Golfo Dulce, with moderate surf and breaking sections for surfing. It is a destination for long walks, surf and boat sport fishing, kayaking and seasonal dolphin and whale watching. The village offers rustic lodging and sodas, reached by gravel road from the southern Interamericana highway or by boat from Golfito, in a quiet, uncrowded atmosphere.",
    "categories": [
      "Playas"
    ],
    "latitude": 8.5158409,
    "longitude": -83.1363675
  },
  {
    "match_name": "Playas Coloradas",
    "match_ordinal": 1,
    "name": "Playas Coloradas",
    "description_es": "Playas Coloradas es un conjunto de pequeñas calas de arena clara y aguas transparentes en el extremo norte de Papagayo, Santa Cruz de Guanacaste, entre puntas rocosas y bosque seco. Son sectores de oleaje suave a moderado aptos para nadar, hacer snorkel y descansar, con ambiente apartado y sin desarrollo directo. Se acceden por mar o por caminos y senderos del sector norte de Papagayo, por lo que requieren planificar transporte y llevar provisiones.",
    "description_en": "Playas Coloradas is a group of small coves with light sand and clear water at the northern end of Papagayo in Santa Cruz, Guanacaste, between rocky points and dry forest. They are calm to moderate sectors for swimming, snorkeling and resting, with a secluded feel and no direct development. They are reached by sea or by roads and trails in northern Papagayo, so transport planning and supplies are needed.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.8605325,
    "longitude": -85.8561017
  },
  {
    "match_name": "Playas del Coco",
    "match_ordinal": 1,
    "name": "Playas del Coco",
    "description_es": "Playas del Coco es la playa urbana del pueblo del mismo nombre en Carrillo y Santa Cruz, Guanacaste, en una bahía de arena gris y oleaje moderado frente al Golfo de Papagayo. Es un centro de servicios con restaurantes, vida nocturna, tiendas de buceo y salidas de pesca deportiva y tours a islas cercanas. Es apta para caminatas, atardeceres y paseos en bote, con natación limitada a sectores tranquilos por el tráfico de embarcaciones.",
    "description_en": "Playas del Coco is the town beach of the same name in Carrillo and Santa Cruz, Guanacaste, on a gray-sand bay with moderate surf facing the Gulf of Papagayo. It is a service hub with restaurants, nightlife, dive shops and departures for sport fishing and tours to nearby islands. It suits beach walks, sunsets and boat trips, with swimming best kept to calm sections because of boat traffic.",
    "categories": [
      "Playas"
    ],
    "latitude": 10.5519,
    "longitude": -85.6978
  },
  {
    "match_name": "Playas Península de Osa",
    "match_ordinal": 1,
    "name": "Playas Península de Osa",
    "description_es": "Las playas de la Península de Osa forman un litoral extenso de arena gris y bosque lluvioso que incluye sectores como Carate, Piro, Pavones y Llorona, entre el Pacífico abierto y el Golfo Dulce. Combinan bahías protegidas y tramos de oleaje fuerte, con surf en picos específicos, caminatas costeras y acceso a senderos del Parque Nacional Corcovado. Es una zona de alta biodiversidad con guacamayas, monos, tapires y anidación estacional de tortugas, con hospedajes dispersos y accesos largos por lastre que exigen planificación.",
    "description_en": "The beaches of the Osa Peninsula form a long shoreline of gray sand and rainforest including areas such as Carate, Piro, Pavones and Llorona, between the open Pacific and Golfo Dulce. They combine sheltered bays and strong-surf stretches, with surfing at specific peaks, coastal walks and access to Corcovado National Park trails. It is a high-biodiversity zone with scarlet macaws, monkeys, tapirs and seasonal turtle nesting, with scattered lodging and long gravel accesses requiring planning.",
    "categories": [
      "Playas"
    ],
    "latitude": 8.417,
    "longitude": -83.279
  },
  {
    "match_name": "Poza La Presa - Colonia del Toro",
    "match_ordinal": 1,
    "name": "Poza La Presa - Colonia del Toro",
    "description_es": "Poza La Presa es una poza de río de montaña en Colonia del Toro, en la zona de Bajos del Toro, Sarchí, rodeada de vegetación húmeda y rocas. Es un punto de agua fría y cristalina apto para el baño en caudal normal, con acceso por camino rural y sendero corto desde las fincas cercanas. La visita requiere precaución en época de lluvia por crecidas repentinas y calzado de agarre por roca resbaladiza, sin servicios formales en el sitio.",
    "description_en": "Poza La Presa is a mountain-river pool in Colonia del Toro, in the Bajos del Toro area of Sarchi, framed by humid vegetation and rocks. It is a cold, clear swimming spot at normal flows, reached by rural road and a short trail from nearby farms. Visits call for caution in the rainy season because of flash rises and grippy footwear for slippery rock, with no formal services on site.",
    "categories": [
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 10.302883,
    "longitude": -84.247582
  },
  {
    "match_name": "Poza Las Gradas - CARTAGO",
    "match_ordinal": 1,
    "name": "Poza Las Gradas",
    "description_es": "Poza Las Gradas es un conjunto de pozas de río en la zona de Orosi y Tapantí, Cartago, donde el cauce forma escalones naturales de piedra aptos para el baño en caudal normal. Está rodeada de bosque húmedo premontano con alta biodiversidad, con acceso por camino rural y sendero corto de pendiente moderada. Requiere precaución por roca resbaladiza y crecidas en época lluviosa, sin servicios formales, por lo que se recomienda llevar provisiones y no dejar residuos.",
    "description_en": "Poza Las Gradas is a set of river pools near Orosi and Tapanti in Cartago, where the stream forms natural stone steps suitable for bathing at normal flows. It sits in premontane humid forest with high biodiversity, reached by rural road and a short, moderately sloped trail. It calls for caution over slippery rock and rainy-season rises, with no formal services, so bringing supplies and leaving no waste is recommended.",
    "categories": [
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 9.779963,
    "longitude": -83.843063
  },
  {
    "match_name": "POZA LOS ABUELOS - Limón",
    "match_ordinal": 1,
    "name": "Poza Los Abuelos",
    "description_es": "Poza Los Abuelos es una poza de río de llanura caribeña en la zona de Guápiles, Pococí, Limón, de aguas tranquilas y fondo mixto de arena y piedra. Es un punto de baño familiar con acceso por camino rural y sendero corto, rodeado de vegetación tropical y fincas. La visita exige precaución en época de lluvia por crecidas y evitar clavados por profundidad variable, sin servicios formales en el sitio.",
    "description_en": "Poza Los Abuelos is a Caribbean-lowland river pool near Guapiles in Pococi, Limon, with calm water and a mixed sand-and-stone bottom. It is a family swimming spot reached by rural road and a short trail, framed by tropical vegetation and farms. Visits require caution in the rainy season because of rising water and avoiding dives due to variable depth, with no formal services on site.",
    "categories": [
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 10.2127003,
    "longitude": -83.6866091
  },
  {
    "match_name": "Poza Los Coyotes",
    "match_ordinal": 1,
    "name": "Poza Los Coyotes",
    "description_es": "La Poza Los Coyotes es una poza de agua azul encajonada entre paredes de un pequeño cañón en Curubandé, Liberia, Guanacaste, en la zona de influencia del Rincón de la Vieja. Se llega por sendero entre bosque seco tropical y el baño en sus aguas claras es su actividad central, en un entorno estrecho de roca, vegetación y sombra parcial. Es una visita de medio día que exige precaución por rocas resbaladizas, profundidad variable y crecidas en época lluviosa.",
    "description_en": "Poza Los Coyotes is a blue-water pool enclosed by the walls of a small canyon in Curubande, Liberia, Guanacaste, in the Rincon de la Vieja area. It is reached by trail through tropical dry forest, and swimming in its clear water is the main activity, in a narrow setting of rock, vegetation and partial shade. It is a half-day visit that requires caution for slippery rocks, variable depth and flash rises in the rainy season.",
    "categories": [
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 10.7112319,
    "longitude": -85.4524353
  },
  {
    "match_name": "Poza Pénjamo - Ciudad Colón",
    "match_ordinal": 1,
    "name": "Poza Pénjamo - Ciudad Colón",
    "description_es": "La Poza Pénjamo es una poza de río en la zona de Ciudad Colón, Mora, San José, frecuentada como balneario natural por visitantes locales. Es un espejo de agua dulce rodeado de vegetación ribereña, apto para nadar y pasar el día en familia en un ambiente rural cercano a la ciudad. El acceso es por caminos vecinales y tramos cortos a pie, por lo que conviene usar calzado adecuado y evitar la visita durante lluvias fuertes por cambios de caudal.",
    "description_en": "Poza Penjamo is a river pool near Ciudad Colon, Mora, San Jose, popular as a natural swimming spot with local visitors. It is a freshwater pool framed by riverside vegetation, suited for swimming and family day trips in a rural setting close to the city. Access is by local roads and short walks, so sturdy footwear is advised and visits during heavy rain should be avoided due to changing water levels.",
    "categories": [
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 9.905,
    "longitude": -84.242
  },
  {
    "match_name": "POZO AZUL - SARAPIQUI",
    "match_ordinal": 1,
    "name": "Pozo Azul - Sarapiquí",
    "description_es": "Pozo Azul es un sector de río en Sarapiquí, Heredia, conocido por sus pozas de agua dulce y los recorridos flotantes en bote inflable por aguas de corriente suave entre bosque húmedo caribeño. La actividad central es el descenso tranquilo con chaleco salvavidas, combinado con baño en pozas y observación de aves, monos y vegetación de ribera. Opera como destino de aventura leve para familias y grupos, en la llanura sarapiqueña y sin relación con las cataratas homónimas de la zona de Toro y La Virgen.",
    "description_en": "Pozo Azul is a river area in Sarapiqui, Heredia, known for its freshwater pools and float trips by inflatable raft on gentle currents through Caribbean humid forest. The main activity is a calm downstream float with life vests, combined with swimming in pools and sightings of birds, monkeys and riverside vegetation. It works as a soft-adventure destination for families and groups on the Sarapiqui lowlands, unrelated to the same-named waterfalls of the Toro and La Virgen area.",
    "categories": [
      "Ríos y Pozas",
      "Aventura y Deportes"
    ],
    "latitude": 10.473523,
    "longitude": -84.0167423
  },
  {
    "match_name": "Pozo Verde, una joya escondida en Zarcero",
    "match_ordinal": 1,
    "name": "Pozo Verde, joya Zarcero",
    "description_es": "Pozo Verde es una laguna de cráter de tonos verdes en las tierras altas de Zarcero, Alajuela, en el entorno del macizo del Parque Nacional Juan Castro Blanco. Es un espejo de agua tranquilo rodeado de bosque nuboso, potreros de altura y clima frío con neblina frecuente, visitado para contemplación, fotografía y caminatas suaves. El acceso es por caminos rurales de montaña, por lo que el estado del tiempo y del camino condiciona la visita.",
    "description_en": "Pozo Verde is a green-toned crater lake in the highlands of Zarcero, Alajuela, in the surroundings of the Juan Castro Blanco National Park massif. It is a calm water surface ringed by cloud forest, highland pastures and cool weather with frequent mist, visited for sightseeing, photography and gentle walks. Access is by rural mountain roads, so weather and road conditions shape the visit.",
    "categories": [
      "Volcanes",
      "Parques Nacionales",
      "Senderismo"
    ],
    "latitude": 10.256,
    "longitude": -84.365
  },
  {
    "match_name": "Providencia de Dota",
    "match_ordinal": 1,
    "name": "Providencia de Dota",
    "description_es": "Providencia de Dota es un pueblo de montaña en el cantón de Dota, San José, entre cafetales, potreros y parches de bosque nuboso de la zona de Los Santos. Su entorno reúne cascadas, quebradas de agua clara y senderos rurales, además de una conocida oferta de trucha fresca en restaurantes familiares. Es una parada tranquila para caminatas, fotografía de paisaje y contacto con la vida rural de altura, de clima fresco y lluvioso.",
    "description_en": "Providencia de Dota is a mountain village in Dota canton, San Jose, among coffee farms, pastures and patches of cloud forest in the Los Santos region. Its surroundings gather waterfalls, clear streams and rural trails, plus a well-known offer of fresh trout at family restaurants. It is a quiet stop for hiking, landscape photography and highland rural life, with cool and rainy weather.",
    "categories": [
      "Cataratas",
      "Experiencia Gastronómica",
      "Senderismo"
    ],
    "latitude": 9.553904,
    "longitude": -83.86586
  },
  {
    "match_name": "Puente de los Cocodrilos (Río Tárcoles)",
    "match_ordinal": 1,
    "name": "Puente de los Cocodrilos (Río Tárcoles)",
    "description_es": "El Puente de los Cocodrilos es el puente sobre el Río Tárcoles en la ruta hacia Jacó y el Pacífico Central, famoso como mirador para observar cocodrilos americanos que descansan en las orillas y bancos de arena. La observación se hace a pie desde las aceras del puente, con vista directa al cauce ancho rodeado de manglar y bosque de galería. En los alrededores hay parqueo informal, ventas y paradas de tours, y se requiere precaución permanente por el tránsito vehicular y por no acercarse al río.",
    "description_en": "The Crocodile Bridge spans the Tarcoles River on the road to Jaco and the Central Pacific, famous as a viewpoint for American crocodiles resting on the banks and sandbars. Watching is done on foot from the bridge sidewalks, with a direct view of the wide channel lined with mangrove and gallery forest. Nearby there are informal parking areas, vendors and tour stops, and constant caution is needed because of vehicle traffic and keeping away from the river.",
    "categories": [
      "Miradores",
      "Santuarios de Animales"
    ],
    "latitude": 9.8008654,
    "longitude": -84.6061145
  },
  {
    "match_name": "Puerto Jiménez",
    "match_ordinal": 1,
    "name": "Puerto Jiménez",
    "description_es": "Puerto Jiménez es un pueblo costero en el Golfo Dulce, Osa, Puntarenas, que funciona como base principal para visitar el Parque Nacional Corcovado y el Parque Nacional Piedras Blancas. Mantiene ambiente de pueblo con restaurantes, hospedajes, operadores de tours, aeródromo y malecón frente al golfo, rodeado de bosque lluvioso y manglares. Desde su bahía salen recorridos en bote para pesca, avistamiento de delfines y traslados hacia playas y senderos de la península.",
    "description_en": "Puerto Jimenez is a coastal town on Golfo Dulce, Osa, Puntarenas, serving as the main base for visiting Corcovado and Piedras Blancas national parks. It keeps a small-town feel with restaurants, lodging, tour operators, an airstrip and a waterfront on the gulf, surrounded by rainforest and mangroves. Boat trips for fishing, dolphin watching and transfers to peninsula beaches and trails depart from its bay.",
    "categories": [
      "Cultura e Historia",
      "Parques Nacionales"
    ],
    "latitude": 8.5354115,
    "longitude": -83.3061343
  },
  {
    "match_name": "Puerto Viejo de Talamanca",
    "match_ordinal": 1,
    "name": "Puerto Viejo de Talamanca",
    "description_es": "Puerto Viejo de Talamanca es un pueblo costero del Caribe Sur, en Limón, conocido por su cultura afrocaribeña, su música calipso y su gastronomía con coco y especias. Su litoral encadena playas como Playa Negra, Playa Chiquita y Punta Uva, y la rompiente de Salsa Brava es una de las olas más potentes del país para surf avanzado. Es base para recorrer en bicicleta la costa hasta Manzanillo, visitar centros de rescate de fauna y combinar playa con senderismo y snorkel en arrecifes.",
    "description_en": "Puerto Viejo de Talamanca is a coastal town on the South Caribbean in Limon, known for its Afro-Caribbean culture, calypso music and coconut and spice cuisine. Its shoreline links beaches such as Playa Negra, Playa Chiquita and Punta Uva, and the Salsa Brava break ranks among the most powerful waves in the country for advanced surfing. It is a base for biking the coast to Manzanillo, visiting wildlife rescue centers and pairing beach time with hiking and reef snorkeling.",
    "categories": [
      "Playas",
      "Cultura e Historia",
      "Aventura y Deportes"
    ],
    "latitude": 9.6564943,
    "longitude": -82.7535654
  },
  {
    "match_name": "Punta Corralillo",
    "match_ordinal": 1,
    "name": "Punta Corralillo",
    "description_es": "Punta Corralillo es una punta rocosa con acantilado en el litoral del Pacífico Central, en la zona costera de Parrita, Puntarenas. Forma un saliente de piedra con vista abierta al océano, vegetación costera y oleaje fuerte que golpea la base del farallón, apto para fotografía de paisaje y contemplación. No tiene servicios ni acceso acondicionado, por lo que la visita exige calzado firme, distancia del borde y atención a la marea y al estado del mar.",
    "description_en": "Punta Corralillo is a rocky point with cliffs on the Central Pacific coast, in the coastal area of Parrita, Puntarenas. It forms a stone headland with open ocean views, coastal vegetation and strong surf breaking at the base of the bluff, suited for landscape photography and sightseeing. It has no services or developed access, so visits call for sturdy footwear, distance from the edge and attention to tides and sea conditions.",
    "categories": [
      "Miradores",
      "Playas"
    ],
    "latitude": 9.8994898,
    "longitude": -84.7293693
  },
  {
    "match_name": "Punta Mala",
    "match_ordinal": 1,
    "name": "Punta Mala",
    "description_es": "Punta Mala es una punta rocosa en el sector de Esterillos, Parrita, Puntarenas, que marca un cambio de tramo entre playas arenosas del Pacífico Central. En marea baja deja al descubierto plataformas de roca y pozas intermareales, y su saliente funciona como mirador natural del oleaje y los atardeceres. El mar es abierto y con corrientes, por lo que el baño requiere precaución y la visita se disfruta sobre todo caminando y fotografiando la costa.",
    "description_en": "Punta Mala is a rocky point in the Esterillos area, Parrita, Puntarenas, marking a break between sandy beaches of the Central Pacific. At low tide it exposes rock platforms and tide pools, and its headland works as a natural viewpoint for surf and sunsets. The sea is open with currents, so swimming needs caution and the visit is best enjoyed by walking and photographing the coast.",
    "categories": [
      "Miradores",
      "Playas"
    ],
    "latitude": 9.5206016,
    "longitude": -84.5338409
  },
  {
    "match_name": "Quebrada Gata – San Carlos 💦🐾",
    "match_ordinal": 1,
    "name": "Quebrada Gata – San Carlos",
    "description_es": "Quebrada Gata es una quebrada de bosque en Venecia, San Carlos, Alajuela, conocida por su cascada y su poza de agua clara entre rocas y vegetación densa. El recorrido combina sendero rural y tramos junto al cauce, con baño refrescante en la poza cuando el caudal lo permite. Es una salida de naturaleza de medio día, con sendero que puede estar lodoso y resbaladizo, por lo que conviene evitarla con lluvias fuertes.",
    "description_en": "Quebrada Gata is a forest stream in Venecia, San Carlos, Alajuela, known for its waterfall and clear-water pool among rocks and dense vegetation. The outing combines rural trail and stretches beside the streambed, with refreshing swims in the pool when water flow allows. It is a half-day nature trip, with trails that can turn muddy and slippery, so it is best avoided during heavy rain.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 10.327,
    "longitude": -84.249
  },
  {
    "match_name": "Rafiki Safari Lodge",
    "match_ordinal": 1,
    "name": "Rafiki Safari Lodge",
    "description_es": "Rafiki Safari Lodge es un lodge de tiendas de campaña estilo safari a orillas del Río Savegre, en la zona limítrofe entre Pérez Zeledón y Quepos. Combina hospedaje en plena naturaleza con cabalgatas, kayak, caminatas por bosque y baños de río, en un valle rodeado de montañas y selva. Es un destino para desconexión y aventura suave, con alimentación en el sitio y actividades guiadas aptas para familias.",
    "description_en": "Rafiki Safari Lodge is a safari-style tented lodge on the banks of the Savegre River, on the border area between Perez Zeledon and Quepos. It pairs lodging deep in nature with horseback rides, kayaking, forest walks and river swims, in a valley ringed by mountains and jungle. It is a getaway for unplugging and soft adventure, with on-site meals and guided activities suited to families.",
    "categories": [
      "Hospedaje en la Naturaleza",
      "Aventura y Deportes",
      "Ríos y Pozas"
    ],
    "latitude": 9.446543,
    "longitude": -83.989556
  },
  {
    "match_name": "Rainmaker - Parrita",
    "match_ordinal": 1,
    "name": "Rainmaker - Parrita",
    "description_es": "Rainmaker es una reserva privada de bosque lluvioso en Parrita, Puntarenas, atravesada por una red de senderos con puentes colgantes sobre el dosel. Su recorrido incluye cataratas con pozas para el baño, miradores y hábitat de ranas de colores, mariposas, aves y monos, en un ambiente húmedo de gran biodiversidad. Opera con ingreso controlado, recepción y senderos señalizados, como excursión guiada o autoguiada de medio día.",
    "description_en": "Rainmaker is a private rainforest reserve in Parrita, Puntarenas, crossed by a trail network with hanging bridges over the canopy. Its route includes waterfalls with swimming pools, viewpoints and habitat for colorful frogs, butterflies, birds and monkeys, in a humid and highly biodiverse setting. It runs with controlled entry, a reception area and marked trails, as a half-day guided or self-guided outing.",
    "categories": [
      "Reservas Silvestres",
      "Senderismo",
      "Cataratas"
    ],
    "latitude": 9.5773362,
    "longitude": -84.2142981
  },
  {
    "match_name": "Red Rubies: Cosechá felicidad entre frutas silvestres en Cartago",
    "match_ordinal": 1,
    "name": "Red Rubies: frutas silvestres Cartago",
    "description_es": "Red Rubies es una finca agrícola en Llano Grande, Cartago, dedicada al cultivo de frutas de altura como moras y frambuesas en un entorno fresco de montaña. La visita gira en torno a la cosecha directa de la fruta, la degustación y el aprendizaje del manejo del cultivo, en un ambiente rural familiar. Es una experiencia de agroturismo de corta duración, combinable con recorridos por la zona alta cartaginesa.",
    "description_en": "Red Rubies is a farm in Llano Grande, Cartago, growing highland fruit such as blackberries and raspberries in a cool mountain setting. Visits center on picking fruit straight from the plants, tasting and learning about crop care, in a family rural atmosphere. It is a short agrotourism experience, easy to combine with tours around the Cartago highlands.",
    "categories": [
      "Experiencia Gastronómica",
      "Senderismo",
      "Agroturismo"
    ],
    "latitude": 9.92422501815302,
    "longitude": -83.9018338783928
  },
  {
    "match_name": "Refugio de Aves Alexander Skutch - Los Cusingos",
    "match_ordinal": 1,
    "name": "Refugio de Aves Alexander Skutch - Los Cusingos",
    "description_es": "El Refugio de Aves Los Cusingos, ligado al ornitólogo Alexander Skutch, es un refugio de bosque en Pérez Zeledón, San José, dedicado a la protección de aves y bosque tropical. Conserva la antigua finca del naturalista con senderos entre bosque primario y secundario, quebradas y jardines, donde se observan tucanes, tangaras, colibríes y otras especies residentes. Es un destino clásico de observación de aves y educación ambiental, con visitas guiadas y ambiente silencioso.",
    "description_en": "The Los Cusingos Bird Refuge, linked to ornithologist Alexander Skutch, is a forest refuge in Perez Zeledon, San Jose, devoted to protecting birds and tropical forest. It preserves the naturalist's former farm with trails through primary and secondary forest, streams and gardens, where toucans, tanagers, hummingbirds and other resident species are seen. It is a classic birdwatching and environmental education destination, with guided visits and a quiet atmosphere.",
    "categories": [
      "Santuarios de Animales",
      "Reservas Silvestres",
      "Senderismo"
    ],
    "latitude": 9.33,
    "longitude": -83.623
  },
  {
    "match_name": "Refugio de Vida Silvestre Barra del Colorado",
    "match_ordinal": 1,
    "name": "Refugio de Vida Silvestre Barra del Colorado",
    "description_es": "El Refugio de Vida Silvestre Barra del Colorado, en el Caribe Norte de Limón, protege una extensa llanura de bosque lluvioso surcada por canales, lagunas y ríos cercanos a la desembocadura. Es uno de los destinos más reconocidos del país para la pesca deportiva del sábalo y el róbalo, además de observación de aves acuáticas, monos, perezosos y cocodrilos. El acceso es principalmente por vía fluvial o aérea, con lodges de pesca y recorridos en bote por los canales.",
    "description_en": "Barra del Colorado Wildlife Refuge, on the North Caribbean of Limon, protects a vast rainforest plain crossed by canals, lagoons and rivers near the river mouth. It ranks among the country's best-known destinations for tarpon and snook sport fishing, plus sightings of waterbirds, monkeys, sloths and crocodiles. Access is mainly by river or air, with fishing lodges and boat trips through the canals.",
    "categories": [
      "Reservas Silvestres",
      "Islas y Manglares",
      "Aventura y Deportes"
    ],
    "latitude": 10.7337389,
    "longitude": -83.7184525
  },
  {
    "match_name": "Refugio Mixto de Vida Silvestre Gandoca-Manzanillo",
    "match_ordinal": 1,
    "name": "Refugio Mixto Gandoca-Manzanillo",
    "description_es": "El Refugio Nacional de Vida Silvestre Mixto Gandoca-Manzanillo, en el Caribe Sur de Talamanca, Limón, protege playas, arrecifes de coral, manglares, yolillales y bosque costero. Sus aguas resguardan pastos marinos visitados por el manatí, tortugas marinas y una alta diversidad de peces e invertebrados de arrecife, aptos para snorkel y buceo en condiciones tranquilas. En tierra hay senderos cortos, miradores y comunidades costeras con oferta de hospedaje y gastronomía caribeña.",
    "description_en": "The Gandoca-Manzanillo Mixed National Wildlife Refuge, on the South Caribbean of Talamanca, Limon, protects beaches, coral reefs, mangroves, Raphia palm swamps and coastal forest. Its waters hold seagrass beds visited by manatees, sea turtles and a rich diversity of reef fish and invertebrates, suited to snorkeling and diving in calm conditions. On land there are short trails, viewpoints and coastal villages with lodging and Caribbean cuisine.",
    "categories": [
      "Reservas Silvestres",
      "Playas",
      "Santuarios de Animales"
    ],
    "latitude": 9.6358327,
    "longitude": -82.6526309
  },
  {
    "match_name": "Refugio Nacional Curú",
    "match_ordinal": 1,
    "name": "Refugio Nacional Curú",
    "description_es": "El Refugio Nacional de Vida Silvestre Curú es una reserva privada en Paquera, al sur de la Península de Nicoya, Puntarenas, que combina bosque seco y húmedo, manglar, ríos y playas frente al Golfo de Nicoya. Tiene senderos de baja a media dificultad donde se observan monos congo, carablanca y araña reintroducido, venados, pizotes y aves, además de Playa Curú y la apartada Playa Quesera. Ofrece tours en kayak, snorkel, cabalgatas y visitas nocturnas, como destino integral de naturaleza de un día.",
    "description_en": "Curu National Wildlife Refuge is a private reserve in Paquera, southern Nicoya Peninsula, Puntarenas, combining dry and humid forest, mangrove, rivers and beaches on the Gulf of Nicoya. It has easy to moderate trails where howler, white-faced and reintroduced spider monkeys, deer, coatis and birds are seen, plus Playa Curu and secluded Playa Quesera. It offers kayak tours, snorkeling, horseback rides and night visits, as a full nature day destination.",
    "categories": [
      "Reservas Silvestres",
      "Playas",
      "Senderismo"
    ],
    "latitude": 9.7911739,
    "longitude": -84.9251954
  },
  {
    "match_name": "Reserva Biológica Isla del Caño",
    "match_ordinal": 1,
    "name": "Reserva Biológica Isla del Caño",
    "description_es": "La Reserva Biológica Isla del Caño es una isla oceánica frente a la Península de Osa, Puntarenas, que se visita en bote desde Bahía Drake y Uvita. Sus aguas protegen arrecifes de coral y formaciones rocosas con alta diversidad de peces, tortugas, rayas y visitas estacionales de delfines y ballenas, lo que la convierte en uno de los mejores puntos de buceo y snorkel del país. En tierra conserva bosque siempreverde, restos arqueológicos con esferas de piedra y senderos cortos con miradores.",
    "description_en": "Cano Island Biological Reserve is an ocean island off the Osa Peninsula, Puntarenas, reached by boat from Bahia Drake and Uvita. Its waters protect coral reefs and rock formations with rich fish life, turtles, rays and seasonal dolphin and whale visits, making it one of the best diving and snorkeling spots in the country. On land it holds evergreen forest, archaeological remains with stone spheres and short trails with viewpoints.",
    "categories": [
      "Reservas Silvestres",
      "Islas y Manglares",
      "Aventura y Deportes"
    ],
    "latitude": 8.7072947,
    "longitude": -83.8817947
  },
  {
    "match_name": "Reserva Biológica Monteverde",
    "match_ordinal": 1,
    "name": "Reserva Biológica Monteverde",
    "description_es": "La Reserva Biológica Bosque Nuboso Monteverde, en Puntarenas y Alajuela, protege uno de los bosques nubosos más extensos del país sobre la divisoria continental. Su red de senderos recorre bosque cargado de musgo, orquídeas y helechos, con puentes y miradores como La Ventana, donde en días despejados se aprecian ambas vertientes. Es un sitio de referencia para observar el quetzal, el pájaro campana, monos, perezosos y cientos de especies de aves y ranas.",
    "description_en": "The Monteverde Cloud Forest Biological Reserve, in Puntarenas and Alajuela, protects one of the largest cloud forests in the country along the continental divide. Its trail network crosses moss-laden forest with orchids and ferns, with bridges and viewpoints such as La Ventana, where both slopes can be seen on clear days. It is a benchmark site for watching the resplendent quetzal, three-wattled bellbird, monkeys, sloths and hundreds of bird and frog species.",
    "categories": [
      "Reservas Silvestres",
      "Senderismo",
      "Montañas y Cerros"
    ],
    "latitude": 10.3158,
    "longitude": -84.7962
  },
  {
    "match_name": "Reserva Ecológica Mosqueritos",
    "match_ordinal": 1,
    "name": "Reserva Ecológica Mosqueritos",
    "description_es": "La Reserva Ecológica Mosqueritos es una reserva privada de montaña en la zona de Providencia, Dota, San José, dentro del paisaje nuboso de Los Santos. Protege bosque de altura con senderos para caminata, observación de aves como el quetzal y contacto con nacientes y quebradas de agua clara. Es una visita tranquila de naturaleza, de clima frío y neblina frecuente, combinable con la oferta rural y gastronómica de Providencia.",
    "description_en": "The Mosqueritos Ecological Reserve is a private mountain reserve near Providencia, Dota, San Jose, inside the cloudy Los Santos landscape. It protects highland forest with hiking trails, birdwatching including the resplendent quetzal, and contact with clear-water springs and streams. It is a quiet nature visit, with cold weather and frequent mist, easy to pair with Providencia's rural and food offerings.",
    "categories": [
      "Reservas Silvestres",
      "Senderismo"
    ],
    "latitude": 9.686,
    "longitude": -83.936
  },
  {
    "match_name": "Reserva Karen Mogensen - Jicaral",
    "match_ordinal": 1,
    "name": "Reserva Karen Mogensen - Jicaral",
    "description_es": "La Reserva Karen Mogensen es una reserva privada de bosque en Jicaral, Lepanto, Puntarenas, en la Península de Nicoya. Protege una transición de bosque seco a húmedo con nacientes de agua, senderos para caminata y alta presencia de monos, venados, felinos pequeños y aves. Es un proyecto de conservación visitable con caminatas guiadas, orientado a la observación de naturaleza y al descanso en ambiente rural.",
    "description_en": "The Karen Mogensen Reserve is a private forest reserve in Jicaral, Lepanto, Puntarenas, on the Nicoya Peninsula. It protects a dry-to-humid forest transition with headwater springs, hiking trails and frequent monkeys, deer, small wildcats and birds. It is a conservation project open to visitors with guided walks, aimed at nature observation and rest in a rural setting.",
    "categories": [
      "Reservas Silvestres",
      "Senderismo"
    ],
    "latitude": 9.8697502,
    "longitude": -85.0580083
  },
  {
    "match_name": "Reserva Natural Absoluta Cabo Blanco",
    "match_ordinal": 1,
    "name": "Reserva Natural Absoluta Cabo Blanco",
    "description_es": "La Reserva Natural Absoluta Cabo Blanco, en el extremo sur de la Península de Nicoya, Puntarenas, fue la primera área protegida del país y resguarda bosque, costa rocosa y playas como Cabo Blanco y Balsitas. Sus senderos recorren bosque seco regenerado con monos, pizotes, venados y aves marinas, hasta miradores y orillas de piedra y arena clara. Es una excursión de naturaleza e historia de la conservación, con ingreso regulado y caminatas de medio día.",
    "description_en": "Cabo Blanco Absolute Natural Reserve, at the southern tip of the Nicoya Peninsula, Puntarenas, was the first protected area in the country and shelters forest, rocky coast and beaches such as Cabo Blanco and Balsitas. Its trails cross regenerating dry forest with monkeys, coatis, deer and seabirds, to viewpoints and shores of stone and light sand. It is a nature and conservation-history outing, with regulated entry and half-day hikes.",
    "categories": [
      "Reservas Silvestres",
      "Playas",
      "Senderismo"
    ],
    "latitude": 9.5627296,
    "longitude": -85.1065681
  },
  {
    "match_name": "Rinconcito Lodge",
    "match_ordinal": 1,
    "name": "Rinconcito Lodge",
    "description_es": "Rinconcito Lodge es un hospedaje rural en las faldas del macizo del Rincón de la Vieja, Guanacaste, rodeado de potreros, parches de bosque y vista a las montañas. Ofrece habitaciones y cabañas sencillas en ambiente campesino, con caminatas cortas, observación de aves y cercanía a ríos y pozas de la zona. Funciona como base tranquila y económica para explorar por cuenta propia los atractivos del sector norte del volcán.",
    "description_en": "Rinconcito Lodge is a rural lodge on the slopes of the Rincon de la Vieja massif, Guanacaste, surrounded by pastures, forest patches and mountain views. It offers simple rooms and cabins in a country atmosphere, with short walks, birdwatching and nearby rivers and pools. It works as a quiet and affordable base for exploring the northern volcano area on your own.",
    "categories": [
      "Hospedaje en la Naturaleza",
      "Senderismo"
    ],
    "latitude": 10.732706,
    "longitude": -85.301054
  },
  {
    "match_name": "Río Celeste - Parque Nacional Volcán Tenorio",
    "match_ordinal": 1,
    "name": "Río Celeste - PN Volcán Tenorio",
    "description_es": "El Río Celeste, dentro del Parque Nacional Volcán Tenorio entre Alajuela y Guanacaste, debe su color celeste a minerales de origen volcánico que se mezclan en Los Teñideros, donde confluyen los ríos Buena Vista y Quebrada Agria. El sendero del parque recorre bosque lluvioso hasta la catarata de caída alta, la laguna azul, los borbollones y el mirador del Tenorio, en una caminata de exigencia media. El baño está prohibido dentro del parque y la intensidad del color varía con las lluvias.",
    "description_en": "The Celeste River, inside Tenorio Volcano National Park between Alajuela and Guanacaste, owes its sky-blue color to volcanic minerals mixing at Los Tenideros, where the Buena Vista River and Quebrada Agria meet. The park trail crosses rainforest to the tall waterfall, the blue lagoon, the bubbling springs and the Tenorio viewpoint, on a moderately demanding hike. Swimming is prohibited inside the park and the strength of the color shifts with rainfall.",
    "categories": [
      "Parques Nacionales",
      "Ríos y Pozas",
      "Cataratas",
      "Senderismo"
    ],
    "latitude": 10.658282,
    "longitude": -84.9713512
  },
  {
    "match_name": "Río Cucaracho",
    "match_ordinal": 1,
    "name": "Río Cucaracho",
    "description_es": "El Río Cucaracho es un río de la zona de Santa Cecilia, La Cruz, Guanacaste, en el norte fronterizo del país, con pozas de agua dulce usadas como balneario rural. Su entorno combina potreros, bosque de galería y caminos de lastre, en un ambiente poco intervenido y de visita local. El baño depende del caudal y se recomienda calzado firme, precaución con piedras resbaladizas y evitar la zona con lluvias fuertes.",
    "description_en": "The Cucaracho River runs through Santa Cecilia, La Cruz, Guanacaste, in the northern border region, with freshwater pools used as a rural swimming spot. Its setting mixes pastures, gallery forest and gravel roads, in a little-developed area visited mostly by locals. Swimming depends on water flow, and sturdy footwear, care on slippery stones and avoiding the area in heavy rain are advised.",
    "categories": [
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 10.912,
    "longitude": -85.313
  },
  {
    "match_name": "Río La Mina y mirador - Miramar",
    "match_ordinal": 1,
    "name": "Río La Mina y mirador - Miramar",
    "description_es": "El Río La Mina, en Miramar de Montes de Oro, Puntarenas, es un balneario natural de poza entre rocas y bosque, frecuentado por familias de la zona. El sitio combina el baño en agua dulce con un mirador natural sobre el cañón y las montañas vecinas, apto para fotografía y descanso. El acceso es por camino rural con tramos a pie, por lo que conviene llevar hidratación, no dejar residuos y extremar el cuidado con la profundidad y las lluvias.",
    "description_en": "The La Mina River, in Miramar de Montes de Oro, Puntarenas, is a natural rock-and-forest pool popular with local families. The spot pairs freshwater swimming with a natural viewpoint over the canyon and neighboring mountains, suited to photography and rest. Access is by rural road with walking stretches, so bring water, leave no waste and take care with depth and rainy conditions.",
    "categories": [
      "Ríos y Pozas",
      "Miradores",
      "Senderismo"
    ],
    "latitude": 10.159,
    "longitude": -84.721
  },
  {
    "match_name": "Río Loro - Cartago: Un bosque urbano para desconectarse",
    "match_ordinal": 1,
    "name": "Río Loro - Cartago: bosque urbano",
    "description_es": "El sector del Río Loro en Cartago conserva un parche de bosque ribereño urbano con senderos cortos entre árboles, quebrada y espacios para caminata y observación de aves cercanas a la ciudad. Funciona como pulmón verde y aula natural para paseos familiares, fotografía y pausas al aire libre sin salir del Valle Central. Es una visita breve y de baja dificultad, donde conviene respetar la ribera y no dejar residuos.",
    "description_en": "The Rio Loro area in Cartago keeps a patch of urban riverside forest with short trails among trees, a stream and space for walking and birdwatching close to the city. It works as a green lung and outdoor classroom for family strolls, photography and open-air breaks without leaving the Central Valley. It is a short, low-difficulty visit where respecting the riverbanks and leaving no waste matters.",
    "categories": [
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 9.91,
    "longitude": -83.945
  },
  {
    "match_name": "Río Pacuare",
    "match_ordinal": 1,
    "name": "Río Pacuare",
    "description_es": "El Río Pacuare, en la vertiente caribeña entre Cartago y Limón con operaciones desde Siquirres, es el río más famoso del país para el rafting, con rápidos de clase III y IV entre cañones selváticos. Sus recorridos de uno o varios días combinan rápidos continuos, cascadas laterales, pozas y lodges de selva solo accesibles por río, en un cañón de alta biodiversidad. Las salidas operan con guías certificados y equipo de seguridad, con nivel de exigencia alto según el tramo y el caudal.",
    "description_en": "The Pacuare River, on the Caribbean slope between Cartago and Limon with operations from Siquirres, is the country's most famous rafting river, with Class III and IV rapids through jungle canyons. Its one- or multi-day runs mix continuous rapids, side waterfalls, pools and jungle lodges reachable only by river, in a highly biodiverse canyon. Trips run with certified guides and safety gear, at a high difficulty level depending on the stretch and flow.",
    "categories": [
      "Ríos y Pozas",
      "Aventura y Deportes"
    ],
    "latitude": 9.9217242,
    "longitude": -83.4574599
  },
  {
    "match_name": "RÍO PERDIDO – BAGACES",
    "match_ordinal": 1,
    "name": "Río Perdido – Bagaces",
    "description_es": "Río Perdido, en Bagaces, Guanacaste, es un cañón de bosque seco atravesado por un río de aguas termales que forma pozas naturales de distintas temperaturas entre rocas. El sitio combina baño termal, senderos por el cañón y el bosque, puentes colgantes y actividades de aventura leve, con servicios de hotel, restaurante y spa en el entorno. Es un destino de día completo o de hospedaje para termalismo y caminata en paisaje volcánico.",
    "description_en": "Rio Perdido, in Bagaces, Guanacaste, is a dry-forest canyon crossed by a hot-spring river forming natural pools of different temperatures among rocks. The site pairs thermal bathing with canyon and forest trails, hanging bridges and soft-adventure activities, plus hotel, restaurant and spa services nearby. It is a full-day or overnight destination for hot springs and hiking in a volcanic landscape.",
    "categories": [
      "Termales",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 10.594876,
    "longitude": -85.201228
  },
  {
    "match_name": "Río Picagres - San José",
    "match_ordinal": 1,
    "name": "Río Picagres - San José",
    "description_es": "El Río Picagres es un río de la zona de Piedras Negras, en el cantón de Mora, San José, en el límite con Puriscal, visitado como balneario natural por sus pozas de agua dulce y una pequeña catarata. El acceso usual es por calle de lastre desde Ciudad Colón hasta el puente sobre el río, desde donde se camina río arriba entre bosque de galería y potreros. Es un paseo de día para nadar y hacer picnic, con caudal variable que exige precaución en época lluviosa y calzado para roca resbaladiza.",
    "description_en": "The Picagres River is a river near Piedras Negras in Mora canton, San Jose, on the border with Puriscal, visited as a natural swimming area for its freshwater pools and a small waterfall. Usual access is by gravel road from Ciudad Colon to the bridge over the river, from where visitors walk upstream through gallery forest and pastures. It is a day trip for swimming and picnicking, with variable flow that requires caution in the rainy season and footwear for slippery rock.",
    "categories": [
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 9.9016666,
    "longitude": -84.3344836
  },
  {
    "match_name": "Roca Bruja & Playa Huevo",
    "match_ordinal": 1,
    "name": "Roca Bruja & Playa Huevo",
    "description_es": "Roca Bruja, conocida como Witch's Rock, es una formación rocosa frente a Playa Naranjo dentro del Parque Nacional Santa Rosa, en Guanacaste, que da nombre a una rompiente de surf de fama internacional sobre fondo de arena y roca, solo para surfistas avanzados y con acceso por bote desde Playas del Coco u Ocotal o por trocha 4x4 con permiso del parque. Playa Huevo, en el Golfo de Papagayo, es una playa pequeña de arena clara y oleaje calmo, de acceso principalmente en bote, con cuevas y arrecifes rocosos aptos para nadar y esnórquel. Ambos puntos pertenecen a sistemas costeros distintos del Pacífico Norte y requieren planificación por permisos, mareas y estacionalidad del oleaje.",
    "description_en": "Roca Bruja, known as Witch's Rock, is a rock formation off Playa Naranjo inside Santa Rosa National Park in Guanacaste, naming an internationally known surf break over sand and rock for advanced surfers only, reached by boat from Playas del Coco or Ocotal or by 4x4 track with park permit. Playa Huevo in the Gulf of Papagayo is a small light-sand beach with calm surf, reached mainly by boat, with caves and rocky reefs suited for swimming and snorkeling. Both belong to different coastal systems of the North Pacific and require planning for permits, tides and swell seasonality.",
    "categories": [
      "Playas",
      "Parques Nacionales",
      "Aventura y Deportes"
    ],
    "latitude": 10.551,
    "longitude": -85.694
  },
  {
    "match_name": "Roca Verde - Bajos del Toro",
    "match_ordinal": 1,
    "name": "Roca Verde - Bajos del Toro",
    "description_es": "La Catarata Roca Verde es una caída de agua en Bajos del Toro, Sarchí, Alajuela, llamada así por la roca cubierta de musgo verde junto a la poza. Se llega por el camino de Calle Las Delicias, en la zona de Finca Dos Ríos, con un sendero de alrededor de 5 km entre bosque nuboso, puentes y cruces de río que se vuelve lodoso y resbaladizo con lluvia. Es una visita poco concurrida para caminata y baño en agua fría, sin servicios formales en el sendero final.",
    "description_en": "Roca Verde Waterfall is a waterfall in Bajos del Toro, Sarchi, Alajuela, named for the moss-covered green rock beside its pool. It is reached via Calle Las Delicias in the Finca Dos Rios area, on a trail of about 5 km through cloud forest, bridges and river crossings that turns muddy and slippery in rain. It is a little-visited hike for walking and cold-water swimming, with no formal services on the final trail section.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 10.2144983,
    "longitude": -84.297655
  },
  {
    "match_name": "Ruta del Agua",
    "match_ordinal": 1,
    "name": "Ruta del Agua",
    "description_es": "La Ruta del Agua es un conjunto de fincas con cataratas y pozas en Platanillo de Barú y alrededores de Pérez Zeledón, San José y Puntarenas, que incluye saltos como Eco Chontales, Rana Roja, Elysiana, La Ceiba-La Raíz, Namú y San Gabriel, además de la cercana Nauyaca sobre el río Barucito. Los recorridos son por senderos de bosque húmedo de 1 a 6 km, con pozas para nadar y tramos de dificultad moderada. El acceso es desde Dominical hacia Platanillo o desde San Isidro por la Ruta 2, con ingreso por fincas privadas con horario y costo.",
    "description_en": "The Ruta del Agua is a group of farms with waterfalls and pools in Platanillo de Baru and around Perez Zeledon, San Jose and Puntarenas, including falls such as Eco Chontales, Rana Roja, Elysiana, La Ceiba-La Raiz, Namu and San Gabriel, plus nearby Nauyaca on the Barucito River. Routes follow humid-forest trails of 1 to 6 km, with swimming pools and moderate-difficulty sections. Access is from Dominical toward Platanillo or from San Isidro via Route 2, entering through private farms with hours and fees.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 9.352391,
    "longitude": -83.84064
  },
  {
    "match_name": "Ruta del Agua – Cerros de Escazú 🌿💧",
    "match_ordinal": 1,
    "name": "Ruta del Agua – Cerros de Escazú",
    "description_es": "La Ruta del Agua en los Cerros de Escazú es un recorrido de senderismo en la Zona Protectora Cerros de Escazú, que protege nacientes y captaciones de agua potable del Valle Central, con paso por el río Agres y quebradas entre bosque premontano y robledales. El circuito parte de San Antonio de Escazú, cerca de los filtros del AyA y fincas de la zona, con subidas por potreros y tramos de piedra y una catarata entre helechos. Es una caminata de exigencia moderada, en terreno privado y comunal donde se requiere guía o permiso y no hay servicios formales.",
    "description_en": "The Ruta del Agua in the Cerros de Escazu is a hiking route in the Cerros de Escazu Protective Zone, which safeguards springs and drinking-water intakes for the Central Valley, passing the Agres River and streams through premontane forest and oak stands. The circuit starts from San Antonio de Escazu near the AyA water filters and local farms, climbing through pastures and stone sections to a waterfall among ferns. It is a moderately demanding hike on private and community land where a guide or permission is required and there are no formal services.",
    "categories": [
      "Senderismo",
      "Ríos y Pozas",
      "Montañas y Cerros"
    ],
    "latitude": 9.893,
    "longitude": -84.127
  },
  {
    "match_name": "Ruta Guana Clásico",
    "match_ordinal": 1,
    "name": "Ruta Guana Clásico",
    "description_es": "La Ruta Guana Clásico es un itinerario turístico por Guanacaste que combina montaña, cataratas, pozas y playas en un fin de semana, con paradas habituales como Cerro Pelado, Poza Los Coyotes y Playa Iguanita, además del sector de Liberia. Une tramos de carretera asfaltada con caminos de lastre, y el descenso a Playa Iguanita requiere vehículo 4x4. Es una ruta escénica para fotografía, baño y kayak en aguas calmas, con clima seco y caliente la mayor parte del año.",
    "description_en": "The Ruta Guana Clasico is a touring itinerary through Guanacaste combining mountains, waterfalls, pools and beaches in a weekend, with usual stops such as Cerro Pelado, Poza Los Coyotes and Playa Iguanita, plus the Liberia area. It links paved highway with gravel sections, and the descent to Playa Iguanita requires a 4x4 vehicle. It is a scenic route for photography, swimming and kayaking in calm water, with dry and hot weather most of the year.",
    "categories": [
      "Aventura y Deportes",
      "Playas",
      "Cataratas"
    ],
    "latitude": 10.256,
    "longitude": -84.365
  },
  {
    "match_name": "Ruta Pacífico Verde",
    "match_ordinal": 1,
    "name": "Ruta Pacífico Verde",
    "description_es": "La Ruta Pacífico Verde corresponde al corredor costero del cantón de Osa, Puntarenas, entre el litoral del Pacífico Central Sur, los manglares de Sierpe y la Península de Osa, con playas, esteros y bosque húmedo tropical. La zona articula miradores costeros, desembocaduras y accesos hacia el Parque Nacional Corcovado, la Reserva Forestal Golfo Dulce e Isla del Caño. Es un sector de alta biodiversidad y lluvias intensas de mayo a noviembre, donde los desplazamientos dependen del estado de los caminos y las mareas.",
    "description_en": "The Ruta Pacifico Verde is the coastal corridor of Osa canton, Puntarenas, between the South-Central Pacific shoreline, the Sierpe mangroves and the Osa Peninsula, with beaches, estuaries and tropical wet forest. The area links coastal viewpoints, river mouths and accesses toward Corcovado National Park, the Golfo Dulce Forest Reserve and Cano Island. It is a highly biodiverse area with heavy rain from May to November, where travel depends on road conditions and tides.",
    "categories": [
      "Playas",
      "Senderismo",
      "Islas y Manglares"
    ],
    "latitude": 9.1635009,
    "longitude": -83.7358514
  },
  {
    "match_name": "Salto Calvo - Hojancha",
    "match_ordinal": 1,
    "name": "Salto Calvo - Hojancha",
    "description_es": "El Salto del Calvo es un sistema de dos caídas gemelas sobre el río Zapotal en San Isidro de Hojancha, Guanacaste, con alturas reportadas de alrededor de 300 y 350 metros, entre las más altas del país. Se ubica a unos 14 km al sur del centro de Hojancha, en dirección a Monte Romo y la Reserva Monte Alto, dentro del corredor biológico Hojancha-Nandayure. La visita combina caminata o cabalgata de unos 4 km, pozas como Poza Azul a lo largo del río y vista directa al paredón, con acceso por finca privada.",
    "description_en": "Salto del Calvo is a twin-waterfall system on the Zapotal River in San Isidro de Hojancha, Guanacaste, with reported heights of about 300 and 350 meters, among the tallest in the country. It lies about 14 km south of central Hojancha toward Monte Romo and the Monte Alto Reserve, within the Hojancha-Nandayure biological corridor. The visit combines a hike or horseback ride of about 4 km, pools such as Poza Azul along the river and direct views of the rock face, with access through a private farm.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Aventura y Deportes"
    ],
    "latitude": 9.978,
    "longitude": -85.392
  },
  {
    "match_name": "Salto La Diosa - Limón",
    "match_ordinal": 1,
    "name": "Salto La Diosa - Limón",
    "description_es": "El Salto La Diosa es una catarata de unos 50 metros sobre el río Parismina en Tierra Grande de Guácimo, Limón, en la zona de Pococí y Guápiles, rodeada de selva caribeña siempre verde. El agua cae sobre rocas y continúa como río cristalino, con poco espacio de poza profunda en la base y áreas para picnic. El acceso es por Guácimo por camino rural y sendero en finca privada con guía local, de dificultad moderada y resbaladizo con lluvia.",
    "description_en": "Salto La Diosa is a waterfall of about 50 meters on the Parismina River at Tierra Grande de Guacimo, Limon, in the Pococi and Guapiles area, surrounded by evergreen Caribbean jungle. The water falls over rocks and continues as a clear river, with little deep-pool space at the base and areas for picnicking. Access is via Guacimo by rural road and trail on a private farm with a local guide, of moderate difficulty and slippery when wet.",
    "categories": [
      "Cataratas",
      "Senderismo"
    ],
    "latitude": 10.2127003,
    "longitude": -83.6866091
  },
  {
    "match_name": "Sámara - Guanacaste",
    "match_ordinal": 1,
    "name": "Sámara - Guanacaste",
    "description_es": "Sámara es una playa de bahía curva en el cantón de Nicoya, Guanacaste, protegida del oleaje directo por Isla Chora, ubicada a unos 1,5 km mar adentro, lo que genera aguas generalmente calmas para nadar. Isla Chora es un islote deshabitado con playa de arena blanca en el lado de la bahía y costa rocosa hacia el Pacífico, parte de un refugio de vida silvestre con iguanas, cangrejos y peces de arrecife. La actividad central es el kayak y el esnórquel guiado desde Playa Sámara, con mejores condiciones en la mañana y en época seca.",
    "description_en": "Samara is a curved bay beach in Nicoya canton, Guanacaste, sheltered from direct swell by Chora Island about 1.5 km offshore, producing generally calm water for swimming. Chora Island is an uninhabited islet with a white-sand beach on the bay side and rocky shore toward the Pacific, part of a wildlife refuge with iguanas, crabs and reef fish. The main activity is guided kayaking and snorkeling from Playa Samara, with best conditions in the morning and in the dry season.",
    "categories": [
      "Playas",
      "Islas y Manglares",
      "Aventura y Deportes"
    ],
    "latitude": 9.873,
    "longitude": -85.508
  },
  {
    "match_name": "San Juanillo- Avellanas Grande",
    "match_ordinal": 1,
    "name": "San Juanillo-Avellanas Grande",
    "description_es": "Este sector agrupa dos playas del cantón de Santa Cruz, Guanacaste: San Juanillo, con tres ensenadas de arena blanca unidas por tómbolos y una roca-mirador que divide el mar en dos, y Avellanas, extensa playa de arena clara con oleaje para surf y un manglar con puente de madera. San Juanillo ofrece aguas tranquilas y piscinas naturales entre rocas en marea baja para nadar y esnórquel, mientras Avellanas presenta corrientes fuertes en varios puntos. El acceso es por caminos rurales desde Santa Cruz o Nosara, con estacionamiento y servicios básicos en los poblados cercanos.",
    "description_en": "This area groups two beaches in Santa Cruz canton, Guanacaste: San Juanillo, with three white-sand coves joined by tombolos and a rock viewpoint dividing the sea in two, and Avellanas, a long light-sand beach with surf breaks and a mangrove crossed by a wooden bridge. San Juanillo offers calm water and natural rock pools at low tide for swimming and snorkeling, while Avellanas has strong currents in several spots. Access is by rural roads from Santa Cruz or Nosara, with parking and basic services in nearby villages.",
    "categories": [
      "Playas",
      "Islas y Manglares",
      "Aventura y Deportes"
    ],
    "latitude": 10.031,
    "longitude": -85.734
  },
  {
    "match_name": "San Vicente Hideaway - San Carlos",
    "match_ordinal": 1,
    "name": "San Vicente Hideaway - San Carlos",
    "description_es": "San Vicente Hideaway es un emprendimiento familiar en San Vicente de Ciudad Quesada, San Carlos, Alajuela, colindante con el Parque Nacional Juan Castro Blanco, conocido como Parque Nacional del Agua. Cuenta con cabañas, albergue y restaurante de cocina artesanal, y una red de senderos por bosque nuboso hacia las cataratas Jade y Acuarela y hacia la cima del Volcán Platanar. El sitio se ubica a unos 35 minutos de Ciudad Quesada por carretera apta para todo vehículo y opera con reservación.",
    "description_en": "San Vicente Hideaway is a family-run lodge in San Vicente de Ciudad Quesada, San Carlos, Alajuela, bordering Juan Castro Blanco National Park, known as the Water National Park. It has cabins, a hostel and a restaurant with artisanal cooking, and a network of cloud-forest trails to the Jade and Acuarela waterfalls and to the summit of Platanar Volcano. The site lies about 35 minutes from Ciudad Quesada by road suitable for all vehicles and operates by reservation.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.279549,
    "longitude": -84.3935183
  },
  {
    "match_name": "Santa Rosa & Junquillal - Guanacaste",
    "match_ordinal": 1,
    "name": "Santa Rosa & Junquillal - Guanacaste",
    "description_es": "El Parque Nacional Santa Rosa, a unos 35 km al norte de Liberia sobre la Ruta 1, protege la mayor muestra de bosque seco tropical de Mesoamérica y el sitio histórico de la Batalla de Santa Rosa de 1856, con el Museo La Casona, corrales de piedra y senderos, además del acceso 4x4 a Playa Naranjo. El Refugio Nacional de Vida Silvestre Bahía Junquillal, de 505 hectáreas terrestres cerca de Cuajiniquil en La Cruz, protege bosque seco hasta la playa y manglar costero, con playa tranquila de 2 km, zona de acampar y áreas de día. Ambos forman parte del Área de Conservación Guanacaste, declarada Patrimonio Mundial.",
    "description_en": "Santa Rosa National Park, about 35 km north of Liberia on Route 1, protects the largest remnant of Mesoamerican tropical dry forest and the historic site of the 1856 Battle of Santa Rosa, with La Casona Museum, stone corrals and trails, plus 4x4 access to Playa Naranjo. Bahia Junquillal National Wildlife Refuge, of 505 land hectares near Cuajiniquil in La Cruz, protects dry forest to the beach and coastal mangrove, with a calm 2-km beach, camping and day-use areas. Both belong to the Area de Conservacion Guanacaste World Heritage site.",
    "categories": [
      "Parques Nacionales",
      "Playas",
      "Cultura e Historia"
    ],
    "latitude": 10.901,
    "longitude": -85.732
  },
  {
    "match_name": "Santa Teresa y Montezuma 🌊🐴 | Vacaciones épicas en Puntarenas",
    "match_ordinal": 1,
    "name": "Santa Teresa y Montezuma",
    "description_es": "Santa Teresa y Montezuma son dos centros del sur de la Península de Nicoya, Puntarenas, accesibles por ferry Puntarenas-Paquera y carretera hacia Cóbano. Santa Teresa es un corredor de playas abiertas al Pacífico con oleaje consistente para surf, mientras Montezuma es un pueblo de una calle con ambiente bohemio y un sistema de tres cataratas a menos de 30 minutos a pie, además de salidas en bote a Isla Tortuga. En los alrededores se encuentran la Reserva Cabo Blanco y playas como Las Manchas y Cabuya.",
    "description_en": "Santa Teresa and Montezuma are two hubs of the southern Nicoya Peninsula, Puntarenas, reached by the Puntarenas-Paquera ferry and road via Cobano. Santa Teresa is an open Pacific beach corridor with consistent surf, while Montezuma is a single-street village with a bohemian atmosphere and a three-tier waterfall system less than 30 minutes on foot, plus boat trips to Tortuga Island. Nearby are the Cabo Blanco Reserve and beaches such as Las Manchas and Cabuya.",
    "categories": [
      "Playas",
      "Cataratas",
      "Aventura y Deportes"
    ],
    "latitude": 9.641,
    "longitude": -85.16
  },
  {
    "match_name": "Senderos de Colón - Ciudad Colón",
    "match_ordinal": 1,
    "name": "Senderos de Colón - Ciudad Colón",
    "description_es": "Senderos de Colón es una finca privada para senderismo y ciclismo de montaña en Ciudad Colón, Mora, San José, abierta desde 2014, con circuitos de lastre y singletrack para todos los niveles y un desnivel acumulado superior a 350 metros. Se ubica a 2 km de la pulpería Chepe Monge por la Ruta 27, con parqueo amplio y acceso para automóvil. Opera con horario diurno y pago de entrada, y ofrece vistas del Valle Central entre bosque secundario.",
    "description_en": "Senderos de Colon is a private farm for hiking and mountain biking in Ciudad Colon, Mora, San Jose, open since 2014, with gravel and singletrack circuits for all levels and over 350 meters of cumulative climbing. It lies 2 km from the Chepe Monge store via Route 27, with ample parking and access by regular car. It operates in daytime with an entry fee and offers Central Valley views through secondary forest.",
    "categories": [
      "Senderismo",
      "Aventura y Deportes"
    ],
    "latitude": 9.9040953,
    "longitude": -84.2480557
  },
  {
    "match_name": "Senderos La Arboleda - La Guácima",
    "match_ordinal": 1,
    "name": "Senderos La Arboleda - La Guácima",
    "description_es": "Senderos La Arboleda es una finca con senderos en Las Vueltas de La Guácima, Alajuela, con unos 5 a 6 km de rutas circulares bajo sombra de bosque secundario para caminata y ciclismo recreativo. El recorrido principal asciende alrededor de una hora hasta un mirador con vista a las montañas de Heredia, apto para ir con mascotas y sin necesidad de 4x4. No cuenta con accesibilidad universal y se recomienda llevar hidratación por el calor de la zona.",
    "description_en": "Senderos La Arboleda is a farm with trails at Las Vueltas de La Guacima, Alajuela, with about 5 to 6 km of loop routes under secondary-forest shade for hiking and recreational cycling. The main route climbs about one hour to a viewpoint facing the Heredia mountains, suitable for visiting with pets and without need for 4x4. It has no universal accessibility and carrying water is advised because of the area's heat.",
    "categories": [
      "Senderismo"
    ],
    "latitude": 9.9509643,
    "longitude": -84.288444
  },
  {
    "match_name": "Sensoria - Aguas Claras",
    "match_ordinal": 1,
    "name": "Sensoria - Aguas Claras",
    "description_es": "Sensoria es una reserva privada en Aguas Claras, al norte del Volcán Rincón de la Vieja, Guanacaste, con bosque lluvioso de altura media, cataratas de agua turquesa como Buenos Aires sobre el río Pénjamo y pozas termales minerales como Jícara, Pilón y Morpho. Los tours guiados recorren unos 7 km entre miradores, puentes y pozas, con almuerzo en La Casona y traslado final por camino que requiere 4x4. Es hábitat de dantas, monos, tucanes y ranas, con alta pluviosidad durante casi todo el año.",
    "description_en": "Sensoria is a private reserve at Aguas Claras on the northern side of Rincon de la Vieja Volcano, Guanacaste, with mid-elevation rainforest, turquoise waterfalls such as Buenos Aires on the Penjamo River and mineral thermal pools such as Jicara, Pilon and Morpho. Guided tours cover about 7 km among viewpoints, bridges and pools, with lunch at La Casona and final access by road requiring 4x4. It is habitat for tapirs, monkeys, toucans and frogs, with high rainfall almost year-round.",
    "categories": [
      "Cataratas",
      "Termales",
      "Senderismo"
    ],
    "latitude": 10.856243,
    "longitude": -85.346938
  },
  {
    "match_name": "Sitio Arqueológico Finca 6 (Esferas Diquís)",
    "match_ordinal": 1,
    "name": "Sitio Arqueológico Finca 6 (Esferas Diquís)",
    "description_es": "El Sitio Museo Finca 6 se ubica en Palmar Sur de Osa, Puntarenas, en la llanura aluvial del Delta del Diquís entre los ríos Térraba y Sierpe, y conserva un asentamiento cacical ocupado entre 800 y 1500 d.C. con dos montículos de vivienda, calzadas y esferas de piedra en su posición original, incluidos dos alineamientos orientados este-oeste. Junto con Batambal, El Silencio y Grijalba-2 fue declarado Patrimonio Mundial por la UNESCO en 2014 y es administrado por el Museo Nacional, con centro de visitantes y senderos de 175 a 1150 metros.",
    "description_en": "The Finca 6 Museum Site lies in Palmar Sur de Osa, Puntarenas, on the alluvial plain of the Diquis Delta between the Terraba and Sierpe rivers, preserving a chiefdom settlement occupied between 800 and 1500 CE with two dwelling mounds, pavements and stone spheres in their original position, including two east-west alignments. Together with Batambal, El Silencio and Grijalba-2 it was declared a UNESCO World Heritage site in 2014 and is managed by the National Museum, with a visitor center and trails of 175 to 1150 meters.",
    "categories": [
      "Cultura e Historia",
      "Senderismo"
    ],
    "latitude": 8.9123205,
    "longitude": -83.4781372
  },
  {
    "match_name": "SUP Herradura 🏄‍♂️🌴",
    "match_ordinal": 1,
    "name": "SUP Herradura",
    "description_es": "SUP Herradura es un centro de stand up paddle y kayak en Bahía Herradura, Jacó, Puntarenas, a unos 90 minutos de San José, que aprovecha las aguas generalmente calmas y protegidas de la bahía. Ofrece clases de iniciación, alquiler de tablas, tours al atardecer y recorridos con esnórquel, además de salidas en Playa Naranjo del Golfo de Nicoya. Opera todos los días junto a la playa, sin necesidad de oleaje fuerte y con equipo e instructor incluidos.",
    "description_en": "SUP Herradura is a stand up paddle and kayak center in Herradura Bay, Jaco, Puntarenas, about 90 minutes from San Jose, using the generally calm and sheltered waters of the bay. It offers beginner classes, board rentals, sunset tours and snorkeling trips, plus outings at Playa Naranjo in the Gulf of Nicoya. It operates daily by the beach, without need for strong surf and with equipment and instructor included.",
    "categories": [
      "Aventura y Deportes",
      "Playas"
    ],
    "latitude": 9.648,
    "longitude": -84.651
  },
  {
    "match_name": "Territorio de Zaguates – Caminá con la manada más feliz del mundo 🐶💛",
    "match_ordinal": 1,
    "name": "Territorio de Zaguates",
    "description_es": "El Territorio de Zaguates es un santuario canino sin eutanasia en las montañas de Carrizal de Alajuela, en las faldas del Volcán Poás, con una finca de unas 400 hectáreas donde viven más de un millar de perros rescatados. Funciona como albergue temporal y permanente, con programas de castración, atención veterinaria y adopción, sostenido por donaciones. Las visitas guiadas por los potreros y senderos requieren reservación previa y contacto directo, ya que el acceso ha operado con cierres temporales por mejoras.",
    "description_en": "Territorio de Zaguates is a no-kill dog sanctuary in the mountains of Carrizal de Alajuela on the slopes of Poas Volcano, on a farm of about 400 hectares housing over a thousand rescued dogs. It works as a temporary and permanent shelter with neutering, veterinary care and adoption programs, supported by donations. Guided visits through pastures and trails require advance booking and direct contact, as access has operated with temporary closures for improvements.",
    "categories": [
      "Santuarios de Animales",
      "Montañas y Cerros"
    ],
    "latitude": 10.09753,
    "longitude": -84.153492
  },
  {
    "match_name": "TESORO ESCONDIDO - Bajos del Toro",
    "match_ordinal": 1,
    "name": "TESORO ESCONDIDO - Bajos del Toro",
    "description_es": "La Catarata Tesoro Escondido es una caída de unos 65 metros de agua celeste en Bajos del Toro, Sarchí, Alajuela, dentro de una finca privada con pozas, puente colgante y el mirador La Gota. El recorrido es de unos 3 km ida y vuelta entre potreros, quebradas y bosque, con cruces de río y roca resbaladiza. Opera con reservación, pago de entrada y paquetes con alimentación y cabalgata, además de área de restaurante y camping.",
    "description_en": "Tesoro Escondido Waterfall is a fall of about 65 meters with light-blue water in Bajos del Toro, Sarchi, Alajuela, inside a private farm with pools, a hanging bridge and the La Gota viewpoint. The route is about 3 km round trip through pastures, streams and forest, with river crossings and slippery rock. It operates by reservation with entry fees and packages including meals and horseback rides, plus a restaurant area and camping.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Senderismo"
    ],
    "latitude": 10.22,
    "longitude": -84.29
  },
  {
    "match_name": "Tortuguero 🐢🌿",
    "match_ordinal": 1,
    "name": "Tortuguero",
    "description_es": "Tortuguero reúne el pueblo caribeño y el Parque Nacional Tortuguero en Pococí, Limón, accesible solo por bote o avioneta a través de los ríos La Suerte y Tortuguero y los canales entre Moín y Barra del Colorado. El parque, creado en 1970, abarca unas 76.937 hectáreas, con 26.653 terrestres de bosque muy húmedo y red de canales, y protege la principal playa de anidación de tortuga verde del hemisferio occidental. La visita combina tours en bote por caños como Harold y Chiquero, senderos, el Cerro Tortuguero de 119 metros y el desove nocturno de tortugas en temporada con guía autorizado.",
    "description_en": "Tortuguero brings together the Caribbean village and Tortuguero National Park in Pococi, Limon, reached only by boat or small plane via the La Suerte and Tortuguero rivers and the canals between Moin and Barra del Colorado. The park, created in 1970, covers about 76,937 hectares, with 26,653 land hectares of very wet forest and canal network, and protects the main green-turtle nesting beach of the Western Hemisphere. Visits combine boat tours through channels such as Harold and Chiquero, trails, the 119-meter Tortuguero Hill and guided nighttime turtle nesting in season.",
    "categories": [
      "Parques Nacionales",
      "Islas y Manglares",
      "Santuarios de Animales"
    ],
    "latitude": 10.4488767,
    "longitude": -83.5069226
  },
  {
    "match_name": "Unkai",
    "match_ordinal": 1,
    "name": "Unkai",
    "description_es": "Unkai corresponde a un sector boscoso en Santa Ana, San José, en la vertiente occidental de los Cerros de Escazú, caracterizado por bosque premontano secundario, cafetales y quebradas. Es un entorno de caminatas cortas y observación de aves como yigüirros y tucancillos, con vistas parciales al valle y clima fresco por la altura. El acceso es por caminos vecinales de Santa Ana y no cuenta con infraestructura turística formal documentada, por lo que se visita como área natural de paso.",
    "description_en": "Unkai is a wooded area in Santa Ana, San Jose, on the western slope of the Cerros de Escazu, characterized by secondary premontane forest, coffee plots and small streams. It is a setting for short walks and birdwatching such as clay-colored thrushes and aracaris, with partial valley views and cool weather from elevation. Access is by local roads in Santa Ana and it has no documented formal tourism infrastructure, so it is visited as a natural pass-through area.",
    "categories": [
      "Senderismo",
      "Reservas Silvestres"
    ],
    "latitude": 9.82343,
    "longitude": -84.245203
  },
  {
    "match_name": "Ventolera & Pico Blanco - Escazú",
    "match_ordinal": 1,
    "name": "Ventolera & Pico Blanco - Escazú",
    "description_es": "La Ventolera y Pico Blanco forman un sector de la Zona Protectora Cerros de Escazú, en San Antonio de Escazú, con un potrero abierto y ventoso que sirve de mirador panorámico del Valle Central y la Cordillera Volcánica Central. Desde Bebedero y los filtros del AyA parten rutas de lastre y sendero hacia Pico Alto y el cono rocoso de Pico Blanco, de 2.428 metros, con un desnivel acumulado cercano a 700 metros. Es una ruta de exigencia moderada a alta, expuesta al sol y al viento, donde se requiere calzado de tracción y agua.",
    "description_en": "La Ventolera and Pico Blanco form an area of the Cerros de Escazu Protective Zone in San Antonio de Escazu, with an open windy pasture serving as a panoramic viewpoint over the Central Valley and the Central Volcanic Range. From Bebedero and the AyA water filters, gravel and trail routes lead to Pico Alto and the rocky cone of Pico Blanco at 2,428 meters, with cumulative climbing near 700 meters. It is a moderate-to-hard route exposed to sun and wind, requiring grippy footwear and water.",
    "categories": [
      "Miradores",
      "Montañas y Cerros",
      "Senderismo"
    ],
    "latitude": 9.9105841,
    "longitude": -84.1642845
  },
  {
    "match_name": "Ventolera: El mejor potrero para escaparse en Escazú con picnic y papalotes 🪁☀️",
    "match_ordinal": 1,
    "name": "Ventolera: potrero Escazú picnic",
    "description_es": "La Ventolera es un potrero abierto sin árboles en las montañas de Escazú, San José, dentro de la Zona Protectora Cerros de Escazú, usado para picnic, vuelo de papalotes y deslizamiento en cartones por la loma de zacate. Desde su punto alto se observa casi todo el Valle Central, con presencia de vacas y caballos en potreros vecinos. El acceso es por Bebedero de Escazú por camino de lastre con piedra suelta, recomendado para 4x4, sin servicios formales y con fuerte exposición al viento y al sol.",
    "description_en": "La Ventolera is an open treeless pasture in the Escazu mountains, San Jose, inside the Cerros de Escazu Protective Zone, used for picnics, kite flying and sliding on cardboard down the grassy hill. From its high point almost the entire Central Valley is visible, with cows and horses in neighboring pastures. Access is via Bebedero de Escazu by gravel road with loose stone, recommended for 4x4, with no formal services and strong exposure to wind and sun.",
    "categories": [
      "Miradores",
      "Senderismo"
    ],
    "latitude": 9.896,
    "longitude": -84.159
  },
  {
    "match_name": "Verde Malakita",
    "match_ordinal": 1,
    "name": "Verde Malakita",
    "description_es": "Verde Malakita es un centro de turismo rural en San Pablo de Turrubares, San José, a unos 40 a 50 minutos de San José, con dos cataratas, más de cinco pozas de agua cristalina y tres senderos de 400 metros a 2,5 km. Ofrece restaurante de comida típica los fines de semana, feriados y vacaciones, además de pesca de trucha, zona de camping y avistamiento de monos, tucanes y mariposas. El descenso a la catarata principal es empinado y no es apto para personas con movilidad reducida.",
    "description_en": "Verde Malakita is a rural tourism center in San Pablo de Turrubares, San Jose, about 40 to 50 minutes from San Jose, with two waterfalls, more than five clear-water pools and three trails from 400 meters to 2.5 km. It offers a typical-food restaurant on weekends, holidays and vacations, plus trout fishing, a camping area and sightings of monkeys, toucans and butterflies. The descent to the main waterfall is steep and not suited for people with reduced mobility.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Experiencia Gastronómica"
    ],
    "latitude": 9.908,
    "longitude": -84.47
  },
  {
    "match_name": "Volcán Barva: Hiking entre neblina, lagunas y senderos épicos a solo 35 km de San José 🌋🌿",
    "match_ordinal": 1,
    "name": "Volcán Barva: lagunas y senderos",
    "description_es": "El Volcán Barva, de 2.906 metros, es el tercer volcán más alto de Costa Rica y el de mayor extensión, ubicado en el sector Volcán Barva del Parque Nacional Braulio Carrillo entre Heredia y San José. Su cráter principal está ocupado por la laguna Barva, de unos 70 metros de diámetro, junto a las lagunas Danta de origen cratérico y Copey de origen pantanoso, rodeadas de bosque nuboso con quetzales y robles. Cuenta con cuatro senderos señalizados, Laguna Barva de 3 km, Copey de 5 km, Cacho Venado y Mirador Vara Blanca, con clima frío y acceso por Sacramento de Barva.",
    "description_en": "Barva Volcano, at 2,906 meters, is the third-highest volcano in Costa Rica and the largest by area, located in the Barva Volcano sector of Braulio Carrillo National Park between Heredia and San Jose. Its main crater holds Barva Lagoon, about 70 meters across, alongside crater-origin Danta Lagoon and swamp-origin Copey Lagoon, ringed by cloud forest with quetzals and oaks. It has four marked trails, 3-km Laguna Barva, 5-km Copey, Cacho Venado and Vara Blanca viewpoint, with cold weather and access via Sacramento de Barva.",
    "categories": [
      "Volcanes",
      "Parques Nacionales",
      "Senderismo"
    ],
    "latitude": 10.13,
    "longitude": -84.126
  },
  {
    "match_name": "Volcán Irazú - Sector Prusia",
    "match_ordinal": 1,
    "name": "Volcán Irazú - Sector Prusia",
    "description_es": "El Sector Prusia es el sector boscoso del Parque Nacional Volcán Irazú en Cartago, separado del sector de cráteres, con unos 16 km de senderos como El Roble, El Puma, Los Abuelos, La Gruta y Cabeza de Vaca entre plantaciones de pino, eucalipto y roble. Incluye áreas de picnic, agua potable y servicios sanitarios, además de puntos como el Árbol Embrujado y los cerros Retes y Cabeza de Vaca. Abre todos los días de 8 a.m. a 4 p.m., con último ingreso a la 1 p.m. y clima frío con neblina frecuente.",
    "description_en": "Sector Prusia is the forested sector of Irazu Volcano National Park in Cartago, separate from the crater sector, with about 16 km of trails such as El Roble, El Puma, Los Abuelos, La Gruta and Cabeza de Vaca through pine, eucalyptus and oak stands. It includes picnic areas, drinking water and restrooms, plus features such as the Haunted Tree and Retes and Cabeza de Vaca hills. It opens daily from 8 a.m. to 4 p.m., with last entry at 1 p.m. and cold weather with frequent mist.",
    "categories": [
      "Volcanes",
      "Parques Nacionales",
      "Senderismo"
    ],
    "latitude": 9.9675,
    "longitude": -83.8822
  },
  {
    "match_name": "Volcán Turrialba: Un gigante imponente con vista al infinito 🌋🌿",
    "match_ordinal": 1,
    "name": "Volcán Turrialba",
    "description_es": "El Volcán Turrialba, de 3.340 metros, es un estratovolcán activo y el segundo más alto del país, en el cantón de Turrialba, Cartago, dentro del Parque Nacional Volcán Turrialba creado en 1955. Desde sus miradores en días despejados se observan las llanuras del Caribe, el Valle de Turrialba, el Volcán Barva, el Poás y la Cordillera de Talamanca. El acceso al cráter inmediato permanece restringido por un perímetro de seguridad por actividad eruptiva, con senderos y miradores habilitados y bosque montano y páramo en la cumbre.",
    "description_en": "Turrialba Volcano, at 3,340 meters, is an active stratovolcano and the second-highest in the country, in Turrialba canton, Cartago, inside Turrialba Volcano National Park created in 1955. From its viewpoints on clear days the Caribbean plains, the Turrialba Valley, Barva Volcano, Poas and the Talamanca Range can be seen. Access to the immediate crater remains restricted by a safety perimeter due to eruptive activity, with enabled trails and viewpoints and montane forest and paramo at the summit.",
    "categories": [
      "Volcanes",
      "Parques Nacionales",
      "Miradores"
    ],
    "latitude": 10.0029697741044,
    "longitude": -83.7585062548322
  },
  {
    "match_name": "Vuelta del Cañón 🌿💦 | Aventura extrema en Bajos del Toro",
    "match_ordinal": 1,
    "name": "Vuelta del Cañón, Bajos del Toro",
    "description_es": "La Vuelta del Cañón es una caminata de 9 a 12 km ida y vuelta en Bajos del Toro, Sarchí, Alajuela, con unos diez cruces del río Toro por bosque nuboso y potreros hasta una catarata de doble caída en un cañón estrecho de paredes con musgo. La poza turquesa de la base permite nadar, con agua fría por la altura y nivel variable según lluvias. Requiere guía, reservación y pago por finca privada, buen estado físico y calzado para barro, y no es apta para niños pequeños ni personas con movilidad limitada.",
    "description_en": "Vuelta del Canon is a 9 to 12 km round-trip hike in Bajos del Toro, Sarchi, Alajuela, with about ten crossings of the Toro River through cloud forest and pastures to a double-drop waterfall in a narrow moss-walled canyon. The turquoise pool at the base allows swimming, with cold water from elevation and levels varying with rain. It requires a guide, reservation and private-farm fee, good fitness and footwear for mud, and is not suited for small children or people with limited mobility.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Aventura y Deportes"
    ],
    "latitude": 10.238,
    "longitude": -84.274
  }
]$researched_destinations$::jsonb)
  as item(match_name text, match_ordinal integer, name text, description_es text, description_en text, categories text[], latitude double precision, longitude double precision);

create temporary table destination_refresh_matches on commit drop as
with ranked_destinations as (
  select destination.*,
         row_number() over (partition by destination.name order by destination.latitude, destination.longitude, destination.id) as match_ordinal
  from public.destinations destination
)
select destination.id as destination_id, payload.*
from destination_refresh_payload payload
join ranked_destinations destination
  on destination.name = payload.match_name
 and destination.match_ordinal = payload.match_ordinal;

do $$
begin
  if (select count(*) from destination_refresh_payload) <> 386 then
    raise exception 'Expected 386 researched destinations';
  end if;
  if (select count(*) from destination_refresh_matches) <> 386 then
    raise exception 'Researched destinations matched % current rows, expected 386',
      (select count(*) from destination_refresh_matches);
  end if;
end $$;

insert into private.destination_content_backups (batch_key, destination_id, snapshot)
select '20260903_researched_content', destination.id, to_jsonb(destination)
from public.destinations destination
join destination_refresh_matches payload on payload.destination_id = destination.id
on conflict (batch_key, destination_id) do nothing;

update public.destinations destination
set name = payload.name,
    description = payload.description_es,
    description_en = payload.description_en,
    category = array_to_string(payload.categories, ' / '),
    location = public.st_setsrid(public.st_makepoint(payload.longitude, payload.latitude), 4326)
from destination_refresh_matches payload
where destination.id = payload.destination_id;

do $$
begin
  if (select count(*) from private.destination_content_backups where batch_key = '20260903_researched_content') <> 386 then
    raise exception 'Destination backup is incomplete';
  end if;
end $$;

commit;
