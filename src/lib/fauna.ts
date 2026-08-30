import type { ImagePickerAsset } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';

export type FaunaSpecies = {
  id: string;
  common_name_es: string;
  common_name_en: string;
  scientific_name: string;
  category: string;
  description: string | null;
  description_en: string | null;
  habitat: string | null;
  habitat_en: string | null;
  vulnerability_status: string | null;
  province: string | null;
  tour_observable: boolean;
  is_endemic: boolean;
  is_national_symbol: boolean;
  image_url: string | null;
  location_protected: boolean;
  latitude: number | null;
  longitude: number | null;
  location_precision: 'province' | 'approximate';
};

export type FaunaSanctuary = {
  id: string;
  name: string;
  province: string;
  location_name: string | null;
  description_es: string;
  description_en: string;
  verified: boolean;
};

export type FaunaPhoto = {
  id: string;
  fauna_id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  likes_count: number;
  created_at: string;
  photographer?: FaunaProfile | null;
};

export type FaunaComment = {
  id: string;
  photo_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author?: FaunaProfile | null;
};

export type FaunaProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

const vulnerabilityLabels: Record<string, string> = {
  'Preocupación Menor (LC)': 'Least Concern (LC)',
  'Casi Amenazada (NT)': 'Near Threatened (NT)',
  'Vulnerable (VU)': 'Vulnerable (VU)',
  Vulnerable: 'Vulnerable',
  'En Peligro (EN)': 'Endangered (EN)',
  'En Peligro Crítico (CR)': 'Critically Endangered (CR)',
};

export function getVulnerabilityLabel(status: string | null, language: 'es' | 'en') {
  if (!status) return language === 'es' ? 'Sin evaluar' : 'Not evaluated';
  return language === 'es' ? status : (vulnerabilityLabels[status] ?? status);
}

export async function getVerifiedSanctuaries(): Promise<FaunaSanctuary[]> {
  const { data, error } = await supabase.from('fauna_sanctuaries').select('*').eq('verified', true).order('name');
  if (error) throw error;
  return (data ?? []) as FaunaSanctuary[];
}

export async function getFaunaHome(userId?: string) {
  const [species, sanctuaries, sightings] = await Promise.all([
    supabase.from('fauna_species_public').select('*').order('common_name_es'),
    supabase.from('fauna_sanctuaries').select('*').eq('verified', true).order('name'),
    userId
      ? supabase.from('user_fauna_sightings').select('fauna_id').eq('user_id', userId).gt('sightings_count', 0)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const error = species.error ?? sanctuaries.error ?? sightings.error;
  if (error) throw error;
  return {
    species: (species.data ?? []) as FaunaSpecies[],
    sanctuaries: (sanctuaries.data ?? []) as FaunaSanctuary[],
    seenSpeciesIds: new Set((sightings.data ?? []).map((row) => row.fauna_id as string)),
  };
}

export async function getFaunaSpecies(id: string) {
  const { data, error } = await supabase.from('fauna_species_public').select('*').eq('id', id).single();
  if (error) throw error;
  return data as FaunaSpecies;
}

export async function addFaunaSpecies(input: { commonName: string; scientificName: string; category: string; description: string; habitat: string; province: string; userId: string; image?: ImagePickerAsset }) {
  let uploadedPath: string | undefined;
  let imageUrl: string | null = null;
  if (input.image) {
    const context = ImageManipulator.manipulate(input.image.uri);
    context.resize({ width: Math.min(input.image.width || 1600, 1600) });
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
    const bytes = await fetch(saved.uri).then((response) => response.arrayBuffer());
    if (bytes.byteLength > 6 * 1024 * 1024) throw new Error('La imagen supera el límite de 6 MB.');
    uploadedPath = `${input.userId}/species/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.jpg`;
    const { error } = await supabase.storage.from('fauna-photos').upload(uploadedPath, bytes, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
    if (error) throw error;
    imageUrl = supabase.storage.from('fauna-photos').getPublicUrl(uploadedPath).data.publicUrl;
  }
  const shared = {
    common_name_es: input.commonName.trim(),
    common_name_en: input.commonName.trim(),
    scientific_name: input.scientificName.trim(),
    category: input.category.trim(),
    description: input.description.trim() || null,
    description_en: input.description.trim() || null,
    habitat: input.habitat.trim() || null,
    habitat_en: input.habitat.trim() || null,
    province: input.province.trim() || null,
    vulnerability_status: 'Sin evaluar',
    tour_observable: false,
    is_endemic: false,
    is_national_symbol: false,
    image_url: imageUrl,
    created_by: input.userId,
    community_submitted: true,
  };
  const { error } = await supabase.from('fauna_species').insert(shared);
  if (error) {
    if (uploadedPath) await supabase.storage.from('fauna-photos').remove([uploadedPath]);
    throw error;
  }
}

export async function getFaunaPhotos(speciesId: string) {
  const { data, error } = await supabase.from('fauna_photos').select('*,photographer:users!fauna_photos_user_id_fkey(id,username,full_name,avatar_url)').eq('fauna_id', speciesId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, photographer: Array.isArray(row.photographer) ? row.photographer[0] ?? null : row.photographer })) as FaunaPhoto[];
}

export async function getFaunaPhotoLikeIds(photoIds: string[], userId: string) {
  if (!photoIds.length) return new Set<string>();
  const { data, error } = await supabase.from('likes').select('target_id').eq('user_id', userId).eq('target_type', 'fauna_photo').in('target_id', photoIds);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.target_id as string));
}

export async function getFaunaPhotoComments(photoId: string) {
  const { data, error } = await supabase
    .from('fauna_comments')
    .select('id,photo_id,user_id,body,created_at,author:users!fauna_comments_user_id_fkey(id,username,full_name,avatar_url)')
    .eq('photo_id', photoId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, author: Array.isArray(row.author) ? row.author[0] ?? null : row.author })) as FaunaComment[];
}

export async function getSightingCount(speciesId: string, userId: string) {
  const { data } = await supabase
    .from('user_fauna_sightings')
    .select('sightings_count')
    .eq('fauna_id', speciesId)
    .eq('user_id', userId)
    .maybeSingle();
  return Number(data?.sightings_count ?? 0);
}

export async function markFaunaSeen(speciesId: string) {
  const { data, error } = await supabase.rpc('mark_fauna_seen', { p_fauna_id: speciesId });
  if (error) throw error;
  return Number(data);
}

export async function toggleFaunaPhotoLike(photoId: string, userId: string, liked: boolean) {
  const query = liked
    ? supabase.from('likes').delete().eq('user_id', userId).eq('target_type', 'fauna_photo').eq('target_id', photoId)
    : supabase.from('likes').insert({ user_id: userId, target_type: 'fauna_photo', target_id: photoId });
  const { error } = await query;
  if (error) throw error;
}

export async function toggleFaunaFollow(userId: string, photographerId: string, followed: boolean) {
  const query = followed
    ? supabase.from('user_follows').delete().eq('follower_id', userId).eq('followed_id', photographerId)
    : supabase.from('user_follows').insert({ follower_id: userId, followed_id: photographerId });
  const { error } = await query;
  if (error) throw error;
}

export async function addFaunaComment(photoId: string, userId: string, body: string) {
  const text = body.trim();
  if (!text) throw new Error('El comentario no puede estar vacío.');
  const { error } = await supabase.from('fauna_comments').insert({ photo_id: photoId, user_id: userId, body: text });
  if (error) throw error;
}

export async function uploadFaunaPhoto(speciesId: string, userId: string, asset: ImagePickerAsset) {
  const context = ImageManipulator.manipulate(asset.uri);
  context.resize({ width: Math.min(asset.width || 1600, 1600) });
  const rendered = await context.renderAsync();
  const sanitized = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
  const bytes = await fetch(sanitized.uri).then((response) => response.arrayBuffer());
  if (bytes.byteLength > 6 * 1024 * 1024) throw new Error('La imagen supera el límite de 6 MB.');

  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('fauna-photos')
    .upload(path, bytes, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage.from('fauna-photos').getPublicUrl(path);
  const { error: rowError } = await supabase.from('fauna_photos').insert({
    fauna_id: speciesId,
    user_id: userId,
    image_url: publicUrl.publicUrl,
  });
  if (rowError) {
    await supabase.storage.from('fauna-photos').remove([path]);
    throw rowError;
  }
  return publicUrl.publicUrl;
}
