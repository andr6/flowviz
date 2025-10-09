import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Chip,
  TextField,
  Button,
  Menu,
  MenuItem,
  Divider,
  Paper,
  Card,
  CardContent,
  CardActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Autocomplete,
  Avatar,
  Badge,
  Tooltip,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Fade,
  Collapse,
  Alert
} from '@mui/material';
import {
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
  Assessment as AnalysisIcon,
  Public as FlowIcon,
  CreateNewFolder as CreateFolderIcon,
  Share as ShareIcon,
  Download as ExportIcon,
  Upload as ImportIcon,
  Clear as ClearIcon,
  Analytics as StatsIcon
} from '@mui/icons-material';

import { bookmarkService, Bookmark, BookmarkFolder } from '../../services/bookmarks/BookmarkService';

interface BookmarkManagerProps {
  open: boolean;
  onClose: () => void;
  onBookmarkSelect?: (bookmark: Bookmark) => void;
  initialTab?: 'bookmarks' | 'folders' | 'stats';
}

const BookmarkManager: React.FC<BookmarkManagerProps> = ({
  open,
  onClose,
  onBookmarkSelect,
  initialTab = 'bookmarks'
}) => {
  const [currentTab, setCurrentTab] = useState(initialTab);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'type' | 'access'>('date');
  const [filterType, setFilterType] = useState<string>('all');
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedBookmarks, setSelectedBookmarks] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    bookmarkId?: string;
    folderId?: string;
  } | null>(null);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [editingFolder, setEditingFolder] = useState<BookmarkFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [statistics, setStatistics] = useState<any>(null);

  // Load data on mount
  useEffect(() => {
    loadBookmarks();
    loadFolders();
    loadStatistics();
  }, []);

  const loadBookmarks = () => {
    setBookmarks(bookmarkService.getAllBookmarks());
  };

  const loadFolders = () => {
    setFolders(bookmarkService.getAllFolders());
  };

  const loadStatistics = () => {
    setStatistics(bookmarkService.getStatistics());
  };

  // Filter and sort bookmarks
  const filteredBookmarks = useMemo(() => {
    let filtered = selectedFolder 
      ? bookmarkService.getBookmarksByFolder(selectedFolder)
      : bookmarks;

    // Apply search filter
    if (searchQuery) {
      filtered = bookmarkService.searchBookmarks(searchQuery, {
        type: filterType === 'all' ? undefined : filterType as Bookmark['type']
      });
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(bookmark => bookmark.type === filterType);
    }

    // Apply favorites filter
    if (showFavorites) {
      filtered = filtered.filter(bookmark => bookmark.metadata.isFavorite);
    }

    // Sort bookmarks
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'access':
          return b.metadata.accessCount - a.metadata.accessCount;
        case 'date':
        default:
          return b.metadata.updatedAt.getTime() - a.metadata.updatedAt.getTime();
      }
    });

    return filtered;
  }, [bookmarks, selectedFolder, searchQuery, filterType, showFavorites, sortBy]);

  const handleContextMenu = (event: React.MouseEvent, bookmarkId?: string, folderId?: string) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      bookmarkId,
      folderId,
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleToggleFavorite = (bookmarkId: string) => {
    bookmarkService.toggleFavorite(bookmarkId);
    loadBookmarks();
  };

  const handleDeleteBookmark = (bookmarkId: string) => {
    bookmarkService.deleteBookmark(bookmarkId);
    loadBookmarks();
    setSelectedBookmarks(prev => {
      const newSet = new Set(prev);
      newSet.delete(bookmarkId);
      return newSet;
    });
  };

  const handleEditBookmark = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
  };

  const handleSaveBookmark = (updates: Partial<Bookmark>) => {
    if (editingBookmark) {
      bookmarkService.updateBookmark(editingBookmark.id, updates);
      setEditingBookmark(null);
      loadBookmarks();
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      bookmarkService.createFolder(newFolderName.trim(), {
        color: '#3b82f6'
      });
      setNewFolderName('');
      loadFolders();
    }
  };

  const handleDeleteFolder = (folderId: string) => {
    bookmarkService.deleteFolder(folderId);
    loadFolders();
    if (selectedFolder === folderId) {
      setSelectedFolder(null);
    }
  };

  const handleBookmarkClick = (bookmark: Bookmark) => {
    onBookmarkSelect?.(bookmark);
    onClose();
  };

  const getBookmarkIcon = (type: Bookmark['type']) => {
    switch (type) {
      case 'node':
        return <TimelineIcon />;
      case 'flow':
        return <FlowIcon />;
      case 'search':
        return <SearchIcon />;
      case 'analysis':
        return <AnalysisIcon />;
      default:
        return <BookmarkIcon />;
    }
  };

  const getTypeColor = (type: Bookmark['type']) => {
    switch (type) {
      case 'node':
        return '#06b6d4';
      case 'flow':
        return '#3b82f6';
      case 'search':
        return '#f59e0b';
      case 'analysis':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderBookmarkCard = (bookmark: Bookmark) => (
    <Card
      key={bookmark.id}
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderColor: getTypeColor(bookmark.type),
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px rgba(0, 0, 0, 0.3)`
        }
      }}
      onClick={() => handleBookmarkClick(bookmark)}
      onContextMenu={(e) => handleContextMenu(e, bookmark.id)}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Avatar
            sx={{
              backgroundColor: `${getTypeColor(bookmark.type)}20`,
              color: getTypeColor(bookmark.type),
              width: 40,
              height: 40
            }}
          >
            {getBookmarkIcon(bookmark.type)}
          </Avatar>
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography
                variant="h6"
                sx={{
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '1rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1
                }}
              >
                {bookmark.title}
              </Typography>
              
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(bookmark.id);
                }}
                sx={{ color: bookmark.metadata.isFavorite ? '#fbbf24' : 'rgba(255, 255, 255, 0.5)' }}
              >
                {bookmark.metadata.isFavorite ? <StarIcon /> : <StarBorderIcon />}
              </IconButton>
            </Box>
            
            {bookmark.description && (
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.875rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  mb: 1
                }}
              >
                {bookmark.description}
              </Typography>
            )}
            
            {bookmark.preview && (
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '0.75rem',
                  display: 'block',
                  mb: 1
                }}
              >
                {bookmark.preview.summary}
              </Typography>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip
                label={bookmark.type}
                size="small"
                sx={{
                  backgroundColor: `${getTypeColor(bookmark.type)}20`,
                  color: getTypeColor(bookmark.type),
                  fontSize: '0.75rem',
                  height: 20
                }}
              />
              
              {bookmark.metadata.tags.slice(0, 2).map(tag => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    fontSize: '0.75rem',
                    height: 20
                  }}
                />
              ))}
              
              {bookmark.metadata.tags.length > 2 && (
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                >
                  +{bookmark.metadata.tags.length - 2} more
                </Typography>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
              >
                {formatDate(bookmark.metadata.updatedAt)}
              </Typography>
              
              {bookmark.metadata.accessCount > 0 && (
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                >
                  {bookmark.metadata.accessCount} views
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const renderBookmarkList = (bookmark: Bookmark) => (
    <ListItem
      key={bookmark.id}
      button
      onClick={() => handleBookmarkClick(bookmark)}
      onContextMenu={(e) => handleContextMenu(e, bookmark.id)}
      sx={{
        borderRadius: '8px',
        mb: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderColor: getTypeColor(bookmark.type)
        }
      }}
    >
      <ListItemIcon>
        <Avatar
          sx={{
            backgroundColor: `${getTypeColor(bookmark.type)}20`,
            color: getTypeColor(bookmark.type),
            width: 32,
            height: 32
          }}
        >
          {getBookmarkIcon(bookmark.type)}
        </Avatar>
      </ListItemIcon>
      
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ color: '#fff', fontWeight: 500 }}>
              {bookmark.title}
            </Typography>
            {bookmark.metadata.isFavorite && (
              <StarIcon sx={{ color: '#fbbf24', fontSize: 16 }} />
            )}
          </Box>
        }
        secondary={
          <Box>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255, 255, 255, 0.7)', display: 'block' }}
            >
              {bookmark.description || bookmark.preview?.summary}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
              <Chip
                label={bookmark.type}
                size="small"
                sx={{
                  backgroundColor: `${getTypeColor(bookmark.type)}20`,
                  color: getTypeColor(bookmark.type),
                  fontSize: '0.7rem',
                  height: 18
                }}
              />
              {bookmark.metadata.tags.slice(0, 3).map(tag => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    fontSize: '0.7rem',
                    height: 18
                  }}
                />
              ))}
            </Box>
          </Box>
        }
      />
      
      <ListItemSecondaryAction>
        <Typography
          variant="caption"
          sx={{ color: 'rgba(255, 255, 255, 0.5)', mr: 1 }}
        >
          {formatDate(bookmark.metadata.updatedAt)}
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFavorite(bookmark.id);
          }}
        >
          {bookmark.metadata.isFavorite ? <StarIcon /> : <StarBorderIcon />}
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'rgba(13, 17, 23, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.8)',
          maxHeight: '90vh'
        }
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        pb: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BookmarkIcon sx={{ color: '#ec4899' }} />
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
            Bookmark Manager
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={viewMode === 'list' ? 'Grid View' : 'List View'}>
            <IconButton
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              {viewMode === 'list' ? <GridViewIcon /> : <ListViewIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <Tabs
          value={currentTab}
          onChange={(_, value) => setCurrentTab(value)}
          sx={{
            '& .MuiTabs-indicator': { backgroundColor: '#ec4899' },
            '& .MuiTab-root': { color: 'rgba(255, 255, 255, 0.7)' },
            '& .Mui-selected': { color: '#ec4899' }
          }}
        >
          <Tab label="Bookmarks" value="bookmarks" />
          <Tab label="Folders" value="folders" />
          <Tab label="Statistics" value="stats" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {currentTab === 'bookmarks' && (
          <Box sx={{ display: 'flex', height: 'calc(90vh - 200px)' }}>
            {/* Sidebar */}
            <Box sx={{ 
              width: 250, 
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              p: 2
            }}>
              {/* Search */}
              <TextField
                fullWidth
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.5)', mr: 1 }} />
                }}
                sx={{
                  mb: 2,
                  '& .MuiInputBase-input': { color: '#fff' },
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' }
                  }
                }}
              />

              {/* Filters */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Type</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.2)'
                    }
                  }}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="node">Nodes</MenuItem>
                  <MenuItem value="flow">Flows</MenuItem>
                  <MenuItem value="search">Searches</MenuItem>
                  <MenuItem value="analysis">Analysis</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Sort by</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.2)'
                    }
                  }}
                >
                  <MenuItem value="date">Date Modified</MenuItem>
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="type">Type</MenuItem>
                  <MenuItem value="access">Most Accessed</MenuItem>
                </Select>
              </FormControl>

              {/* Folders */}
              <Typography
                variant="subtitle2"
                sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 1 }}
              >
                Folders
              </Typography>
              
              <List dense>
                <ListItem
                  button
                  selected={selectedFolder === null}
                  onClick={() => setSelectedFolder(null)}
                  sx={{
                    borderRadius: '6px',
                    mb: 0.5,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(236, 72, 153, 0.2)'
                    }
                  }}
                >
                  <ListItemIcon>
                    <FolderIcon sx={{ color: '#6b7280' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="All Bookmarks"
                    primaryTypographyProps={{
                      color: '#fff',
                      fontSize: '0.875rem'
                    }}
                  />
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    {bookmarks.length}
                  </Typography>
                </ListItem>
                
                {folders.map(folder => (
                  <ListItem
                    key={folder.id}
                    button
                    selected={selectedFolder === folder.id}
                    onClick={() => setSelectedFolder(folder.id)}
                    onContextMenu={(e) => handleContextMenu(e, undefined, folder.id)}
                    sx={{
                      borderRadius: '6px',
                      mb: 0.5,
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(236, 72, 153, 0.2)'
                      }
                    }}
                  >
                    <ListItemIcon>
                      <FolderIcon sx={{ color: folder.color }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={folder.name}
                      primaryTypographyProps={{
                        color: '#fff',
                        fontSize: '0.875rem'
                      }}
                    />
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      {folder.bookmarks.length}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* Main Content */}
            <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#fff' }}>
                  {selectedFolder 
                    ? folders.find(f => f.id === selectedFolder)?.name 
                    : 'All Bookmarks'
                  } ({filteredBookmarks.length})
                </Typography>
                
                <Button
                  variant="outlined"
                  startIcon={showFavorites ? <StarIcon /> : <StarBorderIcon />}
                  onClick={() => setShowFavorites(!showFavorites)}
                  sx={{
                    borderColor: showFavorites ? '#fbbf24' : 'rgba(255, 255, 255, 0.3)',
                    color: showFavorites ? '#fbbf24' : 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  {showFavorites ? 'All' : 'Favorites'}
                </Button>
              </Box>

              {filteredBookmarks.length === 0 ? (
                <Paper sx={{ 
                  p: 4, 
                  textAlign: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <BookmarkBorderIcon sx={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.3)', mb: 2 }} />
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    No bookmarks found
                  </Typography>
                </Paper>
              ) : viewMode === 'grid' ? (
                <Grid container spacing={2}>
                  {filteredBookmarks.map(bookmark => (
                    <Grid item xs={12} sm={6} md={4} key={bookmark.id}>
                      {renderBookmarkCard(bookmark)}
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <List>
                  {filteredBookmarks.map(renderBookmarkList)}
                </List>
              )}
            </Box>
          </Box>
        )}

        {currentTab === 'folders' && (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                placeholder="New folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                sx={{
                  flex: 1,
                  '& .MuiInputBase-input': { color: '#fff' },
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' }
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                sx={{ backgroundColor: '#ec4899' }}
              >
                Create Folder
              </Button>
            </Box>

            <Grid container spacing={2}>
              {folders.map(folder => (
                <Grid item xs={12} sm={6} md={4} key={folder.id}>
                  <Card sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px'
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <FolderIcon sx={{ color: folder.color, fontSize: 32 }} />
                        <Box>
                          <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                            {folder.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            {folder.bookmarks.length} bookmarks
                          </Typography>
                        </Box>
                      </Box>
                      
                      {folder.description && (
                        <Typography
                          variant="body2"
                          sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}
                        >
                          {folder.description}
                        </Typography>
                      )}
                    </CardContent>
                    
                    <CardActions>
                      <Button size="small" onClick={() => setSelectedFolder(folder.id)}>
                        View
                      </Button>
                      <Button size="small" onClick={() => setEditingFolder(folder)}>
                        Edit
                      </Button>
                      <Button 
                        size="small" 
                        color="error" 
                        onClick={() => handleDeleteFolder(folder.id)}
                      >
                        Delete
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {currentTab === 'stats' && statistics && (
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ 
                  p: 3, 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px'
                }}>
                  <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
                    Overview
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Total Bookmarks
                      </Typography>
                      <Typography sx={{ color: '#4ade80', fontWeight: 600 }}>
                        {statistics.total}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Favorites
                      </Typography>
                      <Typography sx={{ color: '#fbbf24', fontWeight: 600 }}>
                        {statistics.favorites}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Folders
                      </Typography>
                      <Typography sx={{ color: '#3b82f6', fontWeight: 600 }}>
                        {statistics.folders}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Tags
                      </Typography>
                      <Typography sx={{ color: '#8b5cf6', fontWeight: 600 }}>
                        {statistics.tags}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ 
                  p: 3, 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px'
                }}>
                  <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
                    By Type
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {Object.entries(statistics.byType).map(([type, count]) => (
                      <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getBookmarkIcon(type as Bookmark['type'])}
                          <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Typography>
                        </Box>
                        <Typography sx={{ color: getTypeColor(type as Bookmark['type']), fontWeight: 600 }}>
                          {count}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(13, 17, 23, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px'
          }
        }}
      >
        {contextMenu?.bookmarkId && (
          [
            <MenuItem
              key="edit"
              onClick={() => {
                const bookmark = bookmarks.find(b => b.id === contextMenu.bookmarkId);
                if (bookmark) handleEditBookmark(bookmark);
                handleContextMenuClose();
              }}
              sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
            >
              <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>,
            <MenuItem
              key="delete"
              onClick={() => {
                if (contextMenu.bookmarkId) handleDeleteBookmark(contextMenu.bookmarkId);
                handleContextMenuClose();
              }}
              sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
            >
              <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          ]
        )}
        
        {contextMenu?.folderId && (
          [
            <MenuItem
              key="edit-folder"
              onClick={() => {
                const folder = folders.find(f => f.id === contextMenu.folderId);
                if (folder) setEditingFolder(folder);
                handleContextMenuClose();
              }}
              sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
            >
              <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Edit Folder</ListItemText>
            </MenuItem>,
            <MenuItem
              key="delete-folder"
              onClick={() => {
                if (contextMenu.folderId) handleDeleteFolder(contextMenu.folderId);
                handleContextMenuClose();
              }}
              sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
            >
              <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Delete Folder</ListItemText>
            </MenuItem>
          ]
        )}
      </Menu>
    </Dialog>
  );
};

export default BookmarkManager;