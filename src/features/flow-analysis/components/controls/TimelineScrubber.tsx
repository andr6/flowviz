import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  SkipNext as StepForwardIcon,
  SkipPrevious as StepBackwardIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Slider,
  IconButton,
  Tooltip,
  Chip,
  FormControlLabel,
  Switch,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
} from '@mui/material';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Node, Edge } from 'reactflow';

import { useThemeContext } from '../../../../shared/context/ThemeProvider';
import { 
  timelineScrubberService, 
  PlaybackState, 
  TimelineEvent, 
  TimelineScrubberConfig,
  TimelineRange 
} from '../../services/timelineScrubber';

interface TimelineScrubberProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  disabled?: boolean;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  disabled = false,
}) => {
  const { theme } = useThemeContext();
  const [expanded, setExpanded] = useState(false);
  const [config, setConfig] = useState<TimelineScrubberConfig>(timelineScrubberService.getConfig());
  const [playbackState, setPlaybackState] = useState<PlaybackState>(timelineScrubberService.getPlaybackState());
  const [timelineRange, setTimelineRange] = useState<TimelineRange | null>(timelineScrubberService.getTimelineRange());
  const [events, setEvents] = useState<TimelineEvent[]>(timelineScrubberService.getEvents());
  const [showEventsList, setShowEventsList] = useState(false);

  // Initialize timeline when nodes/edges change
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      timelineScrubberService.initializeTimeline(nodes, edges);
      setTimelineRange(timelineScrubberService.getTimelineRange());
      setEvents(timelineScrubberService.getEvents());
    }
  }, [nodes, edges]);

  // Subscribe to playback state changes
  useEffect(() => {
    const unsubscribe = timelineScrubberService.onStateChange((state) => {
      setPlaybackState(state);
      
      // Apply timeline filtering to nodes and edges
      if (config.enabled) {
        const filtered = timelineScrubberService.applyTimelineFilter(nodes, edges);
        onNodesChange(filtered.nodes);
        onEdgesChange(filtered.edges);
      }
    });

    return unsubscribe;
  }, [nodes, edges, onNodesChange, onEdgesChange, config.enabled]);

  // Handle configuration changes
  const handleConfigChange = useCallback((newConfig: Partial<TimelineScrubberConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    timelineScrubberService.setConfig(updatedConfig);
  }, [config]);

  // Playback controls
  const handlePlay = useCallback(() => {
    if (playbackState.isPlaying) {
      timelineScrubberService.pause();
    } else {
      timelineScrubberService.play();
    }
  }, [playbackState.isPlaying]);

  const handleStop = useCallback(() => {
    timelineScrubberService.stop();
  }, []);

  const handleStepForward = useCallback(() => {
    timelineScrubberService.stepForward();
  }, []);

  const handleStepBackward = useCallback(() => {
    timelineScrubberService.stepBackward();
  }, []);

  const handleProgressChange = useCallback((_: Event, value: number | number[]) => {
    const progress = Array.isArray(value) ? value[0] : value;
    timelineScrubberService.setProgress(progress);
  }, []);

  const handleSpeedChange = useCallback((_: Event, value: number | number[]) => {
    const speed = Array.isArray(value) ? value[0] : value;
    timelineScrubberService.setPlaySpeed(speed);
    setConfig(prev => ({ ...prev, playSpeed: speed }));
  }, []);

  // Format time for display
  const formatTime = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  }, []);

  const formatDuration = useCallback((duration: number) => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  // Get severity color
  const getSeverityColor = useCallback((severity: string) => {
    const colors = {
      low: theme.colors.status.success.accent,
      medium: theme.colors.status.warning.accent,
      high: theme.colors.status.error.accent,
      critical: theme.colors.accent.critical,
    };
    return colors[severity as keyof typeof colors] || theme.colors.text.secondary;
  }, [theme]);

  // Timeline statistics
  const stats = useMemo(() => {
    return timelineScrubberService.getTimelineStats();
  }, [events]);

  if (disabled || !timelineRange || events.length === 0) {
    return null;
  }

  return (
    <Card
      sx={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 600,
        maxWidth: 'calc(100vw - 32px)',
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
            <TimelineIcon sx={{ color: theme.colors.brand.primary }} />
            <Typography
              variant="h6"
              sx={{
                color: theme.colors.text.primary,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                fontFamily: theme.typography.fontFamily.primary,
              }}
            >
              Timeline Scrubber
            </Typography>
            
            <Chip
              label={`${stats.totalEvents} events`}
              size="small"
              sx={{
                backgroundColor: theme.colors.brand.light,
                color: theme.colors.brand.primary,
                fontSize: theme.typography.fontSize.xs,
              }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={config.enabled ? "Disable Timeline" : "Enable Timeline"}>
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

        {/* Progress Slider */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography
              sx={{
                color: theme.colors.text.secondary,
                fontSize: theme.typography.fontSize.xs,
                fontFamily: theme.typography.fontFamily.mono,
              }}
            >
              {formatTime(playbackState.currentTime)}
            </Typography>
            <Typography
              sx={{
                color: theme.colors.text.tertiary,
                fontSize: theme.typography.fontSize.xs,
                fontFamily: theme.typography.fontFamily.mono,
              }}
            >
              {formatDuration(timelineRange.duration)}
            </Typography>
          </Box>
          
          <Slider
            value={playbackState.progress}
            min={0}
            max={100}
            onChange={handleProgressChange}
            disabled={!config.enabled}
            sx={{
              color: theme.colors.brand.primary,
              height: 6,
              '& .MuiSlider-thumb': {
                width: 20,
                height: 20,
                backgroundColor: theme.colors.brand.primary,
                border: `3px solid ${theme.colors.background.primary}`,
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
                height: 6,
              },
              '& .MuiSlider-rail': {
                backgroundColor: theme.colors.surface.border.default,
                height: 6,
              },
            }}
          />
        </Box>

        {/* Playback Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
          <Tooltip title="Step Backward">
            <IconButton
              size="medium"
              onClick={handleStepBackward}
              disabled={!config.enabled || playbackState.currentIndex === 0}
              sx={{
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.secondary,
                border: `1px solid ${theme.colors.surface.border.default}`,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                  border: `1px solid ${theme.colors.brand.primary}`,
                },
                '&:disabled': {
                  opacity: 0.5,
                },
              }}
            >
              <StepBackwardIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={playbackState.isPlaying ? "Pause" : "Play"}>
            <IconButton
              size="large"
              onClick={handlePlay}
              disabled={!config.enabled}
              sx={{
                color: theme.colors.text.inverse,
                backgroundColor: theme.colors.brand.primary,
                border: `2px solid ${theme.colors.brand.primary}`,
                '&:hover': {
                  backgroundColor: theme.colors.brand.primaryDim,
                },
                '&:disabled': {
                  backgroundColor: theme.colors.text.disabled,
                  borderColor: theme.colors.text.disabled,
                },
              }}
            >
              {playbackState.isPlaying ? <PauseIcon /> : <PlayIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Stop">
            <IconButton
              size="medium"
              onClick={handleStop}
              disabled={!config.enabled}
              sx={{
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.secondary,
                border: `1px solid ${theme.colors.surface.border.default}`,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                  border: `1px solid ${theme.colors.brand.primary}`,
                },
                '&:disabled': {
                  opacity: 0.5,
                },
              }}
            >
              <StopIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Step Forward">
            <IconButton
              size="medium"
              onClick={handleStepForward}
              disabled={!config.enabled || playbackState.currentIndex >= events.length}
              sx={{
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.secondary,
                border: `1px solid ${theme.colors.surface.border.default}`,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                  border: `1px solid ${theme.colors.brand.primary}`,
                },
                '&:disabled': {
                  opacity: 0.5,
                },
              }}
            >
              <StepForwardIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Speed Control */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 100 }}>
            <SpeedIcon sx={{ color: theme.colors.text.tertiary, fontSize: 16 }} />
            <Typography
              sx={{
                color: theme.colors.text.secondary,
                fontSize: theme.typography.fontSize.xs,
                fontFamily: theme.typography.fontFamily.primary,
              }}
            >
              {config.playSpeed}x
            </Typography>
          </Box>
          
          <Slider
            value={config.playSpeed}
            min={0.1}
            max={5.0}
            step={0.1}
            onChange={handleSpeedChange}
            disabled={!config.enabled}
            sx={{
              color: theme.colors.brand.primary,
              height: 4,
              flex: 1,
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

        {/* Active Events Display */}
        {playbackState.activeEvents.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{
                color: theme.colors.text.secondary,
                fontSize: theme.typography.fontSize.xs,
                mb: 1,
                fontFamily: theme.typography.fontFamily.primary,
              }}
            >
              Active Events ({playbackState.activeEvents.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {playbackState.activeEvents.slice(0, 5).map((event) => (
                <Chip
                  key={event.id}
                  label={event.label}
                  size="small"
                  sx={{
                    backgroundColor: `${getSeverityColor(event.severity)  }20`,
                    color: getSeverityColor(event.severity),
                    fontSize: theme.typography.fontSize.xs,
                    height: 24,
                  }}
                />
              ))}
              {playbackState.activeEvents.length > 5 && (
                <Chip
                  label={`+${playbackState.activeEvents.length - 5} more`}
                  size="small"
                  sx={{
                    backgroundColor: theme.colors.surface.border.subtle,
                    color: theme.colors.text.tertiary,
                    fontSize: theme.typography.fontSize.xs,
                    height: 24,
                  }}
                />
              )}
            </Box>
          </Box>
        )}

        {/* Advanced Controls */}
        <Collapse in={expanded}>
          <Divider sx={{ borderColor: theme.colors.surface.border.subtle, mb: 2 }} />
          
          {/* Options */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.loop}
                  onChange={(e) => handleConfigChange({ loop: e.target.checked })}
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
                }}>
                  Loop
                </Typography>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.fadeInactive}
                  onChange={(e) => handleConfigChange({ fadeInactive: e.target.checked })}
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
                }}>
                  Fade inactive
                </Typography>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.highlightActive}
                  onChange={(e) => handleConfigChange({ highlightActive: e.target.checked })}
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
                }}>
                  Highlight active
                </Typography>
              }
            />
          </Box>

          {/* Timeline Stats */}
          <Box sx={{ mb: 2 }}>
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
              Statistics
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`Duration: ${formatDuration(stats.timeSpan)}`}
                size="small"
                sx={{
                  backgroundColor: theme.colors.status.info.bg,
                  color: theme.colors.status.info.text,
                  fontSize: theme.typography.fontSize.xs,
                }}
              />
              <Chip
                label={`Nodes: ${stats.eventsByType.node || 0}`}
                size="small"
                sx={{
                  backgroundColor: theme.colors.brand.light,
                  color: theme.colors.brand.primary,
                  fontSize: theme.typography.fontSize.xs,
                }}
              />
              <Chip
                label={`Edges: ${stats.eventsByType.edge || 0}`}
                size="small"
                sx={{
                  backgroundColor: theme.colors.surface.subtle,
                  color: theme.colors.text.secondary,
                  fontSize: theme.typography.fontSize.xs,
                }}
              />
            </Box>
          </Box>

          {/* Events List Toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography
              variant="overline"
              sx={{
                color: theme.colors.text.tertiary,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                letterSpacing: theme.typography.letterSpacing.wide,
                textTransform: 'uppercase',
              }}
            >
              Events ({events.length})
            </Typography>
            <IconButton
              size="small"
              onClick={() => setShowEventsList(!showEventsList)}
              sx={{ color: theme.colors.text.tertiary }}
            >
              {showEventsList ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          {/* Events List */}
          <Collapse in={showEventsList}>
            <List dense sx={{ maxHeight: 200, overflowY: 'auto' }}>
              {events.slice(0, 10).map((event, index) => (
                <ListItem 
                  key={event.id} 
                  button
                  onClick={() => timelineScrubberService.jumpToEvent(event.id)}
                  sx={{ 
                    px: 1, 
                    py: 0.5,
                    borderRadius: theme.borderRadius.sm,
                    '&:hover': {
                      backgroundColor: theme.colors.surface.hover,
                    },
                    ...(index === playbackState.currentIndex && {
                      backgroundColor: theme.colors.brand.light,
                    }),
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        backgroundColor: getSeverityColor(event.severity),
                        borderRadius: '50%',
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={event.label}
                    secondary={formatTime(event.timestamp)}
                    primaryTypographyProps={{
                      sx: {
                        color: theme.colors.text.primary,
                        fontSize: theme.typography.fontSize.xs,
                        fontFamily: theme.typography.fontFamily.primary,
                      }
                    }}
                    secondaryTypographyProps={{
                      sx: {
                        color: theme.colors.text.tertiary,
                        fontSize: theme.typography.fontSize.xs,
                        fontFamily: theme.typography.fontFamily.mono,
                      }
                    }}
                  />
                  <Chip
                    label={event.severity}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: '10px',
                      backgroundColor: `${getSeverityColor(event.severity)  }20`,
                      color: getSeverityColor(event.severity),
                    }}
                  />
                </ListItem>
              ))}
              {events.length > 10 && (
                <ListItem>
                  <ListItemText
                    primary={`+${events.length - 10} more events`}
                    primaryTypographyProps={{
                      sx: {
                        color: theme.colors.text.tertiary,
                        fontSize: theme.typography.fontSize.xs,
                        textAlign: 'center',
                        fontStyle: 'italic',
                      }
                    }}
                  />
                </ListItem>
              )}
            </List>
          </Collapse>
        </Collapse>
      </CardContent>
    </Card>
  );
};