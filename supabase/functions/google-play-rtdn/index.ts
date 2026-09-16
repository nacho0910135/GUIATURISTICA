import { createClient } from "jsr:@supabase/supabase-js@2";
import { acknowledgeGoogleSubscription, getGoogleSubscription, sha256 } from "../_shared/google-play.ts";

const products = {
  universal_monthly: { kind: "plan", plan: "no_ads", amount: 2 },
  universal_annual: { kind: "plan", plan: "no_ads", amount: 20 },
  visitor_pass_30d: { kind: "plan", plan: "no_ads", amount: 5 },
  business_monthly: { kind: "plan", plan: "business", amount: 9.99 },
  featured_monthly: { kind: "campaign", campaignType: "featured", amount: 5 },
  banner_monthly: { kind: "campaign", campaignType: "banner", amount: 50 },
} as const;
const identityCache = new Map<string, number>();

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("method_not_allowed", { status: 405 });
  const expectedEmail = Deno.env.get("GOOGLE_PLAY_PUBSUB_SERVICE_ACCOUNT");
  const audience = Deno.env.get("GOOGLE_PLAY_PUBSUB_AUDIENCE");
  const bearer = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!expectedEmail || !audience || !bearer || !(await validGoogleIdentity(bearer, expectedEmail, audience)))
    return new Response("unauthorized", { status: 401 });

  const body = await request.json().catch(() => ({})) as { message?: { data?: string } };
  let notification: { packageName?: string; subscriptionNotification?: { purchaseToken?: string } };
  try { notification = JSON.parse(atob(body.message?.data ?? "")); } catch { return new Response("invalid_notification", { status: 400 }); }
  const purchaseToken = notification.subscriptionNotification?.purchaseToken;
  if (notification.packageName !== "com.descubriendo.cr" || !purchaseToken) return new Response("ignored", { status: 200 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return new Response("not_configured", { status: 503 });
  const purchase = await getGoogleSubscription(purchaseToken).catch(() => undefined);
  if (!purchase?.subscriptionState) return new Response("lookup_failed", { status: 502 });
  const lineItem = purchase.lineItems?.find((item) => item.productId && item.productId in products);
  const productId = lineItem?.productId as keyof typeof products | undefined;
  const end = lineItem?.expiryTime;
  if (!productId) return new Response("unknown_product", { status: 400 });
  const providerId = `google_play:${await sha256(purchaseToken)}`;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const status = databaseStatus(purchase.subscriptionState, end);
  const now = new Date().toISOString();
  const { data: subscriptions, error: subscriptionError } = await admin.from("subscriptions").update({ status, provider_status: purchase.subscriptionState, current_period_end: end ?? null, updated_at: now }).eq("provider_subscription_id", providerId).select("id");
  const { data: existingCampaign, error: campaignLookupError } = await admin.from("commerce_ad_campaigns")
    .select("id,service_id,user_id,campaign_type,target_url,image_url,price_amount,price_currency")
    .eq("provider_subscription_id", providerId).maybeSingle();
  let campaignError = campaignLookupError;
  if (existingCampaign) {
    if (existingCampaign.campaign_type === "banner" && isEntitled(purchase.subscriptionState, end) && end) {
      const result = await admin.rpc("upsert_google_play_banner_campaign", {
        p_service_id: existingCampaign.service_id,
        p_user_id: existingCampaign.user_id,
        p_target_url: existingCampaign.target_url,
        p_image_url: existingCampaign.image_url,
        p_price_amount: existingCampaign.price_amount,
        p_price_currency: existingCampaign.price_currency,
        p_provider_subscription_id: providerId,
        p_ends_at: end,
      });
      campaignError = result.error;
    } else {
      const result = await admin.from("commerce_ad_campaigns").update({ status: isEntitled(purchase.subscriptionState, end) ? "active" : "expired", ends_at: end ?? now }).eq("id", existingCampaign.id);
      campaignError = result.error;
    }
  }
  const campaigns = existingCampaign ? [existingCampaign] : [];
  if (subscriptionError || campaignError) return new Response("update_failed", { status: 500 });
  if (!(subscriptions?.length || campaigns?.length)) {
    const accountId = purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId;
    const { data: intent } = accountId ? await admin.from("google_play_purchase_intents")
      .select("id,user_id,service_id,target_url,image_url")
      .eq("external_account_id", accountId)
      .eq("product_id", productId)
      .is("consumed_at", null)
      .maybeSingle() : { data: null };
    if (!intent || !isEntitled(purchase.subscriptionState, end) || !end)
      return new Response("reconciliation_pending", { status: 503 });
    const product = products[productId];
    const money = lineItem.autoRenewingPlan?.recurringPrice;
    const priceAmount = money ? Number(money.units ?? 0) + Number(money.nanos ?? 0) / 1_000_000_000 : product.amount;
    const priceCurrency = money?.currencyCode?.toUpperCase() || "USD";
    if (product.kind === "campaign" && !money?.currencyCode) return new Response("purchase_price_missing", { status: 502 });
    if (intent.service_id) {
      const { data: service } = await admin.from("commercial_services")
        .select("id,subscription_required")
        .eq("id", intent.service_id)
        .eq("owner_id", intent.user_id)
        .eq("moderation_status", "approved")
        .maybeSingle();
      if (!service || (product.kind === "plan" && product.plan === "business" && !service.subscription_required))
        return new Response("business_not_eligible", { status: 409 });
    }
    if (product.kind === "campaign") {
      if (!intent.service_id || (product.campaignType === "banner" && !isSafeBanner(intent.target_url, intent.image_url, supabaseUrl, intent.user_id, intent.service_id)))
        return new Response("invalid_campaign_intent", { status: 409 });
      const campaign = {
        service_id: intent.service_id,
        user_id: intent.user_id,
        campaign_type: product.campaignType,
        target_url: product.campaignType === "banner" ? intent.target_url : null,
        image_url: product.campaignType === "banner" ? intent.image_url : null,
        status: "active",
        amount_usd: null,
        price_amount: priceAmount,
        price_currency: priceCurrency,
        provider_session_id: null,
        provider_subscription_id: providerId,
        ends_at: end,
      };
      const { error } = product.campaignType === "banner"
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
      if (error) return new Response(error.message.includes("banner_capacity_reached") ? "banner_capacity_reached" : "reconciliation_failed", { status: error.message.includes("banner_capacity_reached") ? 409 : 500 });
    } else {
      const { error } = await admin.from("subscriptions").upsert({
        user_id: intent.user_id,
        service_id: intent.service_id,
        plan: product.plan,
        offer_id: productId,
        status,
        price_amount: priceAmount,
        price_currency: priceCurrency,
        provider: "google_play",
        provider_status: purchase.subscriptionState,
        provider_subscription_id: providerId,
        current_period_end: end,
        updated_at: now,
      }, { onConflict: "provider_subscription_id" });
      if (error) return new Response("reconciliation_failed", { status: 500 });
    }
    await admin.from("google_play_purchase_intents").update({ consumed_at: now }).eq("id", intent.id);
  }
  if (isEntitled(purchase.subscriptionState, end) && purchase.acknowledgementState !== "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED") {
    try { await acknowledgeGoogleSubscription(productId, purchaseToken); }
    catch { return new Response("acknowledge_failed", { status: 502 }); }
  }
  return new Response("ok", { status: 200 });
});

async function validGoogleIdentity(token: string, email: string, audience: string) {
  const cacheKey = `${email}\u0000${audience}\u0000${token}`;
  const cachedExpiry = identityCache.get(cacheKey);
  if (cachedExpiry && cachedExpiry > Date.now()) return true;
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
  if (!response.ok) return false;
  const payload = await response.json() as { aud?: string; email?: string; email_verified?: string; exp?: string };
  const expiry = Number(payload.exp) * 1000;
  const valid = payload.aud === audience && payload.email === email && payload.email_verified === "true" && expiry > Date.now();
  if (valid) {
    for (const [key, value] of identityCache) if (value <= Date.now()) identityCache.delete(key);
    if (identityCache.size >= 16) identityCache.delete(identityCache.keys().next().value!);
    identityCache.set(cacheKey, expiry);
  }
  return valid;
}

function databaseStatus(state: string, end?: string): "pending" | "active" | "past_due" | "canceled" | "expired" {
  if (end && new Date(end).getTime() <= Date.now()) return "expired";
  if (state === "SUBSCRIPTION_STATE_ACTIVE") return "active";
  if (state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD") return "past_due";
  if (state === "SUBSCRIPTION_STATE_CANCELED") return "canceled";
  if (state === "SUBSCRIPTION_STATE_PENDING") return "pending";
  return "expired";
}

function isEntitled(state: string, end?: string) {
  return Boolean(end && new Date(end).getTime() > Date.now() && ["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD", "SUBSCRIPTION_STATE_CANCELED"].includes(state));
}

function isSafeBanner(targetUrl: string | null, imageUrl: string | null, supabaseUrl: string, userId: string, serviceId: string) {
  try {
    const target = new URL(targetUrl ?? "");
    const image = new URL(imageUrl ?? "");
    const expected = new URL(`/storage/v1/object/public/campaign-banners/${userId}/${serviceId}/`, supabaseUrl);
    return targetUrl!.length <= 500 && ["http:", "https:"].includes(target.protocol) && imageUrl!.length <= 500 && image.protocol === "https:" && image.origin === expected.origin && image.pathname.startsWith(expected.pathname);
  } catch {
    return false;
  }
}
