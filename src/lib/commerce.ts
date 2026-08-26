import type { ImagePickerAsset } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';

export const COMMERCE_CATEGORIES = [
  { id: 'gastronomy', es: 'Gastronomía', en: 'Food', values: ['restaurante', 'comida_rapida', 'cafeteria', 'soda', 'plaza_comidas'] },
  { id: 'lodging', es: 'Hospedajes', en: 'Lodging', values: ['hospedaje', 'hotel', 'hostel', 'cabina'] },
  { id: 'transport', es: 'Transportes & Rent a Car', en: 'Transport & Car Rental', values: ['transporte', 'rent_a_car', 'alquiler_vehiculos'] },
  { id: 'guides', es: 'Guías Turísticos', en: 'Tour Guides', values: ['guia_turistico', 'guias_turisticos'] },
  { id: 'tours', es: 'Tours & Actividades', en: 'Tours & Activities', values: ['tour', 'tours_actividades', 'actividad_turistica'] },
] as const;

export type CommerceCategoryId = typeof COMMERCE_CATEGORIES[number]['id'];

export type CommercialService = {
  id: string;
  owner_id: string | null;
  main_category: string;
  subcategory: string | null;
  title: string;
  description: string | null;
  price_range: string | null;
  phone_whatsapp: string | null;
  external_url: string | null;
  accepts_sinpe: boolean;
  accepts_cards: boolean;
  pet_friendly: boolean;
  has_parking: boolean;
  is_verified_ict: boolean;
  cst_stars: number;
  is_sponsored: boolean;
  sponsored_tier: number;
  photos: string[] | null;
  avg_rating: number;
  total_reviews: number;
};

export type AccountDashboard = {
  profile: { role: string; is_premium: boolean; full_name: string | null } | null;
  savedCount: number;
  photoCount: number;
  sightingCount: number;
  services: CommercialService[];
  metrics: Record<string, { impressions: number; whatsappClicks: number }>;
  subscriptions: { plan: string; status: string; current_period_end: string | null }[];
};

export async function getCommerceDirectory(categoryId: CommerceCategoryId) {
  const category = COMMERCE_CATEGORIES.find((item) => item.id === categoryId) ?? COMMERCE_CATEGORIES[0];
  const { data, error } = await supabase
    .from('vw_ranked_commercial_services')
    .select('id,owner_id,main_category,subcategory,title,description,price_range,phone_whatsapp,external_url,accepts_sinpe,accepts_cards,pet_friendly,has_parking,is_verified_ict,cst_stars,is_sponsored,sponsored_tier,photos,avg_rating,total_reviews')
    .in('main_category', [...category.values])
    .order('avg_rating', { ascending: false })
    .order('total_reviews', { ascending: false })
    .order('title', { ascending: true })
    .limit(40);
  if (error) throw error;
  return (data ?? []).map((item) => ({ ...item, avg_rating: Number(item.avg_rating), total_reviews: Number(item.total_reviews) })) as CommercialService[];
}

export async function trackBusinessEvents(serviceIds: string[], eventType: 'impression' | 'whatsapp_click') {
  if (!serviceIds.length) return;
  const { error } = await supabase.from('business_events').insert(serviceIds.map((service_id) => ({ service_id, event_type: eventType })));
  if (error) throw error;
}

export async function getAccountDashboard(userId: string): Promise<AccountDashboard> {
  const [profile, saved, photos, sightings, services, subscriptions] = await Promise.all([
    supabase.from('users').select('role,is_premium,full_name').eq('id', userId).maybeSingle(),
    supabase.from('likes').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('target_type', 'destination'),
    supabase.from('fauna_photos').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('user_fauna_sightings').select('sightings_count').eq('user_id', userId),
    supabase.from('vw_ranked_commercial_services').select('*').eq('owner_id', userId).order('title'),
    supabase.from('subscriptions').select('plan,status,current_period_end').eq('user_id', userId).order('created_at', { ascending: false }),
  ]);
  const error = profile.error ?? saved.error ?? photos.error ?? sightings.error ?? services.error ?? subscriptions.error;
  if (error) throw error;
  const ownedServices = (services.data ?? []) as CommercialService[];
  const metricsResult = ownedServices.length
    ? await supabase.from('business_events').select('service_id,event_type').in('service_id', ownedServices.map((service) => service.id))
    : { data: [], error: null };
  if (metricsResult.error) throw metricsResult.error;
  const metrics: AccountDashboard['metrics'] = {};
  for (const event of metricsResult.data ?? []) {
    const current = metrics[event.service_id] ?? { impressions: 0, whatsappClicks: 0 };
    if (event.event_type === 'impression') current.impressions += 1;
    if (event.event_type === 'whatsapp_click') current.whatsappClicks += 1;
    metrics[event.service_id] = current;
  }
  return {
    profile: profile.data,
    savedCount: saved.count ?? 0,
    photoCount: photos.count ?? 0,
    sightingCount: (sightings.data ?? []).reduce((total, row) => total + Number(row.sightings_count ?? 0), 0),
    services: ownedServices,
    metrics,
    subscriptions: subscriptions.data ?? [],
  };
}

export async function uploadBusinessPhoto(service: CommercialService, userId: string, asset: ImagePickerAsset) {
  const context = ImageManipulator.manipulate(asset.uri);
  context.resize({ width: Math.min(asset.width || 1600, 1600), height: null });
  const rendered = await context.renderAsync();
  const image = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
  const bytes = await fetch(image.uri).then((response) => response.arrayBuffer());
  if (bytes.byteLength > 6 * 1024 * 1024) throw new Error('La imagen supera el límite de 6 MB.');
  const path = `${userId}/${service.id}/${Date.now()}.jpg`;
  const upload = await supabase.storage.from('business-photos').upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (upload.error) throw upload.error;
  const publicUrl = supabase.storage.from('business-photos').getPublicUrl(path).data.publicUrl;
  const update = await supabase.from('commercial_services').update({ photos: [...(service.photos ?? []), publicUrl] }).eq('id', service.id);
  if (update.error) {
    await supabase.storage.from('business-photos').remove([path]);
    throw update.error;
  }
  return publicUrl;
}

export function getBillingUrl(plan: 'no_ads' | 'business' | 'sponsored', userId?: string) {
  const base = process.env.EXPO_PUBLIC_BILLING_URL;
  if (!base) return null;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}plan=${plan}${userId ? `&user_id=${encodeURIComponent(userId)}` : ''}`;
}
