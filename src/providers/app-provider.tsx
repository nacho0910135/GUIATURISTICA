import type { Session } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { hasPrecisePermission, isUsablePosition, LOCATION_MAX_AGE_MS } from '@/lib/location-quality';
import { copy, type CopyKey, type Language } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
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

  // Expo Go cannot open the custom scheme registered by the standalone app.
  // Its callback must point back to the currently running Expo development URL.
  if (Constants.appOwnership === 'expo' || Constants.expoGoConfig) {
    return Linking.createURL('auth/callback', { scheme: 'exp' });
  }

  return AuthSession.makeRedirectUri({
    native: NATIVE_OAUTH_REDIRECT_URI,
    scheme: 'descubriendocr',
    path: 'auth/callback',
  });
}

export function AppProvider({ children }: PropsWithChildren) {
  const { mode } = useAppTheme();
  const [visitorType, setVisitorType] = useState<VisitorType>('tico');
  const language: Language = visitorType === 'tico' ? 'es' : 'en';
  const currency: Currency = visitorType === 'tico' ? 'CRC' : 'USD';
  const [exchangeRate, setExchangeRate] = useState(FALLBACK_USD_CRC);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userSession, setUserSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const locationRefreshInFlight = useRef(false);
  const locationWatcher = useRef<Location.LocationSubscription | null>(null);
  const locationGeneration = useRef(0);
  const lastLocationTimestamp = useRef(0);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<'denied' | 'unavailable' | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const session = userSession;
  const isAuthenticated = Boolean(userSession);

  const refreshUserLocation = useCallback(async () => {
    if (locationRefreshInFlight.current) return;
    locationRefreshInFlight.current = true;
    const generation = ++locationGeneration.current;
    const active = () => generation === locationGeneration.current;
    setLocating(true);
    setLocationError(null);
    locationWatcher.current?.remove();
    locationWatcher.current = null;
    setUserLocation(null);
    const accept = (position: Location.LocationObject) => {
      if (!active() || position.timestamp < lastLocationTimestamp.current) return;
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
      if (!permission.granted && permission.canAskAgain) permission = await Location.requestForegroundPermissionsAsync();
      if (!active()) return;
      if (!permission.granted) {
        lastLocationTimestamp.current = 0;
        setLocationError('denied');
        return;
      }
      if (!hasPrecisePermission(permission)) {
        lastLocationTimestamp.current = 0;
        setLocationError('unavailable');
        return;
      }
      const options = {
        accuracy: Location.Accuracy.Highest,
        distanceInterval: 10,
        timeInterval: 10000,
        ...(Platform.OS === 'web' ? { maximumAge: 0, timeout: 20000 } : {}),
      };
      const watcher = await Location.watchPositionAsync(options, accept, () => {
        if (!active()) return;
        setUserLocation(null);
        setLocationError('unavailable');
        setLocating(false);
      });
      if (!active()) { watcher.remove(); return; }
      locationWatcher.current = watcher;
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
        // Recheck silent sensors and permissions without a screen-specific GPS.
        if (lastLocationTimestamp.current > 0 && AppState.currentState === 'active') void refreshUserLocation();
      }
    }, 15000);
    return () => {
      clearInterval(timer);
      locationGeneration.current += 1;
      locationRefreshInFlight.current = false;
      locationWatcher.current?.remove();
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

  const createSessionFromUrl = useCallback(async (url: string) => {
    const callback = new URL(url.replace('#', url.includes('?') ? '&' : '?'));
    const oauthError = callback.searchParams.get('error_description') ?? callback.searchParams.get('error');
    if (oauthError) throw new Error(oauthError);

    const code = callback.searchParams.get('code');
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      await syncSession(data.session);
      return Boolean(data.session);
    }

    const access_token = callback.searchParams.get('access_token');
    const refresh_token = callback.searchParams.get('refresh_token');
    if (!access_token || !refresh_token) return false;
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    await syncSession(data.session);
    return Boolean(data.session);
  }, [syncSession]);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) void syncSession(data.session).finally(() => setAuthReady(true));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) void syncSession(nextSession);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [syncSession]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const handleCallback = (url: string) => {
      if (!url.includes('auth/callback')) return;
      void createSessionFromUrl(url).catch((error) => console.warn('No se pudo completar Google OAuth.', error));
    };
    const subscription = Linking.addEventListener('url', ({ url }) => handleCallback(url));
    void Linking.getInitialURL().then((url) => { if (url) handleCallback(url); });
    return () => subscription.remove();
  }, [createSessionFromUrl]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'inactive') return;
      if (state !== 'active') {
        locationGeneration.current += 1;
        locationRefreshInFlight.current = false;
        locationWatcher.current?.remove();
        locationWatcher.current = null;
        setUserLocation(null);
        return;
      }
      void supabase.auth.getSession().then(({ data }) => syncSession(data.session));
      void refreshUserLocation().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [refreshUserLocation, syncSession]);

  useEffect(() => {
    void refreshUserLocation().catch(() => undefined);
  }, [refreshUserLocation]);

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
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, { showInRecents: true });
    if (result.type !== 'success') return false;
    const sessionCreated = await createSessionFromUrl(result.url);
    if (!sessionCreated) throw new Error('Google completó el acceso, pero no fue posible crear la sesión. Intentá nuevamente.');
    return sessionCreated;
  }, [createSessionFromUrl]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUserSession(null);
    setIsAdmin(false);
    setAvatarUrl(null);
  }, []);

  useEffect(() => {
    supabase
      .from('system_exchange_rates')
      .select('rate_buy,rate_sell,updated_at,source')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { rate_buy?: number } | null;
        const nextRate = Number(row?.rate_buy);
        if (Number.isFinite(nextRate) && nextRate > 0) setExchangeRate(nextRate);
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
    language, currency, visitorType, exchangeRate, avatarUrl, session, authReady, userLocation, locating, locationError, refreshUserLocation, isDark: mode === 'dark', t,
    setVisitorType, setAvatarUrl, formatPrice, requireAuth, isAdmin, isAuthenticated, signIn, signUp, signInWithGoogle, signOut,
  }), [language, currency, visitorType, exchangeRate, avatarUrl, session, authReady, userLocation, locating, locationError, refreshUserLocation, mode, t, formatPrice, requireAuth, isAdmin, isAuthenticated, signIn, signUp, signInWithGoogle, signOut]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
