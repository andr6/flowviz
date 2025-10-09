import CodeIcon from '@mui/icons-material/Code';
import DownloadIcon from '@mui/icons-material/Download';
import FilterListIcon from '@mui/icons-material/FilterList';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import HomeIcon from '@mui/icons-material/Home';
import ImageIcon from '@mui/icons-material/Image';
import SaveIcon from '@mui/icons-material/Save';
import SecurityIcon from '@mui/icons-material/Security';
import SettingsIcon from '@mui/icons-material/Settings';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import {
  AppBar as MuiAppBar,
  Box,
  Toolbar,
  Typography,
  Tooltip,
} from '@mui/material';
import { keyframes } from '@mui/system';
import { useState } from 'react';

import { GlassIconButton } from '../../../shared/components/Button';
import { ActionMenu } from '../../../shared/components/Dropdown';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';
import { FlowIcon } from '../../../shared/components/Typography';
import { useThemeContext } from '../../../shared/context/ThemeProvider';
import ToolbarStoryModeControls from '../../flow-analysis/components/components/ToolbarStoryModeControls';

// Professional streaming animation with cybersecurity theme
const streamingGradient = keyframes`
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
`;

// Brand logo pulse animation
const brandPulse = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.02);
  }
`;

// Professional glow effect for streaming
const streamingGlow = keyframes`
  0%, 100% {
    filter: drop-shadow(0 0 8px rgba(0, 212, 255, 0.3));
  }
  50% {
    filter: drop-shadow(0 0 16px rgba(0, 212, 255, 0.6));
  }
`;

interface AppBarProps {
  isStreaming: boolean;
  exportFunction: ((format: 'png' | 'json' | 'afb') => void) | null;
  storyModeData: any;
  showGraphActions: boolean; // Whether to show graph-specific actions (New search, Save)
  onNewSearch: () => void;
  onDownloadClick: (format: 'png' | 'json' | 'afb') => void;
  onSaveClick: () => void;
  onLoadClick: () => void;
  onSettingsClick: () => void;
  // Advanced visualization controls
  enableAdvancedVisualization?: boolean;
  onToggleAdvancedVisualization?: () => void;
  showVisualizationFilters?: boolean;
  onToggleVisualizationFilters?: () => void;
}

export default function AppBar({
  isStreaming,
  exportFunction,
  storyModeData,
  showGraphActions,
  onNewSearch,
  onDownloadClick,
  onSaveClick,
  onLoadClick,
  onSettingsClick,
  enableAdvancedVisualization = false,
  onToggleAdvancedVisualization,
  showVisualizationFilters = false,
  onToggleVisualizationFilters,
}: AppBarProps) {
  const { theme } = useThemeContext();
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState<null | HTMLElement>(null);

  const handleDownloadMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setDownloadMenuAnchor(event.currentTarget);
  };

  const handleDownloadMenuClose = () => {
    setDownloadMenuAnchor(null);
  };

  const handleDownloadClick = (format: 'png' | 'json' | 'afb') => {
    onDownloadClick(format);
    handleDownloadMenuClose();
  };

  return (
    <MuiAppBar 
      position="static" 
      elevation={0}
      sx={{ 
        backgroundColor: theme.colors.background.primary,
        backdropFilter: theme.effects.blur.md,
        background: `
          ${theme.effects.gradients.light},
          linear-gradient(90deg, ${theme.colors.brand.light} 0%, ${theme.colors.brand.lightMedium} 50%, rgba(0, 102, 255, 0.02) 100%)
        `,
        borderBottom: `1px solid ${theme.colors.surface.border.subtle}`,
        boxShadow: `${theme.effects.shadows.md}, 0 0 20px rgba(0, 102, 255, 0.08)`,
        position: 'relative',
        // Enhanced streaming indicator with professional cybersecurity aesthetics
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: isStreaming 
            ? 'linear-gradient(90deg, transparent 0%, rgba(0, 102, 255, 0.7) 30%, rgba(0, 102, 255, 1) 50%, rgba(0, 102, 255, 0.7) 70%, transparent 100%)'
            : `linear-gradient(90deg, transparent 0%, ${theme.colors.brand.primary}40 50%, transparent 100%)`,
          boxShadow: isStreaming ? `0 0 8px ${theme.colors.brand.primary}60` : 'none',
          ...(isStreaming && {
            animation: `${streamingGradient} 1.8s ease-in-out infinite`,
          }),
        },
        // Professional gradient overlay for enhanced depth
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '2px',
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(180deg, rgba(0, 102, 255, 0.02) 0%, transparent 100%)`,
          pointerEvents: 'none',
        },
      }}
    >
      <Toolbar sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: theme.spacing[6], 
        minHeight: '76px', // Slightly taller for more professional appearance
        padding: `0 ${theme.spacing[6]}px`,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Left Side - Professional Brand Identity */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: theme.spacing[3],
          flex: '1 1 0',
          justifyContent: 'flex-start'
        }}>
          {/* Enhanced Brand Icon with Professional Aesthetics and Accessibility */}
          <Box
            component="button"
            role="button"
            tabIndex={0}
            aria-label="ThreatFlow Home - Navigate to main dashboard"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                // Navigate to home functionality could be added here
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: theme.borderRadius.lg,
              background: `
                ${theme.effects.gradients.brand},
                linear-gradient(45deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%)
              `,
              border: `1px solid ${theme.colors.brand.primary}40`,
              boxShadow: `
                ${theme.effects.shadows.brandGlow}, 
                inset 0 1px 0 rgba(255, 255, 255, 0.1),
                0 0 20px rgba(0, 225, 255, 0.2)
              `,
              animation: isStreaming ? `${brandPulse} 2.2s ease-in-out infinite` : 'none',
              transition: `all ${theme.motion.normal}`,
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              // Enhanced focus styles for accessibility
              '&:focus': {
                outline: 'none',
                boxShadow: `
                  ${theme.effects.shadows.brandGlow}, 
                  inset 0 1px 0 rgba(255, 255, 255, 0.15),
                  0 0 0 3px ${theme.colors.brand.primary}60
                `,
                transform: 'scale(1.05)',
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, ${theme.colors.brand.primary}20 60deg, transparent 120deg)`,
                opacity: isStreaming ? 0.6 : 0,
                animation: isStreaming ? `${streamingGradient} 3s linear infinite` : 'none',
                borderRadius: theme.borderRadius.lg,
              },
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: `
                  ${theme.effects.shadows.brandGlow}, 
                  inset 0 1px 0 rgba(255, 255, 255, 0.15),
                  0 0 30px rgba(0, 225, 255, 0.4)
                `,
              },
            }}
          >
            <SecurityIcon 
              sx={{ 
                fontSize: 20, 
                color: theme.colors.text.primary,
                filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.3))',
                zIndex: 1,
                position: 'relative',
              }} 
            />
          </Box>

          {/* Enhanced Brand Name with Professional Typography */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            <Typography
              variant="h5"
              sx={{
                fontFamily: theme.typography.fontFamily.display,
                background: isStreaming 
                  ? 'linear-gradient(90deg, rgba(0, 225, 255, 0.5) 0%, rgba(0, 225, 255, 1) 25%, rgba(255, 255, 255, 1) 50%, rgba(0, 225, 255, 1) 75%, rgba(0, 225, 255, 0.5) 100%)'
                  : `linear-gradient(135deg, ${theme.colors.brand.primary} 0%, rgba(255, 255, 255, 0.95) 50%, ${theme.colors.brand.primary} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: theme.typography.fontWeight.black,
                letterSpacing: theme.typography.letterSpacing.tighter,
                fontSize: '1.75rem',
                lineHeight: theme.typography.lineHeight.tight,
                textShadow: `0 0 30px ${theme.colors.brand.primary}40`,
                ...(isStreaming && {
                  backgroundSize: '200% 100%',
                  animation: `${streamingGradient} 2.2s ease-in-out infinite, ${streamingGlow} 1.8s ease-in-out infinite`,
                }),
                transition: `all ${theme.motion.normal}`,
                cursor: 'default',
                userSelect: 'none',
              }}
            >
              ThreatFlow
            </Typography>
            
            {/* Enhanced Professional Tagline */}
            <Box
              sx={{
                ml: theme.spacing[2],
                px: theme.spacing[2.5],
                py: theme.spacing[1],
                backgroundColor: `${theme.colors.brand.light}`,
                border: `1px solid ${theme.colors.brand.primary}30`,
                borderRadius: theme.borderRadius.md,
                backdropFilter: theme.effects.blur.md,
                boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 20px ${theme.colors.brand.primary}20`,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '1px',
                  background: `linear-gradient(90deg, transparent, ${theme.colors.brand.primary}60, transparent)`,
                },
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: theme.colors.brand.primary,
                  fontFamily: theme.typography.fontFamily.mono,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  letterSpacing: theme.typography.letterSpacing.wider,
                  textTransform: 'uppercase',
                  textShadow: `0 0 10px ${theme.colors.brand.primary}40`,
                }}
              >
                ⚡ Threat Intelligence Platform
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Center - Story Mode Controls */}
        <Box sx={{ 
          flex: '1 1 0', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
        }}>
          {storyModeData && (
            <ToolbarStoryModeControls
              storyState={storyModeData.storyState}
              controls={storyModeData.controls}
              currentStepData={storyModeData.currentStepData}
              onResetView={storyModeData.onResetView}
            />
          )}
        </Box>


        {/* Right Side - Enhanced Professional Action Buttons */}
        <Box sx={{ 
          display: 'flex', 
          gap: theme.spacing[1.5], 
          alignItems: 'center',
          flex: '1 1 0',
          justifyContent: 'flex-end'
        }}>
          {showGraphActions && (
            <Tooltip title="New Analysis" placement="bottom" arrow>
              <GlassIconButton 
                onClick={onNewSearch}
                size="medium"
                sx={{
                  background: `${theme.colors.brand.lightMedium}`,
                  border: `1px solid ${theme.colors.brand.primary}40`,
                  backdropFilter: theme.effects.blur.md,
                  boxShadow: `${theme.effects.shadows.sm}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: `linear-gradient(90deg, transparent, ${theme.colors.brand.primary}60, transparent)`,
                  },
                  '&:hover': {
                    background: `${theme.colors.brand.lightMedium}`,
                    border: `1px solid ${theme.colors.brand.primary}80`,
                    boxShadow: `${theme.effects.shadows.brandGlow}, inset 0 1px 0 rgba(255, 255, 255, 0.15)`,
                    transform: 'translateY(-2px) scale(1.02)',
                  },
                  transition: `all ${theme.motion.normal}`,
                }}
              >
                <FlowIcon size="small">
                  <HomeIcon sx={{ color: theme.colors.brand.primary, filter: `drop-shadow(0 0 4px ${theme.colors.brand.primary}40)` }} />
                </FlowIcon>
              </GlassIconButton>
            </Tooltip>
          )}

          {exportFunction && (
            <Tooltip title="Export Analysis" placement="bottom" arrow>
              <GlassIconButton 
                onClick={handleDownloadMenuOpen}
                size="small"
                sx={{
                  backgroundColor: theme.colors.surface.rest,
                  border: `1px solid ${theme.colors.surface.border.default}`,
                  backdropFilter: theme.effects.blur.md,
                  boxShadow: `${theme.effects.shadows.sm}, inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: `linear-gradient(90deg, transparent, ${theme.colors.surface.border.subtle}, transparent)`,
                  },
                  '&:hover': {
                    backgroundColor: theme.colors.surface.hover,
                    border: `1px solid ${theme.colors.surface.border.emphasis}`,
                    transform: 'translateY(-2px) scale(1.02)',
                    boxShadow: `${theme.effects.shadows.md}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
                  },
                  transition: `all ${theme.motion.normal}`,
                }}
              >
                <FlowIcon size="small">
                  <DownloadIcon sx={{ color: theme.colors.text.secondary, filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.2))' }} />
                </FlowIcon>
              </GlassIconButton>
            </Tooltip>
          )}

          {showGraphActions && (
            <Tooltip title="Save Analysis" placement="bottom" arrow>
              <GlassIconButton 
                onClick={onSaveClick}
                size="small"
                sx={{
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  backdropFilter: theme.effects.blur.md,
                  '&:hover': {
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.5)',
                    boxShadow: theme.effects.shadows.successGlow,
                    transform: 'translateY(-1px)',
                  },
                  transition: theme.motion.normal,
                }}
              >
                <FlowIcon size="small">
                  <SaveIcon sx={{ color: theme.colors.accent.secure }} />
                </FlowIcon>
              </GlassIconButton>
            </Tooltip>
          )}

          <Tooltip title="Load Analysis" placement="bottom" arrow>
            <GlassIconButton 
              onClick={onLoadClick}
              size="small"
              sx={{
                backgroundColor: theme.colors.surface.rest,
                border: `1px solid ${theme.colors.surface.border.default}`,
                backdropFilter: theme.effects.blur.md,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                  border: `1px solid ${theme.colors.surface.border.emphasis}`,
                  transform: 'translateY(-1px)',
                },
                transition: theme.motion.normal,
              }}
            >
              <FlowIcon size="small">
                <FolderOpenIcon sx={{ color: theme.colors.text.secondary }} />
              </FlowIcon>
            </GlassIconButton>
          </Tooltip>

          {/* Advanced Visualization Toggle */}
          {onToggleAdvancedVisualization && (
            <Tooltip title="Advanced Visualization" placement="bottom" arrow>
              <GlassIconButton 
                onClick={onToggleAdvancedVisualization}
                size="small"
                sx={{
                  backgroundColor: enableAdvancedVisualization 
                    ? 'rgba(168, 85, 247, 0.15)' 
                    : theme.colors.surface.rest,
                  border: enableAdvancedVisualization 
                    ? '1px solid rgba(168, 85, 247, 0.4)' 
                    : `1px solid ${theme.colors.surface.border.default}`,
                  backdropFilter: theme.effects.blur.md,
                  '&:hover': {
                    backgroundColor: enableAdvancedVisualization 
                      ? 'rgba(168, 85, 247, 0.2)' 
                      : theme.colors.surface.hover,
                    border: enableAdvancedVisualization 
                      ? '1px solid rgba(168, 85, 247, 0.6)' 
                      : `1px solid ${theme.colors.surface.border.emphasis}`,
                    boxShadow: enableAdvancedVisualization 
                      ? '0 0 20px rgba(168, 85, 247, 0.3)' 
                      : theme.effects.shadows.md,
                    transform: 'translateY(-1px)',
                  },
                  transition: theme.motion.normal,
                }}
              >
                <FlowIcon size="small">
                  <ViewInArIcon sx={{ 
                    color: enableAdvancedVisualization ? '#a855f7' : theme.colors.text.secondary,
                    filter: enableAdvancedVisualization 
                      ? 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.4))' 
                      : 'none'
                  }} />
                </FlowIcon>
              </GlassIconButton>
            </Tooltip>
          )}
          
          {/* Visualization Filters Toggle */}
          {onToggleVisualizationFilters && (
            <Tooltip title="Visualization Filters" placement="bottom" arrow>
              <GlassIconButton 
                onClick={onToggleVisualizationFilters}
                size="small"
                sx={{
                  backgroundColor: showVisualizationFilters 
                    ? 'rgba(34, 197, 94, 0.15)' 
                    : theme.colors.surface.rest,
                  border: showVisualizationFilters 
                    ? '1px solid rgba(34, 197, 94, 0.4)' 
                    : `1px solid ${theme.colors.surface.border.default}`,
                  backdropFilter: theme.effects.blur.md,
                  '&:hover': {
                    backgroundColor: showVisualizationFilters 
                      ? 'rgba(34, 197, 94, 0.2)' 
                      : theme.colors.surface.hover,
                    border: showVisualizationFilters 
                      ? '1px solid rgba(34, 197, 94, 0.6)' 
                      : `1px solid ${theme.colors.surface.border.emphasis}`,
                    boxShadow: showVisualizationFilters 
                      ? theme.effects.shadows.successGlow 
                      : theme.effects.shadows.md,
                    transform: 'translateY(-1px)',
                  },
                  transition: theme.motion.normal,
                }}
              >
                <FlowIcon size="small">
                  <FilterListIcon sx={{ 
                    color: showVisualizationFilters ? theme.colors.accent.secure : theme.colors.text.secondary,
                    filter: showVisualizationFilters 
                      ? 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.4))' 
                      : 'none'
                  }} />
                </FlowIcon>
              </GlassIconButton>
            </Tooltip>
          )}

          <ThemeToggle />

          <Tooltip title="Settings" placement="bottom" arrow>
            <GlassIconButton 
              onClick={onSettingsClick}
              size="small"
              sx={{
                backgroundColor: theme.colors.surface.rest,
                border: `1px solid ${theme.colors.surface.border.default}`,
                backdropFilter: theme.effects.blur.md,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                  border: `1px solid ${theme.colors.surface.border.emphasis}`,
                  transform: 'translateY(-1px)',
                },
                transition: theme.motion.normal,
              }}
            >
              <FlowIcon size="small">
                <SettingsIcon sx={{ color: theme.colors.text.secondary }} />
              </FlowIcon>
            </GlassIconButton>
          </Tooltip>
        </Box>

        {/* Download Menu */}
        <ActionMenu
          anchorEl={downloadMenuAnchor}
          open={Boolean(downloadMenuAnchor)}
          onClose={handleDownloadMenuClose}
          variant="dark"
          items={[
            {
              id: 'png',
              text: 'Export as PNG',
              icon: <ImageIcon fontSize="small" />,
              onClick: () => handleDownloadClick('png'),
            },
            {
              id: 'json',
              text: 'Export as STIX Bundle',
              icon: <CodeIcon fontSize="small" />,
              onClick: () => handleDownloadClick('json'),
            },
            {
              id: 'afb',
              text: 'Export as AFB',
              icon: <TextFieldsIcon fontSize="small" />,
              onClick: () => handleDownloadClick('afb'),
            },
          ]}
        />
      </Toolbar>
    </MuiAppBar>
  );
}