/**
 * Control Gap Analysis Component
 *
 * Displays security gaps identified during simulation and remediation recommendations
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stepper,
  Step,
  StepLabel,
  Checkbox,
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Assignment,
  Schedule,
  Build,
  TrendingUp,
  Info,
  Security,
  Add,
  Edit,
  Delete,
} from '@mui/icons-material';
import {
  GapAnalysis,
  RemediationRecommendation,
  GapSeverity,
  GapType,
  GapStatus,
  ControlGapAnalysisProps,
  ImplementationStep,
} from '../types';

export const ControlGapAnalysis: React.FC<ControlGapAnalysisProps> = ({
  jobId,
  onGapClick,
  onRecommendationClick,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gaps, setGaps] = useState<GapAnalysis[]>([]);
  const [recommendations, setRecommendations] = useState<RemediationRecommendation[]>([]);
  const [selectedGap, setSelectedGap] = useState<GapAnalysis | null>(null);
  const [showRecommendationDialog, setShowRecommendationDialog] = useState(false);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Stats
  const [stats, setStats] = useState({
    totalGaps: 0,
    criticalGaps: 0,
    highGaps: 0,
    mediumGaps: 0,
    lowGaps: 0,
    avgRiskScore: 0,
  });

  useEffect(() => {
    loadGapAnalysis();
  }, [jobId]);

  useEffect(() => {
    calculateStats();
  }, [gaps]);

  /**
   * Load gap analysis
   */
  const loadGapAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/simulations/jobs/${jobId}/gap-analysis`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to load gap analysis');
      }

      const data = await response.json();
      setGaps(data.gaps || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load gap analysis');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate statistics
   */
  const calculateStats = () => {
    setStats({
      totalGaps: gaps.length,
      criticalGaps: gaps.filter(g => g.severity === 'critical').length,
      highGaps: gaps.filter(g => g.severity === 'high').length,
      mediumGaps: gaps.filter(g => g.severity === 'medium').length,
      lowGaps: gaps.filter(g => g.severity === 'low').length,
      avgRiskScore: gaps.length > 0
        ? gaps.reduce((sum, g) => sum + (g.riskScore || 0), 0) / gaps.length
        : 0,
    });
  };

  /**
   * Load recommendations for gap
   */
  const loadRecommendations = async (gapId: string) => {
    try {
      const response = await fetch(`/api/simulations/gaps/${gapId}/recommendations`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to load recommendations');
      }

      const recs = await response.json();
      setRecommendations(recs);
      setShowRecommendationDialog(true);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load recommendations');
    }
  };

  /**
   * Update gap status
   */
  const updateGapStatus = async (gapId: string, status: GapStatus) => {
    try {
      const response = await fetch(`/api/simulations/gaps/${gapId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update gap status');
      }

      // Reload gaps
      await loadGapAnalysis();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update gap status');
    }
  };

  /**
   * Update recommendation step
   */
  const updateRecommendationStep = async (
    recommendationId: string,
    stepIndex: number,
    completed: boolean
  ) => {
    const recommendation = recommendations.find(r => r.id === recommendationId);
    if (!recommendation) return;

    const updatedSteps = [...recommendation.implementationSteps];
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      completed,
      completedAt: completed ? new Date() : undefined,
      completedBy: completed ? 'current-user' : undefined,
    };

    try {
      const response = await fetch(`/api/simulations/recommendations/${recommendationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ implementationSteps: updatedSteps }),
      });

      if (!response.ok) {
        throw new Error('Failed to update recommendation');
      }

      // Reload recommendations
      if (selectedGap) {
        await loadRecommendations(selectedGap.id);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update recommendation');
    }
  };

  /**
   * Get severity color
   */
  const getSeverityColor = (severity: GapSeverity): 'error' | 'warning' | 'info' | 'success' => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      case 'info':
        return 'info';
      default:
        return 'info';
    }
  };

  /**
   * Get severity icon
   */
  const getSeverityIcon = (severity: GapSeverity) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon />;
      case 'high':
        return <Error />;
      case 'medium':
        return <Warning />;
      case 'low':
        return <Info />;
      default:
        return <Info />;
    }
  };

  /**
   * Get type icon
   */
  const getTypeIcon = (type: GapType) => {
    switch (type) {
      case 'detection':
        return <Security />;
      case 'prevention':
        return <Security />;
      case 'visibility':
        return <TrendingUp />;
      case 'response':
        return <Assignment />;
      case 'coverage':
        return <Build />;
      default:
        return <Info />;
    }
  };

  /**
   * Filter gaps
   */
  const getFilteredGaps = () => {
    return gaps.filter(gap => {
      if (severityFilter !== 'all' && gap.severity !== severityFilter) return false;
      if (typeFilter !== 'all' && gap.gapType !== typeFilter) return false;
      if (statusFilter !== 'all' && gap.status !== statusFilter) return false;
      return true;
    });
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Gap Analysis
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

  const filteredGaps = getFilteredGaps();

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Security Gap Analysis
      </Typography>

      {/* Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Total Gaps
              </Typography>
              <Typography variant="h5">{stats.totalGaps}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={2}>
          <Card sx={{ bgcolor: 'error.light' }}>
            <CardContent>
              <Typography variant="subtitle2" color="error.contrastText">
                Critical
              </Typography>
              <Typography variant="h5" color="error.contrastText">
                {stats.criticalGaps}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={2}>
          <Card sx={{ bgcolor: 'warning.light' }}>
            <CardContent>
              <Typography variant="subtitle2" color="warning.contrastText">
                High
              </Typography>
              <Typography variant="h5" color="warning.contrastText">
                {stats.highGaps}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Medium
              </Typography>
              <Typography variant="h5">{stats.mediumGaps}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Low
              </Typography>
              <Typography variant="h5">{stats.lowGaps}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Avg Risk
              </Typography>
              <Typography variant="h5">{stats.avgRiskScore.toFixed(1)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Severity</InputLabel>
          <Select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} label="Severity">
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="info">Info</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Type</InputLabel>
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} label="Type">
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="detection">Detection</MenuItem>
            <MenuItem value="prevention">Prevention</MenuItem>
            <MenuItem value="visibility">Visibility</MenuItem>
            <MenuItem value="response">Response</MenuItem>
            <MenuItem value="coverage">Coverage</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} label="Status">
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="acknowledged">Acknowledged</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="resolved">Resolved</MenuItem>
            <MenuItem value="accepted">Accepted</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Gap List */}
      {filteredGaps.length === 0 ? (
        <Alert severity="success">
          No security gaps found! All techniques were properly detected and/or prevented.
        </Alert>
      ) : (
        <Box>
          {filteredGaps.map(gap => (
            <Accordion key={gap.id} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Box>{getSeverityIcon(gap.severity)}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1">{gap.title}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Chip
                        label={gap.severity}
                        color={getSeverityColor(gap.severity)}
                        size="small"
                      />
                      <Chip
                        icon={getTypeIcon(gap.gapType)}
                        label={gap.gapType}
                        size="small"
                        variant="outlined"
                      />
                      <Chip label={gap.status} size="small" />
                    </Box>
                  </Box>
                  {gap.riskScore && (
                    <Typography variant="h6" color="text.secondary">
                      Risk: {gap.riskScore.toFixed(1)}
                    </Typography>
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  <Typography variant="body2" paragraph>
                    {gap.description}
                  </Typography>

                  {gap.techniqueId && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Affected Technique:
                      </Typography>
                      <Typography variant="body2">
                        {gap.techniqueId} - {gap.techniqueName}
                      </Typography>
                    </Box>
                  )}

                  {gap.affectedAssets.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Affected Assets:
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {gap.affectedAssets.map(asset => (
                          <Chip key={asset} label={asset} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setSelectedGap(gap);
                        loadRecommendations(gap.id);
                        onGapClick?.(gap);
                      }}
                    >
                      View Recommendations
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => updateGapStatus(gap.id, 'acknowledged')}
                      disabled={gap.status !== 'open'}
                    >
                      Acknowledge
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => updateGapStatus(gap.id, 'in_progress')}
                      disabled={gap.status === 'resolved'}
                    >
                      In Progress
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      onClick={() => updateGapStatus(gap.id, 'resolved')}
                      disabled={gap.status === 'resolved'}
                    >
                      Mark Resolved
                    </Button>
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Recommendations Dialog */}
      <Dialog
        open={showRecommendationDialog}
        onClose={() => setShowRecommendationDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Remediation Recommendations
          {selectedGap && (
            <Typography variant="caption" display="block" color="text.secondary">
              {selectedGap.title}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {recommendations.length === 0 ? (
            <Alert severity="info">No recommendations available</Alert>
          ) : (
            <Box>
              {recommendations.map(rec => (
                <Card key={rec.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">{rec.title}</Typography>
                      <Chip label={`Priority: ${rec.priority}`} color="primary" size="small" />
                    </Box>

                    <Typography variant="body2" paragraph>
                      {rec.description}
                    </Typography>

                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Category:
                        </Typography>
                        <Typography variant="body2">{rec.category}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Complexity:
                        </Typography>
                        <Typography variant="body2">{rec.complexity}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Estimated Effort:
                        </Typography>
                        <Typography variant="body2">{rec.estimatedEffortHours || 'N/A'} hours</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          Estimated Cost:
                        </Typography>
                        <Typography variant="body2">{rec.estimatedCost}</Typography>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2" gutterBottom>
                      Implementation Steps
                    </Typography>

                    <Stepper orientation="vertical">
                      {rec.implementationSteps.map((step, index) => (
                        <Step key={index} active completed={step.completed}>
                          <StepLabel
                            icon={
                              <Checkbox
                                checked={step.completed}
                                onChange={e => updateRecommendationStep(rec.id, index, e.target.checked)}
                              />
                            }
                          >
                            <Typography variant="subtitle2">{step.title}</Typography>
                          </StepLabel>
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                            {step.description}
                          </Typography>
                          {step.estimatedHours && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 4 }}>
                              Estimated: {step.estimatedHours}h
                            </Typography>
                          )}
                        </Step>
                      ))}
                    </Stepper>

                    {rec.requiredTools.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Required Tools:
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          {rec.requiredTools.map(tool => (
                            <Chip key={tool} label={tool} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => onRecommendationClick?.(rec)}
                    >
                      View Full Details
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRecommendationDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ControlGapAnalysis;
