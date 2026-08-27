import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useColorScheme } from 'nativewind';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { copy, type CopyKey, type Language } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

type Currency = 'USD' | 'CRC';
export type VisitorType = 'tico' | 'foreigner';
type AuthMode = 'signin' | 'signup';

type AppContextValue = {
  language: Language;
  currency: Currency;
  visitorType: VisitorType;
  exchangeRate: number;
  session: Session | null;
  authReady: boolean;
  isDark: boolean;
  t: (key: CopyKey) => string;
  setVisitorType: (value: VisitorType) => void;
  formatPrice: (crcAmount: number) => string;
  requireAuth: (intent: string) => boolean;
  authenticate: (mode: AuthMode, email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);
const FALLBACK_USD_CRC = 503.84;

export function AppProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const [visitorType, setVisitorType] = useState<VisitorType>('tico');
  const language: Language = visitorType === 'tico' ? 'es' : 'en';
  const currency: Currency = visitorType === 'tico' ? 'CRC' : 'USD';
  const [exchangeRate, setExchangeRate] = useState(FALLBACK_USD_CRC);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
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

  const requireAuth = useCallback(
    (intent: string) => {
      if (session) return true;
      router.push({ pathname: '/(aux)/auth-modal', params: { intent } });
      return false;
    },
    [router, session],
  );

  const authenticate = useCallback(async (mode: AuthMode, email: string, password: string) => {
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    return result.error?.message ?? null;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) return error?.message ?? 'No se pudo iniciar Google OAuth.';
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return result.type === 'cancel' ? null : 'No se completó la autenticación.';

    const callbackUrl = new URL(result.url.replace('#', '?'));
    const code = callbackUrl.searchParams.get('code');
    if (code) return (await supabase.auth.exchangeCodeForSession(code)).error?.message ?? null;
    const accessToken = callbackUrl.searchParams.get('access_token');
    const refreshToken = callbackUrl.searchParams.get('refresh_token');
    if (!accessToken || !refreshToken) return 'La respuesta de Google no incluyó una sesión válida.';
    return (await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })).error?.message ?? null;
  }, []);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);

  const value = useMemo<AppContextValue>(() => ({
    language, currency, visitorType, exchangeRate, session, authReady, isDark: colorScheme === 'dark', t,
    setVisitorType, formatPrice, requireAuth, authenticate, signInWithGoogle, signOut,
  }), [language, currency, visitorType, exchangeRate, session, authReady, colorScheme, t, formatPrice, requireAuth, authenticate, signInWithGoogle, signOut]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
