import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedAlert as Alert } from '@/components/themed-alert';
import { GlassSurface, PressableCard } from '@/components/ui/card';
import { billingOffers, getMyAccessStatus, getMySubscriptions, hasActiveBusinessPlan, hasActivePersonalPlan, hasEntitledStatus, openSubscriptionCheckout, openSubscriptionManagement, type BillingOfferId } from '@/lib/billing';
import { useGooglePlayBilling } from '../hooks/use-google-play-billing';
import { useApp } from '@/providers/app-provider';
import { useAppTheme } from '@/theme/theme-provider';

import { FrogLoader } from '@/components/frog-loader';
const universalOffers: BillingOfferId[] = ['universal_monthly', 'universal_annual'];
const businessOffers: BillingOfferId[] = ['business_monthly'];
const checkoutArtwork = [
  require('../../assets/images/subscriptions/rainforest-card.png'),
  require('../../assets/images/subscriptions/sloth-monthly.png'),
  require('../../assets/images/subscriptions/capuchin-annual.png'),
  require('../../assets/images/subscriptions/jaguar-business.png'),
];

export default function SubscriptionsScreen() {
  const { isAdmin, isAuthenticated, language, requireAuth, session } = useApp();
  const { bottom, top } = useSafeAreaInsets();
  const router = useRouter();
  const { claimServiceId, intent, serviceId } = useLocalSearchParams<{ claimServiceId?: string; intent?: string; serviceId?: string }>();
  const businessIntent = intent === 'business';
  const [busyOffer, setBusyOffer] = useState<BillingOfferId>();
  const [artworkReady, setArtworkReady] = useState(false);
  const checkoutInProgress = useRef(false);
  const subscriptions = useQuery({ queryKey: ['my-subscriptions'], queryFn: getMySubscriptions, enabled: isAuthenticated });
  const access = useQuery({ queryKey: ['my-app-access', session?.user.id], queryFn: getMyAccessStatus, enabled: isAuthenticated });
  const refetchSubscriptions = subscriptions.refetch;

  useEffect(() => {
    let mounted = true;
    void Asset.loadAsync(checkoutArtwork).finally(() => { if (mounted) setArtworkReady(true); });
    return () => { mounted = false; };
  }, []);

  const purchaseVerified = useCallback(async () => {
    const purchasedOffer = busyOffer;
    checkoutInProgress.current = false;
    setBusyOffer(undefined);
    await refetchSubscriptions();
    Alert.alert('Descubriendo CR', language === 'es' ? 'Compra validada por Google Play. Tu plan ya está activo.' : 'Google Play validated your purchase. Your plan is now active.');
    if (purchasedOffer && billingOffers[purchasedOffer].business) {
      router.replace(claimServiceId ? { pathname: '/claim-business', params: { serviceId: claimServiceId } } : '/(tabs)/commerce');
    }
  }, [busyOffer, claimServiceId, language, refetchSubscriptions, router]);
  const purchaseFailed = useCallback((message: string) => {
    checkoutInProgress.current = false;
    setBusyOffer(undefined);
    if (message) Alert.alert('Descubriendo CR', message);
  }, []);
  const playBilling = useGooglePlayBilling({ onError: purchaseFailed, onVerified: purchaseVerified, userId: session?.user.id });

  useFocusEffect(useCallback(() => {
    void refetchSubscriptions();
  }, [refetchSubscriptions]));

  const startCheckout = async (offerId: BillingOfferId) => {
    if (checkoutInProgress.current) return;
    const offer = billingOffers[offerId];
    if (!requireAuth(language === 'es' ? 'activar un plan Pro' : 'activate a Pro plan')) return;
    if (isAdmin) {
      Alert.alert('Descubriendo CR', language === 'es' ? 'Tu cuenta administradora ya tiene acceso gratuito para pruebas.' : 'Your administrator account already has free testing access.');
      return;
    }
    checkoutInProgress.current = true;
    setBusyOffer(offerId);
    try {
      if (Platform.OS === 'android') {
        await playBilling.purchase(offerId, offer.business ? serviceId : undefined);
        return;
      }
      const result = await openSubscriptionCheckout({ offerId, serviceId: offer.business ? serviceId : undefined });
      if (result.type === 'success') {
        let confirmed = false;
        for (let attempt = 0; attempt < 10; attempt += 1) {
          const refreshed = await subscriptions.refetch();
          confirmed = offer.business ? hasActiveBusinessPlan(refreshed.data ?? [], serviceId) : hasActivePersonalPlan(refreshed.data ?? []);
          if (confirmed) break;
          if (attempt < 9) await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        Alert.alert('Descubriendo CR', confirmed
          ? (language === 'es' ? 'Pago confirmado. Tu plan ya está activo.' : 'Payment confirmed. Your plan is now active.')
          : (language === 'es' ? 'Estamos confirmando tu pago. El plan se activará al validarlo el proveedor.' : 'We are confirming your payment. The plan activates after provider validation.'));
        if (confirmed && offer.business) {
          router.replace(claimServiceId ? { pathname: '/claim-business', params: { serviceId: claimServiceId } } : '/(tabs)/commerce');
        }
      }
    } catch (error) {
      Alert.alert('Descubriendo CR', error instanceof Error ? error.message : (language === 'es' ? 'No se pudo abrir Checkout.' : 'Checkout could not be opened.'));
      if (Platform.OS === 'android') {
        checkoutInProgress.current = false;
        setBusyOffer(undefined);
      }
    } finally {
      if (Platform.OS !== 'android') {
        checkoutInProgress.current = false;
        setBusyOffer(undefined);
      }
    }
  };

  const active = (offerId: BillingOfferId) => subscriptions.data?.some((item) => item.offer_id === offerId && hasEntitledStatus(item) && (!item.current_period_end || new Date(item.current_period_end).getTime() > Date.now()) && (!billingOffers[offerId].business || !serviceId || item.service_id === serviceId));
  const managedOfferId = (businessIntent ? businessOffers : universalOffers).find(active);
  const managedSubscription = subscriptions.data?.find((item) => item.offer_id === managedOfferId);
  const trialHeadline = access.data?.hasPersonalPlan
    ? (language === 'es' ? 'Tu plan Pro está activo' : 'Your Pro plan is active')
    : access.data
      ? access.data.trialDaysRemaining === 0
        ? (language === 'es' ? 'Tu período gratuito terminó' : 'Your free trial has ended')
        : (language === 'es' ? '15 días gratis con toda la app' : '15 free days with the complete app')
      : (language === 'es' ? 'Consultá los planes disponibles' : 'See available plans');
  if (!artworkReady) return <View className="flex-1 bg-ui-background dark:bg-ui-dark-background"><FrogLoader accessibilityLabel={language === 'es' ? 'Cargando pasarela de pago' : 'Loading payment gateway'} branded size="large" /></View>;

  return <ScrollView className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(bottom, 24), paddingHorizontal: 20, paddingTop: top + 20 }}>
    <View className="mx-auto w-full max-w-2xl flex-1">
      <View className="flex-row items-center"><Pressable accessibilityLabel={language === 'es' ? 'Volver' : 'Back'} accessibilityRole="button" className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-ui-muted active:opacity-70 dark:bg-ui-dark-muted" onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={23} color="#087443" /></Pressable><View className="min-w-0 flex-1"><Text className="text-3xl font-black tracking-tight text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Planes Pro' : 'Pro plans'}</Text><Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{Platform.OS === 'android' ? (language === 'es' ? 'Pago seguro y validado con Google Play.' : 'Secure payment validated with Google Play.') : (language === 'es' ? 'Pago seguro en la web.' : 'Secure web payment.')}</Text></View></View>
      {businessIntent ? <View accessibilityRole="alert" className="mt-5 rounded-2xl border border-ui-primary bg-ui-primary-soft p-4 dark:bg-ui-dark-primary-soft"><Text className="font-black text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Plan para comercio o servicio seleccionado' : 'Business or service plan selected'}</Text><Text className="mt-1 text-sm leading-5 text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Emití y confirmá el pago. Después se habilitarán el registro y el Panel de propietarios.' : 'Complete and confirm payment. Registration and the Owner dashboard will then be unlocked.'}</Text></View> : <View className="mt-5 rounded-2xl bg-ui-primary-soft p-4 dark:bg-ui-dark-primary-soft"><Text className="font-black text-ui-primary dark:text-ui-dark-primary">{trialHeadline}</Text><Text className="mt-1 text-sm leading-5 text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Elegí el plan que mejor se adapte a tu viaje.' : 'Choose the plan that best fits your trip.'}</Text></View>}
      <View className="mt-4 flex-1 gap-4">
        {businessIntent ? businessOffers.map((offerId) => <PlanCard active={isAdmin || Boolean(active(offerId))} adminAccess={isAdmin} busy={busyOffer === offerId} key={offerId} language={language} offerId={offerId} onPress={() => void startCheckout(offerId)} storeAvailable={Platform.OS !== 'android' || Boolean(playBilling.storePrices[offerId])} storeLoading={Platform.OS === 'android' && (!playBilling.connected || !playBilling.productsLoaded)} storePrice={playBilling.storePrices[offerId]} />) : null}
        {!businessIntent ? universalOffers.map((offerId) => <PlanCard active={isAdmin || Boolean(active(offerId)) || (Platform.OS !== 'android' && Boolean(managedSubscription))} adminAccess={isAdmin} busy={busyOffer === offerId} key={offerId} language={language} offerId={offerId} onPress={() => void startCheckout(offerId)} storeAvailable={Platform.OS !== 'android' || Boolean(playBilling.storePrices[offerId])} storeLoading={Platform.OS === 'android' && (!playBilling.connected || !playBilling.productsLoaded)} storePrice={playBilling.storePrices[offerId]} />) : null}
      </View>
      {managedSubscription ? <Pressable accessibilityRole="link" className="mt-4 items-center rounded-2xl border border-ui-primary py-3" onPress={() => void openSubscriptionManagement(managedSubscription).catch((error) => Alert.alert('Descubriendo CR', error instanceof Error ? error.message : 'No se pudo abrir la administración.'))}><Text className="font-black text-ui-primary">{language === 'es' ? 'Administrar o cancelar suscripción' : 'Manage or cancel subscription'}</Text></Pressable> : null}
      {subscriptions.isLoading ? <FrogLoader className="mt-5" color="#087443" /> : null}
      {subscriptions.isError ? <View accessibilityRole="alert" className="mt-5 items-center rounded-2xl border border-ui-danger bg-red-50 p-4 dark:bg-red-950"><Text className="text-center font-bold text-ui-danger dark:text-ui-dark-danger">{language === 'es' ? 'No pudimos cargar tus suscripciones.' : 'We could not load your subscriptions.'}</Text><Pressable accessibilityRole="button" className="mt-3 rounded-control bg-ui-primary px-5 py-3" onPress={() => void subscriptions.refetch()}><Text className="font-black text-white">{language === 'es' ? 'Reintentar' : 'Retry'}</Text></Pressable></View> : null}
    </View>
  </ScrollView>;
}

function PlanCard({ active, adminAccess = false, busy, language, offerId, onPress, storeAvailable = true, storeLoading = false, storePrice }: { active: boolean; adminAccess?: boolean; busy: boolean; language: 'es' | 'en'; offerId: BillingOfferId; onPress: () => void; storeAvailable?: boolean; storeLoading?: boolean; storePrice?: string }) {
  const offer = billingOffers[offerId];
  const { colors, mode, tokens } = useAppTheme();
  const disabled = busy || active || storeLoading || !storeAvailable;
  const kind = offer.business ? 'business' : offer.featured ? 'annual' : 'monthly';
  const art = kind === 'business' ? require('../../assets/images/subscriptions/jaguar-business.png') : kind === 'annual' ? require('../../assets/images/subscriptions/capuchin-annual.png') : require('../../assets/images/subscriptions/sloth-monthly.png');
  const borderColor = kind === 'monthly'
    ? tokens.colors.neutral[mode === 'dark' ? 400 : 300]
    : tokens.colors.commerceGold[mode === 'dark' ? 'darkInk' : 'ink'];
  const actionLabel = adminAccess ? (language === 'es' ? 'Acceso gratuito para pruebas' : 'Free testing access') : active ? (language === 'es' ? 'Plan activo' : 'Plan active') : !storeAvailable ? (language === 'es' ? 'No disponible en Google Play' : 'Not available on Google Play') : Platform.OS === 'android' ? (language === 'es' ? 'Suscribirme con Google Play' : 'Subscribe with Google Play') : (language === 'es' ? 'Continuar a Checkout' : 'Continue to Checkout');

  return <PressableCard accessibilityLabel={`${offer.title[language === 'es' ? 0 : 1]}. ${actionLabel}`} className="flex-1 overflow-hidden disabled:opacity-50" disabled={disabled} onPress={onPress} padding="none" style={{ borderColor, borderWidth: kind === 'monthly' ? 2 : 3, minHeight: kind === 'business' ? 410 : 250 }} variant="raised">
    <Image contentFit="cover" contentPosition={kind === 'monthly' ? 'left' : kind === 'annual' ? 'right' : 'center'} source={require('../../assets/images/subscriptions/rainforest-card.png')} style={[StyleSheet.absoluteFill, styles.jungle]} />
    <PlanAnimal kind={kind} source={art} />
    <View className={kind === 'business' ? 'flex-1 justify-between p-5 pt-56' : 'flex-1 justify-between p-5'}>
      <View>
        {offer.featured ? <Text className="mb-3 self-start rounded-full bg-ui-primary px-3 py-1 text-xs font-black text-white dark:text-ui-dark-on-primary">{language === 'es' ? 'MEJOR VALOR' : 'BEST VALUE'}</Text> : null}
        <GlassSurface className={kind === 'annual' ? 'mr-24 rounded-2xl p-3' : kind === 'monthly' ? 'ml-24 rounded-2xl p-3' : 'rounded-2xl p-4'}>
        <View className="flex-row items-start">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-ui-glass dark:bg-ui-dark-glass"><MaterialCommunityIcons name={offer.icon} size={24} color={colors.primary} /></View>
          <View className="ml-3 min-w-0 flex-1"><Text className="text-xl font-black text-ui-text dark:text-ui-dark-text">{offer.title[language === 'es' ? 0 : 1]}</Text><Text className="mt-1 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{offer.detail[language === 'es' ? 0 : 1]}</Text><Text className="mt-3 text-xl font-black text-ui-primary dark:text-ui-dark-primary">{storePrice ?? offer.price[language === 'es' ? 0 : 1]}</Text></View>
          {active ? <Text className="rounded-full bg-ui-primary-soft px-2.5 py-1 text-xs font-black text-ui-primary dark:bg-ui-dark-primary-soft dark:text-ui-dark-primary">{adminAccess ? 'ADMIN' : (language === 'es' ? 'ACTIVO' : 'ACTIVE')}</Text> : null}
        </View>
        </GlassSurface>
      </View>
      <View className="mt-4 min-h-12 items-center justify-center rounded-2xl bg-ui-primary px-4 dark:bg-ui-dark-primary">{busy || storeLoading ? <FrogLoader color={mode === 'dark' ? colors.onPrimary : 'white'} /> : <Text className="text-center font-black text-white dark:text-ui-dark-background">{actionLabel}</Text>}</View>
    </View>
  </PressableCard>;
}

type AnimalKind = 'monthly' | 'annual' | 'business';

function PlanAnimal({ kind, source }: { kind: AnimalKind; source: React.ComponentProps<typeof Image>['source'] }) {
  const reduceMotion = useReducedMotion();
  const movement = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(movement);
    movement.value = reduceMotion ? 0 : withRepeat(withSequence(
      withTiming(-1, { duration: kind === 'monthly' ? 2200 : 1700, easing: Easing.inOut(Easing.sin) }),
      withTiming(1, { duration: kind === 'monthly' ? 2200 : 1700, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    return () => cancelAnimation(movement);
  }, [kind, movement, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: movement.value * (kind === 'business' ? 2 : 5) },
      { rotateZ: `${movement.value * (kind === 'monthly' ? 1.4 : 0.8)}deg` },
      { scale: kind === 'business' ? 1 + movement.value * 0.008 : 1 },
    ],
  }));

  return <Animated.View pointerEvents="none" style={[styles.animal, styles[`${kind}Animal`], animatedStyle]}><Image contentFit="contain" source={source} style={StyleSheet.absoluteFill} /></Animated.View>;
}

const styles = StyleSheet.create({
  animal: { position: 'absolute', zIndex: 2 },
  annualAnimal: { height: 168, right: -12, top: 18, width: 145 },
  businessAnimal: { height: 220, right: -8, top: 4, width: 330 },
  jungle: { opacity: 0.88 },
  monthlyAnimal: { height: 190, left: -12, top: 8, width: 145 },
});
