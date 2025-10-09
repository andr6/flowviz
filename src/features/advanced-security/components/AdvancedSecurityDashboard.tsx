import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Badge,
} from '@mui/material';
import {
  Security,
  BugReport,
  Shield,
  Assessment,
  Compliance,
  PlayArrow,
  Stop,
  Refresh,
  Warning,
  CheckCircle,
  Error,
  Info,
  Timeline,
  Group,
  Computer,
  NetworkCheck,
  Storage,
  Visibility,
  Settings,
} from '@mui/icons-material';
import { AdvancedSecurityService } from '../services/AdvancedSecurityService';
import type {
  PurpleTeamExercise,
  AttackSimulation,
  DefensiveRecommendation,
  RiskAssessment,
  SecurityPostureAssessment,
  FrameworkHealth,
  FrameworkIntegration,
} from '../types/AdvancedSecurity';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`security-tabpanel-${index}`}
      aria-labelledby={`security-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const AdvancedSecurityDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [exercises, setExercises] = useState<PurpleTeamExercise[]>([]);
  const [simulations, setSimulations] = useState<AttackSimulation[]>([]);
  const [recommendations, setRecommendations] = useState<DefensiveRecommendation[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [postureAssessment, setPostureAssessment] = useState<SecurityPostureAssessment | null>(null);
  const [frameworkHealth, setFrameworkHealth] = useState<Record<string, FrameworkHealth>>({});
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<PurpleTeamExercise | null>(null);
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);

  const securityService = new AdvancedSecurityService();

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadFrameworkHealth, 30000); // Update health every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [
        exercisesData,
        simulationsData,
        recommendationsData,
        riskData,
        postureData,
        healthData
      ] = await Promise.all([
        securityService.getPurpleTeamExercises(),
        securityService.getAttackSimulations(),
        securityService.getDefensiveRecommendations(),
        securityService.getRiskAssessments(),
        securityService.getSecurityPostureAssessment(),
        securityService.getFrameworkHealth()
      ]);

      setExercises(exercisesData);
      setSimulations(simulationsData);
      setRecommendations(recommendationsData);
      setRiskAssessments(riskData);
      setPostureAssessment(postureData);
      setFrameworkHealth(healthData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFrameworkHealth = async () => {
    try {
      const healthData = await securityService.getFrameworkHealth();
      setFrameworkHealth(healthData);
    } catch (error) {
      console.error('Failed to load framework health:', error);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'resolved':
      case 'healthy':
        return 'success';
      case 'running':
      case 'in_progress':
      case 'active':
        return 'warning';
      case 'failed':
      case 'error':
      case 'unhealthy':
        return 'error';
      case 'pending':
      case 'planned':
        return 'info';
      default:
        return 'default';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle color="success" />;
      case 'unhealthy':
        return <Error color="error" />;
      case 'degraded':
        return <Warning color="warning" />;
      default:
        return <Info color="info" />;
    }
  };

  const startExercise = async (exerciseId: string) => {
    try {
      await securityService.startPurpleTeamExercise(exerciseId);
      loadDashboardData();
    } catch (error) {
      console.error('Failed to start exercise:', error);
    }
  };

  const stopExercise = async (exerciseId: string) => {
    try {
      await securityService.stopPurpleTeamExercise(exerciseId);
      loadDashboardData();
    } catch (error) {
      console.error('Failed to stop exercise:', error);
    }
  };

  const runSimulation = async (simulationId: string) => {
    try {
      await securityService.runAttackSimulation(simulationId);
      loadDashboardData();
    } catch (error) {
      console.error('Failed to run simulation:', error);
    }
  };

  const generateRecommendations = async () => {
    try {
      await securityService.generateDefensiveRecommendations();
      loadDashboardData();
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          Loading Advanced Security Dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Advanced Security Operations Center
      </Typography>

      {/* Framework Health Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {Object.entries(frameworkHealth).map(([framework, health]) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={framework}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                {getHealthIcon(health.status)}
                <Typography variant="h6" sx={{ mt: 1, fontSize: '0.9rem' }}>
                  {framework}
                </Typography>
                <Chip
                  label={health.status}
                  color={getStatusColor(health.status) as any}
                  size="small"
                  sx={{ mt: 1 }}
                />
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  {health.lastCheck ? new Date(health.lastCheck).toLocaleTimeString() : 'Never'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="security dashboard tabs">
          <Tab label="Purple Team" icon={<Group />} />
          <Tab label="Attack Simulation" icon={<BugReport />} />
          <Tab label="Recommendations" icon={<Shield />} />
          <Tab label="Risk Assessment" icon={<Assessment />} />
          <Tab label="Compliance" icon={<Compliance />} />
        </Tabs>
      </Box>

      {/* Purple Team Exercises Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Purple Team Exercises</Typography>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={loadDashboardData}
          >
            Refresh
          </Button>
        </Box>

        <Grid container spacing={3}>
          {exercises.map((exercise) => (
            <Grid item xs={12} md={6} lg={4} key={exercise.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {exercise.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {exercise.description}
                  </Typography>
                  
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Chip
                      label={exercise.status}
                      color={getStatusColor(exercise.status) as any}
                      size="small"
                    />
                    <Chip
                      label={`${exercise.scenario.length} scenarios`}
                      variant="outlined"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>

                  <Typography variant="caption" display="block" gutterBottom>
                    Red Team: {exercise.redTeam.members.length} members
                  </Typography>
                  <Typography variant="caption" display="block" gutterBottom>
                    Blue Team: {exercise.blueTeam.members.length} members
                  </Typography>

                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    {exercise.status === 'planned' && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<PlayArrow />}
                        onClick={() => startExercise(exercise.id)}
                      >
                        Start
                      </Button>
                    )}
                    {exercise.status === 'active' && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<Stop />}
                        onClick={() => stopExercise(exercise.id)}
                      >
                        Stop
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setSelectedExercise(exercise);
                        setExerciseDialogOpen(true);
                      }}
                    >
                      Details
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Attack Simulation Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Attack Simulations</Typography>
          <Button variant="contained" startIcon={<Refresh />} onClick={loadDashboardData}>
            Refresh
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Framework</TableCell>
                <TableCell>Techniques</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {simulations.map((simulation) => (
                <TableRow key={simulation.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{simulation.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {simulation.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={simulation.framework} size="small" />
                  </TableCell>
                  <TableCell>{simulation.techniques.length}</TableCell>
                  <TableCell>
                    <Chip
                      label={simulation.status}
                      color={getStatusColor(simulation.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ width: 100 }}>
                      <LinearProgress
                        variant="determinate"
                        value={simulation.progress}
                        color={getStatusColor(simulation.status) as any}
                      />
                      <Typography variant="caption">{simulation.progress}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Defensive Recommendations Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Defensive Recommendations</Typography>
          <Button
            variant="contained"
            startIcon={<Shield />}
            onClick={generateRecommendations}
          >
            Generate New
          </Button>
        </Box>

        <Grid container spacing={3}>
          {recommendations.map((recommendation) => (
            <Grid item xs={12} md={6} key={recommendation.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {recommendation.title}
                    </Typography>
                    <Chip
                      label={recommendation.priority}
                      color={
                        recommendation.priority === 'high' ? 'error' :
                        recommendation.priority === 'medium' ? 'warning' : 'info'
                      }
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" gutterBottom>
                    {recommendation.description}
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Targeted Techniques:
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      {recommendation.mitreTechniques.map((technique) => (
                        <Chip
                          key={technique}
                          label={technique}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Implementation Steps: {recommendation.implementation.steps.length}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Chip
                      label={recommendation.status}
                      color={getStatusColor(recommendation.status) as any}
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Risk Assessment Tab */}
      <TabPanel value={tabValue} index={3}>
        <Typography variant="h5" gutterBottom>
          Risk Assessment
        </Typography>

        {riskAssessments.map((assessment) => (
          <Card key={assessment.id} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {assessment.name}
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Overall Risk Score
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={assessment.overallScore}
                        color={
                          assessment.overallScore > 70 ? 'error' :
                          assessment.overallScore > 40 ? 'warning' : 'success'
                        }
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 35 }}>
                      <Typography variant="body2" color="text.secondary">
                        {assessment.overallScore}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Risk Categories
                  </Typography>
                  {assessment.riskCategories.map((category) => (
                    <Box key={category.category} sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption">{category.category}</Typography>
                        <Typography variant="caption">{category.score}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={category.score}
                        size="small"
                        color={
                          category.score > 70 ? 'error' :
                          category.score > 40 ? 'warning' : 'success'
                        }
                      />
                    </Box>
                  ))}
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Key Findings
              </Typography>
              <List dense>
                {assessment.findings.slice(0, 3).map((finding, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Warning color={finding.severity === 'high' ? 'error' : 'warning'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={finding.description}
                      secondary={`Severity: ${finding.severity}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        ))}
      </TabPanel>

      {/* Compliance Tab */}
      <TabPanel value={tabValue} index={4}>
        <Typography variant="h5" gutterBottom>
          Security Posture & Compliance
        </Typography>

        {postureAssessment && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Compliance Status
                  </Typography>
                  
                  {postureAssessment.complianceStatus.map((compliance) => (
                    <Box key={compliance.framework} sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1">{compliance.framework}</Typography>
                        <Chip
                          label={`${compliance.score}% compliant`}
                          color={compliance.score > 80 ? 'success' : compliance.score > 60 ? 'warning' : 'error'}
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={compliance.score}
                        color={compliance.score > 80 ? 'success' : compliance.score > 60 ? 'warning' : 'error'}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {compliance.passedControls} of {compliance.totalControls} controls passed
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Security Metrics
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Overall Score: {postureAssessment.overallScore}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={postureAssessment.overallScore}
                      color={postureAssessment.overallScore > 80 ? 'success' : 'warning'}
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    Recent Changes
                  </Typography>
                  <Typography variant="caption" display="block">
                    Last Assessment: {new Date(postureAssessment.lastAssessment).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Trend: {postureAssessment.overallScore > 75 ? '↗ Improving' : '↘ Needs Attention'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </TabPanel>

      {/* Exercise Details Dialog */}
      <Dialog
        open={exerciseDialogOpen}
        onClose={() => setExerciseDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Purple Team Exercise Details
        </DialogTitle>
        <DialogContent>
          {selectedExercise && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedExercise.name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                {selectedExercise.description}
              </Typography>

              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Red Team ({selectedExercise.redTeam.members.length} members)
                  </Typography>
                  <List dense>
                    {selectedExercise.redTeam.members.map((member) => (
                      <ListItem key={member.id}>
                        <ListItemText
                          primary={member.name}
                          secondary={member.role}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Blue Team ({selectedExercise.blueTeam.members.length} members)
                  </Typography>
                  <List dense>
                    {selectedExercise.blueTeam.members.map((member) => (
                      <ListItem key={member.id}>
                        <ListItemText
                          primary={member.name}
                          secondary={member.role}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
                Scenarios ({selectedExercise.scenario.length})
              </Typography>
              {selectedExercise.scenario.map((scenario, index) => (
                <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="body2">
                      {scenario.name} - {scenario.techniques.join(', ')}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExerciseDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdvancedSecurityDashboard;