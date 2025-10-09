import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Pause,
  Settings,
  Add,
  Delete,
  Edit,
  ExpandMore,
  Computer,
  Security,
  Warning,
  CheckCircle,
  Schedule,
  Timeline,
  BugReport,
  Shield,
  Visibility,
  Assessment,
} from '@mui/icons-material';
import { AdvancedSecurityService } from '../services/AdvancedSecurityService';
import type {
  AttackSimulation,
  SimulationTechnique,
  SimulationTarget,
  SimulationResult,
  FrameworkIntegration,
} from '../types/AdvancedSecurity';

interface SimulationOrchestratorProps {
  onSimulationComplete?: (results: SimulationResult[]) => void;
}

export const AttackSimulationOrchestrator: React.FC<SimulationOrchestratorProps> = ({
  onSimulationComplete
}) => {
  const [simulations, setSimulations] = useState<AttackSimulation[]>([]);
  const [activeSimulation, setActiveSimulation] = useState<AttackSimulation | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState('');
  const [availableFrameworks, setAvailableFrameworks] = useState<FrameworkIntegration[]>([]);
  const [simulationResults, setSimulationResults] = useState<Record<string, SimulationResult[]>>({});
  const [loading, setLoading] = useState(false);
  
  // New simulation form state
  const [newSimulation, setNewSimulation] = useState({
    name: '',
    description: '',
    framework: '',
    techniques: [] as string[],
    targets: [] as SimulationTarget[],
    parameters: {} as Record<string, any>,
    schedule: {
      enabled: false,
      cron: '',
      timezone: 'UTC'
    }
  });

  const securityService = new AdvancedSecurityService();

  useEffect(() => {
    loadData();
    const interval = setInterval(updateSimulationStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [simulationsData, frameworksData] = await Promise.all([
        securityService.getAttackSimulations(),
        securityService.getFrameworkIntegrations()
      ]);
      
      setSimulations(simulationsData);
      setAvailableFrameworks(frameworksData);
      
      // Load results for all simulations
      const results: Record<string, SimulationResult[]> = {};
      for (const sim of simulationsData) {
        try {
          const simResults = await securityService.getSimulationResults(sim.id);
          results[sim.id] = simResults;
        } catch (error) {
          console.error(`Failed to load results for simulation ${sim.id}:`, error);
          results[sim.id] = [];
        }
      }
      setSimulationResults(results);
    } catch (error) {
      console.error('Failed to load simulation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSimulationStatus = async () => {
    try {
      const updatedSimulations = await securityService.getAttackSimulations();
      setSimulations(updatedSimulations);
      
      // Update active simulation if it exists
      if (activeSimulation) {
        const updated = updatedSimulations.find(s => s.id === activeSimulation.id);
        if (updated) {
          setActiveSimulation(updated);
        }
      }
    } catch (error) {
      console.error('Failed to update simulation status:', error);
    }
  };

  const createSimulation = async () => {
    try {
      const simulation: Partial<AttackSimulation> = {
        name: newSimulation.name,
        description: newSimulation.description,
        framework: newSimulation.framework,
        techniques: newSimulation.techniques.map(id => ({ 
          id, 
          name: `Technique ${id}`, 
          mitre_id: id,
          parameters: {} 
        })),
        targets: newSimulation.targets,
        parameters: newSimulation.parameters,
        schedule: newSimulation.schedule.enabled ? newSimulation.schedule : undefined,
        status: 'pending',
        progress: 0,
        created: new Date().toISOString(),
        results: []
      };

      await securityService.createAttackSimulation(simulation as AttackSimulation);
      
      // Reset form
      setNewSimulation({
        name: '',
        description: '',
        framework: '',
        techniques: [],
        targets: [],
        parameters: {},
        schedule: { enabled: false, cron: '', timezone: 'UTC' }
      });
      
      setCreateDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Failed to create simulation:', error);
    }
  };

  const runSimulation = async (simulationId: string) => {
    try {
      await securityService.runAttackSimulation(simulationId);
      loadData();
    } catch (error) {
      console.error('Failed to run simulation:', error);
    }
  };

  const stopSimulation = async (simulationId: string) => {
    try {
      await securityService.stopAttackSimulation(simulationId);
      loadData();
    } catch (error) {
      console.error('Failed to stop simulation:', error);
    }
  };

  const deleteSimulation = async (simulationId: string) => {
    try {
      await securityService.deleteAttackSimulation(simulationId);
      loadData();
    } catch (error) {
      console.error('Failed to delete simulation:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'warning';
      case 'failed': return 'error';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const getFrameworkIcon = (framework: string) => {
    switch (framework.toLowerCase()) {
      case 'caldera': return <Computer />;
      case 'atomic': return <BugReport />;
      case 'infection_monkey': return <Security />;
      case 'mordor': return <Assessment />;
      default: return <Shield />;
    }
  };

  const addTechnique = (techniqueId: string) => {
    if (!newSimulation.techniques.includes(techniqueId)) {
      setNewSimulation(prev => ({
        ...prev,
        techniques: [...prev.techniques, techniqueId]
      }));
    }
  };

  const removeTechnique = (techniqueId: string) => {
    setNewSimulation(prev => ({
      ...prev,
      techniques: prev.techniques.filter(t => t !== techniqueId)
    }));
  };

  const addTarget = () => {
    const newTarget: SimulationTarget = {
      id: `target-${Date.now()}`,
      type: 'host',
      address: '',
      credentials: {},
      metadata: {}
    };
    
    setNewSimulation(prev => ({
      ...prev,
      targets: [...prev.targets, newTarget]
    }));
  };

  const removeTarget = (targetId: string) => {
    setNewSimulation(prev => ({
      ...prev,
      targets: prev.targets.filter(t => t.id !== targetId)
    }));
  };

  const updateTarget = (targetId: string, field: string, value: any) => {
    setNewSimulation(prev => ({
      ...prev,
      targets: prev.targets.map(t => 
        t.id === targetId ? { ...t, [field]: value } : t
      )
    }));
  };

  // Common MITRE ATT&CK techniques for quick selection
  const commonTechniques = [
    'T1078', 'T1055', 'T1059', 'T1105', 'T1027', 'T1036', 'T1070', 'T1083',
    'T1087', 'T1135', 'T1003', 'T1021', 'T1057', 'T1082', 'T1016', 'T1049'
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Attack Simulation Orchestrator</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Simulation
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Active Simulation Status */}
      {activeSimulation && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            Active Simulation: {activeSimulation.name}
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={activeSimulation.progress} 
            sx={{ mt: 1 }}
          />
          <Typography variant="caption">
            Progress: {activeSimulation.progress}% - Status: {activeSimulation.status}
          </Typography>
        </Alert>
      )}

      {/* Simulations Grid */}
      <Grid container spacing={3}>
        {simulations.map((simulation) => (
          <Grid item xs={12} md={6} lg={4} key={simulation.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {getFrameworkIcon(simulation.framework)}
                  <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                    {simulation.name}
                  </Typography>
                  <Chip
                    label={simulation.status}
                    color={getStatusColor(simulation.status) as any}
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {simulation.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" display="block">
                    Framework: {simulation.framework}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Techniques: {simulation.techniques.length}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Targets: {simulation.targets.length}
                  </Typography>
                </Box>

                {simulation.status === 'running' && (
                  <Box sx={{ mb: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={simulation.progress}
                      color="warning"
                    />
                    <Typography variant="caption">
                      Progress: {simulation.progress}%
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {simulation.status === 'pending' && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PlayArrow />}
                      onClick={() => runSimulation(simulation.id)}
                    >
                      Run
                    </Button>
                  )}
                  
                  {simulation.status === 'running' && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<Stop />}
                      onClick={() => stopSimulation(simulation.id)}
                    >
                      Stop
                    </Button>
                  )}

                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => setActiveSimulation(simulation)}
                  >
                    Details
                  </Button>

                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => deleteSimulation(simulation.id)}
                  >
                    <Delete />
                  </IconButton>
                </Box>

                {/* Results Summary */}
                {simulationResults[simulation.id] && simulationResults[simulation.id].length > 0 && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">
                      Latest Results:
                    </Typography>
                    {simulationResults[simulation.id].slice(-3).map((result, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        {result.success ? (
                          <CheckCircle color="success" sx={{ mr: 1, fontSize: 16 }} />
                        ) : (
                          <Warning color="error" sx={{ mr: 1, fontSize: 16 }} />
                        )}
                        <Typography variant="caption">
                          {result.technique} - {result.success ? 'Success' : 'Failed'}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create Simulation Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Attack Simulation</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Simulation Name"
                value={newSimulation.name}
                onChange={(e) => setNewSimulation(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Framework</InputLabel>
                <Select
                  value={newSimulation.framework}
                  onChange={(e) => setNewSimulation(prev => ({ ...prev, framework: e.target.value }))}
                >
                  {availableFrameworks.map((framework) => (
                    <MenuItem key={framework.name} value={framework.name}>
                      {framework.name} - {framework.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={newSimulation.description}
                onChange={(e) => setNewSimulation(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                MITRE ATT&CK Techniques
              </Typography>
              <Box sx={{ mb: 2 }}>
                {commonTechniques.map((technique) => (
                  <Chip
                    key={technique}
                    label={technique}
                    onClick={() => addTechnique(technique)}
                    color={newSimulation.techniques.includes(technique) ? 'primary' : 'default'}
                    variant={newSimulation.techniques.includes(technique) ? 'filled' : 'outlined'}
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
              
              {newSimulation.techniques.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Selected Techniques:
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {newSimulation.techniques.map((technique) => (
                      <Chip
                        key={technique}
                        label={technique}
                        onDelete={() => removeTechnique(technique)}
                        color="primary"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2">
                  Simulation Targets
                </Typography>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={addTarget}
                >
                  Add Target
                </Button>
              </Box>
              
              {newSimulation.targets.map((target, index) => (
                <Card key={target.id} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent sx={{ py: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Type</InputLabel>
                          <Select
                            value={target.type}
                            onChange={(e) => updateTarget(target.id, 'type', e.target.value)}
                          >
                            <MenuItem value="host">Host</MenuItem>
                            <MenuItem value="network">Network</MenuItem>
                            <MenuItem value="service">Service</MenuItem>
                            <MenuItem value="user">User</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Address/Identifier"
                          value={target.address}
                          onChange={(e) => updateTarget(target.id, 'address', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <IconButton
                          color="error"
                          onClick={() => removeTarget(target.id)}
                        >
                          <Delete />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newSimulation.schedule.enabled}
                    onChange={(e) => setNewSimulation(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, enabled: e.target.checked }
                    }))}
                  />
                }
                label="Enable Scheduled Execution"
              />
              
              {newSimulation.schedule.enabled && (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Cron Expression"
                    placeholder="0 0 * * * (daily at midnight)"
                    value={newSimulation.schedule.cron}
                    onChange={(e) => setNewSimulation(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, cron: e.target.value }
                    }))}
                    helperText="Use cron format: minute hour day month weekday"
                  />
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={createSimulation}
            variant="contained"
            disabled={!newSimulation.name || !newSimulation.framework}
          >
            Create Simulation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Simulation Details Dialog */}
      {activeSimulation && (
        <Dialog
          open={Boolean(activeSimulation)}
          onClose={() => setActiveSimulation(null)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            Simulation Details: {activeSimulation.name}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Configuration
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Framework:</strong> {activeSimulation.framework}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Status:</strong> {activeSimulation.status}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Progress:</strong> {activeSimulation.progress}%
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Created:</strong> {new Date(activeSimulation.created).toLocaleString()}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Techniques ({activeSimulation.techniques.length})
                </Typography>
                <Box>
                  {activeSimulation.techniques.map((technique) => (
                    <Chip
                      key={technique.id}
                      label={`${technique.mitre_id} - ${technique.name}`}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Targets
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Address</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeSimulation.targets.map((target) => (
                        <TableRow key={target.id}>
                          <TableCell>{target.type}</TableCell>
                          <TableCell>{target.address}</TableCell>
                          <TableCell>
                            <Chip label="Active" color="success" size="small" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {simulationResults[activeSimulation.id] && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Results History
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Timestamp</TableCell>
                          <TableCell>Technique</TableCell>
                          <TableCell>Target</TableCell>
                          <TableCell>Result</TableCell>
                          <TableCell>Details</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {simulationResults[activeSimulation.id].map((result, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {new Date(result.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell>{result.technique}</TableCell>
                            <TableCell>{result.target}</TableCell>
                            <TableCell>
                              <Chip
                                label={result.success ? 'Success' : 'Failed'}
                                color={result.success ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Tooltip title={result.details}>
                                <Typography variant="caption" sx={{ cursor: 'pointer' }}>
                                  {result.details.substring(0, 50)}...
                                </Typography>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setActiveSimulation(null)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default AttackSimulationOrchestrator;