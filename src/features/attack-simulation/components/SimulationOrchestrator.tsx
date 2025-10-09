/**
 * Simulation Orchestrator Component
 *
 * Main UI for creating, executing, and monitoring attack simulations
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  Settings,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
} from '@mui/icons-material';
import {
  SimulationPlan,
  SimulationJob,
  SimulationPlatform,
  ExecutionMode,
  SimulationTechnique,
  SimulationOrchestratorProps,
} from '../types';

const EXECUTION_MODES: { value: ExecutionMode; label: string; description: string }[] = [
  { value: 'safe', label: 'Safe Mode', description: 'No actual execution - shows what would run' },
  { value: 'simulation', label: 'Simulation', description: 'Contained execution in test environment' },
  { value: 'live', label: 'Live Mode', description: 'Actual execution in production (use with caution!)' },
  { value: 'validation', label: 'Validation', description: 'Test detection only without prevention' },
];

const PLATFORMS: { value: SimulationPlatform; label: string; description: string }[] = [
  { value: 'picus', label: 'Picus Security', description: 'Enterprise breach and attack simulation' },
  { value: 'atomic_red_team', label: 'Atomic Red Team', description: 'Open-source MITRE ATT&CK testing' },
  { value: 'caldera', label: 'MITRE CALDERA', description: 'Adversary emulation platform' },
  { value: 'attackiq', label: 'AttackIQ', description: 'Breach and attack simulation' },
  { value: 'custom', label: 'Custom Scripts', description: 'Custom attack simulation scripts' },
];

export const SimulationOrchestrator: React.FC<SimulationOrchestratorProps> = ({
  onSimulationComplete,
  onSimulationError,
  initialPlanId,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Configuration
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [flowId, setFlowId] = useState<string>('');
  const [targetEnvironment, setTargetEnvironment] = useState('staging');
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('safe');
  const [platform, setPlatform] = useState<SimulationPlatform>('picus');

  // Step 2: Technique Selection
  const [availableTechniques, setAvailableTechniques] = useState<SimulationTechnique[]>([]);
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);

  // Step 3: Review & Execute
  const [plan, setPlan] = useState<SimulationPlan | null>(null);
  const [job, setJob] = useState<SimulationJob | null>(null);
  const [monitoring, setMonitoring] = useState(false);

  // Available flows for selection
  const [flows, setFlows] = useState<any[]>([]);

  const steps = ['Configure Simulation', 'Select Techniques', 'Review & Execute', 'Monitor Progress'];

  useEffect(() => {
    loadFlows();
    if (initialPlanId) {
      loadPlan(initialPlanId);
    }
  }, [initialPlanId]);

  useEffect(() => {
    if (flowId) {
      loadTechniquesFromFlow(flowId);
    }
  }, [flowId]);

  useEffect(() => {
    if (job && job.status !== 'completed' && job.status !== 'failed' && job.status !== 'cancelled') {
      const interval = setInterval(() => {
        refreshJobStatus();
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [job]);

  /**
   * Load available flows
   */
  const loadFlows = async () => {
    try {
      const response = await fetch('/api/flows');
      if (response.ok) {
        const data = await response.json();
        setFlows(data);
      }
    } catch (error) {
      console.error('Failed to load flows:', error);
    }
  };

  /**
   * Load existing plan
   */
  const loadPlan = async (planId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/simulations/plans/${planId}`);

      if (!response.ok) {
        throw new Error('Failed to load plan');
      }

      const loadedPlan = await response.json();
      setPlan(loadedPlan);
      setName(loadedPlan.name);
      setDescription(loadedPlan.description || '');
      setFlowId(loadedPlan.flowId || '');
      setTargetEnvironment(loadedPlan.targetEnvironment);
      setExecutionMode(loadedPlan.executionMode);
      setPlatform(loadedPlan.platform);
      setSelectedTechniques(loadedPlan.techniques.map((t: any) => t.id));
      setActiveStep(2); // Go to review step
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load techniques from selected flow
   */
  const loadTechniquesFromFlow = async (selectedFlowId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/flows/${selectedFlowId}`);

      if (!response.ok) {
        throw new Error('Failed to load flow');
      }

      const flow = await response.json();
      const flowData = flow.flow_data || flow;

      // Extract techniques
      const techniques: SimulationTechnique[] = [];
      if (flowData.nodes) {
        for (const node of flowData.nodes) {
          if (node.data?.attackId) {
            techniques.push({
              id: node.data.attackId,
              name: node.data.label || node.data.name || node.data.attackId,
              tactic: node.data.tactic,
              description: node.data.description,
              platforms: node.data.platforms || [],
              dataSource: node.data.dataSources || [],
            });
          }
        }
      }

      setAvailableTechniques(techniques);
      setSelectedTechniques(techniques.map(t => t.id));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load techniques');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create simulation plan
   */
  const createPlan = async () => {
    try {
      setLoading(true);
      setError(null);

      const techniques = availableTechniques.filter(t => selectedTechniques.includes(t.id));

      const response = await fetch('/api/simulations/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          flowId,
          sourceType: 'flow',
          targetEnvironment,
          executionMode,
          platform,
          techniques,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create simulation plan');
      }

      const createdPlan = await response.json();
      setPlan(createdPlan);
      setActiveStep(2);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Execute simulation
   */
  const executeSimulation = async () => {
    if (!plan) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/simulations/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          executionMode,
          targetEnvironment,
          executedBy: 'current-user', // Would come from auth context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute simulation');
      }

      const executedJob = await response.json();
      setJob(executedJob);
      setActiveStep(3);
      setMonitoring(true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to execute simulation';
      setError(errorMsg);
      onSimulationError?.(new Error(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh job status
   */
  const refreshJobStatus = async () => {
    if (!job) return;

    try {
      const response = await fetch(`/api/simulations/jobs/${job.id}`);

      if (!response.ok) {
        throw new Error('Failed to refresh job status');
      }

      const updatedJob = await response.json();
      setJob(updatedJob);

      if (updatedJob.status === 'completed') {
        setMonitoring(false);
        onSimulationComplete?.(updatedJob);
      } else if (updatedJob.status === 'failed') {
        setMonitoring(false);
        setError(updatedJob.errorMessage || 'Simulation failed');
        onSimulationError?.(new Error(updatedJob.errorMessage || 'Simulation failed'));
      }
    } catch (error) {
      console.error('Failed to refresh job status:', error);
    }
  };

  /**
   * Cancel simulation
   */
  const cancelSimulation = async () => {
    if (!job) return;

    try {
      await fetch(`/api/simulations/jobs/${job.id}/cancel`, { method: 'POST' });
      setMonitoring(false);
      await refreshJobStatus();
    } catch (error) {
      console.error('Failed to cancel simulation:', error);
    }
  };

  /**
   * Handle next step
   */
  const handleNext = () => {
    if (activeStep === 0) {
      if (!name || !targetEnvironment || !platform) {
        setError('Please fill in all required fields');
        return;
      }
      setActiveStep(1);
    } else if (activeStep === 1) {
      if (selectedTechniques.length === 0) {
        setError('Please select at least one technique');
        return;
      }
      createPlan();
    }
  };

  /**
   * Handle back step
   */
  const handleBack = () => {
    setActiveStep(activeStep - 1);
    setError(null);
  };

  /**
   * Toggle technique selection
   */
  const toggleTechnique = (techniqueId: string) => {
    setSelectedTechniques(prev =>
      prev.includes(techniqueId)
        ? prev.filter(id => id !== techniqueId)
        : [...prev, techniqueId]
    );
  };

  /**
   * Render step content
   */
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <TextField
              fullWidth
              label="Simulation Name"
              value={name}
              onChange={e => setName(e.target.value)}
              margin="normal"
              required
            />

            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              margin="normal"
              multiline
              rows={3}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Source Flow</InputLabel>
              <Select value={flowId} onChange={e => setFlowId(e.target.value)} label="Source Flow">
                {flows.map(flow => (
                  <MenuItem key={flow.id} value={flow.id}>
                    {flow.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal" required>
              <InputLabel>Execution Mode</InputLabel>
              <Select
                value={executionMode}
                onChange={e => setExecutionMode(e.target.value as ExecutionMode)}
                label="Execution Mode"
              >
                {EXECUTION_MODES.map(mode => (
                  <MenuItem key={mode.value} value={mode.value}>
                    <Box>
                      <Typography variant="body1">{mode.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {mode.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal" required>
              <InputLabel>Platform</InputLabel>
              <Select
                value={platform}
                onChange={e => setPlatform(e.target.value as SimulationPlatform)}
                label="Platform"
              >
                {PLATFORMS.map(p => (
                  <MenuItem key={p.value} value={p.value}>
                    <Box>
                      <Typography variant="body1">{p.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Target Environment"
              value={targetEnvironment}
              onChange={e => setTargetEnvironment(e.target.value)}
              margin="normal"
              required
              helperText="e.g., staging, dev, production"
            />
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Techniques ({selectedTechniques.length} of {availableTechniques.length} selected)
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Button onClick={() => setSelectedTechniques(availableTechniques.map(t => t.id))} sx={{ mr: 1 }}>
                Select All
              </Button>
              <Button onClick={() => setSelectedTechniques([])}>
                Deselect All
              </Button>
            </Box>

            <List>
              {availableTechniques.map(technique => (
                <ListItem
                  key={technique.id}
                  button
                  onClick={() => toggleTechnique(technique.id)}
                >
                  <ListItemIcon>
                    <Checkbox
                      checked={selectedTechniques.includes(technique.id)}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${technique.id} - ${technique.name}`}
                    secondary={technique.tactic}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Simulation Plan
            </Typography>

            {plan && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Configuration
                      </Typography>
                      <Typography variant="body2">Name: {plan.name}</Typography>
                      <Typography variant="body2">Mode: {plan.executionMode}</Typography>
                      <Typography variant="body2">Platform: {plan.platform}</Typography>
                      <Typography variant="body2">Environment: {plan.targetEnvironment}</Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Techniques
                      </Typography>
                      <Typography variant="h4">{plan.techniqueCount}</Typography>
                      <Typography variant="caption">techniques to execute</Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  {plan.executionMode === 'live' && (
                    <Alert severity="warning">
                      ⚠️ Live execution mode - techniques will be executed in production environment!
                    </Alert>
                  )}
                </Grid>
              </Grid>
            )}

            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={executeSimulation}
                disabled={loading}
                startIcon={<PlayArrow />}
                size="large"
              >
                Execute Simulation
              </Button>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Simulation Progress
            </Typography>

            {job && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2">
                    Status: <Chip label={job.status} color={getStatusColor(job.status)} size="small" />
                  </Typography>
                  <Typography variant="body2">
                    Progress: {job.progressPercentage}%
                  </Typography>
                </Box>

                <LinearProgress variant="determinate" value={job.progressPercentage} sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                          Executed
                        </Typography>
                        <Typography variant="h5">{job.techniquesExecuted}</Typography>
                        <Typography variant="caption">of {job.totalTechniques}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                          Successful
                        </Typography>
                        <Typography variant="h5" color="success.main">
                          {job.techniquesSuccessful}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                          Blocked
                        </Typography>
                        <Typography variant="h5" color="warning.main">
                          {job.techniquesBlocked}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                          Failed
                        </Typography>
                        <Typography variant="h5" color="error.main">
                          {job.techniquesFailed}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {job.status === 'completed' && (
                  <Box sx={{ mt: 3 }}>
                    <Alert severity="success">
                      Simulation completed successfully!
                    </Alert>

                    <Grid container spacing={2} sx={{ mt: 2 }}>
                      <Grid item xs={12} md={4}>
                        <Card>
                          <CardContent>
                            <Typography variant="subtitle2" color="text.secondary">
                              Detection Score
                            </Typography>
                            <Typography variant="h4">{job.detectionScore?.toFixed(1) || 0}%</Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Card>
                          <CardContent>
                            <Typography variant="subtitle2" color="text.secondary">
                              Prevention Score
                            </Typography>
                            <Typography variant="h4">{job.preventionScore?.toFixed(1) || 0}%</Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Card>
                          <CardContent>
                            <Typography variant="subtitle2" color="text.secondary">
                              Overall Score
                            </Typography>
                            <Typography variant="h4">{job.overallScore?.toFixed(1) || 0}%</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {monitoring && (
                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={cancelSimulation}
                      startIcon={<Stop />}
                    >
                      Cancel Simulation
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'info';
      case 'pending':
      case 'initializing':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Attack Simulation Orchestrator
      </Typography>

      <Stepper activeStep={activeStep} sx={{ my: 3 }}>
        {steps.map(label => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Box sx={{ minHeight: 400 }}>{renderStepContent()}</Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button disabled={activeStep === 0 || loading} onClick={handleBack}>
          Back
        </Button>

        {activeStep < 2 && (
          <Button variant="contained" onClick={handleNext} disabled={loading}>
            {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default SimulationOrchestrator;
