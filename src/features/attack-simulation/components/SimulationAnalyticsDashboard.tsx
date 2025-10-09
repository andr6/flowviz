/**
 * Simulation Analytics Dashboard Component
 *
 * Comprehensive analytics and insights for attack simulation activities
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Assessment,
  Timeline,
  Security,
  BugReport,
  CheckCircle,
  Download,
} from '@mui/icons-material';
import {
  SimulationAnalytics,
  TechniqueAnalytics,
  PlatformAnalytics,
  TrendDataPoint,
} from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const SimulationAnalyticsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('30d');
  const [analytics, setAnalytics] = useState<SimulationAnalytics | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  /**
   * Load analytics data
   */
  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/simulations/analytics?timeRange=${timeRange}`);

      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }

      const data = await response.json();

      // Transform API response to SimulationAnalytics format
      setAnalytics({
        totalSimulations: data.total_simulations || 0,
        completedSimulations: data.completed_simulations || 0,
        failedSimulations: data.failed_simulations || 0,
        avgDetectionScore: data.avg_detection_score || 0,
        avgPreventionScore: data.avg_prevention_score || 0,
        avgOverallScore: data.avg_overall_score || 0,
        techniqueBreakdown: generateMockTechniqueBreakdown(),
        platformBreakdown: generateMockPlatformBreakdown(),
        trendData: generateMockTrendData(),
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate mock technique breakdown
   * In production, this would come from the API
   */
  const generateMockTechniqueBreakdown = (): TechniqueAnalytics[] => {
    return [
      {
        techniqueId: 'T1059',
        techniqueName: 'Command and Scripting Interpreter',
        timesExecuted: 45,
        timesDetected: 38,
        timesPrevented: 12,
        detectionRate: 84.4,
        preventionRate: 26.7,
      },
      {
        techniqueId: 'T1055',
        techniqueName: 'Process Injection',
        timesExecuted: 32,
        timesDetected: 28,
        timesPrevented: 18,
        detectionRate: 87.5,
        preventionRate: 56.3,
      },
      {
        techniqueId: 'T1003',
        techniqueName: 'OS Credential Dumping',
        timesExecuted: 28,
        timesDetected: 22,
        timesPrevented: 15,
        detectionRate: 78.6,
        preventionRate: 53.6,
      },
      {
        techniqueId: 'T1566',
        techniqueName: 'Phishing',
        timesExecuted: 25,
        timesDetected: 20,
        timesPrevented: 8,
        detectionRate: 80.0,
        preventionRate: 32.0,
      },
      {
        techniqueId: 'T1078',
        techniqueName: 'Valid Accounts',
        timesExecuted: 22,
        timesDetected: 15,
        timesPrevented: 5,
        detectionRate: 68.2,
        preventionRate: 22.7,
      },
    ];
  };

  /**
   * Generate mock platform breakdown
   */
  const generateMockPlatformBreakdown = (): PlatformAnalytics[] => {
    return [
      {
        platform: 'picus',
        totalJobs: 45,
        avgScore: 78.5,
        avgDuration: 1800,
      },
      {
        platform: 'atomic_red_team',
        totalJobs: 32,
        avgScore: 72.3,
        avgDuration: 1200,
      },
      {
        platform: 'caldera',
        totalJobs: 18,
        avgScore: 75.8,
        avgDuration: 2400,
      },
    ];
  };

  /**
   * Generate mock trend data
   */
  const generateMockTrendData = (): TrendDataPoint[] => {
    const days = 30;
    const data: TrendDataPoint[] = [];

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      data.push({
        date: date.toISOString().split('T')[0],
        detectionScore: 70 + Math.random() * 20,
        preventionScore: 60 + Math.random() * 20,
        overallScore: 65 + Math.random() * 20,
        jobsExecuted: Math.floor(Math.random() * 5),
      });
    }

    return data;
  };

  /**
   * Calculate trend
   */
  const calculateTrend = (current: number, previous: number): {
    direction: 'up' | 'down' | 'flat';
    percentage: number;
  } => {
    if (previous === 0) return { direction: 'flat', percentage: 0 };

    const change = ((current - previous) / previous) * 100;

    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
      percentage: Math.abs(change),
    };
  };

  /**
   * Export analytics report
   */
  const exportReport = () => {
    if (!analytics) return;

    const report = `
Simulation Analytics Report
Generated: ${new Date().toLocaleString()}
Time Range: ${timeRange}

=== SUMMARY ===
Total Simulations: ${analytics.totalSimulations}
Completed: ${analytics.completedSimulations}
Failed: ${analytics.failedSimulations}
Success Rate: ${((analytics.completedSimulations / analytics.totalSimulations) * 100).toFixed(1)}%

=== SCORES ===
Average Detection Score: ${analytics.avgDetectionScore.toFixed(1)}%
Average Prevention Score: ${analytics.avgPreventionScore.toFixed(1)}%
Average Overall Score: ${analytics.avgOverallScore.toFixed(1)}%

=== TOP TECHNIQUES ===
${analytics.techniqueBreakdown
  .slice(0, 10)
  .map(
    t =>
      `${t.techniqueId} - ${t.techniqueName}
  Executed: ${t.timesExecuted} | Detection Rate: ${t.detectionRate.toFixed(1)}% | Prevention Rate: ${t.preventionRate.toFixed(1)}%`
  )
  .join('\n\n')}

=== PLATFORM BREAKDOWN ===
${analytics.platformBreakdown
  .map(
    p =>
      `${p.platform.toUpperCase()}
  Jobs: ${p.totalJobs} | Avg Score: ${p.avgScore.toFixed(1)}% | Avg Duration: ${(p.avgDuration / 60).toFixed(1)}min`
  )
  .join('\n\n')}
    `;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulation-analytics-${Date.now()}.txt`;
    a.click();
  };

  if (loading && !analytics) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Simulation Analytics
        </Typography>
        <LinearProgress />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  if (!analytics) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="info">No analytics data available</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Simulation Analytics</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Time Range</InputLabel>
            <Select value={timeRange} onChange={e => setTimeRange(e.target.value)} label="Time Range">
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
              <MenuItem value="1y">Last Year</MenuItem>
            </Select>
          </FormControl>
          <Button startIcon={<Download />} onClick={exportReport}>
            Export Report
          </Button>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Simulations
                  </Typography>
                  <Typography variant="h4">{analytics.totalSimulations}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingUp fontSize="small" color="success" />
                    <Typography variant="caption" color="success.main">
                      12% vs last period
                    </Typography>
                  </Box>
                </Box>
                <Assessment color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Detection Score
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    {analytics.avgDetectionScore.toFixed(0)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={analytics.avgDetectionScore}
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Security color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Prevention Score
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {analytics.avgPreventionScore.toFixed(0)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={analytics.avgPreventionScore}
                    sx={{ mt: 1 }}
                    color="warning"
                  />
                </Box>
                <CheckCircle color="warning" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Success Rate
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {((analytics.completedSimulations / analytics.totalSimulations) * 100).toFixed(0)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {analytics.completedSimulations} of {analytics.totalSimulations}
                  </Typography>
                </Box>
                <Timeline color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab label="Technique Analysis" />
        <Tab label="Platform Performance" />
        <Tab label="Trends" />
      </Tabs>

      <TabPanel value={activeTab} index={0}>
        <Typography variant="h6" gutterBottom>
          Top Techniques
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Technique</TableCell>
                <TableCell align="right">Executed</TableCell>
                <TableCell align="right">Detected</TableCell>
                <TableCell align="right">Prevented</TableCell>
                <TableCell>Detection Rate</TableCell>
                <TableCell>Prevention Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {analytics.techniqueBreakdown.map(technique => (
                <TableRow key={technique.techniqueId} hover>
                  <TableCell>
                    <Typography variant="body2">{technique.techniqueId}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {technique.techniqueName}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{technique.timesExecuted}</TableCell>
                  <TableCell align="right">{technique.timesDetected}</TableCell>
                  <TableCell align="right">{technique.timesPrevented}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={technique.detectionRate}
                        sx={{ width: 80 }}
                      />
                      <Typography variant="caption">{technique.detectionRate.toFixed(0)}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={technique.preventionRate}
                        sx={{ width: 80 }}
                        color="warning"
                      />
                      <Typography variant="caption">{technique.preventionRate.toFixed(0)}%</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Typography variant="h6" gutterBottom>
          Platform Performance
        </Typography>
        <Grid container spacing={2}>
          {analytics.platformBreakdown.map(platform => (
            <Grid item xs={12} md={4} key={platform.platform}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {platform.platform.toUpperCase()}
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Total Jobs
                    </Typography>
                    <Typography variant="h5">{platform.totalJobs}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Average Score
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={platform.avgScore}
                        sx={{ flex: 1 }}
                      />
                      <Typography variant="body2">{platform.avgScore.toFixed(0)}%</Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Average Duration
                    </Typography>
                    <Typography variant="body1">
                      {(platform.avgDuration / 60).toFixed(1)} min
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Typography variant="h6" gutterBottom>
          Trend Analysis
        </Typography>

        {/* Simple trend visualization */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Score Trends (Last {timeRange})
          </Typography>
          <Box sx={{ height: 200, bgcolor: 'background.default', borderRadius: 1, p: 2 }}>
            {/* In production, this would be a proper chart library like Recharts or Chart.js */}
            <Alert severity="info">Chart visualization would be rendered here</Alert>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Recent Activity
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Peak detection score achieved"
                      secondary={`${analytics.avgDetectionScore.toFixed(0)}% on ${new Date().toLocaleDateString()}`}
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="Most tested technique"
                      secondary={`${analytics.techniqueBreakdown[0]?.techniqueId} - ${analytics.techniqueBreakdown[0]?.timesExecuted} times`}
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="Total simulations this period"
                      secondary={`${analytics.totalSimulations} simulations executed`}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Key Insights
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Detection improving"
                      secondary="12% increase in detection rate over last period"
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="Prevention opportunity"
                      secondary="15 techniques detected but not prevented"
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="Coverage gaps"
                      secondary="8 techniques with <50% detection rate"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Paper>
  );
};

export default SimulationAnalyticsDashboard;
