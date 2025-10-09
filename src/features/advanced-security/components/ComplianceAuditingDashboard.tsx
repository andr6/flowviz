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
  Tabs,
  Tab,
  Badge,
  CircularProgress,
} from '@mui/material';
import {
  Compliance,
  Assessment,
  CheckCircle,
  Warning,
  Error,
  Schedule,
  ExpandMore,
  Refresh,
  Add,
  Edit,
  Delete,
  Visibility,
  Download,
  Upload,
  Security,
  Gavel,
  VerifiedUser,
  Policy,
  FindInPage,
  Assignment,
  TrendingUp,
  TrendingDown,
  Timeline,
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
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { AdvancedSecurityService } from '../services/AdvancedSecurityService';
import type {
  ComplianceFramework,
  ComplianceAssessment,
  ComplianceControl,
  AuditReport,
  ComplianceMetrics,
  ComplianceEvidence,
  RemediationPlan,
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
      id={`compliance-tabpanel-${index}`}
      aria-labelledby={`compliance-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const ComplianceAuditingDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [assessments, setAssessments] = useState<ComplianceAssessment[]>([]);
  const [controls, setControls] = useState<ComplianceControl[]>([]);
  const [auditReports, setAuditReports] = useState<AuditReport[]>([]);
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [selectedFramework, setSelectedFramework] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState<ComplianceAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [newAuditDialogOpen, setNewAuditDialogOpen] = useState(false);
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);

  const [newAudit, setNewAudit] = useState({
    name: '',
    framework: '',
    scope: '',
    auditor: '',
    deadline: '',
    type: 'internal'
  });

  const securityService = new AdvancedSecurityService();

  useEffect(() => {
    loadComplianceData();
  }, [selectedFramework]);

  const loadComplianceData = async () => {
    try {
      setLoading(true);
      const [
        frameworksData,
        assessmentsData,
        controlsData,
        reportsData,
        metricsData
      ] = await Promise.all([
        securityService.getComplianceFrameworks(),
        securityService.getComplianceAssessments(selectedFramework),
        securityService.getComplianceControls(selectedFramework),
        securityService.getAuditReports(),
        securityService.getComplianceMetrics(selectedFramework)
      ]);

      setFrameworks(frameworksData);
      setAssessments(assessmentsData);
      setControls(controlsData);
      setAuditReports(reportsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAuditAssessment = async () => {
    try {
      setLoading(true);
      const assessment = await securityService.createComplianceAssessment(newAudit);
      setAssessments(prev => [...prev, assessment]);
      setNewAuditDialogOpen(false);
      setNewAudit({
        name: '',
        framework: '',
        scope: '',
        auditor: '',
        deadline: '',
        type: 'internal'
      });
    } catch (error) {
      console.error('Failed to create audit assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  const runComplianceAudit = async (assessmentId: string) => {
    try {
      setLoading(true);
      await securityService.runComplianceAudit(assessmentId);
      loadComplianceData();
    } catch (error) {
      console.error('Failed to run compliance audit:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateControlStatus = async (controlId: string, status: string, evidence?: string) => {
    try {
      await securityService.updateComplianceControlStatus(controlId, status, evidence);
      loadComplianceData();
    } catch (error) {
      console.error('Failed to update control status:', error);
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 95) return 'success';
    if (score >= 80) return 'info';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getControlStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'success';
      case 'non_compliant': return 'error';
      case 'partially_compliant': return 'warning';
      case 'not_applicable': return 'info';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const getFrameworkIcon = (framework: string) => {
    switch (framework.toLowerCase()) {
      case 'iso27001': return <Security />;
      case 'nist': return <VerifiedUser />;
      case 'sox': return <Gavel />;
      case 'gdpr': return <Policy />;
      case 'hipaa': return <Assignment />;
      case 'pci': return <Security />;
      default: return <Compliance />;
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Chart data preparation
  const complianceScoreData = frameworks.map((framework, index) => ({
    name: framework.name,
    score: framework.complianceScore,
    target: framework.targetScore || 95,
    color: COLORS[index % COLORS.length]
  }));

  const controlStatusData = [
    { name: 'Compliant', value: controls.filter(c => c.status === 'compliant').length, color: '#00C49F' },
    { name: 'Non-Compliant', value: controls.filter(c => c.status === 'non_compliant').length, color: '#FF8042' },
    { name: 'Partially Compliant', value: controls.filter(c => c.status === 'partially_compliant').length, color: '#FFBB28' },
    { name: 'Pending', value: controls.filter(c => c.status === 'pending').length, color: '#8884D8' }
  ];

  const complianceTrendData = metrics?.complianceTrend.map(trend => ({
    date: new Date(trend.date).toLocaleDateString(),
    score: trend.score,
    controls: trend.controlsCompliant,
    target: 95
  })) || [];

  const frameworkComparisonData = frameworks.map(framework => ({
    name: framework.name,
    compliant: framework.controlsCompliant,
    total: framework.totalControls,
    percentage: Math.round((framework.controlsCompliant / framework.totalControls) * 100)
  }));

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Compliance Auditing Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Framework</InputLabel>
            <Select
              value={selectedFramework}
              onChange={(e) => setSelectedFramework(e.target.value)}
            >
              <MenuItem value="">All Frameworks</MenuItem>
              {frameworks.map((framework) => (
                <MenuItem key={framework.id} value={framework.id}>
                  {framework.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadComplianceData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setNewAuditDialogOpen(true)}
          >
            New Audit
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Compliance Metrics Overview */}
      {metrics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color={getComplianceColor(metrics.overallComplianceScore)}>
                  {metrics.overallComplianceScore}%
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Overall Compliance
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {metrics.compliantControls} / {metrics.totalControls} controls
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="error.main">
                  {metrics.criticalFindings}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Critical Findings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {metrics.totalFindings} total findings
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="warning.main">
                  {metrics.pendingRemediations}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Pending Remediations
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {metrics.overdueRemediations} overdue
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h3" color="info.main">
                    {metrics.complianceTrend > 0 ? '+' : ''}{metrics.complianceTrend}%
                  </Typography>
                  {metrics.complianceTrend > 0 ? (
                    <TrendingUp color="success" />
                  ) : metrics.complianceTrend < 0 ? (
                    <TrendingDown color="error" />
                  ) : (
                    <Timeline color="info" />
                  )}
                </Box>
                <Typography variant="h6" color="text.secondary">
                  Compliance Trend
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  vs. last quarter
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="compliance dashboard tabs">
          <Tab label="Frameworks" icon={<Security />} />
          <Tab label="Controls" icon={<Assignment />} />
          <Tab label="Assessments" icon={<Assessment />} />
          <Tab label="Reports" icon={<FindInPage />} />
        </Tabs>
      </Box>

      {/* Frameworks Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Framework Compliance Scores */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Framework Compliance Scores
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={complianceScoreData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="score" fill="#8884d8" name="Current Score" />
                    <Bar dataKey="target" fill="#82ca9d" name="Target Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Control Status Distribution */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Control Status Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={controlStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {controlStatusData.map((entry, index) => (
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

          {/* Framework Cards */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {frameworks.map((framework) => (
                <Grid item xs={12} sm={6} md={4} key={framework.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        {getFrameworkIcon(framework.name)}
                        <Typography variant="h6" sx={{ ml: 1 }}>
                          {framework.name}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">Compliance Score</Typography>
                          <Typography variant="h6" color={getComplianceColor(framework.complianceScore)}>
                            {framework.complianceScore}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={framework.complianceScore}
                          color={getComplianceColor(framework.complianceScore) as any}
                          sx={{ mt: 1 }}
                        />
                      </Box>

                      <Grid container spacing={1} sx={{ mb: 2 }}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Controls: {framework.controlsCompliant}/{framework.totalControls}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Last Audit: {new Date(framework.lastAuditDate).toLocaleDateString()}
                          </Typography>
                        </Grid>
                      </Grid>

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setSelectedFramework(framework.id)}
                        >
                          View Details
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => runComplianceAudit(framework.id)}
                        >
                          Run Audit
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

      {/* Controls Tab */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Compliance Controls
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Control ID</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Framework</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Risk Level</TableCell>
                    <TableCell>Last Tested</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {controls.map((control) => (
                    <TableRow key={control.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {control.controlId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {control.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {control.category}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={control.framework} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={control.status.replace('_', ' ')}
                          color={getControlStatusColor(control.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={control.riskLevel}
                          color={control.riskLevel === 'high' ? 'error' : control.riskLevel === 'medium' ? 'warning' : 'info'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {control.lastTested ? new Date(control.lastTested).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Test Control">
                            <IconButton
                              size="small"
                              onClick={() => updateControlStatus(control.id, 'testing')}
                            >
                              <Assignment />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Evidence">
                            <IconButton
                              size="small"
                              onClick={() => setEvidenceDialogOpen(true)}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Assessments Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {assessments.map((assessment) => (
            <Grid item xs={12} md={6} lg={4} key={assessment.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {assessment.name}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={assessment.status}
                      color={assessment.status === 'completed' ? 'success' : assessment.status === 'in_progress' ? 'warning' : 'info'}
                      size="small"
                    />
                    <Chip
                      label={assessment.type}
                      variant="outlined"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Framework: {assessment.framework}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Auditor: {assessment.auditor}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Deadline: {new Date(assessment.deadline).toLocaleDateString()}
                  </Typography>

                  {assessment.progress !== undefined && (
                    <Box sx={{ mt: 2, mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Progress: {assessment.progress}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={assessment.progress}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  )}

                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Visibility />}
                      onClick={() => {
                        setSelectedAssessment(assessment);
                        setDetailsDialogOpen(true);
                      }}
                    >
                      Details
                    </Button>
                    {assessment.status === 'draft' && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => runComplianceAudit(assessment.id)}
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
      </TabPanel>

      {/* Reports Tab */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          {/* Compliance Trend Chart */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Compliance Trend Over Time
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={complianceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="target" stroke="#82ca9d" strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Audit Reports Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Audit Reports
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Report Name</TableCell>
                        <TableCell>Framework</TableCell>
                        <TableCell>Generated Date</TableCell>
                        <TableCell>Score</TableCell>
                        <TableCell>Findings</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {auditReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            <Typography variant="body2">{report.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {report.type} audit
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={report.framework} size="small" />
                          </TableCell>
                          <TableCell>
                            {new Date(report.generatedDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CircularProgress
                                variant="determinate"
                                value={report.overallScore}
                                size={30}
                                color={getComplianceColor(report.overallScore) as any}
                              />
                              <Typography variant="body2" sx={{ ml: 1 }}>
                                {report.overallScore}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Badge badgeContent={report.criticalFindings} color="error">
                              <Typography variant="body2">
                                {report.totalFindings} findings
                              </Typography>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <IconButton size="small">
                              <Download />
                            </IconButton>
                            <IconButton size="small">
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

      {/* Assessment Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Assessment Details: {selectedAssessment?.name}
        </DialogTitle>
        <DialogContent>
          {selectedAssessment && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Basic Information
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Framework:</strong> {selectedAssessment.framework}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Type:</strong> {selectedAssessment.type}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Auditor:</strong> {selectedAssessment.auditor}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Deadline:</strong> {new Date(selectedAssessment.deadline).toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Progress
                </Typography>
                {selectedAssessment.progress !== undefined && (
                  <Box sx={{ mb: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={selectedAssessment.progress}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                    <Typography variant="caption" sx={{ mt: 1 }}>
                      {selectedAssessment.progress}% complete
                    </Typography>
                  </Box>
                )}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Scope
                </Typography>
                <Typography variant="body2">
                  {selectedAssessment.scope}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>
            Close
          </Button>
          <Button variant="outlined" startIcon={<Download />}>
            Export
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Audit Dialog */}
      <Dialog
        open={newAuditDialogOpen}
        onClose={() => setNewAuditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Compliance Audit</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Audit Name"
                value={newAudit.name}
                onChange={(e) => setNewAudit(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Framework</InputLabel>
                <Select
                  value={newAudit.framework}
                  onChange={(e) => setNewAudit(prev => ({ ...prev, framework: e.target.value }))}
                >
                  {frameworks.map((framework) => (
                    <MenuItem key={framework.id} value={framework.id}>
                      {framework.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Audit Type</InputLabel>
                <Select
                  value={newAudit.type}
                  onChange={(e) => setNewAudit(prev => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="internal">Internal</MenuItem>
                  <MenuItem value="external">External</MenuItem>
                  <MenuItem value="certification">Certification</MenuItem>
                  <MenuItem value="regulatory">Regulatory</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Scope Description"
                value={newAudit.scope}
                onChange={(e) => setNewAudit(prev => ({ ...prev, scope: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Auditor"
                value={newAudit.auditor}
                onChange={(e) => setNewAudit(prev => ({ ...prev, auditor: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Deadline"
                value={newAudit.deadline}
                onChange={(e) => setNewAudit(prev => ({ ...prev, deadline: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewAuditDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={createAuditAssessment}
            variant="contained"
            disabled={!newAudit.name || !newAudit.framework}
          >
            Create Audit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComplianceAuditingDashboard;