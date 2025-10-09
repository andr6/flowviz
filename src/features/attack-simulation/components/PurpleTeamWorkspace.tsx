/**
 * Purple Team Workspace Component
 *
 * Comprehensive workspace for coordinating red and blue team activities
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Avatar,
  AvatarGroup,
  IconButton,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  Security,
  BugReport,
  CheckCircle,
  Warning,
  Timeline,
  Assessment,
  Group,
  ExpandMore,
  Comment,
  AttachFile,
  Visibility,
  VisibilityOff,
  TrendingUp,
  Shield,
  Code,
} from '@mui/icons-material';
import {
  SimulationPlan,
  SimulationJob,
  ValidationResult,
  GapAnalysis,
  PurpleTeamWorkspaceProps,
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

interface Exercise {
  id: string;
  name: string;
  description: string;
  redTeamLead: string;
  blueTeamLead: string;
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  jobId?: string;
  findings: number;
  detectionRate: number;
  preventionRate: number;
}

export const PurpleTeamWorkspace: React.FC<PurpleTeamWorkspaceProps> = ({
  onSimulationCreate,
  onAnalysisComplete,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [simulations, setSimulations] = useState<SimulationJob[]>([]);
  const [findings, setFindings] = useState<GapAnalysis[]>([]);

  // Stats
  const [stats, setStats] = useState({
    totalExercises: 0,
    activeExercises: 0,
    avgDetectionRate: 0,
    avgPreventionRate: 0,
    criticalFindings: 0,
    resolvedFindings: 0,
  });

  // Create exercise dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newExercise, setNewExercise] = useState({
    name: '',
    description: '',
    redTeamLead: '',
    blueTeamLead: '',
    startDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadExercises();
    loadStats();
  }, []);

  /**
   * Load purple team exercises
   */
  const loadExercises = async () => {
    try {
      // This would load from a backend endpoint
      // For now, using mock data
      const mockExercises: Exercise[] = [
        {
          id: '1',
          name: 'Q4 2025 Purple Team Exercise',
          description: 'Comprehensive validation of detection and prevention capabilities',
          redTeamLead: 'John Smith',
          blueTeamLead: 'Jane Doe',
          status: 'in_progress',
          startDate: new Date('2025-10-01'),
          jobId: 'job-123',
          findings: 15,
          detectionRate: 75,
          preventionRate: 60,
        },
        {
          id: '2',
          name: 'Ransomware Defense Validation',
          description: 'Focus on ransomware TTPs and defensive capabilities',
          redTeamLead: 'Mike Johnson',
          blueTeamLead: 'Sarah Williams',
          status: 'completed',
          startDate: new Date('2025-09-15'),
          endDate: new Date('2025-09-30'),
          jobId: 'job-122',
          findings: 8,
          detectionRate: 85,
          preventionRate: 70,
        },
      ];

      setExercises(mockExercises);
      if (mockExercises.length > 0 && !activeExercise) {
        setActiveExercise(mockExercises[0]);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load exercises');
    }
  };

  /**
   * Load statistics
   */
  const loadStats = async () => {
    try {
      const response = await fetch('/api/simulations/analytics');
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalExercises: exercises.length,
          activeExercises: exercises.filter(e => e.status === 'in_progress').length,
          avgDetectionRate: data.avg_detection_score || 0,
          avgPreventionRate: data.avg_prevention_score || 0,
          criticalFindings: findings.filter(f => f.severity === 'critical').length,
          resolvedFindings: findings.filter(f => f.status === 'resolved').length,
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  /**
   * Create new exercise
   */
  const createExercise = async () => {
    try {
      setLoading(true);

      const exercise: Exercise = {
        id: `ex-${Date.now()}`,
        ...newExercise,
        status: 'planning',
        startDate: new Date(newExercise.startDate),
        findings: 0,
        detectionRate: 0,
        preventionRate: 0,
      };

      setExercises([...exercises, exercise]);
      setShowCreateDialog(false);
      setNewExercise({
        name: '',
        description: '',
        redTeamLead: '',
        blueTeamLead: '',
        startDate: new Date().toISOString().split('T')[0],
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create exercise');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Start exercise
   */
  const startExercise = async (exerciseId: string) => {
    try {
      setLoading(true);

      // Update exercise status
      setExercises(
        exercises.map(ex =>
          ex.id === exerciseId ? { ...ex, status: 'in_progress' as const } : ex
        )
      );

      // Would trigger simulation creation here
      onSimulationCreate?.(null as any); // Placeholder
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start exercise');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: Exercise['status']): 'default' | 'primary' | 'success' | 'error' => {
    switch (status) {
      case 'in_progress':
        return 'primary';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  /**
   * Render dashboard
   */
  const renderDashboard = () => (
    <Grid container spacing={3}>
      {/* Statistics Cards */}
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Total Exercises
            </Typography>
            <Typography variant="h4">{stats.totalExercises}</Typography>
            <Typography variant="caption" color="text.secondary">
              {stats.activeExercises} active
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Avg Detection Rate
            </Typography>
            <Typography variant="h4" color="primary.main">
              {stats.avgDetectionRate.toFixed(0)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={stats.avgDetectionRate}
              sx={{ mt: 1 }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Avg Prevention Rate
            </Typography>
            <Typography variant="h4" color="warning.main">
              {stats.avgPreventionRate.toFixed(0)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={stats.avgPreventionRate}
              sx={{ mt: 1 }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Critical Findings
            </Typography>
            <Typography variant="h4" color="error.main">
              {stats.criticalFindings}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {stats.resolvedFindings} resolved
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Active Exercises */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Active Exercises
        </Typography>
        <Grid container spacing={2}>
          {exercises
            .filter(ex => ex.status === 'in_progress')
            .map(exercise => (
              <Grid item xs={12} md={6} key={exercise.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">{exercise.name}</Typography>
                      <Chip
                        label={exercise.status}
                        color={getStatusColor(exercise.status)}
                        size="small"
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" paragraph>
                      {exercise.description}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Red Team Lead
                        </Typography>
                        <Typography variant="body2">{exercise.redTeamLead}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Blue Team Lead
                        </Typography>
                        <Typography variant="body2">{exercise.blueTeamLead}</Typography>
                      </Box>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Findings
                        </Typography>
                        <Typography variant="h6">{exercise.findings}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Detection
                        </Typography>
                        <Typography variant="h6" color="primary.main">
                          {exercise.detectionRate}%
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Prevention
                        </Typography>
                        <Typography variant="h6" color="warning.main">
                          {exercise.preventionRate}%
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                  <Divider />
                  <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setActiveExercise(exercise)}
                    >
                      View Details
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<Stop />}
                    >
                      Stop
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Exercise 'Ransomware Defense' completed"
                secondary="2 hours ago • 8 findings identified"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Warning color="warning" />
              </ListItemIcon>
              <ListItemText
                primary="Critical gap found in detection capability"
                secondary="5 hours ago • Technique T1059 not detected"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <PlayArrow color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Exercise 'Q4 2025 Purple Team' started"
                secondary="1 day ago • 50 techniques queued"
              />
            </ListItem>
          </List>
        </Paper>
      </Grid>
    </Grid>
  );

  /**
   * Render exercises list
   */
  const renderExercises = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">All Exercises</Typography>
        <Button
          variant="contained"
          startIcon={<PlayArrow />}
          onClick={() => setShowCreateDialog(true)}
        >
          New Exercise
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Red Team Lead</TableCell>
              <TableCell>Blue Team Lead</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>Findings</TableCell>
              <TableCell>Detection Rate</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {exercises.map(exercise => (
              <TableRow key={exercise.id} hover>
                <TableCell>
                  <Typography variant="body2">{exercise.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {exercise.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={exercise.status}
                    color={getStatusColor(exercise.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{exercise.redTeamLead}</TableCell>
                <TableCell>{exercise.blueTeamLead}</TableCell>
                <TableCell>{exercise.startDate.toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge badgeContent={exercise.findings} color="primary">
                    <BugReport />
                  </Badge>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={exercise.detectionRate}
                      sx={{ width: 60 }}
                    />
                    <Typography variant="caption">{exercise.detectionRate}%</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => setActiveExercise(exercise)}
                  >
                    <Visibility />
                  </IconButton>
                  {exercise.status === 'planning' && (
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => startExercise(exercise.id)}
                    >
                      <PlayArrow />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  /**
   * Render collaboration view
   */
  const renderCollaboration = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Exercise Timeline
          </Typography>
          {/* Timeline visualization would go here */}
          <Alert severity="info">Timeline visualization coming soon</Alert>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Team Members
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <Avatar sx={{ bgcolor: 'error.main' }}>R</Avatar>
              </ListItemIcon>
              <ListItemText
                primary="Red Team (3)"
                secondary="Offensive operations"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Avatar sx={{ bgcolor: 'primary.main' }}>B</Avatar>
              </ListItemIcon>
              <ListItemText
                primary="Blue Team (5)"
                secondary="Defensive operations"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>P</Avatar>
              </ListItemIcon>
              <ListItemText
                primary="Purple Team (2)"
                secondary="Coordination & analysis"
              />
            </ListItem>
          </List>
        </Paper>

        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Communication
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Add a comment..."
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <IconButton size="small">
                  <Comment />
                </IconButton>
              ),
            }}
          />
          <List dense>
            <ListItem>
              <ListItemText
                primary="Initial reconnaissance complete"
                secondary="Red Team • 2 hours ago"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Detection rules updated"
                secondary="Blue Team • 3 hours ago"
              />
            </ListItem>
          </List>
        </Paper>
      </Grid>
    </Grid>
  );

  /**
   * Render knowledge base
   */
  const renderKnowledgeBase = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Red Team Playbooks
          </Typography>
          <List>
            <ListItem button>
              <ListItemIcon>
                <Code />
              </ListItemIcon>
              <ListItemText
                primary="Ransomware Attack Chain"
                secondary="15 techniques • Last updated: Oct 1, 2025"
              />
            </ListItem>
            <ListItem button>
              <ListItemIcon>
                <Code />
              </ListItemIcon>
              <ListItemText
                primary="Lateral Movement Scenarios"
                secondary="22 techniques • Last updated: Sep 28, 2025"
              />
            </ListItem>
            <ListItem button>
              <ListItemIcon>
                <Code />
              </ListItemIcon>
              <ListItemText
                primary="Privilege Escalation"
                secondary="18 techniques • Last updated: Sep 25, 2025"
              />
            </ListItem>
          </List>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Blue Team Runbooks
          </Typography>
          <List>
            <ListItem button>
              <ListItemIcon>
                <Shield />
              </ListItemIcon>
              <ListItemText
                primary="Ransomware Detection & Response"
                secondary="12 detection rules • 8 response actions"
              />
            </ListItem>
            <ListItem button>
              <ListItemIcon>
                <Shield />
              </ListItemIcon>
              <ListItemText
                primary="Lateral Movement Detection"
                secondary="18 detection rules • 10 response actions"
              />
            </ListItem>
            <ListItem button>
              <ListItemIcon>
                <Shield />
              </ListItemIcon>
              <ListItemText
                primary="Privilege Escalation Monitoring"
                secondary="15 detection rules • 12 response actions"
              />
            </ListItem>
          </List>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Lessons Learned
          </Typography>
          {exercises.filter(ex => ex.status === 'completed').map(exercise => (
            <Accordion key={exercise.id}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>{exercise.name}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Detection Rate: {exercise.detectionRate}% • Prevention Rate: {exercise.preventionRate}%
                </Typography>
                <Typography variant="body2">
                  Key findings and improvements from this exercise...
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>
      </Grid>
    </Grid>
  );

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Purple Team Workspace
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<Assessment />} label="Dashboard" />
        <Tab icon={<Timeline />} label="Exercises" />
        <Tab icon={<Group />} label="Collaboration" />
        <Tab icon={<Security />} label="Knowledge Base" />
      </Tabs>

      <TabPanel value={activeTab} index={0}>
        {renderDashboard()}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {renderExercises()}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {renderCollaboration()}
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        {renderKnowledgeBase()}
      </TabPanel>

      {/* Create Exercise Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Purple Team Exercise</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Exercise Name"
            value={newExercise.name}
            onChange={e => setNewExercise({ ...newExercise, name: e.target.value })}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Description"
            value={newExercise.description}
            onChange={e => setNewExercise({ ...newExercise, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Red Team Lead"
                value={newExercise.redTeamLead}
                onChange={e => setNewExercise({ ...newExercise, redTeamLead: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Blue Team Lead"
                value={newExercise.blueTeamLead}
                onChange={e => setNewExercise({ ...newExercise, blueTeamLead: e.target.value })}
              />
            </Grid>
          </Grid>

          <TextField
            fullWidth
            label="Start Date"
            type="date"
            value={newExercise.startDate}
            onChange={e => setNewExercise({ ...newExercise, startDate: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={createExercise}
            disabled={!newExercise.name || !newExercise.redTeamLead || !newExercise.blueTeamLead}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default PurpleTeamWorkspace;
