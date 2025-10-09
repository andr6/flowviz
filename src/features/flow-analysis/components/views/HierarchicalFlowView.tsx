/**
 * Hierarchical/Nested Flow Views
 * Organizes attack flows by campaigns, actors, and tactical phases
 */
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Folder as FolderIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Campaign as CampaignIcon,
  Category as CategoryIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Compare as CompareIcon,
  Share as ShareIcon,
  AccountTree as AccountTreeIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPreviousIcon,
} from '@mui/icons-material';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Badge,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  BackgroundVariant,
  MarkerType,
} from 'reactflow';

// Types for hierarchical organization
interface FlowHierarchyItem {
  id: string;
  type: 'campaign' | 'actor' | 'tactic' | 'technique' | 'flow' | 'phase';
  name: string;
  description?: string;
  children?: FlowHierarchyItem[];
  metadata: {
    count?: number;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    confidence?: number;
    timeframe?: { start: Date; end: Date };
    tags?: string[];
    platforms?: string[];
    attribution?: {
      actor?: string;
      campaign?: string;
      malware?: string[];
    };
  };
  flowData?: {
    nodes: Node[];
    edges: Edge[];
    stats: {
      nodeCount: number;
      edgeCount: number;
      tactics: string[];
      techniques: string[];
    };
  };
}

interface CampaignPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  duration?: number; // in hours
  flows: FlowHierarchyItem[];
  success: boolean;
  confidence: number;
}

interface HierarchicalViewSettings {
  groupBy: 'campaign' | 'actor' | 'tactic' | 'timeline';
  showEmptyGroups: boolean;
  autoExpand: boolean;
  showMetrics: boolean;
  sortBy: 'name' | 'date' | 'severity' | 'count';
  sortOrder: 'asc' | 'desc';
  playbackMode: boolean;
  playbackSpeed: number;
}

interface HierarchicalFlowViewProps {
  flows: FlowHierarchyItem[];
  onFlowSelect?: (flow: FlowHierarchyItem) => void;
  onCompare?: (flows: FlowHierarchyItem[]) => void;
  initialSettings?: Partial<HierarchicalViewSettings>;
  height?: number;
}

// Campaign Phase Component
const CampaignPhaseView: React.FC<{
  phases: CampaignPhase[];
  onPhaseSelect: (phase: CampaignPhase) => void;
  selectedPhaseId?: string;
  playbackMode: boolean;
  currentPhaseIndex: number;
}> = ({ phases, onPhaseSelect, selectedPhaseId, playbackMode, currentPhaseIndex }) => {
  const theme = useTheme();

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ScheduleIcon />
        Campaign Timeline
      </Typography>
      
      <Box sx={{ position: 'relative' }}>
        {/* Timeline line */}
        <Box
          sx={{
            position: 'absolute',
            left: 24,
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: 'primary.main',
            opacity: 0.3,
          }}
        />
        
        {phases.map((phase, index) => (
          <motion.div
            key={phase.id}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                mb: 2,
                cursor: 'pointer',
              }}
              onClick={() => onPhaseSelect(phase)}
            >
              {/* Phase indicator */}
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: 
                    index === currentPhaseIndex && playbackMode
                      ? 'success.main'
                      : selectedPhaseId === phase.id
                      ? 'primary.main'
                      : 'background.paper',
                  border: 2,
                  borderColor: phase.success ? 'success.main' : 'warning.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <Typography variant="h6" color="white" fontWeight="bold">
                  {index + 1}
                </Typography>
              </Box>

              {/* Phase content */}
              <Card
                elevation={selectedPhaseId === phase.id ? 4 : 1}
                sx={{
                  ml: 2,
                  flex: 1,
                  backgroundColor: 
                    index === currentPhaseIndex && playbackMode
                      ? 'success.50'
                      : 'background.paper',
                }}
              >
                <CardContent sx={{ py: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {phase.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {phase.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip
                          size="small"
                          label={`${phase.flows.length} flows`}
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={`${phase.confidence}% confidence`}
                          color={phase.confidence > 80 ? 'success' : 'warning'}
                          variant="outlined"
                        />
                        {phase.duration && (
                          <Chip
                            size="small"
                            label={`${Math.round(phase.duration / 24)}d duration`}
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                    
                    {index === currentPhaseIndex && playbackMode && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      >
                        <PlayArrowIcon color="success" />
                      </motion.div>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </motion.div>
        ))}
      </Box>
    </Box>
  );
};

// Hierarchical Tree Component
const FlowHierarchyTree: React.FC<{
  items: FlowHierarchyItem[];
  onItemSelect: (item: FlowHierarchyItem) => void;
  onItemToggle: (item: FlowHierarchyItem) => void;
  expandedItems: string[];
  selectedItemId?: string;
  settings: HierarchicalViewSettings;
}> = ({ items, onItemSelect, onItemToggle, expandedItems, selectedItemId, settings }) => {
  const theme = useTheme();

  const getItemIcon = (item: FlowHierarchyItem) => {
    switch (item.type) {
      case 'campaign': return <CampaignIcon />;
      case 'actor': return <PersonIcon />;
      case 'tactic': return <CategoryIcon />;
      case 'technique': return <SecurityIcon />;
      case 'flow': return <TimelineIcon />;
      case 'phase': return <ScheduleIcon />;
      default: return <FolderIcon />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return theme.palette.error.main;
      case 'high': return theme.palette.warning.main;
      case 'medium': return theme.palette.info.main;
      case 'low': return theme.palette.success.main;
      default: return theme.palette.grey[500];
    }
  };

  const renderTreeItem = (item: FlowHierarchyItem, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedItems.includes(item.id);
    const isSelected = selectedItemId === item.id;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: depth * 0.05 }}
      >
        <ListItem
          button
          selected={isSelected}
          onClick={() => onItemSelect(item)}
          sx={{
            pl: 2 + depth * 2,
            borderRadius: 1,
            mb: 0.5,
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren && (
            <ListItemIcon
              sx={{ minWidth: 24, cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                onItemToggle(item);
              }}
            >
              {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
            </ListItemIcon>
          )}

          {/* Item Icon */}
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Badge
              badgeContent={settings.showMetrics ? item.metadata.count : 0}
              color="primary"
              invisible={!item.metadata.count}
            >
              {getItemIcon(item)}
            </Badge>
          </ListItemIcon>

          {/* Item Content */}
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" fontWeight={isSelected ? 'bold' : 'normal'}>
                  {item.name}
                </Typography>
                {item.metadata.severity && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: getSeverityColor(item.metadata.severity),
                    }}
                  />
                )}
              </Box>
            }
            secondary={
              <Box>
                {item.description && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {item.description}
                  </Typography>
                )}
                {settings.showMetrics && item.flowData && (
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                    <Chip
                      size="small"
                      label={`${item.flowData.stats.nodeCount} nodes`}
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 16 }}
                    />
                    <Chip
                      size="small"
                      label={`${item.flowData.stats.techniques.length} techniques`}
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 16 }}
                    />
                  </Box>
                )}
                {item.metadata.tags && (
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                    {item.metadata.tags.slice(0, 3).map(tag => (
                      <Chip
                        key={tag}
                        size="small"
                        label={tag}
                        variant="outlined"
                        sx={{ fontSize: '0.6rem', height: 14 }}
                      />
                    ))}
                    {item.metadata.tags.length > 3 && (
                      <Chip
                        size="small"
                        label={`+${item.metadata.tags.length - 3}`}
                        variant="outlined"
                        sx={{ fontSize: '0.6rem', height: 14 }}
                      />
                    )}
                  </Box>
                )}
              </Box>
            }
          />

          {/* Actions */}
          <ListItemSecondaryAction>
            <IconButton size="small">
              <MoreVertIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>

        {/* Children */}
        <Collapse in={isExpanded}>
          <List disablePadding>
            {hasChildren &&
              item.children!.map(child => renderTreeItem(child, depth + 1))
            }
          </List>
        </Collapse>
      </motion.div>
    );
  };

  return (
    <List disablePadding>
      {items.map(item => renderTreeItem(item))}
    </List>
  );
};

// Flow Preview Component
const FlowPreview: React.FC<{
  flow: FlowHierarchyItem;
  height: number;
}> = ({ flow, height }) => {
  const theme = useTheme();

  if (!flow.flowData) {
    return (
      <Box
        sx={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'background.default',
        }}
      >
        <Typography color="text.secondary">
          No flow data available
        </Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={1} sx={{ height, overflow: 'hidden' }}>
      <ReactFlow
        nodes={flow.flowData.nodes}
        edges={flow.flowData.edges}
        fitView
        attributionPosition="bottom-left"
        defaultEdgeOptions={{
          markerEnd: { type: MarkerType.Arrow },
        }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={12} 
          size={1}
          color={theme.palette.mode === 'dark' ? '#333' : '#ccc'}
        />
        <Controls position="bottom-right" />
      </ReactFlow>
    </Paper>
  );
};

// Main Hierarchical Flow View Component
export const HierarchicalFlowView: React.FC<HierarchicalFlowViewProps> = ({
  flows,
  onFlowSelect,
  onCompare,
  initialSettings,
  height = 800,
}) => {
  const theme = useTheme();
  const [settings, setSettings] = useState<HierarchicalViewSettings>({
    groupBy: 'campaign',
    showEmptyGroups: false,
    autoExpand: true,
    showMetrics: true,
    sortBy: 'name',
    sortOrder: 'asc',
    playbackMode: false,
    playbackSpeed: 1000, // ms
    ...initialSettings,
  });
  
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const playbackInterval = useRef<NodeJS.Timeout | null>(null);

  // Generate sample hierarchical data
  const hierarchicalData = useMemo((): FlowHierarchyItem[] => {
    // Sample campaign structure
    return [
      {
        id: 'campaign-solarwinds',
        type: 'campaign',
        name: 'SolarWinds Supply Chain Attack',
        description: 'Sophisticated supply chain compromise by APT29',
        metadata: {
          count: 12,
          severity: 'critical',
          confidence: 95,
          timeframe: {
            start: new Date('2020-03-01'),
            end: new Date('2020-12-31'),
          },
          tags: ['Supply Chain', 'APT29', 'SolarWinds', 'Sunburst'],
          attribution: {
            actor: 'APT29',
            campaign: 'SolarWinds',
            malware: ['Sunburst', 'Teardrop'],
          },
        },
        children: [
          {
            id: 'phase-1',
            type: 'phase',
            name: 'Initial Compromise',
            description: 'Compromise of SolarWinds build system',
            metadata: {
              count: 3,
              severity: 'critical',
              confidence: 90,
              tags: ['Supply Chain', 'Build System'],
            },
            children: [
              {
                id: 'flow-initial-access',
                type: 'flow',
                name: 'SolarWinds Orion Compromise',
                description: 'Initial access through compromised SolarWinds update',
                metadata: {
                  severity: 'critical',
                  confidence: 95,
                  tags: ['T1195.002', 'Supply Chain'],
                },
                flowData: {
                  nodes: [
                    {
                      id: '1',
                      type: 'default',
                      position: { x: 100, y: 100 },
                      data: { label: 'Supply Chain Compromise' },
                    },
                    {
                      id: '2',
                      type: 'default',
                      position: { x: 300, y: 100 },
                      data: { label: 'SolarWinds Update' },
                    },
                  ],
                  edges: [
                    {
                      id: 'e1-2',
                      source: '1',
                      target: '2',
                      markerEnd: { type: MarkerType.Arrow },
                    },
                  ],
                  stats: {
                    nodeCount: 2,
                    edgeCount: 1,
                    tactics: ['Initial Access'],
                    techniques: ['T1195.002'],
                  },
                },
              },
            ],
          },
          {
            id: 'phase-2',
            type: 'phase',
            name: 'Deployment & Persistence',
            description: 'Sunburst deployment and establishing persistence',
            metadata: {
              count: 5,
              severity: 'high',
              confidence: 88,
              tags: ['Sunburst', 'Persistence'],
            },
            children: [
              {
                id: 'flow-sunburst-deploy',
                type: 'flow',
                name: 'Sunburst Malware Deployment',
                description: 'Deployment of Sunburst backdoor via legitimate updates',
                metadata: {
                  severity: 'high',
                  confidence: 92,
                  tags: ['Sunburst', 'T1053.005'],
                },
              },
              {
                id: 'flow-persistence',
                type: 'flow',
                name: 'System Persistence',
                description: 'Establishing long-term persistence mechanisms',
                metadata: {
                  severity: 'medium',
                  confidence: 85,
                  tags: ['T1547.001', 'T1053.005'],
                },
              },
            ],
          },
          {
            id: 'phase-3',
            type: 'phase',
            name: 'Discovery & Lateral Movement',
            description: 'Network discovery and lateral movement activities',
            metadata: {
              count: 4,
              severity: 'high',
              confidence: 82,
              tags: ['Discovery', 'Lateral Movement'],
            },
          },
        ],
      },
      {
        id: 'campaign-apt28',
        type: 'campaign',
        name: 'APT28 Phishing Campaign',
        description: 'Targeted phishing attacks against government entities',
        metadata: {
          count: 8,
          severity: 'high',
          confidence: 78,
          timeframe: {
            start: new Date('2024-01-01'),
            end: new Date('2024-06-01'),
          },
          tags: ['Phishing', 'APT28', 'Government'],
          attribution: {
            actor: 'APT28',
            campaign: 'Government Targeting',
            malware: ['Zebrocy', 'X-Agent'],
          },
        },
        children: [
          {
            id: 'tactic-initial-access-apt28',
            type: 'tactic',
            name: 'Initial Access',
            description: 'Spear-phishing email techniques',
            metadata: {
              count: 3,
              severity: 'high',
              tags: ['T1566.001', 'T1566.002'],
            },
          },
          {
            id: 'tactic-execution-apt28',
            type: 'tactic',
            name: 'Execution',
            description: 'PowerShell and scripting execution',
            metadata: {
              count: 2,
              severity: 'medium',
              tags: ['T1059.001', 'T1059.003'],
            },
          },
        ],
      },
    ];
  }, []);

  // Generate campaign phases for timeline view
  const campaignPhases = useMemo((): CampaignPhase[] => {
    return [
      {
        id: 'phase-1',
        name: 'Reconnaissance',
        description: 'Initial target identification and research',
        order: 1,
        duration: 168, // 7 days
        flows: hierarchicalData.slice(0, 1),
        success: true,
        confidence: 90,
      },
      {
        id: 'phase-2',
        name: 'Initial Access',
        description: 'Gain foothold in target environment',
        order: 2,
        duration: 24, // 1 day
        flows: hierarchicalData.slice(0, 2),
        success: true,
        confidence: 85,
      },
      {
        id: 'phase-3',
        name: 'Persistence & Privilege Escalation',
        description: 'Establish persistence and escalate privileges',
        order: 3,
        duration: 72, // 3 days
        flows: hierarchicalData.slice(1, 2),
        success: true,
        confidence: 92,
      },
      {
        id: 'phase-4',
        name: 'Lateral Movement',
        description: 'Move laterally through the network',
        order: 4,
        duration: 120, // 5 days
        flows: hierarchicalData.slice(0, 1),
        success: false,
        confidence: 65,
      },
    ];
  }, [hierarchicalData]);

  // Auto-expand items based on settings
  useEffect(() => {
    if (settings.autoExpand) {
      const expandAll = (items: FlowHierarchyItem[]): string[] => {
        const ids: string[] = [];
        items.forEach(item => {
          ids.push(item.id);
          if (item.children) {
            ids.push(...expandAll(item.children));
          }
        });
        return ids;
      };
      setExpandedItems(expandAll(hierarchicalData));
    }
  }, [hierarchicalData, settings.autoExpand]);

  // Playback mode functionality
  useEffect(() => {
    if (settings.playbackMode) {
      playbackInterval.current = setInterval(() => {
        setCurrentPhaseIndex(prev => (prev + 1) % campaignPhases.length);
      }, settings.playbackSpeed);
    } else if (playbackInterval.current) {
      clearInterval(playbackInterval.current);
    }

    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    };
  }, [settings.playbackMode, settings.playbackSpeed, campaignPhases.length]);

  const handleItemSelect = useCallback((item: FlowHierarchyItem) => {
    setSelectedItemId(item.id);
    onFlowSelect?.(item);
  }, [onFlowSelect]);

  const handleItemToggle = useCallback((item: FlowHierarchyItem) => {
    setExpandedItems(prev => 
      prev.includes(item.id)
        ? prev.filter(id => id !== item.id)
        : [...prev, item.id]
    );
  }, []);

  const handlePhaseSelect = useCallback((phase: CampaignPhase) => {
    setCurrentPhaseIndex(campaignPhases.findIndex(p => p.id === phase.id));
  }, [campaignPhases]);

  const selectedItem = useMemo(() => {
    const findItem = (items: FlowHierarchyItem[], id: string): FlowHierarchyItem | null => {
      for (const item of items) {
        if (item.id === id) {return item;}
        if (item.children) {
          const found = findItem(item.children, id);
          if (found) {return found;}
        }
      }
      return null;
    };
    return selectedItemId ? findItem(hierarchicalData, selectedItemId) : null;
  }, [hierarchicalData, selectedItemId]);

  return (
    <Box sx={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountTreeIcon />
            Hierarchical Flow View
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Playback Controls */}
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mr: 2 }}>
              <Tooltip title="Previous Phase">
                <IconButton
                  size="small"
                  onClick={() => setCurrentPhaseIndex(Math.max(0, currentPhaseIndex - 1))}
                  disabled={currentPhaseIndex === 0}
                >
                  <SkipPreviousIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title={settings.playbackMode ? 'Pause Playback' : 'Start Playback'}>
                <IconButton
                  size="small"
                  onClick={() => setSettings(prev => ({ ...prev, playbackMode: !prev.playbackMode }))}
                  color={settings.playbackMode ? 'secondary' : 'default'}
                >
                  {settings.playbackMode ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
              </Tooltip>

              <Tooltip title="Next Phase">
                <IconButton
                  size="small"
                  onClick={() => setCurrentPhaseIndex(Math.min(campaignPhases.length - 1, currentPhaseIndex + 1))}
                  disabled={currentPhaseIndex === campaignPhases.length - 1}
                >
                  <SkipNextIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <Chip
              label={`${hierarchicalData.length} Campaigns`}
              size="small"
              color="primary"
            />
            <Chip
              label={settings.groupBy.charAt(0).toUpperCase() + settings.groupBy.slice(1)}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', gap: 1, minHeight: 0 }}>
        {/* Left Panel - Hierarchy */}
        <Paper elevation={1} sx={{ width: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Campaign Timeline */}
          {settings.groupBy === 'campaign' && (
            <Box sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
              <CampaignPhaseView
                phases={campaignPhases}
                onPhaseSelect={handlePhaseSelect}
                selectedPhaseId={`phase-${currentPhaseIndex + 1}`}
                playbackMode={settings.playbackMode}
                currentPhaseIndex={currentPhaseIndex}
              />
            </Box>
          )}

          <Divider />

          {/* Hierarchy Tree */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
            <FlowHierarchyTree
              items={hierarchicalData}
              onItemSelect={handleItemSelect}
              onItemToggle={handleItemToggle}
              expandedItems={expandedItems}
              selectedItemId={selectedItemId}
              settings={settings}
            />
          </Box>
        </Paper>

        {/* Right Panel - Flow Preview */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {selectedItem ? (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Flow Details */}
              <Card elevation={1} sx={{ mb: 1 }}>
                <CardContent sx={{ pb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h6">
                        {selectedItem.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {selectedItem.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          size="small"
                          label={selectedItem.type.toUpperCase()}
                          color="primary"
                        />
                        {selectedItem.metadata.severity && (
                          <Chip
                            size="small"
                            label={selectedItem.metadata.severity.toUpperCase()}
                            color={
                              selectedItem.metadata.severity === 'critical' ? 'error' :
                              selectedItem.metadata.severity === 'high' ? 'warning' :
                              selectedItem.metadata.severity === 'medium' ? 'info' : 'success'
                            }
                          />
                        )}
                        {selectedItem.metadata.confidence && (
                          <Chip
                            size="small"
                            label={`${selectedItem.metadata.confidence}% Confidence`}
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small">
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton size="small">
                        <CompareIcon />
                      </IconButton>
                      <IconButton size="small">
                        <ShareIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Flow Visualization */}
              <Box sx={{ flex: 1 }}>
                <FlowPreview
                  flow={selectedItem}
                  height={height - 200}
                />
              </Box>
            </Box>
          ) : (
            <Paper
              elevation={1}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              <AccountTreeIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
              <Typography variant="h6" gutterBottom>
                Select a Flow or Campaign
              </Typography>
              <Typography variant="body2">
                Choose an item from the hierarchy to view details and flow visualization
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default HierarchicalFlowView;