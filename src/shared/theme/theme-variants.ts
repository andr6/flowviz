export const createThemeVariants = () => {
  const baseTheme = {
    // Typography system
    typography: {
      fontFamily: {
        primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: '"JetBrains Mono", "Fira Code", "Monaco", "Cascadia Code", monospace',
        mono: '"JetBrains Mono", "Fira Code", "Monaco", monospace',
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem', 
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      fontWeight: {
        thin: 100,
        extralight: 200,
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800,
        black: 900,
      },
      lineHeight: {
        tight: 1.25,
        snug: 1.375,
        normal: 1.5,
        relaxed: 1.625,
        loose: 2,
      },
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0em',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
      },
    },

    // Spacing system
    spacing: {
      0: 0,
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
      11: 44,
      12: 48,
      14: 56,
      16: 64,
      20: 80,
      24: 96,
      28: 112,
      32: 128,
    },

    // Border radius system
    borderRadius: {
      none: 0,
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      '2xl': 20,
      '3xl': 24,
      full: 9999,
    },

    // Motion system
    motion: {
      fast: '0.15s cubic-bezier(0.4, 0, 0.2, 1)',
      normal: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      slow: '0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      spring: '0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    },

    // Effects system
    effects: {
      blur: {
        none: 'blur(0px)',
        xs: 'blur(2px)',
        sm: 'blur(4px)',
        md: 'blur(8px)',
        lg: 'blur(16px)',
        xl: 'blur(24px)',
        '2xl': 'blur(40px)',
        '3xl': 'blur(64px)',
        light: 'blur(6px)',
        standard: 'blur(12px)',
        heavy: 'blur(20px)',
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
        brandGlow: '0 0 20px rgba(0, 225, 255, 0.4)',
        successGlow: '0 0 20px rgba(76, 175, 80, 0.4)',
        errorGlow: '0 0 20px rgba(239, 68, 68, 0.4)',
      },
      gradients: {
        brand: 'linear-gradient(135deg, #0066ff 0%, #1976d2 100%)',
        brandHover: 'linear-gradient(135deg, #0052cc 0%, #1565c0 100%)',
        threat: 'linear-gradient(135deg, #ff6b35 0%, #dc2626 100%)',
        success: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)',
        neutral: 'linear-gradient(135deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.02) 100%)',
        light: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
        glass: 'linear-gradient(135deg, rgba(0, 0, 0, 0.03) 0%, rgba(0, 0, 0, 0.01) 100%)',
      },
    },
  };

  // Dark theme (current ThreatFlow theme)
  const darkTheme = {
    ...baseTheme,
    colors: {
      // Background system
      background: {
        primary: '#080a0f',
        secondary: '#0f1419',
        tertiary: '#1a1f26',
        quaternary: '#252b33',
        glass: 'rgba(8, 10, 15, 0.96)',
        glassLight: 'rgba(15, 20, 25, 0.94)',
        glassHeavy: 'rgba(8, 10, 15, 0.98)',
        overlay: 'rgba(0, 0, 0, 0.75)',
        overlayLight: 'rgba(0, 0, 0, 0.5)',
      },

      // Brand colors
      brand: {
        primary: '#00e1ff',
        primaryDim: '#00b8cc',
        secondary: '#1976d2',
        accent: '#ff7043',
        critical: '#e91e63',
        dark: '#0a1a2e',
        light: 'rgba(0, 225, 255, 0.08)',
        lightMedium: 'rgba(0, 225, 255, 0.15)',
      },

      // Menu/Dropdown system
      menu: {
        appBar: 'rgba(8, 10, 15, 0.98)',
        dialog: 'rgba(15, 20, 25, 0.96)',
        contextMenu: 'rgba(26, 31, 38, 0.95)',
      },

      // Surface states
      surface: {
        rest: 'rgba(255, 255, 255, 0.03)',
        hover: 'rgba(0, 225, 255, 0.08)',
        active: 'rgba(0, 225, 255, 0.15)',
        focus: 'rgba(0, 225, 255, 0.12)',
        selected: 'rgba(0, 225, 255, 0.18)',
        pressed: 'rgba(0, 225, 255, 0.20)',
        disabled: 'rgba(255, 255, 255, 0.01)',
        
        border: {
          subtle: 'rgba(255, 255, 255, 0.06)',
          default: 'rgba(255, 255, 255, 0.10)',
          emphasis: 'rgba(0, 225, 255, 0.35)',
          focus: 'rgba(0, 225, 255, 0.65)',
          threat: 'rgba(255, 112, 67, 0.45)',
          critical: 'rgba(233, 30, 99, 0.45)',
          success: 'rgba(76, 175, 80, 0.45)',
          warning: 'rgba(255, 152, 0, 0.45)',
        }
      },

      // Text hierarchy
      text: {
        primary: 'rgba(255, 255, 255, 0.98)',
        secondary: 'rgba(255, 255, 255, 0.87)',
        tertiary: 'rgba(255, 255, 255, 0.70)',
        quaternary: 'rgba(255, 255, 255, 0.52)',
        disabled: 'rgba(255, 255, 255, 0.30)',
        inverse: 'rgba(8, 10, 15, 0.90)',
        brand: '#00e1ff',
        brandSecondary: '#00b8cc',
        threat: '#ff7043',
        critical: '#e91e63',
        success: '#4caf50',
        warning: '#ff9800',
        info: '#2196f3',
      },

      // Status colors
      status: {
        success: {
          bg: 'rgba(34, 197, 94, 0.1)',
          text: 'rgba(34, 197, 94, 0.95)',
          border: 'rgba(34, 197, 94, 0.25)',
          accent: '#22c55e',
          glow: '0 0 20px rgba(34, 197, 94, 0.3)',
        },
        error: {
          bg: 'rgba(239, 68, 68, 0.1)',
          text: 'rgba(239, 68, 68, 0.95)',
          border: 'rgba(239, 68, 68, 0.25)',
          accent: '#ef4444',
          glow: '0 0 20px rgba(239, 68, 68, 0.3)',
        },
        warning: {
          bg: 'rgba(245, 158, 11, 0.1)',
          text: 'rgba(245, 158, 11, 0.95)',
          border: 'rgba(245, 158, 11, 0.25)',
          accent: '#f59e0b',
          glow: '0 0 20px rgba(245, 158, 11, 0.3)',
        },
        info: {
          bg: 'rgba(59, 130, 246, 0.1)',
          text: 'rgba(59, 130, 246, 0.95)',
          border: 'rgba(59, 130, 246, 0.25)',
          accent: '#3b82f6',
          glow: '0 0 20px rgba(59, 130, 246, 0.3)',
        },
      },

      // Accent colors
      accent: {
        secure: '#4caf50',
        threat: '#ff7043',
        critical: '#e91e63',
        info: '#2196f3',
        warning: '#ff9800',
        neutral: '#9e9e9e',
      },

      effects: {
        shadows: {
          sm: '0 1px 2px rgba(0, 0, 0, 0.08)',
          md: '0 4px 6px rgba(0, 0, 0, 0.1)',
          lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
          xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
          brandGlow: '0 0 20px rgba(0, 102, 255, 0.3)',
          successGlow: '0 0 20px rgba(22, 163, 74, 0.3)',
          errorGlow: '0 0 20px rgba(220, 38, 38, 0.3)',
        },
      },
    },
  };

  // Light theme - Modern bright white cybersecurity design
  const lightTheme = {
    ...baseTheme,
    colors: {
      // Background system - Clean white with professional depth
      background: {
        primary: '#ffffff',
        secondary: '#fafbfc',
        tertiary: '#f4f6f8',
        quaternary: '#eef2f6',
        glass: 'rgba(255, 255, 255, 0.97)',
        glassLight: 'rgba(250, 251, 252, 0.98)',
        glassHeavy: 'rgba(255, 255, 255, 0.99)',
        overlay: 'rgba(0, 0, 0, 0.4)',
        overlayLight: 'rgba(0, 0, 0, 0.15)',
      },

      // Brand colors - Cyber blue theme for cybersecurity
      brand: {
        primary: '#0066ff',
        primaryDim: '#0052cc',
        secondary: '#1976d2',
        accent: '#ff6b35',
        critical: '#dc2626',
        dark: '#0f1729',
        light: 'rgba(0, 102, 255, 0.08)',
        lightMedium: 'rgba(0, 102, 255, 0.12)',
      },

      // Menu/Dropdown system
      menu: {
        appBar: 'rgba(255, 255, 255, 0.98)',
        dialog: 'rgba(248, 250, 252, 0.98)',
        contextMenu: 'rgba(241, 245, 249, 0.98)',
      },

      // Surface states - Cyber blue interactions
      surface: {
        rest: 'rgba(0, 0, 0, 0.03)',
        hover: 'rgba(0, 102, 255, 0.06)',
        active: 'rgba(0, 102, 255, 0.12)',
        focus: 'rgba(0, 102, 255, 0.15)',
        selected: 'rgba(0, 102, 255, 0.18)',
        pressed: 'rgba(0, 102, 255, 0.22)',
        disabled: 'rgba(0, 0, 0, 0.02)',
        
        border: {
          subtle: 'rgba(0, 0, 0, 0.08)',
          default: 'rgba(0, 0, 0, 0.12)',
          emphasis: 'rgba(0, 102, 255, 0.5)',
          focus: 'rgba(0, 102, 255, 0.8)',
          threat: 'rgba(255, 107, 53, 0.6)',
          critical: 'rgba(220, 38, 38, 0.6)',
          success: 'rgba(22, 163, 74, 0.6)',
          warning: 'rgba(217, 119, 6, 0.6)',
        }
      },

      // Text hierarchy - Optimized for readability
      text: {
        primary: 'rgba(15, 23, 42, 0.95)',
        secondary: 'rgba(51, 65, 85, 0.85)',
        tertiary: 'rgba(100, 116, 139, 0.75)',
        quaternary: 'rgba(148, 163, 184, 0.65)',
        disabled: 'rgba(148, 163, 184, 0.45)',
        inverse: 'rgba(255, 255, 255, 0.95)',
        brand: '#0066ff',
        brandSecondary: '#0052cc',
        threat: '#ff6b35',
        critical: '#dc2626',
        success: '#16a34a',
        warning: '#d97706',
        info: '#2563eb',
      },

      // Status colors - Enhanced for bright cybersecurity interface
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
      },

      // Accent colors - Cybersecurity focused
      accent: {
        secure: '#16a34a',
        threat: '#ff6b35',
        critical: '#dc2626',
        info: '#2563eb',
        warning: '#d97706',
        neutral: '#6b7280',
      },

      effects: {
        shadows: {
          sm: '0 1px 3px rgba(0, 0, 0, 0.12)',
          md: '0 4px 8px rgba(0, 0, 0, 0.1)',
          lg: '0 10px 20px rgba(0, 0, 0, 0.12)',
          xl: '0 20px 30px rgba(0, 0, 0, 0.15)',
          brandGlow: '0 0 25px rgba(0, 102, 255, 0.3)',
          successGlow: '0 0 25px rgba(22, 163, 74, 0.3)',
          errorGlow: '0 0 25px rgba(220, 38, 38, 0.3)',
        },
      },
    },
  };

  return {
    dark: darkTheme,
    light: lightTheme,
  };
};

export type ThemeVariant = 'dark' | 'light';
export type ThreatFlowTheme = ReturnType<typeof createThemeVariants>['dark'];