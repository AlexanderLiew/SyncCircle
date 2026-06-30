import { useContext } from 'react';
import type { ThemeDefinition, ThemeName } from '../types';
import { ThemeContext } from '../components/ThemeProvider';

export interface UseThemeReturn {
  currentTheme: ThemeName;
  applyTheme: (theme: ThemeName) => void;
  getAvailableThemes: () => ThemeDefinition[];
}

/**
 * Custom hook for accessing and controlling the active theme.
 *
 * Must be used within a <ThemeProvider>.
 */
export function useTheme(): UseThemeReturn {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  const getAvailableThemes = (): ThemeDefinition[] => {
    return context.availableThemes;
  };

  return {
    currentTheme: context.currentTheme,
    applyTheme: context.applyTheme,
    getAvailableThemes,
  };
}
