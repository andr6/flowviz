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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  IconButton,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import {
  Policy as PolicyIcon,
  Schedule as ScheduleIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Gavel as GavelIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { DataManagementService } from '../services/DataManagementService';
import type { RetentionPolicy, RetentionExecution } from '../types/DataManagement';

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

export const DataRetentionDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [executions, setExecutions] = useState<RetentionExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<RetentionPolicy | null>(null);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [executionDialogOpen, setExecutionDialogOpen] = useState(false);
  
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    dataClassification: ['internal'],
    retentionPeriod: { value: 7, unit: 'years' as const },
    archivalPolicy: {
      enabled: true,
      archiveAfter: { value: 1, unit: 'years' as const },
      archiveLocation: 's3://archive-bucket',
      compressionLevel: 9
    },
    deletionPolicy: {
      enabled: true,
      softDelete: true,
      purgeAfter: { value: 90, unit: 'days' as const },
      approval: { required: true, approvers: ['data-protection-officer'] }
    },
    legalHold: { enabled: false },
    compliance: {
      regulations: ['SOX'],
      auditTrail: true,
      encryption: true,
      anonymization: false
    }
  });

  const dataManagementService = new DataManagementService();

  useEffect(() => {
    loadPolicies();
    loadExecutions();
  }, []);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      // Simulate API call - in real implementation this would fetch from the service
      const mockPolicies: RetentionPolicy[] = [
        {
          id: 'policy-1',
          name: 'Security Logs Retention',
          dataClassification: ['confidential', 'internal'],
          retentionPeriod: { value: 7, unit: 'years' },
          archivalPolicy: {
            enabled: true,
            archiveAfter: { value: 1, unit: 'years' },
            archiveLocation: 's3://archive-security-logs',
            compressionLevel: 9
          },
          deletionPolicy: {
            enabled: true,
            softDelete: true,
            purgeAfter: { value: 90, unit: 'days' },
            approval: { required: true, approvers: ['security-admin', 'compliance-officer'] }
          },
          legalHold: { enabled: false },
          compliance: {
            regulations: ['SOX', 'GDPR', 'PCI-DSS'],
            auditTrail: true,
            encryption: true,
            anonymization: false
          },
          exceptions: [],
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-11-01'),
          lastApplied: new Date('2024-11-30'),
          status: 'active'
        },
        {
          id: 'policy-2',
          name: 'User Activity Logs',
          dataClassification: ['internal', 'public'],
          retentionPeriod: { value: 3, unit: 'years' },
          archivalPolicy: {
            enabled: true,
            archiveAfter: { value: 6, unit: 'months' },
            archiveLocation: 's3://archive-user-logs',
            compressionLevel: 6
          },
          deletionPolicy: {
            enabled: true,
            softDelete: false,
            purgeAfter: { value: 30, unit: 'days' },
            approval: { required: false, approvers: [] }
          },
          legalHold: { enabled: false },
          compliance: {
            regulations: ['GDPR', 'CCPA'],
            auditTrail: true,
            encryption: true,
            anonymization: true
          },
          exceptions: [],
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date('2024-10-15'),
          lastApplied: new Date('2024-11-29'),
          status: 'active'
        }
      ];
      setPolicies(mockPolicies);
    } catch (error) {
      console.error('Error loading policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExecutions = async () => {
    try {
      // Simulate API call for recent executions
      const mockExecutions: RetentionExecution[] = [
        {
          id: 'exec-1',
          policyId: 'policy-1',
          tenantId: 'tenant-1',
          status: 'completed',
          startTime: new Date('2024-11-30T02:00:00Z'),
          endTime: new Date('2024-11-30T02:45:00Z'),
          recordsProcessed: 125000,
          recordsArchived: 45000,
          recordsDeleted: 1200,
          bytesProcessed: 850000000,
          auditLog: [
            {
              timestamp: new Date('2024-11-30T02:00:00Z'),
              action: 'archive',
              recordId: 'log-12345',
              reason: 'Retention period exceeded',
              metadata: { originalLocation: '/logs/2023/', archiveLocation: 's3://archive/' }
            }
          ]
        },
        {
          id: 'exec-2',
          policyId: 'policy-2',
          tenantId: 'tenant-1',
          status: 'running',
          startTime: new Date('2024-12-01T01:00:00Z'),
          recordsProcessed: 45000,
          recordsArchived: 15000,
          recordsDeleted: 0,
          bytesProcessed: 320000000,
          auditLog: []
        }
      ];
      setExecutions(mockExecutions);
    } catch (error) {
      console.error('Error loading executions:', error);
    }
  };

  const handleCreatePolicy = async () => {
    setLoading(true);
    try {
      // In real implementation, this would call the service
      const newPolicyObj: RetentionPolicy = {
        ...newPolicy,
        id: `policy-${Date.now()}`,
        exceptions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active'
      };
      setPolicies([...policies, newPolicyObj]);
      setCreateDialogOpen(false);
      setNewPolicy({
        ...newPolicy,
        name: ''
      });
    } catch (error) {
      console.error('Error creating policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePolicy = async (policyId: string) => {
    try {
      // Simulate policy execution
      const execution: RetentionExecution = {
        id: `exec-${Date.now()}`,
        policyId,
        tenantId: 'tenant-1',
        status: 'running',
        startTime: new Date(),
        recordsProcessed: 0,
        recordsArchived: 0,
        recordsDeleted: 0,
        bytesProcessed: 0,
        auditLog: []
      };
      setExecutions([execution, ...executions]);
    } catch (error) {
      console.error('Error executing policy:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon color="success" />;
      case 'inactive':
        return <StopIcon color="action" />;
      case 'suspended':
        return <WarningIcon color="warning" />;
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
        return 'default';
      default:
        return 'info';
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getPolicyComplianceData = () => {
    const compliance: Record<string, number> = {};
    policies.forEach(policy => {
      policy.compliance.regulations.forEach(reg => {
        compliance[reg] = (compliance[reg] || 0) + 1;
      });
    });
    return Object.entries(compliance).map(([regulation, count]) => ({
      regulation,
      count,
      fill: getRandomColor()
    }));
  };

  const getRandomColor = () => {
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getRetentionStatsData = () => {
    return [
      { period: 'Last 30 days', archived: 125000, deleted: 5200, retained: 2340000 },
      { period: 'Last 90 days', archived: 450000, deleted: 18500, retained: 6780000 },
      { period: 'Last 6 months', archived: 1200000, deleted: 78000, retained: 15600000 },
      { period: 'Last year', archived: 2800000, deleted: 185000, retained: 34500000 }
    ];
  };

  const renderCreatePolicyDialog = () => (
    <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Create Data Retention Policy</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Policy Name"
            value={newPolicy.name}
            onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Data Classification</InputLabel>
            <Select
              multiple
              value={newPolicy.dataClassification}
              onChange={(e) => setNewPolicy({
                ...newPolicy,
                dataClassification: e.target.value as string[]
              })}
              label="Data Classification"
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="internal">Internal</MenuItem>
              <MenuItem value="confidential">Confidential</MenuItem>
              <MenuItem value="restricted">Restricted</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
            Retention Period
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Value"
                value={newPolicy.retentionPeriod.value}
                onChange={(e) => setNewPolicy({
                  ...newPolicy,
                  retentionPeriod: { ...newPolicy.retentionPeriod, value: parseInt(e.target.value) }
                })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={newPolicy.retentionPeriod.unit}
                  onChange={(e) => setNewPolicy({
                    ...newPolicy,
                    retentionPeriod: { ...newPolicy.retentionPeriod, unit: e.target.value as any }
                  })}
                  label="Unit"
                >
                  <MenuItem value="days">Days</MenuItem>
                  <MenuItem value="months">Months</MenuItem>
                  <MenuItem value="years">Years</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
            Archival Policy
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={newPolicy.archivalPolicy.enabled}
                onChange={(e) => setNewPolicy({
                  ...newPolicy,
                  archivalPolicy: { ...newPolicy.archivalPolicy, enabled: e.target.checked }
                })}
              />
            }
            label="Enable Archival"
            sx={{ mb: 2 }}
          />
          
          {newPolicy.archivalPolicy.enabled && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Archive After (Value)"
                  value={newPolicy.archivalPolicy.archiveAfter.value}
                  onChange={(e) => setNewPolicy({
                    ...newPolicy,
                    archivalPolicy: {
                      ...newPolicy.archivalPolicy,
                      archiveAfter: { ...newPolicy.archivalPolicy.archiveAfter, value: parseInt(e.target.value) }
                    }
                  })}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={newPolicy.archivalPolicy.archiveAfter.unit}
                    onChange={(e) => setNewPolicy({
                      ...newPolicy,
                      archivalPolicy: {
                        ...newPolicy.archivalPolicy,
                        archiveAfter: { ...newPolicy.archivalPolicy.archiveAfter, unit: e.target.value as any }
                      }
                    })}
                    label="Unit"
                  >
                    <MenuItem value="days">Days</MenuItem>
                    <MenuItem value="months">Months</MenuItem>
                    <MenuItem value="years">Years</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Archive Location"
                  value={newPolicy.archivalPolicy.archiveLocation}
                  onChange={(e) => setNewPolicy({
                    ...newPolicy,
                    archivalPolicy: { ...newPolicy.archivalPolicy, archiveLocation: e.target.value }
                  })}
                />
              </Grid>
            </Grid>
          )}

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
            Compliance
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Regulations</InputLabel>
            <Select
              multiple
              value={newPolicy.compliance.regulations}
              onChange={(e) => setNewPolicy({
                ...newPolicy,
                compliance: { ...newPolicy.compliance, regulations: e.target.value as string[] }
              })}
              label="Regulations"
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              <MenuItem value="SOX">SOX</MenuItem>
              <MenuItem value="GDPR">GDPR</MenuItem>
              <MenuItem value="CCPA">CCPA</MenuItem>
              <MenuItem value="HIPAA">HIPAA</MenuItem>
              <MenuItem value="PCI-DSS">PCI-DSS</MenuItem>
              <MenuItem value="ISO27001">ISO 27001</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={newPolicy.compliance.auditTrail}
                onChange={(e) => setNewPolicy({
                  ...newPolicy,
                  compliance: { ...newPolicy.compliance, auditTrail: e.target.checked }
                })}
              />
            }
            label="Audit Trail"
          />
          <FormControlLabel
            control={
              <Switch
                checked={newPolicy.compliance.encryption}
                onChange={(e) => setNewPolicy({
                  ...newPolicy,
                  compliance: { ...newPolicy.compliance, encryption: e.target.checked }
                })}
              />
            }
            label="Encryption Required"
          />
          <FormControlLabel
            control={
              <Switch
                checked={newPolicy.compliance.anonymization}
                onChange={(e) => setNewPolicy({
                  ...newPolicy,
                  compliance: { ...newPolicy.compliance, anonymization: e.target.checked }
                })}
              />
            }
            label="Anonymization"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
        <Button
          onClick={handleCreatePolicy}
          variant="contained"
          disabled={!newPolicy.name || loading}
          startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
        >
          {loading ? 'Creating...' : 'Create Policy'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderPolicyDetailsDialog = () => (
    <Dialog
      open={policyDialogOpen}
      onClose={() => setPolicyDialogOpen(false)}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>Policy Details: {selectedPolicy?.name}</DialogTitle>
      <DialogContent>
        {selectedPolicy && (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Configuration</Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Data Classification:</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                        {selectedPolicy.dataClassification.map((classification) => (
                          <Chip key={classification} label={classification} size="small" />
                        ))}
                      </Box>
                    </Box>
                    <Typography variant="subtitle2">
                      Retention Period: {selectedPolicy.retentionPeriod.value} {selectedPolicy.retentionPeriod.unit}
                    </Typography>
                    <Typography variant="subtitle2">
                      Status: <Chip label={selectedPolicy.status} color={getStatusColor(selectedPolicy.status) as any} size="small" />
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Compliance</Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Regulations:</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                        {selectedPolicy.compliance.regulations.map((regulation) => (
                          <Chip key={regulation} label={regulation} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                    <FormControlLabel
                      control={<Switch checked={selectedPolicy.compliance.auditTrail} disabled />}
                      label="Audit Trail"
                    />
                    <FormControlLabel
                      control={<Switch checked={selectedPolicy.compliance.encryption} disabled />}
                      label="Encryption"
                    />
                    <FormControlLabel
                      control={<Switch checked={selectedPolicy.compliance.anonymization} disabled />}
                      label="Anonymization"
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Execution Timeline</Typography>
                    <Stepper orientation="vertical">
                      <Step completed>
                        <StepLabel>Data Collection</StepLabel>
                        <StepContent>
                          <Typography>Identify data matching classification criteria</Typography>
                        </StepContent>
                      </Step>
                      {selectedPolicy.archivalPolicy.enabled && (
                        <Step completed>
                          <StepLabel>Archival</StepLabel>
                          <StepContent>
                            <Typography>
                              Archive data after {selectedPolicy.archivalPolicy.archiveAfter.value} {selectedPolicy.archivalPolicy.archiveAfter.unit}
                            </Typography>
                          </StepContent>
                        </Step>
                      )}
                      <Step>
                        <StepLabel>Deletion</StepLabel>
                        <StepContent>
                          <Typography>
                            {selectedPolicy.deletionPolicy.softDelete ? 'Soft delete' : 'Permanent deletion'} after retention period
                          </Typography>
                        </StepContent>
                      </Step>
                    </Stepper>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setPolicyDialogOpen(false)}>Close</Button>
        <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={() => selectedPolicy && handleExecutePolicy(selectedPolicy.id)}>
          Execute Now
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderPoliciesTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Data Retention Policies</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create Policy
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
                      <TableCell>Policy Name</TableCell>
                      <TableCell>Data Classification</TableCell>
                      <TableCell>Retention Period</TableCell>
                      <TableCell>Compliance</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Last Applied</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {policies.map((policy) => (
                      <TableRow key={policy.id}>
                        <TableCell>
                          <Typography variant="subtitle2">{policy.name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {policy.dataClassification.map((classification) => (
                              <Chip key={classification} label={classification} size="small" />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {policy.retentionPeriod.value} {policy.retentionPeriod.unit}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {policy.compliance.regulations.slice(0, 2).map((regulation) => (
                              <Chip key={regulation} label={regulation} size="small" variant="outlined" />
                            ))}
                            {policy.compliance.regulations.length > 2 && (
                              <Chip label={`+${policy.compliance.regulations.length - 2}`} size="small" variant="outlined" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStatusIcon(policy.status)}
                            <Chip
                              label={policy.status}
                              color={getStatusColor(policy.status) as any}
                              size="small"
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          {policy.lastApplied ? new Date(policy.lastApplied).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedPolicy(policy);
                                setPolicyDialogOpen(true);
                              }}
                            >
                              <VisibilityIcon />
                            </IconButton>
                            <IconButton size="small">
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleExecutePolicy(policy.id)}
                            >
                              <PlayArrowIcon />
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

  const renderExecutionsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Recent Executions</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Execution ID</TableCell>
                    <TableCell>Policy</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Records Processed</TableCell>
                    <TableCell>Actions Taken</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {executions.map((execution) => (
                    <TableRow key={execution.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {execution.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {policies.find(p => p.id === execution.policyId)?.name || 'Unknown Policy'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={execution.status}
                          color={
                            execution.status === 'completed' ? 'success' :
                            execution.status === 'running' ? 'primary' :
                            execution.status === 'failed' ? 'error' : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(execution.startTime).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {execution.endTime ? 
                          `${Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 60000)}m` : 
                          execution.status === 'running' ? 'In progress' : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {execution.recordsProcessed.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {execution.recordsArchived > 0 && (
                            <Chip
                              icon={<ArchiveIcon />}
                              label={execution.recordsArchived.toLocaleString()}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          {execution.recordsDeleted > 0 && (
                            <Chip
                              icon={<DeleteIcon />}
                              label={execution.recordsDeleted.toLocaleString()}
                              size="small"
                              variant="outlined"
                              color="error"
                            />
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
  );

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Policy Summary</Typography>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h3" color="primary">
                {policies.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Policies
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="success.main">
                  {policies.filter(p => p.status === 'active').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Active
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="warning.main">
                  {policies.filter(p => p.status === 'suspended').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Suspended
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  {policies.filter(p => p.status === 'inactive').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Inactive
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Compliance Coverage</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={getPolicyComplianceData()}
                  dataKey="count"
                  nameKey="regulation"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label={({ regulation, count }) => `${regulation}: ${count}`}
                >
                  {getPolicyComplianceData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Recent Activity</Typography>
            <List>
              {executions.slice(0, 3).map((execution, index) => (
                <ListItem key={execution.id}>
                  <ListItemIcon>
                    {execution.status === 'completed' ? (
                      <CheckCircleIcon color="success" />
                    ) : execution.status === 'running' ? (
                      <CircularProgress size={20} />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={`Policy execution ${execution.status}`}
                    secondary={`${execution.recordsProcessed.toLocaleString()} records • ${new Date(execution.startTime).toLocaleString()}`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Retention Statistics</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getRetentionStatsData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="archived" stackId="a" fill="#82ca9d" name="Archived" />
                <Bar dataKey="deleted" stackId="a" fill="#ff7300" name="Deleted" />
                <Bar dataKey="retained" stackId="a" fill="#8884d8" name="Retained" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <PolicyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Data Retention Policies
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Automated cleanup based on data classification and compliance requirements
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Overview" />
          <Tab label="Policies" />
          <Tab label="Executions" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {renderOverviewTab()}
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        {renderPoliciesTab()}
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        {renderExecutionsTab()}
      </TabPanel>

      {renderCreatePolicyDialog()}
      {renderPolicyDetailsDialog()}
    </Paper>
  );
};

export default DataRetentionDashboard;