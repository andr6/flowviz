/**
 * Enhanced Breadcrumb Navigation with Flow History
 * Advanced breadcrumb system with navigation history and flow context
 */
import {
  NavigateNext as NavigateNextIcon,
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  Assignment as AssignmentIcon,
  History as HistoryIcon,
  Bookmark as BookmarkIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  MoreHoriz as MoreHorizIcon,
  FlowChart as FlowIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  Breadcrumbs,
  Link,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Avatar,
  Divider,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import React, { useState, useEffect, useCallback } from 'react';

// Breadcrumb item interface
export interface BreadcrumbItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ElementType;
  metadata?: {
    flowId?: string;
    analysisType?: string;
    createdAt?: Date;
    status?: string;
    tags?: string[];
  };
  onClick?: () => void;
}

// Navigation history item
interface HistoryItem {
  id: string;
  breadcrumb: BreadcrumbItem;
  timestamp: Date;
  visitCount: number;
  lastVisited: Date;
}

interface EnhancedBreadcrumbProps {
  items: BreadcrumbItem[];
  maxItems?: number;
  showHistory?: boolean;
  showBookmarks?: boolean;
  onNavigate?: (item: BreadcrumbItem) => void;
  onBookmark?: (item: BreadcrumbItem) => void;
  className?: string;
}

export const EnhancedBreadcrumb: React.FC<EnhancedBreadcrumbProps> = ({
  items = [],
  maxItems = 4,
  showHistory = true,
  showBookmarks = true,
  onNavigate,
  onBookmark,
  className,
}) => {
  const theme = useTheme();
  const [navigationHistory, setNavigationHistory] = useState<HistoryItem[]>([]);
  const [bookmarkedItems, setBookmarkedItems] = useState<BreadcrumbItem[]>([]);
  const [historyMenuAnchor, setHistoryMenuAnchor] = useState<null | HTMLElement>(null);
  const [bookmarkMenuAnchor, setBookmarkMenuAnchor] = useState<null | HTMLElement>(null);
  const [overflowMenuAnchor, setOverflowMenuAnchor] = useState<null | HTMLElement>(null);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  // Load history and bookmarks from localStorage
  useEffect(() => {
    const storedHistory = localStorage.getItem('threatflow-navigation-history');
    const storedBookmarks = localStorage.getItem('threatflow-bookmarks');
    
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
          lastVisited: new Date(item.lastVisited),
        }));
        setNavigationHistory(parsed);
      } catch (error) {
        console.warn('Failed to parse navigation history:', error);
      }
    }

    if (storedBookmarks) {
      try {
        const parsed = JSON.parse(storedBookmarks).map((item: any) => ({
          ...item,
          metadata: item.metadata ? {
            ...item.metadata,
            createdAt: item.metadata.createdAt ? new Date(item.metadata.createdAt) : undefined,
          } : undefined,
        }));
        setBookmarkedItems(parsed);
      } catch (error) {
        console.warn('Failed to parse bookmarks:', error);
      }
    }
  }, []);

  // Save to localStorage whenever history or bookmarks change
  useEffect(() => {
    localStorage.setItem('threatflow-navigation-history', JSON.stringify(navigationHistory));
  }, [navigationHistory]);

  useEffect(() => {
    localStorage.setItem('threatflow-bookmarks', JSON.stringify(bookmarkedItems));
  }, [bookmarkedItems]);

  // Add current breadcrumb to history
  useEffect(() => {
    if (items.length === 0) {return;}

    const currentItem = items[items.length - 1];
    const now = new Date();

    setNavigationHistory(prev => {
      const existingIndex = prev.findIndex(h => h.breadcrumb.path === currentItem.path);
      
      if (existingIndex >= 0) {
        // Update existing item
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          visitCount: updated[existingIndex].visitCount + 1,
          lastVisited: now,
        };
        return updated;
      } else {
        // Add new item
        const newItem: HistoryItem = {
          id: `history-${Date.now()}`,
          breadcrumb: currentItem,
          timestamp: now,
          visitCount: 1,
          lastVisited: now,
        };
        
        // Keep only last 50 items
        return [newItem, ...prev].slice(0, 50);
      }
    });
  }, [items]);

  // Handle navigation
  const handleNavigation = useCallback((item: BreadcrumbItem) => {
    if (onNavigate) {
      onNavigate(item);
    } else if (item.onClick) {
      item.onClick();
    }
  }, [onNavigate]);

  // Handle bookmark toggle
  const handleBookmarkToggle = useCallback((item: BreadcrumbItem) => {
    const isBookmarked = bookmarkedItems.some(b => b.path === item.path);
    
    if (isBookmarked) {
      setBookmarkedItems(prev => prev.filter(b => b.path !== item.path));
    } else {
      setBookmarkedItems(prev => [...prev, item]);
      if (onBookmark) {
        onBookmark(item);
      }
    }
  }, [bookmarkedItems, onBookmark]);

  // Browser-style navigation
  const canGoBack = currentHistoryIndex < navigationHistory.length - 1;
  const canGoForward = currentHistoryIndex > 0;

  const goBack = useCallback(() => {
    if (canGoBack) {
      const newIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(newIndex);
      const historyItem = navigationHistory[newIndex];
      if (historyItem) {
        handleNavigation(historyItem.breadcrumb);
      }
    }
  }, [canGoBack, currentHistoryIndex, navigationHistory, handleNavigation]);

  const goForward = useCallback(() => {
    if (canGoForward) {
      const newIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(newIndex);
      const historyItem = navigationHistory[newIndex];
      if (historyItem) {
        handleNavigation(historyItem.breadcrumb);
      }
    }
  }, [canGoForward, currentHistoryIndex, navigationHistory, handleNavigation]);

  // Get icon for breadcrumb item based on path
  const getItemIcon = (item: BreadcrumbItem) => {
    if (item.icon) {return item.icon;}
    
    if (item.path === '/' || item.path === '/dashboard') {return DashboardIcon;}
    if (item.path.includes('/analysis')) {return FlowIcon;}
    if (item.path.includes('/investigation')) {return AssignmentIcon;}
    if (item.path.includes('/settings')) {return SettingsIcon;}
    if (item.path.includes('/analytics')) {return AnalyticsIcon;}
    
    return SecurityIcon;
  };

  // Format timestamp for display
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  };

  // Determine which items to show and which to overflow
  const visibleItems = items.slice(-maxItems);
  const overflowItems = items.length > maxItems ? items.slice(0, items.length - maxItems) : [];

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} className={className}>
      {/* Browser-style navigation buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
        <Tooltip title="Go back">
          <IconButton
            size="small"
            onClick={goBack}
            disabled={!canGoBack}
            sx={{ 
              width: 28, 
              height: 28,
              color: canGoBack ? 'primary.main' : 'text.disabled'
            }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Go forward">
          <IconButton
            size="small"
            onClick={goForward}
            disabled={!canGoForward}
            sx={{ 
              width: 28, 
              height: 28,
              color: canGoForward ? 'primary.main' : 'text.disabled'
            }}
          >
            <ArrowForwardIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
      </Box>

      {/* Main breadcrumb navigation */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ flexGrow: 1 }}
      >
        {/* Overflow indicator */}
        {overflowItems.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title={`${overflowItems.length} more items`}>
              <IconButton
                size="small"
                onClick={(e) => setOverflowMenuAnchor(e.currentTarget)}
                sx={{ width: 24, height: 24, mr: 0.5 }}
              >
                <MoreHorizIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Visible breadcrumb items */}
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1;
          const IconComponent = getItemIcon(item);
          const isBookmarked = bookmarkedItems.some(b => b.path === item.path);

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {isLast ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Avatar sx={{ width: 20, height: 20, bgcolor: 'primary.main' }}>
                      <IconComponent sx={{ fontSize: 12 }} />
                    </Avatar>
                    <Typography 
                      variant="body2" 
                      color="text.primary"
                      sx={{ fontWeight: 600 }}
                    >
                      {item.label}
                    </Typography>
                    {item.metadata?.status && (
                      <Chip
                        label={item.metadata.status}
                        size="small"
                        color={item.metadata.status === 'active' ? 'success' : 'default'}
                        sx={{ height: 20, fontSize: '0.7rem', ml: 0.5 }}
                      />
                    )}
                    {showBookmarks && (
                      <Tooltip title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBookmarkToggle(item);
                          }}
                          sx={{ 
                            width: 20, 
                            height: 20, 
                            ml: 0.5,
                            color: isBookmarked ? 'warning.main' : 'text.secondary',
                            '&:hover': {
                              color: 'warning.main',
                            }
                          }}
                        >
                          <BookmarkIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                ) : (
                  <Link
                    component="button"
                    variant="body2"
                    color="text.secondary"
                    onClick={() => handleNavigation(item)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                        color: 'primary.main',
                      },
                    }}
                  >
                    <Avatar sx={{ width: 16, height: 16, bgcolor: 'text.secondary' }}>
                      <IconComponent sx={{ fontSize: 10 }} />
                    </Avatar>
                    {item.label}
                  </Link>
                )}
              </Box>
            </motion.div>
          );
        })}
      </Breadcrumbs>

      {/* Action buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
        {showHistory && (
          <Tooltip title="Navigation history">
            <IconButton
              size="small"
              onClick={(e) => setHistoryMenuAnchor(e.currentTarget)}
              sx={{ width: 28, height: 28 }}
            >
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {showBookmarks && bookmarkedItems.length > 0 && (
          <Tooltip title="Bookmarks">
            <IconButton
              size="small"
              onClick={(e) => setBookmarkMenuAnchor(e.currentTarget)}
              sx={{ width: 28, height: 28 }}
            >
              <BookmarkIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Overflow menu */}
      <Menu
        anchorEl={overflowMenuAnchor}
        open={Boolean(overflowMenuAnchor)}
        onClose={() => setOverflowMenuAnchor(null)}
        PaperProps={{ sx: { minWidth: 250 } }}
      >
        {overflowItems.map((item) => {
          const IconComponent = getItemIcon(item);
          return (
            <MenuItem
              key={item.id}
              onClick={() => {
                handleNavigation(item);
                setOverflowMenuAnchor(null);
              }}
            >
              <ListItemIcon>
                <IconComponent fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                secondary={item.metadata?.analysisType}
              />
            </MenuItem>
          );
        })}
      </Menu>

      {/* History menu */}
      <Menu
        anchorEl={historyMenuAnchor}
        open={Boolean(historyMenuAnchor)}
        onClose={() => setHistoryMenuAnchor(null)}
        PaperProps={{ sx: { minWidth: 300, maxHeight: 400 } }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            RECENT NAVIGATION ({navigationHistory.length})
          </Typography>
        </Box>
        {navigationHistory.slice(0, 10).map((historyItem, index) => {
          const IconComponent = getItemIcon(historyItem.breadcrumb);
          return (
            <MenuItem
              key={historyItem.id}
              onClick={() => {
                handleNavigation(historyItem.breadcrumb);
                setHistoryMenuAnchor(null);
              }}
              sx={{ py: 1 }}
            >
              <ListItemIcon>
                <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                  <IconComponent sx={{ fontSize: 12 }} />
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={historyItem.breadcrumb.label}
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatTimestamp(historyItem.lastVisited)}
                    </Typography>
                    <Chip
                      label={`${historyItem.visitCount} visits`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 16, fontSize: '0.6rem' }}
                    />
                  </Box>
                }
              />
            </MenuItem>
          );
        })}
        {navigationHistory.length === 0 && (
          <MenuItem disabled>
            <ListItemText primary="No navigation history" />
          </MenuItem>
        )}
      </Menu>

      {/* Bookmarks menu */}
      <Menu
        anchorEl={bookmarkMenuAnchor}
        open={Boolean(bookmarkMenuAnchor)}
        onClose={() => setBookmarkMenuAnchor(null)}
        PaperProps={{ sx: { minWidth: 300, maxHeight: 400 } }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            BOOKMARKS ({bookmarkedItems.length})
          </Typography>
        </Box>
        {bookmarkedItems.map((item) => {
          const IconComponent = getItemIcon(item);
          return (
            <MenuItem
              key={item.id}
              onClick={() => {
                handleNavigation(item);
                setBookmarkMenuAnchor(null);
              }}
              sx={{ py: 1 }}
            >
              <ListItemIcon>
                <Avatar sx={{ width: 24, height: 24, bgcolor: 'warning.main' }}>
                  <IconComponent sx={{ fontSize: 12 }} />
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                secondary={
                  item.metadata?.tags && (
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                      {item.metadata.tags.slice(0, 2).map(tag => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          variant="outlined"
                          sx={{ height: 16, fontSize: '0.6rem' }}
                        />
                      ))}
                    </Box>
                  )
                }
              />
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBookmarkToggle(item);
                }}
                sx={{ ml: 1 }}
              >
                <BookmarkIcon fontSize="small" color="warning" />
              </IconButton>
            </MenuItem>
          );
        })}
        {bookmarkedItems.length === 0 && (
          <MenuItem disabled>
            <ListItemText primary="No bookmarks yet" />
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default EnhancedBreadcrumb;