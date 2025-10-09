/**
 * Density Context Provider
 *
 * Provides global state management for UI density preferences.
 * Persists user selection to localStorage and applies density
 * settings across all components.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  UIDensity,
  DEFAULT_DENSITY,
  DensityTheme,
  getDensityTheme,
  applyDensity,
  getDensityStyles,
  generateDensityCSSVars,
} from '../theme/density';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/**
 * Density context value
 */
export interface DensityContextValue {
  // Current density level
  density: UIDensity;

  // Density theme (derived from density level)
  theme: DensityTheme;

  // Set density level
  setDensity: (density: UIDensity) => void;

  // Toggle through density levels
  cycleDensity: () => void;

  // Reset to default
  resetDensity: () => void;

  // Utility functions
  applyDensity: typeof applyDensity;
  getDensityStyles: typeof getDensityStyles;

  // Check if specific density is active
  isCompact: boolean;
  isComfortable: boolean;
  isSpaciou: boolean;
}

/**
 * Density provider props
 */
export interface DensityProviderProps {
  children: React.ReactNode;
  defaultDensity?: UIDensity;
  persistKey?: string;
}

// =====================================================
// CONTEXT CREATION
// =====================================================

const DensityContext = createContext<DensityContextValue | undefined>(undefined);

// =====================================================
// STORAGE UTILITIES
// =====================================================

const STORAGE_KEY = 'threatflow:ui:density';

/**
 * Load density from localStorage
 */
function loadDensityFromStorage(storageKey: string): UIDensity | null {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored && Object.values(UIDensity).includes(stored as UIDensity)) {
      return stored as UIDensity;
    }
  } catch (error) {
    console.error('Failed to load density from localStorage:', error);
  }
  return null;
}

/**
 * Save density to localStorage
 */
function saveDensityToStorage(storageKey: string, density: UIDensity): void {
  try {
    localStorage.setItem(storageKey, density);
  } catch (error) {
    console.error('Failed to save density to localStorage:', error);
  }
}

/**
 * Clear density from localStorage
 */
function clearDensityFromStorage(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Failed to clear density from localStorage:', error);
  }
}

// =====================================================
// PROVIDER COMPONENT
// =====================================================

/**
 * DensityProvider Component
 *
 * Wraps the application to provide global density state management.
 *
 * Features:
 * - Persists density preference to localStorage
 * - Applies CSS variables to document root
 * - Provides utility functions for components
 * - Supports density cycling
 *
 * @example
 * ```tsx
 * import { DensityProvider } from './context/DensityContext';
 *
 * function App() {
 *   return (
 *     <DensityProvider defaultDensity={UIDensity.Comfortable}>
 *       <YourApp />
 *     </DensityProvider>
 *   );
 * }
 * ```
 */
export function DensityProvider({
  children,
  defaultDensity = DEFAULT_DENSITY,
  persistKey = STORAGE_KEY,
}: DensityProviderProps) {
  // Initialize density from localStorage or default
  const [density, setDensityState] = useState<UIDensity>(() => {
    const stored = loadDensityFromStorage(persistKey);
    return stored || defaultDensity;
  });

  // Derive theme from density
  const theme = useMemo(() => getDensityTheme(density), [density]);

  // Derived boolean flags
  const isCompact = density === UIDensity.Compact;
  const isComfortable = density === UIDensity.Comfortable;
  const isSpaciou = density === UIDensity.Spacious;

  /**
   * Set density and persist to localStorage
   */
  const setDensity = useCallback(
    (newDensity: UIDensity) => {
      setDensityState(newDensity);
      saveDensityToStorage(persistKey, newDensity);

      // Dispatch custom event for external listeners
      window.dispatchEvent(
        new CustomEvent('densitychange', {
          detail: { density: newDensity },
        })
      );
    },
    [persistKey]
  );

  /**
   * Cycle through density levels
   */
  const cycleDensity = useCallback(() => {
    const levels = [UIDensity.Compact, UIDensity.Comfortable, UIDensity.Spacious];
    const currentIndex = levels.indexOf(density);
    const nextIndex = (currentIndex + 1) % levels.length;
    setDensity(levels[nextIndex]);
  }, [density, setDensity]);

  /**
   * Reset to default density
   */
  const resetDensity = useCallback(() => {
    setDensity(defaultDensity);
    clearDensityFromStorage(persistKey);
  }, [defaultDensity, persistKey, setDensity]);

  /**
   * Apply CSS variables to document root
   */
  useEffect(() => {
    const root = document.documentElement;
    const cssVars = generateDensityCSSVars(density);

    // Apply CSS variables
    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, String(value));
    });

    // Set data attribute for CSS selectors
    root.setAttribute('data-density', density);

    // Cleanup
    return () => {
      Object.keys(cssVars).forEach(key => {
        root.style.removeProperty(key);
      });
      root.removeAttribute('data-density');
    };
  }, [density]);

  /**
   * Log density changes in development
   */
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Density] Changed to: ${density}`);
    }
  }, [density]);

  // Context value
  const value: DensityContextValue = useMemo(
    () => ({
      density,
      theme,
      setDensity,
      cycleDensity,
      resetDensity,
      applyDensity,
      getDensityStyles,
      isCompact,
      isComfortable,
      isSpaciou,
    }),
    [density, theme, setDensity, cycleDensity, resetDensity, isCompact, isComfortable, isSpaciou]
  );

  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>;
}

// =====================================================
// CUSTOM HOOK
// =====================================================

/**
 * useDensity Hook
 *
 * Access density context in components.
 *
 * @example
 * ```tsx
 * import { useDensity } from './context/DensityContext';
 *
 * function MyComponent() {
 *   const { density, theme, setDensity } = useDensity();
 *
 *   return (
 *     <div style={{ padding: theme.componentPadding }}>
 *       Current density: {density}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDensity(): DensityContextValue {
  const context = useContext(DensityContext);

  if (!context) {
    throw new Error('useDensity must be used within a DensityProvider');
  }

  return context;
}

// =====================================================
// UTILITY HOOKS
// =====================================================

/**
 * useDensityStyles Hook
 *
 * Get component-specific density styles.
 *
 * @example
 * ```tsx
 * import { useDensityStyles } from './context/DensityContext';
 *
 * function MyButton() {
 *   const buttonStyles = useDensityStyles('button');
 *
 *   return (
 *     <button
 *       style={{
 *         paddingLeft: buttonStyles.paddingX,
 *         paddingRight: buttonStyles.paddingX,
 *         paddingTop: buttonStyles.paddingY,
 *         paddingBottom: buttonStyles.paddingY,
 *         fontSize: buttonStyles.fontSize,
 *         height: buttonStyles.height,
 *       }}
 *     >
 *       Click me
 *     </button>
 *   );
 * }
 * ```
 */
export function useDensityStyles(component: 'button' | 'input' | 'card' | 'table' | 'chip') {
  const { density, getDensityStyles } = useDensity();
  return useMemo(() => getDensityStyles(density, component), [density, getDensityStyles, component]);
}

/**
 * useDensitySpacing Hook
 *
 * Get spacing value for current density.
 *
 * @example
 * ```tsx
 * import { useDensitySpacing } from './context/DensityContext';
 *
 * function MyComponent() {
 *   const spacing = useDensitySpacing();
 *
 *   return (
 *     <div style={{ gap: spacing.md }}>
 *       Content with responsive spacing
 *     </div>
 *   );
 * }
 * ```
 */
export function useDensitySpacing() {
  const { theme } = useDensity();
  return theme.spacing;
}

/**
 * useDensityFontSize Hook
 *
 * Get font size for current density.
 *
 * @example
 * ```tsx
 * import { useDensityFontSize } from './context/DensityContext';
 *
 * function MyText() {
 *   const fontSize = useDensityFontSize();
 *
 *   return (
 *     <p style={{ fontSize: fontSize.lg }}>
 *       Responsive text
 *     </p>
 *   );
 * }
 * ```
 */
export function useDensityFontSize() {
  const { theme } = useDensity();
  return theme.fontSize;
}

/**
 * useDensityValue Hook
 *
 * Get different values based on current density level.
 *
 * @example
 * ```tsx
 * import { useDensityValue } from './context/DensityContext';
 *
 * function MyComponent() {
 *   const columns = useDensityValue({
 *     compact: 4,
 *     comfortable: 3,
 *     spacious: 2,
 *   });
 *
 *   return <Grid columns={columns}>...</Grid>;
 * }
 * ```
 */
export function useDensityValue<T>(values: Record<UIDensity, T>): T {
  const { density } = useDensity();
  return values[density];
}

/**
 * useDensityClass Hook
 *
 * Get CSS class name based on density level.
 *
 * @example
 * ```tsx
 * import { useDensityClass } from './context/DensityContext';
 *
 * function MyComponent() {
 *   const densityClass = useDensityClass('my-component');
 *
 *   // Returns: 'my-component my-component--compact'
 *   return <div className={densityClass}>...</div>;
 * }
 * ```
 */
export function useDensityClass(baseClass: string): string {
  const { density } = useDensity();
  return useMemo(() => `${baseClass} ${baseClass}--${density}`, [baseClass, density]);
}

// =====================================================
// HOC (Higher-Order Component)
// =====================================================

/**
 * withDensity HOC
 *
 * Wraps a component to inject density props.
 *
 * @example
 * ```tsx
 * import { withDensity } from './context/DensityContext';
 *
 * function MyComponent({ density, theme, setDensity }) {
 *   return <div>Current density: {density}</div>;
 * }
 *
 * export default withDensity(MyComponent);
 * ```
 */
export function withDensity<P extends object>(
  Component: React.ComponentType<P & DensityContextValue>
): React.FC<P> {
  return function DensityWrappedComponent(props: P) {
    const densityProps = useDensity();
    return <Component {...props} {...densityProps} />;
  };
}

// =====================================================
// EXPORTS
// =====================================================

export default DensityContext;

export type { DensityContextValue, DensityProviderProps };
