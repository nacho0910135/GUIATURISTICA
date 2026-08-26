# Descubriendo CR

Base móvil guest-first para descubrir Costa Rica desde Android e iOS con un solo repositorio. Usa Expo SDK 57, Expo Router, TypeScript, NativeWind, Reanimated, `react-native-maps` y Supabase.

## Ejecutar

```bash
npm install
npm start
```

Luego abrí el proyecto en Expo Go, un development build o los simuladores con `npm run android` / `npm run ios`.

## Rutas

- `src/app/(tabs)`: Explorar, Fauna CR, Comercios, Logística y Perfil.
- `src/app/(aux)/auth-modal.tsx`: modal solicitado desde cualquier acción protegida.
- `src/lib/supabase.ts`: cliente público con sesión persistente y renovación en primer plano.
- `src/providers/app-provider.tsx`: sesión, i18n ES/EN, moneda y tipo de cambio.

## Contratos de Supabase

El header consulta la fila más reciente de `system_exchange_rates` usando `rate_buy`, `rate_sell`, `updated_at` y `source`; muestra `rate_buy` para la conversión USD → CRC. El mapa consume el RPC PostGIS `places_in_bounds(min_lat, min_lng, max_lat, max_lng)`, que debe devolver `id`, `name`, `province`, `category`, `latitude` y `longitude`. Si cualquiera de los dos contratos aún no existe o no está expuesto a `anon`, la UI conserva datos de referencia para que la exploración guest-first siga funcionando.

Todas las tablas públicas deben tener RLS habilitado. Las lecturas anónimas deben limitarse a contenido publicado; likes, comentarios, fotos, follows y favoritos deben usar políticas con propiedad por `auth.uid()`.

## Google OAuth

Habilitá Google en Supabase Auth y agregá `descubriendocr://auth/callback` a la lista de Redirect URLs. Para Expo Go, agregá también la URL que produzca `Linking.createURL('auth/callback')` en tu entorno de desarrollo. Los identificadores nativos son `cr.descubriendo.app`.

## Mapas en builds de tienda

`react-native-maps` funciona en Expo Go. Antes de publicar Android, configurá una clave restringida de Google Maps mediante el config plugin; iOS usa Apple Maps por defecto y no necesita esa clave.

Los límites y centros de las siete provincias provienen de `CR_distritos_geojson` y se distribuyen bajo Apache-2.0 con los cambios descritos en `THIRD_PARTY_NOTICES.md`. Para regenerar el archivo móvil desde una copia de la fuente:

```bash
node scripts/generate-provinces.mjs "/ruta/a/CR_distritos_geojson-master/geojson"
```

## Fauna CR

El catálogo consulta `fauna_species_public`, una vista que no expone `approx_location`. Para especies endémicas o con estado distinto de preocupación menor, la interfaz muestra únicamente la provincia. Las fotos se re-renderizan a JPEG antes de subirlas al bucket público `fauna-photos`, eliminando metadatos GPS y limitando el lado mayor a 1600 px.

Las acciones sociales requieren sesión: `mark_fauna_seen` incrementa el contador, `likes` y `user_follows` reutilizan las tablas existentes, y `fauna_comments` limita cada comentario a 500 caracteres. La comprobación mínima del contrato anti-poaching se ejecuta con:

```bash
npm run check:fauna
```

## Verificación

```bash
npm run typecheck
npm run lint
npx expo export --platform web
```
