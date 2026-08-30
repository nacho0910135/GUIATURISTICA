import { supabase } from '@/lib/supabase';

export type BusSchedules = { weekday: string[]; saturday: string[]; sunday: string[] };

export type BusRoute = {
  source_key: string;
  source_url: string;
  route_name: string;
  origin_city: string;
  destination_city: string;
  company_name: string | null;
  schedules: BusSchedules;
  fare_crc: number;
  fare_kind: 'estimated' | 'official';
  terminal_name: string | null;
  terminal_waze_url: string | null;
  terminal_source_url: string | null;
  last_verified_at: string;
};

export async function getBusRoutes(query: string): Promise<BusRoute[]> {
  const term = query.trim().replace(/[,%]/g, ' ');
  let request = supabase
    .from('tourist_bus_routes')
    .select('source_key,source_url,route_name,origin_city,destination_city,company_name,schedules,fare_crc,fare_kind,terminal_name,terminal_waze_url,terminal_source_url,last_verified_at')
    .eq('is_published', true)
    .order('route_name', { ascending: true });

  if (term) request = request.ilike('route_name', `%${term}%`);
  const { data, error } = await request;
  if (error) throw error;

  return (data ?? []).map((route) => ({
    ...route,
    fare_crc: Number(route.fare_crc),
    fare_kind: route.fare_kind as BusRoute['fare_kind'],
    schedules: route.schedules as BusSchedules,
  }));
}
