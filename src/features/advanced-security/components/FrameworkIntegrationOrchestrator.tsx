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
  Integration,
  Computer,
  Security,
  NetworkSecurity,
  BugReport,
  Assessment,
  Storage,
  Visibility,
  CheckCircle,
  Warning,
  Error,
  Settings,
  PlayArrow,
  Stop,
  Refresh,
  Add,
  Edit,
  Delete,
  Download,
  Upload,
  Sync,
  ExpandMore,
  Timeline,
  DataUsage,
  MonitorHeart,
  Cloud,
  Api,
  Code,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AdvancedSecurityService } from '../services/AdvancedSecurityService';
import type {
  FrameworkIntegration,
  FrameworkHealth,
  FrameworkConfiguration,
  IntegrationMetrics,
  SyncStatus,
  FrameworkCapabilities,
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
      id={`framework-tabpanel-${index}`}
      aria-labelledby={`framework-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const FrameworkIntegrationOrchestrator: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [frameworks, setFrameworks] = useState<FrameworkIntegration[]>([]);
  const [frameworkHealth, setFrameworkHealth] = useState<Record<string, FrameworkHealth>>({});
  const [metrics, setMetrics] = useState<IntegrationMetrics | null>(null);
  const [syncStatus, setSyncStatus] = useState<Record<string, SyncStatus>>({});
  const [selectedFramework, setSelectedFramework] = useState<FrameworkIntegration | null>(null);
  const [loading, setLoading] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [addFrameworkDialogOpen, setAddFrameworkDialogOpen] = useState(false);
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);

  const [newFramework, setNewFramework] = useState({
    name: '',
    type: '',
    endpoint: '',
    apiKey: '',
    version: '',
    description: ''
  });

  const securityService = new AdvancedSecurityService();

  useEffect(() => {
    loadFrameworkData();
    const healthInterval = setInterval(updateFrameworkHealth, 30000); // Every 30 seconds
    const syncInterval = setInterval(syncFrameworkData, 300000); // Every 5 minutes
    
    return () => {
      clearInterval(healthInterval);
      clearInterval(syncInterval);
    };
  }, []);

  const loadFrameworkData = async () => {
    try {
      setLoading(true);
      const [
        frameworksData,
        healthData,
        metricsData,
        syncData
      ] = await Promise.all([
        securityService.getFrameworkIntegrations(),
        securityService.getFrameworkHealth(),
        securityService.getIntegrationMetrics(),
        securityService.getSyncStatus()
      ]);

      setFrameworks(frameworksData);
      setFrameworkHealth(healthData);
      setMetrics(metricsData);
      setSyncStatus(syncData);
    } catch (error) {
      console.error('Failed to load framework data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFrameworkHealth = async () => {
    try {
      const healthData = await securityService.getFrameworkHealth();
      setFrameworkHealth(healthData);
    } catch (error) {
      console.error('Failed to update framework health:', error);
    }
  };

  const syncFrameworkData = async () => {
    try {
      await securityService.syncAllFrameworks();
      const syncData = await securityService.getSyncStatus();
      setSyncStatus(syncData);
    } catch (error) {
      console.error('Failed to sync framework data:', error);
    }
  };

  const addFramework = async () => {
    try {
      setLoading(true);
      const framework = await securityService.addFrameworkIntegration(newFramework);
      setFrameworks(prev => [...prev, framework]);
      setAddFrameworkDialogOpen(false);
      setNewFramework({
        name: '',
        type: '',
        endpoint: '',
        apiKey: '',
        version: '',
        description: ''
      });
    } catch (error) {
      console.error('Failed to add framework:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFramework = async (frameworkId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await securityService.enableFramework(frameworkId);
      } else {
        await securityService.disableFramework(frameworkId);
      }
      loadFrameworkData();
    } catch (error) {
      console.error('Failed to toggle framework:', error);
    }
  };

  const testFrameworkConnection = async (frameworkId: string) => {
    try {
      const result = await securityService.testFrameworkConnection(frameworkId);
      return result;
    } catch (error) {
      console.error('Failed to test framework connection:', error);
      return false;
    }
  };

  const syncFramework = async (frameworkId: string) => {
    try {
      setLoading(true);
      await securityService.syncFramework(frameworkId);
      const syncData = await securityService.getSyncStatus();
      setSyncStatus(syncData);
    } catch (error) {
      console.error('Failed to sync framework:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFrameworkIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'caldera': return <Computer color="primary" />;
      case 'atomic': return <BugReport color="secondary" />;
      case 'infection_monkey': return <Security color="error" />;
      case 'mordor': return <Storage color="info" />;
      case 'security_onion': return <NetworkSecurity color="success" />;
      case 'velociraptor': return <MonitorHeart color="warning" />;
      case 'misp': return <Api color="primary" />;
      case 'opencti': return <Assessment color="secondary" />;
      default: return <Integration color="action" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'degraded': return 'warning';
      case 'unhealthy': return 'error';
      default: return 'default';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle color="success" />;
      case 'degraded': return <Warning color="warning" />;
      case 'unhealthy': return <Error color="error" />;
      default: return <MonitorHeart color="action" />;
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Chart data preparation
  const frameworkStatusData = Object.values(frameworkHealth).map((health, index) => ({
    name: health.framework,
    status: health.status === 'healthy' ? 100 : health.status === 'degraded' ? 50 : 0,
    responseTime: health.responseTime || 0,
    color: COLORS[index % COLORS.length]
  }));

  const integrationMetricsData = metrics?.dailyMetrics.map(metric => ({
    date: new Date(metric.date).toLocaleDateString(),
    requests: metric.apiCalls,
    errors: metric.errors,
    dataPoints: metric.dataPointsSynced
  })) || [];

  const frameworkTypeDistribution = frameworks.reduce((acc, framework) => {
    const type = framework.type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const frameworkTypeData = Object.entries(frameworkTypeDistribution).map(([type, count], index) => ({
    name: type,
    value: count,
    color: COLORS[index % COLORS.length]
  }));

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const availableFrameworkTypes = [
    'Caldera',
    'Atomic Red Team', 
    'Infection Monkey',
    'Mordor',
    'Security Onion',
    'Velociraptor',
    'MISP',
    'OpenCTI',
    'TheHive',
    'Cortex',
    'YARA',
    'Sigma'
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Framework Integration Orchestrator</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Sync />}
            onClick={syncFrameworkData}
          >
            Sync All
          </Button>
          <Button
            variant="outlined"
            startIcon={<MonitorHeart />}
            onClick={() => setHealthDialogOpen(true)}
          >
            Health Check
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddFrameworkDialogOpen(true)}
          >
            Add Framework
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Integration Metrics Overview */}
      {metrics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="primary">
                  {frameworks.filter(f => f.enabled).length}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Active Integrations
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {frameworks.length} total
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="success.main">
                  {Object.values(frameworkHealth).filter(h => h.status === 'healthy').length}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Healthy Frameworks
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {Object.values(frameworkHealth).filter(h => h.status === 'unhealthy').length} unhealthy
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="info.main">
                  {metrics.totalApiCalls.toLocaleString()}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  API Calls Today
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {metrics.errorRate}% error rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="warning.main">
                  {metrics.dataPointsSynced.toLocaleString()}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Data Points Synced
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Last 24 hours
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="framework integration tabs">
          <Tab label="Frameworks" icon={<Integration />} />
          <Tab label="Health & Monitoring" icon={<MonitorHeart />} />
          <Tab label="Data Sync" icon={<Sync />} />
          <Tab label="Analytics" icon={<Timeline />} />
        </Tabs>
      </Box>

      {/* Frameworks Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {frameworks.map((framework) => (
            <Grid item xs={12} md={6} lg={4} key={framework.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {getFrameworkIcon(framework.type)}
                    <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                      {framework.name}
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={framework.enabled}
                          onChange={(e) => toggleFramework(framework.id, e.target.checked)}
                          size="small"
                        />
                      }
                      label=""
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {framework.description}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Chip label={framework.type} size="small" sx={{ mr: 1 }} />
                    <Chip label={framework.version} size="small" variant="outlined" />
                  </Box>

                  {frameworkHealth[framework.id] && (
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {getHealthIcon(frameworkHealth[framework.id].status)}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {frameworkHealth[framework.id].status}
                        </Typography>
                      </Box>
                      {frameworkHealth[framework.id].responseTime && (
                        <Typography variant="caption" color="text.secondary">
                          Response time: {frameworkHealth[framework.id].responseTime}ms
                        </Typography>
                      )}
                    </Box>
                  )}

                  {syncStatus[framework.id] && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Last sync: {new Date(syncStatus[framework.id].lastSync).toLocaleString()}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={syncStatus[framework.id].progress}
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Settings />}
                      onClick={() => {
                        setSelectedFramework(framework);
                        setConfigDialogOpen(true);
                      }}
                    >
                      Config
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Sync />}
                      onClick={() => syncFramework(framework.id)}
                      disabled={!framework.enabled}
                    >
                      Sync
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<MonitorHeart />}
                      onClick={() => testFrameworkConnection(framework.id)}
                    >
                      Test
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Health & Monitoring Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {/* Framework Health Chart */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Framework Health Status
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={frameworkStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="status" fill="#8884d8" name="Health Score" />
                    <Bar dataKey="responseTime" fill="#82ca9d" name="Response Time (ms)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Framework Type Distribution */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Framework Types
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={frameworkTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {frameworkTypeData.map((entry, index) => (
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

          {/* Health Details Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Detailed Health Information
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Framework</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Response Time</TableCell>
                        <TableCell>Last Check</TableCell>
                        <TableCell>Uptime</TableCell>
                        <TableCell>Error Count</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(frameworkHealth).map(([frameworkId, health]) => (
                        <TableRow key={frameworkId}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getFrameworkIcon(health.framework)}
                              <Typography variant="body2" sx={{ ml: 1 }}>
                                {health.framework}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={health.status}
                              color={getHealthColor(health.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {health.responseTime ? `${health.responseTime}ms` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {health.lastCheck ? new Date(health.lastCheck).toLocaleString() : 'Never'}
                          </TableCell>
                          <TableCell>
                            {health.uptime ? `${health.uptime}%` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge badgeContent={health.errorCount || 0} color="error">
                              <Typography variant="body2">Errors</Typography>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => testFrameworkConnection(frameworkId)}
                            >
                              <Refresh />
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

      {/* Data Sync Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {Object.entries(syncStatus).map(([frameworkId, status]) => {
            const framework = frameworks.find(f => f.id === frameworkId);
            return (
              <Grid item xs={12} md={6} lg={4} key={frameworkId}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {framework && getFrameworkIcon(framework.type)}
                      <Typography variant="h6" sx={{ ml: 1 }}>
                        {framework?.name || frameworkId}
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Last sync: {new Date(status.lastSync).toLocaleString()}
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption">Progress</Typography>
                        <Typography variant="caption">{status.progress}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={status.progress}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>

                    <Typography variant="body2" gutterBottom>
                      <strong>Records synced:</strong> {status.recordsSynced?.toLocaleString() || 0}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Errors:</strong> {status.errors || 0}
                    </Typography>

                    {status.nextSync && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Next sync: {new Date(status.nextSync).toLocaleString()}
                      </Typography>
                    )}

                    <Box sx={{ mt: 2 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Sync />}
                        onClick={() => syncFramework(frameworkId)}
                        disabled={status.status === 'syncing'}
                      >
                        {status.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </TabPanel>

      {/* Analytics Tab */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          {/* Integration Metrics Chart */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Integration Activity Over Time
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={integrationMetricsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="requests" stroke="#8884d8" name="API Requests" />
                    <Line type="monotone" dataKey="errors" stroke="#ff7c7c" name="Errors" />
                    <Line type="monotone" dataKey="dataPoints" stroke="#82ca9d" name="Data Points" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Framework Capabilities */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Framework Capabilities Matrix
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Framework</TableCell>
                        <TableCell>Attack Simulation</TableCell>
                        <TableCell>Threat Intel</TableCell>
                        <TableCell>Log Analysis</TableCell>
                        <TableCell>Endpoint Monitor</TableCell>
                        <TableCell>Network Analysis</TableCell>
                        <TableCell>Incident Response</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {frameworks.map((framework) => (
                        <TableRow key={framework.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getFrameworkIcon(framework.type)}
                              <Typography variant="body2" sx={{ ml: 1 }}>
                                {framework.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {framework.capabilities?.includes('attack_simulation') ? (
                              <CheckCircle color="success" />
                            ) : (
                              <Error color="disabled" />
                            )}
                          </TableCell>
                          <TableCell>
                            {framework.capabilities?.includes('threat_intelligence') ? (
                              <CheckCircle color="success" />
                            ) : (
                              <Error color="disabled" />
                            )}
                          </TableCell>
                          <TableCell>
                            {framework.capabilities?.includes('log_analysis') ? (
                              <CheckCircle color="success" />
                            ) : (
                              <Error color="disabled" />
                            )}
                          </TableCell>
                          <TableCell>
                            {framework.capabilities?.includes('endpoint_monitoring') ? (
                              <CheckCircle color="success" />
                            ) : (
                              <Error color="disabled" />
                            )}
                          </TableCell>
                          <TableCell>
                            {framework.capabilities?.includes('network_analysis') ? (
                              <CheckCircle color="success" />
                            ) : (
                              <Error color="disabled" />
                            )}
                          </TableCell>
                          <TableCell>
                            {framework.capabilities?.includes('incident_response') ? (
                              <CheckCircle color="success" />
                            ) : (
                              <Error color="disabled" />
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

      {/* Add Framework Dialog */}
      <Dialog
        open={addFrameworkDialogOpen}
        onClose={() => setAddFrameworkDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Framework Integration</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Framework Name"
                value={newFramework.name}
                onChange={(e) => setNewFramework(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Framework Type</InputLabel>
                <Select
                  value={newFramework.type}
                  onChange={(e) => setNewFramework(prev => ({ ...prev, type: e.target.value }))}
                >
                  {availableFrameworkTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Version"
                value={newFramework.version}
                onChange={(e) => setNewFramework(prev => ({ ...prev, version: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API Endpoint"
                value={newFramework.endpoint}
                onChange={(e) => setNewFramework(prev => ({ ...prev, endpoint: e.target.value }))}
                placeholder="https://framework.example.com/api"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="API Key"
                value={newFramework.apiKey}
                onChange={(e) => setNewFramework(prev => ({ ...prev, apiKey: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={newFramework.description}
                onChange={(e) => setNewFramework(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddFrameworkDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={addFramework}
            variant="contained"
            disabled={!newFramework.name || !newFramework.type || !newFramework.endpoint}
          >
            Add Framework
          </Button>
        </DialogActions>
      </Dialog>

      {/* Framework Configuration Dialog */}
      <Dialog
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Configure {selectedFramework?.name}
        </DialogTitle>
        <DialogContent>
          {selectedFramework && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="API Endpoint"
                  value={selectedFramework.endpoint}
                  disabled
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Version"
                  value={selectedFramework.version}
                  disabled
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Configuration Settings
                </Typography>
                {selectedFramework.configuration && Object.entries(selectedFramework.configuration).map(([key, value]) => (
                  <Box key={key} sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      label={key}
                      value={value}
                      size="small"
                    />
                  </Box>
                ))}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Capabilities
                </Typography>
                <Box>
                  {selectedFramework.capabilities?.map((capability) => (
                    <Chip
                      key={capability}
                      label={capability.replace('_', ' ')}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>
            Close
          </Button>
          <Button variant="contained">
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>

      {/* Health Check Dialog */}
      <Dialog
        open={healthDialogOpen}
        onClose={() => setHealthDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Framework Health Status</DialogTitle>
        <DialogContent>
          <List>
            {Object.entries(frameworkHealth).map(([frameworkId, health]) => (
              <ListItem key={frameworkId}>
                <ListItemIcon>
                  {getHealthIcon(health.status)}
                </ListItemIcon>
                <ListItemText
                  primary={health.framework}
                  secondary={`Status: ${health.status} | Response: ${health.responseTime || 'N/A'}ms | Last check: ${health.lastCheck ? new Date(health.lastCheck).toLocaleString() : 'Never'}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => testFrameworkConnection(frameworkId)}
                  >
                    <Refresh />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHealthDialogOpen(false)}>
            Close
          </Button>
          <Button variant="contained" onClick={updateFrameworkHealth}>
            Refresh All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FrameworkIntegrationOrchestrator;