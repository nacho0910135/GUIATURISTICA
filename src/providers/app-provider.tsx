import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { copy, type CopyKey, type Language } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/theme/theme-provider';

WebBrowser.maybeCompleteAuthSession();

type Currency = 'USD' | 'CRC';
export type VisitorType = 'tico' | 'foreigner';

type AppContextValue = {
  language: Language;
  currency: Currency;
  visitorType: VisitorType;
  exchangeRate: number;
  avatarUrl: string | null;
  session: Session | null;
  authReady: boolean;
  isDark: boolean;
  t: (key: CopyKey) => string;
  setVisitorType: (value: VisitorType) => void;
  formatPrice: (crcAmount: number) => string;
  requireAuth: (intent: string) => boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setAvatarUrl: (value: string | null) => void;
};

const AppContext = createContext<AppContextValue | null>(null);
const FALLBACK_USD_CRC = 503.84;

export function AppProvider({ children }: PropsWithChildren) {
  const { mode } = useAppTheme();
  const [visitorType, setVisitorType] = useState<VisitorType>('tico');
  const language: Language = visitorType === 'tico' ? 'es' : 'en';
  const currency: Currency = visitorType === 'tico' ? 'CRC' : 'USD';
  const [exchangeRate, setExchangeRate] = useState(FALLBACK_USD_CRC);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userSession, setUserSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const session = userSession;
  const isAuthenticated = Boolean(userSession);

  const syncSession = useCallback(async (nextSession: Session | null) => {
    setUserSession(nextSession);
    if (!nextSession) {
      setIsAdmin(false);
      setAvatarUrl(null);
      return;
    }
    const { data } = await supabase.from('users').select('role,avatar_url').eq('id', nextSession.user.id).maybeSingle();
    setIsAdmin(data?.role === 'admin');
    setAvatarUrl(data?.avatar_url ?? null);
  }, []);

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
    void Location.requestForegroundPermissionsAsync().catch(() => undefined);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    await syncSession(data.session);
  }, [syncSession]);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) throw error;
    if (data.session) await syncSession(data.session);
    return Boolean(data.session);
  }, [syncSession]);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
    if (error) throw error;
    if (!data.url) throw new Error('No se pudo iniciar Google OAuth.');
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return;
    const callback = new URL(result.url.replace('#', '?'));
    const code = callback.searchParams.get('code');
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
      return;
    }
    const access_token = callback.searchParams.get('access_token');
    const refresh_token = callback.searchParams.get('refresh_token');
    if (!access_token || !refresh_token) throw new Error('Google no devolvió una sesión válida.');
    const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
    if (sessionError) throw sessionError;
  }, []);

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
    language, currency, visitorType, exchangeRate, avatarUrl, session, authReady, isDark: mode === 'dark', t,
    setVisitorType, setAvatarUrl, formatPrice, requireAuth, isAdmin, isAuthenticated, signIn, signUp, signInWithGoogle, signOut,
  }), [language, currency, visitorType, exchangeRate, avatarUrl, session, authReady, mode, t, formatPrice, requireAuth, isAdmin, isAuthenticated, signIn, signUp, signInWithGoogle, signOut]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
