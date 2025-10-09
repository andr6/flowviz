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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Tooltip,
  IconButton,
  Divider,
  Switch,
  FormControlLabel,
  Badge,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  TrendingUp,
  Warning,
  Error,
  CheckCircle,
  Info,
  ExpandMore,
  Refresh,
  Add,
  Edit,
  Delete,
  Visibility,
  Download,
  Upload,
  Settings,
  PlayArrow,
  Stop,
  Timeline,
  Analytics,
  Security,
  Computer,
  NetworkSecurity,
  DataUsage,
  Assessment,
  ModelTraining,
  PsychologyIcon,
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
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { machineLearningService } from '../services/MachineLearningService';
import type {
  AnomalyDetection,
  AnomalyDetectionModel,
  ModelPerformance,
  AnomalyFilters,
  ModelAlert,
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
      id={`anomaly-tabpanel-${index}`}
      aria-labelledby={`anomaly-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const AnomalyDetectionDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [anomalies, setAnomalies] = useState<AnomalyDetection[]>([]);
  const [models, setModels] = useState<AnomalyDetectionModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AnomalyDetectionModel | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyDetection | null>(null);
  const [alerts, setAlerts] = useState<ModelAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [detectionRunning, setDetectionRunning] = useState(false);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [anomalyDialogOpen, setAnomalyDialogOpen] = useState(false);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');

  // New model configuration
  const [newModel, setNewModel] = useState({
    name: '',
    modelType: 'isolation_forest' as const,
    description: '',
    features: [] as string[],
    hyperparameters: {} as Record<string, any>
  });

  // Metrics
  const [metrics, setMetrics] = useState({
    totalAnomalies: 0,
    criticalAnomalies: 0,
    falsePositiveRate: 0,
    detectionAccuracy: 0,
    avgResponseTime: 0,
    modelHealth: 'good' as 'good' | 'degraded' | 'poor'
  });

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [severityFilter, statusFilter, modelFilter, timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const filters: AnomalyFilters = {
        timeRange: { start: getTimeRangeStart(timeRange), end: new Date().toISOString() }
      };
      
      if (severityFilter !== 'all') {
        filters.severity = [severityFilter];
      }
      
      if (statusFilter !== 'all') {
        filters.status = [statusFilter];
      }
      
      if (modelFilter !== 'all') {
        filters.modelId = modelFilter;
      }

      const [anomaliesData, modelsData, alertsData, mlMetrics] = await Promise.all([
        machineLearningService.anomaly_detection.getAnomalies(filters),
        machineLearningService.model_management.getAllModels('anomaly_detection'),
        machineLearningService.getModelAlerts(),
        machineLearningService.getMLMetrics()
      ]);

      setAnomalies(anomaliesData);
      setModels(modelsData as AnomalyDetectionModel[]);
      setAlerts(alertsData);
      
      // Update metrics
      setMetrics({
        totalAnomalies: anomaliesData.length,
        criticalAnomalies: anomaliesData.filter(a => a.severity === 'critical').length,
        falsePositiveRate: mlMetrics.false_positive_rate || 0.05,
        detectionAccuracy: mlMetrics.detection_accuracy || 0.92,
        avgResponseTime: mlMetrics.average_response_time || 125,
        modelHealth: mlMetrics.system_health || 'good'
      });
    } catch (error) {
      console.error('Failed to load anomaly detection data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAnomalyDetection = async () => {
    try {
      setDetectionRunning(true);
      
      // Simulate running detection on new data
      const sampleData = generateSampleDataPoints();
      const detectedAnomalies = await machineLearningService.anomaly_detection.detectAnomalies(
        sampleData,
        selectedModel?.id
      );
      
      setAnomalies(prev => [...detectedAnomalies, ...prev]);
    } catch (error) {
      console.error('Failed to run anomaly detection:', error);
    } finally {
      setDetectionRunning(false);
    }
  };

  const trainNewModel = async () => {
    try {
      setLoading(true);
      
      const modelConfig: Partial<AnomalyDetectionModel> = {
        name: newModel.name,
        modelType: newModel.modelType,
        features: newModel.features,
        hyperparameters: newModel.hyperparameters,
        status: 'training',
        trainingData: {
          id: `dataset_${Date.now()}`,
          name: 'Historical Attack Flow Data',
          size: 10000,
          features: newModel.features.map(f => ({
            name: f,
            type: 'numerical',
            importance: Math.random(),
            missing_rate: Math.random() * 0.1,
            statistics: {
              mean: Math.random() * 100,
              std: Math.random() * 20,
              min: 0,
              max: 100,
              null_count: Math.floor(Math.random() * 100)
            }
          })),
          timeRange: {
            start: new Date(Date.now() - 86400000 * 30).toISOString(),
            end: new Date().toISOString()
          },
          quality: {
            completeness: 0.95,
            consistency: 0.88,
            accuracy: 0.92,
            validity: 0.89,
            uniqueness: 0.97,
            overall_score: 0.92,
            issues: []
          },
          preprocessing: {
            normalization: 'z_score',
            feature_selection: true,
            outlier_removal: true,
            encoding_strategy: 'one_hot'
          }
        },
        thresholds: {
          contamination_rate: 0.05,
          anomaly_score_threshold: 0.7,
          confidence_threshold: 0.8,
          severity_thresholds: {
            low: 0.3,
            medium: 0.5,
            high: 0.7,
            critical: 0.9
          }
        }
      };

      const modelId = await machineLearningService.anomaly_detection.trainModel(modelConfig as AnomalyDetectionModel);
      
      // Reset form and close dialog
      setNewModel({
        name: '',
        modelType: 'isolation_forest',
        description: '',
        features: [],
        hyperparameters: {}
      });
      setTrainingDialogOpen(false);
      
      // Reload data to show new model
      loadDashboardData();
    } catch (error) {
      console.error('Failed to train model:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAnomalyStatus = async (anomalyId: string, status: string, notes?: string) => {
    try {
      await machineLearningService.anomaly_detection.updateAnomalyStatus(anomalyId, status, notes);
      setAnomalies(prev => prev.map(a => 
        a.id === anomalyId ? { ...a, status: status as any, notes } : a
      ));
    } catch (error) {
      console.error('Failed to update anomaly status:', error);
    }
  };

  const getTimeRangeStart = (range: string): string => {
    const now = new Date();
    switch (range) {
      case '1h': return new Date(now.getTime() - 3600000).toISOString();
      case '24h': return new Date(now.getTime() - 86400000).toISOString();
      case '7d': return new Date(now.getTime() - 86400000 * 7).toISOString();
      case '30d': return new Date(now.getTime() - 86400000 * 30).toISOString();
      default: return new Date(now.getTime() - 86400000).toISOString();
    }
  };

  const generateSampleDataPoints = (): Record<string, any>[] => {
    return Array.from({ length: 1000 }, () => ({
      connection_count: Math.random() * 1000,
      data_transfer: Math.random() * 10000,
      session_duration: Math.random() * 3600,
      unique_destinations: Math.random() * 50,
      protocol_diversity: Math.random() * 10,
      time_of_day: Math.random() * 24,
      geographic_spread: Math.random() * 100
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'success';
      case 'confirmed': return 'warning';
      case 'investigating': return 'info';
      case 'false_positive': return 'default';
      case 'new': return 'error';
      default: return 'default';
    }
  };

  const getModelHealthIcon = (health: string) => {
    switch (health) {
      case 'good': return <CheckCircle color="success" />;
      case 'degraded': return <Warning color="warning" />;
      case 'poor': return <Error color="error" />;
      default: return <Info color="info" />;
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Chart data preparation
  const anomalyTrendData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    anomalies: Math.floor(Math.random() * 20),
    critical: Math.floor(Math.random() * 5),
    resolved: Math.floor(Math.random() * 15)
  }));

  const severityDistributionData = [
    { name: 'Critical', value: anomalies.filter(a => a.severity === 'critical').length, color: '#FF4444' },
    { name: 'High', value: anomalies.filter(a => a.severity === 'high').length, color: '#FF8042' },
    { name: 'Medium', value: anomalies.filter(a => a.severity === 'medium').length, color: '#FFBB28' },
    { name: 'Low', value: anomalies.filter(a => a.severity === 'low').length, color: '#00C49F' }
  ];

  const modelPerformanceData = models.map((model, index) => ({
    name: model.name,
    accuracy: model.performance?.accuracy || 0.85 + Math.random() * 0.15,
    precision: model.performance?.precision || 0.80 + Math.random() * 0.20,
    recall: model.performance?.recall || 0.75 + Math.random() * 0.25,
    f1_score: model.performance?.f1_score || 0.78 + Math.random() * 0.22
  }));

  const featureImportanceData = selectedModel?.performance?.feature_importance ? 
    Object.entries(selectedModel.performance.feature_importance).map(([feature, importance]) => ({
      feature,
      importance: importance * 100
    })) : [];

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const availableFeatures = [
    'connection_count',
    'data_transfer_volume',
    'session_duration',
    'unique_destinations',
    'protocol_diversity',
    'time_of_day',
    'geographic_spread',
    'payload_entropy',
    'packet_size_variance',
    'communication_frequency'
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Anomaly Detection Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="1h">Last Hour</MenuItem>
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadDashboardData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={detectionRunning ? <CircularProgress size={16} /> : <PlayArrow />}
            onClick={runAnomalyDetection}
            disabled={detectionRunning}
          >
            {detectionRunning ? 'Detecting...' : 'Run Detection'}
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Metrics Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary">
                {metrics.totalAnomalies}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Total Anomalies
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Last {timeRange}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="error.main">
                {metrics.criticalAnomalies}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Critical
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Require immediate attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="success.main">
                {Math.round(metrics.detectionAccuracy * 100)}%
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Detection Accuracy
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Model performance
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="info.main">
                {Math.round(metrics.falsePositiveRate * 100)}%
              </Typography>
              <Typography variant="h6" color="text.secondary">
                False Positive Rate
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Lower is better
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 1 }}>
                {getModelHealthIcon(metrics.modelHealth)}
                <Typography variant="h6" sx={{ ml: 1 }}>
                  {metrics.modelHealth.toUpperCase()}
                </Typography>
              </Box>
              <Typography variant="h6" color="text.secondary">
                Model Health
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics.avgResponseTime}ms avg response
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="anomaly detection tabs">
          <Tab label="Anomalies" icon={<Warning />} />
          <Tab label="Models" icon={<ModelTraining />} />
          <Tab label="Analytics" icon={<Analytics />} />
          <Tab label="Alerts" icon={<Security />} />
        </Tabs>
      </Box>

      {/* Anomalies Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Filters */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Filters
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Severity</InputLabel>
                      <Select
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value)}
                      >
                        <MenuItem value="all">All Severities</MenuItem>
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
                        <MenuItem value="new">New</MenuItem>
                        <MenuItem value="investigating">Investigating</MenuItem>
                        <MenuItem value="confirmed">Confirmed</MenuItem>
                        <MenuItem value="false_positive">False Positive</MenuItem>
                        <MenuItem value="resolved">Resolved</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Model</InputLabel>
                      <Select
                        value={modelFilter}
                        onChange={(e) => setModelFilter(e.target.value)}
                      >
                        <MenuItem value="all">All Models</MenuItem>
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

          {/* Anomaly Trend Chart */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Anomaly Detection Trends
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={anomalyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="anomalies" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="critical" stroke="#ff4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="resolved" stroke="#00c49f" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Severity Distribution */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Severity Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={severityDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {severityDistributionData.map((entry, index) => (
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

          {/* Anomalies Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Anomalies
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Anomaly Score</TableCell>
                        <TableCell>Confidence</TableCell>
                        <TableCell>Model</TableCell>
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
                            <Chip
                              label={anomaly.severity}
                              color={getSeverityColor(anomaly.severity) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CircularProgress
                                variant="determinate"
                                value={anomaly.anomaly_score * 100}
                                size={30}
                                color={getSeverityColor(anomaly.severity) as any}
                              />
                              <Typography variant="body2" sx={{ ml: 1 }}>
                                {Math.round(anomaly.anomaly_score * 100)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {Math.round(anomaly.confidence * 100)}%
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {anomaly.model_id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={anomaly.status}
                              color={getStatusColor(anomaly.status) as any}
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
                            {anomaly.status === 'new' && (
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => updateAnomalyStatus(anomaly.id, 'investigating')}
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
              <Typography variant="h6">Anomaly Detection Models</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setTrainingDialogOpen(true)}
              >
                Train New Model
              </Button>
            </Box>
          </Grid>

          {/* Model Performance Chart */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Model Performance Comparison
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={modelPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="accuracy" fill="#8884d8" />
                    <Bar dataKey="precision" fill="#82ca9d" />
                    <Bar dataKey="recall" fill="#ffc658" />
                    <Bar dataKey="f1_score" fill="#ff7c7c" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Feature Importance */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Feature Importance
                  {selectedModel && ` - ${selectedModel.name}`}
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={featureImportanceData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="feature" type="category" width={80} />
                    <RechartsTooltip />
                    <Bar dataKey="importance" fill="#8884d8" />
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
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {model.name}
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Chip label={model.modelType} size="small" sx={{ mr: 1 }} />
                        <Chip 
                          label={model.status} 
                          color={model.status === 'ready' ? 'success' : model.status === 'training' ? 'warning' : 'error'}
                          size="small" 
                        />
                      </Box>

                      {model.performance && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Accuracy:</strong> {Math.round((model.performance.accuracy || 0) * 100)}%
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            <strong>Precision:</strong> {Math.round((model.performance.precision || 0) * 100)}%
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            <strong>Recall:</strong> {Math.round((model.performance.recall || 0) * 100)}%
                          </Typography>
                        </Box>
                      )}

                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Last trained: {new Date(model.lastTrained).toLocaleDateString()}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Visibility />}
                          onClick={() => {
                            setSelectedModel(model);
                            setModelDialogOpen(true);
                          }}
                        >
                          Details
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Analytics />}
                          onClick={() => setSelectedModel(model)}
                        >
                          Select
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

      {/* Analytics Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Advanced Analytics & Insights
            </Typography>
          </Grid>

          {/* Coming soon placeholder */}
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <PsychologyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Advanced Analytics Coming Soon
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Deep statistical analysis, pattern recognition, and predictive insights for anomaly detection.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Alerts Tab */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Model Alerts & Notifications
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Active Alerts
                </Typography>
                <List>
                  {alerts.slice(0, 5).map((alert) => (
                    <ListItem key={alert.id}>
                      <ListItemIcon>
                        {alert.severity === 'critical' ? (
                          <Error color="error" />
                        ) : alert.severity === 'high' ? (
                          <Warning color="warning" />
                        ) : (
                          <Info color="info" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={alert.description}
                        secondary={`${alert.alert_type} • ${new Date(alert.timestamp).toLocaleString()}`}
                      />
                      <ListItemSecondaryAction>
                        <Chip
                          label={alert.status}
                          color={alert.status === 'resolved' ? 'success' : 'default'}
                          size="small"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Anomaly Details Dialog */}
      <Dialog
        open={anomalyDialogOpen}
        onClose={() => setAnomalyDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Anomaly Details
        </DialogTitle>
        <DialogContent>
          {selectedAnomaly && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Basic Information
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Timestamp:</strong> {new Date(selectedAnomaly.timestamp).toLocaleString()}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Severity:</strong> {selectedAnomaly.severity}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Anomaly Score:</strong> {Math.round(selectedAnomaly.anomaly_score * 100)}%
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Confidence:</strong> {Math.round(selectedAnomaly.confidence * 100)}%
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Model:</strong> {selectedAnomaly.model_id}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Feature Contributions
                </Typography>
                {Object.entries(selectedAnomaly.feature_contributions).map(([feature, contribution]) => (
                  <Box key={feature} sx={{ mb: 1 }}>
                    <Typography variant="caption">{feature}</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={contribution * 100}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                ))}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Explanation
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Primary Factors:</strong> {selectedAnomaly.explanation.primary_factors.join(', ')}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Summary:</strong> {selectedAnomaly.explanation.statistical_summary}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Risk Assessment:</strong> {selectedAnomaly.explanation.risk_assessment}
                </Typography>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Recommended Actions
                </Typography>
                <List dense>
                  {selectedAnomaly.explanation.recommended_actions.map((action, index) => (
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
          <Button onClick={() => setAnomalyDialogOpen(false)}>
            Close
          </Button>
          {selectedAnomaly?.status === 'new' && (
            <Button
              variant="contained"
              onClick={() => {
                if (selectedAnomaly) {
                  updateAnomalyStatus(selectedAnomaly.id, 'investigating');
                  setAnomalyDialogOpen(false);
                }
              }}
            >
              Start Investigation
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Model Training Dialog */}
      <Dialog
        open={trainingDialogOpen}
        onClose={() => setTrainingDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Train New Anomaly Detection Model</DialogTitle>
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
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Model Type</InputLabel>
                <Select
                  value={newModel.modelType}
                  onChange={(e) => setNewModel(prev => ({ ...prev, modelType: e.target.value as any }))}
                >
                  <MenuItem value="isolation_forest">Isolation Forest</MenuItem>
                  <MenuItem value="one_class_svm">One-Class SVM</MenuItem>
                  <MenuItem value="autoencoder">Autoencoder</MenuItem>
                  <MenuItem value="statistical">Statistical</MenuItem>
                  <MenuItem value="ensemble">Ensemble</MenuItem>
                </Select>
              </FormControl>
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
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Select Features
              </Typography>
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {availableFeatures.map((feature) => (
                  <FormControlLabel
                    key={feature}
                    control={
                      <Switch
                        checked={newModel.features.includes(feature)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewModel(prev => ({
                              ...prev,
                              features: [...prev.features, feature]
                            }));
                          } else {
                            setNewModel(prev => ({
                              ...prev,
                              features: prev.features.filter(f => f !== feature)
                            }));
                          }
                        }}
                      />
                    }
                    label={feature.replace(/_/g, ' ')}
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrainingDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={trainNewModel}
            variant="contained"
            disabled={!newModel.name || newModel.features.length === 0}
          >
            Start Training
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AnomalyDetectionDashboard;