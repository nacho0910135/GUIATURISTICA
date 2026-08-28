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
export type Coordinates = { latitude: number; longitude: number };
export type AssistanceService = {
  id: string;
  main_category: string;
  subcategory: string;
  title: string;
  description: string | null;
  phone: string | null;
  external_url: string | null;
  latitude: number;
  longitude: number;
  distance_km: number;
  business_verified_at: string | null;
  business_verification_evidence_url: string | null;
  business_updated_at: string | null;
};

type ServiceRow = Omit<AssistanceService, 'phone' | 'latitude' | 'longitude' | 'distance_km'> & {
  phone_whatsapp: string | null;
  location: { coordinates?: [number, number] } | null;
};

export async function getAssistanceDirectory(categoryId: AssistanceCategoryId, origin: Coordinates) {
  const category = ASSISTANCE_CATEGORIES.find((item) => item.id === categoryId) ?? ASSISTANCE_CATEGORIES[0];
  const { data, error } = await supabase
    .from('commercial_services')
    .select('id,main_category,subcategory,title,description,phone_whatsapp,external_url,location,business_verified_at,business_verification_evidence_url,business_updated_at')
    .in('main_category', [...category.values])
    .limit(1000);
  if (error) throw error;

  return ((data ?? []) as ServiceRow[])
    .flatMap((service) => {
      const [longitude, latitude] = service.location?.coordinates ?? [];
      if (typeof latitude !== 'number' || typeof longitude !== 'number') return [];
      return [{
        id: service.id,
        main_category: service.main_category,
        subcategory: service.subcategory,
        title: service.title,
        description: service.description,
        phone: service.phone_whatsapp,
        external_url: service.external_url,
        business_verified_at: service.business_verified_at,
        business_verification_evidence_url: service.business_verification_evidence_url,
        business_updated_at: service.business_updated_at,
        latitude,
        longitude,
        distance_km: distanceKm(origin, { latitude, longitude }),
      }];
    })
    .sort((a, b) => a.distance_km - b.distance_km || a.title.localeCompare(b.title));
}

export function distanceKm(from: Coordinates, to: Coordinates) {
  const rad = (degrees: number) => degrees * Math.PI / 180;
  const lat = rad(to.latitude - from.latitude);
  const lng = rad(to.longitude - from.longitude);
  const a = Math.sin(lat / 2) ** 2 + Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
