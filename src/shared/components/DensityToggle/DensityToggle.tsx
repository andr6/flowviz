/**
 * Compact Density Toggle for AppBar
 *
 * A small, icon-only toggle for changing UI density levels.
 */

import React, { useState } from 'react';
import {
  ViewCompact as CompactIcon,
  ViewComfy as ComfortableIcon,
  ViewDay as SpaciousIcon,
} from '@mui/icons-material';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Box,
  Typography,
} from '@mui/material';

import { useDensity } from '../../context/DensityContext';
import { UIDensity } from '../../theme/density';
import { useThemeContext } from '../../context/ThemeProvider';

const DENSITY_OPTIONS = {
  [UIDensity.Compact]: {
    icon: CompactIcon,
    label: 'Compact',
    description: 'Maximum information density',
  },
  [UIDensity.Comfortable]: {
    icon: ComfortableIcon,
    label: 'Comfortable',
    description: 'Balanced spacing',
  },
  [UIDensity.Spacious]: {
    icon: SpaciousIcon,
    label: 'Spacious',
    description: 'Maximum readability',
  },
};

export const DensityToggle: React.FC = () => {
  const { density, setDensity } = useDensity();
  const { theme } = useThemeContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDensityChange = (newDensity: UIDensity) => {
    setDensity(newDensity);
    handleClose();
  };

  const currentOption = DENSITY_OPTIONS[density];
  const CurrentIcon = currentOption.icon;

  return (
    <>
      <Tooltip title={`UI Density: ${currentOption.label}`} placement="bottom">
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{
            color: theme.colors.text.secondary,
            '&:hover': {
              color: theme.colors.text.primary,
              backgroundColor: theme.colors.surface.hover,
            },
            transition: theme.motion.normal,
          }}
        >
          <CurrentIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
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
            mt: 1,
            minWidth: 240,
            backgroundColor: theme.colors.surface.elevated,
            backdropFilter: theme.effects.blur.md,
            border: `1px solid ${theme.colors.surface.border.subtle}`,
            borderRadius: theme.borderRadius.lg,
            boxShadow: theme.effects.shadows.lg,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${theme.colors.surface.border.subtle}` }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.text.primary,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            UI Density
          </Typography>
        </Box>

        {Object.entries(DENSITY_OPTIONS).map(([key, option]) => {
          const densityKey = key as UIDensity;
          const Icon = option.icon;
          const isSelected = density === densityKey;

          return (
            <MenuItem
              key={key}
              onClick={() => handleDensityChange(densityKey)}
              selected={isSelected}
              sx={{
                px: 2,
                py: 1.5,
                '&.Mui-selected': {
                  backgroundColor: `${theme.colors.brand.primary}15`,
                  '&:hover': {
                    backgroundColor: `${theme.colors.brand.primary}25`,
                  },
                },
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: isSelected ? theme.colors.brand.primary : theme.colors.text.secondary,
                }}
              >
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={option.label}
                secondary={option.description}
                primaryTypographyProps={{
                  sx: {
                    fontWeight: isSelected ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.normal,
                    color: isSelected ? theme.colors.brand.primary : theme.colors.text.primary,
                    fontSize: theme.typography.fontSize.sm,
                  },
                }}
                secondaryTypographyProps={{
                  sx: {
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.text.tertiary,
                  },
                }}
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default DensityToggle;
