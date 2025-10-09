import {
  Security,
  Warning,
  TrendingUp,
  TrendingDown,
  Shield,
  Timeline,
  Refresh,
  OpenInNew,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { threatFlowTheme } from '../../../shared/theme/threatflow-theme';
import { useAuth } from '../../auth/context/AuthContext';

interface SOCMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  severity: 'info' | 'warning' | 'error' | 'success';
  description: string;
  lastUpdated: string;
}

interface AlertSummary {
  total: number;
  new: number;
  investigating: number;
  escalated: number;
  resolved: number;
  falsePositive: number;
  avgResolutionTime: number;
  criticalAlerts: number;
  highPriorityAlerts: number;
}

interface ThreatIntelSummary {
  activeFeedsCount: number;
  totalIndicators: number;
  newIndicators24h: number;
  highConfidenceIndicators: number;
  feedsWithErrors: number;
  lastSyncTime: string;
}

interface SOCDashboardProps {
  organizationId: string;
  refreshInterval?: number; // minutes
}

export const SOCDashboard: React.FC<SOCDashboardProps> = ({
  organizationId,
  refreshInterval = 5
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [metrics, setMetrics] = useState<SOCMetric[]>([]);
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [threatIntel, setThreatIntel] = useState<ThreatIntelSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sample data for demonstration - in real implementation would fetch from API
  useEffect(() => {
    loadDashboardData();
    
    // Set up auto-refresh
    const interval = setInterval(() => {
      loadDashboardData();
    }, refreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [organizationId, refreshInterval]);

  const loadDashboardData = async () => {
    try {
      setError(null);
      
      // In real implementation, these would be API calls
      await Promise.all([
        loadSOCMetrics(),
        loadAlertSummary(),
        loadThreatIntelSummary()
      ]);
      
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadSOCMetrics = async () => {
    // Simulated metrics - replace with actual API call
    const mockMetrics: SOCMetric[] = [
      {
        id: 'mttr',
        name: 'Mean Time to Resolution',
        value: 4.2,
        unit: 'hours',
        trend: 'down',
        trendPercentage: -12.5,
        severity: 'success',
        description: 'Average time from alert creation to resolution',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'alert_volume',
        name: 'Alert Volume (24h)',
        value: 247,
        unit: 'alerts',
        trend: 'up',
        trendPercentage: 18.3,
        severity: 'warning',
        description: 'Total alerts received in last 24 hours',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'threat_score',
        name: 'Threat Score',
        value: 67,
        unit: '/100',
        trend: 'stable',
        trendPercentage: 2.1,
        severity: 'warning',
        description: 'Composite threat assessment score',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'siem_health',
        name: 'SIEM Health',
        value: 98.7,
        unit: '%',
        trend: 'up',
        trendPercentage: 1.2,
        severity: 'success',
        description: 'SIEM system availability and performance',
        lastUpdated: new Date().toISOString()
      }
    ];
    
    setMetrics(mockMetrics);
  };

  const loadAlertSummary = async () => {
    // Simulated alert data - replace with actual API call
    const mockAlerts: AlertSummary = {
      total: 247,
      new: 23,
      investigating: 45,
      escalated: 8,
      resolved: 165,
      falsePositive: 6,
      avgResolutionTime: 4.2,
      criticalAlerts: 3,
      highPriorityAlerts: 12
    };
    
    setAlertSummary(mockAlerts);
  };

  const loadThreatIntelSummary = async () => {
    // Simulated threat intel data - replace with actual API call
    const mockThreatIntel: ThreatIntelSummary = {
      activeFeedsCount: 7,
      totalIndicators: 45782,
      newIndicators24h: 234,
      highConfidenceIndicators: 12456,
      feedsWithErrors: 1,
      lastSyncTime: new Date(Date.now() - 15 * 60 * 1000).toISOString()
    };
    
    setThreatIntel(mockThreatIntel);
  };

  const handleManualRefresh = () => {
    setLoading(true);
    loadDashboardData();
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp sx={{ fontSize: 16 }} />;
      case 'down': return <TrendingDown sx={{ fontSize: 16 }} />;
      default: return <Timeline sx={{ fontSize: 16 }} />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', isGoodWhenUp: boolean = true) => {
    if (trend === 'stable') {return threatFlowTheme.colors.text.tertiary;}
    const isPositive = (trend === 'up' && isGoodWhenUp) || (trend === 'down' && !isGoodWhenUp);
    return isPositive ? threatFlowTheme.colors.status.success : threatFlowTheme.colors.status.warning;
  };

  const getMetricSeverityColor = (severity: SOCMetric['severity']) => {
    switch (severity) {
      case 'error': return threatFlowTheme.colors.status.error;
      case 'warning': return threatFlowTheme.colors.status.warning;
      case 'success': return threatFlowTheme.colors.status.success;
      default: return threatFlowTheme.colors.status.info;
    }
  };

  if (loading && metrics.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography sx={{ color: threatFlowTheme.colors.text.secondary }}>
          Loading SOC dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: threatFlowTheme.colors.background.primary }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4 
      }}>
        <Box>
          <Typography 
            variant="h4" 
            sx={{ 
              color: threatFlowTheme.colors.text.primary,
              fontWeight: threatFlowTheme.typography.fontWeight.bold,
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <Security sx={{ fontSize: 32, color: threatFlowTheme.colors.brand.primary }} />
            SOC Operations Center
          </Typography>
          <Typography sx={{ color: threatFlowTheme.colors.text.secondary, mt: 1 }}>
            Real-time security monitoring and threat intelligence for {user?.organizationId}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ color: threatFlowTheme.colors.text.tertiary, fontSize: '0.875rem' }}>
            Last updated: {lastRefresh.toLocaleTimeString()}
          </Typography>
          <Tooltip title="Refresh Dashboard">
            <IconButton 
              onClick={handleManualRefresh}
              disabled={loading}
              sx={{ color: threatFlowTheme.colors.brand.primary }}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Key Metrics Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metrics.map((metric) => (
          <Grid item xs={12} sm={6} md={3} key={metric.id}>
            <Card
              sx={{
                background: `linear-gradient(135deg, ${threatFlowTheme.colors.background.secondary}95 0%, ${threatFlowTheme.colors.background.primary}90 100%)`,
                backdropFilter: 'blur(20px)',
                border: `1px solid ${getMetricSeverityColor(metric.severity)}20`,
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 40px ${getMetricSeverityColor(metric.severity)}20`,
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                  <Typography
                    sx={{
                      color: threatFlowTheme.colors.text.secondary,
                      fontSize: '0.875rem',
                      fontWeight: threatFlowTheme.typography.fontWeight.medium,
                    }}
                  >
                    {metric.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={metric.severity.toUpperCase()}
                    sx={{
                      bgcolor: `${getMetricSeverityColor(metric.severity)}20`,
                      color: getMetricSeverityColor(metric.severity),
                      fontSize: '0.75rem',
                    }}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                  <Typography
                    variant="h3"
                    sx={{
                      color: threatFlowTheme.colors.text.primary,
                      fontWeight: threatFlowTheme.typography.fontWeight.bold,
                    }}
                  >
                    {metric.value.toLocaleString()}
                  </Typography>
                  <Typography
                    sx={{
                      color: threatFlowTheme.colors.text.tertiary,
                      fontSize: '0.875rem',
                    }}
                  >
                    {metric.unit}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      color: getTrendColor(metric.trend, metric.id === 'mttr' ? false : true),
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    {getTrendIcon(metric.trend)}
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 'medium' }}>
                      {metric.trendPercentage > 0 ? '+' : ''}{metric.trendPercentage}%
                    </Typography>
                  </Box>
                  <Typography sx={{ color: threatFlowTheme.colors.text.tertiary, fontSize: '0.75rem' }}>
                    vs last period
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Alert Summary and Threat Intel */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              background: `linear-gradient(135deg, ${threatFlowTheme.colors.background.secondary}95 0%, ${threatFlowTheme.colors.background.primary}90 100%)`,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${threatFlowTheme.colors.brand.primary}20`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  color: threatFlowTheme.colors.text.primary,
                  fontWeight: threatFlowTheme.typography.fontWeight.semibold,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Warning sx={{ color: threatFlowTheme.colors.status.warning }} />
                Alert Triage Status
              </Typography>
              <IconButton size="small" sx={{ color: threatFlowTheme.colors.brand.primary }}>
                <OpenInNew />
              </IconButton>
            </Box>
            
            {alertSummary && (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.error, fontWeight: 'bold' }}>
                      {alertSummary.criticalAlerts}
                    </Typography>
                    <Typography sx={{ color: threatFlowTheme.colors.text.secondary, fontSize: '0.875rem' }}>
                      Critical Alerts
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.warning, fontWeight: 'bold' }}>
                      {alertSummary.new}
                    </Typography>
                    <Typography sx={{ color: threatFlowTheme.colors.text.secondary, fontSize: '0.875rem' }}>
                      New Alerts
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h6" sx={{ color: threatFlowTheme.colors.status.info }}>
                      {alertSummary.investigating}
                    </Typography>
                    <Typography sx={{ color: threatFlowTheme.colors.text.tertiary, fontSize: '0.75rem' }}>
                      Investigating
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h6" sx={{ color: threatFlowTheme.colors.status.warning }}>
                      {alertSummary.escalated}
                    </Typography>
                    <Typography sx={{ color: threatFlowTheme.colors.text.tertiary, fontSize: '0.75rem' }}>
                      Escalated
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h6" sx={{ color: threatFlowTheme.colors.status.success }}>
                      {alertSummary.resolved}
                    </Typography>
                    <Typography sx={{ color: threatFlowTheme.colors.text.tertiary, fontSize: '0.75rem' }}>
                      Resolved
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              background: `linear-gradient(135deg, ${threatFlowTheme.colors.background.secondary}95 0%, ${threatFlowTheme.colors.background.primary}90 100%)`,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${threatFlowTheme.colors.brand.primary}20`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  color: threatFlowTheme.colors.text.primary,
                  fontWeight: threatFlowTheme.typography.fontWeight.semibold,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Shield sx={{ color: threatFlowTheme.colors.brand.primary }} />
                Threat Intelligence
              </Typography>
              <IconButton size="small" sx={{ color: threatFlowTheme.colors.brand.primary }}>
                <OpenInNew />
              </IconButton>
            </Box>
            
            {threatIntel && (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" sx={{ color: threatFlowTheme.colors.brand.primary, fontWeight: 'bold' }}>
                      {threatIntel.activeFeedsCount}
                    </Typography>
                    <Typography sx={{ color: threatFlowTheme.colors.text.secondary, fontSize: '0.875rem' }}>
                      Active Feeds
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.success, fontWeight: 'bold' }}>
                      {threatIntel.newIndicators24h}
                    </Typography>
                    <Typography sx={{ color: threatFlowTheme.colors.text.secondary, fontSize: '0.875rem' }}>
                      New (24h)
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h6" sx={{ color: threatFlowTheme.colors.text.primary }}>
                      {threatIntel.totalIndicators.toLocaleString()}
                    </Typography>
                    <Typography sx={{ color: threatFlowTheme.colors.text.tertiary, fontSize: '0.875rem' }}>
                      Total Threat Indicators
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Loading indicator for refresh */}
      {loading && metrics.length > 0 && (
        <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1301 }} />
      )}
    </Box>
  );
};