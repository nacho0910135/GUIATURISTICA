import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!supabaseUrl || !anonKey || !stripeKey) return json({ error: "billing_not_configured" }, 503);
  const authorization = request.headers.get("Authorization") ?? "";
  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);
  const { returnUrl } = await request.json().catch(() => ({})) as { returnUrl?: string };
  if (!returnUrl || !/^https?:\/\//.test(returnUrl)) return json({ error: "invalid_return_url" }, 400);
  const query = new URLSearchParams({ query: `metadata['user_id']:'${user.id}'`, limit: "1" });
  const subscriptions = await stripe(`/v1/subscriptions/search?${query}`, stripeKey);
  const customer = subscriptions.data?.[0]?.customer;
  if (!customer) return json({ error: "stripe_subscription_not_found" }, 404);
  const portal = await stripe("/v1/billing_portal/sessions", stripeKey, new URLSearchParams({ customer, return_url: returnUrl }));
  return portal.url ? json({ url: portal.url }) : json({ error: "portal_creation_failed" }, 502);
});

async function stripe(path: string, key: string, body?: URLSearchParams) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body,
  });
  return await response.json();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
