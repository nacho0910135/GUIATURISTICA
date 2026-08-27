import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'nativewind';

import { appTheme as tokens } from '@/theme/theme';

export type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  colors: typeof tokens.colors.light;
  tokens: typeof tokens;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const THEME_STORAGE_KEY = 'descubriendo-cr:theme-mode';
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const { setColorScheme } = useColorScheme();
  const [applyColorScheme] = useState(() => setColorScheme);
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((savedMode) => {
        if (!active) return;
        const nextMode: ThemeMode = savedMode === 'dark' ? 'dark' : 'light';
        setModeState(nextMode);
        applyColorScheme(nextMode);
      })
      .catch(() => applyColorScheme('light'));
    return () => { active = false; };
  }, [applyColorScheme]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    applyColorScheme(nextMode);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
  }, [applyColorScheme]);

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const colors = tokens.colors[mode];
  const navigationTheme = useMemo(() => ({
    ...(mode === 'dark' ? DarkTheme : DefaultTheme), dark: mode === 'dark',
    colors: { ...(mode === 'dark' ? DarkTheme : DefaultTheme).colors, primary: colors.primary, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, notification: colors.danger },
  }), [colors, mode]);
  const value = useMemo(() => ({ mode, colors, tokens, setMode, toggleMode }), [colors, mode, setMode, toggleMode]);
  return <ThemeContext.Provider value={value}><NavigationThemeProvider value={navigationTheme}>{children}</NavigationThemeProvider></ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used inside AppThemeProvider');
  return context;
}
