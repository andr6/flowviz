/**
 * Campaign Detection Dashboard
 * Main dashboard for viewing and managing threat campaigns
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
} from '@mui/material';
import {
  Campaign as CampaignIcon,
  TrendingUp,
  Warning,
  CheckCircle,
  Error,
  Refresh,
  FilterList,
  Analytics,
  Timeline,
  Share,
  Download,
  MoreVert,
} from '@mui/icons-material';

import type { Campaign, CampaignSeverity, CampaignStatus } from '../types';

interface CampaignDetectionDashboardProps {
  onCampaignClick?: (campaign: Campaign) => void;
  onAnalyzeClick?: () => void;
}

export const CampaignDetectionDashboard: React.FC<CampaignDetectionDashboardProps> = ({
  onCampaignClick,
  onAnalyzeClick,
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<CampaignSeverity | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCampaigns();
  }, [statusFilter, severityFilter]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      
      const response = await fetch(`/api/campaigns?${params}`);
      const data = await response.json();
      setCampaigns(data);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/correlation/analyze', { method: 'POST' });
      const result = await response.json();
      
      if (onAnalyzeClick) onAnalyzeClick();
      await loadCampaigns();
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: CampaignSeverity) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#7f1d1d',
    };
    return colors[severity];
  };

  const getStatusIcon = (status: CampaignStatus) => {
    switch (status) {
      case 'active': return <Error color="error" />;
      case 'monitoring': return <Warning color="warning" />;
      case 'resolved': return <CheckCircle color="success" />;
      case 'archived': return <CheckCircle color="disabled" />;
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = searchQuery === '' || 
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.suspectedActor?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Campaign Detection
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Advanced threat correlation and campaign management
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
          >
            Filters
          </Button>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={handleAnalyze}
            disabled={loading}
          >
            Analyze Correlations
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="h6">
                    Active Campaigns
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {campaigns.filter(c => c.status === 'active').length}
                  </Typography>
                </Box>
                <CampaignIcon sx={{ fontSize: 40, color: 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="h6">
                    Critical Severity
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {campaigns.filter(c => c.severity === 'critical').length}
                  </Typography>
                </Box>
                <Warning sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="h6">
                    Total Flows
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {campaigns.reduce((sum, c) => sum + c.relatedFlows.length, 0)}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="h6">
                    Avg Confidence
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {campaigns.length > 0 
                      ? Math.round((campaigns.reduce((sum, c) => sum + c.confidenceScore, 0) / campaigns.length) * 100)
                      : 0}%
                  </Typography>
                </Box>
                <Analytics sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="monitoring">Monitoring</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Severity</InputLabel>
              <Select
                value={severityFilter}
                label="Severity"
                onChange={(e) => setSeverityFilter(e.target.value as any)}
              >
                <MenuItem value="all">All Severity</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Campaigns Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Campaign Name</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell>Flows</TableCell>
              <TableCell>Indicators</TableCell>
              <TableCell>First Seen</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    No campaigns found. Run correlation analysis to detect campaigns.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredCampaigns.map((campaign) => (
                <TableRow
                  key={campaign.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => onCampaignClick?.(campaign)}
                >
                  <TableCell>
                    <Tooltip title={campaign.status}>
                      {getStatusIcon(campaign.status)}
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {campaign.name}
                    </Typography>
                    {campaign.tags.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        {campaign.tags.slice(0, 2).map(tag => (
                          <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5 }} />
                        ))}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={campaign.severity.toUpperCase()}
                      size="small"
                      sx={{
                        backgroundColor: getSeverityColor(campaign.severity),
                        color: 'white',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 60 }}>
                        <LinearProgress
                          variant="determinate"
                          value={campaign.confidenceScore * 100}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                      <Typography variant="body2">
                        {Math.round(campaign.confidenceScore * 100)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {campaign.suspectedActor || (
                      <Typography variant="body2" color="text.secondary">
                        Unknown
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{campaign.relatedFlows.length}</TableCell>
                  <TableCell>{campaign.indicatorsCount}</TableCell>
                  <TableCell>
                    {new Date(campaign.firstSeen).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
