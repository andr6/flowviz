import {
  Button,
  IconButton,
  ButtonProps,
  IconButtonProps,
  styled,
  Box,
  keyframes,
} from '@mui/material';
import React from 'react';

import { threatFlowTheme } from '../../theme/threatflow-theme';

// ============= Animation Keyframes =============

const shimmer = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

const dotPattern = keyframes`
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 8px 8px;
  }
`;

// ============= Glass Icon Button =============

export const GlassIconButton = styled(IconButton)<IconButtonProps>({
  color: threatFlowTheme.colors.text.secondary,
  backgroundColor: threatFlowTheme.colors.surface.rest,
  backdropFilter: threatFlowTheme.effects.blur.md,
  border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
  borderRadius: `${threatFlowTheme.borderRadius.lg}px`,
  padding: `${threatFlowTheme.spacing[2.5]}px`,
  transition: `all ${threatFlowTheme.motion.normal}`,
  position: 'relative',
  overflow: 'hidden',
  boxShadow: `${threatFlowTheme.effects.shadows.sm}, inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
  
  // Professional glass effect top border
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
  
  '&:hover': {
    color: threatFlowTheme.colors.text.primary,
    backgroundColor: threatFlowTheme.colors.surface.hover,
    border: `1px solid ${threatFlowTheme.colors.surface.border.emphasis}`,
    transform: 'translateY(-2px) scale(1.02)',
    boxShadow: `${threatFlowTheme.effects.shadows.md}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
    '&::before': {
      background: `linear-gradient(90deg, transparent, ${threatFlowTheme.colors.surface.border.emphasis}, transparent)`,
    },
  },
  
  '&:active': {
    transform: 'translateY(0px) scale(1)',
  },
  
  '&:focus': {
    outline: 'none',
    border: `1px solid ${threatFlowTheme.colors.surface.border.focus}`,
    boxShadow: `${threatFlowTheme.effects.shadows.md}, 0 0 0 2px ${threatFlowTheme.colors.brand.primary}20`,
  },
  
  '&:disabled': {
    color: threatFlowTheme.colors.text.disabled,
    backgroundColor: threatFlowTheme.colors.surface.disabled,
    border: `1px solid ${threatFlowTheme.colors.surface.border.subtle}`,
    transform: 'none',
    boxShadow: 'none',
    '&::before': {
      display: 'none',
    },
  },
});

// ============= Glass Morph Button =============

export const GlassMorphButton = styled(Button)<ButtonProps>({
  background: threatFlowTheme.colors.surface.active,
  color: threatFlowTheme.colors.text.primary,
  textTransform: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
  letterSpacing: '0.01em',
  padding: `${threatFlowTheme.spacing.sm - 1}px ${threatFlowTheme.spacing.lg}px`,
  borderRadius: `${threatFlowTheme.borderRadius.md}px`,
  border: `1px solid ${threatFlowTheme.colors.surface.border.emphasis}`,
  transition: threatFlowTheme.motion.normal,
  boxShadow: 'none',
  
  '&:hover': {
    background: threatFlowTheme.colors.surface.active,
    border: `1px solid ${threatFlowTheme.colors.surface.border.focus}`,
    transform: 'translateY(-1px)',
    boxShadow: 'none',
  },
  
  '&:active': {
    transform: 'translateY(0)',
  },
  
  '&:disabled': {
    background: threatFlowTheme.colors.surface.rest,
    color: threatFlowTheme.colors.text.disabled,
    border: `1px solid ${threatFlowTheme.colors.surface.border.subtle}`,
    transform: 'none',
  },
});

// ============= Dialog Button Variants =============

// Note: For new dialog implementations, prefer EnhancedDialog/PrimaryButton and SecondaryButton
// These buttons are maintained for existing usage
export const DialogButtonCancel = styled(Button)<ButtonProps>({
  color: threatFlowTheme.colors.text.secondary,
  textTransform: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
  letterSpacing: '0.01em',
  padding: `${threatFlowTheme.spacing.sm - 1}px ${threatFlowTheme.spacing.lg}px`,
  borderRadius: `${threatFlowTheme.borderRadius.md}px`,
  border: '1px solid transparent',
  transition: threatFlowTheme.motion.normal,
  
  '&:hover': {
    backgroundColor: threatFlowTheme.colors.surface.hover,
    color: threatFlowTheme.colors.text.primary,
    border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
  },
  
  '&:active': {
    backgroundColor: threatFlowTheme.colors.surface.active,
  },
});

export const DialogButtonSecondary = styled(Button)<ButtonProps>({
  color: threatFlowTheme.colors.text.secondary,
  textTransform: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
  letterSpacing: '0.01em',
  padding: `${threatFlowTheme.spacing.sm - 1}px ${threatFlowTheme.spacing.lg}px`,
  borderRadius: `${threatFlowTheme.borderRadius.md}px`,
  border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
  transition: threatFlowTheme.motion.normal,
  
  '&:hover': {
    backgroundColor: threatFlowTheme.colors.surface.hover,
    color: threatFlowTheme.colors.text.primary,
    border: `1px solid ${threatFlowTheme.colors.surface.border.emphasis}`,
  },
  
  '&:active': {
    backgroundColor: threatFlowTheme.colors.surface.active,
  },
});

export const DialogButtonPrimary = styled(Button)<ButtonProps>({
  background: threatFlowTheme.colors.surface.active,
  color: threatFlowTheme.colors.text.primary,
  textTransform: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
  letterSpacing: '0.01em',
  padding: `${threatFlowTheme.spacing.sm - 1}px ${threatFlowTheme.spacing.lg}px`,
  borderRadius: `${threatFlowTheme.borderRadius.md}px`,
  border: `1px solid ${threatFlowTheme.colors.surface.border.emphasis}`,
  transition: threatFlowTheme.motion.normal,
  
  '&:hover': {
    background: threatFlowTheme.colors.surface.active,
    border: `1px solid ${threatFlowTheme.colors.surface.border.focus}`,
    transform: 'translateY(-1px)',
  },
  
  '&:active': {
    transform: 'translateY(0)',
  },
  
  '&:disabled': {
    background: threatFlowTheme.colors.surface.rest,
    color: threatFlowTheme.colors.text.disabled,
    border: `1px solid ${threatFlowTheme.colors.surface.border.subtle}`,
    transform: 'none',
  },
});

// ============= Hero Submit Button (Special Animated Button) =============

const moveLight = keyframes`
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
`;

interface HeroSubmitButtonProps extends ButtonProps {
  isLoading?: boolean;
  children: React.ReactNode;
}

export const HeroSubmitButton: React.FC<HeroSubmitButtonProps> = ({
  isLoading = false,
  children,
  disabled,
  ...props
}) => {
  return (
    <Button
      {...props}
      disabled={disabled || isLoading}
      sx={{
        height: '52px',
        px: '32px',
        minWidth: 'auto',
        background: `
          ${threatFlowTheme.colors.background.glassHeavy},
          linear-gradient(135deg, ${threatFlowTheme.colors.brand.light} 0%, transparent 100%)
        `,
        borderRadius: '26px',
        textTransform: 'none',
        fontSize: threatFlowTheme.typography.fontSize.md,
        fontWeight: threatFlowTheme.typography.fontWeight.semibold,
        letterSpacing: threatFlowTheme.typography.letterSpacing.wide,
        color: threatFlowTheme.colors.text.primary,
        transition: `all ${threatFlowTheme.motion.normal}`,
        cursor: 'pointer',
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        boxShadow: `
          ${threatFlowTheme.effects.shadows.lg}, 
          inset 0 1px 0 rgba(255, 255, 255, 0.1),
          0 0 30px ${threatFlowTheme.colors.brand.primary}15
        `,
        border: `1px solid ${threatFlowTheme.colors.surface.border.emphasis}`,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        
        '& .content-wrapper': {
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        },
        
        // Enhanced top border effect
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: isLoading 
            ? `linear-gradient(90deg, transparent, ${threatFlowTheme.colors.brand.primary}90, transparent)`
            : `linear-gradient(90deg, transparent, ${threatFlowTheme.colors.brand.primary}50, transparent)`,
          borderRadius: '26px 26px 0 0',
          ...(isLoading && {
            animation: `${moveLight} 2s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
          }),
        },
        
        // Shimmer light effect for hover - cyber blue gradient effect
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(90deg, transparent, ${threatFlowTheme.colors.brand.primary}30 25%, ${threatFlowTheme.colors.brand.primary}30 75%, transparent)`,
          transform: 'translateX(-100%)',
          opacity: 0,
          transition: 'opacity 150ms ease',
          pointerEvents: 'none',
          zIndex: 0,
        },
        
        '&:hover': {
          transform: 'translateY(-2px) scale(1.02)',
          border: `1px solid ${threatFlowTheme.colors.brand.primary}60`,
          boxShadow: `
            ${threatFlowTheme.effects.shadows.xl}, 
            inset 0 1px 0 rgba(255, 255, 255, 0.15),
            0 0 40px ${threatFlowTheme.colors.brand.primary}25
          `,
          
          // Enhanced top border on hover
          '&::before': {
            background: `linear-gradient(90deg, transparent, ${threatFlowTheme.colors.brand.primary}, transparent)`,
            boxShadow: `0 0 8px ${threatFlowTheme.colors.brand.primary}50`,
          },
          
          // Animated shimmer light
          '&::after': {
            opacity: 0.6,
            animation: `${moveLight} 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
          },
        },
        
        '&:active': {
          transform: 'translateY(1px)',
        },
        
        '&:disabled': {
          background: threatFlowTheme.colors.background.glassLight,
          color: threatFlowTheme.colors.text.disabled,
          border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
          cursor: 'default',
          transform: 'none',
          
          '&:hover': {
            transform: 'none',
            border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
            
            '&::before': {
              opacity: 0,
              animation: 'none',
            },
            
            '&::after': {
              opacity: 0,
              animation: 'none',
            },
          },
        },
        
        ...props.sx,
      }}
    >
      <Box className="content-wrapper">
        {children}
      </Box>
    </Button>
  );
};

// ============= Animated Submit Button (Simpler Version) =============

interface AnimatedSubmitButtonProps extends ButtonProps {
  isLoading?: boolean;
  children: React.ReactNode;
}

export const AnimatedSubmitButton: React.FC<AnimatedSubmitButtonProps> = ({
  isLoading = false,
  children,
  disabled,
  ...props
}) => {
  return (
    <Button
      {...props}
      disabled={disabled || isLoading}
      sx={{
        height: '48px',
        px: '28px',
        minWidth: 'auto',
        background: threatFlowTheme.colors.background.glassLight,
        borderRadius: '100px',
        textTransform: 'none',
        fontSize: '15px',
        fontWeight: 500,
        letterSpacing: '0.01em',
        color: threatFlowTheme.colors.text.primary,
        transition: threatFlowTheme.motion.normal,
        cursor: 'pointer',
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        boxShadow: 'none',
        border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        
        '& .content-wrapper': {
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        },
        
        // Dot pattern overlay for loading state
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 2px 2px, ${threatFlowTheme.colors.text.tertiary} 0.5px, transparent 0.7px)`,
          backgroundSize: '4px 4px',
          backgroundRepeat: 'repeat',
          opacity: isLoading ? 0.3 : 0,
          transition: 'opacity 150ms ease',
          pointerEvents: 'none',
          zIndex: 1,
          ...(isLoading && {
            animation: `${dotPattern} 1s linear infinite`,
          }),
        },
        
        // Shimmer effect for hover
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(90deg, transparent, ${threatFlowTheme.colors.brand.primary}20, transparent)`,
          opacity: 0,
          transform: 'translateX(-100%)',
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
          zIndex: 0,
        },
        
        '&:hover': {
          background: threatFlowTheme.colors.background.glassLight,
          border: `1px solid ${threatFlowTheme.colors.surface.border.emphasis}`,
          transform: 'translateY(-1px)',
          
          '&::after': {
            opacity: 0.2,
            animation: `${shimmer} 0.8s ease-in-out`,
          },
        },
        
        '&:active': {
          transform: 'translateY(1px)',
        },
        
        '&:disabled': {
          background: threatFlowTheme.colors.surface.rest,
          color: threatFlowTheme.colors.text.disabled,
          border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
          cursor: 'default',
          transform: 'none',
          
          '&:hover': {
            transform: 'none',
            
            '&::after': {
              opacity: 0,
              animation: 'none',
            },
          },
        },
        
        ...props.sx,
      }}
    >
      <Box className="content-wrapper">
        {children}
      </Box>
    </Button>
  );
};

// ============= Danger Button Variant =============

export const DangerButton = styled(Button)<ButtonProps>({
  background: threatFlowTheme.colors.status.error.bg,
  color: threatFlowTheme.colors.status.error.text,
  textTransform: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
  letterSpacing: '0.01em',
  padding: `${threatFlowTheme.spacing.sm - 1}px ${threatFlowTheme.spacing.lg}px`,
  borderRadius: `${threatFlowTheme.borderRadius.md}px`,
  border: `1px solid ${threatFlowTheme.colors.status.error.border}`,
  transition: threatFlowTheme.motion.normal,
  boxShadow: 'none',
  
  '&:hover': {
    background: threatFlowTheme.colors.status.error.bg,
    color: threatFlowTheme.colors.status.error.accent,
    border: `1px solid ${threatFlowTheme.colors.status.error.border}`,
    transform: 'translateY(-1px)',
    boxShadow: 'none',
  },
  
  '&:active': {
    transform: 'translateY(0)',
  },
  
  '&:disabled': {
    background: threatFlowTheme.colors.surface.rest,
    color: threatFlowTheme.colors.text.disabled,
    border: `1px solid ${threatFlowTheme.colors.surface.border.subtle}`,
    transform: 'none',
  },
});

// ============= Compact Button Variants =============

export const CompactIconButton = styled(GlassIconButton)({
  padding: `${threatFlowTheme.spacing.xs}px`,
  borderRadius: `${threatFlowTheme.borderRadius.sm}px`,
  
  '& .MuiSvgIcon-root': {
    fontSize: '18px',
  },
});

export const CompactButton = styled(GlassMorphButton)({
  fontSize: '0.8rem',
  padding: `${threatFlowTheme.spacing.xs}px ${threatFlowTheme.spacing.md}px`,
  minHeight: 'unset',
});

// ============= Export all components =============

export default {
  GlassIconButton,
  GlassMorphButton,
  DialogButtonCancel,
  DialogButtonSecondary,
  DialogButtonPrimary,
  HeroSubmitButton,
  AnimatedSubmitButton,
  DangerButton,
  CompactIconButton,
  CompactButton,
};