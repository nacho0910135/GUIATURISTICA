import assert from 'node:assert/strict';

import { createClient } from '@supabase/supabase-js';

const API = 'https://api.quebuenlugar.com';
const SITE = 'https://quebuenlugar.com';
const apply = process.argv.includes('--apply');

const CATEGORY_AUDIT = [
  {
    destinationId: '2960fd73-68f0-44ae-a66e-97bc4b6c257c',
    sourceId: 55,
    sourceSlug: 'gaviln-termales-escondidos-entre-lluvia-y-queso-artesanal',
    category: 'Ríos y Pozas / Termales',
    evidence: /termal/i,
  },
  {
    destinationId: 'eccd8687-88be-4685-a793-d2ecf028a7ce',
    sourceId: 84,
    sourceSlug: 'hornillas-volcn-miravalles',
    category: 'Cataratas / Termales',
    evidence: /termal/i,
  },
  {
    destinationId: '718068b7-f838-4dbf-a55b-9a7f5a7ae5bd',
    sourceId: 85,
    sourceSlug: 'can-de-la-vieja-aventura-entre-ros-y-spa-volcnico',
    category: 'Cataratas / Termales',
    evidence: /termal/i,
  },
  {
    destinationId: 'd0a62ab5-3a53-40ee-aab7-e6d64ecbc1d7',
    sourceId: 163,
    sourceSlug: 'rio-perdido-bagaces-2',
    category: 'Senderismo / Termales / Ríos y Pozas',
    evidence: /^(?=[\s\S]*termal)(?=[\s\S]*r[ií]o)[\s\S]*$/i,
  },
  {
    destinationId: '39512ffa-2050-4cc6-afaa-d6182e538e6b',
    sourceId: 299,
    sourceSlug: 'sensoria-aguas-claras-2',
    category: 'Cataratas / Termales',
    evidence: /termal/i,
  },
  {
    destinationId: '78b74909-bfa7-4af9-ab3a-c0c8b27a8c4b',
    sourceId: 64,
    sourceSlug: 'volcn-barva-hiking-entre-neblina-lagunas-y-senderos-picos-a-solo-35-km-de-san-jos',
    category: 'Parques Nacionales / Volcán / Senderismo',
    evidence: /^(?=[\s\S]*volc[aá]n)(?=[\s\S]*(?:hiking|sendero))[\s\S]*$/i,
  },
  {
    destinationId: '49678098-0da7-45fc-aea8-8bc3f7e7354d',
    sourceId: 370,
    sourceSlug: 'volcn-turrialba-un-gigante-imponente-con-vista-al-infinito',
    category: 'Parques Nacionales / Volcán',
    evidence: /volc[aá]n/i,
  },
  {
    destinationId: 'd2961dd1-662d-498a-adb2-81da24c495c8',
    sourceId: 183,
    sourceSlug: 'refugio-de-aves-alexander-skutch-los-cusingos',
    category: 'Ríos y Pozas / Reservas Silvestres',
    evidence: /reserva|refugio/i,
  },
  {
    destinationId: '4a4fe362-588b-4aae-ac9a-f65479b54d89',
    sourceId: 243,
    sourceSlug: 'reserva-karen-mogensen-jicaral',
    category: 'Cataratas / Reservas Silvestres',
    evidence: /reserva|refugio/i,
  },
  {
    destinationId: 'da01f59f-0045-4aa2-b4ea-79ef67f4b8fd',
    sourceId: 268,
    sourceSlug: 'refugio-de-vida-silvestre-gandoca-manzanillo',
    category: 'Senderismo / Playa / Mirador / Reservas Silvestres',
    evidence: /reserva|refugio/i,
  },
  {
    destinationId: '8ceceb72-6890-4fac-9f02-d5fe7aad5211',
    sourceId: 94,
    sourceSlug: 'reserva-natural-absoluta-cabo-blanco-el-origen-de-nuestras-reas-protegidas',
    category: 'Senderismo / Playa / Reservas Silvestres',
    evidence: /reserva|refugio/i,
  },
  {
    destinationId: 'f1f8bc1a-b426-41b5-81ad-c8f3475e1eb4',
    sourceId: 181,
    sourceSlug: 'reserva-biologica-bosque-nuboso-de-monteverde',
    category: 'Senderismo / Reservas Silvestres',
    evidence: /reserva|refugio/i,
  },
  {
    destinationId: '5c3003af-a0be-409d-aeb4-8d3a700cc352',
    sourceId: 144,
    sourceSlug: 'laguna-hule',
    category: 'Laguna / Reservas Silvestres',
    evidence: /reserva|refugio/i,
  },
  {
    destinationId: 'b622d853-3eb1-44f9-a26d-e782a63400af',
    sourceId: 105,
    sourceSlug: 'refugio-de-vida-silvestre-cur-playas-senderos-y-bioluminiscencia-en-puntarenas',
    category: 'Reservas Silvestres / Playa / Senderismo',
    evidence: /reserva|refugio/i,
  },
  {
    destinationId: '79b9ae59-07c6-4549-aaae-f6ba8fad0816',
    sourceId: 363,
    sourceSlug: 'reserva-targu-naturaleza-senderos-y-piscina-natural-en-santa-ana',
    category: 'Miradores / Reservas Silvestres / Senderismo',
    evidence: /^(?=[\s\S]*reserva)(?=[\s\S]*sendero)[\s\S]*$/i,
  },
  {
    destinationId: 'cd3a778a-66eb-46a5-a276-9ad21dbb573d',
    sourceId: 182,
    sourceSlug: 'reserva-ecologica-mosqueritos',
    category: 'Ríos y Pozas / Reservas Silvestres',
    evidence: /reserva|refugio/i,
  },
  {
    destinationId: 'e9071a5b-e9bf-42e7-aa2f-6220124483fd',
    sourceId: 282,
    sourceSlug: 'catarata-san-fernando-aventura-en-cinchona',
    category: 'Ríos y Pozas / Cataratas',
    evidence: /catarata/i,
  },
  {
    destinationId: '17fea8ea-9bef-4c4e-a395-6822703d6714',
    sourceId: 46,
    sourceSlug: 'agujas-bijagual-kayak-catarata-y-atardecer',
    category: 'Playas / Cataratas',
    evidence: /catarata/i,
  },
  {
    destinationId: 'cf375ecb-60f3-4fcf-aa66-baa84b303f52',
    sourceId: 159,
    sourceSlug: 'manuel-antonio-y-catarata-el-salto',
    category: 'Parques Nacionales / Cataratas',
    evidence: /catarata/i,
  },
  {
    destinationId: 'c10d4083-b7bd-40fe-ab1b-0c280f9552f7',
    sourceId: 101,
    sourceSlug: 'safari-canopy-y-catarata-en-la-ponderosa-liberia',
    category: 'Ríos y Pozas / Cataratas',
    evidence: /catarata/i,
  },
  {
    destinationId: '7b7958a5-c644-4830-a536-b5d87cafdd89',
    sourceId: 126,
    sourceSlug: 'cataratas-los-campesinos-san-lorenzo-de-tarraz',
    category: 'Senderismo / Cataratas',
    evidence: /catarata/i,
  },
  {
    destinationId: 'e10b5e68-316c-4342-a00b-213270a93f38',
    sourceId: 263,
    sourceSlug: 'cataratas-el-congo',
    category: 'Miradores / Cataratas',
    evidence: /catarata/i,
  },
  {
    destinationId: '93ee328f-99e7-46e1-ac30-7b4d0e91a43a',
    sourceId: 355,
    sourceSlug: 'restaurante-senderos-cataratas-pozas-y-comida-rica-en-san-ramn',
    category: 'Senderismo / Cataratas / Ríos y Pozas / Experiencia Gastronómica',
    evidence: /^(?=[\s\S]*restaurante)(?=[\s\S]*(?:catarata|poza))[\s\S]*$/i,
  },
  {
    destinationId: 'c84ba050-30fd-4fcd-a684-c5078c65a5d6',
    sourceId: 278,
    sourceSlug: 'playa-biesanz',
    category: 'Miradores / Playa',
    evidence: /playa/i,
  },
  {
    destinationId: '11f7dad5-25d0-45c8-ac5b-d1d9d3b81739',
    sourceId: 124,
    sourceSlug: 'rio-la-mina-y-mirador-miramar-2',
    category: 'Cataratas / Ríos y Pozas / Miradores',
    evidence: /r[ií]o|mirador/i,
  },
  {
    destinationId: '2fdc3da5-55f7-483b-ab96-8e34760704ff',
    sourceId: 168,
    sourceSlug: 'mirador-finca-del-ice-cartago',
    category: 'Ríos y Pozas / Miradores',
    evidence: /mirador/i,
  },
  {
    destinationId: '355a1fd7-cff8-4400-a523-930f3c632dfe',
    sourceId: 110,
    sourceSlug: 'poza-penjamo-ciudad-colon',
    category: 'Cataratas / Ríos y Pozas',
    evidence: /poza/i,
  },
  {
    destinationId: '1664072a-515e-4fe5-aad7-1d9a604f0add',
    sourceId: 216,
    sourceSlug: 'rio-picagres-san-jose-2',
    category: 'Cataratas / Ríos y Pozas',
    evidence: /r[ií]o/i,
  },
  {
    destinationId: 'e3c078a8-9b8c-4f59-ac8f-cc19ce2ebedc',
    sourceId: 202,
    sourceSlug: 'finca-poza-guacimo-pococi',
    category: 'Cataratas / Ríos y Pozas',
    evidence: /poza/i,
  },
  {
    destinationId: 'b11f867d-76f0-4ef7-ab99-4b9f67527e7a',
    sourceId: 230,
    sourceSlug: 'poza-el-can-finca-san-gerardo-san-ramn',
    category: 'Cataratas / Ríos y Pozas',
    evidence: /poza|cañ[oó]n/i,
  },
  {
    destinationId: '878a93ce-0150-4e33-a420-aab89dca7dd9',
    sourceId: 234,
    sourceSlug: 'poza-la-presa-colonia-del-toro',
    category: 'Cataratas / Ríos y Pozas',
    evidence: /poza/i,
  },
  {
    destinationId: '72e46c72-752d-44cd-a184-3643843cc67a',
    sourceId: 241,
    sourceSlug: 'poza-los-abuelos-limon',
    category: 'Cataratas / Ríos y Pozas',
    evidence: /poza/i,
  },
  {
    destinationId: 'c5313480-c9ea-4435-adff-94410c5cf183',
    sourceId: 303,
    sourceSlug: 'poza-los-coyotes',
    category: 'Cataratas / Ríos y Pozas',
    evidence: /poza/i,
  },
  {
    destinationId: '9f7248bd-35a2-4ad1-aa1e-7f2bb2382358',
    sourceId: 239,
    sourceSlug: 'caminata-ro-cajn-coronado',
    category: 'Cataratas / Ríos y Pozas / Senderismo',
    evidence: /^(?=[\s\S]*caminata)(?=[\s\S]*r[ií]o)[\s\S]*$/i,
  },
  {
    destinationId: 'b68af8aa-f24b-4d3f-a61a-4103efa47a61',
    sourceId: 261,
    sourceSlug: 'rio-celeste-parque-nacional-volcan-tenorio',
    category: 'Parques Nacionales / Ríos y Pozas',
    evidence: /r[ií]o/i,
  },
  {
    destinationId: '456ae5ae-d92b-4ead-a6cc-e1361561d1b2',
    sourceId: 257,
    sourceSlug: 'canon-del-rio-aranjuez',
    category: 'Cataratas / Ríos y Pozas',
    evidence: /r[ií]o|cañ[oó]n/i,
  },
  {
    destinationId: 'eb9754a7-27ca-40f9-a559-af24f0a54940',
    sourceId: 53,
    sourceSlug: 'palo-verde-humedales-senderos-y-vida-salvaje-en-guanacaste',
    category: 'Parques Nacionales / Senderismo',
    evidence: /sendero/i,
  },
  {
    destinationId: 'e71727da-c7a9-4256-a457-82591cf6a47c',
    sourceId: 139,
    sourceSlug: 'caminata-manuel-antonio',
    category: 'Playas / Senderismo',
    evidence: /caminata/i,
  },
  {
    destinationId: 'ef5e9eba-69ee-4d59-a974-4fb300bc0b44',
    sourceId: 358,
    sourceSlug: 'tierra-de-quetzales-senderismo-cascadas-y-avionetas-perdidas-en-copey',
    category: 'Cataratas / Senderismo',
    evidence: /senderismo|sendero/i,
  },
  {
    destinationId: '443dad7b-a484-41a6-a681-0ac48b7581f5',
    sourceId: 44,
    sourceSlug: 'cerro-dantas-en-heredia-caminata-con-cataratas-y-selva-nublada',
    category: 'Cataratas / Senderismo',
    evidence: /caminata/i,
  },
  {
    destinationId: '90742d2c-2cb5-4aaa-a6eb-18630c1caded',
    sourceId: 260,
    sourceSlug: 'senderos-de-colon-ciudad-colon',
    category: 'Miradores / Senderismo',
    evidence: /sendero/i,
  },
  {
    destinationId: '6741cfe6-606c-4a2b-a59d-aeeb3271df71',
    sourceId: 233,
    sourceSlug: 'senderos-la-arboleda-la-guacima-2',
    category: 'Miradores / Senderismo',
    evidence: /sendero/i,
  },
  {
    destinationId: 'ad31c687-0184-4111-a980-ffebef2396d1',
    sourceId: 339,
    sourceSlug: 'copey-estate-winery-san-jose',
    category: 'Miradores / Experiencia Gastronómica',
    evidence: /degust|viñedo|vino|licor/i,
  },
  {
    destinationId: 'cae134ec-1b9f-48e1-ae90-4ec9c0b795af',
    sourceId: 225,
    sourceSlug: 'poza-las-gradas-cartago',
    category: 'Cataratas / Ríos y Pozas',
    evidence: /poza|r[ií]o/i,
  },
  {
    destinationId: 'dabeca08-12db-460b-a587-2775485a51d5',
    sourceId: 167,
    sourceSlug: 'ro-loro-cartago-un-bosque-urbano-para-desconectarse',
    category: 'Senderismo / Ríos y Pozas',
    evidence: /r[ií]o/i,
  },
];

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.');
}

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function spanish(record) {
  return record.translations?.find((translation) => translation.languages_code?.startsWith('es')) ?? record;
}

async function sourceRecord(sourceId) {
  const fields = 'id,translations.languages_code,translations.title,translations.introduction,translations.description';
  const response = await fetch(`${API}/items/Lugares/${sourceId}?fields=${encodeURIComponent(fields)}`);
  if (!response.ok) throw new Error(`Qué Buen Lugar respondió ${response.status} para la ficha ${sourceId}.`);
  return (await response.json()).data;
}

const records = await Promise.all(CATEGORY_AUDIT.map(async (audit) => ({ audit, source: await sourceRecord(audit.sourceId) })));
for (const { audit, source } of records) {
  const localized = spanish(source);
  const text = [localized.title, localized.introduction, localized.description].filter(Boolean).join(' ');
  assert.match(text, audit.evidence, `La ficha ${audit.sourceId} no acredita la categoría auditada.`);
}

const ids = CATEGORY_AUDIT.map(({ destinationId }) => destinationId);
const { data: destinations, error } = await supabase
  .from('destinations')
  .select('id,name,category,source_url')
  .in('id', ids);
if (error) throw error;

const byId = new Map((destinations ?? []).map((destination) => [destination.id, destination]));
const updates = CATEGORY_AUDIT.map((audit) => {
  const destination = byId.get(audit.destinationId);
  if (!destination) throw new Error(`No se encontró el destino auditado ${audit.destinationId}.`);
  const sourceUrl = `${SITE}/es/lugares/${audit.sourceSlug}`;
  if (destination.source_url !== sourceUrl) throw new Error(`La fuente de ${destination.name} no coincide con la ficha auditada de Qué Buen Lugar.`);
  return { audit, destination, sourceUrl };
});
const corrections = updates.filter(({ audit, destination }) => destination.category !== audit.category);

console.log(JSON.stringify({
  mode: apply ? 'apply' : 'dry-run',
  evidenceVerified: updates.length,
  categoryChanges: corrections.map(({ audit, destination }) => ({
    id: destination.id,
    name: destination.name,
    from: destination.category,
    to: audit.category,
  })),
}, null, 2));

if (!apply) process.exit(0);

for (const { audit, destination, sourceUrl } of corrections) {
  const { data, error: updateError } = await supabase
    .from('destinations')
    .update({ category: audit.category, source_checked_at: new Date().toISOString() })
    .eq('id', destination.id)
    .eq('category', destination.category)
    .eq('source_url', sourceUrl)
    .select('id,name,category')
    .single();
  if (updateError) throw updateError;
  if (data.category !== audit.category) throw new Error(`No se pudo verificar la categoría de ${data.name}.`);
}

console.log(`Categorías verificadas y actualizadas: ${corrections.length}.`);
