import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { useScrollToTop } from 'expo-router/react-navigation';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';

import { InformationReportModal } from '@/components/information-report-modal';
import { MapCanvas, type MapCoordinate } from '@/components/explore/map-canvas';
import { ThemedAlert as Alert } from '@/components/themed-alert';
import { getAppOptions, type AppOption } from '@/lib/app-options';
import { campaignOffers, openCampaignCheckout, type CampaignOfferId } from '@/lib/billing';
import {
  deleteBusinessPhoto,
  getBusinessReviews,
  getCinemaMovies,
  getCommercialFavoriteIds,
  getCommerceRegions,
  getCommerceDirectory,
  commerceDistanceSortValue,
  getActiveCommerceBanners,
  getMyCommerceCampaigns,
  getOwnerClaims,
  getOwnerDashboard,
  normalizeBusinessAttribution,
  recordBusinessEvent,
  registerCommercialService,
  saveBusinessReview,
  setCommercialFavorite,
  setBusinessCoverPhoto,
  updateCommercialServiceProfile,
  uploadBusinessPhotos,
  type CommerceCategoryId,
  type CommerceRegion,
  type CommerceService,
  type CinemaMovie,
  type OwnerDashboardService,
  type CommerceBannerCampaign,
} from '@/lib/commerce';
import { openNavigation } from '@/lib/logistics';
import { useApp } from '@/providers/app-provider';

type CommercialProfileForm = {
  title: string;
  category: CommerceCategoryId;
  subcategories: string[];
  phone: string;
  whatsapp: string;
  openingHours: string;
  description: string;
  priceRange: string;
  bookingUrl: string;
  menuUrl: string;
  websiteUrl: string;
  parking: string;
  hasParking: boolean;
  paymentMethods: string;
  accessibility: string;
  languages: string;
  experienceType: string;
  certifications: string;
};

const emptyProfileForm = (category: CommerceCategoryId = ''): CommercialProfileForm => ({
  title: '', category, subcategories: [], phone: '', whatsapp: '', openingHours: '', description: '',
  priceRange: '', bookingUrl: '', menuUrl: '', websiteUrl: '', parking: '', hasParking: false, paymentMethods: '',
  accessibility: '', languages: '', experienceType: '', certifications: '',
});

const categoryPastels = ['#2A7B4C20', '#1E5B7520', '#5F9EA020', '#B58A5A20', '#7D9E8A20', '#6F8FB320'];

const listToText = (values: string[] | null | undefined) => (values ?? []).join(', ');
const textToList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const useCommerceTaxonomy = () => {
  const categories = useQuery({ queryKey: ['app-options', 'commerce_category'], queryFn: () => getAppOptions('commerce_category'), staleTime: Infinity });
  const subcategories = useQuery({ queryKey: ['app-options', 'commerce_subcategory'], queryFn: () => getAppOptions('commerce_subcategory'), staleTime: Infinity });
  return { categories: categories.data ?? [], subcategories: subcategories.data ?? [], taxonomyError: categories.isError || subcategories.isError, retryTaxonomy: () => Promise.all([categories.refetch(), subcategories.refetch()]) };
};
const distanceLabel = (distance: number | null, language: 'es' | 'en') => distance == null
  ? (language === 'es' ? 'Buscar en el mapa' : 'Find on map')
  : distance < 1
    ? `${Math.round(distance * 1000)} m ${language === 'es' ? 'de vos' : 'away'}`
    : `${distance.toFixed(1)} km ${language === 'es' ? 'de vos' : 'away'}`;

function TrustBadge({ service, language }: { service: CommerceService; language: 'es' | 'en' }) {
  const sourceLabel = service.source === 'ICT'
    ? (language === 'es' ? 'FUENTE ICT' : 'ICT SOURCE')
    : service.source === 'SINAC'
      ? (language === 'es' ? 'FUENTE SINAC' : 'SINAC SOURCE')
      : service.source === 'owner_registered'
        ? (language === 'es' ? 'REGISTRADO POR EL NEGOCIO' : 'REGISTERED BY BUSINESS')
        : (language === 'es' ? 'APORTE COMUNITARIO' : 'COMMUNITY CONTRIBUTION');
  const officialOperator = service.source === 'ICT' || service.source === 'SINAC';
  return <View className="flex-row flex-wrap gap-2">{service.business_verified_at && service.business_verification_evidence_url ? <Text className="rounded-full bg-ui-primary px-2 py-1 text-[10px] font-black text-white">{language === 'es' ? 'NEGOCIO VERIFICADO' : 'VERIFIED BUSINESS'}</Text> : null}{officialOperator ? <Text className="rounded-full bg-ui-secondary px-2 py-1 text-[10px] font-black text-white">{language === 'es' ? 'OPERADOR OFICIAL' : 'OFFICIAL OPERATOR'}</Text> : null}<Text className="rounded-full bg-ui-muted px-2 py-1 text-[10px] font-black text-ui-text-muted dark:bg-white/10 dark:text-ui-dark-text-muted">{sourceLabel}</Text></View>;
}

function DirectoryShortcut({ icon, label, onPress, primary = false }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; onPress: () => void; primary?: boolean }) {
  return <Pressable accessibilityRole="button" className={primary ? 'min-h-11 flex-row items-center rounded-control bg-ui-primary px-4 active:bg-ui-primary-pressed dark:bg-ui-dark-primary' : 'min-h-11 flex-row items-center rounded-control border border-ui-border bg-ui-surface px-4 active:bg-ui-muted dark:border-ui-dark-border dark:bg-ui-dark-surface dark:active:bg-ui-dark-muted'} onPress={onPress}><MaterialCommunityIcons name={icon} size={18} color={primary ? 'white' : '#087443'} /><Text className={primary ? 'ml-2 font-black text-white' : 'ml-2 font-black text-ui-primary dark:text-ui-dark-primary'}>{label}</Text></Pressable>;
}

function CinemaPosterCarousel({ loading, movies }: { loading: boolean; movies: CinemaMovie[] }) {
  const { language } = useApp();
  if (!loading && !movies.length) return null;
  return <View className="border-b border-ui-border px-5 py-5 dark:border-ui-dark-border"><View className="flex-row items-center justify-between"><View><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Películas en cartelera' : 'Now playing'}</Text><Text className="mt-1 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Abrí la web oficial para ver funciones y comprar.' : 'Open the official site for showtimes and tickets.'}</Text></View><MaterialCommunityIcons name="movie-open-outline" size={24} color="#087443" /></View>{loading ? <ActivityIndicator className="py-8" color="#087443" /> : <ScrollView horizontal className="mt-4" contentContainerStyle={{ gap: 12 }} showsHorizontalScrollIndicator={false}>{movies.map((movie) => <Pressable accessibilityRole="link" className="w-32 overflow-hidden rounded-2xl bg-ui-muted dark:bg-ui-dark-muted" key={movie.id} onPress={() => void Linking.openURL(movie.official_url)}><Image source={{ uri: movie.poster_url }} className="h-48 w-32" resizeMode="cover" /><Text className="min-h-12 px-3 py-2 text-xs font-black leading-4 text-ui-text dark:text-ui-dark-text" numberOfLines={2}>{language === 'es' ? movie.title_es : movie.title_en || movie.title_es}</Text></Pressable>)}</ScrollView>}</View>;
}

function CampaignBanner({ campaign }: { campaign: CommerceBannerCampaign }) {
  const { language } = useApp();
  if (!campaign.target_url) return null;
  return <Pressable accessibilityRole="link" className="mx-5 mb-1 mt-5 overflow-hidden rounded-card border border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface" onPress={() => void Linking.openURL(campaign.target_url!)}>{campaign.business.cover_image_url ? <Image source={{ uri: campaign.business.cover_image_url }} className="h-32 w-full" resizeMode="cover" /> : <View className="h-28 items-center justify-center bg-ui-primary-soft dark:bg-ui-dark-primary-soft"><MaterialCommunityIcons name="storefront-outline" size={38} color="#087443" /></View>}<View className="flex-row items-center px-4 py-3"><View className="flex-1"><Text className="text-[10px] font-black uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Publicidad' : 'Advertisement'}</Text><Text className="mt-1 font-black text-ui-text dark:text-ui-dark-text">{campaign.business.title}</Text></View><Text className="font-black text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Visitar sitio' : 'Visit site'} →</Text></View></Pressable>;
}

function ServiceCard({ service, onOpen }: { service: CommerceService; onOpen: (service: CommerceService) => void }) {
  const { language } = useApp();
  const { qr, qr_code, utm_campaign, utm_content, utm_medium, utm_source, utm_term } = useGlobalSearchParams();
  const attribution = useMemo(() => normalizeBusinessAttribution({ qr, qr_code, utm_campaign, utm_content, utm_medium, utm_source, utm_term }), [qr, qr_code, utm_campaign, utm_content, utm_medium, utm_source, utm_term]);
  const isCinema = service.category === 'cinemas';
  const description = language === 'es'
    ? service.description
    : `Find visitor information, services, and contact details for ${service.title}.`;
  useEffect(() => { void recordBusinessEvent(service.id, 'impression', attribution); }, [service.id, attribution]);
  return (
    <Pressable accessibilityLabel={`${language === 'es' ? 'Abrir detalles de' : 'Open details for'} ${service.title}`} accessibilityRole="button" className="mb-3 min-h-24 flex-row items-center rounded-card border border-ui-border bg-ui-surface p-3 active:opacity-85 dark:border-ui-dark-border dark:bg-ui-dark-surface" onPress={() => onOpen(service)}>
      {service.cover_image_url || service.photos[0] ? <Image source={{ uri: service.cover_image_url ?? service.photos[0] }} className="h-20 w-20 rounded-2xl" resizeMode="cover" /> : <View className="h-20 w-20 items-center justify-center rounded-2xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft"><MaterialCommunityIcons name={isCinema ? 'movie-open-outline' : 'storefront-outline'} size={28} color="#087443" /></View>}
      <View className="ml-3 flex-1">
        <Text className="text-base font-black text-ui-text dark:text-ui-dark-text" numberOfLines={2}>{service.title}</Text>
        <Text className="mt-1 text-xs font-bold text-ui-primary dark:text-ui-dark-primary" numberOfLines={1}>{distanceLabel(service.distance_km, language)} · {service.price_range ?? '₡'}</Text>
        <View className="mt-1 flex-row items-center"><MaterialCommunityIcons name="star" size={15} color="#E0A100" /><Text className="ml-1 text-xs font-black text-ui-text dark:text-ui-dark-text">{service.avg_rating.toFixed(1)}</Text><Text className="ml-1 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">({service.total_reviews})</Text></View>
        {description ? <Text className="mt-1 text-xs leading-4 text-ui-text-muted dark:text-ui-dark-text-muted" numberOfLines={1}>{description}</Text> : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color="#087443" />
    </Pressable>
  );
}

function BusinessDetailModal({ service, saved, onClaim, onClose, onReport, onReviewed, onSaved, subcategoryOptions }: { service: CommerceService | null; saved: boolean; onClaim: (service: CommerceService) => void; onClose: () => void; onReport: (service: CommerceService) => void; onReviewed: () => Promise<void>; onSaved: (service: CommerceService) => void; subcategoryOptions: AppOption[] }) {
  const { language, requireAuth } = useApp();
  const { qr, qr_code, utm_campaign, utm_content, utm_medium, utm_source, utm_term } = useGlobalSearchParams();
  const attribution = useMemo(() => normalizeBusinessAttribution({ qr, qr_code, utm_campaign, utm_content, utm_medium, utm_source, utm_term }), [qr, qr_code, utm_campaign, utm_content, utm_medium, utm_source, utm_term]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const reviews = useQuery({ queryKey: ['business-reviews', service?.id], queryFn: () => getBusinessReviews(service!.id), enabled: Boolean(service) });
  useEffect(() => { setRating(5); setComment(''); }, [service?.id]);
  if (!service) return null;
  const submit = async () => {
    if (!requireAuth(language === 'es' ? 'publicar una reseña' : 'post a review')) return;
    setBusy(true);
    try {
      await saveBusinessReview(service.id, rating, comment);
      setComment('');
      await Promise.all([reviews.refetch(), onReviewed()]);
      Alert.alert(language === 'es' ? 'Reseña publicada' : 'Review posted', language === 'es' ? 'Gracias por compartir tu experiencia.' : 'Thanks for sharing your experience.');
    } catch (error) {
      Alert.alert(language === 'es' ? 'No se pudo publicar' : 'Could not post', error instanceof Error ? error.message : 'Error');
    } finally { setBusy(false); }
  };
  const categoryTags = subcategoryOptions.filter((option) => option.parent_id === service.category);
  const tags = service.subcategories.map((id) => { const option = categoryTags.find((tag) => tag.id === id); return option ? (language === 'es' ? option.label_es : option.label_en) : id; });
  const isCinema = service.category === 'cinemas';
  const description = language === 'es'
    ? service.description
    : `Find visitor information, available services, and contact details for ${service.title}. Confirm current hours and availability directly with the business before visiting.`;
  const phone = service.phone ?? service.whatsapp;
  const openWhatsApp = () => {
    if (!service.whatsapp) return;
    void recordBusinessEvent(service.id, 'whatsapp_click', attribution);
    void Linking.openURL(`https://wa.me/${service.whatsapp.replace(/[^\d]/g, '')}`);
  };
  const call = () => {
    if (!phone) return;
    void recordBusinessEvent(service.id, 'call', attribution);
    void Linking.openURL(`tel:${phone.replace(/[^+\d]/g, '')}`);
  };
  const directions = () => {
    void recordBusinessEvent(service.id, 'directions', attribution);
    if (service.latitude != null && service.longitude != null) void openNavigation(service.latitude, service.longitude);
    else void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${service.title}, Costa Rica`)}`);
  };
  const share = () => {
    const link = service.latitude != null && service.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${service.latitude},${service.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${service.title}, Costa Rica`)}`;
    void Share.share({ message: [service.title, link].filter(Boolean).join(' · ') });
  };
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><View className="flex-1 justify-end bg-black/40"><View className="max-h-[92%] rounded-t-3xl bg-ui-surface p-6 dark:bg-ui-dark-surface"><View className="mb-5 h-1 w-10 self-center rounded-full bg-ui-border dark:bg-ui-dark-border" /><View className="flex-row items-start justify-between"><View className="flex-1 pr-3"><Text className="text-xl font-black text-ui-text dark:text-ui-dark-text">{service.title}</Text><View className="mt-2 flex-row flex-wrap items-center gap-x-4 gap-y-2"><View className="flex-row items-center"><MaterialCommunityIcons name="map-marker-distance" size={20} color="#087443" /><Text className="ml-1 font-black text-ui-primary dark:text-ui-dark-primary">{distanceLabel(service.distance_km, language)}</Text></View><View className="flex-row items-center"><MaterialCommunityIcons name="star" size={22} color="#E0A100" /><Text className="ml-1 text-lg font-black text-ui-text dark:text-ui-dark-text">{service.avg_rating.toFixed(1)}</Text><Text className="ml-2 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{service.total_reviews} {language === 'es' ? 'reseñas' : 'reviews'}</Text></View></View></View><Pressable accessibilityLabel={language === 'es' ? 'Cerrar detalle' : 'Close details'} accessibilityRole="button" className="h-11 w-11 items-center justify-center" onPress={onClose}><MaterialCommunityIcons name="close" size={25} color="#68737A" /></Pressable></View><ScrollView className="mt-4" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    {service.cover_image_url || service.photos[0] ? <Image source={{ uri: service.cover_image_url ?? service.photos[0] }} className="h-44 w-full rounded-2xl" resizeMode="cover" /> : null}
    {description ? <Text className="mt-4 leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{description}</Text> : null}
    <View className="mt-4 flex-row flex-wrap gap-2"><TrustBadge service={service} language={language} />{service.business_updated_at ? <Text className="rounded-full bg-ui-secondary px-2 py-1 text-[10px] font-black text-white">{language === 'es' ? 'ACTUALIZADO POR EL NEGOCIO' : 'UPDATED BY BUSINESS'}</Text> : null}</View>
    <View className="mt-3 flex-row flex-wrap gap-2">{service.opening_hours ? <Text className="rounded-full bg-ui-muted px-3 py-1 text-xs font-bold text-ui-text dark:bg-white/10 dark:text-ui-dark-text">{service.opening_hours}</Text> : null}{service.has_parking || service.parking ? <Text className="rounded-full bg-ui-muted px-3 py-1 text-xs font-bold text-ui-text dark:bg-white/10 dark:text-ui-dark-text">{language === 'es' ? 'Estacionamiento' : 'Parking'}</Text> : null}{service.accessibility ? <Text className="rounded-full bg-ui-muted px-3 py-1 text-xs font-bold text-ui-text dark:bg-white/10 dark:text-ui-dark-text">{service.accessibility}</Text> : null}{service.experience_type ? <Text className="rounded-full bg-ui-muted px-3 py-1 text-xs font-bold text-ui-text dark:bg-white/10 dark:text-ui-dark-text">{service.experience_type}</Text> : null}{tags.map((tag) => <Text className="rounded-full bg-ui-primary-soft px-3 py-1 text-xs font-bold text-ui-primary dark:bg-ui-dark-primary-soft dark:text-ui-dark-primary" key={tag}>{tag}</Text>)}</View>
    {service.payment_methods.length || service.languages.length || service.certifications.length ? <Text className="mt-3 text-xs font-semibold text-ui-text-muted dark:text-ui-dark-text-muted">{[service.payment_methods.join(' · '), service.languages.join(' · '), service.certifications.join(' · ')].filter(Boolean).join(' · ')}</Text> : null}
    <View className="mt-4 flex-row flex-wrap gap-2">{service.whatsapp ? <Pressable accessibilityRole="button" className="flex-1 flex-row items-center justify-center rounded-2xl bg-[#25D366] py-3" onPress={openWhatsApp}><MaterialCommunityIcons name="whatsapp" size={19} color="white" /><Text className="ml-2 font-black text-white">WhatsApp</Text></Pressable> : null}{phone ? <Pressable accessibilityRole="button" className="flex-1 flex-row items-center justify-center rounded-2xl bg-ui-secondary py-3 dark:bg-ui-dark-secondary" onPress={call}><MaterialCommunityIcons name="phone" size={19} color="white" /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Llamar' : 'Call'}</Text></Pressable> : null}<Pressable accessibilityRole="button" className="flex-1 flex-row items-center justify-center rounded-2xl bg-ui-primary py-3 dark:bg-ui-dark-primary" onPress={directions}><MaterialCommunityIcons name="navigation-variant" size={19} color="white" /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Cómo llegar' : 'Directions'}</Text></Pressable></View>
    <View className="mt-4 border-t border-ui-border pt-3 dark:border-ui-dark-border"><View className="flex-row flex-wrap gap-x-4">{service.menu_url || service.external_url ? <Pressable accessibilityRole="link" className="min-h-11 justify-center" onPress={() => void Linking.openURL(service.menu_url ?? service.external_url!)}><Text className="text-xs font-black text-ui-primary">{service.menu_url ? (language === 'es' ? 'Menú / catálogo' : 'Menu / catalog') : (language === 'es' ? 'Sitio web' : 'Website')}</Text></Pressable> : null}{service.booking_url ? <Pressable accessibilityRole="link" className="min-h-11 justify-center" onPress={() => { void recordBusinessEvent(service.id, 'reservation', attribution); void Linking.openURL(service.booking_url!); }}><Text className="text-xs font-black text-ui-primary">{isCinema ? (language === 'es' ? 'Cartelera y boletos' : 'Showtimes & tickets') : (language === 'es' ? 'Reservar' : 'Book')}</Text></Pressable> : null}<Pressable accessibilityLabel={saved ? (language === 'es' ? 'Quitar de guardados' : 'Remove from saved') : (language === 'es' ? 'Guardar comercio' : 'Save business')} accessibilityRole="button" className="min-h-11 flex-row items-center" onPress={() => onSaved(service)}><MaterialCommunityIcons name={saved ? 'heart' : 'heart-outline'} size={17} color="#087443" /><Text className="ml-1 text-xs font-black text-ui-primary">{saved ? (language === 'es' ? 'Guardado' : 'Saved') : (language === 'es' ? 'Guardar' : 'Save')}</Text></Pressable><Pressable accessibilityRole="button" className="min-h-11 justify-center" onPress={share}><Text className="text-xs font-black text-ui-primary">{language === 'es' ? 'Compartir' : 'Share'}</Text></Pressable><Pressable accessibilityRole="button" className="min-h-11 justify-center" onPress={() => { onClose(); onReport(service); }}><Text className="text-xs font-black text-ui-primary">{language === 'es' ? 'Reportar información' : 'Report information'}</Text></Pressable></View>{!service.is_claimed && !service.owner_id ? <Pressable accessibilityRole="button" className="min-h-12 flex-row items-center justify-center rounded-control border border-ui-secondary bg-ui-secondary/10 px-4 dark:border-ui-dark-secondary" onPress={() => { onClose(); onClaim(service); }}><MaterialCommunityIcons name="store-check-outline" size={18} color="#0077A8" /><Text className="ml-2 text-xs font-black text-ui-secondary dark:text-ui-dark-secondary">{language === 'es' ? '¿Administrás este lugar? Reclamá el perfil' : 'Manage this place? Claim the profile'}</Text></Pressable> : null}</View>
    <View className="rounded-2xl bg-ui-primary-soft p-4 dark:bg-ui-dark-primary-soft"><Text className="font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Contá tu experiencia' : 'Share your experience'}</Text><View className="mt-3 flex-row">{[1, 2, 3, 4, 5].map((star) => <Pressable accessibilityLabel={`${star} ${language === 'es' ? 'estrellas' : 'stars'}`} key={star} className="mr-2" onPress={() => setRating(star)}><MaterialCommunityIcons name={star <= rating ? 'star' : 'star-outline'} size={31} color="#E0A100" /></Pressable>)}</View><TextInput value={comment} onChangeText={setComment} placeholder={language === 'es' ? '¿Qué deberían saber otros viajeros?' : 'What should other travelers know?'} multiline className="mt-3 min-h-20 rounded-2xl bg-white px-4 py-3 text-ui-text dark:bg-ui-dark-surface dark:text-ui-dark-text" textAlignVertical="top" /><Pressable disabled={busy} className="mt-3 self-start rounded-xl bg-ui-primary px-5 py-3" onPress={() => void submit()}><Text className="font-black text-white">{busy ? (language === 'es' ? 'Publicando…' : 'Posting…') : (language === 'es' ? 'Publicar reseña' : 'Post review')}</Text></Pressable></View>
    <Text className="mb-3 mt-5 text-sm font-black uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Comentarios recientes' : 'Recent comments'}</Text>{reviews.isLoading ? <ActivityIndicator className="py-8" color="#087443" /> : reviews.isError ? <Text className="py-6 text-center text-red-600">{language === 'es' ? 'No pudimos cargar las reseñas.' : 'Reviews could not load.'}</Text> : reviews.data?.length ? reviews.data.map((review) => <View key={review.id} className="mb-3 rounded-2xl border border-ui-border p-4 dark:border-ui-dark-border"><View className="flex-row items-center justify-between"><View className="flex-row items-center gap-2"><Text className="font-black text-ui-text dark:text-ui-dark-text">{review.author_name}</Text>{review.author_role === 'admin' ? <View className="flex-row items-center rounded-full bg-ui-primary px-2 py-1"><MaterialCommunityIcons name="shield-crown" size={12} color="white" /><Text className="ml-1 text-[10px] font-black text-white">ADMIN</Text></View> : null}</View><View className="flex-row items-center"><MaterialCommunityIcons name="star" size={15} color="#E0A100" /><Text className="ml-1 text-xs font-black text-ui-text dark:text-ui-dark-text">{review.rating}</Text></View></View>{review.comment ? <Text className="mt-2 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{review.comment}</Text> : null}<Text className="mt-2 text-[10px] text-ui-text-muted dark:text-ui-dark-text-muted">{new Date(review.created_at).toLocaleDateString(language === 'es' ? 'es-CR' : 'en-US')}</Text></View>) : <Text className="py-8 text-center text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Sé la primera persona en reseñar este comercio.' : 'Be the first to review this business.'}</Text>}
  </ScrollView></View></View></Modal>;
}

type ProfileTextKey = Exclude<keyof CommercialProfileForm, 'category' | 'subcategories' | 'hasParking'>;

function ProfileEditorFields({
  form,
  language,
  onChange,
  onCategoryChange,
  onToggleParking,
  onToggleSubcategory,
}: {
  form: CommercialProfileForm;
  language: 'es' | 'en';
  onChange: (key: ProfileTextKey, value: string) => void;
  onCategoryChange: (category: CommerceCategoryId) => void;
  onToggleParking: () => void;
  onToggleSubcategory: (subcategory: string) => void;
}) {
  const { categories, subcategories } = useCommerceTaxonomy();
  const hourOptions = language === 'es'
    ? ['Todos los días', 'Lunes a viernes', 'Fin de semana', 'Con cita previa']
    : ['Every day', 'Monday to Friday', 'Weekends', 'By appointment'];
  const customHours = Boolean(form.openingHours && !hourOptions.includes(form.openingHours));
  const availableSubcategories = subcategories.filter((item) => item.parent_id === form.category);
  const field = (key: ProfileTextKey, label: string, placeholder?: string, multiline = false) => <View className="mt-4"><Text className="mb-2 text-sm font-bold text-ui-text dark:text-ui-dark-text">{label}</Text><TextInput accessibilityLabel={label} value={form[key]} onChangeText={(value) => onChange(key, value)} placeholder={placeholder ?? label.replace(' *', '')} placeholderTextColor="#68737A" multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} className={multiline ? 'min-h-24 rounded-control border border-ui-border bg-ui-surface px-4 py-3 text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-surface dark:text-ui-dark-text' : 'min-h-12 rounded-control border border-ui-border bg-ui-surface px-4 text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-surface dark:text-ui-dark-text'} /></View>;

  return <>
    {field('title', language === 'es' ? 'Nombre del comercio o servicio *' : 'Business or service name *')}
    <View className="mt-4"><Text className="mb-2 text-sm font-bold text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Tipo de comercio o servicio *' : 'Business or service type *'}</Text><View className="min-h-12 justify-center overflow-hidden rounded-control border border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface"><Picker accessibilityLabel={language === 'es' ? 'Tipo de comercio o servicio' : 'Business or service type'} selectedValue={form.category} onValueChange={(value) => onCategoryChange(String(value))} style={{ color: '#151B1F' }}><Picker.Item label={language === 'es' ? 'Elegí una opción' : 'Choose an option'} value="" enabled={false} />{categories.map((item) => <Picker.Item key={item.id} label={language === 'es' ? item.label_es : item.label_en} value={item.id} />)}</Picker></View></View>
    {availableSubcategories.length ? <View className="mt-4"><Text className="mb-2 text-sm font-bold text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Especialidades' : 'Specialties'}</Text><View className="flex-row flex-wrap gap-2">{availableSubcategories.map((item) => { const selected = form.subcategories.includes(item.id); return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} className={selected ? 'min-h-11 justify-center rounded-full bg-ui-primary px-4' : 'min-h-11 justify-center rounded-full border border-ui-border bg-ui-surface px-4 dark:border-ui-dark-border dark:bg-ui-dark-surface'} key={item.id} onPress={() => onToggleSubcategory(item.id)}><Text className={selected ? 'text-xs font-black text-white' : 'text-xs font-bold text-ui-text dark:text-ui-dark-text'}>{language === 'es' ? item.label_es : item.label_en}</Text></Pressable>; })}</View></View> : null}
    {form.category === 'other' ? field('experienceType', language === 'es' ? '¿Qué tipo es? *' : 'What type is it? *', language === 'es' ? 'Escribí el tipo de comercio o servicio' : 'Enter the business or service type') : null}
    <View className="mt-4"><Text className="mb-2 text-sm font-bold text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Horario' : 'Hours'}</Text><View className="min-h-12 justify-center overflow-hidden rounded-control border border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface"><Picker accessibilityLabel={language === 'es' ? 'Horario' : 'Hours'} selectedValue={customHours ? 'other' : form.openingHours} onValueChange={(value) => onChange('openingHours', value === 'other' ? ' ' : String(value))} style={{ color: '#151B1F' }}><Picker.Item label={language === 'es' ? 'Elegí una opción' : 'Choose an option'} value="" />{hourOptions.map((option) => <Picker.Item key={option} label={option} value={option} />)}<Picker.Item label={language === 'es' ? 'Otro' : 'Other'} value="other" /></Picker></View></View>
    {customHours ? field('openingHours', language === 'es' ? 'Especificá el horario' : 'Enter the hours', language === 'es' ? 'Ejemplo: lunes a sábado, 8:00–18:00' : 'Example: Monday to Saturday, 8:00–18:00') : null}
    <View className="mt-6 border-t border-ui-border pt-5 dark:border-ui-dark-border"><Text className="text-xs font-black uppercase tracking-[1.5px] text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Contacto y ventas' : 'Contact and sales'}</Text>{field('phone', language === 'es' ? 'Teléfono' : 'Phone')}{field('whatsapp', 'WhatsApp', language === 'es' ? 'Ejemplo: 50688887777' : 'Example: 50688887777')}{field('websiteUrl', language === 'es' ? 'Sitio web' : 'Website', 'https://')}{field('bookingUrl', language === 'es' ? 'Enlace de reservas' : 'Booking link', 'https://')}{field('menuUrl', language === 'es' ? 'Menú o catálogo' : 'Menu or catalog', 'https://')}{field('priceRange', language === 'es' ? 'Rango de precios' : 'Price range', language === 'es' ? 'Ejemplo: ₡₡ o desde ₡15.000' : 'Example: $$ or from $30')}</View>
    <View className="mt-6 border-t border-ui-border pt-5 dark:border-ui-dark-border"><Text className="text-xs font-black uppercase tracking-[1.5px] text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Experiencia y facilidades' : 'Experience and amenities'}</Text>{field('description', language === 'es' ? 'Descripción completa' : 'Full description', language === 'es' ? 'Contá qué ofrece y qué hace especial al lugar.' : 'Describe what you offer and what makes it special.', true)}{field('parking', language === 'es' ? 'Información de parqueo' : 'Parking information')}{field('paymentMethods', language === 'es' ? 'Métodos de pago' : 'Payment methods', language === 'es' ? 'SINPE Móvil, efectivo, Visa' : 'Cash, Visa, mobile payment')}{field('accessibility', language === 'es' ? 'Accesibilidad' : 'Accessibility', undefined, true)}{field('languages', language === 'es' ? 'Idiomas de atención' : 'Service languages', language === 'es' ? 'Español, inglés' : 'Spanish, English')}{field('certifications', language === 'es' ? 'Certificaciones' : 'Certifications', undefined, true)}<Pressable accessibilityRole="checkbox" accessibilityState={{ checked: form.hasParking }} className="mt-4 min-h-12 flex-row items-center rounded-control border border-ui-border px-4 dark:border-ui-dark-border" onPress={onToggleParking}><MaterialCommunityIcons name={form.hasParking ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={22} color="#087443" /><Text className="ml-3 font-bold text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Cuenta con parqueo' : 'Parking available'}</Text></Pressable></View>
  </>;
}

function BusinessLocationEditor({ language, location, onChange }: { language: 'es' | 'en'; location?: MapCoordinate; onChange: (location: MapCoordinate) => void }) {
  const [locating, setLocating] = useState(false);
  const selectCurrentLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error(language === 'es' ? 'Permití el acceso a la ubicación para usar tu posición actual.' : 'Allow location access to use your current position.');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      onChange({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    } catch (error) { Alert.alert(language === 'es' ? 'Ubicación' : 'Location', error instanceof Error ? error.message : 'Error'); }
    finally { setLocating(false); }
  };
  return <View className="mt-6 border-t border-ui-border pt-5 dark:border-ui-dark-border"><Text className="text-xs font-black uppercase tracking-[1.5px] text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Ubicación exacta' : 'Exact location'}</Text><Text className="mt-2 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Usá tu ubicación actual o tocá el mapa donde está el negocio.' : 'Use your current location or tap the business location on the map.'}</Text><Pressable accessibilityRole="button" className="my-4 min-h-12 flex-row items-center justify-center rounded-control bg-ui-secondary px-4 disabled:opacity-50 dark:bg-ui-dark-secondary" disabled={locating} onPress={() => void selectCurrentLocation()}>{locating ? <ActivityIndicator color="white" /> : <MaterialCommunityIcons name="crosshairs-gps" size={20} color="white" />}<Text className="ml-2 font-black text-white">{language === 'es' ? 'Usar mi ubicación actual' : 'Use my current location'}</Text></Pressable><View className="overflow-hidden rounded-card"><MapCanvas onLocationPick={onChange} selectedLocation={location} /></View><Text className="mt-2 text-center text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : (language === 'es' ? 'Tocá el mapa para marcar la ubicación.' : 'Tap the map to set the location.')}</Text></View>;
}

function CampaignOptions({ activeCampaigns, bannerUrl, busy, language, onBannerUrlChange, onBuy }: { activeCampaigns: { campaign_type: 'featured' | 'banner'; ends_at: string; status: string }[]; bannerUrl: string; busy?: string; language: 'es' | 'en'; onBannerUrlChange: (value: string) => void; onBuy: (offerId: CampaignOfferId) => void }) {
  const options = [
    { type: 'featured' as const, icon: 'format-list-numbered' as const, oneTime: 'featured_30d' as const, recurring: 'featured_monthly' as const },
    { type: 'banner' as const, icon: 'image-outline' as const, oneTime: 'banner_30d' as const, recurring: 'banner_monthly' as const },
  ];
  return <View className="mt-5 border-t border-ui-border pt-4 dark:border-ui-dark-border"><Text className="text-xs font-black uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Campañas publicitarias' : 'Advertising campaigns'}</Text><Text className="mt-1 text-xs leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Son adicionales a tu plan actual. Cada periodo dura 30 días.' : 'These are separate from your current plan. Each period lasts 30 days.'}</Text>{options.map((option) => {
    const offer = campaignOffers[option.oneTime];
    const active = activeCampaigns.find((campaign) => campaign.campaign_type === option.type && campaign.status === 'active' && new Date(campaign.ends_at).getTime() > Date.now());
    return <View className="mt-3 rounded-2xl bg-ui-muted p-4 dark:bg-white/10" key={option.type}><View className="flex-row items-start"><MaterialCommunityIcons name={option.icon} size={22} color="#087443" /><View className="ml-3 flex-1"><Text className="font-black text-ui-text dark:text-ui-dark-text">{offer.title[language === 'es' ? 0 : 1]}</Text><Text className="mt-1 text-xs leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{offer.detail[language === 'es' ? 0 : 1]}</Text></View>{active ? <Text className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">{language === 'es' ? `ACTIVA HASTA ${new Date(active.ends_at).toLocaleDateString('es-CR')}` : `ACTIVE UNTIL ${new Date(active.ends_at).toLocaleDateString('en-US')}`}</Text> : null}</View>{Platform.OS === 'web' && option.type === 'banner' ? <TextInput accessibilityLabel={language === 'es' ? 'URL de destino del banner' : 'Banner destination URL'} autoCapitalize="none" autoCorrect={false} keyboardType="url" className="mt-3 min-h-12 rounded-control border border-ui-border bg-ui-surface px-3 text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-surface dark:text-ui-dark-text" placeholder="https://tu-sitio.com" placeholderTextColor="#68737A" value={bannerUrl} onChangeText={onBannerUrlChange} /> : null}{Platform.OS === 'web' ? <View className="mt-3 flex-row gap-2"><Pressable accessibilityRole="button" className="min-h-12 flex-1 items-center justify-center rounded-control border border-ui-primary bg-ui-surface px-2 dark:bg-ui-dark-surface disabled:opacity-50" disabled={Boolean(busy)} onPress={() => onBuy(option.oneTime)}>{busy === option.oneTime ? <ActivityIndicator color="#087443" /> : <><Text className="text-center text-xs font-black text-ui-primary">{language === 'es' ? 'Una vez' : 'One time'}</Text><Text className="text-xs font-bold text-ui-primary">{campaignOffers[option.oneTime].price}</Text></>}</Pressable><Pressable accessibilityRole="button" className="min-h-12 flex-1 items-center justify-center rounded-control bg-ui-primary px-2 disabled:opacity-50" disabled={Boolean(busy)} onPress={() => onBuy(option.recurring)}>{busy === option.recurring ? <ActivityIndicator color="white" /> : <><Text className="text-center text-xs font-black text-white">{language === 'es' ? 'Renovación automática' : 'Auto-renew'}</Text><Text className="text-xs font-bold text-white">{campaignOffers[option.recurring].price}</Text></>}</Pressable></View> : <Text className="mt-3 text-xs font-bold text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Administrá la contratación desde el panel web. Aquí podés consultar el estado de cada campaña.' : 'Manage purchases from the web dashboard. Campaign status remains visible here.'}</Text>}</View>;
  })}</View>;
}

function OwnerAnalytics({ language, service }: { language: 'es' | 'en'; service: OwnerDashboardService }) {
  const { metrics } = service;
  const maxDaily = Math.max(1, ...metrics.daily_views);
  const completed = [service.cover_image_url, service.description, service.phone, service.whatsapp, service.opening_hours, service.booking_url || service.menu_url, service.latitude, service.payment_methods.length, service.languages.length].filter(Boolean).length;
  const completeness = Math.round(completed / 9 * 100);
  const totalContacts = metrics.whatsapp_clicks + metrics.calls + metrics.directions + metrics.reservations;
  const trend = metrics.trend_percent == null ? (language === 'es' ? 'Sin periodo anterior para comparar' : 'No previous period to compare') : `${metrics.trend_percent >= 0 ? '+' : ''}${metrics.trend_percent}% ${language === 'es' ? 'frente a los 30 días anteriores' : 'vs previous 30 days'}`;
  const recommendation = !service.cover_image_url ? (language === 'es' ? 'Agregá una portada para que tu ficha destaque en el directorio.' : 'Add a cover so your listing stands out in the directory.') : completeness < 80 ? (language === 'es' ? 'Completá horarios, enlaces y facilidades para convertir más visitas.' : 'Complete hours, links, and amenities to convert more visits.') : totalContacts === 0 ? (language === 'es' ? 'Compartí tu enlace o QR para empezar a medir contactos atribuidos.' : 'Share your link or QR to start measuring attributed contacts.') : (language === 'es' ? 'Tu perfil está listo. Revisá qué canal genera más contactos.' : 'Your profile is ready. Review which channel drives the most contacts.');
  return <View>
    <View className="mt-4 flex-row flex-wrap gap-2">{[
      { icon: 'eye-outline' as const, label: language === 'es' ? 'Vistas' : 'Views', value: metrics.views },
      { icon: 'account-arrow-right-outline' as const, label: language === 'es' ? 'Contactos' : 'Contacts', value: totalContacts },
      { icon: 'chart-donut' as const, label: language === 'es' ? 'Conversión' : 'Conversion', value: `${metrics.conversion_rate}%` },
      { icon: 'bookmark-outline' as const, label: language === 'es' ? 'Guardados' : 'Saves', value: metrics.saves },
    ].map((metric) => <View className="min-w-[47%] flex-1 rounded-card border border-ui-border bg-ui-surface p-4 dark:border-ui-dark-border dark:bg-ui-dark-surface" key={metric.label}><View className="flex-row items-center"><MaterialCommunityIcons name={metric.icon} size={18} color="#087443" /><Text className="ml-2 text-xs font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{metric.label}</Text></View><Text className="mt-2 text-2xl font-black text-ui-text dark:text-ui-dark-text">{metric.value}</Text></View>)}</View>
    <View className="mt-3 rounded-card border border-ui-border bg-ui-surface p-4 dark:border-ui-dark-border dark:bg-ui-dark-surface"><View className="flex-row items-end justify-between"><View><Text className="text-sm font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Actividad de los últimos 7 días' : 'Last 7 days activity'}</Text><Text className="mt-1 text-xs font-bold text-ui-primary dark:text-ui-dark-primary">{metrics.last_30_days} {language === 'es' ? 'acciones en 30 días' : 'actions in 30 days'} · {trend}</Text></View><Text className="text-xs font-black text-ui-text-muted dark:text-ui-dark-text-muted">{metrics.top_channel}</Text></View><View className="mt-5 h-20 flex-row items-end gap-2">{metrics.daily_views.map((value, index) => <View accessibilityLabel={`${value} ${language === 'es' ? 'vistas' : 'views'}`} className="flex-1 justify-end" key={index}><View className="min-h-1 rounded-t-lg bg-ui-secondary dark:bg-ui-dark-secondary" style={{ height: `${Math.max(6, value / maxDaily * 100)}%` }} /></View>)}</View></View>
    <View className="mt-3 rounded-card bg-ui-primary-soft p-4 dark:bg-ui-dark-primary-soft"><View className="flex-row items-center justify-between"><Text className="font-black text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Calidad del perfil' : 'Profile quality'}</Text><Text className="text-lg font-black text-ui-primary dark:text-ui-dark-primary">{completeness}%</Text></View><View className="mt-3 h-2 overflow-hidden rounded-full bg-ui-border dark:bg-ui-dark-border"><View className="h-full rounded-full bg-ui-primary dark:bg-ui-dark-primary" style={{ width: `${completeness}%` }} /></View><Text className="mt-3 text-sm leading-5 text-ui-text dark:text-ui-dark-text">{recommendation}</Text></View>
    <View className="mt-3 flex-row flex-wrap gap-2">{[
      ['whatsapp', 'WhatsApp', metrics.whatsapp_clicks], ['phone-outline', language === 'es' ? 'Llamadas' : 'Calls', metrics.calls], ['navigation-variant', language === 'es' ? 'Rutas' : 'Directions', metrics.directions], ['calendar-check-outline', language === 'es' ? 'Reservas' : 'Bookings', metrics.reservations], ['qrcode', 'QR', metrics.qr_leads], ['link-variant', 'UTM', metrics.utm_leads],
    ].map(([icon, label, value]) => <View className="min-h-11 flex-row items-center rounded-full border border-ui-border px-3 dark:border-ui-dark-border" key={String(label)}><MaterialCommunityIcons name={icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']} size={16} color="#087443" /><Text className="ml-2 text-xs font-bold text-ui-text dark:text-ui-dark-text">{label}: {value}</Text></View>)}</View>
  </View>;
}

export default function CommerceScreen() {
  const { language, requireAuth, session, userLocation } = useApp();
  const scrollRef = useRef<FlatList<CommerceService>>(null);
  useScrollToTop(scrollRef);
  const router = useRouter();
  const [category, setCategory] = useState<CommerceCategoryId>('cinemas');
  const [subcategory, setSubcategory] = useState<string>();
  const [regionId, setRegionId] = useState<string>();
  const [reporting, setReporting] = useState<CommerceService | null>(null);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerBusy, setRegisterBusy] = useState(false);
  const [registerForm, setRegisterForm] = useState<CommercialProfileForm>(() => emptyProfileForm('food'));
  const [registerPhotos, setRegisterPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [registrationLocation, setRegistrationLocation] = useState<MapCoordinate>();
  const [editing, setEditing] = useState<OwnerDashboardService | null>(null);
  const [editForm, setEditForm] = useState<CommercialProfileForm>(() => emptyProfileForm());
  const [editError, setEditError] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [editLocation, setEditLocation] = useState<MapCoordinate>();
  const [photoBusyId, setPhotoBusyId] = useState<string>();
  const [campaignBusy, setCampaignBusy] = useState<string>();
  const [bannerUrls, setBannerUrls] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<CommerceService | null>(null);
  const { categories, subcategories, taxonomyError, retryTaxonomy } = useCommerceTaxonomy();
  const categorySubcategories = subcategories.filter((option) => option.parent_id === category);

  useEffect(() => {
    if (!category && categories[0]) setCategory(categories[0].id);
  }, [categories, category]);

  const regionsQuery = useQuery({ queryKey: ['commerce-regions'], queryFn: getCommerceRegions, staleTime: 60 * 60 * 1000 });
  const regions = useMemo(() => regionsQuery.data ?? [], [regionsQuery.data]);
  const selectedRegion = useMemo<CommerceRegion | undefined>(() => regions.find((region) => region.id === regionId) ?? regions[0], [regionId, regions]);
  useEffect(() => {
    if (!regionId && regions[0]) setRegionId(regions[0].id);
  }, [regionId, regions]);

  const viewMode = userLocation ? 'nearby' : 'region';
  const directoryOrigin = userLocation ?? (selectedRegion ? { latitude: selectedRegion.latitude, longitude: selectedRegion.longitude } : undefined);
  const directory = useQuery({
    queryKey: ['commerce-directory', category, subcategory, viewMode, regionId, directoryOrigin?.latitude, directoryOrigin?.longitude],
    queryFn: () => getCommerceDirectory(category, directoryOrigin!, subcategory),
    enabled: Boolean(category && directoryOrigin) && (viewMode === 'nearby' || Boolean(selectedRegion)),
    staleTime: 10 * 60 * 1000,
  });
  const cinemaMovies = useQuery({ queryKey: ['cinema-movies'], queryFn: getCinemaMovies, enabled: category === 'cinemas', staleTime: 30 * 60 * 1000 });
  const dashboard = useQuery({ queryKey: ['owner-dashboard'], queryFn: getOwnerDashboard, enabled: dashboardOpen });
  const claims = useQuery({ queryKey: ['owner-claims'], queryFn: getOwnerClaims, enabled: dashboardOpen });
  const campaigns = useQuery({ queryKey: ['commerce-campaigns', session?.user.id], queryFn: getMyCommerceCampaigns, enabled: dashboardOpen && Boolean(session) });
  const banners = useQuery({ queryKey: ['commerce-banners'], queryFn: getActiveCommerceBanners, staleTime: 5 * 60 * 1000 });
  const favoriteIds = useQuery({ queryKey: ['commercial-favorites', session?.user.id], queryFn: getCommercialFavoriteIds, enabled: Boolean(session) });
  const categoryTiles = useMemo(() => [...categories].sort((a, b) => Number(b.id === 'cinemas') - Number(a.id === 'cinemas')), [categories]);
  const selectedCategoryOption = categories.find((item) => item.id === category) ?? categories[0];
  const selectedCategory = { ...selectedCategoryOption, icon: selectedCategoryOption?.icon ?? 'store-outline', label_es: selectedCategoryOption?.label_es ?? '', label_en: selectedCategoryOption?.label_en ?? '' };
  const registrationOrigin = registrationLocation;
  const isCinemaCategory = category === 'cinemas';
  const catalog = useMemo(
    () => [...(directory.data?.featured ?? []), ...(directory.data?.organic ?? [])]
      .sort((a, b) => commerceDistanceSortValue(a.distance_km) - commerceDistanceSortValue(b.distance_km) || a.title.localeCompare(b.title)),
    [directory.data],
  );
  const catalogTitle = isCinemaCategory ? (language === 'es' ? 'Cines cerca de vos' : 'Cinemas near you') : (language === 'es' ? 'Resultados para vos' : 'Results for you');
  const catalogDescription = isCinemaCategory ? (language === 'es' ? 'Ordenados de más cercano a más lejano; los sitios sin ubicación aparecen al final. La cartelera y compra abren en el sitio oficial.' : 'Ordered from nearest to farthest; places without a location appear last. Showtimes and purchase open on the official site.') : (language === 'es' ? 'Del más cercano al más lejano; los sitios sin ubicación aparecen al final.' : 'From nearest to farthest; places without a location appear last.');
  const activeBanner = banners.data?.[0];

  const startCampaignCheckout = async (service: OwnerDashboardService, offerId: CampaignOfferId) => {
    const offer = campaignOffers[offerId];
    const targetUrl = bannerUrls[service.id]?.trim();
    if (offer.campaignType === 'banner') {
      try { const url = new URL(targetUrl); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); } catch { Alert.alert('Descubriendo CR', language === 'es' ? 'Ingresá una URL válida que empiece con https:// o http://.' : 'Enter a valid URL beginning with https:// or http://.'); return; }
    }
    setCampaignBusy(`${service.id}:${offerId}`);
    try {
      const result = await openCampaignCheckout({ offerId, serviceId: service.id, targetUrl });
      if (result.type === 'success') Alert.alert('Descubriendo CR', language === 'es' ? 'Pago recibido. La campaña se activará cuando el proveedor confirme la transacción.' : 'Payment received. The campaign activates after the payment provider confirms the transaction.');
    } catch (error) { Alert.alert('Descubriendo CR', error instanceof Error ? error.message : (language === 'es' ? 'No se pudo abrir el pago.' : 'Payment could not be opened.')); }
    finally { setCampaignBusy(undefined); }
  };

  const submitRegistration = async () => {
    if (!requireAuth('registrar un comercio')) return;
    if (!registerForm.title.trim()) { setRegisterError(language === 'es' ? 'Escribí el nombre del comercio o servicio.' : 'Enter the business or service name.'); return; }
    if (!registerForm.category) { setRegisterError(language === 'es' ? 'Elegí el tipo de comercio o servicio.' : 'Choose the business or service type.'); return; }
    if (registerForm.category === 'other' && !registerForm.experienceType.trim()) { setRegisterError(language === 'es' ? 'Escribí qué tipo de comercio o servicio es.' : 'Enter what type of business or service this is.'); return; }
    if (!registrationOrigin) { setRegisterError(language === 'es' ? 'Usá tu ubicación actual o marcá el negocio en el mapa.' : 'Use your current location or mark the business on the map.'); return; }
    setRegisterError('');
    setRegisterBusy(true);
    try {
      const serviceId = await registerCommercialService({
        mainCategory: registerForm.category,
        subcategory: registerForm.subcategories.join(','),
        title: registerForm.title,
        latitude: registrationOrigin.latitude,
        longitude: registrationOrigin.longitude,
        phone: registerForm.phone,
        whatsapp: registerForm.whatsapp,
        openingHours: registerForm.openingHours,
        description: registerForm.description,
        priceRange: registerForm.priceRange,
        bookingUrl: registerForm.bookingUrl,
        menuUrl: registerForm.menuUrl,
        websiteUrl: registerForm.websiteUrl,
        parking: registerForm.parking,
        hasParking: registerForm.hasParking,
        paymentMethods: textToList(registerForm.paymentMethods),
        accessibility: registerForm.accessibility,
        languages: textToList(registerForm.languages),
        experienceType: registerForm.experienceType,
        certifications: textToList(registerForm.certifications),
      });
      let photoError: unknown;
      if (registerPhotos.length) try { await uploadBusinessPhotos({ id: serviceId, photos: [], cover_image_url: null }, registerPhotos); } catch (error) { photoError = error; }
      void directory.refetch();
      setRegisterOpen(false);
      setRegisterForm(emptyProfileForm(category));
      setRegisterPhotos([]);
      setRegistrationLocation(undefined);
      Alert.alert(language === 'es' ? 'Enviado a revisión' : 'Sent for review', photoError ? (language === 'es' ? 'El comercio quedó pendiente, pero la portada no pudo subirse.' : 'The business is pending, but its cover could not be uploaded.') : (language === 'es' ? 'Un administrador lo revisará antes de publicarlo.' : 'An administrator will review it before publication.'));
    } catch (error) { const message = error instanceof Error ? error.message : ''; setRegisterError(language === 'es' ? (message.includes('authentication_required') ? 'Tu sesión venció. Volvé a iniciar sesión e intentá de nuevo.' : message.includes('invalid commerce category') ? 'Ese tipo ya no está disponible. Elegí otro.' : 'No pudimos enviar el comercio. Revisá tu conexión e intentá de nuevo.') : (message.includes('authentication_required') ? 'Your session expired. Sign in again and retry.' : message.includes('invalid commerce category') ? 'That type is no longer available. Choose another.' : 'We could not send the business. Check your connection and retry.')); }
    finally { setRegisterBusy(false); }
  };

  const pickRegistrationPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(language === 'es' ? 'Permiso requerido' : 'Permission required', language === 'es' ? 'Permití el acceso a tus fotos para elegir una portada.' : 'Allow photo access to choose a cover image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: Math.max(1, 12 - registerPhotos.length), quality: 0.9, exif: false });
    if (!result.canceled) setRegisterPhotos((current) => [...current, ...result.assets].slice(0, 12));
  };

  const openEditor = (service: OwnerDashboardService) => {
    setEditing(service);
    setEditForm({
      title: service.title,
      category: service.category,
      subcategories: service.subcategories,
      phone: service.phone ?? '',
      whatsapp: service.whatsapp ?? '',
      openingHours: service.opening_hours ?? '',
      description: service.description ?? '',
      priceRange: service.price_range ?? '',
      bookingUrl: service.booking_url ?? '',
      menuUrl: service.menu_url ?? '',
      websiteUrl: service.external_url ?? '',
      parking: service.parking ?? '',
      hasParking: service.has_parking,
      paymentMethods: listToText(service.payment_methods),
      accessibility: service.accessibility ?? '',
      languages: listToText(service.languages),
      experienceType: service.experience_type ?? '',
      certifications: listToText(service.certifications),
    });
    setEditLocation(service.latitude != null && service.longitude != null ? { latitude: service.latitude, longitude: service.longitude } : undefined);
    setEditError('');
  };

  const submitEdit = async () => {
    if (!editing) return;
    if (!editForm.title.trim()) { setEditError(language === 'es' ? 'El nombre es obligatorio.' : 'Name is required.'); return; }
    setEditBusy(true);
    try {
      await updateCommercialServiceProfile(editing.id, {
        title: editForm.title,
        category: editForm.category,
        subcategories: editForm.subcategories,
        phone: editForm.phone,
        whatsapp: editForm.whatsapp,
        openingHours: editForm.openingHours,
        description: editForm.description,
        priceRange: editForm.priceRange,
        bookingUrl: editForm.bookingUrl,
        menuUrl: editForm.menuUrl,
        websiteUrl: editForm.websiteUrl,
        parking: editForm.parking,
        hasParking: editForm.hasParking,
        paymentMethods: textToList(editForm.paymentMethods),
        accessibility: editForm.accessibility,
        languages: textToList(editForm.languages),
        experienceType: editForm.experienceType,
        certifications: textToList(editForm.certifications),
        latitude: editLocation?.latitude,
        longitude: editLocation?.longitude,
      });
      await Promise.all([dashboard.refetch({ throwOnError: true }), directory.refetch({ throwOnError: true })]);
      setEditing(null);
    } catch (error) { setEditError(error instanceof Error ? error.message : (language === 'es' ? 'No pudimos guardar los cambios.' : 'Changes could not be saved.')); }
    finally { setEditBusy(false); }
  };

  const refreshOwnerContent = async () => {
    await Promise.all([dashboard.refetch(), directory.refetch()]);
  };

  const addPhotos = async (service: OwnerDashboardService) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(language === 'es' ? 'Permiso requerido' : 'Permission required', language === 'es' ? 'Permití el acceso a tus fotos para administrar la galería del negocio.' : 'Allow photo access to manage the business gallery.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: Math.max(1, 12 - service.photos.length), quality: 0.9 });
    if (result.canceled) return;
    setPhotoBusyId(service.id);
    try {
      await uploadBusinessPhotos(service, result.assets);
      await refreshOwnerContent();
    } catch (error) {
      Alert.alert(language === 'es' ? 'No se pudo subir la foto' : 'Photo upload failed', error instanceof Error ? error.message : 'Error');
    } finally { setPhotoBusyId(undefined); }
  };

  const chooseCover = async (service: OwnerDashboardService, url: string) => {
    setPhotoBusyId(service.id);
    try {
      await setBusinessCoverPhoto(service, url);
      await refreshOwnerContent();
    } catch (error) {
      Alert.alert(language === 'es' ? 'No se pudo cambiar la portada' : 'Cover update failed', error instanceof Error ? error.message : 'Error');
    } finally { setPhotoBusyId(undefined); }
  };

  const removePhoto = (service: OwnerDashboardService, url: string) => {
    Alert.alert(language === 'es' ? 'Eliminar foto' : 'Delete photo', language === 'es' ? 'La foto se eliminará de la galería.' : 'The photo will be removed from the gallery.', [
      { text: language === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
      { text: language === 'es' ? 'Eliminar' : 'Delete', style: 'destructive', onPress: async () => {
        setPhotoBusyId(service.id);
        try {
          await deleteBusinessPhoto(service, url);
          await refreshOwnerContent();
        } catch (error) {
          Alert.alert(language === 'es' ? 'No se pudo eliminar' : 'Delete failed', error instanceof Error ? error.message : 'Error');
        } finally { setPhotoBusyId(undefined); }
      } },
    ]);
  };

  const toggleFavorite = async (service: CommerceService) => {
    if (!requireAuth(language === 'es' ? 'guardar un comercio' : 'save a business')) return;
    const saved = (favoriteIds.data ?? []).includes(service.id);
    try {
      await setCommercialFavorite(service.id, !saved);
      await favoriteIds.refetch();
    } catch (error) { Alert.alert(language === 'es' ? 'No se pudo guardar' : 'Could not save', error instanceof Error ? error.message : 'Error'); }
  };

  const header = (
    <View>
      <View className="border-b border-ui-border bg-[#F8F6F0] px-5 py-2 dark:border-ui-dark-border dark:bg-ui-dark-surface">
        <Text className="text-xs font-black uppercase tracking-[2px] text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Directorio de confianza' : 'Trusted directory'}</Text>
        <Text className="mt-0.5 text-2xl font-extrabold tracking-tight text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Comercios y servicios' : 'Businesses & services'}</Text>
        <Text className="mt-0.5 max-w-xl text-xs leading-4 text-ui-text-muted dark:text-ui-dark-text-muted" numberOfLines={1}>{language === 'es' ? 'Todo lo útil para tu viaje, organizado por experiencia y cercanía.' : 'Everything useful for your trip, organized by experience and proximity.'}</Text>
        <ScrollView horizontal className="mt-2" contentContainerStyle={{ gap: 10 }} showsHorizontalScrollIndicator={false}>
          <DirectoryShortcut icon="store-plus-outline" label={language === 'es' ? 'Registrar comercio' : 'Register business'} onPress={() => { if (requireAuth('registrar un comercio')) { setRegisterForm(emptyProfileForm(category)); setRegisterPhotos([]); setRegistrationLocation(userLocation ?? undefined); setRegisterError(''); setRegisterOpen(true); } }} primary />
          <DirectoryShortcut icon="chart-line" label={language === 'es' ? 'Panel de propietarios' : 'Owner dashboard'} onPress={() => { if (requireAuth('abrir el panel para propietarios')) setDashboardOpen(true); }} />
          {Platform.OS === 'web' ? <DirectoryShortcut icon="crown-outline" label={language === 'es' ? 'Planes Pro' : 'Pro plans'} onPress={() => { if (requireAuth('ver los planes Pro')) router.push('/subscriptions'); }} /> : null}
        </ScrollView>
      </View>
      {activeBanner ? <CampaignBanner campaign={activeBanner} /> : null}
      <View className="pt-6"><Text className="px-5 text-xs font-black uppercase tracking-[1.5px] text-[#1E5B75] dark:text-ui-dark-text">{language === 'es' ? '¿Qué necesitás?' : 'What do you need?'}</Text><View className="mt-3 flex-row flex-wrap px-5">{categoryTiles.map((item, index) => <Pressable accessibilityRole="button" accessibilityState={{ selected: category === item.id }} key={item.id} onPress={() => { setCategory(item.id); setSubcategory(undefined); }} style={{ elevation: 2, shadowColor: '#1E5B75', shadowOffset: { height: 1, width: 0 }, shadowOpacity: 0.1, shadowRadius: 2, width: '25%' }} className={category === item.id ? 'h-20 items-center justify-center rounded-card border border-[#2A7B4C] bg-white px-2' : 'h-20 items-center justify-center rounded-card border border-ui-border bg-white px-2 dark:border-ui-dark-border dark:bg-ui-dark-surface'}><View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: categoryPastels[index % categoryPastels.length] }}><MaterialCommunityIcons name={(item.icon ?? 'store-outline') as React.ComponentProps<typeof MaterialCommunityIcons>['name']} size={19} color="#2A7B4C" /></View><Text className={category === item.id ? 'mt-1 text-center text-[11px] font-black leading-3 text-[#2A7B4C]' : 'mt-1 text-center text-[11px] font-bold leading-3 text-[#4B5563] dark:text-ui-dark-text'} numberOfLines={2}>{language === 'es' ? item.label_es : item.label_en}</Text></Pressable>)}</View></View>
      {category === 'cinemas' ? <CinemaPosterCarousel loading={cinemaMovies.isLoading} movies={cinemaMovies.data ?? []} /> : null}
      {categorySubcategories.length ? <View className="mt-5"><Text className="px-5 text-xs font-black uppercase tracking-[1.5px] text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Afiná la experiencia' : 'Refine the experience'}</Text><ScrollView horizontal className="mt-3" contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} showsHorizontalScrollIndicator={false}><Pressable accessibilityRole="button" accessibilityState={{ selected: !subcategory }} className={!subcategory ? 'min-h-11 justify-center rounded-full bg-ui-secondary px-4 dark:bg-ui-dark-secondary' : 'min-h-11 justify-center rounded-full bg-ui-muted px-4 dark:bg-ui-dark-muted'} onPress={() => setSubcategory(undefined)}><Text className={!subcategory ? 'text-xs font-black text-white' : 'text-xs font-bold text-ui-text dark:text-ui-dark-text'}>{language === 'es' ? 'Todas' : 'All'}</Text></Pressable>{categorySubcategories.map((tag) => <Pressable accessibilityRole="button" accessibilityState={{ selected: subcategory === tag.id }} className={subcategory === tag.id ? 'min-h-11 justify-center rounded-full bg-ui-secondary px-4 dark:bg-ui-dark-secondary' : 'min-h-11 justify-center rounded-full bg-ui-muted px-4 dark:bg-ui-dark-muted'} key={tag.id} onPress={() => setSubcategory(tag.id)}><Text className={subcategory === tag.id ? 'text-xs font-black text-white' : 'text-xs font-bold text-ui-text dark:text-ui-dark-text'}>{language === 'es' ? tag.label_es : tag.label_en}</Text></Pressable>)}</ScrollView></View> : null}
    </View>
  );

  if (taxonomyError) return <View className="flex-1 items-center justify-center bg-ui-background px-6 dark:bg-ui-dark-background"><MaterialCommunityIcons name="database-alert-outline" size={46} color="#B42318" /><Text className="mt-4 text-center font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'No pudimos cargar las categorías.' : 'Categories could not be loaded.'}</Text><Pressable className="mt-4 rounded-2xl bg-ui-primary px-5 py-3" onPress={() => void retryTaxonomy()}><Text className="font-black text-white">{language === 'es' ? 'Reintentar' : 'Retry'}</Text></Pressable></View>;

  return (
    <View className="flex-1 bg-[#F8F6F0] dark:bg-ui-dark-background">
      <FlatList
        ref={scrollRef}
        data={catalog}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <View className="px-5"><ServiceCard service={item} onOpen={setDetail} /></View>}
        contentContainerStyle={{ paddingBottom: 28 }}
        ListHeaderComponent={<>{header}{catalog.length ? <View className="mb-3 px-5"><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{catalogTitle}</Text><Text className="mt-1 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{catalogDescription} {catalog.length} {language === 'es' ? 'lugares.' : 'places.'}</Text></View> : null}</>}
        ListEmptyComponent={regionsQuery.isLoading || directory.isLoading ? <View className="mx-5 min-h-52 items-center justify-center"><ActivityIndicator size="large" color="#087443" /><Text className="mt-4 text-center font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Cargando regiones y comercios…' : 'Loading regions and businesses…'}</Text></View> : regionsQuery.isError || directory.isError ? <View accessibilityRole="alert" className="mx-5 min-h-52 items-center justify-center rounded-card border border-ui-border bg-ui-surface px-6 py-10 dark:border-ui-dark-border dark:bg-ui-dark-surface"><MaterialCommunityIcons name="cloud-alert-outline" size={44} color="#B42318" /><Text className="mt-4 text-center text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'No pudimos cargar el directorio' : 'Directory could not load'}</Text><Text className="mt-2 text-center text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Revisá tu conexión e intentá de nuevo.' : 'Check your connection and try again.'}</Text><Pressable accessibilityRole="button" className="mt-5 min-h-11 justify-center rounded-control bg-ui-primary px-5" onPress={() => { void regionsQuery.refetch(); void directory.refetch(); }}><Text className="font-black text-white">{language === 'es' ? 'Reintentar' : 'Retry'}</Text></Pressable></View> : <View className="mx-5 min-h-52 items-center justify-center rounded-card border border-dashed border-ui-border bg-ui-surface px-6 py-10 dark:border-ui-dark-border dark:bg-ui-dark-surface"><MaterialCommunityIcons name={selectedCategory.icon} size={44} color="#68737A" /><Text className="mt-4 text-center text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Aún no hay perfiles en esta selección' : 'No profiles in this selection yet'}</Text><Text className="mt-2 text-center text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Probá otra categoría. Si administrás un negocio, podés registrarlo desde arriba.' : 'Try another category. If you manage a business, you can register it above.'}</Text></View>}
      />
      <BusinessDetailModal service={detail} saved={detail ? (favoriteIds.data ?? []).includes(detail.id) : false} onClaim={(service) => router.push({ pathname: '/claim-business', params: { serviceId: service.id } })} onClose={() => setDetail(null)} onReport={setReporting} onReviewed={async () => { await directory.refetch(); }} onSaved={(service) => void toggleFavorite(service)} subcategoryOptions={subcategories} />
      <Modal visible={dashboardOpen} transparent animationType="slide" onRequestClose={() => setDashboardOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[90%] rounded-t-3xl bg-ui-surface p-6 dark:bg-ui-dark-surface">
            <View className="mb-5 h-1 w-10 self-center rounded-full bg-ui-border dark:bg-ui-dark-border" />
            <View className="flex-row items-center justify-between"><Text className="text-xl font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Panel para propietarios' : 'Owner dashboard'}</Text><Pressable accessibilityLabel={language === 'es' ? 'Cerrar panel' : 'Close dashboard'} accessibilityRole="button" className="h-11 w-11 items-center justify-center" onPress={() => setDashboardOpen(false)}><MaterialCommunityIcons name="close" size={24} color="#68737A" /></Pressable></View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="mt-5 text-xs font-black uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Solicitudes de reclamo' : 'Ownership claims'}</Text>
              {claims.isLoading ? <ActivityIndicator className="py-5" color="#087443" /> : claims.isError ? <Text className="mt-3 text-sm font-semibold text-red-600">{language === 'es' ? 'No pudimos cargar tus solicitudes.' : 'Your claims could not load.'}</Text> : claims.data?.length ? claims.data.map((claim) => {
                const appearance = claim.status === 'approved' ? { label: language === 'es' ? 'Aprobado' : 'Approved', icon: 'check-circle-outline' as const, color: '#087443', background: '#E7F5ED' } : claim.status === 'rejected' ? { label: language === 'es' ? 'Rechazado' : 'Rejected', icon: 'close-circle-outline' as const, color: '#B42318', background: '#FDECEC' } : { label: language === 'es' ? 'Pendiente' : 'Pending', icon: 'clock-outline' as const, color: '#9A6700', background: '#FFF6D8' };
                return <View key={claim.id} className="mt-3 rounded-2xl border border-ui-border p-4 dark:border-ui-dark-border">
                  <View className="flex-row items-start justify-between gap-3"><View className="flex-1"><Text className="font-black text-ui-text dark:text-ui-dark-text">{claim.service_title}</Text><Text className="mt-1 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{new Date(claim.created_at).toLocaleDateString(language === 'es' ? 'es-CR' : 'en-US')}</Text></View><View className="flex-row items-center rounded-full px-3 py-1.5" style={{ backgroundColor: appearance.background }}><MaterialCommunityIcons name={appearance.icon} size={15} color={appearance.color} /><Text className="ml-1 text-xs font-black" style={{ color: appearance.color }}>{appearance.label}</Text></View></View>
                  {claim.message ? <Text className="mt-2 text-xs leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{claim.message}</Text> : null}
                </View>;
              }) : <Text className="mt-3 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Todavía no enviaste solicitudes.' : 'You have not submitted any claims yet.'}</Text>}

              <Text className="mt-6 text-xs font-black uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Mis negocios' : 'My businesses'}</Text>
              {dashboard.isLoading ? <ActivityIndicator className="py-8" color="#087443" /> : dashboard.isError ? <Text className="mt-3 text-sm font-semibold text-red-600">{language === 'es' ? 'No pudimos cargar tus negocios.' : 'Your businesses could not load.'}</Text> : dashboard.data?.length ? dashboard.data.map((service) => {
                const categoryInfo = categories.find((item) => item.id === service.category);
                const tagLabels = subcategories.filter((tag) => tag.parent_id === service.category && service.subcategories.includes(tag.id)).map((tag) => language === 'es' ? tag.label_es : tag.label_en);
                return <View key={service.id} className="mt-4 overflow-hidden rounded-card border border-ui-border bg-ui-background dark:border-ui-dark-border dark:bg-ui-dark-background">
                  <View className="relative min-h-44 justify-end overflow-hidden bg-ui-primary p-5 dark:bg-ui-dark-surface">{service.cover_image_url ? <Image source={{ uri: service.cover_image_url }} className="absolute inset-0 h-full w-full opacity-35" resizeMode="cover" /> : null}<View className="absolute inset-0 bg-black/25" /><View><View className="flex-row items-center"><Text className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">{service.subscription ? `${service.subscription.plan} · ${service.subscription.status}` : (language === 'es' ? 'PERFIL PROPIETARIO' : 'OWNER PROFILE')}</Text><Text className="ml-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black text-ui-primary">{service.claim_status.toUpperCase()}</Text></View><Text className="mt-3 text-2xl font-black text-white">{service.title}</Text><Text className="mt-1 text-xs font-bold text-white/80">{(language === 'es' ? categoryInfo?.label_es : categoryInfo?.label_en) ?? service.category} · {regions.find((region) => region.id === service.region_id)?.[language === 'es' ? 'name_es' : 'name_en'] ?? (service.latitude != null ? (language === 'es' ? 'Ubicación exacta configurada' : 'Exact location set') : (language === 'es' ? 'Ubicación pendiente' : 'Location pending'))}</Text>{service.subscription ? <Text className="mt-2 text-xs font-bold text-white">US${Number(service.subscription.price_usd).toFixed(2)} · {service.subscription.current_period_end ? `${language === 'es' ? 'vigente hasta' : 'active until'} ${new Date(service.subscription.current_period_end).toLocaleDateString(language === 'es' ? 'es-CR' : 'en-US')}` : (language === 'es' ? 'activación pendiente' : 'activation pending')}</Text> : null}</View></View>
                  <View className="p-4">
                  {tagLabels.length ? <View className="mt-2 flex-row flex-wrap gap-2">{tagLabels.map((tag) => <Text key={tag} className="rounded-full bg-ui-primary-soft px-2 py-1 text-[10px] font-black text-ui-primary dark:bg-ui-dark-primary-soft">{tag}</Text>)}</View> : null}
                  <OwnerAnalytics language={language} service={service} />
                  <CampaignOptions activeCampaigns={(campaigns.data ?? []).filter((campaign) => campaign.service_id === service.id)} bannerUrl={bannerUrls[service.id] ?? service.booking_url ?? service.menu_url ?? ''} busy={campaignBusy?.startsWith(`${service.id}:`) ? campaignBusy.slice(service.id.length + 1) : undefined} language={language} onBannerUrlChange={(value) => setBannerUrls((current) => ({ ...current, [service.id]: value }))} onBuy={(offerId) => void startCampaignCheckout(service, offerId)} />
                  <View className="mt-4 flex-row items-center justify-between"><View><Text className="text-sm font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Galería del negocio' : 'Business gallery'}</Text><Text className="text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{service.photos.length}/12 · {language === 'es' ? 'selección múltiple disponible' : 'multiple selection available'}</Text></View><Pressable accessibilityRole="button" disabled={photoBusyId === service.id || service.photos.length >= 12} className="min-h-11 flex-row items-center rounded-control bg-ui-primary px-3 disabled:opacity-50" onPress={() => void addPhotos(service)}>{photoBusyId === service.id ? <ActivityIndicator size="small" color="white" /> : <MaterialCommunityIcons name="image-multiple-outline" size={17} color="white" />}<Text className="ml-1 text-xs font-black text-white">{language === 'es' ? 'Agregar fotos' : 'Add photos'}</Text></Pressable></View>
                  {service.photos.length ? <ScrollView horizontal className="mt-3" contentContainerStyle={{ gap: 10 }} showsHorizontalScrollIndicator={false}>{service.photos.map((photo) => <View key={photo} className="overflow-hidden rounded-2xl bg-ui-muted"><Image source={{ uri: photo }} className="h-28 w-36" resizeMode="cover" />{service.cover_image_url === photo ? <Text className="absolute left-2 top-2 rounded-full bg-ui-primary px-2 py-1 text-[9px] font-black text-white">{language === 'es' ? 'PORTADA' : 'COVER'}</Text> : null}<View className="flex-row justify-end gap-1 p-1"><Pressable accessibilityLabel={language === 'es' ? 'Usar como portada' : 'Use as cover'} className="rounded-lg bg-white p-1.5" onPress={() => void chooseCover(service, photo)}><MaterialCommunityIcons name={service.cover_image_url === photo ? 'star' : 'star-outline'} size={17} color="#087443" /></Pressable><Pressable accessibilityLabel={language === 'es' ? 'Eliminar foto' : 'Delete photo'} className="rounded-lg bg-white p-1.5" onPress={() => removePhoto(service, photo)}><MaterialCommunityIcons name="trash-can-outline" size={17} color="#B42318" /></Pressable></View></View>)}</ScrollView> : <View className="mt-3 items-center rounded-2xl border border-dashed border-ui-border py-5 dark:border-ui-dark-border"><MaterialCommunityIcons name="image-multiple-outline" size={28} color="#68737A" /><Text className="mt-1 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Agregá una foto; la primera será la portada.' : 'Add a photo; the first one becomes the cover.'}</Text></View>}
                  <Pressable accessibilityRole="button" className="mt-4 min-h-12 flex-row items-center justify-center rounded-control bg-ui-primary px-4" onPress={() => openEditor(service)}><MaterialCommunityIcons name="tune-variant" size={18} color="white" /><Text className="ml-2 text-center font-black text-white">{language === 'es' ? 'Editar todo el perfil' : 'Edit full profile'}</Text></Pressable>
                  </View>
                </View>;
              }) : <View className="items-center py-10"><MaterialCommunityIcons name="store-plus-outline" size={42} color="#68737A" /><Text className="mt-3 text-center font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Todavía no tenés comercios reclamados.' : 'You have no claimed businesses yet.'}</Text></View>}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={registerOpen} transparent animationType="slide" onRequestClose={() => setRegisterOpen(false)}>
        <View className="flex-1 justify-end bg-black/40"><View className="max-h-[92%] rounded-t-3xl bg-ui-surface p-6 dark:bg-ui-dark-surface">
          <Text className="text-xl font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Registrar comercio' : 'Register business'}</Text>
          <Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? `Completá sólo lo esencial. Se mostrará según cercanía desde ${viewMode === 'nearby' ? 'tu ubicación' : selectedRegion?.name_es ?? 'la región seleccionada'}.` : `Complete only the essentials. It will appear by distance from ${viewMode === 'nearby' ? 'your location' : selectedRegion?.name_en ?? 'the selected region'}.`}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <ProfileEditorFields form={registerForm} language={language} onChange={(key, value) => setRegisterForm((current) => ({ ...current, [key]: value }))} onCategoryChange={(nextCategory) => setRegisterForm((current) => ({ ...current, category: nextCategory, subcategories: [], experienceType: nextCategory === 'other' ? current.experienceType : '' }))} onToggleParking={() => setRegisterForm((current) => ({ ...current, hasParking: !current.hasParking }))} onToggleSubcategory={(tag) => setRegisterForm((current) => ({ ...current, subcategories: current.subcategories.includes(tag) ? current.subcategories.filter((item) => item !== tag) : [...current.subcategories, tag] }))} />
            <BusinessLocationEditor language={language} location={registrationLocation} onChange={setRegistrationLocation} />
            <View className="mt-6 border-t border-ui-border pt-5 dark:border-ui-dark-border"><Text className="text-xs font-black uppercase tracking-[1.5px] text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Fotos' : 'Photos'}</Text><Pressable accessibilityRole="button" className="mt-3 min-h-16 items-center justify-center rounded-card border border-dashed border-ui-primary bg-ui-primary-soft px-4 dark:bg-ui-dark-primary-soft" onPress={() => void pickRegistrationPhotos()}><MaterialCommunityIcons name="image-multiple-outline" size={25} color="#087443" /><Text className="mt-1 font-black text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Elegir varias fotos' : 'Choose multiple photos'}</Text><Text className="mt-1 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{registerPhotos.length}/12 · JPG, PNG o WebP · máximo 6 MB por archivo</Text></Pressable>{registerPhotos.length ? <ScrollView horizontal className="mt-3" contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>{registerPhotos.map((photo, index) => <View className="relative" key={`${photo.uri}-${index}`}><Image source={{ uri: photo.uri }} className="h-24 w-32 rounded-2xl" resizeMode="cover" /><Pressable accessibilityLabel={language === 'es' ? `Quitar foto ${index + 1}` : `Remove photo ${index + 1}`} className="absolute right-1 top-1 h-9 w-9 items-center justify-center rounded-full bg-black/60" onPress={() => setRegisterPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}><MaterialCommunityIcons name="close" size={18} color="white" /></Pressable></View>)}</ScrollView> : null}</View>
            {registerError ? <Text className="mt-2 text-xs font-semibold text-red-600">{registerError}</Text> : null}
            <View className="mt-4 flex-row gap-3"><Pressable disabled={registerBusy} className="flex-1 rounded-2xl border border-ui-border py-3 dark:border-ui-dark-border" onPress={() => setRegisterOpen(false)}><Text className="text-center font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Cancelar' : 'Cancel'}</Text></Pressable><Pressable disabled={registerBusy || !registerForm.category} className="flex-1 rounded-2xl bg-ui-primary py-3 disabled:opacity-40" onPress={() => void submitRegistration()}><Text className="text-center font-black text-white">{registerBusy ? (language === 'es' ? 'Publicando…' : 'Publishing…') : (language === 'es' ? 'Publicar' : 'Publish')}</Text></Pressable></View>
          </ScrollView>
        </View></View>
      </Modal>
      <Modal visible={Boolean(editing)} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View className="flex-1 justify-end bg-black/40"><View className="max-h-[92%] rounded-t-3xl bg-ui-surface p-6 dark:bg-ui-dark-surface">
          <Text className="text-xl font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Editar opciones del perfil' : 'Edit profile options'}</Text>
          <Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{editing?.title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <ProfileEditorFields form={editForm} language={language} onChange={(key, value) => setEditForm((current) => ({ ...current, [key]: value }))} onCategoryChange={(nextCategory) => setEditForm((current) => ({ ...current, category: nextCategory, subcategories: [], experienceType: nextCategory === 'other' ? current.experienceType : '' }))} onToggleParking={() => setEditForm((current) => ({ ...current, hasParking: !current.hasParking }))} onToggleSubcategory={(tag) => setEditForm((current) => ({ ...current, subcategories: current.subcategories.includes(tag) ? current.subcategories.filter((item) => item !== tag) : [...current.subcategories, tag] }))} />
            <BusinessLocationEditor language={language} location={editLocation} onChange={setEditLocation} />
            {editError ? <Text className="mt-2 text-xs font-semibold text-red-600">{editError}</Text> : null}
            <View className="mt-4 flex-row gap-3"><Pressable disabled={editBusy} className="flex-1 rounded-2xl border border-ui-border py-3 dark:border-ui-dark-border" onPress={() => setEditing(null)}><Text className="text-center font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Cancelar' : 'Cancel'}</Text></Pressable><Pressable disabled={editBusy} className="flex-1 rounded-2xl bg-ui-primary py-3 disabled:opacity-40" onPress={() => void submitEdit()}><Text className="text-center font-black text-white">{editBusy ? (language === 'es' ? 'Guardando…' : 'Saving…') : (language === 'es' ? 'Guardar' : 'Save')}</Text></Pressable></View>
          </ScrollView>
        </View></View>
      </Modal>
      <InformationReportModal open={Boolean(reporting)} targetType="commercial_service" targetId={reporting?.id} targetLabel={reporting?.title ?? ''} language={language} onClose={() => setReporting(null)} />
    </View>
  );
}
