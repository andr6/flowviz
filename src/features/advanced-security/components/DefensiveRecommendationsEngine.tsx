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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Checkbox,
  FormControlLabel,
  Badge,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Shield,
  Security,
  CheckCircle,
  Warning,
  Error,
  Info,
  ExpandMore,
  PlayArrow,
  Add,
  Edit,
  Delete,
  Refresh,
  Assessment,
  Timeline,
  BugReport,
  Computer,
  NetworkSecurity,
  AdminPanelSettings,
  Visibility,
  Download,
  Share,
} from '@mui/icons-material';
import { AdvancedSecurityService } from '../services/AdvancedSecurityService';
import type {
  DefensiveRecommendation,
  MitigationStrategy,
  TTPAnalysis,
  ImplementationPlan,
  RecommendationMetrics,
} from '../types/AdvancedSecurity';

interface RecommendationEngineProps {
  onRecommendationImplemented?: (recommendationId: string) => void;
}

export const DefensiveRecommendationsEngine: React.FC<RecommendationEngineProps> = ({
  onRecommendationImplemented
}) => {
  const [recommendations, setRecommendations] = useState<DefensiveRecommendation[]>([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState<DefensiveRecommendation[]>([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<DefensiveRecommendation | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [implementDialogOpen, setImplementDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<RecommendationMetrics | null>(null);
  
  // Filters
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [techniqueFilter, setTechniqueFilter] = useState('');

  // Generation parameters
  const [generationParams, setGenerationParams] = useState({
    includeAttackData: true,
    includeVulnerabilities: true,
    includeCompliance: true,
    focusAreas: [] as string[],
    priorityThreshold: 'medium',
    timeFrame: '30days'
  });

  const securityService = new AdvancedSecurityService();

  useEffect(() => {
    loadRecommendations();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [recommendations, priorityFilter, statusFilter, categoryFilter, techniqueFilter]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const [recommendationsData, metricsData] = await Promise.all([
        securityService.getDefensiveRecommendations(),
        securityService.getRecommendationMetrics()
      ]);
      
      setRecommendations(recommendationsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...recommendations];

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(r => r.priority === priorityFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(r => r.category === categoryFilter);
    }

    if (techniqueFilter) {
      filtered = filtered.filter(r => 
        r.mitreTechniques.some(t => 
          t.toLowerCase().includes(techniqueFilter.toLowerCase())
        )
      );
    }

    setFilteredRecommendations(filtered);
  };

  const generateRecommendations = async () => {
    try {
      setLoading(true);
      await securityService.generateDefensiveRecommendations(generationParams);
      setGenerateDialogOpen(false);
      loadRecommendations();
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const implementRecommendation = async (recommendationId: string) => {
    try {
      await securityService.implementRecommendation(recommendationId);
      loadRecommendations();
      setImplementDialogOpen(false);
      onRecommendationImplemented?.(recommendationId);
    } catch (error) {
      console.error('Failed to implement recommendation:', error);
    }
  };

  const updateRecommendationStatus = async (recommendationId: string, status: string) => {
    try {
      await securityService.updateRecommendationStatus(recommendationId, status);
      loadRecommendations();
    } catch (error) {
      console.error('Failed to update recommendation status:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'implemented': return 'success';
      case 'in_progress': return 'warning';
      case 'planned': return 'info';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'network': return <NetworkSecurity />;
      case 'endpoint': return <Computer />;
      case 'access_control': return <AdminPanelSettings />;
      case 'monitoring': return <Visibility />;
      case 'incident_response': return <Security />;
      default: return <Shield />;
    }
  };

  const getImplementationComplexity = (plan: ImplementationPlan) => {
    const totalSteps = plan.steps.length;
    const estimatedHours = plan.estimatedTimeHours;
    
    if (totalSteps <= 3 && estimatedHours <= 8) return 'Low';
    if (totalSteps <= 6 && estimatedHours <= 24) return 'Medium';
    return 'High';
  };

  const exportRecommendations = async () => {
    try {
      const data = {
        recommendations: filteredRecommendations,
        metrics,
        exportDate: new Date().toISOString(),
        filters: { priorityFilter, statusFilter, categoryFilter, techniqueFilter }
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `defensive-recommendations-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export recommendations:', error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Defensive Recommendations Engine</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={exportRecommendations}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadRecommendations}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setGenerateDialogOpen(true)}
          >
            Generate New
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Metrics Overview */}
      {metrics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {metrics.totalRecommendations}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Recommendations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {metrics.implementedCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Implemented
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {metrics.criticalCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Critical Priority
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {metrics.averageImplementationTime}h
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg. Implementation Time
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <MenuItem value="all">All Priorities</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="planned">Planned</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="implemented">Implemented</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  <MenuItem value="network">Network Security</MenuItem>
                  <MenuItem value="endpoint">Endpoint Protection</MenuItem>
                  <MenuItem value="access_control">Access Control</MenuItem>
                  <MenuItem value="monitoring">Monitoring</MenuItem>
                  <MenuItem value="incident_response">Incident Response</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="MITRE Technique"
                placeholder="e.g., T1078"
                value={techniqueFilter}
                onChange={(e) => setTechniqueFilter(e.target.value)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Recommendations List */}
      <Grid container spacing={3}>
        {filteredRecommendations.map((recommendation) => (
          <Grid item xs={12} md={6} lg={4} key={recommendation.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  {getCategoryIcon(recommendation.category)}
                  <Box sx={{ ml: 1, flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {recommendation.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip
                        label={recommendation.priority}
                        color={getPriorityColor(recommendation.priority) as any}
                        size="small"
                      />
                      <Chip
                        label={recommendation.status}
                        color={getStatusColor(recommendation.status) as any}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {recommendation.description}
                </Typography>

                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    MITRE Techniques:
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {recommendation.mitreTechniques.slice(0, 3).map((technique) => (
                      <Chip
                        key={technique}
                        label={technique}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
                      />
                    ))}
                    {recommendation.mitreTechniques.length > 3 && (
                      <Chip
                        label={`+${recommendation.mitreTechniques.length - 3} more`}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Implementation Complexity: {getImplementationComplexity(recommendation.implementation)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Estimated Time: {recommendation.implementation.estimatedTimeHours} hours
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Risk Reduction: {recommendation.riskReduction}%
                  </Typography>
                </Box>

                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => {
                      setSelectedRecommendation(recommendation);
                      setDetailsDialogOpen(true);
                    }}
                  >
                    Details
                  </Button>

                  {recommendation.status === 'pending' && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PlayArrow />}
                      onClick={() => {
                        setSelectedRecommendation(recommendation);
                        setImplementDialogOpen(true);
                      }}
                    >
                      Implement
                    </Button>
                  )}

                  {recommendation.status === 'planned' && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={() => updateRecommendationStatus(recommendation.id, 'in_progress')}
                    >
                      Start
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recommendation Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Recommendation Details
        </DialogTitle>
        <DialogContent>
          {selectedRecommendation && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedRecommendation.title}
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Chip
                  label={selectedRecommendation.priority}
                  color={getPriorityColor(selectedRecommendation.priority) as any}
                  sx={{ mr: 1 }}
                />
                <Chip
                  label={selectedRecommendation.status}
                  color={getStatusColor(selectedRecommendation.status) as any}
                  variant="outlined"
                />
              </Box>

              <Typography variant="body1" paragraph>
                {selectedRecommendation.description}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Targeted MITRE ATT&CK Techniques
              </Typography>
              <Box sx={{ mb: 3 }}>
                {selectedRecommendation.mitreTechniques.map((technique) => (
                  <Chip
                    key={technique}
                    label={technique}
                    variant="outlined"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>

              <Typography variant="h6" gutterBottom>
                Implementation Plan
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Estimated Time:</strong> {selectedRecommendation.implementation.estimatedTimeHours} hours
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Required Resources:</strong> {selectedRecommendation.implementation.requiredResources.join(', ')}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Dependencies:</strong> {selectedRecommendation.implementation.dependencies.join(', ') || 'None'}
                </Typography>
              </Box>

              <Typography variant="subtitle1" gutterBottom>
                Implementation Steps:
              </Typography>
              <Stepper orientation="vertical">
                {selectedRecommendation.implementation.steps.map((step, index) => (
                  <Step key={index} active={true}>
                    <StepLabel>{step.name}</StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Estimated Time: {step.estimatedTime}
                      </Typography>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Expected Impact
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Risk Reduction:</strong> {selectedRecommendation.riskReduction}%
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Implementation Cost:</strong> {selectedRecommendation.implementation.cost || 'Not specified'}
              </Typography>
              
              {selectedRecommendation.evidence && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Supporting Evidence:
                  </Typography>
                  <List dense>
                    {selectedRecommendation.evidence.map((evidence, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Info color="info" />
                        </ListItemIcon>
                        <ListItemText
                          primary={evidence.source}
                          secondary={evidence.description}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>
            Close
          </Button>
          {selectedRecommendation?.status === 'pending' && (
            <Button
              variant="contained"
              onClick={() => {
                setDetailsDialogOpen(false);
                setImplementDialogOpen(true);
              }}
            >
              Implement
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Implementation Dialog */}
      <Dialog
        open={implementDialogOpen}
        onClose={() => setImplementDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Implement Recommendation
        </DialogTitle>
        <DialogContent>
          {selectedRecommendation && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedRecommendation.title}
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                This will mark the recommendation as "In Progress" and may trigger automated implementation steps.
              </Alert>

              <Typography variant="body2" gutterBottom>
                <strong>Estimated Implementation Time:</strong> {selectedRecommendation.implementation.estimatedTimeHours} hours
              </Typography>
              
              <Typography variant="body2" gutterBottom>
                <strong>Required Resources:</strong>
              </Typography>
              <List dense>
                {selectedRecommendation.implementation.requiredResources.map((resource, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={resource} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImplementDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedRecommendation) {
                implementRecommendation(selectedRecommendation.id);
              }
            }}
          >
            Start Implementation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generate Recommendations Dialog */}
      <Dialog
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Generate New Recommendations
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Data Sources
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={generationParams.includeAttackData}
                    onChange={(e) => setGenerationParams(prev => ({
                      ...prev,
                      includeAttackData: e.target.checked
                    }))}
                  />
                }
                label="Include recent attack simulation data"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={generationParams.includeVulnerabilities}
                    onChange={(e) => setGenerationParams(prev => ({
                      ...prev,
                      includeVulnerabilities: e.target.checked
                    }))}
                  />
                }
                label="Include vulnerability assessments"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={generationParams.includeCompliance}
                    onChange={(e) => setGenerationParams(prev => ({
                      ...prev,
                      includeCompliance: e.target.checked
                    }))}
                  />
                }
                label="Include compliance requirements"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Priority Threshold</InputLabel>
                <Select
                  value={generationParams.priorityThreshold}
                  onChange={(e) => setGenerationParams(prev => ({
                    ...prev,
                    priorityThreshold: e.target.value
                  }))}
                >
                  <MenuItem value="low">Low and above</MenuItem>
                  <MenuItem value="medium">Medium and above</MenuItem>
                  <MenuItem value="high">High and above</MenuItem>
                  <MenuItem value="critical">Critical only</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Time Frame</InputLabel>
                <Select
                  value={generationParams.timeFrame}
                  onChange={(e) => setGenerationParams(prev => ({
                    ...prev,
                    timeFrame: e.target.value
                  }))}
                >
                  <MenuItem value="7days">Last 7 days</MenuItem>
                  <MenuItem value="30days">Last 30 days</MenuItem>
                  <MenuItem value="90days">Last 90 days</MenuItem>
                  <MenuItem value="all">All historical data</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={generateRecommendations}
            disabled={loading}
          >
            Generate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DefensiveRecommendationsEngine;