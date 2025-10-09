/**
 * Control Coverage Visualization Component
 *
 * Visual representation of defensive control coverage across MITRE ATT&CK techniques
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  LinearProgress,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Warning,
  Info,
  Refresh,
  Download,
  Visibility,
  Security,
  Shield,
} from '@mui/icons-material';
import {
  ControlCoverage,
  DefensiveCoverage,
  TechniqueCoverage,
} from '../types';

interface Props {
  jobId?: string;
  techniques?: any[];
}

// MITRE ATT&CK Tactics (in order)
const TACTICS = [
  'Reconnaissance',
  'Resource Development',
  'Initial Access',
  'Execution',
  'Persistence',
  'Privilege Escalation',
  'Defense Evasion',
  'Credential Access',
  'Discovery',
  'Lateral Movement',
  'Collection',
  'Command and Control',
  'Exfiltration',
  'Impact',
];

export const ControlCoverageVisualization: React.FC<Props> = ({ jobId, techniques = [] }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<DefensiveCoverage | null>(null);
  const [selectedTactic, setSelectedTactic] = useState<string>('all');
  const [selectedTechnique, setSelectedTechnique] = useState<TechniqueCoverage | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadCoverage();
  }, [jobId, techniques]);

  /**
   * Load control coverage data
   */
  const loadCoverage = async () => {
    try {
      setLoading(true);
      setError(null);

      if (jobId) {
        // Load from job results
        const response = await fetch(`/api/simulations/jobs/${jobId}/coverage`);
        if (response.ok) {
          const data = await response.json();
          processCoverageData(data);
        }
      } else if (techniques.length > 0) {
        // Map techniques to defensive coverage
        const response = await fetch('/api/simulations/controls/map', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ techniques }),
        });

        if (response.ok) {
          const data = await response.json();
          setCoverage(data);
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load coverage');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Process coverage data
   */
  const processCoverageData = (data: any) => {
    // Transform API response to DefensiveCoverage format
    // This is a simplified implementation
    setCoverage({
      techniques: data.map((item: any) => ({
        techniqueId: item.technique_id || '',
        techniqueName: item.technique_name || '',
        tactic: item.tactic || '',
        controlsCovering: item.controls_covering || [],
        coverageLevel: determineCoverageLevel(item.coverage_percentage || 0),
        detectionCapability: item.detection_capability || 0,
        preventionCapability: item.prevention_capability || 0,
      })),
      controlsMapped: data.map((item: any) => ({
        controlId: item.control_id || '',
        controlName: item.control_name || '',
        techniquesCovered: item.techniques_covered || [],
        effectiveness: item.effectiveness || 0,
      })),
      overallCoverage: calculateOverallCoverage(data),
      gaps: identifyGaps(data),
    });
  };

  /**
   * Determine coverage level
   */
  const determineCoverageLevel = (percentage: number): 'full' | 'partial' | 'none' => {
    if (percentage >= 80) return 'full';
    if (percentage > 0) return 'partial';
    return 'none';
  };

  /**
   * Calculate overall coverage
   */
  const calculateOverallCoverage = (data: any[]): number => {
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + (item.coverage_percentage || 0), 0);
    return total / data.length;
  };

  /**
   * Identify gaps
   */
  const identifyGaps = (data: any[]) => {
    return data
      .filter(item => (item.coverage_percentage || 0) < 50)
      .map(item => ({
        techniqueId: item.technique_id || '',
        techniqueName: item.technique_name || '',
        gapType: 'both' as const,
        recommendedControls: ['EDR', 'SIEM', 'Network Monitoring'],
      }));
  };

  /**
   * Get coverage color
   */
  const getCoverageColor = (level: 'full' | 'partial' | 'none'): string => {
    switch (level) {
      case 'full':
        return '#4caf50'; // green
      case 'partial':
        return '#ff9800'; // orange
      case 'none':
        return '#f44336'; // red
    }
  };

  /**
   * Get tactic techniques
   */
  const getTacticTechniques = (tactic: string) => {
    if (!coverage) return [];
    return coverage.techniques.filter(t => t.tactic === tactic || selectedTactic === 'all');
  };

  /**
   * Export coverage report
   */
  const exportCoverage = () => {
    if (!coverage) return;

    const csv = [
      ['Technique ID', 'Technique Name', 'Tactic', 'Coverage Level', 'Detection %', 'Prevention %', 'Controls'],
      ...coverage.techniques.map(t => [
        t.techniqueId,
        t.techniqueName,
        t.tactic,
        t.coverageLevel,
        t.detectionCapability.toString(),
        t.preventionCapability.toString(),
        t.controlsCovering.join('; '),
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `control-coverage-${Date.now()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Control Coverage Analysis
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

  if (!coverage) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="info">No coverage data available</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Control Coverage Analysis</Typography>
        <Box>
          <IconButton onClick={loadCoverage}>
            <Refresh />
          </IconButton>
          <Button startIcon={<Download />} onClick={exportCoverage}>
            Export
          </Button>
        </Box>
      </Box>

      {/* Overall Coverage Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Overall Coverage
              </Typography>
              <Typography variant="h4">{coverage.overallCoverage.toFixed(0)}%</Typography>
              <LinearProgress
                variant="determinate"
                value={coverage.overallCoverage}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Fully Covered
              </Typography>
              <Typography variant="h4" color="success.main">
                {coverage.techniques.filter(t => t.coverageLevel === 'full').length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                of {coverage.techniques.length} techniques
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Partial Coverage
              </Typography>
              <Typography variant="h4" color="warning.main">
                {coverage.techniques.filter(t => t.coverageLevel === 'partial').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                No Coverage
              </Typography>
              <Typography variant="h4" color="error.main">
                {coverage.techniques.filter(t => t.coverageLevel === 'none').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tactic Filter */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Filter by Tactic</InputLabel>
        <Select
          value={selectedTactic}
          onChange={e => setSelectedTactic(e.target.value)}
          label="Filter by Tactic"
        >
          <MenuItem value="all">All Tactics</MenuItem>
          {TACTICS.map(tactic => (
            <MenuItem key={tactic} value={tactic}>
              {tactic}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Coverage Heatmap */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Coverage Heatmap
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
            gap: 1,
          }}
        >
          {getTacticTechniques(selectedTactic).map(technique => (
            <Tooltip
              key={technique.techniqueId}
              title={`${technique.techniqueId}: ${technique.techniqueName} - ${technique.coverageLevel}`}
            >
              <Box
                sx={{
                  bgcolor: getCoverageColor(technique.coverageLevel),
                  height: 60,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  '&:hover': {
                    opacity: 0.8,
                  },
                }}
                onClick={() => {
                  setSelectedTechnique(technique);
                  setShowDetailsDialog(true);
                }}
              >
                <Typography variant="caption" color="white" fontWeight="bold">
                  {technique.techniqueId}
                </Typography>
              </Box>
            </Tooltip>
          ))}
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#4caf50', borderRadius: 0.5 }} />
          <Typography variant="caption">Full Coverage</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#ff9800', borderRadius: 0.5 }} />
          <Typography variant="caption">Partial Coverage</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 20, height: 20, bgcolor: '#f44336', borderRadius: 0.5 }} />
          <Typography variant="caption">No Coverage</Typography>
        </Box>
      </Box>

      {/* Controls Table */}
      <Typography variant="h6" gutterBottom>
        Control Effectiveness
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Control ID</TableCell>
              <TableCell>Control Name</TableCell>
              <TableCell>Techniques Covered</TableCell>
              <TableCell>Effectiveness</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coverage.controlsMapped.slice(0, 10).map(control => (
              <TableRow key={control.controlId} hover>
                <TableCell>{control.controlId}</TableCell>
                <TableCell>{control.controlName}</TableCell>
                <TableCell>{control.techniquesCovered.length}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={control.effectiveness}
                      sx={{ width: 100 }}
                    />
                    <Typography variant="caption">{control.effectiveness.toFixed(0)}%</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Coverage Gaps */}
      {coverage.gaps.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Coverage Gaps
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {coverage.gaps.length} technique(s) have insufficient coverage
          </Alert>
          <List>
            {coverage.gaps.slice(0, 5).map(gap => (
              <ListItem key={gap.techniqueId}>
                <ListItemText
                  primary={`${gap.techniqueId} - ${gap.techniqueName}`}
                  secondary={`Recommended: ${gap.recommendedControls.join(', ')}`}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Details Dialog */}
      <Dialog
        open={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedTechnique?.techniqueId} - {selectedTechnique?.techniqueName}
        </DialogTitle>
        <DialogContent>
          {selectedTechnique && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Tactic
                  </Typography>
                  <Typography>{selectedTechnique.tactic}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Coverage Level
                  </Typography>
                  <Chip
                    label={selectedTechnique.coverageLevel}
                    sx={{
                      bgcolor: getCoverageColor(selectedTechnique.coverageLevel),
                      color: 'white',
                    }}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Detection Capability
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={selectedTechnique.detectionCapability}
                      sx={{ flex: 1 }}
                    />
                    <Typography variant="body2">
                      {selectedTechnique.detectionCapability.toFixed(0)}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Prevention Capability
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={selectedTechnique.preventionCapability}
                      sx={{ flex: 1 }}
                    />
                    <Typography variant="body2">
                      {selectedTechnique.preventionCapability.toFixed(0)}%
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Covering Controls ({selectedTechnique.controlsCovering.length})
              </Typography>
              <List dense>
                {selectedTechnique.controlsCovering.map(control => (
                  <ListItem key={control}>
                    <ListItemText primary={control} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ControlCoverageVisualization;
