import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, AppState, FlatList, Linking, Modal, Pressable, ScrollView, Share, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { InformationReportModal } from '@/components/information-report-modal';
import { ferryRoutes, getDestinationAlert, getTides, getWeather, openNavigation, TIDES_STALE_TIME, WEATHER_STALE_TIME } from '@/lib/logistics';
import { addDestinationPhoto, addDestinationReview, getDestinationReviews, getPlacesForCategory, getPlacesForProvince, type MapPlace, type ValidationAuthority, toggleDestinationLike } from '@/lib/places';
import { provinces } from '@/lib/provinces';
import { useApp } from '@/providers/app-provider';
import { useAppTheme } from '@/theme/theme-provider';

function imageSource(place: MapPlace) {
  if (place.image_verified && place.cover_image_url) return { uri: place.cover_image_url };
  return place.photos[0] ? { uri: place.photos[0] } : undefined;
}

function DestinationImage({ height, place }: { height: number; place: MapPlace }) {
  const source = imageSource(place);
  return source ? <Image contentFit="cover" source={source} style={{ height, width: '100%' }} transition={180} /> : <View className="items-center justify-center bg-ui-muted dark:bg-ui-dark-muted" style={{ height }}><MaterialCommunityIcons name="image-off-outline" size={42} color="#68737A" /></View>;
}

function usesVerifiedCover(place: MapPlace) {
  return place.image_verified && Boolean(place.cover_image_url);
}

function ValidationBadge({ authorities = [], checkedAt, evidenceUrl, language }: { authorities?: ValidationAuthority[]; checkedAt?: string | null; evidenceUrl?: string | null; language: 'es' | 'en' }) {
  const documented = Boolean(authorities.length && checkedAt && evidenceUrl);
  const label = documented
    ? authorities.map((authority) => `${language === 'es' ? 'Fuente oficial' : 'Official source'} ${authority}`).join(' · ')
    : language === 'es' ? 'Fuente no verificada' : 'Unverified source';
  return <View><View accessibilityLabel={label} className={`flex-row items-center self-start rounded-full px-3 py-1.5 ${documented ? 'bg-[#0B6B4F]' : 'bg-ui-muted dark:bg-white/10'}`}><MaterialCommunityIcons name={documented ? 'shield-check' : 'shield-alert-outline'} size={15} color={documented ? 'white' : '#8f9bb2'} /><Text className={`ml-1.5 text-[11px] font-black ${documented ? 'text-white' : 'text-ui-text-muted dark:text-ui-dark-text-muted'}`}>{label}</Text></View>{documented ? <Text className="mt-1 text-[10px] font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Última verificación' : 'Last verified'}: {new Date(checkedAt!).toLocaleDateString(language === 'es' ? 'es-CR' : 'en-US')}</Text> : null}</View>;
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

type Coordinates = { latitude: number; longitude: number };

function distanceKm(from: Coordinates, to: Coordinates) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const lat = radians(to.latitude - from.latitude);
  const lng = radians(to.longitude - from.longitude);
  const a = Math.sin(lat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ProvinceCatalogScreen() {
  const { category: rawCategory, destinationId, province: rawProvince } = useLocalSearchParams<{ category?: string; destinationId?: string; province?: string }>();
  const { formatPrice, language, requireAuth, session, setVisitorType, visitorType } = useApp();
  const { colors } = useAppTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<MapPlace>();
  const [userLocation, setUserLocation] = useState<Coordinates>();
  const province = provinces.find((item) => item.name === rawProvince) ?? provinces[0];
  const scopeTitle = rawCategory ? categoryLabel(rawCategory, language) : province.name;
  const scopeKey = rawCategory ? `category-${rawCategory}` : `province-${province.code}`;
  const places = useQuery({
    queryKey: ['places', 'v2', scopeKey, session?.user.id],
    queryFn: () => rawCategory ? getPlacesForCategory(rawCategory, session?.user.id) : getPlacesForProvince(province.name, session?.user.id),
    staleTime: 10 * 60 * 1000,
  });
  useFocusEffect(useCallback(() => {
    const refresh = () => void queryClient.refetchQueries({ queryKey: ['places'], type: 'active' });
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [queryClient]));
  useEffect(() => {
    if (!destinationId || !places.data) return;
    const match = places.data.find((place) => place.id === destinationId);
    if (match) setSelected(match);
  }, [destinationId, places.data]);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        let permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) return;
        const cached = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000, requiredAccuracy: 5000 });
        if (active && cached) setUserLocation(cached.coords);
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (active) setUserLocation(current.coords);
      } catch {
        // Keep the catalog usable if the device location is unavailable.
      }
    })();
    return () => { active = false; };
  }, []);
  const sortedPlaces = useMemo(() => [...(places.data ?? [])].sort((a, b) => userLocation
    ? distanceKm(userLocation, a) - distanceKm(userLocation, b)
    : 0), [places.data, userLocation]);

  const like = async (place: MapPlace) => {
    if (!requireAuth(language === 'es' ? 'Dar me gusta a un destino' : 'Like a destination') || !session) return;
    try {
      await toggleDestinationLike(place.id, session.user.id, place.liked);
      await queryClient.invalidateQueries({ queryKey: ['places'] });
      setSelected((current) => current?.id === place.id ? { ...current, liked: !current.liked, likes_count: current.likes_count + (current.liked ? -1 : 1) } : current);
    } catch (reason) {
      Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : (language === 'es' ? 'No se pudo actualizar el like.' : 'Could not update the like.'));
    }
  };

  return (
    <View className="flex-1 bg-ui-background dark:bg-ui-dark-background">
      <View className="bg-ui-surface dark:bg-ui-dark-surface px-5 pb-6 pt-12">
        <View className="mx-auto w-full max-w-5xl flex-row items-center">
          <Pressable accessibilityLabel={language === 'es' ? 'Volver' : 'Back'} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full bg-ui-muted dark:bg-white/10" onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <View className="ml-4 flex-1"><Text className="text-3xl font-black text-ui-text dark:text-ui-dark-text">{scopeTitle}</Text><Text className="mt-1 text-ui-text-muted dark:text-ui-dark-text-muted">{rawCategory ? (language === 'es' ? 'Todo Costa Rica' : 'Across Costa Rica') : (language === 'es' ? 'Lugares para descubrir' : 'Places to discover')}</Text></View>
          <View className="flex-row overflow-hidden rounded-xl border border-ui-border dark:border-white/30">{(['tico', 'foreigner'] as const).map((item) => <Pressable accessibilityLabel={item === 'tico' ? 'Modo Tico' : 'Foreigner mode'} accessibilityRole="button" className={visitorType === item ? 'bg-white px-3 py-2' : 'px-3 py-2'} key={item} onPress={() => setVisitorType(item)}><Text className={visitorType === item ? 'text-xs font-black text-[#002b7f]' : 'text-xs font-bold text-ui-text dark:text-ui-dark-text'}>{item === 'tico' ? 'Tico' : 'Foreigner'}</Text></Pressable>)}</View>
        </View>
      </View>
      <FlatList
        contentContainerStyle={{ gap: 24, padding: 20, paddingBottom: 48, width: '100%', maxWidth: 1040, alignSelf: 'center' }}
        data={sortedPlaces}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={places.isPending ? <ActivityIndicator className="py-16" color="#00c98d" size="large" /> : <Text className="py-16 text-center font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{places.isError ? (language === 'es' ? 'No se pudieron cargar los sitios.' : 'Places could not be loaded.') : (language === 'es' ? 'Aún no hay sitios publicados aquí.' : 'There are no published places here yet.')}</Text>}
        renderItem={({ item }) => (
          <Pressable accessibilityLabel={`${language === 'es' ? 'Abrir' : 'Open'} ${item.name}`} accessibilityRole="button" className="overflow-hidden rounded-[30px] border border-ui-border bg-ui-surface active:opacity-90 dark:border-ui-dark-border dark:bg-ui-dark-surface" onPress={() => setSelected(item)}>
            <View className="relative">
              <DestinationImage height={240} place={item} />
              <View className="absolute inset-0 bg-black/15" />
              <View className="absolute left-5 top-5 rounded-full bg-black/55 px-4 py-2"><Text className="font-black text-white">{item.province}</Text></View>
              {usesVerifiedCover(item) && item.image_attribution ? <View className="absolute right-4 top-4 max-w-[55%] rounded-lg bg-black/65 px-3 py-2"><Text className="text-right text-[10px] font-bold text-white" numberOfLines={1}>{language === 'es' ? 'Foto' : 'Photo'}: {item.image_attribution}</Text></View> : null}
              <View className="absolute bottom-4 left-5 rounded-full bg-ui-primary dark:bg-ui-dark-primary px-4 py-2"><Text className="font-black text-white">{tourismRegion(item)}</Text></View>
              <View className="absolute bottom-4 right-5 rounded-full bg-black/60 px-4 py-2"><Text className="font-black text-white">{difficultyLabel(item.difficulty, language)}</Text></View>
            </View>
            <View className="p-6">
              <Text className="text-2xl font-black text-ui-text dark:text-ui-dark-text">{item.name}</Text>
              <View className="mt-3"><ValidationBadge authorities={item.validated_by} checkedAt={item.verification_checked_at} evidenceUrl={item.verification_evidence_url} language={language} /></View>
              <Text className="mt-2 text-base leading-6 text-ui-text-muted dark:text-ui-dark-text-muted" numberOfLines={2}>{item.description || (language === 'es' ? 'Información en proceso de verificación.' : 'Information is being verified.')}</Text>
              <View className="mt-4 flex-row flex-wrap gap-2"><View className="flex-row items-center rounded-xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft px-3 py-2"><MaterialCommunityIcons name="map-marker-distance" size={18} color="#0B6B4F" /><Text className="ml-2 font-black text-ui-text dark:text-ui-dark-text">{userLocation ? `${distanceKm(userLocation, item).toFixed(1)} km ${language === 'es' ? 'de vos' : 'away'}` : (language === 'es' ? 'Calculando distancia…' : 'Calculating distance…')}</Text></View><View className="flex-row items-center rounded-xl bg-ui-muted dark:bg-white/5 px-3 py-2"><MaterialCommunityIcons name="star" size={18} color="#ffac16" /><Text className="ml-2 font-black text-ui-text dark:text-ui-dark-text">{item.average_rating ? item.average_rating.toFixed(1) : '—'} / 5</Text></View></View>
              <View className="mt-5 h-px bg-ui-border dark:bg-white/10" />
              <View className="mt-5 flex-row items-end justify-between">
                <View><Text className="text-xs font-bold uppercase tracking-wider text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Tarifa Tico' : 'Foreigner price'}</Text><Text className="mt-1 text-xl font-black text-ui-primary dark:text-ui-dark-primary">{visitorType === 'tico' ? (item.price_national_crc == null ? 'Consultar' : item.price_national_crc === 0 ? 'Gratis' : formatPrice(item.price_national_crc)) : (item.price_foreigner_usd == null ? 'Check price' : item.price_foreigner_usd === 0 ? 'Free' : `$${item.price_foreigner_usd.toFixed(2)}`)}</Text></View>
                <View className="flex-row items-center gap-3">
                  <Pressable accessibilityLabel={language === 'es' ? 'Me gusta' : 'Like'} className="flex-row items-center rounded-full px-3 py-3" onPress={(event) => { event.stopPropagation(); void like(item); }}><MaterialCommunityIcons name={item.liked ? 'heart' : 'heart-outline'} size={24} color={item.liked ? '#ff557d' : '#a8a29c'} /><Text className="ml-2 font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{item.likes_count}</Text></Pressable>
                  <View className="rounded-2xl bg-ui-primary px-6 py-3 dark:bg-ui-dark-primary"><Text className="font-black text-white">{language === 'es' ? 'Ver' : 'View'}</Text></View>
                </View>
              </View>
            </View>
          </Pressable>
        )}
      />
      <DestinationModal key={selected?.id ?? 'closed'} language={language} onClose={() => setSelected(undefined)} onLike={like} place={selected} />
    </View>
  );
}

function DestinationModal({ language, onClose, onLike, place }: { language: 'es' | 'en'; onClose: () => void; onLike: (place: MapPlace) => Promise<void>; place?: MapPlace }) {
  const { formatPrice, requireAuth, session, visitorType } = useApp();
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset>();
  const [communityPhotos, setCommunityPhotos] = useState<string[]>(place?.community_photos ?? []);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const [sending, setSending] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const reviews = useQuery({ queryKey: ['destination-reviews', place?.id], queryFn: () => getDestinationReviews(place!.id), enabled: Boolean(place && commentsOpen) });
  const weather = useQuery({ queryKey: ['weather', 'destination', place?.id, language], queryFn: () => getWeather(place!, language), enabled: Boolean(place), staleTime: WEATHER_STALE_TIME });
  const tides = useQuery({ queryKey: ['tides', place?.latitude.toFixed(3), place?.longitude.toFixed(3)], queryFn: () => getTides(place!), enabled: Boolean(place?.has_high_tides_risk), staleTime: TIDES_STALE_TIME });
  if (!place) return null;
  const destinationAlert = getDestinationAlert(weather.data, tides.data, language, place.has_high_tides_risk);
  const ferry = needsPaqueraFerry(place) ? ferryRoutes[0] : undefined;
  const documentedSource = Boolean(place.validated_by.length && place.verification_evidence_url && place.verification_checked_at);
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
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['destination-reviews', place.id] }), queryClient.invalidateQueries({ queryKey: ['places'] })]);
    } catch (reason) { Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : (language === 'es' ? 'No se pudo publicar el comentario.' : 'Could not publish the comment.')); }
    finally { setSending(false); }
  };
  const addPhoto = async () => {
    if (uploadingPhoto || !requireAuth(language === 'es' ? 'Subir una foto del sitio' : 'Upload a site photo') || !session) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.9, exif: false });
    if (result.canceled) return;
    setUploadingPhoto(true);
    try {
      const imageUrl = await addDestinationPhoto(place.id, session.user.id, result.assets[0]);
      setCommunityPhotos((current) => [...current, imageUrl]);
      await queryClient.invalidateQueries({ queryKey: ['places'] });
    } catch (reason) { Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : (language === 'es' ? 'No se pudo subir la foto.' : 'Could not upload the photo.')); }
    finally { setUploadingPhoto(false); }
  };

  return (
    <>
      <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View className="flex-1 items-center justify-center bg-black/75 p-3 md:p-8">
        <View className="max-h-full w-full max-w-5xl overflow-hidden rounded-[30px] bg-ui-surface dark:bg-ui-dark-surface">
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="relative">
              <DestinationImage height={340} place={place} />
              <View className="absolute inset-0 bg-black/20" />
              <View className="absolute left-5 top-5 rounded-full bg-black/55 px-4 py-2"><Text className="font-black text-white">{place.province} · {tourismRegion(place)}</Text></View>
              <View className="absolute right-4 top-4 flex-row gap-2">
                <Pressable className="h-12 w-12 items-center justify-center rounded-full bg-black/55" onPress={() => void Share.share({ message: `${place.name}${place.source_url ? `\n${place.source_url}` : ''}` })}><MaterialCommunityIcons name="share-variant-outline" size={23} color="white" /></Pressable>
                <Pressable accessibilityLabel="Cerrar" className="h-12 w-12 items-center justify-center rounded-full bg-black/55" onPress={onClose}><MaterialCommunityIcons name="close" size={28} color="white" /></Pressable>
              </View>
              <View className="absolute bottom-0 left-0 right-0 bg-black/55 px-6 pb-6 pt-14"><View className="flex-row flex-wrap items-center gap-2"><View className="rounded-lg bg-ui-primary dark:bg-ui-dark-primary px-3 py-2"><Text className="font-black text-white">{categoryLabel(place.category, language)}</Text></View>{place.average_rating ? <View className="rounded-lg bg-[#ffac16] px-3 py-2"><Text className="font-black text-white">★ {place.average_rating.toFixed(1)} ({place.reviews_count})</Text></View> : null}<ValidationBadge authorities={place.validated_by} checkedAt={place.verification_checked_at} evidenceUrl={place.verification_evidence_url} language={language} /></View><Text className="mt-3 text-3xl font-black text-white md:text-4xl">{place.name}</Text></View>
            </View>
            {usesVerifiedCover(place) && place.image_source_url ? <Pressable className="self-end px-5 pt-3" onPress={() => void Linking.openURL(place.image_source_url!)}><Text className="text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Foto' : 'Photo'}: {place.image_attribution || 'Wikimedia Commons'} · {place.image_license || (language === 'es' ? 'Ver licencia' : 'View license')}</Text></Pressable> : null}
            <View className="pt-5"><View className="flex-row items-center justify-between px-5"><Text className="flex-1 text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Fotografías subidas por nuestros usuarios' : 'Photos uploaded by our users'}</Text><Pressable accessibilityLabel={language === 'es' ? 'Subir fotografía' : 'Upload photo'} className="ml-3 h-11 w-11 items-center justify-center rounded-full bg-ui-primary dark:bg-ui-dark-primary" disabled={uploadingPhoto} onPress={() => void addPhoto()}>{uploadingPhoto ? <ActivityIndicator color="white" size="small" /> : <MaterialCommunityIcons name="plus" size={25} color="white" />}</Pressable></View>{communityPhotos.length ? <ScrollView horizontal className="mt-3" contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }} showsHorizontalScrollIndicator={false}>{communityPhotos.map((url, index) => <Pressable accessibilityLabel={language === 'es' ? `Abrir fotografía ${index + 1} de ${place.name}` : `Open photo ${index + 1} of ${place.name}`} key={`${url}-${index}`} onPress={() => setSelectedPhotoIndex(index)}><Image contentFit="cover" source={{ uri: url }} style={{ borderRadius: 16, height: 110, width: 150 }} transition={180} /></Pressable>)}</ScrollView> : <Pressable className="mt-3 flex-row items-center justify-between px-5" onPress={() => void addPhoto()}><Text className="text-sm font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Sé el primero en compartir una fotografía' : 'Be the first to share a photo'}</Text><MaterialCommunityIcons name="plus-circle-outline" size={25} color="#00c98d" /></Pressable>}</View>
            <View className="gap-6 p-5 md:p-8">
              <View className="flex-row rounded-3xl border border-ui-border dark:border-ui-dark-border bg-ui-muted dark:bg-ui-dark-muted py-5"><Stat label={language === 'es' ? 'Entrada Tico' : 'Foreigner entry'} value={visitPrice} /><Stat label={language === 'es' ? 'Dificultad' : 'Difficulty'} value={difficultyLabel(place.difficulty, language)} /><Stat label={language === 'es' ? 'Comunidad' : 'Community'} value={`♥ ${place.likes_count}`} /></View>
              {weather.data ? <View className="flex-row items-center rounded-3xl border border-ui-border dark:border-ui-dark-border bg-ui-muted dark:bg-ui-dark-muted p-5"><MaterialCommunityIcons name={weather.data.icon.startsWith('10') ? 'weather-rainy' : 'weather-partly-cloudy'} size={34} color="#23b9f2" /><View className="ml-4 flex-1"><Text className="font-black capitalize text-ui-text dark:text-ui-dark-text">{weather.data.description}</Text><Text className="mt-1 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Humedad' : 'Humidity'} {weather.data.humidity}%</Text></View><Text className="text-3xl font-black text-ui-text dark:text-ui-dark-text">{weather.data.temperature}°{weather.data.temperatureUnit}</Text></View> : null}
              <View><Text className="text-lg font-black uppercase tracking-wider text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Información para tu visita' : 'Visitor information'}</Text><Text className="mt-3 text-base leading-7 text-ui-text dark:text-ui-dark-text">{place.description || (language === 'es' ? 'Información en proceso de verificación.' : 'Information is being verified.')}</Text></View>
              <View className="rounded-3xl border border-ui-border dark:border-ui-dark-border bg-ui-muted dark:bg-ui-dark-muted p-5">
                <View className={`mb-5 rounded-2xl border p-4 ${destinationAlert.level === 'warning' ? 'border-coral-500 bg-coral-50 dark:bg-coral-500/15' : 'border-ui-secondary/40 bg-ui-surface dark:bg-ui-dark-surface'}`}><View className="flex-row items-start"><MaterialCommunityIcons name={destinationAlert.level === 'warning' ? 'alert-circle' : 'weather-partly-cloudy'} size={24} color={destinationAlert.level === 'warning' ? '#ff5d52' : '#0077A8'} /><View className="ml-3 flex-1"><Text className={`font-black ${destinationAlert.level === 'warning' ? 'text-coral-600' : 'text-ui-secondary dark:text-ui-dark-secondary'}`}>{destinationAlert.title}</Text><Text className="mt-1 leading-5 text-ui-text dark:text-ui-dark-text">{destinationAlert.detail}</Text></View></View></View>
                <InfoRow icon="clock-outline" label={language === 'es' ? 'Horario' : 'Hours'} value={place.schedule === 'Todo el día' && language === 'en' ? 'All day' : place.schedule || (language === 'es' ? 'Consultar fuente oficial' : 'Check official source')} />
                <InfoRow icon="calendar-remove-outline" label={language === 'es' ? 'Cierre' : 'Closed'} value={place.closed_day || (language === 'es' ? 'Sin dato verificado' : 'No verified data')} />
                <InfoRow icon="cash-multiple" label={language === 'es' ? 'Tu tarifa' : 'Your price'} value={visitPrice} />
                {place.requires_sinac_booking ? <InfoRow icon="ticket-confirmation-outline" label={language === 'es' ? 'Reserva oficial SINAC' : 'Official SINAC reservation'} value={language === 'es' ? 'Este parque requiere reserva. Prepará fecha, cantidad de visitantes y medio de pago en el sitio oficial.' : 'This park requires a reservation. Have your date, visitor count and payment method ready on the official site.'} /> : null}
                {place.notes ? <InfoRow icon="information-outline" label={language === 'es' ? 'Importante' : 'Important'} value={place.notes} /> : null}
                <View className="mt-5 flex-row flex-wrap gap-3 border-t border-ui-border dark:border-ui-dark-border pt-5">
                  <Pressable className="flex-row items-center rounded-2xl bg-ui-secondary dark:bg-ui-dark-secondary px-5 py-3" onPress={() => void openNavigation(place.latitude, place.longitude)}><MaterialCommunityIcons name="waze" size={21} color="white" /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Ir con Waze' : 'Open in Waze'}</Text></Pressable>
                  {place.requires_sinac_booking && place.sinac_booking_url ? <Pressable className="flex-row items-center rounded-2xl bg-ui-primary dark:bg-ui-dark-primary px-5 py-3" onPress={() => void Linking.openURL(place.sinac_booking_url!)}><MaterialCommunityIcons name="ticket-confirmation-outline" size={21} color="white" /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Abrir reserva oficial SINAC' : 'Open official SINAC reservation'}</Text></Pressable> : null}
                  {place.source_url ? <Pressable className="flex-row items-center rounded-2xl border border-ui-border dark:border-white/20 px-5 py-3" onPress={() => void Linking.openURL(place.source_url!)}><MaterialCommunityIcons name="link-variant" size={21} color="#00e5a7" /><Text className="ml-2 font-black text-ui-text dark:text-ui-dark-text">{documentedSource ? (language === 'es' ? 'Consultar fuente oficial' : 'View official source') : (language === 'es' ? 'Consultar fuente registrada' : 'View registered source')}</Text></Pressable> : null}
                  {place.requires_sinac_booking ? <Text className="w-full text-xs font-semibold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Descubriendo CR enlaza a SINAC; no vende entradas ni cobra comisión.' : 'Descubriendo CR links to SINAC; it does not sell tickets or charge a commission.'}</Text> : null}
                  <Pressable className="flex-row items-center rounded-2xl border border-coral-500/40 px-5 py-3" onPress={() => setReportOpen(true)}><MaterialCommunityIcons name="flag-outline" size={21} color="#B42318" /><Text className="ml-2 font-black text-coral-600">{language === 'es' ? 'Reportar información incorrecta' : 'Report incorrect information'}</Text></Pressable>
                </View>
              </View>
              {ferry ? <View className="rounded-3xl border border-[#00b981]/50 bg-ui-primary-soft dark:bg-ui-dark-primary-soft p-5"><View className="flex-row items-center"><MaterialCommunityIcons name="ferry" size={30} color="#00a77c" /><View className="ml-3"><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Ferri recomendado' : 'Recommended ferry'}</Text><Text className="text-ui-secondary dark:text-ui-dark-secondary">{ferry.route} · {ferry.operator}</Text></View></View><Text className="mt-4 font-bold text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Adulto' : 'Adult'} {formatPrice(ferry.adultFare)} · {language === 'es' ? 'Vehículo' : 'Vehicle'} {formatPrice(ferry.vehicleFare)} + {language === 'es' ? 'IVA' : 'VAT'}</Text><Text className="mt-2 leading-6 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Salidas' : 'Departures'}: {ferry.departures.join(' · ')}</Text><Pressable className="mt-4 self-start rounded-2xl bg-ui-primary dark:bg-ui-dark-primary px-5 py-3" onPress={() => void Linking.openURL(ferry.ticketUrl)}><Text className="font-black text-white">{language === 'es' ? 'Ver horarios y comprar' : 'View schedule and buy'}</Text></Pressable></View> : null}
              <Pressable className="flex-row items-center justify-between rounded-3xl border border-ui-border dark:border-ui-dark-border bg-ui-muted dark:bg-ui-dark-muted p-5" onPress={() => setCommentsOpen((open) => !open)}><View className="flex-row items-center"><MaterialCommunityIcons name="comment-text-multiple-outline" size={24} color="#00e5a7" /><Text className="ml-3 text-lg font-black text-ui-text dark:text-ui-dark-text">{commentsOpen ? (language === 'es' ? 'Ocultar comentarios' : 'Hide comments') : `${language === 'es' ? 'Ver comentarios' : 'View comments'} (${place.reviews_count})`}</Text></View><MaterialCommunityIcons name={commentsOpen ? 'chevron-up' : 'chevron-down'} size={25} color="#aaa49e" /></Pressable>
              {commentsOpen ? <CommentsPanel comment={comment} language={language} onComment={setComment} onPhoto={pickPhoto} onRating={setRating} onSend={sendReview} photo={photo} rating={rating} reviews={reviews.data} sending={sending} /> : null}
            </View>
          </ScrollView>
          <View className="flex-row items-center justify-between border-t border-ui-border dark:border-ui-dark-border bg-ui-surface dark:bg-ui-dark-surface p-4"><Pressable className="flex-row items-center rounded-2xl border border-ui-border dark:border-white/15 px-5 py-3" onPress={() => void onLike(place)}><MaterialCommunityIcons name={place.liked ? 'heart' : 'heart-outline'} size={24} color={place.liked ? '#ff557d' : colors.text} /><Text className="ml-2 font-black text-ui-text dark:text-ui-dark-text">{place.likes_count}</Text></Pressable><Pressable className="rounded-2xl bg-ui-primary dark:bg-ui-dark-primary px-7 py-3" onPress={onClose}><Text className="font-black text-white">{language === 'es' ? 'Cerrar ficha' : 'Close'}</Text></Pressable></View>
        </View>
      </View>
      </Modal>
      <Modal animationType="fade" onRequestClose={() => setSelectedPhotoIndex(null)} statusBarTranslucent transparent visible={selectedPhotoIndex !== null}>
        <View className="flex-1 bg-black">
          <ScrollView contentOffset={{ x: (selectedPhotoIndex ?? 0) * width, y: 0 }} horizontal key={selectedPhotoIndex} pagingEnabled showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>{communityPhotos.map((url, index) => <View className="flex-1 items-center justify-center" key={`${url}-${index}`} style={{ width }}><Image accessibilityLabel={`Fotografía ${index + 1} de ${place.name}`} contentFit="contain" source={{ uri: url }} style={{ height: '100%', width: '100%' }} /></View>)}</ScrollView>
          <Pressable accessibilityLabel={language === 'es' ? 'Cerrar fotografías' : 'Close photos'} className="absolute right-5 top-12 h-12 w-12 items-center justify-center rounded-full bg-black/65" onPress={() => setSelectedPhotoIndex(null)}><MaterialCommunityIcons name="close" size={28} color="white" /></Pressable>
        </View>
      </Modal>
      <InformationReportModal open={reportOpen} targetType="destination" targetId={place.id} targetLabel={place.name} language={language} onClose={() => setReportOpen(false)} />
    </>
  );
}

function CommentsPanel({ comment, language, onComment, onPhoto, onRating, onSend, photo, rating, reviews, sending }: { comment: string; language: 'es' | 'en'; onComment: (value: string) => void; onPhoto: () => Promise<void>; onRating: (value: number) => void; onSend: () => Promise<void>; photo?: ImagePicker.ImagePickerAsset; rating: number; reviews?: Awaited<ReturnType<typeof getDestinationReviews>>; sending: boolean }) {
  return <View className="gap-4"><View className="rounded-3xl border border-ui-border dark:border-ui-dark-border bg-ui-muted dark:bg-ui-dark-muted p-5"><View className="flex-row gap-1">{[1,2,3,4,5].map((star) => <Pressable key={star} onPress={() => onRating(star)}><MaterialCommunityIcons name={star <= rating ? 'star' : 'star-outline'} size={27} color="#ffac16" /></Pressable>)}</View><TextInput className="mt-4 min-h-24 rounded-2xl bg-ui-surface dark:bg-ui-dark-surface px-4 py-3 text-ui-text dark:text-ui-dark-text" maxLength={800} multiline onChangeText={onComment} placeholder={language === 'es' ? 'Compartí tu experiencia…' : 'Share your experience…'} placeholderTextColor="#827d77" textAlignVertical="top" value={comment} />{photo ? <Image source={{ uri: photo.uri }} contentFit="cover" style={{ borderRadius: 16, height: 150, marginTop: 12, width: 200 }} /> : null}<View className="mt-4 flex-row justify-between"><Pressable className="flex-row items-center rounded-2xl border border-ui-border dark:border-white/15 px-4 py-3" onPress={() => void onPhoto()}><MaterialCommunityIcons name="camera-plus-outline" size={21} color="#00a77c" /><Text className="ml-2 font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Foto' : 'Photo'}</Text></Pressable><Pressable className="rounded-2xl bg-ui-primary dark:bg-ui-dark-primary px-5 py-3" disabled={sending || (!comment.trim() && !photo)} onPress={() => void onSend()}><Text className="font-black text-white">{sending ? (language === 'es' ? 'Publicando…' : 'Posting…') : (language === 'es' ? 'Publicar' : 'Post')}</Text></Pressable></View></View>{reviews?.map((review) => <View className="rounded-3xl bg-ui-muted dark:bg-ui-dark-muted p-5" key={review.id}><View className="flex-row items-center">{review.avatar_url ? <Image source={{ uri: review.avatar_url }} contentFit="cover" style={{ borderRadius: 22, height: 44, width: 44 }} /> : <View className="h-11 w-11 items-center justify-center rounded-full bg-ui-primary dark:bg-ui-dark-primary"><Text className="font-black text-white">{review.author_name.slice(0,1)}</Text></View>}<View className="ml-3 flex-1"><Text className="font-black text-ui-text dark:text-ui-dark-text">{review.author_name}</Text><Text className="text-[#ffac16]">{'★'.repeat(review.rating)}</Text></View><Text className="text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{new Date(review.created_at).toLocaleDateString(language === 'es' ? 'es-CR' : 'en-US')}</Text></View>{review.comment ? <Text className="mt-4 text-base leading-6 text-ui-text dark:text-ui-dark-text">{review.comment}</Text> : null}{review.photos?.[0] ? <Image source={{ uri: review.photos[0] }} contentFit="cover" style={{ borderRadius: 18, height: 220, marginTop: 14, width: '100%' }} /> : null}</View>)}</View>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View className="flex-1 items-center border-r border-ui-border dark:border-ui-dark-border px-2 last:border-r-0"><Text className="text-center text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{label}</Text><Text className="mt-2 text-center text-lg font-black text-ui-text dark:text-ui-dark-text">{value}</Text></View>;
}

function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; value: string }) {
  return <View className="mb-4 flex-row items-start last:mb-0"><MaterialCommunityIcons name={icon} size={22} color="#00a77c" /><View className="ml-3 flex-1"><Text className="text-xs font-bold uppercase tracking-wider text-ui-text-muted dark:text-ui-dark-text-muted">{label}</Text><Text className="mt-1 leading-6 text-ui-text dark:text-ui-dark-text">{value}</Text></View></View>;
}

function difficultyLabel(value: string | null, language: 'es' | 'en') {
  if (!value) return language === 'es' ? 'Consultar' : 'Check';
  if (language === 'es') return value;
  return ({ Fácil: 'Easy', Moderada: 'Moderate', Difícil: 'Difficult' } as Record<string, string>)[value] ?? value;
}

function categoryLabel(value: string, language: 'es' | 'en') {
  if (language === 'es') return value;
  const labels: Record<string, string> = {
    'Parque Nacional': 'National Parks', Volcán: 'Volcanoes', Catarata: 'Waterfalls', Río: 'Rivers', Mirador: 'Viewpoints', Termales: 'Hot springs', Senderismo: 'Hiking',
    'Pozas / Lagos': 'Pools / Lakes', Playa: 'Beaches', Cultura: 'Culture', 'Santuarios de animales': 'Animal Sanctuaries',
    'Reservas naturales y forestales': 'Nature Reserves', 'Refugios de vida silvestre': 'Wildlife Refuges', 'Experiencia Gastronómica': 'Food Experiences', 'Bares / Discotecas': 'Bars / Nightclubs',
  };
  return labels[value] ?? value;
}
