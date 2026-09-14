const PACKAGE_NAME = "com.descubriendo.cr";
const SCOPE = "https://www.googleapis.com/auth/androidpublisher";

export type GoogleSubscription = {
  acknowledgementState?: string;
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string };
  latestOrderId?: string;
  linkedPurchaseToken?: string;
  lineItems?: Array<{ expiryTime?: string; productId?: string; autoRenewingPlan?: { recurringPrice?: { currencyCode?: string; nanos?: number; units?: string } } }>;
  subscriptionState?: string;
  testPurchase?: Record<string, never>;
};

type ServiceAccount = { client_email: string; private_key: string };

export async function getGoogleSubscription(purchaseToken: string) {
  const rawAccount = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!rawAccount) throw new Error("google_play_not_configured");
  const account = JSON.parse(rawAccount) as ServiceAccount;
  if (!account.client_email || !account.private_key) throw new Error("google_play_not_configured");
  const accessToken = await getAccessToken(account);
  const response = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(response.status === 404 ? "purchase_not_found" : "google_play_lookup_failed");
  return await response.json() as GoogleSubscription;
}

export async function acknowledgeGoogleSubscription(productId: string, purchaseToken: string) {
  const rawAccount = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!rawAccount) throw new Error("google_play_not_configured");
  const account = JSON.parse(rawAccount) as ServiceAccount;
  if (!account.client_email || !account.private_key) throw new Error("google_play_not_configured");
  const accessToken = await getAccessToken(account);
  const response = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok && response.status !== 409) throw new Error("google_play_acknowledge_failed");
}

async function getAccessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = base64Url(new TextEncoder().encode(JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })));
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey("pkcs8", pemBytes(account.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${base64Url(new Uint8Array(signature))}` }),
  });
  const payload = await response.json() as { access_token?: string };
  if (!response.ok || !payload.access_token) throw new Error("google_play_auth_failed");
  return payload.access_token;
}

function pemBytes(pem: string) {
  const raw = atob(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, ""));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
