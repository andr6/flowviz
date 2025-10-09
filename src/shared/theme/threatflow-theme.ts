import { createThemeVariants } from './theme-variants';

// Updated to use bright white theme as default for the new design system
export const threatFlowTheme = createThemeVariants().light;

// Export both variants for new code
export const { dark: darkTheme, light: lightTheme } = createThemeVariants();

// Modern bright white design system - Professional cybersecurity interface
export const legacyThreatFlowTheme = {
  // Professional cybersecurity color palette - Optimized for bright white interface
  colors: {
    // Background system - Clean white with subtle variations for depth
    background: {
      primary: '#ffffff',           // Pure white primary background
      secondary: '#fafbfc',         // Subtle off-white for elevated surfaces
      tertiary: '#f4f6f8',          // Light gray for card backgrounds
      quaternary: '#eef2f6',        // Subtle gray for high-level surfaces
      glass: 'rgba(255, 255, 255, 0.97)', // Clean glass morphism
      glassLight: 'rgba(250, 251, 252, 0.98)', // Lighter glass variant
      glassHeavy: 'rgba(255, 255, 255, 0.99)', // Heavy glass for critical surfaces
      overlay: 'rgba(0, 0, 0, 0.4)',   // Modal overlays for bright theme
      overlayLight: 'rgba(0, 0, 0, 0.15)', // Lighter overlay variant
    },

    // Professional brand colors - Cybersecurity blue theme for bright interface
    brand: {
      primary: '#0066ff',           // Cyber blue primary - strong and professional
      primaryDim: '#0052cc',        // Dimmed variant for subtle uses
      secondary: '#1976d2',         // Professional blue secondary
      accent: '#ff6b35',            // Security orange accent
      critical: '#dc2626',          // Critical red for alerts
      dark: '#0f1729',             // Dark blue for contrast
      light: 'rgba(0, 102, 255, 0.08)', // Subtle brand background
      lightMedium: 'rgba(0, 102, 255, 0.12)', // Medium brand background
    },

    // Menu/Dropdown system - Clean white with subtle shadows
    menu: {
      appBar: 'rgba(255, 255, 255, 0.98)',      // Clean white app bar
      dialog: 'rgba(250, 251, 252, 0.98)',      // Subtle dialog background
      contextMenu: 'rgba(244, 246, 248, 0.98)', // Context menu background
    },

    // Enhanced surface states - Optimized for bright cybersecurity interface
    surface: {
      // Interactive states with cyber blue integration
      rest: 'rgba(0, 0, 0, 0.03)',            // Subtle surface for rest state
      hover: 'rgba(0, 102, 255, 0.06)',       // Cyber blue hover state
      active: 'rgba(0, 102, 255, 0.12)',      // Active state with cyber blue
      focus: 'rgba(0, 102, 255, 0.15)',       // Focus indication
      selected: 'rgba(0, 102, 255, 0.18)',    // Selected item state
      pressed: 'rgba(0, 102, 255, 0.22)',     // Pressed/clicked state
      disabled: 'rgba(0, 0, 0, 0.02)',        // Disabled surface state
      
      // Professional borders - Clear contrast for bright interface
      border: {
        subtle: 'rgba(0, 0, 0, 0.08)',          // Subtle borders
        default: 'rgba(0, 0, 0, 0.12)',         // Default borders
        emphasis: 'rgba(0, 102, 255, 0.5)',     // Cyber blue emphasis
        focus: 'rgba(0, 102, 255, 0.8)',        // Strong focus borders
        threat: 'rgba(255, 107, 53, 0.6)',      // Threat indicator
        critical: 'rgba(220, 38, 38, 0.6)',     // Critical alert borders
        success: 'rgba(22, 163, 74, 0.6)',      // Success state borders
        warning: 'rgba(217, 119, 6, 0.6)',      // Warning state borders
      }
    },

    // Enhanced text hierarchy - Optimized for bright interface readability
    text: {
      primary: 'rgba(15, 23, 42, 0.95)',      // Dark text for maximum contrast
      secondary: 'rgba(51, 65, 85, 0.85)',    // Secondary text with good contrast
      tertiary: 'rgba(100, 116, 139, 0.75)',  // Subtle text for less important content
      quaternary: 'rgba(148, 163, 184, 0.65)', // Very subtle text
      disabled: 'rgba(148, 163, 184, 0.45)',   // Disabled state visibility
      inverse: 'rgba(255, 255, 255, 0.95)',    // White text for dark backgrounds
      brand: '#0066ff',                         // Cyber blue brand text
      brandSecondary: '#0052cc',               // Secondary brand text
      threat: '#ff6b35',                       // Security orange threat text
      critical: '#dc2626',                     // Critical red text
      success: '#16a34a',                      // Success green text
      warning: '#d97706',                      // Warning amber text
      info: '#2563eb',                         // Information blue text
    },

    // Professional status colors for bright cybersecurity interface
    status: {
      success: {
        bg: 'rgba(22, 163, 74, 0.08)',
        text: 'rgba(22, 163, 74, 0.95)',
        border: 'rgba(22, 163, 74, 0.3)',
        accent: '#16a34a',
        glow: '0 0 20px rgba(22, 163, 74, 0.25)',
      },
      error: {
        bg: 'rgba(220, 38, 38, 0.08)',
        text: 'rgba(220, 38, 38, 0.95)', 
        border: 'rgba(220, 38, 38, 0.3)',
        accent: '#dc2626',
        glow: '0 0 20px rgba(220, 38, 38, 0.25)',
      },
      warning: {
        bg: 'rgba(217, 119, 6, 0.08)',
        text: 'rgba(217, 119, 6, 0.95)',
        border: 'rgba(217, 119, 6, 0.3)', 
        accent: '#d97706',
        glow: '0 0 20px rgba(217, 119, 6, 0.25)',
      },
      info: {
        bg: 'rgba(37, 99, 235, 0.08)',
        text: 'rgba(37, 99, 235, 0.95)',
        border: 'rgba(37, 99, 235, 0.3)',
        accent: '#2563eb',
        glow: '0 0 20px rgba(37, 99, 235, 0.25)',
      },
      critical: {
        bg: 'rgba(220, 38, 38, 0.08)',
        text: 'rgba(220, 38, 38, 0.95)',
        border: 'rgba(220, 38, 38, 0.3)',
        accent: '#dc2626',
        glow: '0 0 20px rgba(220, 38, 38, 0.25)',
      }
    },

    // Cybersecurity-focused accent colors - Bright interface optimized
    accent: {
      electric: '#0066ff',      // Primary cyber blue
      cyber: '#10b981',         // Cyber green for security indicators
      matrix: '#059669',        // Matrix/terminal green for data flows
      threat: '#ff6b35',        // Security orange for threats
      critical: '#dc2626',      // Critical red for alerts
      secure: '#16a34a',        // Secure green
      warning: '#d97706',       // Warning amber
      info: '#2563eb',          // Information blue
      purple: '#7c3aed',        // Analysis purple
      neural: '#0891b2',        // Neural network cyan
      anomaly: '#ea580c',       // Anomaly detection orange
      forensic: '#6366f1',      // Digital forensics indigo
    },

    // Professional node colors for MITRE ATT&CK visualization - Bright theme
    nodes: {
      initial: 'rgba(0, 102, 255, 0.15)',     // Initial access - cyber blue
      reconnaissance: 'rgba(99, 102, 241, 0.15)', // Reconnaissance - indigo
      technique: 'rgba(124, 58, 237, 0.15)',   // Technique nodes - purple
      malware: 'rgba(220, 38, 38, 0.15)',      // Malware indicators - red
      tool: 'rgba(22, 163, 74, 0.15)',         // Tool usage - green
      operator: 'rgba(217, 119, 6, 0.15)',     // Threat actor - orange
      impact: 'rgba(220, 38, 38, 0.15)',       // Impact assessment - red
      persistence: 'rgba(234, 88, 12, 0.15)',  // Persistence - orange
      privilege: 'rgba(120, 113, 108, 0.15)',  // Privilege escalation - stone
      defense: 'rgba(100, 116, 139, 0.15)',    // Defense evasion - slate
      credential: 'rgba(37, 99, 235, 0.15)',   // Credential access - blue
      discovery: 'rgba(8, 145, 178, 0.15)',    // Discovery - cyan
      lateral: 'rgba(101, 163, 13, 0.15)',     // Lateral movement - lime
      collection: 'rgba(202, 138, 4, 0.15)',   // Collection - yellow
      exfiltration: 'rgba(236, 72, 153, 0.15)', // Data exfiltration - pink
      command: 'rgba(124, 58, 237, 0.15)',     // Command & control - purple
    }
  },

  // Professional typography system - Enhanced readability and hierarchy
  typography: {
    // Professional font families
    fontFamily: {
      primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", "Roboto Mono", monospace',
      display: '"Inter Display", -apple-system, BlinkMacSystemFont, sans-serif',
    },
    
    // Enhanced font size scale
    fontSize: {
      xs: '0.6875rem',    // 11px - Very small labels
      sm: '0.8125rem',    // 13px - Small text 
      md: '0.9375rem',    // 15px - Base size (optimized for readability)
      lg: '1.0625rem',    // 17px - Emphasized text
      xl: '1.1875rem',    // 19px - Large text
      '2xl': '1.375rem',  // 22px - Headings
      '3xl': '1.75rem',   // 28px - Section headings
      '4xl': '2.1875rem', // 35px - Page titles
      '5xl': '2.8125rem', // 45px - Display text
      '6xl': '3.5rem',    // 56px - Large display
      '7xl': '4.375rem',  // 70px - Hero text
    },
    
    // Professional font weights
    fontWeight: {
      thin: 100,
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    },
    
    // Enhanced line heights for better readability
    lineHeight: {
      none: 1,
      tight: 1.125,
      snug: 1.25,
      normal: 1.375,
      relaxed: 1.5,
      loose: 1.75,
    },
    
    // Professional letter spacing
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em', 
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },

  // Professional layout system
  spacing: {
    0: 0,
    px: 1,
    0.5: 2,
    1: 4,
    1.5: 6,
    2: 8,
    2.5: 10,
    3: 12,
    3.5: 14,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    12: 48,
    14: 56,
    16: 64,
    20: 80,
    24: 96,
    28: 112,
    32: 128,
  },

  // Professional border radius system
  borderRadius: {
    none: 0,
    xs: 2,     // Minimal radius
    sm: 4,     // Small elements
    md: 6,     // Standard buttons, inputs
    lg: 8,     // Cards and surfaces
    xl: 12,    // Major containers
    '2xl': 16, // Large dialogs
    '3xl': 24, // Hero elements
    full: '9999px', // Fully rounded
  },

  // Enhanced professional effects
  effects: {
    // Advanced blur system
    blur: {
      none: 'blur(0px)',
      xs: 'blur(2px)',
      sm: 'blur(4px)',
      md: 'blur(8px)',
      lg: 'blur(16px)',
      xl: 'blur(24px)',
      '2xl': 'blur(40px)',
      '3xl': 'blur(64px)',
    },
    
    // Professional shadow system for bright interface
    shadows: {
      none: 'none',
      xs: '0 1px 2px rgba(0, 0, 0, 0.08)',
      sm: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)',
      md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.08)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.12), 0 4px 6px rgba(0, 0, 0, 0.08)',
      xl: '0 20px 25px rgba(0, 0, 0, 0.15), 0 10px 10px rgba(0, 0, 0, 0.06)',
      '2xl': '0 25px 50px rgba(0, 0, 0, 0.25)',
      inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.08)',
      // Cybersecurity-themed glows for bright theme
      brandGlow: '0 0 20px rgba(0, 102, 255, 0.3)',
      threatGlow: '0 0 20px rgba(255, 107, 53, 0.3)',
      criticalGlow: '0 0 20px rgba(220, 38, 38, 0.3)',
      successGlow: '0 0 20px rgba(22, 163, 74, 0.3)',
    },
    
    // Professional gradients for bright interface
    gradients: {
      brand: 'linear-gradient(135deg, #0066ff 0%, #1976d2 100%)',
      threat: 'linear-gradient(135deg, #ff6b35 0%, #dc2626 100%)',
      success: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)',
      neutral: 'linear-gradient(135deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.02) 100%)',
      light: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
    },
  },

  // Professional animation system
  motion: {
    // Durations
    duration: {
      instant: '0ms',
      fast: '150ms',
      normal: '250ms',
      slow: '400ms',
      slower: '600ms',
    },
    
    // Professional easing curves
    easing: {
      linear: 'linear',
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)', 
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
    
    // Combined motion tokens
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // Z-index management
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modal: 1300,
    popover: 1400,
    tooltip: 1500,
    notification: 1600,
    max: 9999,
  },
} as const;

// Professional glass morphism utility - Enhanced for bright cybersecurity UI
export const createGlassStyle = (opacity = 0.97, blur = 'md', variant: 'light' | 'medium' | 'heavy' = 'medium') => {
  const backgrounds = {
    light: `rgba(250, 251, 252, ${opacity})`,
    medium: `rgba(255, 255, 255, ${opacity})`,
    heavy: `rgba(255, 255, 255, ${Math.min(opacity + 0.02, 0.99)})`,
  };

  return {
    background: backgrounds[variant],
    border: `1px solid ${threatFlowTheme.colors.surface.border.default}`, 
    borderRadius: threatFlowTheme.borderRadius.lg,
    backdropFilter: threatFlowTheme.effects.blur[blur as keyof typeof threatFlowTheme.effects.blur],
    boxShadow: threatFlowTheme.effects.shadows.lg,
    // Enhanced glass effects for bright professional appearance
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '1px',
      background: `linear-gradient(90deg, transparent, ${threatFlowTheme.colors.surface.border.subtle}, transparent)`,
      pointerEvents: 'none',
    },
  };
};

// Enhanced interactive element styling
export const createInteractiveStyle = (variant: 'subtle' | 'brand' | 'glass' = 'subtle') => {
  const baseStyle = {
    borderRadius: threatFlowTheme.borderRadius.md,
    transition: `all ${threatFlowTheme.motion.normal}`,
    cursor: 'pointer',
    position: 'relative' as const,
  };

  switch (variant) {
    case 'brand':
      return {
        ...baseStyle,
        background: threatFlowTheme.effects.gradients.brand,
        border: `1px solid ${threatFlowTheme.colors.brand.primary}`,
        color: threatFlowTheme.colors.text.primary,
        '&:hover': {
          boxShadow: threatFlowTheme.effects.shadows.brandGlow,
          transform: 'translateY(-1px)',
        },
        '&:active': {
          transform: 'translateY(0px)',
        }
      };
    case 'glass':
      return {
        ...baseStyle,
        backgroundColor: threatFlowTheme.colors.surface.rest,
        border: `1px solid ${threatFlowTheme.colors.surface.border.subtle}`,
        backdropFilter: threatFlowTheme.effects.blur.md,
        '&:hover': {
          backgroundColor: threatFlowTheme.colors.surface.hover,
          borderColor: threatFlowTheme.colors.surface.border.emphasis,
          transform: 'translateY(-1px)',
        },
        '&:active': {
          transform: 'translateY(0px)',
        }
      };
    default:
      return {
        ...baseStyle,
        backgroundColor: threatFlowTheme.colors.surface.rest,
        border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
        '&:hover': {
          backgroundColor: threatFlowTheme.colors.surface.hover,
          borderColor: threatFlowTheme.colors.surface.border.emphasis,
          transform: 'translateY(-1px)',
        },
        '&:active': {
          transform: 'translateY(0px)',
        }
      };
  }
};

// Professional status styling with glow effects
export const createStatusStyle = (status: 'success' | 'error' | 'warning' | 'info' | 'critical', withGlow = false) => ({
  backgroundColor: threatFlowTheme.colors.status[status].bg,
  color: threatFlowTheme.colors.status[status].text,
  border: `1px solid ${threatFlowTheme.colors.status[status].border}`,
  borderRadius: threatFlowTheme.borderRadius.md,
  backdropFilter: threatFlowTheme.effects.blur.sm,
  ...(withGlow && {
    boxShadow: threatFlowTheme.colors.status[status].glow,
  }),
});

// Enhanced typography utility with professional font families
export const createTypographyStyle = (
  size: keyof typeof threatFlowTheme.typography.fontSize,
  weight?: keyof typeof threatFlowTheme.typography.fontWeight,
  lineHeight?: keyof typeof threatFlowTheme.typography.lineHeight,
  letterSpacing?: keyof typeof threatFlowTheme.typography.letterSpacing,
  family: 'primary' | 'mono' | 'display' = 'primary'
) => ({
  fontSize: threatFlowTheme.typography.fontSize[size],
  fontWeight: weight ? threatFlowTheme.typography.fontWeight[weight] : threatFlowTheme.typography.fontWeight.normal,
  lineHeight: lineHeight ? threatFlowTheme.typography.lineHeight[lineHeight] : threatFlowTheme.typography.lineHeight.normal,
  letterSpacing: letterSpacing ? threatFlowTheme.typography.letterSpacing[letterSpacing] : threatFlowTheme.typography.letterSpacing.normal,
  fontFamily: threatFlowTheme.typography.fontFamily[family],
});

// Professional scrollbar styling
export const createScrollbarStyle = (width = '6px', variant: 'subtle' | 'brand' = 'subtle') => ({
  '&::-webkit-scrollbar': {
    width,
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
    borderRadius: width,
  },
  '&::-webkit-scrollbar-thumb': {
    background: variant === 'brand' 
      ? 'rgba(0, 212, 255, 0.3)' 
      : 'rgba(255, 255, 255, 0.1)',
    borderRadius: width,
    transition: threatFlowTheme.motion.fast,
    '&:hover': {
      background: variant === 'brand' 
        ? 'rgba(0, 212, 255, 0.5)' 
        : 'rgba(255, 255, 255, 0.2)',
    },
  },
  '&::-webkit-scrollbar-thumb:active': {
    background: variant === 'brand' 
      ? 'rgba(0, 212, 255, 0.7)' 
      : 'rgba(255, 255, 255, 0.3)',
  },
  // Firefox support
  scrollbarWidth: 'thin',
  scrollbarColor: variant === 'brand' 
    ? 'rgba(0, 212, 255, 0.3) transparent' 
    : 'rgba(255, 255, 255, 0.1) transparent',
});

// Professional card styling utility for bright interface
export const createCardStyle = (elevation: 'low' | 'medium' | 'high' = 'medium', interactive = false) => ({
  backgroundColor: threatFlowTheme.colors.background.secondary,
  border: `1px solid ${threatFlowTheme.colors.surface.border.subtle}`,
  borderRadius: threatFlowTheme.borderRadius.lg,
  backdropFilter: threatFlowTheme.effects.blur.sm,
  boxShadow: threatFlowTheme.effects.shadows[elevation === 'low' ? 'sm' : elevation === 'high' ? 'xl' : 'md'],
  overflow: 'hidden' as const,
  ...(interactive && {
    cursor: 'pointer',
    transition: threatFlowTheme.motion.normal,
    '&:hover': {
      borderColor: threatFlowTheme.colors.surface.border.emphasis,
      transform: 'translateY(-2px)',
      boxShadow: threatFlowTheme.effects.shadows.xl,
      backgroundColor: threatFlowTheme.colors.background.primary,
    },
  }),
});

// Professional threat intelligence card styling utility
export const createThreatIntelCard = (threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium', interactive = true) => {
  const threatColors = {
    low: { 
      border: threatFlowTheme.colors.accent.secure, 
      glow: '0 0 20px rgba(76, 175, 80, 0.2)',
      accent: 'rgba(76, 175, 80, 0.1)' 
    },
    medium: { 
      border: threatFlowTheme.colors.accent.warning, 
      glow: '0 0 20px rgba(255, 152, 0, 0.2)',
      accent: 'rgba(255, 152, 0, 0.1)' 
    },
    high: { 
      border: threatFlowTheme.colors.accent.threat, 
      glow: '0 0 20px rgba(255, 112, 67, 0.3)',
      accent: 'rgba(255, 112, 67, 0.1)' 
    },
    critical: { 
      border: threatFlowTheme.colors.accent.critical, 
      glow: '0 0 20px rgba(233, 30, 99, 0.3)',
      accent: 'rgba(233, 30, 99, 0.1)' 
    },
  };

  const threat = threatColors[threatLevel];

  return {
    backgroundColor: threatFlowTheme.colors.background.secondary,
    border: `1px solid ${threat.border}33`, // 20% opacity
    borderRadius: threatFlowTheme.borderRadius.lg,
    backdropFilter: threatFlowTheme.effects.blur.md,
    boxShadow: `${threatFlowTheme.effects.shadows.md}, ${threat.glow}`,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    
    // Threat level indicator stripe
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '3px',
      background: `linear-gradient(90deg, ${threat.border}, ${threat.border}88)`,
      boxShadow: `0 0 8px ${threat.border}66`,
    },
    
    // Subtle threat accent background
    '&::after': {
      content: '""',
      position: 'absolute',
      top: '3px',
      left: 0,
      right: 0,
      bottom: 0,
      background: `radial-gradient(ellipse at top right, ${threat.accent} 0%, transparent 60%)`,
      pointerEvents: 'none',
    },

    ...(interactive && {
      cursor: 'pointer',
      transition: threatFlowTheme.motion.normal,
      '&:hover': {
        borderColor: `${threat.border}66`,
        transform: 'translateY(-2px)',
        boxShadow: `${threatFlowTheme.effects.shadows.xl}, ${threat.glow.replace('0.2', '0.4').replace('0.3', '0.5')}`,
      },
    }),
  };
};

// Professional button variant utility
export const createButtonStyle = (variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary', size: 'sm' | 'md' | 'lg' = 'md') => {
  const sizeStyles = {
    sm: {
      padding: `${threatFlowTheme.spacing[2]}px ${threatFlowTheme.spacing[3]}px`,
      fontSize: threatFlowTheme.typography.fontSize.sm,
      borderRadius: threatFlowTheme.borderRadius.sm,
    },
    md: {
      padding: `${threatFlowTheme.spacing[2.5]}px ${threatFlowTheme.spacing[4]}px`,
      fontSize: threatFlowTheme.typography.fontSize.md,
      borderRadius: threatFlowTheme.borderRadius.md,
    },
    lg: {
      padding: `${threatFlowTheme.spacing[3]}px ${threatFlowTheme.spacing[6]}px`,
      fontSize: threatFlowTheme.typography.fontSize.lg,
      borderRadius: threatFlowTheme.borderRadius.lg,
    },
  };

  const baseStyle = {
    ...sizeStyles[size],
    fontFamily: threatFlowTheme.typography.fontFamily.primary,
    fontWeight: threatFlowTheme.typography.fontWeight.medium,
    transition: threatFlowTheme.motion.normal,
    cursor: 'pointer',
    border: 'none',
    outline: 'none',
    position: 'relative' as const,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: threatFlowTheme.spacing[2],
    textDecoration: 'none',
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  };

  switch (variant) {
    case 'primary':
      return {
        ...baseStyle,
        background: threatFlowTheme.effects.gradients.brand,
        color: threatFlowTheme.colors.text.primary,
        '&:hover:not(:disabled)': {
          boxShadow: threatFlowTheme.effects.shadows.brandGlow,
          transform: 'translateY(-1px)',
        },
        '&:active:not(:disabled)': {
          transform: 'translateY(0)',
        },
      };
    case 'secondary':
      return {
        ...baseStyle,
        backgroundColor: threatFlowTheme.colors.surface.rest,
        color: threatFlowTheme.colors.text.primary,
        border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
        '&:hover:not(:disabled)': {
          backgroundColor: threatFlowTheme.colors.surface.hover,
          borderColor: threatFlowTheme.colors.surface.border.emphasis,
          transform: 'translateY(-1px)',
        },
        '&:active:not(:disabled)': {
          transform: 'translateY(0)',
        },
      };
    case 'ghost':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        color: threatFlowTheme.colors.text.secondary,
        '&:hover:not(:disabled)': {
          backgroundColor: threatFlowTheme.colors.surface.hover,
          color: threatFlowTheme.colors.text.primary,
        },
        '&:active:not(:disabled)': {
          backgroundColor: threatFlowTheme.colors.surface.active,
        },
      };
    case 'danger':
      return {
        ...baseStyle,
        background: threatFlowTheme.effects.gradients.threat,
        color: threatFlowTheme.colors.text.primary,
        '&:hover:not(:disabled)': {
          boxShadow: threatFlowTheme.effects.shadows.threatGlow,
          transform: 'translateY(-1px)',
        },
        '&:active:not(:disabled)': {
          transform: 'translateY(0)',
        },
      };
    default:
      return baseStyle;
  }
};