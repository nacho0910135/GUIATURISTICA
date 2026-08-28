# Descubriendo CR

Base móvil guest-first para descubrir Costa Rica desde Android e iOS con un solo repositorio. Usa Expo SDK 54, Expo Router, TypeScript, NativeWind, Reanimated, react-native-maps y Supabase.

## Ejecutar

```bash
npm install
npm start
```

Luego abrí el proyecto en Expo Go, un development build o los simuladores con `npm run android` / `npm run ios`.

El mapa y la caché con AsyncStorage funcionan en Expo Go. Los anuncios nativos están deshabilitados en esta variante.

## Rutas

- `src/app/(tabs)`: Explorar, Fauna CR, Comercios, Logística y Perfil.
- `src/app/(aux)/auth-modal.tsx`: modal solicitado desde cualquier acción protegida.
- `src/lib/supabase.ts`: cliente público con sesión persistente y renovación en primer plano.
- `src/providers/app-provider.tsx`: sesión, i18n ES/EN, moneda y tipo de cambio.

## Contratos de Supabase

El header consulta la fila más reciente de `system_exchange_rates` usando `rate_buy`, `rate_sell`, `updated_at` y `source`; muestra `rate_buy` para la conversión USD → CRC. El catálogo provincial consulta `destinations` por igualdad exacta de `province` y muestra sus imágenes publicadas. Si la consulta falla, la interfaz muestra el error real y no sustituye la base con destinos de ejemplo.

Todas las tablas públicas deben tener RLS habilitado. Las lecturas anónimas deben limitarse a contenido publicado; likes, comentarios, fotos, follows y favoritos deben usar políticas con propiedad por `auth.uid()`.

## Google OAuth

Habilitá Google en Supabase Auth y agregá `descubriendocr://auth/callback` a la lista de Redirect URLs. Para Expo Go, agregá también la URL que produzca `Linking.createURL('auth/callback')` en tu entorno de desarrollo. Los identificadores nativos son `cr.descubriendo.app`.

## Mapas en builds de tienda

El mapa principal usa react-native-maps con teselas de OpenStreetMap en Android/iOS, sin credenciales nativas y compatible con Expo Go. La versión web conserva Mapbox GL.

Los límites y centros de las siete provincias provienen de `CR_distritos_geojson` y se distribuyen bajo Apache-2.0 con los cambios descritos en `THIRD_PARTY_NOTICES.md`. Para regenerar el archivo móvil desde una copia de la fuente:

```bash
node scripts/generate-provinces.mjs "/ruta/a/CR_distritos_geojson-master/geojson"
npm run check:map
```

## Fauna CR

El catálogo consulta `fauna_species_public`, una vista que no expone `approx_location`. Para especies endémicas o con estado distinto de preocupación menor, la interfaz muestra únicamente la provincia. Las fotos se re-renderizan a JPEG antes de subirlas al bucket público `fauna-photos`, eliminando metadatos GPS y limitando el lado mayor a 1600 px.

Las acciones sociales requieren sesión: `mark_fauna_seen` incrementa el contador, `likes` y `user_follows` reutilizan las tablas existentes, y `fauna_comments` limita cada comentario a 500 caracteres. La comprobación mínima del contrato anti-poaching se ejecuta con:

```bash
npm run check:fauna
```

## Logística, clima y modo offline

Copiá `.env.example` a `.env.local` y agregá las claves públicas de OpenWeatherMap y WorldTides:

```env
EXPO_PUBLIC_OPENWEATHER_API_KEY=tu_clave
EXPO_PUBLIC_WORLDTIDES_API_KEY=tu_clave
```

TanStack Query conserva clima por 30 minutos, mareas por 3 horas y persiste el caché durante 7 días mediante AsyncStorage.

Verificá el RPC PostGIS y los destinos costeros con:

```bash
npm run check:logistics
```

## Comercios, monetización y producción

El directorio consulta `vw_ranked_commercial_services`: primero ordena por `avg_rating`, luego por cantidad de reseñas y finalmente por nombre. `is_sponsored` aplica únicamente el marco dorado, nunca cambia la posición orgánica. El bucket público `business-photos` acepta imágenes de hasta 6 MB y sus escrituras están limitadas por carpeta de usuario mediante RLS.

Copiá `.env.example` a `.env.local`. En EAS configurá `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, los dos IDs de app y unidades de banner de AdMob, y `EXPO_PUBLIC_BILLING_URL`. Si faltan IDs reales, el build usa los App IDs de prueba de Google y no muestra banners en producción.

El checkout no se simula en el cliente: `subscriptions` es de solo lectura para el usuario y debe actualizarse desde el webhook del proveedor. El enlace externo se reserva para planes B2B y web; No-Ads debe conectarse a las compras de App Store/Google Play antes de publicar las apps nativas.

```bash
npm run build:android:aab
npm run build:android:apk
npm run build:ios:ipa
```

Android genera AAB en `production` y APK en `preview`; iOS genera IPA en `production`. Antes de publicar, marcá en Google Play Console que la app contiene anuncios.

## Verificación

```bash
npm run typecheck
npm run lint
npx expo export --platform web
```
