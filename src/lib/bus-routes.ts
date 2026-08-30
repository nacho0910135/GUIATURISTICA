import { supabase } from '@/lib/supabase';

export type BusRoute = {
  source_key: string;
  codigo_ruta: string | null;
  codigo_ramal: string | null;
  codigo_fraccionamiento: string | null;
  route_name: string;
  company_name: string | null;
  fare_crc: number | null;
  senior_fare_crc: number | null;
  distance_km: number | null;
  resolution: string | null;
  effective_date: string | null;
  source_updated_at: string;
};

export type BusRoutePage = { routes: BusRoute[]; total: number };
export const BUS_ROUTE_PAGE_SIZE = 50;

export async function getBusRoutes(query: string, page: number): Promise<BusRoutePage> {
  const term = query.trim().replace(/[,%]/g, ' ');
  let request = supabase
    .from('aresep_bus_tariffs')
    .select('source_key,codigo_ruta,codigo_ramal,codigo_fraccionamiento,nombre_ruta,nombre_ramal,nombre_fraccionamiento,operadores,tarifa_regular,tarifa_adulto_mayor,promedio_km_viaje,resolucion,fecha_vigencia,source_updated_at', { count: 'exact' })
    .order('nombre_fraccionamiento', { ascending: true })
    .range(page * BUS_ROUTE_PAGE_SIZE, page * BUS_ROUTE_PAGE_SIZE + BUS_ROUTE_PAGE_SIZE - 1);

  if (term) request = request.or(`nombre_fraccionamiento.ilike.%${term}%,nombre_ramal.ilike.%${term}%,nombre_ruta.ilike.%${term}%`);
  const { data, error, count } = await request;
  if (error) throw error;

  return {
    total: count ?? 0,
    routes: (data ?? []).map((route) => ({
      source_key: route.source_key,
      codigo_ruta: route.codigo_ruta,
      codigo_ramal: route.codigo_ramal,
      codigo_fraccionamiento: route.codigo_fraccionamiento,
      route_name: route.nombre_fraccionamiento || route.nombre_ramal || route.nombre_ruta || 'Ruta sin nombre publicado',
      company_name: route.operadores,
      fare_crc: route.tarifa_regular === null ? null : Number(route.tarifa_regular),
      senior_fare_crc: route.tarifa_adulto_mayor === null ? null : Number(route.tarifa_adulto_mayor),
      distance_km: route.promedio_km_viaje === null ? null : Number(route.promedio_km_viaje),
      resolution: route.resolucion,
      effective_date: route.fecha_vigencia,
      source_updated_at: route.source_updated_at,
    })),
  };
}
