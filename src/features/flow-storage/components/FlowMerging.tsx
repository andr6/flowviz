import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Chip,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  TextField,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Card,
  CardContent,
  RadioGroup,
  Radio,
  FormControlLabel,
  Switch,
  LinearProgress
} from '@mui/material';
import {
  Merge as MergeIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ExpandMore as ExpandIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
  AccountTree as FlowIcon,
  CompareArrows as ConflictIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { threatFlowTheme } from '../../../shared/theme/threatflow-theme';
import { flowManagement, FlowMergeConfig, FlowMergeResult, FlowVersion } from '../services/FlowManagementService';

interface FlowMergingProps {
  onMergeComplete?: (result: FlowMergeResult) => void;
  disabled?: boolean;
}

export const FlowMerging: React.FC<FlowMergingProps> = ({
  onMergeComplete,
  disabled = false
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFlows, setSelectedFlows] = useState<Array<{ flowId: string; versionId: string }>>([]);
  const [availableFlows, setAvailableFlows] = useState<Array<{ flowId: string; versions: FlowVersion[] }>>([]);
  const [mergeConfig, setMergeConfig] = useState<FlowMergeConfig>({
    strategy: 'smart',
    conflictResolution: 'manual',
    preserveMetadata: true,
    mergeComments: false,
    autoResolveConflicts: false
  });
  const [mergeResult, setMergeResult] = useState<FlowMergeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'selection' | 'configuration' | 'preview' | 'conflicts'>('selection');
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, any>>({});

  useEffect(() => {
    if (dialogOpen) {
      loadAvailableFlows();
    }
  }, [dialogOpen]);

  const loadAvailableFlows = async () => {
    // Mock data - in real implementation, load from flow storage
    const mockFlows = [
      {
        flowId: 'apt-campaign-1',
        versions: [
          { id: 'v1', version: '1.0.0', author: 'analyst1', created: new Date('2024-01-01') },
          { id: 'v2', version: '1.1.0', author: 'analyst2', created: new Date('2024-01-15') }
        ]
      },
      {
        flowId: 'ransomware-incident',
        versions: [
          { id: 'v1', version: '1.0.0', author: 'analyst3', created: new Date('2024-01-10') }
        ]
      }
    ];
    setAvailableFlows(mockFlows as any);
  };

  const handleFlowSelection = (flowId: string, versionId: string) => {
    const existing = selectedFlows.find(f => f.flowId === flowId);
    if (existing) {
      setSelectedFlows(prev => prev.map(f => 
        f.flowId === flowId ? { ...f, versionId } : f
      ));
    } else {
      setSelectedFlows(prev => [...prev, { flowId, versionId }]);
    }
  };

  const removeSelectedFlow = (flowId: string) => {
    setSelectedFlows(prev => prev.filter(f => f.flowId !== flowId));
  };

  const handlePreviewMerge = async () => {
    if (selectedFlows.length < 2) return;

    setLoading(true);
    try {
      const result = await flowManagement.mergeFlows(
        selectedFlows,
        mergeConfig,
        'current-user' // In real app, get from auth context
      );
      setMergeResult(result);
      
      if (result.conflicts.length > 0) {
        setStep('conflicts');
      } else {
        setStep('preview');
      }
    } catch (error) {
      console.error('Failed to merge flows:', error);
      alert('Failed to merge flows');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMergedFlow = async () => {
    if (!mergeResult) return;

    const flowId = `merged-${Date.now()}`;
    const message = 'Merged flow from multiple sources';

    try {
      await flowManagement.saveMergedFlow(mergeResult, flowId, message, 'current-user');
      
      if (onMergeComplete) {
        onMergeComplete(mergeResult);
      }
      
      setDialogOpen(false);
      setStep('selection');
      setMergeResult(null);
      setSelectedFlows([]);
    } catch (error) {
      console.error('Failed to save merged flow:', error);
      alert('Failed to save merged flow');
    }
  };

  const resolveConflict = (conflictId: string, resolution: 'optionA' | 'optionB' | 'custom', customValue?: any) => {
    setConflictResolutions(prev => ({
      ...prev,
      [conflictId]: { resolution, customValue }
    }));
  };

  const getStrategyDescription = (strategy: FlowMergeConfig['strategy']) => {
    switch (strategy) {
      case 'union': return 'Combine all elements from all flows';
      case 'intersection': return 'Keep only elements present in all flows';
      case 'priority': return 'Use flow order to resolve conflicts';
      case 'smart': return 'AI-powered intelligent merging';
      default: return '';
    }
  };

  const renderFlowSelection = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Select 2 or more flows to merge into a comprehensive analysis. 
        You can combine flows from different incidents or campaigns.
      </Alert>

      <Typography variant="h6" sx={{ mb: 2 }}>Available Flows</Typography>
      
      {availableFlows.map((flow) => (
        <Paper key={flow.flowId} sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1">{flow.flowId}</Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Version</InputLabel>
              <Select
                value={selectedFlows.find(f => f.flowId === flow.flowId)?.versionId || ''}
                onChange={(e) => handleFlowSelection(flow.flowId, e.target.value)}
              >
                {flow.versions.map((version) => (
                  <MenuItem key={version.id} value={version.id}>
                    {version.version} - {version.author}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          {selectedFlows.find(f => f.flowId === flow.flowId) && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Chip
                label="Selected for merge"
                color="primary"
                size="small"
              />
              <Button
                size="small"
                onClick={() => removeSelectedFlow(flow.flowId)}
              >
                Remove
              </Button>
            </Box>
          )}
        </Paper>
      ))}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
          {selectedFlows.length} flows selected
        </Typography>
        <Button
          variant="contained"
          onClick={() => setStep('configuration')}
          disabled={selectedFlows.length < 2}
        >
          Configure Merge
        </Button>
      </Box>
    </Box>
  );

  const renderMergeConfiguration = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Merge Configuration</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Merge Strategy</InputLabel>
            <Select
              value={mergeConfig.strategy}
              onChange={(e) => setMergeConfig(prev => ({ 
                ...prev, 
                strategy: e.target.value as FlowMergeConfig['strategy'] 
              }))}
            >
              <MenuItem value="union">Union - Combine All</MenuItem>
              <MenuItem value="intersection">Intersection - Common Only</MenuItem>
              <MenuItem value="priority">Priority - Flow Order</MenuItem>
              <MenuItem value="smart">Smart Merge (Recommended)</MenuItem>
            </Select>
          </FormControl>
          
          <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary, mb: 2 }}>
            {getStrategyDescription(mergeConfig.strategy)}
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Conflict Resolution</InputLabel>
            <Select
              value={mergeConfig.conflictResolution}
              onChange={(e) => setMergeConfig(prev => ({ 
                ...prev, 
                conflictResolution: e.target.value as FlowMergeConfig['conflictResolution'] 
              }))}
            >
              <MenuItem value="manual">Manual - Ask me to resolve</MenuItem>
              <MenuItem value="prefer-a">Prefer first flow</MenuItem>
              <MenuItem value="prefer-b">Prefer second flow</MenuItem>
              <MenuItem value="smart">Smart resolution</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" sx={{ mb: 2 }}>Additional Options</Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={mergeConfig.preserveMetadata}
              onChange={(e) => setMergeConfig(prev => ({ 
                ...prev, 
                preserveMetadata: e.target.checked 
              }))}
            />
          }
          label="Preserve metadata from all flows"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={mergeConfig.mergeComments}
              onChange={(e) => setMergeConfig(prev => ({ 
                ...prev, 
                mergeComments: e.target.checked 
              }))}
            />
          }
          label="Merge comments and annotations"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={mergeConfig.autoResolveConflicts}
              onChange={(e) => setMergeConfig(prev => ({ 
                ...prev, 
                autoResolveConflicts: e.target.checked 
              }))}
            />
          }
          label="Automatically resolve simple conflicts"
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button onClick={() => setStep('selection')}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handlePreviewMerge}
          disabled={loading}
          startIcon={loading ? <RefreshIcon /> : <MergeIcon />}
        >
          {loading ? 'Merging...' : 'Preview Merge'}
        </Button>
      </Box>
    </Box>
  );

  const renderConflictResolution = () => {
    if (!mergeResult) return null;

    return (
      <Box>
        <Alert severity="warning" sx={{ mb: 3 }}>
          {mergeResult.conflicts.length} conflicts detected during merge. 
          Please resolve these conflicts before proceeding.
        </Alert>

        <Typography variant="h6" sx={{ mb: 2 }}>Resolve Conflicts</Typography>

        {mergeResult.conflicts.map((conflict, index) => (
          <Paper key={index} sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ConflictIcon sx={{ color: threatFlowTheme.colors.status.warning.text }} />
              <Typography variant="subtitle1">
                {conflict.type} Conflict: {conflict.conflictType}
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, backgroundColor: threatFlowTheme.colors.background.tertiary }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Option A</Typography>
                  <Typography variant="body2">
                    {JSON.stringify(conflict.optionA, null, 2)}
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, backgroundColor: threatFlowTheme.colors.background.tertiary }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Option B</Typography>
                  <Typography variant="body2">
                    {JSON.stringify(conflict.optionB, null, 2)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <RadioGroup
              value={conflictResolutions[conflict.id]?.resolution || ''}
              onChange={(e) => resolveConflict(conflict.id, e.target.value as any)}
              sx={{ mt: 2 }}
            >
              <FormControlLabel value="optionA" control={<Radio />} label="Use Option A" />
              <FormControlLabel value="optionB" control={<Radio />} label="Use Option B" />
              {conflict.suggestion && (
                <FormControlLabel value="custom" control={<Radio />} label="Use Suggested Resolution" />
              )}
            </RadioGroup>
          </Paper>
        ))}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button onClick={() => setStep('configuration')}>
            Back to Configuration
          </Button>
          <Button
            variant="contained"
            onClick={() => setStep('preview')}
            disabled={mergeResult.conflicts.some(c => !conflictResolutions[c.id])}
          >
            Continue to Preview
          </Button>
        </Box>
      </Box>
    );
  };

  const renderMergePreview = () => {
    if (!mergeResult) return null;

    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>Merge Preview</Typography>
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: threatFlowTheme.colors.brand.primary }}>
                  {mergeResult.mergedFlow.nodes.length}
                </Typography>
                <Typography variant="caption">Total Nodes</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: threatFlowTheme.colors.accent.secure }}>
                  {mergeResult.mergedFlow.edges.length}
                </Typography>
                <Typography variant="caption">Total Edges</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.warning.text }}>
                  {mergeResult.statistics.conflictsResolved}
                </Typography>
                <Typography variant="caption">Conflicts Resolved</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.error.text }}>
                  {mergeResult.statistics.conflictsRemaining}
                </Typography>
                <Typography variant="caption">Conflicts Remaining</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Alert 
          severity={mergeResult.statistics.conflictsRemaining > 0 ? 'warning' : 'success'} 
          sx={{ mb: 2 }}
        >
          {mergeResult.statistics.conflictsRemaining > 0 
            ? `${mergeResult.statistics.conflictsRemaining} conflicts still need resolution`
            : 'All conflicts resolved. Ready to save merged flow.'
          }
        </Alert>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Typography>Merged Flow Details</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                  Flow Name
                </Typography>
                <Typography variant="body1">{mergeResult.mergedFlow.metadata.name}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                  Description
                </Typography>
                <Typography variant="body1">{mergeResult.mergedFlow.metadata.description}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                  Category
                </Typography>
                <Typography variant="body1">{mergeResult.mergedFlow.metadata.category}</Typography>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button onClick={() => setStep(mergeResult.conflicts.length > 0 ? 'conflicts' : 'configuration')}>
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveMergedFlow}
            disabled={mergeResult.statistics.conflictsRemaining > 0}
            startIcon={<SaveIcon />}
          >
            Save Merged Flow
          </Button>
        </Box>
      </Box>
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 'selection': return renderFlowSelection();
      case 'configuration': return renderMergeConfiguration();
      case 'conflicts': return renderConflictResolution();
      case 'preview': return renderMergePreview();
      default: return renderFlowSelection();
    }
  };

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
        <MergeIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Flow Merging
          </Typography>
          <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
            Combine multiple related analyses into comprehensive view
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<MergeIcon />}
          onClick={() => setDialogOpen(true)}
          disabled={disabled}
          size="small"
        >
          Merge Flows
        </Button>
      </Box>

      {/* Flow Merging Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MergeIcon />
          Flow Merging
        </DialogTitle>
        
        <DialogContent>
          {loading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress />
            </Box>
          )}
          
          {renderCurrentStep()}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};