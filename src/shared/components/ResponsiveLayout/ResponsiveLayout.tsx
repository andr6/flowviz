import {
  Menu as MenuIcon,
  KeyboardArrowUp,
} from '@mui/icons-material';
import {
  Box,
  Drawer,
  IconButton,
  useScrollTrigger,
  Zoom,
  Fab,
  Tooltip,
} from '@mui/material';
import React, { useState, ReactNode } from 'react';

import { useThemeContext } from '../../context/ThemeProvider';
import { useResponsive } from '../../hooks/useResponsive';

interface ResponsiveLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  sidebarWidth?: number;
  collapsedSidebarWidth?: number;
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

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const anchor = ((event.target as HTMLDivElement).ownerDocument || document).querySelector(
      '#back-to-top-anchor'
    );

    if (anchor) {
      anchor.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      });
    }
  };

  return (
    <Zoom in={trigger}>
      <Box
        onClick={handleClick}
        role="presentation"
        sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}
      >
        {children}
      </Box>
    </Zoom>
  );
};

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  sidebar,
  header,
  footer,
  sidebarWidth = 280,
  collapsedSidebarWidth = 64,
}) => {
  const { theme } = useThemeContext();
  const { isMobile, isTablet, isDesktop, isTouch } = useResponsive();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  const currentSidebarWidth = desktopSidebarCollapsed ? collapsedSidebarWidth : sidebarWidth;

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const handleSidebarToggle = () => {
    setDesktopSidebarCollapsed(!desktopSidebarCollapsed);
  };

  // Mobile drawer
  const mobileDrawer = sidebar && (
    <Drawer
      variant="temporary"
      anchor="left"
      open={mobileDrawerOpen}
      onClose={handleDrawerToggle}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
      PaperProps={{
        sx: {
          width: sidebarWidth,
          backgroundColor: theme.colors.background.secondary,
          borderRight: `1px solid ${theme.colors.surface.border.default}`,
          backdropFilter: theme.effects.blur.xl,
        },
      }}
    >
      {sidebar}
    </Drawer>
  );

  // Desktop drawer
  const desktopDrawer = sidebar && isDesktop && (
    <Drawer
      variant="permanent"
      anchor="left"
      PaperProps={{
        sx: {
          width: currentSidebarWidth,
          backgroundColor: theme.colors.background.secondary,
          borderRight: `1px solid ${theme.colors.surface.border.default}`,
          backdropFilter: theme.effects.blur.xl,
          transition: theme.motion.normal,
          overflow: 'hidden',
          '&:hover': {
            overflow: 'auto',
          },
        },
      }}
    >
      {sidebar}
    </Drawer>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile Menu Button */}
      {isMobile && sidebar && (
        <Box
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 1200,
          }}
        >
          <Tooltip title="Open menu" placement="right">
            <IconButton
              onClick={handleDrawerToggle}
              sx={{
                backgroundColor: theme.colors.background.glassHeavy,
                backdropFilter: theme.effects.blur.md,
                border: `1px solid ${theme.colors.surface.border.default}`,
                color: theme.colors.text.primary,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                  border: `1px solid ${theme.colors.surface.border.emphasis}`,
                },
                transition: theme.motion.normal,
              }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Desktop Sidebar Toggle */}
      {isDesktop && sidebar && (
        <Box
          sx={{
            position: 'fixed',
            top: '50%',
            left: currentSidebarWidth - 12,
            zIndex: 1200,
            transform: 'translateY(-50%)',
          }}
        >
          <Tooltip title={desktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
            <IconButton
              onClick={handleSidebarToggle}
              size="small"
              sx={{
                backgroundColor: theme.colors.background.glassHeavy,
                backdropFilter: theme.effects.blur.md,
                border: `1px solid ${theme.colors.surface.border.default}`,
                color: theme.colors.text.secondary,
                width: 24,
                height: 24,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                  border: `1px solid ${theme.colors.surface.border.emphasis}`,
                  color: theme.colors.brand.primary,
                },
                transition: theme.motion.normal,
              }}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Sidebar */}
      {mobileDrawer}
      {desktopDrawer}

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          marginLeft: isDesktop && sidebar ? `${currentSidebarWidth}px` : 0,
          transition: theme.motion.normal,
          minHeight: '100vh',
          // Touch-friendly spacing on mobile
          ...(isTouch && isMobile && {
            paddingTop: 2,
            paddingBottom: 2,
          }),
        }}
      >
        {/* Scroll anchor for back-to-top */}
        <div id="back-to-top-anchor" />

        {/* Header */}
        {header && (
          <Box
            component="header"
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 1100,
              backgroundColor: theme.colors.background.glassHeavy,
              backdropFilter: theme.effects.blur.xl,
              borderBottom: `1px solid ${theme.colors.surface.border.default}`,
            }}
          >
            {header}
          </Box>
        )}

        {/* Content */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            // Touch-friendly padding
            padding: isMobile ? 1 : 2,
            // Ensure content doesn't hide behind mobile menu button
            ...(isMobile && sidebar && {
              paddingTop: 8,
            }),
          }}
        >
          {children}
        </Box>

        {/* Footer */}
        {footer && (
          <Box
            component="footer"
            sx={{
              backgroundColor: theme.colors.background.secondary,
              borderTop: `1px solid ${theme.colors.surface.border.default}`,
              padding: 2,
            }}
          >
            {footer}
          </Box>
        )}
      </Box>

      {/* Scroll to Top Button */}
      <ScrollToTop>
        <Fab
          color="primary"
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
          }}
        >
          <KeyboardArrowUp />
        </Fab>
      </ScrollToTop>
    </Box>
  );
};