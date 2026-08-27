import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Modal, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';

import { ferryRoutes, getWeather, openNavigation, WEATHER_STALE_TIME } from '@/lib/logistics';
import { addDestinationReview, getDestinationReviews, getPlacesForCategory, getPlacesForProvince, type MapPlace, toggleDestinationLike } from '@/lib/places';
import { provinces } from '@/lib/provinces';
import { useApp } from '@/providers/app-provider';

function imageFor(category: string) {
  const value = category.toLowerCase();
  if (value.includes('playa') || value.includes('isla')) return require('@/assets/destinations/beach.jpg');
  if (value.includes('cultura') || value.includes('arqueolog') || value.includes('religioso')) return require('@/assets/destinations/culture.jpg');
  if (value.includes('volc') || value.includes('aventura')) return require('@/assets/destinations/volcano.jpg');
  return require('@/assets/destinations/waterfall.jpg');
}

function imageSource(place: MapPlace) {
  if (place.photos[0]) return { uri: place.photos[0] };
  return place.image_verified && place.cover_image_url ? { uri: place.cover_image_url } : imageFor(place.category);
}

function needsPaqueraFerry(place: MapPlace) {
  return place.province === 'Puntarenas' && place.latitude >= 9.45 && place.latitude <= 9.9 && place.longitude < -84.85;
}

function tourismRegion(place: MapPlace) {
  if (place.province === 'Puntarenas') {
    if (place.latitude < 9.4) return 'Pacífico Sur';
    if (place.longitude < -85) return 'Península de Nicoya';
    return 'Pacífico Central';
  }
  if (place.province === 'Alajuela') return place.latitude > 10.15 ? 'Llanuras del Norte' : 'Valle Central';
  if (place.province === 'Limón') return 'Caribe';
  if (['San José', 'Heredia', 'Cartago'].includes(place.province)) return 'Valle Central';
  return place.province;
}

const SAN_JOSE = { latitude: 9.932, longitude: -84.08 };
type Coordinates = { latitude: number; longitude: number };

function distanceKm(from: Coordinates, to: Coordinates) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const lat = radians(to.latitude - from.latitude);
  const lng = radians(to.longitude - from.longitude);
  const a = Math.sin(lat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function travelTimeFromSanJose(place: MapPlace) {
  // ponytail: estimate only; replace with a routing API when exact live traffic matters.
  const hours = distanceKm(SAN_JOSE, place) * 1.35 / 52 + (needsPaqueraFerry(place) ? 1.8 : 0);
  return Math.max(0.3, hours).toFixed(1);
}

export default function ProvinceCatalogScreen() {
  const { category: rawCategory, province: rawProvince } = useLocalSearchParams<{ category?: string; province?: string }>();
  const { formatPrice, language, requireAuth, session, setVisitorType, visitorType } = useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<MapPlace>();
  const [sortBy, setSortBy] = useState<'rating' | 'nearby'>('rating');
  const [userLocation, setUserLocation] = useState<Coordinates>();
  const province = provinces.find((item) => item.name === rawProvince) ?? provinces[0];
  const scopeTitle = rawCategory || province.name;
  const scopeKey = rawCategory ? `category-${rawCategory}` : `province-${province.code}`;
  const places = useQuery({
    queryKey: ['places', scopeKey, session?.user.id],
    queryFn: () => rawCategory ? getPlacesForCategory(rawCategory, session?.user.id) : getPlacesForProvince(province.name, session?.user.id),
    staleTime: 10 * 60 * 1000,
  });
  const sortedPlaces = useMemo(() => [...(places.data ?? [])].sort((a, b) => sortBy === 'nearby' && userLocation
    ? distanceKm(userLocation, a) - distanceKm(userLocation, b)
    : b.average_rating - a.average_rating || b.reviews_count - a.reviews_count), [places.data, sortBy, userLocation]);

  const sortNearby = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return Alert.alert('Descubriendo CR', language === 'es' ? 'Necesitamos permiso de ubicación para ordenar por cercanía.' : 'Location permission is required to sort by proximity.');
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setUserLocation(position.coords);
    setSortBy('nearby');
  };

  const like = async (place: MapPlace) => {
    if (!requireAuth(language === 'es' ? 'Dar me gusta a un destino' : 'Like a destination') || !session) return;
    try {
      await toggleDestinationLike(place.id, session.user.id, place.liked);
      await queryClient.invalidateQueries({ queryKey: ['places', scopeKey] });
      setSelected((current) => current?.id === place.id ? { ...current, liked: !current.liked, likes_count: current.likes_count + (current.liked ? -1 : 1) } : current);
    } catch (reason) {
      Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : 'No se pudo actualizar el like.');
    }
  };

  return (
    <View className="flex-1 bg-ui-background dark:bg-ui-dark-background">
      <View className="bg-ui-surface dark:bg-ui-dark-surface px-5 pb-6 pt-12">
        <View className="mx-auto w-full max-w-5xl flex-row items-center">
          <Pressable accessibilityLabel={language === 'es' ? 'Volver' : 'Back'} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full bg-white/10" onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </Pressable>
          <View className="ml-4 flex-1"><Text className="text-3xl font-black text-white">{scopeTitle}</Text><Text className="mt-1 text-[#a8b0aa]">{rawCategory ? (language === 'es' ? 'Todo Costa Rica' : 'Across Costa Rica') : (language === 'es' ? 'Lugares para descubrir' : 'Places to discover')}</Text></View>
          <View className="flex-row overflow-hidden rounded-xl border border-white/30">{(['tico', 'foreigner'] as const).map((item) => <Pressable accessibilityLabel={item === 'tico' ? 'Modo Tico' : 'Foreigner mode'} accessibilityRole="button" className={visitorType === item ? 'bg-white px-3 py-2' : 'px-3 py-2'} key={item} onPress={() => setVisitorType(item)}><Text className={visitorType === item ? 'text-xs font-black text-[#002b7f]' : 'text-xs font-bold text-white'}>{item === 'tico' ? 'Tico' : 'Foreigner'}</Text></Pressable>)}</View>
        </View>
      </View>
      <View className="border-b border-ui-border dark:border-ui-dark-border bg-ui-surface dark:bg-ui-dark-surface px-5 pb-5"><View className="mx-auto w-full max-w-5xl flex-row gap-3"><Pressable accessibilityRole="button" className={sortBy === 'rating' ? 'flex-1 flex-row items-center justify-center rounded-2xl bg-ui-primary dark:bg-ui-dark-primary px-4 py-3' : 'flex-1 flex-row items-center justify-center rounded-2xl border border-white/15 px-4 py-3'} onPress={() => setSortBy('rating')}><MaterialCommunityIcons name="star" size={20} color={sortBy === 'rating' ? 'white' : '#ffac16'} /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Mejor calificados' : 'Top rated'}</Text></Pressable><Pressable accessibilityRole="button" className={sortBy === 'nearby' ? 'flex-1 flex-row items-center justify-center rounded-2xl bg-ui-secondary dark:bg-ui-dark-secondary px-4 py-3' : 'flex-1 flex-row items-center justify-center rounded-2xl border border-white/15 px-4 py-3'} onPress={() => void sortNearby()}><MaterialCommunityIcons name="crosshairs-gps" size={20} color="white" /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Más cercanos' : 'Nearest'}</Text></Pressable></View></View>
      <FlatList
        contentContainerStyle={{ gap: 24, padding: 20, paddingBottom: 48, width: '100%', maxWidth: 1040, alignSelf: 'center' }}
        data={sortedPlaces}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={places.isPending ? <ActivityIndicator className="py-16" color="#00c98d" size="large" /> : <Text className="py-16 text-center font-bold text-[#b8b4af]">{places.isError ? 'No se pudieron cargar los sitios desde Supabase.' : 'Aún no hay sitios publicados para esta provincia.'}</Text>}
        renderItem={({ item }) => (
          <View className="overflow-hidden rounded-[30px] border border-ui-border dark:border-ui-dark-border bg-ui-surface dark:bg-ui-dark-surface">
            <View className="relative">
              <Image contentFit="cover" source={imageSource(item)} style={{ height: 240, width: '100%' }} transition={180} />
              <View className="absolute inset-0 bg-black/15" />
              <View className="absolute left-5 top-5 rounded-full bg-black/55 px-4 py-2"><Text className="font-black text-white">{item.province}</Text></View>
              <View className="absolute bottom-4 left-5 rounded-full bg-ui-primary dark:bg-ui-dark-primary px-4 py-2"><Text className="font-black text-white">{tourismRegion(item)}</Text></View>
              <View className="absolute bottom-4 right-5 rounded-full bg-black/60 px-4 py-2"><Text className="font-black text-white">{item.difficulty || 'Consultar'}</Text></View>
            </View>
            <View className="p-6">
              <Text className="text-2xl font-black text-white">{item.name}</Text>
              <Text className="mt-2 text-base leading-6 text-ui-text-muted dark:text-ui-dark-text-muted" numberOfLines={2}>{item.description || 'Información en proceso de verificación.'}</Text>
              <View className="mt-4 flex-row flex-wrap gap-2"><View className="flex-row items-center rounded-xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft px-3 py-2"><MaterialCommunityIcons name="clock-outline" size={18} color="#a9c8ff" /><Text className="ml-2 font-black text-[#dce8ff]">~{travelTimeFromSanJose(item)}h {language === 'es' ? 'desde SJ' : 'from SJ'}</Text></View><View className="flex-row items-center rounded-xl bg-white/5 px-3 py-2"><MaterialCommunityIcons name="star" size={18} color="#ffac16" /><Text className="ml-2 font-black text-white">{item.average_rating ? item.average_rating.toFixed(1) : '—'} / 5</Text></View></View>
              <View className="mt-5 h-px bg-white/10" />
              <View className="mt-5 flex-row items-end justify-between">
                <View><Text className="text-xs font-bold uppercase tracking-wider text-[#9a958f]">{language === 'es' ? 'Tarifa Tico' : 'Foreigner price'}</Text><Text className="mt-1 text-xl font-black text-ui-primary dark:text-ui-dark-primary">{visitorType === 'tico' ? (item.price_national_crc == null ? 'Consultar' : item.price_national_crc === 0 ? 'Gratis' : formatPrice(item.price_national_crc)) : (item.price_foreigner_usd == null ? 'Check price' : item.price_foreigner_usd === 0 ? 'Free' : `$${item.price_foreigner_usd.toFixed(2)}`)}</Text></View>
                <View className="flex-row items-center gap-3">
                  <Pressable accessibilityLabel="Me gusta" className="flex-row items-center rounded-full px-3 py-3" onPress={() => void like(item)}><MaterialCommunityIcons name={item.liked ? 'heart' : 'heart-outline'} size={24} color={item.liked ? '#ff557d' : '#a8a29c'} /><Text className="ml-2 font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{item.likes_count}</Text></Pressable>
                  <Pressable accessibilityRole="button" className="rounded-2xl bg-ui-primary dark:bg-ui-dark-primary px-6 py-3" onPress={() => setSelected(item)}><Text className="font-black text-white">{language === 'es' ? 'Ver' : 'View'}</Text></Pressable>
                </View>
              </View>
            </View>
          </View>
        )}
      />
      <DestinationModal key={selected?.id ?? 'closed'} language={language} onClose={() => setSelected(undefined)} onLike={like} place={selected} />
    </View>
  );
}

function DestinationModal({ language, onClose, onLike, place }: { language: 'es' | 'en'; onClose: () => void; onLike: (place: MapPlace) => Promise<void>; place?: MapPlace }) {
  const { formatPrice, requireAuth, session, visitorType } = useApp();
  const queryClient = useQueryClient();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset>();
  const [sending, setSending] = useState(false);
  const reviews = useQuery({ queryKey: ['destination-reviews', place?.id], queryFn: () => getDestinationReviews(place!.id), enabled: Boolean(place && commentsOpen) });
  const weather = useQuery({ queryKey: ['weather', 'destination', place?.id, language], queryFn: () => getWeather(place!, language), enabled: Boolean(place), staleTime: WEATHER_STALE_TIME });
  if (!place) return null;
  const ferry = needsPaqueraFerry(place) ? ferryRoutes[0] : undefined;
  const visitPrice = visitorType === 'tico' ? (place.price_national_crc == null ? 'Consultar' : place.price_national_crc === 0 ? 'Gratis' : formatPrice(place.price_national_crc)) : (place.price_foreigner_usd == null ? 'Check price' : place.price_foreigner_usd === 0 ? 'Free' : `$${place.price_foreigner_usd.toFixed(2)}`);

  const pickPhoto = async () => {
    if (!requireAuth(language === 'es' ? 'Adjuntar una foto' : 'Attach a photo')) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.9 });
    if (!result.canceled) setPhoto(result.assets[0]);
  };
  const sendReview = async () => {
    if (!requireAuth(language === 'es' ? 'Publicar un comentario' : 'Post a comment') || !session || (!comment.trim() && !photo)) return;
    setSending(true);
    try {
      await addDestinationReview(place.id, session.user.id, rating, comment, photo);
      setComment(''); setPhoto(undefined); setRating(5);
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['destination-reviews', place.id] }), queryClient.invalidateQueries({ queryKey: ['places', 'province'] })]);
    } catch (reason) { Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : 'No se pudo publicar el comentario.'); }
    finally { setSending(false); }
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View className="flex-1 items-center justify-center bg-black/75 p-3 md:p-8">
        <View className="max-h-full w-full max-w-5xl overflow-hidden rounded-[30px] bg-ui-surface dark:bg-ui-dark-surface">
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="relative">
              <Image contentFit="cover" source={imageSource(place)} style={{ height: 340, width: '100%' }} />
              <View className="absolute inset-0 bg-black/20" />
              <View className="absolute left-5 top-5 rounded-full bg-black/55 px-4 py-2"><Text className="font-black text-white">{place.province} · {tourismRegion(place)}</Text></View>
              <View className="absolute right-4 top-4 flex-row gap-2">
                <Pressable className="h-12 w-12 items-center justify-center rounded-full bg-black/55" onPress={() => void Share.share({ message: `${place.name}${place.source_url ? `\n${place.source_url}` : ''}` })}><MaterialCommunityIcons name="share-variant-outline" size={23} color="white" /></Pressable>
                <Pressable accessibilityLabel="Cerrar" className="h-12 w-12 items-center justify-center rounded-full bg-black/55" onPress={onClose}><MaterialCommunityIcons name="close" size={28} color="white" /></Pressable>
              </View>
              <View className="absolute bottom-0 left-0 right-0 bg-black/55 px-6 pb-6 pt-14"><View className="flex-row items-center gap-2"><View className="rounded-lg bg-ui-primary dark:bg-ui-dark-primary px-3 py-2"><Text className="font-black text-white">{place.category}</Text></View>{place.average_rating ? <View className="rounded-lg bg-[#ffac16] px-3 py-2"><Text className="font-black text-white">★ {place.average_rating.toFixed(1)} ({place.reviews_count})</Text></View> : null}</View><Text className="mt-3 text-3xl font-black text-white md:text-4xl">{place.name}</Text></View>
            </View>
            {place.photos.length > 1 ? <ScrollView horizontal contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingTop: 20 }} showsHorizontalScrollIndicator={false}>{place.photos.map((url, index) => <Image contentFit="cover" key={url} source={{ uri: url }} style={{ borderRadius: 16, height: 100, width: 145 }} accessibilityLabel={`Foto ${index + 1} de ${place.name}`} />)}</ScrollView> : null}
            <View className="gap-6 p-5 md:p-8">
              <View className="flex-row rounded-3xl border border-ui-border dark:border-ui-dark-border bg-ui-muted dark:bg-ui-dark-muted py-5"><Stat label={language === 'es' ? 'Entrada Tico' : 'Foreigner entry'} value={visitPrice} /><Stat label={language === 'es' ? 'Dificultad' : 'Difficulty'} value={place.difficulty || (language === 'es' ? 'Consultar' : 'Check')} /><Stat label={language === 'es' ? 'Comunidad' : 'Community'} value={`♥ ${place.likes_count}`} /></View>
              {weather.data ? <View className="flex-row items-center rounded-3xl border border-ui-border dark:border-ui-dark-border bg-ui-muted dark:bg-ui-dark-muted p-5"><MaterialCommunityIcons name={weather.data.icon.startsWith('10') ? 'weather-rainy' : 'weather-partly-cloudy'} size={34} color="#23b9f2" /><View className="ml-4 flex-1"><Text className="font-black capitalize text-white">{weather.data.description}</Text><Text className="mt-1 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Humedad' : 'Humidity'} {weather.data.humidity}%</Text></View><Text className="text-3xl font-black text-white">{weather.data.temperature}°{weather.data.temperatureUnit}</Text></View> : null}
              <View><Text className="text-lg font-black uppercase tracking-wider text-[#b8b3ad]">{language === 'es' ? 'Información para tu visita' : 'Visitor information'}</Text><Text className="mt-3 text-base leading-7 text-ui-text dark:text-ui-dark-text">{place.description || (language === 'es' ? 'Información en proceso de verificación.' : 'Information is being verified.')}</Text></View>
              <View className="rounded-3xl border border-ui-border dark:border-ui-dark-border bg-ui-muted dark:bg-ui-dark-muted p-5">
                <InfoRow icon="clock-outline" label={language === 'es' ? 'Horario' : 'Hours'} value={place.schedule || (language === 'es' ? 'Consultar fuente oficial' : 'Check official source')} />
                <InfoRow icon="calendar-remove-outline" label={language === 'es' ? 'Cierre' : 'Closed'} value={place.closed_day || (language === 'es' ? 'Sin dato verificado' : 'No verified data')} />
                <InfoRow icon="cash-multiple" label={language === 'es' ? 'Tu tarifa' : 'Your price'} value={visitPrice} />
                {place.notes ? <InfoRow icon="information-outline" label={language === 'es' ? 'Importante' : 'Important'} value={place.notes} /> : null}
                <View className="mt-5 flex-row flex-wrap gap-3 border-t border-ui-border dark:border-ui-dark-border pt-5">
                  <Pressable className="flex-row items-center rounded-2xl bg-ui-secondary dark:bg-ui-dark-secondary px-5 py-3" onPress={() => void openNavigation(place.latitude, place.longitude)}><MaterialCommunityIcons name="waze" size={21} color="white" /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Ir con Waze' : 'Open in Waze'}</Text></Pressable>
                  {place.requires_sinac_booking && place.sinac_booking_url ? <Pressable className="flex-row items-center rounded-2xl bg-ui-primary dark:bg-ui-dark-primary px-5 py-3" onPress={() => void Linking.openURL(place.sinac_booking_url!)}><MaterialCommunityIcons name="ticket-confirmation-outline" size={21} color="white" /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Reservar en SINAC' : 'Book with SINAC'}</Text></Pressable> : null}
                  {place.source_url ? <Pressable className="flex-row items-center rounded-2xl border border-white/20 px-5 py-3" onPress={() => void Linking.openURL(place.source_url!)}><MaterialCommunityIcons name="shield-check-outline" size={21} color="#00e5a7" /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Fuente oficial' : 'Official source'}</Text></Pressable> : null}
                </View>
              </View>
              {ferry ? <View className="rounded-3xl border border-[#00b981]/50 bg-ui-primary-soft dark:bg-ui-dark-primary-soft p-5"><View className="flex-row items-center"><MaterialCommunityIcons name="ferry" size={30} color="#00e5a7" /><View className="ml-3"><Text className="text-lg font-black text-white">{language === 'es' ? 'Ferri recomendado' : 'Recommended ferry'}</Text><Text className="text-[#8cebcf]">{ferry.route} · {ferry.operator}</Text></View></View><Text className="mt-4 font-bold text-white">{language === 'es' ? 'Adulto' : 'Adult'} {formatPrice(ferry.adultFare)} · {language === 'es' ? 'Vehículo' : 'Vehicle'} {formatPrice(ferry.vehicleFare)} + {language === 'es' ? 'IVA' : 'VAT'}</Text><Text className="mt-2 leading-6 text-[#b7d8ce]">{language === 'es' ? 'Salidas' : 'Departures'}: {ferry.departures.join(' · ')}</Text><Pressable className="mt-4 self-start rounded-2xl bg-ui-primary dark:bg-ui-dark-primary px-5 py-3" onPress={() => void Linking.openURL(ferry.ticketUrl)}><Text className="font-black text-white">{language === 'es' ? 'Ver horarios y comprar' : 'View schedule and buy'}</Text></Pressable></View> : null}
              <Pressable className="flex-row items-center justify-between rounded-3xl border border-ui-border dark:border-ui-dark-border bg-ui-muted dark:bg-ui-dark-muted p-5" onPress={() => setCommentsOpen((open) => !open)}><View className="flex-row items-center"><MaterialCommunityIcons name="comment-text-multiple-outline" size={24} color="#00e5a7" /><Text className="ml-3 text-lg font-black text-white">{commentsOpen ? (language === 'es' ? 'Ocultar comentarios' : 'Hide comments') : `${language === 'es' ? 'Ver comentarios' : 'View comments'} (${place.reviews_count})`}</Text></View><MaterialCommunityIcons name={commentsOpen ? 'chevron-up' : 'chevron-down'} size={25} color="#aaa49e" /></Pressable>
              {commentsOpen ? <CommentsPanel comment={comment} language={language} onComment={setComment} onPhoto={pickPhoto} onRating={setRating} onSend={sendReview} photo={photo} rating={rating} reviews={reviews.data} sending={sending} /> : null}
            </View>
          </ScrollView>
          <View className="flex-row items-center justify-between border-t border-ui-border dark:border-ui-dark-border bg-ui-surface dark:bg-ui-dark-surface p-4"><Pressable className="flex-row items-center rounded-2xl border border-white/15 px-5 py-3" onPress={() => void onLike(place)}><MaterialCommunityIcons name={place.liked ? 'heart' : 'heart-outline'} size={24} color={place.liked ? '#ff557d' : 'white'} /><Text className="ml-2 font-black text-white">{place.likes_count}</Text></Pressable><Pressable className="rounded-2xl bg-ui-primary dark:bg-ui-dark-primary px-7 py-3" onPress={onClose}><Text className="font-black text-white">{language === 'es' ? 'Cerrar ficha' : 'Close'}</Text></Pressable></View>
        </View>
      </View>
    </Modal>
  );
}

function CommentsPanel({ comment, language, onComment, onPhoto, onRating, onSend, photo, rating, reviews, sending }: { comment: string; language: 'es' | 'en'; onComment: (value: string) => void; onPhoto: () => Promise<void>; onRating: (value: number) => void; onSend: () => Promise<void>; photo?: ImagePicker.ImagePickerAsset; rating: number; reviews?: Awaited<ReturnType<typeof getDestinationReviews>>; sending: boolean }) {
  return <View className="gap-4"><View className="rounded-3xl border border-ui-border dark:border-ui-dark-border bg-ui-muted dark:bg-ui-dark-muted p-5"><View className="flex-row gap-1">{[1,2,3,4,5].map((star) => <Pressable key={star} onPress={() => onRating(star)}><MaterialCommunityIcons name={star <= rating ? 'star' : 'star-outline'} size={27} color="#ffac16" /></Pressable>)}</View><TextInput className="mt-4 min-h-24 rounded-2xl bg-ui-surface dark:bg-ui-dark-surface px-4 py-3 text-white" maxLength={800} multiline onChangeText={onComment} placeholder={language === 'es' ? 'Compartí tu experiencia…' : 'Share your experience…'} placeholderTextColor="#827d77" textAlignVertical="top" value={comment} />{photo ? <Image source={{ uri: photo.uri }} contentFit="cover" style={{ borderRadius: 16, height: 150, marginTop: 12, width: 200 }} /> : null}<View className="mt-4 flex-row justify-between"><Pressable className="flex-row items-center rounded-2xl border border-white/15 px-4 py-3" onPress={() => void onPhoto()}><MaterialCommunityIcons name="camera-plus-outline" size={21} color="#00e5a7" /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Foto' : 'Photo'}</Text></Pressable><Pressable className="rounded-2xl bg-ui-primary dark:bg-ui-dark-primary px-5 py-3" disabled={sending || (!comment.trim() && !photo)} onPress={() => void onSend()}><Text className="font-black text-white">{sending ? (language === 'es' ? 'Publicando…' : 'Posting…') : (language === 'es' ? 'Publicar' : 'Post')}</Text></Pressable></View></View>{reviews?.map((review) => <View className="rounded-3xl bg-ui-muted dark:bg-ui-dark-muted p-5" key={review.id}><View className="flex-row items-center">{review.avatar_url ? <Image source={{ uri: review.avatar_url }} contentFit="cover" style={{ borderRadius: 22, height: 44, width: 44 }} /> : <View className="h-11 w-11 items-center justify-center rounded-full bg-ui-primary dark:bg-ui-dark-primary"><Text className="font-black text-white">{review.author_name.slice(0,1)}</Text></View>}<View className="ml-3 flex-1"><Text className="font-black text-white">{review.author_name}</Text><Text className="text-[#ffac16]">{'★'.repeat(review.rating)}</Text></View><Text className="text-xs text-[#8f8983]">{new Date(review.created_at).toLocaleDateString(language === 'es' ? 'es-CR' : 'en-US')}</Text></View>{review.comment ? <Text className="mt-4 text-base leading-6 text-ui-text dark:text-ui-dark-text">{review.comment}</Text> : null}{review.photos?.[0] ? <Image source={{ uri: review.photos[0] }} contentFit="cover" style={{ borderRadius: 18, height: 220, marginTop: 14, width: '100%' }} /> : null}</View>)}</View>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View className="flex-1 items-center border-r border-ui-border dark:border-ui-dark-border px-2 last:border-r-0"><Text className="text-center text-xs font-bold text-[#9d9892]">{label}</Text><Text className="mt-2 text-center text-lg font-black text-white">{value}</Text></View>;
}

function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; value: string }) {
  return <View className="mb-4 flex-row items-start last:mb-0"><MaterialCommunityIcons name={icon} size={22} color="#00e5a7" /><View className="ml-3 flex-1"><Text className="text-xs font-bold uppercase tracking-wider text-[#8f8983]">{label}</Text><Text className="mt-1 leading-6 text-white">{value}</Text></View></View>;
}
