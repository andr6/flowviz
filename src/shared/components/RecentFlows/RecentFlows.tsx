import {
  Language as UrlIcon,
  TextFields as TextIcon,
  PictureAsPdf as PdfIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  AccessTime as TimeIcon,
  Hub as NodesIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Divider,
  Tooltip,
  Card,
  CardContent,
  Button,
  Menu,
  MenuItem,
} from '@mui/material';
import React, { useState } from 'react';

import { useThemeContext } from '../../context/ThemeProvider';
import { useResponsive } from '../../hooks/useResponsive';
import { type RecentFlow } from '../../services/storage/recentFlows';

interface RecentFlowsProps {
  recentFlows: RecentFlow[];
  onFlowSelect: (flow: RecentFlow) => void;
  onFlowDelete: (id: string) => void;
  onClearAll: () => void;
  showSearch?: boolean;
  showGrouping?: boolean;
  maxHeight?: number;
}

export const RecentFlows: React.FC<RecentFlowsProps> = ({
  recentFlows,
  onFlowSelect,
  onFlowDelete,
  onClearAll,
  showSearch = true,
  showGrouping = true,
  maxHeight,
}) => {
  const { theme } = useThemeContext();
  const { isMobile } = useResponsive();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<RecentFlow['sourceType'] | 'all'>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);

  const getSourceIcon = (sourceType: RecentFlow['sourceType']) => {
    switch (sourceType) {
      case 'url': return <UrlIcon />;
      case 'text': return <TextIcon />;
      case 'pdf': return <PdfIcon />;
      default: return <TextIcon />;
    }
  };

  const getSourceColor = (sourceType: RecentFlow['sourceType']) => {
    switch (sourceType) {
      case 'url': return theme.colors.brand.primary;
      case 'text': return theme.colors.status.success.accent;
      case 'pdf': return theme.colors.status.warning.accent;
      default: return theme.colors.text.secondary;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 5) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const truncateContent = (content: string, maxLength: number = 40) => {
    if (content.length <= maxLength) {return content;}
    return `${content.substring(0, maxLength)  }...`;
  };

  // Filter flows based on search query and type filter
  const filteredFlows = recentFlows.filter(flow => {
    const matchesSearch = !searchQuery || 
      flow.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flow.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flow.sourceContent.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || flow.sourceType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  // Group flows by date if enabled
  const groupedFlows = React.useMemo(() => {
    if (!showGrouping) {
      return { 'All Recent Flows': filteredFlows };
    }

    const groups: { [key: string]: RecentFlow[] } = {};
    const now = new Date();
    
    filteredFlows.forEach(flow => {
      const flowDate = new Date(flow.timestamp);
      const diffInDays = Math.floor((now.getTime() - flowDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let groupKey: string;
      if (diffInDays === 0) {
        groupKey = 'Today';
      } else if (diffInDays === 1) {
        groupKey = 'Yesterday';
      } else if (diffInDays <= 7) {
        groupKey = 'This week';
      } else if (diffInDays <= 30) {
        groupKey = 'This month';
      } else {
        groupKey = 'Older';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(flow);
    });
    
    return groups;
  }, [filteredFlows, showGrouping]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, flowId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedFlowId(flowId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedFlowId(null);
  };

  const handleDelete = () => {
    if (selectedFlowId) {
      onFlowDelete(selectedFlowId);
    }
    handleMenuClose();
  };

  if (recentFlows.length === 0) {
    return (
      <Card sx={{ 
        backgroundColor: theme.colors.background.secondary,
        border: `1px solid ${theme.colors.surface.border.default}`,
        borderRadius: theme.borderRadius.lg,
        p: 3,
        textAlign: 'center',
      }}>
        <CardContent>
          <TimeIcon sx={{ 
            fontSize: 48, 
            color: theme.colors.text.quaternary,
            mb: 2 
          }} />
          <Typography sx={{
            color: theme.colors.text.secondary,
            fontSize: theme.typography.fontSize.base,
            fontFamily: theme.typography.fontFamily.primary,
            mb: 1,
          }}>
            No recent flows
          </Typography>
          <Typography sx={{
            color: theme.colors.text.quaternary,
            fontSize: theme.typography.fontSize.sm,
            fontFamily: theme.typography.fontFamily.primary,
          }}>
            Your recently analyzed threats will appear here
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search and filters */}
      {showSearch && (
        <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recent flows..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: theme.colors.text.tertiary }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchQuery('')}
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
            sx={{ flex: 1 }}
          />
          
          {!isMobile && (
            <Chip
              icon={<FilterIcon />}
              label={filterType === 'all' ? 'All' : filterType.toUpperCase()}
              onClick={(e) => {
                const menu = document.createElement('div');
                // Simple filter cycling for now
                const types: Array<RecentFlow['sourceType'] | 'all'> = ['all', 'url', 'text', 'pdf'];
                const currentIndex = types.indexOf(filterType);
                const nextIndex = (currentIndex + 1) % types.length;
                setFilterType(types[nextIndex]);
              }}
              sx={{
                backgroundColor: filterType === 'all' 
                  ? theme.colors.surface.subtle 
                  : theme.colors.brand.light,
                color: filterType === 'all' 
                  ? theme.colors.text.tertiary 
                  : theme.colors.brand.primary,
                border: `1px solid ${
                  filterType === 'all' 
                    ? theme.colors.surface.border.default 
                    : theme.colors.brand.primary
                }40`,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                },
              }}
            />
          )}
        </Box>
      )}

      {/* Clear all button */}
      {filteredFlows.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="small"
            onClick={onClearAll}
            sx={{
              color: theme.colors.status.error.text,
              '&:hover': {
                backgroundColor: theme.colors.status.error.bg,
              },
            }}
          >
            Clear all
          </Button>
        </Box>
      )}

      {/* Recent flows list */}
      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto',
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
      }}>
        {Object.entries(groupedFlows).map(([groupName, flows]) => (
          flows.length > 0 && (
            <Box key={groupName} sx={{ mb: 2 }}>
              {showGrouping && Object.keys(groupedFlows).length > 1 && (
                <Typography
                  variant="overline"
                  sx={{
                    color: theme.colors.text.tertiary,
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.semibold,
                    letterSpacing: theme.typography.letterSpacing.wide,
                    textTransform: 'uppercase',
                    px: 2,
                    py: 1,
                    display: 'block',
                  }}
                >
                  {groupName}
                </Typography>
              )}
              
              <List sx={{ py: 0 }}>
                {flows.map((flow, index) => (
                  <ListItem
                    key={flow.id}
                    button
                    onClick={() => onFlowSelect(flow)}
                    sx={{
                      borderRadius: theme.borderRadius.md,
                      mb: 0.5,
                      mx: 1,
                      backgroundColor: 'transparent',
                      border: '1px solid transparent',
                      '&:hover': {
                        backgroundColor: theme.colors.surface.hover,
                        border: `1px solid ${theme.colors.surface.border.default}`,
                      },
                      transition: theme.motion.fast,
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: getSourceColor(flow.sourceType),
                        minWidth: 40,
                      }}
                    >
                      {getSourceIcon(flow.sourceType)}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography
                            sx={{
                              color: theme.colors.text.primary,
                              fontSize: theme.typography.fontSize.base,
                              fontWeight: theme.typography.fontWeight.medium,
                              fontFamily: theme.typography.fontFamily.primary,
                            }}
                          >
                            {flow.title}
                          </Typography>
                          {flow.tags && flow.tags.length > 0 && (
                            <Chip
                              label={flow.tags[0]}
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: theme.typography.fontSize.xs,
                                backgroundColor: `${getSourceColor(flow.sourceType)}20`,
                                color: getSourceColor(flow.sourceType),
                                border: `1px solid ${getSourceColor(flow.sourceType)}40`,
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography
                            sx={{
                              color: theme.colors.text.tertiary,
                              fontSize: theme.typography.fontSize.sm,
                              fontFamily: theme.typography.fontFamily.primary,
                              mb: 0.5,
                            }}
                          >
                            {truncateContent(flow.sourceContent)}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography
                              sx={{
                                color: theme.colors.text.quaternary,
                                fontSize: theme.typography.fontSize.xs,
                                fontFamily: theme.typography.fontFamily.mono,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              <TimeIcon fontSize="inherit" />
                              {formatTimestamp(flow.timestamp)}
                            </Typography>
                            {(flow.nodeCount || flow.edgeCount) && (
                              <Typography
                                sx={{
                                  color: theme.colors.text.quaternary,
                                  fontSize: theme.typography.fontSize.xs,
                                  fontFamily: theme.typography.fontFamily.mono,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                }}
                              >
                                <NodesIcon fontSize="inherit" />
                                {flow.nodeCount || 0} nodes
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Tooltip title="More options">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, flow.id)}
                          sx={{
                            color: theme.colors.text.tertiary,
                            '&:hover': {
                              color: theme.colors.text.primary,
                              backgroundColor: theme.colors.surface.hover,
                            },
                          }}
                        >
                          <MoreIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              
              {index < Object.keys(groupedFlows).length - 1 && (
                <Divider sx={{ 
                  mx: 2, 
                  my: 1,
                  borderColor: theme.colors.surface.border.subtle 
                }} />
              )}
            </Box>
          )
        ))}
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: theme.colors.background.secondary,
            border: `1px solid ${theme.colors.surface.border.default}`,
            borderRadius: theme.borderRadius.md,
            minWidth: 150,
          },
        }}
      >
        <MenuItem
          onClick={handleDelete}
          sx={{
            color: theme.colors.status.error.text,
            '&:hover': {
              backgroundColor: theme.colors.status.error.bg,
            },
          }}
        >
          <DeleteIcon sx={{ mr: 1, fontSize: 16 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};