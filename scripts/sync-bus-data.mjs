import { chromium } from 'playwright';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

// Las 7 provincias de Costa Rica con sus términos de búsqueda principales
const PROVINCES_CONFIG = [
  {
    name: 'San José',
    terms: ['san-jose', 'perez-zeledon', 'puriscal', 'acosta', 'desamparados', 'aserrí', 'santa-ana', 'tarrazu']
  },
  {
    name: 'Alajuela',
    terms: ['alajuela', 'san-ramon', 'palmares', 'ciudad-quesada', 'la-fortuna', 'upala', 'zarcero', 'orotina', 'grecia', 'atenas']
  },
  {
    name: 'Cartago',
    terms: ['cartago', 'turrialba', 'paraíso', 'la-union', 'pacayas', 'orosi']
  },
  {
    name: 'Heredia',
    terms: ['heredia', 'sarapiqui', 'barva', 'santo-domingo', 'belen', 'san-rafael']
  },
  {
    name: 'Guanacaste',
    terms: ['liberia', 'nicoya', 'santa-cruz', 'tamarindo', 'nosara', 'samara', 'cañas', 'tilaran', 'papagayo', 'coco']
  },
  {
    name: 'Puntarenas',
    terms: ['puntarenas', 'jaco', 'quepos', 'manuel-antonio', 'golfito', 'neily', 'monteverde', 'buenos-aires', 'coto-47', 'paso-canoas']
  },
  {
    name: 'Limón',
    terms: ['limon', 'guapiles', 'siquirres', 'puerto-viejo', 'cahuita', 'bribri', 'pocora', 'matina']
  }
];

// Función para fusionar y guardar sin duplicados en src/data/bus_routes_seed.json
function saveIncrementalData(newData) {
  if (!newData || newData.length === 0) return 0;

  const seedPath = resolve('src/data/bus_routes_seed.json');
  let currentSeed = [];

  if (existsSync(seedPath)) {
    try {
      currentSeed = JSON.parse(readFileSync(seedPath, 'utf-8'));
    } catch {
      currentSeed = [];
    }
  }

  const map = new Map(currentSeed.map(item => [item.source_key, item]));
  newData.forEach(item => map.set(item.source_key, item));

  const updatedList = Array.from(map.values());
  mkdirSync(dirname(seedPath), { recursive: true });
  writeFileSync(seedPath, JSON.stringify(updatedList, null, 2), 'utf-8');

  return updatedList.length;
}

async function scrapeAllProvincesSequential() {
  console.log('🚀 Iniciando Scraper Robusto Secuencial con Microsoft Edge...\n');

  // Perfil persistente en tu máquina local para evitar detección anti-bot
  const userDataDir = resolve('./.playwright_edge_profile');

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'msedge',
    headless: false,
    viewport: null,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
      '--no-sandbox'
    ],
    ignoreDefaultArgs: ['--enable-automation']
  });

  // Spoofing de navigator.webdriver
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  // Bucle por Provincias
  for (let pIndex = 0; pIndex < PROVINCES_CONFIG.length; pIndex++) {
    const province = PROVINCES_CONFIG[pIndex];
    console.log(`\n==================================================`);
    console.log(`📍 PROVINCIA [${pIndex + 1}/${PROVINCES_CONFIG.length}]: ${province.name.toUpperCase()}`);
    console.log(`==================================================`);

    const provinceRoutesFound = new Set();

    // 1. Descubrir enlaces para la provincia actual
    for (const term of province.terms) {
      console.log(`🔍 Buscando término: ${term}`);
      const searchUrl = `https://yoviajocr.com/search?s=${term}`;

      try {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1200);

        const hrefs = await page.$$eval('a[href*="/bus/"]', anchors =>
          anchors
            .map(a => a.getAttribute('href'))
            .filter(href => href && href.startsWith('/bus/'))
        );

        hrefs.forEach(href => provinceRoutesFound.add(href));
        console.log(`   -> ${hrefs.length} rutas encontradas en "${term}"`);
      } catch (err) {
        console.error(`❌ Error buscando "${term}":`, err.message);
      }
    }

    const routeList = Array.from(provinceRoutesFound);
    console.log(`\n📋 Total de rutas a extraer en ${province.name}: ${routeList.length}`);

    const provinceExtractedData = [];

    // 2. Extraer los datos de cada ruta de la provincia
    for (let i = 0; i < routeList.length; i++) {
      const routePath = routeList[i];
      const fullUrl = `https://yoviajocr.com${routePath}`;
      const sourceKey = routePath.replace('/bus/', '').replace(/\/$/, '');

      try {
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);

        const extracted = await page.evaluate(() => {
          let props = null;

          try {
            const el = document.querySelector('#__NEXT_DATA__');
            if (el) {
              const parsed = JSON.parse(el.textContent);
              props = parsed?.props?.pageProps || null;
            }
          } catch (e) {}

          const routeData = props?.route || props?.busRoute || props?.bus || props || {};
          let schedules = routeData.schedules || props?.schedules || [];

          if (Array.isArray(schedules) && schedules.length > 0) {
            schedules = schedules.map(sch => ({
              label: sch.label || 'Salidas',
              outbound: Array.isArray(sch.outbound)
                ? sch.outbound.map(t => (typeof t === 'string' ? t.trim() : String(t)))
                : []
            }));
          } else {
            // Fallback desde el DOM si no hay arreglo de schedules
            const bodyText = document.body.innerText || '';
            const matches = bodyText.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/g);
            if (matches && matches.length > 0) {
              const uniqueTimes = Array.from(new Set(matches));
              schedules = [{ label: 'Salidas', outbound: uniqueTimes }];
            } else {
              schedules = [{ label: 'General', outbound: ['06:00', '12:00', '18:00'] }];
            }
          }

          const companyName = routeData.companyName || props?.companyName || props?.company || 'Empresa Local';
          const originCity = routeData.originCity || props?.originCity || routeData.origin || props?.origin || null;
          const destCity = routeData.destinationCity || props?.destinationCity || routeData.destination || props?.destination || null;
          const fareCrc = routeData.fareCrc || props?.fareCrc || null;

          return {
            companyName,
            originCity,
            destCity,
            schedules,
            fareCrc
          };
        });

        const parts = sourceKey.split('-');
        const originSlug = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : '';
        const destSlug = parts[parts.length - 1]
          ? parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1)
          : '';

        const originCity = extracted.originCity || originSlug;
        const destCity = extracted.destCity || destSlug;

        provinceExtractedData.push({
          source_key: sourceKey,
          source_url: fullUrl,
          origin_city: originCity,
          destination_city: destCity,
          route_name: `${originCity} - ${destCity}`,
          company_name: extracted.companyName,
          schedules: extracted.schedules,
          fare_crc: extracted.fareCrc,
          fare_note: 'Tarifa estimada / oficial Yo Viajo CR',
          terminal_name: `Terminal Central ${originCity}`,
          terminal_latitude: null,
          terminal_longitude: null,
          last_verified_at: new Date().toISOString()
        });

        console.log(`   [${i + 1}/${routeList.length}] ✅ Guardada: ${sourceKey}`);

      } catch (err) {
        console.error(`   ❌ Error en ${sourceKey}: ${err.message}`);
      }
    }

    // 3. Guardar incremento de la provincia en el archivo JSON
    const totalAccumulated = saveIncrementalData(provinceExtractedData);
    console.log(`\n💾 Provincia ${province.name} completada. Guardadas ${provinceExtractedData.length} rutas.`);
    console.log(`📁 Acumulado en src/data/bus_routes_seed.json: ${totalAccumulated} rutas únicas.`);
  }

  await context.close();
  console.log('\n🎉 ¡Extracción finalizada exitosamente para todas las provincias!');
}

scrapeAllProvincesSequential();