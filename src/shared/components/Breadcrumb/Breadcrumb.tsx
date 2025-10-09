import {
  NavigateNext,
  Home,
  ChevronRight,
  ContentCopy,
} from '@mui/icons-material';
import {
  Box,
  Breadcrumbs as MuiBreadcrumbs,
  Typography,
  Link,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import React from 'react';

import { useThemeContext } from '../../context/ThemeProvider';
import { useResponsive } from '../../hooks/useResponsive';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string | number;
  copyable?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeHref?: string;
  onHomeClick?: () => void;
  maxItems?: number;
  showCopyPath?: boolean;
  compact?: boolean;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  homeHref = '/',
  onHomeClick,
  maxItems,
  showCopyPath = false,
  compact = false,
}) => {
  const { theme } = useThemeContext();
  const { isMobile, isTablet } = useResponsive();

  const handleCopyPath = async () => {
    const path = items.map(item => item.label).join(' > ');
    try {
      await navigator.clipboard.writeText(path);
      // Could add toast notification here
    } catch (err) {
      console.warn('Failed to copy path:', err);
    }
  };

  const renderBreadcrumbItem = (item: BreadcrumbItem, index: number, isLast: boolean) => {
    const content = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {item.icon && !compact && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {item.icon}
          </Box>
        )}
        
        <Typography
          variant={isLast ? 'body1' : 'body2'}
          sx={{
            color: isLast ? theme.colors.text.primary : theme.colors.text.secondary,
            fontWeight: isLast ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.normal,
            fontSize: isMobile ? theme.typography.fontSize.sm : theme.typography.fontSize.base,
            maxWidth: isMobile ? '120px' : '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            ...(item.disabled && {
              color: theme.colors.text.disabled,
            }),
          }}
        >
          {item.label}
        </Typography>

        {item.badge && !compact && (
          <Chip
            label={item.badge}
            size="small"
            sx={{
              height: 20,
              fontSize: theme.typography.fontSize.xs,
              backgroundColor: theme.colors.brand.light,
              color: theme.colors.brand.primary,
              border: `1px solid ${theme.colors.brand.primary}40`,
            }}
          />
        )}
      </Box>
    );

    if (isLast || item.disabled) {
      return (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {content}
          {item.copyable && (
            <Tooltip title="Copy item">
              <IconButton
                size="small"
                onClick={() => navigator.clipboard.writeText(item.label)}
                sx={{
                  opacity: 0.6,
                  '&:hover': { opacity: 1 },
                  color: theme.colors.text.tertiary,
                }}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      );
    }

    if (item.href) {
      return (
        <Link
          key={index}
          href={item.href}
          underline="hover"
          sx={{
            color: theme.colors.text.secondary,
            textDecoration: 'none',
            '&:hover': {
              color: theme.colors.brand.primary,
              textDecoration: 'underline',
            },
            transition: theme.motion.fast,
          }}
        >
          {content}
        </Link>
      );
    }

    if (item.onClick) {
      return (
        <Box
          key={index}
          component="button"
          onClick={item.onClick}
          sx={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: theme.colors.text.secondary,
            '&:hover': {
              color: theme.colors.brand.primary,
            },
            transition: theme.motion.fast,
          }}
        >
          {content}
        </Box>
      );
    }

    return <Box key={index}>{content}</Box>;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        padding: isMobile ? theme.spacing[2] : theme.spacing[3],
        backgroundColor: theme.colors.background.secondary,
        borderBottom: `1px solid ${theme.colors.surface.border.subtle}`,
        minHeight: isMobile ? 48 : 56,
        overflow: 'hidden',
      }}
    >
      {/* Home Button */}
      <Tooltip title="Home">
        {onHomeClick ? (
          <IconButton
            size="small"
            onClick={onHomeClick}
            sx={{
              color: theme.colors.text.tertiary,
              '&:hover': {
                color: theme.colors.brand.primary,
                backgroundColor: theme.colors.surface.hover,
              },
              transition: theme.motion.fast,
            }}
          >
            <Home fontSize="small" />
          </IconButton>
        ) : (
          <Link
            href={homeHref}
            sx={{
              color: theme.colors.text.tertiary,
              display: 'flex',
              alignItems: 'center',
              '&:hover': {
                color: theme.colors.brand.primary,
              },
              transition: theme.motion.fast,
            }}
          >
            <Home fontSize="small" />
          </Link>
        )}
      </Tooltip>

      {/* Breadcrumbs */}
      {items.length > 0 && (
        <>
          <ChevronRight
            fontSize="small"
            sx={{ color: theme.colors.text.quaternary }}
          />
          
          <MuiBreadcrumbs
            separator={
              <NavigateNext
                fontSize="small"
                sx={{ color: theme.colors.text.quaternary }}
              />
            }
            maxItems={maxItems || (isMobile ? 2 : isTablet ? 3 : undefined)}
            sx={{
              flex: 1,
              '& .MuiBreadcrumbs-separator': {
                marginLeft: theme.spacing[1],
                marginRight: theme.spacing[1],
              },
            }}
          >
            {items.map((item, index) =>
              renderBreadcrumbItem(item, index, index === items.length - 1)
            )}
          </MuiBreadcrumbs>
        </>
      )}

      {/* Copy Path Button */}
      {showCopyPath && items.length > 0 && !isMobile && (
        <Tooltip title="Copy full path">
          <IconButton
            size="small"
            onClick={handleCopyPath}
            sx={{
              color: theme.colors.text.tertiary,
              '&:hover': {
                color: theme.colors.brand.primary,
                backgroundColor: theme.colors.surface.hover,
              },
              transition: theme.motion.fast,
            }}
          >
            <ContentCopy fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};