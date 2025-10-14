import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  PersonOutline as PersonOutlineIcon,
  Help as HelpIcon,
  MoreVert as MoreVertIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import {
  AppBar as MuiAppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  Avatar,
  Chip,
} from '@mui/material';
import { keyframes } from '@mui/system';
import React, { useState } from 'react';

import { GlassIconButton } from '../../../shared/components/Button';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';
import { DensityToggle } from '../../../shared/components/DensityToggle';
import { useThemeContext } from '../../../shared/context/ThemeProvider';

// Professional streaming animation
const streamingGradient = keyframes`
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
`;

interface CompactAppBarProps {
  onMenuToggle?: () => void;
  isStreaming?: boolean;
  title?: string;
  subtitle?: string;
  showMenuButton?: boolean;
  // Analysis state
  analysisStatus?: 'idle' | 'processing' | 'completed' | 'error';
  progressMessage?: string;
  // User information
  userName?: string;
  userAvatar?: string;
  // Notifications
  notificationCount?: number;
  onNotificationClick?: () => void;
  // Actions
  onUserMenuClick?: () => void;
  onHelpClick?: () => void;
  onFullscreenToggle?: () => void;
  isFullscreen?: boolean;
}

export const CompactAppBar: React.FC<CompactAppBarProps> = ({
  onMenuToggle,
  isStreaming = false,
  title = 'ThreatFlow',
  subtitle,
  showMenuButton = true,
  analysisStatus = 'idle',
  progressMessage,
  userName = 'Analyst',
  userAvatar,
  notificationCount = 0,
  onNotificationClick,
  onUserMenuClick,
  onHelpClick,
  onFullscreenToggle,
  isFullscreen = false,
}) => {
  const { theme } = useThemeContext();
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const getStatusColor = () => {
    switch (analysisStatus) {
      case 'processing':
        return theme.colors.status.warning.accent;
      case 'completed':
        return theme.colors.status.success.accent;
      case 'error':
        return theme.colors.status.error.accent;
      default:
        return theme.colors.text.tertiary;
    }
  };

  const getStatusText = () => {
    switch (analysisStatus) {
      case 'processing':
        return progressMessage || 'Processing...';
      case 'completed':
        return 'Analysis Complete';
      case 'error':
        return 'Analysis Error';
      default:
        return 'Ready';
    }
  };

  return (
    <MuiAppBar 
      position="static" 
      elevation={0}
      sx={{
        backgroundColor: theme.colors.background.primary,
        backdropFilter: theme.effects.blur.md,
        borderBottom: `1px solid ${theme.colors.surface.border.default}`,
        boxShadow: theme.effects.shadows.sm,
        height: 64,
        // Enhanced streaming indicator
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: isStreaming 
            ? 'linear-gradient(90deg, transparent 0%, rgba(0, 102, 255, 0.7) 30%, rgba(0, 102, 255, 1) 50%, rgba(0, 102, 255, 0.7) 70%, transparent 100%)'
            : 'transparent',
          ...(isStreaming && {
            animation: `${streamingGradient} 1.8s ease-in-out infinite`,
          }),
        },
      }}
    >
      <Toolbar 
        sx={{ 
          minHeight: 64,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {showMenuButton && (
            <Tooltip title="Toggle sidebar" placement="bottom">
              <IconButton
                onClick={onMenuToggle}
                sx={{
                  color: theme.colors.text.secondary,
                  '&:hover': {
                    backgroundColor: theme.colors.surface.hover,
                    color: theme.colors.text.primary,
                  },
                  transition: theme.motion.normal,
                }}
              >
                <MenuIcon />
              </IconButton>
            </Tooltip>
          )}

          <Box>
            <Typography
              variant="h6"
              sx={{
                fontFamily: theme.typography.fontFamily.display,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.text.primary,
                fontSize: theme.typography.fontSize.lg,
                lineHeight: 1.2,
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="caption"
                sx={{
                  color: theme.colors.text.tertiary,
                  fontSize: theme.typography.fontSize.xs,
                  display: 'block',
                  lineHeight: 1,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Center Section - Analysis Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {analysisStatus !== 'idle' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(),
                  ...(analysisStatus === 'processing' && {
                    animation: 'pulse 1.5s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                    },
                  }),
                }}
              />
              <Chip
                label={getStatusText()}
                size="small"
                sx={{
                  backgroundColor: `${getStatusColor()}20`,
                  color: getStatusColor(),
                  border: `1px solid ${getStatusColor()}40`,
                  fontSize: theme.typography.fontSize.xs,
                  height: 24,
                  '& .MuiChip-label': {
                    px: 1.5,
                  },
                }}
              />
            </Box>
          )}
        </Box>

        {/* Right Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Fullscreen Toggle */}
          {onFullscreenToggle && (
            <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} placement="bottom">
              <GlassIconButton
                onClick={onFullscreenToggle}
                size="small"
                sx={{
                  color: theme.colors.text.secondary,
                  '&:hover': {
                    color: theme.colors.text.primary,
                  },
                }}
              >
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </GlassIconButton>
            </Tooltip>
          )}

          {/* Help */}
          {onHelpClick && (
            <Tooltip title="Help & Documentation" placement="bottom">
              <GlassIconButton
                onClick={onHelpClick}
                size="small"
                sx={{
                  color: theme.colors.text.secondary,
                  '&:hover': {
                    color: theme.colors.text.primary,
                  },
                }}
              >
                <HelpIcon />
              </GlassIconButton>
            </Tooltip>
          )}

          {/* Notifications */}
          <Tooltip title="Notifications" placement="bottom">
            <GlassIconButton
              onClick={onNotificationClick}
              size="small"
              sx={{
                color: theme.colors.text.secondary,
                '&:hover': {
                  color: theme.colors.text.primary,
                },
              }}
            >
              <Badge 
                badgeContent={notificationCount} 
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.6rem',
                    height: 16,
                    minWidth: 16,
                  },
                }}
              >
                <NotificationsIcon />
              </Badge>
            </GlassIconButton>
          </Tooltip>

          {/* Density Toggle */}
          <DensityToggle />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          <Tooltip title="User menu" placement="bottom">
            <IconButton
              onClick={handleUserMenuOpen}
              sx={{
                p: 0.5,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                },
                transition: theme.motion.normal,
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: theme.colors.brand.primary,
                  color: theme.colors.text.inverse,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                }}
                src={userAvatar}
              >
                {userName.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>

          {/* User Menu Dropdown */}
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                backgroundColor: theme.colors.background.secondary,
                backdropFilter: theme.effects.blur.md,
                border: `1px solid ${theme.colors.surface.border.default}`,
                borderRadius: theme.borderRadius.lg,
                boxShadow: theme.effects.shadows.lg,
                mt: 1,
                minWidth: 200,
              },
            }}
          >
            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.colors.surface.border.subtle}` }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.text.primary,
                }}
              >
                {userName}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: theme.colors.text.tertiary,
                }}
              >
                Security Analyst
              </Typography>
            </Box>
            
            <MenuItem onClick={handleUserMenuClose}>
              <PersonOutlineIcon sx={{ mr: 2, fontSize: 20 }} />
              Profile Settings
            </MenuItem>
            
            <MenuItem onClick={onUserMenuClick}>
              <MoreVertIcon sx={{ mr: 2, fontSize: 20 }} />
              Preferences
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
};

export default CompactAppBar;