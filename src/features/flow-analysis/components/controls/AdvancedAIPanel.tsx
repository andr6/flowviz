import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Button,
  Chip,
  Tooltip,
  IconButton,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  Psychology as AIIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { threatFlowTheme } from '../../../../shared/theme/threatflow-theme';
import { ModelSelector } from './ModelSelector';
import { CustomPromptManager } from './CustomPromptManager';
import { ConfidenceTuning } from './ConfidenceTuning';
import { IncrementalAnalysis } from './IncrementalAnalysis';
import { VisionAnalysis } from './VisionAnalysis';
import { advancedAI, CustomPrompt, ConfidenceTuning as ConfidenceTuningType, IncrementalAnalysis as IncrementalAnalysisType } from '../../services/advancedAICapabilities';

interface AdvancedAIPanelProps {
  onAnalysisStart?: (config: any) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const AdvancedAIPanel: React.FC<AdvancedAIPanelProps> = ({
  onAnalysisStart,
  disabled = false,
  compact = false
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [confidenceTuning, setConfidenceTuning] = useState<ConfidenceTuningType>(advancedAI.getConfidenceTuning());
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('model');

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    console.log('Model changed to:', modelId);
  };

  const handlePromptChange = (promptId: string | null) => {
    setSelectedPromptId(promptId);
    console.log('Prompt changed to:', promptId);
  };

  const handlePromptApply = (prompt: CustomPrompt, variables: Record<string, string>) => {
    console.log('Applying prompt:', prompt.name, 'with variables:', variables);
    
    if (onAnalysisStart) {
      onAnalysisStart({
        type: 'custom-prompt',
        prompt,
        variables,
        model: selectedModelId,
        confidenceTuning
      });
    }
  };

  const handleConfidenceTuningChange = (tuning: ConfidenceTuningType) => {
    setConfidenceTuning(tuning);
    console.log('Confidence tuning updated:', tuning);
  };

  const handleIncrementalAnalysis = (config: IncrementalAnalysisType) => {
    console.log('Starting incremental analysis:', config);
    
    if (onAnalysisStart) {
      onAnalysisStart({
        type: 'incremental',
        config,
        model: selectedModelId,
        confidenceTuning
      });
    }
  };

  const handleVisionAnalysis = (results: any) => {
    console.log('Vision analysis completed:', results);
    
    if (onAnalysisStart) {
      onAnalysisStart({
        type: 'vision',
        results,
        model: selectedModelId,
        confidenceTuning
      });
    }
  };

  const getUsageStatistics = () => {
    return advancedAI.getUsageStatistics();
  };

  const renderCompactView = () => (
    <Paper sx={{ 
      p: 2, 
      mb: 2,
      backgroundColor: threatFlowTheme.colors.background.secondary,
      border: `1px solid ${threatFlowTheme.colors.surface.border.default}`
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AIIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />
          <Box>
            <Typography variant="h6">Advanced AI</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Chip
                label={selectedModelId || 'Default Model'}
                size="small"
                sx={{
                  backgroundColor: `${threatFlowTheme.colors.brand.primary}20`,
                  color: threatFlowTheme.colors.brand.primary
                }}
              />
              {selectedPromptId && (
                <Chip
                  label="Custom Prompt"
                  size="small"
                  sx={{
                    backgroundColor: `${threatFlowTheme.colors.accent.secure}20`,
                    color: threatFlowTheme.colors.accent.secure
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>
        
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => setActiveSection('expanded')}
          size="small"
        >
          Configure
        </Button>
      </Box>
    </Paper>
  );

  const renderExpandedView = () => (
    <Paper sx={{ 
      mb: 2,
      backgroundColor: threatFlowTheme.colors.background.secondary,
      border: `1px solid ${threatFlowTheme.colors.surface.border.default}`
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 3, 
        borderBottom: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AIIcon sx={{ color: threatFlowTheme.colors.brand.primary, fontSize: 32 }} />
          <Box>
            <Typography variant="h5">Advanced AI Capabilities</Typography>
            <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
              Multi-model support, custom prompts, and specialized analysis features
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Analytics">
            <IconButton onClick={() => setShowAnalytics(!showAnalytics)}>
              <AnalyticsIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Help">
            <IconButton>
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Analytics Panel */}
      {showAnalytics && (
        <Box sx={{ p: 2, backgroundColor: threatFlowTheme.colors.background.tertiary }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Usage Analytics</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
            {(() => {
              const stats = getUsageStatistics();
              return (
                <>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: threatFlowTheme.colors.brand.primary }}>
                      {stats.totalSessions}
                    </Typography>
                    <Typography variant="caption">Total Sessions</Typography>
                  </Paper>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: threatFlowTheme.colors.accent.secure }}>
                      {Object.keys(stats.modelUsage).length}
                    </Typography>
                    <Typography variant="caption">Models Used</Typography>
                  </Paper>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.warning.text }}>
                      {Object.keys(stats.promptUsage).length}
                    </Typography>
                    <Typography variant="caption">Custom Prompts</Typography>
                  </Paper>
                </>
              );
            })()}
          </Box>
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Model Selection */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Typography variant="h6">1. AI Model Selection</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="info" sx={{ mb: 2 }}>
                Choose your AI model based on your analysis needs. Claude excels at complex reasoning, 
                GPT-4 provides strong multimodal capabilities, and Ollama offers local processing.
              </Alert>
              <ModelSelector
                selectedModelId={selectedModelId}
                onModelChange={handleModelChange}
                disabled={disabled}
              />
            </AccordionDetails>
          </Accordion>

          {/* Custom Prompts */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Typography variant="h6">2. Custom Analysis Prompts</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="info" sx={{ mb: 2 }}>
                Use specialized prompts for different types of threat analysis. Create your own templates 
                or use built-in prompts optimized for malware analysis, incident response, and threat hunting.
              </Alert>
              <CustomPromptManager
                selectedPromptId={selectedPromptId}
                onPromptChange={handlePromptChange}
                onPromptApply={handlePromptApply}
                disabled={disabled}
              />
            </AccordionDetails>
          </Accordion>

          {/* Confidence Tuning */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Typography variant="h6">3. Confidence Tuning</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="info" sx={{ mb: 2 }}>
                Adjust extraction sensitivity and confidence thresholds based on your source reliability 
                and analysis requirements. Higher sensitivity finds more indicators but may include false positives.
              </Alert>
              <ConfidenceTuning
                onTuningChange={handleConfidenceTuningChange}
                disabled={disabled}
                compact={false}
              />
            </AccordionDetails>
          </Accordion>

          {/* Advanced Features */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Typography variant="h6">4. Advanced Features</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Incremental Analysis */}
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Incremental Analysis</Typography>
                  <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary, mb: 2 }}>
                    Continue analysis on existing flows with new threat intelligence
                  </Typography>
                  <IncrementalAnalysis
                    onIncrementalAnalysis={handleIncrementalAnalysis}
                    disabled={disabled}
                  />
                </Box>

                <Divider />

                {/* Vision Analysis */}
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Vision Analysis</Typography>
                  <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary, mb: 2 }}>
                    OCR and analysis of threat reports in image format
                  </Typography>
                  <VisionAnalysis
                    onAnalysisComplete={handleVisionAnalysis}
                    disabled={disabled}
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>
      </Box>
    </Paper>
  );

  if (compact || activeSection === 'compact') {
    return renderCompactView();
  }

  return renderExpandedView();
};