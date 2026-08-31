import type { ImagePickerAsset } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';

export type ValidationAuthority = 'ICT' | 'SINAC';
export type CommunityPhoto = { id: string; image_url: string; user_id: string; created_at: string; likes_count: number; liked: boolean };
export type DestinationFreshnessCheck = 'open' | 'price' | 'cards';
export type DestinationFreshness = Record<DestinationFreshnessCheck, { confirmed: number; notConfirmed: number }>;
export type MyDestinationFreshness = Partial<Record<DestinationFreshnessCheck, boolean>>;

const emptyDestinationFreshness = (): DestinationFreshness => ({
  open: { confirmed: 0, notConfirmed: 0 },
  price: { confirmed: 0, notConfirmed: 0 },
  cards: { confirmed: 0, notConfirmed: 0 },
});

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
  description_en: string | null;
  difficulty: string | null;
  price_national_crc: number | null;
  price_foreigner_usd: number | null;
  fee_type: string | null;
  requires_sinac_booking: boolean;
  sinac_booking_url: string | null;
  requires_online_ticket: boolean;
  online_ticket_url: string | null;
  has_high_tides_risk: boolean;
  source_url: string | null;
  source_checked_at: string | null;
  verification_evidence_url: string | null;
  verification_checked_at: string | null;
  validated_by: ValidationAuthority[];
  schedule: string | null;
  closed_day: string | null;
  notes: string | null;
  likes_count: number;
  reviews_count: number;
  average_rating: number;
  liked: boolean;
  photos: string[];
  community_photos: CommunityPhoto[];
  featured_community_photo_url: string | null;
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
  author_role: string | null;
};

export type ExplorePlace = Pick<MapPlace, 'id' | 'name' | 'province' | 'category' | 'description' | 'difficulty' | 'price_national_crc' | 'latitude' | 'longitude' | 'cover_image_url' | 'photos' | 'validated_by' | 'verification_evidence_url' | 'verification_checked_at'> & { community: boolean; contributor_id: string | null; contributor_name: string | null };

function mobileImageUrl(url: string | null | undefined) {
  if (!url?.includes('upload.wikimedia.org/wikipedia/commons/')) return url ?? null;
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    const thumbnailFile = path.match(/\/thumb\/[^/]+\/[^/]+\/([^/]+)\//)?.[1];
    const fileName = thumbnailFile ?? path.split('/').at(-1);
    return fileName ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=1280` : url;
  } catch { return url; }
}

type VerifiedSanctuaryRow = {
  id: string;
  name: string;
  province: string;
  cover_image_url: string | null;
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

function initialDestinationRating(id: string) {
  return 4.1 + (Array.from(id).reduce((total, character) => total + character.charCodeAt(0), 0) % 10) / 10;
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
    .select('id,name,province,cover_image_url,location_name,description_es,description_en,verified')
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
    cover_image_url: row.cover_image_url,
    photos: [],
    validated_by: [],
    verification_evidence_url: null,
    verification_checked_at: null,
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
    cover_image_url: row.cover_image_url,
    image_verified: false,
    image_attribution: null,
    image_license: null,
    image_source_url: null,
    status: 'Activo',
    region: details.region,
    description: row.description_es || row.description_en || null,
    description_en: row.description_en || null,
    difficulty: 'Fácil',
    price_national_crc: null,
    price_foreigner_usd: null,
    fee_type: details.feeType,
    requires_sinac_booking: false,
    sinac_booking_url: null,
    requires_online_ticket: false,
    online_ticket_url: null,
    has_high_tides_risk: false,
    source_url: details.sourceUrl,
    source_checked_at: null,
    validated_by: [],
    verification_evidence_url: null,
    verification_checked_at: null,
    schedule: null,
    closed_day: null,
    notes: row.location_name ? `Ubicación: ${row.location_name}.` : null,
    likes_count: 0,
    reviews_count: 0,
    average_rating: initialDestinationRating(row.id),
    liked: false,
    photos: [],
    community_photos: [],
    featured_community_photo_url: null,
  };
}

export async function getExplorePlaces(): Promise<ExplorePlace[]> {
  const [official, community, sanctuaries] = await Promise.all([
    supabase.from('destinations').select('id,name,province,category,description,difficulty,price_national_crc,latitude,longitude,cover_image_url,validated_by,verification_evidence_url,verification_checked_at,destination_photos(image_url,sort_order)').eq('status', 'Activo'),
    supabase.from('destination_suggestions').select('id,user_id,name,province,category,description,difficulty,price_national_crc,latitude,longitude').eq('status', 'published'),
    supabase.from('fauna_sanctuaries').select('id,name,province,cover_image_url,location_name,description_es,description_en,verified').eq('verified', true).order('name'),
  ]);
  const error = official.error ?? community.error;
  if (error) throw error;
  const contributorIds = [...new Set((community.data ?? []).map((place) => place.user_id))];
  const contributors = contributorIds.length ? await supabase.from('users').select('id,username,full_name').in('id', contributorIds) : { data: [], error: null };
  if (contributors.error) throw contributors.error;
  const contributorNames = new Map((contributors.data ?? []).map((profile) => [profile.id, profile.full_name || profile.username]));
  const officialPlaces = [
    ...(official.data ?? []).map((place) => ({ ...place, cover_image_url: mobileImageUrl(place.cover_image_url ?? place.destination_photos?.sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url), photos: (place.destination_photos ?? []).sort((a, b) => a.sort_order - b.sort_order).map((photo) => mobileImageUrl(photo.image_url)).filter((url): url is string => Boolean(url)), category: classifiedCategory(place), community: false, contributor_id: null, contributor_name: null })),
    ...(community.data ?? []).map((place) => ({ ...place, cover_image_url: null, photos: [], community: true, contributor_id: place.user_id, contributor_name: contributorNames.get(place.user_id) || `Viajero ${place.user_id.slice(0, 6)}`, validated_by: [] as ValidationAuthority[], verification_evidence_url: null, verification_checked_at: null })),
  ]
    .filter((place) => Number.isFinite(Number(place.latitude)) && Number.isFinite(Number(place.longitude)))
    .map((place) => ({ ...place, latitude: Number(place.latitude), longitude: Number(place.longitude), price_national_crc: place.price_national_crc == null ? null : Number(place.price_national_crc) })) as ExplorePlace[];
  const knownIds = new Set(officialPlaces.map((place) => place.id));
  const sanctuaryPlaces = ((sanctuaries.error ? [] : sanctuaries.data ?? []) as VerifiedSanctuaryRow[])
    .map(toExploreSanctuary)
    .filter((place): place is ExplorePlace => place !== null && !knownIds.has(place.id));
  return [...officialPlaces, ...sanctuaryPlaces];
}

export async function publishCommunityPlace(input: Omit<ExplorePlace, 'id' | 'community' | 'contributor_id' | 'contributor_name' | 'cover_image_url' | 'photos' | 'validated_by' | 'verification_evidence_url' | 'verification_checked_at'> & { user_id: string; district?: string }) {
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

export async function getPlacesForTargets(targets: string[], userId?: string): Promise<MapPlace[]> {
  const normalizedTargets = targets.map(normalizedName).filter(Boolean);
  const matches = (place: MapPlace) => {
    const searchable = normalizedName(`${place.name} ${place.category} ${place.description ?? ''} ${place.difficulty ?? ''}`);
    const words = searchable.split(/[^a-z0-9]+/).filter(Boolean);
    return normalizedTargets.some((target) => target.includes(' ')
      ? searchable.includes(target)
      : words.some((word) => word === target || (target.length >= 4 && word.startsWith(target))));
  };
  const places = (await getPlaces('all', '', userId)).filter(matches);
  if (!normalizedTargets.some((target) => target.includes('santuario') || target.includes('sanctuary'))) return places;
  const knownIds = new Set(places.map((place) => place.id));
  const sanctuaryPlaces = (await getVerifiedSanctuaryRows())
    .map(toMapSanctuary)
    .filter((place): place is MapPlace => place !== null && !knownIds.has(place.id));
  return [...places, ...sanctuaryPlaces].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPlaceById(id: string, userId?: string): Promise<MapPlace | null> {
  return (await getPlaces('id', id, userId))[0] ?? null;
}

async function getPlaces(filter: 'province' | 'category' | 'id' | 'all', value: string, userId?: string): Promise<MapPlace[]> {
  let query = supabase
    .from('destinations')
    .select('id,name,province,region,category,description,description_en,difficulty,price_national_crc,price_foreigner_usd,fee_type,requires_sinac_booking,sinac_booking_url,requires_online_ticket,online_ticket_url,has_high_tides_risk,latitude,longitude,cover_image_url,featured_community_photo_id,image_verified,image_attribution,image_license,image_source_url,status,source_url,source_checked_at,validated_by,verification_evidence_url,verification_checked_at,normativas_destinos(horario_ingreso,dia_cierre,observaciones_especiales),destination_photos(image_url,sort_order),destination_user_photos!destination_user_photos_destination_id_fkey(id,image_url,user_id,created_at)');
  if (filter === 'province') query = query.eq('province', value);
  else if (filter === 'id') query = query.eq('id', value);
  else if (value === RESERVE_CATEGORY) query = query.in('id', [...RESERVE_IDS]);
  else if (value === REFUGE_CATEGORY) query = query.in('id', [...REFUGE_IDS]);
  else if (value === 'Pozas / Lagos') query = query.or('category.ilike.%Poza%,category.ilike.%Lago%,category.ilike.%Laguna%');
  else query = query.ilike('category', `%${value}%`);
  const { data, error } = await query.order('name');
  if (error) throw error;
  const ids = (data ?? []).map((place) => place.id);
  if (!ids.length) return [];
  const photoIds = (data ?? []).flatMap((place) => (place.destination_user_photos ?? []).map((photo) => photo.id));
  const [likes, reviews, mine, photoLikes, myPhotoLikes] = await Promise.all([
    supabase.from('likes').select('target_id').eq('target_type', 'destination').in('target_id', ids),
    supabase.from('reviews').select('target_id,rating,photos').eq('target_type', 'destination').in('target_id', ids),
    userId
      ? supabase.from('likes').select('target_id').eq('user_id', userId).eq('target_type', 'destination').in('target_id', ids)
      : Promise.resolve({ data: [], error: null }),
    photoIds.length ? supabase.from('destination_photo_likes').select('photo_id,user_id').in('photo_id', photoIds) : Promise.resolve({ data: [], error: null }),
    userId && photoIds.length ? supabase.from('destination_photo_likes').select('photo_id').eq('user_id', userId).in('photo_id', photoIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const socialError = likes.error ?? reviews.error ?? mine.error ?? photoLikes.error ?? myPhotoLikes.error;
  if (socialError) throw socialError;
  const likedIds = new Set((mine.data ?? []).map((row) => row.target_id));
  const likedPhotoIds = new Set((myPhotoLikes.data ?? []).map((row) => row.photo_id));
  return (data ?? []).map((place) => {
    const rules = Array.isArray(place.normativas_destinos) ? place.normativas_destinos[0] : place.normativas_destinos;
    const hasOfficialSchedule = Boolean(place.verification_evidence_url && place.verification_checked_at && ((place.validated_by ?? []) as ValidationAuthority[]).length);
    const ratings = (reviews.data ?? []).filter((row) => row.target_id === place.id).map((row) => Number(row.rating));
    const communityPhotos = (place.destination_user_photos ?? []).map((photo) => ({ ...photo, likes_count: (photoLikes.data ?? []).filter((like) => like.photo_id === photo.id).length, liked: likedPhotoIds.has(photo.id) })).sort((a, b) => b.likes_count - a.likes_count || a.created_at.localeCompare(b.created_at));
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
      average_rating: ratings.length ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length : initialDestinationRating(place.id),
      liked: likedIds.has(place.id),
      community_photos: communityPhotos,
      cover_image_url: mobileImageUrl(place.cover_image_url),
      featured_community_photo_url: communityPhotos.find((photo) => photo.id === place.featured_community_photo_id)?.image_url ?? null,
      photos: [
        ...(place.destination_photos ?? []).sort((a, b) => a.sort_order - b.sort_order).map((photo) => mobileImageUrl(photo.image_url)).filter((url): url is string => Boolean(url)),
        ...communityPhotos.map((photo) => photo.image_url),
      ],
    };
  }) as MapPlace[];
}

export async function getDestinationReviews(destinationId: string): Promise<DestinationReview[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id,user_id,rating,comment,photos,created_at,users(full_name,username,avatar_url,role)')
    .eq('target_type', 'destination')
    .eq('target_id', destinationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((review) => {
    const author = Array.isArray(review.users) ? review.users[0] : review.users;
    return { ...review, rating: Number(review.rating), author_name: author?.full_name || author?.username || `Viajero ${review.user_id.slice(0, 6)}`, avatar_url: author?.avatar_url ?? null, author_role: author?.role ?? null };
  }) as DestinationReview[];
}

export async function getDestinationFreshness(destinationId: string): Promise<DestinationFreshness> {
  const { data, error } = await supabase.rpc('get_destination_freshness', { p_destination_id: destinationId });
  if (error) throw error;
  const rows = (data ?? []) as { check_type: string; confirmed_count: number; not_confirmed_count: number }[];
  return rows.reduce((summary, row) => {
    const check = row.check_type as DestinationFreshnessCheck;
    if (check in summary) summary[check] = { confirmed: Number(row.confirmed_count), notConfirmed: Number(row.not_confirmed_count) };
    return summary;
  }, emptyDestinationFreshness());
}

export async function getMyDestinationFreshness(destinationId: string, userId: string): Promise<MyDestinationFreshness> {
  const { data, error } = await supabase.from('destination_freshness_votes')
    .select('check_type,confirmed')
    .eq('destination_id', destinationId)
    .eq('user_id', userId);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((vote) => [vote.check_type, vote.confirmed])) as MyDestinationFreshness;
}

export async function setDestinationFreshnessVote(destinationId: string, userId: string, check: DestinationFreshnessCheck, confirmed: boolean) {
  const { error } = await supabase.from('destination_freshness_votes').upsert({
    destination_id: destinationId,
    user_id: userId,
    check_type: check,
    confirmed,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'destination_id,user_id,check_type' });
  if (error) throw error;
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
  const { data, error } = await supabase.from('destination_user_photos').insert({ destination_id: destinationId, user_id: userId, image_url: imageUrl }).select('id,image_url,user_id,created_at').single();
  if (error) {
    await supabase.storage.from('destination-user-photos').remove([path]);
    throw error;
  }
  return { ...data, likes_count: 0, liked: false } as CommunityPhoto;
}

export async function toggleDestinationPhotoLike(photoId: string, userId: string, liked: boolean) {
  const { error } = liked
    ? await supabase.from('destination_photo_likes').delete().eq('photo_id', photoId).eq('user_id', userId)
    : await supabase.from('destination_photo_likes').insert({ photo_id: photoId, user_id: userId });
  if (error) throw error;
}
