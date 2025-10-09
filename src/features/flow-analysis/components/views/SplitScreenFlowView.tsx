/**
 * Split-Screen Flow Comparison Component
 * Enables side-by-side comparison of multiple attack flows
 */
import {
  CompareArrows as CompareArrowsIcon,
  SwapHoriz as SwapHorizIcon,
  CenterFocusStrong as CenterFocusStrongIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Card,
  CardContent,
  Chip,
  Button,
  Menu,
  MenuItem,
  Tooltip,
  Switch,
  FormControlLabel,
  LinearProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
  BackgroundVariant,
} from 'reactflow';

// Types for split-screen comparison
interface FlowComparison {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  metadata: {
    author?: string;
    created: Date;
    campaign?: string;
    actor?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    techniques: number;
    tactics: number;
    confidence: number;
  };
}

interface ComparisonResult {
  uniqueToLeft: string[];
  uniqueToRight: string[];
  common: string[];
  similarities: number;
  differences: number[];
  techniqueCoverage: {
    left: string[];
    right: string[];
    overlap: string[];
  };
}

interface SplitScreenSettings {
  syncPanning: boolean;
  syncZooming: boolean;
  highlightDifferences: boolean;
  showCommonNodes: boolean;
  animateTransitions: boolean;
  autoLayout: boolean;
}

interface SplitScreenFlowViewProps {
  flows: FlowComparison[];
  onFlowSelect?: (flowId: string, position: 'left' | 'right') => void;
  onComparisonResult?: (result: ComparisonResult) => void;
  height?: number;
}

// Individual Flow Panel Component
const FlowPanel: React.FC<{
  flow: FlowComparison | null;
  position: 'left' | 'right';
  onFlowChange: (flowId: string) => void;
  availableFlows: FlowComparison[];
  settings: SplitScreenSettings;
  comparisonResult?: ComparisonResult;
}> = ({ flow, position, onFlowChange, availableFlows, settings, comparisonResult }) => {
  const theme = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState(flow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flow?.edges || []);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const reactFlowInstance = useRef<any>(null);

  // Apply comparison highlighting to nodes
  const processedNodes = useMemo(() => {
    if (!flow || !comparisonResult || !settings.highlightDifferences) {
      return nodes;
    }

    return nodes.map(node => {
      const technique = node.data?.technique || node.id;
      let style = { ...node.style };

      if (comparisonResult.common.includes(technique)) {
        // Common nodes - green border
        style = {
          ...style,
          border: '3px solid #4caf50',
          backgroundColor: settings.showCommonNodes ? '#e8f5e8' : style.backgroundColor,
        };
      } else if (position === 'left' && comparisonResult.uniqueToLeft.includes(technique)) {
        // Unique to left - blue border
        style = {
          ...style,
          border: '3px solid #2196f3',
          backgroundColor: '#e3f2fd',
        };
      } else if (position === 'right' && comparisonResult.uniqueToRight.includes(technique)) {
        // Unique to right - orange border
        style = {
          ...style,
          border: '3px solid #ff9800',
          backgroundColor: '#fff3e0',
        };
      }

      return { ...node, style };
    });
  }, [nodes, comparisonResult, settings.highlightDifferences, settings.showCommonNodes, position, flow]);

  const handleFlowSelect = (flowId: string) => {
    onFlowChange(flowId);
    setMenuAnchor(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return theme.palette.error.main;
      case 'high': return theme.palette.warning.main;
      case 'medium': return theme.palette.info.main;
      case 'low': return theme.palette.success.main;
      default: return theme.palette.grey[500];
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Flow Header */}
      <Card elevation={1} sx={{ mb: 1 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ flex: 1 }}>
              {flow ? (
                <>
                  <Typography variant="h6" noWrap>
                    {flow.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                    <Chip
                      size="small"
                      label={flow.metadata.severity.toUpperCase()}
                      sx={{
                        backgroundColor: getSeverityColor(flow.metadata.severity),
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    />
                    <Chip
                      size="small"
                      label={`${flow.metadata.techniques} Techniques`}
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={`${flow.metadata.tactics} Tactics`}
                      variant="outlined"
                    />
                    {flow.metadata.confidence && (
                      <Chip
                        size="small"
                        label={`${flow.metadata.confidence}% Confidence`}
                        color={flow.metadata.confidence > 80 ? 'success' : 
                               flow.metadata.confidence > 60 ? 'warning' : 'error'}
                        variant="outlined"
                      />
                    )}
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No flow selected
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Select Flow">
                <IconButton
                  size="small"
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
              
              {flow && (
                <>
                  <Tooltip title="Center View">
                    <IconButton size="small">
                      <CenterFocusStrongIcon />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="More Options">
                    <IconButton size="small">
                      <MoreVertIcon />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          </Box>

          {/* Comparison Stats */}
          {comparisonResult && position === 'left' && (
            <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip
                  icon={<CompareArrowsIcon />}
                  label={`${comparisonResult.similarities}% Match`}
                  size="small"
                  color="primary"
                />
                <Chip
                  label={`${comparisonResult.common.length} Common`}
                  size="small"
                  color="success"
                />
                <Chip
                  label={`${comparisonResult.uniqueToLeft.length} Unique Left`}
                  size="small"
                  color="info"
                />
                <Chip
                  label={`${comparisonResult.uniqueToRight.length} Unique Right`}
                  size="small"
                  color="warning"
                />
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Flow Visualization */}
      <Paper
        elevation={1}
        sx={{
          flex: 1,
          overflow: 'hidden',
          backgroundColor: theme.palette.background.default,
        }}
      >
        {flow ? (
          <ReactFlow
            nodes={processedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onInit={(instance) => { reactFlowInstance.current = instance; }}
            fitView
            attributionPosition="bottom-left"
            defaultEdgeOptions={{
              animated: settings.animateTransitions,
              markerEnd: { type: MarkerType.Arrow },
            }}
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={12} 
              size={1}
              color={theme.palette.mode === 'dark' ? '#333' : '#ccc'}
            />
            <Controls position="bottom-right" />
          </ReactFlow>
        ) : (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <TimelineIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
            <Typography variant="h6" gutterBottom>
              Select a Flow
            </Typography>
            <Typography variant="body2">
              Choose a flow to display in the {position} panel
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ mt: 2 }}
            >
              Select Flow
            </Button>
          </Box>
        )}
      </Paper>

      {/* Flow Selection Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{ sx: { minWidth: 300, maxHeight: 400 } }}
      >
        {availableFlows.map((availableFlow) => (
          <MenuItem
            key={availableFlow.id}
            onClick={() => handleFlowSelect(availableFlow.id)}
            selected={flow?.id === availableFlow.id}
          >
            <Box sx={{ width: '100%' }}>
              <Typography variant="subtitle2" noWrap>
                {availableFlow.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {availableFlow.metadata.techniques} techniques • {availableFlow.metadata.actor || 'Unknown actor'}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

// Main Split-Screen Flow View Component
export const SplitScreenFlowView: React.FC<SplitScreenFlowViewProps> = ({
  flows,
  onFlowSelect,
  onComparisonResult,
  height = 800,
}) => {
  const theme = useTheme();
  const [leftFlowId, setLeftFlowId] = useState<string | null>(null);
  const [rightFlowId, setRightFlowId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SplitScreenSettings>({
    syncPanning: false,
    syncZooming: false,
    highlightDifferences: true,
    showCommonNodes: true,
    animateTransitions: true,
    autoLayout: true,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const leftFlow = useMemo(() => flows.find(f => f.id === leftFlowId) || null, [flows, leftFlowId]);
  const rightFlow = useMemo(() => flows.find(f => f.id === rightFlowId) || null, [flows, rightFlowId]);

  // Calculate comparison result
  const comparisonResult = useMemo(() => {
    if (!leftFlow || !rightFlow) {return null;}

    const leftTechniques = leftFlow.nodes.map(n => n.data?.technique || n.id);
    const rightTechniques = rightFlow.nodes.map(n => n.data?.technique || n.id);
    
    const common = leftTechniques.filter(t => rightTechniques.includes(t));
    const uniqueToLeft = leftTechniques.filter(t => !rightTechniques.includes(t));
    const uniqueToRight = rightTechniques.filter(t => !leftTechniques.includes(t));
    
    const totalUnique = leftTechniques.length + rightTechniques.length;
    const similarities = totalUnique > 0 ? Math.round((common.length * 2 / totalUnique) * 100) : 0;

    const result: ComparisonResult = {
      uniqueToLeft,
      uniqueToRight,
      common,
      similarities,
      differences: [uniqueToLeft.length, uniqueToRight.length],
      techniqueCoverage: {
        left: leftTechniques,
        right: rightTechniques,
        overlap: common,
      },
    };

    // Notify parent component
    onComparisonResult?.(result);

    return result;
  }, [leftFlow, rightFlow, onComparisonResult]);

  const handleFlowChange = useCallback((flowId: string, position: 'left' | 'right') => {
    if (position === 'left') {
      setLeftFlowId(flowId);
    } else {
      setRightFlowId(flowId);
    }
    onFlowSelect?.(flowId, position);
  }, [onFlowSelect]);

  const handleSwapFlows = () => {
    const temp = leftFlowId;
    setLeftFlowId(rightFlowId);
    setRightFlowId(temp);
  };

  const runAnalysis = async () => {
    if (!leftFlow || !rightFlow) {return;}
    
    setIsAnalyzing(true);
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsAnalyzing(false);
  };

  return (
    <Box sx={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Split-Screen Flow Comparison
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Compare multiple attack flows side-by-side to identify patterns and differences
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {leftFlow && rightFlow && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<AssessmentIcon />}
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Deep Analysis'}
                </Button>
                
                <Tooltip title="Swap Flows">
                  <IconButton onClick={handleSwapFlows}>
                    <SwapHorizIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={settings.highlightDifferences}
                  onChange={(e) => setSettings(prev => ({ ...prev, highlightDifferences: e.target.checked }))}
                  size="small"
                />
              }
              label="Highlight Differences"
            />
          </Box>
        </Box>

        {/* Analysis Progress */}
        {isAnalyzing && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Analyzing flow patterns, technique overlap, and tactical differences...
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Split Screen Container */}
      <Box sx={{ flex: 1, display: 'flex', gap: 1, minHeight: 0 }}>
        {/* Left Panel */}
        <Box sx={{ flex: 1 }}>
          <FlowPanel
            flow={leftFlow}
            position="left"
            onFlowChange={(flowId) => handleFlowChange(flowId, 'left')}
            availableFlows={flows}
            settings={settings}
            comparisonResult={comparisonResult}
          />
        </Box>

        {/* Center Divider */}
        <Box
          sx={{
            width: 4,
            backgroundColor: 'divider',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Paper
            elevation={2}
            sx={{
              p: 1,
              backgroundColor: 'background.paper',
              borderRadius: '50%',
            }}
          >
            <CompareArrowsIcon color="primary" />
          </Paper>
        </Box>

        {/* Right Panel */}
        <Box sx={{ flex: 1 }}>
          <FlowPanel
            flow={rightFlow}
            position="right"
            onFlowChange={(flowId) => handleFlowChange(flowId, 'right')}
            availableFlows={flows}
            settings={settings}
            comparisonResult={comparisonResult}
          />
        </Box>
      </Box>

      {/* Comparison Results */}
      {comparisonResult && leftFlow && rightFlow && (
        <Paper elevation={1} sx={{ p: 2, mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Comparison Results
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Chip
                  icon={<CompareArrowsIcon />}
                  label={`${comparisonResult.similarities}% Similarity`}
                  color="primary"
                />
                <Typography variant="body2" color="text.secondary">
                  {comparisonResult.common.length} shared techniques out of{' '}
                  {comparisonResult.techniqueCoverage.left.length + comparisonResult.techniqueCoverage.right.length - comparisonResult.common.length} total
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={`${comparisonResult.uniqueToLeft.length} unique to left`}
                size="small"
                color="info"
              />
              <Chip
                label={`${comparisonResult.common.length} common`}
                size="small"
                color="success"
              />
              <Chip
                label={`${comparisonResult.uniqueToRight.length} unique to right`}
                size="small"
                color="warning"
              />
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default SplitScreenFlowView;