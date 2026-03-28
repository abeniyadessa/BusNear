import React, { useState, useCallback, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { LightTheme, DarkTheme, ThemeColors } from '@/constants/colors';

const THEME_KEY = 'busnear_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  const themeQuery = useQuery({
    queryKey: ['theme'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      return (stored as ThemeMode) ?? 'system';
    },
  });

  const saveThemeMutation = useMutation({
    mutationFn: async (newMode: ThemeMode) => {
      await AsyncStorage.setItem(THEME_KEY, newMode);
      return newMode;
    },
  });

  useEffect(() => {
    if (themeQuery.data) {
      setMode(themeQuery.data);
      console.log('[Theme] Restored theme mode:', themeQuery.data);
    }
  }, [themeQuery.data]);

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const colors: ThemeColors = isDark ? DarkTheme : LightTheme;

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    saveThemeMutation.mutate(newMode);
    console.log('[Theme] Mode changed to:', newMode);
  }, [saveThemeMutation]);

  const toggleTheme = useCallback(() => {
    const next = isDark ? 'light' : 'dark';
    setThemeMode(next);
  }, [isDark, setThemeMode]);

  return {
    mode,
    isDark,
    colors,
    setThemeMode,
    toggleTheme,
  };
});
