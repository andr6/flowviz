/**
 * Collaborative Real-time Flow Editor
 * Enables multiple analysts to edit attack flows simultaneously
 */
import {
  PersonAdd as PersonAddIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Sync as SyncIcon,
  History as HistoryIcon,
  Comment as CommentIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  AvatarGroup,
  Chip,
  IconButton,
  Tooltip,
  Badge,
  Card,
  CardContent,
  Alert,
  Button,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  BackgroundVariant,
  NodeChange,
  EdgeChange,
} from 'reactflow';

// Types for collaborative editing
interface Collaborator {
  id: string;
  name: string;
  avatar?: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer' | 'analyst';
  isOnline: boolean;
  lastActivity: Date;
  cursor?: {
    x: number;
    y: number;
    nodeId?: string;
  };
  currentlyEditing?: string[];
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canShare: boolean;
    canDelete: boolean;
  };
}

interface FlowComment {
  id: string;
  authorId: string;
  nodeId?: string;
  content: string;
  timestamp: Date;
  resolved: boolean;
  replies?: FlowComment[];
  position?: { x: number; y: number };
}

interface FlowActivity {
  id: string;
  type: 'node_added' | 'node_edited' | 'node_deleted' | 'edge_added' | 'edge_deleted' | 'comment_added' | 'user_joined' | 'user_left';
  userId: string;
  timestamp: Date;
  details: string;
  nodeId?: string;
  edgeId?: string;
}

interface CollaborationState {
  sessionId: string;
  collaborators: Collaborator[];
  isLocked: boolean;
  lockedBy?: string;
  version: number;
  lastSync: Date;
  conflicts: any[];
  pendingChanges: any[];
}

interface CollaborativeFlowEditorProps {
  flowId: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  currentUser: Collaborator;
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onCollaboratorUpdate?: (collaborators: Collaborator[]) => void;
}

// Collaborative Cursor Component
const CollaborativeCursor: React.FC<{
  collaborator: Collaborator;
  position: { x: number; y: number };
}> = ({ collaborator, position }) => {
  const theme = useTheme();
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {/* Cursor pointer */}
      <svg width="20" height="20" viewBox="0 0 20 20">
        <path
          d="M0 0l20 8-8 2-2 8z"
          fill={theme.palette.primary.main}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      
      {/* User label */}
      <Box
        sx={{
          position: 'absolute',
          top: -30,
          left: 20,
          backgroundColor: theme.palette.primary.main,
          color: 'white',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontSize: '0.75rem',
          whiteSpace: 'nowrap',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '100%',
            left: '10px',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: `4px solid ${theme.palette.primary.main}`,
          },
        }}
      >
        {collaborator.name}
      </Box>
    </motion.div>
  );
};

// Comment Overlay Component
const CommentOverlay: React.FC<{
  comment: FlowComment;
  collaborators: Collaborator[];
  onResolve: (commentId: string) => void;
  onReply: (commentId: string, content: string) => void;
}> = ({ comment, collaborators, onResolve, onReply }) => {
  const theme = useTheme();
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState(false);
  
  const author = collaborators.find(c => c.id === comment.authorId);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        position: 'absolute',
        left: comment.position?.x || 0,
        top: comment.position?.y || 0,
        zIndex: 1001,
        minWidth: 280,
      }}
    >
      <Card elevation={8} sx={{ maxWidth: 320 }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar src={author?.avatar} sx={{ width: 24, height: 24, mr: 1 }}>
              {author?.name.charAt(0)}
            </Avatar>
            <Typography variant="subtitle2">
              {author?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {comment.timestamp.toLocaleTimeString()}
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ mb: 2 }}>
            {comment.content}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: comment.replies?.length ? 1 : 0 }}>
            {!comment.resolved && (
              <Button
                size="small"
                startIcon={<CheckCircleIcon />}
                onClick={() => onResolve(comment.id)}
                variant="outlined"
                color="success"
              >
                Resolve
              </Button>
            )}
            <Button
              size="small"
              startIcon={<CommentIcon />}
              onClick={() => setShowReplies(!showReplies)}
              variant="outlined"
            >
              Reply
            </Button>
          </Box>

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <Box sx={{ mt: 1, pl: 2, borderLeft: 2, borderColor: 'divider' }}>
              {comment.replies.map(reply => {
                const replyAuthor = collaborators.find(c => c.id === reply.authorId);
                return (
                  <Box key={reply.id} sx={{ mb: 1, '&:last-child': { mb: 0 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Avatar src={replyAuthor?.avatar} sx={{ width: 16, height: 16, mr: 0.5 }}>
                        {replyAuthor?.name.charAt(0)}
                      </Avatar>
                      <Typography variant="caption" fontWeight="medium">
                        {replyAuthor?.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {reply.timestamp.toLocaleTimeString()}
                      </Typography>
                    </Box>
                    <Typography variant="caption" display="block">
                      {reply.content}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Reply Input */}
          {showReplies && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Add a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                multiline
                maxRows={3}
              />
              <IconButton
                size="small"
                onClick={() => {
                  onReply(comment.id, replyText);
                  setReplyText('');
                }}
                disabled={!replyText.trim()}
                color="primary"
              >
                <SendIcon />
              </IconButton>
            </Box>
          )}

          {comment.resolved && (
            <Chip
              size="small"
              label="Resolved"
              color="success"
              variant="outlined"
              sx={{ mt: 1 }}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Main Collaborative Flow Editor Component
export const CollaborativeFlowEditor: React.FC<CollaborativeFlowEditorProps> = ({
  flowId,
  initialNodes,
  initialEdges,
  currentUser,
  onNodesChange,
  onEdgesChange,
  onCollaboratorUpdate,
}) => {
  const theme = useTheme();
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);
  const [collaborationState, setCollaborationState] = useState<CollaborationState>({
    sessionId: `session-${flowId}-${Date.now()}`,
    collaborators: [currentUser],
    isLocked: false,
    version: 1,
    lastSync: new Date(),
    conflicts: [],
    pendingChanges: [],
  });
  
  const [comments, setComments] = useState<FlowComment[]>([]);
  const [activities, setActivities] = useState<FlowActivity[]>([]);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentPosition, setCommentPosition] = useState<{ x: number; y: number } | null>(null);
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [cursors, setCursors] = useState<{ [userId: string]: { x: number; y: number } }>({});

  // Simulated WebSocket connection for real-time collaboration
  useEffect(() => {
    const simulateCollaboration = () => {
      // Add sample collaborators after a delay
      setTimeout(() => {
        const sampleCollaborators: Collaborator[] = [
          currentUser,
          {
            id: 'analyst-2',
            name: 'Sarah Chen',
            email: 'sarah.chen@company.com',
            avatar: '/avatars/sarah.jpg',
            role: 'analyst',
            isOnline: true,
            lastActivity: new Date(Date.now() - 120000), // 2 minutes ago
            permissions: {
              canEdit: true,
              canComment: true,
              canShare: false,
              canDelete: false,
            },
          },
          {
            id: 'senior-analyst',
            name: 'Mike Rodriguez',
            email: 'mike.rodriguez@company.com',
            avatar: '/avatars/mike.jpg',
            role: 'editor',
            isOnline: true,
            lastActivity: new Date(Date.now() - 300000), // 5 minutes ago
            permissions: {
              canEdit: true,
              canComment: true,
              canShare: true,
              canDelete: true,
            },
          },
          {
            id: 'viewer-1',
            name: 'Alex Johnson',
            email: 'alex.johnson@company.com',
            role: 'viewer',
            isOnline: false,
            lastActivity: new Date(Date.now() - 3600000), // 1 hour ago
            permissions: {
              canEdit: false,
              canComment: true,
              canShare: false,
              canDelete: false,
            },
          },
        ];

        setCollaborationState(prev => ({
          ...prev,
          collaborators: sampleCollaborators,
        }));

        // Add sample comments
        setComments([
          {
            id: 'comment-1',
            authorId: 'analyst-2',
            nodeId: 'node-1',
            content: 'This technique seems to have low confidence. Should we investigate further?',
            timestamp: new Date(Date.now() - 600000),
            resolved: false,
            position: { x: 200, y: 150 },
          },
          {
            id: 'comment-2',
            authorId: 'senior-analyst',
            content: 'Great work on identifying the C2 infrastructure pattern.',
            timestamp: new Date(Date.now() - 1200000),
            resolved: true,
            position: { x: 400, y: 250 },
            replies: [
              {
                id: 'reply-1',
                authorId: currentUser.id,
                content: 'Thanks! The domain pattern was key to connecting these nodes.',
                timestamp: new Date(Date.now() - 1100000),
                resolved: false,
              },
            ],
          },
        ]);

        // Add sample activities
        setActivities([
          {
            id: 'activity-1',
            type: 'user_joined',
            userId: 'analyst-2',
            timestamp: new Date(Date.now() - 1800000),
            details: 'Sarah Chen joined the collaboration session',
          },
          {
            id: 'activity-2',
            type: 'node_added',
            userId: 'senior-analyst',
            timestamp: new Date(Date.now() - 900000),
            details: 'Added new technique: Credential Dumping',
            nodeId: 'new-node-1',
          },
          {
            id: 'activity-3',
            type: 'comment_added',
            userId: 'analyst-2',
            timestamp: new Date(Date.now() - 600000),
            details: 'Added comment on Initial Access technique',
          },
        ]);

        onCollaboratorUpdate?.(sampleCollaborators);
      }, 2000);

      // Simulate cursor movements
      const simulateCursors = () => {
        setCursors(prev => ({
          ...prev,
          'analyst-2': {
            x: Math.random() * 800 + 100,
            y: Math.random() * 400 + 100,
          },
          'senior-analyst': {
            x: Math.random() * 800 + 100,
            y: Math.random() * 400 + 100,
          },
        }));
      };

      const cursorInterval = setInterval(simulateCursors, 3000);
      return () => clearInterval(cursorInterval);
    };

    return simulateCollaboration();
  }, [currentUser, onCollaboratorUpdate]);

  // Handle node changes with collaboration
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChangeInternal(changes);
    
    // Track changes for collaboration
    changes.forEach(change => {
      if (change.type === 'add' || change.type === 'remove') {
        setActivities(prev => [{
          id: `activity-${Date.now()}`,
          type: change.type === 'add' ? 'node_added' : 'node_deleted',
          userId: currentUser.id,
          timestamp: new Date(),
          details: `${change.type === 'add' ? 'Added' : 'Removed'} node`,
          nodeId: change.id,
        }, ...prev.slice(0, 49)]); // Keep last 50 activities
      }
    });

    setCollaborationState(prev => ({
      ...prev,
      version: prev.version + 1,
      lastSync: new Date(),
    }));
  }, [onNodesChangeInternal, currentUser.id]);

  // Handle edge changes with collaboration  
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChangeInternal(changes);
    
    setCollaborationState(prev => ({
      ...prev,
      version: prev.version + 1,
      lastSync: new Date(),
    }));
  }, [onEdgesChangeInternal]);

  // Handle right-click to add comments
  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    if (!currentUser.permissions.canComment) {return;}
    
    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (bounds) {
      setCommentPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
    }
  }, [currentUser.permissions.canComment]);

  const addComment = useCallback(() => {
    if (!newComment.trim() || !commentPosition) {return;}

    const comment: FlowComment = {
      id: `comment-${Date.now()}`,
      authorId: currentUser.id,
      content: newComment,
      timestamp: new Date(),
      resolved: false,
      position: commentPosition,
    };

    setComments(prev => [comment, ...prev]);
    setNewComment('');
    setCommentPosition(null);

    setActivities(prev => [{
      id: `activity-${Date.now()}`,
      type: 'comment_added',
      userId: currentUser.id,
      timestamp: new Date(),
      details: 'Added a comment',
    }, ...prev.slice(0, 49)]);
  }, [newComment, commentPosition, currentUser.id]);

  const resolveComment = useCallback((commentId: string) => {
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, resolved: true } : c
    ));
  }, []);

  const replyToComment = useCallback((commentId: string, content: string) => {
    const reply: FlowComment = {
      id: `reply-${Date.now()}`,
      authorId: currentUser.id,
      content,
      timestamp: new Date(),
      resolved: false,
    };

    setComments(prev => prev.map(c => 
      c.id === commentId 
        ? { ...c, replies: [...(c.replies || []), reply] }
        : c
    ));
  }, [currentUser.id]);

  const toggleFlowLock = useCallback(() => {
    setCollaborationState(prev => ({
      ...prev,
      isLocked: !prev.isLocked,
      lockedBy: !prev.isLocked ? currentUser.id : undefined,
    }));
  }, [currentUser.id]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Collaboration Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">
              Collaborative Flow Editor
            </Typography>
            
            {/* Collaborators */}
            <AvatarGroup max={4} onClick={() => setShowCollaborators(true)} sx={{ cursor: 'pointer' }}>
              {collaborationState.collaborators.map(collaborator => (
                <Avatar
                  key={collaborator.id}
                  src={collaborator.avatar}
                  sx={{ 
                    width: 32, 
                    height: 32,
                    border: collaborator.isOnline ? `2px solid ${theme.palette.success.main}` : 'none',
                  }}
                >
                  {collaborator.name.charAt(0)}
                </Avatar>
              ))}
            </AvatarGroup>

            {/* Status Indicators */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {collaborationState.isLocked && (
                <Chip
                  icon={<LockIcon />}
                  label="Locked"
                  size="small"
                  color="warning"
                />
              )}
              <Chip
                icon={<SyncIcon />}
                label={`v${collaborationState.version}`}
                size="small"
                variant="outlined"
              />
              <Chip
                icon={<CommentIcon />}
                label={comments.filter(c => !c.resolved).length}
                size="small"
                color="info"
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Activity Feed">
              <IconButton onClick={() => setShowActivities(true)}>
                <Badge badgeContent={activities.length > 99 ? '99+' : activities.length} color="primary">
                  <HistoryIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Invite Collaborators">
              <IconButton onClick={() => setInviteDialogOpen(true)}>
                <PersonAddIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title={collaborationState.isLocked ? 'Unlock Flow' : 'Lock Flow'}>
              <IconButton onClick={toggleFlowLock}>
                {collaborationState.isLocked ? <LockIcon /> : <LockOpenIcon />}
              </IconButton>
            </Tooltip>

            <FormControlLabel
              control={
                <Switch
                  checked={showComments}
                  onChange={(e) => setShowComments(e.target.checked)}
                  size="small"
                />
              }
              label="Comments"
            />
          </Box>
        </Box>
      </Paper>

      {/* Main Flow Editor */}
      <Paper elevation={1} sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Box
          ref={reactFlowWrapper}
          sx={{ height: '100%' }}
          onContextMenu={handlePaneContextMenu}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            fitView
            attributionPosition="bottom-left"
            defaultEdgeOptions={{
              markerEnd: { type: MarkerType.Arrow },
            }}
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={12} 
              size={1}
              color={theme.palette.mode === 'dark' ? '#333' : '#ccc'}
            />
            <Controls position="bottom-right" />
          </ReactFlow>

          {/* Collaborative Cursors */}
          <AnimatePresence>
            {Object.entries(cursors).map(([userId, position]) => {
              const collaborator = collaborationState.collaborators.find(c => c.id === userId);
              if (!collaborator || !collaborator.isOnline || userId === currentUser.id) {return null;}
              
              return (
                <CollaborativeCursor
                  key={userId}
                  collaborator={collaborator}
                  position={position}
                />
              );
            })}
          </AnimatePresence>

          {/* Comment Overlays */}
          <AnimatePresence>
            {showComments && comments.filter(c => !c.resolved).map(comment => (
              <CommentOverlay
                key={comment.id}
                comment={comment}
                collaborators={collaborationState.collaborators}
                onResolve={resolveComment}
                onReply={replyToComment}
              />
            ))}
          </AnimatePresence>

          {/* New Comment Dialog */}
          {commentPosition && (
            <Dialog open={Boolean(commentPosition)} onClose={() => setCommentPosition(null)}>
              <DialogTitle>Add Comment</DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  margin="dense"
                  label="Comment"
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setCommentPosition(null)}>Cancel</Button>
                <Button onClick={addComment} variant="contained" disabled={!newComment.trim()}>
                  Add Comment
                </Button>
              </DialogActions>
            </Dialog>
          )}
        </Box>

        {/* Conflict Warning */}
        {collaborationState.conflicts.length > 0 && (
          <Alert severity="warning" sx={{ position: 'absolute', top: 16, left: 16, right: 16 }}>
            <strong>Merge Conflicts Detected:</strong> {collaborationState.conflicts.length} conflicts need resolution
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default CollaborativeFlowEditor;