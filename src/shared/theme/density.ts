/**
 * Adaptive Information Density Configuration
 *
 * Provides user-controlled UI complexity levels that affect spacing,
 * typography, and component sizes across the entire application.
 *
 * Density Levels:
 * - Compact: Minimal spacing, small fonts, maximum information per screen
 * - Comfortable: Balanced default, optimal for most users
 * - Spacious: Maximum whitespace, large fonts, accessibility-focused
 */

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/**
 * UI Density Levels
 */
export enum UIDensity {
  Compact = 'compact',
  Comfortable = 'comfortable',
  Spacious = 'spacious',
}

/**
 * Spacing scale values
 */
export interface SpacingScale {
  0: number;
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  6: number;
  8: number;
  10: number;
  12: number;
  16: number;
  20: number;
  24: number;
  32: number;
}

/**
 * Typography scale values
 */
export interface TypographyScale {
  xs: string;
  sm: string;
  md: string;
  base: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
}

/**
 * Line height values
 */
export interface LineHeightScale {
  none: number;
  tight: number;
  snug: number;
  normal: number;
  relaxed: number;
  loose: number;
}

/**
 * Density-specific theme values
 */
export interface DensityTheme {
  // Component sizing
  componentPadding: number;
  componentPaddingX: number;
  componentPaddingY: number;
  componentGap: number;
  componentBorderRadius: number;

  // Typography
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  lineHeight: number;
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };

  // Spacing
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
  };

  // Layout
  containerMaxWidth: string;
  gridGap: number;
  sectionSpacing: number;

  // Components
  button: {
    paddingX: number;
    paddingY: number;
    fontSize: string;
    height: number;
    minWidth: number;
  };
  input: {
    paddingX: number;
    paddingY: number;
    fontSize: string;
    height: number;
  };
  card: {
    padding: number;
    gap: number;
    borderRadius: number;
  };
  table: {
    cellPaddingX: number;
    cellPaddingY: number;
    fontSize: string;
    rowHeight: number;
  };
  chip: {
    paddingX: number;
    paddingY: number;
    fontSize: string;
    height: number;
  };
  icon: {
    size: {
      sm: number;
      md: number;
      lg: number;
    };
  };
}

/**
 * Complete density configuration
 */
export interface DensityConfig {
  compact: DensityTheme;
  comfortable: DensityTheme;
  spacious: DensityTheme;
}

// =====================================================
// BASE SCALES
// =====================================================

/**
 * Base spacing scale (in pixels)
 * Used as foundation for all density levels
 */
export const baseSpacing: SpacingScale = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
};

/**
 * Base typography scale
 */
export const baseTypography: TypographyScale = {
  xs: '0.75rem',   // 12px
  sm: '0.875rem',  // 14px
  md: '1rem',      // 16px
  base: '1rem',    // 16px
  lg: '1.125rem',  // 18px
  xl: '1.25rem',   // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem',  // 36px
};

/**
 * Base line height scale
 */
export const baseLineHeight: LineHeightScale = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
};

// =====================================================
// DENSITY CONFIGURATIONS
// =====================================================

/**
 * Compact Density Theme
 * - Minimal spacing
 * - Small fonts
 * - Maximum information density
 * - Ideal for: Power users, small screens, data-heavy views
 */
export const compactTheme: DensityTheme = {
  // Component sizing
  componentPadding: baseSpacing[2],        // 8px
  componentPaddingX: baseSpacing[2],       // 8px
  componentPaddingY: baseSpacing[1],       // 4px
  componentGap: baseSpacing[2],            // 8px
  componentBorderRadius: 4,

  // Typography
  fontSize: {
    xs: '0.625rem',   // 10px
    sm: '0.75rem',    // 12px
    md: '0.875rem',   // 14px
    base: '0.875rem', // 14px
    lg: '1rem',       // 16px
    xl: '1.125rem',   // 18px
    '2xl': '1.25rem', // 20px
    '3xl': '1.5rem',  // 24px
    '4xl': '1.875rem', // 30px
  },
  lineHeight: baseLineHeight.tight,        // 1.25
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Spacing
  spacing: {
    xs: baseSpacing[1],   // 4px
    sm: baseSpacing[2],   // 8px
    md: baseSpacing[3],   // 12px
    lg: baseSpacing[4],   // 16px
    xl: baseSpacing[5],   // 20px
    '2xl': baseSpacing[6], // 24px
  },

  // Layout
  containerMaxWidth: '1400px',
  gridGap: baseSpacing[2],       // 8px
  sectionSpacing: baseSpacing[4], // 16px

  // Components
  button: {
    paddingX: baseSpacing[2],  // 8px
    paddingY: baseSpacing[1],  // 4px
    fontSize: '0.875rem',      // 14px
    height: 28,
    minWidth: 60,
  },
  input: {
    paddingX: baseSpacing[2],  // 8px
    paddingY: baseSpacing[1],  // 4px
    fontSize: '0.875rem',      // 14px
    height: 32,
  },
  card: {
    padding: baseSpacing[3],   // 12px
    gap: baseSpacing[2],       // 8px
    borderRadius: 4,
  },
  table: {
    cellPaddingX: baseSpacing[2], // 8px
    cellPaddingY: baseSpacing[1], // 4px
    fontSize: '0.75rem',          // 12px
    rowHeight: 32,
  },
  chip: {
    paddingX: baseSpacing[2],  // 8px
    paddingY: baseSpacing[1],  // 4px
    fontSize: '0.75rem',       // 12px
    height: 20,
  },
  icon: {
    size: {
      sm: 14,
      md: 18,
      lg: 22,
    },
  },
};

/**
 * Comfortable Density Theme (Default)
 * - Balanced spacing
 * - Standard fonts
 * - Optimal for most users
 * - Ideal for: General use, balanced information density
 */
export const comfortableTheme: DensityTheme = {
  // Component sizing
  componentPadding: baseSpacing[4],        // 16px
  componentPaddingX: baseSpacing[4],       // 16px
  componentPaddingY: baseSpacing[3],       // 12px
  componentGap: baseSpacing[4],            // 16px
  componentBorderRadius: 6,

  // Typography
  fontSize: {
    xs: baseTypography.xs,      // 12px
    sm: baseTypography.sm,      // 14px
    md: baseTypography.md,      // 16px
    base: baseTypography.base,  // 16px
    lg: baseTypography.lg,      // 18px
    xl: baseTypography.xl,      // 20px
    '2xl': baseTypography['2xl'], // 24px
    '3xl': baseTypography['3xl'], // 30px
    '4xl': baseTypography['4xl'], // 36px
  },
  lineHeight: baseLineHeight.normal,       // 1.5
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Spacing
  spacing: {
    xs: baseSpacing[2],   // 8px
    sm: baseSpacing[3],   // 12px
    md: baseSpacing[4],   // 16px
    lg: baseSpacing[5],   // 20px
    xl: baseSpacing[6],   // 24px
    '2xl': baseSpacing[8], // 32px
  },

  // Layout
  containerMaxWidth: '1200px',
  gridGap: baseSpacing[4],       // 16px
  sectionSpacing: baseSpacing[6], // 24px

  // Components
  button: {
    paddingX: baseSpacing[4],  // 16px
    paddingY: baseSpacing[2],  // 8px
    fontSize: '1rem',          // 16px
    height: 36,
    minWidth: 80,
  },
  input: {
    paddingX: baseSpacing[3],  // 12px
    paddingY: baseSpacing[2],  // 8px
    fontSize: '1rem',          // 16px
    height: 40,
  },
  card: {
    padding: baseSpacing[4],   // 16px
    gap: baseSpacing[3],       // 12px
    borderRadius: 6,
  },
  table: {
    cellPaddingX: baseSpacing[3], // 12px
    cellPaddingY: baseSpacing[2], // 8px
    fontSize: '0.875rem',         // 14px
    rowHeight: 44,
  },
  chip: {
    paddingX: baseSpacing[3],  // 12px
    paddingY: baseSpacing[1],  // 4px
    fontSize: '0.875rem',      // 14px
    height: 24,
  },
  icon: {
    size: {
      sm: 18,
      md: 24,
      lg: 32,
    },
  },
};

/**
 * Spacious Density Theme
 * - Maximum whitespace
 * - Large fonts
 * - Accessibility-focused
 * - Ideal for: Presentations, accessibility, large screens, elderly users
 */
export const spaciousTheme: DensityTheme = {
  // Component sizing
  componentPadding: baseSpacing[6],        // 24px
  componentPaddingX: baseSpacing[6],       // 24px
  componentPaddingY: baseSpacing[4],       // 16px
  componentGap: baseSpacing[6],            // 24px
  componentBorderRadius: 8,

  // Typography
  fontSize: {
    xs: '0.875rem',   // 14px
    sm: '1rem',       // 16px
    md: '1.125rem',   // 18px
    base: '1.125rem', // 18px
    lg: '1.25rem',    // 20px
    xl: '1.5rem',     // 24px
    '2xl': '1.875rem', // 30px
    '3xl': '2.25rem',  // 36px
    '4xl': '3rem',     // 48px
  },
  lineHeight: baseLineHeight.relaxed,      // 1.625
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Spacing
  spacing: {
    xs: baseSpacing[3],    // 12px
    sm: baseSpacing[4],    // 16px
    md: baseSpacing[6],    // 24px
    lg: baseSpacing[8],    // 32px
    xl: baseSpacing[10],   // 40px
    '2xl': baseSpacing[12], // 48px
  },

  // Layout
  containerMaxWidth: '1000px',
  gridGap: baseSpacing[6],       // 24px
  sectionSpacing: baseSpacing[8], // 32px

  // Components
  button: {
    paddingX: baseSpacing[6],  // 24px
    paddingY: baseSpacing[3],  // 12px
    fontSize: '1.125rem',      // 18px
    height: 48,
    minWidth: 100,
  },
  input: {
    paddingX: baseSpacing[4],  // 16px
    paddingY: baseSpacing[3],  // 12px
    fontSize: '1.125rem',      // 18px
    height: 52,
  },
  card: {
    padding: baseSpacing[6],   // 24px
    gap: baseSpacing[4],       // 16px
    borderRadius: 8,
  },
  table: {
    cellPaddingX: baseSpacing[4], // 16px
    cellPaddingY: baseSpacing[3], // 12px
    fontSize: '1rem',             // 16px
    rowHeight: 56,
  },
  chip: {
    paddingX: baseSpacing[4],  // 16px
    paddingY: baseSpacing[2],  // 8px
    fontSize: '1rem',          // 16px
    height: 32,
  },
  icon: {
    size: {
      sm: 20,
      md: 28,
      lg: 36,
    },
  },
};

/**
 * Complete density configuration
 */
export const densityConfig: DensityConfig = {
  compact: compactTheme,
  comfortable: comfortableTheme,
  spacious: spaciousTheme,
};

/**
 * Default density level
 */
export const DEFAULT_DENSITY: UIDensity = UIDensity.Comfortable;

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Get density theme by level
 */
export function getDensityTheme(density: UIDensity): DensityTheme {
  return densityConfig[density];
}

/**
 * Apply density styles to component
 */
export function applyDensity(density: UIDensity): {
  padding: number;
  paddingX: number;
  paddingY: number;
  gap: number;
  fontSize: string;
  lineHeight: number;
  borderRadius: number;
} {
  const theme = getDensityTheme(density);

  return {
    padding: theme.componentPadding,
    paddingX: theme.componentPaddingX,
    paddingY: theme.componentPaddingY,
    gap: theme.componentGap,
    fontSize: theme.fontSize.base,
    lineHeight: theme.lineHeight,
    borderRadius: theme.componentBorderRadius,
  };
}

/**
 * Get component-specific styles
 */
export function getDensityStyles(
  density: UIDensity,
  component: 'button' | 'input' | 'card' | 'table' | 'chip'
) {
  const theme = getDensityTheme(density);
  return theme[component];
}

/**
 * Convert density to Material-UI size prop
 */
export function densityToMuiSize(density: UIDensity): 'small' | 'medium' | 'large' {
  switch (density) {
    case UIDensity.Compact:
      return 'small';
    case UIDensity.Spacious:
      return 'large';
    default:
      return 'medium';
  }
}

/**
 * Get spacing value for density level
 */
export function getSpacing(density: UIDensity, size: keyof DensityTheme['spacing']): number {
  const theme = getDensityTheme(density);
  return theme.spacing[size];
}

/**
 * Get font size for density level
 */
export function getFontSize(density: UIDensity, size: keyof DensityTheme['fontSize']): string {
  const theme = getDensityTheme(density);
  return theme.fontSize[size];
}

/**
 * Get icon size for density level
 */
export function getIconSize(density: UIDensity, size: 'sm' | 'md' | 'lg'): number {
  const theme = getDensityTheme(density);
  return theme.icon.size[size];
}

// =====================================================
// CSS-IN-JS UTILITIES
// =====================================================

/**
 * Generate CSS variables for density theme
 */
export function generateDensityCSSVars(density: UIDensity): Record<string, string | number> {
  const theme = getDensityTheme(density);

  return {
    '--density-padding': `${theme.componentPadding}px`,
    '--density-padding-x': `${theme.componentPaddingX}px`,
    '--density-padding-y': `${theme.componentPaddingY}px`,
    '--density-gap': `${theme.componentGap}px`,
    '--density-border-radius': `${theme.componentBorderRadius}px`,
    '--density-font-size': theme.fontSize.base,
    '--density-line-height': theme.lineHeight,
    '--density-spacing-xs': `${theme.spacing.xs}px`,
    '--density-spacing-sm': `${theme.spacing.sm}px`,
    '--density-spacing-md': `${theme.spacing.md}px`,
    '--density-spacing-lg': `${theme.spacing.lg}px`,
    '--density-spacing-xl': `${theme.spacing.xl}px`,
    '--density-spacing-2xl': `${theme.spacing['2xl']}px`,
  };
}

/**
 * Generate inline styles for density
 */
export function generateDensityStyles(density: UIDensity): React.CSSProperties {
  const theme = getDensityTheme(density);

  return {
    padding: `${theme.componentPadding}px`,
    gap: `${theme.componentGap}px`,
    fontSize: theme.fontSize.base,
    lineHeight: theme.lineHeight,
    borderRadius: `${theme.componentBorderRadius}px`,
  };
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  UIDensity,
  densityConfig,
  DEFAULT_DENSITY,
  getDensityTheme,
  applyDensity,
  getDensityStyles,
  densityToMuiSize,
  getSpacing,
  getFontSize,
  getIconSize,
  generateDensityCSSVars,
  generateDensityStyles,
};
