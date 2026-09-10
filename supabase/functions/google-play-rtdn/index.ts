import { createClient } from "jsr:@supabase/supabase-js@2";
import { getGoogleSubscription, sha256 } from "../_shared/google-play.ts";

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
  const end = purchase.lineItems?.reduce<string | undefined>((latest, item) => !latest || (item.expiryTime ?? "") > latest ? item.expiryTime : latest, undefined);
  const providerId = `google_play:${await sha256(purchaseToken)}`;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const status = databaseStatus(purchase.subscriptionState, end);
  const now = new Date().toISOString();
  const { error } = await admin.from("subscriptions").update({ status, provider_status: purchase.subscriptionState, current_period_end: end ?? null, updated_at: now }).eq("provider_subscription_id", providerId);
  await admin.from("commerce_ad_campaigns").update({ status: status === "active" || status === "past_due" || status === "canceled" ? "active" : "expired", ends_at: end ?? now }).eq("provider_subscription_id", providerId);
  return new Response(error ? "update_failed" : "ok", { status: error ? 500 : 200 });
});

async function validGoogleIdentity(token: string, email: string, audience: string) {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
  if (!response.ok) return false;
  const payload = await response.json() as { aud?: string; email?: string; email_verified?: string; exp?: string };
  return payload.aud === audience && payload.email === email && payload.email_verified === "true" && Number(payload.exp) * 1000 > Date.now();
}

function databaseStatus(state: string, end?: string): "pending" | "active" | "past_due" | "canceled" | "expired" {
  if (end && new Date(end).getTime() <= Date.now()) return "expired";
  if (state === "SUBSCRIPTION_STATE_ACTIVE") return "active";
  if (state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD" || state === "SUBSCRIPTION_STATE_ON_HOLD" || state === "SUBSCRIPTION_STATE_PAUSED") return "past_due";
  if (state === "SUBSCRIPTION_STATE_CANCELED") return "canceled";
  if (state === "SUBSCRIPTION_STATE_PENDING") return "pending";
  return "expired";
}
