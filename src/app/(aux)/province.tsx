import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from 'expo-router/react-navigation';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, BackHandler, FlatList, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, useWindowDimensions, View, type GestureResponderEvent, type ViewToken } from 'react-native';

import { InformationReportModal } from '@/components/information-report-modal';
import { ThemedAlert as Alert } from '@/components/themed-alert';
import { getAppOptions } from '@/lib/app-options';
import { ferryRoutes, getFerryRoutes, getWeather, openNavigation, type FerryRoute, WEATHER_STALE_TIME } from '@/lib/logistics';
import { addDestinationPhoto, addDestinationReview, getCommunitySuggestionVerification, getDestinationFreshness, getDestinationReviews, getMyCommunitySuggestionVerification, getMyDestinationFreshness, getPlaceById, getPlacesForCategory, getPlacesForProvince, getPlacesForTargets, matchesSearchTargets, setCommunitySuggestionVerification, setDestinationFreshnessVote, type CommunityPhoto, type CommunitySuggestionAccessDifficulty, type CommunitySuggestionVerification, type DestinationFreshnessCheck, type MapPlace, type MyCommunitySuggestionVerification, type ValidationAuthority, toggleDestinationLike, toggleDestinationPhotoLike } from '@/lib/places';
import { provinces } from '@/lib/provinces';
import { useApp } from '@/providers/app-provider';
import { useAppTheme } from '@/theme/theme-provider';

const destinationPlaceholder = { blurhash: 'L9C6cY00M{~q%MxuRjof00ofxuWB' };

function DestinationCarousel({ autoplay = true, height, place }: { autoplay?: boolean; height: number; place: MapPlace }) {
  const isFocused = useIsFocused();
  const photos = useMemo(() => [...new Set([place.cover_image_url, ...place.photos].filter((url): url is string => Boolean(url)))], [place.cover_image_url, place.photos]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [failedPhotos, setFailedPhotos] = useState<string[]>([]);
  const availablePhotos = useMemo(() => photos.filter((url) => !failedPhotos.includes(url)), [failedPhotos, photos]);
  useEffect(() => {
    setPhotoIndex(0);
    setFailedPhotos([]);
  }, [place.id]);
  useEffect(() => {
    if (!autoplay || !isFocused || availablePhotos.length < 2) return undefined;
    const nextIndex = (photoIndex + 1) % availablePhotos.length;
    void Image.prefetch(availablePhotos[nextIndex], 'memory-disk');
    const timeout = setTimeout(() => setPhotoIndex(nextIndex), 2000);
    return () => clearTimeout(timeout);
  }, [autoplay, availablePhotos, isFocused, photoIndex]);
  const source = availablePhotos[photoIndex % availablePhotos.length];
  return source ? <Image cachePolicy="memory-disk" contentFit="cover" onError={() => setFailedPhotos((failed) => failed.includes(source) ? failed : [...failed, source])} placeholder={destinationPlaceholder} placeholderContentFit="cover" priority={autoplay ? 'high' : 'normal'} source={{ uri: source }} style={{ height, width: '100%' }} transition={160} /> : <View className="items-center justify-center bg-ui-primary-soft dark:bg-ui-dark-primary-soft" style={{ height }}><MaterialCommunityIcons name="image-off-outline" size={42} color="#087443" /></View>;
}

function usesVerifiedCover(place: MapPlace) {
  return place.image_verified && Boolean(place.cover_image_url);
}

function ValidationBadge({ authorities = [], checkedAt, evidenceUrl, language }: { authorities?: ValidationAuthority[]; checkedAt?: string | null; evidenceUrl?: string | null; language: 'es' | 'en' }) {
  const governmentAuthority = authorities.length ? authorities.map((authority) => `${language === 'es' ? 'Verificado por' : 'Verified by'} ${authority}`).join(' · ') : null;
  const label = governmentAuthority ?? (language === 'es' ? 'Destino verificado' : 'Verified destination');
  return <View><View accessibilityLabel={label} className="flex-row self-start items-center rounded-full bg-[#0B6B4F] px-2.5 py-1"><MaterialCommunityIcons name="shield-check" size={13} color="white" /><Text className="ml-1 text-[10px] font-black text-white">{label}</Text></View>{governmentAuthority && checkedAt && evidenceUrl ? <Text className="mt-1 text-[10px] font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Última verificación' : 'Last verified'}: {new Date(checkedAt).toLocaleDateString(language === 'es' ? 'es-CR' : 'en-US')}</Text> : null}</View>;
}

function ferryAccessFor(place: MapPlace) {
  return place.name.startsWith('Isla Chira') ? { routeIds: ['puntarenas-isla-chira', 'isla-chira-puntarenas'] } : undefined;
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

const CATALOG_BATCH_SIZE = 5;
const DESTINATION_CARD_HEIGHT = 346;
const DESTINATION_INFO_HEIGHT = 140;
const DESTINATION_INFO_BOTTOM_PADDING = 31;
const DESTINATION_FLOATING_LABEL_BOTTOM = 108;

function distanceKm(from: Coordinates, to: Coordinates) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const lat = radians(to.latitude - from.latitude);
  const lng = radians(to.longitude - from.longitude);
  const a = Math.sin(lat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ProvinceCatalogScreen() {
  const { category: rawCategory, categoryId, community: communityParam, destinationId, direct: directParam, province: rawProvince } = useLocalSearchParams<{ category?: string; categoryId?: string; community?: string; destinationId?: string; direct?: string; province?: string }>();
  const { formatPrice, language, requireAuth, session, setVisitorType, visitorType } = useApp();
  const { colors } = useAppTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<MapPlace>();
  const [userLocation, setUserLocation] = useState<Coordinates>();
  const [beachType, setBeachType] = useState<'family' | 'surf'>('family');
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string>();
  const [visiblePlaceCount, setVisiblePlaceCount] = useState(CATALOG_BATCH_SIZE);
  const [visiblePlaceIds, setVisiblePlaceIds] = useState<Set<string>>(() => new Set());
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<MapPlace>[] }) => {
    setVisiblePlaceIds(new Set(viewableItems.filter((item) => item.isViewable).map((item) => item.item.id)));
  });
  const isCommunitySubmission = communityParam === '1';
  const directDestination = directParam === '1';
  const categoryOptions = useQuery({ queryKey: ['app-options', 'destination_category', 'v2'], queryFn: () => getAppOptions('destination_category'), staleTime: 5 * 60 * 1000 });
  const categoryOption = useMemo(() => categoryOptions.data?.find((option) => option.id === categoryId) ?? null, [categoryId, categoryOptions.data]);
  const categorySubcategories = useMemo(() => categoryOptions.data?.filter((option) => option.parent_id === categoryId) ?? [], [categoryId, categoryOptions.data]);
  const categoryName = categoryOption ? (language === 'es' ? categoryOption.label_es : categoryOption.label_en) : rawCategory;
  const isBeach = !categoryId && (rawCategory === 'Playa' || rawCategory === 'Playas');
  const leaveCatalog = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/explore');
  }, [router]);
  const closeDestination = useCallback(() => {
    if (directDestination) {
      leaveCatalog();
      return;
    }
    setSelected(undefined);
    if (!destinationId) return;
    router.replace({
      pathname: '/(aux)/province',
      params: categoryId ? { categoryId } : rawCategory ? { category: rawCategory } : rawProvince ? { province: rawProvince } : {},
    });
  }, [categoryId, destinationId, directDestination, leaveCatalog, rawCategory, rawProvince, router]);
  const province = provinces.find((item) => item.name === rawProvince) ?? provinces[0];
  const scopeTitle = categoryName ?? (categoryId ? (language === 'es' ? 'Cargando catálogo…' : 'Loading catalog…') : province.name);
  const scopeKey = categoryName ? `category-${categoryId ?? categoryName}` : `province-${province.code}`;
  const places = useQuery({
    queryKey: ['places', 'v2', scopeKey, categoryOption?.allowed_targets?.join('|') ?? null, destinationId ?? null, isCommunitySubmission, session?.user.id],
    queryFn: async () => {
      if (destinationId) {
        const destination = await getPlaceById(destinationId, session?.user.id, isCommunitySubmission);
        if (destination) return [destination];
      }
      return categoryOption ? getPlacesForTargets(categoryOption.allowed_targets ?? [], session?.user.id) : categoryName ? getPlacesForCategory(categoryName, session?.user.id) : getPlacesForProvince(province.name, session?.user.id);
    },
    networkMode: 'always',
    enabled: !categoryId || Boolean(categoryOption),
    staleTime: 60 * 1000,
  });
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      leaveCatalog();
      return true;
    });
    return () => subscription.remove();
  }, [leaveCatalog]));
  useEffect(() => {
    if (!destinationId || !places.data) return;
    const match = places.data.find((place) => place.id === destinationId);
    if (match) setSelected(match);
  }, [destinationId, places.data]);
  useEffect(() => { setActiveSubcategoryId(undefined); }, [categoryId]);
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
  const visibleCategorySubcategories = useMemo(
    () => categorySubcategories.filter((subcategory) => sortedPlaces.some((place) => matchesSearchTargets(`${place.name} ${place.category} ${place.description ?? ''} ${place.difficulty ?? ''}`, subcategory.allowed_targets ?? []))),
    [categorySubcategories, sortedPlaces],
  );
  const activeSubcategory = useMemo(() => visibleCategorySubcategories.find((option) => option.id === activeSubcategoryId) ?? null, [activeSubcategoryId, visibleCategorySubcategories]);
  const subcategoryPlaces = useMemo(() => !activeSubcategory ? sortedPlaces : sortedPlaces.filter((place) => matchesSearchTargets(`${place.name} ${place.category} ${place.description ?? ''} ${place.difficulty ?? ''}`, activeSubcategory.allowed_targets ?? [])), [activeSubcategory, sortedPlaces]);
  const displayedPlaces = useMemo(() => !isBeach ? subcategoryPlaces : subcategoryPlaces.filter((place) => {
    const surf = place.category.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes('surf');
    return beachType === 'surf' ? surf : !surf;
  }), [beachType, isBeach, subcategoryPlaces]);
  const visiblePlaces = useMemo(() => displayedPlaces.slice(0, visiblePlaceCount), [displayedPlaces, visiblePlaceCount]);
  const loadNextPlaces = useCallback(() => {
    setVisiblePlaceCount((current) => Math.min(current + CATALOG_BATCH_SIZE, displayedPlaces.length));
  }, [displayedPlaces.length]);
  useEffect(() => {
    setVisiblePlaceCount(CATALOG_BATCH_SIZE);
  }, [activeSubcategoryId, beachType, scopeKey]);

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

  if (directDestination && !selected) {
    if (places.isPending || places.data?.some((place) => place.id === destinationId)) {
      return <View accessibilityLabel={language === 'es' ? 'Cargando ficha del sitio' : 'Loading place details'} accessibilityRole="progressbar" className="flex-1 items-center justify-center bg-ui-background dark:bg-ui-dark-background"><ActivityIndicator color="#00c98d" size="large" /></View>;
    }
    return <View className="flex-1 items-center justify-center bg-ui-background p-6 dark:bg-ui-dark-background"><View accessibilityRole="alert" className="w-full max-w-md rounded-card border border-ui-border bg-ui-surface p-6 dark:border-ui-dark-border dark:bg-ui-dark-surface"><MaterialCommunityIcons name="map-marker-alert-outline" size={34} color={colors.textMuted} /><Text className="mt-4 text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'No pudimos abrir la ficha' : 'We could not open this place'}</Text><Text className="mt-2 leading-6 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Revisá tu conexión e intentá de nuevo.' : 'Check your connection and try again.'}</Text><View className="mt-5 flex-row gap-3"><Pressable accessibilityRole="button" className="min-h-11 flex-1 items-center justify-center rounded-control bg-ui-primary px-4 dark:bg-ui-dark-primary" onPress={() => void places.refetch()}><Text className="font-black text-white">{language === 'es' ? 'Reintentar' : 'Retry'}</Text></Pressable><Pressable accessibilityRole="button" className="min-h-11 flex-1 items-center justify-center rounded-control border border-ui-border px-4 dark:border-ui-dark-border" onPress={leaveCatalog}><Text className="font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Volver' : 'Back'}</Text></Pressable></View></View></View>;
  }

  return (
    <View className="flex-1 bg-ui-background dark:bg-ui-dark-background">
      <View className="bg-ui-surface dark:bg-ui-dark-surface px-5 pb-[18px] pt-9">
        <View className="mx-auto w-full max-w-5xl flex-row items-center">
          <Pressable accessibilityLabel={language === 'es' ? 'Volver' : 'Back'} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full bg-ui-muted dark:bg-white/10" onPress={leaveCatalog}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <View className="ml-4 flex-1"><Text className="text-[23px] font-black leading-[29px] text-ui-text dark:text-ui-dark-text">{scopeTitle}</Text><Text className="mt-1 text-ui-text-muted dark:text-ui-dark-text-muted">{categoryName ? (language === 'es' ? 'Todo Costa Rica' : 'Across Costa Rica') : (language === 'es' ? 'Lugares para descubrir' : 'Places to discover')}</Text>{isBeach ? <View className="mt-3 flex-row self-start overflow-hidden rounded-xl border border-ui-border dark:border-ui-dark-border">{(['family', 'surf'] as const).map((type) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: beachType === type }} className={beachType === type ? 'flex-row items-center bg-ui-primary px-3 py-2 dark:bg-ui-dark-primary' : 'flex-row items-center px-3 py-2'} key={type} onPress={() => setBeachType(type)}><MaterialCommunityIcons name={type === 'family' ? 'umbrella-beach' : 'surfing'} size={17} color={beachType === type ? 'white' : '#087443'} /><Text className={beachType === type ? 'ml-1.5 text-xs font-black text-white' : 'ml-1.5 text-xs font-black text-ui-primary'}>{language === 'es' ? (type === 'family' ? 'Familiar' : 'Surf') : (type === 'family' ? 'Family' : 'Surf')}</Text></Pressable>)}</View> : null}</View>
          <View className="flex-row overflow-hidden rounded-xl border border-ui-border dark:border-white/30">{(['tico', 'foreigner'] as const).map((item) => <Pressable accessibilityLabel={item === 'tico' ? 'Modo Tico' : 'Foreigner mode'} accessibilityRole="button" className={visitorType === item ? 'bg-white px-3 py-2' : 'px-3 py-2'} key={item} onPress={() => setVisitorType(item)}><Text className={visitorType === item ? 'text-xs font-black text-[#002b7f]' : 'text-xs font-bold text-ui-text dark:text-ui-dark-text'}>{item === 'tico' ? 'Tico' : 'Foreigner'}</Text></Pressable>)}</View>
        </View>
      </View>
      {visibleCategorySubcategories.length ? <View className="border-b border-ui-border bg-ui-surface py-3 dark:border-ui-dark-border dark:bg-ui-dark-surface"><ScrollView horizontal contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} showsHorizontalScrollIndicator={false}><Pressable accessibilityRole="button" accessibilityState={{ selected: !activeSubcategory }} className={!activeSubcategory ? 'min-h-11 justify-center rounded-full bg-ui-primary px-4 dark:bg-ui-dark-primary' : 'min-h-11 justify-center rounded-full bg-ui-muted px-4 dark:bg-ui-dark-muted'} onPress={() => setActiveSubcategoryId(undefined)}><Text className={!activeSubcategory ? 'text-xs font-black text-white' : 'text-xs font-bold text-ui-text dark:text-ui-dark-text'}>{language === 'es' ? 'Todos' : 'All'}</Text></Pressable>{visibleCategorySubcategories.map((subcategory) => <Pressable accessibilityRole="button" accessibilityState={{ selected: activeSubcategoryId === subcategory.id }} className={activeSubcategoryId === subcategory.id ? 'min-h-11 justify-center rounded-full bg-ui-primary px-4 dark:bg-ui-dark-primary' : 'min-h-11 justify-center rounded-full bg-ui-muted px-4 dark:bg-ui-dark-muted'} key={subcategory.id} onPress={() => setActiveSubcategoryId((current) => current === subcategory.id ? undefined : subcategory.id)}><Text className={activeSubcategoryId === subcategory.id ? 'text-xs font-black text-white' : 'text-xs font-bold text-ui-text dark:text-ui-dark-text'}>{language === 'es' ? subcategory.label_es : subcategory.label_en}</Text></Pressable>)}</ScrollView></View> : null}
      <FlatList
        contentContainerStyle={{ gap: 24, padding: 20, paddingBottom: 48, width: '100%', maxWidth: 1040, alignSelf: 'center' }}
        data={visiblePlaces}
        extraData={visiblePlaceIds}
        initialNumToRender={CATALOG_BATCH_SIZE}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={places.isPending ? <ActivityIndicator className="py-16" color="#00c98d" size="large" /> : <Text className="py-16 text-center font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{places.isError ? (language === 'es' ? 'No se pudieron cargar los sitios.' : 'Places could not be loaded.') : isBeach ? (language === 'es' ? `Aún no hay playas ${beachType === 'surf' ? 'de surf' : 'familiares'} publicadas.` : `There are no ${beachType === 'surf' ? 'surf' : 'family'} beaches published yet.`) : (language === 'es' ? 'Aún no hay sitios publicados aquí.' : 'There are no published places here yet.')}</Text>}
        maxToRenderPerBatch={CATALOG_BATCH_SIZE}
        onEndReached={visiblePlaces.length < displayedPlaces.length ? loadNextPlaces : undefined}
        onEndReachedThreshold={0.35}
        onViewableItemsChanged={onViewableItemsChanged.current}
        renderItem={({ item }) => <DestinationPreviewCard autoplay={!selected && visiblePlaceIds.has(item.id)} formatPrice={formatPrice} item={item} language={language} onPress={() => setSelected(item)} userLocation={userLocation} visitorType={visitorType} />}
        viewabilityConfig={viewabilityConfig.current}
      />
      <DestinationModal key={selected?.id ?? 'closed'} language={language} onClose={closeDestination} onLike={like} place={selected} />
    </View>
  );
}

function DestinationPreviewCard({ autoplay, formatPrice, item, language, onPress, userLocation, visitorType }: { autoplay: boolean; formatPrice: (value: number) => string; item: MapPlace; language: 'es' | 'en'; onPress: () => void; userLocation?: Coordinates; visitorType: 'tico' | 'foreigner' }) {
  const price = visitorType === 'tico'
    ? (item.price_national_crc == null ? (language === 'es' ? 'Consultar' : 'Check') : item.price_national_crc === 0 ? (language === 'es' ? 'Gratis' : 'Free') : formatPrice(item.price_national_crc))
    : (item.price_foreigner_usd == null ? 'Check price' : item.price_foreigner_usd === 0 ? 'Free' : `$${item.price_foreigner_usd.toFixed(2)}`);
  const decisionFacts = destinationDecisionFacts(item, language, price, userLocation);
  const reservationUrl = destinationReservationUrl(item);

  return (
    <Pressable accessibilityLabel={`${language === 'es' ? 'Abrir' : 'Open'} ${item.name}`} accessibilityRole="button" className="overflow-hidden rounded-[30px] border border-white/20 bg-ui-primary active:opacity-90" onPress={onPress}>
      <View className="relative" style={{ height: DESTINATION_CARD_HEIGHT }}>
        <View style={StyleSheet.absoluteFill}>
          <DestinationCarousel autoplay={autoplay} height={DESTINATION_CARD_HEIGHT} place={item} />
        </View>
        <View className="absolute inset-0 bg-black/15" pointerEvents="none" />
        <View className="absolute left-5 top-5 rounded-full bg-black/60 px-4 py-2"><Text className="font-black text-white">{item.province}</Text></View>
        {usesVerifiedCover(item) && item.image_attribution ? <View className="absolute right-4 top-4 max-w-[55%] rounded-lg bg-black/65 px-3 py-2"><Text className="text-right text-[10px] font-bold text-white" numberOfLines={1}>{language === 'es' ? 'Foto' : 'Photo'}: {item.image_attribution}</Text></View> : null}
        <View className="absolute left-5 rounded-full bg-[#3B4231]/90 px-3 py-1.5" style={{ bottom: DESTINATION_FLOATING_LABEL_BOTTOM }}><Text className="text-sm font-black text-white">{tourismRegion(item)}</Text></View>
        <View className="absolute right-5 rounded-full bg-black/65 px-3 py-1.5" style={{ bottom: DESTINATION_FLOATING_LABEL_BOTTOM }}><Text className="text-sm font-black text-white">{difficultyLabel(item.difficulty, language)}</Text></View>
        <LinearGradient
          colors={['rgba(7,27,21,0)', 'rgba(7,27,21,0.20)', 'rgba(7,27,21,0.70)', 'rgba(3,17,13,0.98)']}
          end={{ x: 0.5, y: 1 }}
          locations={[0, 0.32, 0.68, 1]}
          start={{ x: 0.5, y: 0 }}
          style={styles.destinationCardOverlay}
        >
          <Text className="text-lg font-black leading-5 text-white" numberOfLines={2}>{item.name}</Text>
          <Text className="mt-0.5 text-xs leading-4 text-white/75" numberOfLines={1}>{destinationDescription(item, language)}</Text>
          <View className="mt-2 flex-row gap-1.5">
            {decisionFacts.map((fact) => <DestinationFact accessibilityLabel={fact.action === 'reservation' ? (reservationUrl ? (language === 'es' ? `Reservar ${item.name}` : `Book ${item.name}`) : (language === 'es' ? `Ver cómo reservar ${item.name}` : `See how to book ${item.name}`)) : undefined} icon={fact.icon} key={`${fact.icon}-${fact.label}`} label={fact.label} onPress={fact.action === 'reservation' ? (reservationUrl ? () => void Linking.openURL(reservationUrl) : onPress) : undefined} urgent={fact.urgent} />)}
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
}

type DestinationFactItem = { action?: 'reservation'; icon: ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; urgent?: boolean };

function destinationReservationUrl(item: MapPlace) {
  if (item.requires_online_ticket && item.online_ticket_url) return item.online_ticket_url;
  if (item.requires_sinac_booking && item.sinac_booking_url) return item.sinac_booking_url;
  if (item.visit_info?.reserva_requerida && item.visit_info.enlace_web) return item.visit_info.enlace_web;
  return null;
}

function destinationDecisionFacts(item: MapPlace, language: 'es' | 'en', price: string, userLocation?: Coordinates) {
  const facts: DestinationFactItem[] = [];
  if (item.has_high_tides_risk) facts.push({ icon: 'waves-arrow-up', label: language === 'es' ? 'Revisar mareas' : 'Check tides', urgent: true });
  if (item.visit_info?.reserva_requerida || item.requires_online_ticket || item.requires_sinac_booking) facts.push({ action: 'reservation', icon: 'calendar-check-outline', label: destinationReservationUrl(item) ? (language === 'es' ? 'Reservar ahora ↗' : 'Book now ↗') : (language === 'es' ? 'Ver cómo reservar ›' : 'How to book ›'), urgent: true });
  if (ferryAccessFor(item)) facts.push({ icon: 'ferry', label: language === 'es' ? 'Requiere ferri' : 'Ferry required', urgent: true });
  const access = conciseAccess(item.visit_info?.tipo_acceso, language);
  if (access) facts.push({ icon: 'car-outline', label: access, urgent: /4x4|lancha|boat/i.test(access) });
  const duration = item.visit_info?.duracion_estimada?.replace(/\s*\(.*/, '').trim();
  if (duration) facts.push({ icon: 'clock-outline', label: duration });
  facts.push({ icon: 'ticket-confirmation-outline', label: price });
  facts.push({ icon: 'map-marker-distance', label: userLocation ? `${distanceKm(userLocation, item).toFixed(1)} km` : (language === 'es' ? 'Calculando distancia…' : 'Calculating distance…') });
  return facts.slice(0, 4);
}

function conciseAccess(access: string | null | undefined, language: 'es' | 'en') {
  if (!access) return null;
  const fourByFour = /4x4/i.test(access);
  const boat = /lancha|bote|boat/i.test(access);
  if (fourByFour && boat) return language === 'es' ? '4x4 + lancha' : '4x4 + boat';
  if (fourByFour) return /recomendad/i.test(access) ? (language === 'es' ? '4x4 recomendado' : '4x4 recommended') : (language === 'es' ? 'Requiere 4x4' : '4x4 required');
  if (/carro normal|sed[aá]n|pavimentad/i.test(access)) return language === 'es' ? 'Acceso en sedán' : 'Sedan access';
  return access.split(/[,(]/, 1)[0].trim();
}

function DestinationFact({ accessibilityLabel, icon, label, onPress, urgent = false }: DestinationFactItem & { accessibilityLabel?: string; onPress?: () => void }) {
  const className = urgent ? 'min-h-9 flex-1 flex-row items-center justify-center rounded-lg border border-[#FFD27A]/55 bg-[#5A3512]/55 px-1.5 py-1' : 'min-h-9 flex-1 flex-row items-center justify-center rounded-lg border border-white/15 bg-black/25 px-1.5 py-1';
  const content = <><MaterialCommunityIcons name={icon} size={14} color={urgent ? '#FFD27A' : '#FFFFFF'} /><Text className="ml-1 text-center text-[9px] font-black leading-3 text-white">{label}</Text></>;
  if (!onPress) return <View className={className}>{content}</View>;
  const handlePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onPress();
  };
  return <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="link" className={`${className} focus-visible:ring-2 focus-visible:ring-ui-focus active:opacity-75`} onPress={handlePress}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  destinationCardOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: DESTINATION_INFO_HEIGHT,
    justifyContent: 'flex-end',
    paddingTop: 10,
    paddingRight: 12,
    paddingBottom: DESTINATION_INFO_BOTTOM_PADDING,
    paddingLeft: 12,
    overflow: 'hidden',
  },
});

function DestinationModal({ language, onClose, onLike, place }: { language: 'es' | 'en'; onClose: () => void; onLike: (place: MapPlace) => Promise<void>; place?: MapPlace }) {
  const { formatPrice, requireAuth, session, visitorType } = useApp();
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset>();
  const [communityPhotos, setCommunityPhotos] = useState<CommunityPhoto[]>(place?.community_photos ?? []);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const [sending, setSending] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [communityVerificationBusy, setCommunityVerificationBusy] = useState(false);
  const ferryAccess = place ? ferryAccessFor(place) : undefined;
  const ferryQuery = useQuery({ queryKey: ['ferry-routes'], queryFn: getFerryRoutes, enabled: Boolean(ferryAccess), staleTime: 30 * 60 * 1000 });
  const reviews = useQuery({ queryKey: ['destination-reviews', place?.id], queryFn: () => getDestinationReviews(place!.id), enabled: Boolean(place) });
  const communityVerification = useQuery({ queryKey: ['community-suggestion-verification', place?.id], queryFn: () => getCommunitySuggestionVerification(place!.id), enabled: Boolean(place?.is_community_submission) });
  const myCommunityVerification = useQuery({ queryKey: ['my-community-suggestion-verification', place?.id, session?.user.id], queryFn: () => getMyCommunitySuggestionVerification(place!.id, session!.user.id), enabled: Boolean(place?.is_community_submission && session && place.community_contributor_id !== session.user.id) });
  const weather = useQuery({ queryKey: ['weather', 'destination', place?.id, language], queryFn: () => getWeather(place!, language), enabled: Boolean(place), staleTime: WEATHER_STALE_TIME });
  if (!place) return null;
  const communityLocationVerified = Boolean(place.community_verified_at) || (communityVerification.data?.location_correct.confirmed ?? 0) >= 3;
  const ferries = ferryAccess ? (ferryQuery.data ?? ferryRoutes).filter((route) => ferryAccess.routeIds.includes(route.id)) : [];
  const documentedSource = Boolean(place.validated_by.length);
  const ticketUrl = place.requires_online_ticket
    ? place.online_ticket_url
    : place.requires_sinac_booking
      ? place.sinac_booking_url
      : null;
  const hasOnlineTicket = Boolean(ticketUrl);
  const ticketIssuer = place.requires_sinac_booking ? 'SINAC' : (language === 'es' ? 'el operador oficial' : 'the official operator');
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
      const newPhoto = await addDestinationPhoto(place.id, session.user.id, result.assets[0]);
      setCommunityPhotos((current) => [...current, newPhoto]);
      await queryClient.invalidateQueries({ queryKey: ['places'] });
    } catch (reason) { Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : (language === 'es' ? 'No se pudo subir la foto.' : 'Could not upload the photo.')); }
    finally { setUploadingPhoto(false); }
  };
  const likePhoto = async (photo: CommunityPhoto) => {
    if (!requireAuth(language === 'es' ? 'Dar me gusta a una fotografía' : 'Like a photo') || !session) return;
    try {
      await toggleDestinationPhotoLike(photo.id, session.user.id, photo.liked);
      setCommunityPhotos((current) => current.map((item) => item.id === photo.id ? { ...item, liked: !item.liked, likes_count: Math.max(0, item.likes_count + (item.liked ? -1 : 1)) } : item));
      await queryClient.invalidateQueries({ queryKey: ['places'] });
    } catch (reason) { Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : (language === 'es' ? 'No se pudo actualizar el like.' : 'Could not update the like.')); }
  };
  const submitCommunityVerification = async (verification: NonNullable<MyCommunitySuggestionVerification>) => {
    if (!requireAuth(language === 'es' ? 'Confirmar la información de este aporte' : 'Confirm this contribution information') || !session || communityVerificationBusy) return;
    setCommunityVerificationBusy(true);
    try {
      await setCommunitySuggestionVerification(place.id, session.user.id, verification);
      await Promise.all([communityVerification.refetch(), myCommunityVerification.refetch(), queryClient.invalidateQueries({ queryKey: ['explore-places'] })]);
    } catch (reason) { Alert.alert('Descubriendo CR', reason instanceof Error ? reason.message : (language === 'es' ? 'No se pudo guardar tu confirmación.' : 'Could not save your confirmation.')); }
    finally { setCommunityVerificationBusy(false); }
  };

  return (
    <>
      <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View className="flex-1 items-center justify-center bg-black/75 p-3 md:p-8">
        <View className="max-h-full w-full max-w-5xl overflow-hidden rounded-[30px] bg-ui-surface dark:bg-ui-dark-surface">
          <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
            <View className="relative">
              <DestinationCarousel height={340} place={place} />
              <View className="absolute inset-0 bg-black/20" />
              <View className="absolute left-5 top-5 rounded-full bg-black/55 px-4 py-2"><Text className="font-black text-white">{place.province} · {tourismRegion(place)}</Text></View>
              <View className="absolute right-4 top-4 flex-row gap-2">
                <Pressable className="h-12 w-12 items-center justify-center rounded-full bg-black/55" onPress={() => void Share.share({ message: `${place.name}${place.source_url ? `\n${place.source_url}` : ''}` })}><MaterialCommunityIcons name="share-variant-outline" size={23} color="white" /></Pressable>
                <Pressable accessibilityLabel="Cerrar" accessibilityRole="button" className="h-12 w-12 items-center justify-center rounded-full bg-black/55" onPress={onClose}><MaterialCommunityIcons name="close" size={28} color="white" /></Pressable>
              </View>
              <View className="absolute bottom-0 left-0 right-0 bg-black/45 px-5 pb-4 pt-8"><View className="flex-row flex-wrap items-center gap-1.5"><View className="rounded-lg bg-ui-primary dark:bg-ui-dark-primary px-2.5 py-1.5"><Text className="text-xs font-black text-white">{categoryLabel(place.category, language)}</Text></View><View className="rounded-lg bg-[#ffac16] px-2.5 py-1.5"><Text className="text-xs font-black text-white">★ {place.average_rating.toFixed(1)} · {place.reviews_count ? `${place.reviews_count} ${language === 'es' ? 'opiniones' : 'reviews'}` : (language === 'es' ? 'calificación inicial' : 'starting rating')}</Text></View>{place.is_community_submission ? communityLocationVerified ? <View className="rounded-lg bg-ui-primary px-2.5 py-1.5"><Text className="text-xs font-black text-white">{language === 'es' ? 'UBICACIÓN VERIFICADA' : 'LOCATION VERIFIED'}</Text></View> : null : <ValidationBadge authorities={place.validated_by} checkedAt={place.verification_checked_at} evidenceUrl={place.verification_evidence_url} language={language} />}</View><Text className="mt-2 text-2xl font-black leading-7 text-white md:text-3xl md:leading-9">{place.name}</Text></View>
            </View>
            {usesVerifiedCover(place) && place.image_source_url ? <Pressable className="self-end px-5 pt-3" onPress={() => void Linking.openURL(place.image_source_url!)}><Text className="text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Foto' : 'Photo'}: {place.image_attribution || 'Wikimedia Commons'} · {place.image_license || (language === 'es' ? 'Ver licencia' : 'View license')}</Text></Pressable> : null}
            <View className="pt-5"><View className="flex-row items-center justify-between px-5"><Text className="flex-1 text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Fotografías subidas por nuestros usuarios' : 'Photos uploaded by our users'}</Text><Pressable accessibilityLabel={language === 'es' ? 'Subir fotografía' : 'Upload photo'} className="ml-3 h-11 w-11 items-center justify-center rounded-full bg-ui-primary dark:bg-ui-dark-primary" disabled={uploadingPhoto} onPress={() => void addPhoto()}>{uploadingPhoto ? <ActivityIndicator color="white" size="small" /> : <MaterialCommunityIcons name="plus" size={25} color="white" />}</Pressable></View>{communityPhotos.length ? <ScrollView horizontal className="mt-3" contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }} showsHorizontalScrollIndicator={false}>{communityPhotos.map((photo, index) => <View key={photo.id}><Pressable accessibilityLabel={language === 'es' ? `Abrir fotografía ${index + 1} de ${place.name}` : `Open photo ${index + 1} of ${place.name}`} onPress={() => setSelectedPhotoIndex(index)}><Image contentFit="cover" source={{ uri: photo.image_url }} style={{ borderRadius: 16, height: 110, width: 150 }} transition={180} /></Pressable><Pressable className="mt-1 flex-row self-start items-center rounded-full bg-ui-muted px-2 py-1 dark:bg-ui-dark-muted" onPress={() => void likePhoto(photo)}><MaterialCommunityIcons name={photo.liked ? 'heart' : 'heart-outline'} size={16} color={photo.liked ? '#ff557d' : '#0B6B4F'} /><Text className="ml-1 text-xs font-black text-ui-text dark:text-ui-dark-text">{photo.likes_count}</Text></Pressable></View>)}</ScrollView> : <Pressable className="mt-3 flex-row items-center justify-between px-5" onPress={() => void addPhoto()}><Text className="text-sm font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Sé el primero en compartir una fotografía' : 'Be the first to share a photo'}</Text><MaterialCommunityIcons name="plus-circle-outline" size={25} color="#00c98d" /></Pressable>}</View>
            <View className="gap-6 p-5 md:p-8">
              <View className="flex-row rounded-3xl border border-ui-border dark:border-ui-dark-border bg-ui-muted dark:bg-ui-dark-muted py-5"><Stat label={language === 'es' ? 'Entrada Tico' : 'Foreigner entry'} value={visitPrice} /><Stat label={language === 'es' ? 'Dificultad' : 'Difficulty'} value={difficultyLabel(place.difficulty, language)} /><Stat label={language === 'es' ? 'Comunidad' : 'Community'} value={`♥ ${place.likes_count}`} /></View>
              {weather.data ? <View className="flex-row items-center rounded-3xl border border-ui-border dark:border-ui-dark-border bg-ui-muted dark:bg-ui-dark-muted p-5"><MaterialCommunityIcons name={weather.data.icon.startsWith('10') ? 'weather-rainy' : 'weather-partly-cloudy'} size={34} color="#23b9f2" /><View className="ml-4 flex-1"><Text className="font-black capitalize text-ui-text dark:text-ui-dark-text">{weather.data.description}</Text><Text className="mt-1 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Humedad' : 'Humidity'} {weather.data.humidity}%</Text></View><Text className="text-3xl font-black text-ui-text dark:text-ui-dark-text">{weather.data.temperature}°{weather.data.temperatureUnit}</Text></View> : null}
              <View><Text className="text-lg font-black uppercase tracking-wider text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Información para tu visita' : 'Visitor information'}</Text><Text className="mt-3 text-base leading-7 text-ui-text dark:text-ui-dark-text">{destinationDescription(place, language)}</Text></View>
              <DestinationVisitInfoPanel language={language} place={place} />
              <VisitQuickFacts closedDay={place.closed_day} language={language} price={visitPrice} schedule={place.schedule} onNavigate={() => void openNavigation(place.latitude, place.longitude)} />
              <DestinationFreshnessPanel destinationId={place.id} language={language} />
              {place.is_community_submission ? <CommunitySuggestionVerificationPanel busy={communityVerificationBusy} canVerify={place.community_contributor_id !== session?.user.id} language={language} mine={myCommunityVerification.data} onSubmit={submitCommunityVerification} verifiedAt={place.community_verified_at} verification={communityVerification.data} /> : null}
              <View className="rounded-3xl border border-ui-border dark:border-ui-dark-border bg-ui-muted dark:bg-ui-dark-muted p-5">
                <InfoRow icon="calendar-remove-outline" label={language === 'es' ? 'Cierre' : 'Closed'} value={place.closed_day || (language === 'es' ? 'Sin dato verificado' : 'No verified data')} />
                {ferries.length ? <InfoRow icon="ferry" label={language === 'es' ? 'Acceso' : 'Access'} value={language === 'es' ? 'Este destino requiere ferri. Consultá las salidas antes de viajar.' : 'This destination requires a ferry. Check departures before travelling.'} /> : null}
                {hasOnlineTicket ? <InfoRow icon="ticket-confirmation-outline" label={language === 'es' ? 'Compra de entradas en línea' : 'Online ticket purchase'} value={language === 'es' ? `Este sitio requiere compra previa. Serás redirigido a ${ticketIssuer}.` : `This site requires advance purchase. You will be redirected to ${ticketIssuer}.`} /> : null}
                {place.notes ? <InfoRow icon="information-outline" label={language === 'es' ? 'Importante' : 'Important'} value={place.notes} /> : null}
                <View className="mt-5 flex-row flex-wrap gap-3 border-t border-ui-border dark:border-ui-dark-border pt-5">
                  {hasOnlineTicket ? <Pressable accessibilityRole="link" className="flex-row items-center rounded-2xl bg-ui-primary dark:bg-ui-dark-primary px-5 py-3" onPress={() => void Linking.openURL(ticketUrl!)}><MaterialCommunityIcons name="ticket-confirmation-outline" size={21} color="white" /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Comprar boleto' : 'Buy ticket'}</Text></Pressable> : null}
                  {place.source_url ? <Pressable className="flex-row items-center rounded-2xl border border-ui-border dark:border-white/20 px-5 py-3" onPress={() => void Linking.openURL(place.source_url!)}><MaterialCommunityIcons name="link-variant" size={21} color="#00e5a7" /><Text className="ml-2 font-black text-ui-text dark:text-ui-dark-text">{documentedSource ? (language === 'es' ? 'Consultar fuente oficial' : 'View official source') : (language === 'es' ? 'Consultar fuente registrada' : 'View registered source')}</Text></Pressable> : null}
                  {hasOnlineTicket ? <Text className="w-full text-xs font-semibold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? `Descubriendo CR te redirige a ${ticketIssuer}; no procesa pagos ni cobra comisión.` : `Descubriendo CR redirects you to ${ticketIssuer}; it does not process payments or charge a fee.`}</Text> : null}
                  <Pressable className="flex-row items-center rounded-2xl border border-coral-500/40 px-5 py-3" onPress={() => setReportOpen(true)}><MaterialCommunityIcons name="flag-outline" size={21} color="#B42318" /><Text className="ml-2 font-black text-coral-600">{language === 'es' ? 'Reportar información incorrecta' : 'Report incorrect information'}</Text></Pressable>
                </View>
              </View>
              {ferries.length ? <FerryAccessPanel ferries={ferries} formatPrice={formatPrice} language={language} /> : null}
              <CommentsPanel comment={comment} language={language} onComment={setComment} onPhoto={pickPhoto} onRating={setRating} onSend={sendReview} photo={photo} rating={rating} reviews={reviews.data} sending={sending} />
            </View>
          </ScrollView>
          <View className="flex-row items-center justify-between border-t border-ui-border dark:border-ui-dark-border bg-ui-surface dark:bg-ui-dark-surface p-4"><Pressable className="flex-row items-center rounded-2xl border border-ui-border dark:border-white/15 px-5 py-3" onPress={() => void onLike(place)}><MaterialCommunityIcons name={place.liked ? 'heart' : 'heart-outline'} size={24} color={place.liked ? '#ff557d' : colors.text} /><Text className="ml-2 font-black text-ui-text dark:text-ui-dark-text">{place.likes_count}</Text></Pressable><Pressable className="rounded-2xl bg-ui-primary dark:bg-ui-dark-primary px-7 py-3" onPress={onClose}><Text className="font-black text-white">{language === 'es' ? 'Cerrar ficha' : 'Close'}</Text></Pressable></View>
        </View>
      </View>
      </Modal>
      <Modal animationType="fade" onRequestClose={() => setSelectedPhotoIndex(null)} statusBarTranslucent transparent visible={selectedPhotoIndex !== null}>
        <View className="flex-1 bg-black">
          <ScrollView contentOffset={{ x: (selectedPhotoIndex ?? 0) * width, y: 0 }} horizontal key={selectedPhotoIndex} pagingEnabled showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>{communityPhotos.map((photo, index) => <View className="flex-1 items-center justify-center" key={photo.id} style={{ width }}><Image accessibilityLabel={`Fotografía ${index + 1} de ${place.name}`} contentFit="contain" source={{ uri: photo.image_url }} style={{ height: '100%', width: '100%' }} /></View>)}</ScrollView>
          <Pressable accessibilityLabel={language === 'es' ? 'Cerrar fotografías' : 'Close photos'} accessibilityRole="button" className="absolute right-5 top-12 h-12 w-12 items-center justify-center rounded-full bg-black/65" onPress={() => setSelectedPhotoIndex(null)}><MaterialCommunityIcons name="close" size={28} color="white" /></Pressable>
        </View>
      </Modal>
      <InformationReportModal open={reportOpen} targetType="destination" targetId={place.id} targetLabel={place.name} language={language} onClose={() => setReportOpen(false)} />
    </>
  );
}

function DestinationVisitInfoPanel({ language, place }: { language: 'es' | 'en'; place: MapPlace }) {
  const info = place.visit_info;
  if (!info) return null;
  const yesNo = (value: boolean) => language === 'es' ? (value ? 'Sí' : 'No') : (value ? 'Yes' : 'No');
  type VisitInfoRow = { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; es: string; en: string; value: string | null };
  const rows: VisitInfoRow[] = [
    { icon: 'car-outline', es: 'Tipo de acceso', en: 'Access', value: info.tipo_acceso },
    { icon: 'road-variant', es: 'Estado del camino', en: 'Road conditions', value: info.estado_camino },
    { icon: 'clock-outline', es: 'Duración estimada', en: 'Estimated duration', value: info.duracion_estimada },
    { icon: 'weather-sunny', es: 'Mejor temporada', en: 'Best season', value: info.mejor_temporada },
    { icon: 'shield-alert-outline', es: 'Seguridad', en: 'Safety', value: info.recomendaciones_seguridad },
    { icon: 'calendar-clock-outline', es: 'Horario de atención', en: 'Opening hours', value: info.horario_atencion },
    { icon: 'calendar-check-outline', es: 'Reserva requerida', en: 'Reservation required', value: info.reserva_requerida ? yesNo(true) : null },
    { icon: 'cash', es: 'Precio de entrada', en: 'Entry price', value: info.booking_price },
    { icon: 'phone-outline', es: 'Contacto para reservar', en: 'Booking contact', value: info.booking_contact },
    { icon: 'information-outline', es: 'Reserva y entrada', en: 'Booking and admission', value: info.booking_notes },
    { icon: 'parking', es: 'Estacionamiento', en: 'Parking', value: info.estacionamiento },
    { icon: 'toilet', es: 'Servicios sanitarios', en: 'Restrooms', value: info.servicios_sanitarios === null ? null : yesNo(info.servicios_sanitarios) },
    { icon: 'silverware-fork-knife', es: 'Restaurante o soda', en: 'Food on site', value: info.restaurante_o_soda === null ? null : yesNo(info.restaurante_o_soda) },
    { icon: 'wheelchair-accessibility', es: 'Accesibilidad', en: 'Accessibility', value: info.acceso_para_discapacitados },
    { icon: 'paw-outline', es: 'Mascotas', en: 'Pets', value: info.se_permite_mascotas },
    { icon: 'tent', es: 'Camping', en: 'Camping', value: info.camping_permitido },
    { icon: 'account-group-outline', es: 'Relevancia cultural', en: 'Cultural significance', value: info.relevancia_cultural },
    { icon: 'identifier', es: 'Código local', en: 'Local code', value: info.codigo_local },
  ];

  const populatedRows = rows.filter((row) => Boolean(row.value));
  const visitRows = rows.slice(0, 10).filter((row) => Boolean(row.value));
  const amenityRows = rows.slice(10, 16).filter((row) => Boolean(row.value));
  const contextRows = rows.slice(16).filter((row) => Boolean(row.value));
  if (!populatedRows.length && !info.enlace_web) return null;
  return <View className="rounded-3xl border border-ui-border bg-ui-surface p-5 dark:border-ui-dark-border dark:bg-ui-dark-surface">
    <View className="mb-5 flex-row items-center"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft"><MaterialCommunityIcons name="map-marker-check-outline" size={24} color="#0B6B4F" /></View><View className="ml-3 flex-1"><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Imprescindible saber' : 'Good to know'}</Text><Text className="mt-0.5 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Detalles prácticos antes de salir' : 'Practical details before you go'}</Text></View></View>
    {visitRows.length ? <View className="overflow-hidden rounded-2xl border border-ui-border dark:border-ui-dark-border">{visitRows.map((row, index) => <VisitInfoRow divider={index < visitRows.length - 1} icon={row.icon} key={row.es} label={language === 'es' ? row.es : row.en} value={row.value!} />)}</View> : null}
    {amenityRows.length ? <View className="mt-6"><Text className="text-xs font-black uppercase tracking-wider text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Servicios y accesibilidad' : 'Services & accessibility'}</Text><View className="mt-3 flex-row flex-wrap gap-3">{amenityRows.map((row) => <VisitInfoFact icon={row.icon} key={row.es} label={language === 'es' ? row.es : row.en} value={row.value!} />)}</View></View> : null}
    {contextRows.length ? <View className="mt-6"><Text className="mb-3 text-xs font-black uppercase tracking-wider text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Contexto del lugar' : 'About this place'}</Text><View className="overflow-hidden rounded-2xl border border-ui-border dark:border-ui-dark-border">{contextRows.map((row, index) => <VisitInfoRow divider={index < contextRows.length - 1} icon={row.icon} key={row.es} label={language === 'es' ? row.es : row.en} value={row.value!} />)}</View></View> : null}
    {info.enlace_web ? <Pressable accessibilityRole="link" className="mt-6 min-h-11 flex-row items-center self-start rounded-2xl bg-ui-primary px-4 py-3 dark:bg-ui-dark-primary" onPress={() => void Linking.openURL(info.enlace_web!)}><MaterialCommunityIcons name={info.reserva_requerida ? 'calendar-check-outline' : 'web'} size={20} color="white" /><Text className="ml-2 font-black text-white">{info.reserva_requerida ? (language === 'es' ? 'Reservar en sitio web' : 'Book on website') : (language === 'es' ? 'Visitar sitio web' : 'Visit website')}</Text></Pressable> : null}
  </View>;
}

function VisitInfoRow({ divider, icon, label, value }: { divider: boolean; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; value: string }) {
  return <View className={divider ? 'flex-row items-start border-b border-ui-border p-4 dark:border-ui-dark-border' : 'flex-row items-start p-4'}><View className="h-9 w-9 items-center justify-center rounded-xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft"><MaterialCommunityIcons name={icon} size={20} color="#0B6B4F" /></View><View className="ml-3 flex-1"><Text className="text-[11px] font-black uppercase tracking-wider text-ui-text-muted dark:text-ui-dark-text-muted">{label}</Text><Text className="mt-1 text-base leading-6 text-ui-text dark:text-ui-dark-text">{value}</Text></View></View>;
}

function VisitInfoFact({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; value: string }) {
  return <View className="flex-1 rounded-2xl border border-ui-border bg-ui-muted p-3 dark:border-ui-dark-border dark:bg-ui-dark-muted" style={{ minWidth: 132 }}><View className="flex-row items-center"><MaterialCommunityIcons name={icon} size={20} color="#0B6B4F" /><Text className="ml-2 flex-1 text-[10px] font-black uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{label}</Text></View><Text className="mt-2 text-sm font-bold leading-5 text-ui-text dark:text-ui-dark-text">{value}</Text></View>;
}

function VisitQuickFacts({ closedDay, language, onNavigate, price, schedule }: { closedDay: string | null; language: 'es' | 'en'; onNavigate: () => void; price: string; schedule: string | null }) {
  return <View className="flex-row flex-wrap gap-3"><View className="flex-1 rounded-2xl border border-ui-primary/40 bg-ui-primary-soft p-4 dark:bg-ui-dark-primary-soft" style={{ minWidth: 150 }}><Text className="text-[10px] font-black uppercase tracking-wider text-ui-primary">{language === 'es' ? 'Tarifa' : 'Price'}</Text><Text className="mt-1 text-xl font-black text-ui-primary">{price}</Text><Text className="mt-1 text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Según tu tipo de visitante' : 'Based on your visitor type'}</Text></View><View className="flex-1 rounded-2xl border border-ui-border bg-ui-muted p-4 dark:border-ui-dark-border dark:bg-ui-dark-muted" style={{ minWidth: 150 }}><Text className="text-[10px] font-black uppercase tracking-wider text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Horario' : 'Hours'}</Text><Text className="mt-1 font-black text-ui-text dark:text-ui-dark-text">{schedule === 'Todo el día' && language === 'en' ? 'All day' : schedule || (language === 'es' ? 'Consultar' : 'Check')}</Text>{closedDay ? <Text className="mt-1 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? `Cierra: ${closedDay}` : `Closed: ${closedDay}`}</Text> : null}</View><Pressable accessibilityRole="link" className="flex-1 rounded-2xl border border-ui-secondary/60 bg-ui-secondary/10 p-4" style={{ minWidth: 150 }} onPress={onNavigate}><Text className="text-[10px] font-black uppercase tracking-wider text-ui-secondary">{language === 'es' ? 'Cómo llegar' : 'Directions'}</Text><Text className="mt-1 font-black text-ui-text dark:text-ui-dark-text">Waze</Text><View className="mt-2 flex-row self-start items-center rounded-xl bg-ui-secondary px-3 py-2"><MaterialCommunityIcons name="waze" size={17} color="white" /><Text className="ml-1.5 text-xs font-black text-white">{language === 'es' ? 'Abrir navegador' : 'Open navigation'}</Text></View></Pressable></View>;
}

function DestinationFreshnessPanel({ destinationId, language }: { destinationId: string; language: 'es' | 'en' }) {
  const { requireAuth, session } = useApp();
  const [busy, setBusy] = useState<DestinationFreshnessCheck>();
  const freshness = useQuery({ queryKey: ['destination-freshness', destinationId], queryFn: () => getDestinationFreshness(destinationId) });
  const mine = useQuery({ queryKey: ['my-destination-freshness', destinationId, session?.user.id], queryFn: () => getMyDestinationFreshness(destinationId, session!.user.id), enabled: Boolean(session) });
  const checks: { id: DestinationFreshnessCheck; es: string; en: string }[] = [
    { id: 'open', es: 'Sigue abierto', en: 'Still open' },
    { id: 'price', es: 'Tarifa correcta', en: 'Price is correct' },
    { id: 'cards', es: 'Aceptan tarjeta', en: 'Cards accepted' },
  ];
  const vote = async (check: DestinationFreshnessCheck, confirmed: boolean) => {
    if (!requireAuth(language === 'es' ? 'Confirmar información reciente' : 'Confirm recent information') || !session) return;
    setBusy(check);
    try {
      await setDestinationFreshnessVote(destinationId, session.user.id, check, confirmed);
      await Promise.all([freshness.refetch(), mine.refetch()]);
    } finally {
      setBusy(undefined);
    }
  };
  return (
    <View className="rounded-3xl border border-ui-border bg-ui-muted p-5 dark:border-ui-dark-border dark:bg-ui-dark-muted">
      <Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Información reciente de viajeros' : 'Recent traveller information'}</Text>
      <Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Confirmá solamente lo que verificaste durante tu visita.' : 'Only confirm what you verified during your visit.'}</Text>
      <View className="mt-4 gap-3">
        {checks.map((check) => {
          const counts = freshness.data?.[check.id];
          const myVote = mine.data?.[check.id];
          return <View className="flex-row flex-wrap items-center justify-between gap-2" key={check.id}><View className="flex-1" style={{ minWidth: 150 }}><Text className="font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? check.es : check.en}</Text><Text className="text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{counts?.confirmed ?? 0} {language === 'es' ? 'confirmaciones' : 'confirmations'}</Text></View><View className="flex-row gap-2"><Pressable accessibilityRole="button" className={myVote === true ? 'rounded-xl bg-ui-primary px-3 py-2' : 'rounded-xl border border-ui-primary px-3 py-2'} disabled={busy === check.id} onPress={() => void vote(check.id, true)}><Text className={myVote === true ? 'font-black text-white' : 'font-black text-ui-primary'}>Sí</Text></Pressable><Pressable accessibilityRole="button" className={myVote === false ? 'rounded-xl bg-coral-600 px-3 py-2' : 'rounded-xl border border-coral-500/50 px-3 py-2'} disabled={busy === check.id} onPress={() => void vote(check.id, false)}><Text className={myVote === false ? 'font-black text-white' : 'font-black text-coral-600'}>No</Text></Pressable></View></View>;
        })}
      </View>
    </View>
  );
}

function CommunitySuggestionVerificationPanel({ busy, canVerify, language, mine, onSubmit, verification, verifiedAt }: { busy: boolean; canVerify: boolean; language: 'es' | 'en'; mine?: MyCommunitySuggestionVerification; onSubmit: (verification: NonNullable<MyCommunitySuggestionVerification>) => void; verification?: CommunitySuggestionVerification; verifiedAt?: string | null }) {
  const [locationCorrect, setLocationCorrect] = useState<boolean>();
  const [accessDifficulty, setAccessDifficulty] = useState<CommunitySuggestionAccessDifficulty>();
  const [hasParking, setHasParking] = useState<boolean>();
  useEffect(() => {
    setLocationCorrect(mine?.location_correct);
    setAccessDifficulty(mine?.access_difficulty);
    setHasParking(mine?.has_parking);
  }, [mine]);
  const locationCount = verification?.location_correct.confirmed ?? 0;
  const locationVerified = Boolean(verifiedAt) || locationCount >= 3;
  const complete = locationCorrect !== undefined && accessDifficulty && hasParking !== undefined;
  const accessOptions: CommunitySuggestionAccessDifficulty[] = ['Fácil', 'Medio', 'Difícil'];
  const label = (value: CommunitySuggestionAccessDifficulty) => language === 'es' ? value : ({ Fácil: 'Easy', Medio: 'Medium', Difícil: 'Difficult' } as Record<CommunitySuggestionAccessDifficulty, string>)[value];
  const binary = (selected: boolean | undefined, onSelect: (value: boolean) => void) => <View className="mt-2 flex-row gap-2"><Pressable accessibilityRole="radio" accessibilityState={{ selected: selected === true }} className={selected === true ? 'flex-1 rounded-xl bg-ui-primary px-3 py-2' : 'flex-1 rounded-xl border border-ui-border px-3 py-2 dark:border-ui-dark-border'} disabled={!canVerify || busy} onPress={() => onSelect(true)}><Text className={selected === true ? 'text-center text-xs font-black text-white' : 'text-center text-xs font-black text-ui-primary'}>{language === 'es' ? 'Sí' : 'Yes'}</Text></Pressable><Pressable accessibilityRole="radio" accessibilityState={{ selected: selected === false }} className={selected === false ? 'flex-1 rounded-xl bg-coral-600 px-3 py-2' : 'flex-1 rounded-xl border border-ui-border px-3 py-2 dark:border-ui-dark-border'} disabled={!canVerify || busy} onPress={() => onSelect(false)}><Text className={selected === false ? 'text-center text-xs font-black text-white' : 'text-center text-xs font-black text-coral-600'}>{language === 'es' ? 'No' : 'No'}</Text></Pressable></View>;
  return <View className="rounded-3xl border border-ui-primary/30 bg-ui-primary-soft p-5 dark:bg-ui-dark-primary-soft"><View className="flex-row items-center justify-between"><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Confirmado por viajeros' : 'Confirmed by travellers'}</Text>{locationVerified ? <View className="rounded-full bg-ui-primary px-3 py-1"><Text className="text-[10px] font-black text-white">{language === 'es' ? 'UBICACIÓN VERIFICADA' : 'LOCATION VERIFIED'}</Text></View> : null}</View><Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? `${locationCount}/3 confirman que la ubicación es correcta.` : `${locationCount}/3 confirm the location is correct.`}</Text>{canVerify ? <View className="mt-4 gap-3"><View className="rounded-2xl bg-ui-surface p-4 dark:bg-ui-dark-surface"><Text className="font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Ubicación correcta' : 'Location is correct'}</Text>{binary(locationCorrect, setLocationCorrect)}</View><View className="rounded-2xl bg-ui-surface p-4 dark:bg-ui-dark-surface"><Text className="font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Acceso' : 'Access'}</Text><View className="mt-2 flex-row gap-2">{accessOptions.map((option) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: accessDifficulty === option }} className={accessDifficulty === option ? 'flex-1 rounded-xl bg-ui-primary px-2 py-2' : 'flex-1 rounded-xl border border-ui-border px-2 py-2 dark:border-ui-dark-border'} disabled={busy} key={option} onPress={() => setAccessDifficulty(option)}><Text className={accessDifficulty === option ? 'text-center text-xs font-black text-white' : 'text-center text-xs font-black text-ui-primary'}>{label(option)}</Text></Pressable>)}</View></View><View className="rounded-2xl bg-ui-surface p-4 dark:bg-ui-dark-surface"><Text className="font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Hay dónde parquear' : 'Parking is available'}</Text>{binary(hasParking, setHasParking)}</View><Pressable accessibilityRole="button" className="items-center rounded-2xl bg-ui-primary px-5 py-3 disabled:opacity-45 dark:bg-ui-dark-primary" disabled={busy || !complete} onPress={() => onSubmit({ location_correct: locationCorrect!, access_difficulty: accessDifficulty!, has_parking: hasParking! })}><Text className="font-black text-white">{busy ? (language === 'es' ? 'Guardando…' : 'Saving…') : (language === 'es' ? 'Guardar mi verificación' : 'Save my verification')}</Text></Pressable></View> : <Text className="mt-3 text-sm font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'No podés confirmar tu propio aporte.' : 'You cannot confirm your own contribution.'}</Text>}</View>;
}

function CommentsPanel({ comment, language, onComment, onPhoto, onRating, onSend, photo, rating, reviews, sending }: { comment: string; language: 'es' | 'en'; onComment: (value: string) => void; onPhoto: () => Promise<void>; onRating: (value: number) => void; onSend: () => Promise<void>; photo?: ImagePicker.ImagePickerAsset; rating: number; reviews?: Awaited<ReturnType<typeof getDestinationReviews>>; sending: boolean }) {
  return <View className="gap-4 border-t border-ui-border pt-6 dark:border-ui-dark-border"><View className="flex-row items-center justify-between"><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Reseñas de la Comunidad' : 'Community Reviews'}</Text><Text className="text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{reviews?.length ?? 0} {language === 'es' ? 'opiniones' : 'reviews'}</Text></View><View className="rounded-3xl border border-ui-border dark:border-ui-dark-border bg-ui-muted dark:bg-ui-dark-muted p-5"><Text className="font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? '¿Visitaste este lugar? Dejá tu experiencia' : 'Have you visited? Share your experience'}</Text><Text className="mb-2 mt-3 text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Calificación' : 'Rating'}</Text><View className="flex-row gap-1">{[1,2,3,4,5].map((star) => <Pressable key={star} onPress={() => onRating(star)}><MaterialCommunityIcons name={star <= rating ? 'star' : 'star-outline'} size={27} color="#ffac16" /></Pressable>)}</View><TextInput className="mt-4 min-h-24 rounded-2xl bg-ui-surface dark:bg-ui-dark-surface px-4 py-3 text-ui-text dark:text-ui-dark-text" maxLength={800} multiline onChangeText={onComment} placeholder={language === 'es' ? 'Compartí tu experiencia…' : 'Share your experience…'} placeholderTextColor="#827d77" textAlignVertical="top" value={comment} />{photo ? <Image source={{ uri: photo.uri }} contentFit="cover" style={{ borderRadius: 16, height: 150, marginTop: 12, width: 200 }} /> : null}<View className="mt-4 flex-row justify-between"><Pressable className="flex-row items-center rounded-2xl border border-ui-border dark:border-white/15 px-4 py-3" onPress={() => void onPhoto()}><MaterialCommunityIcons name="camera-plus-outline" size={21} color="#00a77c" /><Text className="ml-2 font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Foto' : 'Photo'}</Text></Pressable><Pressable className="rounded-2xl bg-ui-primary dark:bg-ui-dark-primary px-5 py-3" disabled={sending || (!comment.trim() && !photo)} onPress={() => void onSend()}><Text className="font-black text-white">{sending ? (language === 'es' ? 'Publicando…' : 'Posting…') : (language === 'es' ? 'Publicar reseña' : 'Post review')}</Text></Pressable></View></View>{reviews?.map((review) => <View className="rounded-3xl bg-ui-muted dark:bg-ui-dark-muted p-5" key={review.id}><View className="flex-row items-center">{review.avatar_url ? <Image source={{ uri: review.avatar_url }} contentFit="cover" style={{ borderRadius: 22, height: 44, width: 44 }} /> : <View className="h-11 w-11 items-center justify-center rounded-full bg-ui-primary dark:bg-ui-dark-primary"><Text className="font-black text-white">{review.author_name.slice(0,1)}</Text></View>}<View className="ml-3 flex-1"><View className="flex-row flex-wrap items-center gap-2"><Text className="font-black text-ui-text dark:text-ui-dark-text">{review.author_name}</Text>{review.author_role === 'admin' ? <View className="flex-row items-center rounded-full bg-ui-primary px-2 py-1"><MaterialCommunityIcons name="shield-crown" size={12} color="white" /><Text className="ml-1 text-[10px] font-black text-white">{language === 'es' ? 'ADMIN' : 'ADMIN'}</Text></View> : null}</View><Text className="text-[#ffac16]">{'★'.repeat(review.rating)}</Text></View><Text className="text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{new Date(review.created_at).toLocaleDateString(language === 'es' ? 'es-CR' : 'en-US')}</Text></View>{review.comment ? <Text className="mt-4 text-base leading-6 text-ui-text dark:text-ui-dark-text">{review.comment}</Text> : null}{review.photos?.[0] ? <Image source={{ uri: review.photos[0] }} contentFit="cover" style={{ borderRadius: 18, height: 220, marginTop: 14, width: '100%' }} /> : null}</View>)}</View>;
}

function FerryAccessPanel({ ferries, formatPrice, language }: { ferries: FerryRoute[]; formatPrice: (value: number) => string; language: 'es' | 'en' }) {
  const dayLabel = language === 'es' ? ['Lunes a viernes', 'Sábado', 'Domingo'] : ['Weekdays', 'Saturday', 'Sunday'];
  return <View className="rounded-3xl border border-caribbean-500/40 bg-caribbean-50 p-5 dark:bg-caribbean-900/30"><View className="flex-row items-center"><MaterialCommunityIcons name="ferry" size={30} color="#0077A8" /><View className="ml-3 flex-1"><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Ferri para llegar' : 'Ferry to get there'}</Text><Text className="mt-0.5 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Horarios, terminal y operador' : 'Schedules, terminal and operator'}</Text></View></View>{ferries.map((ferry) => <View className="mt-5 border-t border-caribbean-500/20 pt-5 first:mt-4 first:border-t-0 first:pt-0" key={ferry.id}><Text className="font-black text-ui-text dark:text-ui-dark-text">{ferry.route}</Text><Text className="mt-1 text-sm font-bold text-caribbean-700 dark:text-caribbean-100">{ferry.operator}</Text>{([ferry.schedules.weekday, ferry.schedules.saturday, ferry.schedules.sunday] as string[][]).map((times, index) => <View className="mt-3" key={dayLabel[index]}><Text className="text-xs font-black uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{dayLabel[index]}</Text><Text className="mt-1 font-bold text-ui-text dark:text-ui-dark-text">{times.length ? times.join(' · ') : (language === 'es' ? 'No publicado' : 'Not published')}</Text></View>)}{ferry.scheduleNote ? <Text className="mt-3 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{ferry.scheduleNote}</Text> : null}<Text className="mt-3 font-bold text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Adulto' : 'Adult'}: {ferry.adultFare === null ? (language === 'es' ? 'No publicada' : 'Not published') : formatPrice(ferry.adultFare)}</Text>{ferry.terminalName ? <View className="mt-3 rounded-2xl bg-white/70 p-3 dark:bg-black/15"><Text className="font-bold text-ui-text dark:text-ui-dark-text">Terminal: {ferry.terminalName}</Text>{ferry.wazeUrl ? <Pressable accessibilityRole="link" className="mt-2 self-start" onPress={() => void Linking.openURL(ferry.wazeUrl!)}><Text className="font-black text-caribbean-700 dark:text-caribbean-100">{language === 'es' ? 'Abrir punto de espera en Waze' : 'Open boarding point in Waze'}</Text></Pressable> : null}</View> : null}<View className="mt-4 flex-row flex-wrap gap-4"><Pressable accessibilityRole="link" onPress={() => void Linking.openURL(ferry.scheduleSourceUrl)}><Text className="font-black text-caribbean-700 dark:text-caribbean-100">{language === 'es' ? 'Ver horario del operador' : 'View operator schedule'}</Text></Pressable>{ferry.ticketUrl ? <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(ferry.ticketUrl!)}><Text className="font-black text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Comprar boleto' : 'Buy ticket'}</Text></Pressable> : null}</View></View>)}</View>;
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

function destinationDescription(place: MapPlace, language: 'es' | 'en') {
  if (language === 'es') return place.description || 'Información en proceso de verificación.';
  return place.description_en || `Discover ${place.name} in ${place.province}, Costa Rica.${place.difficulty ? ` This destination is rated ${difficultyLabel(place.difficulty, 'en').toLowerCase()} for visitors.` : ''}`;
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
