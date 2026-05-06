import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Appearance } from 'react-native';
import { darkColors, lightColors, type ColorTokens } from './colors';
import { typography, type TypographyScale } from './typography';
import { spacing, radius } from './spacing';
import { useSettingsStore } from '@/store/settingsStore';

export type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedScheme = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  resolvedScheme: 'light' | 'dark'; // hasil resolve setelah handle 'system'
  colors: ColorTokens;
  typography: TypographyScale;
  spacing: typeof spacing;
  radius: typeof radius;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const [systemScheme, setSystemScheme] = useState<ResolvedScheme>(() =>
    Appearance.getColorScheme() === 'light' ? 'light' : 'dark'
  );

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'light' ? 'light' : 'dark');
    });
    return () => sub.remove();
  }, []);

  const theme = useMemo<Theme>(() => {
    const resolvedScheme: ResolvedScheme =
      themeMode === 'system' ? systemScheme : themeMode;

    return {
      mode: themeMode,
      resolvedScheme,
      colors: resolvedScheme === 'light' ? lightColors : darkColors,
      typography,
      spacing,
      radius,
    };
  }, [themeMode, systemScheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback ke dark theme kalau di-call di luar provider
    return {
      mode: 'dark',
      resolvedScheme: 'dark',
      colors: darkColors,
      typography,
      spacing,
      radius,
    };
  }
  return ctx;
}
