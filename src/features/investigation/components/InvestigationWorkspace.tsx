import {
  Security as ThreatIcon,
  Timeline as TimelineIcon,
  Notes as NotesIcon,
  Group as CollaborateIcon,
  Assignment as TasksIcon,
  Share as ShareIcon,
  MoreVert as MoreIcon,
  Add as AddIcon,
  Flag as FlagIcon,
  CheckCircle as ResolvedIcon,
  Cancel as ClosedIcon,
  Warning as AlertIcon,
  CloudUpload as ExportIcon
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  IconButton,
  Avatar,
  AvatarGroup,
  Tabs,
  Tab,
  TextField,
  Menu,
  MenuItem,
  Divider,
  Alert,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { Investigation, User } from '../../../shared/services/database/DatabaseService';
import { threatFlowTheme } from '../../../shared/theme/threatflow-theme';

interface InvestigationWorkspaceProps {
  investigation: Investigation;
  currentUser: User;
  collaborators: User[];
  onUpdateInvestigation: (updates: Partial<Investigation>) => Promise<void>;
  onAddCollaborator: (userId: string) => Promise<void>;
  onRemoveCollaborator: (userId: string) => Promise<void>;
  onCreateNote: (content: string, type: 'comment' | 'hypothesis' | 'finding' | 'action') => Promise<void>;
  onUpdateStatus: (status: Investigation['status']) => Promise<void>;
  onExport: (format: 'json' | 'pdf' | 'stix') => Promise<void>;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} style={{ height: '100%' }}>
      {value === index && children}
    </div>
  );
}

const InvestigationWorkspace: React.FC<InvestigationWorkspaceProps> = ({
  investigation,
  currentUser,
  collaborators,
  onUpdateInvestigation,
  onAddCollaborator,
  onRemoveCollaborator,
  onCreateNote,
  onUpdateStatus,
  onExport
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'comment' | 'hypothesis' | 'finding' | 'action'>('comment');
  const [progress, setProgress] = useState(0);

  // Calculate investigation progress based on status and activities
  useEffect(() => {
    const calculateProgress = () => {
      switch (investigation.status) {
        case 'open': return 10;
        case 'in_progress': return 50;
        case 'resolved': return 90;
        case 'closed': return 100;
        default: return 0;
      }
    };
    setProgress(calculateProgress());
  }, [investigation.status]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleAddNote = async () => {
    if (newNote.trim()) {
      await onCreateNote(newNote, noteType);
      setNewNote('');
    }
  };

  const handleStatusUpdate = async (newStatus: Investigation['status']) => {
    await onUpdateStatus(newStatus);
    setStatusDialogOpen(false);
  };

  const getStatusColor = (status: Investigation['status']) => {
    switch (status) {
      case 'open': return threatFlowTheme.colors.status.warning.accent;
      case 'in_progress': return threatFlowTheme.colors.brand.primary;
      case 'resolved': return threatFlowTheme.colors.status.success.accent;
      case 'closed': return threatFlowTheme.colors.text.tertiary;
      default: return threatFlowTheme.colors.text.secondary;
    }
  };

  const getPriorityColor = (priority: Investigation['priority']) => {
    switch (priority) {
      case 'critical': return threatFlowTheme.colors.status.error.accent;
      case 'high': return '#ff6b35';
      case 'medium': return threatFlowTheme.colors.status.warning.accent;
      case 'low': return threatFlowTheme.colors.status.success.accent;
      default: return threatFlowTheme.colors.text.secondary;
    }
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: threatFlowTheme.colors.background.primary 
    }}>
      {/* Investigation Header */}
      <Card sx={{ 
        mb: 2,
        backgroundColor: threatFlowTheme.colors.background.secondary,
        border: `1px solid ${threatFlowTheme.colors.surface.border.default}`
      }}>
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ 
                color: threatFlowTheme.colors.text.primary,
                fontWeight: threatFlowTheme.typography.fontWeight.bold,
                mb: 1
              }}>
                {investigation.title}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Chip
                  label={investigation.status.replace('_', ' ').toUpperCase()}
                  size="small"
                  sx={{
                    backgroundColor: `${getStatusColor(investigation.status)}20`,
                    color: getStatusColor(investigation.status),
                    border: `1px solid ${getStatusColor(investigation.status)}40`,
                    fontWeight: threatFlowTheme.typography.fontWeight.semibold
                  }}
                />
                <Chip
                  label={`${investigation.priority.toUpperCase()} PRIORITY`}
                  size="small"
                  sx={{
                    backgroundColor: `${getPriorityColor(investigation.priority)}20`,
                    color: getPriorityColor(investigation.priority),
                    border: `1px solid ${getPriorityColor(investigation.priority)}40`,
                    fontWeight: threatFlowTheme.typography.fontWeight.semibold
                  }}
                />
                {investigation.classification && (
                  <Chip
                    label={investigation.classification.toUpperCase()}
                    size="small"
                    sx={{
                      backgroundColor: `${threatFlowTheme.colors.text.quaternary}20`,
                      color: threatFlowTheme.colors.text.quaternary,
                      border: `1px solid ${threatFlowTheme.colors.text.quaternary}40`
                    }}
                  />
                )}
              </Box>

              {investigation.description && (
                <Typography variant="body2" sx={{ 
                  color: threatFlowTheme.colors.text.secondary,
                  mb: 2
                }}>
                  {investigation.description}
                </Typography>
              )}

              {/* Progress Bar */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                    Investigation Progress
                  </Typography>
                  <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                    {progress}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: threatFlowTheme.colors.surface.rest,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getStatusColor(investigation.status),
                      borderRadius: 3
                    }
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              {/* Collaborators */}
              <AvatarGroup 
                max={4} 
                sx={{ 
                  mr: 2,
                  '& .MuiAvatar-root': {
                    width: 32,
                    height: 32,
                    fontSize: '0.8rem',
                    backgroundColor: threatFlowTheme.colors.brand.primary,
                    border: `2px solid ${threatFlowTheme.colors.background.secondary}`
                  }
                }}
              >
                {collaborators.map(user => (
                  <Tooltip key={user.id} title={`${user.first_name} ${user.last_name} (${user.role})`}>
                    <Avatar>
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </Avatar>
                  </Tooltip>
                ))}
              </AvatarGroup>

              {/* Action Buttons */}
              <Button
                variant="outlined"
                size="small"
                startIcon={<ShareIcon />}
                onClick={() => setShareDialogOpen(true)}
                sx={{
                  borderColor: threatFlowTheme.colors.surface.border.default,
                  color: threatFlowTheme.colors.text.primary,
                  '&:hover': {
                    borderColor: threatFlowTheme.colors.brand.primary,
                    backgroundColor: `${threatFlowTheme.colors.brand.primary}10`
                  }
                }}
              >
                Share
              </Button>

              <Button
                variant="outlined"
                size="small"
                startIcon={<FlagIcon />}
                onClick={() => setStatusDialogOpen(true)}
                sx={{
                  borderColor: getStatusColor(investigation.status),
                  color: getStatusColor(investigation.status),
                  '&:hover': {
                    backgroundColor: `${getStatusColor(investigation.status)}10`
                  }
                }}
              >
                Update Status
              </Button>

              <IconButton onClick={handleMenuOpen}>
                <MoreIcon sx={{ color: threatFlowTheme.colors.text.secondary }} />
              </IconButton>
            </Box>
          </Box>

          {/* Tags */}
          {investigation.tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {investigation.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: threatFlowTheme.colors.surface.border.subtle,
                    color: threatFlowTheme.colors.text.tertiary,
                    backgroundColor: 'transparent'
                  }}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <Card sx={{ 
        mb: 2,
        backgroundColor: threatFlowTheme.colors.background.secondary,
        border: `1px solid ${threatFlowTheme.colors.surface.border.default}`
      }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              color: threatFlowTheme.colors.text.secondary,
              fontWeight: threatFlowTheme.typography.fontWeight.medium,
              '&.Mui-selected': {
                color: threatFlowTheme.colors.brand.primary
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: threatFlowTheme.colors.brand.primary
            }
          }}
        >
          <Tab icon={<ThreatIcon />} label="Analysis" />
          <Tab icon={<TimelineIcon />} label="Timeline" />
          <Tab icon={<NotesIcon />} label="Notes" />
          <Tab icon={<CollaborateIcon />} label="Team" />
          <Tab icon={<TasksIcon />} label="Tasks" />
        </Tabs>
      </Card>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <TabPanel value={currentTab} index={0}>
          <AnalysisPanel investigation={investigation} />
        </TabPanel>
        
        <TabPanel value={currentTab} index={1}>
          <TimelinePanel investigation={investigation} />
        </TabPanel>
        
        <TabPanel value={currentTab} index={2}>
          <NotesPanel 
            investigation={investigation} 
            currentUser={currentUser}
            onCreateNote={onCreateNote}
          />
        </TabPanel>
        
        <TabPanel value={currentTab} index={3}>
          <TeamPanel 
            collaborators={collaborators} 
            onAddCollaborator={onAddCollaborator}
            onRemoveCollaborator={onRemoveCollaborator}
          />
        </TabPanel>
        
        <TabPanel value={currentTab} index={4}>
          <TasksPanel investigation={investigation} />
        </TabPanel>
      </Box>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: threatFlowTheme.colors.background.secondary,
            border: `1px solid ${threatFlowTheme.colors.surface.border.default}`
          }
        }}
      >
        <MenuItem onClick={() => { handleMenuClose(); onExport('json'); }}>
          <ExportIcon sx={{ mr: 1 }} />
          Export as JSON
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); onExport('stix'); }}>
          <ExportIcon sx={{ mr: 1 }} />
          Export as STIX
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); onExport('pdf'); }}>
          <ExportIcon sx={{ mr: 1 }} />
          Export Report
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { handleMenuClose(); /* Archive logic */ }}>
          Archive Investigation
        </MenuItem>
      </Menu>

      {/* Share Dialog */}
      <Dialog 
        open={shareDialogOpen} 
        onClose={() => setShareDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: threatFlowTheme.colors.background.secondary,
            border: `1px solid ${threatFlowTheme.colors.surface.border.default}`
          }
        }}
      >
        <DialogTitle sx={{ color: threatFlowTheme.colors.text.primary }}>
          Share Investigation
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.secondary, mb: 2 }}>
            Share this investigation with team members or external stakeholders.
          </Typography>
          <TextField
            fullWidth
            label="Add collaborator by email"
            variant="outlined"
            sx={{ mb: 2 }}
          />
          <Alert severity="info" sx={{ mb: 2 }}>
            Sharing will grant read access to the investigation findings and IOCs.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary">Share</Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog 
        open={statusDialogOpen} 
        onClose={() => setStatusDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: threatFlowTheme.colors.background.secondary,
            border: `1px solid ${threatFlowTheme.colors.surface.border.default}`
          }
        }}
      >
        <DialogTitle sx={{ color: threatFlowTheme.colors.text.primary }}>
          Update Investigation Status
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(['open', 'in_progress', 'resolved', 'closed'] as const).map((status) => (
              <Button
                key={status}
                variant={investigation.status === status ? 'contained' : 'outlined'}
                onClick={() => handleStatusUpdate(status)}
                startIcon={
                  status === 'open' ? <AlertIcon /> :
                  status === 'in_progress' ? <ThreatIcon /> :
                  status === 'resolved' ? <ResolvedIcon /> :
                  <ClosedIcon />
                }
                sx={{
                  justifyContent: 'flex-start',
                  color: investigation.status === status 
                    ? threatFlowTheme.colors.text.primary 
                    : getStatusColor(status),
                  borderColor: getStatusColor(status),
                  backgroundColor: investigation.status === status 
                    ? `${getStatusColor(status)}20` 
                    : 'transparent'
                }}
              >
                {status.replace('_', ' ').toUpperCase()}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Placeholder panels - these would be separate components in a full implementation
const AnalysisPanel: React.FC<{ investigation: Investigation }> = ({ investigation }) => (
  <Card sx={{ height: '100%', backgroundColor: threatFlowTheme.colors.background.secondary }}>
    <CardContent>
      <Typography variant="h6" sx={{ color: threatFlowTheme.colors.text.primary, mb: 2 }}>
        Threat Analysis
      </Typography>
      <Alert severity="info">
        Analysis panel would show IOCs, IOAs, MITRE ATT&CK mappings, and threat intelligence.
      </Alert>
    </CardContent>
  </Card>
);

const TimelinePanel: React.FC<{ investigation: Investigation }> = ({ investigation }) => (
  <Card sx={{ height: '100%', backgroundColor: threatFlowTheme.colors.background.secondary }}>
    <CardContent>
      <Typography variant="h6" sx={{ color: threatFlowTheme.colors.text.primary, mb: 2 }}>
        Investigation Timeline
      </Typography>
      <Alert severity="info">
        Timeline panel would show chronological events and analyst actions.
      </Alert>
    </CardContent>
  </Card>
);

const NotesPanel: React.FC<{ 
  investigation: Investigation; 
  currentUser: User;
  onCreateNote: (content: string, type: any) => Promise<void>;
}> = ({ investigation, currentUser, onCreateNote }) => {
  const [newNote, setNewNote] = useState('');
  
  return (
    <Card sx={{ height: '100%', backgroundColor: threatFlowTheme.colors.background.secondary }}>
      <CardContent>
        <Typography variant="h6" sx={{ color: threatFlowTheme.colors.text.primary, mb: 2 }}>
          Investigation Notes
        </Typography>
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note, hypothesis, or finding..."
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              onCreateNote(newNote, 'comment');
              setNewNote('');
            }}
            disabled={!newNote.trim()}
          >
            Add Note
          </Button>
        </Box>
        <Alert severity="info">
          Notes panel would show threaded discussions and analyst observations.
        </Alert>
      </CardContent>
    </Card>
  );
};

const TeamPanel: React.FC<{ 
  collaborators: User[];
  onAddCollaborator: (userId: string) => Promise<void>;
  onRemoveCollaborator: (userId: string) => Promise<void>;
}> = ({ collaborators, onAddCollaborator, onRemoveCollaborator }) => (
  <Card sx={{ height: '100%', backgroundColor: threatFlowTheme.colors.background.secondary }}>
    <CardContent>
      <Typography variant="h6" sx={{ color: threatFlowTheme.colors.text.primary, mb: 2 }}>
        Team Collaboration
      </Typography>
      <Alert severity="info">
        Team panel would show active collaborators and their contributions.
      </Alert>
    </CardContent>
  </Card>
);

const TasksPanel: React.FC<{ investigation: Investigation }> = ({ investigation }) => (
  <Card sx={{ height: '100%', backgroundColor: threatFlowTheme.colors.background.secondary }}>
    <CardContent>
      <Typography variant="h6" sx={{ color: threatFlowTheme.colors.text.primary, mb: 2 }}>
        Investigation Tasks
      </Typography>
      <Alert severity="info">
        Tasks panel would show actionable items and investigation checklist.
      </Alert>
    </CardContent>
  </Card>
);

export default InvestigationWorkspace;