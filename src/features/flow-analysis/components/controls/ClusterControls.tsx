import {
  AccountTree as ClusterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Hub as NodeIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Chip,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Divider,
  Badge,
} from '@mui/material';
import React, { useState } from 'react';

import { useThemeContext } from '../../../../shared/context/ThemeProvider';
import { NodeCluster, nodeClusteringService, MITRE_TACTICS } from '../../services/nodeClustering';

interface ClusterControlsProps {
  clusters: NodeCluster[];
  onToggleCluster: (clusterId: string) => void;
  onToggleClustering: (enabled: boolean) => void;
  clusteringEnabled: boolean;
  onSearchNodes: (query: string) => void;
  searchResults?: any[];
}

export const ClusterControls: React.FC<ClusterControlsProps> = ({
  clusters,
  onToggleCluster,
  onToggleClustering,
  clusteringEnabled,
  onSearchNodes,
  searchResults = [],
}) => {
  const { theme } = useThemeContext();
  const [expanded, setExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const stats = nodeClusteringService.getClusterStats();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearchNodes(query);
  };

  const getTacticIcon = (tacticId: string) => {
    const tacticIcons: { [key: string]: string } = {
      'reconnaissance': '🔍',
      'resource-development': '🛠️',
      'initial-access': '🚪',
      'execution': '⚡',
      'persistence': '🔒',
      'privilege-escalation': '⬆️',
      'defense-evasion': '👻',
      'credential-access': '🔑',
      'discovery': '📡',
      'lateral-movement': '↔️',
      'collection': '📦',
      'command-and-control': '📡',
      'exfiltration': '📤',
      'impact': '💥',
    };
    return tacticIcons[tacticId] || '🎯';
  };

  return (
    <Card
      sx={{
        position: 'absolute',
        top: 80,
        right: 16,
        width: 320,
        maxHeight: 'calc(100vh - 120px)',
        backgroundColor: theme.colors.background.glassHeavy,
        backdropFilter: theme.effects.blur.xl,
        border: `1px solid ${theme.colors.surface.border.default}`,
        borderRadius: theme.borderRadius.lg,
        zIndex: 1000,
        overflowY: 'auto',
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ClusterIcon sx={{ color: theme.colors.brand.primary }} />
            <Typography
              variant="h6"
              sx={{
                color: theme.colors.text.primary,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                fontFamily: theme.typography.fontFamily.primary,
              }}
            >
              Node Clustering
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{ color: theme.colors.text.tertiary }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          {/* Clustering Toggle */}
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={clusteringEnabled}
                  onChange={(e) => onToggleClustering(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: theme.colors.brand.primary,
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: theme.colors.brand.primary,
                    },
                  }}
                />
              }
              label={
                <Typography sx={{ 
                  color: theme.colors.text.primary,
                  fontSize: theme.typography.fontSize.sm,
                  fontFamily: theme.typography.fontFamily.primary,
                }}>
                  Enable Clustering
                </Typography>
              }
            />
          </Box>

          {/* Statistics */}
          {clusteringEnabled && stats.totalNodes > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="overline"
                sx={{
                  color: theme.colors.text.tertiary,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  letterSpacing: theme.typography.letterSpacing.wide,
                  textTransform: 'uppercase',
                  display: 'block',
                  mb: 1,
                }}
              >
                Cluster Statistics
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  label={`${stats.totalClusters} Tactics`}
                  size="small"
                  sx={{
                    backgroundColor: theme.colors.brand.light,
                    color: theme.colors.brand.primary,
                    fontSize: theme.typography.fontSize.xs,
                  }}
                />
                <Chip
                  label={`${stats.totalNodes} Nodes`}
                  size="small"
                  sx={{
                    backgroundColor: theme.colors.status.info.bg,
                    color: theme.colors.status.info.text,
                    fontSize: theme.typography.fontSize.xs,
                  }}
                />
                {stats.clustersCollapsed > 0 && (
                  <Chip
                    label={`${stats.clustersCollapsed} Collapsed`}
                    size="small"
                    sx={{
                      backgroundColor: theme.colors.status.warning.bg,
                      color: theme.colors.status.warning.text,
                      fontSize: theme.typography.fontSize.xs,
                    }}
                  />
                )}
              </Box>
            </Box>
          )}

          {/* Search */}
          {clusteringEnabled && (
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: theme.colors.background.primary,
                  border: `1px solid ${theme.colors.surface.border.default}`,
                  borderRadius: theme.borderRadius.md,
                  px: 2,
                  py: 1,
                }}
              >
                <SearchIcon sx={{ color: theme.colors.text.tertiary, mr: 1 }} fontSize="small" />
                <input
                  type="text"
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    color: theme.colors.text.primary,
                    fontSize: theme.typography.fontSize.sm,
                    fontFamily: theme.typography.fontFamily.primary,
                    width: '100%',
                  }}
                />
              </Box>
              {searchResults.length > 0 && (
                <Typography
                  sx={{
                    color: theme.colors.text.tertiary,
                    fontSize: theme.typography.fontSize.xs,
                    mt: 0.5,
                  }}
                >
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                </Typography>
              )}
            </Box>
          )}

          <Divider sx={{ borderColor: theme.colors.surface.border.subtle, mb: 2 }} />

          {/* Cluster List */}
          {clusteringEnabled && clusters.length > 0 && (
            <Box>
              <Typography
                variant="overline"
                sx={{
                  color: theme.colors.text.tertiary,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  letterSpacing: theme.typography.letterSpacing.wide,
                  textTransform: 'uppercase',
                  display: 'block',
                  mb: 1,
                }}
              >
                Tactic Clusters
              </Typography>
              
              <List sx={{ py: 0 }}>
                {clusters.map((cluster) => (
                  <ListItem
                    key={cluster.id}
                    sx={{
                      borderRadius: theme.borderRadius.md,
                      mb: 0.5,
                      backgroundColor: cluster.collapsed 
                        ? theme.colors.surface.subtle 
                        : 'transparent',
                      border: `1px solid ${
                        cluster.collapsed 
                          ? theme.colors.surface.border.default 
                          : 'transparent'
                      }`,
                      '&:hover': {
                        backgroundColor: theme.colors.surface.hover,
                        border: `1px solid ${theme.colors.surface.border.default}`,
                      },
                      transition: theme.motion.fast,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: cluster.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                        }}
                      >
                        {getTacticIcon(cluster.id)}
                      </Box>
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Typography
                          sx={{
                            color: theme.colors.text.primary,
                            fontSize: theme.typography.fontSize.sm,
                            fontWeight: theme.typography.fontWeight.medium,
                            fontFamily: theme.typography.fontFamily.primary,
                          }}
                        >
                          {cluster.name}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Badge
                            badgeContent={cluster.nodes.length}
                            color="primary"
                            sx={{
                              '& .MuiBadge-badge': {
                                backgroundColor: theme.colors.brand.primary,
                                color: theme.colors.text.inverse,
                                fontSize: theme.typography.fontSize.xs,
                              },
                            }}
                          >
                            <NodeIcon fontSize="small" sx={{ color: theme.colors.text.tertiary }} />
                          </Badge>
                          <Typography
                            sx={{
                              color: theme.colors.text.tertiary,
                              fontSize: theme.typography.fontSize.xs,
                              fontFamily: theme.typography.fontFamily.primary,
                            }}
                          >
                            {MITRE_TACTICS[cluster.id]?.description || 'No description'}
                          </Typography>
                        </Box>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Tooltip title={cluster.collapsed ? 'Show nodes' : 'Hide nodes'}>
                        <IconButton
                          size="small"
                          onClick={() => onToggleCluster(cluster.id)}
                          sx={{
                            color: theme.colors.text.tertiary,
                            '&:hover': {
                              color: theme.colors.brand.primary,
                              backgroundColor: theme.colors.surface.hover,
                            },
                          }}
                        >
                          {cluster.collapsed ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Empty State */}
          {clusteringEnabled && clusters.length === 0 && (
            <Box
              sx={{
                textAlign: 'center',
                py: 4,
                color: theme.colors.text.tertiary,
              }}
            >
              <ClusterIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography
                sx={{
                  fontSize: theme.typography.fontSize.sm,
                  fontFamily: theme.typography.fontFamily.primary,
                }}
              >
                No clusters available
              </Typography>
              <Typography
                sx={{
                  fontSize: theme.typography.fontSize.xs,
                  fontFamily: theme.typography.fontFamily.primary,
                  mt: 1,
                  opacity: 0.7,
                }}
              >
                Analyze a flow to see tactic clusters
              </Typography>
            </Box>
          )}

          {/* Disabled State */}
          {!clusteringEnabled && (
            <Box
              sx={{
                textAlign: 'center',
                py: 4,
                color: theme.colors.text.tertiary,
              }}
            >
              <FilterIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography
                sx={{
                  fontSize: theme.typography.fontSize.sm,
                  fontFamily: theme.typography.fontFamily.primary,
                }}
              >
                Clustering is disabled
              </Typography>
              <Typography
                sx={{
                  fontSize: theme.typography.fontSize.xs,
                  fontFamily: theme.typography.fontFamily.primary,
                  mt: 1,
                  opacity: 0.7,
                }}
              >
                Enable clustering to group nodes by MITRE ATT&CK tactics
              </Typography>
            </Box>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};