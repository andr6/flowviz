import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { Alert, AlertProps, Box, Typography, Chip, Tooltip } from '@mui/material';
import React from 'react';

import { threatFlowTheme, createStatusStyle } from '../../theme/threatflow-theme';

// Main Alert Component
interface FlowAlertProps extends Omit<AlertProps, 'severity'> {
  status: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children?: React.ReactNode;
}

export const FlowAlert: React.FC<FlowAlertProps> = ({
  status,
  title,
  children,
  sx = {},
  ...props
}) => {
  const statusStyle = createStatusStyle(status);
  
  const iconMap = {
    success: SuccessIcon,
    error: ErrorIcon,
    warning: WarningIcon,
    info: InfoIcon,
  };
  
  const IconComponent = iconMap[status];
  
  return (
    <Alert
      icon={<IconComponent />}
      sx={{
        ...statusStyle,
        backdropFilter: threatFlowTheme.effects.blur.light,
        '& .MuiAlert-icon': {
          color: threatFlowTheme.colors.status[status].accent,
        },
        '& .MuiAlert-message': {
          color: threatFlowTheme.colors.status[status].text,
        },
        ...sx,
      }}
      {...props}
    >
      {title && (
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            mb: children ? 0.5 : 0,
            color: threatFlowTheme.colors.status[status].text,
          }}
        >
          {title}
        </Typography>
      )}
      {children && (
        <Typography
          variant="body2"
          sx={{
            color: threatFlowTheme.colors.status[status].text,
            opacity: 0.9,
          }}
        >
          {children}
        </Typography>
      )}
    </Alert>
  );
};

// Toast Notification Component
interface FlowToastProps {
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

export const FlowToast: React.FC<FlowToastProps> = ({
  status,
  message,
  onClose,
}) => {
  const statusColors = threatFlowTheme.colors.status[status];
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        padding: '12px 16px',
        backgroundColor: statusColors.bg,
        border: `1px solid ${statusColors.border}`,
        borderRadius: threatFlowTheme.borderRadius.md,
        backdropFilter: threatFlowTheme.effects.blur.light,
        boxShadow: threatFlowTheme.effects.shadows.md,
        color: statusColors.text,
        fontSize: '0.875rem',
        fontWeight: 500,
        transition: `all ${threatFlowTheme.motion.normal}`,
        cursor: onClose ? 'pointer' : 'default',
        '&:hover': onClose ? {
          backgroundColor: statusColors.bg.replace('0.1)', '0.15)'),
          transform: 'translateY(-1px)',
        } : {},
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          width: 4,
          height: 24,
          backgroundColor: statusColors.accent,
          borderRadius: threatFlowTheme.borderRadius.sm,
          flexShrink: 0,
        }}
      />
      <Typography
        variant="body2"
        sx={{
          color: statusColors.text,
          flex: 1,
          lineHeight: 1.4,
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

// Status Chip Component
interface StatusChipProps {
  status: 'success' | 'error' | 'warning' | 'info';
  label: string;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
}

export const StatusChip = React.forwardRef<HTMLDivElement, StatusChipProps>((props, ref) => {
  const {
    status,
    label,
    size = 'small',
    variant = 'filled',
    ...other
  } = props;
  
  const statusColors = threatFlowTheme.colors.status[status];
  
  return (
    <Chip
      ref={ref}
      label={label.toUpperCase()}
      size={size}
      {...other}
      sx={{
        backgroundColor: variant === 'filled' ? statusColors.bg : 'transparent',
        color: statusColors.text,
        border: `1px solid ${statusColors.border}`,
        borderRadius: threatFlowTheme.borderRadius.sm,
        fontSize: size === 'small' ? '0.7rem' : '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
        height: size === 'small' ? '20px' : '24px',
        textTransform: 'uppercase',
        transition: `all ${threatFlowTheme.motion.normal}`,
        '&:hover': {
          backgroundColor: variant === 'filled' 
            ? statusColors.bg.replace('0.1)', '0.15)')
            : statusColors.bg,
          transform: 'translateY(-1px)',
          boxShadow: threatFlowTheme.effects.shadows.sm,
        },
        '& .MuiChip-label': {
          padding: size === 'small' ? '0 6px' : '0 8px',
        },
      }}
    />
  );
});

StatusChip.displayName = 'StatusChip';

// Confidence Chip (specialized status chip)
interface ConfidenceChipProps {
  confidence: 'low' | 'medium' | 'high';
  showTooltip?: boolean;
}

export const ConfidenceChip = React.forwardRef<HTMLDivElement, ConfidenceChipProps>((props, ref) => {
  const { confidence, showTooltip = true, ...other } = props;
  
  const statusMap = {
    high: 'success' as const,
    medium: 'warning' as const,
    low: 'error' as const,
  };
  
  const chip = (
    <StatusChip
      ref={ref}
      status={statusMap[confidence]}
      label={`${confidence} confidence`}
      size="small"
      variant="filled"
      {...other}
    />
  );
  
  if (!showTooltip) {
    return chip;
  }
  
  return (
    <Tooltip
      title="Confidence in extraction accuracy based on source text clarity"
      placement="top"
      arrow
      slotProps={{
        tooltip: {
          sx: {
            backgroundColor: threatFlowTheme.colors.background.glassLight,
            color: threatFlowTheme.colors.text.primary,
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '8px 12px',
            borderRadius: '6px',  // More subtle radius
            border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
            backdropFilter: threatFlowTheme.effects.blur.light,
            boxShadow: threatFlowTheme.effects.shadows.lg,
            maxWidth: '240px'
          }
        },
        arrow: {
          sx: {
            color: threatFlowTheme.colors.background.glassLight,
            '&::before': {
              border: `1px solid ${threatFlowTheme.colors.surface.border.default}`
            }
          }
        }
      }}
    >
      {chip}
    </Tooltip>
  );
});

ConfidenceChip.displayName = 'ConfidenceChip';

// Loading Alert Component
interface LoadingAlertProps {
  message?: string;
}

export const LoadingAlert: React.FC<LoadingAlertProps> = ({
  message = 'Loading...',
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        padding: '12px 16px',
        backgroundColor: threatFlowTheme.colors.surface.rest,
        border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
        borderRadius: threatFlowTheme.borderRadius.md,
        backdropFilter: threatFlowTheme.effects.blur.light,
        color: threatFlowTheme.colors.text.secondary,
      }}
    >
      <Box
        sx={{
          width: 16,
          height: 16,
          border: `2px solid ${threatFlowTheme.colors.text.tertiary}`,
          borderTop: `2px solid ${threatFlowTheme.colors.text.secondary}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' },
          },
        }}
      />
      <Typography
        variant="body2"
        sx={{
          color: threatFlowTheme.colors.text.secondary,
          fontSize: '0.875rem',
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

// Export all components
export default {
  FlowAlert,
  FlowToast,
  StatusChip,
  ConfidenceChip,
  LoadingAlert,
};