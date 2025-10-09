import {
  Share,
  FilterList,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Timeline,
  AccountTree,
  Security,
  Warning,
  Info,
  ExpandMore,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Badge,
  Paper,
  LinearProgress,
} from '@mui/material';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useThemeContext } from '../../../shared/context/ThemeProvider';
import { IOC, IOCIOARelationship, RelationshipType } from '../types/IOC';
import { IOCRelationship, EnrichmentResult, ThreatLevel } from '../../ioc-enrichment/types/EnrichmentTypes';

interface IOCRelationshipGraphProps {
  iocs: IOC[];
  relationships: (IOCIOARelationship | IOCRelationship)[];
  enrichmentResults?: Record<string, EnrichmentResult[]>;
  selectedIOC?: string;
  onIOCSelect?: (iocId: string) => void;
  onRelationshipSelect?: (relationship: IOCIOARelationship | IOCRelationship) => void;
  height?: number;
  showMiniMap?: boolean;
  showControls?: boolean;
  interactive?: boolean;
}

interface GraphNode extends Node {
  data: {
    ioc: IOC;
    threatLevel?: ThreatLevel;
    confidence?: number;
    enrichmentCount?: number;
    relationshipCount: number;
    isSelected: boolean;
    riskScore: number;
  };
}

interface GraphEdge extends Edge {
  data: {
    relationship: IOCIOARelationship | IOCRelationship;
    strength: number;
    isBidirectional: boolean;
  };
}

const nodeTypes = {
  ioc: IOCNode,
};

const relationshipColors = {
  'uses': '#3b82f6',
  'indicates': '#ef4444',
  'communicates-with': '#10b981',
  'downloads-from': '#f59e0b',
  'creates': '#8b5cf6',
  'modifies': '#f97316',
  'deletes': '#dc2626',
  'executes': '#6366f1',
  'connects-to': '#06b6d4',
  'related-to': '#64748b',
  'part-of': '#84cc16',
  'derived-from': '#ec4899',
  // IOC enrichment relationship types
  'communicates_with': '#10b981',
  'downloads_from': '#f59e0b',
  'resolves_to': '#06b6d4',
  'drops': '#8b5cf6',
  'contacts': '#3b82f6',
  'hosted_on': '#f97316',
  'similar_to': '#64748b',
  'part_of_campaign': '#84cc16',
  'attributed_to': '#ec4899',
  'uses_infrastructure': '#6366f1',
} as const;

const threatLevelColors = {
  benign: '#10b981',
  suspicious: '#f59e0b',
  malicious: '#ef4444',
  critical: '#dc2626',
  unknown: '#64748b',
} as const;

function IOCNode({ data, selected }: { data: GraphNode['data']; selected: boolean }) {
  const { theme } = useThemeContext();
  const { ioc, threatLevel, confidence, enrichmentCount, relationshipCount, riskScore } = data;
  
  const nodeColor = threatLevel ? threatLevelColors[threatLevel] : theme.colors.surface.border.default;
  const textColor = selected ? theme.colors.text.inverse : theme.colors.text.primary;
  const bgColor = selected ? nodeColor : theme.colors.background.primary;
  
  return (
    <Card
      sx={{
        minWidth: 200,
        maxWidth: 300,
        border: `2px solid ${selected ? nodeColor : theme.colors.surface.border.default}`,
        borderRadius: theme.borderRadius.md,
        backgroundColor: bgColor,
        color: textColor,
        cursor: 'pointer',
        transition: theme.motion.normal,
        boxShadow: selected ? theme.colors.effects.shadows.lg : theme.colors.effects.shadows.sm,
        '&:hover': {
          boxShadow: theme.colors.effects.shadows.md,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: nodeColor,
              border: `1px solid ${theme.colors.surface.border.default}`,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.medium,
              color: selected ? theme.colors.text.inverse : theme.colors.text.secondary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {ioc.type.replace('_', ' ')}
          </Typography>
          {threatLevel && (
            <Chip
              label={threatLevel}
              size="small"
              sx={{
                height: 16,
                fontSize: theme.typography.fontSize.xs,
                backgroundColor: `${nodeColor}20`,
                color: nodeColor,
                border: `1px solid ${nodeColor}40`,
              }}
            />
          )}
        </Box>
        
        <Typography
          variant="body2"
          sx={{
            fontWeight: theme.typography.fontWeight.semibold,
            color: textColor,
            fontSize: theme.typography.fontSize.sm,
            wordBreak: 'break-all',
            mb: 1.5,
          }}
        >
          {ioc.value.length > 40 ? `${ioc.value.substring(0, 40)}...` : ioc.value}
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Security fontSize="small" sx={{ color: selected ? theme.colors.text.inverse : theme.colors.text.tertiary }} />
            <Typography variant="caption" sx={{ color: selected ? theme.colors.text.inverse : theme.colors.text.tertiary }}>
              {confidence ? `${confidence}%` : 'Unknown'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccountTree fontSize="small" sx={{ color: selected ? theme.colors.text.inverse : theme.colors.text.tertiary }} />
            <Typography variant="caption" sx={{ color: selected ? theme.colors.text.inverse : theme.colors.text.tertiary }}>
              {relationshipCount}
            </Typography>
          </Box>
        </Box>
        
        {enrichmentCount !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <Info fontSize="small" sx={{ color: selected ? theme.colors.text.inverse : theme.colors.text.tertiary }} />
            <Typography variant="caption" sx={{ color: selected ? theme.colors.text.inverse : theme.colors.text.tertiary }}>
              {enrichmentCount} sources
            </Typography>
          </Box>
        )}
        
        {riskScore > 0 && (
          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontSize: theme.typography.fontSize.xs,
                  color: selected ? theme.colors.text.inverse : theme.colors.text.tertiary,
                }}
              >
                Risk Score
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: selected ? theme.colors.text.inverse : theme.colors.text.primary,
                }}
              >
                {riskScore}/100
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={riskScore}
              sx={{
                height: 4,
                borderRadius: 2,
                backgroundColor: selected ? `${theme.colors.text.inverse}20` : theme.colors.surface.border.subtle,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: selected ? theme.colors.text.inverse : nodeColor,
                  borderRadius: 2,
                },
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

const IOCRelationshipGraphContent: React.FC<IOCRelationshipGraphProps> = ({
  iocs,
  relationships,
  enrichmentResults = {},
  selectedIOC,
  onIOCSelect,
  onRelationshipSelect,
  height = 600,
  showMiniMap = true,
  showControls = true,
  interactive = true,
}) => {
  const { theme } = useThemeContext();
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Filter states
  const [threatLevelFilter, setThreatLevelFilter] = useState<ThreatLevel[]>([]);
  const [relationshipTypeFilter, setRelationshipTypeFilter] = useState<RelationshipType[]>([]);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0);
  const [showLabels, setShowLabels] = useState(true);
  const [layoutType, setLayoutType] = useState<'force' | 'hierarchical' | 'circular'>('force');
  
  // Graph processing
  const processedData = useMemo(() => {
    // Calculate relationship counts for each IOC
    const relationshipCounts = iocs.reduce((acc, ioc) => {
      const count = relationships.filter(rel => 
        ('sourceId' in rel ? rel.sourceId === ioc.id || rel.targetId === ioc.id : 
         rel.sourceIOC === ioc.id || rel.targetIOC === ioc.id)
      ).length;
      acc[ioc.id] = count;
      return acc;
    }, {} as Record<string, number>);
    
    // Create nodes
    const graphNodes: GraphNode[] = iocs.map(ioc => {
      const enrichments = enrichmentResults[ioc.id] || [];
      const threatLevels = enrichments.map(e => e.data.threatLevel).filter(Boolean);
      const confidences = enrichments.map(e => e.data.confidence);
      
      // Determine primary threat level
      const threatLevel = threatLevels.find(tl => tl === 'critical') ||
                         threatLevels.find(tl => tl === 'malicious') ||
                         threatLevels.find(tl => tl === 'suspicious') ||
                         threatLevels[0] || 'unknown';
      
      // Calculate average confidence
      const avgConfidence = confidences.length > 0
        ? confidences.reduce((sum, conf) => {
            const confMap = { low: 25, medium: 50, high: 75, verified: 95 };
            return sum + (confMap[conf] || 0);
          }, 0) / confidences.length
        : 0;
      
      // Calculate risk score
      const riskScore = calculateRiskScore(threatLevel, avgConfidence, relationshipCounts[ioc.id]);
      
      return {
        id: ioc.id,
        type: 'ioc',
        position: { x: 0, y: 0 }, // Will be positioned by layout algorithm
        data: {
          ioc,
          threatLevel,
          confidence: Math.round(avgConfidence),
          enrichmentCount: enrichments.length,
          relationshipCount: relationshipCounts[ioc.id],
          isSelected: selectedIOC === ioc.id,
          riskScore,
        },
        draggable: interactive,
        selectable: interactive,
      };
    });
    
    // Create edges
    const graphEdges: GraphEdge[] = relationships.map(rel => {
      const sourceId = 'sourceId' in rel ? rel.sourceId : rel.sourceIOC;
      const targetId = 'targetId' in rel ? rel.targetId : rel.targetIOC;
      const relType = 'relationshipType' in rel ? rel.relationshipType : rel.relationType;
      
      // Calculate edge strength based on confidence
      const confidence = 'confidence' in rel 
        ? (typeof rel.confidence === 'number' ? rel.confidence : 
           rel.confidence === 'high' ? 0.8 : rel.confidence === 'medium' ? 0.6 : 0.4)
        : 0.5;
      
      const color = relationshipColors[relType as keyof typeof relationshipColors] || theme.colors.surface.border.default;
      
      return {
        id: `${sourceId}-${targetId}-${relType}`,
        source: sourceId,
        target: targetId,
        type: 'default',
        animated: confidence > 0.7,
        style: {
          stroke: color,
          strokeWidth: Math.max(1, confidence * 4),
          opacity: Math.max(0.4, confidence),
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
          width: 20,
          height: 20,
        },
        label: showLabels ? relType.replace(/_/g, ' ') : undefined,
        labelStyle: {
          fontSize: 11,
          fontWeight: 500,
          fill: theme.colors.text.secondary,
        },
        labelBgStyle: {
          fill: theme.colors.background.primary,
          fillOpacity: 0.8,
        },
        data: {
          relationship: rel,
          strength: confidence,
          isBidirectional: false, // Could be enhanced based on relationship data
        },
      };
    });
    
    return { nodes: graphNodes, edges: graphEdges };
  }, [iocs, relationships, enrichmentResults, selectedIOC, showLabels, theme]);
  
  // Apply filters
  const filteredData = useMemo(() => {
    let filteredNodes = processedData.nodes;
    let filteredEdges = processedData.edges;
    
    // Filter by threat level
    if (threatLevelFilter.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        !node.data.threatLevel || threatLevelFilter.includes(node.data.threatLevel)
      );
    }
    
    // Filter by confidence threshold
    if (confidenceThreshold > 0) {
      filteredNodes = filteredNodes.filter(node => 
        (node.data.confidence || 0) >= confidenceThreshold
      );
    }
    
    // Filter by relationship type
    if (relationshipTypeFilter.length > 0) {
      filteredEdges = filteredEdges.filter(edge => {
        const relType = 'relationshipType' in edge.data.relationship 
          ? edge.data.relationship.relationshipType 
          : edge.data.relationship.relationType;
        return relationshipTypeFilter.includes(relType);
      });
    }
    
    // Remove nodes that don't have any connections after edge filtering
    const connectedNodeIds = new Set([
      ...filteredEdges.map(e => e.source),
      ...filteredEdges.map(e => e.target),
    ]);
    
    if (filteredEdges.length < processedData.edges.length) {
      filteredNodes = filteredNodes.filter(node => connectedNodeIds.has(node.id));
    }
    
    return { nodes: filteredNodes, edges: filteredEdges };
  }, [processedData, threatLevelFilter, confidenceThreshold, relationshipTypeFilter]);
  
  // Layout algorithm
  useEffect(() => {
    if (filteredData.nodes.length === 0) return;
    
    const layoutedNodes = applyLayout(filteredData.nodes, filteredData.edges, layoutType);
    setNodes(layoutedNodes);
    setEdges(filteredData.edges);
  }, [filteredData, layoutType, setNodes, setEdges]);
  
  // Handle node clicks
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (onIOCSelect && interactive) {
      onIOCSelect(node.id);
    }
  }, [onIOCSelect, interactive]);
  
  // Handle edge clicks
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    if (onRelationshipSelect && interactive) {
      const graphEdge = edge as GraphEdge;
      onRelationshipSelect(graphEdge.data.relationship);
    }
  }, [onRelationshipSelect, interactive]);
  
  // Controls
  const handleFitView = () => {
    reactFlowInstance.fitView({ padding: 0.1 });
  };
  
  const handleZoomIn = () => {
    reactFlowInstance.zoomIn();
  };
  
  const handleZoomOut = () => {
    reactFlowInstance.zoomOut();
  };
  
  const resetFilters = () => {
    setThreatLevelFilter([]);
    setRelationshipTypeFilter([]);
    setConfidenceThreshold(0);
  };
  
  return (
    <Box sx={{ height, position: 'relative', border: `1px solid ${theme.colors.surface.border.default}`, borderRadius: theme.borderRadius.md }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        attributionPosition="bottom-left"
        maxZoom={2}
        minZoom={0.1}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        style={{
          backgroundColor: theme.colors.background.secondary,
        }}
      >
        <Background 
          color={theme.colors.surface.border.subtle} 
          gap={20} 
        />
        
        {showControls && (
          <Controls
            style={{
              button: {
                backgroundColor: theme.colors.background.primary,
                border: `1px solid ${theme.colors.surface.border.default}`,
                color: theme.colors.text.primary,
              },
            }}
          />
        )}
        
        {showMiniMap && (
          <MiniMap
            style={{
              backgroundColor: theme.colors.background.primary,
              border: `1px solid ${theme.colors.surface.border.default}`,
            }}
            maskColor={`${theme.colors.background.primary}80`}
            nodeColor={(node) => {
              const graphNode = node as GraphNode;
              const threatLevel = graphNode.data.threatLevel;
              return threatLevel ? threatLevelColors[threatLevel] : theme.colors.surface.border.default;
            }}
          />
        )}
        
        {/* Control Panel */}
        <Panel position="top-right" style={{ width: 300, maxHeight: height - 100, overflow: 'auto' }}>
          <Paper sx={{ p: 2, backgroundColor: theme.colors.background.primary, border: `1px solid ${theme.colors.surface.border.default}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold }}>
                Graph Controls
              </Typography>
              <Box>
                <Tooltip title="Fit to view">
                  <IconButton size="small" onClick={handleFitView}>
                    <CenterFocusStrong />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Zoom in">
                  <IconButton size="small" onClick={handleZoomIn}>
                    <ZoomIn />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Zoom out">
                  <IconButton size="small" onClick={handleZoomOut}>
                    <ZoomOut />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="body2" sx={{ fontWeight: theme.typography.fontWeight.medium }}>
                  Layout & Display
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Layout Type</InputLabel>
                  <Select
                    value={layoutType}
                    onChange={(e) => setLayoutType(e.target.value as any)}
                    label="Layout Type"
                  >
                    <MenuItem value="force">Force-directed</MenuItem>
                    <MenuItem value="hierarchical">Hierarchical</MenuItem>
                    <MenuItem value="circular">Circular</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={showLabels}
                      onChange={(e) => setShowLabels(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Show edge labels"
                  sx={{ mb: 1 }}
                />
              </AccordionDetails>
            </Accordion>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Typography variant="body2" sx={{ fontWeight: theme.typography.fontWeight.medium }}>
                    Filters
                  </Typography>
                  <Badge 
                    badgeContent={threatLevelFilter.length + relationshipTypeFilter.length + (confidenceThreshold > 0 ? 1 : 0)} 
                    color="primary" 
                    sx={{ mr: 2 }}
                  >
                    <FilterList fontSize="small" />
                  </Badge>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Threat Levels</InputLabel>
                  <Select
                    multiple
                    value={threatLevelFilter}
                    onChange={(e) => setThreatLevelFilter(e.target.value as ThreatLevel[])}
                    label="Threat Levels"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={value}
                            size="small"
                            sx={{
                              backgroundColor: `${threatLevelColors[value]}20`,
                              color: threatLevelColors[value],
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {Object.keys(threatLevelColors).map((level) => (
                      <MenuItem key={level} value={level}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: threatLevelColors[level as ThreatLevel],
                            }}
                          />
                          {level}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Typography variant="body2" sx={{ mb: 1, fontWeight: theme.typography.fontWeight.medium }}>
                  Confidence Threshold: {confidenceThreshold}%
                </Typography>
                <Slider
                  value={confidenceThreshold}
                  onChange={(_, value) => setConfidenceThreshold(value as number)}
                  min={0}
                  max={100}
                  step={5}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 50, label: '50%' },
                    { value: 100, label: '100%' },
                  ]}
                  sx={{ mb: 2 }}
                />
                
                <Typography variant="body2" sx={{ mb: 1, fontWeight: theme.typography.fontWeight.medium, color: theme.colors.text.secondary }}>
                  Active filters reset on graph update
                </Typography>
              </AccordionDetails>
            </Accordion>
            
            {/* Graph Statistics */}
            <Box sx={{ mt: 2, p: 1.5, backgroundColor: theme.colors.background.secondary, borderRadius: theme.borderRadius.sm }}>
              <Typography variant="body2" sx={{ fontWeight: theme.typography.fontWeight.medium, mb: 1 }}>
                Graph Statistics
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, fontSize: theme.typography.fontSize.xs }}>
                <Box>
                  <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>Nodes:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: theme.typography.fontWeight.semibold, ml: 1 }}>
                    {nodes.length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>Edges:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: theme.typography.fontWeight.semibold, ml: 1 }}>
                    {edges.length}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Panel>
      </ReactFlow>
    </Box>
  );
};

export const IOCRelationshipGraph: React.FC<IOCRelationshipGraphProps> = (props) => {
  return (
    <ReactFlowProvider>
      <IOCRelationshipGraphContent {...props} />
    </ReactFlowProvider>
  );
};

// Helper functions
function calculateRiskScore(threatLevel: ThreatLevel, confidence: number, relationshipCount: number): number {
  const threatScores = {
    critical: 90,
    malicious: 75,
    suspicious: 50,
    benign: 10,
    unknown: 30,
  };
  
  const baseScore = threatScores[threatLevel];
  const confidenceBonus = confidence * 0.2;
  const relationshipBonus = Math.min(20, relationshipCount * 2);
  
  return Math.min(100, Math.round(baseScore + confidenceBonus + relationshipBonus));
}

function applyLayout(nodes: GraphNode[], edges: GraphEdge[], layoutType: 'force' | 'hierarchical' | 'circular'): GraphNode[] {
  const nodeCount = nodes.length;
  
  switch (layoutType) {
    case 'circular':
      return nodes.map((node, index) => {
        const angle = (2 * Math.PI * index) / nodeCount;
        const radius = Math.max(200, nodeCount * 20);
        return {
          ...node,
          position: {
            x: Math.cos(angle) * radius + 400,
            y: Math.sin(angle) * radius + 300,
          },
        };
      });
      
    case 'hierarchical':
      // Simple hierarchical layout - could be enhanced with proper layering
      const layers = Math.ceil(Math.sqrt(nodeCount));
      return nodes.map((node, index) => {
        const layer = Math.floor(index / layers);
        const positionInLayer = index % layers;
        return {
          ...node,
          position: {
            x: positionInLayer * 250 + 100,
            y: layer * 150 + 100,
          },
        };
      });
      
    case 'force':
    default:
      // Simple force-directed layout approximation
      return nodes.map((node, index) => {
        const x = (index % 4) * 200 + Math.random() * 100;
        const y = Math.floor(index / 4) * 200 + Math.random() * 100;
        return {
          ...node,
          position: { x, y },
        };
      });
  }
}