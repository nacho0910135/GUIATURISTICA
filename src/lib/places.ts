import type { ImagePickerAsset } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';

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

export type ExplorePlace = Pick<MapPlace, 'id' | 'name' | 'province' | 'category' | 'description' | 'difficulty' | 'price_national_crc' | 'latitude' | 'longitude'> & { community: boolean };

export async function getExplorePlaces(): Promise<ExplorePlace[]> {
  const [official, community] = await Promise.all([
    supabase.from('destinations').select('id,name,province,category,description,difficulty,price_national_crc,latitude,longitude').eq('status', 'Activo'),
    supabase.from('destination_suggestions').select('id,name,province,category,description,difficulty,price_national_crc,latitude,longitude').eq('status', 'published'),
  ]);
  const error = official.error ?? community.error;
  if (error) throw error;
  return [...(official.data ?? []).map((place) => ({ ...place, community: false })), ...(community.data ?? []).map((place) => ({ ...place, community: true }))]
    .filter((place) => Number.isFinite(Number(place.latitude)) && Number.isFinite(Number(place.longitude)))
    .map((place) => ({ ...place, latitude: Number(place.latitude), longitude: Number(place.longitude), price_national_crc: place.price_national_crc == null ? null : Number(place.price_national_crc) })) as ExplorePlace[];
}

export async function publishCommunityPlace(input: Omit<ExplorePlace, 'id' | 'community'> & { user_id: string; district?: string }) {
  const { error } = await supabase.from('destination_suggestions').insert({ ...input, status: 'published' });
  if (error) throw error;
}

export async function getPlacesForProvince(province: string, userId?: string): Promise<MapPlace[]> {
  return getPlaces('province', province, userId);
}

export async function getPlacesForCategory(category: string, userId?: string): Promise<MapPlace[]> {
  return getPlaces('category', category, userId);
}

async function getPlaces(filter: 'province' | 'category', value: string, userId?: string): Promise<MapPlace[]> {
  let query = supabase
    .from('destinations')
    .select('id,name,province,region,category,description,difficulty,price_national_crc,price_foreigner_usd,fee_type,requires_sinac_booking,sinac_booking_url,has_high_tides_risk,latitude,longitude,cover_image_url,image_verified,image_attribution,image_license,image_source_url,status,source_url,source_checked_at,normativas_destinos(horario_ingreso,dia_cierre,observaciones_especiales),destination_photos(image_url,sort_order),destination_user_photos(image_url,created_at)');
  if (filter === 'province') query = query.eq('province', value);
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
    const ratings = (reviews.data ?? []).filter((row) => row.target_id === place.id).map((row) => Number(row.rating));
    const reviewPhotos = (reviews.data ?? []).filter((review) => review.target_id === place.id).flatMap((review) => review.photos ?? []);
    const communityPhotos = [
      ...(place.destination_user_photos ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at)).map((photo) => photo.image_url),
      ...reviewPhotos,
    ];
    return {
      ...place,
      latitude: Number(place.latitude),
      longitude: Number(place.longitude),
      price_national_crc: place.price_national_crc == null ? null : Number(place.price_national_crc),
      price_foreigner_usd: place.price_foreigner_usd == null ? null : Number(place.price_foreigner_usd),
      schedule: rules?.horario_ingreso ?? null,
      closed_day: rules?.dia_cierre ?? null,
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
    context.resize({ width: Math.min(photo.width || 1600, 1600), height: null });
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
  context.resize({ width: Math.min(photo.width || 1600, 1600), height: null });
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
