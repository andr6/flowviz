import {
  CloudUpload,
  Description,
  Error,
  CheckCircle,
  Warning,
  Settings,
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  Download,
  DeleteForever,
  Timeline,
  Assessment,
  ExpandMore,
  Info,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Divider,
  Paper,
  Grid,
  CircularProgress,
  Badge,
} from '@mui/material';
import React, { useState, useCallback, useEffect, useRef } from 'react';

import { useThemeContext } from '../../../shared/context/ThemeProvider';
import { BulkIOCUploadService, BulkUploadJob, BulkUploadSettings, BulkUploadProgress, JobStatus } from '../services/BulkIOCUploadService';

interface BulkIOCUploadProps {
  onJobComplete?: (jobId: string) => void;
  onIOCsProcessed?: (iocs: any[]) => void;
}

export const BulkIOCUpload: React.FC<BulkIOCUploadProps> = ({
  onJobComplete,
  onIOCsProcessed,
}) => {
  const { theme } = useThemeContext();
  const uploadService = BulkIOCUploadService.getInstance();
  
  // State
  const [jobs, setJobs] = useState<BulkUploadJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<BulkUploadJob | null>(null);
  const [jobProgress, setJobProgress] = useState<Record<string, BulkUploadProgress>>({});
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobName, setJobName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [settings, setSettings] = useState<Partial<BulkUploadSettings>>({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressUpdateInterval = useRef<NodeJS.Timeout>();

  // Load jobs on mount
  useEffect(() => {
    loadJobs();
    
    // Set up progress polling
    progressUpdateInterval.current = setInterval(() => {
      updateJobProgress();
    }, 2000);
    
    return () => {
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
      }
    };
  }, []);

  const loadJobs = () => {
    const userJobs = uploadService.getUserJobs('current-user'); // Would get from auth context
    setJobs(userJobs);
  };

  const updateJobProgress = () => {
    const activeJobs = jobs.filter(job => 
      ['pending', 'validating', 'processing', 'enriching', 'analyzing'].includes(job.status)
    );
    
    const progressUpdates: Record<string, BulkUploadProgress> = {};
    
    activeJobs.forEach(job => {
      const progress = uploadService.getJobProgress(job.id);
      if (progress) {
        progressUpdates[job.id] = progress;
      }
    });
    
    setJobProgress(progressUpdates);
    
    // Reload jobs if any completed
    if (Object.values(progressUpdates).some(p => p.status === 'completed')) {
      loadJobs();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setJobName(file.name.replace(/\.[^/.]+$/, '')); // Remove extension
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !jobName.trim()) return;
    
    setIsUploading(true);
    
    try {
      const jobId = await uploadService.createJob(
        jobName.trim(),
        selectedFile,
        settings,
        'current-user', // Would get from auth context
        jobDescription.trim() || undefined
      );
      
      // Reset form
      setSelectedFile(null);
      setJobName('');
      setJobDescription('');
      setUploadDialogOpen(false);
      
      // Reload jobs
      loadJobs();
      
      // Show success message
      console.log(`Upload job ${jobId} created successfully`);
      
    } catch (error) {
      console.error('Upload failed:', error);
      // Would show error notification
    } finally {
      setIsUploading(false);
    }
  };

  const handleJobAction = async (jobId: string, action: 'cancel' | 'retry' | 'delete') => {
    try {
      switch (action) {
        case 'cancel':
          await uploadService.cancelJob(jobId);
          break;
        case 'retry':
          await uploadService.retryJob(jobId);
          break;
        case 'delete':
          await uploadService.deleteJob(jobId);
          break;
      }
      loadJobs();
    } catch (error) {
      console.error(`Failed to ${action} job:`, error);
    }
  };

  const handleJobSelect = (job: BulkUploadJob) => {
    setSelectedJob(job);
  };

  const getStatusIcon = (status: JobStatus) => {
    const iconProps = { fontSize: 'small' as const };
    
    switch (status) {
      case 'completed':
        return <CheckCircle {...iconProps} sx={{ color: theme.colors.status.success }} />;
      case 'failed':
        return <Error {...iconProps} sx={{ color: theme.colors.status.error }} />;
      case 'cancelled':
        return <Stop {...iconProps} sx={{ color: theme.colors.text.secondary }} />;
      case 'pending':
      case 'validating':
      case 'processing':
      case 'enriching':
      case 'analyzing':
        return <CircularProgress size={16} />;
      default:
        return <Warning {...iconProps} sx={{ color: theme.colors.status.warning }} />;
    }
  };

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case 'completed': return theme.colors.status.success;
      case 'failed': return theme.colors.status.error;
      case 'cancelled': return theme.colors.text.secondary;
      default: return theme.colors.status.warning;
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const renderJobRow = (job: BulkUploadJob) => {
    const progress = jobProgress[job.id];
    const isActive = ['pending', 'validating', 'processing', 'enriching', 'analyzing'].includes(job.status);
    
    return (
      <TableRow
        key={job.id}
        hover
        onClick={() => handleJobSelect(job)}
        sx={{ cursor: 'pointer' }}
      >
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getStatusIcon(job.status)}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: theme.typography.fontWeight.medium }}>
                {job.name}
              </Typography>
              {job.description && (
                <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>
                  {job.description}
                </Typography>
              )}
            </Box>
          </Box>
        </TableCell>
        
        <TableCell>
          <Chip
            label={job.status.replace('_', ' ')}
            size="small"
            sx={{
              backgroundColor: `${getStatusColor(job.status)}20`,
              color: getStatusColor(job.status),
              textTransform: 'capitalize',
            }}
          />
        </TableCell>
        
        <TableCell>
          <Box sx={{ minWidth: 120 }}>
            {isActive && progress ? (
              <>
                <LinearProgress
                  variant="determinate"
                  value={progress.progress}
                  sx={{
                    mb: 0.5,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: theme.colors.brand.primary,
                    },
                  }}
                />
                <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>
                  {progress.itemsProcessed}/{progress.itemsTotal} ({progress.progress.toFixed(1)}%)
                </Typography>
              </>
            ) : (
              <Typography variant="body2">
                {job.successfulItems}/{job.totalItems}
                {job.status === 'completed' && (
                  <span style={{ color: theme.colors.status.success }}>
                    {' ✓'}
                  </span>
                )}
              </Typography>
            )}
          </Box>
        </TableCell>
        
        <TableCell>
          <Typography variant="body2">
            {job.metadata.fileType?.toUpperCase()}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>
            {job.metadata.fileSize ? `${(job.metadata.fileSize / 1024).toFixed(1)} KB` : ''}
          </Typography>
        </TableCell>
        
        <TableCell>
          <Typography variant="body2">
            {job.createdAt.toLocaleDateString()}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>
            {job.createdAt.toLocaleTimeString()}
          </Typography>
        </TableCell>
        
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {isActive && (
              <Tooltip title="Cancel">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJobAction(job.id, 'cancel');
                  }}
                >
                  <Stop fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            {job.status === 'failed' && (
              <Tooltip title="Retry">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJobAction(job.id, 'retry');
                  }}
                >
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            {['completed', 'failed', 'cancelled'].includes(job.status) && (
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJobAction(job.id, 'delete');
                  }}
                >
                  <DeleteForever fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </TableCell>
      </TableRow>
    );
  };

  const renderJobDetails = () => {
    if (!selectedJob) return null;
    
    const progress = jobProgress[selectedJob.id];
    const isActive = ['pending', 'validating', 'processing', 'enriching', 'analyzing'].includes(selectedJob.status);
    
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Job Details: {selectedJob.name}
            </Typography>
            <Chip
              label={selectedJob.status.replace('_', ' ')}
              sx={{
                backgroundColor: `${getStatusColor(selectedJob.status)}20`,
                color: getStatusColor(selectedJob.status),
                textTransform: 'capitalize',
              }}
            />
          </Box>
          
          {isActive && progress && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">
                  {progress.currentPhase}
                </Typography>
                <Typography variant="body2">
                  {progress.progress.toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress.progress}
                sx={{
                  mb: 1,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: theme.colors.brand.primary,
                  },
                }}
              />
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>
                    Processed: {progress.itemsProcessed}/{progress.itemsTotal}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>
                    Throughput: {progress.throughput.toFixed(1)}/s
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>
                    Error Rate: {(progress.errorRate * 100).toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>
                    ETA: {progress.estimatedTimeRemaining ? formatDuration(progress.estimatedTimeRemaining * 1000) : 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, backgroundColor: theme.colors.background.secondary }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: theme.typography.fontWeight.semibold }}>
                  Processing Summary
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>Total Items</Typography>
                    <Typography variant="body1" sx={{ fontWeight: theme.typography.fontWeight.medium }}>
                      {selectedJob.totalItems}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>Successful</Typography>
                    <Typography variant="body1" sx={{ fontWeight: theme.typography.fontWeight.medium, color: theme.colors.status.success }}>
                      {selectedJob.successfulItems}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>Failed</Typography>
                    <Typography variant="body1" sx={{ fontWeight: theme.typography.fontWeight.medium, color: theme.colors.status.error }}>
                      {selectedJob.failedItems}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>Duplicates</Typography>
                    <Typography variant="body1" sx={{ fontWeight: theme.typography.fontWeight.medium, color: theme.colors.status.warning }}>
                      {selectedJob.duplicateItems}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, backgroundColor: theme.colors.background.secondary }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: theme.typography.fontWeight.semibold }}>
                  File Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>Filename</Typography>
                    <Typography variant="body2">{selectedJob.metadata.fileName}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>Type</Typography>
                    <Typography variant="body2">{selectedJob.metadata.fileType?.toUpperCase()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>Size</Typography>
                    <Typography variant="body2">
                      {selectedJob.metadata.fileSize ? `${(selectedJob.metadata.fileSize / 1024).toFixed(1)} KB` : 'N/A'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>Created</Typography>
                    <Typography variant="body2">{selectedJob.createdAt.toLocaleString()}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
          
          {selectedJob.errors.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Error sx={{ color: theme.colors.status.error }} />
                    <Typography variant="subtitle2">
                      Errors ({selectedJob.errors.length})
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {selectedJob.errors.slice(0, 10).map((error, index) => (
                      <Alert key={error.id} severity="error" sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: theme.typography.fontWeight.medium }}>
                          {error.type.replace('_', ' ')}: {error.message}
                        </Typography>
                        {error.details && (
                          <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>
                            {error.details}
                          </Typography>
                        )}
                      </Alert>
                    ))}
                    {selectedJob.errors.length > 10 && (
                      <Typography variant="caption" sx={{ color: theme.colors.text.secondary }}>
                        ... and {selectedJob.errors.length - 10} more errors
                      </Typography>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderUploadDialog = () => (
    <Dialog
      open={uploadDialogOpen}
      onClose={() => setUploadDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudUpload sx={{ color: theme.colors.brand.primary }} />
          Bulk IOC Upload
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Supported formats: CSV, JSON, TXT, XML. Maximum file size: 50MB, up to 10,000 IOCs per upload.
          </Alert>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Job Name"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder="Enter a name for this upload job"
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description (Optional)"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Describe the source or purpose of these IOCs"
                multiline
                rows={2}
              />
            </Grid>
            
            <Grid item xs={12}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.txt,.xml"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <Button
                variant="outlined"
                startIcon={<Description />}
                onClick={() => fileInputRef.current?.click()}
                fullWidth
                sx={{ mb: 1 }}
              >
                {selectedFile ? selectedFile.name : 'Select File'}
              </Button>
              
              {selectedFile && (
                <Box sx={{ p: 2, backgroundColor: theme.colors.background.secondary, borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>File:</strong> {selectedFile.name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Size:</strong> {(selectedFile.size / 1024).toFixed(1)} KB
                  </Typography>
                  <Typography variant="body2">
                    <strong>Type:</strong> {selectedFile.type || 'Unknown'}
                  </Typography>
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12}>
              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={() => setSettingsDialogOpen(true)}
                fullWidth
              >
                Configure Settings
              </Button>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setUploadDialogOpen(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!selectedFile || !jobName.trim() || isUploading}
          startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUpload />}
        >
          {isUploading ? 'Uploading...' : 'Start Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const paginatedJobs = jobs.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: theme.typography.fontWeight.semibold }}>
          Bulk IOC Upload
        </Typography>
        <Button
          variant="contained"
          startIcon={<CloudUpload />}
          onClick={() => setUploadDialogOpen(true)}
        >
          New Upload
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Job Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>File Type</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" sx={{ color: theme.colors.text.secondary }}>
                        No upload jobs found. Create your first bulk upload to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedJobs.map(renderJobRow)
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {jobs.length > 0 && (
            <TablePagination
              component="div"
              count={jobs.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          )}
        </CardContent>
      </Card>

      {renderJobDetails()}
      {renderUploadDialog()}
    </Box>
  );
};