import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Button,
  Paper,
  Divider,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Merge as MergeIcon,
  Timeline as TimelineIcon,
  Storage as StorageIcon,
  ExpandMore as ExpandIcon,
  Info as InfoIcon,
  PlayArrow as StartIcon,
  Refresh as RefreshIcon,
  CompareArrows as CompareIcon,
  AccountTree as FlowIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { threatFlowTheme } from '../../../../shared/theme/threatflow-theme';
import { advancedAI, IncrementalAnalysis as IncrementalAnalysisType } from '../../services/advancedAICapabilities';

interface IncrementalAnalysisProps {
  currentFlowId?: string;
  onIncrementalAnalysis?: (config: IncrementalAnalysisType) => void;
  disabled?: boolean;
}

interface FlowSummary {
  id: string;
  name: string;
  created: Date;
  nodeCount: number;
  techniques: string[];
  lastModified: Date;
}

export const IncrementalAnalysis: React.FC<IncrementalAnalysisProps> = ({
  currentFlowId,
  onIncrementalAnalysis,
  disabled = false
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [availableFlows, setAvailableFlows] = useState<FlowSummary[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>('');
  const [additionalContent, setAdditionalContent] = useState('');
  const [mergeStrategy, setMergeStrategy] = useState<IncrementalAnalysisType['mergeStrategy']>('smart-merge');
  const [preserveExisting, setPreserveExisting] = useState(true);
  const [conflictResolution, setConflictResolution] = useState<IncrementalAnalysisType['conflictResolution']>('ask-user');
  const [analysisMode, setAnalysisMode] = useState<IncrementalAnalysisType['analysisMode']>('smart-update');
  const [analyzing, setAnalyzing] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [previewResults, setPreviewResults] = useState<any>(null);

  useEffect(() => {
    loadAvailableFlows();
  }, []);

  const loadAvailableFlows = () => {
    // This would typically load from your flow storage system
    const mockFlows: FlowSummary[] = [
      {
        id: 'flow-1',
        name: 'APT29 Campaign Analysis',
        created: new Date('2024-01-15'),
        nodeCount: 15,
        techniques: ['T1566.001', 'T1055', 'T1027'],
        lastModified: new Date('2024-01-20')
      },
      {
        id: 'flow-2',
        name: 'Ransomware Incident Response',
        created: new Date('2024-01-10'),
        nodeCount: 22,
        techniques: ['T1486', 'T1490', 'T1083'],
        lastModified: new Date('2024-01-18')
      },
      {
        id: 'flow-3',
        name: 'Phishing Campaign Investigation',
        created: new Date('2024-01-05'),
        nodeCount: 8,
        techniques: ['T1566.002', 'T1204.001', 'T1027.001'],
        lastModified: new Date('2024-01-12')
      }
    ];
    setAvailableFlows(mockFlows);
  };

  const handleAnalyze = async () => {
    if (!selectedFlowId || !additionalContent.trim()) {
      return;
    }

    const config: IncrementalAnalysisType = {
      existingFlowId: selectedFlowId,
      additionalContent: additionalContent.trim(),
      mergeStrategy,
      preserveExisting,
      conflictResolution,
      analysisMode
    };

    setAnalyzing(true);
    
    try {
      if (onIncrementalAnalysis) {
        onIncrementalAnalysis(config);
      }
      
      // Simulate analysis progress
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock results for demo
      setPreviewResults({
        newNodes: 3,
        newEdges: 5,
        updatedNodes: 2,
        conflicts: conflicts.length
      });
      
    } catch (error) {
      console.error('Incremental analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const selectedFlow = availableFlows.find(f => f.id === selectedFlowId);

  const getMergeStrategyDescription = (strategy: string) => {
    switch (strategy) {
      case 'append': return 'Add new content without modifying existing flow';
      case 'merge': return 'Intelligently merge new findings with existing nodes';
      case 'replace': return 'Replace conflicting nodes with new analysis';
      case 'smart-merge': return 'AI-powered smart merge with conflict detection';
      default: return '';
    }
  };

  const getAnalysisModeDescription = (mode: string) => {
    switch (mode) {
      case 'full-reanalysis': return 'Reanalyze entire content including existing parts';
      case 'delta-only': return 'Analyze only the new content';
      case 'smart-update': return 'Intelligently update based on new content';
      default: return '';
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
        <AddIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Incremental Analysis
          </Typography>
          <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
            Continue analysis on existing flows with new information
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          disabled={disabled}
          size="small"
        >
          Add Content
        </Button>
      </Box>

      {/* Incremental Analysis Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MergeIcon />
          Incremental Analysis
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <Alert severity="info" icon={<InfoIcon />}>
              Incremental analysis allows you to add new threat intelligence to existing attack flows. 
              The AI will intelligently merge new findings with your existing analysis.
            </Alert>

            {/* Flow Selection */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <StorageIcon />
                Select Existing Flow
              </Typography>
              
              <FormControl fullWidth>
                <Select
                  value={selectedFlowId}
                  onChange={(e) => setSelectedFlowId(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>Choose a flow to extend...</em>
                  </MenuItem>
                  {availableFlows.map((flow) => (
                    <MenuItem key={flow.id} value={flow.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <FlowIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1">{flow.name}</Typography>
                          <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                            {flow.nodeCount} nodes • Modified {flow.lastModified.toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {flow.techniques.slice(0, 3).map(technique => (
                            <Chip
                              key={technique}
                              label={technique}
                              size="small"
                              sx={{ height: 18, fontSize: '0.7rem' }}
                            />
                          ))}
                          {flow.techniques.length > 3 && (
                            <Chip
                              label={`+${flow.techniques.length - 3}`}
                              size="small"
                              sx={{ height: 18, fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedFlow && (
                <Paper sx={{ p: 2, mt: 2, backgroundColor: threatFlowTheme.colors.background.tertiary }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Selected Flow Summary</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                        Nodes
                      </Typography>
                      <Typography variant="body1">{selectedFlow.nodeCount}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                        Created
                      </Typography>
                      <Typography variant="body1">{selectedFlow.created.toLocaleDateString()}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                        Techniques
                      </Typography>
                      <Typography variant="body1">{selectedFlow.techniques.length}</Typography>
                    </Box>
                  </Box>
                </Paper>
              )}
            </Box>

            {/* Additional Content */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AddIcon />
                Additional Content
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={8}
                placeholder="Paste new threat intelligence, incident reports, or additional analysis content here..."
                value={additionalContent}
                onChange={(e) => setAdditionalContent(e.target.value)}
                sx={{ mb: 1 }}
              />
              
              <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                {additionalContent.trim().split(/\s+/).length} words, {additionalContent.length} characters
              </Typography>
            </Box>

            {/* Configuration Options */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandIcon />}>
                <Typography variant="h6">Analysis Configuration</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Merge Strategy */}
                  <Box>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>Merge Strategy</Typography>
                    <FormControl fullWidth>
                      <Select
                        value={mergeStrategy}
                        onChange={(e) => setMergeStrategy(e.target.value as any)}
                      >
                        <MenuItem value="append">
                          <Box>
                            <Typography>Append Only</Typography>
                            <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                              {getMergeStrategyDescription('append')}
                            </Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="merge">
                          <Box>
                            <Typography>Intelligent Merge</Typography>
                            <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                              {getMergeStrategyDescription('merge')}
                            </Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="smart-merge">
                          <Box>
                            <Typography>Smart Merge (Recommended)</Typography>
                            <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                              {getMergeStrategyDescription('smart-merge')}
                            </Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="replace">
                          <Box>
                            <Typography>Replace Conflicts</Typography>
                            <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                              {getMergeStrategyDescription('replace')}
                            </Typography>
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Analysis Mode */}
                  <Box>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>Analysis Mode</Typography>
                    <FormControl fullWidth>
                      <Select
                        value={analysisMode}
                        onChange={(e) => setAnalysisMode(e.target.value as any)}
                      >
                        <MenuItem value="delta-only">
                          <Box>
                            <Typography>Delta Only</Typography>
                            <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                              {getAnalysisModeDescription('delta-only')}
                            </Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="smart-update">
                          <Box>
                            <Typography>Smart Update (Recommended)</Typography>
                            <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                              {getAnalysisModeDescription('smart-update')}
                            </Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="full-reanalysis">
                          <Box>
                            <Typography>Full Reanalysis</Typography>
                            <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                              {getAnalysisModeDescription('full-reanalysis')}
                            </Typography>
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Conflict Resolution */}
                  <Box>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>Conflict Resolution</Typography>
                    <FormControl fullWidth>
                      <Select
                        value={conflictResolution}
                        onChange={(e) => setConflictResolution(e.target.value as any)}
                      >
                        <MenuItem value="ask-user">Ask me to resolve conflicts</MenuItem>
                        <MenuItem value="prefer-new">Prefer new analysis</MenuItem>
                        <MenuItem value="prefer-existing">Prefer existing analysis</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Additional Options */}
                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preserveExisting}
                          onChange={(e) => setPreserveExisting(e.target.checked)}
                        />
                      }
                      label="Preserve existing flow structure"
                    />
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Analysis Progress */}
            {analyzing && (
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>Analyzing...</Typography>
                <LinearProgress sx={{ mb: 2 }} />
                <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                  Processing additional content and merging with existing flow...
                </Typography>
              </Box>
            )}

            {/* Preview Results */}
            {previewResults && !analyzing && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckIcon sx={{ color: threatFlowTheme.colors.accent.secure }} />
                  Analysis Complete
                </Typography>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 2 }}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: threatFlowTheme.colors.accent.secure }}>
                      {previewResults.newNodes}
                    </Typography>
                    <Typography variant="caption">New Nodes</Typography>
                  </Paper>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: threatFlowTheme.colors.brand.primary }}>
                      {previewResults.newEdges}
                    </Typography>
                    <Typography variant="caption">New Connections</Typography>
                  </Paper>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.warning.text }}>
                      {previewResults.updatedNodes}
                    </Typography>
                    <Typography variant="caption">Updated Nodes</Typography>
                  </Paper>
                  {previewResults.conflicts > 0 && (
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.error.text }}>
                        {previewResults.conflicts}
                      </Typography>
                      <Typography variant="caption">Conflicts</Typography>
                    </Paper>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAnalyze}
            variant="contained"
            disabled={!selectedFlowId || !additionalContent.trim() || analyzing}
            startIcon={analyzing ? <RefreshIcon /> : <StartIcon />}
          >
            {analyzing ? 'Analyzing...' : 'Start Analysis'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};