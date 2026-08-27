import { supabase } from '@/lib/supabase';

export type MapPlace = {
  id: string;
  name: string;
  province: string;
  category: string;
  latitude: number;
  longitude: number;
  cover_image_url: string | null;
  status: string;
};

export async function getPlacesForProvince(province: string): Promise<MapPlace[]> {
  const { data, error } = await supabase
    .from('destinations')
    .select('id,name,province,category,latitude,longitude,cover_image_url,status')
    .eq('province', province)
    .order('name');
  if (error) throw error;
  return (data ?? []).map((place) => ({ ...place, latitude: Number(place.latitude), longitude: Number(place.longitude) })) as MapPlace[];
}
