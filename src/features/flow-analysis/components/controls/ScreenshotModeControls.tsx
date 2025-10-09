import {
  CameraAlt as CameraIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  HighQuality as HQIcon,
  AspectRatio as AspectRatioIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Collapse,
  IconButton,
  Button,
  Tooltip,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import React, { useState } from 'react';

import { useThemeContext } from '../../../../shared/context/ThemeProvider';
import {
  screenshotModeService,
  ScreenshotModeConfig,
  DEFAULT_SCREENSHOT_CONFIG,
} from '../../services/screenshotMode';

interface ScreenshotModeControlsProps {
  visible: boolean;
  onToggleVisibility: (visible: boolean) => void;
  onScreenshotTaken: (dataUrl: string) => void;
}

export const ScreenshotModeControls: React.FC<ScreenshotModeControlsProps> = ({
  visible,
  onToggleVisibility,
  onScreenshotTaken,
}) => {
  const { theme } = useThemeContext();
  const [expanded, setExpanded] = useState(true);
  const [screenshotMode, setScreenshotMode] = useState(false);
  const [config, setConfig] = useState<ScreenshotModeConfig>(DEFAULT_SCREENSHOT_CONFIG);
  const [isCapturing, setIsCapturing] = useState(false);
  const [filename, setFilename] = useState('threatflow-analysis');
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [quality, setQuality] = useState(1.0);
  const [scale, setScale] = useState(2);

  const handleToggleScreenshotMode = (enabled: boolean) => {
    setScreenshotMode(enabled);
    
    if (enabled) {
      screenshotModeService.enableScreenshotMode(config);
    } else {
      screenshotModeService.disableScreenshotMode();
    }
  };

  const handleConfigChange = (key: keyof ScreenshotModeConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    
    // Update the service configuration
    screenshotModeService.updateConfig(newConfig);
  };

  const handleTakeScreenshot = async () => {
    setIsCapturing(true);
    
    try {
      // Prepare optimal view
      screenshotModeService.prepareOptimalView();
      
      // Wait a moment for view to settle
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const dataUrl = await screenshotModeService.takeScreenshot({
        filename,
        format,
        quality,
        scale,
      });
      
      onScreenshotTaken(dataUrl);
      
    } catch (error) {
      console.error('Screenshot failed:', error);
      // You could show a toast notification here
    } finally {
      setIsCapturing(false);
    }
  };

  const getDimensions = () => {
    const { width, height } = screenshotModeService.getOptimalDimensions();
    return `${width} × ${height}px`;
  };

  const getEstimatedFileSize = () => {
    const { width, height } = screenshotModeService.getOptimalDimensions();
    const pixels = width * height * scale * scale;
    const bytesPerPixel = format === 'jpeg' ? 3 : 4;
    const estimatedBytes = pixels * bytesPerPixel * quality;
    
    if (estimatedBytes > 1024 * 1024) {
      return `~${(estimatedBytes / 1024 / 1024).toFixed(1)}MB`;
    } else {
      return `~${(estimatedBytes / 1024).toFixed(0)}KB`;
    }
  };

  return (
    <Card
      sx={{
        position: 'absolute',
        top: 80,
        right: 360, // Position next to other controls
        width: 320,
        maxHeight: 'calc(100vh - 120px)',
        backgroundColor: theme.colors.background.glassHeavy,
        backdropFilter: theme.effects.blur.xl,
        border: `1px solid ${theme.colors.surface.border.default}`,
        borderRadius: theme.borderRadius.lg,
        zIndex: 1000,
        overflowY: 'auto',
        display: visible ? 'block' : 'none',
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CameraIcon sx={{ color: theme.colors.brand.primary }} />
            <Typography
              variant="h6"
              sx={{
                color: theme.colors.text.primary,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                fontFamily: theme.typography.fontFamily.primary,
              }}
            >
              Screenshot Mode
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={visible ? 'Hide screenshot controls' : 'Show screenshot controls'}>
              <IconButton
                size="small"
                onClick={() => onToggleVisibility(!visible)}
                sx={{ color: theme.colors.text.tertiary }}
              >
                {visible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
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

        <Collapse in={expanded}>
          {/* Screenshot Mode Toggle */}
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={screenshotMode}
                  onChange={(e) => handleToggleScreenshotMode(e.target.checked)}
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
                  fontSize: theme.typography.fontSize.sm,
                  fontFamily: theme.typography.fontFamily.primary,
                }}>
                  Enable Screenshot Mode
                </Typography>
              }
            />
            <Typography
              sx={{
                color: theme.colors.text.tertiary,
                fontSize: theme.typography.fontSize.xs,
                fontFamily: theme.typography.fontFamily.primary,
                mt: 0.5,
                fontStyle: 'italic',
              }}
            >
              Hides UI elements for clean presentation views
            </Typography>
          </Box>

          {/* Status Alert */}
          {screenshotMode && (
            <Alert 
              severity="info" 
              sx={{ 
                mb: 2,
                backgroundColor: theme.colors.status.info.bg,
                color: theme.colors.status.info.text,
                '& .MuiAlert-icon': {
                  color: theme.colors.status.info.text,
                },
              }}
            >
              Screenshot mode is active. UI elements are hidden for clean capture.
            </Alert>
          )}

          {/* Configuration */}
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
              Configuration
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Hide Controls */}
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={config.hideControls}
                    onChange={(e) => handleConfigChange('hideControls', e.target.checked)}
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
                    Hide Controls
                  </Typography>
                }
              />

              {/* Hide UI */}
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={config.hideUI}
                    onChange={(e) => handleConfigChange('hideUI', e.target.checked)}
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
                    Hide UI Elements
                  </Typography>
                }
              />

              {/* High Resolution */}
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={config.highResolution}
                    onChange={(e) => handleConfigChange('highResolution', e.target.checked)}
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <HQIcon fontSize="small" sx={{ color: theme.colors.text.tertiary }} />
                    <Typography sx={{ 
                      color: theme.colors.text.primary,
                      fontSize: theme.typography.fontSize.xs,
                      fontFamily: theme.typography.fontFamily.primary,
                    }}>
                      High Quality
                    </Typography>
                  </Box>
                }
              />

              {/* Custom Background Color */}
              <Box>
                <Typography
                  sx={{
                    color: theme.colors.text.primary,
                    fontSize: theme.typography.fontSize.xs,
                    fontFamily: theme.typography.fontFamily.primary,
                    mb: 0.5,
                  }}
                >
                  Background Color
                </Typography>
                <TextField
                  size="small"
                  value={config.customBackground}
                  onChange={(e) => handleConfigChange('customBackground', e.target.value)}
                  placeholder="#0d1117"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: theme.colors.background.primary,
                      '& fieldset': {
                        borderColor: theme.colors.surface.border.default,
                      },
                      '&:hover fieldset': {
                        borderColor: theme.colors.surface.border.default,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: theme.colors.brand.primary,
                      },
                    },
                    '& input': {
                      color: theme.colors.text.primary,
                      fontSize: theme.typography.fontSize.xs,
                      fontFamily: 'Monaco, Consolas, monospace',
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>

          <Divider sx={{ borderColor: theme.colors.surface.border.subtle, mb: 2 }} />

          {/* Export Settings */}
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
              Export Settings
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Filename */}
              <TextField
                size="small"
                label="Filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: theme.colors.background.primary,
                    '& fieldset': {
                      borderColor: theme.colors.surface.border.default,
                    },
                    '&:hover fieldset': {
                      borderColor: theme.colors.surface.border.default,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.colors.brand.primary,
                    },
                  },
                  '& input': {
                    color: theme.colors.text.primary,
                    fontSize: theme.typography.fontSize.sm,
                    fontFamily: theme.typography.fontFamily.primary,
                  },
                  '& label': {
                    color: theme.colors.text.tertiary,
                    fontSize: theme.typography.fontSize.xs,
                  },
                }}
              />

              {/* Format and Quality */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel sx={{ color: theme.colors.text.tertiary, fontSize: theme.typography.fontSize.xs }}>
                    Format
                  </InputLabel>
                  <Select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as 'png' | 'jpeg' | 'webp')}
                    sx={{
                      backgroundColor: theme.colors.background.primary,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.colors.surface.border.default,
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.colors.surface.border.default,
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.colors.brand.primary,
                      },
                      '& .MuiSelect-select': {
                        color: theme.colors.text.primary,
                        fontSize: theme.typography.fontSize.sm,
                      },
                    }}
                  >
                    <MenuItem value="png">PNG</MenuItem>
                    <MenuItem value="jpeg">JPEG</MenuItem>
                    <MenuItem value="webp">WebP</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  label="Quality"
                  type="number"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  inputProps={{ min: 0.1, max: 1.0, step: 0.1 }}
                  sx={{
                    width: 80,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: theme.colors.background.primary,
                      '& fieldset': {
                        borderColor: theme.colors.surface.border.default,
                      },
                      '&:hover fieldset': {
                        borderColor: theme.colors.surface.border.default,
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: theme.colors.brand.primary,
                      },
                    },
                    '& input': {
                      color: theme.colors.text.primary,
                      fontSize: theme.typography.fontSize.sm,
                    },
                    '& label': {
                      color: theme.colors.text.tertiary,
                      fontSize: theme.typography.fontSize.xs,
                    },
                  }}
                />
              </Box>

              {/* Scale */}
              <Box>
                <Typography
                  sx={{
                    color: theme.colors.text.primary,
                    fontSize: theme.typography.fontSize.xs,
                    fontFamily: theme.typography.fontFamily.primary,
                    mb: 0.5,
                  }}
                >
                  Scale: {scale}x
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {[1, 2, 3, 4].map((scaleOption) => (
                    <Chip
                      key={scaleOption}
                      label={`${scaleOption}x`}
                      size="small"
                      onClick={() => setScale(scaleOption)}
                      sx={{
                        backgroundColor: scale === scaleOption 
                          ? theme.colors.brand.primary 
                          : theme.colors.surface.subtle,
                        color: scale === scaleOption 
                          ? theme.colors.text.inverse 
                          : theme.colors.text.primary,
                        fontSize: theme.typography.fontSize.xs,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: scale === scaleOption 
                            ? theme.colors.brand.primary 
                            : theme.colors.surface.hover,
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Info */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip
                icon={<AspectRatioIcon fontSize="small" />}
                label={getDimensions()}
                size="small"
                sx={{
                  backgroundColor: theme.colors.surface.subtle,
                  color: theme.colors.text.tertiary,
                  fontSize: theme.typography.fontSize.xs,
                }}
              />
              <Chip
                label={getEstimatedFileSize()}
                size="small"
                sx={{
                  backgroundColor: theme.colors.surface.subtle,
                  color: theme.colors.text.tertiary,
                  fontSize: theme.typography.fontSize.xs,
                }}
              />
            </Box>
          </Box>

          {/* Capture Button */}
          <Button
            fullWidth
            variant="contained"
            disabled={isCapturing}
            onClick={handleTakeScreenshot}
            startIcon={isCapturing ? <CircularProgress size={16} /> : <CameraIcon />}
            sx={{
              backgroundColor: theme.colors.brand.primary,
              color: theme.colors.text.inverse,
              fontFamily: theme.typography.fontFamily.primary,
              fontWeight: theme.typography.fontWeight.semibold,
              textTransform: 'none',
              borderRadius: theme.borderRadius.lg,
              py: 1.5,
              '&:hover': {
                backgroundColor: theme.colors.brand.secondary,
              },
              '&:disabled': {
                backgroundColor: theme.colors.surface.subtle,
                color: theme.colors.text.tertiary,
              },
            }}
          >
            {isCapturing ? 'Capturing...' : 'Take Screenshot'}
          </Button>
        </Collapse>
      </CardContent>
    </Card>
  );
};