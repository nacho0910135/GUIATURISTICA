-- Preserve the Spanish source text and fill its English counterpart for Foreigner mode.
UPDATE public.destinations
SET description_en = CASE id::text
  WHEN 'da9f4b97-48c3-4d1b-a922-b1ce39ba8de9' THEN $$Natural thermal river surrounded by an exquisite tropical garden.$$
  WHEN 'a850c60f-2007-4032-86e0-c491fe66cf27' THEN $$National religious sanctuary and the destination of the annual pilgrimage.$$
  WHEN '04864685-223f-49bf-b236-ddf5aef7b194' THEN $$Recreational park surrounded by pine forests and ideal for a picnic.$$
  WHEN '7f704236-f988-4cf2-bae6-5d9a2be64d51' THEN $$Indigenous territory with traditional chocolate tours and waterfalls.$$
  WHEN '011b5e2c-2c4b-475f-840a-65638b6fb187' THEN $$Coastal trail, white-faced monkeys, and a coral reef.$$
  WHEN '71b90baf-71ae-4585-9b91-5ba2658cb6a1' THEN $$Secluded turquoise waterfall after a 5 km hike.$$
  WHEN 'ff2a2c1f-bcc1-426c-8616-bcb76e67f1ed' THEN $$A 90-metre free fall inside an extinct volcanic crater.$$
  WHEN '4f625302-a1db-486a-a387-a716bd6a6516' THEN $$A hidden oasis in the Central Volcanic Mountain Range.$$
  WHEN '175bf642-d3ef-49b9-b132-6f63fb404237' THEN $$A quiet beach awarded the Blue Flag distinction.$$
  WHEN '50bda7b6-2c60-494d-9856-8ad8bf470196' THEN $$Spectacular 70-metre waterfall over a crystal-clear pool.$$
  WHEN '1fc1f83f-03fe-4c96-b3cb-a9a0595110f3' THEN $$Famous nature park with spectacular waterfalls and a sanctuary.$$
  WHEN '705c251d-6936-4d48-987f-4c5f4a337337' THEN $$Wide curtain of water above a large pool with a sandy beach.$$
  WHEN '9f91ff95-0924-4acd-afcb-be6e6d30fd0c' THEN $$Impressive waterfalls in a natural reserve setting.$$
  WHEN '45688e18-9f24-4b5f-b324-34a478a1f6d2' THEN $$Turquoise waterfall at the entrance to Rincón de la Vieja.$$
  WHEN 'dfa9f30c-0ac8-485d-b2c8-b9855782497e' THEN $$Famous waterfall with naturally intense sky-blue water.$$
  WHEN '3ff4aa09-8505-40f2-af64-ff9f86fc39df' THEN $$An extreme adventure following a volcanic riverbed.$$
  WHEN '2e6f5b57-9cb6-4511-b904-e5715b4eb6f0' THEN $$Three spectacular waterfalls hidden in the rainforest.$$
  WHEN '2016be0d-d730-47c2-a370-7d342c12af86' THEN $$Two spectacular waterfalls surrounded by rainforest canyons.$$
  WHEN '2c91fbca-8665-4586-9c37-3018204f7ad8' THEN $$A majestic and iconic two-tier waterfall with a large pool.$$
  WHEN 'afe982d6-2bcc-4fce-8fa2-3d17a5ce29ee' THEN $$An underground maze of caves with fossils and bats.$$
  WHEN '4b7fb57a-7d3a-4682-9e89-0f64ffc14835' THEN $$Sanctuary for Costa Rican wild cats.$$
  WHEN '7c972607-b322-44e8-aba3-f8358e09d021' THEN $$Monteverde highest point, with views of both oceans.$$
  WHEN 'ef6f47bf-79a6-4a63-a51a-d36ee1c2272d' THEN $$A highland páramo viewpoint more than 3,400 metres above sea level.$$
  WHEN 'e3fea0d3-78f6-4e64-b1a9-f17935afc3ee' THEN $$The highest point in the northern Caribbean, overlooking the canals.$$
  WHEN '45b0b186-2fb1-4a7a-8da2-36f58da7b3fa' THEN $$Duty-free commercial zone.$$
  WHEN 'aaeb7eb9-513a-4eff-b8b0-8ba75e915463' THEN $$Remote village and main access point to Corcovado National Park.$$
  WHEN 'e4280af7-8ace-4da4-87c4-85f81bfcb8b1' THEN $$Challenging hiking route with four waterfalls and hanging bridges.$$
  WHEN '004af9c6-97f7-4e9b-9700-28eac2dcd40a' THEN $$Costa Rica's largest wetland: mangroves, canals, and an access route to Drake Bay, Corcovado, and Caño Island.$$
  WHEN 'ed8912bc-b01c-41fe-b08e-3d6ee4831c6e' THEN $$The largest inhabited island in the Gulf of Nicoya.$$
  WHEN 'a74744da-5d45-4cac-bdfc-0a04c23e6b29' THEN $$Historic former prison turned into a national park.$$
  WHEN '44bf4cbd-1152-4f60-ab38-780c63262067' THEN $$Paradisiacal island with white sand, coconut trees, and snorkeling.$$
  WHEN 'dc2af359-fa23-475b-aa5a-72f0e8334231' THEN $$Research centre with the largest orchid collection.$$
  WHEN '6c24c898-2a98-4b86-bdc1-af950bb36e53' THEN $$Costa Rica's largest artificial lake for kitesurfing and tours.$$
  WHEN '4281e4e9-e36a-48a6-920c-4803f652393b' THEN $$Mystical lagoon beside Hule Lagoon, surrounded by dense forest.$$
  WHEN '5c3003af-a0be-409d-aeb4-8d3a700cc352' THEN $$Impressive volcanic crater lagoon.$$
  WHEN '6f546a5a-0c36-4baf-8c24-d3f41cb5f145' THEN $$Walk inside the active crater of Miravalles Volcano.$$
  WHEN 'c4034cbc-82dc-4861-b44c-a5a647def3c7' THEN $$Modern commercial marina and sport-fishing tour harbour.$$
  WHEN '886f1226-92cd-4748-ab78-68a06b001d4e' THEN $$A hub of Costa Rican tradition and gastronomy.$$
  WHEN '7c4b512f-accb-4f4b-b21e-8541c1548191' THEN $$A stunning panoramic view of the picturesque Orosi Valley.$$
  WHEN 'd84effa4-43dd-4669-a662-cf181f06002a' THEN $$Ruins of an unfinished hotel with panoramic bay views.$$
  WHEN 'a3a2dab4-d909-4c86-a041-836b5c4637f8' THEN $$Network of hanging bridges with direct views of Arenal Volcano.$$
  WHEN 'f6fa4a81-7b04-47be-b8e4-508967111f21' THEN $$Pre-Hispanic archaeological site northwest of Turrialba, with stone structures and protected premontane forest.$$
  WHEN '534056b5-bffa-4621-8b09-7f44015c3f8f' THEN $$An invaluable collection of pre-Columbian gold artefacts.$$
  WHEN '7eeb2162-fcc2-4dd7-bcd7-9e4e5d41a519' THEN $$Transboundary protected area in the Talamanca Range, with trails and high-mountain biodiversity.$$
  WHEN '4db6fa56-09ed-4c1a-800f-2ca1981dcab6' THEN $$Pristine forest in the ancestral territory of the Cabécar community.$$
  WHEN 'cbfd7724-96b7-41b3-9c2f-efc1da9eb19b' THEN $$Underground limestone cave complex.$$
  WHEN '053a8d2e-be00-4e6d-a89e-e70fa6909e74' THEN $$Pristine tropical rainforest crossed by the route to the Caribbean.$$
  WHEN 'f9ca5c97-578c-44b3-bb5e-a02f6bcacca1' THEN $$Transitional forest and the main scarlet macaw sanctuary.$$
  WHEN 'aeefa29b-fbac-4502-89e7-24173e767027' THEN $$The highest point in Costa Rica at 3,820 metres above sea level.$$
  WHEN '7b1cf8df-64ed-4916-a87e-7754135bc82d' THEN $$Northern entrance to the park, surrounded by primary rainforest and waterfalls.$$
  WHEN 'd5b62a62-4d1a-49f3-8107-f4171755ebd9' THEN $$Home to 2.5% of the planet's biodiversity.$$
  WHEN '5fe2bb28-f908-4fde-84b0-31845ed903b3' THEN $$Crystal-clear bay ideal for snorkeling.$$
  WHEN '5348f4c1-8357-43d8-9bb6-2e1f2153d772' THEN $$Costa Rica's highest volcano, with an impressive acidic lagoon.$$
  WHEN 'ae48edef-d668-4f35-b08d-f0dc9c3805fb' THEN $$World Heritage Site and a world-renowned diving destination.$$
  WHEN 'c7a89114-668e-49b5-8050-6aec49d39581' THEN $$Cloud-forest national park with rivers and springs in the Central Volcanic Mountain Range.$$
  WHEN '36e04479-6479-4474-ae51-1e90a8a56faf' THEN $$Cloud forests and high-mountain oak forests.$$
  WHEN '9606095b-6788-499f-892a-2c3ff4682319' THEN $$The most visited park, with dreamlike beaches and monkeys.$$
  WHEN 'c2c78023-81a4-41dc-a297-184b2609f17d' THEN $$Whale-tail sandbar formation and whale watching.$$
  WHEN 'd2ff6614-0fbb-4a2f-8546-694d016f9e22' THEN $$Leatherback turtle nesting sanctuary.$$
  WHEN 'b54a63ad-0032-4aff-a175-345ad9de3e12' THEN $$Waterbird sanctuary on the Tempisque River.$$
  WHEN 'cc900202-55ed-4515-9acc-b4150750f642' THEN $$Extensive protected tropical rainforest on the shore of Golfo Dulce.$$
  WHEN '0e9f1614-d0da-4b50-af1a-19eed64d70fc' THEN $$Birthplace of national sovereignty and dry-forest conservation.$$
  WHEN '50ad9885-7625-43f8-ab83-1904a6e46baf' THEN $$One of the rainiest and most biodiverse places in the country.$$
  WHEN 'afe6a9cc-0b88-4c82-9cfb-908352b194c2' THEN $$Network of biological canals and green turtle nesting grounds.$$
  WHEN '90168df9-d141-4ff5-9683-49b6e1ff3517' THEN $$Iconic cone-shaped volcano surrounded by lava-flow trails.$$
  WHEN '99d9908b-a8f2-482b-b36b-5faee279c84e' THEN $$Geothermal activity, hot springs, volcanic mud, and waterfalls.$$
  WHEN 'a22f413f-9398-4154-a27f-7b1b2060a3a6' THEN $$Imposing active crater with an acidic lagoon.$$
  WHEN 'a7bc2b3b-8fd3-44c8-a263-477f937b3021' THEN $$Boiling mud pots, fumaroles, and waterfalls.$$
  WHEN '92bb87bb-e42a-415d-b468-50be2b62ba18' THEN $$Seaside boulevard famous for Churchill shaved-ice drinks and vigorón.$$
  WHEN 'eb571fca-80b2-45c7-b921-1337e443d54e' THEN $$Impressive rocky cliffs over the Pacific Ocean.$$
  WHEN '2e03c9d7-407b-4fda-b3fc-5cca4d0dc14b' THEN $$Home to the famous wooden bridge and iconic waves.$$
  WHEN '494c1a55-b793-4b0d-8227-c9e619382747' THEN $$A favourite beach in Limón for surfing and Afro-Caribbean food.$$
  WHEN 'e7ea3d67-ee8a-4268-8768-c06debb45460' THEN $$A hub between Malpaís and Santa Teresa.$$
  WHEN 'c27f5b22-ef9e-406b-b7db-4a25c139400d' THEN $$Paradisiacal beach lined with majestic coconut palms.$$
  WHEN '0ada5c4c-f045-434a-953f-8f3c4ce859f5' THEN $$Small reef-protected coves amid lush vegetation.$$
  WHEN '8c5902bc-5b1e-4477-973f-ec5995513c91' THEN $$Golden-sand beach famous for the Salsa Brava wave.$$
  WHEN 'f52c5754-d104-471d-8355-ad8c28530ceb' THEN $$Famous beach made entirely of crushed shells.$$
  WHEN '26f2a11c-0886-4a9d-93db-cc052b12fc54' THEN $$Quiet coves surrounded by mountain trails in Las Catalinas.$$
  WHEN 'aca4d9c8-82c6-4c6c-a6e5-6de6973c32a4' THEN $$Surf town surrounded by lush tropical vegetation.$$
  WHEN '57dab624-e897-4fb7-b553-5672d53efe52' THEN $$Peaceful cove with calmer waters near Dominical.$$
  WHEN 'fed14782-f371-4b89-a585-0051335ffa4c' THEN $$Coastal recreation park with shelters and natural shade.$$
  WHEN '00035e45-54c1-42a3-95f9-2da90a36137e' THEN $$Long public beach next to Manuel Antonio National Park.$$
  WHEN 'eaa40cf6-2a37-4052-b01e-f899a117e030' THEN $$Vast dark-sand coast with a mermaid statue in the sea.$$
  WHEN 'de5771e9-b4c0-4263-893e-cd11e67f5d85' THEN $$Exclusive white-sand beach with a modern international marina.$$
  WHEN '81598a1c-680e-4066-a9d6-9eef7f0b786b' THEN $$Protected bay for artisanal fishers, with calm water.$$
  WHEN '60ed13c3-a610-4d42-a551-242db34155d8' THEN $$Long sandy beach with consistent waves, perfect for learning to surf.$$
  WHEN '11ed5e72-637f-442d-bcd9-40bc23cdeff0' THEN $$Beautiful golden-sand bay north of Santa Teresa.$$
  WHEN '0a67fcab-9e5a-456f-8c45-f40008bc8467' THEN $$Quiet bay awarded the Ecological Blue Flag.$$
  WHEN '6f54a014-b0ef-4c82-9aaf-59d8eb1d7faf' THEN $$World surf sanctuary with powerful, consistent waves.$$
  WHEN '9fcea84c-2a34-4b96-95ea-848f09741c92' THEN $$Serene bay, home to Los Sueños Marina.$$
  WHEN '64695287-4a89-43f7-9582-3603e3ffb227' THEN $$Vibrant coastal town with consistent surf and dining options.$$
  WHEN '036b75cf-b194-4445-be8c-eb670cb10421' THEN $$Long, open, quiet beach, ideal for sunsets.$$
  WHEN '3c522d26-fee4-415e-9284-6763a83a3ccd' THEN $$Residential continuation of Tamarindo with excellent waves.$$
  WHEN '994c682a-713f-488d-a95c-aa013b1dba4f' THEN $$Rocky coast with striking reef formations.$$
  WHEN 'b4e137f1-ec5e-41e7-81e6-9dec15734b84' THEN $$Open coast, ideal for relaxing in the South Pacific.$$
  WHEN '5352bce1-4fc0-4980-bb87-03f992a10d45' THEN $$Bohemian coastal village with beautiful beaches.$$
  WHEN 'e15772f9-e498-469d-98b3-c71b90c0bf19' THEN $$Legendary surf beach facing the majestic Roca Bruja outcrop.$$
  WHEN '706178a4-1fa7-46d6-89eb-2cf6adfca3fb' THEN $$World-renowned surf destination with right-breaking waves.$$
  WHEN 'cbdf2e14-283c-4cc4-b333-c2070d6da084' THEN $$Global hub for yoga, surfing, and sustainable living.$$
  WHEN '27d30b09-3423-40c9-8ad4-ad87629e8326' THEN $$Grey-sand cove with calm water, ideal for snorkeling.$$
  WHEN '94dfa24c-b21d-4263-876f-29f63ba0a729' THEN $$Home to one of the longest left-hand waves in the world.$$
  WHEN '983457d4-9f7d-49a1-a564-eff9199ae07f' THEN $$Crystal-clear turquoise water surrounded by palms.$$
  WHEN '58e6e984-102e-4b29-8efd-f7a1bf2438da' THEN $$Coral-reef-protected bay designed for families.$$
  WHEN '2948830e-6cb2-4e1b-bc5f-528e66d9f3ad' THEN $$Miles of untouched coast in the south of the Nicoya Peninsula.$$
  WHEN '7bfa5479-faa4-424f-9b4b-98d391fb9e00' THEN $$Cosmopolitan destination famous for world-class surf.$$
  WHEN '6255a13f-4a71-4a43-b811-607c30fbe7eb' THEN $$A world-renowned surf mecca and a dining and commercial hub.$$
  WHEN '08aad3d4-170f-44cb-b327-5278940fd894' THEN $$Wide bay with calm water on the Nicoya Peninsula.$$
  WHEN '555efa7d-f444-4a5f-a777-9e614cc6c9b1' THEN $$Beach surrounded by natural caves carved by the sea.$$
  WHEN '178542f1-2a06-430e-811f-e928484495b1' THEN $$Long peninsula with calm water in Golfo Dulce.$$
  WHEN 'cf9e91a5-ad63-48a5-b1ff-ab495eed5159' THEN $$Traditional beach town with active nightlife and marine tours.$$
  WHEN 'dee4df23-7e17-4496-8378-b99d223057a2' THEN $$Naturally acidic water with an intense blue colour.$$
  WHEN '4e66c108-7ed0-4265-b12c-41ca17547271' THEN $$Wildlife rehabilitation centre for confiscated animals.$$
  WHEN '759f7f76-606d-4629-9867-81e66bbac63e' THEN $$Major observation point for American crocodiles.$$
  WHEN 'e4c9f859-f7f4-4b51-aea7-1b2af451182a' THEN $$Eastern gateway to Corcovado National Park and Golfo Dulce.$$
  WHEN '9717afac-94e0-496d-b48b-5812a05687c0' THEN $$Hub of the southern Caribbean with a multicultural atmosphere.$$
  WHEN '62300b89-072f-429e-bbe9-401f147933cf' THEN $$Northern Caribbean wetlands and waterways, ideal for wildlife viewing and boating.$$
  WHEN 'da01f59f-0045-4aa2-b4ea-79ef67f4b8fd' THEN $$Coastal rainforest trail with viewpoints and reefs.$$
  WHEN 'd599ee5d-2dbe-4886-9cd9-f3dbb48271c4' THEN $$Abundant wildlife, deer, monkeys, and bioluminescent tours.$$
  WHEN '7cc91f6c-81a4-475b-8f76-640d84bbe216' THEN $$Site of the spectacular mass arribadas of olive ridley turtles.$$
  WHEN '4d287a05-ab6a-4172-930f-1ae7280a3a6d' THEN $$One of the most important wetlands for migratory birds.$$
  WHEN '8104fe85-a950-405b-b901-3706932f25cb' THEN $$The best place on the Costa Rican Pacific for snorkeling and diving.$$
  WHEN 'f1f8bc1a-b426-41b5-81ad-c8f3475e1eb4' THEN $$A global icon of cloud-forest conservation.$$
  WHEN '8ceceb72-6890-4fac-9f02-d5fe7aad5211' THEN $$The first protected area established in Costa Rica in 1963.$$
  WHEN 'c4449fdb-0f4c-49b4-9389-504edecacafc' THEN $$High-elevation cloud forest managed by the community.$$
  WHEN '19f22053-3581-44a3-9cee-4e1a6025dbdc' THEN $$Public section of the thermal river, free for bathers.$$
  WHEN '21978a3e-3177-4d59-9fa1-de2d059fc126' THEN $$World-renowned whitewater river for rafting; use authorised guides and operators.$$
  WHEN '0302a0ee-f48f-428a-a2d5-d2d5986a42ee' THEN $$Former colonial church surrounded by extensive green areas.$$
  WHEN '73c70ca5-4437-4e5c-964a-3edea8c86142' THEN $$Mystical valley famous for quetzal watching.$$
  WHEN '80dd9288-6b8b-47b3-a93a-cab890fda5ed' THEN $$Site museum with the famous pre-Columbian stone spheres.$$
  WHEN 'a5e9d74a-399c-43ce-a634-929ac33d9ba5' THEN $$Architectural jewel and national historic icon.$$
  WHEN '5600ca34-2f45-43d7-86d6-6df202b7ba0b' THEN $$Community thermal pools with sulphurous water.$$
  WHEN 'f5504c6b-1d94-49a1-bee0-c6e2e6aa20b4' THEN $$Waterfall-rich area between extinct volcanoes.$$
  WHEN '265b68c2-77d1-412e-aa44-1517119f90d7' THEN $$Mystical volcanic lagoon surrounded by lush cloud forest.$$
  WHEN '15e54bc6-d0ab-4011-a184-4ed850b47cdd' THEN $$Extensive trail network through lush eucalyptus forests.$$
  ELSE description_en
END
WHERE status = 'Activo'
  AND NULLIF(BTRIM(description_en), '') IS NULL;
