import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  LinearProgress,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Alert as MuiAlert,
  Stack,
  Divider,
  Avatar
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignIcon,
  Escalate as EscalateIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { threatFlowTheme } from '../../../shared/theme/threatflow-theme';
import { Alert, TriageRule } from '../services/AlertTriageService';

interface AlertTriageDashboardProps {
  organizationId: string;
  userId: string;
  onAlertSelect?: (alert: Alert) => void;
  onCreateInvestigation?: (alertIds: string[]) => void;
  showActions?: boolean;
  compact?: boolean;
}

interface AlertFilters {
  severity: string[];
  status: string[];
  assignedTo: string[];
  sourceSystem: string[];
  searchTerm: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

interface DashboardMetrics {
  totalAlerts: number;
  newAlerts: number;
  investigating: number;
  resolved: number;
  avgTriageTime: number;
  criticalAlerts: number;
  escalatedAlerts: number;
}

export const AlertTriageDashboard: React.FC<AlertTriageDashboardProps> = ({
  organizationId,
  userId,
  onAlertSelect,
  onCreateInvestigation,
  showActions = true,
  compact = false
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalAlerts: 0,
    newAlerts: 0,
    investigating: 0,
    resolved: 0,
    avgTriageTime: 0,
    criticalAlerts: 0,
    escalatedAlerts: 0
  });
  const [filters, setFilters] = useState<AlertFilters>({
    severity: [],
    status: [],
    assignedTo: [],
    sourceSystem: [],
    searchTerm: '',
    dateRange: { start: null, end: null }
  });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState<'createdAt' | 'severity' | 'priority'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon sx={{ color: threatFlowTheme.colors.status.error.text }} />;
      case 'high':
        return <WarningIcon sx={{ color: threatFlowTheme.colors.status.warning.text }} />;
      case 'medium':
        return <InfoIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />;
      case 'low':
        return <InfoIcon sx={{ color: threatFlowTheme.colors.text.tertiary }} />;
      case 'info':
        return <InfoIcon sx={{ color: threatFlowTheme.colors.text.secondary }} />;
      default:
        return <InfoIcon />;
    }
  };

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return threatFlowTheme.colors.status.error.text;
      case 'high':
        return threatFlowTheme.colors.status.warning.text;
      case 'medium':
        return threatFlowTheme.colors.brand.primary;
      case 'low':
        return threatFlowTheme.colors.text.tertiary;
      case 'info':
        return threatFlowTheme.colors.text.secondary;
      default:
        return threatFlowTheme.colors.text.secondary;
    }
  };

  const getStatusColor = (status: Alert['status']) => {
    switch (status) {
      case 'new':
        return threatFlowTheme.colors.brand.primary;
      case 'investigating':
        return threatFlowTheme.colors.status.warning.text;
      case 'escalated':
        return threatFlowTheme.colors.status.error.text;
      case 'resolved':
        return threatFlowTheme.colors.status.success.text;
      case 'false_positive':
        return threatFlowTheme.colors.text.tertiary;
      default:
        return threatFlowTheme.colors.text.secondary;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      // This would integrate with AlertTriageService
      // For now, simulating with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockAlerts: Alert[] = [
        {
          id: '1',
          organizationId,
          sourceSystem: 'Splunk',
          alertId: 'SPL-001',
          title: 'Suspicious PowerShell Activity',
          description: 'Encoded PowerShell command detected on endpoint DESKTOP-ABC123',
          severity: 'high',
          priority: 2,
          status: 'new',
          rawData: {},
          enrichmentData: {},
          autoTriageScore: 0.85,
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          organizationId,
          sourceSystem: 'QRadar',
          alertId: 'QR-002',
          title: 'Multiple Failed Login Attempts',
          description: 'Brute force attack detected from IP 192.168.1.100',
          severity: 'medium',
          priority: 3,
          status: 'investigating',
          assignedTo: 'analyst1',
          rawData: {},
          enrichmentData: {},
          autoTriageScore: 0.65,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '3',
          organizationId,
          sourceSystem: 'Sentinel',
          alertId: 'SEN-003',
          title: 'Malware Detection',
          description: 'Trojan.Generic detected in email attachment',
          severity: 'critical',
          priority: 1,
          status: 'escalated',
          assignedTo: 'analyst2',
          rawData: {},
          enrichmentData: {},
          autoTriageScore: 0.95,
          createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      setAlerts(mockAlerts);
      
      // Update metrics
      setMetrics({
        totalAlerts: mockAlerts.length,
        newAlerts: mockAlerts.filter(a => a.status === 'new').length,
        investigating: mockAlerts.filter(a => a.status === 'investigating').length,
        resolved: mockAlerts.filter(a => a.status === 'resolved').length,
        avgTriageTime: 12.5,
        criticalAlerts: mockAlerts.filter(a => a.severity === 'critical').length,
        escalatedAlerts: mockAlerts.filter(a => a.status === 'escalated').length
      });
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleAlertAction = async (alertId: string, action: 'assign' | 'escalate' | 'resolve' | 'false_positive') => {
    try {
      // This would integrate with AlertTriageService
      console.log(`Performing ${action} on alert ${alertId}`);
      await loadAlerts(); // Refresh alerts
    } catch (error) {
      console.error(`Failed to ${action} alert:`, error);
    }
  };

  const handleBulkAction = async (action: 'assign' | 'escalate' | 'investigate') => {
    if (selectedAlerts.length === 0) return;
    
    try {
      console.log(`Performing bulk ${action} on alerts:`, selectedAlerts);
      if (action === 'investigate' && onCreateInvestigation) {
        onCreateInvestigation(selectedAlerts);
      }
      setSelectedAlerts([]);
      await loadAlerts();
    } catch (error) {
      console.error(`Failed to perform bulk ${action}:`, error);
    }
  };

  const MetricsCard = ({ title, value, subtitle, icon, color }: any) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ color, fontWeight: 'bold', mb: 0.5 }}>
              {value}
            </Typography>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}20`, color }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  if (compact) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SecurityIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />
            <Typography variant="h6">Alert Triage</Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<NotificationsIcon />}
            onClick={() => window.open('/alerts', '_blank')}
          >
            View Dashboard
          </Button>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: threatFlowTheme.colors.brand.primary }}>
                {metrics.newAlerts}
              </Typography>
              <Typography variant="caption">New</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.warning.text }}>
                {metrics.investigating}
              </Typography>
              <Typography variant="caption">Investigating</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.error.text }}>
                {metrics.criticalAlerts}
              </Typography>
              <Typography variant="caption">Critical</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.success.text }}>
                {metrics.resolved}
              </Typography>
              <Typography variant="caption">Resolved</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SecurityIcon sx={{ color: threatFlowTheme.colors.brand.primary, fontSize: 32 }} />
          <Box>
            <Typography variant="h4">Alert Triage Dashboard</Typography>
            <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
              Prioritize and categorize security alerts across all SIEM platforms
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadAlerts}
            disabled={loading}
          >
            Refresh
          </Button>
          {selectedAlerts.length > 0 && showActions && (
            <>
              <Button
                variant="contained"
                startIcon={<AssignIcon />}
                onClick={() => handleBulkAction('assign')}
              >
                Assign ({selectedAlerts.length})
              </Button>
              <Button
                variant="contained"
                startIcon={<EscalateIcon />}
                onClick={() => handleBulkAction('escalate')}
                sx={{ bgcolor: threatFlowTheme.colors.status.warning.text }}
              >
                Escalate
              </Button>
              <Button
                variant="contained"
                startIcon={<AssessmentIcon />}
                onClick={() => handleBulkAction('investigate')}
                sx={{ bgcolor: threatFlowTheme.colors.brand.primary }}
              >
                Create Investigation
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Metrics Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="New Alerts"
            value={metrics.newAlerts}
            subtitle="Requiring attention"
            icon={<NotificationsIcon />}
            color={threatFlowTheme.colors.brand.primary}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Critical Alerts"
            value={metrics.criticalAlerts}
            subtitle="High priority"
            icon={<ErrorIcon />}
            color={threatFlowTheme.colors.status.error.text}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Investigating"
            value={metrics.investigating}
            subtitle="Active cases"
            icon={<ScheduleIcon />}
            color={threatFlowTheme.colors.status.warning.text}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Avg Triage Time"
            value={`${metrics.avgTriageTime}m`}
            subtitle="Response efficiency"
            icon={<SpeedIcon />}
            color={threatFlowTheme.colors.accent.secure}
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FilterIcon sx={{ color: threatFlowTheme.colors.text.tertiary }} />
          
          <TextField
            size="small"
            placeholder="Search alerts..."
            value={filters.searchTerm}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: threatFlowTheme.colors.text.tertiary, mr: 1 }} />
            }}
            sx={{ minWidth: 200 }}
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              multiple
              value={filters.severity}
              onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value as string[] }))}
            >
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="info">Info</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              multiple
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as string[] }))}
            >
              <MenuItem value="new">New</MenuItem>
              <MenuItem value="investigating">Investigating</MenuItem>
              <MenuItem value="escalated">Escalated</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="false_positive">False Positive</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Alerts Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {showActions && (
                  <TableCell padding="checkbox">
                    {/* Checkbox for select all would go here */}
                  </TableCell>
                )}
                <TableCell>Severity</TableCell>
                <TableCell>Alert</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Triage Score</TableCell>
                <TableCell>Created</TableCell>
                {showActions && <TableCell>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((alert) => (
                <TableRow 
                  key={alert.id}
                  hover
                  selected={selectedAlerts.includes(alert.id)}
                  onClick={() => onAlertSelect?.(alert)}
                  sx={{ cursor: onAlertSelect ? 'pointer' : 'default' }}
                >
                  {showActions && (
                    <TableCell padding="checkbox">
                      {/* Individual checkbox would go here */}
                    </TableCell>
                  )}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getSeverityIcon(alert.severity)}
                      <Chip
                        label={alert.severity.toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: `${getSeverityColor(alert.severity)}20`,
                          color: getSeverityColor(alert.severity),
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {alert.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                        {alert.description}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={alert.sourceSystem}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={alert.status.replace('_', ' ').toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: `${getStatusColor(alert.status)}20`,
                        color: getStatusColor(alert.status)
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {alert.assignedTo ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon sx={{ fontSize: 16 }} />
                        {alert.assignedTo}
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                        Unassigned
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {alert.autoTriageScore && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={alert.autoTriageScore * 100}
                          sx={{ width: 60, height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="body2">
                          {Math.round(alert.autoTriageScore * 100)}%
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatTimeAgo(alert.createdAt)}
                    </Typography>
                  </TableCell>
                  {showActions && (
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Assign">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAlertAction(alert.id, 'assign');
                            }}
                          >
                            <AssignIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Escalate">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAlertAction(alert.id, 'escalate');
                            }}
                          >
                            <EscalateIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Resolve">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAlertAction(alert.id, 'resolve');
                            }}
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={alerts.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>
    </Box>
  );
};