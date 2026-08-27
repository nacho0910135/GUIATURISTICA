import type { Session } from '@supabase/supabase-js';
import { useColorScheme } from 'nativewind';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { copy, type CopyKey, type Language } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

type Currency = 'USD' | 'CRC';
export type VisitorType = 'tico' | 'foreigner';
export const GUEST_USER_ID = '00000000-0000-4000-8000-000000000001';

const GUEST_SESSION = {
  access_token: '', refresh_token: '', expires_in: 0, token_type: 'bearer',
  user: {
    id: GUEST_USER_ID, aud: 'anon', created_at: new Date(0).toISOString(),
    app_metadata: {}, user_metadata: { full_name: 'Invitado' },
  },
} as Session;

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
  isAdmin: boolean;
  signInAdmin: (email: string, password: string) => Promise<void>;
  signOutAdmin: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);
const FALLBACK_USD_CRC = 503.84;

export function AppProvider({ children }: PropsWithChildren) {
  const { colorScheme } = useColorScheme();
  const [visitorType, setVisitorType] = useState<VisitorType>('tico');
  const language: Language = visitorType === 'tico' ? 'es' : 'en';
  const currency: Currency = visitorType === 'tico' ? 'CRC' : 'USD';
  const [exchangeRate, setExchangeRate] = useState(FALLBACK_USD_CRC);
  const [adminSession, setAdminSession] = useState<Session | null>(null);
  const session = adminSession ?? GUEST_SESSION;
  const authReady = true;
  const isAdmin = Boolean(adminSession);

  const signInAdmin = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    const { data: profile, error: profileError } = await supabase.from('users').select('role').eq('id', data.user.id).single();
    if (profileError || profile?.role !== 'admin') {
      await supabase.auth.signOut();
      throw new Error('Esta cuenta no tiene permisos de administrador.');
    }
    setAdminSession(data.session);
  }, []);

  const signOutAdmin = useCallback(async () => {
    await supabase.auth.signOut();
    setAdminSession(null);
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

  const requireAuth = useCallback((_intent: string) => true, []);

  const value = useMemo<AppContextValue>(() => ({
    language, currency, visitorType, exchangeRate, session, authReady, isDark: colorScheme === 'dark', t,
    setVisitorType, formatPrice, requireAuth, isAdmin, signInAdmin, signOutAdmin,
  }), [language, currency, visitorType, exchangeRate, session, authReady, colorScheme, t, formatPrice, requireAuth, isAdmin, signInAdmin, signOutAdmin]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
