import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Search as SearchIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
  Insights as InsightsIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter, AreaChart, Area } from 'recharts';
import { DataManagementService } from '../services/DataManagementService';
import type { HistoricalAnalysis, AnalysisResult, AnalysisInsight } from '../types/DataManagement';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const HistoricalAnalysisDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [analyses, setAnalyses] = useState<HistoricalAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<HistoricalAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [insightsDialogOpen, setInsightsDialogOpen] = useState(false);
  
  const [newAnalysis, setNewAnalysis] = useState({
    name: '',
    description: '',
    timeRange: {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
      granularity: 'day' as const
    },
    dataSource: ['siem-logs'],
    analysisType: 'trend' as const,
    metrics: [
      { name: 'event_count', field: 'event_id', aggregation: 'count' as const, weight: 1.0 },
      { name: 'unique_sources', field: 'source_ip', aggregation: 'count' as const, weight: 0.8 }
    ],
    dimensions: [
      { name: 'time', field: 'timestamp', type: 'temporal' as const, granularity: 'hour' },
      { name: 'event_type', field: 'event_type', type: 'categorical' as const }
    ],
    filters: [],
    algorithms: {
      statistical: [
        { name: 'linear_regression', type: 'regression' as const, parameters: {} }
      ],
      machineLearning: [
        { name: 'isolation_forest', type: 'unsupervised' as const, algorithm: 'isolation_forest', parameters: {}, features: ['event_count'] }
      ],
      timeSeries: [
        { name: 'seasonal_decompose', type: 'seasonal-decomposition' as const, parameters: {}, seasonality: true, trend: true }
      ]
    }
  });

  const dataManagementService = new DataManagementService();

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    setLoading(true);
    try {
      const analysisData = await dataManagementService.listHistoricalAnalyses();
      setAnalyses(analysisData);
    } catch (error) {
      console.error('Error loading analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnalysis = async () => {
    setLoading(true);
    try {
      const analysisId = await dataManagementService.createHistoricalAnalysis(newAnalysis);
      await loadAnalyses();
      setCreateDialogOpen(false);
      
      // Reset form
      setNewAnalysis({
        ...newAnalysis,
        name: '',
        description: ''
      });
    } catch (error) {
      console.error('Error creating analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewResults = (analysis: HistoricalAnalysis) => {
    setSelectedAnalysis(analysis);
    setResultsDialogOpen(true);
  };

  const handleViewInsights = (analysis: HistoricalAnalysis) => {
    setSelectedAnalysis(analysis);
    setInsightsDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'running':
        return <CircularProgress size={20} />;
      case 'failed':
        return <ErrorIcon color="error" />;
      default:
        return <ScheduleIcon color="action" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'running':
        return 'primary';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const renderCreateAnalysisForm = () => (
    <Dialog
      open={createDialogOpen}
      onClose={() => setCreateDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Create Historical Analysis</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Analysis Name"
            value={newAnalysis.name}
            onChange={(e) => setNewAnalysis({ ...newAnalysis, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={newAnalysis.description}
            onChange={(e) => setNewAnalysis({ ...newAnalysis, description: e.target.value })}
            sx={{ mb: 2 }}
          />

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                InputLabelProps={{ shrink: true }}
                value={newAnalysis.timeRange.start}
                onChange={(e) => setNewAnalysis({
                  ...newAnalysis,
                  timeRange: { ...newAnalysis.timeRange, start: e.target.value }
                })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                InputLabelProps={{ shrink: true }}
                value={newAnalysis.timeRange.end}
                onChange={(e) => setNewAnalysis({
                  ...newAnalysis,
                  timeRange: { ...newAnalysis.timeRange, end: e.target.value }
                })}
              />
            </Grid>
          </Grid>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Analysis Type</InputLabel>
            <Select
              value={newAnalysis.analysisType}
              onChange={(e) => setNewAnalysis({ ...newAnalysis, analysisType: e.target.value as any })}
              label="Analysis Type"
            >
              <MenuItem value="trend">Trend Analysis</MenuItem>
              <MenuItem value="pattern">Pattern Recognition</MenuItem>
              <MenuItem value="anomaly">Anomaly Detection</MenuItem>
              <MenuItem value="correlation">Correlation Analysis</MenuItem>
              <MenuItem value="forecasting">Forecasting</MenuItem>
              <MenuItem value="seasonality">Seasonality Analysis</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Time Granularity</InputLabel>
            <Select
              value={newAnalysis.timeRange.granularity}
              onChange={(e) => setNewAnalysis({
                ...newAnalysis,
                timeRange: { ...newAnalysis.timeRange, granularity: e.target.value as any }
              })}
              label="Time Granularity"
            >
              <MenuItem value="hour">Hour</MenuItem>
              <MenuItem value="day">Day</MenuItem>
              <MenuItem value="week">Week</MenuItem>
              <MenuItem value="month">Month</MenuItem>
              <MenuItem value="quarter">Quarter</MenuItem>
              <MenuItem value="year">Year</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
        <Button 
          onClick={handleCreateAnalysis} 
          variant="contained"
          disabled={!newAnalysis.name || loading}
          startIcon={loading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
        >
          {loading ? 'Creating...' : 'Create Analysis'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderResultsDialog = () => (
    <Dialog
      open={resultsDialogOpen}
      onClose={() => setResultsDialogOpen(false)}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        Analysis Results: {selectedAnalysis?.name}
      </DialogTitle>
      <DialogContent>
        {selectedAnalysis && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Analysis completed with {selectedAnalysis.confidence * 100}% confidence
            </Alert>

            {selectedAnalysis.results.map((result, index) => (
              <Card key={index} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {result.metadata.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {result.metadata.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip
                      label={`Significance: ${(result.metadata.significance * 100).toFixed(1)}%`}
                      color="primary"
                      size="small"
                    />
                    <Chip
                      label={`Reliability: ${(result.metadata.reliability * 100).toFixed(1)}%`}
                      color="secondary"
                      size="small"
                    />
                  </Box>

                  {result.type === 'chart' && result.data && (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={result.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="threats" stroke="#8884d8" />
                        <Line type="monotone" dataKey="incidents" stroke="#82ca9d" />
                        <Line type="monotone" dataKey="compliance_score" stroke="#ffc658" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}

                  {result.type === 'table' && result.data && (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Timestamp</TableCell>
                            <TableCell>Metric</TableCell>
                            <TableCell align="right">Expected</TableCell>
                            <TableCell align="right">Actual</TableCell>
                            <TableCell align="right">Deviation</TableCell>
                            <TableCell>Severity</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {result.data.map((row: any, rowIndex: number) => (
                            <TableRow key={rowIndex}>
                              <TableCell>{new Date(row.timestamp).toLocaleString()}</TableCell>
                              <TableCell>{row.metric}</TableCell>
                              <TableCell align="right">{row.expected}</TableCell>
                              <TableCell align="right">{row.actual}</TableCell>
                              <TableCell align="right">{row.deviation.toFixed(2)}</TableCell>
                              <TableCell>
                                <Chip
                                  label={row.severity}
                                  color={row.severity === 'high' ? 'error' : row.severity === 'medium' ? 'warning' : 'default'}
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            ))}

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Performance Metrics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={3}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Execution Time
                    </Typography>
                    <Typography variant="h6">
                      {formatDuration(selectedAnalysis.performance.executionTime)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Data Processed
                    </Typography>
                    <Typography variant="h6">
                      {selectedAnalysis.performance.dataProcessed.toLocaleString()} records
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Memory Used
                    </Typography>
                    <Typography variant="h6">
                      {formatBytes(selectedAnalysis.performance.memoryUsed)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      CPU Usage
                    </Typography>
                    <Typography variant="h6">
                      {(selectedAnalysis.performance.cpuUsage * 100).toFixed(1)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setResultsDialogOpen(false)}>Close</Button>
        <Button variant="contained" startIcon={<DownloadIcon />}>
          Export Results
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderInsightsDialog = () => (
    <Dialog
      open={insightsDialogOpen}
      onClose={() => setInsightsDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Analysis Insights: {selectedAnalysis?.name}
      </DialogTitle>
      <DialogContent>
        {selectedAnalysis && selectedAnalysis.insights.map((insight, index) => (
          <Accordion key={index} defaultExpanded={index === 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InsightsIcon color="primary" />
                <Typography variant="h6">{insight.title}</Typography>
                <Chip
                  label={insight.significance}
                  color={
                    insight.significance === 'critical' ? 'error' :
                    insight.significance === 'high' ? 'warning' :
                    insight.significance === 'medium' ? 'info' : 'default'
                  }
                  size="small"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                <Typography variant="body1" paragraph>
                  {insight.description}
                </Typography>

                <Typography variant="subtitle2" gutterBottom>
                  Evidence:
                </Typography>
                <List dense>
                  {insight.evidence.map((evidence, evidenceIndex) => (
                    <ListItem key={evidenceIndex}>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={evidence} />
                    </ListItem>
                  ))}
                </List>

                {insight.actionable && (
                  <>
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                      Recommendations:
                    </Typography>
                    <List dense>
                      {insight.recommendations.map((rec, recIndex) => (
                        <ListItem key={recIndex}>
                          <ListItemIcon>
                            <TrendingUpIcon color="primary" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={rec} />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Impact Assessment:
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                          Business Impact
                        </Typography>
                        <Typography variant="body2">
                          {insight.impact.business}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                          Technical Impact
                        </Typography>
                        <Typography variant="body2">
                          {insight.impact.technical}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                          Security Impact
                        </Typography>
                        <Typography variant="body2">
                          {insight.impact.security}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Confidence: {(insight.confidence * 100).toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={insight.confidence * 100}
                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setInsightsDialogOpen(false)}>Close</Button>
        <Button variant="contained" startIcon={<DownloadIcon />}>
          Export Insights
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Historical Analyses</Typography>
              <Button
                variant="contained"
                startIcon={<AnalyticsIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create Analysis
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : analyses.length === 0 ? (
              <Alert severity="info">
                No historical analyses found. Create your first analysis to get started.
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Time Range</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analyses.map((analysis) => (
                      <TableRow key={analysis.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2">
                              {analysis.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {analysis.description}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={analysis.analysisType}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStatusIcon(analysis.status)}
                            <Chip
                              label={analysis.status}
                              color={getStatusColor(analysis.status) as any}
                              size="small"
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(analysis.timeRange.start).toLocaleDateString()} - {' '}
                            {new Date(analysis.timeRange.end).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {analysis.performance.executionTime > 0 ? 
                            formatDuration(analysis.performance.executionTime) : '-'}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {analysis.status === 'completed' && (
                              <>
                                <Button
                                  size="small"
                                  startIcon={<VisibilityIcon />}
                                  onClick={() => handleViewResults(analysis)}
                                >
                                  Results
                                </Button>
                                <Button
                                  size="small"
                                  startIcon={<InsightsIcon />}
                                  onClick={() => handleViewInsights(analysis)}
                                >
                                  Insights
                                </Button>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Analysis Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {analyses.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Analyses
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {analyses.filter(a => a.status === 'completed').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {analyses.filter(a => a.status === 'running').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Running
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="error.main">
                    {analyses.filter(a => a.status === 'failed').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Failed
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List>
              {analyses.slice(0, 5).map((analysis, index) => (
                <React.Fragment key={analysis.id}>
                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(analysis.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={analysis.name}
                      secondary={`${analysis.analysisType} • ${new Date(analysis.createdAt).toLocaleString()}`}
                    />
                  </ListItem>
                  {index < 4 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Historical Analysis
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Trend analysis across months and years of security data
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Overview" />
          <Tab label="Trends & Patterns" />
          <Tab label="Performance Metrics" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {renderOverviewTab()}
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <Alert severity="info">
          Advanced trend visualization and pattern analysis tools will be available here.
        </Alert>
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <Alert severity="info">
          Detailed performance metrics and resource usage analytics will be displayed here.
        </Alert>
      </TabPanel>

      {renderCreateAnalysisForm()}
      {renderResultsDialog()}
      {renderInsightsDialog()}
    </Paper>
  );
};

export default HistoricalAnalysisDashboard;