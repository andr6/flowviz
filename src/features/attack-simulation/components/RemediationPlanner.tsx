/**
 * Remediation Planner Component
 *
 * Comprehensive remediation planning and tracking interface
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
  Checkbox,
  Avatar,
  AvatarGroup,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Badge,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CheckCircle,
  RadioButtonUnchecked,
  Assignment,
  Schedule,
  AttachMoney,
  Timeline,
  TrendingUp,
  Security,
  Build,
  People,
  ExpandMore,
  PlayArrow,
  Pause,
  Download,
  Share,
  Print,
} from '@mui/icons-material';
import {
  RemediationRecommendation,
  GapAnalysis,
  ImplementationStep,
  RemediationCategory,
  RemediationStatus,
  RemediationPlannerProps,
} from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const RemediationPlanner: React.FC<RemediationPlannerProps> = ({
  gapId,
  jobId,
  onRecommendationSave,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Data
  const [recommendations, setRecommendations] = useState<RemediationRecommendation[]>([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<RemediationRecommendation | null>(null);
  const [gaps, setGaps] = useState<GapAnalysis[]>([]);

  // Create recommendation dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRecommendation, setNewRecommendation] = useState({
    title: '',
    description: '',
    category: 'technical' as RemediationCategory,
    complexity: 'medium' as 'low' | 'medium' | 'high',
    estimatedCost: 'medium' as 'low' | 'medium' | 'high' | 'very_high',
    estimatedEffortHours: 0,
    priority: 50,
  });

  // Implementation steps
  const [steps, setSteps] = useState<Omit<ImplementationStep, 'completed' | 'completedAt' | 'completedBy'>[]>([]);
  const [stepForm, setStepForm] = useState({
    title: '',
    description: '',
    estimatedHours: 0,
  });

  // Resources
  const [requiredTools, setRequiredTools] = useState<string[]>([]);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [newTool, setNewTool] = useState('');
  const [newSkill, setNewSkill] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [gapId, jobId]);

  /**
   * Load recommendations and gaps
   */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (gapId) {
        // Load recommendations for specific gap
        const response = await fetch(`/api/simulations/gaps/${gapId}/recommendations`, {
          method: 'POST',
        });
        if (response.ok) {
          const recs = await response.json();
          setRecommendations(recs);
        }

        // Load gap details
        const gapResponse = await fetch(`/api/simulations/gaps/${gapId}`);
        if (gapResponse.ok) {
          const gap = await gapResponse.json();
          setGaps([gap]);
        }
      } else if (jobId) {
        // Load all gaps for job
        const gapResponse = await fetch(`/api/simulations/jobs/${jobId}/gap-analysis`, {
          method: 'POST',
        });
        if (gapResponse.ok) {
          const data = await gapResponse.json();
          setGaps(data.gaps || []);
        }

        // Load all recommendations for job
        // Note: This would need a new endpoint or we fetch per gap
        const allRecs: RemediationRecommendation[] = [];
        for (const gap of gaps) {
          const recResponse = await fetch(`/api/simulations/gaps/${gap.id}/recommendations`, {
            method: 'POST',
          });
          if (recResponse.ok) {
            const recs = await recResponse.json();
            allRecs.push(...recs);
          }
        }
        setRecommendations(allRecs);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create new recommendation
   */
  const createRecommendation = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/simulations/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gapId,
          jobId,
          ...newRecommendation,
          implementationSteps: steps.map((step, index) => ({
            ...step,
            order: index + 1,
            completed: false,
          })),
          requiredTools,
          requiredSkills,
          requiredResources: [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create recommendation');
      }

      const created = await response.json();
      setRecommendations([...recommendations, created]);
      setShowCreateDialog(false);
      resetForm();
      onRecommendationSave?.(created);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create recommendation');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update recommendation status
   */
  const updateRecommendationStatus = async (id: string, status: RemediationStatus) => {
    try {
      const response = await fetch(`/api/simulations/recommendations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  /**
   * Toggle step completion
   */
  const toggleStepCompletion = async (recommendationId: string, stepIndex: number, completed: boolean) => {
    const rec = recommendations.find(r => r.id === recommendationId);
    if (!rec) return;

    const updatedSteps = [...rec.implementationSteps];
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      completed,
      completedAt: completed ? new Date() : undefined,
      completedBy: completed ? 'current-user' : undefined,
    };

    try {
      const response = await fetch(`/api/simulations/recommendations/${recommendationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ implementationSteps: updatedSteps }),
      });

      if (!response.ok) {
        throw new Error('Failed to update step');
      }

      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update step');
    }
  };

  /**
   * Add implementation step
   */
  const addStep = () => {
    if (!stepForm.title) return;

    setSteps([
      ...steps,
      {
        order: steps.length + 1,
        title: stepForm.title,
        description: stepForm.description,
        estimatedHours: stepForm.estimatedHours,
      },
    ]);

    setStepForm({ title: '', description: '', estimatedHours: 0 });
  };

  /**
   * Remove implementation step
   */
  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  /**
   * Reset form
   */
  const resetForm = () => {
    setNewRecommendation({
      title: '',
      description: '',
      category: 'technical',
      complexity: 'medium',
      estimatedCost: 'medium',
      estimatedEffortHours: 0,
      priority: 50,
    });
    setSteps([]);
    setRequiredTools([]);
    setRequiredSkills([]);
  };

  /**
   * Get filtered recommendations
   */
  const getFilteredRecommendations = () => {
    return recommendations.filter(rec => {
      if (statusFilter !== 'all' && rec.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && rec.category !== categoryFilter) return false;
      return true;
    });
  };

  /**
   * Calculate progress
   */
  const calculateProgress = (rec: RemediationRecommendation): number => {
    if (rec.implementationSteps.length === 0) return 0;
    const completed = rec.implementationSteps.filter(s => s.completed).length;
    return (completed / rec.implementationSteps.length) * 100;
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: RemediationStatus): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'primary';
      case 'approved':
        return 'info';
      case 'testing':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  /**
   * Export recommendations
   */
  const exportRecommendations = () => {
    const csv = [
      ['Title', 'Category', 'Status', 'Priority', 'Effort (hours)', 'Complexity', 'Cost', 'Progress'],
      ...recommendations.map(rec => [
        rec.title,
        rec.category,
        rec.status,
        rec.priority.toString(),
        rec.estimatedEffortHours?.toString() || 'N/A',
        rec.complexity,
        rec.estimatedCost,
        `${calculateProgress(rec).toFixed(0)}%`,
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remediation-plan-${Date.now()}.csv`;
    a.click();
  };

  if (loading && recommendations.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Remediation Planner
        </Typography>
        <LinearProgress />
      </Paper>
    );
  }

  const filteredRecommendations = getFilteredRecommendations();

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Remediation Planner</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={exportRecommendations}
            sx={{ mr: 1 }}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowCreateDialog(true)}
          >
            New Recommendation
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label={`All Recommendations (${recommendations.length})`} />
        <Tab label="In Progress" />
        <Tab label="Timeline View" />
        <Tab label="Resource Planning" />
      </Tabs>

      <TabPanel value={activeTab} index={0}>
        {/* Filters */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} label="Status">
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="testing">Testing</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} label="Category">
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="technical">Technical</MenuItem>
              <MenuItem value="process">Process</MenuItem>
              <MenuItem value="people">People</MenuItem>
              <MenuItem value="policy">Policy</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Recommendations Grid */}
        <Grid container spacing={2}>
          {filteredRecommendations.map(rec => (
            <Grid item xs={12} md={6} lg={4} key={rec.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Chip label={rec.category} size="small" />
                    <Chip
                      label={rec.status}
                      size="small"
                      color={getStatusColor(rec.status)}
                    />
                  </Box>

                  <Typography variant="h6" gutterBottom>
                    {rec.title}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" paragraph>
                    {rec.description}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Progress: {calculateProgress(rec).toFixed(0)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={calculateProgress(rec)}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>

                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Priority
                      </Typography>
                      <Typography variant="body2">{rec.priority}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Effort
                      </Typography>
                      <Typography variant="body2">{rec.estimatedEffortHours || 'N/A'}h</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Complexity
                      </Typography>
                      <Typography variant="body2">{rec.complexity}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Cost
                      </Typography>
                      <Typography variant="body2">{rec.estimatedCost}</Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="caption" color="text.secondary">
                    Implementation Steps ({rec.implementationSteps.filter(s => s.completed).length}/{rec.implementationSteps.length})
                  </Typography>
                  <List dense>
                    {rec.implementationSteps.slice(0, 3).map((step, index) => (
                      <ListItem key={index} dense>
                        <ListItemIcon>
                          <Checkbox
                            edge="start"
                            checked={step.completed}
                            onChange={e => toggleStepCompletion(rec.id, index, e.target.checked)}
                            size="small"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={step.title}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                  {rec.implementationSteps.length > 3 && (
                    <Typography variant="caption" color="text.secondary">
                      +{rec.implementationSteps.length - 3} more steps
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => setSelectedRecommendation(rec)}>
                    View Details
                  </Button>
                  {rec.status === 'pending' && (
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => updateRecommendationStatus(rec.id, 'approved')}
                    >
                      Approve
                    </Button>
                  )}
                  {rec.status === 'approved' && (
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => updateRecommendationStatus(rec.id, 'in_progress')}
                    >
                      Start
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {/* In Progress View */}
        {recommendations.filter(r => r.status === 'in_progress').map(rec => (
          <Accordion key={rec.id} sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="subtitle1" sx={{ flex: 1 }}>
                  {rec.title}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={calculateProgress(rec)}
                  sx={{ width: 200 }}
                />
                <Typography variant="caption">
                  {calculateProgress(rec).toFixed(0)}%
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stepper orientation="vertical">
                {rec.implementationSteps.map((step, index) => (
                  <Step key={index} active completed={step.completed}>
                    <StepLabel>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Checkbox
                          checked={step.completed}
                          onChange={e => toggleStepCompletion(rec.id, index, e.target.checked)}
                        />
                        <Typography>{step.title}</Typography>
                      </Box>
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
                      {step.estimatedHours && (
                        <Typography variant="caption" color="text.secondary">
                          Estimated: {step.estimatedHours}h
                        </Typography>
                      )}
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </AccordionDetails>
          </Accordion>
        ))}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {/* Timeline View */}
        <Typography variant="subtitle2" gutterBottom>
          Implementation Timeline
        </Typography>
        {/* Timeline visualization would go here */}
        <Alert severity="info">Timeline visualization coming soon</Alert>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        {/* Resource Planning */}
        <Typography variant="subtitle2" gutterBottom>
          Resource Requirements
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Required Tools
                </Typography>
                <List>
                  {Array.from(new Set(recommendations.flatMap(r => r.requiredTools))).map(tool => (
                    <ListItem key={tool}>
                      <ListItemIcon>
                        <Build />
                      </ListItemIcon>
                      <ListItemText primary={tool} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Required Skills
                </Typography>
                <List>
                  {Array.from(new Set(recommendations.flatMap(r => r.requiredSkills))).map(skill => (
                    <ListItem key={skill}>
                      <ListItemIcon>
                        <People />
                      </ListItemIcon>
                      <ListItemText primary={skill} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Create Recommendation Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Remediation Recommendation</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={newRecommendation.title}
            onChange={e => setNewRecommendation({ ...newRecommendation, title: e.target.value })}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Description"
            value={newRecommendation.description}
            onChange={e => setNewRecommendation({ ...newRecommendation, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
            required
          />

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newRecommendation.category}
                  onChange={e => setNewRecommendation({ ...newRecommendation, category: e.target.value as RemediationCategory })}
                  label="Category"
                >
                  <MenuItem value="technical">Technical</MenuItem>
                  <MenuItem value="process">Process</MenuItem>
                  <MenuItem value="people">People</MenuItem>
                  <MenuItem value="policy">Policy</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Priority (0-100)"
                value={newRecommendation.priority}
                onChange={e => setNewRecommendation({ ...newRecommendation, priority: parseInt(e.target.value) })}
              />
            </Grid>

            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>Complexity</InputLabel>
                <Select
                  value={newRecommendation.complexity}
                  onChange={e => setNewRecommendation({ ...newRecommendation, complexity: e.target.value as any })}
                  label="Complexity"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>Estimated Cost</InputLabel>
                <Select
                  value={newRecommendation.estimatedCost}
                  onChange={e => setNewRecommendation({ ...newRecommendation, estimatedCost: e.target.value as any })}
                  label="Estimated Cost"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="very_high">Very High</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Effort (hours)"
                value={newRecommendation.estimatedEffortHours}
                onChange={e => setNewRecommendation({ ...newRecommendation, estimatedEffortHours: parseInt(e.target.value) })}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" gutterBottom>
            Implementation Steps
          </Typography>

          <Box sx={{ mb: 2 }}>
            {steps.map((step, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {index + 1}. {step.title} ({step.estimatedHours}h)
                </Typography>
                <IconButton size="small" onClick={() => removeStep(index)}>
                  <Delete />
                </IconButton>
              </Box>
            ))}
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="Step Title"
                value={stepForm.title}
                onChange={e => setStepForm({ ...stepForm, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Description"
                value={stepForm.description}
                onChange={e => setStepForm({ ...stepForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Hours"
                value={stepForm.estimatedHours}
                onChange={e => setStepForm({ ...stepForm, estimatedHours: parseInt(e.target.value) })}
              />
            </Grid>
          </Grid>

          <Button
            size="small"
            startIcon={<Add />}
            onClick={addStep}
            sx={{ mt: 1 }}
          >
            Add Step
          </Button>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" gutterBottom>
            Required Resources
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 1 }}>
                {requiredTools.map(tool => (
                  <Chip
                    key={tool}
                    label={tool}
                    onDelete={() => setRequiredTools(requiredTools.filter(t => t !== tool))}
                    size="small"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  label="Add Tool"
                  value={newTool}
                  onChange={e => setNewTool(e.target.value)}
                  fullWidth
                />
                <Button
                  size="small"
                  onClick={() => {
                    if (newTool) {
                      setRequiredTools([...requiredTools, newTool]);
                      setNewTool('');
                    }
                  }}
                >
                  Add
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 1 }}>
                {requiredSkills.map(skill => (
                  <Chip
                    key={skill}
                    label={skill}
                    onDelete={() => setRequiredSkills(requiredSkills.filter(s => s !== skill))}
                    size="small"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  label="Add Skill"
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  fullWidth
                />
                <Button
                  size="small"
                  onClick={() => {
                    if (newSkill) {
                      setRequiredSkills([...requiredSkills, newSkill]);
                      setNewSkill('');
                    }
                  }}
                >
                  Add
                </Button>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={createRecommendation}
            disabled={!newRecommendation.title || steps.length === 0}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog
        open={Boolean(selectedRecommendation)}
        onClose={() => setSelectedRecommendation(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{selectedRecommendation?.title}</DialogTitle>
        <DialogContent>
          {selectedRecommendation && (
            <Box>
              <Typography variant="body1" paragraph>
                {selectedRecommendation.description}
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Category
                  </Typography>
                  <Typography>{selectedRecommendation.category}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedRecommendation.status}
                    color={getStatusColor(selectedRecommendation.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Priority
                  </Typography>
                  <Typography>{selectedRecommendation.priority}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Progress
                  </Typography>
                  <Typography>{calculateProgress(selectedRecommendation).toFixed(0)}%</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Implementation Steps
              </Typography>

              <Stepper orientation="vertical">
                {selectedRecommendation.implementationSteps.map((step, index) => (
                  <Step key={index} active completed={step.completed}>
                    <StepLabel>{step.title}</StepLabel>
                    <StepContent>
                      <Typography variant="body2">{step.description}</Typography>
                      {step.estimatedHours && (
                        <Typography variant="caption" color="text.secondary">
                          Estimated: {step.estimatedHours}h
                        </Typography>
                      )}
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedRecommendation(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default RemediationPlanner;
