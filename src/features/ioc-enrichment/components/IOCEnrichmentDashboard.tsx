import {
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  CloudSync as EnrichIcon,
  Analytics as AnalyticsIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Cancel as CancelIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';

import { multiProviderEnrichmentService } from '../services/MultiProviderEnrichmentService';
import {
  IOC,
  IOCType,
  EnrichmentProvider,
  EnrichmentResult,
  EnrichmentJob,
  ThreatLevel,
  ConfidenceLevel,
} from '../types/EnrichmentTypes';

interface IOCEnrichmentDashboardProps {
  onIOCEnriched?: (ioc: IOC, results: EnrichmentResult[]) => void;
  onJobCompleted?: (job: EnrichmentJob) => void;
}

const IOC_TYPES: IOCType[] = [
  'ip_address',
  'domain',
  'url',
  'file_hash',
  'email',
  'cve',
  'registry_key',
  'file_path',
  'user_agent',
  'certificate',
  'mutex',
  'process_name',
  'yara_rule',
];

const ENRICHMENT_PROVIDERS: EnrichmentProvider[] = [
  'virustotal',
  'shodan',
  'abuseipdb',
  'urlvoid',
  'greynoise',
  'censys',
  'passivetotal',
];

export const IOCEnrichmentDashboard: React.FC<IOCEnrichmentDashboardProps> = ({
  onIOCEnriched,
  onJobCompleted,
}) => {
  const [iocs, setIOCs] = useState<IOC[]>([]);
  const [enrichmentResults, setEnrichmentResults] = useState<Map<string, EnrichmentResult[]>>(new Map());
  const [jobs, setJobs] = useState<EnrichmentJob[]>([]);
  const [selectedIOCs, setSelectedIOCs] = useState<Set<string>>(new Set());
  const [enrichmentDialogOpen, setEnrichmentDialogOpen] = useState(false);
  const [newIOCDialogOpen, setNewIOCDialogOpen] = useState(false);
  const [jobDetailsDialogOpen, setJobDetailsDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<EnrichmentJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [newIOC, setNewIOC] = useState<Partial<IOC>>({
    type: 'ip_address',
    value: '',
    tags: [],
  });

  const [enrichmentOptions, setEnrichmentOptions] = useState({
    providers: [] as EnrichmentProvider[],
    forceRefresh: false,
    maxConcurrency: 3,
  });

  const [stats, setStats] = useState({
    cacheSize: 0,
    activeJobs: 0,
    completedJobs: 0,
  });

  // Load data on component mount
  useEffect(() => {
    loadStats();
    loadJobs();
    
    // Set up event listeners
    const handleIOCEnriched = (data: { ioc: IOC; results: EnrichmentResult[] }) => {
      setEnrichmentResults(prev => new Map(prev.set(data.ioc.id, data.results)));
      onIOCEnriched?.(data.ioc, data.results);
    };

    const handleJobCompleted = (job: EnrichmentJob) => {
      setJobs(prev => prev.map(j => j.id === job.id ? job : j));
      onJobCompleted?.(job);
      loadStats();
    };

    const handleJobProgress = (data: { jobId: string; progress: any; percentage: number }) => {
      setJobs(prev => prev.map(j => 
        j.id === data.jobId 
          ? { ...j, progress: data.progress }
          : j
      ));
    };

    multiProviderEnrichmentService.on('iocEnriched', handleIOCEnriched);
    multiProviderEnrichmentService.on('jobCompleted', handleJobCompleted);
    multiProviderEnrichmentService.on('jobProgress', handleJobProgress);

    return () => {
      multiProviderEnrichmentService.off('iocEnriched', handleIOCEnriched);
      multiProviderEnrichmentService.off('jobCompleted', handleJobCompleted);
      multiProviderEnrichmentService.off('jobProgress', handleJobProgress);
    };
  }, [onIOCEnriched, onJobCompleted]);

  const loadStats = useCallback(() => {
    const newStats = multiProviderEnrichmentService.getStats();
    setStats(newStats);
  }, []);

  const loadJobs = useCallback(() => {
    // In a real implementation, this would fetch jobs from the service
    // For now, we'll just update the stats
    loadStats();
  }, [loadStats]);

  const handleAddIOC = () => {
    if (!newIOC.value || !newIOC.type) {
      setError('IOC value and type are required');
      return;
    }

    const ioc: IOC = {
      id: `ioc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      value: newIOC.value!,
      type: newIOC.type!,
      firstSeen: new Date(),
      lastSeen: new Date(),
      source: 'manual',
      confidence: 'medium',
      tags: newIOC.tags || [],
      metadata: {},
    };

    setIOCs(prev => [...prev, ioc]);
    setNewIOC({ type: 'ip_address', value: '', tags: [] });
    setNewIOCDialogOpen(false);
    setError(null);
  };

  const handleEnrichIOCs = async () => {
    if (selectedIOCs.size === 0) {
      setError('Please select IOCs to enrich');
      return;
    }

    if (enrichmentOptions.providers.length === 0) {
      setError('Please select at least one enrichment provider');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedIOCList = iocs.filter(ioc => selectedIOCs.has(ioc.id));
      
      const jobId = await multiProviderEnrichmentService.enrichIOCsBulk(
        selectedIOCList,
        enrichmentOptions
      );

      // Add job to list (in real implementation, this would come from the service)
      const newJob: EnrichmentJob = {
        id: jobId,
        iocs: selectedIOCList.map(ioc => ioc.id),
        providers: enrichmentOptions.providers,
        priority: 'normal',
        createdAt: new Date(),
        status: 'queued',
        progress: {
          total: selectedIOCList.length * enrichmentOptions.providers.length,
          completed: 0,
          failed: 0,
          skipped: 0,
        },
        results: [],
        errors: [],
        tags: ['dashboard', 'manual'],
      };

      setJobs(prev => [newJob, ...prev]);
      setEnrichmentDialogOpen(false);
      setSelectedIOCs(new Set());

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start enrichment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelJob = (jobId: string) => {
    const success = multiProviderEnrichmentService.cancelJob(jobId);
    if (success) {
      setJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, status: 'cancelled' as const } : j
      ));
    }
  };

  const getThreatLevelColor = (threatLevel: ThreatLevel): string => {
    switch (threatLevel) {
      case 'critical': return '#d32f2f';
      case 'malicious': return '#f57c00';
      case 'suspicious': return '#fbc02d';
      case 'benign': return '#388e3c';
      case 'unknown':
      default: return '#757575';
    }
  };

  const getConfidenceBadge = (confidence: ConfidenceLevel) => {
    const colors = {
      'verified': 'success',
      'high': 'primary',
      'medium': 'warning',
      'low': 'error',
    } as const;

    return <Chip label={confidence} color={colors[confidence] || 'default'} size="small" />;
  };

  const getJobStatusIcon = (status: EnrichmentJob['status']) => {
    switch (status) {
      case 'completed': return <CheckIcon color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'running': return <RefreshIcon color="primary" className="rotating" />;
      case 'cancelled': return <CancelIcon color="disabled" />;
      case 'queued':
      default: return <InfoIcon color="info" />;
    }
  };

  const renderIOCTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <input
                type="checkbox"
                checked={selectedIOCs.size === iocs.length && iocs.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedIOCs(new Set(iocs.map(ioc => ioc.id)));
                  } else {
                    setSelectedIOCs(new Set());
                  }
                }}
              />
            </TableCell>
            <TableCell>IOC Value</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Confidence</TableCell>
            <TableCell>Enrichment Status</TableCell>
            <TableCell>Threat Level</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {iocs.map((ioc) => {
            const results = enrichmentResults.get(ioc.id) || [];
            const hasEnrichment = results.length > 0;
            const threatLevel = hasEnrichment 
              ? results.find(r => r.success)?.data.threatLevel || 'unknown'
              : 'unknown';

            return (
              <TableRow key={ioc.id}>
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    checked={selectedIOCs.has(ioc.id)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedIOCs);
                      if (e.target.checked) {
                        newSelected.add(ioc.id);
                      } else {
                        newSelected.delete(ioc.id);
                      }
                      setSelectedIOCs(newSelected);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {ioc.value}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={ioc.type} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  {getConfidenceBadge(ioc.confidence)}
                </TableCell>
                <TableCell>
                  <Badge 
                    badgeContent={results.length}
                    color={hasEnrichment ? 'success' : 'default'}
                  >
                    <Chip 
                      label={hasEnrichment ? 'Enriched' : 'Pending'}
                      color={hasEnrichment ? 'success' : 'default'}
                      size="small"
                    />
                  </Badge>
                </TableCell>
                <TableCell>
                  <Box 
                    sx={{ 
                      display: 'inline-block',
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: getThreatLevelColor(threatLevel),
                      mr: 1,
                    }} 
                  />
                  {threatLevel}
                </TableCell>
                <TableCell>
                  <Tooltip title="View Enrichment Details">
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        // Open enrichment details dialog
                        console.log('View enrichment for:', ioc);
                      }}
                      disabled={!hasEnrichment}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderJobsTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Job ID</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Progress</TableCell>
            <TableCell>IOCs</TableCell>
            <TableCell>Providers</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.map((job) => {
            const progressPercentage = job.progress.total > 0 
              ? (job.progress.completed / job.progress.total) * 100 
              : 0;

            return (
              <TableRow key={job.id}>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {job.id.substring(0, 12)}...
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getJobStatusIcon(job.status)}
                    {job.status}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ width: 100 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={progressPercentage} 
                    />
                    <Typography variant="caption">
                      {job.progress.completed}/{job.progress.total}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{job.iocs.length}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {job.providers.map(provider => (
                      <Chip 
                        key={provider}
                        label={provider}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {job.createdAt.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="View Details">
                      <IconButton 
                        size="small"
                        onClick={() => {
                          setSelectedJob(job);
                          setJobDetailsDialogOpen(true);
                        }}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    {(job.status === 'running' || job.status === 'queued') && (
                      <Tooltip title="Cancel Job">
                        <IconButton 
                          size="small"
                          onClick={() => handleCancelJob(job.id)}
                        >
                          <CancelIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SecurityIcon />
        IOC Enrichment Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                Total IOCs
              </Typography>
              <Typography variant="h3">
                {iocs.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                Enriched IOCs
              </Typography>
              <Typography variant="h3">
                {Array.from(enrichmentResults.keys()).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                Active Jobs
              </Typography>
              <Typography variant="h3">
                {stats.activeJobs}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">
                Cache Size
              </Typography>
              <Typography variant="h3">
                {stats.cacheSize}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<EnrichIcon />}
          onClick={() => setNewIOCDialogOpen(true)}
        >
          Add IOC
        </Button>
        <Button
          variant="outlined"
          startIcon={<AnalyticsIcon />}
          onClick={() => setEnrichmentDialogOpen(true)}
          disabled={selectedIOCs.size === 0}
        >
          Enrich Selected ({selectedIOCs.size})
        </Button>
        <Button
          variant="text"
          startIcon={<RefreshIcon />}
          onClick={loadStats}
        >
          Refresh
        </Button>
      </Box>

      {/* IOCs Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Indicators of Compromise
          </Typography>
          {renderIOCTable()}
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Enrichment Jobs
          </Typography>
          {renderJobsTable()}
        </CardContent>
      </Card>

      {/* Add IOC Dialog */}
      <Dialog 
        open={newIOCDialogOpen} 
        onClose={() => setNewIOCDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New IOC</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>IOC Type</InputLabel>
              <Select
                value={newIOC.type || 'ip_address'}
                onChange={(e) => setNewIOC(prev => ({ ...prev, type: e.target.value as IOCType }))}
              >
                {IOC_TYPES.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="IOC Value"
              value={newIOC.value || ''}
              onChange={(e) => setNewIOC(prev => ({ ...prev, value: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Tags (comma separated)"
              value={newIOC.tags?.join(', ') || ''}
              onChange={(e) => setNewIOC(prev => ({ 
                ...prev, 
                tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
              }))}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewIOCDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddIOC} variant="contained">Add IOC</Button>
        </DialogActions>
      </Dialog>

      {/* Enrichment Options Dialog */}
      <Dialog
        open={enrichmentDialogOpen}
        onClose={() => setEnrichmentDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Configure Enrichment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="subtitle1">
              Selected IOCs: {selectedIOCs.size}
            </Typography>
            <Divider />
            
            <FormControl fullWidth>
              <InputLabel>Enrichment Providers</InputLabel>
              <Select
                multiple
                value={enrichmentOptions.providers}
                onChange={(e) => setEnrichmentOptions(prev => ({ 
                  ...prev, 
                  providers: e.target.value as EnrichmentProvider[]
                }))}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {ENRICHMENT_PROVIDERS.map(provider => (
                  <MenuItem key={provider} value={provider}>{provider}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Max Concurrency"
              type="number"
              value={enrichmentOptions.maxConcurrency}
              onChange={(e) => setEnrichmentOptions(prev => ({ 
                ...prev, 
                maxConcurrency: parseInt(e.target.value) || 3
              }))}
              inputProps={{ min: 1, max: 10 }}
            />

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={enrichmentOptions.forceRefresh}
                onChange={(e) => setEnrichmentOptions(prev => ({ 
                  ...prev, 
                  forceRefresh: e.target.checked
                }))}
              />
              <Typography sx={{ ml: 1 }}>
                Force refresh (bypass cache)
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnrichmentDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleEnrichIOCs} 
            variant="contained"
            disabled={loading || enrichmentOptions.providers.length === 0}
          >
            {loading ? 'Starting...' : 'Start Enrichment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Job Details Dialog */}
      <Dialog
        open={jobDetailsDialogOpen}
        onClose={() => setJobDetailsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Job Details: {selectedJob?.id}
        </DialogTitle>
        <DialogContent>
          {selectedJob && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {getJobStatusIcon(selectedJob.status)}
                <Typography variant="h6">{selectedJob.status}</Typography>
              </Box>
              
              <LinearProgress 
                variant="determinate" 
                value={selectedJob.progress.total > 0 
                  ? (selectedJob.progress.completed / selectedJob.progress.total) * 100 
                  : 0
                }
              />
              
              <Typography>
                Progress: {selectedJob.progress.completed}/{selectedJob.progress.total}
                ({selectedJob.progress.failed} failed, {selectedJob.progress.skipped} skipped)
              </Typography>

              <Box>
                <Typography variant="subtitle1">Providers:</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {selectedJob.providers.map(provider => (
                    <Chip key={provider} label={provider} size="small" />
                  ))}
                </Box>
              </Box>

              {selectedJob.errors.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" color="error">
                    Errors ({selectedJob.errors.length}):
                  </Typography>
                  {selectedJob.errors.slice(0, 5).map((error, index) => (
                    <Alert key={index} severity="error" sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        IOC: {error.iocId} | Provider: {error.provider}
                      </Typography>
                      <Typography variant="caption">
                        {error.error}
                      </Typography>
                    </Alert>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJobDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};