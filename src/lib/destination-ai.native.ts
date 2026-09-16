import { GoogleAIBackend, getAI, getGenerativeModel } from '@react-native-firebase/ai';
import { ReactNativeFirebaseAppCheckProvider, initializeAppCheck } from '@react-native-firebase/app-check';
import { fetchAndActivate, getRemoteConfig, getValue } from '@react-native-firebase/remote-config';

const defaults = { ai_destination_assistant_enabled: true, ai_destination_model: 'gemini-3.5-flash-lite', ai_destination_max_output_tokens: 350 };
let appCheckReady = false;
let configPromise: Promise<typeof defaults> | undefined;

export async function getDestinationAIConfig() {
  return configPromise ??= (async () => {
    const config = getRemoteConfig();
    config.settings = { minimumFetchIntervalMillis: __DEV__ ? 0 : 3_600_000, fetchTimeoutMillis: 10_000 };
    config.defaultConfig = defaults;
    await fetchAndActivate(config).catch(() => false);
    return {
      ai_destination_assistant_enabled: getValue(config, 'ai_destination_assistant_enabled').asBoolean(),
      ai_destination_model: getValue(config, 'ai_destination_model').asString() || defaults.ai_destination_model,
      ai_destination_max_output_tokens: Math.max(100, Math.min(700, getValue(config, 'ai_destination_max_output_tokens').asNumber() || defaults.ai_destination_max_output_tokens)),
    };
  })();
}

export function initializeFirebaseAppCheck() {
  if (appCheckReady) return;
  try {
    const provider = new ReactNativeFirebaseAppCheckProvider();
    provider.configure({
      android: { provider: __DEV__ ? 'debug' : 'playIntegrity', debugToken: process.env.EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN },
      apple: { provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback', debugToken: process.env.EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN },
    });
    initializeAppCheck(undefined, { provider, isTokenAutoRefreshEnabled: true });
    appCheckReady = true;
  } catch (error) {
    console.warn('App Check no pudo inicializarse.', error);
  }
}

export async function askDestinationAI(context: string, question: string, language: 'es' | 'en') {
  initializeFirebaseAppCheck();
  const config = await getDestinationAIConfig();
  if (!config.ai_destination_assistant_enabled) throw new Error(language === 'es' ? 'El asistente está temporalmente desactivado.' : 'The assistant is temporarily disabled.');
  const model = getGenerativeModel(getAI(undefined, { backend: new GoogleAIBackend() }), {
    model: config.ai_destination_model,
    generationConfig: { maxOutputTokens: config.ai_destination_max_output_tokens, temperature: 0.35 },
    systemInstruction: language === 'es'
      ? 'Sos un asistente turístico de Costa Rica. Respondé en español claro y cálido usando únicamente los datos suministrados. No inventés horarios, precios, seguridad, accesibilidad ni rutas. Si el dato no está, decilo. No sustituyás fuentes oficiales.'
      : 'You are a Costa Rica travel assistant. Reply in clear, warm English using only the supplied facts. Never invent schedules, prices, safety, accessibility, or routes. Say when data is unavailable. Do not replace official sources.',
  });
  const result = await model.generateContent(`DATOS VERIFICADOS:\n${context}\n\nCONSULTA:\n${question}`);
  return result.response.text().trim();
}
