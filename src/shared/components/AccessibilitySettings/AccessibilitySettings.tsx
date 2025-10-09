import {
  Accessibility,
  Visibility,
  KeyboardAlt,
  VolumeUp,
  Contrast,
  ZoomIn,
  Speed,
  Close,
  Info,
  Check,
} from '@mui/icons-material';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Switch,
  FormGroup,
  FormControlLabel,
  RadioGroup,
  Radio,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Button,
  Tooltip,
  Chip,
} from '@mui/material';
import React, { useState } from 'react';

import { useThemeContext } from '../../context/ThemeProvider';
import { useAccessibility, useAnnouncer } from '../../hooks/useAccessibility';
import { AccessibilityPreferences } from '../../services/accessibility/AccessibilityService';

interface AccessibilitySettingsProps {
  open: boolean;
  onClose: () => void;
}

interface SettingGroup {
  title: string;
  description: string;
  icon: React.ReactNode;
  settings: SettingItem[];
}

interface SettingItem {
  key: keyof AccessibilityPreferences;
  label: string;
  description: string;
  type: 'switch' | 'radio';
  options?: { value: string; label: string; description?: string }[];
  impact: 'low' | 'medium' | 'high';
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({
  open,
  onClose,
}) => {
  const { theme } = useThemeContext();
  const { preferences, setPreferences } = useAccessibility();
  const { announcePolite } = useAnnouncer();
  const [expandedPanel, setExpandedPanel] = useState<string>('motion');

  const settingGroups: SettingGroup[] = [
    {
      title: 'Motion & Animation',
      description: 'Control movement and animations throughout the interface',
      icon: <Speed />,
      settings: [
        {
          key: 'reduceMotion',
          label: 'Reduce Motion',
          description: 'Minimizes animations and transitions for better focus and reduced motion sensitivity',
          type: 'switch',
          impact: 'high',
        },
      ],
    },
    {
      title: 'Visual & Display',
      description: 'Adjust visual presentation and contrast',
      icon: <Visibility />,
      settings: [
        {
          key: 'highContrast',
          label: 'High Contrast',
          description: 'Increases contrast between text and backgrounds for better visibility',
          type: 'switch',
          impact: 'high',
        },
        {
          key: 'largeText',
          label: 'Large Text',
          description: 'Increases text size across the interface for better readability',
          type: 'switch',
          impact: 'medium',
        },
      ],
    },
    {
      title: 'Keyboard & Navigation',
      description: 'Configure keyboard navigation and focus behavior',
      icon: <KeyboardAlt />,
      settings: [
        {
          key: 'keyboardOnlyMode',
          label: 'Keyboard-Only Mode',
          description: 'Optimizes interface for keyboard-only navigation',
          type: 'switch',
          impact: 'medium',
        },
        {
          key: 'focusIndicatorMode',
          label: 'Focus Indicator Style',
          description: 'Adjusts the visibility of focus indicators',
          type: 'radio',
          options: [
            { value: 'subtle', label: 'Subtle', description: 'Minimal focus outline' },
            { value: 'prominent', label: 'Prominent', description: 'Enhanced focus outline with shadow' },
            { value: 'high-contrast', label: 'High Contrast', description: 'Maximum visibility focus indicator' },
          ],
          impact: 'medium',
        },
      ],
    },
    {
      title: 'Screen Reader',
      description: 'Settings for screen reader compatibility',
      icon: <VolumeUp />,
      settings: [
        {
          key: 'screenReaderMode',
          label: 'Screen Reader Mode',
          description: 'Enables additional screen reader announcements and optimizations',
          type: 'switch',
          impact: 'high',
        },
      ],
    },
  ];

  const handleSettingChange = (key: keyof AccessibilityPreferences, value: any) => {
    setPreferences({ [key]: value });
    
    // Announce the change
    const setting = settingGroups
      .flatMap(group => group.settings)
      .find(setting => setting.key === key);
    
    if (setting) {
      const action = typeof value === 'boolean' ? (value ? 'enabled' : 'disabled') : `set to ${value}`;
      announcePolite(`${setting.label} ${action}`);
    }
  };

  const handlePanelChange = (panel: string) => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpandedPanel(isExpanded ? panel : '');
  };

  const getImpactColor = (impact: 'low' | 'medium' | 'high') => {
    switch (impact) {
      case 'high':
        return theme.colors.status.error;
      case 'medium':
        return theme.colors.status.warning;
      case 'low':
        return theme.colors.status.success;
    }
  };

  const resetToDefaults = () => {
    setPreferences({
      reduceMotion: false,
      highContrast: false,
      largeText: false,
      keyboardOnlyMode: false,
      screenReaderMode: false,
      focusIndicatorMode: 'subtle',
    });
    announcePolite('Accessibility settings reset to defaults');
  };

  const renderSwitchSetting = (setting: SettingItem) => (
    <Box
      key={setting.key}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        py: 2,
        gap: 2,
      }}
    >
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.text.primary,
            }}
          >
            {setting.label}
          </Typography>
          <Chip
            label={setting.impact}
            size="small"
            sx={{
              fontSize: theme.typography.fontSize.xs,
              backgroundColor: `${getImpactColor(setting.impact)}20`,
              color: getImpactColor(setting.impact),
              border: `1px solid ${getImpactColor(setting.impact)}40`,
            }}
          />
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: theme.colors.text.secondary,
            fontSize: theme.typography.fontSize.sm,
          }}
        >
          {setting.description}
        </Typography>
      </Box>
      <Switch
        checked={preferences[setting.key] as boolean}
        onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
        sx={{
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: theme.colors.brand.primary,
          },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: theme.colors.brand.primary,
          },
        }}
        inputProps={{ 'aria-describedby': `${setting.key}-description` }}
      />
    </Box>
  );

  const renderRadioSetting = (setting: SettingItem) => (
    <Box key={setting.key} sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography
          variant="body1"
          sx={{
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.text.primary,
          }}
        >
          {setting.label}
        </Typography>
        <Chip
          label={setting.impact}
          size="small"
          sx={{
            fontSize: theme.typography.fontSize.xs,
            backgroundColor: `${getImpactColor(setting.impact)}20`,
            color: getImpactColor(setting.impact),
            border: `1px solid ${getImpactColor(setting.impact)}40`,
          }}
        />
      </Box>
      <Typography
        variant="body2"
        sx={{
          color: theme.colors.text.secondary,
          fontSize: theme.typography.fontSize.sm,
          mb: 2,
        }}
      >
        {setting.description}
      </Typography>
      <RadioGroup
        value={preferences[setting.key]}
        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
        sx={{ gap: 1 }}
      >
        {setting.options?.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={
              <Radio
                sx={{
                  color: theme.colors.text.secondary,
                  '&.Mui-checked': {
                    color: theme.colors.brand.primary,
                  },
                }}
              />
            }
            label={
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.colors.text.primary,
                    fontWeight: theme.typography.fontWeight.medium,
                  }}
                >
                  {option.label}
                </Typography>
                {option.description && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: theme.colors.text.tertiary,
                      fontSize: theme.typography.fontSize.xs,
                    }}
                  >
                    {option.description}
                  </Typography>
                )}
              </Box>
            }
            sx={{ margin: 0 }}
          />
        ))}
      </RadioGroup>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: theme.colors.background.primary,
          border: `1px solid ${theme.colors.surface.border.default}`,
          borderRadius: theme.borderRadius.lg,
          boxShadow: theme.colors.effects.shadows.xl,
        },
      }}
      aria-labelledby="accessibility-settings-title"
      aria-describedby="accessibility-settings-description"
    >
      <DialogTitle
        id="accessibility-settings-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          borderBottom: `1px solid ${theme.colors.surface.border.default}`,
          backgroundColor: theme.colors.background.secondary,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Accessibility sx={{ color: theme.colors.brand.primary }} />
          <Box>
            <Typography
              variant="h6"
              sx={{
                color: theme.colors.text.primary,
                fontWeight: theme.typography.fontWeight.semibold,
              }}
            >
              Accessibility Settings
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.colors.text.secondary,
                fontSize: theme.typography.fontSize.sm,
              }}
              id="accessibility-settings-description"
            >
              Configure settings to improve your experience
            </Typography>
          </Box>
        </Box>
        <Tooltip title="Close accessibility settings">
          <IconButton
            onClick={onClose}
            sx={{
              color: theme.colors.text.secondary,
              '&:hover': {
                backgroundColor: theme.colors.surface.hover,
                color: theme.colors.text.primary,
              },
            }}
            aria-label="Close accessibility settings"
          >
            <Close />
          </IconButton>
        </Tooltip>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Alert
          severity="info"
          icon={<Info />}
          sx={{
            m: 3,
            backgroundColor: theme.colors.brand.light,
            border: `1px solid ${theme.colors.brand.primary}40`,
            '& .MuiAlert-icon': {
              color: theme.colors.brand.primary,
            },
          }}
        >
          These settings are saved locally and will persist across sessions. Some changes take effect immediately.
        </Alert>

        {settingGroups.map((group, index) => (
          <Accordion
            key={group.title}
            expanded={expandedPanel === group.title.toLowerCase().replace(/[^a-z]/g, '')}
            onChange={handlePanelChange(group.title.toLowerCase().replace(/[^a-z]/g, ''))}
            sx={{
              backgroundColor: 'transparent',
              boxShadow: 'none',
              '&:before': { display: 'none' },
              '&.Mui-expanded': {
                margin: 0,
              },
            }}
          >
            <AccordionSummary
              sx={{
                backgroundColor: theme.colors.background.secondary,
                borderBottom: `1px solid ${theme.colors.surface.border.subtle}`,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                },
                '& .MuiAccordionSummary-content': {
                  margin: '16px 0',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                <Box
                  sx={{
                    color: theme.colors.brand.primary,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {group.icon}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: theme.colors.text.primary,
                      fontWeight: theme.typography.fontWeight.medium,
                      fontSize: theme.typography.fontSize.lg,
                    }}
                  >
                    {group.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.colors.text.secondary,
                      fontSize: theme.typography.fontSize.sm,
                    }}
                  >
                    {group.description}
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 3, py: 0 }}>
              {group.settings.map((setting, settingIndex) => (
                <Box key={setting.key}>
                  {setting.type === 'switch' 
                    ? renderSwitchSetting(setting)
                    : renderRadioSetting(setting)
                  }
                  {settingIndex < group.settings.length - 1 && (
                    <Divider sx={{ borderColor: theme.colors.surface.border.subtle }} />
                  )}
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        ))}
      </DialogContent>

      <DialogActions
        sx={{
          borderTop: `1px solid ${theme.colors.surface.border.default}`,
          backgroundColor: theme.colors.background.secondary,
          gap: 2,
          p: 3,
        }}
      >
        <Button
          onClick={resetToDefaults}
          variant="outlined"
          sx={{
            borderColor: theme.colors.surface.border.default,
            color: theme.colors.text.secondary,
            '&:hover': {
              borderColor: theme.colors.surface.border.emphasis,
              backgroundColor: theme.colors.surface.hover,
              color: theme.colors.text.primary,
            },
          }}
        >
          Reset to Defaults
        </Button>
        <Button
          onClick={onClose}
          variant="contained"
          startIcon={<Check />}
          sx={{
            backgroundColor: theme.colors.brand.primary,
            color: theme.colors.text.inverse,
            '&:hover': {
              backgroundColor: theme.colors.brand.primaryDim,
            },
          }}
        >
          Apply Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
};