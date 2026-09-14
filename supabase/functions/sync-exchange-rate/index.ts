import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
  const expectedSecret = Deno.env.get("SYNC_EXCHANGE_RATE_SECRET");
  const suppliedSecret = request.headers.get("x-cron-secret");
  if (!expectedSecret || suppliedSecret !== expectedSecret)
    return new Response("Unauthorized", { status: 401, headers: cors });

  try {
    const response = await fetch("https://api.hacienda.go.cr/indicadores/tc/dolar", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("La API de Hacienda no respondió.");
    const payload = await response.json();
    const rate_buy = Number(payload.compra?.valor);
    const rate_sell = Number(payload.venta?.valor);
    if (![rate_buy, rate_sell].every((rate) => Number.isFinite(rate) && rate > 0)) throw new Error("La API de Hacienda no devolvió los tipos de cambio.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await supabase.from("system_exchange_rates").insert({
      rate_buy, rate_sell, source: "Ministerio de Hacienda de Costa Rica", updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return Response.json({ ok: true, rate_buy, rate_sell }, { headers: cors });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Error desconocido" }, { status: 502, headers: cors });
  }
});
