import * as SQLite from 'expo-sqlite';

import { getBusRoutes } from '@/lib/bus-routes';
import { getDestinationsForOffline, getFerryRoutes, emergencyContacts, type Destination, type FerryRoute } from '@/lib/logistics';
import { supabase } from '@/lib/supabase';

export type OfflineTripPack = {
  zone: string;
  savedAt: string;
  destinations: Destination[];
  buses: Awaited<ReturnType<typeof getBusRoutes>>;
  ferries: FerryRoute[];
  contacts: typeof emergencyContacts;
  commerces: { id: string; title: string; category: string; phone_whatsapp: string | null; location: unknown }[];
};

let database: Promise<SQLite.SQLiteDatabase> | undefined;
function getDatabase() {
  database ??= SQLite.openDatabaseAsync('descubriendo-cr-offline.db').then(async (db) => {
    await db.execAsync('PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS offline_trip_packs (zone TEXT PRIMARY KEY NOT NULL, saved_at TEXT NOT NULL, data TEXT NOT NULL);');
    return db;
  });
  return database;
}

export async function syncOfflineTripPack(zone: string): Promise<OfflineTripPack> {
  const [destinations, touristBuses, cantonalBuses, ferries, regions] = await Promise.all([
    getDestinationsForOffline(zone), getBusRoutes('', 'tourist'), getBusRoutes('', 'cantonal'), getFerryRoutes(),
    supabase.from('commerce_regions').select('id').eq('province', zone).eq('active', true),
  ]);
  if (regions.error) throw regions.error;
  const regionIds = (regions.data ?? []).map((region) => region.id);
  const commerces = regionIds.length
    ? await supabase.from('commercial_services').select('id,title,category,phone_whatsapp,location').in('region_id', regionIds).limit(1000)
    : { data: [], error: null };
  if (commerces.error) throw commerces.error;
  const pack: OfflineTripPack = { zone, savedAt: new Date().toISOString(), destinations, buses: [...touristBuses, ...cantonalBuses], ferries, contacts: emergencyContacts, commerces: commerces.data ?? [] };
  const db = await getDatabase();
  await db.runAsync('INSERT INTO offline_trip_packs (zone, saved_at, data) VALUES (?, ?, ?) ON CONFLICT(zone) DO UPDATE SET saved_at = excluded.saved_at, data = excluded.data', zone, pack.savedAt, JSON.stringify(pack));
  return pack;
}

export async function getOfflineTripPack(zone: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ data: string }>('SELECT data FROM offline_trip_packs WHERE zone = ?', zone);
  try { return row ? JSON.parse(row.data) as OfflineTripPack : null; } catch { return null; }
}
