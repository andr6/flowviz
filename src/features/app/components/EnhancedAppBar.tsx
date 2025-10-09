/**
 * Enhanced AppBar with Advanced Navigation
 * Updated AppBar component integrating all new navigation features
 */
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  Help as HelpIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState, useCallback } from 'react';

import { EnhancedBreadcrumb, BreadcrumbItem } from '../../../shared/components/Breadcrumb/EnhancedBreadcrumb';
import { EnhancedCommandPalette } from '../../../shared/components/CommandPalette/EnhancedCommandPalette';
import { useGuidedTour } from '../../../shared/components/HelpSystem/GuidedTourProvider';
import { useAdvancedNavigation } from '../../../shared/hooks/useAdvancedNavigation';

interface EnhancedAppBarProps {
  onMenuClick?: () => void;
  onNavigate?: (path: string) => void;
  currentUser?: {
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
  notifications?: number;
  threatLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export const EnhancedAppBar: React.FC<EnhancedAppBarProps> = ({
  onMenuClick,
  onNavigate,
  currentUser,
  notifications = 0,
  threatLevel = 'low',
}) => {
  const theme = useTheme();
  const navigation = useAdvancedNavigation();
  const { startTour, getAvailableTours } = useGuidedTour();
  
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [helpMenuAnchor, setHelpMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationMenuAnchor, setNotificationMenuAnchor] = useState<null | HTMLElement>(null);

  // Sample breadcrumb data - in real app this would come from router/state
  const sampleBreadcrumbs: BreadcrumbItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: DashboardIcon,
    },
    {
      id: 'analysis',
      label: 'Threat Analysis',
      path: '/analysis',
      icon: SecurityIcon,
      metadata: {
        analysisType: 'APT Campaign',
        status: 'active',
        tags: ['APT29', 'Healthcare'],
      },
    },
  ];

  const handleUserMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  }, []);

  const handleHelpMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setHelpMenuAnchor(event.currentTarget);
  }, []);

  const handleNotificationMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setNotificationMenuAnchor(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setUserMenuAnchor(null);
    setHelpMenuAnchor(null);
    setNotificationMenuAnchor(null);
  }, []);

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return theme.palette.error.main;
      case 'high': return theme.palette.warning.main;
      case 'medium': return theme.palette.info.main;
      default: return theme.palette.success.main;
    }
  };

  const availableTours = getAvailableTours();

  return (
    <>
      <MuiAppBar 
        position="sticky" 
        elevation={1}
        sx={{ 
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
        }}
        data-tour="main-header"
      >
        <Toolbar sx={{ gap: 2 }}>
          {/* Menu button */}
          <IconButton
            edge="start"
            onClick={onMenuClick}
            sx={{ color: 'text.primary' }}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo and title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
              <SecurityIcon />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
              ThreatFlow
            </Typography>
            <Chip
              label={`v2.0`}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          </Box>

          {/* Threat level indicator */}
          <Chip
            icon={<TrendingUpIcon />}
            label={`Threat Level: ${threatLevel.toUpperCase()}`}
            size="small"
            sx={{
              bgcolor: `${getThreatLevelColor(threatLevel)  }20`,
              color: getThreatLevelColor(threatLevel),
              fontWeight: 600,
            }}
          />

          {/* Breadcrumb navigation */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <EnhancedBreadcrumb
              items={sampleBreadcrumbs}
              maxItems={3}
              showHistory={true}
              showBookmarks={true}
              onNavigate={(item) => {
                console.log('Navigate to:', item.path);
                if (onNavigate) {onNavigate(item.path);}
              }}
            />
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Search/Command palette button */}
            <Tooltip title="Search & Commands (⌘K)">
              <IconButton
                onClick={navigation.openCommandPalette}
                sx={{ color: 'text.primary' }}
                data-tour="command-palette"
              >
                <SearchIcon />
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton
                onClick={handleNotificationMenuOpen}
                sx={{ color: 'text.primary' }}
              >
                <Badge badgeContent={notifications} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Help menu */}
            <Tooltip title="Help & Tours">
              <IconButton
                onClick={handleHelpMenuOpen}
                sx={{ color: 'text.primary' }}
              >
                <HelpIcon />
              </IconButton>
            </Tooltip>

            {/* User menu */}
            <Tooltip title="Account">
              <IconButton onClick={handleUserMenuOpen}>
                {currentUser?.avatar ? (
                  <Avatar src={currentUser.avatar} sx={{ width: 32, height: 32 }} />
                ) : (
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                    {currentUser?.name?.charAt(0) || 'U'}
                  </Avatar>
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </MuiAppBar>

      {/* Command Palette */}
      <EnhancedCommandPalette
        open={navigation.isCommandPaletteOpen}
        onClose={navigation.closeCommandPalette}
        onNavigate={(path) => {
          console.log('Command palette navigate:', path);
          if (onNavigate) {onNavigate(path);}
        }}
        currentUser={currentUser}
      />

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{ sx: { minWidth: 250 } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2">{currentUser?.name || 'User'}</Typography>
          <Typography variant="caption" color="text.secondary">
            {currentUser?.email || 'user@example.com'}
          </Typography>
          <Chip
            label={currentUser?.role || 'Analyst'}
            size="small"
            variant="outlined"
            sx={{ mt: 0.5 }}
          />
        </Box>
        <Divider />
        <MenuItem onClick={handleMenuClose}>
          <AccountCircleIcon sx={{ mr: 1 }} />
          Profile Settings
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <SettingsIcon sx={{ mr: 1 }} />
          Preferences
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <SecurityIcon sx={{ mr: 1 }} />
          Security
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>
          Sign Out
        </MenuItem>
      </Menu>

      {/* Help Menu */}
      <Menu
        anchorEl={helpMenuAnchor}
        open={Boolean(helpMenuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{ sx: { minWidth: 300 } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2">Help & Learning</Typography>
          <Typography variant="caption" color="text.secondary">
            Get started with guided tours and documentation
          </Typography>
        </Box>
        <Divider />
        
        {availableTours.map((tour) => (
          <MenuItem
            key={tour.id}
            onClick={() => {
              startTour(tour.id);
              handleMenuClose();
            }}
          >
            <tour.icon sx={{ mr: 1 }} />
            <Box>
              <Typography variant="body2">{tour.title}</Typography>
              <Typography variant="caption" color="text.secondary">
                {tour.description} • {tour.estimatedTime}min
              </Typography>
            </Box>
          </MenuItem>
        ))}
        
        <Divider />
        <MenuItem onClick={handleMenuClose}>
          <HelpIcon sx={{ mr: 1 }} />
          Documentation
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <SecurityIcon sx={{ mr: 1 }} />
          Keyboard Shortcuts
        </MenuItem>
      </Menu>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationMenuAnchor}
        open={Boolean(notificationMenuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{ sx: { minWidth: 350, maxHeight: 400 } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2">Notifications</Typography>
          <Typography variant="caption" color="text.secondary">
            {notifications} new alerts
          </Typography>
        </Box>
        <Divider />
        
        {notifications > 0 ? (
          // Sample notifications - in real app would come from state/API
          Array.from({ length: Math.min(notifications, 5) }, (_, i) => (
            <MenuItem key={i} onClick={handleMenuClose}>
              <Box>
                <Typography variant="body2">
                  New threat detected: APT{29 + i} Campaign
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {i + 1} minutes ago • High severity
                </Typography>
              </Box>
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>
            <Typography variant="body2">No new notifications</Typography>
          </MenuItem>
        )}
        
        <Divider />
        <MenuItem onClick={handleMenuClose}>
          <Typography variant="body2" color="primary">
            View all notifications
          </Typography>
        </MenuItem>
      </Menu>
    </>
  );
};

export default EnhancedAppBar;