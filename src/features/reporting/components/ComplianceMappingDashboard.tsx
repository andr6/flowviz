import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  ExpandMore,
  Assessment,
  Assignment,
  TrendingUp,
  Warning,
  CheckCircle,
  Error,
  Schedule,
  AccountBalance,
  Security,
  CompareArrows,
  FileDownload,
  Visibility,
  Edit,
  Add,
  MoreVert
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { ComplianceMappingService } from '../services/ComplianceMappingService';
import type { ComplianceFramework, ComplianceDashboard, ComplianceAssessment, FrameworkStatus } from '../types/ComplianceMapping';

const COLORS = ['#2e7d32', '#ed6c02', '#dc004e', '#1976d2', '#9c27b0'];
const RISK_COLORS = { critical: '#dc004e', high: '#ed6c02', medium: '#1976d2', low: '#2e7d32' };

interface ComplianceMappingDashboardProps {
  complianceService: ComplianceMappingService;
}

export const ComplianceMappingDashboard: React.FC<ComplianceMappingDashboardProps> = ({ complianceService }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardData, setDashboardData] = useState<ComplianceDashboard | null>(null);
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [assessments, setAssessments] = useState<ComplianceAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework | null>(null);
  const [frameworkDialogOpen, setFrameworkDialogOpen] = useState(false);
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [complianceService]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [dashboardInfo, frameworksData, assessmentsData] = await Promise.all([
        complianceService.getComplianceDashboard(),
        complianceService.getFrameworks(),
        complianceService.listAssessments()
      ]);
      
      setDashboardData(dashboardInfo);
      setFrameworks(frameworksData);
      setAssessments(assessmentsData);
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'certified':
      case 'completed':
        return <CheckCircle color="success" />;
      case 'at-risk':
      case 'warning':
      case 'partial':
        return <Warning color="warning" />;
      case 'non-compliant':
      case 'failed':
      case 'overdue':
        return <Error color="error" />;
      default:
        return <Schedule color="action" />;
    }
  };

  const getComplianceColor = (compliance: number) => {
    if (compliance >= 95) return 'success';
    if (compliance >= 80) return 'warning';
    if (compliance >= 60) return 'error';
    return 'error';
  };

  const FrameworkCard: React.FC<{ framework: FrameworkStatus }> = ({ framework }) => (
    <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => {
      const fullFramework = frameworks.find(f => f.id === framework.frameworkId);
      if (fullFramework) {
        setSelectedFramework(fullFramework);
        setFrameworkDialogOpen(true);
      }
    }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center">
            <AccountBalance sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontSize: '1rem' }}>
              {framework.frameworkName}
            </Typography>
          </Box>
          <IconButton size="small" onClick={(e) => {
            e.stopPropagation();
            setMenuAnchor(e.currentTarget);
          }}>
            <MoreVert />
          </IconButton>
        </Box>

        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Overall Compliance
            </Typography>
            <Typography variant="h4" color={`${getComplianceColor(framework.compliance)}.main`}>
              {framework.compliance.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={framework.compliance}
            color={getComplianceColor(framework.compliance) as any}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <Grid container spacing={2} mb={2}>
          <Grid item xs={6}>
            <Box textAlign="center">
              <Typography variant="h6" color="success.main">
                {framework.compliantControls}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Compliant
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box textAlign="center">
              <Typography variant="h6" color="error.main">
                {framework.nonCompliantControls}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Non-Compliant
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Last: {framework.lastAssessment.toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Next: {framework.nextAssessment.toLocaleDateString()}
          </Typography>
        </Box>

        {framework.certification && (
          <Box mt={1}>
            <Chip
              size="small"
              icon={getStatusIcon(framework.certification.status)}
              label={framework.certification.status}
              color={framework.certification.status === 'certified' ? 'success' : 'warning'}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Compliance Mapping</Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (!dashboardData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load compliance data</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Compliance Mapping & Assessment
        </Typography>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<Add />} onClick={() => setAssessmentDialogOpen(true)}>
            New Assessment
          </Button>
          <Button variant="contained" startIcon={<CompareArrows />} onClick={() => setMappingDialogOpen(true)}>
            Framework Mapping
          </Button>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <TrendingUp color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ fontSize: '0.9rem' }}>
                  Overall Compliance
                </Typography>
              </Box>
              <Typography variant="h3" color="primary">
                {dashboardData.overallCompliance.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Across all frameworks
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Assessment color="info" sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ fontSize: '0.9rem' }}>
                  Active Assessments
                </Typography>
              </Box>
              <Typography variant="h3" color="info.main">
                {dashboardData.assessmentProgress.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Warning color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ fontSize: '0.9rem' }}>
                  High Risks
                </Typography>
              </Box>
              <Typography variant="h3" color="warning.main">
                {dashboardData.riskDistribution.critical + dashboardData.riskDistribution.high}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Require attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Schedule color="error" sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ fontSize: '0.9rem' }}>
                  Upcoming Deadlines
                </Typography>
              </Box>
              <Typography variant="h3" color="error.main">
                {dashboardData.upcomingDeadlines.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Next 30 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Framework Status" />
          <Tab label="Risk Analysis" />
          <Tab label="Assessments" />
          <Tab label="Mappings" />
        </Tabs>
      </Box>

      {/* Framework Status Tab */}
      {activeTab === 0 && (
        <>
          <Grid container spacing={3} mb={4}>
            {dashboardData.frameworkStatus.map((framework) => (
              <Grid item xs={12} sm={6} md={4} key={framework.frameworkId}>
                <FrameworkCard framework={framework} />
              </Grid>
            ))}
          </Grid>

          {/* Compliance Trends */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Compliance Trends (Last 12 Months)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData.trendsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="overallCompliance" stroke="#1976d2" name="Overall" />
                  {Object.entries(dashboardData.trendsData[0]?.frameworks || {}).map(([framework, _], index) => (
                    <Line 
                      key={framework}
                      type="monotone" 
                      dataKey={`frameworks.${framework}`}
                      stroke={COLORS[index % COLORS.length]} 
                      name={framework}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* Risk Analysis Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Critical', value: dashboardData.riskDistribution.critical, color: RISK_COLORS.critical },
                        { name: 'High', value: dashboardData.riskDistribution.high, color: RISK_COLORS.high },
                        { name: 'Medium', value: dashboardData.riskDistribution.medium, color: RISK_COLORS.medium },
                        { name: 'Low', value: dashboardData.riskDistribution.low, color: RISK_COLORS.low }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {Object.values(RISK_COLORS).map((color, index) => (
                        <Cell key={index} fill={color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Compliance Risks
                </Typography>
                <List>
                  {dashboardData.topRisks.map((risk) => (
                    <ListItem key={risk.id} divider>
                      <ListItemIcon>
                        {getStatusIcon(risk.riskLevel)}
                      </ListItemIcon>
                      <ListItemText
                        primary={risk.description}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {risk.framework} - {risk.controlId}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Owner: {risk.owner} | Due: {risk.dueDate?.toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                      <Chip size="small" label={risk.riskLevel} color={getComplianceColor(risk.riskScore * 100) as any} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Remediation Progress
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Remediation Item</TableCell>
                        <TableCell>Framework</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Progress</TableCell>
                        <TableCell>Assigned To</TableCell>
                        <TableCell>Target Date</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboardData.remediationProgress.map((item) => (
                        <TableRow key={item.gapId}>
                          <TableCell>{item.title}</TableCell>
                          <TableCell>{item.framework}</TableCell>
                          <TableCell>
                            <Chip size="small" label={item.priority} color={getComplianceColor(100 - (item.priority === 'critical' ? 0 : item.priority === 'high' ? 25 : item.priority === 'medium' ? 50 : 75)) as any} />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <LinearProgress
                                variant="determinate"
                                value={item.progress}
                                sx={{ width: 100, mr: 1 }}
                              />
                              <Typography variant="body2">{item.progress}%</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{item.assignedTo}</TableCell>
                          <TableCell>{item.targetDate.toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Chip size="small" label={item.status} />
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
      )}

      {/* Assessments Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Assessment Progress
                </Typography>
                {dashboardData.assessmentProgress.map((assessment) => (
                  <Box key={assessment.assessmentId} mb={3}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle1">{assessment.frameworkName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {assessment.completedControls}/{assessment.totalControls} controls
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={assessment.progress}
                      sx={{ height: 8, borderRadius: 4, mb: 1 }}
                    />
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        Started: {assessment.startDate.toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Expected: {assessment.expectedEndDate.toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Upcoming Deadlines
                </Typography>
                <List>
                  {dashboardData.upcomingDeadlines.map((deadline) => (
                    <ListItem key={deadline.id} divider>
                      <ListItemIcon>
                        {getStatusIcon(deadline.status)}
                      </ListItemIcon>
                      <ListItemText
                        primary={deadline.title}
                        secondary={
                          <Box>
                            <Typography variant="body2">{deadline.framework}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Due: {deadline.dueDate.toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Mappings Tab */}
      {activeTab === 3 && (
        <Alert severity="info">
          Framework mapping and crosswalk functionality coming soon. You'll be able to map controls between different compliance frameworks.
        </Alert>
      )}

      {/* Framework Details Dialog */}
      <Dialog open={frameworkDialogOpen} onClose={() => setFrameworkDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedFramework?.name} - Framework Details
        </DialogTitle>
        <DialogContent>
          {selectedFramework && (
            <Box>
              <Typography variant="body1" paragraph>
                {selectedFramework.description}
              </Typography>
              
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Version</Typography>
                  <Typography variant="body1">{selectedFramework.version}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Organization</Typography>
                  <Typography variant="body1">{selectedFramework.organization}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Total Controls</Typography>
                  <Typography variant="body1">{selectedFramework.totalControls}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Audit Frequency</Typography>
                  <Typography variant="body1">{selectedFramework.auditFrequency}</Typography>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom>Control Domains</Typography>
              {selectedFramework.domains.map((domain) => (
                <Accordion key={domain.id}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle1">{domain.name}</Typography>
                    <Chip size="small" label={`${domain.controls.length} controls`} sx={{ ml: 2 }} />
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {domain.description}
                    </Typography>
                    <List dense>
                      {domain.controls.slice(0, 5).map((control) => (
                        <ListItem key={control.id}>
                          <ListItemText
                            primary={`${control.number} - ${control.title}`}
                            secondary={control.description.substring(0, 100) + '...'}
                          />
                        </ListItem>
                      ))}
                      {domain.controls.length > 5 && (
                        <ListItem>
                          <ListItemText secondary={`... and ${domain.controls.length - 5} more controls`} />
                        </ListItem>
                      )}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFrameworkDialogOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<Assessment />}>
            Start Assessment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => {
          // View details
          setMenuAnchor(null);
        }}>
          <Visibility sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem onClick={() => {
          // Start assessment
          setMenuAnchor(null);
        }}>
          <Assessment sx={{ mr: 1 }} /> Start Assessment
        </MenuItem>
        <MenuItem onClick={() => {
          // Generate report
          setMenuAnchor(null);
        }}>
          <FileDownload sx={{ mr: 1 }} /> Generate Report
        </MenuItem>
      </Menu>
    </Box>
  );
};