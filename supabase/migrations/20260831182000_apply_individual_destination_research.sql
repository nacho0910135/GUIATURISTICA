-- Individually researched, source-linked destination summaries.  These replace
-- category templates with facts supported by the linked institutional or
-- destination-specific source.  Dynamic details such as prices and hours are
-- intentionally not copied into these descriptions.
with audited (id, category, description, description_en, source_url) as (
  values
    ('62300b89-072f-429e-bbe9-401f147933cf'::uuid, 'Reservas Silvestres',
      'El Refugio de Vida Silvestre Barra del Colorado se encuentra en el noreste de Limón, junto al río San Juan y la frontera con Nicaragua. SINAC lo describe como un refugio mixto con zonas costeras, lagunas, ríos, pantanos y bosques inundados; la visita debe planificarse con la administración del área.',
      'Barra del Colorado Wildlife Refuge lies in northeastern Limón, beside the San Juan River and the Nicaraguan border. SINAC describes it as a mixed refuge with coastal areas, lagoons, rivers, swamps, and flooded forests; visits should be planned with the protected-area administration.',
      'https://sinac.go.cr/ES/ac/acto/rvsbc/Paginas/default.aspx'),
    ('21978a3e-3177-4d59-9fa1-de2d059fc126'::uuid, 'Ríos y Pozas',
      'El río Pacuare nace en la Cordillera de Talamanca y es uno de los ríos que el ICT identifica para rafting. La fuente turística oficial describe rápidos para esta actividad; contratá un operador autorizado y escogé el tramo acorde con tu experiencia.',
      'The Pacuare River rises in the Talamanca Range and is one of the rivers the ICT identifies for rafting. The official tourism source describes rapids for this activity; use an authorised operator and choose a section suited to your experience.',
      'https://es.visitcostarica.com/where-to-go/central-valley/tourist-atractions-in-central-valley'),
    ('f6fa4a81-7b04-47be-b8e4-508967111f21'::uuid, 'Cultura / Senderismo',
      'El Monumento Nacional Guayabo está al noroeste de Turrialba, Cartago. SINAC protege allí estructuras arquitectónicas prehispánicas de piedra y bosque pluvial premontano; es un sitio arqueológico, no una playa ni un atractivo genérico de senderismo.',
      'Guayabo National Monument is northwest of Turrialba, Cartago. SINAC protects pre-Hispanic stone architectural structures and premontane rainforest there; it is an archaeological site, not a beach or a generic hiking attraction.',
      'https://www.sinac.go.cr/ES/ac/accvc/mng/Paginas/default.aspx'),
    ('004af9c6-97f7-4e9b-9700-28eac2dcd40a'::uuid, 'Reservas Silvestres',
      'El Humedal Nacional Térraba-Sierpe se ubica en el Pacífico Sur, en la cuenca de los ríos Sierpe y Térraba, dentro del valle del Diquís. La documentación de SINAC lo identifica como sitio Ramsar y describe un gran delta con manglar, pantanos y red hídrica; coordiná cualquier visita con operadores y autoridades locales.',
      'Térraba-Sierpe National Wetland lies in the South Pacific, in the Sierpe and Térraba river basin within the Diquís Valley. SINAC documentation identifies it as a Ramsar site and describes a large delta with mangroves, swamps, and waterways; arrange any visit with local operators and authorities.',
      'https://www.sinac.go.cr/ES/docu/Inventario%20Nacional%20Humedales/VALORACI%C3%93N%20ECON%C3%93MICA%20DE%20SIETE%20HUMEDALES%20RAMSAR.pdf'),
    ('2e6f5b57-9cb6-4511-b904-e5715b4eb6f0'::uuid, 'Cataratas',
      'Las Cataratas de Montezuma son un conjunto de caídas de agua cerca del poblado de Montezuma, en la península de Nicoya. El ICT señala una catarata principal de unos 20 metros con poza natural y un acceso a pie por el lecho del río; verificá las condiciones del sendero antes de entrar.',
      'Montezuma Waterfalls are a group of waterfalls near the town of Montezuma on the Nicoya Peninsula. The ICT notes a main fall of about 20 metres with a natural pool and a walk along the riverbed; check trail conditions before entering.',
      'https://www.visitcostarica.com/where-to-go/puntarenas/tourist-atractions-in-puntarenas'),
    ('175bf642-d3ef-49b9-b132-6f63fb404237'::uuid, 'Cataratas',
      'Catarata El Rey se encuentra en el territorio indígena Huetar de Zapatón, en el distrito de Chires, Puriscal. La ficha de turismo rural de la comunidad la presenta junto con Catarata La Princesa y recorridos guiados; el caudal puede disminuir en verano, por lo que confirmá la visita directamente con el emprendimiento local.',
      'Catarata El Rey is in the Huetar Indigenous Territory of Zapatón, in Chires, Puriscal. The community rural-tourism listing presents it alongside Catarata La Princesa and guided walks; flow can decrease in the dry season, so confirm your visit directly with the local enterprise.',
      'https://descubramoscostarica.com/index.php/es/destino/catarata-el-rey'),
    ('7eeb2162-fcc2-4dd7-bcd7-9e4e5d41a519'::uuid, 'Parque Nacional / Patrimonio Mundial',
      'El Parque Internacional La Amistad es un área protegida binacional de la Cordillera de Talamanca, compartida por Costa Rica y Panamá. SINAC señala ecosistemas de robledal, bosque nuboso, páramo y humedales de altura; consultá el sector habilitado y los requisitos de ingreso antes de organizar la visita.',
      'La Amistad International Park is a binational protected area in the Talamanca Range, shared by Costa Rica and Panama. SINAC identifies oak forest, cloud forest, páramo, and high-elevation wetlands; check the open sector and entry requirements before planning a visit.',
      'https://www.sinac.go.cr/ES/turismo/Paginas/parquesnacionales.aspx'),
    ('c7a89114-668e-49b5-8050-6aec49d39581'::uuid, 'Parque Nacional',
      'El Parque Nacional del Agua Juan Castro Blanco se localiza al sureste de Ciudad Quesada, en las estribaciones de la Cordillera Volcánica Central. La información de SINAC indica que no recibe visitación turística actualmente; no lo planifiqués como un parque abierto sin confirmar primero el estado oficial.',
      'Juan Castro Blanco Water National Park lies southeast of Ciudad Quesada, in the foothills of the Central Volcanic Range. SINAC information states that it is not currently receiving tourist visits; do not plan it as an open park without first confirming its official status.',
      'https://www.sinac.go.cr/EN-US/turismo/Pages/map.aspx')
)
update public.destinations as destination
set
  category = audited.category,
  description = audited.description,
  description_en = audited.description_en,
  source_url = audited.source_url,
  source_checked_at = now()
from audited
where destination.id = audited.id;

do $$
begin
  if (select count(*) from public.destinations where id in (
    '62300b89-072f-429e-bbe9-401f147933cf', '21978a3e-3177-4d59-9fa1-de2d059fc126',
    'f6fa4a81-7b04-47be-b8e4-508967111f21', '004af9c6-97f7-4e9b-9700-28eac2dcd40a',
    '2e6f5b57-9cb6-4511-b904-e5715b4eb6f0', '175bf642-d3ef-49b9-b132-6f63fb404237',
    '7eeb2162-fcc2-4dd7-bcd7-9e4e5d41a519', 'c7a89114-668e-49b5-8050-6aec49d39581'
  ) and source_checked_at is not null) <> 8 then
    raise exception 'No se aplicó el lote completo de descripciones auditadas.';
  end if;
end
$$;
