import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  BookmarkBorder as BookmarkIcon,
  Sort as SortIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Typography,
  Collapse,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
} from '@mui/material';
import React, { useState, useCallback, useMemo } from 'react';
import { Node, Edge } from 'reactflow';

import { useThemeContext } from '../../../../shared/context/ThemeProvider';
import { MITRE_TACTICS } from '../../services/nodeClustering';

export interface SearchFilterState {
  searchQuery: string;
  selectedTactics: string[];
  selectedSeverities: string[];
  hideFiltered: boolean;
  sortBy: 'name' | 'technique' | 'severity' | 'connections';
  sortOrder: 'asc' | 'desc';
}

export interface SearchResult {
  node: Node;
  matches: {
    field: string;
    value: string;
    highlight: string;
  }[];
  relevanceScore: number;
}

interface SearchFilterControlsProps {
  nodes: Node[];
  edges: Edge[];
  onSearchResults: (results: SearchResult[]) => void;
  onFilterChange: (filteredNodes: Node[]) => void;
  bookmarkedNodes: string[];
  onToggleBookmark: (nodeId: string) => void;
}

const SEVERITY_LEVELS = {
  'critical': { name: 'Critical', color: '#E74C3C', priority: 4 },
  'high': { name: 'High', color: '#E67E22', priority: 3 },
  'medium': { name: 'Medium', color: '#F39C12', priority: 2 },
  'low': { name: 'Low', color: '#27AE60', priority: 1 },
  'info': { name: 'Info', color: '#3498DB', priority: 0 },
};

export const SearchFilterControls: React.FC<SearchFilterControlsProps> = ({
  nodes,
  edges,
  onSearchResults,
  onFilterChange,
  bookmarkedNodes,
  onToggleBookmark,
}) => {
  const { theme } = useThemeContext();
  const [expanded, setExpanded] = useState(false);
  const [filterState, setFilterState] = useState<SearchFilterState>({
    searchQuery: '',
    selectedTactics: [],
    selectedSeverities: [],
    hideFiltered: false,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);

  // Extract node metadata for filtering
  const extractNodeMetadata = useCallback((node: Node) => {
    const data = node.data || {};
    return {
      id: node.id,
      name: data.label || data.name || node.id,
      technique: data.technique_id || data.technique || '',
      tactic: data.tactic || data.category || '',
      severity: data.severity || data.risk || 'info',
      description: data.description || '',
      connections: edges.filter(e => e.source === node.id || e.target === node.id).length,
      isBookmarked: bookmarkedNodes.includes(node.id),
    };
  }, [edges, bookmarkedNodes]);

  // Available tactics from nodes
  const availableTactics = useMemo(() => {
    const tactics = new Set<string>();
    nodes.forEach(node => {
      const metadata = extractNodeMetadata(node);
      if (metadata.tactic) {
        tactics.add(metadata.tactic);
      }
    });
    return Array.from(tactics).sort();
  }, [nodes, extractNodeMetadata]);

  // Available severities from nodes
  const availableSeverities = useMemo(() => {
    const severities = new Set<string>();
    nodes.forEach(node => {
      const metadata = extractNodeMetadata(node);
      severities.add(metadata.severity);
    });
    return Array.from(severities).sort((a, b) => {
      const aPriority = SEVERITY_LEVELS[a as keyof typeof SEVERITY_LEVELS]?.priority || 0;
      const bPriority = SEVERITY_LEVELS[b as keyof typeof SEVERITY_LEVELS]?.priority || 0;
      return bPriority - aPriority; // Descending order
    });
  }, [nodes, extractNodeMetadata]);

  // Search function
  const performSearch = useCallback((query: string): SearchResult[] => {
    if (!query.trim()) {return [];}

    const searchTerm = query.toLowerCase();
    const results: SearchResult[] = [];

    nodes.forEach(node => {
      const metadata = extractNodeMetadata(node);
      const matches: SearchResult['matches'] = [];
      let relevanceScore = 0;

      // Search in name
      if (metadata.name.toLowerCase().includes(searchTerm)) {
        matches.push({
          field: 'name',
          value: metadata.name,
          highlight: metadata.name.replace(
            new RegExp(searchTerm, 'gi'),
            '<mark>$&</mark>'
          ),
        });
        relevanceScore += metadata.name.toLowerCase() === searchTerm ? 10 : 5;
      }

      // Search in technique ID
      if (metadata.technique.toLowerCase().includes(searchTerm)) {
        matches.push({
          field: 'technique',
          value: metadata.technique,
          highlight: metadata.technique.replace(
            new RegExp(searchTerm, 'gi'),
            '<mark>$&</mark>'
          ),
        });
        relevanceScore += metadata.technique.toLowerCase() === searchTerm ? 8 : 4;
      }

      // Search in tactic
      if (metadata.tactic.toLowerCase().includes(searchTerm)) {
        matches.push({
          field: 'tactic',
          value: metadata.tactic,
          highlight: metadata.tactic.replace(
            new RegExp(searchTerm, 'gi'),
            '<mark>$&</mark>'
          ),
        });
        relevanceScore += 3;
      }

      // Search in description
      if (metadata.description.toLowerCase().includes(searchTerm)) {
        matches.push({
          field: 'description',
          value: metadata.description,
          highlight: metadata.description.replace(
            new RegExp(searchTerm, 'gi'),
            '<mark>$&</mark>'
          ),
        });
        relevanceScore += 2;
      }

      if (matches.length > 0) {
        results.push({
          node,
          matches,
          relevanceScore,
        });
      }
    });

    // Sort by relevance score
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [nodes, extractNodeMetadata]);

  // Filter function
  const applyFilters = useCallback((): Node[] => {
    return nodes.filter(node => {
      const metadata = extractNodeMetadata(node);

      // Tactic filter
      if (filterState.selectedTactics.length > 0) {
        if (!filterState.selectedTactics.includes(metadata.tactic)) {
          return false;
        }
      }

      // Severity filter
      if (filterState.selectedSeverities.length > 0) {
        if (!filterState.selectedSeverities.includes(metadata.severity)) {
          return false;
        }
      }

      return true;
    });
  }, [nodes, filterState, extractNodeMetadata]);

  // Sort function
  const sortNodes = useCallback((nodesToSort: Node[]): Node[] => {
    return nodesToSort.sort((a, b) => {
      const metadataA = extractNodeMetadata(a);
      const metadataB = extractNodeMetadata(b);

      let comparison = 0;

      switch (filterState.sortBy) {
        case 'name':
          comparison = metadataA.name.localeCompare(metadataB.name);
          break;
        case 'technique':
          comparison = metadataA.technique.localeCompare(metadataB.technique);
          break;
        case 'severity':
          const severityA = SEVERITY_LEVELS[metadataA.severity as keyof typeof SEVERITY_LEVELS]?.priority || 0;
          const severityB = SEVERITY_LEVELS[metadataB.severity as keyof typeof SEVERITY_LEVELS]?.priority || 0;
          comparison = severityB - severityA; // Higher severity first
          break;
        case 'connections':
          comparison = metadataB.connections - metadataA.connections; // More connections first
          break;
      }

      return filterState.sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [filterState, extractNodeMetadata]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setFilterState(prev => ({ ...prev, searchQuery: query }));
    const searchResults = performSearch(query);
    onSearchResults(searchResults);
  }, [performSearch, onSearchResults]);

  // Handle filter changes
  const handleFilterChange = useCallback((newState: Partial<SearchFilterState>) => {
    const updatedState = { ...filterState, ...newState };
    setFilterState(updatedState);

    const filteredNodes = applyFilters();
    const sortedNodes = sortNodes(filteredNodes);
    onFilterChange(sortedNodes);
  }, [filterState, applyFilters, sortNodes, onFilterChange]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const clearedState: SearchFilterState = {
      searchQuery: '',
      selectedTactics: [],
      selectedSeverities: [],
      hideFiltered: false,
      sortBy: 'name',
      sortOrder: 'asc',
    };
    setFilterState(clearedState);
    onSearchResults([]);
    onFilterChange(nodes);
  }, [nodes, onSearchResults, onFilterChange]);

  const hasActiveFilters = filterState.searchQuery || 
                          filterState.selectedTactics.length > 0 || 
                          filterState.selectedSeverities.length > 0;

  const filteredNodeCount = applyFilters().length;

  return (
    <Card
      sx={{
        position: 'absolute',
        top: 16,
        left: 16,
        width: 350,
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
            <SearchIcon sx={{ color: theme.colors.brand.primary }} />
            <Typography
              variant="h6"
              sx={{
                color: theme.colors.text.primary,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                fontFamily: theme.typography.fontFamily.primary,
              }}
            >
              Search & Filter
            </Typography>
            {hasActiveFilters && (
              <Badge
                badgeContent={filteredNodeCount}
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: theme.colors.brand.primary,
                    color: theme.colors.text.inverse,
                    fontSize: theme.typography.fontSize.xs,
                  },
                }}
              >
                <FilterIcon fontSize="small" sx={{ color: theme.colors.brand.primary }} />
              </Badge>
            )}
          </Box>
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{ color: theme.colors.text.tertiary }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        {/* Search Input */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name, technique ID, or tactic..."
            value={filterState.searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: theme.colors.text.tertiary }} fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: filterState.searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => handleSearch('')}
                    sx={{ color: theme.colors.text.tertiary }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                backgroundColor: theme.colors.background.primary,
                borderRadius: theme.borderRadius.md,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.colors.surface.border.default,
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.colors.surface.border.emphasis,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.colors.brand.primary,
                },
              },
            }}
          />
        </Box>

        {/* Quick Actions */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Tooltip title="Sort options">
            <Chip
              icon={<SortIcon />}
              label={`${filterState.sortBy} ${filterState.sortOrder === 'desc' ? '↓' : '↑'}`}
              size="small"
              clickable
              onClick={(e) => setSortMenuAnchor(e.currentTarget)}
              sx={{
                backgroundColor: theme.colors.surface.subtle,
                color: theme.colors.text.primary,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                },
              }}
            />
          </Tooltip>
          
          {hasActiveFilters && (
            <Tooltip title="Clear all filters">
              <Chip
                label="Clear All"
                size="small"
                onDelete={clearFilters}
                deleteIcon={<ClearIcon />}
                sx={{
                  backgroundColor: theme.colors.status.warning.bg,
                  color: theme.colors.status.warning.text,
                }}
              />
            </Tooltip>
          )}
        </Box>

        {/* Sort Menu */}
        <Menu
          anchorEl={sortMenuAnchor}
          open={Boolean(sortMenuAnchor)}
          onClose={() => setSortMenuAnchor(null)}
          PaperProps={{
            sx: {
              backgroundColor: theme.colors.background.secondary,
              border: `1px solid ${theme.colors.surface.border.default}`,
              borderRadius: theme.borderRadius.md,
            },
          }}
        >
          {(['name', 'technique', 'severity', 'connections'] as const).map((sortField) => (
            <MenuItem
              key={sortField}
              onClick={() => {
                handleFilterChange({
                  sortBy: sortField,
                  sortOrder: filterState.sortBy === sortField && filterState.sortOrder === 'asc' ? 'desc' : 'asc'
                });
                setSortMenuAnchor(null);
              }}
              sx={{
                color: theme.colors.text.primary,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                },
                ...(filterState.sortBy === sortField && {
                  backgroundColor: theme.colors.brand.light,
                  color: theme.colors.brand.primary,
                }),
              }}
            >
              {sortField.charAt(0).toUpperCase() + sortField.slice(1)}
              {filterState.sortBy === sortField && (
                <Box component="span" sx={{ ml: 1 }}>
                  {filterState.sortOrder === 'desc' ? '↓' : '↑'}
                </Box>
              )}
            </MenuItem>
          ))}
        </Menu>

        <Collapse in={expanded}>
          {/* Statistics */}
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
              Results
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`${filteredNodeCount} / ${nodes.length} nodes`}
                size="small"
                sx={{
                  backgroundColor: theme.colors.brand.light,
                  color: theme.colors.brand.primary,
                  fontSize: theme.typography.fontSize.xs,
                }}
              />
              <Chip
                label={`${bookmarkedNodes.length} bookmarked`}
                size="small"
                icon={<BookmarkIcon />}
                sx={{
                  backgroundColor: theme.colors.status.info.bg,
                  color: theme.colors.status.info.text,
                  fontSize: theme.typography.fontSize.xs,
                }}
              />
            </Box>
          </Box>

          <Divider sx={{ borderColor: theme.colors.surface.border.subtle, mb: 2 }} />

          {/* Tactic Filter */}
          {availableTactics.length > 0 && (
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
                Filter by Tactics
              </Typography>
              <FormGroup>
                {availableTactics.map((tactic) => {
                  const tacticInfo = MITRE_TACTICS[tactic.toLowerCase()] || { name: tactic, color: '#666666' };
                  const nodeCount = nodes.filter(n => extractNodeMetadata(n).tactic === tactic).length;
                  
                  return (
                    <FormControlLabel
                      key={tactic}
                      control={
                        <Checkbox
                          checked={filterState.selectedTactics.includes(tactic)}
                          onChange={(e) => {
                            const newTactics = e.target.checked
                              ? [...filterState.selectedTactics, tactic]
                              : filterState.selectedTactics.filter(t => t !== tactic);
                            handleFilterChange({ selectedTactics: newTactics });
                          }}
                          size="small"
                          sx={{
                            color: theme.colors.text.tertiary,
                            '&.Mui-checked': {
                              color: tacticInfo.color,
                            },
                          }}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <Typography sx={{ 
                            color: theme.colors.text.primary,
                            fontSize: theme.typography.fontSize.sm,
                            fontFamily: theme.typography.fontFamily.primary,
                          }}>
                            {tacticInfo.name}
                          </Typography>
                          <Chip
                            label={nodeCount}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: theme.typography.fontSize.xs,
                              backgroundColor: `${tacticInfo.color}20`,
                              color: tacticInfo.color,
                            }}
                          />
                        </Box>
                      }
                      sx={{ margin: 0, width: '100%' }}
                    />
                  );
                })}
              </FormGroup>
            </Box>
          )}

          {/* Severity Filter */}
          {availableSeverities.length > 0 && (
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
                Filter by Severity
              </Typography>
              <FormGroup>
                {availableSeverities.map((severity) => {
                  const severityInfo = SEVERITY_LEVELS[severity as keyof typeof SEVERITY_LEVELS] || {
                    name: severity,
                    color: '#666666',
                    priority: 0
                  };
                  const nodeCount = nodes.filter(n => extractNodeMetadata(n).severity === severity).length;
                  
                  return (
                    <FormControlLabel
                      key={severity}
                      control={
                        <Checkbox
                          checked={filterState.selectedSeverities.includes(severity)}
                          onChange={(e) => {
                            const newSeverities = e.target.checked
                              ? [...filterState.selectedSeverities, severity]
                              : filterState.selectedSeverities.filter(s => s !== severity);
                            handleFilterChange({ selectedSeverities: newSeverities });
                          }}
                          size="small"
                          sx={{
                            color: theme.colors.text.tertiary,
                            '&.Mui-checked': {
                              color: severityInfo.color,
                            },
                          }}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <Typography sx={{ 
                            color: theme.colors.text.primary,
                            fontSize: theme.typography.fontSize.sm,
                            fontFamily: theme.typography.fontFamily.primary,
                          }}>
                            {severityInfo.name}
                          </Typography>
                          <Chip
                            label={nodeCount}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: theme.typography.fontSize.xs,
                              backgroundColor: `${severityInfo.color}20`,
                              color: severityInfo.color,
                            }}
                          />
                        </Box>
                      }
                      sx={{ margin: 0, width: '100%' }}
                    />
                  );
                })}
              </FormGroup>
            </Box>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};