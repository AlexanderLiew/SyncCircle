'use client';

import React, { createContext, useCallback, useEffect, useState } from 'react';
import type { ThemeDefinition, ThemeName } from '../types';
import { STORAGE_KEYS } from '../types';
import { DEFAULT_THEME, THEMES } from '../lib/theme-config';

export interface ThemeContextValue {
  currentTheme: ThemeName;
  applyTheme: (theme: ThemeName) => void;
  availableThemes: ThemeDefinition[];
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyThemeVariables(theme: ThemeDefinition): void {
  const root = document.documentElement;
  for (const [property, value] of Object.entries(theme.variables)) {
    root.style.setProperty(property, value);
  }
}

function getPersistedTheme(): ThemeName | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME);
    if (stored && THEMES.some((t) => t.name === stored)) {
      return stored as ThemeName;
    }
  } catch {
    // localStorage may be unavailable
  }
  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(DEFAULT_THEME);

  // On mount, read the persisted theme and apply it
  useEffect(() => {
    const persisted = getPersistedTheme();
    const themeName = persisted ?? DEFAULT_THEME;
    const themeDefinition = THEMES.find((t) => t.name === themeName) ?? THEMES[0];
    applyThemeVariables(themeDefinition);
    setCurrentTheme(themeDefinition.name);
  }, []);

  const applyTheme = useCallback((themeName: ThemeName) => {
    const themeDefinition = THEMES.find((t) => t.name === themeName);
    if (!themeDefinition) return;

    applyThemeVariables(themeDefinition);
    setCurrentTheme(themeName);

    try {
      localStorage.setItem(STORAGE_KEYS.THEME, themeName);
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  const value: ThemeContextValue = {
    currentTheme,
    applyTheme,
    availableThemes: THEMES,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
