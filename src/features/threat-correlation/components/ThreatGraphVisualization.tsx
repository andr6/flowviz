import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Panel,
  ReactFlowProvider,
} from 'reactflow';
import { Box, Paper, Typography, Chip, Tooltip, IconButton, Stack } from '@mui/material';
import {
  Campaign as CampaignIcon,
  AccountTree,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  FilterList,
} from '@mui/icons-material';
import 'reactflow/dist/style.css';

interface Correlation {
  id: string;
  flow_id_1: string;
  flow_id_2: string;
  correlation_score: number;
  correlation_type: string;
  shared_indicators?: any[];
  shared_ttps?: any[];
}

interface Campaign {
  id: string;
  name: string;
  confidence_score: number;
  related_flows: string[];
  shared_ttps: string[];
  suspected_actor?: string;
}

interface Flow {
  id: string;
  name: string;
  metadata?: any;
}

interface ThreatGraphVisualizationProps {
  flows: Flow[];
  correlations: Correlation[];
  campaigns?: Campaign[];
  onNodeClick?: (node: Node) => void;
  onEdgeClick?: (edge: Edge) => void;
}

const ThreatGraphVisualization: React.FC<ThreatGraphVisualizationProps> = ({
  flows,
  correlations,
  campaigns = [],
  onNodeClick,
  onEdgeClick,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [minCorrelation, setMinCorrelation] = useState(0.6);

  // Build graph from data
  useEffect(() => {
    const graphNodes: Node[] = [];
    const graphEdges: Edge[] = [];

    // Create flow nodes
    flows.forEach((flow, index) => {
      // Check if flow belongs to a campaign
      const flowCampaigns = campaigns.filter((c) => c.related_flows.includes(flow.id));
      const primaryCampaign = flowCampaigns[0];

      graphNodes.push({
        id: flow.id,
        type: 'default',
        position: {
          x: (index % 5) * 250,
          y: Math.floor(index / 5) * 200,
        },
        data: {
          label: (
            <FlowNodeLabel
              flow={flow}
              campaign={primaryCampaign}
              isSelected={selectedNodeId === flow.id}
            />
          ),
        },
        style: {
          background: primaryCampaign ? getCampaignColor(primaryCampaign.id) : '#fff',
          border: selectedNodeId === flow.id ? '3px solid #1976d2' : '2px solid #ccc',
          borderRadius: 8,
          padding: 10,
          minWidth: 200,
        },
      });
    });

    // Create campaign nodes
    campaigns.forEach((campaign, index) => {
      graphNodes.push({
        id: `campaign-${campaign.id}`,
        type: 'default',
        position: {
          x: 600 + index * 300,
          y: 50,
        },
        data: {
          label: <CampaignNodeLabel campaign={campaign} />,
        },
        style: {
          background: getCampaignColor(campaign.id),
          border: '3px solid #000',
          borderRadius: 12,
          padding: 15,
          minWidth: 250,
        },
      });

      // Connect flows to campaigns
      campaign.related_flows.forEach((flowId) => {
        graphEdges.push({
          id: `campaign-edge-${campaign.id}-${flowId}`,
          source: flowId,
          target: `campaign-${campaign.id}`,
          type: 'default',
          animated: true,
          style: {
            stroke: getCampaignColor(campaign.id),
            strokeWidth: 2,
            strokeDasharray: '5,5',
          },
          label: 'Member',
          labelStyle: {
            fill: '#666',
            fontSize: 10,
          },
        });
      });
    });

    // Create correlation edges
    correlations
      .filter((c) => c.correlation_score >= minCorrelation)
      .forEach((correlation) => {
        const edgeColor = getCorrelationColor(correlation.correlation_score);
        const edgeWidth = 1 + correlation.correlation_score * 4;

        graphEdges.push({
          id: correlation.id,
          source: correlation.flow_id_1,
          target: correlation.flow_id_2,
          type: 'default',
          animated: correlation.correlation_score >= 0.8,
          style: {
            stroke: edgeColor,
            strokeWidth: edgeWidth,
          },
          label: (
            <EdgeLabel
              score={correlation.correlation_score}
              type={correlation.correlation_type}
            />
          ),
          labelStyle: {
            fill: edgeColor,
            fontSize: 12,
            fontWeight: 'bold',
          },
          data: correlation,
        });
      });

    setNodes(graphNodes);
    setEdges(graphEdges);
  }, [flows, correlations, campaigns, minCorrelation, selectedNodeId]);

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
      if (onNodeClick) {
        onNodeClick(node);
      }
    },
    [onNodeClick]
  );

  const handleEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (onEdgeClick) {
        onEdgeClick(edge);
      }
    },
    [onEdgeClick]
  );

  return (
    <Paper
      elevation={3}
      sx={{
        height: '100%',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        connectionMode={ConnectionMode.Loose}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.id.startsWith('campaign-')) return '#ff6b6b';
            return '#1976d2';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
        <Panel position="top-right">
          <GraphStats
            flows={flows}
            correlations={correlations.filter((c) => c.correlation_score >= minCorrelation)}
            campaigns={campaigns}
          />
        </Panel>
        <Panel position="top-left">
          <GraphLegend />
        </Panel>
      </ReactFlow>
    </Paper>
  );
};

// Flow node label component
const FlowNodeLabel: React.FC<{
  flow: Flow;
  campaign?: Campaign;
  isSelected: boolean;
}> = ({ flow, campaign, isSelected }) => (
  <Box>
    <Typography
      variant="subtitle2"
      sx={{
        fontWeight: isSelected ? 'bold' : 'normal',
        mb: 0.5,
      }}
    >
      {flow.name || 'Unnamed Flow'}
    </Typography>
    {campaign && (
      <Chip
        label={campaign.name}
        size="small"
        icon={<CampaignIcon />}
        sx={{ fontSize: 10, height: 20 }}
      />
    )}
  </Box>
);

// Campaign node label component
const CampaignNodeLabel: React.FC<{ campaign: Campaign }> = ({ campaign }) => (
  <Box>
    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
      <CampaignIcon />
      <Typography variant="subtitle1" fontWeight="bold">
        {campaign.name}
      </Typography>
    </Stack>
    <Typography variant="caption" display="block">
      Confidence: {(campaign.confidence_score * 100).toFixed(0)}%
    </Typography>
    <Typography variant="caption" display="block">
      Flows: {campaign.related_flows.length}
    </Typography>
    {campaign.suspected_actor && (
      <Chip
        label={campaign.suspected_actor}
        size="small"
        color="error"
        sx={{ mt: 1, fontSize: 10 }}
      />
    )}
  </Box>
);

// Edge label component
const EdgeLabel: React.FC<{ score: number; type: string }> = ({ score, type }) => (
  <Box
    component="span"
    sx={{
      background: 'white',
      padding: '2px 6px',
      borderRadius: 1,
      fontSize: 11,
      border: '1px solid #ccc',
    }}
  >
    {(score * 100).toFixed(0)}%
  </Box>
);

// Graph statistics panel
const GraphStats: React.FC<{
  flows: Flow[];
  correlations: Correlation[];
  campaigns: Campaign[];
}> = ({ flows, correlations, campaigns }) => (
  <Paper
    elevation={2}
    sx={{
      p: 2,
      background: 'rgba(255, 255, 255, 0.95)',
      minWidth: 200,
    }}
  >
    <Typography variant="subtitle2" fontWeight="bold" mb={1}>
      Graph Statistics
    </Typography>
    <Stack spacing={0.5}>
      <Typography variant="body2">Flows: {flows.length}</Typography>
      <Typography variant="body2">Correlations: {correlations.length}</Typography>
      <Typography variant="body2">Campaigns: {campaigns.length}</Typography>
      <Typography variant="body2">
        Avg Correlation:{' '}
        {correlations.length > 0
          ? (
              correlations.reduce((sum, c) => sum + c.correlation_score, 0) /
              correlations.length *
              100
            ).toFixed(0)
          : 0}
        %
      </Typography>
    </Stack>
  </Paper>
);

// Graph legend
const GraphLegend: React.FC = () => (
  <Paper
    elevation={2}
    sx={{
      p: 2,
      background: 'rgba(255, 255, 255, 0.95)',
      minWidth: 200,
    }}
  >
    <Typography variant="subtitle2" fontWeight="bold" mb={1}>
      Legend
    </Typography>
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          sx={{
            width: 20,
            height: 20,
            border: '2px solid #1976d2',
            borderRadius: 1,
            background: '#fff',
          }}
        />
        <Typography variant="caption">Flow</Typography>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          sx={{
            width: 20,
            height: 20,
            border: '3px solid #000',
            borderRadius: 1,
            background: '#ff6b6b',
          }}
        />
        <Typography variant="caption">Campaign</Typography>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          sx={{
            width: 40,
            height: 3,
            background: 'linear-gradient(to right, #4caf50, #ff9800, #f44336)',
          }}
        />
        <Typography variant="caption">Correlation (Low → High)</Typography>
      </Stack>
    </Stack>
  </Paper>
);

// Helper function to get correlation color
const getCorrelationColor = (score: number): string => {
  if (score >= 0.8) return '#4caf50'; // Green - high correlation
  if (score >= 0.7) return '#8bc34a'; // Light green
  if (score >= 0.6) return '#ff9800'; // Orange - medium correlation
  return '#f44336'; // Red - low correlation
};

// Helper function to get campaign color
const getCampaignColor = (campaignId: string): string => {
  // Generate consistent color based on campaign ID
  const colors = [
    '#ffebee',
    '#e3f2fd',
    '#f3e5f5',
    '#e8f5e9',
    '#fff3e0',
    '#fce4ec',
    '#e0f2f1',
    '#f1f8e9',
  ];
  const hash = campaignId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// Wrapper with provider
const ThreatGraphVisualizationWrapper: React.FC<ThreatGraphVisualizationProps> = (props) => (
  <ReactFlowProvider>
    <ThreatGraphVisualization {...props} />
  </ReactFlowProvider>
);

export default ThreatGraphVisualizationWrapper;
