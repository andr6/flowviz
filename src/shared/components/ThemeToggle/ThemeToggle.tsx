import {
  DarkMode,
  LightMode,
  SettingsBrightness,
  Computer,
  Check,
} from '@mui/icons-material';
import {
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';

import { useThemeContext } from '../../context/ThemeProvider';

export const ThemeToggle: React.FC = () => {
  const { theme, themeMode, actualTheme, setThemeMode, toggleTheme } = useThemeContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleThemeSelect = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    handleClose();
  };

  const getIcon = () => {
    switch (actualTheme) {
      case 'light':
        return <LightMode fontSize="small" />;
      case 'dark':
        return <DarkMode fontSize="small" />;
      default:
        return <SettingsBrightness fontSize="small" />;
    }
  };

  const getTooltipTitle = () => {
    const modeText = themeMode === 'system' ? 'System' : 
                    actualTheme === 'dark' ? 'Dark' : 'Light';
    return `Theme: ${modeText} • Click for options`;
  };

  return (
    <>
      <Tooltip title={getTooltipTitle()} placement="bottom" arrow>
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{
            backgroundColor: theme.colors.surface.rest,
            border: `1px solid ${theme.colors.surface.border.default}`,
            color: theme.colors.text.secondary,
            transition: theme.motion.normal,
            backdropFilter: theme.effects.blur.md,
            boxShadow: theme.colors.effects.shadows.sm,
            '&:hover': {
              backgroundColor: theme.colors.surface.hover,
              border: `1px solid ${theme.colors.surface.border.emphasis}`,
              color: theme.colors.brand.primary,
              transform: 'translateY(-1px)',
              boxShadow: theme.colors.effects.shadows.md,
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          }}
        >
          {getIcon()}
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            backgroundColor: theme.colors.background.glassHeavy,
            backdropFilter: theme.effects.blur.xl,
            border: `1px solid ${theme.colors.surface.border.default}`,
            borderRadius: theme.borderRadius.lg,
            boxShadow: theme.colors.effects.shadows.xl,
            minWidth: 200,
            mt: 1,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography
            variant="subtitle2"
            sx={{
              color: theme.colors.text.secondary,
              fontWeight: theme.typography.fontWeight.semibold,
              fontSize: theme.typography.fontSize.xs,
              textTransform: 'uppercase',
              letterSpacing: theme.typography.letterSpacing.wider,
            }}
          >
            Theme Mode
          </Typography>
        </Box>

        <Divider sx={{ borderColor: theme.colors.surface.border.subtle }} />

        <MenuItem
          onClick={() => handleThemeSelect('light')}
          sx={{
            color: theme.colors.text.primary,
            '&:hover': {
              backgroundColor: theme.colors.surface.hover,
            },
          }}
        >
          <ListItemIcon>
            <LightMode
              fontSize="small"
              sx={{ color: theme.colors.text.secondary }}
            />
          </ListItemIcon>
          <ListItemText>Light</ListItemText>
          {themeMode === 'light' && (
            <Check
              fontSize="small"
              sx={{ color: theme.colors.brand.primary, ml: 1 }}
            />
          )}
        </MenuItem>

        <MenuItem
          onClick={() => handleThemeSelect('dark')}
          sx={{
            color: theme.colors.text.primary,
            '&:hover': {
              backgroundColor: theme.colors.surface.hover,
            },
          }}
        >
          <ListItemIcon>
            <DarkMode
              fontSize="small"
              sx={{ color: theme.colors.text.secondary }}
            />
          </ListItemIcon>
          <ListItemText>Dark</ListItemText>
          {themeMode === 'dark' && (
            <Check
              fontSize="small"
              sx={{ color: theme.colors.brand.primary, ml: 1 }}
            />
          )}
        </MenuItem>

        <MenuItem
          onClick={() => handleThemeSelect('system')}
          sx={{
            color: theme.colors.text.primary,
            '&:hover': {
              backgroundColor: theme.colors.surface.hover,
            },
          }}
        >
          <ListItemIcon>
            <Computer
              fontSize="small"
              sx={{ color: theme.colors.text.secondary }}
            />
          </ListItemIcon>
          <ListItemText>
            <Box>
              <Typography variant="inherit">System</Typography>
              <Typography
                variant="caption"
                sx={{
                  color: theme.colors.text.tertiary,
                  fontSize: theme.typography.fontSize.xs,
                }}
              >
                Currently {actualTheme}
              </Typography>
            </Box>
          </ListItemText>
          {themeMode === 'system' && (
            <Check
              fontSize="small"
              sx={{ color: theme.colors.brand.primary, ml: 1 }}
            />
          )}
        </MenuItem>
      </Menu>
    </>
  );
};