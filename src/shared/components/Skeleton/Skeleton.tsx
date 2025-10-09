import { Box, Skeleton as MuiSkeleton, SkeletonProps as MuiSkeletonProps } from '@mui/material';
import React from 'react';

import { useThemeContext } from '../../context/ThemeProvider';

interface SkeletonProps extends Omit<MuiSkeletonProps, 'variant'> {
  variant?: 'text' | 'rectangular' | 'rounded' | 'circular';
  lines?: number;
  spacing?: number;
  randomWidth?: boolean;
  minWidth?: number | string;
  maxWidth?: number | string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  lines = 1,
  spacing = 1,
  randomWidth = false,
  minWidth = '60%',
  maxWidth = '100%',
  width,
  height,
  sx,
  ...props
}) => {
  const { theme } = useThemeContext();

  const generateRandomWidth = () => {
    const min = typeof minWidth === 'string' ? parseFloat(minWidth) : minWidth;
    const max = typeof maxWidth === 'string' ? parseFloat(maxWidth) : maxWidth;
    const randomPercent = Math.random() * (max - min) + min;
    return `${randomPercent}%`;
  };

  const skeletonSx = {
    backgroundColor: theme.colors.surface.subtle,
    '&::after': {
      background: `linear-gradient(90deg, transparent, ${theme.colors.surface.hover}, transparent)`,
    },
    ...sx,
  };

  if (lines === 1) {
    return (
      <MuiSkeleton
        variant={variant}
        width={randomWidth ? generateRandomWidth() : width}
        height={height}
        sx={skeletonSx}
        {...props}
      />
    );
  }

  return (
    <Box>
      {Array.from({ length: lines }).map((_, index) => (
        <MuiSkeleton
          key={index}
          variant={variant}
          width={randomWidth ? generateRandomWidth() : width}
          height={height}
          sx={{
            ...skeletonSx,
            marginBottom: index < lines - 1 ? spacing : 0,
          }}
          {...props}
        />
      ))}
    </Box>
  );
};

// Specialized skeleton components for common use cases

export const TextSkeleton: React.FC<Omit<SkeletonProps, 'variant'>> = (props) => (
  <Skeleton variant="text" {...props} />
);

export const CardSkeleton: React.FC<{ 
  showAvatar?: boolean; 
  showTitle?: boolean; 
  showDescription?: boolean;
  titleLines?: number;
  descriptionLines?: number;
  height?: number;
}> = ({
  showAvatar = true,
  showTitle = true,
  showDescription = true,
  titleLines = 1,
  descriptionLines = 2,
  height = 200,
}) => {
  const { theme } = useThemeContext();

  return (
    <Box
      sx={{
        backgroundColor: theme.colors.background.secondary,
        border: `1px solid ${theme.colors.surface.border.default}`,
        borderRadius: theme.borderRadius.lg,
        p: 3,
        height,
      }}
    >
      {showAvatar && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ ml: 2, flex: 1 }}>
            <Skeleton width="60%" height={20} />
            <Skeleton width="40%" height={16} sx={{ mt: 0.5 }} />
          </Box>
        </Box>
      )}
      
      {showTitle && (
        <Box sx={{ mb: 2 }}>
          <Skeleton
            lines={titleLines}
            height={24}
            randomWidth
            minWidth="70%"
            maxWidth="100%"
          />
        </Box>
      )}
      
      {showDescription && (
        <Box>
          <Skeleton
            lines={descriptionLines}
            height={16}
            randomWidth
            minWidth="40%"
            maxWidth="90%"
            spacing={1}
          />
        </Box>
      )}
    </Box>
  );
};

export const ListItemSkeleton: React.FC<{
  showIcon?: boolean;
  showSecondaryText?: boolean;
  showAction?: boolean;
}> = ({
  showIcon = true,
  showSecondaryText = true,
  showAction = false,
}) => {
  const { theme } = useThemeContext();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 2,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.background.secondary,
        border: `1px solid ${theme.colors.surface.border.default}`,
      }}
    >
      {showIcon && (
        <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
      )}
      
      <Box sx={{ flex: 1 }}>
        <Skeleton width="70%" height={20} />
        {showSecondaryText && (
          <Skeleton width="50%" height={16} sx={{ mt: 0.5 }} />
        )}
      </Box>
      
      {showAction && (
        <Skeleton variant="rectangular" width={80} height={32} sx={{ ml: 2 }} />
      )}
    </Box>
  );
};

export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
}) => {
  const { theme } = useThemeContext();

  return (
    <Box
      sx={{
        backgroundColor: theme.colors.background.secondary,
        border: `1px solid ${theme.colors.surface.border.default}`,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
      }}
    >
      {showHeader && (
        <Box
          sx={{
            display: 'flex',
            p: 2,
            backgroundColor: theme.colors.surface.subtle,
            borderBottom: `1px solid ${theme.colors.surface.border.default}`,
          }}
        >
          {Array.from({ length: columns }).map((_, index) => (
            <Box
              key={`header-${index}`}
              sx={{ flex: 1, mr: index < columns - 1 ? 2 : 0 }}
            >
              <Skeleton width="80%" height={20} />
            </Box>
          ))}
        </Box>
      )}
      
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Box
          key={`row-${rowIndex}`}
          sx={{
            display: 'flex',
            p: 2,
            borderBottom: rowIndex < rows - 1 
              ? `1px solid ${theme.colors.surface.border.subtle}` 
              : 'none',
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Box
              key={`cell-${rowIndex}-${colIndex}`}
              sx={{ flex: 1, mr: colIndex < columns - 1 ? 2 : 0 }}
            >
              <Skeleton
                width={colIndex === 0 ? '90%' : `${Math.random() * 40 + 50}%`}
                height={16}
              />
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
};

export const GraphSkeleton: React.FC<{
  width?: number | string;
  height?: number | string;
}> = ({
  width = '100%',
  height = 400,
}) => {
  const { theme } = useThemeContext();

  return (
    <Box
      sx={{
        width,
        height,
        backgroundColor: theme.colors.background.secondary,
        border: `1px solid ${theme.colors.surface.border.default}`,
        borderRadius: theme.borderRadius.lg,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Simulated nodes */}
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton
          key={`node-${index}`}
          variant="circular"
          width={Math.random() * 40 + 30}
          height={Math.random() * 40 + 30}
          sx={{
            position: 'absolute',
            top: `${Math.random() * 70 + 10}%`,
            left: `${Math.random() * 70 + 10}%`,
          }}
        />
      ))}
      
      {/* Simulated edges */}
      {Array.from({ length: 4 }).map((_, index) => (
        <Box
          key={`edge-${index}`}
          sx={{
            position: 'absolute',
            width: `${Math.random() * 30 + 20}%`,
            height: 2,
            backgroundColor: theme.colors.surface.subtle,
            top: `${Math.random() * 80 + 10}%`,
            left: `${Math.random() * 60 + 10}%`,
            transform: `rotate(${Math.random() * 90 - 45}deg)`,
          }}
        />
      ))}
      
      {/* Loading indicator */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          backgroundColor: theme.colors.background.glassHeavy,
          backdropFilter: theme.effects.blur.md,
          borderRadius: theme.borderRadius.sm,
          p: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Skeleton variant="circular" width={16} height={16} />
        <Skeleton width={80} height={16} />
      </Box>
    </Box>
  );
};

export const FormSkeleton: React.FC<{
  fields?: number;
  showTitle?: boolean;
  showButtons?: boolean;
}> = ({
  fields = 4,
  showTitle = true,
  showButtons = true,
}) => {
  const { theme } = useThemeContext();

  return (
    <Box
      sx={{
        backgroundColor: theme.colors.background.secondary,
        border: `1px solid ${theme.colors.surface.border.default}`,
        borderRadius: theme.borderRadius.lg,
        p: 3,
      }}
    >
      {showTitle && (
        <Box sx={{ mb: 3 }}>
          <Skeleton width="60%" height={28} />
          <Skeleton width="40%" height={16} sx={{ mt: 1 }} />
        </Box>
      )}
      
      {Array.from({ length: fields }).map((_, index) => (
        <Box key={`field-${index}`} sx={{ mb: 3 }}>
          <Skeleton width="30%" height={20} sx={{ mb: 1 }} />
          <Skeleton
            variant="rectangular"
            width="100%"
            height={40}
            sx={{ borderRadius: theme.borderRadius.md }}
          />
        </Box>
      ))}
      
      {showButtons && (
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
          <Skeleton
            variant="rectangular"
            width={80}
            height={36}
            sx={{ borderRadius: theme.borderRadius.md }}
          />
          <Skeleton
            variant="rectangular"
            width={100}
            height={36}
            sx={{ borderRadius: theme.borderRadius.md }}
          />
        </Box>
      )}
    </Box>
  );
};