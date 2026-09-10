import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";

export const subscriptionPlans = ["no_ads", "business", "sponsored"] as const;
export type SubscriptionPlan = (typeof subscriptionPlans)[number];
export type SubscriptionStatus =
  "pending" | "active" | "past_due" | "canceled" | "expired";

export const billingOffers = {
  universal_monthly: {
    plan: "no_ads",
    business: false,
    featured: false,
    icon: "calendar-month-outline",
    title: ["Mensual", "Monthly"],
    detail: [
      "Acceso completo; se renueva automáticamente.",
      "Full access; renews automatically.",
    ],
    price: ["US$2 / mes", "US$2 / month"],
  },
  universal_annual: {
    plan: "no_ads",
    business: false,
    featured: true,
    icon: "calendar-star",
    title: ["Anual", "Annual"],
    detail: [
      "Ahorrás US$4 frente al plan mensual.",
      "Save US$4 compared with monthly billing.",
    ],
    price: ["US$20 / año", "US$20 / year"],
  },
  visitor_pass_30d: {
    plan: "no_ads",
    business: false,
    featured: false,
    icon: "passport",
    title: ["Pase visitante", "Visitor Pass"],
    detail: [
      "30 días de acceso; pago único, no se renueva.",
      "30 days of access; one-time payment, no renewal.",
    ],
    price: ["US$5 / 30 días", "US$5 / 30 days"],
  },
  business_monthly: {
    plan: "business",
    business: true,
    featured: false,
    icon: "store-check-outline",
    title: ["Comercio o servicio", "Business or service"],
    detail: [
      "Primero activás el plan; después registrás tu comercio o servicio y accedés al panel. Se renueva automáticamente.",
      "Activate the plan first; then register your business or service and access the dashboard. Renews automatically.",
    ],
    price: ["US$9,99 / mes", "US$9.99 / month"],
  },
} as const;

export type BillingOfferId = keyof typeof billingOffers;

export const googlePlayProductIds = {
  universal_monthly: "universal_monthly",
  universal_annual: "universal_annual",
  visitor_pass_30d: "visitor_pass_30d",
  business_monthly: "business_monthly",
} as const satisfies Record<BillingOfferId, string>;
export const campaignOffers = {
  featured_monthly: {
    campaignType: "featured",
    title: ["Aparecer en los primeros lugares", "Appear in the first results"],
    detail: [
      "Tu negocio aparece antes que los resultados por cercanía. Se renueva cada 30 días hasta que cancelés.",
      "Your business appears before distance-ranked results. It renews every 30 days until canceled.",
    ],
    price: ["US$5 / 30 días", "US$5 / 30 days"],
  },
  banner_monthly: {
    campaignType: "banner",
    title: ["Banner destacado", "Featured banner"],
    detail: [
      "Mostramos la portada de tu negocio con un enlace encima de “¿Qué necesitás?”. Se renueva cada 30 días hasta que cancelés.",
      "We show your business cover with a link above “What do you need?”. It renews every 30 days until canceled.",
    ],
    price: ["US$50 / 30 días", "US$50 / 30 days"],
  },
} as const;
export type CampaignOfferId = keyof typeof campaignOffers;
export const googlePlayCampaignProductIds = {
  featured_monthly: "featured_monthly",
  banner_monthly: "banner_monthly",
} as const satisfies Record<CampaignOfferId, string>;
export const BANNER_CAPACITY_ERROR = "banner_capacity_reached";

export function openGooglePlayCampaignManagement(offerId: CampaignOfferId) {
  const productId = googlePlayCampaignProductIds[offerId];
  return Linking.openURL(
    `https://play.google.com/store/account/subscriptions?sku=${encodeURIComponent(productId)}&package=com.descubriendo.cr`,
  );
}

export class BannerCapacityError extends Error {
  readonly code = BANNER_CAPACITY_ERROR;
}
type LegacySubscriptionOfferId =
  | "legacy_no_ads"
  | "legacy_business"
  | "legacy_sponsored"
  | "travel_pass_national_monthly"
  | "travel_pass_national_annual"
  | "travel_pass_foreign_30d"
  | "business_pro"
  | "business_growth";

export type Subscription = {
  id: string;
  service_id: string | null;
  plan: SubscriptionPlan;
  provider?: string | null;
  offer_id: BillingOfferId | LegacySubscriptionOfferId;
  status: SubscriptionStatus;
  price_amount: number;
  price_currency: string;
  current_period_end: string | null;
  provider_status?: string | null;
};

export type AccessStatus = {
  hasAccess: boolean;
  hasPersonalPlan: boolean;
  trialDaysRemaining: number;
  trialEndsAt: string;
  showTrialWarning: boolean;
};

export function hasActivePersonalPlan(
  subscriptions: Subscription[],
  now = Date.now(),
) {
  return subscriptions.some(
    (item) =>
      item.plan === "no_ads" &&
      ["active", "past_due", "canceled"].includes(item.status) &&
      (!item.current_period_end ||
        new Date(item.current_period_end).getTime() > now),
  );
}

export function hasActiveBusinessPlan(
  subscriptions: Subscription[],
  serviceId?: string,
  now = Date.now(),
) {
  return subscriptions.some(
    (item) =>
      item.plan === "business" &&
      item.offer_id === "business_monthly" &&
      ["active", "past_due", "canceled"].includes(item.status) &&
      (!serviceId || item.service_id === serviceId) &&
      (!item.current_period_end ||
        new Date(item.current_period_end).getTime() > now),
  );
}

export function hasAvailableBusinessPlan(
  subscriptions: Subscription[],
  now = Date.now(),
) {
  return subscriptions.some(
    (item) =>
      item.plan === "business" &&
      item.offer_id === "business_monthly" &&
      item.service_id === null &&
      ["active", "past_due", "canceled"].includes(item.status) &&
      (!item.current_period_end ||
        new Date(item.current_period_end).getTime() > now),
  );
}

export async function getMySubscriptions(): Promise<Subscription[]> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id, service_id, plan, offer_id, status, provider, provider_status, price_amount, price_currency, current_period_end",
    )
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Subscription[];
}

export async function getMyAccessStatus(): Promise<AccessStatus> {
  const { data, error } = await supabase.rpc("get_my_app_access");
  if (error) throw error;
  if (!data) throw new Error("No se pudo verificar el acceso a la aplicación.");
  return data as AccessStatus;
}

export async function openSubscriptionCheckout({
  offerId,
  serviceId,
}: {
  offerId: BillingOfferId;
  serviceId?: string;
}) {
  if (Platform.OS !== "web")
    throw new Error(
      "Las suscripciones solo están disponibles en la versión web.",
    );
  const returnUrl = Linking.createURL("subscriptions");
  const localCheckoutUrl = process.env.EXPO_PUBLIC_BILLING_URL?.trim();
  let checkoutUrl: string | undefined;

  if (localCheckoutUrl) {
    const url = new URL(localCheckoutUrl);
    url.searchParams.set("offer", offerId);
    url.searchParams.set("return_url", returnUrl);
    if (serviceId) url.searchParams.set("service_id", serviceId);
    checkoutUrl = url.toString();
  } else {
    const { data, error } = await supabase.functions.invoke(
      "create-checkout-session",
      {
        body: { offerId, serviceId, returnUrl },
      },
    );
    if (error) throw error;
    checkoutUrl = data?.url;
  }

  if (!checkoutUrl) throw new Error("No se pudo crear una sesión de Checkout.");
  return WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);
}

export async function openSubscriptionManagement(subscription: Subscription) {
  if (subscription.provider === "google_play")
    return Linking.openURL(`https://play.google.com/store/account/subscriptions?sku=${encodeURIComponent(subscription.offer_id)}&package=com.descubriendo.cr`);
  const returnUrl = Linking.createURL("subscriptions");
  const { data, error } = await supabase.functions.invoke("create-customer-portal", { body: { returnUrl } });
  if (error || !data?.url) throw error ?? new Error("No se pudo abrir la administración de la suscripción.");
  return WebBrowser.openAuthSessionAsync(data.url, returnUrl);
}

export async function openCampaignCheckout({
  offerId,
  serviceId,
  targetUrl,
  imageUrl,
}: {
  offerId: CampaignOfferId;
  serviceId: string;
  targetUrl?: string;
  imageUrl?: string;
}) {
  const returnUrl = Linking.createURL("commerce");
  const { data, error } = await supabase.functions.invoke(
    "create-checkout-session",
    {
      body: { offerId, serviceId, targetUrl, imageUrl, returnUrl },
    },
  );
  if (error) {
    const context = (error as { context?: Response }).context;
    const payload = context
      ? ((await context
          .clone()
          .json()
          .catch(() => undefined)) as { error?: string } | undefined)
      : undefined;
    if (payload?.error === BANNER_CAPACITY_ERROR)
      throw new BannerCapacityError(BANNER_CAPACITY_ERROR);
    throw error;
  }
  if (!data?.url) throw new Error("No se pudo crear una sesión de Checkout.");
  return WebBrowser.openAuthSessionAsync(data.url, returnUrl);
}
