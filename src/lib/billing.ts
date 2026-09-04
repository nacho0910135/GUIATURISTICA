import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

export const subscriptionPlans = ['no_ads', 'business', 'sponsored'] as const;
export type SubscriptionPlan = (typeof subscriptionPlans)[number];
export type SubscriptionStatus = 'pending' | 'active' | 'past_due' | 'canceled' | 'expired';

export const billingOffers = {
  universal_monthly: { plan: 'no_ads', business: false, featured: false, icon: 'calendar-month-outline', title: ['Mensual', 'Monthly'], detail: ['Acceso completo; se renueva automáticamente.', 'Full access; renews automatically.'], price: ['US$2 / mes', 'US$2 / month'] },
  universal_annual: { plan: 'no_ads', business: false, featured: true, icon: 'calendar-star', title: ['Anual', 'Annual'], detail: ['Ahorrás US$4 frente al plan mensual.', 'Save US$4 compared with monthly billing.'], price: ['US$20 / año', 'US$20 / year'] },
  visitor_pass_30d: { plan: 'no_ads', business: false, featured: false, icon: 'passport', title: ['Pase visitante', 'Visitor Pass'], detail: ['30 días de acceso; pago único, no se renueva.', '30 days of access; one-time payment, no renewal.'], price: ['US$5 / 30 días', 'US$5 / 30 days'] },
  business_monthly: { plan: 'business', business: true, featured: false, icon: 'store-check-outline', title: ['Comercio o servicio', 'Business or service'], detail: ['Para administrar un comercio o servicio reclamado o registrado.', 'For a claimed or registered business or service.'], price: ['US$9,99 / mes', 'US$9.99 / month'] },
} as const;

export type BillingOfferId = keyof typeof billingOffers;
type LegacySubscriptionOfferId = 'legacy_no_ads' | 'legacy_business' | 'legacy_sponsored' | 'travel_pass_national_monthly' | 'travel_pass_national_annual' | 'travel_pass_foreign_30d' | 'business_pro' | 'business_growth';

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

const TRIAL_DAYS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

export function getAccessStatus(accountCreatedAt: string, subscriptions: Subscription[], now = Date.now()) {
  const trialEndsAt = new Date(accountCreatedAt).getTime() + TRIAL_DAYS * DAY_MS;
  const trialDaysRemaining = Math.max(0, Math.ceil((trialEndsAt - now) / DAY_MS));
  const hasPersonalPlan = subscriptions.some((item) => item.plan === 'no_ads' && item.status === 'active' && (!item.current_period_end || new Date(item.current_period_end).getTime() > now));
  return { hasAccess: hasPersonalPlan || trialDaysRemaining > 0, hasPersonalPlan, trialDaysRemaining, trialEndsAt: new Date(trialEndsAt).toISOString(), showTrialWarning: !hasPersonalPlan && trialDaysRemaining > 0 && trialDaysRemaining <= 5 };
}

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
