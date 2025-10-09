import {
  Animation as AnimationIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Speed as SpeedIcon,
  AutoMode as AutoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Slider,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  FormGroup,
  Collapse,
  Button,
  ButtonGroup,
} from '@mui/material';
import React, { useState, useCallback, useEffect } from 'react';
import { Edge, Node } from 'reactflow';

import { useThemeContext } from '../../../../shared/context/ThemeProvider';
import { edgeAnimationService, AnimationConfig, AnimatedEdge } from '../../services/edgeAnimations';

interface EdgeAnimationControlsProps {
  edges: Edge[];
  nodes: Node[];
  onEdgesChange: (edges: AnimatedEdge[]) => void;
  disabled?: boolean;
}

export const EdgeAnimationControls: React.FC<EdgeAnimationControlsProps> = ({
  edges,
  nodes,
  onEdgesChange,
  disabled = false,
}) => {
  const { theme } = useThemeContext();
  const [expanded, setExpanded] = useState(false);
  const [config, setConfig] = useState<AnimationConfig>(edgeAnimationService.getConfig());
  const [isPlaying, setIsPlaying] = useState(true);
  const [animationStats, setAnimationStats] = useState({
    activeAnimations: 0,
    totalEdges: edges.length,
  });

  // Update config when service changes
  useEffect(() => {
    const currentConfig = edgeAnimationService.getConfig();
    setConfig(currentConfig);
  }, []);

  // Update stats
  useEffect(() => {
    setAnimationStats({
      activeAnimations: edgeAnimationService.getActiveAnimationCount(),
      totalEdges: edges.length,
    });
  }, [edges]);

  // Handle configuration changes
  const handleConfigChange = useCallback((newConfig: Partial<AnimationConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    edgeAnimationService.setConfig(updatedConfig);
    
    // Apply animations to edges
    const animatedEdges = edgeAnimationService.applyAnimationStyles(edges as AnimatedEdge[]);
    onEdgesChange(animatedEdges);
  }, [config, edges, onEdgesChange]);

  // Apply auto animations
  const handleAutoAnimations = useCallback(() => {
    const autoAnimatedEdges = edgeAnimationService.applyAutoAnimations(edges, nodes);
    const styledEdges = edgeAnimationService.applyAnimationStyles(autoAnimatedEdges);
    onEdgesChange(styledEdges);
  }, [edges, nodes, onEdgesChange]);

  // Apply preset configurations
  const handlePreset = useCallback((preset: 'subtle' | 'normal' | 'dramatic' | 'performance') => {
    edgeAnimationService.applyPreset(preset);
    const newConfig = edgeAnimationService.getConfig();
    setConfig(newConfig);
    
    const animatedEdges = edgeAnimationService.applyAnimationStyles(edges as AnimatedEdge[]);
    onEdgesChange(animatedEdges);
  }, [edges, onEdgesChange]);

  // Toggle play/pause
  const handlePlayPause = useCallback(() => {
    const newEnabledState = !config.enabled;
    handleConfigChange({ enabled: newEnabledState });
    setIsPlaying(newEnabledState);
  }, [config.enabled, handleConfigChange]);

  // Stop all animations
  const handleStop = useCallback(() => {
    edgeAnimationService.stopAllAnimations();
    handleConfigChange({ enabled: false });
    setIsPlaying(false);
    
    // Remove animations from edges
    const staticEdges = edges.map(edge => ({
      ...edge,
      animated: false,
      className: edge.className?.replace(/edge-\w+-animation/g, '').trim(),
    }));
    onEdgesChange(staticEdges as AnimatedEdge[]);
  }, [edges, handleConfigChange, onEdgesChange]);

  // Optimize for performance
  const handleOptimize = useCallback(() => {
    edgeAnimationService.optimizeAnimations(edges.length);
    const newConfig = edgeAnimationService.getConfig();
    setConfig(newConfig);
    
    const optimizedEdges = edgeAnimationService.applyAnimationStyles(edges as AnimatedEdge[]);
    onEdgesChange(optimizedEdges);
  }, [edges, onEdgesChange]);

  if (disabled) {
    return null;
  }

  return (
    <Card
      sx={{
        position: 'absolute',
        top: 16,
        right: 380, // Position next to zoom controls
        width: 320,
        backgroundColor: theme.colors.background.glassHeavy,
        backdropFilter: theme.effects.blur.xl,
        border: `1px solid ${theme.colors.surface.border.default}`,
        borderRadius: theme.borderRadius.lg,
        zIndex: 1000,
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AnimationIcon sx={{ color: theme.colors.brand.primary }} />
            <Typography
              variant="h6"
              sx={{
                color: theme.colors.text.primary,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                fontFamily: theme.typography.fontFamily.primary,
              }}
            >
              Edge Animations
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Animation Stats */}
            <Chip
              label={`${animationStats.activeAnimations}/${animationStats.totalEdges}`}
              size="small"
              sx={{
                backgroundColor: config.enabled ? theme.colors.brand.light : theme.colors.surface.subtle,
                color: config.enabled ? theme.colors.brand.primary : theme.colors.text.tertiary,
                fontSize: theme.typography.fontSize.xs,
              }}
            />
            
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ color: theme.colors.text.tertiary }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* Main Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {/* Play/Pause */}
          <Tooltip title={isPlaying ? "Pause Animations" : "Play Animations"}>
            <IconButton
              size="small"
              onClick={handlePlayPause}
              sx={{
                color: theme.colors.text.primary,
                backgroundColor: isPlaying ? theme.colors.brand.light : theme.colors.background.secondary,
                border: `1px solid ${isPlaying ? theme.colors.brand.primary : theme.colors.surface.border.default}`,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                },
              }}
            >
              {isPlaying ? <PauseIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* Stop */}
          <Tooltip title="Stop All Animations">
            <IconButton
              size="small"
              onClick={handleStop}
              sx={{
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.secondary,
                border: `1px solid ${theme.colors.surface.border.default}`,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                },
              }}
            >
              <StopIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Auto Animations */}
          <Tooltip title="Auto-detect Animations">
            <IconButton
              size="small"
              onClick={handleAutoAnimations}
              sx={{
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.secondary,
                border: `1px solid ${theme.colors.surface.border.default}`,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                },
              }}
            >
              <AutoIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Optimize */}
          <Tooltip title="Optimize for Performance">
            <IconButton
              size="small"
              onClick={handleOptimize}
              sx={{
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.secondary,
                border: `1px solid ${theme.colors.surface.border.default}`,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                },
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Speed Control */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <SpeedIcon sx={{ color: theme.colors.text.tertiary, fontSize: 16 }} />
            <Typography
              sx={{
                color: theme.colors.text.secondary,
                fontSize: theme.typography.fontSize.xs,
                fontFamily: theme.typography.fontFamily.primary,
              }}
            >
              Speed: {config.globalSpeed}x
            </Typography>
          </Box>
          <Slider
            value={config.globalSpeed}
            min={0.1}
            max={3.0}
            step={0.1}
            onChange={(_, value) => handleConfigChange({ globalSpeed: value as number })}
            disabled={!config.enabled}
            sx={{
              color: theme.colors.brand.primary,
              height: 4,
              '& .MuiSlider-thumb': {
                width: 16,
                height: 16,
                backgroundColor: theme.colors.brand.primary,
                border: `2px solid ${theme.colors.background.secondary}`,
                '&:hover': {
                  boxShadow: `0 0 0 8px ${theme.colors.brand.primary}20`,
                },
                '&.Mui-disabled': {
                  backgroundColor: theme.colors.text.disabled,
                },
              },
              '& .MuiSlider-track': {
                backgroundColor: theme.colors.brand.primary,
                border: 'none',
              },
              '& .MuiSlider-rail': {
                backgroundColor: theme.colors.surface.border.default,
              },
            }}
          />
        </Box>

        {/* Preset Buttons */}
        <Box sx={{ mb: 2 }}>
          <Typography
            sx={{
              color: theme.colors.text.tertiary,
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.medium,
              mb: 1,
            }}
          >
            Presets
          </Typography>
          <ButtonGroup size="small" variant="outlined" fullWidth>
            <Button
              onClick={() => handlePreset('subtle')}
              sx={{
                color: theme.colors.text.primary,
                borderColor: theme.colors.surface.border.default,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                  borderColor: theme.colors.brand.primary,
                },
              }}
            >
              Subtle
            </Button>
            <Button
              onClick={() => handlePreset('normal')}
              sx={{
                color: theme.colors.text.primary,
                borderColor: theme.colors.surface.border.default,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                  borderColor: theme.colors.brand.primary,
                },
              }}
            >
              Normal
            </Button>
            <Button
              onClick={() => handlePreset('dramatic')}
              sx={{
                color: theme.colors.text.primary,
                borderColor: theme.colors.surface.border.default,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                  borderColor: theme.colors.brand.primary,
                },
              }}
            >
              Dramatic
            </Button>
          </ButtonGroup>
        </Box>

        {/* Advanced Controls */}
        <Collapse in={expanded}>
          <Divider sx={{ borderColor: theme.colors.surface.border.subtle, mb: 2 }} />
          
          {/* Animation Type Toggles */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="overline"
              sx={{
                color: theme.colors.text.tertiary,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                letterSpacing: theme.typography.letterSpacing.wide,
                textTransform: 'uppercase',
                display: 'block',
                mb: 1,
              }}
            >
              Animation Types
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.showFlow}
                    onChange={(e) => handleConfigChange({ showFlow: e.target.checked })}
                    disabled={!config.enabled}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: theme.colors.brand.primary,
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: theme.colors.brand.primary,
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ 
                    color: theme.colors.text.primary,
                    fontSize: theme.typography.fontSize.xs,
                    fontFamily: theme.typography.fontFamily.primary,
                  }}>
                    Flow animations
                  </Typography>
                }
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={config.showPulse}
                    onChange={(e) => handleConfigChange({ showPulse: e.target.checked })}
                    disabled={!config.enabled}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: theme.colors.brand.primary,
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: theme.colors.brand.primary,
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ 
                    color: theme.colors.text.primary,
                    fontSize: theme.typography.fontSize.xs,
                    fontFamily: theme.typography.fontFamily.primary,
                  }}>
                    Pulse effects
                  </Typography>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={config.showGlow}
                    onChange={(e) => handleConfigChange({ showGlow: e.target.checked })}
                    disabled={!config.enabled}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: theme.colors.brand.primary,
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: theme.colors.brand.primary,
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ 
                    color: theme.colors.text.primary,
                    fontSize: theme.typography.fontSize.xs,
                    fontFamily: theme.typography.fontFamily.primary,
                  }}>
                    Glow effects
                  </Typography>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={config.showParticles}
                    onChange={(e) => handleConfigChange({ showParticles: e.target.checked })}
                    disabled={!config.enabled}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: theme.colors.brand.primary,
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: theme.colors.brand.primary,
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ 
                    color: theme.colors.text.primary,
                    fontSize: theme.typography.fontSize.xs,
                    fontFamily: theme.typography.fontFamily.primary,
                  }}>
                    Particle effects
                  </Typography>
                }
              />
            </FormGroup>
          </Box>

          {/* Particle Density */}
          {config.showParticles && (
            <Box sx={{ mb: 2 }}>
              <Typography
                sx={{
                  color: theme.colors.text.secondary,
                  fontSize: theme.typography.fontSize.xs,
                  mb: 1,
                  fontFamily: theme.typography.fontFamily.primary,
                }}
              >
                Particle Density: {Math.round(config.particleDensity * 100)}%
              </Typography>
              <Slider
                value={config.particleDensity}
                min={0.1}
                max={1.0}
                step={0.1}
                onChange={(_, value) => handleConfigChange({ particleDensity: value as number })}
                disabled={!config.enabled}
                sx={{
                  color: theme.colors.brand.primary,
                  height: 4,
                  '& .MuiSlider-thumb': {
                    width: 16,
                    height: 16,
                    backgroundColor: theme.colors.brand.primary,
                    border: `2px solid ${theme.colors.background.secondary}`,
                    '&:hover': {
                      boxShadow: `0 0 0 8px ${theme.colors.brand.primary}20`,
                    },
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: theme.colors.brand.primary,
                    border: 'none',
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: theme.colors.surface.border.default,
                  },
                }}
              />
            </Box>
          )}

          {/* Additional Options */}
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={config.syncWithStoryMode}
                  onChange={(e) => handleConfigChange({ syncWithStoryMode: e.target.checked })}
                  disabled={!config.enabled}
                  size="small"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: theme.colors.brand.primary,
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: theme.colors.brand.primary,
                    },
                  }}
                />
              }
              label={
                <Typography sx={{ 
                  color: theme.colors.text.primary,
                  fontSize: theme.typography.fontSize.xs,
                  fontFamily: theme.typography.fontFamily.primary,
                }}>
                  Sync with story mode
                </Typography>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.pauseOnHover}
                  onChange={(e) => handleConfigChange({ pauseOnHover: e.target.checked })}
                  disabled={!config.enabled}
                  size="small"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: theme.colors.brand.primary,
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: theme.colors.brand.primary,
                    },
                  }}
                />
              }
              label={
                <Typography sx={{ 
                  color: theme.colors.text.primary,
                  fontSize: theme.typography.fontSize.xs,
                  fontFamily: theme.typography.fontFamily.primary,
                }}>
                  Pause on hover
                </Typography>
              }
            />
          </FormGroup>
        </Collapse>
      </CardContent>
    </Card>
  );
};