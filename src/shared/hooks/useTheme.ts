import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface UseThemeReturn {
  themeMode: ThemeMode;
  actualTheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'threatflow-theme-mode';

export const useTheme = (): UseThemeReturn => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode;
    return stored || 'light'; // Default to light but allow dark theme switching
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false; // Default to light for new bright design system
  });

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') {return;}

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Calculate actual theme based on mode
  const actualTheme: 'light' | 'dark' = 
    themeMode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : themeMode;

  // Update theme mode with persistence
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    
    // Apply theme to document for smooth transitions
    document.documentElement.setAttribute('data-theme', mode === 'system' ? 
      (systemPrefersDark ? 'dark' : 'light') : mode);
  }, [systemPrefersDark]);

  // Toggle between dark and light (system becomes dark)
  const toggleTheme = useCallback(() => {
    const newMode = actualTheme === 'dark' ? 'light' : 'dark';
    setThemeMode(newMode);
  }, [actualTheme, setThemeMode]);

  // Apply theme to document on mount and changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', actualTheme);
    
    // Add smooth transition class
    document.documentElement.classList.add('theme-transition');
    
    // Remove transition class after animation completes
    const timer = setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 300);
    
    return () => clearTimeout(timer);
  }, [actualTheme]);

  return {
    themeMode,
    actualTheme,
    setThemeMode,
    toggleTheme,
  };
};