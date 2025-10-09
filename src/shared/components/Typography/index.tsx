import {
  Typography,
  DialogTitle,
  DialogContentText,
  TypographyProps,
  DialogTitleProps,
  styled,
} from '@mui/material';
import React from 'react';

import { threatFlowTheme } from '../../theme/threatflow-theme';

// ============= Dialog Title Component =============

export const FlowDialogTitle = styled(DialogTitle)<DialogTitleProps>({
  color: threatFlowTheme.colors.text.primary,
  fontSize: '1.125rem',
  fontWeight: 600,
  letterSpacing: '-0.02em',
  paddingBottom: `${threatFlowTheme.spacing.md}px`,
  paddingTop: `${threatFlowTheme.spacing.lg}px`,
  paddingLeft: `${threatFlowTheme.spacing.lg}px`,
  paddingRight: `${threatFlowTheme.spacing.lg}px`,
});

// ============= Dialog Content Text Component =============

export const FlowDialogContent = styled(DialogContentText)({
  color: threatFlowTheme.colors.text.secondary,
  fontSize: '0.925rem',
  lineHeight: 1.6,
  letterSpacing: '0.01em',
});

// ============= Caption Text Variants =============

export const CaptionText = styled(Typography)<TypographyProps>({
  variant: 'caption',
  color: threatFlowTheme.colors.text.tertiary,
  fontSize: '0.75rem',
  lineHeight: 1.4,
  letterSpacing: '0.01em',
});

export const CaptionTextSecondary = styled(Typography)<TypographyProps>({
  variant: 'caption',
  color: threatFlowTheme.colors.text.secondary,
  fontSize: '0.75rem',
  lineHeight: 1.4,
  letterSpacing: '0.01em',
});

export const CaptionTextMuted = styled(Typography)<TypographyProps>({
  variant: 'caption',
  color: threatFlowTheme.colors.text.disabled,
  fontSize: '0.75rem',
  lineHeight: 1.4,
  letterSpacing: '0.01em',
});

// Special uppercase caption variant used in nodes and headers
export const CaptionTextUppercase = styled(Typography)<TypographyProps>({
  variant: 'caption',
  color: threatFlowTheme.colors.text.secondary,
  fontSize: '0.75rem',
  lineHeight: 1.4,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  fontWeight: 500,
});

// ============= Small Text Variants =============

export const SmallText = styled(Typography)<TypographyProps>({
  fontSize: '0.8rem',
  color: threatFlowTheme.colors.text.secondary,
  lineHeight: 1.4,
  letterSpacing: '0.01em',
});

export const SmallTextMuted = styled(Typography)<TypographyProps>({
  fontSize: '0.8rem',
  color: threatFlowTheme.colors.text.tertiary,
  lineHeight: 1.4,
  letterSpacing: '0.01em',
});

// Special tiny text for node content
export const TinyText = styled(Typography)<TypographyProps>({
  fontSize: '0.7rem',
  color: threatFlowTheme.colors.text.tertiary,
  lineHeight: 1.3,
  fontWeight: 500,
});

// ============= Status Text Components =============

interface StatusTextProps extends TypographyProps {
  status: 'success' | 'error' | 'warning' | 'info';
}

export const StatusText: React.FC<StatusTextProps> = ({ status, children, ...props }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return threatFlowTheme.colors.status.success.text;
      case 'error':
        return threatFlowTheme.colors.status.error.text;
      case 'warning':
        return threatFlowTheme.colors.status.warning.text;
      case 'info':
        return threatFlowTheme.colors.status.info.text;
      default:
        return threatFlowTheme.colors.text.primary;
    }
  };

  return (
    <Typography
      {...props}
      sx={{
        color: getStatusColor(),
        fontSize: '0.875rem',
        fontWeight: 500,
        ...props.sx,
      }}
    >
      {children}
    </Typography>
  );
};

// ============= Section Headers =============

export const SectionHeader = styled(Typography)<TypographyProps>({
  fontSize: '1rem',
  fontWeight: 600,
  color: threatFlowTheme.colors.text.primary,
  letterSpacing: '-0.01em',
  marginBottom: `${threatFlowTheme.spacing.md}px`,
});

export const SubsectionHeader = styled(Typography)<TypographyProps>({
  fontSize: '0.875rem',
  fontWeight: 600,
  color: threatFlowTheme.colors.text.primary,
  letterSpacing: '-0.01em',
  marginBottom: `${threatFlowTheme.spacing.sm}px`,
  textTransform: 'uppercase',
});

// ============= Link Text Component =============

export const LinkText = styled(Typography)<TypographyProps>({
  color: threatFlowTheme.colors.text.primary,
  textDecoration: 'underline',
  cursor: 'pointer',
  transition: threatFlowTheme.motion.fast,
  
  '&:hover': {
    color: threatFlowTheme.colors.text.primary,
    opacity: 0.8,
  },
  
  '&:active': {
    opacity: 0.6,
  },
});

// ============= Gradient Text Component =============

interface GradientTextProps extends TypographyProps {
  gradient?: 'primary' | 'secondary' | 'accent';
}

export const GradientText: React.FC<GradientTextProps> = ({ 
  gradient = 'primary', 
  children, 
  ...props 
}) => {
  const getGradient = () => {
    switch (gradient) {
      case 'primary':
        return `linear-gradient(135deg, ${threatFlowTheme.colors.text.primary} 0%, ${threatFlowTheme.colors.text.secondary} 100%)`;
      case 'secondary':
        return `linear-gradient(135deg, ${threatFlowTheme.colors.text.secondary} 0%, ${threatFlowTheme.colors.text.tertiary} 100%)`;
      case 'accent':
        return `linear-gradient(135deg, ${threatFlowTheme.colors.surface.border.focus} 0%, ${threatFlowTheme.colors.text.primary} 100%)`;
      default:
        return `linear-gradient(135deg, ${threatFlowTheme.colors.text.primary} 0%, ${threatFlowTheme.colors.text.secondary} 100%)`;
    }
  };

  return (
    <Typography
      {...props}
      sx={{
        background: getGradient(),
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        ...props.sx,
      }}
    >
      {children}
    </Typography>
  );
};

// ============= Icon Text Wrapper =============

interface IconTextProps extends TypographyProps {
  icon: React.ReactNode;
  iconPosition?: 'start' | 'end';
  iconGap?: number;
}

export const IconText: React.FC<IconTextProps> = ({ 
  icon, 
  iconPosition = 'start', 
  iconGap = threatFlowTheme.spacing.sm, 
  children, 
  ...props 
}) => {
  return (
    <Typography
      {...props}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: `${iconGap}px`,
        flexDirection: iconPosition === 'end' ? 'row-reverse' : 'row',
        ...props.sx,
      }}
    >
      {icon}
      <span>{children}</span>
    </Typography>
  );
};

// ============= Icon Size Wrapper =============

interface FlowIconProps {
  children: React.ReactElement;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'tertiary' | 'disabled';
}

export const FlowIcon: React.FC<FlowIconProps> = ({ 
  children, 
  size = 'small', 
  color = 'secondary' 
}) => {
  const getSize = () => {
    switch (size) {
      case 'tiny':
        return '16px';
      case 'small':
        return '18px';
      case 'medium':
        return '20px';
      case 'large':
        return '24px';
      default:
        return '18px';
    }
  };

  const getColor = () => {
    switch (color) {
      case 'primary':
        return threatFlowTheme.colors.text.primary;
      case 'secondary':
        return threatFlowTheme.colors.text.secondary;
      case 'tertiary':
        return threatFlowTheme.colors.text.tertiary;
      case 'disabled':
        return threatFlowTheme.colors.text.disabled;
      default:
        return threatFlowTheme.colors.text.secondary;
    }
  };

  return React.cloneElement(children, {
    sx: {
      fontSize: getSize(),
      color: getColor(),
      ...children.props.sx,
    },
  });
};

// ============= Export all components =============

export default {
  FlowDialogTitle,
  FlowDialogContent,
  CaptionText,
  CaptionTextSecondary,
  CaptionTextMuted,
  CaptionTextUppercase,
  SmallText,
  SmallTextMuted,
  TinyText,
  StatusText,
  SectionHeader,
  SubsectionHeader,
  LinkText,
  GradientText,
  IconText,
  FlowIcon,
};