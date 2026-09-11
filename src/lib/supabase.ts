import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const isWeb = Platform.OS === 'web';
const isWebServer = isWeb && typeof window === 'undefined';
const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  }),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
const storage = isWeb ? (() => {
  if (isWebServer) return undefined;
  try { return window.localStorage; } catch { return undefined; }
})() : secureStorage;

// Keep the catalogue shell usable when deployment configuration is missing.
export const supabase = createClient(SUPABASE_URL ?? 'https://offline.invalid', SUPABASE_ANON_KEY ?? 'offline-anon-key', {
  auth: {
    ...(storage ? { storage } : {}),
    autoRefreshToken: true,
    // Expo's web server has no window/localStorage. Persist once hydrated in
    // the browser, while keeping SSR safe so the first screen can render.
    persistSession: !isWebServer,
    detectSessionInUrl: isWeb,
    flowType: 'pkce',
    experimental: { appendPkceFlowIdToRedirects: true },
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
