import { ReactNativeFirebaseAppCheckProvider, getToken, initializeAppCheck } from '@react-native-firebase/app-check';
import { fetchAndActivate, getRemoteConfig, getValue } from '@react-native-firebase/remote-config';

import { supabase } from '@/lib/supabase';

const defaults = { ai_destination_assistant_enabled: true, ai_destination_model: 'gemini-3.5-flash-lite', ai_destination_max_output_tokens: 350 };
let appCheck: ReturnType<typeof initializeAppCheck> | undefined;
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
  if (appCheck) return appCheck;
  const provider = new ReactNativeFirebaseAppCheckProvider();
    provider.configure({
      android: { provider: __DEV__ ? 'debug' : 'playIntegrity', debugToken: process.env.EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN },
      apple: { provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback', debugToken: process.env.EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN },
    });
  appCheck = initializeAppCheck(undefined, { provider, isTokenAutoRefreshEnabled: true });
  return appCheck;
}

export async function askDestinationAI(context: string, question: string, language: 'es' | 'en') {
  const appCheckToken = await getToken(initializeFirebaseAppCheck(), false);
  if (!appCheckToken.token) throw new Error(language === 'es' ? 'No se pudo verificar esta aplicación.' : 'This app could not be verified.');
  const config = await getDestinationAIConfig();
  if (!config.ai_destination_assistant_enabled) throw new Error(language === 'es' ? 'El asistente está temporalmente desactivado.' : 'The assistant is temporarily disabled.');
  const { data, error } = await supabase.functions.invoke('destination-ai', {
    body: { context, question, language },
    headers: { 'X-Firebase-AppCheck': appCheckToken.token },
  });
  if (error) throw error;
  if (!data?.answer) throw new Error(language === 'es' ? 'El asistente no respondió.' : 'The assistant did not respond.');
  return String(data.answer).trim();
}
