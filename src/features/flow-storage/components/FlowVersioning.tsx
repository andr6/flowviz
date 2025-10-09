import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Chip,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  History as VersionIcon,
  Commit as CommitIcon,
  Branch as BranchIcon,
  Tag as TagIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Compare as CompareIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  ExpandMore as ExpandIcon,
  Info as InfoIcon,
  Person as AuthorIcon,
  Schedule as TimeIcon,
  Description as MessageIcon
} from '@mui/icons-material';
import { threatFlowTheme } from '../../../shared/theme/threatflow-theme';
import { flowManagement, FlowVersion, FlowChange } from '../services/FlowManagementService';

interface FlowVersioningProps {
  flowId: string;
  currentNodes: any[];
  currentEdges: any[];
  currentMetadata: any;
  onVersionRestore?: (version: FlowVersion) => void;
  onVersionCompare?: (versionA: string, versionB: string) => void;
  disabled?: boolean;
}

export const FlowVersioning: React.FC<FlowVersioningProps> = ({
  flowId,
  currentNodes,
  currentEdges,
  currentMetadata,
  onVersionRestore,
  onVersionCompare,
  disabled = false
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [versions, setVersions] = useState<FlowVersion[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedVersionForTag, setSelectedVersionForTag] = useState<string>('');
  const [newTags, setNewTags] = useState<string>('');
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  useEffect(() => {
    if (dialogOpen) {
      loadVersions();
    }
  }, [dialogOpen, flowId]);

  const loadVersions = async () => {
    try {
      const history = await flowManagement.getVersionHistory(flowId);
      setVersions(history.reverse()); // Show newest first
    } catch (error) {
      console.error('Failed to load version history:', error);
    }
  };

  const handleCreateVersion = async () => {
    if (!commitMessage.trim()) {
      alert('Please enter a commit message');
      return;
    }

    try {
      await flowManagement.createVersion(
        flowId,
        currentNodes,
        currentEdges,
        currentMetadata,
        commitMessage,
        'current-user' // In real app, get from auth context
      );

      setCommitMessage('');
      setCommitDialogOpen(false);
      loadVersions();
    } catch (error) {
      console.error('Failed to create version:', error);
      alert('Failed to create version');
    }
  };

  const handleVersionSelect = (versionId: string) => {
    if (selectedVersions.includes(versionId)) {
      setSelectedVersions(prev => prev.filter(id => id !== versionId));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions(prev => [...prev, versionId]);
    } else {
      setSelectedVersions([versionId]);
    }
  };

  const handleRestoreVersion = async (version: FlowVersion) => {
    if (window.confirm(`Are you sure you want to restore to version ${version.version}?`)) {
      if (onVersionRestore) {
        onVersionRestore(version);
      }
      setDialogOpen(false);
    }
  };

  const handleCompareVersions = () => {
    if (selectedVersions.length === 2 && onVersionCompare) {
      onVersionCompare(selectedVersions[0], selectedVersions[1]);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (window.confirm('Are you sure you want to delete this version?')) {
      try {
        await flowManagement.deleteVersion(flowId, versionId);
        loadVersions();
      } catch (error) {
        console.error('Failed to delete version:', error);
        alert('Failed to delete version');
      }
    }
  };

  const handleAddTags = async () => {
    if (!selectedVersionForTag || !newTags.trim()) return;

    try {
      const tags = newTags.split(',').map(tag => tag.trim()).filter(Boolean);
      await flowManagement.tagVersion(flowId, selectedVersionForTag, tags);
      setTagDialogOpen(false);
      setNewTags('');
      setSelectedVersionForTag('');
      loadVersions();
    } catch (error) {
      console.error('Failed to add tags:', error);
      alert('Failed to add tags');
    }
  };

  const getChangeTypeColor = (type: FlowChange['type']) => {
    switch (type) {
      case 'added': return threatFlowTheme.colors.accent.secure;
      case 'modified': return threatFlowTheme.colors.status.warning.text;
      case 'deleted': return threatFlowTheme.colors.status.error.text;
      default: return threatFlowTheme.colors.text.tertiary;
    }
  };

  const getChangeTypeIcon = (type: FlowChange['type']) => {
    switch (type) {
      case 'added': return '+';
      case 'modified': return '~';
      case 'deleted': return '-';
      default: return '?';
    }
  };

  const renderChangesSummary = (changes: FlowChange[]) => {
    const summary = changes.reduce((acc, change) => {
      acc[change.type] = (acc[change.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {Object.entries(summary).map(([type, count]) => (
          <Chip
            key={type}
            label={`${getChangeTypeIcon(type as FlowChange['type'])} ${count}`}
            size="small"
            sx={{
              backgroundColor: `${getChangeTypeColor(type as FlowChange['type'])}20`,
              color: getChangeTypeColor(type as FlowChange['type']),
              fontSize: '0.7rem',
              height: 20
            }}
          />
        ))}
      </Box>
    );
  };

  const renderVersionTimeline = () => (
    <Timeline>
      {versions.map((version, index) => (
        <TimelineItem key={version.id}>
          <TimelineSeparator>
            <TimelineDot
              sx={{
                backgroundColor: selectedVersions.includes(version.id)
                  ? threatFlowTheme.colors.brand.primary
                  : threatFlowTheme.colors.surface.border.default,
                cursor: 'pointer'
              }}
              onClick={() => handleVersionSelect(version.id)}
            >
              <CommitIcon sx={{ fontSize: 16 }} />
            </TimelineDot>
            {index < versions.length - 1 && <TimelineConnector />}
          </TimelineSeparator>
          
          <TimelineContent>
            <Paper
              sx={{
                p: 2,
                mb: 2,
                border: selectedVersions.includes(version.id)
                  ? `2px solid ${threatFlowTheme.colors.brand.primary}`
                  : `1px solid ${threatFlowTheme.colors.surface.border.default}`,
                cursor: 'pointer'
              }}
              onClick={() => handleVersionSelect(version.id)}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Version {version.version}
                    {version.tags.length > 0 && (
                      <TagIcon sx={{ fontSize: 16, color: threatFlowTheme.colors.status.warning.text }} />
                    )}
                  </Typography>
                  <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                    <AuthorIcon sx={{ fontSize: 14, mr: 0.5 }} />
                    {version.author} • 
                    <TimeIcon sx={{ fontSize: 14, mx: 0.5 }} />
                    {version.created.toLocaleString()}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Restore this version">
                    <IconButton size="small" onClick={(e) => {
                      e.stopPropagation();
                      handleRestoreVersion(version);
                    }}>
                      <RestoreIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Add tags">
                    <IconButton size="small" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVersionForTag(version.id);
                      setTagDialogOpen(true);
                    }}>
                      <TagIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  
                  {versions.length > 1 && (
                    <Tooltip title="Delete version">
                      <IconButton size="small" onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteVersion(version.id);
                      }}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>

              <Typography variant="body1" sx={{ mb: 1 }}>
                <MessageIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                {version.message}
              </Typography>

              {version.tags.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  {version.tags.map(tag => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      sx={{
                        mr: 0.5,
                        backgroundColor: `${threatFlowTheme.colors.status.warning.text}20`,
                        color: threatFlowTheme.colors.status.warning.text
                      }}
                    />
                  ))}
                </Box>
              )}

              {version.changes.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                    Changes:
                  </Typography>
                  {renderChangesSummary(version.changes)}
                </Box>
              )}

              {/* Expandable details */}
              <Accordion
                expanded={expandedVersion === version.id}
                onChange={() => setExpandedVersion(
                  expandedVersion === version.id ? null : version.id
                )}
              >
                <AccordionSummary
                  expandIcon={<ExpandIcon />}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Typography variant="caption">View Details</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2, mb: 2 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                        Nodes
                      </Typography>
                      <Typography variant="body2">{version.nodes.length}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                        Edges
                      </Typography>
                      <Typography variant="body2">{version.edges.length}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                        Techniques
                      </Typography>
                      <Typography variant="body2">{version.metadata.stats.techniques.length}</Typography>
                    </Box>
                  </Box>

                  {version.changes.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Detailed Changes</Typography>
                      <List dense>
                        {version.changes.slice(0, 5).map((change, idx) => (
                          <ListItem key={idx}>
                            <ListItemIcon>
                              <Box
                                sx={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  backgroundColor: getChangeTypeColor(change.type),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold'
                                }}
                              >
                                {getChangeTypeIcon(change.type)}
                              </Box>
                            </ListItemIcon>
                            <ListItemText
                              primary={`${change.type} ${change.target}`}
                              secondary={change.field ? `Field: ${change.field}` : change.id}
                            />
                          </ListItem>
                        ))}
                        {version.changes.length > 5 && (
                          <ListItem>
                            <ListItemText
                              primary={`... and ${version.changes.length - 5} more changes`}
                              sx={{ fontStyle: 'italic' }}
                            />
                          </ListItem>
                        )}
                      </List>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            </Paper>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );

  return (
    <>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        p: 2,
        backgroundColor: threatFlowTheme.colors.background.secondary,
        borderRadius: threatFlowTheme.borderRadius.lg,
        border: `1px solid ${threatFlowTheme.colors.surface.border.default}`,
        mb: 2
      }}>
        <VersionIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Flow Versioning
          </Typography>
          <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
            Track changes and evolution of threat analysis over time
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={() => setCommitDialogOpen(true)}
            disabled={disabled}
            size="small"
          >
            Save Version
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<VersionIcon />}
            onClick={() => setDialogOpen(true)}
            disabled={disabled}
            size="small"
          >
            View History
          </Button>
        </Box>
      </Box>

      {/* Version History Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VersionIcon />
          Version History - {flowId}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Select up to 2 versions to compare. Click on timeline dots to select versions.
            </Alert>
            
            {selectedVersions.length === 2 && (
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<CompareIcon />}
                  onClick={handleCompareVersions}
                  sx={{ mr: 1 }}
                >
                  Compare Selected Versions
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setSelectedVersions([])}
                >
                  Clear Selection
                </Button>
              </Box>
            )}
          </Box>

          {versions.length === 0 ? (
            <Alert severity="info">
              No versions found. Create your first version to start tracking changes.
            </Alert>
          ) : (
            renderVersionTimeline()
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Commit Dialog */}
      <Dialog open={commitDialogOpen} onClose={() => setCommitDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Version</DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info">
              Save the current state of your flow analysis as a new version.
            </Alert>
            
            <TextField
              label="Commit Message"
              multiline
              rows={3}
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Describe the changes made in this version..."
              fullWidth
            />
            
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                  Nodes
                </Typography>
                <Typography variant="h6">{currentNodes.length}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                  Edges
                </Typography>
                <Typography variant="h6">{currentEdges.length}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                  Version
                </Typography>
                <Typography variant="h6">{versions.length + 1}.0.0</Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setCommitDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateVersion}
            variant="contained"
            disabled={!commitMessage.trim()}
          >
            Create Version
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={tagDialogOpen} onClose={() => setTagDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Tags to Version</DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Tags (comma-separated)"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="milestone, release, tested, approved"
              fullWidth
              helperText="Add tags to categorize and identify important versions"
            />
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setTagDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddTags}
            variant="contained"
            disabled={!newTags.trim()}
          >
            Add Tags
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};