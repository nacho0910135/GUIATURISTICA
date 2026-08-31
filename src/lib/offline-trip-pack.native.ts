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
  commerces: Record<string, unknown>[];
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
    ? await supabase.from('commercial_services').select('id,category,subcategories,region_id,is_claimed,source,main_category,subcategory,title,description,phone_whatsapp,whatsapp,external_url,menu_url,booking_url,cover_image_url,photos,price_range,opening_hours,parking,has_parking,payment_methods,accessibility,languages,experience_type,certifications,location,owner_id,is_sponsored,claim_status,business_verified_at,business_verification_evidence_url,business_updated_at').in('region_id', regionIds).limit(1000)
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

export async function getOfflineCommerceServices(category: string) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ data: string }>('SELECT data FROM offline_trip_packs');
  const services = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    try {
      const pack = JSON.parse(row.data) as OfflineTripPack;
      for (const service of pack.commerces ?? []) if (service.category === category && typeof service.id === 'string') services.set(service.id, service);
    } catch { /* Ignore one corrupted offline pack. */ }
  }
  return [...services.values()];
}
