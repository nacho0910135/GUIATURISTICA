-- Applies the 48 bilingual destination updates supplied on 2026-09-03.
-- Uses stable destination IDs because six source coordinates and one name were corrected.
begin;

create schema if not exists private;

create table if not exists private.destination_content_backups (
  batch_key text not null,
  destination_id uuid not null,
  snapshot jsonb not null,
  backed_up_at timestamptz not null default now(),
  primary key (batch_key, destination_id)
);
revoke all on table private.destination_content_backups from public, anon, authenticated;

create temporary table destination_update_payload (
  destination_id uuid primary key,
  expected_name text not null,
  name text not null,
  description_es text not null,
  description_en text not null,
  categories text[] not null,
  latitude double precision not null,
  longitude double precision not null
) on commit drop;

insert into destination_update_payload
select *
from jsonb_to_recordset($updated_destinations$[
  {
    "destination_id": "da9f4b97-48c3-4d1b-a922-b1ce39ba8de9",
    "expected_name": "Aguas Termales de Tabacón",
    "name": "Aguas Termales de Tabacón",
    "description_es": "Aguas Termales de Tabacón es uno de los complejos de aguas termales más famosos de Costa Rica, ubicado en la Zona Norte, cerca del Volcán Arenal. El sitio cuenta con una serie de piscinas de agua termal de origen volcánico, rodeadas de exuberante vegetación tropical. Los visitantes pueden relajarse en aguas de diferentes temperaturas, disfrutar de cascadas artificiales y tratamientos de spa, todo mientras escuchan los sonidos de la selva y observan la imponente silueta del volcán. Es un destino ideal para el descanso y la desconexión, con servicios de restaurante y bar incluidos.",
    "description_en": "Tabacón Hot Springs is one of the most famous hot spring resorts in Costa Rica, located in the Northern Zone near Arenal Volcano. The site features a series of volcanic-origin thermal pools surrounded by lush tropical vegetation. Visitors can relax in waters of different temperatures, enjoy artificial waterfalls and spa treatments, all while listening to the sounds of the jungle and observing the imposing silhouette of the volcano. It is an ideal destination for rest and disconnection, with restaurant and bar services included.",
    "categories": [
      "Termales",
      "Aventura y Deportes",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.4878,
    "longitude": -84.7222
  },
  {
    "destination_id": "a850c60f-2007-4032-86e0-c491fe66cf27",
    "expected_name": "Basílica de Nuestra Señora de los Ángeles",
    "name": "Basílica de Nuestra Señora de los Ángeles",
    "description_es": "La Basílica de Nuestra Señora de los Ángeles es el principal templo religioso de Costa Rica, ubicado en la ciudad de Cartago. Es un destino de peregrinación masiva, especialmente el 2 de agosto, cuando miles de fieles caminan desde diferentes puntos del país hasta la basílica. El edificio es una obra maestra de la arquitectura neobizantina y neorrománica, y alberga la pequeña y milagrosa imagen de la Virgen de los Ángeles, conocida cariñosamente como 'La Negrita'. La visita ofrece una profunda experiencia cultural e histórica, con un museo anexo que narra la historia de la devoción mariana en Costa Rica.",
    "description_en": "The Basilica of Our Lady of the Angels is Costa Rica's main religious temple, located in the city of Cartago. It is a massive pilgrimage destination, especially on August 2nd, when thousands of faithful walk from different points of the country to the basilica. The building is a masterpiece of Neo-Byzantine and Neo-Romanesque architecture, housing the small and miraculous image of the Virgin of the Angels, affectionately known as 'La Negrita'. The visit offers a profound cultural and historical experience, with an adjacent museum that tells the story of Marian devotion in Costa Rica.",
    "categories": [
      "Cultura e Historia",
      "Turismo Comunitario"
    ],
    "latitude": 9.8642,
    "longitude": -83.9131
  },
  {
    "destination_id": "4f625302-a1db-486a-a387-a716bd6a6516",
    "expected_name": "Catarata Dinamarca",
    "name": "Catarata La Diana",
    "description_es": "Catarata La Diana es una impresionante caída de agua ubicada en la Zona Norte de Costa Rica, específicamente en la región de la Fortuna de San Carlos. El acceso a la catarata es considerado de dificultad difícil, lo que la convierte en una aventura para excursionistas experimentados. La recompensa es una espectacular cortina de agua que se precipeta en una poza profunda, rodeada de un denso bosque tropical. El entorno es prístino y húmedo, con una alta diversidad de flora y fauna. La visita debe hacerse con precaución, especialmente en época lluviosa, y se recomienda un guía local para navegar el terreno.",
    "description_en": "La Diana Waterfall is an impressive waterfall located in Costa Rica's Northern Zone, specifically in the La Fortuna de San Carlos region. Access to the waterfall is considered difficult, making it an adventure for experienced hikers. The reward is a spectacular curtain of water plunging into a deep pool, surrounded by dense tropical forest. The environment is pristine and humid, with high diversity of flora and fauna. The visit should be done with caution, especially during the rainy season, and a local guide is recommended to navigate the terrain.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Aventura y Deportes"
    ],
    "latitude": 10.2431,
    "longitude": -84.2211
  },
  {
    "destination_id": "1fc1f83f-03fe-4c96-b3cb-a9a0595110f3",
    "expected_name": "Catarata La Paz Waterfall Gardens",
    "name": "Catarata La Paz Waterfall Gardens",
    "description_es": "Catarata La Paz Waterfall Gardens es un destino turístico completo que combina la belleza de cinco cataratas principales con una serie de jardines y santuarios de animales. Ubicado en la ruta entre San José y la Fortuna, el parque ofrece un recorrido por senderos bien mantenidos que llevan a cada una de las cataratas, permitiendo a los visitantes apreciar la potencia y majestuosidad del agua. Además de las cataratas, el lugar cuenta con un santuario de mariposas, un jardín de colibríes, un serpentario y un invernadero de ranas. Es una experiencia educativa y visual, ideal para toda la familia.",
    "description_en": "La Paz Waterfall Gardens is a complete tourist destination that combines the beauty of five main waterfalls with a series of gardens and animal sanctuaries. Located on the route between San José and La Fortuna, the park offers a tour along well-maintained trails that lead to each of the waterfalls, allowing visitors to appreciate the power and majesty of the water. In addition to the waterfalls, the site features a butterfly sanctuary, a hummingbird garden, a serpentarium, and a frog greenhouse. It is an educational and visual experience, ideal for the whole family.",
    "categories": [
      "Cataratas",
      "Senderismo",
      "Santuarios de Animales",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.2045,
    "longitude": -84.1618
  },
  {
    "destination_id": "45688e18-9f24-4b5f-b324-34a478a1f6d2",
    "expected_name": "Catarata Opendola",
    "name": "Catarata Opendola",
    "description_es": "Catarata Opendola se encuentra en la provincia de Guanacaste, en un entorno de bosque seco tropical. Esta catarata de fácil acceso es una caída de agua relativamente pequeña pero pintoresca, que forma una poza natural donde los visitantes pueden refrescarse. La zona es conocida por su clima cálido y su vegetación característica de la región del Pacífico Norte. Es un sitio ideal para una parada rápida o un baño reparador después de un día de exploración en las cercanías del Parque Nacional Rincón de la Vieja.",
    "description_en": "Opendola Waterfall is located in Guanacaste province, in a tropical dry forest setting. This easily accessible waterfall is a relatively small but picturesque drop that forms a natural pool where visitors can cool off. The area is known for its warm climate and vegetation typical of the North Pacific region. It is an ideal spot for a quick stop or a refreshing swim after a day of exploration near Rincón de la Vieja National Park.",
    "categories": [
      "Cataratas",
      "Ríos y Pozas",
      "Aventura y Deportes"
    ],
    "latitude": 10.7511,
    "longitude": -85.3481
  },
  {
    "destination_id": "afe982d6-2bcc-4fce-8fa2-3d17a5ce29ee",
    "expected_name": "Cavernas de Venado",
    "name": "Cavernas de Venado",
    "description_es": "Cavernas de Venado es un sistema de cuevas subterráneas ubicado en la Zona Norte de Costa Rica. A diferencia de otras cuevas turísticas, estas cavernas ofrecen una experiencia de espeleología auténtica y menos comercializada. Los visitantes deben equiparse con cascos y linternas para explorar un laberinto de pasadizos estrechos, cámaras subterráneas y formaciones rocosas kársticas. El recorrido puede implicar gatear, escalar y caminar por el agua, lo que requiere un buen estado físico y espíritu de aventura. La temperatura en el interior es fresca y constante, un contraste con el clima cálido de la superficie.",
    "description_en": "Venado Caves is a system of underground caves located in Costa Rica's Northern Zone. Unlike other tourist caves, these caverns offer an authentic and less commercialized caving experience. Visitors must equip themselves with helmets and flashlights to explore a labyrinth of narrow passages, underground chambers, and karst rock formations. The tour may involve crawling, climbing, and wading through water, requiring good physical condition and an adventurous spirit. The temperature inside is cool and constant, a contrast to the warm surface climate.",
    "categories": [
      "Senderismo",
      "Aventura y Deportes",
      "Montañas y Cerros"
    ],
    "latitude": 10.5578,
    "longitude": -84.7708
  },
  {
    "destination_id": "4b7fb57a-7d3a-4682-9e89-0f64ffc14835",
    "expected_name": "Centro de Rescate Las Pumas (Cañas)",
    "name": "Centro de Rescate Las Pumas (Cañas)",
    "description_es": "El Centro de Rescate Las Pumas es un santuario de animales ubicado en Cañas, Guanacaste, dedicado a la rehabilitación de fauna silvestre que ha sido víctima del tráfico ilegal, accidentes o abandono. Los visitantes pueden recorrer los senderos del centro y observar de cerca una gran variedad de especies nativas, incluyendo monos, jaguares, pumas, ocelotes, aves rapaces y una gran cantidad de loros y guacamayas. El centro tiene un fuerte enfoque educativo, explicando las historias de cada animal y la importancia de la conservación de la biodiversidad costarricense. Es un lugar conmovedor que genera conciencia sobre los retos que enfrenta la vida silvestre.",
    "description_en": "Las Pumas Rescue Center is an animal sanctuary located in Cañas, Guanacaste, dedicated to the rehabilitation of wildlife that has been a victim of illegal trafficking, accidents, or abandonment. Visitors can walk through the center's trails and observe up close a wide variety of native species, including monkeys, jaguars, pumas, ocelots, birds of prey, and a large number of parrots and macaws. The center has a strong educational focus, explaining each animal's story and the importance of conserving Costa Rican biodiversity. It is a moving place that raises awareness about the challenges facing wildlife.",
    "categories": [
      "Santuarios de Animales",
      "Turismo Comunitario"
    ],
    "latitude": 10.4514,
    "longitude": -85.1254
  },
  {
    "destination_id": "7c972607-b322-44e8-aba3-f8358e09d021",
    "expected_name": "Cerro Amigos (Mirador Monteverde)",
    "name": "Cerro Amigos (Mirador Monteverde)",
    "description_es": "Cerro Amigos es uno de los puntos más altos y emblemáticos de la zona de Monteverde. El ascenso a su cima es una caminata de dificultad difícil que recompensa a los visitantes con una vista panorámica de 360 grados de la Cordillera de Tilarán y el Golfo de Nicoya. En días despejados, se puede apreciar la inmensidad del paisaje, que combina el bosque nuboso con el océano Pacífico al oeste. Es un destino popular para los amantes del senderismo y la fotografía, que buscan una experiencia más desafiante y una perspectiva única de la región.",
    "description_en": "Cerro Amigos is one of the highest and most iconic points in the Monteverde area. The ascent to its summit is a difficult hike that rewards visitors with a 360-degree panoramic view of the Tilarán Mountain Range and the Gulf of Nicoya. On clear days, one can appreciate the vastness of the landscape, combining the cloud forest with the Pacific Ocean to the west. It is a popular destination for hiking and photography enthusiasts seeking a more challenging experience and a unique perspective of the region.",
    "categories": [
      "Miradores",
      "Senderismo",
      "Montañas y Cerros",
      "Aventura y Deportes"
    ],
    "latitude": 10.3194,
    "longitude": -84.7958
  },
  {
    "destination_id": "ed8912bc-b01c-41fe-b08e-3d6ee4831c6e",
    "expected_name": "Isla Chira (Golfo de Nicoya)",
    "name": "Isla Chira (Golfo de Nicoya)",
    "description_es": "Isla Chira es la isla más grande del Golfo de Nicoya y un destino de turismo rural comunitario. Aquí, los visitantes pueden experimentar la vida cotidiana de las comunidades pesqueras y agrícolas que la habitan. La isla ofrece hermosas playas de arena oscura, manglares y áreas boscosas, además de una rica cultura local. Es un lugar ideal para la observación de aves, paseos en bote por el golfo y conocer la gastronomía tradicional a base de mariscos y pescado fresco. El acceso es únicamente por vía marítima, lo que le da un ambiente de tranquilidad y desconexión.",
    "description_en": "Chira Island is the largest island in the Gulf of Nicoya and a community rural tourism destination. Here, visitors can experience the daily life of the fishing and farming communities that inhabit it. The island offers beautiful dark sand beaches, mangroves, and forested areas, as well as a rich local culture. It is an ideal place for birdwatching, boat rides through the gulf, and experiencing traditional cuisine based on shellfish and fresh fish. Access is only by sea, which gives it an atmosphere of tranquility and disconnection.",
    "categories": [
      "Islas y Manglares",
      "Playas",
      "Turismo Comunitario",
      "Experiencia Gastronómica"
    ],
    "latitude": 10.0999,
    "longitude": -85.1515
  },
  {
    "destination_id": "6c24c898-2a98-4b86-bdc1-af950bb36e53",
    "expected_name": "Lago Arenal (Represa)",
    "name": "Lago Arenal (Represa)",
    "description_es": "El Lago Arenal es el lago más grande de Costa Rica, creado por la represa hidroeléctrica del mismo nombre. El lago es un centro de actividades acuáticas, especialmente conocido por el windsurf y el kitesurf, ya que los vientos alisios que cruzan la región crean condiciones ideales para estos deportes. También es popular para la pesca deportiva, especialmente de guapote (rainbow bass), y para paseos en bote que ofrecen vistas espectaculares del imponente Volcán Arenal. La zona alrededor del lago cuenta con numerosos hoteles y restaurantes, convirtiéndolo en un destino completo para los amantes de la naturaleza y la aventura.",
    "description_en": "Lake Arenal is the largest lake in Costa Rica, created by the hydroelectric dam of the same name. The lake is a hub for water activities, especially known for windsurfing and kitesurfing, as the trade winds crossing the region create ideal conditions for these sports. It is also popular for sport fishing, especially for rainbow bass (guapote), and for boat rides offering spectacular views of the imposing Arenal Volcano. The area around the lake has numerous hotels and restaurants, making it a complete destination for nature and adventure lovers.",
    "categories": [
      "Aventura y Deportes",
      "Miradores",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.5053,
    "longitude": -84.8722
  },
  {
    "destination_id": "6f546a5a-0c36-4baf-8c24-d3f41cb5f145",
    "expected_name": "Las Hornillas Geothermal Park",
    "name": "Las Hornillas Geothermal Park",
    "description_es": "El Parque Geotermal Las Hornillas, ubicado en las faldas del Volcán Miravalles, es un lugar donde los visitantes pueden experimentar el poder de la actividad volcánica de forma segura y educativa. El parque cuenta con senderos que conducen a fumarolas, ollas de barro hirviendo y pozas de agua caliente. La actividad principal es sumergirse en un baño de barro volcánico y luego lavarse en una piscina de agua termal, dejando la piel suave y rejuvenecida. Es una experiencia geotermal única que combina aventura, relajación y aprendizaje sobre los procesos volcánicos.",
    "description_en": "Las Hornillas Geothermal Park, located on the slopes of Miravalles Volcano, is a place where visitors can experience the power of volcanic activity in a safe and educational way. The park features trails leading to fumaroles, boiling mud pots, and hot water pools. The main activity is to immerse oneself in a volcanic mud bath and then wash off in a thermal pool, leaving the skin soft and rejuvenated. It is a unique geothermal experience combining adventure, relaxation, and learning about volcanic processes.",
    "categories": [
      "Volcanes",
      "Termales",
      "Aventura y Deportes"
    ],
    "latitude": 10.7228,
    "longitude": -85.1639
  },
  {
    "destination_id": "886f1226-92cd-4748-ab78-68a06b001d4e",
    "expected_name": "Mercado Central de San José",
    "name": "Mercado Central de San José",
    "description_es": "El Mercado Central de San José es el corazón gastronómico de la capital, un bullicioso laberinto de pasillos donde se pueden encontrar los sabores más auténticos de Costa Rica. Fundado en 1880, este mercado es una institución cultural donde los locales y turistas pueden degustar platos típicos como el gallo pinto, el olla de carne, los ceviches y los refrescos de frutas naturales. Además de la oferta culinaria, el mercado es un lugar para comprar artesanías, especias y productos frescos. La experiencia es una inmersión sensorial en la vida cotidiana y la cultura popular costarricense.",
    "description_en": "San José's Central Market is the gastronomic heart of the capital, a bustling labyrinth of corridors where you can find the most authentic flavors of Costa Rica. Founded in 1880, this market is a cultural institution where locals and tourists can taste typical dishes such as gallo pinto, olla de carne, ceviches, and natural fruit drinks. In addition to the culinary offerings, the market is a place to buy handicrafts, spices, and fresh produce. The experience is a sensory immersion into Costa Rican daily life and popular culture.",
    "categories": [
      "Experiencia Gastronómica",
      "Cultura e Historia",
      "Turismo Comunitario"
    ],
    "latitude": 9.9351,
    "longitude": -84.0818
  },
  {
    "destination_id": "7c4b512f-accb-4f4b-b21e-8541c1548191",
    "expected_name": "Mirador de Orosi",
    "name": "Mirador de Orosi",
    "description_es": "El Mirador de Orosi es uno de los puntos panorámicos más pintorescos del Valle Central, ubicado en el cantón de Paraíso de Cartago. Ofrece una vista espectacular del Valle de Orosi, con el embalse del Río Reventazón serpenteando entre las verdes montañas. Es un lugar de fácil acceso y muy popular tanto para locales como turistas, ideal para tomar fotografías y disfrutar de un atardecer. El mirador cuenta con áreas de descanso y ranchos con mesas y parrillas, lo que lo convierte en un destino perfecto para un picnic familiar.",
    "description_en": "Orosi Viewpoint is one of the most picturesque panoramic points in the Central Valley, located in the Paraíso canton of Cartago. It offers a spectacular view of the Orosi Valley, with the Reventazón River reservoir winding through the green mountains. It is an easily accessible spot and very popular with both locals and tourists, ideal for taking photos and enjoying a sunset. The viewpoint has rest areas and ranches with tables and grills, making it a perfect destination for a family picnic.",
    "categories": [
      "Miradores",
      "Montañas y Cerros",
      "Turismo Comunitario"
    ],
    "latitude": 9.7969,
    "longitude": -83.8569
  },
  {
    "destination_id": "534056b5-bffa-4621-8b09-7f44015c3f8f",
    "expected_name": "Museo del Oro Precolombino",
    "name": "Museo del Oro Precolombino",
    "description_es": "El Museo del Oro Precolombino, ubicado en el corazón de San José, resguarda una de las colecciones de orfebrería prehispánica más importantes de América. Ubicado en el subsuelo de la Plaza de la Cultura, el museo exhibe más de mil piezas de oro, cerámica y otros objetos de las culturas indígenas que habitaron Costa Rica antes de la llegada de los españoles. La exhibición está diseñada para narrar la historia, la cosmovisión y el simbolismo de estos pueblos a través de sus creaciones artísticas. Es una visita obligada para quienes deseen comprender la rica herencia cultural de Costa Rica.",
    "description_en": "The Pre-Columbian Gold Museum, located in the heart of San José, houses one of the most important pre-Hispanic goldsmith collections in the Americas. Located in the basement of the Plaza de la Cultura, the museum exhibits more than a thousand gold pieces, ceramics, and other objects from the indigenous cultures that inhabited Costa Rica before the arrival of the Spanish. The exhibition is designed to tell the history, worldview, and symbolism of these peoples through their artistic creations. It is a must-visit for those wishing to understand Costa Rica's rich cultural heritage.",
    "categories": [
      "Cultura e Historia"
    ],
    "latitude": 9.9336,
    "longitude": -84.0772
  },
  {
    "destination_id": "5fe2bb28-f908-4fde-84b0-31845ed903b3",
    "expected_name": "Parque Nacional Guanacaste (Sector Junquillal)",
    "name": "Parque Nacional Guanacaste (Sector Junquillal)",
    "description_es": "El Sector Junquillal del Parque Nacional Guanacaste es un área que protege una de las últimas muestras de bosque seco tropical del Pacífico Norte de Costa Rica. A diferencia de otras playas del cantón de La Cruz, este sector es conocido por su playa de arena clara y aguas tranquilas, ideales para la natación y el snorkel. La zona también es un sitio de anidación de tortugas marinas. Los visitantes pueden recorrer senderos que se adentran en el bosque seco y observar una gran variedad de aves, incluyendo lapas y garzas. Es una combinación perfecta de playa, sol y naturaleza.",
    "description_en": "Junquillal Sector of Guanacaste National Park is an area that protects one of the last remnants of tropical dry forest in Costa Rica's North Pacific. Unlike other beaches in the La Cruz canton, this sector is known for its light sand beach and calm waters, ideal for swimming and snorkeling. The area is also a nesting site for sea turtles. Visitors can hike trails into the dry forest and observe a wide variety of birds, including macaws and herons. It is a perfect combination of beach, sun, and nature.",
    "categories": [
      "Parques Nacionales",
      "Playas",
      "Reservas Silvestres",
      "Senderismo"
    ],
    "latitude": 10.9583,
    "longitude": -85.6083
  },
  {
    "destination_id": "5348f4c1-8357-43d8-9bb6-2e1f2153d772",
    "expected_name": "Parque Nacional Irazú (Cráter Principal)",
    "name": "Parque Nacional Irazú (Cráter Principal)",
    "description_es": "El Parque Nacional Volcán Irazú es uno de los destinos más visitados del país, famoso por su cráter principal que alberga una laguna de color verde esmeralda. La carretera pavimentada lleva hasta el borde del cráter, lo que facilita el acceso y permite disfrutar de la vista con un mínimo esfuerzo. En días despejados, desde la cima (a 3,432 metros sobre el nivel del mar) se puede ver tanto el Océano Pacífico como el Mar Caribe. El paisaje es lunar y árido, un contraste impactante con los verdes valles que lo rodean.",
    "description_en": "Irazú Volcano National Park is one of the most visited destinations in the country, famous for its main crater that holds an emerald-green lagoon. The paved road leads to the crater's edge, making access easy and allowing you to enjoy the view with minimal effort. On clear days, from the summit (at 3,432 meters above sea level), you can see both the Pacific Ocean and the Caribbean Sea. The landscape is lunar and arid, a striking contrast with the green valleys that surround it.",
    "categories": [
      "Parques Nacionales",
      "Volcanes",
      "Miradores",
      "Montañas y Cerros"
    ],
    "latitude": 9.9792,
    "longitude": -83.8528
  },
  {
    "destination_id": "d2ff6614-0fbb-4a2f-8546-694d016f9e22",
    "expected_name": "Parque Nacional Marino Las Baulas (Playa Grande)",
    "name": "Parque Nacional Marino Las Baulas (Playa Grande)",
    "description_es": "El Parque Nacional Marino Las Baulas es un área protegida que abarca una de las playas de anidación más importantes del mundo para la tortuga baula (o laúd), la especie de tortuga más grande del planeta. De octubre a marzo, las tortugas baulas llegan a Playa Grande para desovar. Las visitas nocturnas para observar este espectáculo natural son la principal atracción y deben ser realizadas con guías autorizados. Durante el día, la playa es un lugar hermoso para pasear y disfrutar del sol, con un oleaje consistente que atrae a surfistas.",
    "description_en": "Las Baulas Marine National Park is a protected area encompassing one of the most important nesting beaches in the world for the leatherback turtle, the largest turtle species on the planet. From October to March, leatherback turtles arrive at Playa Grande to lay their eggs. Nighttime visits to witness this natural spectacle are the main attraction and must be done with authorized guides. During the day, the beach is a beautiful place to stroll and enjoy the sun, with consistent waves that attract surfers.",
    "categories": [
      "Parques Nacionales",
      "Playas",
      "Aventura y Deportes",
      "Reservas Silvestres"
    ],
    "latitude": 10.3319,
    "longitude": -85.8389
  },
  {
    "destination_id": "0e9f1614-d0da-4b50-af1a-19eed64d70fc",
    "expected_name": "Parque Nacional Santa Rosa (Sector Cocalino / Héroes)",
    "name": "Parque Nacional Santa Rosa (Sector Cocalino / Héroes)",
    "description_es": "El Parque Nacional Santa Rosa es un sitio de gran importancia histórica y natural. Este sector protege un extenso bosque seco tropical y es conocido por albergar la famosa Roca Bruja ('Witch's Rock'), un punto de surf de clase mundial accesible solo por caminata o en 4x4. Además de la playa, el parque conserva la Casona histórica, donde tuvo lugar la Batalla de Santa Rosa en 1856. Los visitantes pueden recorrer senderos que atraviesan el bosque seco, observar gran cantidad de aves y mamíferos, y aprender sobre la historia de Costa Rica en su museo.",
    "description_en": "Santa Rosa National Park is a site of great historical and natural importance. This sector protects an extensive tropical dry forest and is known for harboring the famous Witch's Rock, a world-class surfing spot accessible only by walking or 4x4. In addition to the beach, the park preserves the historic Casona, where the Battle of Santa Rosa took place in 1856. Visitors can hike trails through the dry forest, observe a great number of birds and mammals, and learn about Costa Rica's history in its museum.",
    "categories": [
      "Parques Nacionales",
      "Playas",
      "Senderismo",
      "Cultura e Historia",
      "Aventura y Deportes"
    ],
    "latitude": 10.8381,
    "longitude": -85.6128
  },
  {
    "destination_id": "90168df9-d141-4ff5-9683-49b6e1ff3517",
    "expected_name": "Parque Nacional Volcán Arenal",
    "name": "Parque Nacional Volcán Arenal",
    "description_es": "El Parque Nacional Volcán Arenal es uno de los íconos de Costa Rica. Aunque el volcán entró en una fase de reposo en 2010, su imponente forma cónica sigue siendo un majestuoso telón de fondo para la región de La Fortuna. El parque ofrece una red de senderos que atraviesan la selva tropical, donde los visitantes pueden observar una gran diversidad de flora y fauna, incluyendo monos, perezosos y una multitud de aves. Los senderos llevan a antiguos flujos de lava y a miradores con vistas espectaculares del volcán y el lago Arenal.",
    "description_en": "Arenal Volcano National Park is one of Costa Rica's icons. Although the volcano entered a resting phase in 2010, its imposing conical shape remains a majestic backdrop for the La Fortuna region. The park offers a network of trails through the rainforest, where visitors can observe a great diversity of flora and fauna, including monkeys, sloths, and a multitude of birds. The trails lead to ancient lava flows and viewpoints with spectacular views of the volcano and Lake Arenal.",
    "categories": [
      "Parques Nacionales",
      "Volcanes",
      "Senderismo",
      "Miradores",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.4626,
    "longitude": -84.7032
  },
  {
    "destination_id": "99d9908b-a8f2-482b-b36b-5faee279c84e",
    "expected_name": "Parque Nacional Volcán Miravalles",
    "name": "Parque Nacional Volcán Miravalles",
    "description_es": "El Parque Nacional Volcán Miravalles es el hogar de uno de los volcanes más altos y menos visitados de Costa Rica. Su ecosistema abarca desde bosque muy húmedo hasta bosque nuboso, creando un hábitat rico en biodiversidad. El parque protege importantes nacientes de agua y alberga varias lagunas en sus cráteres. Es un destino para senderistas que buscan una experiencia más aislada y en contacto con la naturaleza virgen. Aunque no hay acceso al cráter principal, los senderos permiten explorar las faldas del volcán y admirar la vegetación exuberante.",
    "description_en": "Miravalles Volcano National Park is home to one of the highest and least visited volcanoes in Costa Rica. Its ecosystem ranges from very humid forest to cloud forest, creating a biodiversity-rich habitat. The park protects important water springs and hosts several lagoons in its craters. It is a destination for hikers seeking a more isolated experience in contact with virgin nature. Although there is no access to the main crater, trails allow exploring the volcano's slopes and admiring the lush vegetation.",
    "categories": [
      "Parques Nacionales",
      "Volcanes",
      "Senderismo",
      "Montañas y Cerros",
      "Reservas Silvestres"
    ],
    "latitude": 10.7486,
    "longitude": -85.1531
  },
  {
    "destination_id": "a7bc2b3b-8fd3-44c8-a263-477f937b3021",
    "expected_name": "Parque Nacional Volcán Rincón de la Vieja",
    "name": "Parque Nacional Volcán Rincón de la Vieja",
    "description_es": "El Parque Nacional Rincón de la Vieja es un área volcánica activa que ofrece un paisaje diverso, desde bosque nuboso en la cima hasta bosque seco en las faldas. Las actividades principales incluyen el senderismo que lleva a fumarolas, ollas de barro hirviendo y cataratas de agua termal. Los visitantes pueden realizar recorridos de varios kilómetros para apreciar la actividad volcánica y la flora adaptada a estas condiciones extremas. Es un destino excelente para quienes buscan una experiencia de aventura y geotermal en un entorno natural.",
    "description_en": "Rincón de la Vieja National Park is an active volcanic area offering a diverse landscape, from cloud forest at the summit to dry forest on the slopes. Main activities include hiking to fumaroles, boiling mud pots, and thermal waterfalls. Visitors can take multi-kilometer tours to appreciate the volcanic activity and flora adapted to these extreme conditions. It is an excellent destination for those seeking an adventure and geothermal experience in a natural setting.",
    "categories": [
      "Parques Nacionales",
      "Volcanes",
      "Senderismo",
      "Aventura y Deportes",
      "Termales"
    ],
    "latitude": 10.7681,
    "longitude": -85.3283
  },
  {
    "destination_id": "92bb87bb-e42a-415d-b468-50be2b62ba18",
    "expected_name": "Paseo de los Turistas (Puntarenas)",
    "name": "Paseo de los Turistas (Puntarenas)",
    "description_es": "El Paseo de los Turistas es el malecón más emblemático de la ciudad de Puntarenas, un lugar tradicional donde locales y visitantes se reúnen para pasear y disfrutar de la brisa marina. El paseo está bordeado de restaurantes y sodas que ofrecen la mejor gastronomía del Pacífico, especialmente mariscos y pescados frescos. Es el punto de partida para tours en catamarán y paseos en barco por el Golfo de Nicoya, y ofrece una vista pintoresca del horizonte de la ciudad y la actividad del puerto.",
    "description_en": "Paseo de los Turistas is the most emblematic boardwalk in the city of Puntarenas, a traditional place where locals and visitors gather to stroll and enjoy the sea breeze. The promenade is lined with restaurants and sodas offering the best Pacific cuisine, especially fresh seafood and fish. It is the starting point for catamaran tours and boat rides through the Gulf of Nicoya, and offers a picturesque view of the city skyline and port activity.",
    "categories": [
      "Cultura e Historia",
      "Experiencia Gastronómica",
      "Miradores"
    ],
    "latitude": 9.9781,
    "longitude": -84.8281
  },
  {
    "destination_id": "8c5902bc-5b1e-4477-973f-ec5995513c91",
    "expected_name": "Playa Cocles",
    "name": "Playa Cocles",
    "description_es": "Playa Cocles, ubicada en la costa caribeña de Puerto Viejo de Talamanca, es una playa de arena blanca y aguas turquesas, famosa entre los surfistas por sus olas consistentes. Es un destino de ambiente bohemio y relajado, rodeado de vegetación tropical y palmeras. La playa es ideal para caminar largas distancias, tomar el sol y disfrutar de las puestas de sol, y también es un lugar popular para practicar snorkel en los arrecifes cercanos.",
    "description_en": "Playa Cocles, located on the Caribbean coast of Puerto Viejo de Talamanca, is a white-sand beach with turquoise waters, famous among surfers for its consistent waves. It is a destination with a bohemian and relaxed atmosphere, surrounded by tropical vegetation and palm trees. The beach is ideal for long walks, sunbathing, and enjoying sunsets, and it is also a popular spot for snorkeling on nearby reefs.",
    "categories": [
      "Playas",
      "Aventura y Deportes",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 9.6481,
    "longitude": -82.7381
  },
  {
    "destination_id": "26f2a11c-0886-4a9d-93db-cc052b12fc54",
    "expected_name": "Playa Danta y Dantita",
    "name": "Playa Danta y Dantita",
    "description_es": "Playa Danta y Dantita son dos pequeñas playas gemelas ubicadas en la Península de Papagayo, en la provincia de Guanacaste. Son conocidas por sus aguas tranquilas y cristalinas, ideales para nadar y hacer snorkel, protegidas del oleaje por una formación rocosa. El entorno es semi-privado, rodeado de lujosos hoteles y resorts, pero el acceso a la playa es público. Es un destino perfecto para un día de relajación y desconexión en un entorno paradisíaco y seguro.",
    "description_en": "Playa Danta and Dantita are two small twin beaches located on the Papagayo Peninsula in Guanacaste province. They are known for their calm and crystal-clear waters, ideal for swimming and snorkeling, sheltered from the waves by a rock formation. The environment is semi-private, surrounded by luxury hotels and resorts, but beach access is public. It is a perfect destination for a day of relaxation and disconnection in a paradisiacal and safe setting.",
    "categories": [
      "Playas",
      "Islas y Manglares",
      "Aventura y Deportes",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.4781,
    "longitude": -85.7847
  },
  {
    "destination_id": "81598a1c-680e-4066-a9d6-9eef7f0b786b",
    "expected_name": "Playa Garza",
    "name": "Playa Garza",
    "description_es": "Playa Garza es una playa de arena blanca y aguas tranquilas en el cantón de Nicoya, Guanacaste. Es un destino familiar y seguro para nadar, lejos del bullicio de las playas más turísticas. La playa es un centro de actividad pesquera artesanal, y es común ver a los pescadores locales en sus barcos de colores. Es un lugar ideal para relajarse, observar la vida cotidiana de una comunidad costera y disfrutar de atardeceres impresionantes.",
    "description_en": "Playa Garza is a white-sand beach with calm waters in the Nicoya canton of Guanacaste. It is a family-friendly and safe destination for swimming, away from the hustle of more touristy beaches. The beach is a center of artisanal fishing activity, and it is common to see local fishermen in their colorful boats. It is an ideal place to relax, observe the daily life of a coastal community, and enjoy stunning sunsets.",
    "categories": [
      "Playas",
      "Turismo Comunitario",
      "Experiencia Gastronómica"
    ],
    "latitude": 9.9139,
    "longitude": -85.6419
  },
  {
    "destination_id": "60ed13c3-a610-4d42-a551-242db34155d8",
    "expected_name": "Playa Guiones",
    "name": "Playa Guiones",
    "description_es": "Playa Guiones, ubicada en el pueblo de Nosara, Guanacaste, es una de las playas más famosas y consistentes para el surf en Costa Rica. Su arena es clara y la playa es extensa, lo que permite que los surfistas encuentren su propia ola sin demasiada competencia. Además del surf, la zona es conocida por su ambiente de bienestar y relajación, con numerosos retiros de yoga, spas y restaurantes de comida saludable. Es el destino ideal para combinar deporte, naturaleza y desconexión.",
    "description_en": "Playa Guiones, located in the town of Nosara, Guanacaste, is one of the most famous and consistent surf beaches in Costa Rica. Its sand is light and the beach is extensive, allowing surfers to find their own wave without too much competition. In addition to surfing, the area is known for its wellness and relaxation atmosphere, with numerous yoga retreats, spas, and healthy food restaurants. It is the ideal destination to combine sport, nature, and disconnection.",
    "categories": [
      "Playas",
      "Aventura y Deportes",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 9.9511,
    "longitude": -85.6681
  },
  {
    "destination_id": "0a67fcab-9e5a-456f-8c45-f40008bc8467",
    "expected_name": "Playa Hermosa (Guanacaste)",
    "name": "Playa Hermosa (Guanacaste)",
    "description_es": "Playa Hermosa, en la provincia de Guanacaste, es una hermosa playa de arena oscura y aguas tranquilas, perfecta para nadar y practicar deportes acuáticos como el kayak y el snorkel. Está ubicada en una bahía protegida, lo que la hace ideal para familias. El pueblo ha mantenido su ambiente acogedor y no está masificado, ofreciendo una experiencia más auténtica y relajada que otras playas más comerciales de la zona.",
    "description_en": "Playa Hermosa, in Guanacaste province, is a beautiful dark sand beach with calm waters, perfect for swimming and practicing water sports like kayaking and snorkeling. It is located in a protected bay, making it ideal for families. The town has maintained its welcoming atmosphere and is not overcrowded, offering a more authentic and relaxed experience than other more commercial beaches in the area.",
    "categories": [
      "Playas",
      "Aventura y Deportes",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.5847,
    "longitude": -85.6761
  },
  {
    "destination_id": "036b75cf-b194-4445-be8c-eb670cb10421",
    "expected_name": "Playa Junquillal",
    "name": "Playa Junquillal",
    "description_es": "Playa Junquillal es una playa de arena blanca y mar abierto en la costa de Guanacaste, conocida por su extensa franja de arena, su oleaje fuerte y su ambiente tranquilo y poco desarrollado. Es un destino ideal para quienes buscan alejarse de las multitudes y conectar con la naturaleza en su estado más puro. La playa es un sitio de anidación de tortugas marinas y es perfecta para largas caminatas, observación de aves y baños de sol.",
    "description_en": "Playa Junquillal is a white-sand beach with open sea on the Guanacaste coast, known for its extensive stretch of sand, strong waves, and quiet, undeveloped atmosphere. It is an ideal destination for those seeking to get away from crowds and connect with nature in its purest state. The beach is a nesting site for sea turtles and is perfect for long walks, bird watching, and sunbathing.",
    "categories": [
      "Playas",
      "Reservas Silvestres",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.1611,
    "longitude": -85.8119
  },
  {
    "destination_id": "3c522d26-fee4-415e-9284-6763a83a3ccd",
    "expected_name": "Playa Langosta",
    "name": "Playa Langosta",
    "description_es": "Playa Langosta se encuentra al sur de Playa Tamarindo, con la que comparte la misma bahía, pero con un ambiente más exclusivo y tranquilo. Es una playa de arena blanca y aguas cristalinas, bordeada de lujosas casas y hoteles. La playa es ideal para nadar y hacer snorkel en los pozas de marea que se forman en sus extremos rocosos. Es el destino perfecto para quienes buscan un ambiente más relajado y privado, sin alejarse de los servicios y actividades de Tamarindo.",
    "description_en": "Playa Langosta is located south of Playa Tamarindo, sharing the same bay but with a more exclusive and tranquil atmosphere. It is a white-sand beach with crystal-clear waters, bordered by luxurious houses and hotels. The beach is ideal for swimming and snorkeling in the tide pools that form at its rocky ends. It is the perfect destination for those seeking a more relaxed and private environment, without straying far from Tamarindo's services and activities.",
    "categories": [
      "Playas",
      "Aventura y Deportes",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.2881,
    "longitude": -85.8519
  },
  {
    "destination_id": "e15772f9-e498-469d-98b3-c71b90c0bf19",
    "expected_name": "Playa Naranjo / Roca Bruja",
    "name": "Playa Naranjo / Roca Bruja",
    "description_es": "Playa Naranjo es una playa remota y salvaje ubicada dentro del Parque Nacional Santa Rosa en Guanacaste. Es famosa por la imponente 'Roca Bruja', una formación rocosa frente a la costa que es uno de los puntos de surf más famosos y técnicos de Costa Rica. El acceso es difícil, solo con vehículos 4x4 y es recomendable en época seca. La playa en sí es un paraíso virgen, ideal para los amantes de la naturaleza y el surf de alto nivel. Es un destino de aventura, no para el turismo de masas.",
    "description_en": "Playa Naranjo is a remote and wild beach located within Santa Rosa National Park in Guanacaste. It is famous for the imposing 'Witch's Rock', a rock formation off the coast that is one of the most famous and technical surf spots in Costa Rica. Access is difficult, only with 4x4 vehicles and recommended in the dry season. The beach itself is a virgin paradise, ideal for nature lovers and high-level surfing. It is an adventure destination, not for mass tourism.",
    "categories": [
      "Playas",
      "Aventura y Deportes",
      "Parques Nacionales",
      "Miradores"
    ],
    "latitude": 10.7931,
    "longitude": -85.6669
  },
  {
    "destination_id": "706178a4-1fa7-46d6-89eb-2cf6adfca3fb",
    "expected_name": "Playa Negra",
    "name": "Playa Negra",
    "description_es": "Playa Negra, en la costa de Guanacaste, es conocida por su característica arena de color gris oscuro a negro, derivada de la presencia de magnetita. Es una playa de oleaje fuerte, muy popular entre los surfistas por su rompiente consistente y de calidad. A diferencia de otras playas de surf, ha mantenido un ambiente relajado y sin demasiada comercialización. Es un punto de referencia en la escena del surf de Costa Rica, perfecto para quienes buscan olas desafiantes.",
    "description_en": "Playa Negra, on the Guanacaste coast, is known for its characteristic dark gray to black sand, derived from the presence of magnetite. It is a beach with strong waves, very popular among surfers for its consistent and quality break. Unlike other surf beaches, it has maintained a relaxed atmosphere without too much commercialization. It is a landmark in Costa Rica's surfing scene, perfect for those seeking challenging waves.",
    "categories": [
      "Playas",
      "Aventura y Deportes",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.1983,
    "longitude": -85.8319
  },
  {
    "destination_id": "cbdf2e14-283c-4cc4-b333-c2070d6da084",
    "expected_name": "Playa Nosara y Pelada",
    "name": "Playa Nosara y Pelada",
    "description_es": "Playa Nosara es una playa extensa y tranquila en el cantón de Nicoya, conocida por su ambiente de bienestar y relajación. A diferencia de otras playas de surf, su oleaje es más suave, lo que la hace ideal para nadar y aprender a surfear. Playa Pelada, ubicada al norte, es una pequeña cala rocosa con una piscina natural en marea baja, perfecta para un baño tranquilo. La región de Nosara es un centro de retiros de yoga, surf y vida sana, ofreciendo una experiencia holística en un entorno natural.",
    "description_en": "Playa Nosara is a large and quiet beach in the Nicoya canton, known for its wellness and relaxation atmosphere. Unlike other surf beaches, its waves are gentler, making it ideal for swimming and learning to surf. Playa Pelada, located to the north, is a small rocky cove with a natural pool at low tide, perfect for a calm swim. The Nosara region is a hub for yoga, surf, and healthy living retreats, offering a holistic experience in a natural setting.",
    "categories": [
      "Playas",
      "Aventura y Deportes",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 9.9781,
    "longitude": -85.6781
  },
  {
    "destination_id": "27d30b09-3423-40c9-8ad4-ad87629e8326",
    "expected_name": "Playa Ocotal",
    "name": "Playa Ocotal",
    "description_es": "Playa Ocotal es una pequeña y pintoresca playa de arena oscura en la provincia de Guanacaste, ubicada al norte de Playas del Coco. Es conocida por ser una de las pocas playas de la zona donde se puede practicar snorkel directamente desde la orilla, debido a sus aguas cristalinas y la presencia de arrecifes rocosos. La playa es tranquila y está rodeada de colinas boscosas, ofreciendo un ambiente íntimo y hermoso. Es un excelente lugar para una escapada tranquila y para explorar la vida marina.",
    "description_en": "Playa Ocotal is a small and picturesque dark sand beach in Guanacaste province, located north of Playas del Coco. It is known for being one of the few beaches in the area where you can snorkel directly from the shore, due to its crystal-clear waters and the presence of rocky reefs. The beach is calm and surrounded by forested hills, offering an intimate and beautiful atmosphere. It is an excellent place for a peaceful getaway and to explore marine life.",
    "categories": [
      "Playas",
      "Aventura y Deportes",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.5475,
    "longitude": -85.7183
  },
  {
    "destination_id": "58e6e984-102e-4b29-8efd-f7a1bf2438da",
    "expected_name": "Playa Sámara",
    "name": "Playa Sámara",
    "description_es": "Playa Sámara es una de las playas más familiares y seguras de Costa Rica, gracias a sus aguas cristalinas y tranquilas, protegidas por la Isla Chora. La bahía en forma de media luna es ideal para nadar, hacer snorkel y kayak. El pueblo de Sámara ha crecido alrededor del turismo, ofreciendo una gran variedad de restaurantes y servicios, pero ha mantenido su esencia de pueblo pesquero. Es un destino perfecto para viajar en familia, parejas o amigos que buscan una playa hermosa y segura.",
    "description_en": "Playa Sámara is one of the most family-friendly and safe beaches in Costa Rica, thanks to its crystal-clear and calm waters, sheltered by Chora Island. The crescent-shaped bay is ideal for swimming, snorkeling, and kayaking. The town of Sámara has grown around tourism, offering a wide variety of restaurants and services, but has maintained its fishing village essence. It is a perfect destination for families, couples, or friends looking for a beautiful and safe beach.",
    "categories": [
      "Playas",
      "Aventura y Deportes",
      "Islas y Manglares",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 9.8819,
    "longitude": -85.5281
  },
  {
    "destination_id": "2948830e-6cb2-4e1b-bc5f-528e66d9f3ad",
    "expected_name": "Playa San Miguel y Coyote",
    "name": "Playa San Miguel y Coyote",
    "description_es": "Playa San Miguel y Coyote son dos playas aisladas y vírgenes en la Península de Nicoya, conocidas por su belleza natural y ambiente de soledad. Son playas de arena blanca y aguas de un turquesa intenso, pero con oleaje fuerte, por lo que se recomienda precaución al nadar. La zona está poco desarrollada, con algunos lodges ecológicos, lo que la convierte en un destino perfecto para quienes buscan desconectarse por completo y experimentar la naturaleza en su estado más salvaje.",
    "description_en": "Playa San Miguel and Coyote are two isolated and virgin beaches on the Nicoya Peninsula, known for their natural beauty and solitude. They are white-sand beaches with intense turquoise waters, but with strong waves, so caution is recommended when swimming. The area is undeveloped, with a few eco-lodges, making it a perfect destination for those seeking to completely disconnect and experience nature in its wildest state.",
    "categories": [
      "Playas",
      "Hospedaje en la Naturaleza",
      "Aventura y Deportes"
    ],
    "latitude": 9.7611,
    "longitude": -85.2981
  },
  {
    "destination_id": "6255a13f-4a71-4a43-b811-607c30fbe7eb",
    "expected_name": "Playa Tamarindo",
    "name": "Playa Tamarindo",
    "description_es": "Playa Tamarindo es uno de los destinos de playa más populares de Costa Rica, conocido por su vibrante vida nocturna, su excelente surf y su amplia oferta de servicios. Es un centro turístico con hoteles de todos los precios, restaurantes internacionales y tiendas. La playa es extensa y el oleaje es bueno para surfistas de todos los niveles. Tamarindo es la opción ideal para quienes buscan una experiencia de playa completa con todas las comodidades, además de ser un excelente punto de partida para explorar las playas cercanas.",
    "description_en": "Playa Tamarindo is one of the most popular beach destinations in Costa Rica, known for its vibrant nightlife, excellent surfing, and wide range of services. It is a tourist hub with hotels of all prices, international restaurants, and shops. The beach is extensive and the waves are good for surfers of all levels. Tamarindo is the ideal choice for those seeking a complete beach experience with all the amenities, as well as being an excellent starting point for exploring nearby beaches.",
    "categories": [
      "Playas",
      "Aventura y Deportes",
      "Vida Nocturna",
      "Experiencia Gastronómica",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.2992,
    "longitude": -85.8422
  },
  {
    "destination_id": "dee4df23-7e17-4496-8378-b99d223057a2",
    "expected_name": "Pozas Azules de Río Agrio",
    "name": "Pozas Azules de Río Agrio",
    "description_es": "Las Pozas Azules de Río Agrio son un conjunto de pozas de agua de color turquesa y verde esmeralda, ubicadas en la región de Bajos del Toro, cerca del Volcán Poás. El color vibrante del agua se debe a la alta concentración de minerales, creando una de las imágenes más fotogénicas de Costa Rica. El sendero es de dificultad fácil a moderada y conduce a través del bosque hasta las pozas, donde los visitantes pueden bañarse en aguas frías y cristalinas. Es un destino mágico que parece sacado de un cuento de hadas.",
    "description_en": "The Blue Pools of Río Agrio are a set of turquoise and emerald-green water pools, located in the Bajos del Toro region near Poás Volcano. The vibrant water color is due to the high concentration of minerals, creating one of the most photogenic images in Costa Rica. The trail is easy to moderate difficulty and leads through the forest to the pools, where visitors can bathe in cold, crystal-clear waters. It is a magical destination that seems straight out of a fairy tale.",
    "categories": [
      "Ríos y Pozas",
      "Cataratas",
      "Senderismo",
      "Montañas y Cerros"
    ],
    "latitude": 10.2228,
    "longitude": -84.2758
  },
  {
    "destination_id": "4e66c108-7ed0-4265-b12c-41ca17547271",
    "expected_name": "Proyecto Asís (Centro de Rescate)",
    "name": "Proyecto Asís (Centro de Rescate)",
    "description_es": "Proyecto Asís es un santuario de vida silvestre y un centro de rescate ubicado en la Zona Norte de Costa Rica. Su misión es la rehabilitación y eventual liberación de animales silvestres que han sido víctimas de tráfico ilegal, mascotismo o accidentes. Los visitantes pueden realizar un tour guiado para conocer las instalaciones, aprender sobre las historias de los animales y observar de cerca a perezosos, monos, jaguares y aves. Es un lugar para aprender sobre la conservación y el respeto por la vida animal, promoviendo un turismo responsable y educativo.",
    "description_en": "Proyecto Asís is a wildlife sanctuary and rescue center located in Costa Rica's Northern Zone. Its mission is the rehabilitation and eventual release of wild animals that have been victims of illegal trafficking, pet ownership, or accidents. Visitors can take a guided tour to learn about the facilities, hear the animals' stories, and observe up close sloths, monkeys, jaguars, and birds. It is a place to learn about conservation and respect for animal life, promoting responsible and educational tourism.",
    "categories": [
      "Santuarios de Animales",
      "Turismo Comunitario"
    ],
    "latitude": 10.3664,
    "longitude": -84.5122
  },
  {
    "destination_id": "7cc91f6c-81a4-475b-8f76-640d84bbe216",
    "expected_name": "Refugio Nacional de Vida Silvestre Ostional",
    "name": "Refugio Nacional de Vida Silvestre Ostional",
    "description_es": "El Refugio Nacional de Vida Silvestre Ostional es un área protegida en la costa de Guanacaste, famosa por ser uno de los sitios de anidación más importantes del mundo para la tortuga lora (Lepidochelys olivacea). El fenómeno más espectacular es la 'arribada', una llegada masiva de miles de tortugas a la playa para desovar. Las visitas guiadas durante los meses de anidación son la principal atracción, ofreciendo la oportunidad de ser testigo de este impresionante ciclo de la naturaleza bajo la supervisión de expertos y con un fuerte enfoque en la conservación.",
    "description_en": "Ostional National Wildlife Refuge is a protected area on the Guanacaste coast, famous for being one of the world's most important nesting sites for the olive ridley sea turtle (Lepidochelys olivacea). The most spectacular phenomenon is the 'arribada', a massive arrival of thousands of turtles to the beach to lay their eggs. Guided visits during nesting months are the main attraction, offering the opportunity to witness this impressive natural cycle under expert supervision and with a strong focus on conservation.",
    "categories": [
      "Reservas Silvestres",
      "Playas",
      "Santuarios de Animales",
      "Turismo Comunitario"
    ],
    "latitude": 9.9981,
    "longitude": -85.7003
  },
  {
    "destination_id": "4d287a05-ab6a-4172-930f-1ae7280a3a6d",
    "expected_name": "Reserva Biológica Caño Negro",
    "name": "Reserva Biológica Caño Negro",
    "description_es": "La Reserva Biológica Caño Negro es un ecosistema de humedal de importancia internacional y uno de los mejores lugares de Costa Rica para la observación de aves acuáticas. Los visitantes pueden explorar el río y sus lagunas en bote, donde es común ver una gran variedad de aves como garzas, jabirús, espátulas y cormoranes, así como monos, iguanas y cocodrilos. La reserva ofrece una experiencia de naturaleza auténtica en un entorno de llanura inundable, ideal para los amantes de la fotografía y la vida silvestre.",
    "description_en": "Caño Negro Biological Reserve is a wetland ecosystem of international importance and one of the best places in Costa Rica for waterbird watching. Visitors can explore the river and its lagoons by boat, where it is common to see a wide variety of birds such as herons, jabirus, spoonbills, and cormorants, as well as monkeys, iguanas, and crocodiles. The reserve offers an authentic nature experience in a floodplain setting, ideal for photography and wildlife enthusiasts.",
    "categories": [
      "Reservas Silvestres",
      "Islas y Manglares",
      "Aventura y Deportes",
      "Santuarios de Animales"
    ],
    "latitude": 10.8931,
    "longitude": -84.7958
  },
  {
    "destination_id": "c4449fdb-0f4c-49b4-9389-504edecacafc",
    "expected_name": "Reserva Santa Elena",
    "name": "Reserva Santa Elena",
    "description_es": "La Reserva Santa Elena, junto con la Reserva Monteverde, es uno de los principales destinos de bosque nuboso de Costa Rica. Ofrece una experiencia de selva nublada con una red de senderos bien mantenidos que son más tranquilos y menos concurridos que los de Monteverde. Los visitantes pueden caminar a través de una exuberante vegetación cubierta de musgo y epífitas, y ascender a una torre de observación que ofrece una vista panorámica del dosel del bosque y, en días despejados, del Volcán Arenal. Es el lugar ideal para observar el quetzal y otras aves de altura.",
    "description_en": "Santa Elena Reserve, together with Monteverde Reserve, is one of Costa Rica's main cloud forest destinations. It offers a cloud forest experience with a network of well-maintained trails that are quieter and less crowded than Monteverde's. Visitors can walk through lush vegetation covered in moss and epiphytes, and climb to an observation tower that offers a panoramic view of the forest canopy and, on clear days, of Arenal Volcano. It is the ideal place to spot the quetzal and other high-altitude birds.",
    "categories": [
      "Reservas Silvestres",
      "Senderismo",
      "Miradores",
      "Montañas y Cerros",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.3447,
    "longitude": -84.7953
  },
  {
    "destination_id": "19f22053-3581-44a3-9cee-4e1a6025dbdc",
    "expected_name": "Río Chollín (Termales Gratuitas Tabacón)",
    "name": "Río Chollín (Termales Gratuitas Tabacón)",
    "description_es": "El Río Chollín es un pequeño río de aguas termales de origen volcánico, ubicado cerca del complejo de Tabacón. A diferencia de los balnearios comerciales, este es un lugar gratuito y de acceso público, aunque requiere una caminata corta por un sendero. El agua es cálida y cristalina, creando pequeñas pozas y corrientes donde los visitantes pueden relajarse y disfrutar de un baño termal en un entorno natural y rústico. Es una opción económica y auténtica para experimentar las aguas termales de la zona de Arenal.",
    "description_en": "Río Chollín is a small river of volcanic hot springs, located near the Tabacón resort. Unlike commercial spas, this is a free and public access spot, although it requires a short walk along a trail. The water is warm and crystal clear, creating small pools and currents where visitors can relax and enjoy a thermal bath in a natural and rustic setting. It is an affordable and authentic option to experience the hot springs of the Arenal area.",
    "categories": [
      "Termales",
      "Ríos y Pozas",
      "Aventura y Deportes"
    ],
    "latitude": 10.4889,
    "longitude": -84.7235
  },
  {
    "destination_id": "0302a0ee-f48f-428a-a2d5-d2d5986a42ee",
    "expected_name": "Ruinas de Ujarrás y Mirador",
    "name": "Ruinas de Ujarrás y Mirador",
    "description_es": "Las Ruinas de Ujarrás son los restos de una de las primeras iglesias coloniales de Costa Rica, construida en el siglo XVII en el Valle de Orosi. La iglesia fue abandonada en el siglo XIX debido a las inundaciones del río Reventazón y hoy en día se conserva como un sitio histórico y un hermoso jardín. Las ruinas son un lugar de gran importancia cultural y religiosa, y son el escenario de una peregrinación anual. El mirador cercano ofrece una vista panorámica del valle, el lago y las montañas, convirtiendo esta visita en una combinación perfecta de historia y paisaje.",
    "description_en": "Ujarrás Ruins are the remains of one of Costa Rica's first colonial churches, built in the 17th century in the Orosi Valley. The church was abandoned in the 19th century due to flooding from the Reventazón River and today is preserved as a historical site and a beautiful garden. The ruins are a place of great cultural and religious importance and are the setting for an annual pilgrimage. The nearby viewpoint offers a panoramic view of the valley, the lake, and the mountains, making this visit a perfect combination of history and landscape.",
    "categories": [
      "Cultura e Historia",
      "Miradores",
      "Turismo Comunitario",
      "Montañas y Cerros"
    ],
    "latitude": 9.8267,
    "longitude": -83.8297
  },
  {
    "destination_id": "73c70ca5-4437-4e5c-964a-3edea8c86142",
    "expected_name": "San Gerardo de Dota (Avistamiento de Quetzales)",
    "name": "San Gerardo de Dota (Avistamiento de Quetzales)",
    "description_es": "San Gerardo de Dota es un pequeño pueblo de montaña en el Cerro de la Muerte, conocido como uno de los mejores lugares del mundo para avistar el resplandeciente quetzal. El área es un paraíso para los observadores de aves, con una gran cantidad de senderos que atraviesan el bosque nuboso. Los visitantes pueden caminar por la mañana temprano para tener la mejor oportunidad de ver a esta ave icónica. El pueblo es tranquilo, con varios albergues y restaurantes que ofrecen una experiencia de montaña auténtica, con clima frío y paisajes de neblina.",
    "description_en": "San Gerardo de Dota is a small mountain town in Cerro de la Muerte, known as one of the best places in the world to spot the resplendent quetzal. The area is a paradise for birdwatchers, with numerous trails through the cloud forest. Visitors can walk early in the morning for the best chance to see this iconic bird. The town is quiet, with several lodges and restaurants offering an authentic mountain experience, with cold weather and misty landscapes.",
    "categories": [
      "Senderismo",
      "Montañas y Cerros",
      "Reservas Silvestres",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 9.5539,
    "longitude": -83.8058
  },
  {
    "destination_id": "a5e9d74a-399c-43ce-a634-929ac33d9ba5",
    "expected_name": "Teatro Nacional de Costa Rica",
    "name": "Teatro Nacional de Costa Rica",
    "description_es": "El Teatro Nacional de Costa Rica es la joya arquitectónica y cultural del país, ubicado en el centro de San José. Construido en 1897, es un imponente edificio de estilo neoclásico y renacentista italiano, con un lujoso interior que cuenta con mármoles, pinturas al óleo y una estatua de la diosa griega Atenea. Es el escenario principal de las artes escénicas de Costa Rica, ofreciendo una programación de música, danza y teatro. Realizar una visita guiada para conocer su historia y su arquitectura es una experiencia fundamental para entender la identidad cultural costarricense.",
    "description_en": "The National Theatre of Costa Rica is the country's architectural and cultural jewel, located in downtown San José. Built in 1897, it is an imposing building in Neo-Classical and Italian Renaissance style, with a luxurious interior featuring marbles, oil paintings, and a statue of the Greek goddess Athena. It is the main stage for Costa Rica's performing arts, offering a program of music, dance, and theater. Taking a guided tour to learn about its history and architecture is an essential experience to understand Costa Rican cultural identity.",
    "categories": [
      "Cultura e Historia"
    ],
    "latitude": 9.9331,
    "longitude": -84.0768
  },
  {
    "destination_id": "5600ca34-2f45-43d7-86d6-6df202b7ba0b",
    "expected_name": "Termales de San Carlos (La Marina)",
    "name": "Termales de San Carlos (La Marina)",
    "description_es": "Los Termales de San Carlos, conocidos localmente como 'La Marina', son un complejo de aguas termales ubicado en la Zona Norte del país. Cuenta con varias piscinas de agua caliente de diferentes temperaturas, rodeadas de jardines tropicales y áreas de descanso. Es un destino familiar y accesible, ideal para relajarse y disfrutar de un día en un entorno natural y tranquilo. El complejo también ofrece servicios de restaurante, lo que lo convierte en un lugar perfecto para una excursión de día completo.",
    "description_en": "San Carlos Hot Springs, locally known as 'La Marina', is a hot spring complex located in the country's Northern Zone. It features several hot water pools at different temperatures, surrounded by tropical gardens and rest areas. It is a family-friendly and accessible destination, ideal for relaxing and enjoying a day in a natural and peaceful setting. The complex also offers restaurant services, making it a perfect place for a full-day excursion.",
    "categories": [
      "Termales",
      "Hospedaje en la Naturaleza",
      "Aventura y Deportes"
    ],
    "latitude": 10.3981,
    "longitude": -84.3411
  },
  {
    "destination_id": "f5504c6b-1d94-49a1-bee0-c6e2e6aa20b4",
    "expected_name": "Valle de Bajos del Toro",
    "name": "Valle de Bajos del Toro",
    "description_es": "El Valle de Bajos del Toro es una región montañosa de gran belleza escénica, conocida por ser la 'tierra de las cataratas azules'. El valle alberga una gran cantidad de cataratas y pozas de agua de un color turquesa y esmeralda, originadas por los minerales volcánicos de la zona. La región es un paraíso para el senderismo, con rutas de diferentes niveles de dificultad que conectan las diversas cataratas. La visita a Bajos del Toro es una experiencia de inmersión en la naturaleza, donde el agua y el bosque nuboso crean un paisaje de ensueño.",
    "description_en": "Bajos del Toro Valley is a mountainous region of great scenic beauty, known as the 'land of blue waterfalls'. The valley is home to a large number of waterfalls and pools of turquoise and emerald water, originating from the volcanic minerals in the area. The region is a paradise for hiking, with routes of different difficulty levels connecting the various waterfalls. Visiting Bajos del Toro is an immersive nature experience, where water and cloud forest create a dreamlike landscape.",
    "categories": [
      "Ríos y Pozas",
      "Cataratas",
      "Senderismo",
      "Montañas y Cerros",
      "Hospedaje en la Naturaleza"
    ],
    "latitude": 10.2119,
    "longitude": -84.2936
  },
  {
    "destination_id": "265b68c2-77d1-412e-aa44-1517119f90d7",
    "expected_name": "Volcán Barva (PN Braulio Carrillo)",
    "name": "Volcán Barva (PN Braulio Carrillo)",
    "description_es": "El Volcán Barva es una de las cumbres más altas del Parque Nacional Braulio Carrillo, ofreciendo una experiencia de senderismo de alta montaña. El ascenso a la cima es un sendero de dificultad moderada que atraviesa un espeso bosque nuboso. En la cima, los visitantes son recompensados con la vista de la Laguna Barva, un lago de cráter de un verde profundo. La neblina es frecuente, creando un ambiente místico y fresco. Es un destino para amantes de la naturaleza y el senderismo que buscan escapar del calor del valle central.",
    "description_en": "Barva Volcano is one of the highest peaks in Braulio Carrillo National Park, offering a high-mountain hiking experience. The ascent to the summit is a moderate-difficulty trail through a thick cloud forest. At the top, visitors are rewarded with a view of Barva Lagoon, a deep green crater lake. Fog is frequent, creating a mystical and cool atmosphere. It is a destination for nature and hiking lovers seeking to escape the heat of the central valley.",
    "categories": [
      "Parques Nacionales",
      "Volcanes",
      "Senderismo",
      "Montañas y Cerros",
      "Miradores"
    ],
    "latitude": 10.1344,
    "longitude": -84.1039
  }
]$updated_destinations$::jsonb)
  as item(
    destination_id uuid,
    expected_name text,
    name text,
    description_es text,
    description_en text,
    categories text[],
    latitude double precision,
    longitude double precision
  );

do $$
begin
  if (select count(*) from destination_update_payload) <> 48 then
    raise exception 'Expected 48 destination updates';
  end if;

  if (select count(*)
      from destination_update_payload payload
      join public.destinations destination
        on destination.id = payload.destination_id
       and destination.name in (payload.expected_name, payload.name)) <> 48 then
    raise exception 'The 48 destination IDs and initial-or-final names must match before applying this update';
  end if;
end
$$;

insert into private.destination_content_backups (batch_key, destination_id, snapshot)
select '20260903_48_bilingual_destination_update', destination.id, to_jsonb(destination)
from public.destinations destination
join destination_update_payload payload on payload.destination_id = destination.id
on conflict (batch_key, destination_id) do nothing;

update public.destinations destination
set
  name = payload.name,
  description = payload.description_es,
  description_en = payload.description_en,
  category = array_to_string(payload.categories, ' / '),
  location = public.st_setsrid(public.st_makepoint(payload.longitude, payload.latitude), 4326),
  status = 'Activo'
from destination_update_payload payload
where destination.id = payload.destination_id;

do $$
begin
  if (select count(*)
      from public.destinations destination
      join destination_update_payload payload on payload.destination_id = destination.id
      where destination.status = 'Activo'
        and destination.name = payload.name
        and destination.description = payload.description_es
        and destination.description_en = payload.description_en
        and destination.category = array_to_string(payload.categories, ' / ')
        and abs(destination.latitude - payload.latitude) < 0.0000001
        and abs(destination.longitude - payload.longitude) < 0.0000001) <> 48 then
    raise exception 'Destination update verification failed';
  end if;
end
$$;

commit;
