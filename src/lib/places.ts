import { supabase } from '@/lib/supabase';

export type MapPlace = {
  id: string;
  name: string;
  province: string;
  category: string;
  latitude: number;
  longitude: number;
};

export type MapBounds = { minLat: number; minLng: number; maxLat: number; maxLng: number };

export async function getPlacesInBounds(bounds: MapBounds): Promise<MapPlace[]> {
  const { data, error } = await supabase.rpc('places_in_bounds', {
    min_lat: bounds.minLat,
    min_lng: bounds.minLng,
    max_lat: bounds.maxLat,
    max_lng: bounds.maxLng,
  });
  if (error) throw error;
  return (data ?? []) as MapPlace[];
}
