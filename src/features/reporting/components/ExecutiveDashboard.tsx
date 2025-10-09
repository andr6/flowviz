import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Tooltip,
  Button,
  Menu,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Refresh,
  FileDownload,
  Settings,
  Warning,
  CheckCircle,
  Error,
  Info
} from '@mui/icons-material';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { ReportingService } from '../services/ReportingService';
import type { ExecutiveDashboardData, DashboardFilter, SecurityMetric } from '../types/ExecutiveDashboard';

const COLORS = ['#1976d2', '#dc004e', '#ed6c02', '#2e7d32', '#9c27b0', '#00695c'];

interface ExecutiveDashboardProps {
  reportingService: ReportingService;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ reportingService }) => {
  const [dashboardData, setDashboardData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilter>({
    timeRange: '30d',
    severity: [],
    businessUnit: [],
    assetTypes: [],
    complianceFrameworks: []
  });
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    loadDashboardData();
    
    const handleDashboardUpdate = (data: ExecutiveDashboardData) => {
      setDashboardData(data);
      setLoading(false);
    };

    reportingService.on('dashboardUpdated', handleDashboardUpdate);
    
    return () => {
      reportingService.off('dashboardUpdated', handleDashboardUpdate);
    };
  }, [reportingService]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const data = await reportingService.generateExecutiveDashboard(filters);
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof DashboardFilter, value: any) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    reportingService.updateFilters(newFilters);
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'json') => {
    try {
      const blob = await reportingService.exportDashboard(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `executive-dashboard-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
    setExportMenuAnchor(null);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp color="success" />;
      case 'down':
        return <TrendingDown color="error" />;
      default:
        return <TrendingFlat color="action" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'success';
    }
  };

  const MetricCard: React.FC<{ metric: SecurityMetric }> = ({ metric }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography variant="h6" component="div" sx={{ fontSize: '0.9rem', fontWeight: 500 }}>
            {metric.name}
          </Typography>
          <Chip 
            size="small" 
            color={getSeverityColor(metric.severity || 'low') as any}
            label={metric.severity}
          />
        </Box>
        
        <Box display="flex" alignItems="center" mb={1}>
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mr: 1 }}>
            {metric.value}
          </Typography>
          {metric.unit && (
            <Typography variant="body2" color="text.secondary">
              {metric.unit}
            </Typography>
          )}
        </Box>

        {metric.trendPercentage && (
          <Box display="flex" alignItems="center">
            {getTrendIcon(metric.trend)}
            <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
              {metric.trendPercentage.toFixed(1)}% vs previous period
            </Typography>
          </Box>
        )}

        {metric.description && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {metric.description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Executive Security Dashboard</Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (!dashboardData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load dashboard data</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Executive Security Dashboard
        </Typography>
        <Box display="flex" gap={1}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={filters.timeRange}
              label="Time Range"
              onChange={(e) => handleFilterChange('timeRange', e.target.value)}
            >
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
              <MenuItem value="1y">Last Year</MenuItem>
            </Select>
          </FormControl>
          
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh}>
              <Refresh />
            </IconButton>
          </Tooltip>
          
          <Button
            startIcon={<FileDownload />}
            onClick={(e) => setExportMenuAnchor(e.currentTarget)}
          >
            Export
          </Button>
          
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={() => setExportMenuAnchor(null)}
          >
            <MenuItem onClick={() => handleExport('pdf')}>Export as PDF</MenuItem>
            <MenuItem onClick={() => handleExport('excel')}>Export as Excel</MenuItem>
            <MenuItem onClick={() => handleExport('json')}>Export as JSON</MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        {dashboardData.securityMetrics.map((metric) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={metric.id}>
            <MetricCard metric={metric} />
          </Grid>
        ))}
      </Grid>

      {/* Threat Trends Chart */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Threat Trends Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dashboardData.threatTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Area type="monotone" dataKey="criticalThreats" stackId="1" stroke="#dc004e" fill="#dc004e" />
                  <Area type="monotone" dataKey="highThreats" stackId="1" stroke="#ed6c02" fill="#ed6c02" />
                  <Area type="monotone" dataKey="mediumThreats" stackId="1" stroke="#1976d2" fill="#1976d2" />
                  <Area type="monotone" dataKey="lowThreats" stackId="1" stroke="#2e7d32" fill="#2e7d32" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Security Posture
              </Typography>
              <Box mb={2}>
                <Typography variant="h3" color="primary">
                  {dashboardData.securityPosture.overall}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overall Security Score
                </Typography>
              </Box>
              
              {Object.entries(dashboardData.securityPosture.categories).map(([category, score]) => (
                <Box key={category} mb={1}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {category}
                    </Typography>
                    <Typography variant="body2">{score}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={score} sx={{ height: 6, borderRadius: 3 }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* SOC Performance and Threat Landscape */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                SOC Performance Metrics
              </Typography>
              {dashboardData.socPerformance.map((metric) => (
                <Box key={metric.metric} mb={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">{metric.metric}</Typography>
                    <Chip 
                      size="small" 
                      color={metric.status === 'on-track' ? 'success' : metric.status === 'warning' ? 'warning' : 'error'}
                      label={metric.status}
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">
                      Current: {metric.current} {metric.unit}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Target: {metric.target} {metric.unit}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(metric.current / metric.target) * 100} 
                    sx={{ height: 6, borderRadius: 3 }}
                    color={metric.status === 'on-track' ? 'success' : metric.status === 'warning' ? 'warning' : 'error'}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Threats
              </Typography>
              {dashboardData.threatLandscape.topThreats.map((threat, index) => (
                <Box key={threat.name} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">{threat.name}</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2">{threat.count}</Typography>
                    <Chip size="small" label={threat.severity} color={getSeverityColor(threat.severity) as any} />
                    {getTrendIcon(threat.trend)}
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Compliance Status */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Compliance Status
          </Typography>
          <Grid container spacing={3}>
            {dashboardData.complianceStatus.map((compliance) => (
              <Grid item xs={12} md={4} key={compliance.framework}>
                <Box p={2} border={1} borderColor="divider" borderRadius={1}>
                  <Typography variant="subtitle1" gutterBottom>
                    {compliance.framework}
                  </Typography>
                  
                  <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="h4" color="primary" sx={{ mr: 1 }}>
                      {compliance.overallScore}%
                    </Typography>
                    {compliance.overallScore >= 95 ? (
                      <CheckCircle color="success" />
                    ) : compliance.overallScore >= 80 ? (
                      <Warning color="warning" />
                    ) : (
                      <Error color="error" />
                    )}
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Controls: {compliance.controlsCompliant}/{compliance.controlsTotal} compliant
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(compliance.controlsCompliant / compliance.controlsTotal) * 100}
                      sx={{ mt: 1, height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  {compliance.criticalGaps.length > 0 && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Critical Gaps:
                      </Typography>
                      {compliance.criticalGaps.slice(0, 2).map((gap, index) => (
                        <Typography key={index} variant="caption" display="block" color="error">
                          • {gap}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <Box mt={2} textAlign="center">
        <Typography variant="caption" color="text.secondary">
          Last updated: {dashboardData.lastRefresh.toLocaleString()}
        </Typography>
      </Box>
    </Box>
  );
};