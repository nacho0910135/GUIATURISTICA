import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'node:readline/promises';

const ROUTES = [
  ['liberia-playa-tamarindo', 'Liberia – Playa Tamarindo'], ['tamarindo-santa-cruz', 'Tamarindo – Santa Cruz'], ['san-jose-nicoya-por-puente-la-amistad', 'San José – Nicoya'], ['san-ramon-fortuna-san-carlos', 'San Ramón – La Fortuna'], ['san-jose-playa-flamingo-por-el-puente-de-la-amistad', 'San José – Playa Flamingo – Playa Tamarindo'], ['san-jose-hojancha', 'San José – Hojancha'], ['san-jose-samara-por-puente', 'San José – Sámara'], ['san-jose-nosara-por-puente', 'San José – Nosara'], ['san-jose-santa-cruz-por-el-puente-de-la-amistad', 'San José – Santa Cruz'], ['san-jose-los-chiles', 'San José – Los Chiles'], ['san-jose-santa-cecilia', 'San José – Santa Cecilia'], ['san-jose-quepos', 'San José – Quepos'], ['jaco-puntarenas', 'Jacó – Puntarenas'], ['cobano-santa-teresa-mal-pais', 'Cóbano – Santa Teresa – Mal País'], ['santa-cruz-playa-potrero', 'Santa Cruz – Playa Potrero'], ['santa-cruz-playa-junquillal', 'Santa Cruz – Playa Juanquillal'], ['san-jose-david-panama', 'San José – David, Panamá'], ['san-jose-cahuita', 'San José – Cahuita'], ['puerto-viejo-sixaola', 'Puerto Viejo – Sixaola'], ['san-jose-puerto-viejo-limon', 'San José – Puerto Viejo, Limón'], ['san-jose-dominical-y-uvita', 'San José – Dominical – Uvita'], ['san-jose-tambor', 'San José – Tambor'],
];

const sourceBase = 'https://yoviajocr.com/bus/';
const to24Hour = (value) => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  if (hour === 12) hour = 0;
  if (match[3].toLowerCase() === 'pm') hour += 12;
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
};

const timesFrom = (text) => [...new Set(text.split(/\n+/).map(to24Hour).filter(Boolean))];

const interactive = process.argv.includes('--interactive');

async function waitForVerification(page) {
  if (!interactive) return false;
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  await prompt.question('Completá la verificación de Yo Viajo CR en Brave y presioná Enter para continuar: ');
  prompt.close();
  await page.waitForTimeout(1_000);
  return true;
}

async function extractRoute(page, sourceKey, routeName) {
  await page.goto(`${sourceBase}${sourceKey}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(3_000);
  const text = await page.locator('body').innerText();
  if (/verificaci[oó]n de navegador|just a moment|attention required/i.test(text) && await waitForVerification(page)) {
    return extractRoute(page, sourceKey, routeName);
  }
  if (/verificaci[oó]n de navegador|just a moment|attention required/i.test(text)) {
    throw new Error('Yo Viajo CR requiere verificación de navegador; no se intentó evadirla. Abrí la página y completá la verificación antes de reintentar.');
  }
  const fare = text.match(/Tarifa estimada\s*₡\s*([\d.,]+)/i);
  if (!fare) throw new Error('No se publicó una tarifa estimada');

  const schedules = {};
  for (const [key, label] of [['weekday', 'Semana'], ['saturday', 'Sábado'], ['sunday', 'Domingo']]) {
    const tab = page.getByRole('tab', { name: label });
    if (await tab.count() !== 1) throw new Error(`No se publicó el horario de ${label}`);
    await tab.click();
    const times = timesFrom(await page.getByRole('tabpanel', { name: label }).innerText());
    if (!times.length) throw new Error(`El horario de ${label} está vacío`);
    schedules[key] = times;
  }

  const [originCity, ...destination] = routeName.split(' – ');
  return {
    source_key: sourceKey,
    source_url: `${sourceBase}${sourceKey}`,
    route_name: routeName,
    origin_city: originCity,
    destination_city: destination.join(' – '),
    schedules,
    fare_crc: Number(fare[1].replace(/\./g, '').replace(',', '.')),
    fare_kind: 'estimated',
    terminal_name: null,
    terminal_waze_url: null,
    terminal_source_url: null,
    last_verified_at: new Date().toISOString(),
    is_published: true,
    quality_issues: [],
  };
}

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.');

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe', headless: false });
const page = await browser.newPage();
const complete = [];
const rejected = [];

try {
  for (const [key, name] of ROUTES) {
    try {
      complete.push(await extractRoute(page, key, name));
      console.log(`✓ ${name}`);
    } catch (error) {
      rejected.push({ key, reason: error.message });
      console.warn(`× ${name}: ${error.message}`);
    }
  }
} finally {
  await browser.close();
}

if (complete.length) {
  const { error } = await supabase.from('tourist_bus_routes').upsert(complete, { onConflict: 'source_key' });
  if (error) throw error;
}

console.log(JSON.stringify({ published: complete.length, rejected }, null, 2));
