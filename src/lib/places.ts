import type { ImagePickerAsset } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';

export type ValidationAuthority = 'ICT' | 'SINAC';

export type MapPlace = {
  id: string;
  name: string;
  province: string;
  category: string;
  latitude: number;
  longitude: number;
  cover_image_url: string | null;
  image_verified: boolean;
  image_attribution: string | null;
  image_license: string | null;
  image_source_url: string | null;
  status: string;
  region: string | null;
  description: string | null;
  difficulty: string | null;
  price_national_crc: number | null;
  price_foreigner_usd: number | null;
  fee_type: string | null;
  requires_sinac_booking: boolean;
  sinac_booking_url: string | null;
  has_high_tides_risk: boolean;
  source_url: string | null;
  source_checked_at: string | null;
  validated_by: ValidationAuthority[];
  schedule: string | null;
  closed_day: string | null;
  notes: string | null;
  likes_count: number;
  reviews_count: number;
  average_rating: number;
  liked: boolean;
  photos: string[];
  community_photos: string[];
};

export type DestinationReview = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  photos: string[] | null;
  created_at: string;
  author_name: string;
  avatar_url: string | null;
};

export type ExplorePlace = Pick<MapPlace, 'id' | 'name' | 'province' | 'category' | 'description' | 'difficulty' | 'price_national_crc' | 'latitude' | 'longitude' | 'validated_by'> & { community: boolean; contributor_id: string | null; contributor_name: string | null };

type VerifiedSanctuaryRow = {
  id: string;
  name: string;
  province: string;
  location_name: string | null;
  description_es: string;
  description_en: string;
  verified: boolean;
};

type SanctuaryVisitDetails = {
  aliases: string[];
  latitude: number;
  longitude: number;
  region: string;
  sourceUrl: string;
  feeType: string;
};

const SANCTUARY_CATEGORY = 'Santuarios de animales';
const RESERVE_CATEGORY = 'Reservas naturales y forestales';
const REFUGE_CATEGORY = 'Refugios de vida silvestre';
const RESERVE_IDS = new Set(['8104fe85-a950-405b-b901-3706932f25cb', 'f1f8bc1a-b426-41b5-81ad-c8f3475e1eb4', '8ceceb72-6890-4fac-9f02-d5fe7aad5211', 'c4449fdb-0f4c-49b4-9389-504edecacafc']);
const REFUGE_IDS = new Set(['5c3003af-a0be-409d-aeb4-8d3a700cc352', '62300b89-072f-429e-bbe9-401f147933cf', 'da01f59f-0045-4aa2-b4ea-79ef67f4b8fd', 'd599ee5d-2dbe-4886-9cd9-f3dbb48271c4', '7cc91f6c-81a4-475b-8f76-640d84bbe216', '4d287a05-ab6a-4172-930f-1ae7280a3a6d']);

function classifiedCategory(place: { category: string; id: string }) {
  const protectedCategory = RESERVE_IDS.has(place.id) ? RESERVE_CATEGORY : REFUGE_IDS.has(place.id) ? REFUGE_CATEGORY : null;
  return protectedCategory && !place.category.includes(protectedCategory) ? `${protectedCategory} / ${place.category}` : place.category;
}
const VERIFIED_SANCTUARY_LOCATIONS: Record<string, SanctuaryVisitDetails> = {
  'af1a4249-acd9-4e0f-9772-f08eda57a711': {
    aliases: ['Rescate Wildlife Rescue Center', 'ZooAve'],
    latitude: 10.01317,
    longitude: -84.27396,
    region: 'Valle Central',
    sourceUrl: 'https://rescatewildlife.org/directions/',
    feeType: 'Consultar',
  },
  '6d5cf5b0-e476-48a9-a7cf-3eef14da8ea4': {
    aliases: ['Jaguar Rescue Center'],
    latitude: 9.642069,
    longitude: -82.723528,
    region: 'Caribe',
    sourceUrl: 'https://www.jaguarrescue.foundation/en-us/HowtoGetHere',
    feeType: 'Consultar',
  },
  '77a523cc-8d91-402a-99d3-0c3222792363': {
    aliases: ['Toucan Rescue Ranch'],
    latitude: 10.025806,
    longitude: -84.035139,
    region: 'Valle Central',
    sourceUrl: 'https://toucanrescueranch.org/es/faq/',
    feeType: 'De Pago',
  },
  '27d97872-625e-43d8-9215-572b59da47be': {
    aliases: ['Ponderosa Adventure Park'],
    latitude: 10.54978,
    longitude: -85.4,
    region: 'Guanacaste',
    sourceUrl: 'https://ponderosaadventurepark.com/',
    feeType: 'De Pago',
  },
};

function normalizedName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function getSanctuaryVisitDetails(row: VerifiedSanctuaryRow) {
  return VERIFIED_SANCTUARY_LOCATIONS[row.id] ?? Object.values(VERIFIED_SANCTUARY_LOCATIONS).find((details) => details.aliases.some((alias) => normalizedName(alias) === normalizedName(row.name)));
}

function getSanctuaryDisplayName(row: VerifiedSanctuaryRow) {
  return normalizedName(row.name) === 'rescate wildlife rescue center' ? 'Rescate Wildlife Rescue Center (ZooAve)' : row.name;
}

async function getVerifiedSanctuaryRows(): Promise<VerifiedSanctuaryRow[]> {
  const { data, error } = await supabase
    .from('fauna_sanctuaries')
    .select('id,name,province,location_name,description_es,description_en,verified')
    .eq('verified', true)
    .order('name');
  if (error) throw error;
  return (data ?? []) as VerifiedSanctuaryRow[];
}

function toExploreSanctuary(row: VerifiedSanctuaryRow): ExplorePlace | null {
  const details = getSanctuaryVisitDetails(row);
  if (!details) return null;
  return {
    id: row.id,
    name: getSanctuaryDisplayName(row),
    province: row.province,
    category: SANCTUARY_CATEGORY,
    description: row.description_es || row.description_en || null,
    difficulty: 'Fácil',
    price_national_crc: null,
    latitude: details.latitude,
    longitude: details.longitude,
    validated_by: ['SINAC'],
    community: false,
    contributor_id: null,
    contributor_name: null,
  };
}

function toMapSanctuary(row: VerifiedSanctuaryRow): MapPlace | null {
  const details = getSanctuaryVisitDetails(row);
  if (!details) return null;
  return {
    id: row.id,
    name: getSanctuaryDisplayName(row),
    province: row.province,
    category: SANCTUARY_CATEGORY,
    latitude: details.latitude,
    longitude: details.longitude,
    cover_image_url: null,
    image_verified: false,
    image_attribution: null,
    image_license: null,
    image_source_url: null,
    status: 'Activo',
    region: details.region,
    description: row.description_es || row.description_en || null,
    difficulty: 'Fácil',
    price_national_crc: null,
    price_foreigner_usd: null,
    fee_type: details.feeType,
    requires_sinac_booking: false,
    sinac_booking_url: null,
    has_high_tides_risk: false,
    source_url: details.sourceUrl,
    source_checked_at: null,
    validated_by: ['SINAC'],
    schedule: null,
    closed_day: null,
    notes: row.location_name ? `Ubicación: ${row.location_name}.` : null,
    likes_count: 0,
    reviews_count: 0,
    average_rating: 0,
    liked: false,
    photos: [],
    community_photos: [],
  };
}

export async function getExplorePlaces(): Promise<ExplorePlace[]> {
  const [official, community, sanctuaries] = await Promise.all([
    supabase.from('destinations').select('id,name,province,category,description,difficulty,price_national_crc,latitude,longitude,validated_by').eq('status', 'Activo'),
    supabase.from('destination_suggestions').select('id,user_id,name,province,category,description,difficulty,price_national_crc,latitude,longitude').eq('status', 'published'),
    supabase.from('fauna_sanctuaries').select('id,name,province,location_name,description_es,description_en,verified').eq('verified', true).order('name'),
  ]);
  const error = official.error ?? community.error ?? sanctuaries.error;
  if (error) throw error;
  const contributorIds = [...new Set((community.data ?? []).map((place) => place.user_id))];
  const contributors = contributorIds.length ? await supabase.from('users').select('id,username,full_name').in('id', contributorIds) : { data: [], error: null };
  if (contributors.error) throw contributors.error;
  const contributorNames = new Map((contributors.data ?? []).map((profile) => [profile.id, profile.full_name || profile.username]));
  const officialPlaces = [
    ...(official.data ?? []).map((place) => ({ ...place, category: classifiedCategory(place), community: false, contributor_id: null, contributor_name: null })),
    ...(community.data ?? []).map((place) => ({ ...place, community: true, contributor_id: place.user_id, contributor_name: contributorNames.get(place.user_id) || `Viajero ${place.user_id.slice(0, 6)}`, validated_by: [] as ValidationAuthority[] })),
  ]
    .filter((place) => Number.isFinite(Number(place.latitude)) && Number.isFinite(Number(place.longitude)))
    .map((place) => ({ ...place, latitude: Number(place.latitude), longitude: Number(place.longitude), price_national_crc: place.price_national_crc == null ? null : Number(place.price_national_crc) })) as ExplorePlace[];
  const knownIds = new Set(officialPlaces.map((place) => place.id));
  const sanctuaryPlaces = ((sanctuaries.data ?? []) as VerifiedSanctuaryRow[])
    .map(toExploreSanctuary)
    .filter((place): place is ExplorePlace => place !== null && !knownIds.has(place.id));
  return [...officialPlaces, ...sanctuaryPlaces];
}

export async function publishCommunityPlace(input: Omit<ExplorePlace, 'id' | 'community' | 'contributor_id' | 'contributor_name' | 'validated_by'> & { user_id: string; district?: string }) {
  const { error } = await supabase.from('destination_suggestions').insert({ ...input, status: 'published' });
  if (error) throw error;
}

export async function getPlacesForProvince(province: string, userId?: string): Promise<MapPlace[]> {
  return getPlaces('province', province, userId);
}

export async function getPlacesForCategory(category: string, userId?: string): Promise<MapPlace[]> {
  const places = await getPlaces('category', category, userId);
  if (normalizedName(category) !== normalizedName(SANCTUARY_CATEGORY)) return places;
  const knownIds = new Set(places.map((place) => place.id));
  const sanctuaryPlaces = (await getVerifiedSanctuaryRows())
    .map(toMapSanctuary)
    .filter((place): place is MapPlace => place !== null && !knownIds.has(place.id));
  return [...places, ...sanctuaryPlaces].sort((a, b) => a.name.localeCompare(b.name));
}

async function getPlaces(filter: 'province' | 'category', value: string, userId?: string): Promise<MapPlace[]> {
  let query = supabase
    .from('destinations')
    .select('id,name,province,region,category,description,difficulty,price_national_crc,price_foreigner_usd,fee_type,requires_sinac_booking,sinac_booking_url,has_high_tides_risk,latitude,longitude,cover_image_url,image_verified,image_attribution,image_license,image_source_url,status,source_url,source_checked_at,validated_by,normativas_destinos(horario_ingreso,dia_cierre,observaciones_especiales),destination_photos(image_url,sort_order),destination_user_photos(image_url,created_at)');
  if (filter === 'province') query = query.eq('province', value);
  else if (value === RESERVE_CATEGORY) query = query.in('id', [...RESERVE_IDS]);
  else if (value === REFUGE_CATEGORY) query = query.in('id', [...REFUGE_IDS]);
  else if (value === 'Pozas / Lagos') query = query.or('category.ilike.%Poza%,category.ilike.%Lago%,category.ilike.%Laguna%');
  else query = query.ilike('category', `%${value}%`);
  const { data, error } = await query.order('name');
  if (error) throw error;
  const ids = (data ?? []).map((place) => place.id);
  if (!ids.length) return [];
  const [likes, reviews, mine] = await Promise.all([
    supabase.from('likes').select('target_id').eq('target_type', 'destination').in('target_id', ids),
    supabase.from('reviews').select('target_id,rating,photos').eq('target_type', 'destination').in('target_id', ids),
    userId
      ? supabase.from('likes').select('target_id').eq('user_id', userId).eq('target_type', 'destination').in('target_id', ids)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const socialError = likes.error ?? reviews.error ?? mine.error;
  if (socialError) throw socialError;
  const likedIds = new Set((mine.data ?? []).map((row) => row.target_id));
  return (data ?? []).map((place) => {
    const rules = Array.isArray(place.normativas_destinos) ? place.normativas_destinos[0] : place.normativas_destinos;
    const hasOfficialSchedule = ((place.validated_by ?? []) as ValidationAuthority[]).some((authority) => authority === 'SINAC' || authority === 'ICT');
    const ratings = (reviews.data ?? []).filter((row) => row.target_id === place.id).map((row) => Number(row.rating));
    const reviewPhotos = (reviews.data ?? []).filter((review) => review.target_id === place.id).flatMap((review) => review.photos ?? []);
    const communityPhotos = [
      ...(place.destination_user_photos ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at)).map((photo) => photo.image_url),
      ...reviewPhotos,
    ];
    return {
      ...place,
      category: classifiedCategory(place),
      latitude: Number(place.latitude),
      longitude: Number(place.longitude),
      price_national_crc: place.price_national_crc == null ? null : Number(place.price_national_crc),
      price_foreigner_usd: place.price_foreigner_usd == null ? null : Number(place.price_foreigner_usd),
      schedule: hasOfficialSchedule && rules?.horario_ingreso ? rules.horario_ingreso : 'Todo el día',
      closed_day: hasOfficialSchedule ? rules?.dia_cierre ?? null : null,
      notes: rules?.observaciones_especiales ?? null,
      likes_count: (likes.data ?? []).filter((row) => row.target_id === place.id).length,
      reviews_count: ratings.length,
      average_rating: ratings.length ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length : 0,
      liked: likedIds.has(place.id),
      community_photos: communityPhotos,
      photos: [
        ...(place.destination_photos ?? []).sort((a, b) => a.sort_order - b.sort_order).map((photo) => photo.image_url),
        ...communityPhotos,
      ],
    };
  }) as MapPlace[];
}

export async function getDestinationReviews(destinationId: string): Promise<DestinationReview[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id,user_id,rating,comment,photos,created_at,users(full_name,username,avatar_url)')
    .eq('target_type', 'destination')
    .eq('target_id', destinationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((review) => {
    const author = Array.isArray(review.users) ? review.users[0] : review.users;
    return { ...review, rating: Number(review.rating), author_name: author?.full_name || author?.username || `Viajero ${review.user_id.slice(0, 6)}`, avatar_url: author?.avatar_url ?? null };
  }) as DestinationReview[];
}

export async function toggleDestinationLike(destinationId: string, userId: string, liked: boolean) {
  const query = liked
    ? supabase.from('likes').delete().eq('user_id', userId).eq('target_type', 'destination').eq('target_id', destinationId)
    : supabase.from('likes').insert({ user_id: userId, target_type: 'destination', target_id: destinationId });
  const { error } = await query;
  if (error) throw error;
}

export async function addDestinationReview(destinationId: string, userId: string, rating: number, comment: string, photo?: ImagePickerAsset) {
  let photoUrl: string | undefined;
  let photoPath: string | undefined;
  if (photo) {
    const context = ImageManipulator.manipulate(photo.uri);
    context.resize({ width: Math.min(photo.width || 1600, 1600) });
    const rendered = await context.renderAsync();
    const sanitized = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
    const bytes = await fetch(sanitized.uri).then((response) => response.arrayBuffer());
    if (bytes.byteLength > 6 * 1024 * 1024) throw new Error('La imagen supera el límite de 6 MB.');
    photoPath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.jpg`;
    const upload = await supabase.storage.from('review-photos').upload(photoPath, bytes, { contentType: 'image/jpeg', cacheControl: '3600' });
    if (upload.error) throw upload.error;
    photoUrl = supabase.storage.from('review-photos').getPublicUrl(photoPath).data.publicUrl;
  }
  const { error } = await supabase.from('reviews').insert({ target_type: 'destination', target_id: destinationId, user_id: userId, rating, comment: comment.trim() || null, photos: photoUrl ? [photoUrl] : [] });
  if (error) {
    if (photoPath) await supabase.storage.from('review-photos').remove([photoPath]);
    throw error;
  }
}

export async function addDestinationPhoto(destinationId: string, userId: string, photo: ImagePickerAsset) {
  const context = ImageManipulator.manipulate(photo.uri);
  context.resize({ width: Math.min(photo.width || 1600, 1600) });
  const rendered = await context.renderAsync();
  const sanitized = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
  const bytes = await fetch(sanitized.uri).then((response) => response.arrayBuffer());
  if (bytes.byteLength > 6 * 1024 * 1024) throw new Error('La imagen supera el límite de 6 MB.');
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.jpg`;
  const upload = await supabase.storage.from('destination-user-photos').upload(path, bytes, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
  if (upload.error) throw upload.error;
  const imageUrl = supabase.storage.from('destination-user-photos').getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from('destination_user_photos').insert({ destination_id: destinationId, user_id: userId, image_url: imageUrl });
  if (error) {
    await supabase.storage.from('destination-user-photos').remove([path]);
    throw error;
  }
  return imageUrl;
}
