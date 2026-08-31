import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ThemedAlert as Alert } from '@/components/themed-alert';
import { billingOffers, getMySubscriptions, openSubscriptionCheckout, type BillingOfferId } from '@/lib/billing';
import { getOwnerDashboard } from '@/lib/commerce';
import { useApp } from '@/providers/app-provider';

const nationalTravelOffers: BillingOfferId[] = ['travel_pass_national_monthly', 'travel_pass_national_annual'];
const foreignTravelOffers: BillingOfferId[] = ['travel_pass_foreign_30d'];
const businessOffers: BillingOfferId[] = ['business_pro', 'business_growth'];

export default function SubscriptionsScreen() {
  const { isAuthenticated, language, requireAuth, visitorType } = useApp();
  const router = useRouter();
  const [serviceId, setServiceId] = useState<string>();
  const [busyOffer, setBusyOffer] = useState<BillingOfferId>();
  const subscriptions = useQuery({ queryKey: ['my-subscriptions'], queryFn: getMySubscriptions, enabled: isAuthenticated });
  const businesses = useQuery({ queryKey: ['subscription-businesses'], queryFn: getOwnerDashboard, enabled: isAuthenticated });
  const refetchSubscriptions = subscriptions.refetch;

  useFocusEffect(useCallback(() => {
    void refetchSubscriptions();
  }, [refetchSubscriptions]));

  const startCheckout = async (offerId: BillingOfferId) => {
    const offer = billingOffers[offerId];
    if (!requireAuth(language === 'es' ? 'activar un plan Pro' : 'activate a Pro plan')) return;
    if (offer.business && !serviceId) {
      Alert.alert('Descubriendo CR', language === 'es' ? 'Elegí primero el negocio que querés activar.' : 'Choose the business you want to activate first.');
      return;
    }
    setBusyOffer(offerId);
    try {
      const result = await openSubscriptionCheckout({ offerId, serviceId: offer.business ? serviceId : undefined });
      if (result.type === 'success') {
        await subscriptions.refetch();
        Alert.alert('Descubriendo CR', language === 'es' ? 'Estamos confirmando tu pago. El plan se activará al validarlo el proveedor.' : 'We are confirming your payment. The plan activates after provider validation.');
      }
    } catch (error) {
      Alert.alert('Descubriendo CR', error instanceof Error ? error.message : (language === 'es' ? 'No se pudo abrir Checkout.' : 'Checkout could not be opened.'));
    } finally {
      setBusyOffer(undefined);
    }
  };

  const active = (offerId: BillingOfferId) => subscriptions.data?.some((item) => item.offer_id === offerId && item.status === 'active' && (!billingOffers[offerId].business || item.service_id === serviceId));
  const travelOffers = visitorType === 'tico' ? nationalTravelOffers : foreignTravelOffers;

  return <ScrollView className="flex-1 bg-ui-background dark:bg-ui-dark-background" contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
    <View className="mx-auto w-full max-w-2xl">
      <View className="flex-row items-center"><Pressable accessibilityLabel={language === 'es' ? 'Volver' : 'Back'} className="mr-3 rounded-full bg-ui-muted p-2 dark:bg-ui-dark-muted" onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={21} color="#087443" /></Pressable><View><Text className="text-2xl font-black text-ui-text dark:text-ui-dark-text">{language === 'es' ? 'Planes Pro' : 'Pro plans'}</Text><Text className="mt-1 text-sm text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Pago seguro en la web, sin StoreKit.' : 'Secure web payment, without StoreKit.'}</Text></View></View>
      <View className="mt-5 rounded-2xl bg-ui-primary-soft p-4 dark:bg-ui-dark-primary-soft"><Text className="text-sm leading-5 text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Tu acceso se actualiza solo cuando el proveedor confirma el pago. No otorgamos beneficios desde el regreso del navegador.' : 'Your access updates only after the provider confirms payment. Browser return never grants benefits.'}</Text></View>
      {travelOffers.map((offerId) => <PlanCard active={Boolean(active(offerId))} busy={busyOffer === offerId} key={offerId} language={language} offerId={offerId} onPress={() => void startCheckout(offerId)} />)}
      <Text className="mt-7 text-xs font-black uppercase tracking-wide text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Para comercios' : 'For businesses'}</Text>
      {businesses.isLoading ? <ActivityIndicator className="mt-5" color="#087443" /> : businesses.data?.length ? <View className="mt-3 gap-2">{businesses.data.map((business) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: serviceId === business.id }} className={serviceId === business.id ? 'flex-row items-center rounded-2xl bg-ui-primary p-4 dark:bg-ui-dark-primary' : 'flex-row items-center rounded-2xl border border-ui-border bg-ui-surface p-4 dark:border-ui-dark-border dark:bg-ui-dark-surface'} key={business.id} onPress={() => setServiceId(business.id)}><MaterialCommunityIcons name="storefront-outline" size={20} color={serviceId === business.id ? 'white' : '#087443'} /><Text className={serviceId === business.id ? 'ml-3 flex-1 font-black text-white' : 'ml-3 flex-1 font-black text-ui-text dark:text-ui-dark-text'}>{business.title}</Text><MaterialCommunityIcons name={serviceId === business.id ? 'check-circle' : 'circle-outline'} size={20} color={serviceId === business.id ? 'white' : '#68737A'} /></Pressable>)}</View> : <Pressable className="mt-3 flex-row items-center rounded-2xl border border-dashed border-ui-border p-4 dark:border-ui-dark-border" onPress={() => router.replace('/(tabs)/commerce')}><MaterialCommunityIcons name="store-plus-outline" size={22} color="#087443" /><Text className="ml-3 flex-1 font-bold text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Registrá o reclamá un negocio para activar Negocio Pro.' : 'Register or claim a business to activate Business Pro.'}</Text></Pressable>}
      {businessOffers.map((offerId) => <PlanCard active={Boolean(active(offerId))} busy={busyOffer === offerId} key={offerId} language={language} offerId={offerId} onPress={() => void startCheckout(offerId)} />)}
      {subscriptions.isLoading ? <ActivityIndicator className="mt-5" color="#087443" /> : null}
    </View>
  </ScrollView>;
}

function PlanCard({ active, busy, language, offerId, onPress }: { active: boolean; busy: boolean; language: 'es' | 'en'; offerId: BillingOfferId; onPress: () => void }) {
  const offer = billingOffers[offerId];
  return <View className="mt-4 rounded-3xl border border-ui-border bg-ui-surface p-5 dark:border-ui-dark-border dark:bg-ui-dark-surface"><View className="flex-row items-start"><View className="h-11 w-11 items-center justify-center rounded-2xl bg-ui-primary-soft dark:bg-ui-dark-primary-soft"><MaterialCommunityIcons name={offer.icon} size={24} color="#087443" /></View><View className="ml-3 flex-1"><Text className="text-lg font-black text-ui-text dark:text-ui-dark-text">{offer.title[language === 'es' ? 0 : 1]}</Text><Text className="mt-1 text-sm leading-5 text-ui-text-muted dark:text-ui-dark-text-muted">{offer.detail[language === 'es' ? 0 : 1]}</Text><Text className="mt-2 text-base font-black text-ui-primary dark:text-ui-dark-primary">{offer.price[language === 'es' ? 0 : 1]}</Text></View>{active ? <Text className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">{language === 'es' ? 'ACTIVO' : 'ACTIVE'}</Text> : null}</View><Pressable accessibilityRole="button" className="mt-4 items-center rounded-2xl bg-ui-primary py-3 dark:bg-ui-dark-primary disabled:opacity-50" disabled={busy || active} onPress={onPress}>{busy ? <ActivityIndicator color="white" /> : <Text className="font-black text-white">{active ? (language === 'es' ? 'Plan activo' : 'Plan active') : (language === 'es' ? 'Continuar a Checkout' : 'Continue to Checkout')}</Text>}</Pressable></View>;
}
