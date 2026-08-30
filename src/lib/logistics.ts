import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { offlineStorage } from '@/lib/query-storage';
import { supabase } from '@/lib/supabase';

export const WEATHER_STALE_TIME = 30 * 60 * 1000;

export type Destination = {
  id: string;
  name: string;
  province: string;
  category: string;
  latitude: number;
  longitude: number;
  has_high_tides_risk: boolean;
  cover_image_url: string | null;
  price_national_crc: number;
  difficulty: string | null;
  description: string | null;
  schedule: string | null;
  closed_day: string | null;
  requires_sinac_booking: boolean;
  sinac_booking_url: string | null;
  dist_meters?: number;
};

export type PlannerPreference = 'Todo' | 'Playa' | 'Naturaleza' | 'Cultura' | 'Comida' | 'Aventura';
export type TripVehicle = 'sedan' | '4x4' | 'bus';
export type TripPlanInput = {
  latitude: number;
  longitude: number;
  availableHours: number;
  maxBudget: number;
  vehicle: TripVehicle;
  category: PlannerPreference;
  language: 'es' | 'en';
};
export type TripStop = {
  destination: Destination;
  order: number;
  travelMinutes: number;
  visitMinutes: number;
  arrivalAt: string;
  departureAt: string;
  estimatedCostCrc: number;
};
export type TripPlan = {
  startsAt: string;
  stops: TripStop[];
  totalTravelMinutes: number;
  totalVisitMinutes: number;
  estimatedTotalCrc: number;
};
export type DayPlan = {
  destination: Destination;
  weather: Weather | null;
  travelMinutes: number;
  visitMinutes: number;
  estimatedTotalCrc: number;
  warnings: string[];
  nearbyService: { id: string; title: string; distanceKm: number; phone: string | null; latitude: number; longitude: number; verifiedAt: string | null } | null;
  createdAt: string;
};

export type Weather = { temperature: number; temperatureUnit: 'C' | 'F'; description: string; icon: string; humidity: number };
export type RoadTrafficAlert = { detail: string; id: string; name: string; status: 'closed' | 'heavy' | 'moderate' | 'clear'; statusLabel: string };

export type FerryRoute = {
  id: string;
  operator: string;
  route: string;
  schedules: { weekday: string[]; saturday: string[]; sunday: string[] };
  departures: string[];
  scheduleNote?: string;
  adultFare: number | null;
  childFare: number | null;
  vehicleFare: number | null;
  ticketUrl: string;
  arrivalMinutes: number;
  terminalName?: string;
  wazeUrl?: string;
  scheduleSourceUrl: string;
  fareSourceUrl?: string;
  validUntil?: string;
};

export const ferryRoutes: FerryRoute[] = [
  {
    id: 'puntarenas-paquera', operator: 'Naviera Tambor', route: 'Puntarenas → Paquera',
    schedules: { weekday: ['04:00', '06:30', '09:00', '12:00', '15:00', '18:00', '20:00', '22:00'], saturday: ['04:00', '06:30', '09:00', '12:00', '15:00', '18:00', '20:00', '22:00'], sunday: ['04:00', '06:30', '09:00', '12:00', '15:00', '18:00', '20:00', '22:00'] }, departures: ['04:00', '06:30', '09:00', '12:00', '15:00', '18:00', '20:00', '22:00'],
    adultFare: 810, childFare: 480, vehicleFare: 11400,
    terminalName: 'Terminal de Ferrys Naviera Tambor, Barrio del Carmen, Puntarenas', wazeUrl: 'https://www.waze.com/ul?q=Terminal%20de%20Ferrys%20Naviera%20Tambor%2C%20Barrio%20del%20Carmen%2C%20Puntarenas', ticketUrl: 'https://www.quickpaycr.com/', arrivalMinutes: 45, scheduleSourceUrl: 'https://navieratambor.com/horarios-y-tarifas', fareSourceUrl: 'https://aresep.go.cr/cabotaje/tarifas/',
  },
  {
    id: 'paquera-puntarenas', operator: 'Naviera Tambor', route: 'Paquera → Puntarenas',
    schedules: { weekday: ['04:00', '06:30', '09:00', '12:00', '15:00', '18:00', '20:00', '22:00'], saturday: ['04:00', '06:30', '09:00', '12:00', '15:00', '18:00', '20:00', '22:00'], sunday: ['04:00', '06:30', '09:00', '12:00', '15:00', '18:00', '20:00', '22:00'] }, departures: ['04:00', '06:30', '09:00', '12:00', '15:00', '18:00', '20:00', '22:00'],
    adultFare: 810, childFare: 480, vehicleFare: 11400,
    terminalName: 'Terminal de Ferrys de Paquera', wazeUrl: 'https://www.waze.com/ul?q=Terminal%20de%20Ferrys%20Paquera%2C%20Costa%20Rica', ticketUrl: 'https://www.quickpaycr.com/', arrivalMinutes: 45, scheduleSourceUrl: 'https://navieratambor.com/horarios-y-tarifas', fareSourceUrl: 'https://aresep.go.cr/cabotaje/tarifas/',
  },
  {
    id: 'puntarenas-naranjo', operator: 'Coonatramar', route: 'Puntarenas → Playa Naranjo',
    schedules: { weekday: ['05:15', '10:00', '14:30', '18:45', '20:30'], saturday: ['05:15', '10:00', '14:30', '18:45', '20:30'], sunday: ['05:15', '10:00', '14:30', '18:45', '20:30'] }, departures: ['05:15', '10:00', '14:30', '18:45', '20:30'], scheduleNote: 'Viernes: salida adicional a las 11:30.',
    adultFare: 1000, childFare: 600, vehicleFare: null,
    terminalName: 'Coonatramar, Barrio del Carmen, Puntarenas', wazeUrl: 'https://www.waze.com/ul?q=Coonatramar%2C%20Barrio%20del%20Carmen%2C%20Puntarenas', ticketUrl: 'https://coonatramar.com/', arrivalMinutes: 60, scheduleSourceUrl: 'https://coonatramar.com/181212-2/', fareSourceUrl: 'https://aresep.go.cr/cabotaje/tarifas/', validUntil: '30/11/2026',
  },
  {
    id: 'naranjo-puntarenas', operator: 'Coonatramar', route: 'Playa Naranjo → Puntarenas',
    schedules: { weekday: ['05:15', '07:30', '12:30', '16:30', '20:30'], saturday: ['05:15', '07:30', '12:30', '16:30', '20:30'], sunday: ['05:15', '07:30', '12:30', '16:30', '20:30'] }, departures: ['05:15', '07:30', '12:30', '16:30', '20:30'], scheduleNote: 'Domingo: salida adicional a las 14:30.',
    adultFare: 1000, childFare: 600, vehicleFare: null,
    terminalName: 'Embarcadero de Playa Naranjo', wazeUrl: 'https://www.waze.com/ul?q=Embarcadero%20de%20Playa%20Naranjo%2C%20Costa%20Rica', ticketUrl: 'https://coonatramar.com/', arrivalMinutes: 60, scheduleSourceUrl: 'https://coonatramar.com/181212-2/', fareSourceUrl: 'https://aresep.go.cr/cabotaje/tarifas/', validUntil: '30/11/2026',
  },
  {
    id: 'puntarenas-isla-chira', operator: 'Servicio marítimo local', route: 'Puntarenas → Isla Chira',
    schedules: { weekday: ['12:30'], saturday: ['12:30'], sunday: ['07:00'] }, departures: ['12:30'], scheduleNote: 'Horario referencial publicado por Yo Viajo CR. Confirmá antes de viajar.',
    adultFare: null, childFare: null, vehicleFare: null, ticketUrl: 'https://yoviajocr.com/bus/puntarenas-isla-chira', arrivalMinutes: 60, scheduleSourceUrl: 'https://yoviajocr.com/bus/puntarenas-isla-chira',
  },
  {
    id: 'isla-chira-puntarenas', operator: 'Servicio marítimo local', route: 'Isla Chira → Puntarenas',
    schedules: { weekday: ['06:00'], saturday: ['06:00'], sunday: ['06:00'] }, departures: ['06:00'], scheduleNote: 'Horario referencial publicado por Yo Viajo CR. Confirmá antes de viajar.',
    adultFare: null, childFare: null, vehicleFare: null, ticketUrl: 'https://yoviajocr.com/bus/isla-chira-puntarenas', arrivalMinutes: 60, scheduleSourceUrl: 'https://yoviajocr.com/bus/isla-chira-puntarenas',
  },
  {
    id: 'isla-chira-costa-de-pajaros', operator: 'Servicio marítimo local', route: 'Isla Chira → Costa de Pájaros',
    schedules: { weekday: ['06:00', '13:00'], saturday: ['06:00', '13:00'], sunday: ['06:00', '13:00'] }, departures: ['06:00', '13:00'], scheduleNote: 'Horario referencial publicado por Yo Viajo CR. Confirmá antes de viajar.',
    adultFare: null, childFare: null, vehicleFare: null, ticketUrl: 'https://yoviajocr.com/bus/isla-chira-costa-de-pajaros', arrivalMinutes: 60, scheduleSourceUrl: 'https://yoviajocr.com/bus/isla-chira-costa-de-pajaros',
  },
  {
    id: 'costa-de-pajaros-isla-chira', operator: 'Servicio marítimo local', route: 'Costa de Pájaros → Isla Chira',
    schedules: { weekday: ['07:50', '14:50'], saturday: ['07:50', '14:50'], sunday: ['07:50', '14:50'] }, departures: ['07:50', '14:50'], scheduleNote: 'Horario referencial publicado por Yo Viajo CR. Confirmá antes de viajar.',
    adultFare: null, childFare: null, vehicleFare: null, ticketUrl: 'https://yoviajocr.com/bus/costa-de-pajaros-isla-chira', arrivalMinutes: 60, scheduleSourceUrl: 'https://yoviajocr.com/bus/costa-de-pajaros-isla-chira',
  },
];

export async function getFerryRoutes(): Promise<FerryRoute[]> {
  const { data, error } = await supabase.from('ferry_routes').select('source_key,route_name,operator,schedules,schedule_note,fare_adult_crc,fare_child_crc,fare_vehicle_crc,origin_terminal_name,origin_waze_url,schedule_source_url,fare_source_url,valid_until').eq('is_published', true).order('route_name');
  if (error) throw error;
  return (data ?? []).map((route) => ({
    id: route.source_key,
    route: route.route_name,
    operator: route.operator,
    schedules: route.schedules as FerryRoute['schedules'],
    departures: (route.schedules as FerryRoute['schedules']).weekday,
    scheduleNote: route.schedule_note,
    adultFare: route.fare_adult_crc === null ? null : Number(route.fare_adult_crc),
    childFare: route.fare_child_crc === null ? null : Number(route.fare_child_crc),
    vehicleFare: route.fare_vehicle_crc === null ? null : Number(route.fare_vehicle_crc),
    terminalName: route.origin_terminal_name,
    wazeUrl: route.origin_waze_url,
    ticketUrl: route.schedule_source_url,
    arrivalMinutes: route.operator === 'Naviera Tambor' ? 45 : 60,
    scheduleSourceUrl: route.schedule_source_url,
    fareSourceUrl: route.fare_source_url,
    validUntil: route.valid_until ?? undefined,
  }));
}

export const emergencyContacts = [
  { label: 'Emergencias 911', phone: '911' },
  { label: 'Información Turística ICT', phone: '22995800' },
  { label: 'OIJ · línea confidencial', phone: '8008000645' },
] as const;

const destinationFields = 'id,name,province,category,latitude,longitude,has_high_tides_risk,cover_image_url,price_national_crc,difficulty,description,requires_sinac_booking,sinac_booking_url,normativas_destinos(horario_ingreso,dia_cierre)';

const ROAD_CORRIDORS = [
  { id: 'route-32', name: 'Ruta 32 (San José - Guápiles)', from: [-84.07486, 9.932607], to: [-83.78975, 10.21547] },
  { id: 'route-2', name: 'Ruta 2 (Cartago - San Isidro)', from: [-83.91655, 9.864186], to: [-83.70457, 9.371303] },
  { id: 'route-27', name: 'Ruta 27 (San José - Caldera)', from: [-84.07486, 9.932607], to: [-84.70942, 9.924575] },
] as const;

export async function getLiveRoadAlerts(language: 'es' | 'en'): Promise<{ alerts: RoadTrafficAlert[]; updatedAt: string }> {
  const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) throw new Error('MAPBOX_TOKEN_MISSING');
  const alerts = await Promise.all(ROAD_CORRIDORS.map(async (corridor): Promise<RoadTrafficAlert> => {
    const coordinates = `${corridor.from.join(',')};${corridor.to.join(',')}`;
    const params = new URLSearchParams({ access_token: token, annotations: 'congestion,closure', geometries: 'geojson', language, overview: 'full' });
    const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}?${params}`);
    if (!response.ok) throw new Error(`Mapbox Traffic ${response.status}`);
    const body = await response.json() as { code: string; routes?: { legs?: { annotation?: { congestion?: string[] }; closures?: unknown[]; duration: number; incidents?: { closed?: boolean; description?: string; impact?: string; long_description?: string; type?: string }[] }[] }[] };
    const leg = body.routes?.[0]?.legs?.[0];
    if (body.code !== 'Ok' || !leg) throw new Error(`Mapbox Traffic ${body.code}`);
    const incident = leg.incidents?.[0];
    const congestion = leg.annotation?.congestion ?? [];
    const heavySegments = congestion.filter((level) => level === 'heavy' || level === 'severe').length;
    const moderateSegments = congestion.filter((level) => level === 'moderate').length;
    const knownSegments = congestion.filter((level) => level !== 'unknown').length;
    const minutes = Math.max(1, Math.round(leg.duration / 60));
    if (incident?.closed || leg.closures?.length) return { id: corridor.id, name: corridor.name, status: 'closed', statusLabel: language === 'es' ? 'Cierre reportado' : 'Closure reported', detail: incident?.long_description || incident?.description || (language === 'es' ? `Mapbox reporta un cierre en el recorrido · ${minutes} min estimados.` : `Mapbox reports a closure along the route · ${minutes} min estimated.`) };
    if (incident) return { id: corridor.id, name: corridor.name, status: incident.impact === 'critical' || incident.impact === 'major' ? 'heavy' : 'moderate', statusLabel: incidentLabel(incident.type, language), detail: incident.long_description || incident.description || (language === 'es' ? `Incidente reportado por Mapbox · ${minutes} min estimados.` : `Incident reported by Mapbox · ${minutes} min estimated.`) };
    const heavyPercent = knownSegments ? Math.round(heavySegments / knownSegments * 100) : 0;
    const moderatePercent = knownSegments ? Math.round(moderateSegments / knownSegments * 100) : 0;
    if (heavySegments) return { id: corridor.id, name: corridor.name, status: 'heavy', statusLabel: language === 'es' ? 'Congestión intensa' : 'Heavy congestion', detail: language === 'es' ? `${heavyPercent}% de los tramos medidos con congestión pesada o severa · ${minutes} min estimados.` : `${heavyPercent}% of measured segments have heavy or severe congestion · ${minutes} min estimated.` };
    if (moderateSegments) return { id: corridor.id, name: corridor.name, status: 'moderate', statusLabel: language === 'es' ? 'Congestión moderada' : 'Moderate congestion', detail: language === 'es' ? `${moderatePercent}% de los tramos medidos con congestión moderada · ${minutes} min estimados.` : `${moderatePercent}% of measured segments have moderate congestion · ${minutes} min estimated.` };
    return { id: corridor.id, name: corridor.name, status: 'clear', statusLabel: language === 'es' ? 'Sin incidentes reportados' : 'No incidents reported', detail: language === 'es' ? `Mapbox no reporta incidentes ni cierres en este recorrido · ${minutes} min estimados.` : `Mapbox reports no incidents or closures along this route · ${minutes} min estimated.` };
  }));
  return { alerts, updatedAt: new Date().toISOString() };
}

function incidentLabel(type: string | undefined, language: 'es' | 'en') {
  const labels: Record<string, [string, string]> = { accident: ['Accidente reportado', 'Accident reported'], congestion: ['Congestión reportada', 'Congestion reported'], construction: ['Obras reportadas', 'Construction reported'], disabled_vehicle: ['Vehículo detenido', 'Disabled vehicle'], lane_restriction: ['Carril restringido', 'Lane restriction'], planned_event: ['Evento planificado', 'Planned event'], road_closure: ['Cierre reportado', 'Closure reported'], road_hazard: ['Peligro en carretera', 'Road hazard'], weather: ['Afectación por clima', 'Weather impact'] };
  const label = labels[type ?? ''];
  return label ? label[language === 'es' ? 0 : 1] : (language === 'es' ? 'Incidente reportado' : 'Incident reported');
}

export async function getWeather(destination: Pick<Destination, 'latitude' | 'longitude'>, language: 'es' | 'en'): Promise<Weather> {
  const key = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
  if (!key) throw new Error('OPENWEATHER_KEY_MISSING');
  const params = new URLSearchParams({ lat: String(destination.latitude), lon: String(destination.longitude), appid: key, units: language === 'es' ? 'metric' : 'imperial', lang: language });
  const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?${params}`);
  if (!response.ok) throw new Error(`OpenWeather ${response.status}`);
  const body = await response.json() as { main: { temp: number; humidity: number }; weather?: { description: string; icon: string }[] };
  return { temperature: Math.round(body.main.temp), temperatureUnit: language === 'es' ? 'C' : 'F', humidity: body.main.humidity, description: body.weather?.[0]?.description ?? '', icon: body.weather?.[0]?.icon ?? '01d' };
}

export async function recommendDestinations(input: { latitude: number; longitude: number; hours: number; category: PlannerPreference; maxBudget: number; children: boolean; seniors: boolean; reducedMobility: boolean; hasVehicle: boolean; language: 'es' | 'en' }): Promise<DayPlan | null> {
  const candidates = await getPlannerCandidates(input);
  const destination = candidates[0];
  if (!destination) return null;
  const [weather, nearbyService, travelMinutes] = await Promise.all([
    getWeather(destination, input.language).catch(() => null),
    getNearbyFoodService(destination).catch(() => null),
    getTravelMinutes(input, destination),
  ]);
  const visitMinutes = Math.max(60, input.hours * 60 - travelMinutes * 2 - 60);
  const warnings: string[] = [];
  if (!input.hasVehicle && (destination.dist_meters ?? 0) > 20000) warnings.push(input.language === 'es' ? 'Confirmá transporte de regreso antes de salir.' : 'Confirm return transportation before leaving.');
  if (input.children || input.seniors || input.reducedMobility) warnings.push(input.language === 'es' ? 'Confirmá accesibilidad, baños y condiciones del sendero con el operador.' : 'Confirm accessibility, restrooms and trail conditions with the operator.');
  if (destination.closed_day) warnings.push(`${input.language === 'es' ? 'Cierre indicado' : 'Listed closure'}: ${destination.closed_day}.`);
  return { destination, weather, travelMinutes, visitMinutes, estimatedTotalCrc: destination.price_national_crc, warnings, nearbyService, createdAt: new Date().toISOString() };
}

export async function buildTripPlan(input: TripPlanInput): Promise<TripPlan | null> {
  const hasVehicle = input.vehicle !== 'bus';
  const plannerInput = { ...input, hours: input.availableHours, children: false, seniors: false, reducedMobility: false, hasVehicle };
  const candidates = await getPlannerCandidates(plannerInput);
  return assembleTripPlan(input, candidates);
}

export function buildOfflineTripPlan(input: TripPlanInput, destinations: Destination[]): TripPlan | null {
  const hasVehicle = input.vehicle !== 'bus';
  const radiusKm = Math.min(input.availableHours <= 4 ? 50 : input.availableHours <= 8 ? 120 : 250, input.availableHours * (hasVehicle ? 12 : 4));
  const candidates = destinations
    .map((destination) => ({ ...destination, dist_meters: distanceKm(input, destination) * 1000 }))
    .filter((destination) => destination.dist_meters <= radiusKm * 1000 && destination.price_national_crc <= input.maxBudget)
    .sort((a, b) => scoreDestination(b, { ...input, hasVehicle, children: false, seniors: false, reducedMobility: false }) - scoreDestination(a, { ...input, hasVehicle, children: false, seniors: false, reducedMobility: false }));
  return assembleTripPlan(input, candidates);
}

function assembleTripPlan(input: TripPlanInput, candidates: Destination[]): TripPlan | null {
  const hasVehicle = input.vehicle !== 'bus';
  const plannerInput = { ...input, hours: input.availableHours, children: false, seniors: false, reducedMobility: false, hasVehicle };
  const startsAt = new Date(Date.now() + 45 * 60 * 1000);
  let current = { latitude: input.latitude, longitude: input.longitude };
  let remainingMinutes = input.availableHours * 60;
  let remainingBudget = input.maxBudget;
  const stops: TripStop[] = [];
  const speedKph = input.vehicle === 'bus' ? 28 : input.vehicle === '4x4' ? 42 : 48;
  const routeScore = (destination: Destination) => scoreDestination(destination, plannerInput) - distanceKm(current, destination) * 4;

  while (stops.length < 4) {
    const destination = candidates
      .filter((item) => item.price_national_crc <= remainingBudget && !stops.some((stop) => stop.destination.id === item.id))
      .sort((a, b) => routeScore(b) - routeScore(a))[0];
    if (!destination) break;
    const travelMinutes = Math.max(10, Math.round(distanceKm(current, destination) / speedKph * 60));
    const returnMinutes = Math.max(10, Math.round(distanceKm(destination, { latitude: input.latitude, longitude: input.longitude }) / speedKph * 60));
    if (remainingMinutes < travelMinutes + returnMinutes + 60) break;
    const visitMinutes = Math.min(180, Math.max(60, remainingMinutes - travelMinutes - returnMinutes - 30));
    const arrivalAt = new Date(startsAt.getTime() + (input.availableHours * 60 - remainingMinutes + travelMinutes) * 60 * 1000);
    const departureAt = new Date(arrivalAt.getTime() + visitMinutes * 60 * 1000);
    stops.push({ destination, order: stops.length + 1, travelMinutes, visitMinutes, arrivalAt: arrivalAt.toISOString(), departureAt: departureAt.toISOString(), estimatedCostCrc: destination.price_national_crc });
    remainingMinutes -= travelMinutes + visitMinutes;
    remainingBudget -= destination.price_national_crc;
    current = destination;
  }
  if (!stops.length) return null;
  return {
    startsAt: startsAt.toISOString(),
    stops,
    totalTravelMinutes: stops.reduce((total, stop) => total + stop.travelMinutes, 0),
    totalVisitMinutes: stops.reduce((total, stop) => total + stop.visitMinutes, 0),
    estimatedTotalCrc: stops.reduce((total, stop) => total + stop.estimatedCostCrc, 0),
  };
}

export async function getDestinationsForOffline(province: string) {
  const { data, error } = await supabase.from('destinations').select(destinationFields).eq('province', province).eq('status', 'Activo').order('name').limit(500);
  if (error) throw error;
  return (data ?? []).map(normalizeDestination);
}

async function getPlannerCandidates(input: { latitude: number; longitude: number; hours: number; category: PlannerPreference; maxBudget: number; children: boolean; seniors: boolean; reducedMobility: boolean; hasVehicle: boolean }) {
  const broadRadius = input.hours <= 4 ? 50000 : input.hours <= 8 ? 120000 : 250000;
  const radius = Math.min(broadRadius, input.hours * (input.hasVehicle ? 12000 : 4000));
  const { data: nearby, error } = await supabase.rpc('get_destinations_nearby', { user_lat: input.latitude, user_lng: input.longitude, distance_meters: radius });
  if (error) throw error;
  const rows = (nearby ?? []) as { id: string; dist_meters: number }[];
  if (!rows.length) return [];
  const { data: details, error: detailsError } = await supabase.from('destinations').select(destinationFields).in('id', rows.map((item) => item.id));
  if (detailsError) throw detailsError;
  const distanceById = new Map(rows.map((item) => [item.id, item.dist_meters]));
  return (details ?? []).map(normalizeDestination).map((item) => ({ ...item, dist_meters: distanceById.get(item.id) ?? 0 }))
    .filter((item) => item.price_national_crc <= input.maxBudget)
    .filter((item) => !input.reducedMobility || /fácil|facil/i.test(item.difficulty ?? ''))
    .sort((a, b) => scoreDestination(b, input) - scoreDestination(a, input));
}

function scoreDestination(destination: Destination, input: { category: PlannerPreference; children: boolean; seniors: boolean; reducedMobility: boolean; hasVehicle: boolean }) {
  const categoryTerms: Record<PlannerPreference, RegExp> = {
    Todo: /./i, Playa: /playa|costa|mar/i, Naturaleza: /parque|reserva|bosque|río|rio|catarata|fauna/i,
    Cultura: /cultura|museo|históric|histor|arqueolog/i, Comida: /gastronom|comida|café|cafe|mercado/i,
    Aventura: /aventura|surf|canopy|rafting|sender|volcán|volcan/i,
  };
  let score = categoryTerms[input.category].test(destination.category) ? 100 : input.category === 'Todo' ? 20 : 0;
  score -= (destination.dist_meters ?? 0) / 1000;
  if ((input.children || input.seniors || input.reducedMobility) && /fácil|facil/i.test(destination.difficulty ?? '')) score += 30;
  if (!input.hasVehicle && (destination.dist_meters ?? 0) < 20000) score += 25;
  return score;
}

async function getNearbyFoodService(destination: Destination): Promise<DayPlan['nearbyService']> {
  const { data, error } = await supabase.from('commercial_services')
    .select('id,title,phone_whatsapp,location,main_category,subcategory,business_verified_at')
    .or('main_category.ilike.%rest%,subcategory.ilike.%rest%,main_category.ilike.%comida%,subcategory.ilike.%comida%,main_category.ilike.%cafe%,subcategory.ilike.%cafe%')
    .limit(100);
  if (error) throw error;
  const services = (data ?? []).flatMap((service) => {
    const coordinates = (service.location as { coordinates?: [number, number] } | null)?.coordinates;
    if (!coordinates) return [];
    const [longitude, latitude] = coordinates;
    return [{ id: service.id, title: service.title, phone: service.phone_whatsapp, latitude, longitude, verifiedAt: service.business_verified_at, distanceKm: distanceKm(destination, { latitude, longitude }) }];
  }).sort((a, b) => a.distanceKm - b.distanceKm);
  return services[0] ?? null;
}

async function getTravelMinutes(origin: { latitude: number; longitude: number; hasVehicle: boolean }, destination: Destination) {
  const fallback = Math.max(10, Math.round((destination.dist_meters ?? 0) / 1000 / (origin.hasVehicle ? 45 : 18) * 60));
  const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) return fallback;
  const profile = origin.hasVehicle ? 'driving-traffic' : 'walking';
  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  try {
    const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?access_token=${encodeURIComponent(token)}&overview=false`);
    if (!response.ok) return fallback;
    const body = await response.json() as { code?: string; routes?: { duration?: number }[] };
    return body.code === 'Ok' && body.routes?.[0]?.duration ? Math.max(1, Math.round(body.routes[0].duration / 60)) : fallback;
  } catch { return fallback; }
}

function distanceKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const lat = radians(to.latitude - from.latitude); const lng = radians(to.longitude - from.longitude);
  const value = Math.sin(lat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export async function openNavigation(latitude: number, longitude: number) {
  const waze = Platform.OS === 'ios'
    ? `waze://?ll=${latitude},${longitude}&navigate=yes`
    : `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
  const fallback = Platform.OS === 'ios'
    ? `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  try {
    if (Platform.OS === 'ios' && !(await Linking.canOpenURL(waze))) return Linking.openURL(fallback);
    return await Linking.openURL(waze);
  } catch {
    return Linking.openURL(fallback);
  }
}

export async function scheduleFerryReminder(route: FerryRoute, minutes = route.arrivalMinutes) {
  if (Platform.OS === 'web') throw new Error('NATIVE_ONLY');
  const Notifications = await import('expo-notifications');
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('PERMISSION_DENIED');
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('ferries', { name: 'Ferris', importance: Notifications.AndroidImportance.HIGH });
  const departure = nextDeparture(route.departures);
  const reminder = new Date(departure.getTime() - minutes * 60 * 1000);
  if (reminder.getTime() <= Date.now()) reminder.setDate(reminder.getDate() + 1);
  await Notifications.scheduleNotificationAsync({
    content: { title: `Ferri ${route.route}`, body: `Llegá ${minutes} minutos antes. Salida: ${departure.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder, channelId: 'ferries' },
  });
  return departure;
}

export async function saveOfflinePack(destinations: Destination[], dayPlan?: DayPlan | null) {
  await offlineStorage.setItem('LOGISTICS_OFFLINE_PACK', JSON.stringify({ savedAt: new Date().toISOString(), destinations, emergencyContacts, dayPlan: dayPlan ?? null }));
}

export async function getOfflinePack() {
  const value = await offlineStorage.getItem('LOGISTICS_OFFLINE_PACK');
  if (!value) return null;
  try { return JSON.parse(value) as { savedAt: string; destinations: Destination[]; emergencyContacts: typeof emergencyContacts; dayPlan?: DayPlan | null }; } catch { return null; }
}

export function calculateCostaRicaTotal(subtotal: number) {
  return { service: subtotal * 0.1, tax: subtotal * 0.13, total: subtotal * 1.23 };
}

function normalizeDestination(row: Record<string, unknown>): Destination {
  const rulesValue = row.normativas_destinos;
  const rules = (Array.isArray(rulesValue) ? rulesValue[0] : rulesValue) as { horario_ingreso?: string | null; dia_cierre?: string | null } | null;
  return {
    ...(row as Omit<Destination, 'price_national_crc'>),
    latitude: Number(row.latitude), longitude: Number(row.longitude), price_national_crc: Number(row.price_national_crc ?? 0),
    schedule: rules?.horario_ingreso ?? null, closed_day: rules?.dia_cierre ?? null,
  };
}

function nextDeparture(times: string[]) {
  const now = new Date();
  for (const time of times) {
    const [hours, minutes] = time.split(':').map(Number);
    const candidate = new Date(now); candidate.setHours(hours, minutes, 0, 0);
    if (candidate.getTime() > now.getTime() + 15 * 60 * 1000) return candidate;
  }
  const [hours, minutes] = times[0].split(':').map(Number);
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(hours, minutes, 0, 0);
  return tomorrow;
}
