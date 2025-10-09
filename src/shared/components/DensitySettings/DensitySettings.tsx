/**
 * Density Settings Component
 *
 * User interface for controlling UI density preferences.
 * Provides toggle buttons, preview, and description for each density level.
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormLabel,
  Grid,
  IconButton,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  Stack,
  Tooltip,
  Typography,
  Alert,
  Divider,
} from '@mui/material';
import {
  ViewCompact,
  ViewComfortable,
  ViewDay,
  Settings,
  Refresh,
  Close,
  Check,
  Info,
} from '@mui/icons-material';
import { useDensity } from '../../context/DensityContext';
import { UIDensity } from '../../theme/density';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface DensitySettingsProps {
  variant?: 'inline' | 'dialog' | 'card';
  showPreview?: boolean;
  showDescription?: boolean;
  onClose?: () => void;
}

export interface DensityToggleProps {
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export interface DensityPreviewProps {
  density?: UIDensity;
}

// =====================================================
// DENSITY METADATA
// =====================================================

const DENSITY_META = {
  [UIDensity.Compact]: {
    icon: ViewCompact,
    label: 'Compact',
    description: 'Minimal spacing, small fonts. Maximum information density. Ideal for power users and small screens.',
    features: [
      'Smaller fonts and icons',
      'Minimal padding and spacing',
      'More content per screen',
      'Faster scanning',
    ],
    color: '#1976d2',
  },
  [UIDensity.Comfortable]: {
    icon: ViewComfortable,
    label: 'Comfortable',
    description: 'Balanced spacing and typography. Optimal for most users and general use cases.',
    features: [
      'Standard fonts and icons',
      'Balanced padding and spacing',
      'Comfortable reading',
      'Best for most users',
    ],
    color: '#388e3c',
  },
  [UIDensity.Spacious]: {
    icon: ViewDay,
    label: 'Spacious',
    description: 'Maximum whitespace, large fonts. Accessibility-focused. Ideal for presentations and large screens.',
    features: [
      'Larger fonts and icons',
      'Generous padding and spacing',
      'Enhanced readability',
      'Accessibility-friendly',
    ],
    color: '#f57c00',
  },
};

// =====================================================
// DENSITY TOGGLE COMPONENT
// =====================================================

/**
 * DensityToggle Component
 *
 * Quick toggle between density levels.
 *
 * @example
 * ```tsx
 * <DensityToggle size="medium" showLabels={true} />
 * ```
 */
export function DensityToggle({
  size = 'medium',
  showLabels = true,
  orientation = 'horizontal',
}: DensityToggleProps) {
  const { density, setDensity } = useDensity();

  const buttonSize = size === 'small' ? 'small' : size === 'large' ? 'large' : 'medium';

  return (
    <ButtonGroup
      orientation={orientation}
      size={buttonSize}
      variant="outlined"
      aria-label="density control"
    >
      {Object.entries(DENSITY_META).map(([key, meta]) => {
        const densityKey = key as UIDensity;
        const Icon = meta.icon;
        const isActive = density === densityKey;

        return (
          <Tooltip key={key} title={meta.description}>
            <Button
              onClick={() => setDensity(densityKey)}
              variant={isActive ? 'contained' : 'outlined'}
              startIcon={<Icon />}
              sx={{
                borderColor: isActive ? meta.color : undefined,
                backgroundColor: isActive ? meta.color : undefined,
                '&:hover': {
                  borderColor: meta.color,
                  backgroundColor: isActive ? meta.color : undefined,
                },
              }}
            >
              {showLabels && meta.label}
            </Button>
          </Tooltip>
        );
      })}
    </ButtonGroup>
  );
}

// =====================================================
// DENSITY PREVIEW COMPONENT
// =====================================================

/**
 * DensityPreview Component
 *
 * Visual preview of what a density level looks like.
 *
 * @example
 * ```tsx
 * <DensityPreview density={UIDensity.Compact} />
 * ```
 */
export function DensityPreview({ density: previewDensity }: DensityPreviewProps) {
  const { density: currentDensity } = useDensity();
  const density = previewDensity || currentDensity;
  const meta = DENSITY_META[density];

  // Get density-specific styles
  const getDemoStyles = () => {
    switch (density) {
      case UIDensity.Compact:
        return {
          padding: '8px',
          gap: '4px',
          fontSize: '12px',
          buttonHeight: '24px',
          cardPadding: '12px',
        };
      case UIDensity.Spacious:
        return {
          padding: '24px',
          gap: '16px',
          fontSize: '18px',
          buttonHeight: '48px',
          cardPadding: '24px',
        };
      default: // Comfortable
        return {
          padding: '16px',
          gap: '12px',
          fontSize: '16px',
          buttonHeight: '36px',
          cardPadding: '16px',
        };
    }
  };

  const styles = getDemoStyles();

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        backgroundColor: '#f5f5f5',
        borderColor: meta.color,
        borderWidth: 2,
      }}
    >
      <Typography variant="caption" color="text.secondary" gutterBottom display="block">
        Preview: {meta.label}
      </Typography>

      {/* Demo Card */}
      <Card sx={{ mb: 1 }}>
        <CardContent sx={{ padding: `${styles.cardPadding} !important` }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ fontSize: styles.fontSize, margin: 0 }}
          >
            Card Title
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontSize: `calc(${styles.fontSize} * 0.875)`, margin: `${styles.gap} 0` }}
          >
            This is sample text to demonstrate how content looks at this density level.
          </Typography>
          <Box sx={{ display: 'flex', gap: styles.gap, mt: styles.gap }}>
            <Button
              size="small"
              variant="contained"
              sx={{
                fontSize: `calc(${styles.fontSize} * 0.875)`,
                height: styles.buttonHeight,
                padding: `0 ${styles.padding}`,
              }}
            >
              Button
            </Button>
            <Button
              size="small"
              variant="outlined"
              sx={{
                fontSize: `calc(${styles.fontSize} * 0.875)`,
                height: styles.buttonHeight,
                padding: `0 ${styles.padding}`,
              }}
            >
              Button
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Demo Table Row */}
      <Paper variant="outlined" sx={{ p: styles.padding, fontSize: `calc(${styles.fontSize} * 0.75)` }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography sx={{ fontSize: 'inherit' }}>Table Row</Typography>
          <Typography sx={{ fontSize: 'inherit', color: 'text.secondary' }}>Value</Typography>
        </Box>
      </Paper>
    </Paper>
  );
}

// =====================================================
// DENSITY SETTINGS CARD
// =====================================================

/**
 * DensitySettingsCard Component
 *
 * Inline density settings with full options.
 *
 * @example
 * ```tsx
 * <DensitySettingsCard showPreview={true} showDescription={true} />
 * ```
 */
export function DensitySettingsCard({
  showPreview = true,
  showDescription = true,
}: Omit<DensitySettingsProps, 'variant' | 'onClose'>) {
  const { density, setDensity, resetDensity } = useDensity();

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Settings color="primary" />
            <Typography variant="h6">UI Density</Typography>
          </Box>
          <Tooltip title="Reset to default">
            <IconButton size="small" onClick={resetDensity}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
          Adjust the information density of the interface to match your preferences and screen size.
        </Typography>

        <FormControl component="fieldset" fullWidth>
          <RadioGroup
            value={density}
            onChange={(e) => setDensity(e.target.value as UIDensity)}
          >
            <Stack spacing={2}>
              {Object.entries(DENSITY_META).map(([key, meta]) => {
                const densityKey = key as UIDensity;
                const Icon = meta.icon;

                return (
                  <Paper
                    key={key}
                    variant="outlined"
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      borderColor: density === densityKey ? meta.color : undefined,
                      borderWidth: density === densityKey ? 2 : 1,
                      backgroundColor: density === densityKey ? `${meta.color}08` : undefined,
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: meta.color,
                        backgroundColor: `${meta.color}08`,
                      },
                    }}
                    onClick={() => setDensity(densityKey)}
                  >
                    <FormControlLabel
                      value={densityKey}
                      control={<Radio />}
                      label={
                        <Box display="flex" alignItems="center" gap={1} width="100%">
                          <Icon sx={{ color: meta.color }} />
                          <Box flex={1}>
                            <Typography variant="subtitle1" fontWeight="medium">
                              {meta.label}
                            </Typography>
                            {showDescription && (
                              <Typography variant="body2" color="text.secondary">
                                {meta.description}
                              </Typography>
                            )}
                            {showDescription && (
                              <Box mt={1}>
                                {meta.features.map((feature, index) => (
                                  <Box key={index} display="flex" alignItems="center" gap={0.5}>
                                    <Check sx={{ fontSize: 16, color: meta.color }} />
                                    <Typography variant="caption" color="text.secondary">
                                      {feature}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      }
                      sx={{ width: '100%', m: 0 }}
                    />
                  </Paper>
                );
              })}
            </Stack>
          </RadioGroup>
        </FormControl>

        {showPreview && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle2" gutterBottom>
              Preview
            </Typography>
            <DensityPreview />
          </>
        )}

        <Alert severity="info" icon={<Info />} sx={{ mt: 2 }}>
          Density settings apply to all components and are saved automatically.
        </Alert>
      </CardContent>
    </Card>
  );
}

// =====================================================
// DENSITY SETTINGS DIALOG
// =====================================================

/**
 * DensitySettingsDialog Component
 *
 * Modal dialog for density settings.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <DensitySettingsDialog onClose={() => setOpen(false)} />
 * ```
 */
export function DensitySettingsDialog({
  onClose,
  showPreview = true,
  showDescription = true,
}: Omit<DensitySettingsProps, 'variant'>) {
  const { density } = useDensity();

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <Settings color="primary" />
            <span>UI Density Settings</span>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <DensitySettingsCard showPreview={showPreview} showDescription={showDescription} />
      </DialogContent>

      <DialogActions>
        <Typography variant="caption" color="text.secondary" flex={1} ml={2}>
          Current: {DENSITY_META[density].label}
        </Typography>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// =====================================================
// MAIN DENSITY SETTINGS COMPONENT
// =====================================================

/**
 * DensitySettings Component
 *
 * Adaptive component that renders as inline, card, or dialog based on variant prop.
 *
 * @example
 * ```tsx
 * // Inline toggle
 * <DensitySettings variant="inline" />
 *
 * // Card view
 * <DensitySettings variant="card" showPreview={true} />
 *
 * // Dialog (controlled)
 * <DensitySettings variant="dialog" onClose={() => setOpen(false)} />
 * ```
 */
export function DensitySettings({
  variant = 'card',
  showPreview = true,
  showDescription = true,
  onClose,
}: DensitySettingsProps) {
  switch (variant) {
    case 'inline':
      return <DensityToggle showLabels={true} />;

    case 'dialog':
      return (
        <DensitySettingsDialog
          onClose={onClose!}
          showPreview={showPreview}
          showDescription={showDescription}
        />
      );

    case 'card':
    default:
      return <DensitySettingsCard showPreview={showPreview} showDescription={showDescription} />;
  }
}

// =====================================================
// EXPORTS
// =====================================================

export default DensitySettings;

export { DensityToggle, DensityPreview, DensitySettingsCard, DensitySettingsDialog };
