import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export const subscriptionPlans = ['no_ads', 'business', 'sponsored'] as const;
export type SubscriptionPlan = (typeof subscriptionPlans)[number];
export type SubscriptionStatus = 'pending' | 'active' | 'past_due' | 'canceled' | 'expired';

export const billingOffers = {
  travel_pass_national_monthly: { plan: 'no_ads', business: false, icon: 'map-marker-star-outline', title: ['Travel Pass nacional', 'Costa Rica Travel Pass'], detail: ['Acceso Pro para viajes dentro de Costa Rica.', 'Pro access for travel around Costa Rica.'], price: ['₡1.900 / mes', 'CRC 1,900 / month'] },
  travel_pass_national_annual: { plan: 'no_ads', business: false, icon: 'calendar-star', title: ['Travel Pass anual', 'Annual Travel Pass'], detail: ['El mejor precio para viajar todo el año.', 'The best value for a full year of travel.'], price: ['₡9.900 / año', 'CRC 9,900 / year'] },
  travel_pass_foreign_30d: { plan: 'no_ads', business: false, icon: 'passport', title: ['Travel Pass extranjero', 'Visitor Travel Pass'], detail: ['Acceso Pro por 30 días para tu visita.', '30 days of Pro access for your visit.'], price: ['US$5,99 / 30 días', 'US$5.99 / 30 days'] },
  business_pro: { plan: 'business', business: true, icon: 'store-check-outline', title: ['Negocio Pro', 'Business Pro'], detail: ['Para sodas, guías y cabinas locales.', 'For local sodas, guides, and cabins.'], price: ['₡4.900 / mes', 'CRC 4,900 / month'] },
  business_growth: { plan: 'sponsored', business: true, icon: 'rocket-launch-outline', title: ['Negocio Growth', 'Business Growth'], detail: ['Impulso para hoteles, tours y comercios con mayor margen.', 'Growth for hotels, tours, and higher-margin businesses.'], price: ['US$24,99 / mes', 'US$24.99 / month'] },
} as const;

export type BillingOfferId = keyof typeof billingOffers;
type LegacySubscriptionOfferId = 'legacy_no_ads' | 'legacy_business' | 'legacy_sponsored';

export type Subscription = {
  id: string;
  service_id: string | null;
  plan: SubscriptionPlan;
  offer_id: BillingOfferId | LegacySubscriptionOfferId;
  status: SubscriptionStatus;
  price_amount: number;
  price_currency: 'CRC' | 'USD';
  current_period_end: string | null;
};

export async function getMySubscriptions(): Promise<Subscription[]> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, service_id, plan, offer_id, status, price_amount, price_currency, current_period_end')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Subscription[];
}

export async function openSubscriptionCheckout({ offerId, serviceId }: { offerId: BillingOfferId; serviceId?: string }) {
  if (Platform.OS !== 'web') throw new Error('Las compras de planes están disponibles únicamente en la versión web.');
  const returnUrl = Linking.createURL('subscriptions');
  const localCheckoutUrl = process.env.EXPO_PUBLIC_BILLING_URL?.trim();
  let checkoutUrl: string | undefined;

  if (localCheckoutUrl) {
    const url = new URL(localCheckoutUrl);
    url.searchParams.set('offer', offerId);
    url.searchParams.set('return_url', returnUrl);
    if (serviceId) url.searchParams.set('service_id', serviceId);
    checkoutUrl = url.toString();
  } else {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { offerId, serviceId, returnUrl },
    });
    if (error) throw error;
    checkoutUrl = data?.url;
  }

  if (!checkoutUrl) throw new Error('No se pudo crear una sesión de Checkout.');
  return WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);
}
