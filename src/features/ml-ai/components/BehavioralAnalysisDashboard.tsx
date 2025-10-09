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
  LinearProgress,
  Paper,
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
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Divider,
  Tabs,
  Tab,
  Badge,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Psychology,
  Timeline,
  TrendingUp,
  TrendingDown,
  Group,
  Person,
  Computer,
  Security,
  Warning,
  CheckCircle,
  Error,
  Info,
  Visibility,
  Compare,
  Analytics,
  Add,
  Refresh,
  ExpandMore,
  NetworkCheck,
  BugReport,
  Shield,
  Assessment,
  Insights,
  DataUsage,
  ModelTraining,
  SmartToy,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterPlot,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Sankey,
  TreeMap,
} from 'recharts';
import { machineLearningService } from '../services/MachineLearningService';
import type {
  BehavioralProfile,
  BehavioralAnomaly,
  BehavioralModel,
  BehaviorComparison,
  BehavioralTrend,
  BehavioralPattern,
} from '../types/MachineLearning';

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
      id={`behavioral-tabpanel-${index}`}
      aria-labelledby={`behavioral-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const BehavioralAnalysisDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [profiles, setProfiles] = useState<BehavioralProfile[]>([]);
  const [anomalies, setAnomalies] = useState<BehavioralAnomaly[]>([]);
  const [models, setModels] = useState<BehavioralModel[]>([]);
  const [trends, setTrends] = useState<BehavioralTrend[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<BehavioralProfile | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<BehavioralAnomaly | null>(null);
  const [comparison, setComparison] = useState<BehaviorComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [anomalyDialogOpen, setAnomalyDialogOpen] = useState(false);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  const [entityAnalysisDialogOpen, setEntityAnalysisDialogOpen] = useState(false);

  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [anomalySeverityFilter, setAnomalySeverityFilter] = useState('all');
  const [profileTypeFilter, setProfileTypeFilter] = useState('all');
  const [timeRangeFilter, setTimeRangeFilter] = useState('30d');

  // Entity analysis
  const [entityAnalysis, setEntityAnalysis] = useState({
    entityId: '',
    entityType: 'threat_actor' as const,
    compareWith: ''
  });

  // Metrics
  const [metrics, setMetrics] = useState({
    totalProfiles: 0,
    behavioralAnomalies: 0,
    entitiesTracked: 0,
    patternsIdentified: 0,
    evolutionRate: 0,
    predictionAccuracy: 0
  });

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, [entityTypeFilter, anomalySeverityFilter, profileTypeFilter, timeRangeFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [
        profilesData,
        anomaliesData,
        modelsData,
        trendsData,
        mlMetrics
      ] = await Promise.all([
        generateSampleProfiles(),
        machineLearningService.behavioral_analysis.detectBehavioralAnomalies(),
        generateSampleBehavioralModels(),
        machineLearningService.behavioral_analysis.getBehavioralTrends('threat_actor', timeRangeFilter),
        machineLearningService.getMLMetrics()
      ]);

      setProfiles(profilesData);
      setAnomalies(anomaliesData);
      setModels(modelsData);
      setTrends(trendsData);
      
      // Update metrics
      setMetrics({
        totalProfiles: profilesData.length,
        behavioralAnomalies: anomaliesData.length,
        entitiesTracked: new Set(profilesData.map(p => p.entity_id)).size,
        patternsIdentified: profilesData.reduce((sum, p) => sum + p.behavioral_patterns.length, 0),
        evolutionRate: 0.15,
        predictionAccuracy: mlMetrics.behavioral_prediction_accuracy || 0.79
      });
    } catch (error) {
      console.error('Failed to load behavioral analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeEntity = async () => {
    if (!entityAnalysis.entityId || !entityAnalysis.entityType) return;
    
    try {
      setAnalyzing(true);
      const profile = await machineLearningService.behavioral_analysis.analyzeBehavior(
        entityAnalysis.entityId,
        entityAnalysis.entityType
      );
      
      setSelectedProfile(profile);
      setProfiles(prev => [profile, ...prev.filter(p => p.entity_id !== profile.entity_id)]);
      
      // If comparison entity is specified, compare behaviors
      if (entityAnalysis.compareWith) {
        const comparisonResult = await machineLearningService.behavioral_analysis.compareBehaviors(
          entityAnalysis.entityId,
          entityAnalysis.compareWith
        );
        setComparison(comparisonResult);
        setComparisonDialogOpen(true);
      } else {
        setProfileDialogOpen(true);
      }
      
      setEntityAnalysisDialogOpen(false);
    } catch (error) {
      console.error('Failed to analyze entity behavior:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const generateSampleProfiles = async (): Promise<BehavioralProfile[]> => {
    const entityTypes = ['threat_actor', 'malware', 'campaign'];
    const profileTypes = ['baseline', 'current', 'anomalous'];
    
    return Array.from({ length: 15 }, (_, i) => ({
      id: `profile_${i}`,
      entity_id: `entity_${i}`,
      entity_name: `Entity ${i + 1}`,
      profile_type: profileTypes[i % 3] as any,
      behavioral_patterns: Array.from({ length: 3 + Math.floor(Math.random() * 5) }, (_, j) => ({
        id: `pattern_${i}_${j}`,
        pattern_type: ['sequence', 'frequency', 'timing', 'relationship'][j % 4] as any,
        pattern_data: {
          sequence: ['login', 'reconnaissance', 'lateral_movement', 'data_exfiltration'],
          frequency: Math.random(),
          timing: { peak_hours: [9, 17], off_hours: [2, 6] }
        },
        frequency: Math.random(),
        first_observed: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
        last_observed: new Date().toISOString(),
        confidence: 0.7 + Math.random() * 0.3,
        examples: [`Pattern example ${j + 1}`],
        variations: []
      })),
      statistical_summary: {
        activity_frequency: { daily: 5 + Math.random() * 10, weekly: 30 + Math.random() * 20 },
        time_patterns: { peak_hour: 14, low_hour: 3 },
        technique_preferences: {
          'T1078': Math.random() * 0.8,
          'T1055': Math.random() * 0.6,
          'T1059': Math.random() * 0.7
        },
        target_preferences: {
          workstations: Math.random() * 0.8,
          servers: Math.random() * 0.6,
          mobile: Math.random() * 0.4
        },
        tool_preferences: {
          custom: Math.random() * 0.6,
          commercial: Math.random() * 0.4,
          living_off_land: Math.random() * 0.8
        },
        infrastructure_patterns: {
          domains: Math.floor(Math.random() * 10) + 1,
          ips: Math.floor(Math.random() * 50) + 5,
          hosting_providers: Math.floor(Math.random() * 5) + 1
        },
        evolution_rate: Math.random() * 0.3,
        predictability_score: 0.4 + Math.random() * 0.6
      },
      evolution_timeline: Array.from({ length: 3 }, (_, k) => ({
        timestamp: new Date(Date.now() - k * 86400000 * 7).toISOString(),
        changes: [{
          change_type: ['new_technique', 'technique_modification', 'target_shift'][k % 3] as any,
          description: `Evolution change ${k + 1}`,
          impact_score: Math.random(),
          confidence: 0.7 + Math.random() * 0.3,
          evidence: ['Network logs', 'Behavioral analysis', 'Pattern recognition']
        }],
        significance: Math.random(),
        context: `Context for evolution ${k + 1}`
      })),
      confidence: 0.8 + Math.random() * 0.2,
      last_updated: new Date().toISOString()
    }));
  };

  const generateSampleBehavioralModels = async (): Promise<BehavioralModel[]> => {
    const entityTypes = ['threat_actor', 'malware', 'campaign', 'technique'];
    const analysisTypes = ['sequence', 'pattern', 'evolution', 'clustering'];
    
    return Array.from({ length: 8 }, (_, i) => ({
      id: `behavioral_model_${i}`,
      name: `Behavioral Model ${i + 1}`,
      entity_type: entityTypes[i % 4] as any,
      analysis_type: analysisTypes[i % 4] as any,
      training_data: {
        id: `training_${i}`,
        name: `Training Dataset ${i + 1}`,
        size: 10000 + Math.random() * 50000,
        features: [],
        timeRange: {
          start: new Date(Date.now() - 86400000 * 90).toISOString(),
          end: new Date().toISOString()
        },
        quality: {
          completeness: 0.9 + Math.random() * 0.1,
          consistency: 0.85 + Math.random() * 0.15,
          accuracy: 0.8 + Math.random() * 0.2,
          validity: 0.9 + Math.random() * 0.1,
          uniqueness: 0.95 + Math.random() * 0.05,
          overall_score: 0.9 + Math.random() * 0.1,
          issues: []
        },
        preprocessing: {
          normalization: 'z_score',
          feature_selection: true,
          outlier_removal: true,
          encoding_strategy: 'embedding'
        }
      },
      model_parameters: {
        sequence_length: 10 + Math.floor(Math.random() * 20),
        similarity_threshold: 0.7 + Math.random() * 0.3,
        clustering_algorithm: ['kmeans', 'dbscan', 'hierarchical'][i % 3] as any,
        distance_metric: ['euclidean', 'cosine', 'jaccard'][i % 3] as any,
        time_decay_factor: Math.random() * 0.5,
        novelty_threshold: 0.8 + Math.random() * 0.2
      },
      behavioral_profiles: [],
      last_updated: new Date().toISOString(),
      status: ['training', 'ready', 'degraded'][i % 3] as any
    }));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getProfileTypeColor = (type: string) => {
    switch (type) {
      case 'baseline': return 'info';
      case 'current': return 'success';
      case 'anomalous': return 'error';
      case 'predicted': return 'warning';
      default: return 'default';
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'threat_actor': return <Person />;
      case 'malware': return <BugReport />;
      case 'campaign': return <Group />;
      case 'technique': return <Security />;
      case 'infrastructure': return <NetworkCheck />;
      default: return <Computer />;
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

  // Chart data preparation
  const behavioralTrendData = trends.map(trend => ({
    date: new Date(trend.timestamp).toLocaleDateString(),
    technique_diversity: trend.trend_metrics.technique_diversity || 0.5,
    activity_volume: trend.trend_metrics.activity_volume || 50,
    infrastructure_changes: trend.trend_metrics.infrastructure_changes || 5
  }));

  const entityTypeDistributionData = [
    'threat_actor', 'malware', 'campaign', 'technique', 'infrastructure'
  ].map((type, index) => ({
    name: type.replace('_', ' '),
    value: profiles.filter(p => p.entity_name.toLowerCase().includes(type.split('_')[0])).length,
    color: COLORS[index % COLORS.length]
  }));

  const anomalySeverityData = [
    { name: 'Critical', value: anomalies.filter(a => a.severity === 'critical').length, color: '#ff1744' },
    { name: 'High', value: anomalies.filter(a => a.severity === 'high').length, color: '#ff5722' },
    { name: 'Medium', value: anomalies.filter(a => a.severity === 'medium').length, color: '#ff9800' },
    { name: 'Low', value: anomalies.filter(a => a.severity === 'low').length, color: '#4caf50' }
  ];

  const patternFrequencyData = profiles.flatMap(p => 
    p.behavioral_patterns.map(pattern => ({
      pattern_type: pattern.pattern_type,
      frequency: pattern.frequency,
      confidence: pattern.confidence
    }))
  ).reduce((acc, curr) => {
    const existing = acc.find(item => item.pattern_type === curr.pattern_type);
    if (existing) {
      existing.count += 1;
      existing.avg_frequency = (existing.avg_frequency + curr.frequency) / 2;
    } else {
      acc.push({
        pattern_type: curr.pattern_type,
        count: 1,
        avg_frequency: curr.frequency,
        avg_confidence: curr.confidence
      });
    }
    return acc;
  }, [] as any[]);

  const evolutionRateData = profiles.map((profile, index) => ({
    entity: `Entity ${index + 1}`,
    evolution_rate: profile.statistical_summary.evolution_rate,
    predictability: profile.statistical_summary.predictability_score,
    pattern_count: profile.behavioral_patterns.length
  }));

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const entityTypes = [
    'threat_actor',
    'malware',
    'campaign',
    'technique',
    'infrastructure'
  ];

  const anomalyTypes = [
    'deviation',
    'novelty',
    'evolution',
    'clustering_change'
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Behavioral Analysis Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Compare />}
            onClick={() => setComparisonDialogOpen(true)}
          >
            Compare Entities
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadDashboardData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Psychology />}
            onClick={() => setEntityAnalysisDialogOpen(true)}
          >
            Analyze Entity
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Metrics Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary">
                {metrics.totalProfiles}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Behavioral Profiles
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Active entities
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="error.main">
                {metrics.behavioralAnomalies}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Anomalies
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Behavioral deviations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="info.main">
                {metrics.entitiesTracked}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Entities Tracked
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Unique entities
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="success.main">
                {metrics.patternsIdentified}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Patterns
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Identified patterns
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="warning.main">
                {Math.round(metrics.evolutionRate * 100)}%
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Evolution Rate
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Behavioral change
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="secondary.main">
                {Math.round(metrics.predictionAccuracy * 100)}%
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Prediction Accuracy
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Model performance
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="behavioral analysis tabs">
          <Tab label="Profiles" icon={<Psychology />} />
          <Tab label="Anomalies" icon={<Warning />} />
          <Tab label="Patterns" icon={<Timeline />} />
          <Tab label="Evolution" icon={<TrendingUp />} />
        </Tabs>
      </Box>

      {/* Profiles Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Filters */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Behavioral Profile Filters
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Entity Type</InputLabel>
                      <Select
                        value={entityTypeFilter}
                        onChange={(e) => setEntityTypeFilter(e.target.value)}
                      >
                        <MenuItem value="all">All Entity Types</MenuItem>
                        {entityTypes.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type.replace('_', ' ')}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Profile Type</InputLabel>
                      <Select
                        value={profileTypeFilter}
                        onChange={(e) => setProfileTypeFilter(e.target.value)}
                      >
                        <MenuItem value="all">All Profile Types</MenuItem>
                        <MenuItem value="baseline">Baseline</MenuItem>
                        <MenuItem value="current">Current</MenuItem>
                        <MenuItem value="anomalous">Anomalous</MenuItem>
                        <MenuItem value="predicted">Predicted</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Time Range</InputLabel>
                      <Select
                        value={timeRangeFilter}
                        onChange={(e) => setTimeRangeFilter(e.target.value)}
                      >
                        <MenuItem value="7d">Last 7 Days</MenuItem>
                        <MenuItem value="30d">Last 30 Days</MenuItem>
                        <MenuItem value="90d">Last 90 Days</MenuItem>
                        <MenuItem value="1y">Last Year</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Entity Type Distribution */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Entity Type Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={entityTypeDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {entityTypeDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Pattern Frequency Analysis */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Pattern Frequency Analysis
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={patternFrequencyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="pattern_type" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#8884d8" name="Pattern Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Behavioral Profiles Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Behavioral Profiles
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Entity</TableCell>
                        <TableCell>Profile Type</TableCell>
                        <TableCell>Patterns</TableCell>
                        <TableCell>Evolution Rate</TableCell>
                        <TableCell>Predictability</TableCell>
                        <TableCell>Confidence</TableCell>
                        <TableCell>Last Updated</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profiles.slice(0, 10).map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getEntityIcon('entity')}
                              <Typography variant="body2" sx={{ ml: 1 }}>
                                {profile.entity_name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={profile.profile_type}
                              color={getProfileTypeColor(profile.profile_type) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Badge badgeContent={profile.behavioral_patterns.length} color="primary">
                              <Timeline />
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <LinearProgress
                                variant="determinate"
                                value={profile.statistical_summary.evolution_rate * 100}
                                sx={{ width: 60, mr: 1 }}
                                color={profile.statistical_summary.evolution_rate > 0.2 ? 'warning' : 'success'}
                              />
                              <Typography variant="caption">
                                {Math.round(profile.statistical_summary.evolution_rate * 100)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <CircularProgress
                              variant="determinate"
                              value={profile.statistical_summary.predictability_score * 100}
                              size={30}
                              color="info"
                            />
                          </TableCell>
                          <TableCell>
                            {Math.round(profile.confidence * 100)}%
                          </TableCell>
                          <TableCell>
                            {new Date(profile.last_updated).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedProfile(profile);
                                setProfileDialogOpen(true);
                              }}
                            >
                              <Visibility />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Anomalies Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {/* Anomaly Severity Distribution */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Anomaly Severity Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={anomalySeverityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {anomalySeverityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Behavioral Anomalies Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Behavioral Anomalies
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Entity</TableCell>
                        <TableCell>Anomaly Type</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {anomalies.slice(0, 10).map((anomaly) => (
                        <TableRow key={anomaly.id}>
                          <TableCell>
                            {new Date(anomaly.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getEntityIcon(anomaly.entity_type)}
                              <Typography variant="body2" sx={{ ml: 1 }}>
                                {anomaly.entity_id}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={anomaly.anomaly_type} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={anomaly.severity}
                              color={getSeverityColor(anomaly.severity) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ 
                              maxWidth: 200, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis'
                            }}>
                              {anomaly.description}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={anomaly.status}
                              color={anomaly.status === 'resolved' ? 'success' : 'default'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedAnomaly(anomaly);
                                setAnomalyDialogOpen(true);
                              }}
                            >
                              <Visibility />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Patterns Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Behavioral Pattern Analysis
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <Timeline sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Pattern Recognition Engine
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Deep analysis of behavioral patterns, sequence detection, and temporal relationships.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Evolution Tab */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          {/* Behavioral Trends */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Behavioral Evolution Trends
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={behavioralTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="technique_diversity" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="activity_volume" stroke="#82ca9d" strokeWidth={2} />
                    <Line type="monotone" dataKey="infrastructure_changes" stroke="#ffc658" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Evolution Rate vs Predictability */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Evolution Rate vs Predictability
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterPlot data={evolutionRateData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="evolution_rate" name="Evolution Rate" />
                    <YAxis dataKey="predictability" name="Predictability" />
                    <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter dataKey="pattern_count" fill="#8884d8" />
                  </ScatterPlot>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Profile Details Dialog */}
      <Dialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Behavioral Profile Details</DialogTitle>
        <DialogContent>
          {selectedProfile && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Entity Information
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Entity:</strong> {selectedProfile.entity_name}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Profile Type:</strong> {selectedProfile.profile_type}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Confidence:</strong> {Math.round(selectedProfile.confidence * 100)}%
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Last Updated:</strong> {new Date(selectedProfile.last_updated).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Statistical Summary
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Evolution Rate:</strong> {Math.round(selectedProfile.statistical_summary.evolution_rate * 100)}%
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Predictability:</strong> {Math.round(selectedProfile.statistical_summary.predictability_score * 100)}%
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Daily Activity:</strong> {selectedProfile.statistical_summary.activity_frequency.daily.toFixed(1)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Behavioral Patterns ({selectedProfile.behavioral_patterns.length})
                </Typography>
                {selectedProfile.behavioral_patterns.map((pattern, index) => (
                  <Accordion key={pattern.id}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle1">
                        {pattern.pattern_type} - Confidence: {Math.round(pattern.confidence * 100)}%
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" gutterBottom>
                        <strong>Frequency:</strong> {Math.round(pattern.frequency * 100)}%
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>First Observed:</strong> {new Date(pattern.first_observed).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Last Observed:</strong> {new Date(pattern.last_observed).toLocaleDateString()}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Anomaly Details Dialog */}
      <Dialog
        open={anomalyDialogOpen}
        onClose={() => setAnomalyDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Behavioral Anomaly Details</DialogTitle>
        <DialogContent>
          {selectedAnomaly && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Anomaly Information
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Entity:</strong> {selectedAnomaly.entity_id}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Type:</strong> {selectedAnomaly.anomaly_type}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Severity:</strong> {selectedAnomaly.severity}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Timestamp:</strong> {new Date(selectedAnomaly.timestamp).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Context
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Baseline Profile:</strong> {selectedAnomaly.behavioral_context.baseline_profile}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Temporal Context:</strong> {selectedAnomaly.behavioral_context.temporal_context}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {selectedAnomaly.description}
                </Typography>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Recommendations
                </Typography>
                <List dense>
                  {selectedAnomaly.recommendations.map((rec, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={rec} />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnomalyDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Entity Analysis Dialog */}
      <Dialog
        open={entityAnalysisDialogOpen}
        onClose={() => setEntityAnalysisDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Analyze Entity Behavior</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Entity ID"
                value={entityAnalysis.entityId}
                onChange={(e) => setEntityAnalysis(prev => ({ ...prev, entityId: e.target.value }))}
                placeholder="e.g., apt_group_1, malware_sample_xyz"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Entity Type</InputLabel>
                <Select
                  value={entityAnalysis.entityType}
                  onChange={(e) => setEntityAnalysis(prev => ({ ...prev, entityType: e.target.value as any }))}
                >
                  {entityTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Compare With (Optional)"
                value={entityAnalysis.compareWith}
                onChange={(e) => setEntityAnalysis(prev => ({ ...prev, compareWith: e.target.value }))}
                placeholder="Entity ID to compare with"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEntityAnalysisDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={analyzeEntity}
            variant="contained"
            disabled={!entityAnalysis.entityId || analyzing}
            startIcon={analyzing ? <CircularProgress size={16} /> : <Psychology />}
          >
            {analyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Comparison Results Dialog */}
      <Dialog
        open={comparisonDialogOpen}
        onClose={() => setComparisonDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Behavioral Comparison Results</DialogTitle>
        <DialogContent>
          {comparison && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Similarity Score: {Math.round(comparison.similarity_score * 100)}%
                </Alert>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Common Patterns
                </Typography>
                {comparison.common_patterns.map((pattern, index) => (
                  <Chip
                    key={index}
                    label={pattern.pattern_type}
                    size="small"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Key Differences
                </Typography>
                {comparison.differences.map((diff, index) => (
                  <Typography key={index} variant="body2" gutterBottom>
                    <strong>{diff.aspect}:</strong> {diff.description}
                  </Typography>
                ))}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComparisonDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BehavioralAnalysisDashboard;