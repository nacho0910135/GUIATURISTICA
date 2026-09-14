import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, Pressable, Text, View } from 'react-native';

import { hasPrecisePermission, isUsablePosition, LOCATION_MAX_AGE_MS } from '@/lib/location-quality';
import { copy, type CopyKey, type Language } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { getPlannerOptions } from '@/lib/app-options';
import { ensureOfflineTripPacks } from '@/lib/offline-trip-pack';
import { observePushNotifications, registerPushNotifications, unregisterPushNotifications } from '@/lib/push-notifications';
import { useAppTheme } from '@/theme/theme-provider';

WebBrowser.maybeCompleteAuthSession();

type Currency = 'USD' | 'CRC';
export type VisitorType = 'tico' | 'foreigner';
type Coordinates = { latitude: number; longitude: number };

type AppContextValue = {
  language: Language;
  currency: Currency;
  visitorType: VisitorType;
  exchangeRate: number;
  exchangeRateReady: boolean;
  avatarUrl: string | null;
  session: Session | null;
  authReady: boolean;
  userLocation: Coordinates | null;
  locating: boolean;
  locationError: 'denied' | 'unavailable' | null;
  refreshUserLocation: () => Promise<void>;
  isDark: boolean;
  t: (key: CopyKey) => string;
  setVisitorType: (value: VisitorType) => void;
  formatPrice: (crcAmount: number) => string;
  requireAuth: (intent: string) => boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  setAvatarUrl: (value: string | null) => void;
};

const AppContext = createContext<AppContextValue | null>(null);
const FALLBACK_USD_CRC = 503.84;
const NATIVE_OAUTH_REDIRECT_URI = 'descubriendocr://auth/callback';

function getOAuthRedirectUri() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  // Production OAuth must always return to the installed application. An
  // `exp://` callback delegates the result to Expo Go instead of this AAB.
  return NATIVE_OAUTH_REDIRECT_URI;
}

export function AppProvider({ children }: PropsWithChildren) {
  const { mode } = useAppTheme();
  const [visitorType, setVisitorType] = useState<VisitorType>('tico');
  const language: Language = visitorType === 'tico' ? 'es' : 'en';
  const currency: Currency = visitorType === 'tico' ? 'CRC' : 'USD';
  const [exchangeRate, setExchangeRate] = useState(FALLBACK_USD_CRC);
  const [exchangeRateReady, setExchangeRateReady] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userSession, setUserSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authRestoreError, setAuthRestoreError] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const locationRefreshInFlight = useRef(false);
  const locationWatcher = useRef<Location.LocationSubscription | null>(null);
  const locationWatcherActive = useRef(false);
  const locationActivated = useRef(false);
  const locationGeneration = useRef(0);
  const oauthCallbackInFlight = useRef<Promise<boolean> | null>(null);
  const lastOAuthCallbackUrl = useRef<string | undefined>(undefined);
  const lastLocationTimestamp = useRef(0);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<'denied' | 'unavailable' | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const session = userSession;
  const isAuthenticated = Boolean(userSession);

  const refreshUserLocation = useCallback(async () => {
    if (locationRefreshInFlight.current) return;
    locationActivated.current = true;
    locationRefreshInFlight.current = true;
    const generation = ++locationGeneration.current;
    const active = () => generation === locationGeneration.current;
    setLocating(true);
    setLocationError(null);
    const accept = (position: Location.LocationObject, requireActiveGeneration = true) => {
      if ((requireActiveGeneration && !active()) || position.timestamp < lastLocationTimestamp.current) return;
      if (!isUsablePosition(position)) {
        setUserLocation(null);
        setLocationError('unavailable');
        setLocating(false);
        return;
      }
      lastLocationTimestamp.current = position.timestamp;
      setUserLocation(position.coords);
      setLocationError(null);
      setLocating(false);
    };
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!active()) return;
      if (!permission.granted) {
        permission = await Location.requestForegroundPermissionsAsync();
        if (!active()) return;
      }
      if (!permission.granted) {
        lastLocationTimestamp.current = 0;
        locationWatcherActive.current = false;
        locationWatcher.current?.remove();
        locationWatcher.current = null;
        setUserLocation(null);
        setLocationError('denied');
        return;
      }
      if (!hasPrecisePermission(permission)) {
        lastLocationTimestamp.current = 0;
        locationWatcherActive.current = false;
        locationWatcher.current?.remove();
        locationWatcher.current = null;
        setUserLocation(null);
        setLocationError('unavailable');
        return;
      }
      const options = {
        accuracy: Location.Accuracy.Highest,
        distanceInterval: 10,
        timeInterval: 10000,
        ...(Platform.OS === 'web' ? { maximumAge: 0, timeout: 20000 } : {}),
      };
      if (!locationWatcher.current) {
        locationWatcherActive.current = true;
        const watcher = await Location.watchPositionAsync(options, (position) => { if (locationWatcherActive.current) accept(position, false); }, () => {
          if (!locationWatcherActive.current) return;
          setUserLocation(null);
          setLocationError('unavailable');
          setLocating(false);
        });
        if (!active()) { watcher.remove(); return; }
        locationWatcher.current = watcher;
      }
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const current = await Promise.race([
          Location.getCurrentPositionAsync(options),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error('Location timeout')), 25000);
          }),
        ]);
        accept(current);
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      if (active() && Date.now() - lastLocationTimestamp.current > LOCATION_MAX_AGE_MS) {
        setUserLocation(null);
        setLocationError('unavailable');
      }
    } finally {
      if (active()) { locationRefreshInFlight.current = false; setLocating(false); }
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - lastLocationTimestamp.current > LOCATION_MAX_AGE_MS) {
        setUserLocation(null);
        if (AppState.currentState === 'active' && locationActivated.current) void refreshUserLocation().catch(() => undefined);
      }
    }, 15000);
    return () => {
      clearInterval(timer);
      locationGeneration.current += 1;
      locationRefreshInFlight.current = false;
      locationWatcher.current?.remove();
      locationWatcherActive.current = false;
      locationWatcher.current = null;
    };
  }, [refreshUserLocation]);

  const syncSession = useCallback(async (nextSession: Session | null) => {
    setUserSession(nextSession);
    if (!nextSession) {
      setIsAdmin(false);
      setAvatarUrl(null);
      return;
    }
    const { data } = await supabase.from('users').select('role,avatar_url').eq('id', nextSession.user.id).maybeSingle();
    const metadataAvatar = nextSession.user.user_metadata.avatar_url ?? nextSession.user.user_metadata.picture;
    setIsAdmin(data?.role === 'admin');
    setAvatarUrl(data?.avatar_url ?? (typeof metadataAvatar === 'string' ? metadataAvatar : null));
  }, []);

  const restoreSession = useCallback(async () => {
    setAuthRestoreError(false);
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    await syncSession(data.session);
    setAuthReady(true);
  }, [syncSession]);

  const createSessionFromUrl = useCallback((url: string) => {
    if (url === lastOAuthCallbackUrl.current && oauthCallbackInFlight.current) return oauthCallbackInFlight.current;
    lastOAuthCallbackUrl.current = url;
    const request = (async () => {
      const callbackUrl = new URL(url);
      if (Platform.OS !== 'web' && (callbackUrl.protocol !== 'descubriendocr:' || callbackUrl.hostname !== 'auth' || callbackUrl.pathname !== '/callback')) return false;
      const callback = new URL(url.replace('#', url.includes('?') ? '&' : '?'));
      const oauthError = callback.searchParams.get('error_description') ?? callback.searchParams.get('error');
      if (oauthError) throw new Error(oauthError);

      const code = callback.searchParams.get('code');
      const flowId = callback.searchParams.get('sb_flow_id');
      if (!code || !flowId) return false;
      const { data, error } = await supabase.auth.exchangeCodeForSession(code, { flowId });
      if (error) throw error;
      await syncSession(data.session);
      return Boolean(data.session);
    })();
    oauthCallbackInFlight.current = request;
    return request;
  }, [syncSession]);

  useEffect(() => {
    let mounted = true;
    void restoreSession().catch((error) => {
      console.warn('No se pudo restaurar la sesión.', error);
      if (mounted) setAuthRestoreError(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) void syncSession(nextSession).catch((error) => console.warn('No se pudo sincronizar la sesión.', error));
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [restoreSession, syncSession]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    return observePushNotifications();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android' || !userSession) return;
    void registerPushNotifications().catch((error) => console.warn('No se pudo registrar para notificaciones push.', error));
  }, [userSession]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const handleCallback = (url: string) => {
      if (!url.includes('auth/callback') && !url.includes('reset-password')) return;
      void createSessionFromUrl(url).catch((error) => console.warn('No se pudo completar Google OAuth.', error));
    };
    const subscription = Linking.addEventListener('url', ({ url }) => handleCallback(url));
    void Linking.getInitialURL().then((url) => { if (url) handleCallback(url); }).catch(() => undefined);
    return () => subscription.remove();
  }, [createSessionFromUrl]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'inactive') return;
      if (state !== 'active') {
        locationGeneration.current += 1;
        locationRefreshInFlight.current = false;
        locationWatcherActive.current = false;
        locationWatcher.current?.remove();
        locationWatcher.current = null;
        setUserLocation(null);
        return;
      }
      void supabase.auth.getSession().then(({ data, error }) => { if (error) throw error; return syncSession(data.session); }).catch((error) => console.warn('No se pudo actualizar la sesión.', error));
      if (locationActivated.current) void refreshUserLocation().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [refreshUserLocation, syncSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    await syncSession(data.session);
  }, [syncSession]);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) throw error;
    if (!data.user) throw new Error(language === 'es' ? 'No pudimos crear la cuenta.' : 'We could not create the account.');
    if (data.session) {
      await syncSession(data.session);
      return true;
    }
    await syncSession(null);
    return false;
  }, [language, syncSession]);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = getOAuthRedirectUri();
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
    if (error) throw error;
    if (!data.url) throw new Error('No se pudo iniciar Google OAuth.');
    if (Platform.OS === 'web') {
      window.location.assign(data.url);
      return false;
    }
    // Keep Chrome's custom tab in its own Android task. When the OAuth deep
    // link returns, Android can then resume this app instead of finishing the
    // activity together with the browser task.
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, { showInRecents: true });
    if (result.type !== 'success') return false;
    const sessionCreated = await createSessionFromUrl(result.url);
    if (!sessionCreated) throw new Error('Google completó el acceso, pero no fue posible crear la sesión. Intentá nuevamente.');
    return sessionCreated;
  }, [createSessionFromUrl]);

  const signOut = useCallback(async () => {
    await unregisterPushNotifications().catch(() => undefined);
    await supabase.auth.signOut();
    setUserSession(null);
    setIsAdmin(false);
    setAvatarUrl(null);
  }, []);

  useEffect(() => {
    void getPlannerOptions()
      .then(({ provinces }) => ensureOfflineTripPacks(provinces))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    supabase
      .from('system_exchange_rates')
      .select('rate_buy,updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { rate_buy?: number } | null;
        const nextRate = Number(row?.rate_buy);
        if (Number.isFinite(nextRate) && nextRate > 0) {
          setExchangeRate(nextRate);
          setExchangeRateReady(true);
        }
      });
  }, []);

  const t = useCallback((key: CopyKey) => copy[language][key], [language]);

  const formatPrice = useCallback(
    (crcAmount: number) => {
      const amount = currency === 'CRC' ? crcAmount : crcAmount / exchangeRate;
      const formatted = new Intl.NumberFormat(language === 'es' ? 'es-CR' : 'en-US', {
        maximumFractionDigits: currency === 'CRC' ? 0 : 2,
        minimumFractionDigits: currency === 'CRC' ? 0 : 2,
      }).format(amount);
      return currency === 'CRC' ? `₡${formatted}` : `$${formatted}`;
    },
    [currency, exchangeRate, language],
  );

  const requireAuth = useCallback((intent: string) => {
    if (userSession) return true;
    router.push({ pathname: '/(aux)/auth-modal', params: { intent } });
    return false;
  }, [userSession]);

  const value = useMemo<AppContextValue>(() => ({
    language, currency, visitorType, exchangeRate, exchangeRateReady, avatarUrl, session, authReady, userLocation, locating, locationError, refreshUserLocation, isDark: mode === 'dark', t,
    setVisitorType, setAvatarUrl, formatPrice, requireAuth, isAdmin, isAuthenticated, signIn, signUp, signInWithGoogle, signOut,
  }), [language, currency, visitorType, exchangeRate, exchangeRateReady, avatarUrl, session, authReady, userLocation, locating, locationError, refreshUserLocation, mode, t, formatPrice, requireAuth, isAdmin, isAuthenticated, signIn, signUp, signInWithGoogle, signOut]);

  return <AppContext.Provider value={value}>{authReady ? children : <View className="flex-1 items-center justify-center bg-ui-background px-6 dark:bg-ui-dark-background"><Text accessibilityRole="alert" className="text-center text-xl font-black text-ui-text dark:text-ui-dark-text">{authRestoreError ? (language === 'es' ? 'No pudimos restaurar tu sesión' : 'We could not restore your session') : (language === 'es' ? 'Restaurando tu sesión…' : 'Restoring your session…')}</Text>{authRestoreError ? <><Text className="mt-2 text-center text-ui-text-muted dark:text-ui-dark-text-muted">{language === 'es' ? 'Revisá tu conexión o continuá sin iniciar sesión.' : 'Check your connection or continue signed out.'}</Text><Pressable accessibilityRole="button" className="mt-5 rounded-control bg-ui-primary px-6 py-4" onPress={() => void restoreSession().catch(() => setAuthRestoreError(true))}><Text className="font-black text-white">{language === 'es' ? 'Reintentar' : 'Retry'}</Text></Pressable><Pressable accessibilityRole="button" className="mt-3 px-6 py-3" onPress={() => { setUserSession(null); setAuthReady(true); }}><Text className="font-black text-ui-primary dark:text-ui-dark-primary">{language === 'es' ? 'Continuar sin sesión' : 'Continue signed out'}</Text></Pressable></> : null}</View>}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
