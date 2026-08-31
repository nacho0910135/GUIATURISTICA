import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';

import { InformationReportModal } from '@/components/information-report-modal';
import { ThemedAlert as Alert } from '@/components/themed-alert';
import { getAppOptions, type AppOption } from '@/lib/app-options';
import {
  deleteBusinessPhoto,
  getBusinessReviews,
  getCinemaMovies,
  getCommercialFavoriteIds,
  getCommerceRegions,
  getCommerceDirectory,
  getOwnerClaims,
  getOwnerDashboard,
  normalizeBusinessAttribution,
  recordBusinessEvent,
  registerCommercialService,
  saveBusinessReview,
  setCommercialFavorite,
  setBusinessCoverPhoto,
  updateCommercialServiceProfile,
  uploadBusinessPhoto,
  type CommerceCategoryId,
  type CommerceRegion,
  type CommerceService,
  type CinemaMovie,
  type OwnerDashboardService,
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
  priceRange: '', bookingUrl: '', menuUrl: '', parking: '', hasParking: false, paymentMethods: '',
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
  ? (language === 'es' ? 'Ubicación no disponible' : 'Location unavailable')
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

function ServiceCard({ service, onOpen }: { service: CommerceService; onOpen: (service: CommerceService) => void }) {
  const { language } = useApp();
  const { qr, qr_code, utm_campaign, utm_content, utm_medium, utm_source, utm_term } = useGlobalSearchParams();
  const attribution = useMemo(() => normalizeBusinessAttribution({ qr, qr_code, utm_campaign, utm_content, utm_medium, utm_source, utm_term }), [qr, qr_code, utm_campaign, utm_content, utm_medium, utm_source, utm_term]);
  const isCinema = service.category === 'cinemas';
  useEffect(() => { void recordBusinessEvent(service.id, 'impression', attribution); }, [service.id, attribution]);
  return (
    <Pressable accessibilityLabel={`${language === 'es' ? 'Abrir detalles de' : 'Open details for'} ${service.title}`} accessibilityRole="button" className="mb-3 min-h-24 flex-row items-center rounded-card border border-ui-border bg-ui-surface p-3 active:opacity-85 dark:border-ui-dark-border dark:bg-ui-dark-surface" onPress={() => onOpen(service)}>
      {service.cover_image_url || service.photos[0] ? <Image source={{ uri: service.cover_image_url ?? service.photos[0] }} className="h-20 w-20 rounded-2xl" resizeMode="cover" /> : <View className="h-20 w-20 items-center justify-center rounded-2xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft"><MaterialCommunityIcons name={isCinema ? 'movie-open-outline' : 'storefront-outline'} size={28} color="#087443" /></View>}
      <View className="ml-3 flex-1">
        <Text className="text-base font-black text-ui-text dark:text-ui-dark-text" numberOfLines={2}>{service.title}</Text>
        <Text className="mt-1 text-xs font-bold text-ui-primary dark:text-ui-dark-primary" numberOfLines={1}>{distanceLabel(service.distance_km, language)} · {service.price_range ?? '₡'}</Text>
        <View className="mt-1 flex-row items-center"><MaterialCommunityIcons name="star" size={15} color="#E0A100" /><Text className="ml-1 text-xs font-black text-ui-text dark:text-ui-dark-text">{service.avg_rating.toFixed(1)}</Text><Text className="ml-1 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">({service.total_reviews})</Text></View>
        {service.description ? <Text className="mt-1 text-xs leading-4 text-ui-text-muted dark:text-ui-dark-text-muted" numberOfLines={1}>{service.description}</Text> : null}
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
    if (service.latitude == null || service.longitude == null) return;
    void recordBusinessEvent(service.id, 'directions', attribution);
    void openNavigation(service.latitude, service.longitude);
  };
  const share = () => {
    const link = service.latitude != null && service.longitude != null ? `https://www.google.com/maps/search/?api=1&query=${service.latitude},${service.longitude}` : service.external_url;
    void Share.share({ message: [service.title, link].filter(Boolean).join(' · ') });
  };
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><View className="flex-1 justify-end bg-black/40"><View className="max-h-[92%] rounded-t-3xl bg-ui-surface p-6 dark:bg-ui-dark-surface"><View className="mb-5 h-1 w-10 self-center rounded-full bg-ui-border dark:bg-ui-dark-border" /><View className="flex-row items-start justify-between"><View className="flex-1 pr-3"><Text className="text-xl font-black text-ui-text dark:text-ui-dark-text">{service.title}</Text><View className="mt-2 flex-row flex-wrap items-center gap-x-4 gap-y-2"><View className="flex-row items-center"><MaterialCommunityIcons name="map-marker-distance" size={20} color="#087443" /><Text className="ml-1 font-black text-ui-primary dark:text-ui-dark-primary">{distanceLabel(service.distance_km, language)}</Text></View><View className="flex-row items-center"><MaterialCommunityIcons name="star" size={22} color="#E0A100" /><Text className="ml-1 text-lg font-black text-ui-text dark:text-ui-dark-text">{service.avg_rating.toFixed(1)}</Text><Text className="ml-2 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{service.total_reviews} {language === 'es' ? 'reseñas' : 'reviews'}</Text></View></View></View><Pressable accessibilityLabel={language === 'es' ? 'Cerrar detalle' : 'Close details'} accessibilityRole="button" className="h-11 w-11 items-center justify-center" onPress={onClose}><MaterialCommunityIcons name="close" size={25} color="#68737A" /></Pressable></View><ScrollView className="mt-4" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    {service.cover_image_url || service.photos[0] ? <Image source={{ uri: service.cover_image_url ?? service.photos[0] }} className="h-44 w-full rounded-2xl" resizeMode="cover" /> : null}
    {service.description ? <Text className="mt-4 leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{service.description}</Text> : null}
    <View className="mt-4 flex-row flex-wrap gap-2"><TrustBadge service={service} language={language} />{service.business_updated_at ? <Text className="rounded-full bg-ui-secondary px-2 py-1 text-[10px] font-black text-white">{language === 'es' ? 'ACTUALIZADO POR EL NEGOCIO' : 'UPDATED BY BUSINESS'}</Text> : null}</View>
    <View className="mt-3 flex-row flex-wrap gap-2">{service.opening_hours ? <Text className="rounded-full bg-ui-muted px-3 py-1 text-xs font-bold text-ui-text dark:bg-white/10 dark:text-ui-dark-text">{service.opening_hours}</Text> : null}{service.has_parking || service.parking ? <Text className="rounded-full bg-ui-muted px-3 py-1 text-xs font-bold text-ui-text dark:bg-white/10 dark:text-ui-dark-text">{language === 'es' ? 'Estacionamiento' : 'Parking'}</Text> : null}{service.accessibility ? <Text className="rounded-full bg-ui-muted px-3 py-1 text-xs font-bold text-ui-text dark:bg-white/10 dark:text-ui-dark-text">{service.accessibility}</Text> : null}{service.experience_type ? <Text className="rounded-full bg-ui-muted px-3 py-1 text-xs font-bold text-ui-text dark:bg-white/10 dark:text-ui-dark-text">{service.experience_type}</Text> : null}{tags.map((tag) => <Text className="rounded-full bg-ui-primary-soft px-3 py-1 text-xs font-bold text-ui-primary dark:bg-ui-dark-primary-soft dark:text-ui-dark-primary" key={tag}>{tag}</Text>)}</View>
    {service.payment_methods.length || service.languages.length || service.certifications.length ? <Text className="mt-3 text-xs font-semibold text-ui-text-muted dark:text-ui-dark-text-muted">{[service.payment_methods.join(' · '), service.languages.join(' · '), service.certifications.join(' · ')].filter(Boolean).join(' · ')}</Text> : null}
    <View className="mt-4 flex-row flex-wrap gap-2">{service.whatsapp ? <Pressable accessibilityRole="button" className="flex-1 flex-row items-center justify-center rounded-2xl bg-[#25D366] py-3" onPress={openWhatsApp}><MaterialCommunityIcons name="whatsapp" size={19} color="white" /><Text className="ml-2 font-black text-white">WhatsApp</Text></Pressable> : null}{phone ? <Pressable accessibilityRole="button" className="flex-1 flex-row items-center justify-center rounded-2xl bg-ui-secondary py-3 dark:bg-ui-dark-secondary" onPress={call}><MaterialCommunityIcons name="phone" size={19} color="white" /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Llamar' : 'Call'}</Text></Pressable> : null}{service.latitude != null && service.longitude != null ? <Pressable accessibilityRole="button" className="flex-1 flex-row items-center justify-center rounded-2xl bg-ui-primary py-3 dark:bg-ui-dark-primary" onPress={directions}><MaterialCommunityIcons name="navigation-variant" size={19} color="white" /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Cómo llegar' : 'Directions'}</Text></Pressable> : null}</View>
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
  onToggleSubcategory,
  onToggleParking,
}: {
  form: CommercialProfileForm;
  language: 'es' | 'en';
  onChange: (key: ProfileTextKey, value: string) => void;
  onCategoryChange: (category: CommerceCategoryId) => void;
  onToggleSubcategory: (subcategory: string) => void;
  onToggleParking: () => void;
}) {
  const { categories, subcategories } = useCommerceTaxonomy();
  const fieldGroups: { title: string; fields: { key: ProfileTextKey; label: string; hint?: string }[] }[] = [
    { title: language === 'es' ? 'Información esencial' : 'Essential information', fields: [
      { key: 'title', label: language === 'es' ? 'Nombre del comercio *' : 'Business name *' },
      { key: 'phone', label: language === 'es' ? 'Teléfono' : 'Phone' },
      { key: 'whatsapp', label: 'WhatsApp' },
      { key: 'openingHours', label: language === 'es' ? 'Horarios' : 'Hours', hint: language === 'es' ? 'Ejemplo: lunes a sábado, 8:00–18:00' : 'Example: Monday to Saturday, 8:00–18:00' },
      { key: 'priceRange', label: language === 'es' ? 'Rango de precios' : 'Price range' },
    ] },
    { title: language === 'es' ? 'Experiencia y facilidades' : 'Experience and facilities', fields: [
      { key: 'parking', label: language === 'es' ? 'Detalles de estacionamiento' : 'Parking details' },
      { key: 'accessibility', label: language === 'es' ? 'Accesibilidad' : 'Accessibility' },
      { key: 'experienceType', label: language === 'es' ? 'Tipo de experiencia' : 'Experience type' },
      { key: 'languages', label: language === 'es' ? 'Idiomas' : 'Languages', hint: language === 'es' ? 'Separalos con comas' : 'Separate with commas' },
      { key: 'paymentMethods', label: language === 'es' ? 'Métodos de pago' : 'Payment methods', hint: language === 'es' ? 'Separalos con comas' : 'Separate with commas' },
      { key: 'certifications', label: language === 'es' ? 'Certificaciones o reconocimientos' : 'Certifications or recognitions', hint: language === 'es' ? 'Separalos con comas' : 'Separate with commas' },
    ] },
    { title: language === 'es' ? 'Enlaces' : 'Links', fields: [
      { key: 'menuUrl', label: language === 'es' ? 'Menú o catálogo' : 'Menu or catalog' },
      { key: 'bookingUrl', label: language === 'es' ? 'Reservas' : 'Bookings' },
    ] },
  ];
  const tags = subcategories.filter((option) => option.parent_id === form.category);

  return <>
    <Text className="mt-5 text-xs font-black uppercase tracking-[1.5px] text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? '01 · Categoría y experiencia' : '01 · Category and experience'}</Text>
    <View className="mt-3 flex-row flex-wrap gap-2">
      {categories.map((item) => <Pressable accessibilityRole="button" accessibilityState={{ selected: form.category === item.id }} key={item.id} onPress={() => onCategoryChange(item.id)} className={form.category === item.id ? 'min-h-11 justify-center rounded-full bg-ui-primary px-4' : 'min-h-11 justify-center rounded-full bg-ui-muted px-4 dark:bg-white/10'}><Text className={form.category === item.id ? 'text-xs font-black text-white' : 'text-xs font-bold text-ui-text dark:text-ui-dark-text'}>{language === 'es' ? item.label_es : item.label_en}</Text></Pressable>)}
    </View>
    {tags.length ? <ScrollView horizontal className="mt-2" contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>{tags.map((tag) => { const selected = form.subcategories.includes(tag.id); return <Pressable accessibilityRole="button" accessibilityState={{ selected }} className={selected ? 'min-h-11 justify-center rounded-full bg-ui-secondary px-4 dark:bg-ui-dark-secondary' : 'min-h-11 justify-center rounded-full bg-ui-muted px-4 dark:bg-white/10'} key={tag.id} onPress={() => onToggleSubcategory(tag.id)}><Text className={selected ? 'text-xs font-black text-white' : 'text-xs font-bold text-ui-text dark:text-ui-dark-text'}>{language === 'es' ? tag.label_es : tag.label_en}</Text></Pressable>; })}</ScrollView> : null}
    {fieldGroups.map((group, groupIndex) => <View className="mt-6 border-t border-ui-border pt-5 dark:border-ui-dark-border" key={group.title}><Text className="text-xs font-black uppercase tracking-[1.5px] text-ui-text-muted dark:text-ui-dark-text-muted">{String(groupIndex + 2).padStart(2, '0')} · {group.title}</Text>{group.fields.map(({ hint, key, label }) => <View className="mt-4" key={key}><Text className="mb-2 text-sm font-bold text-ui-text dark:text-ui-dark-text">{label}</Text><TextInput accessibilityLabel={label} value={form[key]} onChangeText={(value) => onChange(key, value)} placeholder={hint ?? label.replace(' *', '')} placeholderTextColor="#68737A" className="min-h-12 rounded-control border border-ui-border bg-ui-surface px-4 text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-surface dark:text-ui-dark-text" /></View>)}{groupIndex === 1 ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: form.hasParking }} className="mt-4 min-h-12 flex-row items-center rounded-control bg-ui-muted px-4 dark:bg-ui-dark-muted" onPress={onToggleParking}><View className={form.hasParking ? 'h-6 w-6 items-center justify-center rounded-md border-2 border-ui-primary bg-ui-primary' : 'h-6 w-6 rounded-md border-2 border-ui-border dark:border-ui-dark-border'}>{form.hasParking ? <Text className="text-xs font-black text-white">✓</Text> : null}</View><Text className="ml-3 text-sm font-bold text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'El comercio tiene estacionamiento' : 'The business has parking'}</Text></Pressable> : null}</View>)}
    <View className="mt-6 border-t border-ui-border pt-5 dark:border-ui-dark-border"><Text className="text-xs font-black uppercase tracking-[1.5px] text-ui-text-muted dark:text-ui-dark-text-muted">05 · {language === 'es' ? 'Descripción' : 'Description'}</Text><Text className="mb-2 mt-4 text-sm font-bold text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Qué debería saber una persona antes de visitar' : 'What someone should know before visiting'}</Text><TextInput accessibilityLabel={language === 'es' ? 'Descripción del comercio' : 'Business description'} value={form.description} onChangeText={(value) => onChange('description', value)} placeholder={language === 'es' ? 'Contá lo esencial en pocas líneas' : 'Share the essentials in a few lines'} placeholderTextColor="#68737A" multiline className="min-h-28 rounded-control border border-ui-border bg-ui-surface px-4 py-3 text-ui-text dark:border-ui-dark-border dark:bg-ui-dark-surface dark:text-ui-dark-text" textAlignVertical="top" /></View>
  </>;
}

export default function CommerceScreen() {
  const { language, requireAuth, session, userLocation } = useApp();
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
  const [registerPhoto, setRegisterPhoto] = useState<ImagePicker.ImagePickerAsset>();
  const [editing, setEditing] = useState<OwnerDashboardService | null>(null);
  const [editForm, setEditForm] = useState<CommercialProfileForm>(() => emptyProfileForm());
  const [editError, setEditError] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [photoBusyId, setPhotoBusyId] = useState<string>();
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
    queryFn: () => getCommerceDirectory(category, directoryOrigin!, subcategory, viewMode === 'region' ? selectedRegion : undefined),
    enabled: Boolean(category && directoryOrigin) && (viewMode === 'nearby' || Boolean(selectedRegion)),
    staleTime: 10 * 60 * 1000,
  });
  const cinemaMovies = useQuery({ queryKey: ['cinema-movies'], queryFn: getCinemaMovies, enabled: category === 'cinemas', staleTime: 30 * 60 * 1000 });
  const dashboard = useQuery({ queryKey: ['owner-dashboard'], queryFn: getOwnerDashboard, enabled: dashboardOpen });
  const claims = useQuery({ queryKey: ['owner-claims'], queryFn: getOwnerClaims, enabled: dashboardOpen });
  const favoriteIds = useQuery({ queryKey: ['commercial-favorites', session?.user.id], queryFn: getCommercialFavoriteIds, enabled: Boolean(session) });
  const selectedCategoryOption = categories.find((item) => item.id === category) ?? categories[0];
  const selectedCategory = { ...selectedCategoryOption, icon: selectedCategoryOption?.icon ?? 'store-outline', label_es: selectedCategoryOption?.label_es ?? '', label_en: selectedCategoryOption?.label_en ?? '' };
  const registrationOrigin = userLocation ?? (selectedRegion ? { latitude: selectedRegion.latitude, longitude: selectedRegion.longitude } : undefined);
  const isCinemaCategory = category === 'cinemas';
  const cinemaCatalog = useMemo(() => [...(directory.data?.featured ?? []), ...(directory.data?.organic ?? [])].sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity) || a.title.localeCompare(b.title)), [directory.data]);
  const catalog = isCinemaCategory ? cinemaCatalog : directory.data?.organic ?? [];
  const catalogTitle = isCinemaCategory ? (language === 'es' ? 'Cines cerca de vos' : 'Cinemas near you') : (language === 'es' ? 'Resultados para vos' : 'Results for you');
  const catalogDescription = isCinemaCategory ? (language === 'es' ? 'Ordenados de más cercano a más lejano. La cartelera y compra abren en el sitio oficial.' : 'Ordered from nearest to farthest. Showtimes and purchase open on the official site.') : (language === 'es' ? 'Ordenados por cercanía y calificación.' : 'Ordered by proximity and rating.');

  const submitRegistration = async () => {
    if (!requireAuth('registrar un comercio')) return;
    if (!registerForm.title.trim()) { setRegisterError(language === 'es' ? 'El nombre del comercio es obligatorio.' : 'Business name is required.'); return; }
    if (!registrationOrigin) { setRegisterError(language === 'es' ? 'Elegí una región o activá tu ubicación antes de registrar.' : 'Choose a region or enable location before registering.'); return; }
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
        parking: registerForm.parking,
        hasParking: registerForm.hasParking,
        paymentMethods: textToList(registerForm.paymentMethods),
        accessibility: registerForm.accessibility,
        languages: textToList(registerForm.languages),
        experienceType: registerForm.experienceType,
        certifications: textToList(registerForm.certifications),
      });
      let photoError: unknown;
      if (registerPhoto) try { await uploadBusinessPhoto({ id: serviceId, photos: [], cover_image_url: null }, registerPhoto); } catch (error) { photoError = error; }
      await directory.refetch({ throwOnError: true });
      setRegisterOpen(false);
      setRegisterForm(emptyProfileForm(category));
      setRegisterPhoto(undefined);
      if (photoError) Alert.alert(language === 'es' ? 'Comercio publicado' : 'Business published', language === 'es' ? 'El comercio se guardó, pero la portada no pudo subirse. Podés agregarla desde el panel.' : 'The business was saved, but its cover could not be uploaded. You can add it from the dashboard.');
    } catch (error) { setRegisterError(error instanceof Error ? error.message : (language === 'es' ? 'No pudimos registrar el comercio.' : 'Business could not be registered.')); }
    finally { setRegisterBusy(false); }
  };

  const pickRegistrationPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(language === 'es' ? 'Permiso requerido' : 'Permission required', language === 'es' ? 'Permití el acceso a tus fotos para elegir una portada.' : 'Allow photo access to choose a cover image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.9, exif: false });
    if (!result.canceled) setRegisterPhoto(result.assets[0]);
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
      parking: service.parking ?? '',
      hasParking: service.has_parking,
      paymentMethods: listToText(service.payment_methods),
      accessibility: service.accessibility ?? '',
      languages: listToText(service.languages),
      experienceType: service.experience_type ?? '',
      certifications: listToText(service.certifications),
    });
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
        parking: editForm.parking,
        hasParking: editForm.hasParking,
        paymentMethods: textToList(editForm.paymentMethods),
        accessibility: editForm.accessibility,
        languages: textToList(editForm.languages),
        experienceType: editForm.experienceType,
        certifications: textToList(editForm.certifications),
      });
      await Promise.all([dashboard.refetch({ throwOnError: true }), directory.refetch({ throwOnError: true })]);
      setEditing(null);
    } catch (error) { setEditError(error instanceof Error ? error.message : (language === 'es' ? 'No pudimos guardar los cambios.' : 'Changes could not be saved.')); }
    finally { setEditBusy(false); }
  };

  const refreshOwnerContent = async () => {
    await Promise.all([dashboard.refetch(), directory.refetch()]);
  };

  const addPhoto = async (service: OwnerDashboardService) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(language === 'es' ? 'Permiso requerido' : 'Permission required', language === 'es' ? 'Permití el acceso a tus fotos para administrar la galería del negocio.' : 'Allow photo access to manage the business gallery.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.9 });
    if (result.canceled) return;
    setPhotoBusyId(service.id);
    try {
      await uploadBusinessPhoto(service, result.assets[0]);
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
          <DirectoryShortcut icon="store-plus-outline" label={language === 'es' ? 'Registrar comercio' : 'Register business'} onPress={() => { if (requireAuth('registrar un comercio')) { setRegisterForm(emptyProfileForm(category)); setRegisterPhoto(undefined); setRegisterError(''); setRegisterOpen(true); } }} primary />
          <DirectoryShortcut icon="chart-line" label={language === 'es' ? 'Panel de propietarios' : 'Owner dashboard'} onPress={() => { if (requireAuth('abrir el panel para propietarios')) setDashboardOpen(true); }} />
          <DirectoryShortcut icon="crown-outline" label={language === 'es' ? 'Planes Pro' : 'Pro plans'} onPress={() => { if (requireAuth('ver los planes Pro')) router.push('/subscriptions'); }} />
        </ScrollView>
      </View>
      <View className="pt-6"><Text className="px-5 text-xs font-black uppercase tracking-[1.5px] text-[#1E5B75] dark:text-ui-dark-text">{language === 'es' ? '¿Qué necesitás?' : 'What do you need?'}</Text><View className="mt-3 flex-row flex-wrap px-5">{categories.map((item, index) => <Pressable accessibilityRole="button" accessibilityState={{ selected: category === item.id }} key={item.id} onPress={() => { setCategory(item.id); setSubcategory(undefined); }} style={{ elevation: 2, shadowColor: '#1E5B75', shadowOffset: { height: 1, width: 0 }, shadowOpacity: 0.1, shadowRadius: 2, width: '25%' }} className={category === item.id ? 'h-20 items-center justify-center rounded-card border border-[#2A7B4C] bg-white px-2' : 'h-20 items-center justify-center rounded-card border border-ui-border bg-white px-2 dark:border-ui-dark-border dark:bg-ui-dark-surface'}><View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: categoryPastels[index % categoryPastels.length] }}><MaterialCommunityIcons name={(item.icon ?? 'store-outline') as React.ComponentProps<typeof MaterialCommunityIcons>['name']} size={19} color="#2A7B4C" /></View><Text className={category === item.id ? 'mt-1 text-center text-[11px] font-black leading-3 text-[#2A7B4C]' : 'mt-1 text-center text-[11px] font-bold leading-3 text-[#4B5563] dark:text-ui-dark-text'} numberOfLines={2}>{language === 'es' ? item.label_es : item.label_en}</Text></Pressable>)}</View></View>
      {category === 'cinemas' ? <CinemaPosterCarousel loading={cinemaMovies.isLoading} movies={cinemaMovies.data ?? []} /> : null}
      {categorySubcategories.length ? <View className="mt-5"><Text className="px-5 text-xs font-black uppercase tracking-[1.5px] text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Afiná la experiencia' : 'Refine the experience'}</Text><ScrollView horizontal className="mt-3" contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} showsHorizontalScrollIndicator={false}><Pressable accessibilityRole="button" accessibilityState={{ selected: !subcategory }} className={!subcategory ? 'min-h-11 justify-center rounded-full bg-ui-secondary px-4 dark:bg-ui-dark-secondary' : 'min-h-11 justify-center rounded-full bg-ui-muted px-4 dark:bg-ui-dark-muted'} onPress={() => setSubcategory(undefined)}><Text className={!subcategory ? 'text-xs font-black text-white' : 'text-xs font-bold text-ui-text dark:text-ui-dark-text'}>{language === 'es' ? 'Todas' : 'All'}</Text></Pressable>{categorySubcategories.map((tag) => <Pressable accessibilityRole="button" accessibilityState={{ selected: subcategory === tag.id }} className={subcategory === tag.id ? 'min-h-11 justify-center rounded-full bg-ui-secondary px-4 dark:bg-ui-dark-secondary' : 'min-h-11 justify-center rounded-full bg-ui-muted px-4 dark:bg-ui-dark-muted'} key={tag.id} onPress={() => setSubcategory(tag.id)}><Text className={subcategory === tag.id ? 'text-xs font-black text-white' : 'text-xs font-bold text-ui-text dark:text-ui-dark-text'}>{language === 'es' ? tag.label_es : tag.label_en}</Text></Pressable>)}</ScrollView></View> : null}
    </View>
  );

  if (taxonomyError) return <View className="flex-1 items-center justify-center bg-ui-background px-6 dark:bg-ui-dark-background"><MaterialCommunityIcons name="database-alert-outline" size={46} color="#B42318" /><Text className="mt-4 text-center font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'No pudimos cargar las categorías.' : 'Categories could not be loaded.'}</Text><Pressable className="mt-4 rounded-2xl bg-ui-primary px-5 py-3" onPress={() => void retryTaxonomy()}><Text className="font-black text-white">{language === 'es' ? 'Reintentar' : 'Retry'}</Text></Pressable></View>;

  return (
    <View className="flex-1 bg-[#F8F6F0] dark:bg-ui-dark-background">
      <FlatList
        data={catalog}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <View className="px-5"><ServiceCard service={item} onOpen={setDetail} /></View>}
        contentContainerStyle={{ paddingBottom: 28 }}
        ListHeaderComponent={<>{header}{!isCinemaCategory && directory.data?.featured.length ? <View className="mb-6 px-5"><Text className="mb-3 text-xs font-black uppercase tracking-[1.5px] text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Selección patrocinada' : 'Sponsored selection'}</Text>{directory.data.featured.map((service) => <ServiceCard key={service.id} service={service} onOpen={setDetail} />)}<View className="mt-2 border-t border-ui-border pt-5 dark:border-ui-dark-border"><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{catalogTitle}</Text><Text className="mt-1 text-xs leading-4 text-ui-text-muted dark:text-ui-dark-text-muted">{catalogDescription}</Text></View></View> : catalog.length ? <View className="mb-3 px-5"><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{catalogTitle}</Text><Text className="mt-1 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{isCinemaCategory ? catalogDescription : `${catalog.length} ${language === 'es' ? 'lugares en esta selección' : 'places in this selection'}`}</Text></View> : null}</>}
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
                return <View key={service.id} className="mt-4 rounded-2xl border border-ui-border p-4 dark:border-ui-dark-border">
                  <Text className="font-black text-ui-text dark:text-ui-dark-text">{service.title}</Text>
                  <Text className="mt-1 text-xs font-bold text-ui-primary">{(language === 'es' ? categoryInfo?.label_es : categoryInfo?.label_en) ?? service.category} · {regions.find((region) => region.id === service.region_id)?.[language === 'es' ? 'name_es' : 'name_en'] ?? (language === 'es' ? 'Región sin asignar' : 'Unassigned region')} · {service.source} · {service.claim_status}</Text>
                  {tagLabels.length ? <View className="mt-2 flex-row flex-wrap gap-2">{tagLabels.map((tag) => <Text key={tag} className="rounded-full bg-ui-primary-soft px-2 py-1 text-[10px] font-black text-ui-primary dark:bg-ui-dark-primary-soft">{tag}</Text>)}</View> : null}
                  <View className="mt-3 flex-row gap-2">{[
                    { icon: 'account-arrow-right-outline' as const, label: language === 'es' ? 'Leads' : 'Leads', value: service.metrics.whatsapp_clicks + service.metrics.calls + service.metrics.directions },
                    { icon: 'whatsapp' as const, label: 'WhatsApp', value: service.metrics.whatsapp_clicks },
                    { icon: 'phone-outline' as const, label: language === 'es' ? 'Llamadas' : 'Calls', value: service.metrics.calls },
                  ].map((metric) => <View key={metric.label} className="flex-1 items-center rounded-2xl bg-ui-muted px-2 py-3 dark:bg-white/10"><MaterialCommunityIcons name={metric.icon} size={18} color="#087443" /><Text className="mt-1 text-lg font-black text-ui-text dark:text-ui-dark-text">{metric.value}</Text><Text className="text-[10px] font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{metric.label}</Text></View>)}</View>
                  <View className="mt-2 rounded-xl bg-ui-primary-soft px-3 py-2 dark:bg-ui-dark-primary-soft"><View className="flex-row items-center"><MaterialCommunityIcons name="navigation-variant" size={16} color="#087443" /><Text className="ml-2 text-xs font-bold text-ui-primary dark:text-ui-dark-primary">{service.metrics.directions} {language === 'es' ? 'rutas abiertas' : 'directions opened'} · {service.metrics.views} {language === 'es' ? 'vistas' : 'views'}</Text></View><Text className="mt-1 text-xs font-bold text-ui-primary dark:text-ui-dark-primary">{service.metrics.attributed_leads} {language === 'es' ? 'leads atribuidos' : 'attributed leads'} · QR {service.metrics.qr_leads} · UTM {service.metrics.utm_leads}</Text></View>
                  <View className="mt-4 flex-row items-center justify-between"><View><Text className="text-sm font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Fotos del negocio' : 'Business photos'}</Text><Text className="text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{service.photos.length} {language === 'es' ? 'en la galería' : 'in gallery'}</Text></View><Pressable disabled={photoBusyId === service.id} className="flex-row items-center rounded-xl bg-ui-primary px-3 py-2" onPress={() => void addPhoto(service)}>{photoBusyId === service.id ? <ActivityIndicator size="small" color="white" /> : <MaterialCommunityIcons name="image-plus" size={17} color="white" />}<Text className="ml-1 text-xs font-black text-white">{language === 'es' ? 'Agregar' : 'Add'}</Text></Pressable></View>
                  {service.photos.length ? <ScrollView horizontal className="mt-3" contentContainerStyle={{ gap: 10 }} showsHorizontalScrollIndicator={false}>{service.photos.map((photo) => <View key={photo} className="overflow-hidden rounded-2xl bg-ui-muted"><Image source={{ uri: photo }} className="h-28 w-36" resizeMode="cover" />{service.cover_image_url === photo ? <Text className="absolute left-2 top-2 rounded-full bg-ui-primary px-2 py-1 text-[9px] font-black text-white">{language === 'es' ? 'PORTADA' : 'COVER'}</Text> : null}<View className="flex-row justify-end gap-1 p-1"><Pressable accessibilityLabel={language === 'es' ? 'Usar como portada' : 'Use as cover'} className="rounded-lg bg-white p-1.5" onPress={() => void chooseCover(service, photo)}><MaterialCommunityIcons name={service.cover_image_url === photo ? 'star' : 'star-outline'} size={17} color="#087443" /></Pressable><Pressable accessibilityLabel={language === 'es' ? 'Eliminar foto' : 'Delete photo'} className="rounded-lg bg-white p-1.5" onPress={() => removePhoto(service, photo)}><MaterialCommunityIcons name="trash-can-outline" size={17} color="#B42318" /></Pressable></View></View>)}</ScrollView> : <View className="mt-3 items-center rounded-2xl border border-dashed border-ui-border py-5 dark:border-ui-dark-border"><MaterialCommunityIcons name="image-multiple-outline" size={28} color="#68737A" /><Text className="mt-1 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Agregá una foto; la primera será la portada.' : 'Add a photo; the first one becomes the cover.'}</Text></View>}
                  <Pressable className="mt-4 flex-row items-center justify-center rounded-2xl border border-ui-border py-2.5 dark:border-ui-dark-border" onPress={() => openEditor(service)}><MaterialCommunityIcons name="pencil-outline" size={17} color="#087443" /><Text className="ml-2 text-center text-xs font-black text-ui-primary">{language === 'es' ? 'Editar información' : 'Edit information'}</Text></Pressable>
                </View>;
              }) : <View className="items-center py-10"><MaterialCommunityIcons name="store-plus-outline" size={42} color="#68737A" /><Text className="mt-3 text-center font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Todavía no tenés comercios reclamados.' : 'You have no claimed businesses yet.'}</Text></View>}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={registerOpen} transparent animationType="slide" onRequestClose={() => setRegisterOpen(false)}>
        <View className="flex-1 justify-end bg-black/40"><View className="max-h-[92%] rounded-t-3xl bg-ui-surface p-6 dark:bg-ui-dark-surface">
          <Text className="text-xl font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Registrar comercio' : 'Register business'}</Text>
          <Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? `Elegí la categoría y completa las opciones que verán tus clientes. Ubicación: ${viewMode === 'nearby' ? 'tu ubicación' : selectedRegion?.name_es ?? 'región seleccionada'}.` : `Choose a category and complete the options customers will see. Location: ${viewMode === 'nearby' ? 'your location' : selectedRegion?.name_en ?? 'selected region'}.`}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <ProfileEditorFields form={registerForm} language={language} onChange={(key, value) => setRegisterForm((current) => ({ ...current, [key]: value }))} onCategoryChange={(nextCategory) => setRegisterForm((current) => ({ ...current, category: nextCategory, subcategories: [] }))} onToggleSubcategory={(tag) => setRegisterForm((current) => ({ ...current, subcategories: current.subcategories.includes(tag) ? current.subcategories.filter((item) => item !== tag) : [...current.subcategories, tag] }))} onToggleParking={() => setRegisterForm((current) => ({ ...current, hasParking: !current.hasParking }))} />
            <Pressable className="mt-4 overflow-hidden rounded-2xl border border-dashed border-ui-border p-3 dark:border-ui-dark-border" onPress={() => void pickRegistrationPhoto()}>{registerPhoto ? <Image source={{ uri: registerPhoto.uri }} className="h-40 w-full rounded-xl" resizeMode="cover" /> : <View className="flex-row items-center justify-center py-4"><MaterialCommunityIcons name="image-plus" size={24} color="#087443" /><Text className="ml-2 font-black text-ui-primary">{language === 'es' ? 'Seleccionar foto de portada' : 'Choose cover photo'}</Text></View>}</Pressable>
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
            <ProfileEditorFields form={editForm} language={language} onChange={(key, value) => setEditForm((current) => ({ ...current, [key]: value }))} onCategoryChange={(nextCategory) => setEditForm((current) => ({ ...current, category: nextCategory, subcategories: [] }))} onToggleSubcategory={(tag) => setEditForm((current) => ({ ...current, subcategories: current.subcategories.includes(tag) ? current.subcategories.filter((item) => item !== tag) : [...current.subcategories, tag] }))} onToggleParking={() => setEditForm((current) => ({ ...current, hasParking: !current.hasParking }))} />
            {editError ? <Text className="mt-2 text-xs font-semibold text-red-600">{editError}</Text> : null}
            <View className="mt-4 flex-row gap-3"><Pressable disabled={editBusy} className="flex-1 rounded-2xl border border-ui-border py-3 dark:border-ui-dark-border" onPress={() => setEditing(null)}><Text className="text-center font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Cancelar' : 'Cancel'}</Text></Pressable><Pressable disabled={editBusy} className="flex-1 rounded-2xl bg-ui-primary py-3 disabled:opacity-40" onPress={() => void submitEdit()}><Text className="text-center font-black text-white">{editBusy ? (language === 'es' ? 'Guardando…' : 'Saving…') : (language === 'es' ? 'Guardar' : 'Save')}</Text></Pressable></View>
          </ScrollView>
        </View></View>
      </Modal>
      <InformationReportModal open={Boolean(reporting)} targetType="commercial_service" targetId={reporting?.id} targetLabel={reporting?.title ?? ''} language={language} onClose={() => setReporting(null)} />
    </View>
  );
}
