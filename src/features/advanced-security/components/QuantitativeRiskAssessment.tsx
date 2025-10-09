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
  Tooltip,
  IconButton,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Assessment,
  TrendingUp,
  TrendingDown,
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
  Timeline,
  Security,
  Computer,
  NetworkSecurity,
  Business,
  DataUsage,
  Analytics,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
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
} from 'recharts';
import { AdvancedSecurityService } from '../services/AdvancedSecurityService';
import type {
  RiskAssessment,
  RiskFactor,
  ThreatVector,
  AssetValuation,
  RiskMetrics,
  RiskTrend,
  MitigationEffectiveness,
} from '../types/AdvancedSecurity';

interface RiskAssessmentProps {
  onAssessmentComplete?: (assessment: RiskAssessment) => void;
}

export const QuantitativeRiskAssessment: React.FC<RiskAssessmentProps> = ({
  onAssessmentComplete
}) => {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<RiskAssessment | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [riskTrends, setRiskTrends] = useState<RiskTrend[]>([]);
  const [assetValuations, setAssetValuations] = useState<AssetValuation[]>([]);
  const [threatVectors, setThreatVectors] = useState<ThreatVector[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [newAssessmentDialogOpen, setNewAssessmentDialogOpen] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30days');
  const [selectedFramework, setSelectedFramework] = useState('iso27005');

  const [newAssessment, setNewAssessment] = useState({
    name: '',
    scope: '',
    framework: 'iso27005',
    methodology: 'quantitative',
    timeframe: '30days'
  });

  const securityService = new AdvancedSecurityService();

  useEffect(() => {
    loadRiskData();
  }, [selectedTimeframe, selectedFramework]);

  const loadRiskData = async () => {
    try {
      setLoading(true);
      const [
        assessmentsData,
        metricsData,
        trendsData,
        assetsData,
        threatsData
      ] = await Promise.all([
        securityService.getRiskAssessments(),
        securityService.getRiskMetrics(selectedTimeframe),
        securityService.getRiskTrends(selectedTimeframe),
        securityService.getAssetValuations(),
        securityService.getThreatVectors()
      ]);

      setAssessments(assessmentsData);
      setRiskMetrics(metricsData);
      setRiskTrends(trendsData);
      setAssetValuations(assetsData);
      setThreatVectors(threatsData);
    } catch (error) {
      console.error('Failed to load risk data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAssessment = async () => {
    try {
      setLoading(true);
      const assessment = await securityService.createRiskAssessment(newAssessment);
      setAssessments(prev => [...prev, assessment]);
      setNewAssessmentDialogOpen(false);
      setNewAssessment({
        name: '',
        scope: '',
        framework: 'iso27005',
        methodology: 'quantitative',
        timeframe: '30days'
      });
      onAssessmentComplete?.(assessment);
    } catch (error) {
      console.error('Failed to create assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAssessment = async (assessmentId: string) => {
    try {
      setLoading(true);
      await securityService.runRiskAssessment(assessmentId);
      loadRiskData();
    } catch (error) {
      console.error('Failed to run assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = (score: number) => {
    if (score >= 80) return { level: 'Critical', color: 'error' };
    if (score >= 60) return { level: 'High', color: 'error' };
    if (score >= 40) return { level: 'Medium', color: 'warning' };
    if (score >= 20) return { level: 'Low', color: 'info' };
    return { level: 'Very Low', color: 'success' };
  };

  const getRiskTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp color="error" />;
    if (trend < -5) return <TrendingDown color="success" />;
    return <Timeline color="info" />;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Chart data preparation
  const riskCategoryData = riskMetrics?.riskByCategory.map((cat, index) => ({
    name: cat.category,
    value: cat.score,
    color: COLORS[index % COLORS.length]
  })) || [];

  const riskTrendChartData = riskTrends.map(trend => ({
    date: new Date(trend.date).toLocaleDateString(),
    overall: trend.overallRisk,
    technical: trend.technicalRisk,
    operational: trend.operationalRisk,
    financial: trend.financialRisk
  }));

  const assetRiskData = assetValuations.map(asset => ({
    name: asset.name,
    value: asset.monetaryValue,
    risk: asset.riskScore,
    exposure: asset.threatExposure
  }));

  const threatVectorRadarData = threatVectors.map(vector => ({
    subject: vector.name,
    likelihood: vector.likelihood,
    impact: vector.impact,
    current: vector.currentRisk,
    residual: vector.residualRisk
  }));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Quantitative Risk Assessment</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Timeframe</InputLabel>
            <Select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
            >
              <MenuItem value="7days">7 Days</MenuItem>
              <MenuItem value="30days">30 Days</MenuItem>
              <MenuItem value="90days">90 Days</MenuItem>
              <MenuItem value="1year">1 Year</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadRiskData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setNewAssessmentDialogOpen(true)}
          >
            New Assessment
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Risk Metrics Overview */}
      {riskMetrics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color={getRiskLevel(riskMetrics.overallRiskScore).color}>
                  {riskMetrics.overallRiskScore}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Overall Risk Score
                </Typography>
                <Chip
                  label={getRiskLevel(riskMetrics.overallRiskScore).level}
                  color={getRiskLevel(riskMetrics.overallRiskScore).color as any}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="error.main">
                  {riskMetrics.criticalVulnerabilities}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Critical Vulnerabilities
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {riskMetrics.totalVulnerabilities} total
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="warning.main">
                  {formatCurrency(riskMetrics.potentialLoss)}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Potential Annual Loss
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ALE Calculation
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h3" color="info.main">
                    {riskMetrics.riskTrend > 0 ? '+' : ''}{riskMetrics.riskTrend}%
                  </Typography>
                  {getRiskTrendIcon(riskMetrics.riskTrend)}
                </Box>
                <Typography variant="h6" color="text.secondary">
                  Risk Trend
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  vs. last period
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Risk Trend Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Risk Trend Analysis
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={riskTrendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="overall" stroke="#8884d8" strokeWidth={2} />
                  <Line type="monotone" dataKey="technical" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="operational" stroke="#ffc658" />
                  <Line type="monotone" dataKey="financial" stroke="#ff7c7c" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Distribution */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Risk Distribution by Category
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={riskCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {riskCategoryData.map((entry, index) => (
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

        {/* Asset Risk Exposure */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Asset Risk vs Value
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={assetRiskData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="value"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="risk"
                    stroke="#ff7c7c"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Threat Vector Radar */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Threat Vector Analysis
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={threatVectorRadarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Current Risk"
                    dataKey="current"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                  <Radar
                    name="Residual Risk"
                    dataKey="residual"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.6}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Risk Assessments Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Risk Assessments
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Framework</TableCell>
                  <TableCell>Overall Score</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Updated</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell>
                      <Typography variant="subtitle2">{assessment.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {assessment.scope}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={assessment.framework} size="small" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CircularProgress
                          variant="determinate"
                          value={assessment.overallScore}
                          size={40}
                          color={getRiskLevel(assessment.overallScore).color as any}
                        />
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {assessment.overallScore}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={assessment.status}
                        color={assessment.status === 'completed' ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(assessment.lastUpdated).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {assessment.status === 'draft' && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => runAssessment(assessment.id)}
                          >
                            Run
                          </Button>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => {
                            setCurrentAssessment(assessment);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          <Visibility />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Assessment Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Assessment Details: {currentAssessment?.name}
        </DialogTitle>
        <DialogContent>
          {currentAssessment && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Risk Categories
                </Typography>
                {currentAssessment.riskCategories.map((category) => (
                  <Box key={category.category} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2">{category.category}</Typography>
                      <Chip
                        label={`${category.score} - ${getRiskLevel(category.score).level}`}
                        color={getRiskLevel(category.score).color as any}
                        size="small"
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={category.score}
                      color={getRiskLevel(category.score).color as any}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                ))}
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Key Findings
                </Typography>
                <List>
                  {currentAssessment.findings.map((finding, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {finding.severity === 'high' ? (
                          <Error color="error" />
                        ) : finding.severity === 'medium' ? (
                          <Warning color="warning" />
                        ) : (
                          <Info color="info" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={finding.description}
                        secondary={`Severity: ${finding.severity} | Impact: ${finding.impact}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Recommendations
                </Typography>
                {currentAssessment.recommendations.map((rec, index) => (
                  <Accordion key={index}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle1">{rec.title}</Typography>
                      <Chip
                        label={rec.priority}
                        color={getPriorityColor(rec.priority) as any}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" gutterBottom>
                        {rec.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Expected Risk Reduction: {rec.riskReduction}%
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>
            Close
          </Button>
          <Button variant="outlined" startIcon={<Download />}>
            Export Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Assessment Dialog */}
      <Dialog
        open={newAssessmentDialogOpen}
        onClose={() => setNewAssessmentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Risk Assessment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Assessment Name"
                value={newAssessment.name}
                onChange={(e) => setNewAssessment(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Scope Description"
                value={newAssessment.scope}
                onChange={(e) => setNewAssessment(prev => ({ ...prev, scope: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Framework</InputLabel>
                <Select
                  value={newAssessment.framework}
                  onChange={(e) => setNewAssessment(prev => ({ ...prev, framework: e.target.value }))}
                >
                  <MenuItem value="iso27005">ISO 27005</MenuItem>
                  <MenuItem value="nist800-30">NIST 800-30</MenuItem>
                  <MenuItem value="fair">FAIR</MenuItem>
                  <MenuItem value="octave">OCTAVE</MenuItem>
                  <MenuItem value="coso">COSO ERM</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Methodology</InputLabel>
                <Select
                  value={newAssessment.methodology}
                  onChange={(e) => setNewAssessment(prev => ({ ...prev, methodology: e.target.value }))}
                >
                  <MenuItem value="quantitative">Quantitative</MenuItem>
                  <MenuItem value="qualitative">Qualitative</MenuItem>
                  <MenuItem value="hybrid">Hybrid</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewAssessmentDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={createAssessment}
            variant="contained"
            disabled={!newAssessment.name || !newAssessment.scope}
          >
            Create Assessment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Helper function for priority colors
function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'error';
    case 'high': return 'error';
    case 'medium': return 'warning';
    case 'low': return 'info';
    default: return 'default';
  }
}

export default QuantitativeRiskAssessment;