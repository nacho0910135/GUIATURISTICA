import { corsHeaders } from "npm:@supabase/supabase-js@2.112.4/cors";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const { latitude, longitude, language } = await request.json().catch(() => ({})) as {
    latitude?: number;
    longitude?: number;
    language?: "es" | "en";
  };
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude! < -90 || latitude! > 90 || longitude! < -180 || longitude! > 180 || !["es", "en"].includes(language ?? ""))
    return json({ error: "invalid_coordinates" }, 400);

  const apiKey = Deno.env.get("OPENWEATHER_API_KEY");
  if (!apiKey) return json({ error: "weather_not_configured" }, 503);

  const params = new URLSearchParams({ lat: String(latitude), lon: String(longitude), appid: apiKey, units: language === "es" ? "metric" : "imperial", lang: language! });
  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?${params}`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error("weather_provider_failed");
    const body = await response.json() as { main?: { temp?: number; humidity?: number }; weather?: { description?: string; icon?: string }[] };
    if (!Number.isFinite(body.main?.temp) || !Number.isFinite(body.main?.humidity)) throw new Error("weather_provider_invalid_response");
    return json({ temperature: Math.round(body.main!.temp!), temperatureUnit: language === "es" ? "C" : "F", humidity: Math.round(body.main!.humidity!), description: body.weather?.[0]?.description ?? "", icon: body.weather?.[0]?.icon ?? "01d" });
  } catch {
    const fallback = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), current: "temperature_2m,relative_humidity_2m,weather_code,is_day", temperature_unit: language === "es" ? "celsius" : "fahrenheit" });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${fallback}`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return json({ error: "weather_provider_failed" }, 502);
    const { current } = await response.json() as { current?: { temperature_2m?: number; relative_humidity_2m?: number; weather_code?: number; is_day?: number } };
    if (!Number.isFinite(current?.temperature_2m) || !Number.isFinite(current?.relative_humidity_2m)) return json({ error: "weather_provider_invalid_response" }, 502);
    const code = current!.weather_code ?? 0;
    const descriptions = language === "es" ? ["Despejado", "Parcialmente nublado", "Nublado", "Niebla", "Llovizna", "Lluvia", "Nieve", "Tormenta"] : ["Clear", "Partly cloudy", "Cloudy", "Fog", "Drizzle", "Rain", "Snow", "Thunderstorm"];
    const group = code === 0 ? 0 : code <= 2 ? 1 : code === 3 ? 2 : code <= 48 ? 3 : code <= 57 ? 4 : code <= 67 || (code >= 80 && code <= 82) ? 5 : code <= 77 || (code >= 85 && code <= 86) ? 6 : 7;
    const icons = ["01", "02", "04", "50", "09", "10", "13", "11"];
    return json({ temperature: Math.round(current!.temperature_2m!), temperatureUnit: language === "es" ? "C" : "F", humidity: Math.round(current!.relative_humidity_2m!), description: descriptions[group], icon: `${icons[group]}${current!.is_day === 0 ? "n" : "d"}` });
  }
});

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { ...corsHeaders, "Cache-Control": "public, max-age=600" } });
}
