import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

export const ASSISTANCE_CATEGORIES = [
  { id: 'hospitals', es: 'Hospitales', en: 'Hospitals', icon: 'hospital-building', values: ['hospital'] },
  { id: 'firefighters', es: 'Bomberos', en: 'Fire stations', icon: 'fire-truck', values: ['bomberos', 'fire_station'] },
  { id: 'police', es: 'Estaciones de policía', en: 'Police stations', icon: 'police-badge', values: ['policia'] },
  { id: 'red-cross', es: 'Cruz Roja', en: 'Red Cross', icon: 'medical-bag', values: ['cruz_roja', 'red_cross'] },
  { id: 'embassies', es: 'Embajadas y Consulados', en: 'Embassies and Consulates', icon: 'flag-variant', values: ['embajada', 'consulado', 'embassy', 'consulate'] },
  { id: 'immigration', es: 'Migración y Extranjería', en: 'Immigration', icon: 'passport', values: ['migracion_extranjeria', 'migracion', 'extranjeria', 'immigration'] },
  { id: 'coast-guard', es: 'Guardacostas', en: 'Coast Guard', icon: 'lifebuoy', values: ['guardacostas', 'coast_guard'] },
  { id: 'traffic-police', es: 'Tránsito / Policía de Tráfico', en: 'Traffic Police', icon: 'car-emergency', values: ['policia_transito', 'transito', 'traffic_police'] },
  { id: 'private-emergency', es: 'Clínicas y urgencias 24/7', en: 'Private urgent care / 24/7 clinics', icon: 'hospital-box-outline', values: ['clinica', 'urgencias_privadas', 'clinica_24_7'] },
] as const;

export type AssistanceCategoryId = typeof ASSISTANCE_CATEGORIES[number]['id'];
const assistanceValues = ASSISTANCE_CATEGORIES.flatMap((category) => category.values);

export const COMMERCE_CATEGORIES = [
  { id: 'food', es: 'Comida', en: 'Food', icon: 'silverware-fork-knife', values: ['restaurant', 'comida', 'gastronomia', 'cafe', 'bar', 'bakery'] },
  { id: 'lodging', es: 'Hospedaje', en: 'Lodging', icon: 'bed', values: ['hotel', 'hospedaje', 'hostel', 'cabinas', 'alojamiento'] },
  { id: 'adventure', es: 'Aventura', en: 'Adventure', icon: 'hiking', values: ['adventure', 'aventura', 'tour', 'tours', 'canopy'] },
  { id: 'water_activities', es: 'Tours Acuáticos y Pesca', en: 'Water Tours & Fishing', icon: 'ferry', values: ['water_activities', 'tours_acuaticos', 'pesca', 'pesca_deportiva', 'boat_tour', 'lancha', 'rafting', 'kayak', 'surf'] },
  { id: 'nature', es: 'Naturaleza', en: 'Nature', icon: 'tree', values: ['naturaleza', 'parque', 'reserva', 'senderismo', 'ecoturismo'] },
  { id: 'wellness', es: 'Termales y bienestar', en: 'Wellness', icon: 'hot-tub', values: ['termales', 'spa', 'bienestar', 'masaje'] },
  { id: 'guides_experiences', es: 'Guías y Experiencias', en: 'Guides & Experiences', icon: 'compass-outline', values: ['guides_experiences', 'guias', 'guia', 'experiencias_locales'] },
  { id: 'rentals_equipment', es: 'Alquileres', en: 'Rentals', icon: 'key-variant', values: ['rentals_equipment', 'alquiler', 'alquiler_equipo', 'rentacar', 'alquiler_autos'] },
  { id: 'transport', es: 'Transporte', en: 'Transport', icon: 'car', values: ['transporte', 'taxi', 'shuttle', 'rentacar', 'alquiler_autos'] },
  { id: 'shopping', es: 'Compras', en: 'Shopping', icon: 'storefront-outline', values: ['compras', 'artesanias', 'mercado', 'tienda'] },
  { id: 'emergency', es: 'Asistencia y emergencias', en: 'Assistance & emergencies', icon: 'lifebuoy', values: assistanceValues },
] as const;

export type CommerceCategoryId = typeof COMMERCE_CATEGORIES[number]['id'];
export type CommerceSubcategory = { id: string; es: string; en: string };
export type CommerceRegion = {
  id: string;
  name_es: string;
  name_en: string;
  province: string | null;
  latitude: number;
  longitude: number;
  radius_km: number;
};

export const COMMERCE_SUBCATEGORIES: Record<CommerceCategoryId, readonly CommerceSubcategory[]> = {
  food: [],
  lodging: [],
  adventure: [
    { id: 'canopy_zipline', es: 'Canopy / Tirolesa', en: 'Canopy / zipline' },
    { id: 'atv', es: 'Cuadraciclos (ATV)', en: 'ATV' },
    { id: 'rappel_canyoning', es: 'Rappel / Canyoning', en: 'Rappel / canyoning' },
    { id: 'hiking', es: 'Senderismo', en: 'Hiking' },
    { id: 'cycling', es: 'Ciclismo', en: 'Cycling' },
  ],
  water_activities: [
    { id: 'fishing', es: 'Pesca deportiva', en: 'Sport fishing' },
    { id: 'boat_tours', es: 'Tours en lancha', en: 'Boat tours' },
    { id: 'surf', es: 'Surf', en: 'Surf' },
    { id: 'kayak_sup', es: 'Kayak / SUP', en: 'Kayak / SUP' },
    { id: 'diving_snorkeling', es: 'Buceo / Snorkel', en: 'Diving / snorkeling' },
    { id: 'catamaran', es: 'Catamarán', en: 'Catamaran' },
    { id: 'rafting', es: 'Rafting', en: 'Rafting' },
  ],
  nature: [],
  wellness: [],
  guides_experiences: [
    { id: 'certified_guides', es: 'Guías certificados', en: 'Certified guides' },
    { id: 'birdwatching', es: 'Avistamiento de aves', en: 'Birdwatching' },
    { id: 'night_walks', es: 'Caminatas nocturnas', en: 'Night walks' },
    { id: 'coffee_cacao', es: 'Tour café / cacao', en: 'Coffee / cacao tour' },
    { id: 'surf_cooking_classes', es: 'Clases de surf / cocina', en: 'Surf / cooking classes' },
  ],
  rentals_equipment: [
    { id: 'rent_a_car', es: 'Rent a car local', en: 'Local rent-a-car' },
    { id: 'atv_bikes', es: 'Cuadraciclos / Bikes', en: 'ATV / bikes' },
    { id: 'boards_kayaks', es: 'Tablas / Kayaks', en: 'Boards / kayaks' },
    { id: 'camping_equipment', es: 'Equipo de camping', en: 'Camping equipment' },
  ],
  transport: [],
  shopping: [],
  emergency: [],
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
  const category = COMMERCE_CATEGORIES.find((item) => item.id === categoryId) ?? COMMERCE_CATEGORIES[0];
  const rows: ServiceRow[] = [];
  for (let from = 0; ; from += 1000) {
    let request = supabase.from('vw_ranked_commercial_services').select(RANKED_SERVICE_FIELDS).eq('category', category.id);
    if (subcategory) request = request.contains('subcategories', [subcategory]);
    const { data, error } = await request.range(from, from + 999);
    if (error) throw error;
    rows.push(...(data as ServiceRow[] ?? []));
    if ((data?.length ?? 0) < 1000) break;
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

export async function getClaimableBusiness(serviceId: string): Promise<ClaimableBusiness | null> {
  const { data, error } = await supabase.from('commercial_services').select('id,title,is_claimed,owner_id,claim_status').eq('id', serviceId).maybeSingle();
  if (error) throw error;
  return data as ClaimableBusiness | null;
}

export async function getAssistanceDirectory(categoryId: AssistanceCategoryId, origin: Coordinates) {
  const category = ASSISTANCE_CATEGORIES.find((item) => item.id === categoryId) ?? ASSISTANCE_CATEGORIES[0];
  const { data, error } = await supabase
    .from('commercial_services')
    .select(SERVICE_FIELDS)
    .eq('category', 'emergency')
    .in('main_category', [...category.values])
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
  const { data, error } = await supabase.rpc('register_commercial_service', {
    p_main_category: input.mainCategory,
    p_subcategory: input.subcategory,
    p_title: input.title,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_phone: input.phone || null,
    p_whatsapp: input.whatsapp || null,
    p_description: input.description || null,
    p_price_range: input.priceRange || null,
    p_opening_hours: input.openingHours || null,
    p_booking_url: input.bookingUrl || null,
  });
  if (error) throw error;
  const serviceId = data as string;
  await updateCommercialServiceProfile(serviceId, {
    title: input.title,
    phone: input.phone,
    whatsapp: input.whatsapp,
    openingHours: input.openingHours,
    description: input.description,
    priceRange: input.priceRange,
    bookingUrl: input.bookingUrl,
    menuUrl: input.menuUrl,
    parking: input.parking,
    hasParking: input.hasParking,
    paymentMethods: input.paymentMethods,
    accessibility: input.accessibility,
    languages: input.languages,
    experienceType: input.experienceType,
    certifications: input.certifications,
    photos: input.photos,
    coverImageUrl: input.coverImageUrl,
  });
  return serviceId;
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

  const { error } = await supabase.from('commercial_services').update(payload).eq('id', serviceId);
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
    const knownCategory = COMMERCE_CATEGORIES.some((item) => item.id === service.category)
      ? service.category as CommerceCategoryId
      : 'emergency';
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
