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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  Tabs,
  Tab,
  Alert as MuiAlert,
  Stack,
  Divider,
  Avatar,
  Badge,
  Fab
} from '@mui/material';
import {
  Case as CaseIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Gavel as LegalIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as TaskIcon,
  Comment as CommentIcon,
  Attachment as AttachmentIcon,
  Timeline as TimelineIcon,
  Dashboard as DashboardIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
  Assessment as MetricsIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Timer as TimerIcon,
  Flag as FlagIcon,
  Escalate as EscalateIcon,
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  Stop as StopIcon
} from '@mui/icons-material';
import { threatFlowTheme } from '../../../shared/theme/threatflow-theme';
import { Case, CaseStatus, CaseCategory, CaseTask, CaseMetrics } from '../types/Case';

interface CaseManagementDashboardProps {
  organizationId: string;
  userId: string;
  userRole: string;
  onCaseSelect?: (caseItem: Case) => void;
  onCreateCase?: () => void;
  onEditCase?: (caseId: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

interface CaseFilters {
  status: CaseStatus[];
  category: CaseCategory[];
  severity: string[];
  assignedTo: string[];
  searchTerm: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
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
      id={`case-tabpanel-${index}`}
      aria-labelledby={`case-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const CaseManagementDashboard: React.FC<CaseManagementDashboardProps> = ({
  organizationId,
  userId,
  userRole,
  onCaseSelect,
  onCreateCase,
  onEditCase,
  showActions = true,
  compact = false
}) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [metrics, setMetrics] = useState<CaseMetrics>({
    totalCases: 0,
    openCases: 0,
    resolvedCases: 0,
    avgTimeToResolution: 0,
    avgTimeToFirstResponse: 0,
    slaComplianceRate: 0,
    escalationRate: 0,
    casesByCategory: {} as Record<CaseCategory, number>,
    casesBySeverity: {},
    casesByStatus: {} as Record<CaseStatus, number>,
    topInvestigators: [],
    trendsOverTime: []
  });
  const [filters, setFilters] = useState<CaseFilters>({
    status: [],
    category: [],
    severity: [],
    assignedTo: [],
    searchTerm: '',
    dateRange: { start: null, end: null }
  });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority' | 'updatedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const getSeverityIcon = (severity: Case['severity']) => {
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

  const getSeverityColor = (severity: Case['severity']) => {
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

  const getStatusColor = (status: CaseStatus) => {
    switch (status) {
      case 'new':
        return threatFlowTheme.colors.brand.primary;
      case 'assigned':
      case 'in_progress':
        return threatFlowTheme.colors.status.warning.text;
      case 'escalated':
        return threatFlowTheme.colors.status.error.text;
      case 'resolved':
      case 'closed':
        return threatFlowTheme.colors.status.success.text;
      case 'waiting_for_info':
        return threatFlowTheme.colors.text.tertiary;
      case 'cancelled':
        return threatFlowTheme.colors.text.disabled;
      default:
        return threatFlowTheme.colors.text.secondary;
    }
  };

  const getCategoryIcon = (category: CaseCategory) => {
    switch (category) {
      case 'malware':
        return <SecurityIcon />;
      case 'phishing':
        return <WarningIcon />;
      case 'data_breach':
        return <ErrorIcon />;
      case 'unauthorized_access':
        return <PersonIcon />;
      case 'denial_of_service':
        return <StopIcon />;
      case 'insider_threat':
        return <PersonIcon />;
      case 'policy_violation':
        return <LegalIcon />;
      case 'system_compromise':
        return <SecurityIcon />;
      case 'network_intrusion':
        return <SecurityIcon />;
      case 'social_engineering':
        return <PersonIcon />;
      case 'fraud':
        return <ErrorIcon />;
      case 'compliance_violation':
        return <LegalIcon />;
      default:
        return <CaseIcon />;
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

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      // This would integrate with CaseManagementService
      // For now, simulating with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockCases: Case[] = [
        {
          id: '1',
          organizationId,
          caseNumber: 'CASE-001',
          title: 'Suspicious Email Campaign Investigation',
          description: 'Investigation into coordinated phishing campaign targeting multiple employees',
          severity: 'high',
          priority: 2,
          status: 'in_progress',
          category: 'phishing',
          assignedTo: 'analyst1',
          createdBy: 'analyst2',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
          childCaseIds: [],
          relatedCaseIds: [],
          linkedAlertIds: ['alert-1', 'alert-2'],
          linkedInvestigationIds: [],
          evidence: [],
          artifacts: [],
          indicators: [],
          tasks: [],
          communications: [],
          stakeholders: [],
          complianceFlags: [],
          legalHold: false,
          tags: ['phishing', 'email', 'campaign'],
          customFields: {},
          mitreAttackTechniques: ['T1566.001'],
          affectedSystems: ['email-server-01'],
          escalationLevel: 1
        },
        {
          id: '2',
          organizationId,
          caseNumber: 'CASE-002',
          title: 'Data Exfiltration Incident',
          description: 'Unauthorized access and potential data theft from customer database',
          severity: 'critical',
          priority: 1,
          status: 'escalated',
          category: 'data_breach',
          assignedTo: 'senior-analyst1',
          teamAssigned: 'incident-response',
          createdBy: 'analyst3',
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
          childCaseIds: [],
          relatedCaseIds: [],
          linkedAlertIds: ['alert-3', 'alert-4', 'alert-5'],
          linkedInvestigationIds: ['inv-001'],
          evidence: [],
          artifacts: [],
          indicators: [],
          tasks: [],
          communications: [],
          stakeholders: [],
          complianceFlags: ['GDPR', 'SOX'],
          legalHold: true,
          tags: ['data-breach', 'exfiltration', 'database'],
          customFields: {},
          mitreAttackTechniques: ['T1041', 'T1048'],
          affectedSystems: ['db-server-prod'],
          escalationLevel: 2
        },
        {
          id: '3',
          organizationId,
          caseNumber: 'CASE-003',
          title: 'Malware Detection on Endpoint',
          description: 'Trojan detected on employee workstation, potential lateral movement',
          severity: 'medium',
          priority: 3,
          status: 'assigned',
          category: 'malware',
          assignedTo: 'analyst2',
          createdBy: 'automated-system',
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
          childCaseIds: [],
          relatedCaseIds: [],
          linkedAlertIds: ['alert-6'],
          linkedInvestigationIds: [],
          evidence: [],
          artifacts: [],
          indicators: [],
          tasks: [],
          communications: [],
          stakeholders: [],
          complianceFlags: [],
          legalHold: false,
          tags: ['malware', 'endpoint', 'trojan'],
          customFields: {},
          mitreAttackTechniques: ['T1055'],
          affectedSystems: ['DESKTOP-DEV123'],
          escalationLevel: 0
        }
      ];

      setCases(mockCases);
      
      // Update metrics
      setMetrics({
        totalCases: mockCases.length,
        openCases: mockCases.filter(c => !['resolved', 'closed', 'cancelled'].includes(c.status)).length,
        resolvedCases: mockCases.filter(c => c.status === 'resolved').length,
        avgTimeToResolution: 24.5,
        avgTimeToFirstResponse: 2.3,
        slaComplianceRate: 85,
        escalationRate: 15,
        casesByCategory: {
          phishing: 1,
          data_breach: 1,
          malware: 1,
        } as Record<CaseCategory, number>,
        casesBySeverity: {
          critical: 1,
          high: 1,
          medium: 1,
          low: 0,
          info: 0
        },
        casesByStatus: {
          new: 0,
          assigned: 1,
          in_progress: 1,
          waiting_for_info: 0,
          escalated: 1,
          resolved: 0,
          closed: 0,
          cancelled: 0
        } as Record<CaseStatus, number>,
        topInvestigators: [
          { userId: 'analyst1', caseCount: 5, avgResolutionTime: 20.5 },
          { userId: 'analyst2', caseCount: 3, avgResolutionTime: 25.0 },
          { userId: 'analyst3', caseCount: 4, avgResolutionTime: 18.2 }
        ],
        trendsOverTime: []
      });
    } catch (error) {
      console.error('Failed to load cases:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleCaseAction = async (caseId: string, action: 'assign' | 'escalate' | 'resolve' | 'close') => {
    try {
      // This would integrate with CaseManagementService
      console.log(`Performing ${action} on case ${caseId}`);
      await loadCases(); // Refresh cases
    } catch (error) {
      console.error(`Failed to ${action} case:`, error);
    }
  };

  const MetricsCard = ({ title, value, subtitle, icon, color, trend }: any) => (
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
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                <TrendingUpIcon sx={{ fontSize: 16, color: trend > 0 ? threatFlowTheme.colors.status.success.text : threatFlowTheme.colors.status.error.text }} />
                <Typography variant="caption" sx={{ color: trend > 0 ? threatFlowTheme.colors.status.success.text : threatFlowTheme.colors.status.error.text }}>
                  {trend > 0 ? '+' : ''}{trend}%
                </Typography>
              </Box>
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
            <CaseIcon sx={{ color: threatFlowTheme.colors.brand.primary }} />
            <Typography variant="h6">Case Management</Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DashboardIcon />}
            onClick={() => window.open('/cases', '_blank')}
          >
            View Dashboard
          </Button>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: threatFlowTheme.colors.brand.primary }}>
                {metrics.openCases}
              </Typography>
              <Typography variant="caption">Open</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.error.text }}>
                {metrics.casesByStatus.escalated || 0}
              </Typography>
              <Typography variant="caption">Escalated</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.success.text }}>
                {metrics.resolvedCases}
              </Typography>
              <Typography variant="caption">Resolved</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: threatFlowTheme.colors.accent.secure }}>
                {Math.round(metrics.slaComplianceRate)}%
              </Typography>
              <Typography variant="caption">SLA</Typography>
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
          <CaseIcon sx={{ color: threatFlowTheme.colors.brand.primary, fontSize: 32 }} />
          <Box>
            <Typography variant="h4">Case Management</Typography>
            <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
              Comprehensive incident response workflow and case tracking
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadCases}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
          >
            Export
          </Button>
          {showActions && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => onCreateCase ? onCreateCase() : setCreateDialogOpen(true)}
            >
              Create Case
            </Button>
          )}
        </Box>
      </Box>

      {/* Metrics Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Open Cases"
            value={metrics.openCases}
            subtitle="Active investigations"
            icon={<CaseIcon />}
            color={threatFlowTheme.colors.brand.primary}
            trend={5}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="SLA Compliance"
            value={`${Math.round(metrics.slaComplianceRate)}%`}
            subtitle="On-time resolution"
            icon={<TimerIcon />}
            color={threatFlowTheme.colors.status.success.text}
            trend={-2}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Avg Resolution"
            value={`${metrics.avgTimeToResolution}h`}
            subtitle="Time to close"
            icon={<SpeedIcon />}
            color={threatFlowTheme.colors.accent.secure}
            trend={-8}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Escalation Rate"
            value={`${Math.round(metrics.escalationRate)}%`}
            subtitle="Cases requiring escalation"
            icon={<EscalateIcon />}
            color={threatFlowTheme.colors.status.warning.text}
            trend={3}
          />
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
            <Tab icon={<CaseIcon />} label="Active Cases" />
            <Tab icon={<MetricsIcon />} label="Analytics" />
            <Tab icon={<TimelineIcon />} label="Workflow" />
            <Tab icon={<AssignmentIcon />} label="Templates" />
          </Tabs>
        </Box>

        <TabPanel value={selectedTab} index={0}>
          {/* Filters */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <FilterIcon sx={{ color: threatFlowTheme.colors.text.tertiary }} />
            
            <TextField
              size="small"
              placeholder="Search cases..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: threatFlowTheme.colors.text.tertiary, mr: 1 }} />
              }}
              sx={{ minWidth: 200 }}
            />

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                multiple
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as CaseStatus[] }))}
              >
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="assigned">Assigned</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="escalated">Escalated</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Category</InputLabel>
              <Select
                multiple
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as CaseCategory[] }))}
              >
                <MenuItem value="malware">Malware</MenuItem>
                <MenuItem value="phishing">Phishing</MenuItem>
                <MenuItem value="data_breach">Data Breach</MenuItem>
                <MenuItem value="unauthorized_access">Unauthorized Access</MenuItem>
                <MenuItem value="system_compromise">System Compromise</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Loading */}
          {loading && <LinearProgress sx={{ mb: 2 }} />}

          {/* Cases Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Case #</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>SLA</TableCell>
                  {showActions && <TableCell>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {cases.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((caseItem) => (
                  <TableRow 
                    key={caseItem.id}
                    hover
                    onClick={() => onCaseSelect?.(caseItem)}
                    sx={{ cursor: onCaseSelect ? 'pointer' : 'default' }}
                  >
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: threatFlowTheme.colors.brand.primary }}>
                        {caseItem.caseNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {caseItem.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                          {caseItem.description.length > 60 
                            ? `${caseItem.description.substring(0, 60)}...`
                            : caseItem.description
                          }
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getCategoryIcon(caseItem.category)}
                        <Chip
                          label={caseItem.category.replace('_', ' ').toUpperCase()}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getSeverityIcon(caseItem.severity)}
                        <Chip
                          label={caseItem.severity.toUpperCase()}
                          size="small"
                          sx={{
                            bgcolor: `${getSeverityColor(caseItem.severity)}20`,
                            color: getSeverityColor(caseItem.severity),
                            fontWeight: 'bold'
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={caseItem.status.replace('_', ' ').toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: `${getStatusColor(caseItem.status)}20`,
                          color: getStatusColor(caseItem.status)
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {caseItem.assignedTo ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon sx={{ fontSize: 16 }} />
                          {caseItem.assignedTo}
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                          Unassigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatTimeAgo(caseItem.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {caseItem.slaDeadline && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TimerIcon sx={{ fontSize: 16 }} />
                          <Typography variant="body2">
                            {formatTimeAgo(caseItem.slaDeadline)}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    {showActions && (
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditCase?.(caseItem.id);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Escalate">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCaseAction(caseItem.id, 'escalate');
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
                                handleCaseAction(caseItem.id, 'resolve');
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
            count={cases.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </TabPanel>

        <TabPanel value={selectedTab} index={1}>
          <Typography variant="h6" sx={{ mb: 2 }}>Case Analytics</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Cases by Category</Typography>
                {/* Chart would go here */}
                <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                    Chart visualization would be implemented here
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Resolution Trends</Typography>
                {/* Chart would go here */}
                <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                    Chart visualization would be implemented here
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={selectedTab} index={2}>
          <Typography variant="h6" sx={{ mb: 2 }}>Workflow Management</Typography>
          <Paper sx={{ p: 3 }}>
            <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
              Workflow configuration and management interface would be implemented here
            </Typography>
          </Paper>
        </TabPanel>

        <TabPanel value={selectedTab} index={3}>
          <Typography variant="h6" sx={{ mb: 2 }}>Case Templates</Typography>
          <Paper sx={{ p: 3 }}>
            <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
              Case template management interface would be implemented here
            </Typography>
          </Paper>
        </TabPanel>
      </Paper>

      {/* Floating Action Button */}
      {showActions && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => onCreateCase ? onCreateCase() : setCreateDialogOpen(true)}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
};