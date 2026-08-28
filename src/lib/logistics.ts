import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { offlineStorage } from '@/lib/query-storage';
import { supabase } from '@/lib/supabase';

export const WEATHER_STALE_TIME = 30 * 60 * 1000;
export const TIDES_STALE_TIME = 3 * 60 * 60 * 1000;

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
  dist_meters?: number;
};

export type Weather = { temperature: number; temperatureUnit: 'C' | 'F'; description: string; icon: string; humidity: number };
export type Tide = { nextHigh?: { date: string; height: number }; alert: boolean };
export type DestinationAlert = { detail: string; level: 'info' | 'warning'; title: string };
export type RoadTrafficAlert = { detail: string; id: string; name: string; status: 'closed' | 'heavy' | 'moderate' | 'clear'; statusLabel: string };

export type FerryRoute = {
  id: string;
  operator: string;
  route: string;
  departures: string[];
  adultFare: number;
  childFare: number;
  vehicleFare: number;
  ticketUrl: string;
  arrivalMinutes: number;
  validUntil?: string;
};

export const ferryRoutes: FerryRoute[] = [
  {
    id: 'paquera', operator: 'Naviera Tambor', route: 'Puntarenas → Paquera',
    departures: ['04:00', '06:30', '09:00', '12:00', '15:00', '18:00', '20:00', '22:00'],
    adultFare: 810, childFare: 480, vehicleFare: 11400,
    ticketUrl: 'https://www.quickpaycr.com/', arrivalMinutes: 45,
  },
  {
    id: 'naranjo', operator: 'Coonatramar', route: 'Puntarenas → Playa Naranjo',
    departures: ['05:15', '10:00', '14:30', '18:45', '20:30'],
    adultFare: 1000, childFare: 600, vehicleFare: 10170,
    ticketUrl: 'https://coonatramar.com/', arrivalMinutes: 60, validUntil: '30/11/2026',
  },
];

export const emergencyContacts = [
  { label: 'Emergencias 911', phone: '911' },
  { label: 'Información Turística ICT', phone: '22995800' },
  { label: 'OIJ · línea confidencial', phone: '8008000645' },
] as const;

const destinationFields = 'id,name,province,category,latitude,longitude,has_high_tides_risk,cover_image_url,price_national_crc,difficulty';

export async function getFeaturedDestinations(): Promise<Destination[]> {
  const names = ['Parque Nacional Marino Ballena', 'Parque Nacional Manuel Antonio', 'Parque Nacional Marino Las Baulas (Playa Grande)'];
  const { data, error } = await supabase.from('destinations').select(destinationFields).in('name', names);
  if (error) throw error;
  return (data ?? []).map(normalizeDestination);
}

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

export async function getTides(destination: Pick<Destination, 'latitude' | 'longitude' | 'has_high_tides_risk'>): Promise<Tide> {
  const key = process.env.EXPO_PUBLIC_WORLDTIDES_API_KEY;
  if (!key) throw new Error('WORLDTIDES_KEY_MISSING');
  const params = new URLSearchParams({ lat: String(destination.latitude), lon: String(destination.longitude), key, date: 'today', days: '1', localtime: '' });
  const response = await fetch(`https://www.worldtides.info/api/v3?extremes&${params}`);
  if (!response.ok) throw new Error(`WorldTides ${response.status}`);
  const body = await response.json() as { extremes?: { dt: number; date: string; height: number; type: string }[]; error?: string };
  if (body.error) throw new Error(body.error);
  const now = Date.now();
  const high = body.extremes?.find((item) => item.type.toLowerCase() === 'high' && item.dt * 1000 >= now);
  return {
    nextHigh: high ? { date: high.date, height: high.height } : undefined,
    alert: Boolean(destination.has_high_tides_risk && high && high.dt * 1000 - now <= 3 * 60 * 60 * 1000),
  };
}

export function getDestinationAlert(weather: Weather | undefined, tide: Tide | undefined, language: 'es' | 'en', hasHighTidesRisk = false): DestinationAlert {
  if (tide?.nextHigh) {
    const time = new Date(tide.nextHigh.date).toLocaleTimeString(language === 'es' ? 'es-CR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const height = tide.nextHigh.height.toFixed(1);
    return tide.alert
      ? { level: 'warning', title: language === 'es' ? 'Marea alta próxima' : 'High tide approaching', detail: language === 'es' ? `Pleamar de ${height} m a las ${time}. Evitá zonas bajas y cruces costeros.` : `${height} m high tide at ${time}. Avoid low areas and coastal crossings.` }
      : { level: 'info', title: language === 'es' ? 'Próxima pleamar' : 'Next high tide', detail: language === 'es' ? `Marea alta estimada de ${height} m a las ${time}.` : `Estimated ${height} m high tide at ${time}.` };
  }
  if (hasHighTidesRisk) return { level: 'warning', title: language === 'es' ? 'Riesgo de marea alta' : 'High-tide risk', detail: language === 'es' ? 'Zona con pasos costeros sensibles a la pleamar. Revisá la marea antes de ingresar y evitá cruces con el agua en ascenso.' : 'Coastal crossings in this area are sensitive to high tide. Check tide times before entering and avoid crossings as water rises.' };
  if (!weather) return { level: 'info', title: language === 'es' ? 'Consultando condiciones' : 'Checking conditions', detail: language === 'es' ? 'Actualizando clima y mareas del destino.' : 'Updating weather and tide conditions.' };
  const severeWeather = /torment|thunder|lluvia fuerte|heavy rain/i.test(weather.description);
  return { level: severeWeather ? 'warning' : 'info', title: severeWeather ? (language === 'es' ? 'Condiciones adversas' : 'Adverse conditions') : (language === 'es' ? 'Condiciones actuales' : 'Current conditions'), detail: `${weather.temperature}°${weather.temperatureUnit} · ${weather.description} · ${language === 'es' ? 'humedad' : 'humidity'} ${weather.humidity}%` };
}

export async function recommendDestinations(input: { latitude: number; longitude: number; hours: number; category: string; maxBudget: number }) {
  const radius = input.hours <= 4 ? 50000 : input.hours <= 8 ? 120000 : 250000;
  const { data: nearby, error } = await supabase.rpc('get_destinations_nearby', {
    user_lat: input.latitude, user_lng: input.longitude, distance_meters: radius,
  });
  if (error) throw error;
  const rows = (nearby ?? []) as { id: string; dist_meters: number }[];
  if (!rows.length) return [];
  const { data: details, error: detailsError } = await supabase.from('destinations').select(destinationFields).in('id', rows.map((item) => item.id));
  if (detailsError) throw detailsError;
  const distanceById = new Map(rows.map((item) => [item.id, item.dist_meters]));
  const candidates = (details ?? []).map(normalizeDestination).map((item) => ({ ...item, dist_meters: distanceById.get(item.id) ?? 0 }))
    .filter((item) => item.price_national_crc <= input.maxBudget)
    .sort((a, b) => (a.dist_meters ?? 0) - (b.dist_meters ?? 0));
  const preferred = input.category === 'Todo' ? candidates : candidates.filter((item) => item.category.toLowerCase().includes(input.category.toLowerCase()));
  return (preferred.length ? preferred : candidates).slice(0, Math.min(4, Math.max(1, Math.floor(input.hours / 2))));
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

export async function saveOfflinePack(destinations: Destination[]) {
  await offlineStorage.setItem('LOGISTICS_OFFLINE_PACK', JSON.stringify({ savedAt: new Date().toISOString(), destinations, emergencyContacts }));
}

export async function getOfflinePack() {
  const value = await offlineStorage.getItem('LOGISTICS_OFFLINE_PACK');
  if (!value) return null;
  try { return JSON.parse(value) as { savedAt: string; destinations: Destination[]; emergencyContacts: typeof emergencyContacts }; } catch { return null; }
}

export function calculateCostaRicaTotal(subtotal: number) {
  return { service: subtotal * 0.1, tax: subtotal * 0.13, total: subtotal * 1.23 };
}

function normalizeDestination(row: Record<string, unknown>): Destination {
  return {
    ...(row as Omit<Destination, 'price_national_crc'>),
    latitude: Number(row.latitude), longitude: Number(row.longitude), price_national_crc: Number(row.price_national_crc ?? 0),
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
