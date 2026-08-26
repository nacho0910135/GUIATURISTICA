import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

export const SUPABASE_URL = 'https://dxqezvkguswleoisxikz.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_4YjkMWzHSFnxb4eCe4ukkw_j-yaPhd6';

const webStorage = {
  getItem: (key: string) => typeof window === 'undefined' ? null : AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => typeof window === 'undefined' ? undefined : AsyncStorage.setItem(key, value),
  removeItem: (key: string) => typeof window === 'undefined' ? undefined : AsyncStorage.removeItem(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
