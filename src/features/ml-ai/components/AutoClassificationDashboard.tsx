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
  Switch,
  FormControlLabel,
  Badge,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Category,
  Psychology,
  AutoAwesome,
  Visibility,
  Add,
  Refresh,
  PlayArrow,
  CheckCircle,
  Error,
  Warning,
  Info,
  ExpandMore,
  ThumbUp,
  ThumbDown,
  Edit,
  Delete,
  Download,
  Upload,
  Settings,
  Computer,
  Security,
  BugReport,
  Shield,
  Analytics,
  ModelTraining,
  TextFields,
  SmartToy,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  TreeMap,
} from 'recharts';
import { machineLearningService } from '../services/MachineLearningService';
import type {
  ClassificationModel,
  ClassificationResult,
  ClassificationFeedback,
  ClassificationFilters,
  TextHighlight,
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
      id={`classification-tabpanel-${index}`}
      aria-labelledby={`classification-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const AutoClassificationDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [classifications, setClassifications] = useState<ClassificationResult[]>([]);
  const [models, setModels] = useState<ClassificationModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<ClassificationModel | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<ClassificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [classificationDialogOpen, setClassificationDialogOpen] = useState(false);
  const [modelTrainingDialogOpen, setModelTrainingDialogOpen] = useState(false);
  const [textInputDialogOpen, setTextInputDialogOpen] = useState(false);

  // Filters
  const [classFilter, setClassFilter] = useState('all');
  const [confidenceFilter, setConfidenceFilter] = useState(0.5);
  const [verifiedFilter, setVerifiedFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');

  // Text input for classification
  const [inputText, setInputText] = useState('');
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);

  // New model configuration
  const [newModel, setNewModel] = useState({
    name: '',
    model_type: 'transformer' as const,
    classification_target: 'threat_type' as const,
    description: '',
    classes: [] as string[]
  });

  // Metrics
  const [metrics, setMetrics] = useState({
    totalClassifications: 0,
    accuracyRate: 0,
    averageConfidence: 0,
    verifiedClassifications: 0,
    falsePositiveRate: 0,
    activeModels: 0
  });

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [classFilter, confidenceFilter, verifiedFilter, timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const filters: ClassificationFilters = {
        confidenceRange: [confidenceFilter, 1.0],
        timeRange: { start: getTimeRangeStart(timeRange), end: new Date().toISOString() }
      };
      
      if (classFilter !== 'all') {
        filters.predictedClass = [classFilter];
      }
      
      if (verifiedFilter !== 'all') {
        filters.humanVerified = verifiedFilter === 'verified';
      }

      const [classificationsData, modelsData, mlMetrics] = await Promise.all([
        machineLearningService.auto_classification.getClassifications(filters),
        machineLearningService.model_management.getAllModels('classification'),
        machineLearningService.getMLMetrics()
      ]);

      setClassifications(classificationsData);
      setModels(modelsData as ClassificationModel[]);
      
      // Update metrics
      const verifiedCount = classificationsData.filter(c => c.human_verified).length;
      const totalConfidence = classificationsData.reduce((sum, c) => sum + c.confidence, 0);
      
      setMetrics({
        totalClassifications: classificationsData.length,
        accuracyRate: mlMetrics.classification_accuracy || 0.88,
        averageConfidence: totalConfidence / classificationsData.length || 0,
        verifiedClassifications: verifiedCount,
        falsePositiveRate: mlMetrics.false_positive_rate || 0.07,
        activeModels: modelsData.filter(m => m.status === 'ready').length
      });
    } catch (error) {
      console.error('Failed to load classification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const classifyText = async () => {
    if (!inputText.trim()) return;
    
    try {
      setClassifying(true);
      const result = await machineLearningService.auto_classification.classifyText(
        inputText,
        selectedModel?.id
      );
      setClassificationResult(result);
      setClassifications(prev => [result, ...prev]);
    } catch (error) {
      console.error('Failed to classify text:', error);
    } finally {
      setClassifying(false);
    }
  };

  const provideFeedback = async (classificationId: string, correctClass: string, feedbackType: string) => {
    try {
      const feedback: ClassificationFeedback = {
        user_id: 'current_user',
        timestamp: new Date().toISOString(),
        correct_class: correctClass,
        feedback_type: feedbackType as any,
        confidence: 1.0
      };
      
      await machineLearningService.auto_classification.provideFeedback(classificationId, feedback);
      
      // Update the classification in the list
      setClassifications(prev => prev.map(c => 
        c.id === classificationId 
          ? { ...c, human_verified: true, feedback }
          : c
      ));
    } catch (error) {
      console.error('Failed to provide feedback:', error);
    }
  };

  const trainNewModel = async () => {
    try {
      setLoading(true);
      
      const modelConfig: Partial<ClassificationModel> = {
        name: newModel.name,
        model_type: newModel.model_type,
        classification_target: newModel.classification_target,
        classes: newModel.classes.map((cls, index) => ({
          id: `class_${index}`,
          name: cls,
          description: `Classification for ${cls}`,
          examples: [],
          keywords: [],
          patterns: [],
          confidence_threshold: 0.7,
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`
        })),
        status: 'training',
        trainingData: {
          id: `dataset_${Date.now()}`,
          name: 'Threat Report Training Data',
          size: 25000,
          features: [],
          timeRange: {
            start: new Date(Date.now() - 86400000 * 60).toISOString(),
            end: new Date().toISOString()
          },
          quality: {
            completeness: 0.93,
            consistency: 0.89,
            accuracy: 0.91,
            validity: 0.94,
            uniqueness: 0.98,
            overall_score: 0.93,
            issues: []
          },
          preprocessing: {
            normalization: 'none',
            feature_selection: true,
            outlier_removal: false,
            encoding_strategy: 'embedding'
          }
        },
        text_processing: {
          tokenization: 'word',
          lowercase: true,
          remove_stopwords: true,
          stemming: false,
          lemmatization: true,
          remove_punctuation: true,
          min_word_length: 2,
          max_features: 10000,
          ngram_range: [1, 2]
        },
        feature_extraction: {
          vectorization: 'bert',
          dimensionality: 768,
          pretrained_model: 'bert-base-uncased',
          fine_tuning: true
        }
      };

      const modelId = await machineLearningService.auto_classification.trainClassificationModel(modelConfig as ClassificationModel);
      
      // Reset form and close dialog
      setNewModel({
        name: '',
        model_type: 'transformer',
        classification_target: 'threat_type',
        description: '',
        classes: []
      });
      setModelTrainingDialogOpen(false);
      
      // Reload data
      loadDashboardData();
    } catch (error) {
      console.error('Failed to train classification model:', error);
    } finally {
      setLoading(false);
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.7) return 'info';
    if (confidence >= 0.5) return 'warning';
    return 'error';
  };

  const getClassIcon = (className: string) => {
    switch (className.toLowerCase()) {
      case 'malware': return <BugReport />;
      case 'phishing': return <Security />;
      case 'apt': return <Shield />;
      case 'ransomware': return <Error />;
      case 'trojan': return <Computer />;
      default: return <Category />;
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

  // Chart data preparation
  const classDistributionData = [
    'malware', 'phishing', 'apt', 'ransomware', 'trojan', 'other'
  ].map((cls, index) => ({
    name: cls,
    value: classifications.filter(c => c.predicted_class.toLowerCase().includes(cls)).length,
    color: COLORS[index % COLORS.length]
  }));

  const confidenceDistributionData = Array.from({ length: 10 }, (_, i) => {
    const minConf = i * 0.1;
    const maxConf = (i + 1) * 0.1;
    return {
      range: `${Math.round(minConf * 100)}-${Math.round(maxConf * 100)}%`,
      count: classifications.filter(c => c.confidence >= minConf && c.confidence < maxConf).length
    };
  });

  const modelPerformanceData = models.map(model => ({
    name: model.name,
    accuracy: model.performance?.accuracy || 0.8 + Math.random() * 0.2,
    precision: model.performance?.precision || 0.75 + Math.random() * 0.25,
    recall: model.performance?.recall || 0.7 + Math.random() * 0.3,
    f1_score: model.performance?.f1_score || 0.73 + Math.random() * 0.27
  }));

  const classificationTrendData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    classifications: Math.floor(Math.random() * 50) + 10,
    verified: Math.floor(Math.random() * 30) + 5,
    accuracy: 0.7 + Math.random() * 0.3
  }));

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const classificationTargets = [
    'threat_type',
    'malware_family',
    'attack_technique',
    'threat_actor',
    'campaign'
  ];

  const modelTypes = [
    'naive_bayes',
    'svm',
    'random_forest',
    'neural_network',
    'transformer',
    'ensemble'
  ];

  const threatClasses = [
    'malware',
    'phishing',
    'apt',
    'ransomware',
    'trojan',
    'botnet',
    'rootkit',
    'spyware',
    'adware',
    'ddos'
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Auto-Classification Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<TextFields />}
            onClick={() => setTextInputDialogOpen(true)}
          >
            Classify Text
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
            startIcon={<Add />}
            onClick={() => setModelTrainingDialogOpen(true)}
          >
            Train Model
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
                {metrics.totalClassifications}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Classifications
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Last {timeRange}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="success.main">
                {Math.round(metrics.accuracyRate * 100)}%
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
                {Math.round(metrics.averageConfidence * 100)}%
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Avg Confidence
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Classification certainty
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="warning.main">
                {metrics.verifiedClassifications}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Verified
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Human validated
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="error.main">
                {Math.round(metrics.falsePositiveRate * 100)}%
              </Typography>
              <Typography variant="h6" color="text.secondary">
                False Positive
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Error rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="secondary.main">
                {metrics.activeModels}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Active Models
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ready to classify
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="classification tabs">
          <Tab label="Classifications" icon={<Category />} />
          <Tab label="Models" icon={<ModelTraining />} />
          <Tab label="Analytics" icon={<Analytics />} />
          <Tab label="Training" icon={<Psychology />} />
        </Tabs>
      </Box>

      {/* Classifications Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Filters */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Classification Filters
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Class Filter</InputLabel>
                      <Select
                        value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value)}
                      >
                        <MenuItem value="all">All Classes</MenuItem>
                        {threatClasses.map((cls) => (
                          <MenuItem key={cls} value={cls}>
                            {cls.charAt(0).toUpperCase() + cls.slice(1)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Verification Status</InputLabel>
                      <Select
                        value={verifiedFilter}
                        onChange={(e) => setVerifiedFilter(e.target.value)}
                      >
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="verified">Verified</MenuItem>
                        <MenuItem value="unverified">Unverified</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
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

          {/* Classification Trends */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Classification Trends
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={classificationTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="classifications" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="verified" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Class Distribution */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Class Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={classDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {classDistributionData.map((entry, index) => (
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

          {/* Confidence Distribution */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Confidence Score Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={confidenceDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Classifications Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Classifications
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Text Preview</TableCell>
                        <TableCell>Predicted Class</TableCell>
                        <TableCell>Confidence</TableCell>
                        <TableCell>Verified</TableCell>
                        <TableCell>Model</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {classifications.slice(0, 10).map((classification) => (
                        <TableRow key={classification.id}>
                          <TableCell>
                            {new Date(classification.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ 
                              maxWidth: 200, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {classification.input_text}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getClassIcon(classification.predicted_class)}
                              <Chip
                                label={classification.predicted_class}
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CircularProgress
                                variant="determinate"
                                value={classification.confidence * 100}
                                size={30}
                                color={getConfidenceColor(classification.confidence) as any}
                              />
                              <Typography variant="body2" sx={{ ml: 1 }}>
                                {Math.round(classification.confidence * 100)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {classification.human_verified ? (
                              <CheckCircle color="success" />
                            ) : (
                              <Badge badgeContent="!" color="warning">
                                <Error color="disabled" />
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {classification.model_id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedClassification(classification);
                                  setClassificationDialogOpen(true);
                                }}
                              >
                                <Visibility />
                              </IconButton>
                              {!classification.human_verified && (
                                <>
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => provideFeedback(classification.id, classification.predicted_class, 'confirmation')}
                                  >
                                    <ThumbUp />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => provideFeedback(classification.id, 'incorrect', 'correction')}
                                  >
                                    <ThumbDown />
                                  </IconButton>
                                </>
                              )}
                            </Box>
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
            <Typography variant="h6" gutterBottom>
              Classification Models
            </Typography>
          </Grid>

          {/* Model Performance Chart */}
          <Grid item xs={12}>
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
                    <Bar dataKey="accuracy" fill="#8884d8" name="Accuracy" />
                    <Bar dataKey="precision" fill="#82ca9d" name="Precision" />
                    <Bar dataKey="recall" fill="#ffc658" name="Recall" />
                    <Bar dataKey="f1_score" fill="#ff7c7c" name="F1 Score" />
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
                        <strong>Target:</strong> {model.classification_target?.replace('_', ' ')}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Classes:</strong> {model.classes?.length || 0}
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

      {/* Analytics Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Classification Analytics & Insights
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <Analytics sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Advanced Analytics
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Feature importance analysis, confusion matrices, and classification performance metrics.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Training Tab */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Model Training & Improvement
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <SmartToy sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Training Pipeline
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Automated model training, hyperparameter tuning, and continuous learning capabilities.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Text Input Dialog */}
      <Dialog
        open={textInputDialogOpen}
        onClose={() => setTextInputDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Classify Text</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Enter text to classify"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste threat intelligence report, security article, or any text for classification..."
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Classification Model</InputLabel>
                <Select
                  value={selectedModel?.id || ''}
                  onChange={(e) => {
                    const model = models.find(m => m.id === e.target.value);
                    setSelectedModel(model || null);
                  }}
                >
                  {models.map((model) => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.name} ({model.classification_target})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {classificationResult && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">
                    Classification Result: {classificationResult.predicted_class}
                  </Typography>
                  <Typography variant="body2">
                    Confidence: {Math.round(classificationResult.confidence * 100)}%
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTextInputDialogOpen(false)}>
            Close
          </Button>
          <Button
            onClick={classifyText}
            variant="contained"
            disabled={!inputText.trim() || !selectedModel || classifying}
            startIcon={classifying ? <CircularProgress size={16} /> : <AutoAwesome />}
          >
            {classifying ? 'Classifying...' : 'Classify'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Classification Details Dialog */}
      <Dialog
        open={classificationDialogOpen}
        onClose={() => setClassificationDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Classification Details</DialogTitle>
        <DialogContent>
          {selectedClassification && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Original Text
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2">
                    {selectedClassification.input_text}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Classification Results
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Predicted Class:</strong> {selectedClassification.predicted_class}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Confidence:</strong> {Math.round(selectedClassification.confidence * 100)}%
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Model:</strong> {selectedClassification.model_id}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Timestamp:</strong> {new Date(selectedClassification.timestamp).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Probability Distribution
                </Typography>
                {Object.entries(selectedClassification.probability_distribution).map(([cls, prob]) => (
                  <Box key={cls} sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption">{cls}</Typography>
                      <Typography variant="caption">{Math.round(prob * 100)}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={prob * 100}
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                  </Box>
                ))}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Explanation
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Key Features:</strong> {selectedClassification.explanation.key_features.join(', ')}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Confidence Rationale:</strong> {selectedClassification.explanation.confidence_rationale}
                </Typography>
                {selectedClassification.explanation.text_highlights.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Important Text Segments
                    </Typography>
                    {selectedClassification.explanation.text_highlights.map((highlight, index) => (
                      <Chip
                        key={index}
                        label={highlight.text}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClassificationDialogOpen(false)}>
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
        <DialogTitle>Train New Classification Model</DialogTitle>
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
                      {type.replace('_', ' ').toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Classification Target</InputLabel>
                <Select
                  value={newModel.classification_target}
                  onChange={(e) => setNewModel(prev => ({ ...prev, classification_target: e.target.value as any }))}
                >
                  {classificationTargets.map((target) => (
                    <MenuItem key={target} value={target}>
                      {target.replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Classification Classes (one per line)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="malware&#10;phishing&#10;apt&#10;ransomware&#10;trojan"
                value={newModel.classes.join('\n')}
                onChange={(e) => setNewModel(prev => ({ 
                  ...prev, 
                  classes: e.target.value.split('\n').filter(c => c.trim()) 
                }))}
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
            disabled={!newModel.name || !newModel.model_type || newModel.classes.length === 0}
          >
            Start Training
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AutoClassificationDashboard;