import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Slider,
  FormControl,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Paper,
  Divider,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert
} from '@mui/material';
import {
  Tune as TuneIcon,
  Info as InfoIcon,
  ExpandMore as ExpandIcon,
  Refresh as ResetIcon,
  Save as SaveIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Accuracy as AccuracyIcon,
  Psychology as AIIcon
} from '@mui/icons-material';
import { threatFlowTheme } from '../../../../shared/theme/threatflow-theme';
import { advancedAI, ConfidenceTuning as ConfidenceTuningType } from '../../services/advancedAICapabilities';

interface ConfidenceTuningProps {
  onTuningChange?: (tuning: ConfidenceTuningType) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const ConfidenceTuning: React.FC<ConfidenceTuningProps> = ({
  onTuningChange,
  disabled = false,
  compact = false
}) => {
  const [tuning, setTuning] = useState<ConfidenceTuningType>(advancedAI.getConfidenceTuning());
  const [expanded, setExpanded] = useState(!compact);
  const [helpOpen, setHelpOpen] = useState(false);
  const [presets, setPresets] = useState([
    {
      name: 'Conservative',
      description: 'High accuracy, fewer false positives',
      icon: '🛡️',
      settings: {
        extractionSensitivity: 40,
        sourceReliability: 'high' as const,
        contextWeight: 80,
        patternMatching: 'strict' as const,
        minimumConfidence: 70,
        falsePositiveReduction: true,
        adaptiveThresholds: true
      }
    },
    {
      name: 'Balanced',
      description: 'Good balance of accuracy and coverage',
      icon: '⚖️',
      settings: {
        extractionSensitivity: 70,
        sourceReliability: 'medium' as const,
        contextWeight: 60,
        patternMatching: 'moderate' as const,
        minimumConfidence: 50,
        falsePositiveReduction: true,
        adaptiveThresholds: true
      }
    },
    {
      name: 'Aggressive',
      description: 'Maximum coverage, may include more false positives',
      icon: '🔍',
      settings: {
        extractionSensitivity: 90,
        sourceReliability: 'low' as const,
        contextWeight: 40,
        patternMatching: 'flexible' as const,
        minimumConfidence: 30,
        falsePositiveReduction: false,
        adaptiveThresholds: true
      }
    },
    {
      name: 'Threat Hunting',
      description: 'Optimized for hunting and discovery',
      icon: '🎯',
      settings: {
        extractionSensitivity: 85,
        sourceReliability: 'medium' as const,
        contextWeight: 70,
        patternMatching: 'flexible' as const,
        minimumConfidence: 40,
        falsePositiveReduction: true,
        adaptiveThresholds: true
      }
    }
  ]);

  useEffect(() => {
    if (onTuningChange) {
      onTuningChange(tuning);
    }
  }, [tuning, onTuningChange]);

  const updateTuning = (updates: Partial<ConfidenceTuningType>) => {
    const newTuning = { ...tuning, ...updates };
    setTuning(newTuning);
    advancedAI.updateConfidenceTuning(updates);
  };

  const applyPreset = (preset: typeof presets[0]) => {
    setTuning(preset.settings);
    advancedAI.updateConfidenceTuning(preset.settings);
  };

  const resetToDefaults = () => {
    advancedAI.resetConfidenceTuning();
    setTuning(advancedAI.getConfidenceTuning());
  };

  const getConfidenceColor = (value: number) => {
    if (value >= 70) return threatFlowTheme.colors.accent.secure;
    if (value >= 50) return threatFlowTheme.colors.status.warning.text;
    return threatFlowTheme.colors.status.error.text;
  };

  const getSensitivityColor = (value: number) => {
    if (value <= 40) return threatFlowTheme.colors.accent.secure;
    if (value <= 70) return threatFlowTheme.colors.status.warning.text;
    return threatFlowTheme.colors.status.error.text;
  };

  if (compact) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        p: 2,
        backgroundColor: threatFlowTheme.colors.background.secondary,
        borderRadius: threatFlowTheme.borderRadius.lg,
        border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
        mb: 2
      }}>
        <TuneIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Confidence Tuning
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <Chip
              label={`Sensitivity: ${tuning.extractionSensitivity}%`}
              size="small"
              sx={{
                backgroundColor: `${getSensitivityColor(tuning.extractionSensitivity)}20`,
                color: getSensitivityColor(tuning.extractionSensitivity)
              }}
            />
            <Chip
              label={`Min Confidence: ${tuning.minimumConfidence}%`}
              size="small"
              sx={{
                backgroundColor: `${getConfidenceColor(tuning.minimumConfidence)}20`,
                color: getConfidenceColor(tuning.minimumConfidence)
              }}
            />
          </Box>
        </Box>

        <Tooltip title="Expand Tuning Controls">
          <IconButton size="small" onClick={() => setExpanded(true)}>
            <TuneIcon />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Paper sx={{ 
      p: 3, 
      mb: 2,
      backgroundColor: threatFlowTheme.colors.background.secondary,
      border: `1px solid ${threatFlowTheme.colors.surface.border.default}`
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TuneIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />
          <Typography variant="h6">Confidence Tuning</Typography>
          <Tooltip title="Help">
            <IconButton size="small" onClick={() => setHelpOpen(true)}>
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Reset to Defaults">
            <IconButton size="small" onClick={resetToDefaults} disabled={disabled}>
              <ResetIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Presets */}
      <Accordion expanded={expanded} onChange={(_, isExpanded) => setExpanded(isExpanded)}>
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <Typography variant="subtitle1">Quick Presets</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
            {presets.map((preset) => (
              <Paper
                key={preset.name}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
                  '&:hover': {
                    borderColor: threatFlowTheme.colors.brand.primary,
                    backgroundColor: `${threatFlowTheme.colors.brand.primary}10`
                  }
                }}
                onClick={() => applyPreset(preset)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <span style={{ fontSize: '1.2em' }}>{preset.icon}</span>
                  <Typography variant="subtitle2">{preset.name}</Typography>
                </Box>
                <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                  {preset.description}
                </Typography>
              </Paper>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      <Divider sx={{ my: 2 }} />

      {/* Main Controls */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Extraction Sensitivity */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <SpeedIcon sx={{ fontSize: 20, color: getSensitivityColor(tuning.extractionSensitivity) }} />
            <Typography variant="subtitle2">
              Extraction Sensitivity: {tuning.extractionSensitivity}%
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary, display: 'block', mb: 1 }}>
            Higher values extract more indicators but may include false positives
          </Typography>
          <Slider
            value={tuning.extractionSensitivity}
            onChange={(_, value) => updateTuning({ extractionSensitivity: value as number })}
            min={0}
            max={100}
            step={5}
            disabled={disabled}
            marks={[
              { value: 25, label: 'Conservative' },
              { value: 50, label: 'Moderate' },
              { value: 75, label: 'Aggressive' }
            ]}
            sx={{
              '& .MuiSlider-thumb': {
                backgroundColor: getSensitivityColor(tuning.extractionSensitivity)
              },
              '& .MuiSlider-track': {
                backgroundColor: getSensitivityColor(tuning.extractionSensitivity)
              }
            }}
          />
        </Box>

        {/* Minimum Confidence */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AccuracyIcon sx={{ fontSize: 20, color: getConfidenceColor(tuning.minimumConfidence) }} />
            <Typography variant="subtitle2">
              Minimum Confidence: {tuning.minimumConfidence}%
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary, display: 'block', mb: 1 }}>
            Only include indicators above this confidence threshold
          </Typography>
          <Slider
            value={tuning.minimumConfidence}
            onChange={(_, value) => updateTuning({ minimumConfidence: value as number })}
            min={0}
            max={100}
            step={5}
            disabled={disabled}
            marks={[
              { value: 30, label: 'Low' },
              { value: 50, label: 'Medium' },
              { value: 70, label: 'High' }
            ]}
            sx={{
              '& .MuiSlider-thumb': {
                backgroundColor: getConfidenceColor(tuning.minimumConfidence)
              },
              '& .MuiSlider-track': {
                backgroundColor: getConfidenceColor(tuning.minimumConfidence)
              }
            }}
          />
        </Box>

        {/* Context Weight */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AIIcon sx={{ fontSize: 20, color: threatFlowTheme.colors.brand.primary }} />
            <Typography variant="subtitle2">
              Context Weight: {tuning.contextWeight}%
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary, display: 'block', mb: 1 }}>
            How much surrounding context affects indicator confidence
          </Typography>
          <Slider
            value={tuning.contextWeight}
            onChange={(_, value) => updateTuning({ contextWeight: value as number })}
            min={0}
            max={100}
            step={10}
            disabled={disabled}
          />
        </Box>

        <Divider />

        {/* Advanced Options */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
          <FormControl size="small">
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Source Reliability</Typography>
            <Select
              value={tuning.sourceReliability}
              onChange={(e) => updateTuning({ sourceReliability: e.target.value as any })}
              disabled={disabled}
            >
              <MenuItem value="high">High - Trusted sources</MenuItem>
              <MenuItem value="medium">Medium - Verified sources</MenuItem>
              <MenuItem value="low">Low - Unverified sources</MenuItem>
              <MenuItem value="unknown">Unknown reliability</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small">
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Pattern Matching</Typography>
            <Select
              value={tuning.patternMatching}
              onChange={(e) => updateTuning({ patternMatching: e.target.value as any })}
              disabled={disabled}
            >
              <MenuItem value="strict">Strict - Exact matches only</MenuItem>
              <MenuItem value="moderate">Moderate - Some flexibility</MenuItem>
              <MenuItem value="flexible">Flexible - Fuzzy matching</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={tuning.falsePositiveReduction}
                onChange={(e) => updateTuning({ falsePositiveReduction: e.target.checked })}
                disabled={disabled}
              />
            }
            label="False Positive Reduction"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={tuning.adaptiveThresholds}
                onChange={(e) => updateTuning({ adaptiveThresholds: e.target.checked })}
                disabled={disabled}
              />
            }
            label="Adaptive Thresholds"
          />
        </Box>
      </Box>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Confidence Tuning Help</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              Confidence tuning allows you to adjust how aggressively the AI extracts indicators and how much confidence it requires.
            </Alert>
            
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>Key Settings</Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box>
                  <Typography variant="subtitle2">Extraction Sensitivity</Typography>
                  <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                    Controls how aggressively the AI looks for indicators. Higher values find more indicators but may include false positives.
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2">Minimum Confidence</Typography>
                  <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                    Only indicators above this confidence threshold will be included in results.
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2">Context Weight</Typography>
                  <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                    How much the surrounding text context affects the confidence of extracted indicators.
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>Presets</Typography>
              <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                Use the quick presets for common scenarios:
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="body2">• <strong>Conservative:</strong> High accuracy, fewer false positives</Typography>
                <Typography variant="body2">• <strong>Balanced:</strong> Good balance of accuracy and coverage</Typography>
                <Typography variant="body2">• <strong>Aggressive:</strong> Maximum coverage, may include more false positives</Typography>
                <Typography variant="body2">• <strong>Threat Hunting:</strong> Optimized for hunting and discovery</Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};