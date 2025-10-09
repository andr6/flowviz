import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScheduleIcon from '@mui/icons-material/Schedule';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Grid,
  Alert,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import React, { useState, useEffect } from 'react';

import { useThemeContext } from '../../../shared/context/ThemeProvider';
import { batchProcessingService } from '../services/BatchProcessingService';
import { BatchJob, BatchJobStatus, BatchMetrics } from '../types/BatchTypes';

export const BatchJobDashboard: React.FC = () => {
  const { theme } = useThemeContext();
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [metrics, setMetrics] = useState<BatchMetrics | null>(null);
  const [selectedJob, setSelectedJob] = useState<BatchJob | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionMenuJob, setActionMenuJob] = useState<BatchJob | null>(null);

  useEffect(() => {
    const refreshData = () => {
      // In a real implementation, this would fetch from an API
      setMetrics(batchProcessingService.getMetrics());
      // setJobs(batchProcessingService.getAllJobs());
    };

    refreshData();
    const interval = setInterval(refreshData, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: BatchJobStatus): string => {
    switch (status) {
      case 'queued':
        return theme.colors.text.tertiary;
      case 'running':
        return theme.colors.brand.primary;
      case 'completed':
        return theme.colors.status.success;
      case 'failed':
        return theme.colors.status.error;
      case 'cancelled':
        return theme.colors.text.secondary;
      case 'paused':
        return theme.colors.status.warning;
      default:
        return theme.colors.text.tertiary;
    }
  };

  const getStatusIcon = (status: BatchJobStatus) => {
    switch (status) {
      case 'queued':
        return <ScheduleIcon fontSize="small" />;
      case 'running':
        return <PlayArrowIcon fontSize="small" />;
      case 'completed':
        return <CheckCircleIcon fontSize="small" />;
      case 'failed':
        return <ErrorIcon fontSize="small" />;
      case 'cancelled':
        return <CancelIcon fontSize="small" />;
      case 'paused':
        return <PauseIcon fontSize="small" />;
      default:
        return <ScheduleIcon fontSize="small" />;
    }
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleActionClick = (event: React.MouseEvent<HTMLElement>, job: BatchJob) => {
    setActionMenuAnchor(event.currentTarget);
    setActionMenuJob(job);
  };

  const handleActionClose = () => {
    setActionMenuAnchor(null);
    setActionMenuJob(null);
  };

  const handleJobAction = async (action: string) => {
    if (!actionMenuJob) {return;}

    try {
      switch (action) {
        case 'pause':
          await batchProcessingService.pauseJob(actionMenuJob.id);
          break;
        case 'resume':
          await batchProcessingService.resumeJob(actionMenuJob.id);
          break;
        case 'cancel':
          await batchProcessingService.cancelJob(actionMenuJob.id);
          break;
        case 'details':
          setSelectedJob(actionMenuJob);
          setDetailsOpen(true);
          break;
      }
    } catch (error) {
      console.error('Failed to perform job action:', error);
    }

    handleActionClose();
  };

  const MetricCard: React.FC<{ title: string; value: string | number; subtitle?: string; color?: string }> = ({
    title,
    value,
    subtitle,
    color = theme.colors.text.primary,
  }) => (
    <Card
      sx={{
        backgroundColor: theme.colors.surface.subtle,
        border: `1px solid ${theme.colors.surface.border.default}`,
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Typography variant="overline" sx={{ color: theme.colors.text.tertiary, fontSize: '0.75rem' }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ color, fontWeight: 'bold', my: 1 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: theme.colors.text.tertiary }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: theme.colors.text.primary, fontWeight: 'bold' }}>
          Batch Processing Dashboard
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => window.location.reload()}
          variant="outlined"
        >
          Refresh
        </Button>
      </Box>

      {/* Metrics Overview */}
      {metrics && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Total Jobs"
              value={metrics.totalJobs}
              subtitle="All time"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Active Jobs"
              value={metrics.activeJobs}
              subtitle="Currently running"
              color={theme.colors.brand.primary}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Success Rate"
              value={`${Math.round((1 - metrics.errorRate) * 100)}%`}
              subtitle="Completed successfully"
              color={theme.colors.status.success}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Throughput"
              value={`${metrics.throughputPerHour}/hr`}
              subtitle="Jobs per hour"
            />
          </Grid>
        </Grid>
      )}

      {/* Queue Health Alert */}
      {metrics && metrics.queueHealth.backlogSize > 10 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          High queue backlog detected: {metrics.queueHealth.backlogSize} jobs waiting. 
          Average wait time: {formatDuration(metrics.queueHealth.averageWaitTime)}
        </Alert>
      )}

      {/* Jobs Table */}
      <Card
        sx={{
          backgroundColor: theme.colors.surface.rest,
          border: `1px solid ${theme.colors.surface.border.default}`,
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: `1px solid ${theme.colors.surface.border.subtle}` }}>
            <Typography variant="h6" sx={{ color: theme.colors.text.primary }}>
              Recent Jobs
            </Typography>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: theme.colors.text.secondary }}>Job ID</TableCell>
                  <TableCell sx={{ color: theme.colors.text.secondary }}>Type</TableCell>
                  <TableCell sx={{ color: theme.colors.text.secondary }}>Status</TableCell>
                  <TableCell sx={{ color: theme.colors.text.secondary }}>Progress</TableCell>
                  <TableCell sx={{ color: theme.colors.text.secondary }}>Created</TableCell>
                  <TableCell sx={{ color: theme.colors.text.secondary }}>Duration</TableCell>
                  <TableCell sx={{ color: theme.colors.text.secondary }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography sx={{ color: theme.colors.text.tertiary }}>
                        No batch jobs found. Create a new job to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((job) => (
                    <TableRow
                      key={job.id}
                      sx={{
                        '&:hover': {
                          backgroundColor: theme.colors.surface.hover,
                        },
                      }}
                    >
                      <TableCell sx={{ color: theme.colors.text.primary, fontFamily: 'monospace' }}>
                        {job.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell sx={{ color: theme.colors.text.primary }}>
                        <Chip
                          label={job.type.replace('_', ' ')}
                          size="small"
                          sx={{
                            backgroundColor: theme.colors.surface.subtle,
                            textTransform: 'capitalize',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ color: getStatusColor(job.status) }}>
                            {getStatusIcon(job.status)}
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: getStatusColor(job.status),
                              textTransform: 'capitalize',
                              fontWeight: 'medium',
                            }}
                          >
                            {job.status}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 120 }}>
                          <LinearProgress
                            variant="determinate"
                            value={job.progress.percentage}
                            sx={{
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: theme.colors.surface.subtle,
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 2,
                                backgroundColor: getStatusColor(job.status),
                              },
                            }}
                          />
                          <Typography variant="caption" sx={{ color: theme.colors.text.tertiary }}>
                            {job.progress.completed}/{job.progress.total} 
                            {job.progress.failed > 0 && ` (${job.progress.failed} failed)`}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: theme.colors.text.tertiary }}>
                        <Tooltip title={job.createdAt.toLocaleString()}>
                          <span>{formatDistanceToNow(job.createdAt, { addSuffix: true })}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ color: theme.colors.text.tertiary }}>
                        {job.startedAt && job.completedAt
                          ? formatDuration(job.completedAt.getTime() - job.startedAt.getTime())
                          : job.startedAt
                          ? formatDuration(Date.now() - job.startedAt.getTime())
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={(e) => handleActionClick(e, job)}
                        >
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionClose}
      >
        <MenuItem onClick={() => handleJobAction('details')}>View Details</MenuItem>
        {actionMenuJob?.status === 'running' && (
          <MenuItem onClick={() => handleJobAction('pause')}>Pause Job</MenuItem>
        )}
        {actionMenuJob?.status === 'paused' && (
          <MenuItem onClick={() => handleJobAction('resume')}>Resume Job</MenuItem>
        )}
        {(actionMenuJob?.status === 'running' || actionMenuJob?.status === 'queued') && (
          <MenuItem onClick={() => handleJobAction('cancel')}>Cancel Job</MenuItem>
        )}
      </Menu>

      {/* Job Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: theme.colors.background.glassHeavy,
            backdropFilter: theme.effects.blur.xl,
          },
        }}
      >
        <DialogTitle>
          Job Details: {selectedJob?.id}
        </DialogTitle>
        <DialogContent>
          {selectedJob && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" sx={{ color: theme.colors.text.secondary }}>
                    Type
                  </Typography>
                  <Typography sx={{ color: theme.colors.text.primary }}>
                    {selectedJob.type.replace('_', ' ')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" sx={{ color: theme.colors.text.secondary }}>
                    Status
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: getStatusColor(selectedJob.status) }}>
                      {getStatusIcon(selectedJob.status)}
                    </Box>
                    <Typography sx={{ color: theme.colors.text.primary, textTransform: 'capitalize' }}>
                      {selectedJob.status}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" sx={{ mb: 2, color: theme.colors.text.primary }}>
                Progress
              </Typography>
              <Box sx={{ mb: 3 }}>
                <LinearProgress
                  variant="determinate"
                  value={selectedJob.progress.percentage}
                  sx={{ mb: 1, height: 8, borderRadius: 4 }}
                />
                <Typography variant="body2" sx={{ color: theme.colors.text.tertiary }}>
                  {selectedJob.progress.completed} of {selectedJob.progress.total} completed
                  {selectedJob.progress.failed > 0 && ` • ${selectedJob.progress.failed} failed`}
                </Typography>
              </Box>

              {selectedJob.errors && selectedJob.errors.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ mb: 2, color: theme.colors.text.primary }}>
                    Errors ({selectedJob.errors.length})
                  </Typography>
                  <List sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {selectedJob.errors.slice(0, 5).map((error) => (
                      <ListItem key={error.id}>
                        <ListItemText
                          primary={error.message}
                          secondary={error.timestamp.toLocaleString()}
                          sx={{
                            '& .MuiListItemText-primary': {
                              color: theme.colors.status.error,
                            },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};