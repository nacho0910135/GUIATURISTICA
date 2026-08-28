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
};

export type FaunaComment = {
  id: string;
  photo_id: string;
  user_id: string;
  body: string;
  created_at: string;
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

export async function getFaunaPhotos(speciesId: string) {
  const { data, error } = await supabase.from('fauna_photos').select('*').eq('fauna_id', speciesId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FaunaPhoto[];
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
  const { error } = await supabase.from('fauna_comments').insert({ photo_id: photoId, user_id: userId, body: body.trim() });
  if (error) throw error;
}

export async function uploadFaunaPhoto(speciesId: string, userId: string, asset: ImagePickerAsset) {
  const context = ImageManipulator.manipulate(asset.uri);
  context.resize({ width: Math.min(asset.width || 1600, 1600), height: null });
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
