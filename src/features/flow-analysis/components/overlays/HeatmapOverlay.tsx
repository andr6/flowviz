import {
  Thermostat as HeatmapIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Collapse,
} from '@mui/material';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Node } from 'reactflow';

import { useThemeContext } from '../../../../shared/context/ThemeProvider';
import { heatmapOverlayService, HeatmapConfig, HeatmapData } from '../../services/heatmapOverlay';

interface HeatmapOverlayProps {
  nodes: Node[];
  onNodesChange: (nodes: Node[]) => void;
  analysisId?: string;
  disabled?: boolean;
}

export const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({
  nodes,
  onNodesChange,
  analysisId = 'current',
  disabled = false,
}) => {
  const { theme } = useThemeContext();
  const [expanded, setExpanded] = useState(false);
  const [config, setConfig] = useState<HeatmapConfig>(heatmapOverlayService.getConfig());
  const [statistics, setStatistics] = useState(heatmapOverlayService.getStatistics());
  const [topTechniques, setTopTechniques] = useState<HeatmapData[]>([]);

  // Register this analysis and update when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      heatmapOverlayService.registerAnalysis(analysisId, nodes);
      updateStats();
    }
  }, [nodes, analysisId]);

  // Subscribe to heatmap updates
  useEffect(() => {
    const unsubscribe = heatmapOverlayService.onUpdate(() => {
      setConfig(heatmapOverlayService.getConfig());
      updateStats();
      applyHeatmap();
    });

    return unsubscribe;
  }, []);

  const updateStats = useCallback(() => {
    setStatistics(heatmapOverlayService.getStatistics());
    setTopTechniques(heatmapOverlayService.getTopTechniques(5));
  }, []);

  // Apply heatmap to nodes
  const applyHeatmap = useCallback(() => {
    if (!disabled) {
      const heatmappedNodes = heatmapOverlayService.applyHeatmapToNodes(nodes);
      onNodesChange(heatmappedNodes);
    }
  }, [nodes, onNodesChange, disabled]);

  // Handle configuration changes
  const handleConfigChange = useCallback((newConfig: Partial<HeatmapConfig>) => {
    heatmapOverlayService.setConfig(newConfig);
    applyHeatmap();
  }, [applyHeatmap]);

  // Color legend
  const colorLegend = useMemo(() => {
    return heatmapOverlayService.getColorLegend();
  }, [config.colorScheme]);

  // Get color scheme icon
  const getSchemeIcon = (scheme: string) => {
    const icons = {
      frequency: <TrendingUpIcon fontSize="small" />,
      severity: <SecurityIcon fontSize="small" />,
      confidence: <SpeedIcon fontSize="small" />,
      impact: <SecurityIcon fontSize="small" />,
      recency: <ScheduleIcon fontSize="small" />,
    };
    return icons[scheme as keyof typeof icons] || <InfoIcon fontSize="small" />;
  };

  // Get scheme description
  const getSchemeDescription = (scheme: string) => {
    const descriptions = {
      frequency: 'How often techniques appear across analyses',
      severity: 'Risk level and threat severity',
      confidence: 'Confidence level in technique identification',
      impact: 'Potential business impact of techniques',
      recency: 'How recently techniques were observed',
    };
    return descriptions[scheme as keyof typeof descriptions] || '';
  };

  if (disabled) {
    return null;
  }

  return (
    <Card
      sx={{
        position: 'absolute',
        top: 16,
        left: 380, // Position next to search controls
        width: 350,
        maxHeight: 'calc(100vh - 120px)',
        backgroundColor: theme.colors.background.glassHeavy,
        backdropFilter: theme.effects.blur.xl,
        border: `1px solid ${theme.colors.surface.border.default}`,
        borderRadius: theme.borderRadius.lg,
        zIndex: 999,
        overflowY: 'auto',
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HeatmapIcon sx={{ color: theme.colors.brand.primary }} />
            <Typography
              variant="h6"
              sx={{
                color: theme.colors.text.primary,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                fontFamily: theme.typography.fontFamily.primary,
              }}
            >
              Heatmap Overlay
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={config.enabled ? "Hide Heatmap" : "Show Heatmap"}>
              <IconButton
                size="small"
                onClick={() => handleConfigChange({ enabled: !config.enabled })}
                sx={{
                  color: config.enabled ? theme.colors.brand.primary : theme.colors.text.tertiary,
                  backgroundColor: config.enabled ? theme.colors.brand.light : 'transparent',
                }}
              >
                {config.enabled ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ color: theme.colors.text.tertiary }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* Quick Stats */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            label={`${statistics.totalTechniques} techniques`}
            size="small"
            sx={{
              backgroundColor: theme.colors.status.info.bg,
              color: theme.colors.status.info.text,
              fontSize: theme.typography.fontSize.xs,
            }}
          />
          <Chip
            label={`${statistics.totalAnalyses} analyses`}
            size="small"
            sx={{
              backgroundColor: theme.colors.brand.light,
              color: theme.colors.brand.primary,
              fontSize: theme.typography.fontSize.xs,
            }}
          />
        </Box>

        {/* Color Scheme Selector */}
        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel sx={{ color: theme.colors.text.secondary }}>
              Color Scheme
            </InputLabel>
            <Select
              value={config.colorScheme}
              label="Color Scheme"
              onChange={(e) => handleConfigChange({ colorScheme: e.target.value as any })}
              disabled={!config.enabled}
              sx={{
                backgroundColor: theme.colors.background.primary,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.colors.surface.border.default,
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.colors.surface.border.emphasis,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.colors.brand.primary,
                },
                '& .MuiSelect-icon': {
                  color: theme.colors.text.secondary,
                },
              }}
            >
              {Object.keys(['frequency', 'severity', 'confidence', 'impact', 'recency']).map((scheme) => (
                <MenuItem
                  key={scheme}
                  value={scheme}
                  sx={{
                    color: theme.colors.text.primary,
                    '&:hover': {
                      backgroundColor: theme.colors.surface.hover,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getSchemeIcon(scheme)}
                    {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Typography
            sx={{
              color: theme.colors.text.tertiary,
              fontSize: theme.typography.fontSize.xs,
              mt: 0.5,
              fontFamily: theme.typography.fontFamily.primary,
            }}
          >
            {getSchemeDescription(config.colorScheme)}
          </Typography>
        </Box>

        {/* Intensity Slider */}
        <Box sx={{ mb: 2 }}>
          <Typography
            sx={{
              color: theme.colors.text.secondary,
              fontSize: theme.typography.fontSize.xs,
              mb: 1,
              fontFamily: theme.typography.fontFamily.primary,
            }}
          >
            Intensity: {Math.round(config.intensity * 100)}%
          </Typography>
          <Slider
            value={config.intensity}
            min={0.1}
            max={1.0}
            step={0.1}
            onChange={(_, value) => handleConfigChange({ intensity: value as number })}
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

        {/* Color Legend */}
        {config.enabled && (
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{
                color: theme.colors.text.secondary,
                fontSize: theme.typography.fontSize.xs,
                mb: 1,
                fontFamily: theme.typography.fontFamily.primary,
              }}
            >
              Color Scale
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {colorLegend.map((item, index) => (
                <Tooltip key={index} title={item.label}>
                  <Box
                    sx={{
                      flex: 1,
                      height: 16,
                      backgroundColor: item.color,
                      border: `1px solid ${theme.colors.surface.border.subtle}`,
                      borderRadius: index === 0 ? '4px 0 0 4px' : 
                                   index === colorLegend.length - 1 ? '0 4px 4px 0' : '0',
                      cursor: 'help',
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography
                sx={{
                  color: theme.colors.text.tertiary,
                  fontSize: theme.typography.fontSize.xs,
                  fontFamily: theme.typography.fontFamily.mono,
                }}
              >
                Low
              </Typography>
              <Typography
                sx={{
                  color: theme.colors.text.tertiary,
                  fontSize: theme.typography.fontSize.xs,
                  fontFamily: theme.typography.fontFamily.mono,
                }}
              >
                High
              </Typography>
            </Box>
          </Box>
        )}

        {/* Advanced Options */}
        <Collapse in={expanded}>
          <Divider sx={{ borderColor: theme.colors.surface.border.subtle, mb: 2 }} />
          
          {/* Options */}
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.showLabels}
                  onChange={(e) => handleConfigChange({ showLabels: e.target.checked })}
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
                  Show labels
                </Typography>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.animateTransitions}
                  onChange={(e) => handleConfigChange({ animateTransitions: e.target.checked })}
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
                  Animate transitions
                </Typography>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.autoUpdate}
                  onChange={(e) => handleConfigChange({ autoUpdate: e.target.checked })}
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
                  Auto-update
                </Typography>
              }
            />
          </Box>

          {/* Time Window for Recency */}
          {config.colorScheme === 'recency' && (
            <Box sx={{ mb: 2 }}>
              <Typography
                sx={{
                  color: theme.colors.text.secondary,
                  fontSize: theme.typography.fontSize.xs,
                  mb: 1,
                  fontFamily: theme.typography.fontFamily.primary,
                }}
              >
                Time Window: {config.timeWindow} days
              </Typography>
              <Slider
                value={config.timeWindow}
                min={1}
                max={90}
                step={1}
                onChange={(_, value) => handleConfigChange({ timeWindow: value as number })}
                disabled={!config.enabled}
                sx={{
                  color: theme.colors.brand.primary,
                  height: 4,
                  '& .MuiSlider-thumb': {
                    width: 16,
                    height: 16,
                    backgroundColor: theme.colors.brand.primary,
                    border: `2px solid ${theme.colors.background.secondary}`,
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

          {/* Top Techniques */}
          {topTechniques.length > 0 && (
            <Box>
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
                Top Techniques ({config.colorScheme})
              </Typography>
              <List dense sx={{ maxHeight: 200, overflowY: 'auto' }}>
                {topTechniques.map((technique, index) => {
                  const value = config.colorScheme === 'frequency' ? technique.frequency :
                               config.colorScheme === 'severity' ? technique.severity :
                               config.colorScheme === 'confidence' ? technique.confidence :
                               config.colorScheme === 'impact' ? technique.impactScore :
                               technique.lastSeen;
                  
                  const displayValue = config.colorScheme === 'frequency' ? `${value}x` :
                                     config.colorScheme === 'recency' ? new Date(value).toLocaleDateString() :
                                     `${Math.round(value)}%`;
                  
                  return (
                    <ListItem key={technique.techniqueId} sx={{ px: 1, py: 0.5 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          backgroundColor: heatmapOverlayService.getHeatmapColor(
                            heatmapOverlayService.getHeatmapValue(technique.techniqueId)
                          ),
                          borderRadius: 1,
                          mr: 1,
                          flexShrink: 0,
                        }}
                      />
                      <ListItemText
                        primary={technique.techniqueId}
                        secondary={`Sources: ${technique.sources.length}`}
                        primaryTypographyProps={{
                          sx: {
                            color: theme.colors.text.primary,
                            fontSize: theme.typography.fontSize.xs,
                            fontFamily: theme.typography.fontFamily.mono,
                          }
                        }}
                        secondaryTypographyProps={{
                          sx: {
                            color: theme.colors.text.tertiary,
                            fontSize: theme.typography.fontSize.xs,
                          }
                        }}
                      />
                      <Typography
                        sx={{
                          color: theme.colors.text.secondary,
                          fontSize: theme.typography.fontSize.xs,
                          fontFamily: theme.typography.fontFamily.mono,
                          ml: 1,
                        }}
                      >
                        {displayValue}
                      </Typography>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};