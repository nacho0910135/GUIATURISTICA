import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

import { supabase } from '@/lib/supabase';
import { getAppOptions } from '@/lib/app-options';
import { getOfflineCommerceServices } from '@/lib/offline-trip-pack';

export type AssistanceCategoryId = string;

export type CommerceCategoryId = string;
export type CommerceRegion = {
  id: string;
  name_es: string;
  name_en: string;
  province: string | null;
  latitude: number;
  longitude: number;
  radius_km: number;
};


export type Coordinates = { latitude: number; longitude: number };
export type BusinessEventType = 'impression' | 'whatsapp_click' | 'call' | 'directions' | 'save' | 'reservation' | 'coupon_redeemed';
export type BusinessAttribution = Partial<Record<'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_term' | 'utm_content' | 'qr', string>>;

const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

export function normalizeBusinessAttribution(values: Record<string, unknown>): BusinessAttribution {
  const attribution: BusinessAttribution = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = values[key];
    if (typeof value === 'string' && value.trim()) attribution[key] = value.trim().slice(0, 120);
  }
  const qr = values.qr ?? values.qr_code;
  if (typeof qr === 'string' && qr.trim()) attribution.qr = qr.trim().slice(0, 120);
  return attribution;
}

export type CommerceService = {
  id: string;
  category: CommerceCategoryId;
  subcategories: string[];
  region_id: string | null;
  is_claimed: boolean;
  source: 'ICT' | 'SINAC' | 'community' | 'owner_registered';
  main_category: string;
  subcategory: string;
  title: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  external_url: string | null;
  menu_url: string | null;
  booking_url: string | null;
  cover_image_url: string | null;
  photos: string[];
  price_range: string | null;
  opening_hours: string | null;
  parking: string | null;
  has_parking: boolean;
  payment_methods: string[];
  accessibility: string | null;
  languages: string[];
  experience_type: string | null;
  certifications: string[];
  latitude: number | null;
  longitude: number | null;
  distance_km: number | null;
  owner_id: string | null;
  is_sponsored: boolean;
  claim_status: 'unclaimed' | 'pending' | 'claimed';
  business_verified_at: string | null;
  business_verification_evidence_url: string | null;
  business_updated_at: string | null;
  avg_rating: number;
  total_reviews: number;
};

export type AssistanceService = CommerceService;
export type CommerceDirectory = { featured: CommerceService[]; organic: CommerceService[] };
export type CinemaMovie = {
  id: string;
  title_es: string;
  title_en: string | null;
  poster_url: string;
  official_url: string;
};
export type ClaimableBusiness = Pick<CommerceService, 'id' | 'title' | 'is_claimed' | 'owner_id' | 'claim_status'>;

type ServiceRow = Omit<CommerceService, 'phone' | 'latitude' | 'longitude' | 'distance_km' | 'photos' | 'payment_methods' | 'languages' | 'certifications'> & {
  phone_whatsapp: string | null;
  photos: string[] | null;
  payment_methods: string[] | null;
  languages: string[] | null;
  certifications: string[] | null;
  location: { coordinates?: [number, number] } | null;
};

const SERVICE_FIELDS = 'id,category,subcategories,region_id,is_claimed,source,main_category,subcategory,title,description,phone_whatsapp,whatsapp,external_url,menu_url,booking_url,cover_image_url,photos,price_range,opening_hours,parking,has_parking,payment_methods,accessibility,languages,experience_type,certifications,location,owner_id,is_sponsored,claim_status,business_verified_at,business_verification_evidence_url,business_updated_at';
const RANKED_SERVICE_FIELDS = `${SERVICE_FIELDS},avg_rating,total_reviews`;

export async function getCommerceRegions() {
  const { data, error } = await supabase
    .from('commerce_regions')
    .select('id,name_es,name_en,province,latitude,longitude,radius_km')
    .eq('active', true)
    .order('name_es');
  if (error) throw error;
  return (data ?? []) as CommerceRegion[];
}

export async function getCommerceDirectory(categoryId: CommerceCategoryId, origin: Coordinates, subcategory?: string, region?: CommerceRegion): Promise<CommerceDirectory> {
  const rows: ServiceRow[] = [];
  try {
    for (let from = 0; ; from += 1000) {
      let request = supabase.from('vw_ranked_commercial_services').select(RANKED_SERVICE_FIELDS).eq('category', categoryId);
      if (subcategory) request = request.contains('subcategories', [subcategory]);
      const { data, error } = await request.range(from, from + 999);
      if (error) throw error;
      rows.push(...(data as ServiceRow[] ?? []));
      if ((data?.length ?? 0) < 1000) break;
    }
  } catch (error) {
    const cached = await getOfflineCommerceServices(categoryId) as ServiceRow[];
    if (!cached.length) throw error;
    rows.push(...cached.filter((service) => !subcategory || service.subcategories?.includes(subcategory)));
  }

  const services = rows
    .flatMap((service) => {
      const [longitude, latitude] = service.location?.coordinates ?? [];
      const hasLocation = typeof latitude === 'number' && typeof longitude === 'number';
      if (region && (!hasLocation || distanceKm({ latitude: region.latitude, longitude: region.longitude }, { latitude, longitude }) > region.radius_km)) return [];
      const photos = service.photos ?? [];
      return [{
        ...service,
        phone: service.phone_whatsapp,
        whatsapp: service.whatsapp ?? service.phone_whatsapp,
        photos,
        payment_methods: service.payment_methods ?? [],
        languages: service.languages ?? [],
        certifications: service.certifications ?? [],
        latitude: hasLocation ? latitude : null,
        longitude: hasLocation ? longitude : null,
        distance_km: hasLocation ? distanceKm(origin, { latitude, longitude }) : null,
        avg_rating: Number(service.avg_rating ?? 0),
        total_reviews: Number(service.total_reviews ?? 0),
      }];
    });
  const byRelevance = (a: CommerceService, b: CommerceService) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity) || b.avg_rating - a.avg_rating || b.total_reviews - a.total_reviews || a.title.localeCompare(b.title);
  return {
    featured: services.filter((service) => service.is_sponsored).sort(byRelevance),
    organic: services.filter((service) => !service.is_sponsored).sort(byRelevance),
  };
}

export async function getCinemaMovies(): Promise<CinemaMovie[]> {
  const { data, error } = await supabase
    .from('cinema_movies')
    .select('id,title_es,title_en,poster_url,official_url')
    .eq('active', true)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as CinemaMovie[];
}

export async function getClaimableBusiness(serviceId: string): Promise<ClaimableBusiness | null> {
  const { data, error } = await supabase.from('commercial_services').select('id,title,is_claimed,owner_id,claim_status').eq('id', serviceId).maybeSingle();
  if (error) throw error;
  return data as ClaimableBusiness | null;
}

export async function getAssistanceDirectory(categoryId: AssistanceCategoryId, origin: Coordinates) {
  const category = (await getAppOptions('assistance_category')).find((item) => item.id === categoryId);
  if (!category?.allowed_targets?.length) return [];
  const { data, error } = await supabase
    .from('commercial_services')
    .select(SERVICE_FIELDS)
    .eq('category', 'emergency')
    .in('main_category', category.allowed_targets)
    .limit(1000);
  if (error) throw error;
  return ((data ?? []) as ServiceRow[]).flatMap((service) => {
    const [longitude, latitude] = service.location?.coordinates ?? [];
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return [];
    return [{ ...service, phone: service.phone_whatsapp, whatsapp: service.whatsapp ?? service.phone_whatsapp, photos: service.photos ?? [], payment_methods: service.payment_methods ?? [], languages: service.languages ?? [], certifications: service.certifications ?? [], latitude, longitude, distance_km: distanceKm(origin, { latitude, longitude }), avg_rating: 0, total_reviews: 0 }];
  }).sort((a, b) => a.distance_km - b.distance_km || a.title.localeCompare(b.title));
}

export async function recordBusinessEvent(serviceId: string, eventType: BusinessEventType, attribution: Record<string, unknown> = {}) {
  const { error } = await supabase.from('business_events').insert({ service_id: serviceId, event_type: eventType, attribution: normalizeBusinessAttribution(attribution) });
  if (error) return;
}

export async function requestCommercialServiceClaim(serviceId: string, message: string) {
  const { data, error } = await supabase.rpc('request_commercial_service_claim', { p_service_id: serviceId, p_message: message || null });
  if (error) throw error;
  return data as string;
}

export type BusinessReview = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  author_name: string;
  author_role: string | null;
};

export async function getBusinessReviews(serviceId: string) {
  const { data, error } = await supabase.from('reviews')
    .select('id,user_id,rating,comment,created_at,user:users(full_name,username,role)')
    .eq('target_type', 'service')
    .eq('target_id', serviceId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((review): BusinessReview => {
    const relation = review.user as { full_name?: string | null; username?: string | null; role?: string | null } | { full_name?: string | null; username?: string | null; role?: string | null }[] | null;
    const author = Array.isArray(relation) ? relation[0] : relation;
    return { ...review, author_name: author?.full_name || author?.username || 'Viajero', author_role: author?.role ?? null };
  });
}

export async function saveBusinessReview(serviceId: string, rating: number, comment: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('authentication_required');
  const { error } = await supabase.from('reviews').upsert({
    target_type: 'service',
    target_id: serviceId,
    user_id: auth.user.id,
    rating,
    comment: comment.trim() || null,
  }, { onConflict: 'target_type,target_id,user_id' });
  if (error) throw error;
}

export async function getCommercialFavoriteIds() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase.from('commercial_service_favorites').select('service_id').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((favorite) => favorite.service_id as string);
}

export async function setCommercialFavorite(serviceId: string, saved: boolean) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('authentication_required');
  const request = saved
    ? supabase.from('commercial_service_favorites').insert({ user_id: auth.user.id, service_id: serviceId })
    : supabase.from('commercial_service_favorites').delete().eq('user_id', auth.user.id).eq('service_id', serviceId);
  const { error } = await request;
  if (error && error.code !== '23505') throw error;
  if (saved) void recordBusinessEvent(serviceId, 'save');
}

export type OwnerClaim = {
  id: string;
  service_id: string;
  service_title: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
};

export type AdminCommercialClaim = OwnerClaim & { claimant_name: string };

export async function getAdminCommercialClaims() {
  const { data, error } = await supabase.from('commercial_service_claims')
    .select('id,service_id,user_id,message,status,created_at,reviewed_at,commercial_services(title)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((claim): AdminCommercialClaim => {
    const serviceRelation = claim.commercial_services as { title?: string } | { title?: string }[] | null;
    const service = Array.isArray(serviceRelation) ? serviceRelation[0] : serviceRelation;
    return { id: claim.id, service_id: claim.service_id, service_title: service?.title ?? 'Comercio', message: claim.message, status: claim.status as OwnerClaim['status'], created_at: claim.created_at, reviewed_at: claim.reviewed_at, claimant_name: `Usuario ${claim.user_id.slice(0, 8)}` };
  });
}

export async function reviewCommercialClaim(claimId: string, status: 'approved' | 'rejected') {
  const { error } = await supabase.rpc('review_commercial_service_claim', { p_claim_id: claimId, p_status: status });
  if (error) throw error;
}

export async function getOwnerClaims() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from('commercial_service_claims')
    .select('id,service_id,message,status,created_at,reviewed_at,commercial_services(title)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((claim): OwnerClaim => {
    const relation = claim.commercial_services as { title?: string } | { title?: string }[] | null;
    const service = Array.isArray(relation) ? relation[0] : relation;
    return {
      id: claim.id,
      service_id: claim.service_id,
      service_title: service?.title ?? 'Comercio',
      message: claim.message,
      status: claim.status as OwnerClaim['status'],
      created_at: claim.created_at,
      reviewed_at: claim.reviewed_at,
    };
  });
}

type CommercialProfileUpdate = {
  title: string;
  category?: CommerceCategoryId;
  subcategories?: string[];
  phone?: string;
  whatsapp?: string;
  openingHours?: string;
  description?: string;
  priceRange?: string;
  bookingUrl?: string;
  menuUrl?: string;
  parking?: string;
  hasParking?: boolean;
  paymentMethods?: string[];
  accessibility?: string;
  languages?: string[];
  experienceType?: string;
  certifications?: string[];
  photos?: string[];
  coverImageUrl?: string;
};

const trimOptional = (value?: string) => value?.trim() || null;

export async function registerCommercialService(input: {
  mainCategory: string;
  subcategory: string;
  title: string;
  latitude: number;
  longitude: number;
  phone?: string;
  whatsapp?: string;
  description?: string;
  priceRange?: string;
  openingHours?: string;
  bookingUrl?: string;
  menuUrl?: string;
  parking?: string;
  hasParking?: boolean;
  paymentMethods?: string[];
  accessibility?: string;
  languages?: string[];
  experienceType?: string;
  certifications?: string[];
  photos?: string[];
  coverImageUrl?: string;
}) {
  const { data, error } = await supabase.rpc('register_commercial_service_v2', { p_payload: {
    ...input,
    category: input.mainCategory,
    subcategories: input.subcategory.split(',').map((value) => value.trim()).filter(Boolean),
  } });
  if (error) throw error;
  return data as string;
}

export async function updateCommercialServiceProfile(serviceId: string, input: CommercialProfileUpdate) {
  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    business_updated_at: new Date().toISOString(),
  };
  if (input.category !== undefined) {
    payload.category = input.category;
    payload.main_category = input.category;
  }
  if (input.subcategories !== undefined) {
    payload.subcategories = input.subcategories;
    payload.subcategory = input.subcategories.join(', ') || input.category || 'emergency';
  }
  if (input.phone !== undefined) payload.phone_whatsapp = trimOptional(input.phone);
  if (input.whatsapp !== undefined) payload.whatsapp = trimOptional(input.whatsapp);
  if (input.openingHours !== undefined) payload.opening_hours = trimOptional(input.openingHours);
  if (input.description !== undefined) payload.description = trimOptional(input.description);
  if (input.priceRange !== undefined) payload.price_range = trimOptional(input.priceRange);
  if (input.bookingUrl !== undefined) payload.booking_url = trimOptional(input.bookingUrl);
  if (input.menuUrl !== undefined) payload.menu_url = trimOptional(input.menuUrl);
  if (input.parking !== undefined) payload.parking = trimOptional(input.parking);
  if (input.hasParking !== undefined) payload.has_parking = input.hasParking;
  if (input.paymentMethods !== undefined) payload.payment_methods = input.paymentMethods;
  if (input.accessibility !== undefined) payload.accessibility = trimOptional(input.accessibility);
  if (input.languages !== undefined) payload.languages = input.languages;
  if (input.experienceType !== undefined) payload.experience_type = trimOptional(input.experienceType);
  if (input.certifications !== undefined) payload.certifications = input.certifications;
  if (input.photos !== undefined) payload.photos = input.photos;
  if (input.coverImageUrl !== undefined) payload.cover_image_url = trimOptional(input.coverImageUrl);

  const { error } = await supabase.from('commercial_services').update(payload).eq('id', serviceId).select('id').single();
  if (error) throw error;
}

export type OwnerDashboardService = {
  id: string;
  title: string;
  category: CommerceCategoryId;
  subcategories: string[];
  region_id: string | null;
  is_claimed: boolean;
  source: 'ICT' | 'SINAC' | 'community' | 'owner_registered';
  main_category: string;
  subcategory: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  menu_url: string | null;
  booking_url: string | null;
  cover_image_url: string | null;
  photos: string[];
  price_range: string | null;
  opening_hours: string | null;
  parking: string | null;
  has_parking: boolean;
  payment_methods: string[];
  accessibility: string | null;
  languages: string[];
  experience_type: string | null;
  certifications: string[];
  claim_status: string;
  business_updated_at: string | null;
  metrics: {
    views: number;
    whatsapp_clicks: number;
    calls: number;
    directions: number;
    saves: number;
    reservations: number;
    coupons: number;
    attributed_leads: number;
    qr_leads: number;
    utm_leads: number;
  };
};

export async function getOwnerDashboard() {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return [];
  const { data, error } = await supabase.from('commercial_services').select(SERVICE_FIELDS).eq('owner_id', userId);
  if (error) throw error;
  const services = (data ?? []).map((row) => {
    const service = row as ServiceRow;
    const knownCategory = service.category as CommerceCategoryId;
    return {
      id: service.id,
      title: service.title,
      category: knownCategory,
      subcategories: service.subcategories ?? [],
      region_id: service.region_id,
      is_claimed: service.is_claimed,
      source: service.source,
      main_category: service.main_category,
      subcategory: service.subcategory,
      description: service.description,
      phone: service.phone_whatsapp,
      whatsapp: service.whatsapp ?? service.phone_whatsapp,
      menu_url: service.menu_url,
      booking_url: service.booking_url,
      cover_image_url: service.cover_image_url,
      photos: service.photos ?? [],
      price_range: service.price_range,
      opening_hours: service.opening_hours,
      parking: service.parking,
      has_parking: service.has_parking,
      payment_methods: service.payment_methods ?? [],
      accessibility: service.accessibility,
      languages: service.languages ?? [],
      experience_type: service.experience_type,
      certifications: service.certifications ?? [],
      claim_status: service.claim_status,
      business_updated_at: service.business_updated_at,
    };
  });
  if (!services.length) return [];
  const { data: events, error: eventError } = await supabase.from('business_events').select('service_id,event_type,attribution').in('service_id', services.map((service) => service.id));
  if (eventError) throw eventError;
  return services.map((service): OwnerDashboardService => {
    const ownEvents = (events ?? []).filter((event) => event.service_id === service.id);
    const attributedLeads = ownEvents.filter((event) => ['whatsapp_click', 'call', 'directions'].includes(event.event_type) && Object.keys((event.attribution ?? {}) as BusinessAttribution).length);
    return {
      ...service,
      metrics: {
        views: ownEvents.filter((event) => event.event_type === 'impression').length,
        whatsapp_clicks: ownEvents.filter((event) => event.event_type === 'whatsapp_click').length,
        calls: ownEvents.filter((event) => event.event_type === 'call').length,
        directions: ownEvents.filter((event) => event.event_type === 'directions').length,
        saves: ownEvents.filter((event) => event.event_type === 'save').length,
        reservations: ownEvents.filter((event) => event.event_type === 'reservation').length,
        coupons: ownEvents.filter((event) => event.event_type === 'coupon_redeemed').length,
        attributed_leads: attributedLeads.length,
        qr_leads: attributedLeads.filter((event) => Boolean((event.attribution as BusinessAttribution | null)?.qr)).length,
        utm_leads: attributedLeads.filter((event) => ATTRIBUTION_KEYS.some((key) => Boolean((event.attribution as BusinessAttribution | null)?.[key]))).length,
      },
    };
  });
}

async function updateBusinessPhotoState(serviceId: string, photos: string[], coverImageUrl: string | null) {
  const { error } = await supabase.from('commercial_services').update({
    photos,
    cover_image_url: coverImageUrl,
    business_updated_at: new Date().toISOString(),
  }).eq('id', serviceId);
  if (error) throw error;
}

export async function uploadBusinessPhoto(service: Pick<OwnerDashboardService, 'id' | 'photos' | 'cover_image_url'>, asset: ImagePickerAsset) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Debés iniciar sesión para subir fotos.');

  const context = ImageManipulator.manipulate(asset.uri);
  context.resize({ width: Math.min(asset.width || 1600, 1600) });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
  const bytes = await (await fetch(saved.uri)).arrayBuffer();
  const path = `${auth.user.id}/${service.id}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.jpg`;
  const storage = supabase.storage.from('business-photos');
  const { error: uploadError } = await storage.upload(path, bytes, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
  if (uploadError) throw uploadError;

  const url = storage.getPublicUrl(path).data.publicUrl;
  try {
    await updateBusinessPhotoState(service.id, [...service.photos, url], service.cover_image_url ?? url);
  } catch (error) {
    await storage.remove([path]);
    throw error;
  }
  return url;
}

export async function setBusinessCoverPhoto(service: Pick<OwnerDashboardService, 'id' | 'photos'>, url: string) {
  if (!service.photos.includes(url)) throw new Error('La foto seleccionada no pertenece a esta galería.');
  await updateBusinessPhotoState(service.id, service.photos, url);
}

function businessPhotoPath(url: string) {
  const marker = '/storage/v1/object/public/business-photos/';
  const start = url.indexOf(marker);
  return start < 0 ? null : decodeURIComponent(url.slice(start + marker.length).split('?')[0]);
}

export async function deleteBusinessPhoto(service: Pick<OwnerDashboardService, 'id' | 'photos' | 'cover_image_url'>, url: string) {
  const photos = service.photos.filter((photo) => photo !== url);
  const coverImageUrl = service.cover_image_url === url ? photos[0] ?? null : service.cover_image_url;
  await updateBusinessPhotoState(service.id, photos, coverImageUrl);
  const path = businessPhotoPath(url);
  if (path) {
    const { error } = await supabase.storage.from('business-photos').remove([path]);
    if (error) return;
  }
}

export function distanceKm(from: Coordinates, to: Coordinates) {
  const rad = (degrees: number) => degrees * Math.PI / 180;
  const lat = rad(to.latitude - from.latitude);
  const lng = rad(to.longitude - from.longitude);
  const a = Math.sin(lat / 2) ** 2 + Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
