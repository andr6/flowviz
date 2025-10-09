/**
 * Playbook Editor
 *
 * Comprehensive editor for viewing and modifying incident response playbooks
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIcon,
  PlayArrow as PlayIcon,
  Description as DescriptionIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import type {
  IncidentPlaybook,
  PlaybookPhase,
  Action,
  DetectionRule,
  PhaseName,
  ActionType,
  PlaybookStatus,
} from '../types';

// ============================================================================
// Types
// ============================================================================

interface PlaybookEditorProps {
  playbookId: string;
  onSave: (playbook: IncidentPlaybook) => void;
  onCancel: () => void;
  readonly?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// ============================================================================
// Tab Panel Component
// ============================================================================

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

// ============================================================================
// Main Editor Component
// ============================================================================

export const PlaybookEditor: React.FC<PlaybookEditorProps> = ({
  playbookId,
  onSave,
  onCancel,
  readonly = false,
}) => {
  const [playbook, setPlaybook] = useState<IncidentPlaybook | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [editingPhase, setEditingPhase] = useState<PlaybookPhase | null>(null);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [editingRule, setEditingRule] = useState<DetectionRule | null>(null);

  useEffect(() => {
    loadPlaybook();
  }, [playbookId]);

  const loadPlaybook = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/playbooks/${playbookId}`);
      if (!response.ok) {
        throw new Error('Failed to load playbook');
      }
      const data = await response.json();
      setPlaybook(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!playbook) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/playbooks/${playbookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: playbook.name,
          description: playbook.description,
          severity: playbook.severity,
          status: playbook.status,
          requiredRoles: playbook.requiredRoles,
          tags: playbook.tags,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save playbook');
      }

      const updated = await response.json();
      setPlaybook(updated);
      onSave(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !playbook) {
    return (
      <Alert severity="error" onClose={() => setError(null)}>
        {error}
      </Alert>
    );
  }

  if (!playbook) {
    return <Alert severity="warning">Playbook not found</Alert>;
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" component="h1">
              {playbook.name}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip label={playbook.status} size="small" color="primary" />
              <Chip label={playbook.severity} size="small" />
              <Chip label={`v${playbook.version}`} size="small" variant="outlined" />
            </Stack>
          </Box>
          <Box>
            {!readonly && (
              <>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                  sx={{ mr: 1 }}
                >
                  Save
                </Button>
                <Button
                  startIcon={<PlayIcon />}
                  sx={{ mr: 1 }}
                >
                  Execute
                </Button>
              </>
            )}
            <IconButton onClick={onCancel}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ mb: 2 }}>
          <Tab label="Overview" />
          <Tab label={`Phases (${playbook.phases.length})`} />
          <Tab label={`Actions (${playbook.phases.reduce((sum, p) => sum + p.actions.length, 0)})`} />
          <Tab label={`Detection Rules (${playbook.detectionRules.length})`} />
          <Tab label="History" />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={currentTab} index={0}>
          <OverviewTab playbook={playbook} setPlaybook={setPlaybook} readonly={readonly} />
        </TabPanel>

        {/* Phases Tab */}
        <TabPanel value={currentTab} index={1}>
          <PhasesTab
            playbook={playbook}
            setPlaybook={setPlaybook}
            editingPhase={editingPhase}
            setEditingPhase={setEditingPhase}
            readonly={readonly}
          />
        </TabPanel>

        {/* Actions Tab */}
        <TabPanel value={currentTab} index={2}>
          <ActionsTab
            playbook={playbook}
            setPlaybook={setPlaybook}
            editingAction={editingAction}
            setEditingAction={setEditingAction}
            readonly={readonly}
          />
        </TabPanel>

        {/* Detection Rules Tab */}
        <TabPanel value={currentTab} index={3}>
          <DetectionRulesTab
            playbook={playbook}
            setPlaybook={setPlaybook}
            editingRule={editingRule}
            setEditingRule={setEditingRule}
            readonly={readonly}
          />
        </TabPanel>

        {/* History Tab */}
        <TabPanel value={currentTab} index={4}>
          <HistoryTab playbookId={playbookId} />
        </TabPanel>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Overview Tab
// ============================================================================

interface OverviewTabProps {
  playbook: IncidentPlaybook;
  setPlaybook: React.Dispatch<React.SetStateAction<IncidentPlaybook | null>>;
  readonly: boolean;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ playbook, setPlaybook, readonly }) => {
  return (
    <Box>
      <TextField
        fullWidth
        label="Name"
        value={playbook.name}
        onChange={(e) => setPlaybook(prev => prev ? { ...prev, name: e.target.value } : null)}
        disabled={readonly}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Description"
        multiline
        rows={3}
        value={playbook.description || ''}
        onChange={(e) => setPlaybook(prev => prev ? { ...prev, description: e.target.value } : null)}
        disabled={readonly}
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl sx={{ flexGrow: 1 }}>
          <InputLabel>Severity</InputLabel>
          <Select
            value={playbook.severity}
            onChange={(e) => setPlaybook(prev => prev ? { ...prev, severity: e.target.value as any } : null)}
            disabled={readonly}
            label="Severity"
          >
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ flexGrow: 1 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={playbook.status}
            onChange={(e) => setPlaybook(prev => prev ? { ...prev, status: e.target.value as PlaybookStatus } : null)}
            disabled={readonly}
            label="Status"
          >
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="review">Review</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Typography variant="subtitle2" gutterBottom>
        Metadata
      </Typography>
      <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 2 }}>
        <Typography variant="body2">
          <strong>Estimated Time:</strong> {playbook.estimatedTimeMinutes} minutes
        </Typography>
        <Typography variant="body2">
          <strong>Generation Confidence:</strong> {playbook.generationConfidence ? `${(playbook.generationConfidence * 100).toFixed(0)}%` : 'N/A'}
        </Typography>
        <Typography variant="body2">
          <strong>Execution Count:</strong> {playbook.executionCount}
        </Typography>
        {playbook.successRate && (
          <Typography variant="body2">
            <strong>Success Rate:</strong> {(playbook.successRate * 100).toFixed(0)}%
          </Typography>
        )}
        <Typography variant="body2">
          <strong>Created:</strong> {new Date(playbook.createdAt).toLocaleString()}
        </Typography>
        <Typography variant="body2">
          <strong>Updated:</strong> {new Date(playbook.updatedAt).toLocaleString()}
        </Typography>
      </Box>

      <Typography variant="subtitle2" gutterBottom>
        Required Roles
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
        {playbook.requiredRoles.map(role => (
          <Chip key={role} label={role} size="small" sx={{ mb: 1 }} />
        ))}
      </Stack>

      <Typography variant="subtitle2" gutterBottom>
        Tags
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        {playbook.tags.map(tag => (
          <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ mb: 1 }} />
        ))}
      </Stack>
    </Box>
  );
};

// ============================================================================
// Phases Tab
// ============================================================================

interface PhasesTabProps {
  playbook: IncidentPlaybook;
  setPlaybook: React.Dispatch<React.SetStateAction<IncidentPlaybook | null>>;
  editingPhase: PlaybookPhase | null;
  setEditingPhase: React.Dispatch<React.SetStateAction<PlaybookPhase | null>>;
  readonly: boolean;
}

const PhasesTab: React.FC<PhasesTabProps> = ({ playbook, readonly }) => {
  const phaseLabels: Record<PhaseName, string> = {
    preparation: '📋 Preparation',
    detection: '🔍 Detection',
    analysis: '🔬 Analysis',
    containment: '🛡️ Containment',
    eradication: '🔥 Eradication',
    recovery: '♻️ Recovery',
    post_incident: '📊 Post-Incident',
  };

  return (
    <Box>
      {!readonly && (
        <Button startIcon={<AddIcon />} variant="outlined" sx={{ mb: 2 }}>
          Add Phase
        </Button>
      )}

      {playbook.phases.map((phase, index) => (
        <Accordion key={phase.id} defaultExpanded={index === 0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <DragIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography sx={{ flexGrow: 1 }}>
                {phaseLabels[phase.phaseName]} ({phase.actions.length} actions)
              </Typography>
              <Chip
                label={`${phase.estimatedDurationMinutes || 0} min`}
                size="small"
                sx={{ mr: 1 }}
              />
              {phase.isAutomated && (
                <Chip label="Automated" size="small" color="success" sx={{ mr: 1 }} />
              )}
              {phase.requiresApproval && (
                <Chip label="Requires Approval" size="small" color="warning" />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {phase.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {phase.description}
              </Typography>
            )}

            <List>
              {phase.actions.map((action, actionIndex) => (
                <ListItem key={action.id} divider={actionIndex < phase.actions.length - 1}>
                  <ListItemText
                    primary={`${action.actionOrder}. ${action.title}`}
                    secondary={
                      <>
                        <Chip label={action.actionType} size="small" sx={{ mr: 1 }} />
                        {action.estimatedDurationMinutes} min
                        {action.requiresApproval && ' • Requires Approval'}
                      </>
                    }
                  />
                  {!readonly && (
                    <ListItemSecondaryAction>
                      <IconButton edge="end" size="small">
                        <EditIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

// ============================================================================
// Actions Tab
// ============================================================================

interface ActionsTabProps {
  playbook: IncidentPlaybook;
  setPlaybook: React.Dispatch<React.SetStateAction<IncidentPlaybook | null>>;
  editingAction: Action | null;
  setEditingAction: React.Dispatch<React.SetStateAction<Action | null>>;
  readonly: boolean;
}

const ActionsTab: React.FC<ActionsTabProps> = ({ playbook, readonly }) => {
  const allActions = playbook.phases.flatMap(phase =>
    phase.actions.map(action => ({ ...action, phaseName: phase.phaseName }))
  );

  const actionTypeColors: Record<ActionType, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info'> = {
    manual: 'default',
    automated: 'success',
    api_call: 'primary',
    script: 'info',
    notification: 'secondary',
    approval: 'warning',
    data_collection: 'info',
    analysis: 'info',
    documentation: 'default',
  };

  return (
    <Box>
      {!readonly && (
        <Button startIcon={<AddIcon />} variant="outlined" sx={{ mb: 2 }}>
          Add Action
        </Button>
      )}

      <List>
        {allActions.map((action, index) => (
          <ListItem key={action.id} divider={index < allActions.length - 1}>
            <ListItemText
              primary={action.title}
              secondary={
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {action.description}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={action.actionType}
                      size="small"
                      color={actionTypeColors[action.actionType]}
                      sx={{ mr: 1 }}
                    />
                    <Chip label={(action as any).phaseName} size="small" variant="outlined" sx={{ mr: 1 }} />
                    <Chip label={`${action.estimatedDurationMinutes} min`} size="small" variant="outlined" />
                    {action.requiresApproval && (
                      <Chip label="Approval Required" size="small" color="warning" sx={{ ml: 1 }} />
                    )}
                  </Box>
                </Box>
              }
            />
            {!readonly && (
              <ListItemSecondaryAction>
                <IconButton edge="end" size="small">
                  <EditIcon />
                </IconButton>
              </ListItemSecondaryAction>
            )}
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

// ============================================================================
// Detection Rules Tab
// ============================================================================

interface DetectionRulesTabProps {
  playbook: IncidentPlaybook;
  setPlaybook: React.Dispatch<React.SetStateAction<IncidentPlaybook | null>>;
  editingRule: DetectionRule | null;
  setEditingRule: React.Dispatch<React.SetStateAction<DetectionRule | null>>;
  readonly: boolean;
}

const DetectionRulesTab: React.FC<DetectionRulesTabProps> = ({ playbook, readonly }) => {
  const [viewingRule, setViewingRule] = useState<DetectionRule | null>(null);

  return (
    <Box>
      {!readonly && (
        <Button startIcon={<AddIcon />} variant="outlined" sx={{ mb: 2 }}>
          Add Detection Rule
        </Button>
      )}

      <List>
        {playbook.detectionRules.map((rule, index) => (
          <ListItem key={rule.id} divider={index < playbook.detectionRules.length - 1}>
            <ListItemText
              primary={rule.ruleName}
              secondary={
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {rule.description}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip label={rule.ruleType.toUpperCase()} size="small" color="primary" sx={{ mr: 1 }} />
                    {rule.mitreTechniqueId && (
                      <Chip label={rule.mitreTechniqueId} size="small" variant="outlined" sx={{ mr: 1 }} />
                    )}
                    {rule.confidenceScore && (
                      <Chip
                        label={`${(rule.confidenceScore * 100).toFixed(0)}% confidence`}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                    )}
                    {rule.isActive && <Chip label="Active" size="small" color="success" sx={{ mr: 1 }} />}
                    {rule.deployed && <Chip label="Deployed" size="small" color="success" />}
                  </Box>
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <Tooltip title="View Rule">
                <IconButton edge="end" size="small" onClick={() => setViewingRule(rule)}>
                  <CodeIcon />
                </IconButton>
              </Tooltip>
              {!readonly && (
                <>
                  <IconButton edge="end" size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" size="small">
                    <DeleteIcon />
                  </IconButton>
                </>
              )}
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {/* Rule Viewer Dialog */}
      <Dialog
        open={!!viewingRule}
        onClose={() => setViewingRule(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {viewingRule?.ruleName}
          <Typography variant="body2" color="text.secondary">
            {viewingRule?.ruleType.toUpperCase()}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={15}
            value={viewingRule?.ruleContent || ''}
            InputProps={{
              readOnly: true,
              sx: { fontFamily: 'monospace', fontSize: '0.875rem' },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingRule(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ============================================================================
// History Tab
// ============================================================================

interface HistoryTabProps {
  playbookId: string;
}

const HistoryTab: React.FC<HistoryTabProps> = ({ playbookId }) => {
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExecutions();
  }, [playbookId]);

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/playbooks/${playbookId}/executions`);
      if (response.ok) {
        const data = await response.json();
        setExecutions(data);
      }
    } catch (error) {
      console.error('Failed to load executions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (executions.length === 0) {
    return (
      <Alert severity="info">
        No execution history yet. Execute this playbook to see history here.
      </Alert>
    );
  }

  return (
    <List>
      {executions.map((execution, index) => (
        <ListItem key={execution.id} divider={index < executions.length - 1}>
          <ListItemText
            primary={`Execution ${execution.id}`}
            secondary={
              <Box>
                <Typography variant="body2">
                  Started: {new Date(execution.startedAt).toLocaleString()}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip label={execution.status} size="small" color="primary" sx={{ mr: 1 }} />
                  <Chip
                    label={`${execution.completionPercentage}% complete`}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                  {execution.executedBy && (
                    <Chip label={execution.executedBy} size="small" variant="outlined" />
                  )}
                </Box>
              </Box>
            }
          />
          <ListItemSecondaryAction>
            <IconButton edge="end" size="small">
              <DescriptionIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );
};

export default PlaybookEditor;
