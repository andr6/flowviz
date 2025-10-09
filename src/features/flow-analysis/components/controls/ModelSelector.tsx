import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Psychology as AIIcon,
  Speed as SpeedIcon,
  AttachMoney as CostIcon,
  Visibility as VisionIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { threatFlowTheme } from '../../../../shared/theme/threatflow-theme';
import { advancedAI, AIModel } from '../../services/advancedAICapabilities';

interface ModelSelectorProps {
  selectedModelId?: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
  showHealthStatus?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModelId,
  onModelChange,
  disabled = false,
  showHealthStatus = true
}) => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
    if (showHealthStatus) {
      checkHealthStatus();
    }
  }, [showHealthStatus]);

  useEffect(() => {
    if (selectedModelId) {
      const model = models.find(m => m.id === selectedModelId);
      setSelectedModel(model || null);
    } else {
      const currentModel = advancedAI.getCurrentModel();
      setSelectedModel(currentModel);
      if (currentModel) {
        onModelChange(currentModel.id);
      }
    }
  }, [selectedModelId, models, onModelChange]);

  const loadModels = async () => {
    try {
      const availableModels = advancedAI.getAvailableModels();
      setModels(availableModels);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkHealthStatus = async () => {
    // This would typically check provider health
    const status: Record<string, boolean> = {};
    models.forEach(model => {
      status[model.id] = model.isAvailable || false;
    });
    setHealthStatus(status);
  };

  const handleModelChange = async (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    setSelectedModel(model);
    const success = await advancedAI.switchModel(modelId);
    if (success) {
      onModelChange(modelId);
    } else {
      console.error('Failed to switch model');
    }
  };

  const getCostColor = (cost?: string) => {
    switch (cost) {
      case 'low': return threatFlowTheme.colors.accent.secure;
      case 'medium': return threatFlowTheme.colors.status.warning.text;
      case 'high': return threatFlowTheme.colors.status.error.text;
      default: return threatFlowTheme.colors.text.tertiary;
    }
  };

  const getSpeedColor = (speed?: string) => {
    switch (speed) {
      case 'fast': return threatFlowTheme.colors.accent.secure;
      case 'medium': return threatFlowTheme.colors.status.warning.text;
      case 'slow': return threatFlowTheme.colors.status.error.text;
      default: return threatFlowTheme.colors.text.tertiary;
    }
  };

  const getAccuracyColor = (accuracy?: string) => {
    switch (accuracy) {
      case 'high': return threatFlowTheme.colors.accent.secure;
      case 'medium': return threatFlowTheme.colors.status.warning.text;
      case 'standard': return threatFlowTheme.colors.text.tertiary;
      default: return threatFlowTheme.colors.text.tertiary;
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mb: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (models.length === 0) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        No AI models are currently available. Please check your provider configuration.
      </Alert>
    );
  }

  return (
    <>
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
        <AIIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />
        
        <FormControl fullWidth size="small">
          <Select
            value={selectedModel?.id || ''}
            onChange={(e) => handleModelChange(e.target.value)}
            disabled={disabled}
            displayEmpty
            sx={{
              '& .MuiSelect-select': {
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }
            }}
          >
            {models.map((model) => (
              <MenuItem key={model.id} value={model.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {model.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                      {model.provider.toUpperCase()} • {model.description}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {showHealthStatus && (
                      <Tooltip title={healthStatus[model.id] ? 'Available' : 'Unavailable'}>
                        {healthStatus[model.id] ? (
                          <CheckIcon sx={{ fontSize: 16, color: threatFlowTheme.colors.accent.secure }} />
                        ) : (
                          <ErrorIcon sx={{ fontSize: 16, color: threatFlowTheme.colors.status.error.text }} />
                        )}
                      </Tooltip>
                    )}
                    
                    {model.supportsVision && (
                      <Tooltip title="Supports vision analysis">
                        <VisionIcon sx={{ fontSize: 16, color: threatFlowTheme.colors.brand.primary }} />
                      </Tooltip>
                    )}
                    
                    <Chip
                      label={model.cost}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.7rem',
                        backgroundColor: `${getCostColor(model.cost)}20`,
                        color: getCostColor(model.cost),
                        '& .MuiChip-label': { px: 0.5 }
                      }}
                    />
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Tooltip title="Model Details">
          <IconButton 
            size="small" 
            onClick={() => setDetailsOpen(true)}
            disabled={!selectedModel}
          >
            <InfoIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Model Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AIIcon />
          {selectedModel?.name} Details
        </DialogTitle>
        
        <DialogContent>
          {selectedModel && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Basic Information */}
              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>Model Information</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                      Provider
                    </Typography>
                    <Typography variant="body1">{selectedModel.provider.toUpperCase()}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                      Model ID
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                      {selectedModel.id}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ mt: 1, color: threatFlowTheme.colors.text.secondary }}>
                  {selectedModel.description}
                </Typography>
              </Box>

              <Divider />

              {/* Performance Metrics */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Performance Characteristics</Typography>
                <Box sx={{ display: 'flex', gap: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CostIcon sx={{ color: getCostColor(selectedModel.cost) }} />
                    <Box>
                      <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                        Cost
                      </Typography>
                      <Typography variant="body1" sx={{ color: getCostColor(selectedModel.cost), textTransform: 'capitalize' }}>
                        {selectedModel.cost}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SpeedIcon sx={{ color: getSpeedColor(selectedModel.speed) }} />
                    <Box>
                      <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                        Speed
                      </Typography>
                      <Typography variant="body1" sx={{ color: getSpeedColor(selectedModel.speed), textTransform: 'capitalize' }}>
                        {selectedModel.speed}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                        Accuracy
                      </Typography>
                      <Typography variant="body1" sx={{ color: getAccuracyColor(selectedModel.accuracy), textTransform: 'capitalize' }}>
                        {selectedModel.accuracy}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Divider />

              {/* Capabilities */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Capabilities</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedModel.capabilities.map((capability) => (
                    <Chip
                      key={capability}
                      label={capability.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      size="small"
                      sx={{
                        backgroundColor: `${threatFlowTheme.colors.brand.primary}20`,
                        color: threatFlowTheme.colors.brand.primary
                      }}
                    />
                  ))}
                  
                  {selectedModel.supportsVision && (
                    <Chip
                      icon={<VisionIcon sx={{ fontSize: 16 }} />}
                      label="Vision Analysis"
                      size="small"
                      sx={{
                        backgroundColor: `${threatFlowTheme.colors.accent.secure}20`,
                        color: threatFlowTheme.colors.accent.secure
                      }}
                    />
                  )}
                  
                  {selectedModel.supportsStreaming && (
                    <Chip
                      label="Real-time Streaming"
                      size="small"
                      sx={{
                        backgroundColor: `${threatFlowTheme.colors.accent.secure}20`,
                        color: threatFlowTheme.colors.accent.secure
                      }}
                    />
                  )}
                </Box>
              </Box>

              {/* Health Status */}
              {showHealthStatus && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="h6" sx={{ mb: 1 }}>Health Status</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {healthStatus[selectedModel.id] ? (
                        <>
                          <CheckIcon sx={{ color: threatFlowTheme.colors.accent.secure }} />
                          <Typography sx={{ color: threatFlowTheme.colors.accent.secure }}>
                            Available and ready
                          </Typography>
                        </>
                      ) : (
                        <>
                          <ErrorIcon sx={{ color: threatFlowTheme.colors.status.error.text }} />
                          <Typography sx={{ color: threatFlowTheme.colors.status.error.text }}>
                            Unavailable - check provider configuration
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};