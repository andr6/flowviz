import React, { useState, useCallback } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  Fade,
  FormControlLabel,
  Switch,
  Divider
} from '@mui/material';
import {
  AccountTree as HierarchicalIcon,
  ScatterPlot as ForceDirectedIcon,
  Timeline as TimelineIcon,
  RadioButtonUnchecked as CircularIcon,
  GridOn as GridIcon,
  Tune as LayoutIcon,
  Animation as AnimationIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';

import { THEME } from '../constants';
import { LayoutType } from '../utils/advancedLayoutUtils';

interface LayoutControlsProps {
  visible?: boolean;
  currentLayout: LayoutType;
  onLayoutChange: (layout: LayoutType, options?: any) => void;
  isAnimating?: boolean;
  animationEnabled?: boolean;
  onAnimationToggle?: (enabled: boolean) => void;
}

const LayoutControls: React.FC<LayoutControlsProps> = ({
  visible = true,
  currentLayout,
  onLayoutChange,
  isAnimating = false,
  animationEnabled = true,
  onAnimationToggle
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLayoutSelect = useCallback((layout: LayoutType, options?: any) => {
    onLayoutChange(layout, options);
    handleClose();
  }, [onLayoutChange]);

  const layoutOptions = [
    {
      type: 'hierarchical' as LayoutType,
      label: 'Hierarchical',
      description: 'Top-down flow based on attack progression',
      icon: <HierarchicalIcon />,
      shortcut: 'H'
    },
    {
      type: 'force-directed' as LayoutType,
      label: 'Force-Directed',
      description: 'Physics-based layout showing relationships',
      icon: <ForceDirectedIcon />,
      shortcut: 'F'
    },
    {
      type: 'timeline' as LayoutType,
      label: 'Timeline',
      description: 'Chronological layout by MITRE tactics',
      icon: <TimelineIcon />,
      shortcut: 'T'
    },
    {
      type: 'circular' as LayoutType,
      label: 'Circular',
      description: 'Circular arrangement for network view',
      icon: <CircularIcon />,
      shortcut: 'C'
    },
    {
      type: 'grid' as LayoutType,
      label: 'Grid',
      description: 'Organized grid layout',
      icon: <GridIcon />,
      shortcut: 'G'
    }
  ];

  const getCurrentLayoutIcon = () => {
    const current = layoutOptions.find(option => option.type === currentLayout);
    return current?.icon || <HierarchicalIcon />;
  };

  const getCurrentLayoutLabel = () => {
    const current = layoutOptions.find(option => option.type === currentLayout);
    return current?.label || 'Hierarchical';
  };

  if (!visible) return null;

  return (
    <Fade in={visible} timeout={300}>
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        {/* Main Layout Control */}
        <Paper
          elevation={8}
          sx={{
            background: THEME.background.secondary,
            border: THEME.border.default,
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            boxShadow: THEME.shadow.panel,
            overflow: 'hidden'
          }}
        >
          {/* Current Layout Display */}
          <Box sx={{ 
            p: 1.5,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <LayoutIcon sx={{ fontSize: 16, color: THEME.text.secondary }} />
            <Typography 
              variant="caption" 
              sx={{ 
                color: THEME.text.secondary,
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Layout
            </Typography>
            <Box sx={{ 
              ml: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}>
              {getCurrentLayoutIcon()}
              <Typography 
                variant="caption" 
                sx={{ 
                  color: THEME.text.primary,
                  fontSize: '0.7rem',
                  fontWeight: 500
                }}
              >
                {getCurrentLayoutLabel()}
              </Typography>
            </Box>
          </Box>

          {/* Layout Selection Button */}
          <Tooltip title="Choose Layout Algorithm" placement="right" arrow>
            <IconButton
              onClick={handleClick}
              disabled={isAnimating}
              sx={{
                width: '100%',
                borderRadius: 0,
                p: 1.5,
                color: 'rgba(255, 255, 255, 0.8)',
                backgroundColor: isAnimating ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff'
                },
                '&:disabled': {
                  color: 'rgba(255, 255, 255, 0.3)'
                }
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: 1,
                width: '100%'
              }}>
                {isAnimating ? (
                  <>
                    <AnimationIcon 
                      sx={{ 
                        fontSize: 18,
                        animation: 'spin 1s linear infinite',
                        '@keyframes spin': {
                          '0%': { transform: 'rotate(0deg)' },
                          '100%': { transform: 'rotate(360deg)' }
                        }
                      }} 
                    />
                    <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                      Applying Layout...
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                      Switch Layout
                    </Typography>
                  </>
                )}
              </Box>
            </IconButton>
          </Tooltip>
        </Paper>

        {/* Animation Controls */}
        {animationEnabled !== undefined && onAnimationToggle && (
          <Paper
            elevation={8}
            sx={{
              background: THEME.background.secondary,
              border: THEME.border.default,
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
              boxShadow: THEME.shadow.panel,
              p: 1.5
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={animationEnabled}
                  onChange={(e) => onAnimationToggle(e.target.checked)}
                  size="small"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#4ade80'
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#4ade80'
                    }
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SpeedIcon sx={{ fontSize: 14, color: THEME.text.secondary }} />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: THEME.text.secondary,
                      fontSize: '0.7rem',
                      fontWeight: 500
                    }}
                  >
                    Animations
                  </Typography>
                </Box>
              }
              sx={{ margin: 0 }}
            />
          </Paper>
        )}

        {/* Layout Menu */}
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          PaperProps={{
            elevation: 16,
            sx: {
              background: THEME.background.secondary,
              border: THEME.border.default,
              borderRadius: '12px',
              backdropFilter: 'blur(20px)',
              boxShadow: THEME.shadow.panel,
              minWidth: 280,
              maxWidth: 320,
              mt: 1
            }
          }}
        >
          {/* Menu Header */}
          <Box sx={{ 
            p: 2,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            mb: 1
          }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: THEME.text.primary,
                fontWeight: 600,
                mb: 0.5
              }}
            >
              Layout Algorithms
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: THEME.text.secondary,
                fontSize: '0.7rem',
                lineHeight: 1.3
              }}
            >
              Choose how nodes are arranged in the visualization
            </Typography>
          </Box>

          {/* Layout Options */}
          {layoutOptions.map((option) => (
            <MenuItem
              key={option.type}
              onClick={() => handleLayoutSelect(option.type)}
              selected={currentLayout === option.type}
              sx={{
                mx: 1,
                borderRadius: '8px',
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(74, 222, 128, 0.15)',
                  '&:hover': {
                    backgroundColor: 'rgba(74, 222, 128, 0.2)'
                  }
                }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                {option.icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: THEME.text.primary,
                        fontWeight: 500,
                        fontSize: '0.85rem'
                      }}
                    >
                      {option.label}
                    </Typography>
                    <Box
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        px: 0.5,
                        py: 0.25,
                        ml: 'auto'
                      }}
                    >
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: THEME.text.secondary,
                          fontSize: '0.6rem',
                          fontWeight: 600
                        }}
                      >
                        {option.shortcut}
                      </Typography>
                    </Box>
                  </Box>
                }
                secondary={
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: THEME.text.secondary,
                      fontSize: '0.7rem',
                      lineHeight: 1.2,
                      mt: 0.5,
                      display: 'block'
                    }}
                  >
                    {option.description}
                  </Typography>
                }
              />
            </MenuItem>
          ))}

          <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Advanced Options Toggle */}
          <MenuItem
            onClick={() => setShowAdvanced(!showAdvanced)}
            sx={{
              mx: 1,
              borderRadius: '8px',
              justifyContent: 'center'
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                color: THEME.text.secondary,
                fontSize: '0.7rem',
                fontWeight: 500
              }}
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </Typography>
          </MenuItem>
        </Menu>

        {/* Keyboard Shortcuts Hint */}
        <Fade in={true} timeout={500}>
          <Paper
            sx={{
              background: 'rgba(74, 222, 128, 0.1)',
              border: '1px solid rgba(74, 222, 128, 0.3)',
              borderRadius: '8px',
              backdropFilter: 'blur(10px)',
              p: 1,
              maxWidth: 200
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#4ade80',
                fontSize: '0.7rem',
                lineHeight: 1.3
              }}
            >
              💡 Use keyboard shortcuts (H, F, T, C, G) for quick layout switching
            </Typography>
          </Paper>
        </Fade>
      </Box>
    </Fade>
  );
};

export default LayoutControls;