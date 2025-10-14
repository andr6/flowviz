/**
 * Automation Dashboard
 *
 * Main dashboard for Phase 3: Integration & Automation features
 * Displays SIEM connectors, workflows, triage stats, and tickets
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Button,
  IconButton,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

interface SIEMConnector {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  connected: boolean;
  lastSync?: string;
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  executionMode: string;
  actionCount: number;
  executionCount: number;
  lastExecution?: string;
}

interface TriageStats {
  totalRules: number;
  enabledRules: number;
  totalTriaged: number;
  autoResolved: number;
  ticketsCreated: number;
  workflowsTriggered: number;
}

interface Ticket {
  id: string;
  key: string;
  url: string;
  summary: string;
  status: string;
  priority: string;
  createdAt: string;
}

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
      id={`automation-tabpanel-${index}`}
      aria-labelledby={`automation-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const AutomationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State
  const [connectors, setConnectors] = useState<SIEMConnector[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [triageStats, setTriageStats] = useState<TriageStats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Load data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API calls
      // Mock data for now
      setConnectors([
        {
          id: 'splunk-1',
          name: 'Splunk Production',
          type: 'splunk',
          enabled: true,
          connected: true,
          lastSync: new Date().toISOString(),
        },
        {
          id: 'sentinel-1',
          name: 'Microsoft Sentinel',
          type: 'sentinel',
          enabled: true,
          connected: true,
          lastSync: new Date(Date.now() - 300000).toISOString(),
        },
      ]);

      setWorkflows([
        {
          id: 'wf-1',
          name: 'Critical Alert Response',
          description: 'Automated response for critical alerts',
          enabled: true,
          executionMode: 'sequential',
          actionCount: 5,
          executionCount: 120,
          lastExecution: new Date().toISOString(),
        },
        {
          id: 'wf-2',
          name: 'Malware Detection Workflow',
          description: 'Automated malware analysis and response',
          enabled: true,
          executionMode: 'parallel',
          actionCount: 8,
          executionCount: 85,
          lastExecution: new Date(Date.now() - 600000).toISOString(),
        },
      ]);

      setTriageStats({
        totalRules: 8,
        enabledRules: 6,
        totalTriaged: 1250,
        autoResolved: 120,
        ticketsCreated: 180,
        workflowsTriggered: 95,
      });

      setTickets([
        {
          id: 'SEC-123',
          key: 'SEC-123',
          url: 'https://jira.example.com/browse/SEC-123',
          summary: 'Investigate suspicious PowerShell activity',
          status: 'In Progress',
          priority: 'High',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Automation Dashboard
        </Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
          >
            New Workflow
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading Indicator */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Overview Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                SIEM Connectors
              </Typography>
              <Typography variant="h4">
                {connectors.filter(c => c.connected).length}/{connectors.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Connected
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Workflows
              </Typography>
              <Typography variant="h4">
                {workflows.filter(w => w.enabled).length}/{workflows.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Alerts Triaged
              </Typography>
              <Typography variant="h4">
                {triageStats?.totalTriaged || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Tickets Created
              </Typography>
              <Typography variant="h4">
                {triageStats?.ticketsCreated || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Auto-generated
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="automation tabs">
          <Tab label="SIEM Connectors" />
          <Tab label="Workflows" />
          <Tab label="Triage Rules" />
          <Tab label="Tickets" />
        </Tabs>

        {/* Tab 1: SIEM Connectors */}
        <TabPanel value={activeTab} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Sync</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {connectors.map((connector) => (
                  <TableRow key={connector.id}>
                    <TableCell>
                      <Typography variant="body1">{connector.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={connector.type} size="small" />
                    </TableCell>
                    <TableCell>
                      {connector.connected ? (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Connected"
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Chip
                          icon={<ErrorIcon />}
                          label="Disconnected"
                          color="error"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {connector.lastSync ? formatDate(connector.lastSync) : 'Never'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Sync Now">
                        <IconButton size="small">
                          <RefreshIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Settings">
                        <IconButton size="small">
                          <SettingsIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Tab 2: Workflows */}
        <TabPanel value={activeTab} index={1}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Executions</TableCell>
                  <TableCell>Last Run</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell>
                      <Typography variant="body1">{workflow.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {workflow.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {workflow.enabled ? (
                        <Chip label="Enabled" color="success" size="small" />
                      ) : (
                        <Chip label="Disabled" size="small" />
                      )}
                    </TableCell>
                    <TableCell>{workflow.executionCount}</TableCell>
                    <TableCell>
                      {workflow.lastExecution ? formatDate(workflow.lastExecution) : 'Never'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Execute">
                        <IconButton size="small">
                          <PlayArrowIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Pause">
                        <IconButton size="small">
                          <PauseIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Settings">
                        <IconButton size="small">
                          <SettingsIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Tab 3: Triage Rules */}
        <TabPanel value={activeTab} index={2}>
          {triageStats && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6">Total Rules</Typography>
                    <Typography variant="h4">{triageStats.totalRules}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6">Enabled Rules</Typography>
                    <Typography variant="h4">{triageStats.enabledRules}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6">Auto-Resolved</Typography>
                    <Typography variant="h4">{triageStats.autoResolved}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="textSecondary" gutterBottom>
              Manage triage rules to automate alert classification and response
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} sx={{ mt: 2 }}>
              Add Triage Rule
            </Button>
          </Box>
        </TabPanel>

        {/* Tab 4: Tickets */}
        <TabPanel value={activeTab} index={3}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ticket ID</TableCell>
                  <TableCell>Summary</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {ticket.key}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1">{ticket.summary}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ticket.priority}
                        color={
                          ticket.priority === 'High'
                            ? 'error'
                            : ticket.priority === 'Medium'
                              ? 'warning'
                              : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={ticket.status} size="small" />
                    </TableCell>
                    <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        href={ticket.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default AutomationDashboard;
