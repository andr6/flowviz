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
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Security as SecurityIcon,
  Schedule as ScheduleIcon,
  Storage as StorageIcon,
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  VerifiedUser as VerifiedUserIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { DataManagementService } from '../services/DataManagementService';
import type { BackupConfiguration, BackupJob, DisasterRecoveryPlan } from '../types/DataManagement';

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

export const BackupRecoveryDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [backupConfigs, setBackupConfigs] = useState<BackupConfiguration[]>([]);
  const [backupJobs, setBackupJobs] = useState<BackupJob[]>([]);
  const [recoveryPlans, setRecoveryPlans] = useState<DisasterRecoveryPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [createBackupDialogOpen, setCreateBackupDialogOpen] = useState(false);
  const [createRecoveryDialogOpen, setCreateRecoveryDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<BackupJob | null>(null);
  const [jobDetailsDialogOpen, setJobDetailsDialogOpen] = useState(false);
  const [testRecoveryDialogOpen, setTestRecoveryDialogOpen] = useState(false);

  const [newBackupConfig, setNewBackupConfig] = useState({
    name: '',
    description: '',
    scope: {
      dataSources: ['siem-logs'],
      databases: ['primary'],
      configurations: ['system'],
      includeMetadata: true,
      includeUserData: true
    },
    schedule: {
      frequency: 'daily' as const,
      time: '02:00',
      timezone: 'UTC',
      retentionPolicy: { daily: 30, weekly: 12, monthly: 12, yearly: 7 }
    },
    destination: {
      type: 's3' as const,
      configuration: { bucket: 'threatviz-backups', region: 'us-east-1' },
      encryption: { enabled: true, algorithm: 'AES-256', keyManagement: 'kms' as const },
      compression: { enabled: true, algorithm: 'gzip' as const, level: 6 }
    },
    verification: { enabled: true, checksumValidation: true, restoreTest: true, testFrequency: 'monthly' as const },
    alerts: {
      onSuccess: false,
      onFailure: true,
      onSizeThreshold: true,
      onTimeThreshold: true,
      recipients: ['admin@company.com'],
      channels: ['email' as const]
    }
  });

  const dataManagementService = new DataManagementService();

  useEffect(() => {
    loadBackupData();
  }, []);

  const loadBackupData = async () => {
    setLoading(true);
    try {
      // Simulate API calls - in real implementation these would use the service
      const mockConfigs: BackupConfiguration[] = [
        {
          id: 'backup-1',
          name: 'Daily Production Backup',
          description: 'Complete daily backup of all production data',
          scope: {
            dataSources: ['siem-logs', 'threat-intel', 'user-data'],
            databases: ['primary', 'analytics'],
            configurations: ['system', 'user-preferences'],
            includeMetadata: true,
            includeUserData: true
          },
          schedule: {
            frequency: 'daily',
            time: '02:00',
            timezone: 'UTC',
            retentionPolicy: { daily: 30, weekly: 12, monthly: 12, yearly: 7 }
          },
          destination: {
            type: 's3',
            configuration: { bucket: 'threatviz-backups-prod', region: 'us-east-1', storageClass: 'STANDARD_IA' },
            encryption: { enabled: true, algorithm: 'AES-256', keyManagement: 'kms' },
            compression: { enabled: true, algorithm: 'gzip', level: 6 }
          },
          verification: { enabled: true, checksumValidation: true, restoreTest: true, testFrequency: 'weekly' },
          alerts: {
            onSuccess: false,
            onFailure: true,
            onSizeThreshold: true,
            onTimeThreshold: true,
            recipients: ['backup-admin@company.com', 'security-team@company.com'],
            channels: ['email', 'slack']
          },
          performance: { parallelStreams: 8, bandwidth: 1000, deduplication: true, incrementalBackup: true },
          compliance: { regulations: ['SOX', 'GDPR'], auditTrail: true, immutableBackups: true, geographicReplication: true },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-11-01'),
          lastBackup: new Date('2024-12-01T02:00:00Z'),
          nextBackup: new Date('2024-12-02T02:00:00Z'),
          status: 'active'
        }
      ];

      const mockJobs: BackupJob[] = [
        {
          id: 'job-1',
          configurationId: 'backup-1',
          type: 'full',
          startTime: new Date('2024-12-01T02:00:00Z'),
          endTime: new Date('2024-12-01T03:45:00Z'),
          status: 'completed',
          progress: 100,
          statistics: {
            filesProcessed: 125000,
            bytesTransferred: 850000000000, // 850GB
            compressionRatio: 0.65,
            transferRate: 150000000, // 150MB/s
            errors: 0,
            warnings: 2
          },
          metadata: {
            sourceSize: 1300000000000, // 1.3TB
            backupSize: 845000000000, // 845GB
            checksum: 'sha256:abc123def456...',
            verification: true,
            location: 's3://threatviz-backups-prod/2024/12/01/full-backup.tar.gz'
          },
          logs: [
            { timestamp: new Date('2024-12-01T02:00:00Z'), level: 'info', message: 'Backup job started', details: {} },
            { timestamp: new Date('2024-12-01T02:15:00Z'), level: 'warning', message: 'Some log files were locked, retrying', details: {} },
            { timestamp: new Date('2024-12-01T03:45:00Z'), level: 'info', message: 'Backup completed successfully', details: {} }
          ]
        },
        {
          id: 'job-2',
          configurationId: 'backup-1',
          type: 'incremental',
          startTime: new Date('2024-11-30T02:00:00Z'),
          endTime: new Date('2024-11-30T02:15:00Z'),
          status: 'completed',
          progress: 100,
          statistics: {
            filesProcessed: 15000,
            bytesTransferred: 45000000000, // 45GB
            compressionRatio: 0.72,
            transferRate: 200000000, // 200MB/s
            errors: 0,
            warnings: 0
          },
          metadata: {
            sourceSize: 62500000000, // 62.5GB
            backupSize: 45000000000, // 45GB
            checksum: 'sha256:def456ghi789...',
            verification: true,
            location: 's3://threatviz-backups-prod/2024/11/30/incremental-backup.tar.gz'
          },
          logs: [
            { timestamp: new Date('2024-11-30T02:00:00Z'), level: 'info', message: 'Incremental backup started', details: {} },
            { timestamp: new Date('2024-11-30T02:15:00Z'), level: 'info', message: 'Incremental backup completed', details: {} }
          ]
        }
      ];

      const mockRecoveryPlans: DisasterRecoveryPlan[] = [
        {
          id: 'plan-1',
          name: 'Primary System Recovery',
          description: 'Complete recovery procedure for primary ThreatViz infrastructure',
          scope: {
            systems: ['web-servers', 'api-servers', 'databases', 'storage'],
            applications: ['threatviz-web', 'threatviz-api', 'analytics-engine'],
            dataSources: ['siem-logs', 'threat-intel', 'user-data'],
            dependencies: ['auth-service', 'notification-service', 'backup-storage']
          },
          objectives: { rto: 240, rpo: 60, mttr: 180, availabilityTarget: 99.9 },
          procedures: [],
          roles: [],
          communication: { stakeholders: [], templates: [], channels: [], escalationTimeouts: [] },
          testing: { frequency: 'quarterly' },
          resources: { infrastructure: [], personnel: [], vendors: [] },
          triggers: [],
          escalation: { levels: [], autoEscalation: true, escalationTimeout: 60 },
          createdAt: new Date('2024-06-01'),
          updatedAt: new Date('2024-11-01'),
          approved: true,
          approvedBy: 'security-admin',
          approvedAt: new Date('2024-06-15'),
          version: '2.1',
          status: 'active'
        }
      ];

      setBackupConfigs(mockConfigs);
      setBackupJobs(mockJobs);
      setRecoveryPlans(mockRecoveryPlans);
    } catch (error) {
      console.error('Error loading backup data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackupConfig = async () => {
    setLoading(true);
    try {
      const newConfig: BackupConfiguration = {
        ...newBackupConfig,
        id: `backup-${Date.now()}`,
        performance: { parallelStreams: 4, bandwidth: 500, deduplication: true, incrementalBackup: true },
        compliance: { regulations: ['SOX'], auditTrail: true, immutableBackups: false, geographicReplication: false },
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active'
      };
      setBackupConfigs([...backupConfigs, newConfig]);
      setCreateBackupDialogOpen(false);
    } catch (error) {
      console.error('Error creating backup config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteBackup = async (configId: string) => {
    try {
      const newJob: BackupJob = {
        id: `job-${Date.now()}`,
        configurationId: configId,
        type: 'full',
        startTime: new Date(),
        status: 'running',
        progress: 0,
        statistics: { filesProcessed: 0, bytesTransferred: 0, compressionRatio: 0, transferRate: 0, errors: 0, warnings: 0 },
        metadata: { sourceSize: 0, backupSize: 0, checksum: '', verification: false, location: '' },
        logs: [{ timestamp: new Date(), level: 'info', message: 'Backup job started', details: {} }]
      };
      setBackupJobs([newJob, ...backupJobs]);
    } catch (error) {
      console.error('Error executing backup:', error);
    }
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

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (start: Date, end?: Date) => {
    if (!end) return 'In progress';
    const duration = end.getTime() - start.getTime();
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const getBackupTrendData = () => {
    return [
      { date: '2024-11-25', size: 820, duration: 95, success: true },
      { date: '2024-11-26', size: 835, duration: 98, success: true },
      { date: '2024-11-27', size: 842, duration: 101, success: true },
      { date: '2024-11-28', size: 851, duration: 103, success: false },
      { date: '2024-11-29', size: 847, duration: 99, success: true },
      { date: '2024-11-30', size: 45, duration: 15, success: true }, // incremental
      { date: '2024-12-01', size: 845, duration: 105, success: true }
    ];
  };

  const getStorageDistribution = () => {
    return [
      { name: 'Full Backups', value: 65, fill: '#8884d8' },
      { name: 'Incremental', value: 25, fill: '#82ca9d' },
      { name: 'Logs', value: 7, fill: '#ffc658' },
      { name: 'Other', value: 3, fill: '#ff7300' }
    ];
  };

  const renderCreateBackupDialog = () => (
    <Dialog open={createBackupDialogOpen} onClose={() => setCreateBackupDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Create Backup Configuration</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Configuration Name"
            value={newBackupConfig.name}
            onChange={(e) => setNewBackupConfig({ ...newBackupConfig, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={2}
            value={newBackupConfig.description}
            onChange={(e) => setNewBackupConfig({ ...newBackupConfig, description: e.target.value })}
            sx={{ mb: 2 }}
          />

          <Typography variant="subtitle1" gutterBottom>Backup Scope</Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Data Sources</InputLabel>
                <Select
                  multiple
                  value={newBackupConfig.scope.dataSources}
                  onChange={(e) => setNewBackupConfig({
                    ...newBackupConfig,
                    scope: { ...newBackupConfig.scope, dataSources: e.target.value as string[] }
                  })}
                  label="Data Sources"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  <MenuItem value="siem-logs">SIEM Logs</MenuItem>
                  <MenuItem value="threat-intel">Threat Intelligence</MenuItem>
                  <MenuItem value="user-data">User Data</MenuItem>
                  <MenuItem value="compliance-data">Compliance Data</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Databases</InputLabel>
                <Select
                  multiple
                  value={newBackupConfig.scope.databases}
                  onChange={(e) => setNewBackupConfig({
                    ...newBackupConfig,
                    scope: { ...newBackupConfig.scope, databases: e.target.value as string[] }
                  })}
                  label="Databases"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  <MenuItem value="primary">Primary Database</MenuItem>
                  <MenuItem value="analytics">Analytics Database</MenuItem>
                  <MenuItem value="logs">Log Database</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>Schedule</Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={newBackupConfig.schedule.frequency}
                  onChange={(e) => setNewBackupConfig({
                    ...newBackupConfig,
                    schedule: { ...newBackupConfig.schedule, frequency: e.target.value as any }
                  })}
                  label="Frequency"
                >
                  <MenuItem value="hourly">Hourly</MenuItem>
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="time"
                label="Time"
                value={newBackupConfig.schedule.time}
                onChange={(e) => setNewBackupConfig({
                  ...newBackupConfig,
                  schedule: { ...newBackupConfig.schedule, time: e.target.value }
                })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select
                  value={newBackupConfig.schedule.timezone}
                  onChange={(e) => setNewBackupConfig({
                    ...newBackupConfig,
                    schedule: { ...newBackupConfig.schedule, timezone: e.target.value }
                  })}
                  label="Timezone"
                >
                  <MenuItem value="UTC">UTC</MenuItem>
                  <MenuItem value="America/New_York">Eastern Time</MenuItem>
                  <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
                  <MenuItem value="Europe/London">London</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>Destination</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Storage Type</InputLabel>
                <Select
                  value={newBackupConfig.destination.type}
                  onChange={(e) => setNewBackupConfig({
                    ...newBackupConfig,
                    destination: { ...newBackupConfig.destination, type: e.target.value as any }
                  })}
                  label="Storage Type"
                >
                  <MenuItem value="local">Local Storage</MenuItem>
                  <MenuItem value="s3">Amazon S3</MenuItem>
                  <MenuItem value="azure-blob">Azure Blob</MenuItem>
                  <MenuItem value="gcp-storage">Google Cloud Storage</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Bucket/Container"
                value={newBackupConfig.destination.configuration.bucket || ''}
                onChange={(e) => setNewBackupConfig({
                  ...newBackupConfig,
                  destination: {
                    ...newBackupConfig.destination,
                    configuration: { ...newBackupConfig.destination.configuration, bucket: e.target.value }
                  }
                })}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>Security & Verification</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={newBackupConfig.destination.encryption.enabled}
                onChange={(e) => setNewBackupConfig({
                  ...newBackupConfig,
                  destination: {
                    ...newBackupConfig.destination,
                    encryption: { ...newBackupConfig.destination.encryption, enabled: e.target.checked }
                  }
                })}
              />
            }
            label="Enable Encryption"
          />
          <FormControlLabel
            control={
              <Switch
                checked={newBackupConfig.verification.enabled}
                onChange={(e) => setNewBackupConfig({
                  ...newBackupConfig,
                  verification: { ...newBackupConfig.verification, enabled: e.target.checked }
                })}
              />
            }
            label="Enable Verification"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateBackupDialogOpen(false)}>Cancel</Button>
        <Button
          onClick={handleCreateBackupConfig}
          variant="contained"
          disabled={!newBackupConfig.name || loading}
          startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
        >
          {loading ? 'Creating...' : 'Create Configuration'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderJobDetailsDialog = () => (
    <Dialog open={jobDetailsDialogOpen} onClose={() => setJobDetailsDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Backup Job Details</DialogTitle>
      <DialogContent>
        {selectedJob && (
          <Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Job ID:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedJob.id}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Status:</Typography>
                <Chip label={selectedJob.status} color={getStatusColor(selectedJob.status) as any} size="small" />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Start Time:</Typography>
                <Typography variant="body2">{selectedJob.startTime.toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Duration:</Typography>
                <Typography variant="body2">{formatDuration(selectedJob.startTime, selectedJob.endTime)}</Typography>
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>Statistics</Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">Files Processed</Typography>
                    <Typography variant="h6">{selectedJob.statistics.filesProcessed.toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">Data Transferred</Typography>
                    <Typography variant="h6">{formatBytes(selectedJob.statistics.bytesTransferred)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">Compression Ratio</Typography>
                    <Typography variant="h6">{(selectedJob.statistics.compressionRatio * 100).toFixed(1)}%</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">Transfer Rate</Typography>
                    <Typography variant="h6">{formatBytes(selectedJob.statistics.transferRate)}/s</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>Logs</Typography>
            <List>
              {selectedJob.logs.map((log, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {log.level === 'error' ? <ErrorIcon color="error" /> :
                     log.level === 'warning' ? <WarningIcon color="warning" /> :
                     <InfoIcon color="info" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={log.message}
                    secondary={log.timestamp.toLocaleString()}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setJobDetailsDialogOpen(false)}>Close</Button>
        <Button variant="contained" startIcon={<DownloadIcon />}>Export Report</Button>
      </DialogActions>
    </Dialog>
  );

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Backup Status</Typography>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="success.main">
                {backupJobs.filter(job => job.status === 'completed').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Successful Backups (7 days)
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
              <Typography variant="h3" color="primary">
                2.1TB
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Backup Storage
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Last Backup</Typography>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="info.main">
                3h
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Hours Ago
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Recovery RTO</Typography>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="warning.main">
                4h
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Target Recovery Time
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Backup Trends</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getBackupTrendData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="size" fill="#8884d8" name="Size (GB)" />
                <Line yAxisId="right" type="monotone" dataKey="duration" stroke="#82ca9d" name="Duration (min)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Storage Distribution</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getStorageDistribution()}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {getStorageDistribution().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderBackupsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Backup Configurations</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateBackupDialogOpen(true)}
              >
                Create Configuration
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Schedule</TableCell>
                    <TableCell>Destination</TableCell>
                    <TableCell>Last Backup</TableCell>
                    <TableCell>Next Backup</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backupConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">{config.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {config.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {config.schedule.frequency} at {config.schedule.time} {config.schedule.timezone}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={config.destination.type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {config.lastBackup ? new Date(config.lastBackup).toLocaleString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        {config.nextBackup ? new Date(config.nextBackup).toLocaleString() : 'Not scheduled'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={config.status}
                          color={config.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton size="small" onClick={() => handleExecuteBackup(config.id)}>
                            <PlayArrowIcon />
                          </IconButton>
                          <IconButton size="small">
                            <EditIcon />
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
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Recent Backup Jobs</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Job ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backupJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {job.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={job.type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStatusIcon(job.status)}
                          <Chip
                            label={job.status}
                            color={getStatusColor(job.status) as any}
                            size="small"
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        {job.startTime.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {formatDuration(job.startTime, job.endTime)}
                      </TableCell>
                      <TableCell>
                        {formatBytes(job.metadata.backupSize || job.statistics.bytesTransferred)}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={job.progress}
                            sx={{ width: 100 }}
                          />
                          <Typography variant="body2">{job.progress}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedJob(job);
                            setJobDetailsDialogOpen(true);
                          }}
                        >
                          <VisibilityIcon />
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
  );

  const renderRecoveryTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Disaster Recovery Plans</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateRecoveryDialogOpen(true)}
              >
                Create Recovery Plan
              </Button>
            </Box>

            {recoveryPlans.map((plan) => (
              <Accordion key={plan.id}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <RestoreIcon color="primary" />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1">{plan.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        RTO: {plan.objectives.rto}min | RPO: {plan.objectives.rpo}min
                      </Typography>
                    </Box>
                    <Chip
                      label={plan.status}
                      color={plan.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>Description</Typography>
                      <Typography variant="body2" paragraph>{plan.description}</Typography>
                      
                      <Typography variant="subtitle2" gutterBottom>Recovery Objectives</Typography>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">RTO</Typography>
                            <Typography variant="h6">{plan.objectives.rto}min</Typography>
                          </CardContent>
                        </Card>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">RPO</Typography>
                            <Typography variant="h6">{plan.objectives.rpo}min</Typography>
                          </CardContent>
                        </Card>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="caption" color="text.secondary">Availability</Typography>
                            <Typography variant="h6">{plan.objectives.availabilityTarget}%</Typography>
                          </CardContent>
                        </Card>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>Scope</Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">Systems:</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {plan.scope.systems.map((system) => (
                            <Chip key={system} label={system} size="small" />
                          ))}
                        </Box>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">Applications:</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {plan.scope.applications.map((app) => (
                            <Chip key={app} label={app} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </Box>

                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="outlined"
                          startIcon={<PlayArrowIcon />}
                          onClick={() => setTestRecoveryDialogOpen(true)}
                          sx={{ mr: 1 }}
                        >
                          Test Recovery
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          startIcon={<RestoreIcon />}
                        >
                          Execute Recovery
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <BackupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Backup & Recovery
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Comprehensive data protection and disaster recovery management
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Overview" />
          <Tab label="Backups" />
          <Tab label="Recovery" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {renderOverviewTab()}
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        {renderBackupsTab()}
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        {renderRecoveryTab()}
      </TabPanel>

      {renderCreateBackupDialog()}
      {renderJobDetailsDialog()}
    </Paper>
  );
};

export default BackupRecoveryDashboard;