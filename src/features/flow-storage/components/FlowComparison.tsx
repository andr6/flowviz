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
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Tooltip,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  InputLabel
} from '@mui/material';
import {
  Compare as CompareIcon,
  ExpandMore as ExpandIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as ModifyIcon,
  SwapHoriz as SwapIcon,
  Timeline as TimelineIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  TrendingUp as SimilarityIcon,
  AccountTree as FlowIcon,
  Schedule as TimeIcon,
  Person as AuthorIcon
} from '@mui/icons-material';
import { threatFlowTheme } from '../../../shared/theme/threatflow-theme';
import { flowManagement, FlowComparison, FlowVersion } from '../services/FlowManagementService';

interface FlowComparisonProps {
  flowId?: string;
  versionAId?: string;
  versionBId?: string;
  onClose?: () => void;
  disabled?: boolean;
}

export const FlowComparisonComponent: React.FC<FlowComparisonProps> = ({
  flowId,
  versionAId,
  versionBId,
  onClose,
  disabled = false
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comparison, setComparison] = useState<FlowComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [availableFlows, setAvailableFlows] = useState<Array<{ flowId: string; versions: FlowVersion[] }>>([]);
  const [selectedFlowA, setSelectedFlowA] = useState<string>(flowId || '');
  const [selectedFlowB, setSelectedFlowB] = useState<string>(flowId || '');
  const [selectedVersionA, setSelectedVersionA] = useState<string>(versionAId || '');
  const [selectedVersionB, setSelectedVersionB] = useState<string>(versionBId || '');
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');

  useEffect(() => {
    if (dialogOpen) {
      loadAvailableFlows();
    }
  }, [dialogOpen]);

  useEffect(() => {
    if (flowId && versionAId && versionBId) {
      setSelectedFlowA(flowId);
      setSelectedFlowB(flowId);
      setSelectedVersionA(versionAId);
      setSelectedVersionB(versionBId);
      performComparison(flowId, versionAId, flowId, versionBId);
    }
  }, [flowId, versionAId, versionBId]);

  const loadAvailableFlows = async () => {
    // In a real implementation, this would load from your flow storage
    const mockFlows = [
      {
        flowId: 'flow-1',
        versions: [
          { id: 'v1', version: '1.0.0', author: 'analyst1', created: new Date('2024-01-01') },
          { id: 'v2', version: '1.1.0', author: 'analyst2', created: new Date('2024-01-15') }
        ]
      }
    ];
    setAvailableFlows(mockFlows as any);
  };

  const performComparison = async (flowAId: string, versionAId: string, flowBId: string, versionBId: string) => {
    setLoading(true);
    try {
      const result = await flowManagement.compareFlows(flowAId, versionAId, flowBId, versionBId);
      setComparison(result);
    } catch (error) {
      console.error('Failed to compare flows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = () => {
    if (selectedFlowA && selectedVersionA && selectedFlowB && selectedVersionB) {
      performComparison(selectedFlowA, selectedVersionA, selectedFlowB, selectedVersionB);
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return threatFlowTheme.colors.accent.secure;
    if (similarity >= 0.6) return threatFlowTheme.colors.status.warning.text;
    return threatFlowTheme.colors.status.error.text;
  };

  const getSimilarityLabel = (similarity: number) => {
    if (similarity >= 0.9) return 'Very Similar';
    if (similarity >= 0.7) return 'Similar';
    if (similarity >= 0.5) return 'Somewhat Similar';
    if (similarity >= 0.3) return 'Different';
    return 'Very Different';
  };

  const renderComparisonHeader = () => {
    if (!comparison) return null;

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">Flow Comparison Results</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={viewMode === 'side-by-side' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('side-by-side')}
              size="small"
            >
              Side by Side
            </Button>
            <Button
              variant={viewMode === 'unified' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('unified')}
              size="small"
            >
              Unified
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SimilarityIcon />
                  Similarity Score
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h3" sx={{ color: getSimilarityColor(comparison.similarity) }}>
                    {Math.round(comparison.similarity * 100)}%
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={comparison.similarity * 100}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getSimilarityColor(comparison.similarity)
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ color: getSimilarityColor(comparison.similarity) }}>
                      {getSimilarityLabel(comparison.similarity)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Flow A</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2">
                    <AuthorIcon sx={{ fontSize: 14, mr: 0.5 }} />
                    {comparison.flowA.author}
                  </Typography>
                  <Typography variant="body2">
                    <TimeIcon sx={{ fontSize: 14, mr: 0.5 }} />
                    {comparison.flowA.created.toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2">
                    Version {comparison.flowA.version}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Flow B</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2">
                    <AuthorIcon sx={{ fontSize: 14, mr: 0.5 }} />
                    {comparison.flowB.author}
                  </Typography>
                  <Typography variant="body2">
                    <TimeIcon sx={{ fontSize: 14, mr: 0.5 }} />
                    {comparison.flowB.created.toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2">
                    Version {comparison.flowB.version}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  const renderDifferencesSummary = () => {
    if (!comparison) return null;

    const { differences } = comparison;
    const totalChanges = 
      differences.nodesAdded.length +
      differences.nodesRemoved.length +
      differences.nodesModified.length +
      differences.edgesAdded.length +
      differences.edgesRemoved.length +
      differences.edgesModified.length;

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Differences Summary</Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={6} md={2}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: threatFlowTheme.colors.accent.secure }}>
                {differences.nodesAdded.length}
              </Typography>
              <Typography variant="caption">Nodes Added</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={2}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.error.text }}>
                {differences.nodesRemoved.length}
              </Typography>
              <Typography variant="caption">Nodes Removed</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={2}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.warning.text }}>
                {differences.nodesModified.length}
              </Typography>
              <Typography variant="caption">Nodes Modified</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={2}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: threatFlowTheme.colors.accent.secure }}>
                {differences.edgesAdded.length}
              </Typography>
              <Typography variant="caption">Edges Added</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={2}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.error.text }}>
                {differences.edgesRemoved.length}
              </Typography>
              <Typography variant="caption">Edges Removed</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={2}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: threatFlowTheme.colors.brand.primary }}>
                {totalChanges}
              </Typography>
              <Typography variant="caption">Total Changes</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  const renderDetailedDifferences = () => {
    if (!comparison) return null;

    const { differences } = comparison;

    return (
      <Box>
        {/* Added Nodes */}
        {differences.nodesAdded.length > 0 && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AddIcon sx={{ color: threatFlowTheme.colors.accent.secure }} />
                <Typography>Added Nodes ({differences.nodesAdded.length})</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {differences.nodesAdded.map((node) => (
                  <ListItem key={node.id}>
                    <ListItemIcon>
                      <AddIcon sx={{ color: threatFlowTheme.colors.accent.secure }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={node.data.label || node.id}
                      secondary={node.data.technique || node.data.description}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Removed Nodes */}
        {differences.nodesRemoved.length > 0 && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RemoveIcon sx={{ color: threatFlowTheme.colors.status.error.text }} />
                <Typography>Removed Nodes ({differences.nodesRemoved.length})</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {differences.nodesRemoved.map((node) => (
                  <ListItem key={node.id}>
                    <ListItemIcon>
                      <RemoveIcon sx={{ color: threatFlowTheme.colors.status.error.text }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={node.data.label || node.id}
                      secondary={node.data.technique || node.data.description}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Modified Nodes */}
        {differences.nodesModified.length > 0 && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ModifyIcon sx={{ color: threatFlowTheme.colors.status.warning.text }} />
                <Typography>Modified Nodes ({differences.nodesModified.length})</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {differences.nodesModified.map((item) => (
                  <ListItem key={item.node.id}>
                    <ListItemIcon>
                      <ModifyIcon sx={{ color: threatFlowTheme.colors.status.warning.text }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.node.data.label || item.node.id}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {item.node.data.technique || item.node.data.description}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            {item.changes.map((change, idx) => (
                              <Chip
                                key={idx}
                                label={change.field || 'Modified'}
                                size="small"
                                sx={{
                                  backgroundColor: `${threatFlowTheme.colors.status.warning.text}20`,
                                  color: threatFlowTheme.colors.status.warning.text,
                                  fontSize: '0.7rem'
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
    );
  };

  const renderSideBySideView = () => {
    if (!comparison) return null;

    return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, color: threatFlowTheme.colors.brand.primary }}>
              Flow A (Version {comparison.flowA.version})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2">
                <strong>Nodes:</strong> {comparison.flowA.nodes.length}
              </Typography>
              <Typography variant="body2">
                <strong>Edges:</strong> {comparison.flowA.edges.length}
              </Typography>
              <Typography variant="body2">
                <strong>Author:</strong> {comparison.flowA.author}
              </Typography>
              <Typography variant="body2">
                <strong>Created:</strong> {comparison.flowA.created.toLocaleString()}
              </Typography>
              <Typography variant="body2">
                <strong>Message:</strong> {comparison.flowA.message}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, color: threatFlowTheme.colors.accent.secure }}>
              Flow B (Version {comparison.flowB.version})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2">
                <strong>Nodes:</strong> {comparison.flowB.nodes.length}
              </Typography>
              <Typography variant="body2">
                <strong>Edges:</strong> {comparison.flowB.edges.length}
              </Typography>
              <Typography variant="body2">
                <strong>Author:</strong> {comparison.flowB.author}
              </Typography>
              <Typography variant="body2">
                <strong>Created:</strong> {comparison.flowB.created.toLocaleString()}
              </Typography>
              <Typography variant="body2">
                <strong>Message:</strong> {comparison.flowB.message}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    );
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
        <CompareIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Flow Comparison
          </Typography>
          <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
            Side-by-side comparison of different analysis results
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<CompareIcon />}
          onClick={() => setDialogOpen(true)}
          disabled={disabled}
          size="small"
        >
          Compare Flows
        </Button>
      </Box>

      {/* Comparison Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xl" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CompareIcon />
          Flow Comparison
        </DialogTitle>
        
        <DialogContent>
          {!comparison ? (
            <Box sx={{ mb: 3 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Select two flow versions to compare their differences and similarities.
              </Alert>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Flow A</Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Select Flow</InputLabel>
                      <Select
                        value={selectedFlowA}
                        onChange={(e) => setSelectedFlowA(e.target.value)}
                      >
                        {availableFlows.map((flow) => (
                          <MenuItem key={flow.flowId} value={flow.flowId}>
                            {flow.flowId}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <FormControl fullWidth>
                      <InputLabel>Select Version</InputLabel>
                      <Select
                        value={selectedVersionA}
                        onChange={(e) => setSelectedVersionA(e.target.value)}
                        disabled={!selectedFlowA}
                      >
                        {availableFlows
                          .find(f => f.flowId === selectedFlowA)?.versions
                          .map((version) => (
                            <MenuItem key={version.id} value={version.id}>
                              Version {version.version} - {version.author}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Flow B</Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Select Flow</InputLabel>
                      <Select
                        value={selectedFlowB}
                        onChange={(e) => setSelectedFlowB(e.target.value)}
                      >
                        {availableFlows.map((flow) => (
                          <MenuItem key={flow.flowId} value={flow.flowId}>
                            {flow.flowId}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <FormControl fullWidth>
                      <InputLabel>Select Version</InputLabel>
                      <Select
                        value={selectedVersionB}
                        onChange={(e) => setSelectedVersionB(e.target.value)}
                        disabled={!selectedFlowB}
                      >
                        {availableFlows
                          .find(f => f.flowId === selectedFlowB)?.versions
                          .map((version) => (
                            <MenuItem key={version.id} value={version.id}>
                              Version {version.version} - {version.author}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  </Paper>
                </Grid>
              </Grid>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleCompare}
                  disabled={!selectedFlowA || !selectedVersionA || !selectedFlowB || !selectedVersionB || loading}
                  startIcon={<CompareIcon />}
                >
                  {loading ? 'Comparing...' : 'Compare Flows'}
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
              {renderComparisonHeader()}
              {renderDifferencesSummary()}
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Detailed Analysis</Typography>
                {viewMode === 'side-by-side' ? renderSideBySideView() : null}
              </Box>
              
              {renderDetailedDifferences()}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          {comparison && (
            <Button
              variant="outlined"
              onClick={() => {
                setComparison(null);
                setSelectedVersionA('');
                setSelectedVersionB('');
              }}
            >
              New Comparison
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};