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
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Alert,
  Divider,
  Avatar,
  Badge,
  Menu,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Share as ShareIcon,
  Comment as CommentIcon,
  Person as PersonIcon,
  ExpandMore as ExpandIcon,
  Send as SendIcon,
  Reply as ReplyIcon,
  Check as ResolveIcon,
  MoreVert as MoreIcon,
  Notifications as NotificationIcon,
  Group as GroupIcon,
  Lock as PrivateIcon,
  Public as PublicIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as TimeIcon,
  Priority as PriorityIcon
} from '@mui/icons-material';
import { threatFlowTheme } from '../../../shared/theme/threatflow-theme';
import { flowManagement, FlowComment } from '../services/FlowManagementService';

interface FlowCollaborationProps {
  flowId: string;
  disabled?: boolean;
}

interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer' | 'commenter';
  lastActive: Date;
  isOnline: boolean;
}

export const FlowCollaboration: React.FC<FlowCollaborationProps> = ({
  flowId,
  disabled = false
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [comments, setComments] = useState<FlowComment[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [commentType, setCommentType] = useState<FlowComment['type']>('general');
  const [commentPriority, setCommentPriority] = useState<FlowComment['priority']>('medium');
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'viewer' | 'commenter' | 'editor'>('viewer');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (dialogOpen) {
      loadComments();
      loadCollaborators();
    }
  }, [dialogOpen, flowId]);

  const loadComments = async () => {
    try {
      const flowComments = await flowManagement.getComments(flowId);
      setComments(flowComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const loadCollaborators = async () => {
    // Mock data - in real implementation, load from user management system
    const mockCollaborators: Collaborator[] = [
      {
        id: 'user1',
        name: 'Alice Johnson',
        email: 'alice@company.com',
        role: 'owner',
        lastActive: new Date(),
        isOnline: true
      },
      {
        id: 'user2',
        name: 'Bob Smith',
        email: 'bob@company.com',
        role: 'editor',
        lastActive: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        isOnline: true
      },
      {
        id: 'user3',
        name: 'Carol Williams',
        email: 'carol@company.com',
        role: 'commenter',
        lastActive: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        isOnline: false
      }
    ];
    setCollaborators(mockCollaborators);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await flowManagement.addComment(flowId, {
        author: 'current-user', // In real app, get from auth context
        content: newComment,
        type: commentType,
        priority: commentPriority,
        nodeId: selectedNodeId || undefined,
        resolved: false
      });

      setNewComment('');
      setCommentType('general');
      setCommentPriority('medium');
      setSelectedNodeId(null);
      loadComments();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleReplyToComment = async (commentId: string) => {
    if (!newComment.trim()) return;

    try {
      await flowManagement.replyToComment(flowId, commentId, {
        author: 'current-user',
        content: newComment,
        type: 'general',
        priority: 'medium',
        resolved: false
      });

      setNewComment('');
      setReplyingTo(null);
      loadComments();
    } catch (error) {
      console.error('Failed to reply to comment:', error);
    }
  };

  const handleResolveComment = async (commentId: string) => {
    try {
      await flowManagement.resolveComment(flowId, commentId);
      loadComments();
    } catch (error) {
      console.error('Failed to resolve comment:', error);
    }
  };

  const handleShareFlow = async () => {
    if (!shareEmail.trim()) return;

    try {
      await flowManagement.shareFlow(flowId, [shareEmail], [shareRole]);
      setShareEmail('');
      setShareDialogOpen(false);
      loadCollaborators();
    } catch (error) {
      console.error('Failed to share flow:', error);
    }
  };

  const getCommentTypeColor = (type: FlowComment['type']) => {
    switch (type) {
      case 'suggestion': return threatFlowTheme.colors.brand.primary;
      case 'question': return threatFlowTheme.colors.status.warning.text;
      case 'issue': return threatFlowTheme.colors.status.error.text;
      default: return threatFlowTheme.colors.text.tertiary;
    }
  };

  const getPriorityColor = (priority: FlowComment['priority']) => {
    switch (priority) {
      case 'high': return threatFlowTheme.colors.status.error.text;
      case 'medium': return threatFlowTheme.colors.status.warning.text;
      case 'low': return threatFlowTheme.colors.accent.secure;
      default: return threatFlowTheme.colors.text.tertiary;
    }
  };

  const getRoleColor = (role: Collaborator['role']) => {
    switch (role) {
      case 'owner': return threatFlowTheme.colors.brand.primary;
      case 'editor': return threatFlowTheme.colors.accent.secure;
      case 'commenter': return threatFlowTheme.colors.status.warning.text;
      case 'viewer': return threatFlowTheme.colors.text.tertiary;
      default: return threatFlowTheme.colors.text.tertiary;
    }
  };

  const renderCommentItem = (comment: FlowComment, isReply = false) => (
    <Paper
      key={comment.id}
      sx={{
        p: 2,
        mb: 1,
        ml: isReply ? 4 : 0,
        border: `1px solid ${comment.resolved ? threatFlowTheme.colors.accent.secure : threatFlowTheme.colors.surface.border.default}`,
        opacity: comment.resolved ? 0.7 : 1
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
            {comment.author.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="subtitle2">{comment.author}</Typography>
          <Chip
            label={comment.type}
            size="small"
            sx={{
              backgroundColor: `${getCommentTypeColor(comment.type)}20`,
              color: getCommentTypeColor(comment.type),
              height: 18,
              fontSize: '0.7rem'
            }}
          />
          <Chip
            label={comment.priority}
            size="small"
            sx={{
              backgroundColor: `${getPriorityColor(comment.priority)}20`,
              color: getPriorityColor(comment.priority),
              height: 18,
              fontSize: '0.7rem'
            }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {!comment.resolved && (
            <Tooltip title="Resolve">
              <IconButton size="small" onClick={() => handleResolveComment(comment.id)}>
                <ResolveIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
          
          {!isReply && (
            <Tooltip title="Reply">
              <IconButton size="small" onClick={() => setReplyingTo(comment.id)}>
                <ReplyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Typography variant="body2" sx={{ mb: 1 }}>
        {comment.content}
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
          <TimeIcon sx={{ fontSize: 12, mr: 0.5 }} />
          {comment.created.toLocaleString()}
          {comment.nodeId && ` • Node: ${comment.nodeId}`}
        </Typography>
        
        {comment.resolved && (
          <Chip
            label="Resolved"
            size="small"
            sx={{
              backgroundColor: `${threatFlowTheme.colors.accent.secure}20`,
              color: threatFlowTheme.colors.accent.secure,
              height: 18,
              fontSize: '0.7rem'
            }}
          />
        )}
      </Box>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {comment.replies.map(reply => renderCommentItem(reply, true))}
        </Box>
      )}

      {/* Reply form */}
      {replyingTo === comment.id && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: threatFlowTheme.colors.background.tertiary, borderRadius: 1 }}>
          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder="Write a reply..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              onClick={() => handleReplyToComment(comment.id)}
              disabled={!newComment.trim()}
            >
              Reply
            </Button>
            <Button
              size="small"
              onClick={() => {
                setReplyingTo(null);
                setNewComment('');
              }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );

  const renderCollaboratorsList = () => (
    <List>
      {collaborators.map((collaborator) => (
        <ListItem key={collaborator.id}>
          <ListItemIcon>
            <Badge
              color={collaborator.isOnline ? 'success' : 'default'}
              variant="dot"
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {collaborator.name.charAt(0)}
              </Avatar>
            </Badge>
          </ListItemIcon>
          
          <ListItemText
            primary={collaborator.name}
            secondary={
              <Box>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  {collaborator.email}
                </Typography>
                <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                  Last active: {collaborator.lastActive.toLocaleString()}
                </Typography>
              </Box>
            }
          />
          
          <ListItemSecondaryAction>
            <Chip
              label={collaborator.role}
              size="small"
              sx={{
                backgroundColor: `${getRoleColor(collaborator.role)}20`,
                color: getRoleColor(collaborator.role)
              }}
            />
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
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
        <GroupIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Collaboration
          </Typography>
          <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
            Real-time sharing and commenting on flows
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Badge badgeContent={comments.filter(c => !c.resolved).length} color="primary">
            <Button
              variant="outlined"
              startIcon={<CommentIcon />}
              onClick={() => setDialogOpen(true)}
              disabled={disabled}
              size="small"
            >
              Comments
            </Button>
          </Badge>
          
          <Button
            variant="outlined"
            startIcon={<ShareIcon />}
            onClick={() => setShareDialogOpen(true)}
            disabled={disabled}
            size="small"
          >
            Share
          </Button>
        </Box>
      </Box>

      {/* Comments Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CommentIcon />
          Flow Comments & Collaboration
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Collaborators */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupIcon />
                  <Typography>Collaborators ({collaborators.length})</Typography>
                  <Chip
                    label={`${collaborators.filter(c => c.isOnline).length} online`}
                    size="small"
                    sx={{
                      backgroundColor: `${threatFlowTheme.colors.accent.secure}20`,
                      color: threatFlowTheme.colors.accent.secure
                    }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {renderCollaboratorsList()}
              </AccordionDetails>
            </Accordion>

            {/* New Comment Form */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>Add Comment</Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={commentType}
                    onChange={(e) => setCommentType(e.target.value as FlowComment['type'])}
                  >
                    <MenuItem value="general">General</MenuItem>
                    <MenuItem value="suggestion">Suggestion</MenuItem>
                    <MenuItem value="question">Question</MenuItem>
                    <MenuItem value="issue">Issue</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={commentPriority}
                    onChange={(e) => setCommentPriority(e.target.value as FlowComment['priority'])}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationsEnabled}
                      onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    />
                  }
                  label="Notify collaborators"
                />
                
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  Add Comment
                </Button>
              </Box>
            </Paper>

            {/* Comments List */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Comments ({comments.length})
                {comments.filter(c => !c.resolved).length > 0 && (
                  <Chip
                    label={`${comments.filter(c => !c.resolved).length} unresolved`}
                    size="small"
                    sx={{
                      ml: 1,
                      backgroundColor: `${threatFlowTheme.colors.status.warning.text}20`,
                      color: threatFlowTheme.colors.status.warning.text
                    }}
                  />
                )}
              </Typography>
              
              {comments.length === 0 ? (
                <Alert severity="info">
                  No comments yet. Add the first comment to start collaborating!
                </Alert>
              ) : (
                <Box>
                  {comments.map(comment => renderCommentItem(comment))}
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShareIcon />
          Share Flow
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info">
              Share this flow with team members to enable collaboration and review.
            </Alert>
            
            <TextField
              label="Email Address"
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder="colleague@company.com"
              fullWidth
            />
            
            <FormControl fullWidth>
              <InputLabel>Permission Level</InputLabel>
              <Select
                value={shareRole}
                onChange={(e) => setShareRole(e.target.value as any)}
              >
                <MenuItem value="viewer">
                  <Box>
                    <Typography>Viewer</Typography>
                    <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                      Can view the flow
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="commenter">
                  <Box>
                    <Typography>Commenter</Typography>
                    <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                      Can view and comment
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="editor">
                  <Box>
                    <Typography>Editor</Typography>
                    <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                      Can view, comment, and edit
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Current Collaborators */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Current Access</Typography>
              {renderCollaboratorsList()}
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleShareFlow}
            variant="contained"
            disabled={!shareEmail.trim()}
          >
            Share Flow
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};