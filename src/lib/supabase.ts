import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

const isWeb = Platform.OS === 'web';
const isWebServer = isWeb && typeof window === 'undefined';
const storage = isWeb ? (isWebServer ? undefined : window.localStorage) : AsyncStorage;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    ...(storage ? { storage } : {}),
    autoRefreshToken: true,
    // Expo's web server has no window/localStorage. Persist once hydrated in
    // the browser, while keeping SSR safe so the first screen can render.
    persistSession: !isWebServer,
    detectSessionInUrl: isWeb,
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
