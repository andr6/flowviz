import {
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Fab,
  Zoom,
  useScrollTrigger,
  Paper,
  Breadcrumbs,
  Link,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import React, { ReactNode } from 'react';

import { useThemeContext } from '../../context/ThemeProvider';
import { useResponsive } from '../../hooks/useResponsive';

interface ContentAreaProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  headerActions?: ReactNode;
  showRefresh?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
  error?: string | null;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  padding?: number;
  showScrollToTop?: boolean;
  // Status indicators
  status?: 'idle' | 'loading' | 'success' | 'error' | 'warning';
  statusMessage?: string;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  current?: boolean;
}

interface ScrollTopProps {
  children: React.ReactElement;
  threshold?: number;
}

const ScrollToTop: React.FC<ScrollTopProps> = ({ children, threshold = 100 }) => {
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold,
  });

  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <Zoom in={trigger}>
      <Box
        onClick={handleClick}
        role="presentation"
        sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}
      >
        {children}
      </Box>
    </Zoom>
  );
};

export const ContentArea: React.FC<ContentAreaProps> = ({
  children,
  title,
  subtitle,
  breadcrumbs,
  headerActions,
  showRefresh = false,
  onRefresh,
  loading = false,
  error = null,
  maxWidth = 'xl',
  padding = 3,
  showScrollToTop = true,
  status = 'idle',
  statusMessage,
}) => {
  const { theme } = useThemeContext();
  const { isMobile } = useResponsive();

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return theme.colors.status.info.accent;
      case 'success':
        return theme.colors.status.success.accent;
      case 'error':
        return theme.colors.status.error.accent;
      case 'warning':
        return theme.colors.status.warning.accent;
      default:
        return theme.colors.text.tertiary;
    }
  };

  const renderHeader = () => {
    if (!title && !breadcrumbs && !headerActions) return null;

    return (
      <Box
        sx={{
          backgroundColor: theme.colors.background.glassLight,
          backdropFilter: theme.effects.blur.md,
          borderBottom: `1px solid ${theme.colors.surface.border.subtle}`,
          mb: 3,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Container maxWidth={maxWidth} sx={{ py: 2 }}>
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Box sx={{ mb: title ? 2 : 0 }}>
              <Breadcrumbs
                separator="›"
                sx={{
                  '& .MuiBreadcrumbs-separator': {
                    color: theme.colors.text.quaternary,
                    mx: 1,
                  },
                }}
              >
                {breadcrumbs.map((item, index) => (
                  <Box key={index}>
                    {item.current ? (
                      <Typography
                        variant="body2"
                        sx={{
                          color: theme.colors.text.primary,
                          fontWeight: theme.typography.fontWeight.medium,
                        }}
                      >
                        {item.label}
                      </Typography>
                    ) : item.href ? (
                      <Link
                        href={item.href}
                        underline="hover"
                        sx={{
                          color: theme.colors.text.secondary,
                          fontSize: theme.typography.fontSize.sm,
                          '&:hover': {
                            color: theme.colors.brand.primary,
                          },
                        }}
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <Typography
                        variant="body2"
                        component="button"
                        onClick={item.onClick}
                        sx={{
                          color: theme.colors.text.secondary,
                          fontSize: theme.typography.fontSize.sm,
                          background: 'none',
                          border: 'none',
                          cursor: item.onClick ? 'pointer' : 'default',
                          '&:hover': item.onClick && {
                            color: theme.colors.brand.primary,
                          },
                        }}
                      >
                        {item.label}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Breadcrumbs>
            </Box>
          )}

          {/* Title Section */}
          {title && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: subtitle ? 1 : 0 }}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontFamily: theme.typography.fontFamily.display,
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.text.primary,
                      fontSize: isMobile ? theme.typography.fontSize['2xl'] : theme.typography.fontSize['3xl'],
                    }}
                  >
                    {title}
                  </Typography>

                  {/* Status Indicator */}
                  {status !== 'idle' && (
                    <Chip
                      label={statusMessage || status}
                      size="small"
                      sx={{
                        backgroundColor: `${getStatusColor()}20`,
                        color: getStatusColor(),
                        border: `1px solid ${getStatusColor()}40`,
                        fontSize: theme.typography.fontSize.xs,
                        textTransform: 'capitalize',
                      }}
                    />
                  )}
                </Box>

                {subtitle && (
                  <Typography
                    variant="body1"
                    sx={{
                      color: theme.colors.text.secondary,
                      fontSize: theme.typography.fontSize.lg,
                      lineHeight: theme.typography.lineHeight.relaxed,
                      maxWidth: '80%',
                    }}
                  >
                    {subtitle}
                  </Typography>
                )}
              </Box>

              {/* Header Actions */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {showRefresh && (
                  <Tooltip title="Refresh" placement="bottom">
                    <IconButton
                      onClick={onRefresh}
                      disabled={loading}
                      sx={{
                        color: theme.colors.text.secondary,
                        '&:hover': {
                          color: theme.colors.brand.primary,
                          backgroundColor: theme.colors.surface.hover,
                        },
                        '&:disabled': {
                          color: theme.colors.text.disabled,
                        },
                        transition: theme.motion.normal,
                      }}
                    >
                      <RefreshIcon 
                        sx={{
                          ...(loading && {
                            animation: 'spin 1s linear infinite',
                            '@keyframes spin': {
                              '0%': { transform: 'rotate(0deg)' },
                              '100%': { transform: 'rotate(360deg)' },
                            },
                          }),
                        }}
                      />
                    </IconButton>
                  </Tooltip>
                )}
                {headerActions}
              </Box>
            </Box>
          )}
        </Container>
      </Box>
    );
  };

  const renderError = () => {
    if (!error) return null;

    return (
      <Container maxWidth={maxWidth} sx={{ mb: 3 }}>
        <Paper
          sx={{
            p: 3,
            backgroundColor: theme.colors.status.error.bg,
            border: `1px solid ${theme.colors.status.error.border}`,
            borderRadius: theme.borderRadius.lg,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InfoIcon sx={{ color: theme.colors.status.error.accent }} />
            <Box>
              <Typography
                variant="subtitle1"
                sx={{
                  color: theme.colors.status.error.text,
                  fontWeight: theme.typography.fontWeight.semibold,
                  mb: 0.5,
                }}
              >
                Error
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: theme.colors.status.error.text,
                }}
              >
                {error}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    );
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: theme.colors.background.primary,
        position: 'relative',
      }}
    >
      {/* Header */}
      {renderHeader()}

      {/* Error Display */}
      {renderError()}

      {/* Main Content */}
      <Container maxWidth={maxWidth} sx={{ pb: 6 }}>
        <Box sx={{ px: isMobile ? 1 : padding }}>
          {children}
        </Box>
      </Container>

      {/* Scroll to Top */}
      {showScrollToTop && (
        <ScrollToTop>
          <Fab
            size="small"
            aria-label="scroll back to top"
            sx={{
              backgroundColor: theme.colors.brand.primary,
              color: theme.colors.text.inverse,
              '&:hover': {
                backgroundColor: theme.colors.brand.primaryDim,
                transform: 'scale(1.1)',
              },
              transition: theme.motion.normal,
              boxShadow: theme.effects.shadows.lg,
            }}
          >
            <KeyboardArrowUpIcon />
          </Fab>
        </ScrollToTop>
      )}
    </Box>
  );
};

export default ContentArea;