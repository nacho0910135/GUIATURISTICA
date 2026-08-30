import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';

import { InformationReportModal } from '@/components/information-report-modal';
import {
  COMMERCE_CATEGORIES,
  COMMERCE_SUBCATEGORIES,
  deleteBusinessPhoto,
  getBusinessReviews,
  getCommercialFavoriteIds,
  getCommerceRegions,
  getCommerceDirectory,
  getOwnerClaims,
  getOwnerDashboard,
  recordBusinessEvent,
  registerCommercialService,
  requestCommercialServiceClaim,
  saveBusinessReview,
  setCommercialFavorite,
  setBusinessCoverPhoto,
  updateCommercialServiceProfile,
  uploadBusinessPhoto,
  type CommerceCategoryId,
  type CommerceRegion,
  type CommerceService,
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

const emptyProfileForm = (category: CommerceCategoryId = 'food'): CommercialProfileForm => ({
  title: '', category, subcategories: [], phone: '', whatsapp: '', openingHours: '', description: '',
  priceRange: '', bookingUrl: '', menuUrl: '', parking: '', hasParking: false, paymentMethods: '',
  accessibility: '', languages: '', experienceType: '', certifications: '',
});

const listToText = (values: string[] | null | undefined) => (values ?? []).join(', ');
const textToList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
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
  if (service.business_verified_at && service.business_verification_evidence_url) {
    return <View className="flex-row flex-wrap gap-2"><Text className="rounded-full bg-ui-primary px-2 py-1 text-[10px] font-black text-white">{language === 'es' ? 'NEGOCIO VERIFICADO' : 'VERIFIED BUSINESS'}</Text><Text className="rounded-full bg-ui-muted px-2 py-1 text-[10px] font-black text-ui-text-muted dark:bg-white/10 dark:text-ui-dark-text-muted">{sourceLabel}</Text></View>;
  }
  return <View className="flex-row flex-wrap gap-2"><Text className="rounded-full bg-ui-muted px-2 py-1 text-[10px] font-black text-ui-text-muted dark:bg-white/10 dark:text-ui-dark-text-muted">{sourceLabel}</Text></View>;
}

function ServiceCard({ service, saved, onClaim, onOpen, onReport, onSaved }: { service: CommerceService; saved: boolean; onClaim: (service: CommerceService) => void; onOpen: (service: CommerceService) => void; onReport: (service: CommerceService) => void; onSaved: (service: CommerceService) => void }) {
  const { language } = useApp();
  const phone = service.phone ?? service.whatsapp;
  const categoryTags = COMMERCE_SUBCATEGORIES[service.category] ?? [];
  const tags = service.subcategories.map((id) => categoryTags.find((tag) => tag.id === id)?.[language] ?? id).filter(Boolean);
  useEffect(() => { void recordBusinessEvent(service.id, 'impression'); }, [service.id]);
  const openWhatsApp = () => {
    if (!service.whatsapp) return;
    void recordBusinessEvent(service.id, 'whatsapp_click');
    void Linking.openURL(`https://wa.me/${service.whatsapp.replace(/[^\d]/g, '')}`);
  };
  const call = () => {
    if (!phone) return;
    void recordBusinessEvent(service.id, 'call');
    void Linking.openURL(`tel:${phone.replace(/[^+\d]/g, '')}`);
  };
  const directions = () => {
    if (service.latitude == null || service.longitude == null) return;
    void recordBusinessEvent(service.id, 'directions');
    void openNavigation(service.latitude, service.longitude);
  };
  const share = () => {
    void recordBusinessEvent(service.id, 'impression');
    const link = service.latitude != null && service.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${service.latitude},${service.longitude}`
      : service.external_url;
    void Share.share({ message: [service.title, link].filter(Boolean).join(' · ') });
  };

  return (
    <View className="mb-4 overflow-hidden rounded-card border border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface">
      {service.cover_image_url || service.photos[0] ? <Image source={{ uri: service.cover_image_url ?? service.photos[0] }} className="h-44 w-full" resizeMode="cover" /> : null}
      <View className="p-5">
        <View className="flex-row items-start">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft">
            <MaterialCommunityIcons name="storefront-outline" size={25} color="#087443" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{service.title}</Text>
            <View className="mt-1 flex-row items-center"><MaterialCommunityIcons name="map-marker-distance" size={17} color="#087443" /><Text className="ml-1 font-bold text-ui-primary dark:text-ui-dark-primary">{distanceLabel(service.distance_km, language)} · {service.price_range ?? '₡'}</Text></View>
            <View className="mt-1 flex-row items-center"><MaterialCommunityIcons name="star" size={16} color="#E0A100" /><Text className="ml-1 text-xs font-black text-ui-text dark:text-ui-dark-text">{service.avg_rating.toFixed(1)}</Text><Text className="ml-1 text-xs text-ui-text-muted dark:text-ui-dark-text-muted">({service.total_reviews})</Text></View>
            <View className="mt-2 flex-row flex-wrap gap-2"><TrustBadge service={service} language={language} />{service.business_updated_at ? <Text className="rounded-full bg-ui-secondary px-2 py-1 text-[10px] font-black text-white">{language === 'es' ? 'ACTUALIZADO POR EL NEGOCIO' : 'UPDATED BY BUSINESS'}</Text> : null}</View>
          </View>
        </View>
        {service.business_verified_at ? <Text className="mt-2 text-[10px] font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Última verificación' : 'Last verified'}: {new Date(service.business_verified_at).toLocaleDateString(language === 'es' ? 'es-CR' : 'en-US')}</Text> : null}
        {service.description ? <Text className="mt-3 leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{service.description}</Text> : null}
        <View className="mt-3 flex-row flex-wrap gap-2">
          {service.opening_hours ? <Text className="rounded-full bg-ui-muted px-3 py-1 text-xs font-bold text-ui-text dark:bg-white/10 dark:text-ui-dark-text">{service.opening_hours}</Text> : null}
          {service.has_parking || service.parking ? <Text className="rounded-full bg-ui-muted px-3 py-1 text-xs font-bold text-ui-text dark:bg-white/10 dark:text-ui-dark-text">{language === 'es' ? 'Estacionamiento' : 'Parking'}</Text> : null}
          {service.accessibility ? <Text className="rounded-full bg-ui-muted px-3 py-1 text-xs font-bold text-ui-text dark:bg-white/10 dark:text-ui-dark-text">{service.accessibility}</Text> : null}
          {service.experience_type ? <Text className="rounded-full bg-ui-muted px-3 py-1 text-xs font-bold text-ui-text dark:bg-white/10 dark:text-ui-dark-text">{service.experience_type}</Text> : null}
          {tags.map((tag) => <Text className="rounded-full bg-ui-primary-soft px-3 py-1 text-xs font-bold text-ui-primary dark:bg-ui-dark-primary-soft dark:text-ui-dark-primary" key={tag}>{tag}</Text>)}
        </View>
        {service.payment_methods.length || service.languages.length || service.certifications.length ? <Text className="mt-3 text-xs font-semibold text-ui-text-muted dark:text-ui-dark-text-muted">{[service.payment_methods.join(' · '), service.languages.join(' · '), service.certifications.join(' · ')].filter(Boolean).join(' · ')}</Text> : null}
        <View className="mt-4 flex-row flex-wrap gap-2">
          {service.whatsapp ? <Pressable accessibilityRole="button" className="flex-1 flex-row items-center justify-center rounded-2xl bg-[#25D366] py-3" onPress={openWhatsApp}><MaterialCommunityIcons name="whatsapp" size={19} color="white" /><Text className="ml-2 font-black text-white">WhatsApp</Text></Pressable> : null}
          {phone ? <Pressable accessibilityRole="button" className="flex-1 flex-row items-center justify-center rounded-2xl bg-ui-secondary py-3 dark:bg-ui-dark-secondary" onPress={call}><MaterialCommunityIcons name="phone" size={19} color="white" /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Llamar' : 'Call'}</Text></Pressable> : null}
          {service.latitude != null && service.longitude != null ? <Pressable accessibilityRole="button" className="flex-1 flex-row items-center justify-center rounded-2xl bg-ui-primary py-3 dark:bg-ui-dark-primary" onPress={directions}><MaterialCommunityIcons name="navigation-variant" size={19} color="white" /><Text className="ml-2 font-black text-white">{language === 'es' ? 'Cómo llegar' : 'Directions'}</Text></Pressable> : null}
        </View>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {service.menu_url || service.external_url ? <Pressable className="rounded-2xl border border-ui-border px-3 py-2 dark:border-ui-dark-border" onPress={() => void Linking.openURL(service.menu_url ?? service.external_url!)}><Text className="text-xs font-black text-ui-primary">{service.menu_url ? (language === 'es' ? 'Menú / catálogo' : 'Menu / catalog') : (language === 'es' ? 'Sitio web' : 'Website')}</Text></Pressable> : null}
          {service.booking_url ? <Pressable className="rounded-2xl border border-ui-border px-3 py-2 dark:border-ui-dark-border" onPress={() => { void recordBusinessEvent(service.id, 'reservation'); void Linking.openURL(service.booking_url!); }}><Text className="text-xs font-black text-ui-primary">{language === 'es' ? 'Reservar' : 'Book'}</Text></Pressable> : null}
          <Pressable className="flex-row items-center rounded-2xl border border-ui-border px-3 py-2 dark:border-ui-dark-border" onPress={() => onSaved(service)}><MaterialCommunityIcons name={saved ? 'heart' : 'heart-outline'} size={16} color="#087443" /><Text className="ml-1 text-xs font-black text-ui-primary">{saved ? (language === 'es' ? 'Guardado' : 'Saved') : (language === 'es' ? 'Guardar' : 'Save')}</Text></Pressable>
          <Pressable className="rounded-2xl bg-ui-primary-soft px-3 py-2 dark:bg-ui-dark-primary-soft" onPress={() => onOpen(service)}><Text className="text-xs font-black text-ui-primary">{language === 'es' ? 'Ver reseñas' : 'See reviews'}</Text></Pressable>
          <Pressable className="rounded-2xl border border-ui-border px-3 py-2 dark:border-ui-dark-border" onPress={share}><Text className="text-xs font-black text-ui-primary">{language === 'es' ? 'Compartir' : 'Share'}</Text></Pressable>
          {!service.is_claimed && !service.owner_id ? <Pressable className="rounded-2xl border-2 border-ui-secondary bg-ui-secondary/10 px-3 py-2 dark:border-ui-dark-secondary" onPress={() => onClaim(service)}><Text className="text-xs font-black text-ui-secondary dark:text-ui-dark-secondary">{language === 'es' ? '¿Sos dueño? Reclamá tu perfil' : 'Are you the owner? Claim this profile'}</Text></Pressable> : null}
          <Pressable className="rounded-2xl border border-ui-border px-3 py-2 dark:border-ui-dark-border" onPress={() => onReport(service)}><Text className="text-xs font-black text-ui-primary">{language === 'es' ? 'Reportar información' : 'Report information'}</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

function BusinessDetailModal({ service, onClose, onReviewed }: { service: CommerceService | null; onClose: () => void; onReviewed: () => Promise<void> }) {
  const { language, requireAuth } = useApp();
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
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><View className="flex-1 justify-end bg-black/40"><View className="max-h-[92%] rounded-t-3xl bg-ui-surface p-6 dark:bg-ui-dark-surface"><View className="flex-row items-start justify-between"><View className="flex-1 pr-3"><Text className="text-xl font-black text-ui-text dark:text-ui-dark-text">{service.title}</Text><View className="mt-2 flex-row flex-wrap items-center gap-x-4 gap-y-2"><View className="flex-row items-center"><MaterialCommunityIcons name="map-marker-distance" size={20} color="#087443" /><Text className="ml-1 font-black text-ui-primary dark:text-ui-dark-primary">{distanceLabel(service.distance_km, language)}</Text></View><View className="flex-row items-center"><MaterialCommunityIcons name="star" size={22} color="#E0A100" /><Text className="ml-1 text-lg font-black text-ui-text dark:text-ui-dark-text">{service.avg_rating.toFixed(1)}</Text><Text className="ml-2 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{service.total_reviews} {language === 'es' ? 'reseñas' : 'reviews'}</Text></View></View></View><Pressable accessibilityLabel={language === 'es' ? 'Cerrar detalle' : 'Close details'} onPress={onClose}><MaterialCommunityIcons name="close" size={25} color="#68737A" /></Pressable></View><ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
    <View className="rounded-2xl bg-ui-primary-soft p-4 dark:bg-ui-dark-primary-soft"><Text className="font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Contá tu experiencia' : 'Share your experience'}</Text><View className="mt-3 flex-row">{[1, 2, 3, 4, 5].map((star) => <Pressable accessibilityLabel={`${star} ${language === 'es' ? 'estrellas' : 'stars'}`} key={star} className="mr-2" onPress={() => setRating(star)}><MaterialCommunityIcons name={star <= rating ? 'star' : 'star-outline'} size={31} color="#E0A100" /></Pressable>)}</View><TextInput value={comment} onChangeText={setComment} placeholder={language === 'es' ? '¿Qué deberían saber otros viajeros?' : 'What should other travelers know?'} multiline className="mt-3 min-h-20 rounded-2xl bg-white px-4 py-3 text-ui-text dark:bg-ui-dark-surface dark:text-ui-dark-text" textAlignVertical="top" /><Pressable disabled={busy} className="mt-3 self-start rounded-xl bg-ui-primary px-5 py-3" onPress={() => void submit()}><Text className="font-black text-white">{busy ? (language === 'es' ? 'Publicando…' : 'Posting…') : (language === 'es' ? 'Publicar reseña' : 'Post review')}</Text></Pressable></View>
    <Text className="mb-3 mt-5 text-sm font-black uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Comentarios recientes' : 'Recent comments'}</Text>{reviews.isLoading ? <ActivityIndicator className="py-8" color="#087443" /> : reviews.isError ? <Text className="py-6 text-center text-red-600">{language === 'es' ? 'No pudimos cargar las reseñas.' : 'Reviews could not load.'}</Text> : reviews.data?.length ? reviews.data.map((review) => <View key={review.id} className="mb-3 rounded-2xl border border-ui-border p-4 dark:border-ui-dark-border"><View className="flex-row items-center justify-between"><Text className="font-black text-ui-text dark:text-ui-dark-text">{review.author_name}</Text><View className="flex-row items-center"><MaterialCommunityIcons name="star" size={15} color="#E0A100" /><Text className="ml-1 text-xs font-black text-ui-text dark:text-ui-dark-text">{review.rating}</Text></View></View>{review.comment ? <Text className="mt-2 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{review.comment}</Text> : null}<Text className="mt-2 text-[10px] text-ui-text-muted dark:text-ui-dark-text-muted">{new Date(review.created_at).toLocaleDateString(language === 'es' ? 'es-CR' : 'en-US')}</Text></View>) : <Text className="py-8 text-center text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Sé la primera persona en reseñar este comercio.' : 'Be the first to review this business.'}</Text>}
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
  const textFields: { key: ProfileTextKey; label: string }[] = [
    { key: 'title', label: language === 'es' ? 'Nombre *' : 'Name *' },
    { key: 'phone', label: language === 'es' ? 'Teléfono' : 'Phone' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'openingHours', label: language === 'es' ? 'Horarios' : 'Hours' },
    { key: 'priceRange', label: language === 'es' ? 'Rango de precios' : 'Price range' },
    { key: 'menuUrl', label: language === 'es' ? 'Enlace de menú o catálogo' : 'Menu or catalog link' },
    { key: 'bookingUrl', label: language === 'es' ? 'Enlace de reserva' : 'Booking link' },
    { key: 'parking', label: language === 'es' ? 'Detalles de estacionamiento' : 'Parking details' },
    { key: 'accessibility', label: language === 'es' ? 'Accesibilidad' : 'Accessibility' },
    { key: 'experienceType', label: language === 'es' ? 'Tipo de experiencia' : 'Experience type' },
    { key: 'languages', label: language === 'es' ? 'Idiomas (separados por coma)' : 'Languages (comma separated)' },
    { key: 'paymentMethods', label: language === 'es' ? 'Métodos de pago (separados por coma)' : 'Payment methods (comma separated)' },
    { key: 'certifications', label: language === 'es' ? 'Certificaciones o reconocimientos (separados por coma)' : 'Certifications or recognitions (comma separated)' },
  ];
  const tags = COMMERCE_SUBCATEGORIES[form.category];

  return <>
    <Text className="mt-4 text-xs font-black uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Categoría y experiencia' : 'Category and experience'}</Text>
    <View className="mt-2 flex-row flex-wrap gap-2">
      {COMMERCE_CATEGORIES.map((item) => <Pressable accessibilityRole="button" accessibilityState={{ selected: form.category === item.id }} key={item.id} onPress={() => onCategoryChange(item.id)} className={form.category === item.id ? 'rounded-full bg-ui-primary px-3 py-2' : 'rounded-full bg-ui-muted px-3 py-2 dark:bg-white/10'}><Text className={form.category === item.id ? 'text-xs font-black text-white' : 'text-xs font-bold text-ui-text dark:text-ui-dark-text'}>{item[language]}</Text></Pressable>)}
    </View>
    {tags.length ? <ScrollView horizontal className="mt-2" contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}>{tags.map((tag) => { const selected = form.subcategories.includes(tag.id); return <Pressable accessibilityRole="button" accessibilityState={{ selected }} className={selected ? 'rounded-full bg-ui-secondary px-3 py-2 dark:bg-ui-dark-secondary' : 'rounded-full bg-ui-muted px-3 py-2 dark:bg-white/10'} key={tag.id} onPress={() => onToggleSubcategory(tag.id)}><Text className={selected ? 'text-xs font-black text-white' : 'text-xs font-bold text-ui-text dark:text-ui-dark-text'}>{tag[language]}</Text></Pressable>; })}</ScrollView> : null}
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: form.hasParking }} className="mt-3 flex-row items-center" onPress={onToggleParking}><View className={form.hasParking ? 'h-5 w-5 items-center justify-center rounded border-2 border-ui-primary bg-ui-primary' : 'h-5 w-5 rounded border-2 border-ui-border dark:border-ui-dark-border'}>{form.hasParking ? <Text className="text-xs font-black text-white">✓</Text> : null}</View><Text className="ml-2 text-sm font-bold text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Tiene estacionamiento' : 'Has parking'}</Text></Pressable>
    {textFields.map(({ key, label }) => <TextInput key={key} value={form[key]} onChangeText={(value) => onChange(key, value)} placeholder={label} className="mt-2 rounded-2xl border border-ui-border px-4 py-3 text-ui-text dark:border-ui-dark-border dark:text-ui-dark-text" />)}
    <TextInput value={form.description} onChangeText={(value) => onChange('description', value)} placeholder={language === 'es' ? 'Descripción breve' : 'Short description'} multiline className="mt-2 min-h-20 rounded-2xl border border-ui-border px-4 py-3 text-ui-text dark:border-ui-dark-border dark:text-ui-dark-text" textAlignVertical="top" />
  </>;
}

export default function CommerceScreen() {
  const { language, requireAuth, session, userLocation } = useApp();
  const [category, setCategory] = useState<CommerceCategoryId>('food');
  const [subcategory, setSubcategory] = useState<string>();
  const [regionId, setRegionId] = useState<string>();
  const [claiming, setClaiming] = useState<CommerceService | null>(null);
  const [claimMessage, setClaimMessage] = useState('');
  const [claimError, setClaimError] = useState('');
  const [reporting, setReporting] = useState<CommerceService | null>(null);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerForm, setRegisterForm] = useState<CommercialProfileForm>(() => emptyProfileForm('food'));
  const [editing, setEditing] = useState<OwnerDashboardService | null>(null);
  const [editForm, setEditForm] = useState<CommercialProfileForm>(() => emptyProfileForm());
  const [editError, setEditError] = useState('');
  const [photoBusyId, setPhotoBusyId] = useState<string>();
  const [detail, setDetail] = useState<CommerceService | null>(null);

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
    enabled: Boolean(directoryOrigin) && (viewMode === 'nearby' || Boolean(selectedRegion)),
    staleTime: 10 * 60 * 1000,
  });
  const dashboard = useQuery({ queryKey: ['owner-dashboard'], queryFn: getOwnerDashboard, enabled: dashboardOpen });
  const claims = useQuery({ queryKey: ['owner-claims'], queryFn: getOwnerClaims, enabled: dashboardOpen });
  const favoriteIds = useQuery({ queryKey: ['commercial-favorites', session?.user.id], queryFn: getCommercialFavoriteIds, enabled: Boolean(session) });
  const selectedCategory = useMemo(() => COMMERCE_CATEGORIES.find((item) => item.id === category)!, [category]);
  const registrationOrigin = userLocation ?? (selectedRegion ? { latitude: selectedRegion.latitude, longitude: selectedRegion.longitude } : undefined);

  const submitClaim = async () => {
    if (!claiming || !requireAuth('reclamar un perfil comercial')) return;
    setClaimError('');
    try {
      await requestCommercialServiceClaim(claiming.id, claimMessage);
      setClaiming(null);
      setClaimMessage('');
      void claims.refetch();
      void directory.refetch();
    } catch (error) { setClaimError(error instanceof Error ? error.message : (language === 'es' ? 'No pudimos enviar el reclamo.' : 'Claim could not be sent.')); }
  };

  const submitRegistration = async () => {
    if (!requireAuth('registrar un comercio')) return;
    if (!registerForm.title.trim()) { setRegisterError(language === 'es' ? 'El nombre del comercio es obligatorio.' : 'Business name is required.'); return; }
    if (!registrationOrigin) { setRegisterError(language === 'es' ? 'Elegí una región o activá tu ubicación antes de registrar.' : 'Choose a region or enable location before registering.'); return; }
    setRegisterError('');
    try {
      await registerCommercialService({
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
      setRegisterOpen(false);
      setRegisterForm(emptyProfileForm(category));
      void directory.refetch();
    } catch (error) { setRegisterError(error instanceof Error ? error.message : (language === 'es' ? 'No pudimos registrar el comercio.' : 'Business could not be registered.')); }
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
      setEditing(null);
      void dashboard.refetch();
      void directory.refetch();
    } catch (error) { setEditError(error instanceof Error ? error.message : (language === 'es' ? 'No pudimos guardar los cambios.' : 'Changes could not be saved.')); }
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
      <View className="px-5 pb-2 pt-4">
        <Text className="text-2xl font-extrabold tracking-tight text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Comercios y Servicios' : 'Businesses & Services'}</Text>
        <Text className="mt-1 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Descubrí comida, hospedaje, aventura y servicios cerca de tu ruta.' : 'Find food, lodging, adventure and services along your route.'}</Text>
        <View className="mt-3 flex-row gap-2">
          <Pressable className="flex-1 flex-row items-center justify-center rounded-2xl border border-ui-border px-2 py-2 dark:border-ui-dark-border" onPress={() => { if (requireAuth('abrir el panel para propietarios')) setDashboardOpen(true); }}><MaterialCommunityIcons name="chart-line" size={17} color="#087443" /><Text className="ml-1 text-center text-[11px] font-black text-ui-primary">{language === 'es' ? 'Panel propietarios' : 'Owner dashboard'}</Text></Pressable>
          <Pressable className="flex-1 flex-row items-center justify-center rounded-2xl border border-ui-border px-2 py-2 dark:border-ui-dark-border" onPress={() => { if (requireAuth('registrar un comercio')) { setRegisterForm(emptyProfileForm(category)); setRegisterError(''); setRegisterOpen(true); } }}><MaterialCommunityIcons name="store-plus-outline" size={17} color="#087443" /><Text className="ml-1 text-center text-[11px] font-black text-ui-primary">{language === 'es' ? 'Registrar comercio' : 'Register business'}</Text></Pressable>
        </View>
      </View>
      <View className="flex-row flex-wrap px-3 pb-2">
        {COMMERCE_CATEGORIES.map((item) => <Pressable accessibilityRole="button" accessibilityState={{ selected: category === item.id }} key={item.id} onPress={() => { setCategory(item.id); setSubcategory(undefined); }} className="items-center px-1 py-1.5" style={{ width: '25%' }}><View className={category === item.id ? 'h-12 w-12 items-center justify-center rounded-full bg-ui-primary dark:bg-ui-dark-primary' : 'h-12 w-12 items-center justify-center rounded-full border border-ui-border bg-ui-surface dark:border-ui-dark-border dark:bg-ui-dark-surface'}><MaterialCommunityIcons name={item.icon} size={21} color={category === item.id ? 'white' : '#087443'} /></View><Text className={category === item.id ? 'mt-1 text-center text-[11px] font-black text-ui-primary dark:text-ui-dark-primary' : 'mt-1 text-center text-[11px] font-extrabold text-ui-text dark:text-ui-dark-text'} numberOfLines={2}>{item[language]}</Text></Pressable>)}
      </View>
      {COMMERCE_SUBCATEGORIES[category].length ? <View className="mb-3 px-5"><Text className="mb-2 text-xs font-black uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Filtrar por experiencia' : 'Filter by experience'}</Text><ScrollView horizontal contentContainerStyle={{ gap: 8 }} showsHorizontalScrollIndicator={false}><Pressable accessibilityRole="button" accessibilityState={{ selected: !subcategory }} className={!subcategory ? 'rounded-full bg-ui-secondary px-4 py-2.5 dark:bg-ui-dark-secondary' : 'rounded-full bg-ui-muted px-4 py-2.5 dark:bg-ui-dark-muted'} onPress={() => setSubcategory(undefined)}><Text className={!subcategory ? 'text-xs font-black text-white' : 'text-xs font-bold text-ui-text dark:text-ui-dark-text'}>{language === 'es' ? 'Todos' : 'All'}</Text></Pressable>{COMMERCE_SUBCATEGORIES[category].map((tag) => <Pressable accessibilityRole="button" accessibilityState={{ selected: subcategory === tag.id }} className={subcategory === tag.id ? 'rounded-full bg-ui-secondary px-4 py-2.5 dark:bg-ui-dark-secondary' : 'rounded-full bg-ui-muted px-4 py-2.5 dark:bg-ui-dark-muted'} key={tag.id} onPress={() => setSubcategory(tag.id)}><Text className={subcategory === tag.id ? 'text-xs font-black text-white' : 'text-xs font-bold text-ui-text dark:text-ui-dark-text'}>{tag[language]}</Text></Pressable>)}</ScrollView></View> : null}
      <View className="mx-5 mb-3 rounded-2xl bg-ui-primary-soft px-4 py-3 dark:bg-ui-dark-primary-soft"><Text className="text-xs font-bold text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? `${viewMode === 'nearby' ? 'Comercios cerca de tu ubicación' : `Región: ${selectedRegion?.name_es ?? 'cargando'}`} · ${selectedCategory.es}. La información comercial se muestra como aporte, salvo verificación documentada.` : `${viewMode === 'nearby' ? 'Businesses near your location' : `Region: ${selectedRegion?.name_en ?? 'loading'}`} · ${selectedCategory.en}. Commercial information is a contribution unless documented as verified.`}</Text></View>
    </View>
  );

  return (
    <View className="flex-1 bg-ui-background dark:bg-ui-dark-background">
      <FlatList data={directory.data ?? []} keyExtractor={(item) => item.id} renderItem={({ item }) => <ServiceCard service={item} saved={(favoriteIds.data ?? []).includes(item.id)} onClaim={setClaiming} onOpen={setDetail} onReport={setReporting} onSaved={(service) => void toggleFavorite(service)} />} contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 20 }} ListHeaderComponent={header} ListEmptyComponent={regionsQuery.isLoading || directory.isLoading ? <View className="items-center py-14"><ActivityIndicator size="large" color="#087443" /><Text className="mt-4 text-center font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Cargando regiones y comercios…' : 'Loading regions and businesses…'}</Text></View> : regionsQuery.isError || directory.isError ? <View className="items-center rounded-card border border-ui-border bg-ui-surface px-6 py-12 dark:border-ui-dark-border dark:bg-ui-dark-surface"><MaterialCommunityIcons name="cloud-alert-outline" size={44} color="#B42318" /><Text className="mt-4 text-center text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'No pudimos cargar el directorio' : 'Directory could not load'}</Text><Pressable className="mt-5 rounded-2xl bg-ui-primary px-5 py-3" onPress={() => { void regionsQuery.refetch(); void directory.refetch(); }}><Text className="font-black text-white">{language === 'es' ? 'Reintentar' : 'Retry'}</Text></Pressable></View> : <View className="items-center rounded-card border border-dashed border-ui-border bg-ui-surface px-6 py-12 dark:border-ui-dark-border dark:bg-ui-dark-surface"><MaterialCommunityIcons name={selectedCategory.icon} size={44} color="#68737A" /><Text className="mt-4 text-center text-lg font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Aún no hay perfiles en esta región y categoría' : 'No profiles in this region and category yet'}</Text><Text className="mt-2 text-center text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? '¿Sos dueño? Registrá tu comercio o reclamá un perfil para empezar a recibir clientes.' : 'Are you an owner? Register or claim a profile to start receiving customers.'}</Text></View>} />
      <BusinessDetailModal service={detail} onClose={() => setDetail(null)} onReviewed={async () => { await directory.refetch(); }} />
      <Modal visible={Boolean(claiming)} transparent animationType="slide" onRequestClose={() => setClaiming(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-ui-surface p-6 dark:bg-ui-dark-surface">
            <Text className="text-xl font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Reclamar perfil' : 'Claim profile'}</Text>
            <Text className="mt-2 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{claiming?.title}</Text>
            <TextInput value={claimMessage} onChangeText={setClaimMessage} multiline placeholder={language === 'es' ? 'Contanos cómo podemos verificar que sos el dueño (opcional).' : 'Tell us how we can verify ownership (optional).'} className="mt-4 min-h-24 rounded-2xl border border-ui-border px-4 py-3 text-ui-text dark:border-ui-dark-border dark:text-ui-dark-text" textAlignVertical="top" />
            {claimError ? <Text className="mt-2 text-xs font-semibold text-red-600">{claimError}</Text> : null}
            <View className="mt-4 flex-row gap-3"><Pressable className="flex-1 rounded-2xl border border-ui-border py-3 dark:border-ui-dark-border" onPress={() => setClaiming(null)}><Text className="text-center font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Cancelar' : 'Cancel'}</Text></Pressable><Pressable className="flex-1 rounded-2xl bg-ui-primary py-3" onPress={() => void submitClaim()}><Text className="text-center font-black text-white">{language === 'es' ? 'Enviar solicitud' : 'Send request'}</Text></Pressable></View>
          </View>
        </View>
      </Modal>
      <Modal visible={dashboardOpen} transparent animationType="slide" onRequestClose={() => setDashboardOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[90%] rounded-t-3xl bg-ui-surface p-6 dark:bg-ui-dark-surface">
            <View className="flex-row items-center justify-between"><Text className="text-xl font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Panel para propietarios' : 'Owner dashboard'}</Text><Pressable onPress={() => setDashboardOpen(false)}><MaterialCommunityIcons name="close" size={24} color="#68737A" /></Pressable></View>
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
                const categoryInfo = COMMERCE_CATEGORIES.find((item) => item.id === service.category);
                const tagLabels = (COMMERCE_SUBCATEGORIES[service.category] ?? []).filter((tag) => service.subcategories.includes(tag.id)).map((tag) => tag[language]);
                return <View key={service.id} className="mt-4 rounded-2xl border border-ui-border p-4 dark:border-ui-dark-border">
                  <Text className="font-black text-ui-text dark:text-ui-dark-text">{service.title}</Text>
                  <Text className="mt-1 text-xs font-bold text-ui-primary">{categoryInfo?.[language] ?? service.category} · {regions.find((region) => region.id === service.region_id)?.[language === 'es' ? 'name_es' : 'name_en'] ?? (language === 'es' ? 'Región sin asignar' : 'Unassigned region')} · {service.source} · {service.claim_status}</Text>
                  {tagLabels.length ? <View className="mt-2 flex-row flex-wrap gap-2">{tagLabels.map((tag) => <Text key={tag} className="rounded-full bg-ui-primary-soft px-2 py-1 text-[10px] font-black text-ui-primary dark:bg-ui-dark-primary-soft">{tag}</Text>)}</View> : null}
                  <View className="mt-3 flex-row gap-2">{[
                    { icon: 'eye-outline' as const, label: language === 'es' ? 'Vistas' : 'Views', value: service.metrics.views },
                    { icon: 'whatsapp' as const, label: 'WhatsApp', value: service.metrics.whatsapp_clicks },
                    { icon: 'phone-outline' as const, label: language === 'es' ? 'Llamadas' : 'Calls', value: service.metrics.calls },
                  ].map((metric) => <View key={metric.label} className="flex-1 items-center rounded-2xl bg-ui-muted px-2 py-3 dark:bg-white/10"><MaterialCommunityIcons name={metric.icon} size={18} color="#087443" /><Text className="mt-1 text-lg font-black text-ui-text dark:text-ui-dark-text">{metric.value}</Text><Text className="text-[10px] font-bold text-ui-text-muted dark:text-ui-dark-text-muted">{metric.label}</Text></View>)}</View>
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
            {registerError ? <Text className="mt-2 text-xs font-semibold text-red-600">{registerError}</Text> : null}
            <View className="mt-4 flex-row gap-3"><Pressable className="flex-1 rounded-2xl border border-ui-border py-3 dark:border-ui-dark-border" onPress={() => setRegisterOpen(false)}><Text className="text-center font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Cancelar' : 'Cancel'}</Text></Pressable><Pressable className="flex-1 rounded-2xl bg-ui-primary py-3" onPress={() => void submitRegistration()}><Text className="text-center font-black text-white">{language === 'es' ? 'Publicar' : 'Publish'}</Text></Pressable></View>
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
            <View className="mt-4 flex-row gap-3"><Pressable className="flex-1 rounded-2xl border border-ui-border py-3 dark:border-ui-dark-border" onPress={() => setEditing(null)}><Text className="text-center font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Cancelar' : 'Cancel'}</Text></Pressable><Pressable className="flex-1 rounded-2xl bg-ui-primary py-3" onPress={() => void submitEdit()}><Text className="text-center font-black text-white">{language === 'es' ? 'Guardar' : 'Save'}</Text></Pressable></View>
          </ScrollView>
        </View></View>
      </Modal>
      <InformationReportModal open={Boolean(reporting)} targetType="commercial_service" targetId={reporting?.id} targetLabel={reporting?.title ?? ''} language={language} onClose={() => setReporting(null)} />
    </View>
  );
}
