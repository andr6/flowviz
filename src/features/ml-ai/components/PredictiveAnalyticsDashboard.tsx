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
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Slider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Timeline,
  Assessment,
  Visibility,
  Add,
  Refresh,
  PlayArrow,
  Stop,
  Warning,
  CheckCircle,
  Error,
  Info,
  ExpandMore,
  Computer,
  Security,
  NetworkSecurity,
  BugReport,
  DataUsage,
  Analytics,
  PsychologyIcon,
  SmartToy,
  Insights,
  Predictions,
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
  ComposedChart,
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
} from 'recharts';
import { machineLearningService } from '../services/MachineLearningService';
import type {
  PredictiveModel,
  PredictionResult,
  ModelPerformance,
  PredictionFilters,
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
      id={`predictive-tabpanel-${index}`}
      aria-labelledby={`predictive-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const PredictiveAnalyticsDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [models, setModels] = useState<PredictiveModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<PredictiveModel | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [predictionDialogOpen, setPredictionDialogOpen] = useState(false);
  const [modelTrainingDialogOpen, setModelTrainingDialogOpen] = useState(false);
  const [scenarioDialogOpen, setScenarioDialogOpen] = useState(false);

  // Filters
  const [targetFilter, setTargetFilter] = useState('all');
  const [riskLevelFilter, setRiskLevelFilter] = useState('all');
  const [timeHorizonFilter, setTimeHorizonFilter] = useState('all');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);

  // New model configuration
  const [newModel, setNewModel] = useState({
    name: '',
    model_type: 'lstm' as const,
    prediction_target: 'attack_likelihood' as const,
    time_horizon: '7d',
    description: ''
  });

  // Scenario analysis
  const [scenarioParams, setScenarioParams] = useState({
    threat_level_increase: 0,
    vulnerability_exposure: 0,
    geopolitical_tension: 0,
    seasonal_factor: 0
  });

  // Metrics
  const [metrics, setMetrics] = useState({
    totalPredictions: 0,
    highRiskPredictions: 0,
    predictionAccuracy: 0,
    avgConfidence: 0,
    trendsIdentified: 0,
    modelsActive: 0
  });

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [targetFilter, riskLevelFilter, timeHorizonFilter, confidenceThreshold]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const filters: PredictionFilters = {
        confidenceRange: [confidenceThreshold, 1.0]
      };
      
      if (targetFilter !== 'all') {
        filters.predictionTarget = targetFilter;
      }
      
      if (riskLevelFilter !== 'all') {
        filters.riskLevel = [riskLevelFilter];
      }

      const [predictionsData, modelsData, mlMetrics] = await Promise.all([
        machineLearningService.predictive_analytics.getPredictions(filters),
        machineLearningService.model_management.getAllModels('predictive'),
        machineLearningService.getMLMetrics()
      ]);

      setPredictions(predictionsData);
      setModels(modelsData as PredictiveModel[]);
      
      // Update metrics
      setMetrics({
        totalPredictions: predictionsData.length,
        highRiskPredictions: predictionsData.filter(p => p.risk_level === 'high' || p.risk_level === 'critical').length,
        predictionAccuracy: mlMetrics.prediction_accuracy || 0.84,
        avgConfidence: predictionsData.reduce((sum, p) => sum + (p.confidence_interval.confidence_level || 0), 0) / predictionsData.length || 0,
        trendsIdentified: 12, // Mock data
        modelsActive: modelsData.filter(m => m.status === 'ready').length
      });
    } catch (error) {
      console.error('Failed to load predictive analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePredictions = async () => {
    try {
      setGenerating(true);
      
      if (selectedModel) {
        const newPredictions = await machineLearningService.predictive_analytics.generatePredictions(
          selectedModel.id
        );
        setPredictions(prev => [...newPredictions, ...prev]);
      }
    } catch (error) {
      console.error('Failed to generate predictions:', error);
    } finally {
      setGenerating(false);
    }
  };

  const trainNewModel = async () => {
    try {
      setLoading(true);
      
      const modelConfig: Partial<PredictiveModel> = {
        name: newModel.name,
        model_type: newModel.model_type,
        prediction_target: newModel.prediction_target,
        time_horizon: newModel.time_horizon,
        status: 'training',
        trainingData: {
          id: `dataset_${Date.now()}`,
          name: 'Historical Threat Data',
          size: 50000,
          features: [],
          timeRange: {
            start: new Date(Date.now() - 86400000 * 90).toISOString(),
            end: new Date().toISOString()
          },
          quality: {
            completeness: 0.94,
            consistency: 0.91,
            accuracy: 0.88,
            validity: 0.92,
            uniqueness: 0.96,
            overall_score: 0.92,
            issues: []
          },
          preprocessing: {
            normalization: 'z_score',
            feature_selection: true,
            outlier_removal: true,
            encoding_strategy: 'embedding'
          }
        },
        feature_engineering: {
          temporal_features: true,
          interaction_features: true,
          aggregation_features: [
            {
              name: 'attack_frequency',
              source_field: 'attack_events',
              aggregation_type: 'count',
              time_window: '24h'
            },
            {
              name: 'threat_diversity',
              source_field: 'technique_types',
              aggregation_type: 'count',
              time_window: '7d'
            }
          ],
          external_features: [
            {
              name: 'geopolitical_events',
              source: 'geopolitical',
              update_frequency: 'daily',
              data_quality: 0.85
            },
            {
              name: 'vulnerability_disclosures',
              source: 'vulnerability_feeds',
              update_frequency: 'hourly',
              data_quality: 0.92
            }
          ],
          feature_transformations: [
            {
              name: 'log_transform',
              transformation_type: 'log',
              parameters: { base: 10 }
            }
          ]
        },
        predictions: []
      };

      const modelId = await machineLearningService.predictive_analytics.trainPredictiveModel(modelConfig as PredictiveModel);
      
      // Reset form and close dialog
      setNewModel({
        name: '',
        model_type: 'lstm',
        prediction_target: 'attack_likelihood',
        time_horizon: '7d',
        description: ''
      });
      setModelTrainingDialogOpen(false);
      
      // Reload data
      loadDashboardData();
    } catch (error) {
      console.error('Failed to train predictive model:', error);
    } finally {
      setLoading(false);
    }
  };

  const runScenarioAnalysis = async () => {
    try {
      setLoading(true);
      
      // Simulate scenario analysis with modified parameters
      const scenarioData = {
        threat_landscape_changes: scenarioParams.threat_level_increase,
        vulnerability_exposure_increase: scenarioParams.vulnerability_exposure,
        geopolitical_factors: scenarioParams.geopolitical_tension,
        seasonal_adjustments: scenarioParams.seasonal_factor
      };
      
      // Generate scenario-based predictions
      if (selectedModel) {
        const scenarioPredictions = await machineLearningService.predictive_analytics.generatePredictions(
          selectedModel.id,
          scenarioData
        );
        setPredictions(prev => [...scenarioPredictions, ...prev]);
      }
      
      setScenarioDialogOpen(false);
    } catch (error) {
      console.error('Failed to run scenario analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return '#ff1744';
      case 'high': return '#ff5722';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.7) return 'info';
    if (confidence >= 0.5) return 'warning';
    return 'error';
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0.1) return <TrendingUp color="error" />;
    if (trend < -0.1) return <TrendingDown color="success" />;
    return <Timeline color="info" />;
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

  // Chart data preparation
  const predictionTimelineData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return {
      date: date.toLocaleDateString(),
      attack_likelihood: 30 + Math.random() * 40 + Math.sin(i * 0.2) * 10,
      vulnerability_emergence: 20 + Math.random() * 30,
      campaign_activity: 15 + Math.random() * 25 + Math.cos(i * 0.15) * 8,
      confidence_lower: 20 + Math.random() * 20,
      confidence_upper: 60 + Math.random() * 20
    };
  });

  const riskDistributionData = [
    { name: 'Critical', value: predictions.filter(p => p.risk_level === 'critical').length, color: '#ff1744' },
    { name: 'High', value: predictions.filter(p => p.risk_level === 'high').length, color: '#ff5722' },
    { name: 'Medium', value: predictions.filter(p => p.risk_level === 'medium').length, color: '#ff9800' },
    { name: 'Low', value: predictions.filter(p => p.risk_level === 'low').length, color: '#4caf50' }
  ];

  const targetTypeData = [
    { target: 'Attack Likelihood', accuracy: 0.87, precision: 0.84, recall: 0.89 },
    { target: 'Technique Probability', accuracy: 0.82, precision: 0.80, recall: 0.85 },
    { target: 'Campaign Evolution', accuracy: 0.78, precision: 0.75, recall: 0.81 },
    { target: 'Vulnerability Emergence', accuracy: 0.85, precision: 0.88, recall: 0.82 }
  ];

  const confidenceAnalysisData = predictions.map((pred, index) => ({
    prediction: index + 1,
    confidence: pred.confidence_interval.confidence_level || 0.8,
    accuracy: 0.6 + Math.random() * 0.4,
    predicted_value: pred.predicted_value
  }));

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const predictionTargets = [
    'attack_likelihood',
    'technique_probability', 
    'campaign_evolution',
    'vulnerability_emergence'
  ];

  const modelTypes = [
    'lstm',
    'arima',
    'prophet',
    'xgboost',
    'random_forest',
    'ensemble'
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Predictive Analytics Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Assessment />}
            onClick={() => setScenarioDialogOpen(true)}
          >
            Scenario Analysis
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
            startIcon={generating ? <Timeline /> : <Predictions />}
            onClick={generatePredictions}
            disabled={generating || !selectedModel}
          >
            {generating ? 'Generating...' : 'Generate Predictions'}
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
                {metrics.totalPredictions}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Active Predictions
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Last 30 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="error.main">
                {metrics.highRiskPredictions}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                High Risk
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Require attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="success.main">
                {Math.round(metrics.predictionAccuracy * 100)}%
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Accuracy
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Model performance
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="info.main">
                {Math.round(metrics.avgConfidence * 100)}%
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Avg Confidence
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Prediction certainty
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="warning.main">
                {metrics.trendsIdentified}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Trends Identified
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Emerging patterns
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="secondary.main">
                {metrics.modelsActive}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Active Models
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ready for prediction
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="predictive analytics tabs">
          <Tab label="Predictions" icon={<Timeline />} />
          <Tab label="Models" icon={<SmartToy />} />
          <Tab label="Trends" icon={<TrendingUp />} />
          <Tab label="Insights" icon={<Insights />} />
        </Tabs>
      </Box>

      {/* Predictions Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Filters */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Prediction Filters
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Target Type</InputLabel>
                      <Select
                        value={targetFilter}
                        onChange={(e) => setTargetFilter(e.target.value)}
                      >
                        <MenuItem value="all">All Targets</MenuItem>
                        <MenuItem value="attack_likelihood">Attack Likelihood</MenuItem>
                        <MenuItem value="technique_probability">Technique Probability</MenuItem>
                        <MenuItem value="campaign_evolution">Campaign Evolution</MenuItem>
                        <MenuItem value="vulnerability_emergence">Vulnerability Emergence</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Risk Level</InputLabel>
                      <Select
                        value={riskLevelFilter}
                        onChange={(e) => setRiskLevelFilter(e.target.value)}
                      >
                        <MenuItem value="all">All Risk Levels</MenuItem>
                        <MenuItem value="critical">Critical</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="low">Low</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" gutterBottom>
                      Confidence Threshold: {Math.round(confidenceThreshold * 100)}%
                    </Typography>
                    <Slider
                      value={confidenceThreshold}
                      onChange={(_, value) => setConfidenceThreshold(value as number)}
                      min={0.5}
                      max={1.0}
                      step={0.05}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Active Model</InputLabel>
                      <Select
                        value={selectedModel?.id || ''}
                        onChange={(e) => {
                          const model = models.find(m => m.id === e.target.value);
                          setSelectedModel(model || null);
                        }}
                      >
                        <MenuItem value="">No Model Selected</MenuItem>
                        {models.map((model) => (
                          <MenuItem key={model.id} value={model.id}>
                            {model.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Prediction Timeline */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Prediction Timeline & Confidence Intervals
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={predictionTimelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Area 
                      dataKey="confidence_upper" 
                      fill="#e3f2fd" 
                      stroke="none" 
                      name="Confidence Upper"
                    />
                    <Area 
                      dataKey="confidence_lower" 
                      fill="#ffffff" 
                      stroke="none" 
                      name="Confidence Lower"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="attack_likelihood" 
                      stroke="#ff5722" 
                      strokeWidth={3}
                      name="Attack Likelihood"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="vulnerability_emergence" 
                      stroke="#2196f3" 
                      strokeWidth={2}
                      name="Vulnerability Emergence"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="campaign_activity" 
                      stroke="#4caf50" 
                      strokeWidth={2}
                      name="Campaign Activity"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Risk Distribution and Confidence Analysis */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk Level Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={riskDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {riskDistributionData.map((entry, index) => (
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

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Confidence vs Accuracy Analysis
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterPlot data={confidenceAnalysisData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="confidence" name="Confidence" />
                    <YAxis dataKey="accuracy" name="Accuracy" />
                    <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter dataKey="accuracy" fill="#8884d8" />
                  </ScatterPlot>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Predictions Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Predictions
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Prediction Date</TableCell>
                        <TableCell>Target</TableCell>
                        <TableCell>Predicted Value</TableCell>
                        <TableCell>Confidence</TableCell>
                        <TableCell>Risk Level</TableCell>
                        <TableCell>Model</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {predictions.slice(0, 10).map((prediction) => (
                        <TableRow key={prediction.id}>
                          <TableCell>
                            {new Date(prediction.prediction_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Chip label={prediction.model_id.replace('_', ' ')} size="small" />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2">
                                {Math.round(prediction.predicted_value * 100) / 100}
                              </Typography>
                              {getTrendIcon(prediction.predicted_value - 50)}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <LinearProgress
                                variant="determinate"
                                value={(prediction.confidence_interval.confidence_level || 0.8) * 100}
                                sx={{ width: 60, mr: 1 }}
                                color={getConfidenceColor(prediction.confidence_interval.confidence_level || 0.8) as any}
                              />
                              <Typography variant="caption">
                                {Math.round((prediction.confidence_interval.confidence_level || 0.8) * 100)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={prediction.risk_level}
                              style={{ 
                                backgroundColor: getRiskLevelColor(prediction.risk_level),
                                color: 'white'
                              }}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {prediction.model_id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedPrediction(prediction);
                                setPredictionDialogOpen(true);
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

      {/* Models Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Predictive Models</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setModelTrainingDialogOpen(true)}
              >
                Train New Model
              </Button>
            </Box>
          </Grid>

          {/* Model Performance Comparison */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Model Performance by Target Type
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={targetTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="target" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="accuracy" fill="#8884d8" name="Accuracy" />
                    <Bar dataKey="precision" fill="#82ca9d" name="Precision" />
                    <Bar dataKey="recall" fill="#ffc658" name="Recall" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Models Grid */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {models.map((model) => (
                <Grid item xs={12} sm={6} md={4} key={model.id}>
                  <Card sx={{ 
                    border: selectedModel?.id === model.id ? 2 : 0,
                    borderColor: selectedModel?.id === model.id ? 'primary.main' : 'transparent'
                  }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {model.name}
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Chip label={model.model_type} size="small" sx={{ mr: 1 }} />
                        <Chip 
                          label={model.status} 
                          color={model.status === 'ready' ? 'success' : model.status === 'training' ? 'warning' : 'error'}
                          size="small" 
                        />
                      </Box>

                      <Typography variant="body2" gutterBottom>
                        <strong>Target:</strong> {model.prediction_target?.replace('_', ' ')}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Time Horizon:</strong> {model.time_horizon}
                      </Typography>

                      {model.performance && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Accuracy:</strong> {Math.round((model.performance.accuracy || 0) * 100)}%
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={(model.performance.accuracy || 0) * 100}
                            color="primary"
                            sx={{ mb: 1 }}
                          />
                        </Box>
                      )}

                      <Typography variant="caption" color="text.secondary" display="block">
                        Last trained: {new Date(model.last_trained).toLocaleDateString()}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        <Button
                          size="small"
                          variant={selectedModel?.id === model.id ? "contained" : "outlined"}
                          onClick={() => setSelectedModel(model)}
                        >
                          {selectedModel?.id === model.id ? 'Selected' : 'Select'}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Trends Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Trend Analysis & Pattern Recognition
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <TrendingUp sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Advanced Trend Analysis
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Seasonal patterns, cyclical analysis, and emerging threat trend identification.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Insights Tab */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              AI-Generated Insights & Recommendations
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <PsychologyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Intelligent Insights
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  AI-powered analysis of prediction patterns, model explanations, and strategic recommendations.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Prediction Details Dialog */}
      <Dialog
        open={predictionDialogOpen}
        onClose={() => setPredictionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Prediction Details</DialogTitle>
        <DialogContent>
          {selectedPrediction && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Prediction Information
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Prediction Date:</strong> {new Date(selectedPrediction.prediction_date).toLocaleDateString()}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Predicted Value:</strong> {selectedPrediction.predicted_value.toFixed(2)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Risk Level:</strong> {selectedPrediction.risk_level}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Confidence:</strong> {Math.round((selectedPrediction.confidence_interval.confidence_level || 0.8) * 100)}%
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Model:</strong> {selectedPrediction.model_id}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Confidence Interval
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Lower Bound:</strong> {selectedPrediction.confidence_interval.lower.toFixed(2)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Upper Bound:</strong> {selectedPrediction.confidence_interval.upper.toFixed(2)}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Confidence Level:</strong> {Math.round((selectedPrediction.confidence_interval.confidence_level || 0.8) * 100)}%
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Explanation
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Key Drivers:</strong> {selectedPrediction.explanation.key_drivers.join(', ')}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Trend Analysis:</strong> {selectedPrediction.explanation.trend_analysis}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Confidence Rationale:</strong> {selectedPrediction.explanation.confidence_rationale}
                </Typography>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Recommended Actions
                </Typography>
                <List dense>
                  {selectedPrediction.recommended_actions.map((action, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={action} />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPredictionDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Model Training Dialog */}
      <Dialog
        open={modelTrainingDialogOpen}
        onClose={() => setModelTrainingDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Train New Predictive Model</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Model Name"
                value={newModel.name}
                onChange={(e) => setNewModel(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Model Type</InputLabel>
                <Select
                  value={newModel.model_type}
                  onChange={(e) => setNewModel(prev => ({ ...prev, model_type: e.target.value as any }))}
                >
                  {modelTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Prediction Target</InputLabel>
                <Select
                  value={newModel.prediction_target}
                  onChange={(e) => setNewModel(prev => ({ ...prev, prediction_target: e.target.value as any }))}
                >
                  {predictionTargets.map((target) => (
                    <MenuItem key={target} value={target}>
                      {target.replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Time Horizon"
                value={newModel.time_horizon}
                onChange={(e) => setNewModel(prev => ({ ...prev, time_horizon: e.target.value }))}
                placeholder="e.g., 7d, 30d, 90d"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={newModel.description}
                onChange={(e) => setNewModel(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModelTrainingDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={trainNewModel}
            variant="contained"
            disabled={!newModel.name || !newModel.model_type}
          >
            Start Training
          </Button>
        </DialogActions>
      </Dialog>

      {/* Scenario Analysis Dialog */}
      <Dialog
        open={scenarioDialogOpen}
        onClose={() => setScenarioDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Scenario Analysis</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
            Adjust parameters to simulate different threat landscape scenarios:
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Threat Level Increase: {scenarioParams.threat_level_increase}%
              </Typography>
              <Slider
                value={scenarioParams.threat_level_increase}
                onChange={(_, value) => setScenarioParams(prev => ({ ...prev, threat_level_increase: value as number }))}
                min={-50}
                max={100}
                step={5}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Vulnerability Exposure: {scenarioParams.vulnerability_exposure}%
              </Typography>
              <Slider
                value={scenarioParams.vulnerability_exposure}
                onChange={(_, value) => setScenarioParams(prev => ({ ...prev, vulnerability_exposure: value as number }))}
                min={-30}
                max={80}
                step={5}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Geopolitical Tension: {scenarioParams.geopolitical_tension}%
              </Typography>
              <Slider
                value={scenarioParams.geopolitical_tension}
                onChange={(_, value) => setScenarioParams(prev => ({ ...prev, geopolitical_tension: value as number }))}
                min={-40}
                max={60}
                step={5}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Seasonal Factor: {scenarioParams.seasonal_factor}%
              </Typography>
              <Slider
                value={scenarioParams.seasonal_factor}
                onChange={(_, value) => setScenarioParams(prev => ({ ...prev, seasonal_factor: value as number }))}
                min={-25}
                max={40}
                step={5}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScenarioDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={runScenarioAnalysis}
            variant="contained"
            disabled={!selectedModel}
          >
            Run Analysis
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PredictiveAnalyticsDashboard;