/**
 * Validation Results Viewer Component
 *
 * Displays validation results from attack simulation execution
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Collapse,
  Alert,
  LinearProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  CheckCircle,
  Cancel,
  Warning,
  Error as ErrorIcon,
  Visibility,
  Download,
  FilterList,
} from '@mui/icons-material';
import {
  ValidationResult,
  ValidationResultStatus,
  ValidationResultsViewerProps,
} from '../types';

interface ResultRow {
  result: ValidationResult;
  open: boolean;
}

export const ValidationResultsViewer: React.FC<ValidationResultsViewerProps> = ({
  jobId,
  onTechniqueClick,
  showFilters = true,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [detailsDialog, setDetailsDialog] = useState<ValidationResult | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [detectionFilter, setDetectionFilter] = useState<string>('all');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    detected: 0,
    prevented: 0,
    succeeded: 0,
    failed: 0,
    blocked: 0,
  });

  useEffect(() => {
    loadValidationResults();
  }, [jobId]);

  useEffect(() => {
    filterResults();
  }, [results, searchQuery, statusFilter, detectionFilter]);

  useEffect(() => {
    calculateStats();
  }, [results]);

  /**
   * Load validation results
   */
  const loadValidationResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/simulations/jobs/${jobId}/results`);

      if (!response.ok) {
        throw new Error('Failed to load validation results');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filter results
   */
  const filterResults = () => {
    let filtered = [...results];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        r =>
          r.techniqueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.techniqueId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.resultStatus === statusFilter);
    }

    // Detection filter
    if (detectionFilter === 'detected') {
      filtered = filtered.filter(r => r.wasDetected);
    } else if (detectionFilter === 'not_detected') {
      filtered = filtered.filter(r => !r.wasDetected);
    } else if (detectionFilter === 'prevented') {
      filtered = filtered.filter(r => r.wasPrevented);
    } else if (detectionFilter === 'not_prevented') {
      filtered = filtered.filter(r => !r.wasPrevented);
    }

    setRows(filtered.map(result => ({ result, open: false })));
  };

  /**
   * Calculate statistics
   */
  const calculateStats = () => {
    setStats({
      total: results.length,
      detected: results.filter(r => r.wasDetected).length,
      prevented: results.filter(r => r.wasPrevented).length,
      succeeded: results.filter(r => r.resultStatus === 'success').length,
      failed: results.filter(r => r.resultStatus === 'failed').length,
      blocked: results.filter(r => r.resultStatus === 'blocked').length,
    });
  };

  /**
   * Toggle row expansion
   */
  const toggleRow = (index: number) => {
    setRows(prev =>
      prev.map((row, i) => (i === index ? { ...row, open: !row.open } : row))
    );
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status: ValidationResultStatus) => {
    switch (status) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'blocked':
        return <Cancel color="warning" />;
      case 'detected':
        return <Visibility color="info" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'skipped':
        return <Warning color="warning" />;
      case 'timeout':
        return <ErrorIcon color="error" />;
      default:
        return null;
    }
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: ValidationResultStatus): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (status) {
      case 'success':
      case 'detected':
        return 'success';
      case 'failed':
      case 'timeout':
        return 'error';
      case 'blocked':
      case 'skipped':
        return 'warning';
      default:
        return 'default';
    }
  };

  /**
   * Export results
   */
  const exportResults = () => {
    const csv = [
      ['Technique ID', 'Technique Name', 'Status', 'Detected', 'Prevented', 'Detection Time (s)'],
      ...results.map(r => [
        r.techniqueId,
        r.techniqueName,
        r.resultStatus,
        r.wasDetected ? 'Yes' : 'No',
        r.wasPrevented ? 'Yes' : 'No',
        r.detectionTimeSeconds?.toString() || 'N/A',
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation-results-${jobId}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Validation Results
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

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Validation Results</Typography>
        <Button startIcon={<Download />} onClick={exportResults}>
          Export
        </Button>
      </Box>

      {/* Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Total
              </Typography>
              <Typography variant="h5">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Detected
              </Typography>
              <Typography variant="h5" color="info.main">
                {stats.detected}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Prevented
              </Typography>
              <Typography variant="h5" color="warning.main">
                {stats.prevented}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Succeeded
              </Typography>
              <Typography variant="h5" color="success.main">
                {stats.succeeded}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Blocked
              </Typography>
              <Typography variant="h5" color="warning.main">
                {stats.blocked}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Failed
              </Typography>
              <Typography variant="h5" color="error.main">
                {stats.failed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      {showFilters && (
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label="Search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} label="Status">
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="success">Success</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="blocked">Blocked</MenuItem>
              <MenuItem value="detected">Detected</MenuItem>
              <MenuItem value="skipped">Skipped</MenuItem>
              <MenuItem value="timeout">Timeout</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Detection</InputLabel>
            <Select value={detectionFilter} onChange={e => setDetectionFilter(e.target.value)} label="Detection">
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="detected">Detected</MenuItem>
              <MenuItem value="not_detected">Not Detected</MenuItem>
              <MenuItem value="prevented">Prevented</MenuItem>
              <MenuItem value="not_prevented">Not Prevented</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Results Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Technique ID</TableCell>
              <TableCell>Technique Name</TableCell>
              <TableCell>Tactic</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Detected</TableCell>
              <TableCell>Prevented</TableCell>
              <TableCell>Detection Time</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <React.Fragment key={row.result.id}>
                <TableRow hover>
                  <TableCell>
                    <IconButton size="small" onClick={() => toggleRow(index)}>
                      {row.open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                  </TableCell>
                  <TableCell>{row.result.techniqueId}</TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                      onClick={() => onTechniqueClick?.(row.result)}
                    >
                      {row.result.techniqueName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={row.result.tactic || 'N/A'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(row.result.resultStatus)}
                      label={row.result.resultStatus}
                      color={getStatusColor(row.result.resultStatus)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {row.result.wasDetected ? (
                      <CheckCircle color="success" fontSize="small" />
                    ) : (
                      <Cancel color="error" fontSize="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {row.result.wasPrevented ? (
                      <CheckCircle color="success" fontSize="small" />
                    ) : (
                      <Cancel color="error" fontSize="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {row.result.detectionTimeSeconds
                      ? `${row.result.detectionTimeSeconds.toFixed(2)}s`
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => setDetailsDialog(row.result)}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                    <Collapse in={row.open} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Details
                        </Typography>

                        <Grid container spacing={2}>
                          {row.result.detectedBy.length > 0 && (
                            <Grid item xs={12} md={6}>
                              <Typography variant="caption" color="text.secondary">
                                Detected By:
                              </Typography>
                              <Box sx={{ mt: 0.5 }}>
                                {row.result.detectedBy.map(detector => (
                                  <Chip key={detector} label={detector} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                                ))}
                              </Box>
                            </Grid>
                          )}

                          {row.result.preventedBy.length > 0 && (
                            <Grid item xs={12} md={6}>
                              <Typography variant="caption" color="text.secondary">
                                Prevented By:
                              </Typography>
                              <Box sx={{ mt: 0.5 }}>
                                {row.result.preventedBy.map(preventer => (
                                  <Chip key={preventer} label={preventer} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                                ))}
                              </Box>
                            </Grid>
                          )}

                          {row.result.detectionRulesTriggered.length > 0 && (
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">
                                Detection Rules Triggered:
                              </Typography>
                              <Box sx={{ mt: 0.5 }}>
                                {row.result.detectionRulesTriggered.map(rule => (
                                  <Chip key={rule} label={rule} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                                ))}
                              </Box>
                            </Grid>
                          )}

                          {row.result.notes && (
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary">
                                Notes:
                              </Typography>
                              <Typography variant="body2">{row.result.notes}</Typography>
                            </Grid>
                          )}
                        </Grid>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Details Dialog */}
      <Dialog
        open={Boolean(detailsDialog)}
        onClose={() => setDetailsDialog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {detailsDialog?.techniqueId} - {detailsDialog?.techniqueName}
        </DialogTitle>
        <DialogContent>
          {detailsDialog && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={detailsDialog.resultStatus}
                    color={getStatusColor(detailsDialog.resultStatus)}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Detection
                  </Typography>
                  <Typography>
                    Detected: {detailsDialog.wasDetected ? 'Yes' : 'No'}<br />
                    Prevented: {detailsDialog.wasPrevented ? 'Yes' : 'No'}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Timing
                  </Typography>
                  <Typography>
                    Executed: {new Date(detailsDialog.executedAt).toLocaleString()}<br />
                    Duration: {detailsDialog.durationSeconds?.toFixed(2) || 'N/A'}s<br />
                    Detection Time: {detailsDialog.detectionTimeSeconds?.toFixed(2) || 'N/A'}s
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Alerts
                  </Typography>
                  <Typography>
                    Alerts Generated: {detailsDialog.alertsGenerated}<br />
                    Confidence: {detailsDialog.confidenceScore || 0}%
                  </Typography>
                </Grid>

                {detailsDialog.artifacts.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Artifacts ({detailsDialog.artifacts.length})
                    </Typography>
                    <List dense>
                      {detailsDialog.artifacts.map(artifact => (
                        <ListItem key={artifact.id}>
                          <ListItemText
                            primary={artifact.name}
                            secondary={`Type: ${artifact.type} | ${new Date(artifact.collectedAt).toLocaleString()}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                )}

                {detailsDialog.notes && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography variant="body2">{detailsDialog.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ValidationResultsViewer;
