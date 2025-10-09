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
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  CircularProgress,
  Avatar,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge
} from '@mui/material';
import {
  Business as BusinessIcon,
  Group as GroupIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  AccountCircle as AccountCircleIcon,
  Payment as PaymentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  ExpandMore as ExpandMoreIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Assessment as AssessmentIcon,
  Notifications as NotificationsIcon,
  VpnKey as VpnKeyIcon,
  Cloud as CloudIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { DataManagementService } from '../services/DataManagementService';
import type { TenantConfiguration, TenantUtilization } from '../types/DataManagement';

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

export const MultiTenancyDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [tenants, setTenants] = useState<TenantConfiguration[]>([]);
  const [loading, setLoading] = useState(false);
  const [createTenantDialogOpen, setCreateTenantDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantConfiguration | null>(null);
  const [tenantDetailsDialogOpen, setTenantDetailsDialogOpen] = useState(false);
  const [utilizationDialogOpen, setUtilizationDialogOpen] = useState(false);

  const [newTenant, setNewTenant] = useState({
    name: '',
    displayName: '',
    description: '',
    type: 'enterprise' as const,
    subscription: {
      plan: 'enterprise-pro',
      startDate: new Date(),
      features: ['advanced-analytics', 'compliance-reporting'],
      limits: {
        users: 500,
        storage: 1000000, // 1TB in MB
        dataIngestion: 10000, // 10GB per day in MB
        apiCalls: 1000000,
        reports: 1000,
        retentionPeriod: 2555, // 7 years in days
        backupStorage: 500000, // 500GB in MB
        concurrentSessions: 500
      },
      billing: {
        model: 'fixed' as const,
        currency: 'USD',
        cycle: 'annually' as const,
        autoRenewal: true,
        overage: { allowed: true, rate: 0.10, limit: 1.5 }
      }
    },
    isolation: {
      level: 'logical' as const,
      database: 'schema-isolated' as const,
      storage: 'encrypted' as const,
      compute: 'containerized' as const
    },
    customization: {
      branding: {
        logo: '/assets/default-logo.png',
        favicon: '/assets/default-favicon.ico',
        colors: { primary: '#1976d2', secondary: '#dc004e', accent: '#ed6c02' },
        fonts: { primary: 'Roboto', secondary: 'Roboto Mono' }
      },
      theme: {
        mode: 'light' as const,
        customization: { layout: 'standard', navigation: 'sidebar', dashboard: 'grid' }
      },
      features: {
        enabled: ['analytics', 'reporting'],
        disabled: [],
        beta: [],
        custom: {}
      },
      integrations: []
    },
    compliance: {
      regulations: ['SOX'],
      certifications: [],
      dataResidency: ['US'],
      auditLog: true
    },
    security: {
      sso: { enabled: false, provider: 'saml' as const, configuration: {}, attributeMapping: {} },
      mfa: { enabled: true, methods: ['totp' as const], required: false, grace: 24 },
      rbac: { enabled: true, roles: [], permissions: [], inheritance: true, dynamic: false },
      encryption: {
        atRest: { enabled: true, algorithm: 'AES-256-GCM', keyManagement: 'tenant' as const },
        inTransit: { enabled: true, protocol: 'TLS-1.3', cipherSuites: ['TLS_AES_256_GCM_SHA384'] },
        fields: { pii: true, sensitive: true, custom: [] }
      }
    },
    contacts: {
      primary: { name: '', email: '', role: 'Admin', timezone: 'UTC' },
      technical: { name: '', email: '', role: 'Technical Contact', timezone: 'UTC' },
      billing: { name: '', email: '', role: 'Billing Contact', timezone: 'UTC' },
      security: { name: '', email: '', role: 'Security Contact', timezone: 'UTC' }
    }
  });

  const dataManagementService = new DataManagementService();

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const tenantData = await dataManagementService.listTenants();
      setTenants(tenantData);
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    setLoading(true);
    try {
      const tenantId = await dataManagementService.createTenant({
        ...newTenant,
        monitoring: {
          usage: {
            users: { active: 0, total: 0, sessions: 0 },
            storage: { used: 0, allocated: newTenant.subscription.limits.storage, growth: 0 },
            api: { calls: 0, rate: 0, errors: 0 },
            features: {}
          },
          performance: {
            responseTime: { p50: 0, p95: 0, p99: 0 },
            throughput: { requests: 0, data: 0 },
            availability: 100,
            errors: { rate: 0, types: {} }
          },
          health: {
            status: 'healthy' as const,
            services: {},
            dependencies: {},
            resources: { cpu: 0, memory: 0, disk: 0, network: 0 },
            alerts: 0
          }
        },
        provisionedBy: 'admin'
      });
      await loadTenants();
      setCreateTenantDialogOpen(false);
      setNewTenant({ ...newTenant, name: '', displayName: '', description: '' });
    } catch (error) {
      console.error('Error creating tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon color="success" />;
      case 'suspended':
        return <PauseIcon color="warning" />;
      case 'inactive':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'warning';
      case 'inactive':
        return 'error';
      default:
        return 'info';
    }
  };

  const formatBytes = (mb: number) => {
    const gb = mb / 1024;
    const tb = gb / 1024;
    if (tb >= 1) return `${tb.toFixed(2)} TB`;
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    return `${mb.toFixed(2)} MB`;
  };

  const getUtilizationPercentage = (used: number, limit: number) => {
    return Math.round((used / limit) * 100);
  };

  const getTenantGrowthData = () => {
    return [
      { month: 'Jan', active: 8, new: 2, churned: 0 },
      { month: 'Feb', active: 10, new: 3, churned: 1 },
      { month: 'Mar', active: 12, new: 4, churned: 2 },
      { month: 'Apr', active: 14, new: 3, churned: 1 },
      { month: 'May', active: 16, new: 4, churned: 2 },
      { month: 'Jun', active: 18, new: 3, churned: 1 },
      { month: 'Jul', active: 20, new: 4, churned: 2 },
      { month: 'Aug', active: 22, new: 3, churned: 1 },
      { month: 'Sep', active: 24, new: 4, churned: 2 },
      { month: 'Oct', active: 25, new: 2, churned: 1 },
      { month: 'Nov', active: 27, new: 3, churned: 1 },
      { month: 'Dec', active: 28, new: 2, churned: 1 }
    ];
  };

  const getResourceUtilizationData = () => {
    return tenants.map(tenant => ({
      name: tenant.displayName,
      storage: getUtilizationPercentage(tenant.monitoring.usage.storage.used, tenant.monitoring.usage.storage.allocated),
      users: getUtilizationPercentage(tenant.monitoring.usage.users.active, tenant.subscription.limits.users),
      api: getUtilizationPercentage(tenant.monitoring.usage.api.calls, tenant.subscription.limits.apiCalls)
    }));
  };

  const getSubscriptionDistribution = () => {
    const distribution: Record<string, number> = {};
    tenants.forEach(tenant => {
      distribution[tenant.subscription.plan] = (distribution[tenant.subscription.plan] || 0) + 1;
    });
    return Object.entries(distribution).map(([plan, count]) => ({
      plan,
      count,
      fill: getRandomColor()
    }));
  };

  const getRandomColor = () => {
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const renderCreateTenantDialog = () => (
    <Dialog open={createTenantDialogOpen} onClose={() => setCreateTenantDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Create New Tenant</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Tenant Name (ID)"
            value={newTenant.name}
            onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            helperText="Lowercase letters, numbers, and hyphens only"
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Display Name"
            value={newTenant.displayName}
            onChange={(e) => setNewTenant({ ...newTenant, displayName: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={2}
            value={newTenant.description}
            onChange={(e) => setNewTenant({ ...newTenant, description: e.target.value })}
            sx={{ mb: 2 }}
          />

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Tenant Type</InputLabel>
                <Select
                  value={newTenant.type}
                  onChange={(e) => setNewTenant({ ...newTenant, type: e.target.value as any })}
                  label="Tenant Type"
                >
                  <MenuItem value="enterprise">Enterprise</MenuItem>
                  <MenuItem value="government">Government</MenuItem>
                  <MenuItem value="mssp">MSSP</MenuItem>
                  <MenuItem value="saas">SaaS</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Subscription Plan</InputLabel>
                <Select
                  value={newTenant.subscription.plan}
                  onChange={(e) => setNewTenant({
                    ...newTenant,
                    subscription: { ...newTenant.subscription, plan: e.target.value }
                  })}
                  label="Subscription Plan"
                >
                  <MenuItem value="basic">Basic</MenuItem>
                  <MenuItem value="professional">Professional</MenuItem>
                  <MenuItem value="enterprise">Enterprise</MenuItem>
                  <MenuItem value="enterprise-pro">Enterprise Pro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>Resource Limits</Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Max Users"
                value={newTenant.subscription.limits.users}
                onChange={(e) => setNewTenant({
                  ...newTenant,
                  subscription: {
                    ...newTenant.subscription,
                    limits: { ...newTenant.subscription.limits, users: parseInt(e.target.value) }
                  }
                })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Storage (GB)"
                value={newTenant.subscription.limits.storage / 1024}
                onChange={(e) => setNewTenant({
                  ...newTenant,
                  subscription: {
                    ...newTenant.subscription,
                    limits: { ...newTenant.subscription.limits, storage: parseInt(e.target.value) * 1024 }
                  }
                })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="API Calls/Month"
                value={newTenant.subscription.limits.apiCalls}
                onChange={(e) => setNewTenant({
                  ...newTenant,
                  subscription: {
                    ...newTenant.subscription,
                    limits: { ...newTenant.subscription.limits, apiCalls: parseInt(e.target.value) }
                  }
                })}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>Isolation Level</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Database Isolation</InputLabel>
                <Select
                  value={newTenant.isolation.database}
                  onChange={(e) => setNewTenant({
                    ...newTenant,
                    isolation: { ...newTenant.isolation, database: e.target.value as any }
                  })}
                  label="Database Isolation"
                >
                  <MenuItem value="shared">Shared</MenuItem>
                  <MenuItem value="schema-isolated">Schema Isolated</MenuItem>
                  <MenuItem value="dedicated">Dedicated</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Compute Isolation</InputLabel>
                <Select
                  value={newTenant.isolation.compute}
                  onChange={(e) => setNewTenant({
                    ...newTenant,
                    isolation: { ...newTenant.isolation, compute: e.target.value as any }
                  })}
                  label="Compute Isolation"
                >
                  <MenuItem value="shared">Shared</MenuItem>
                  <MenuItem value="containerized">Containerized</MenuItem>
                  <MenuItem value="dedicated">Dedicated</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>Primary Contact</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Contact Name"
                value={newTenant.contacts.primary.name}
                onChange={(e) => setNewTenant({
                  ...newTenant,
                  contacts: {
                    ...newTenant.contacts,
                    primary: { ...newTenant.contacts.primary, name: e.target.value }
                  }
                })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Contact Email"
                type="email"
                value={newTenant.contacts.primary.email}
                onChange={(e) => setNewTenant({
                  ...newTenant,
                  contacts: {
                    ...newTenant.contacts,
                    primary: { ...newTenant.contacts.primary, email: e.target.value }
                  }
                })}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateTenantDialogOpen(false)}>Cancel</Button>
        <Button
          onClick={handleCreateTenant}
          variant="contained"
          disabled={!newTenant.name || !newTenant.displayName || loading}
          startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
        >
          {loading ? 'Creating...' : 'Create Tenant'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderTenantDetailsDialog = () => (
    <Dialog
      open={tenantDetailsDialogOpen}
      onClose={() => setTenantDetailsDialogOpen(false)}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>Tenant Details: {selectedTenant?.displayName}</DialogTitle>
      <DialogContent>
        {selectedTenant && (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Configuration</Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Type: <Chip label={selectedTenant.type} size="small" /></Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Subscription: <Chip label={selectedTenant.subscription.plan} size="small" /></Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Isolation Level:</Typography>
                      <Typography variant="body2">
                        Database: {selectedTenant.isolation.database} | Compute: {selectedTenant.isolation.compute}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Status:</Typography>
                      <Chip
                        label={selectedTenant.status}
                        color={getStatusColor(selectedTenant.status) as any}
                        size="small"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Resource Utilization</Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Storage</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={getUtilizationPercentage(selectedTenant.monitoring.usage.storage.used, selectedTenant.monitoring.usage.storage.allocated)}
                        sx={{ mt: 1 }}
                      />
                      <Typography variant="caption">
                        {formatBytes(selectedTenant.monitoring.usage.storage.used)} / {formatBytes(selectedTenant.monitoring.usage.storage.allocated)}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Users</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={getUtilizationPercentage(selectedTenant.monitoring.usage.users.active, selectedTenant.subscription.limits.users)}
                        sx={{ mt: 1 }}
                      />
                      <Typography variant="caption">
                        {selectedTenant.monitoring.usage.users.active} / {selectedTenant.subscription.limits.users}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">API Calls</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={getUtilizationPercentage(selectedTenant.monitoring.usage.api.calls, selectedTenant.subscription.limits.apiCalls)}
                        sx={{ mt: 1 }}
                      />
                      <Typography variant="caption">
                        {selectedTenant.monitoring.usage.api.calls.toLocaleString()} / {selectedTenant.subscription.limits.apiCalls.toLocaleString()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Contacts</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={3}>
                        <Typography variant="subtitle2">Primary</Typography>
                        <Typography variant="body2">{selectedTenant.contacts.primary.name}</Typography>
                        <Typography variant="caption">{selectedTenant.contacts.primary.email}</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="subtitle2">Technical</Typography>
                        <Typography variant="body2">{selectedTenant.contacts.technical.name}</Typography>
                        <Typography variant="caption">{selectedTenant.contacts.technical.email}</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="subtitle2">Billing</Typography>
                        <Typography variant="body2">{selectedTenant.contacts.billing.name}</Typography>
                        <Typography variant="caption">{selectedTenant.contacts.billing.email}</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="subtitle2">Security</Typography>
                        <Typography variant="body2">{selectedTenant.contacts.security.name}</Typography>
                        <Typography variant="caption">{selectedTenant.contacts.security.email}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setTenantDetailsDialogOpen(false)}>Close</Button>
        <Button variant="contained" startIcon={<EditIcon />}>Edit Configuration</Button>
      </DialogActions>
    </Dialog>
  );

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Total Tenants</Typography>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary">
                {tenants.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Organizations
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Active Users</Typography>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="success.main">
                {tenants.reduce((sum, tenant) => sum + tenant.monitoring.usage.users.active, 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Across All Tenants
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Storage Used</Typography>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="info.main">
                {formatBytes(tenants.reduce((sum, tenant) => sum + tenant.monitoring.usage.storage.used, 0))}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Consumption
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>API Calls</Typography>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="warning.main">
                {tenants.reduce((sum, tenant) => sum + tenant.monitoring.usage.api.calls, 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This Month
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Tenant Growth</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={getTenantGrowthData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="active" stackId="1" stroke="#8884d8" fill="#8884d8" name="Active" />
                <Area type="monotone" dataKey="new" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="New" />
                <Area type="monotone" dataKey="churned" stackId="3" stroke="#ffc658" fill="#ffc658" name="Churned" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Subscription Distribution</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getSubscriptionDistribution()}
                  dataKey="count"
                  nameKey="plan"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ plan, count }) => `${plan}: ${count}`}
                >
                  {getSubscriptionDistribution().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Resource Utilization by Tenant</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getResourceUtilizationData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="storage" fill="#8884d8" name="Storage %" />
                <Bar dataKey="users" fill="#82ca9d" name="Users %" />
                <Bar dataKey="api" fill="#ffc658" name="API %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderTenantsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Tenant Management</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateTenantDialogOpen(true)}
              >
                Create Tenant
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Organization</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Plan</TableCell>
                      <TableCell>Users</TableCell>
                      <TableCell>Storage</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tenants.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {tenant.displayName.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2">{tenant.displayName}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {tenant.name}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={tenant.type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip label={tenant.subscription.plan} size="small" />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {tenant.monitoring.usage.users.active} / {tenant.subscription.limits.users}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={getUtilizationPercentage(tenant.monitoring.usage.users.active, tenant.subscription.limits.users)}
                              sx={{ width: 100, mt: 0.5 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {formatBytes(tenant.monitoring.usage.storage.used)} / {formatBytes(tenant.monitoring.usage.storage.allocated)}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={getUtilizationPercentage(tenant.monitoring.usage.storage.used, tenant.monitoring.usage.storage.allocated)}
                              sx={{ width: 100, mt: 0.5 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStatusIcon(tenant.status)}
                            <Chip
                              label={tenant.status}
                              color={getStatusColor(tenant.status) as any}
                              size="small"
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          {new Date(tenant.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedTenant(tenant);
                                setTenantDetailsDialogOpen(true);
                              }}
                            >
                              <VisibilityIcon />
                            </IconButton>
                            <IconButton size="small">
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedTenant(tenant);
                                setUtilizationDialogOpen(true);
                              }}
                            >
                              <AssessmentIcon />
                            </IconButton>
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
    </Grid>
  );

  const renderBillingTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info">
          Comprehensive billing management, usage tracking, and cost optimization tools will be available here.
        </Alert>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Monthly Revenue</Typography>
            <Typography variant="h4" color="success.main">
              $45,230
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Across {tenants.length} active tenants
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Average Revenue Per Tenant</Typography>
            <Typography variant="h4" color="primary">
              ${tenants.length > 0 ? Math.round(45230 / tenants.length) : 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monthly average
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Multi-Tenancy Management
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Support for multiple organizations and customers with complete isolation
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Overview" />
          <Tab label="Tenants" />
          <Tab label="Billing & Usage" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {renderOverviewTab()}
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        {renderTenantsTab()}
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        {renderBillingTab()}
      </TabPanel>

      {renderCreateTenantDialog()}
      {renderTenantDetailsDialog()}
    </Paper>
  );
};

export default MultiTenancyDashboard;