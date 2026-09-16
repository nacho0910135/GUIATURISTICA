import { createClient } from "jsr:@supabase/supabase-js@2";
import { acknowledgeGoogleSubscription } from "../_shared/google-play.ts";

const PACKAGE_NAME = "com.descubriendo.cr";
const ANDROID_PUBLISHER_SCOPE =
  "https://www.googleapis.com/auth/androidpublisher";
const offers = {
  universal_monthly: {
    kind: "plan",
    plan: "no_ads",
    business: false,
    fallbackAmount: 2,
  },
  universal_annual: {
    kind: "plan",
    plan: "no_ads",
    business: false,
    fallbackAmount: 20,
  },
  visitor_pass_30d: {
    kind: "plan",
    plan: "no_ads",
    business: false,
    fallbackAmount: 5,
  },
  business_monthly: {
    kind: "plan",
    plan: "business",
    business: true,
    fallbackAmount: 9.99,
  },
  featured_monthly: {
    kind: "campaign",
    campaignType: "featured",
    fallbackAmount: 5,
  },
  banner_monthly: {
    kind: "campaign",
    campaignType: "banner",
    fallbackAmount: 50,
  },
} as const;
const entitledStates = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
  "SUBSCRIPTION_STATE_CANCELED",
]);
const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ServiceAccount = { client_email: string; private_key: string };
type GoogleSubscription = {
  acknowledgementState?: string;
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string };
  latestOrderId?: string;
  linkedPurchaseToken?: string;
  lineItems?: Array<{
    expiryTime?: string;
    productId?: string;
    autoRenewingPlan?: {
      recurringPrice?: {
        currencyCode?: string;
        nanos?: number;
        units?: string;
      };
    };
  }>;
  subscriptionState?: string;
  testPurchase?: Record<string, never>;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const serviceAccountJson = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!supabaseUrl || !anonKey || !serviceKey || !serviceAccountJson)
    return json({ error: "google_play_not_configured" }, 503);

  const authorization = request.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "unauthorized" }, 401);
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const body = await request.json().catch(() => ({}));
  const productId = typeof body.productId === "string" ? body.productId : "";
  const purchaseToken =
    typeof body.purchaseToken === "string" ? body.purchaseToken : "";
  let serviceId =
    typeof body.serviceId === "string" ? body.serviceId : undefined;
  let targetUrl =
    typeof body.targetUrl === "string" ? body.targetUrl.trim() : undefined;
  let imageUrl =
    typeof body.imageUrl === "string" ? body.imageUrl.trim() : undefined;
  const offer = offers[productId as keyof typeof offers];
  if (!offer || !purchaseToken || purchaseToken.length > 4096)
    return json({ error: "invalid_purchase" }, 400);
  let purchaseIntentId: string | undefined;
  const { data: intent } = await admin.from("google_play_purchase_intents")
    .select("id,service_id,target_url,image_url")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .is("consumed_at", null)
    .maybeSingle();
  purchaseIntentId = intent?.id;
  serviceId ??= intent?.service_id ?? undefined;
  targetUrl ??= intent?.target_url ?? undefined;
  imageUrl ??= intent?.image_url ?? undefined;
  if (offer.kind === "plan" ? !offer.business && Boolean(serviceId) : !serviceId)
    return json({ error: "invalid_business_selection" }, 400);
  if (
    offer.kind === "campaign" &&
    offer.campaignType === "banner" &&
    (!isSafeTargetUrl(targetUrl) ||
      !isOwnedBannerUrl(imageUrl, supabaseUrl, user.id, serviceId))
  ) {
    return json({ error: "invalid_banner_creative" }, 400);
  }

  if (serviceId) {
    const { data: business } = await userClient
      .from("commercial_services")
      .select("id,subscription_required")
      .eq("id", serviceId)
      .eq("owner_id", user.id)
      .eq("moderation_status", "approved")
      .maybeSingle();
    if (!business) return json({ error: "business_not_owned" }, 403);
    if (offer.kind === "plan" && !business.subscription_required)
      return json({ error: "business_not_subscription_governed" }, 409);
  }

  let serviceAccount: ServiceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;
    if (!serviceAccount.client_email || !serviceAccount.private_key)
      throw new Error("invalid service account");
  } catch {
    return json({ error: "google_play_not_configured" }, 503);
  }

  const accessToken = await getGoogleAccessToken(serviceAccount).catch(
    () => undefined,
  );
  if (!accessToken) return json({ error: "google_play_auth_failed" }, 502);
  const lookup = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!lookup.ok)
    return json(
      {
        error:
          lookup.status === 404
            ? "purchase_not_found"
            : "google_play_lookup_failed",
      },
      502,
    );
  const purchase = (await lookup.json()) as GoogleSubscription;
  const lineItem = purchase.lineItems?.find(
    (item) => item.productId === productId,
  );
  const expiresAt = lineItem?.expiryTime;
  const providerId = `google_play:${await sha256(purchaseToken)}`;
  if (!purchase.subscriptionState) return json({ error: "purchase_state_missing" }, 502);
  const expectedAccountId = await sha256(user.id);
  if (
    purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId !==
    expectedAccountId
  )
    return json({ error: "purchase_account_mismatch" }, 403);
  if (!lineItem || !expiresAt || new Date(expiresAt).getTime() <= Date.now() || !entitledStates.has(purchase.subscriptionState)) {
    const { error: stateError } = await admin.from("subscriptions").update({
      status: googleDatabaseStatus(purchase.subscriptionState),
      provider_status: purchase.subscriptionState,
      current_period_end: expiresAt ?? null,
      updated_at: new Date().toISOString(),
    }).eq("provider_subscription_id", providerId);
    const { error: campaignStateError } = await admin.from("commerce_ad_campaigns")
      .update({ status: "expired", ends_at: expiresAt ?? new Date().toISOString() })
      .eq("provider_subscription_id", providerId);
    if (stateError || campaignStateError) return json({ error: "purchase_state_write_failed" }, 500);
    return json({ error: googleStateError(purchase.subscriptionState), providerStatus: purchase.subscriptionState }, 409);
  }

  const money = lineItem.autoRenewingPlan?.recurringPrice;
  const priceAmount = money
    ? Number(money.units ?? 0) + Number(money.nanos ?? 0) / 1_000_000_000
    : offer.fallbackAmount;
  const priceCurrency = money?.currencyCode?.toUpperCase() || "USD";
  if (offer.kind === "campaign") {
    if (!money?.currencyCode) return json({ error: "purchase_price_missing" }, 502);
    const campaign =
        {
          service_id: serviceId!,
          user_id: user.id,
          campaign_type: offer.campaignType,
          target_url: offer.campaignType === "banner" ? targetUrl : null,
          image_url: offer.campaignType === "banner" ? imageUrl : null,
          status: "active",
          amount_usd: null,
          price_amount: priceAmount,
          price_currency: priceCurrency,
          provider_session_id: null,
          provider_subscription_id: providerId,
          ends_at: expiresAt,
        };
    const { error: campaignError } = offer.campaignType === "banner"
      ? await admin.rpc("upsert_google_play_banner_campaign", {
          p_service_id: campaign.service_id,
          p_user_id: campaign.user_id,
          p_target_url: campaign.target_url,
          p_image_url: campaign.image_url,
          p_price_amount: campaign.price_amount,
          p_price_currency: campaign.price_currency,
          p_provider_subscription_id: campaign.provider_subscription_id,
          p_ends_at: campaign.ends_at,
        })
      : await admin.from("commerce_ad_campaigns").upsert(campaign, { onConflict: "provider_subscription_id" });
    if (campaignError)
      return json({ error: campaignError.message.includes("banner_capacity_reached") ? "banner_capacity_reached" : "campaign_write_failed" }, campaignError.message.includes("banner_capacity_reached") ? 409 : 500);
    try {
      if (purchase.acknowledgementState !== "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED")
        await acknowledgeGoogleSubscription(productId, purchaseToken);
    } catch {
      return json({ error: "google_play_acknowledge_failed" }, 502);
    }
    if (purchaseIntentId)
      await admin.from("google_play_purchase_intents").update({ consumed_at: new Date().toISOString() }).eq("id", purchaseIntentId);
    return json({
      verified: true,
      expiresAt,
      testPurchase: Boolean(purchase.testPurchase),
      orderId: purchase.latestOrderId ?? null,
    });
  }
  const subscription = {
    user_id: user.id,
    service_id: serviceId ?? null,
    plan: offer.plan,
    offer_id: productId,
    status: googleDatabaseStatus(purchase.subscriptionState),
    price_amount: priceAmount,
    price_currency: priceCurrency,
    provider: "google_play",
    provider_status: purchase.subscriptionState,
    provider_subscription_id: providerId,
    current_period_end: expiresAt,
    updated_at: new Date().toISOString(),
  };
  if (purchase.linkedPurchaseToken) {
    await admin.from("subscriptions").update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("provider_subscription_id", `google_play:${await sha256(purchase.linkedPurchaseToken)}`)
      .neq("provider_subscription_id", providerId);
  }
  const { data: providerExisting, error: providerLookupError } = await admin
    .from("subscriptions")
    .select("id,user_id,service_id")
    .eq("provider_subscription_id", providerId)
    .maybeSingle();
  if (providerLookupError) return json({ error: "subscription_lookup_failed" }, 500);
  if (providerExisting?.user_id !== undefined && providerExisting.user_id !== user.id)
    return json({ error: "purchase_account_mismatch" }, 403);
  if (providerExisting?.service_id && serviceId && providerExisting.service_id !== serviceId)
    return json({ error: "subscription_service_mismatch" }, 409);
  if (providerExisting) subscription.service_id = providerExisting.service_id ?? serviceId ?? null;
  let existingQuery = admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("offer_id", productId)
    .eq("provider", "google_play");
  existingQuery = serviceId
    ? existingQuery.eq("service_id", serviceId)
    : existingQuery.is("service_id", null);
  const { data: fallbackExisting, error: existingError } = providerExisting
    ? { data: null, error: null }
    : await existingQuery.maybeSingle();
  if (existingError) return json({ error: "subscription_lookup_failed" }, 500);
  const existing = providerExisting ?? fallbackExisting;
  const { error: writeError } = existing
    ? await admin
        .from("subscriptions")
        .update(subscription)
        .eq("id", existing.id)
    : await admin.from("subscriptions").insert(subscription);
  if (writeError) return json({ error: "subscription_write_failed" }, 500);

  try {
    if (purchase.acknowledgementState !== "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED")
      await acknowledgeGoogleSubscription(productId, purchaseToken);
  } catch {
    return json({ error: "google_play_acknowledge_failed" }, 502);
  }
  if (purchaseIntentId)
    await admin.from("google_play_purchase_intents").update({ consumed_at: new Date().toISOString() }).eq("id", purchaseIntentId);

  return json({
    verified: true,
    expiresAt,
    testPurchase: Boolean(purchase.testPurchase),
    orderId: purchase.latestOrderId ?? null,
  });
});

function isSafeTargetUrl(value?: string) {
  if (!value || value.length > 500) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function googleDatabaseStatus(state: string): "pending" | "active" | "past_due" | "canceled" | "expired" {
  if (state === "SUBSCRIPTION_STATE_ACTIVE") return "active";
  if (state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD") return "past_due";
  if (state === "SUBSCRIPTION_STATE_CANCELED") return "canceled";
  if (state === "SUBSCRIPTION_STATE_PENDING") return "pending";
  return "expired";
}

function googleStateError(state: string) {
  if (state === "SUBSCRIPTION_STATE_PENDING") return "purchase_pending";
  if (state === "SUBSCRIPTION_STATE_ON_HOLD") return "purchase_on_hold";
  if (state === "SUBSCRIPTION_STATE_PAUSED") return "purchase_paused";
  if (state === "SUBSCRIPTION_STATE_EXPIRED") return "purchase_expired";
  return "purchase_not_entitled";
}

function isOwnedBannerUrl(
  value: string | undefined,
  supabaseUrl: string,
  userId: string,
  serviceId?: string,
) {
  if (!value || !serviceId || value.length > 500) return false;
  try {
    const url = new URL(value);
    const expected = new URL(
      `/storage/v1/object/public/campaign-banners/${userId}/${serviceId}/`,
      supabaseUrl,
    );
    return (
      url.protocol === "https:" &&
      url.origin === expected.origin &&
      url.pathname.startsWith(expected.pathname)
    );
  } catch {
    return false;
  }
}

async function getGoogleAccessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(
    new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })),
  );
  const claims = base64Url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: account.client_email,
        scope: ANDROID_PUBLISHER_SCOPE,
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBytes(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64Url(new Uint8Array(signature))}`,
    }),
  });
  if (!response.ok) throw new Error("google oauth failed");
  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) throw new Error("missing access token");
  return payload.access_token;
}

function pemBytes(pem: string) {
  const raw = atob(
    pem.replace(
      /-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,
      "",
    ),
  );
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
