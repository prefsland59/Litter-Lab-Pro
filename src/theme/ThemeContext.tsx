import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MD3DarkTheme,
  MD3LightTheme,
  PaperProvider,
} from 'react-native-paper';
import {
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';
import type { MD3Theme } from 'react-native-paper';
import type { Theme as NavigationTheme } from '@react-navigation/native';
import { colors, type AppColors } from './colors';

const STORAGE_KEY = 'theme_preference';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  colors: AppColors;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function buildPaperTheme(mode: ThemeMode): MD3Theme {
  const palette = colors[mode];
  const base = mode === 'dark' ? MD3DarkTheme : MD3LightTheme;

  return {
    ...base,
    dark: mode === 'dark',
    colors: {
      ...base.colors,
      primary: palette.primary,
      primaryContainer: mode === 'dark' ? '#2A2A3E' : '#E8E8F0',
      secondary: palette.accent,
      secondaryContainer: mode === 'dark' ? '#3D2E1A' : '#F5E6CC',
      tertiary: palette.accent,
      tertiaryContainer: mode === 'dark' ? '#3D2E1A' : '#F5E6CC',
      background: palette.background,
      surface: palette.surface,
      surfaceVariant: mode === 'dark' ? '#252540' : '#F0F0F5',
      surfaceDisabled: mode === 'dark' ? '#1E1E30' : '#E5E5EB',
      error: palette.error,
      errorContainer: mode === 'dark' ? '#4A1C1C' : '#FEE2E2',
      onPrimary: mode === 'dark' ? '#0F0F1A' : '#FFFFFF',
      onPrimaryContainer: mode === 'dark' ? '#E8E8F0' : '#1A1A2E',
      onSecondary: mode === 'dark' ? '#0F0F1A' : '#FFFFFF',
      onSecondaryContainer: mode === 'dark' ? '#F5E6CC' : '#1A1A2E',
      onTertiary: mode === 'dark' ? '#0F0F1A' : '#FFFFFF',
      onTertiaryContainer: mode === 'dark' ? '#F5E6CC' : '#1A1A2E',
      onSurface: palette.text,
      onSurfaceVariant: palette.textSecondary,
      onSurfaceDisabled: mode === 'dark' ? '#4A4A60' : '#9CA3AF',
      onError: '#FFFFFF',
      onErrorContainer: mode === 'dark' ? '#FEE2E2' : '#DC2626',
      onBackground: palette.text,
      outline: palette.border,
      outlineVariant: mode === 'dark' ? '#2A2A40' : '#D1D5DB',
      inverseSurface: mode === 'dark' ? '#F1F5F9' : '#1A1A2E',
      inverseOnSurface: mode === 'dark' ? '#1A1A2E' : '#F1F5F9',
      inversePrimary: mode === 'dark' ? '#1A1A2E' : '#C8963E',
      shadow: mode === 'dark' ? '#000000' : '#000000',
      scrim: mode === 'dark' ? '#000000' : '#000000',
    },
  };
}

export function buildNavigationTheme(mode: ThemeMode): NavigationTheme {
  const palette = colors[mode];
  const base =
    mode === 'dark' ? NavigationDarkTheme : NavigationDefaultTheme;

  return {
    ...base,
    dark: mode === 'dark',
    colors: {
      ...base.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      notification: palette.accent,
    },
  };
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [loaded, setLoaded] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark') {
          setTheme(stored);
        } else {
          const colorScheme = Appearance.getColorScheme();
          setTheme(colorScheme === 'dark' ? 'dark' : 'light');
        }
        setLoaded(true);
      })
      .catch(() => {
        const colorScheme = Appearance.getColorScheme();
        setTheme(colorScheme === 'dark' ? 'dark' : 'light');
        setLoaded(true);
      });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const paperTheme = useMemo(() => buildPaperTheme(theme), [theme]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme,
      colors: colors[theme],
    }),
    [theme, toggleTheme],
  );

  // Don't render until we've loaded the preference to avoid a flash
  if (!loaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      <PaperProvider theme={paperTheme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return ctx;
}
