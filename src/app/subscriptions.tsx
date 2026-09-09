import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { ThemedAlert as Alert } from '@/components/themed-alert';
import { billingOffers, getMySubscriptions, hasActiveBusinessPlan, hasActivePersonalPlan, openSubscriptionCheckout, type BillingOfferId } from '@/lib/billing';
import { useGooglePlayBilling } from '../hooks/use-google-play-billing';
import { useApp } from '@/providers/app-provider';

import { FrogLoader } from '@/components/frog-loader';
const universalOffers: BillingOfferId[] = ['universal_monthly', 'universal_annual'];
const businessOffers: BillingOfferId[] = ['business_monthly'];

export default function SubscriptionsScreen() {
  const { isAdmin, isAuthenticated, language, requireAuth, session } = useApp();
  const router = useRouter();
  const { claimServiceId, intent, serviceId } = useLocalSearchParams<{ claimServiceId?: string; intent?: string; serviceId?: string }>();
  const businessIntent = intent === 'business';
  const [busyOffer, setBusyOffer] = useState<BillingOfferId>();
  const subscriptions = useQuery({ queryKey: ['my-subscriptions'], queryFn: getMySubscriptions, enabled: isAuthenticated });
  const refetchSubscriptions = subscriptions.refetch;

  const purchaseVerified = useCallback(async () => {
    const purchasedOffer = busyOffer;
    setBusyOffer(undefined);
    await refetchSubscriptions();
    Alert.alert('Descubriendo CR', language === 'es' ? 'Compra validada por Google Play. Tu plan ya está activo.' : 'Google Play validated your purchase. Your plan is now active.');
    if (purchasedOffer && billingOffers[purchasedOffer].business) {
      router.replace(claimServiceId ? { pathname: '/claim-business', params: { serviceId: claimServiceId } } : '/(tabs)/commerce');
    }
  }, [busyOffer, claimServiceId, language, refetchSubscriptions, router]);
  const purchaseFailed = useCallback((message: string) => {
    setBusyOffer(undefined);
    if (message) Alert.alert('Descubriendo CR', message);
  }, []);
  const playBilling = useGooglePlayBilling({ onError: purchaseFailed, onVerified: purchaseVerified, userId: session?.user.id });

  useFocusEffect(useCallback(() => {
    void refetchSubscriptions();
  }, [refetchSubscriptions]));

  const startCheckout = async (offerId: BillingOfferId) => {
    const offer = billingOffers[offerId];
    if (!requireAuth(language === 'es' ? 'activar un plan Pro' : 'activate a Pro plan')) return;
    if (isAdmin) {
      Alert.alert('Descubriendo CR', language === 'es' ? 'Tu cuenta administradora ya tiene acceso gratuito para pruebas.' : 'Your administrator account already has free testing access.');
      return;
    }
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
      if (Platform.OS === 'android') setBusyOffer(undefined);
    } finally {
      if (Platform.OS !== 'android') setBusyOffer(undefined);
    }
  };

  const active = (offerId: BillingOfferId) => subscriptions.data?.some((item) => item.offer_id === offerId && ['active', 'past_due', 'canceled'].includes(item.status) && (!item.current_period_end || new Date(item.current_period_end).getTime() > Date.now()) && (!billingOffers[offerId].business || !serviceId || item.service_id === serviceId));
  return <ScrollView className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
    <View className="mx-auto w-full max-w-2xl">
      <View className="flex-row items-center"><Pressable accessibilityLabel={language === 'es' ? 'Volver' : 'Back'} className="mr-3 rounded-full bg-ui-muted p-2 dark:bg-ui-dark-muted" onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={21} color="#087443" /></Pressable><View><Text className="text-2xl font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Planes Pro' : 'Pro plans'}</Text><Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{Platform.OS === 'android' ? (language === 'es' ? 'Pago seguro y validado con Google Play.' : 'Secure payment validated with Google Play.') : (language === 'es' ? 'Pago seguro en la web.' : 'Secure web payment.')}</Text></View></View>
      {businessIntent ? <View accessibilityRole="alert" className="mt-5 rounded-2xl border border-ui-primary bg-ui-primary-soft p-4 dark:bg-ui-dark-primary-soft"><Text className="font-black text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Plan para comercio o servicio seleccionado' : 'Business or service plan selected'}</Text><Text className="mt-1 text-sm leading-5 text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Emití y confirmá el pago. Después se habilitarán el registro y el Panel de propietarios.' : 'Complete and confirm payment. Registration and the Owner dashboard will then be unlocked.'}</Text></View> : <View className="mt-5 rounded-2xl bg-ui-primary-soft p-4 dark:bg-ui-dark-primary-soft"><Text className="font-black text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? '15 días gratis con toda la app' : '15 free days with the complete app'}</Text><Text className="mt-1 text-sm leading-5 text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Después elegís el plan que mejor se adapte a tu viaje.' : 'Then choose the plan that best fits your trip.'}</Text></View>}
      {businessIntent ? <><Text className="mt-7 text-xs font-black uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Para comercios' : 'For businesses'}</Text>{businessOffers.map((offerId) => <PlanCard active={isAdmin || Boolean(active(offerId))} adminAccess={isAdmin} busy={busyOffer === offerId} key={offerId} language={language} offerId={offerId} onPress={() => void startCheckout(offerId)} storeAvailable={Platform.OS !== 'android' || Boolean(playBilling.storePrices[offerId])} storeLoading={Platform.OS === 'android' && (!playBilling.connected || !playBilling.productsLoaded)} storePrice={playBilling.storePrices[offerId]} />)}</> : null}
      {!businessIntent ? universalOffers.map((offerId) => <PlanCard active={isAdmin || Boolean(active(offerId))} adminAccess={isAdmin} busy={busyOffer === offerId} key={offerId} language={language} offerId={offerId} onPress={() => void startCheckout(offerId)} storeAvailable={Platform.OS !== 'android' || Boolean(playBilling.storePrices[offerId])} storeLoading={Platform.OS === 'android' && (!playBilling.connected || !playBilling.productsLoaded)} storePrice={playBilling.storePrices[offerId]} />) : null}
      {subscriptions.isLoading ? <FrogLoader className="mt-5" color="#087443" /> : null}
    </View>
  </ScrollView>;
}

function PlanCard({ active, adminAccess = false, busy, language, offerId, onPress, storeAvailable = true, storeLoading = false, storePrice }: { active: boolean; adminAccess?: boolean; busy: boolean; language: 'es' | 'en'; offerId: BillingOfferId; onPress: () => void; storeAvailable?: boolean; storeLoading?: boolean; storePrice?: string }) {
  const offer = billingOffers[offerId];
  return <View className={offer.featured ? 'mt-4 rounded-3xl border-2 border-ui-primary bg-ui-surface p-5 dark:bg-ui-dark-surface' : 'mt-4 rounded-3xl border border-ui-border bg-ui-surface p-5 dark:border-ui-dark-border dark:bg-ui-dark-surface'}>{offer.featured ? <Text className="mb-3 self-start rounded-full bg-ui-primary px-3 py-1 text-xs font-black text-white">{language === 'es' ? 'MEJOR VALOR' : 'BEST VALUE'}</Text> : null}<View className="flex-row items-start"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft"><MaterialCommunityIcons name={offer.icon} size={24} color="#087443" /></View><View className="ml-3 flex-1"><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{offer.title[language === 'es' ? 0 : 1]}</Text><Text className="mt-1 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{offer.detail[language === 'es' ? 0 : 1]}</Text><Text className="mt-2 text-base font-black text-ui-primary dark:text-ui-dark-primary">{storePrice ?? offer.price[language === 'es' ? 0 : 1]}</Text></View>{active ? <Text className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">{adminAccess ? 'ADMIN' : (language === 'es' ? 'ACTIVO' : 'ACTIVE')}</Text> : null}</View><Pressable accessibilityRole="button" className="mt-4 items-center rounded-2xl bg-ui-primary py-3 dark:bg-ui-dark-primary disabled:opacity-50" disabled={busy || active || storeLoading || !storeAvailable} onPress={onPress}>{busy || storeLoading ? <FrogLoader color="white" /> : <Text className="font-black text-white">{adminAccess ? (language === 'es' ? 'Acceso gratuito para pruebas' : 'Free testing access') : active ? (language === 'es' ? 'Plan activo' : 'Plan active') : !storeAvailable ? (language === 'es' ? 'No disponible en Google Play' : 'Not available on Google Play') : Platform.OS === 'android' ? (language === 'es' ? 'Suscribirme con Google Play' : 'Subscribe with Google Play') : (language === 'es' ? 'Continuar a Checkout' : 'Continue to Checkout')}</Text>}</Pressable></View>;
}
