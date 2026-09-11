export const MARINE_WEATHER_STALE_TIME = 30 * 60 * 1000;
export const OPEN_METEO_MARINE_URL = 'https://open-meteo.com/en/docs/marine-weather-api';

export type MarineConditions = {
  currentDirection: number | null;
  currentVelocity: number | null;
  dangerous: boolean;
  seaLevel: number | null;
  swellDirection: number | null;
  swellHeight: number | null;
  swellPeriod: number | null;
  secondarySwellDirection: number | null;
  secondarySwellHeight: number | null;
  secondarySwellPeriod: number | null;
  tertiarySwellDirection: number | null;
  tertiarySwellHeight: number | null;
  tertiarySwellPeriod: number | null;
  waterTemperature: number | null;
  waveHeight: number | null;
  windWaveDirection: number | null;
  windWaveHeight: number | null;
  windWavePeriod: number | null;
};

type Coordinate = { latitude: number; longitude: number };
type MarineResponse = { current?: Record<string, number | string | null> };

const variables = [
  'wave_height', 'wind_wave_height', 'wind_wave_direction', 'wind_wave_period',
  'swell_wave_height', 'swell_wave_direction', 'swell_wave_period',
  'secondary_swell_wave_height', 'secondary_swell_wave_direction', 'secondary_swell_wave_period',
  'tertiary_swell_wave_height', 'tertiary_swell_wave_direction', 'tertiary_swell_wave_period',
  'sea_surface_temperature', 'ocean_current_velocity', 'ocean_current_direction', 'sea_level_height_msl',
].join(',');

function value(current: MarineResponse['current'], key: string) {
  const result = current?.[key];
  return typeof result === 'number' && Number.isFinite(result) ? result : null;
}

export function isDangerousMarineConditions(waveHeight: number | null, swellHeight: number | null, swellPeriod: number | null) {
  // ponytail: model-only threshold; replace with official local beach flags when a trusted feed exists.
  return (waveHeight ?? 0) >= 2 || ((swellHeight ?? 0) >= 1.5 && (swellPeriod ?? 0) >= 10);
}

function normalize(body: MarineResponse): MarineConditions {
  const current = body.current;
  const waveHeight = value(current, 'wave_height');
  const swellHeight = value(current, 'swell_wave_height');
  const swellPeriod = value(current, 'swell_wave_period');
  return {
    currentDirection: value(current, 'ocean_current_direction'), currentVelocity: value(current, 'ocean_current_velocity'),
    dangerous: isDangerousMarineConditions(waveHeight, swellHeight, swellPeriod), seaLevel: value(current, 'sea_level_height_msl'),
    swellDirection: value(current, 'swell_wave_direction'), swellHeight, swellPeriod,
    secondarySwellDirection: value(current, 'secondary_swell_wave_direction'), secondarySwellHeight: value(current, 'secondary_swell_wave_height'), secondarySwellPeriod: value(current, 'secondary_swell_wave_period'),
    tertiarySwellDirection: value(current, 'tertiary_swell_wave_direction'), tertiarySwellHeight: value(current, 'tertiary_swell_wave_height'), tertiarySwellPeriod: value(current, 'tertiary_swell_wave_period'),
    waterTemperature: value(current, 'sea_surface_temperature'), waveHeight,
    windWaveDirection: value(current, 'wind_wave_direction'), windWaveHeight: value(current, 'wind_wave_height'), windWavePeriod: value(current, 'wind_wave_period'),
  };
}

function endpoint(coordinates: Coordinate[]) {
  const key = process.env.EXPO_PUBLIC_OPEN_METEO_API_KEY;
  if (!key && !__DEV__) throw new Error('Falta configurar la licencia comercial de Open-Meteo.');
  const host = key ? 'https://customer-marine-api.open-meteo.com' : 'https://marine-api.open-meteo.com';
  const params = new URLSearchParams({
    latitude: coordinates.map(({ latitude }) => latitude).join(','),
    longitude: coordinates.map(({ longitude }) => longitude).join(','),
    current: variables,
    ...(key ? { apikey: key } : {}),
  });
  return `${host}/v1/marine?${params}`;
}

export async function getMarineConditions(coordinate: Coordinate) {
  return (await getMarineConditionsMany([coordinate]))[0];
}

export async function getMarineConditionsMany(coordinates: Coordinate[]): Promise<MarineConditions[]> {
  if (!coordinates.length) return [];
  if (coordinates.length > 40) {
    const groups = Array.from({ length: Math.ceil(coordinates.length / 40) }, (_, index) => coordinates.slice(index * 40, index * 40 + 40));
    return (await Promise.all(groups.map(getMarineConditionsMany))).flat();
  }
  const response = await fetch(endpoint(coordinates));
  if (!response.ok) throw new Error('Open-Meteo Marine Weather no respondió.');
  const body = await response.json() as MarineResponse | MarineResponse[];
  return (Array.isArray(body) ? body : [body]).map(normalize);
}

export function isBeachPlace(place: { category: string; name: string }) {
  return /playa|beach|surf/i.test(`${place.category} ${place.name}`);
}
