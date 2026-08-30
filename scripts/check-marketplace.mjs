import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [baseMigration, taxonomyMigration, regionsMigration, secureRegionsMigration, ownerFkMigration, officialCommerceMigration, reportsMigration, commerceSync, commerce, screen, reports, province, explore, profile, claimScreen, claimGuardMigration, freshnessMigration] = await Promise.all([
  readFile(new URL('../supabase/migrations/20260828235854_local_tourism_marketplace.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260829005508_commerce_categories_and_subcategories.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260829012419_commerce_regions_and_hybrid_sources.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260829013226_secure_commercial_region_trigger.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260829013303_validate_commercial_service_owner_fk.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260829020000_sync_complete_ict_commerce.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260829001905_information_reports.sql', import.meta.url), 'utf8'),
  readFile(new URL('./sync-official-commerce.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/commerce.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/(tabs)/commerce.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/reports.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/(aux)/province.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/(tabs)/explore.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/(tabs)/profile.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/claim-business.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260830105635_reject_claims_for_claimed_businesses.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20260830112646_community_freshness_and_b2b_attribution.sql', import.meta.url), 'utf8'),
]);
const migration = `${baseMigration}\n${taxonomyMigration}`;
assert.match(regionsMigration, /create table if not exists public\.commerce_regions/);
for (const region of ['la_fortuna_arenal', 'monteverde', 'manuel_antonio', 'tamarindo', 'puerto_viejo', 'san_jose']) assert.match(regionsMigration, new RegExp(`'${region}'`));
for (const field of ['region_id', 'is_claimed', 'source']) assert.match(regionsMigration, new RegExp(`add column if not exists ${field}`));
assert.match(regionsMigration, /sync_commercial_service_region_and_claim/);
assert.match(secureRegionsMigration, /revoke all on function public\.sync_commercial_service_region_and_claim/);
assert.match(ownerFkMigration, /validate constraint commercial_services_owner_auth_users_fkey/);
assert.match(officialCommerceMigration, /2270 active records fetched/);
assert.equal((officialCommerceMigration.match(/^  \('/gm) ?? []).length, 2270);
assert.doesNotMatch(officialCommerceMigration, /^  \('[^']+', 'emergency'/m);
for (const category of ['food', 'lodging', 'adventure', 'water_activities', 'nature', 'wellness', 'guides_experiences', 'rentals_equipment', 'transport', 'shopping']) assert.match(officialCommerceMigration, new RegExp(`'${category}'`));
assert.match(commerceSync, /hits\.length !== total/);
assert.match(commerceSync, /sync_complete_ict_commerce/);

assert.match(migration, /add column if not exists category text/);
assert.match(migration, /add column if not exists subcategories text\[\]/);
for (const category of ['food', 'lodging', 'adventure', 'water_activities', 'nature', 'wellness', 'guides_experiences', 'rentals_equipment', 'transport', 'shopping', 'emergency']) assert.match(migration, new RegExp(`'${category}'`));
for (const field of ['whatsapp', 'menu_url', 'opening_hours', 'payment_methods', 'accessibility', 'languages', 'experience_type', 'booking_url', 'certifications', 'claim_status']) assert.match(migration, new RegExp(`add column if not exists ${field}`));
assert.match(migration, /commercial_service_claims/);
assert.match(migration, /request_commercial_service_claim/);
assert.match(commerce, /COMMERCE_CATEGORIES/);
assert.match(commerce, /COMMERCE_SUBCATEGORIES/);
for (const tag of ['water_activities', 'guides_experiences', 'rentals_equipment', 'fishing', 'boat_tours', 'kayak_sup', 'certified_guides', 'rent_a_car']) assert.match(commerce, new RegExp(tag));
assert.match(screen, /Filtrar por experiencia/);
assert.match(screen, /Elegí una región/);
assert.match(screen, /Comercios cerca de tu ubicación/);
assert.match(commerce, /getCommerceRegions/);
assert.match(commerce, /request\.range\(from, from \+ 999\)/);
assert.match(commerce, /distance_km: hasLocation/);
assert.match(commerce, /radius_km/);
assert.match(commerce, /recordBusinessEvent/);
assert.match(commerce, /getOwnerDashboard/);
assert.match(commerce, /featured: services\.filter\(\(service\) => service\.is_sponsored\)/);
assert.match(commerce, /organic: services\.filter\(\(service\) => !service\.is_sponsored\)/);
assert.match(claimScreen, /Reclamar negocio/);
assert.match(screen, /Panel para propietarios/);
assert.match(screen, /Espacios patrocinados/);
assert.match(screen, /rutas abiertas/);
assert.match(claimScreen, /requestCommercialServiceClaim/);
assert.match(claimScreen, /Solicitud enviada/);
assert.match(claimGuardMigration, /service_already_claimed/);
assert.match(screen, /Registrar comercio/);
for (const field of ['menuUrl', 'bookingUrl', 'parking', 'hasParking', 'paymentMethods', 'accessibility', 'languages', 'experienceType', 'certifications', 'photos']) assert.match(screen, new RegExp(field));
assert.match(screen, /setBusinessCoverPhoto/);
assert.match(screen, /Editar opciones del perfil/);
assert.match(commerce, /updateCommercialServiceProfile/);
for (const field of ['menu_url', 'booking_url', 'parking', 'has_parking', 'payment_methods', 'accessibility', 'languages', 'experience_type', 'certifications', 'photos', 'cover_image_url']) assert.match(commerce, new RegExp(field));
assert.match(reportsMigration, /create table if not exists public\.information_reports/);
for (const reportType of ['incorrect_information', 'destination_closed', 'price_changed', 'hours_outdated', 'road_affected', 'business_closed']) assert.match(reports, new RegExp(reportType));
assert.match(screen, /Reportar información/);
assert.match(province, /Reportar información incorrecta/);
assert.match(explore, /Reportar carretera afectada/);
assert.match(profile, /Reportes de información/);
assert.match(freshnessMigration, /destination_freshness_votes/);
assert.match(freshnessMigration, /get_destination_freshness/);
assert.match(freshnessMigration, /business_events_attribution_object_check/);
for (const check of ['Sigue abierto', 'Tarifa correcta', 'Aceptan tarjeta']) assert.match(province, new RegExp(check));
for (const field of ['normalizeBusinessAttribution', 'attributed_leads', 'qr_leads', 'utm_leads']) assert.match(commerce, new RegExp(field));
assert.match(screen, /leads atribuidos/);
console.log('Marketplace directory, dynamic regions, claims, registration, conversion metrics and information reports are wired.');
