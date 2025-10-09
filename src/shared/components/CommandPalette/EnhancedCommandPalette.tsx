/**
 * Enhanced Command Palette with Global Search
 * Quick-access system with Cmd+K support for global search and actions
 */
import {
  Search as SearchIcon,
  History as HistoryIcon,
  FlowChart as FlowIcon,
  Security as SecurityIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Assignment as AssignmentIcon,
  Speed as SpeedIcon,
  Psychology as PsychologyIcon,
  ArrowForward as ArrowForwardIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
} from '@mui/icons-material';
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  Box,
  Chip,
  Avatar,
  Divider,
  Badge,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Command and search result types
interface CommandAction {
  id: string;
  title: string;
  description?: string;
  icon: React.ElementType;
  category: 'navigation' | 'analysis' | 'search' | 'settings' | 'recent' | 'help';
  keywords: string[];
  action: () => void;
  shortcut?: string;
  badge?: string | number;
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'flow' | 'investigation' | 'ioc' | 'threat' | 'user' | 'setting';
  icon: React.ElementType;
  timestamp?: Date;
  metadata?: Record<string, any>;
  action: () => void;
  relevanceScore: number;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
  recentFlows?: any[];
  currentUser?: any;
}

// Mock data - in production this would come from various services
const MOCK_COMMANDS: CommandAction[] = [
  {
    id: 'nav-dashboard',
    title: 'Go to Dashboard',
    description: 'View SOC dashboard with real-time metrics',
    icon: DashboardIcon,
    category: 'navigation',
    keywords: ['dashboard', 'home', 'overview', 'metrics'],
    action: () => console.log('Navigate to dashboard'),
  },
  {
    id: 'new-analysis',
    title: 'New Threat Analysis',
    description: 'Start analyzing a new threat or article',
    icon: FlowIcon,
    category: 'analysis',
    keywords: ['new', 'analysis', 'threat', 'flow', 'create'],
    action: () => console.log('Start new analysis'),
    shortcut: '⌘+N',
  },
  {
    id: 'search-iocs',
    title: 'Search IOCs',
    description: 'Search across all indicators of compromise',
    icon: SecurityIcon,
    category: 'search',
    keywords: ['ioc', 'indicators', 'search', 'compromise'],
    action: () => console.log('Search IOCs'),
    shortcut: '⌘+I',
  },
  {
    id: 'threat-hunt',
    title: 'Threat Hunting',
    description: 'Access threat hunting workspace',
    icon: PsychologyIcon,
    category: 'analysis',
    keywords: ['hunt', 'hunting', 'proactive', 'search'],
    action: () => console.log('Open threat hunting'),
  },
  {
    id: 'system-health',
    title: 'System Health',
    description: 'View system performance and health metrics',
    icon: SpeedIcon,
    category: 'navigation',
    keywords: ['health', 'system', 'performance', 'status'],
    action: () => console.log('View system health'),
  },
];

const MOCK_SEARCH_RESULTS: SearchResult[] = [
  {
    id: 'flow-1',
    title: 'APT29 Campaign Analysis',
    description: 'Analysis of sophisticated spear-phishing campaign targeting healthcare sector',
    type: 'flow',
    icon: FlowIcon,
    timestamp: new Date(Date.now() - 3600000),
    metadata: { techniques: 12, severity: 'critical' },
    action: () => console.log('Open flow'),
    relevanceScore: 0.95,
  },
  {
    id: 'investigation-1',
    title: 'Ransomware Incident IR-2024-001',
    description: 'Active investigation into ransomware deployment across network',
    type: 'investigation',
    icon: AssignmentIcon,
    timestamp: new Date(Date.now() - 7200000),
    metadata: { status: 'active', priority: 'high' },
    action: () => console.log('Open investigation'),
    relevanceScore: 0.88,
  },
  {
    id: 'ioc-1',
    title: 'Malicious IP: 185.159.157.88',
    description: 'Command and control server associated with APT group',
    type: 'ioc',
    icon: SecurityIcon,
    timestamp: new Date(Date.now() - 1800000),
    metadata: { type: 'ip', confidence: 'high' },
    action: () => console.log('View IOC'),
    relevanceScore: 0.82,
  },
];

export const EnhancedCommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  onNavigate,
  recentFlows = [],
  currentUser,
}) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [filteredCommands, setFilteredCommands] = useState<CommandAction[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter and search logic
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setFilteredCommands(MOCK_COMMANDS);
      setIsSearchMode(false);
      return;
    }

    setIsSearchMode(true);

    // Filter commands
    const commandMatches = MOCK_COMMANDS.filter(command =>
      command.title.toLowerCase().includes(query.toLowerCase()) ||
      command.description?.toLowerCase().includes(query.toLowerCase()) ||
      command.keywords.some(keyword => keyword.toLowerCase().includes(query.toLowerCase()))
    );

    // Filter search results (simulate API call)
    const resultMatches = MOCK_SEARCH_RESULTS.filter(result =>
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.description.toLowerCase().includes(query.toLowerCase())
    ).sort((a, b) => b.relevanceScore - a.relevanceScore);

    setFilteredCommands(commandMatches);
    setSearchResults(resultMatches);
  }, []);

  // Handle search input changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedIndex(0);
      setSearchResults([]);
      setFilteredCommands(MOCK_COMMANDS);
      setIsSearchMode(false);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const totalItems = isSearchMode 
      ? filteredCommands.length + searchResults.length
      : filteredCommands.length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, totalItems - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        handleItemSelect(selectedIndex);
        break;
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
    }
  }, [selectedIndex, isSearchMode, filteredCommands.length, searchResults.length, onClose]);

  // Handle item selection
  const handleItemSelect = useCallback((index: number) => {
    if (isSearchMode) {
      if (index < filteredCommands.length) {
        filteredCommands[index].action();
      } else {
        const resultIndex = index - filteredCommands.length;
        if (searchResults[resultIndex]) {
          searchResults[resultIndex].action();
        }
      }
    } else {
      if (filteredCommands[index]) {
        filteredCommands[index].action();
      }
    }

    // Add to search history
    if (searchQuery.trim()) {
      setSearchHistory(prev => [
        searchQuery,
        ...prev.filter(h => h !== searchQuery).slice(0, 9)
      ]);
    }

    onClose();
  }, [isSearchMode, filteredCommands, searchResults, searchQuery, onClose]);

  // Get category icon and color
  const getCategoryProps = (category: string) => {
    switch (category) {
      case 'navigation':
        return { icon: DashboardIcon, color: theme.palette.primary.main };
      case 'analysis':
        return { icon: FlowIcon, color: theme.palette.success.main };
      case 'search':
        return { icon: SearchIcon, color: theme.palette.info.main };
      case 'settings':
        return { icon: SettingsIcon, color: theme.palette.grey[600] };
      case 'help':
        return { icon: HelpIcon, color: theme.palette.warning.main };
      default:
        return { icon: ArrowForwardIcon, color: theme.palette.text.secondary };
    }
  };

  // Get result type props
  const getResultTypeProps = (type: string) => {
    switch (type) {
      case 'flow':
        return { color: theme.palette.primary.main, label: 'Flow' };
      case 'investigation':
        return { color: theme.palette.error.main, label: 'Investigation' };
      case 'ioc':
        return { color: theme.palette.warning.main, label: 'IOC' };
      case 'threat':
        return { color: theme.palette.secondary.main, label: 'Threat' };
      case 'user':
        return { color: theme.palette.info.main, label: 'User' };
      default:
        return { color: theme.palette.grey[600], label: 'Item' };
    }
  };

  const allItems = useMemo(() => {
    return isSearchMode 
      ? [...filteredCommands, ...searchResults]
      : filteredCommands;
  }, [isSearchMode, filteredCommands, searchResults]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          mt: '10vh',
          mb: 'auto',
          borderRadius: 2,
          boxShadow: theme.shadows[20],
        },
      }}
      onKeyDown={handleKeyDown}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Search Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            ref={searchInputRef}
            fullWidth
            placeholder="Search flows, investigations, IOCs, or type a command..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              endAdornment: (
                <Chip
                  label="⌘K"
                  size="small"
                  variant="outlined"
                  sx={{ height: 24, fontSize: '0.7rem' }}
                />
              ),
            }}
            variant="outlined"
            size="medium"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
              },
            }}
          />
        </Box>

        {/* Results Area */}
        <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
          {/* Quick Actions Section */}
          {filteredCommands.length > 0 && (
            <>
              <Box sx={{ px: 2, py: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  QUICK ACTIONS
                </Typography>
              </Box>
              <List dense>
                {filteredCommands.map((command, index) => {
                  const categoryProps = getCategoryProps(command.category);
                  const isSelected = index === selectedIndex;
                  
                  return (
                    <motion.div
                      key={command.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ListItem
                        button
                        selected={isSelected}
                        onClick={() => handleItemSelect(index)}
                        sx={{
                          borderRadius: isSelected ? 1 : 0,
                          mx: isSelected ? 1 : 0,
                          my: isSelected ? 0.5 : 0,
                          bgcolor: isSelected ? theme.palette.action.selected : 'transparent',
                        }}
                      >
                        <ListItemIcon>
                          <Avatar 
                            sx={{ 
                              width: 32, 
                              height: 32, 
                              bgcolor: `${categoryProps.color  }20`,
                              color: categoryProps.color 
                            }}
                          >
                            <categoryProps.icon fontSize="small" />
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={command.title}
                          secondary={command.description}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {command.badge && (
                              <Badge badgeContent={command.badge} color="primary">
                                <Box />
                              </Badge>
                            )}
                            {command.shortcut && (
                              <Chip
                                label={command.shortcut}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            )}
                            <KeyboardArrowRightIcon 
                              sx={{ 
                                color: 'text.secondary', 
                                opacity: isSelected ? 1 : 0.5,
                                transition: 'opacity 0.2s'
                              }} 
                            />
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </motion.div>
                  );
                })}
              </List>
            </>
          )}

          {/* Search Results Section */}
          {isSearchMode && searchResults.length > 0 && (
            <>
              <Divider />
              <Box sx={{ px: 2, py: 1, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  SEARCH RESULTS ({searchResults.length})
                </Typography>
              </Box>
              <List dense>
                {searchResults.map((result, index) => {
                  const resultIndex = filteredCommands.length + index;
                  const isSelected = resultIndex === selectedIndex;
                  const typeProps = getResultTypeProps(result.type);
                  
                  return (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ListItem
                        button
                        selected={isSelected}
                        onClick={() => handleItemSelect(resultIndex)}
                        sx={{
                          borderRadius: isSelected ? 1 : 0,
                          mx: isSelected ? 1 : 0,
                          my: isSelected ? 0.5 : 0,
                          bgcolor: isSelected ? theme.palette.action.selected : 'transparent',
                        }}
                      >
                        <ListItemIcon>
                          <Avatar 
                            sx={{ 
                              width: 32, 
                              height: 32, 
                              bgcolor: `${typeProps.color  }20`,
                              color: typeProps.color 
                            }}
                          >
                            <result.icon fontSize="small" />
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {result.title}
                              </Typography>
                              <Chip
                                label={typeProps.label}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.7rem',
                                  bgcolor: `${typeProps.color  }20`,
                                  color: typeProps.color,
                                }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                {result.description}
                              </Typography>
                              {result.timestamp && (
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                  • {result.timestamp.toLocaleString()}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {Math.round(result.relevanceScore * 100)}%
                            </Typography>
                            <KeyboardArrowRightIcon 
                              sx={{ 
                                color: 'text.secondary', 
                                opacity: isSelected ? 1 : 0.5,
                                transition: 'opacity 0.2s'
                              }} 
                            />
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </motion.div>
                  );
                })}
              </List>
            </>
          )}

          {/* Empty State */}
          {searchQuery && allItems.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No results found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try different search terms or browse available commands above
              </Typography>
            </Box>
          )}

          {/* Recent Searches */}
          {!searchQuery && searchHistory.length > 0 && (
            <>
              <Divider />
              <Box sx={{ px: 2, py: 1, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  RECENT SEARCHES
                </Typography>
              </Box>
              <List dense>
                {searchHistory.slice(0, 3).map((query, index) => (
                  <ListItem
                    key={index}
                    button
                    onClick={() => setSearchQuery(query)}
                  >
                    <ListItemIcon>
                      <HistoryIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={query}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ 
          px: 2, 
          py: 1, 
          borderTop: 1, 
          borderColor: 'divider', 
          bgcolor: 'grey.50',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="caption" color="text.secondary">
            Use ↑↓ to navigate, ↵ to select, ESC to close
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label="⌘K" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
            <Typography variant="caption" color="text.secondary">to open</Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedCommandPalette;