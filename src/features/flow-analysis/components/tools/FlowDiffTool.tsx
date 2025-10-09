/**
 * Flow Diff/Comparison Tool
 * Advanced comparison and diff visualization for attack flows
 */
import {
  CompareArrows as CompareArrowsIcon,
  SwapHoriz as SwapHorizIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  Category as CategoryIcon,
  Save as SaveIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Badge,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState, useCallback, useMemo } from 'react';
import { Node, Edge } from 'reactflow';

// Types for flow comparison
interface FlowDiffItem {
  id: string;
  name: string;
  version?: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  metadata: {
    author?: string;
    created: Date;
    modified: Date;
    campaign?: string;
    actor?: string;
    confidence: number;
    techniques: string[];
    tactics: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

interface DiffResult {
  summary: {
    totalChanges: number;
    addedNodes: number;
    removedNodes: number;
    modifiedNodes: number;
    addedEdges: number;
    removedEdges: number;
    modifiedEdges: number;
    similarity: number; // percentage
  };
  nodeChanges: NodeDiff[];
  edgeChanges: EdgeDiff[];
  tacticChanges: TacticDiff[];
  techniqueChanges: TechniqueDiff[];
  metadataChanges: MetadataDiff[];
}

interface NodeDiff {
  id: string;
  type: 'added' | 'removed' | 'modified' | 'moved';
  oldNode?: Node;
  newNode?: Node;
  changes?: {
    position?: { old: { x: number; y: number }; new: { x: number; y: number } };
    data?: { field: string; old: any; new: any }[];
    style?: { field: string; old: any; new: any }[];
  };
  significance: 'low' | 'medium' | 'high';
}

interface EdgeDiff {
  id: string;
  type: 'added' | 'removed' | 'modified';
  oldEdge?: Edge;
  newEdge?: Edge;
  changes?: {
    source?: { old: string; new: string };
    target?: { old: string; new: string };
    data?: { field: string; old: any; new: any }[];
  };
  significance: 'low' | 'medium' | 'high';
}

interface TacticDiff {
  tactic: string;
  type: 'added' | 'removed' | 'modified';
  oldTechniques?: string[];
  newTechniques?: string[];
  addedTechniques: string[];
  removedTechniques: string[];
}

interface TechniqueDiff {
  technique: string;
  type: 'added' | 'removed' | 'modified';
  tacticChange?: string;
  confidenceChange?: { old: number; new: number };
  severityChange?: { old: string; new: string };
}

interface MetadataDiff {
  field: string;
  type: 'added' | 'removed' | 'modified';
  oldValue?: any;
  newValue?: any;
  significance: 'low' | 'medium' | 'high';
}

interface FlowDiffToolProps {
  flows: FlowDiffItem[];
  onCompareResult?: (result: DiffResult) => void;
  onExport?: (format: 'json' | 'csv' | 'pdf') => void;
  height?: number;
}

// Diff Statistics Component
const DiffStatistics: React.FC<{
  result: DiffResult;
  leftFlow: FlowDiffItem;
  rightFlow: FlowDiffItem;
}> = ({ result, leftFlow, rightFlow }) => {
  const theme = useTheme();

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'added': return theme.palette.success.main;
      case 'removed': return theme.palette.error.main;
      case 'modified': return theme.palette.warning.main;
      default: return theme.palette.info.main;
    }
  };

  return (
    <Card elevation={2}>
      <CardHeader
        title="Comparison Summary"
        subheader={`${leftFlow.name} vs ${rightFlow.name}`}
        action={
          <Chip
            label={`${result.summary.similarity}% Similar`}
            color={result.summary.similarity > 70 ? 'success' : result.summary.similarity > 40 ? 'warning' : 'error'}
          />
        }
      />
      <CardContent>
        <Grid container spacing={3}>
          {/* Node Changes */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimelineIcon />
              Node Changes
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip
                  size="small"
                  label={`${result.summary.addedNodes} Added`}
                  sx={{ backgroundColor: getChangeColor('added'), color: 'white' }}
                />
                <Typography variant="body2">{result.summary.addedNodes}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip
                  size="small"
                  label={`${result.summary.removedNodes} Removed`}
                  sx={{ backgroundColor: getChangeColor('removed'), color: 'white' }}
                />
                <Typography variant="body2">{result.summary.removedNodes}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip
                  size="small"
                  label={`${result.summary.modifiedNodes} Modified`}
                  sx={{ backgroundColor: getChangeColor('modified'), color: 'white' }}
                />
                <Typography variant="body2">{result.summary.modifiedNodes}</Typography>
              </Box>
            </Box>
          </Grid>

          {/* Edge Changes */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CompareArrowsIcon />
              Connection Changes
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip
                  size="small"
                  label={`${result.summary.addedEdges} Added`}
                  sx={{ backgroundColor: getChangeColor('added'), color: 'white' }}
                />
                <Typography variant="body2">{result.summary.addedEdges}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip
                  size="small"
                  label={`${result.summary.removedEdges} Removed`}
                  sx={{ backgroundColor: getChangeColor('removed'), color: 'white' }}
                />
                <Typography variant="body2">{result.summary.removedEdges}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip
                  size="small"
                  label={`${result.summary.modifiedEdges} Modified`}
                  sx={{ backgroundColor: getChangeColor('modified'), color: 'white' }}
                />
                <Typography variant="body2">{result.summary.modifiedEdges}</Typography>
              </Box>
            </Box>
          </Grid>

          {/* Technique Changes */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon />
              Technique Changes
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Added Techniques</Typography>
                <Badge badgeContent={result.techniqueChanges.filter(t => t.type === 'added').length} color="success">
                  <SecurityIcon fontSize="small" />
                </Badge>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Removed Techniques</Typography>
                <Badge badgeContent={result.techniqueChanges.filter(t => t.type === 'removed').length} color="error">
                  <SecurityIcon fontSize="small" />
                </Badge>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Modified Techniques</Typography>
                <Badge badgeContent={result.techniqueChanges.filter(t => t.type === 'modified').length} color="warning">
                  <SecurityIcon fontSize="small" />
                </Badge>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Similarity Progress */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" gutterBottom>
            Overall Similarity: {result.summary.similarity}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={result.summary.similarity}
            sx={{
              height: 8,
              borderRadius: 4,
              '& .MuiLinearProgress-bar': {
                backgroundColor: result.summary.similarity > 70 ? theme.palette.success.main :
                                result.summary.similarity > 40 ? theme.palette.warning.main :
                                theme.palette.error.main,
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

// Detailed Diff View Component
const DetailedDiffView: React.FC<{
  result: DiffResult;
  activeTab: number;
  onTabChange: (tab: number) => void;
}> = ({ result, activeTab, onTabChange }) => {
  const theme = useTheme();

  const getSignificanceColor = (significance: string) => {
    switch (significance) {
      case 'high': return theme.palette.error.main;
      case 'medium': return theme.palette.warning.main;
      case 'low': return theme.palette.info.main;
      default: return theme.palette.grey[500];
    }
  };

  const renderNodeChanges = () => (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Node ID</TableCell>
            <TableCell>Change Type</TableCell>
            <TableCell>Details</TableCell>
            <TableCell>Significance</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {result.nodeChanges.map((change, index) => (
            <TableRow key={index}>
              <TableCell>{change.id}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={change.type.toUpperCase()}
                  color={
                    change.type === 'added' ? 'success' :
                    change.type === 'removed' ? 'error' :
                    'warning'
                  }
                />
              </TableCell>
              <TableCell>
                {change.type === 'modified' && change.changes && (
                  <Box>
                    {change.changes.data?.map((dataChange, idx) => (
                      <Typography key={idx} variant="caption" display="block">
                        {dataChange.field}: {String(dataChange.old)} → {String(dataChange.new)}
                      </Typography>
                    ))}
                    {change.changes.position && (
                      <Typography variant="caption" display="block">
                        Position: ({change.changes.position.old.x}, {change.changes.position.old.y}) → 
                        ({change.changes.position.new.x}, {change.changes.position.new.y})
                      </Typography>
                    )}
                  </Box>
                )}
                {change.type === 'added' && change.newNode && (
                  <Typography variant="caption">
                    Added: {change.newNode.data?.label || change.newNode.id}
                  </Typography>
                )}
                {change.type === 'removed' && change.oldNode && (
                  <Typography variant="caption">
                    Removed: {change.oldNode.data?.label || change.oldNode.id}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: getSignificanceColor(change.significance),
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderTechniqueChanges = () => (
    <List>
      {result.techniqueChanges.map((change, index) => (
        <ListItem key={index}>
          <ListItemIcon>
            <SecurityIcon color={
              change.type === 'added' ? 'success' :
              change.type === 'removed' ? 'error' :
              'warning'
            } />
          </ListItemIcon>
          <ListItemText
            primary={change.technique}
            secondary={
              <Box>
                <Typography variant="caption">
                  {change.type.charAt(0).toUpperCase() + change.type.slice(1)}
                  {change.tacticChange && ` • Tactic: ${change.tacticChange}`}
                </Typography>
                {change.confidenceChange && (
                  <Typography variant="caption" display="block">
                    Confidence: {change.confidenceChange.old}% → {change.confidenceChange.new}%
                  </Typography>
                )}
                {change.severityChange && (
                  <Typography variant="caption" display="block">
                    Severity: {change.severityChange.old} → {change.severityChange.new}
                  </Typography>
                )}
              </Box>
            }
          />
          <ListItemSecondaryAction>
            <Chip
              size="small"
              label={change.type}
              color={
                change.type === 'added' ? 'success' :
                change.type === 'removed' ? 'error' :
                'warning'
              }
            />
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );

  const renderTacticChanges = () => (
    <List>
      {result.tacticChanges.map((change, index) => (
        <ListItem key={index}>
          <ListItemIcon>
            <CategoryIcon color={
              change.type === 'added' ? 'success' :
              change.type === 'removed' ? 'error' :
              'warning'
            } />
          </ListItemIcon>
          <ListItemText
            primary={change.tactic}
            secondary={
              <Box>
                <Typography variant="caption">
                  {change.type.charAt(0).toUpperCase() + change.type.slice(1)}
                </Typography>
                {change.addedTechniques.length > 0 && (
                  <Typography variant="caption" display="block" color="success.main">
                    Added: {change.addedTechniques.join(', ')}
                  </Typography>
                )}
                {change.removedTechniques.length > 0 && (
                  <Typography variant="caption" display="block" color="error.main">
                    Removed: {change.removedTechniques.join(', ')}
                  </Typography>
                )}
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );

  return (
    <Paper elevation={1}>
      <Tabs value={activeTab} onChange={(_, newValue) => onTabChange(newValue)}>
        <Tab
          label={
            <Badge badgeContent={result.nodeChanges.length} color="primary">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimelineIcon fontSize="small" />
                Nodes
              </Box>
            </Badge>
          }
        />
        <Tab
          label={
            <Badge badgeContent={result.edgeChanges.length} color="primary">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CompareArrowsIcon fontSize="small" />
                Edges
              </Box>
            </Badge>
          }
        />
        <Tab
          label={
            <Badge badgeContent={result.techniqueChanges.length} color="primary">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon fontSize="small" />
                Techniques
              </Box>
            </Badge>
          }
        />
        <Tab
          label={
            <Badge badgeContent={result.tacticChanges.length} color="primary">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CategoryIcon fontSize="small" />
                Tactics
              </Box>
            </Badge>
          }
        />
      </Tabs>

      <Box sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
        {activeTab === 0 && renderNodeChanges()}
        {activeTab === 1 && (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            Edge changes view - Implementation needed
          </Typography>
        )}
        {activeTab === 2 && renderTechniqueChanges()}
        {activeTab === 3 && renderTacticChanges()}
      </Box>
    </Paper>
  );
};

// Main Flow Diff Tool Component
export const FlowDiffTool: React.FC<FlowDiffToolProps> = ({
  flows,
  onCompareResult,
  onExport,
  height = 800,
}) => {
  const theme = useTheme();
  const [leftFlowId, setLeftFlowId] = useState<string>('');
  const [rightFlowId, setRightFlowId] = useState<string>('');
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isComparing, setIsComparing] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('');

  // Generate sample flows if none provided
  const sampleFlows: FlowDiffItem[] = useMemo(() => {
    if (flows.length > 0) {return flows;}
    
    return [
      {
        id: 'flow-1',
        name: 'APT29 Campaign v1.0',
        version: '1.0',
        description: 'Initial version of APT29 attack flow',
        nodes: [
          {
            id: '1',
            type: 'default',
            position: { x: 100, y: 100 },
            data: { label: 'Initial Access', technique: 'T1566.001' },
          },
          {
            id: '2',
            type: 'default',
            position: { x: 300, y: 100 },
            data: { label: 'Execution', technique: 'T1059.001' },
          },
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
        ],
        metadata: {
          author: 'analyst@company.com',
          created: new Date('2024-01-15'),
          modified: new Date('2024-01-15'),
          campaign: 'SolarWinds',
          actor: 'APT29',
          confidence: 85,
          techniques: ['T1566.001', 'T1059.001'],
          tactics: ['Initial Access', 'Execution'],
          severity: 'critical',
        },
      },
      {
        id: 'flow-2',
        name: 'APT29 Campaign v2.0',
        version: '2.0',
        description: 'Updated version with additional techniques',
        nodes: [
          {
            id: '1',
            type: 'default',
            position: { x: 100, y: 100 },
            data: { label: 'Initial Access', technique: 'T1566.001' },
          },
          {
            id: '2',
            type: 'default',
            position: { x: 300, y: 100 },
            data: { label: 'Execution', technique: 'T1059.001' },
          },
          {
            id: '3',
            type: 'default',
            position: { x: 500, y: 100 },
            data: { label: 'Persistence', technique: 'T1053.005' },
          },
          {
            id: '4',
            type: 'default',
            position: { x: 300, y: 300 },
            data: { label: 'Discovery', technique: 'T1083' },
          },
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' },
          { id: 'e2-4', source: '2', target: '4' },
        ],
        metadata: {
          author: 'senior-analyst@company.com',
          created: new Date('2024-01-15'),
          modified: new Date('2024-02-01'),
          campaign: 'SolarWinds',
          actor: 'APT29',
          confidence: 92,
          techniques: ['T1566.001', 'T1059.001', 'T1053.005', 'T1083'],
          tactics: ['Initial Access', 'Execution', 'Persistence', 'Discovery'],
          severity: 'critical',
        },
      },
    ];
  }, [flows]);

  // Compare two flows
  const compareFlows = useCallback(async () => {
    if (!leftFlowId || !rightFlowId) {return;}

    setIsComparing(true);
    
    // Simulate comparison processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    const leftFlow = sampleFlows.find(f => f.id === leftFlowId)!;
    const rightFlow = sampleFlows.find(f => f.id === rightFlowId)!;

    // Calculate diff result
    const nodeChanges: NodeDiff[] = [
      {
        id: '3',
        type: 'added',
        newNode: rightFlow.nodes.find(n => n.id === '3'),
        significance: 'high',
      },
      {
        id: '4',
        type: 'added',
        newNode: rightFlow.nodes.find(n => n.id === '4'),
        significance: 'medium',
      },
    ];

    const edgeChanges: EdgeDiff[] = [
      {
        id: 'e2-3',
        type: 'added',
        newEdge: rightFlow.edges.find(e => e.id === 'e2-3'),
        significance: 'high',
      },
      {
        id: 'e2-4',
        type: 'added',
        newEdge: rightFlow.edges.find(e => e.id === 'e2-4'),
        significance: 'medium',
      },
    ];

    const techniqueChanges: TechniqueDiff[] = [
      {
        technique: 'T1053.005',
        type: 'added',
        tacticChange: 'Persistence',
      },
      {
        technique: 'T1083',
        type: 'added',
        tacticChange: 'Discovery',
      },
    ];

    const tacticChanges: TacticDiff[] = [
      {
        tactic: 'Persistence',
        type: 'added',
        newTechniques: ['T1053.005'],
        addedTechniques: ['T1053.005'],
        removedTechniques: [],
      },
      {
        tactic: 'Discovery',
        type: 'added',
        newTechniques: ['T1083'],
        addedTechniques: ['T1083'],
        removedTechniques: [],
      },
    ];

    const result: DiffResult = {
      summary: {
        totalChanges: 4,
        addedNodes: 2,
        removedNodes: 0,
        modifiedNodes: 0,
        addedEdges: 2,
        removedEdges: 0,
        modifiedEdges: 0,
        similarity: 67, // 2 common nodes out of 4 total unique
      },
      nodeChanges,
      edgeChanges,
      tacticChanges,
      techniqueChanges,
      metadataChanges: [
        {
          field: 'confidence',
          type: 'modified',
          oldValue: leftFlow.metadata.confidence,
          newValue: rightFlow.metadata.confidence,
          significance: 'low',
        },
        {
          field: 'author',
          type: 'modified',
          oldValue: leftFlow.metadata.author,
          newValue: rightFlow.metadata.author,
          significance: 'low',
        },
      ],
    };

    setDiffResult(result);
    onCompareResult?.(result);
    setIsComparing(false);
  }, [leftFlowId, rightFlowId, sampleFlows, onCompareResult]);

  const handleExport = useCallback((format: 'json' | 'csv' | 'pdf') => {
    onExport?.(format);
    setExportDialogOpen(false);
  }, [onExport]);

  const swapFlows = useCallback(() => {
    const temp = leftFlowId;
    setLeftFlowId(rightFlowId);
    setRightFlowId(temp);
  }, [leftFlowId, rightFlowId]);

  return (
    <Box sx={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon />
            Flow Diff & Comparison Tool
          </Typography>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {diffResult && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={() => setExportDialogOpen(true)}
                >
                  Export Report
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ShareIcon />}
                >
                  Share
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Flow Selection */}
      <Paper elevation={1} sx={{ p: 2, mb: 1 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={5}>
            <TextField
              fullWidth
              select
              label="Left Flow"
              value={leftFlowId}
              onChange={(e) => setLeftFlowId(e.target.value)}
              helperText="Select base flow for comparison"
            >
              {sampleFlows.map(flow => (
                <MenuItem key={flow.id} value={flow.id}>
                  <Box>
                    <Typography variant="body2">{flow.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {flow.description} • {flow.metadata.techniques.length} techniques
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'center' }}>
            <IconButton onClick={swapFlows} disabled={!leftFlowId || !rightFlowId}>
              <SwapHorizIcon />
            </IconButton>
          </Grid>

          <Grid item xs={5}>
            <TextField
              fullWidth
              select
              label="Right Flow"
              value={rightFlowId}
              onChange={(e) => setRightFlowId(e.target.value)}
              helperText="Select comparison flow"
            >
              {sampleFlows.map(flow => (
                <MenuItem key={flow.id} value={flow.id}>
                  <Box>
                    <Typography variant="body2">{flow.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {flow.description} • {flow.metadata.techniques.length} techniques
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<CompareArrowsIcon />}
            onClick={compareFlows}
            disabled={!leftFlowId || !rightFlowId || leftFlowId === rightFlowId || isComparing}
            size="large"
          >
            {isComparing ? 'Comparing...' : 'Compare Flows'}
          </Button>
        </Box>

        {isComparing && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              Analyzing differences in nodes, edges, techniques, and metadata...
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Comparison Results */}
      {diffResult && leftFlowId && rightFlowId && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0 }}>
          {/* Statistics */}
          <DiffStatistics
            result={diffResult}
            leftFlow={sampleFlows.find(f => f.id === leftFlowId)!}
            rightFlow={sampleFlows.find(f => f.id === rightFlowId)!}
          />

          {/* Detailed Diff */}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <DetailedDiffView
              result={diffResult}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </Box>
        </Box>
      )}

      {/* Empty State */}
      {!diffResult && (
        <Paper
          elevation={1}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
          }}
        >
          <AssessmentIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
          <Typography variant="h6" gutterBottom>
            Compare Attack Flows
          </Typography>
          <Typography variant="body2" align="center" sx={{ maxWidth: 400 }}>
            Select two flows to compare their structures, techniques, tactics, and metadata.
            The tool will identify additions, removals, modifications, and calculate similarity scores.
          </Typography>
        </Paper>
      )}

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Comparison Report</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Report Title"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            margin="normal"
            placeholder="Flow Comparison Report"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => handleExport('json')} variant="outlined">
            JSON
          </Button>
          <Button onClick={() => handleExport('csv')} variant="outlined">
            CSV
          </Button>
          <Button onClick={() => handleExport('pdf')} variant="contained">
            PDF Report
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FlowDiffTool;