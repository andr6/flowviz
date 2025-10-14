import React, { createContext, useContext, ReactNode } from 'react';

import { useTheme } from '../hooks/useTheme';
import { createThemeVariants, ThreatFlowTheme } from '../theme/theme-variants';

interface ThemeContextType {
  theme: ThreatFlowTheme;
  themeMode: 'light' | 'dark' | 'system';
  actualTheme: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = React.memo(({ children }) => {
  const { themeMode, actualTheme, setThemeMode, toggleTheme } = useTheme();

  // Memoize theme variants creation
  const themeVariants = React.useMemo(() => createThemeVariants(), []);
  const theme = themeVariants[actualTheme];

  // Update HTML data-theme attribute when theme changes
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', actualTheme);
  }, [actualTheme]);

  // Memoize context value
  const contextValue = React.useMemo(
    () => ({
      theme,
      themeMode,
      actualTheme,
      setThemeMode,
      toggleTheme,
    }),
    [theme, themeMode, actualTheme, setThemeMode, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
});

export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};