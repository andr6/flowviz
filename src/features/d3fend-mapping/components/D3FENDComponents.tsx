/**
 * D3FEND Mapping UI Components
 *
 * React components for visualizing D3FEND defensive countermeasure mappings,
 * coverage analysis, and security architecture.
 *
 * Components:
 * - D3FENDMatrixViewer: Visual matrix of ATT&CK techniques vs D3FEND countermeasures
 * - DefensiveCoverageHeatmap: Heatmap showing coverage levels by category
 * - CountermeasurePrioritizer: Prioritized list of recommended countermeasures
 * - ArchitectureDocGenerator: Tool to generate security architecture documents
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Alert,
  Stack,
  Divider,
  IconButton,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Info,
  Download,
  Visibility,
  TrendingUp,
  TrendingDown,
  Remove,
  Assessment,
  Security,
  Shield,
} from '@mui/icons-material';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface DefensiveCountermeasure {
  id: string;
  name: string;
  description: string;
  category: 'hardening' | 'detection' | 'isolation' | 'deception' | 'eviction' | 'restoration';
  artifactType: string;
  effectiveness: {
    prevention: number;
    detection: number;
    response: number;
    overall: number;
  };
  implementationComplexity: 'low' | 'medium' | 'high' | 'very_high';
  implementationCost: 'low' | 'medium' | 'high' | 'very_high';
  tools: Array<{ name: string; type: string }>;
}

interface DefenseMatrix {
  flowId: string;
  flowName: string;
  techniques: Array<{ id: string; name: string }>;
  countermeasures: DefensiveCountermeasure[];
  mappings: Array<{
    techniqueId: string;
    countermeasureId: string;
    effectiveness: { overall: number };
    priority: number;
  }>;
  coverage: {
    overall: { percentage: number; level: string };
    byCategory: Record<string, { percentage: number }>;
  };
  metadata: {
    totalTechniques: number;
    totalCountermeasures: number;
    avgCoveragePerTechnique: number;
  };
}

interface PrioritizedCountermeasure {
  countermeasure: DefensiveCountermeasure;
  priority: number;
  priorityLevel: 'critical' | 'high' | 'medium' | 'low';
  factors: {
    riskReduction: number;
    coverageIncrease: number;
    feasibility: number;
  };
  estimatedImpact: {
    techniquesAddressed: string[];
    coverageImprovement: number;
  };
  implementationPlan: {
    estimatedDuration: number;
    estimatedCost: number;
  };
  roi: {
    roi: number;
    paybackPeriod: number;
  };
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    hardening: '#1976d2',
    detection: '#388e3c',
    isolation: '#f57c00',
    deception: '#7b1fa2',
    eviction: '#c62828',
    restoration: '#0097a7',
  };
  return colors[category] || '#757575';
};

const getPriorityColor = (priority: number): string => {
  if (priority >= 85) return '#d32f2f';
  if (priority >= 70) return '#f57c00';
  if (priority >= 50) return '#fbc02d';
  return '#388e3c';
};

const getComplexityColor = (complexity: string): string => {
  const colors: Record<string, string> = {
    low: '#388e3c',
    medium: '#fbc02d',
    high: '#f57c00',
    very_high: '#d32f2f',
  };
  return colors[complexity] || '#757575';
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// =====================================================
// 1. D3FEND MATRIX VIEWER
// =====================================================

interface D3FENDMatrixViewerProps {
  matrix: DefenseMatrix | null;
  loading?: boolean;
  onTechniqueClick?: (techniqueId: string) => void;
  onCountermeasureClick?: (countermeasureId: string) => void;
}

export function D3FENDMatrixViewer({
  matrix,
  loading = false,
  onTechniqueClick,
  onCountermeasureClick,
}: D3FENDMatrixViewerProps) {
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);
  const [selectedCountermeasure, setSelectedCountermeasure] = useState<string | null>(null);

  // Build matrix data structure
  const matrixData = useMemo(() => {
    if (!matrix) return null;

    const data: Record<string, Record<string, number>> = {};

    matrix.techniques.forEach(tech => {
      data[tech.id] = {};
      matrix.countermeasures.forEach(cm => {
        data[tech.id][cm.id] = 0;
      });
    });

    matrix.mappings.forEach(mapping => {
      if (data[mapping.techniqueId]) {
        data[mapping.techniqueId][mapping.countermeasureId] = mapping.effectiveness.overall;
      }
    });

    return data;
  }, [matrix]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (!matrix || !matrixData) {
    return (
      <Alert severity="info">
        No defense matrix available. Generate a matrix from an attack flow to view defensive countermeasures.
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Defense Matrix: {matrix.flowName}
        </Typography>

        {/* Summary Statistics */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {matrix.metadata.totalTechniques}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ATT&CK Techniques
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {matrix.metadata.totalCountermeasures}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Countermeasures
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {matrix.metadata.avgCoveragePerTechnique.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Coverage/Technique
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color={matrix.coverage.overall.percentage >= 70 ? 'success.main' : 'error.main'}>
                {matrix.coverage.overall.percentage.toFixed(0)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overall Coverage ({matrix.coverage.overall.level})
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Matrix Heatmap */}
        <TableContainer component={Paper} sx={{ maxHeight: 600, overflow: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>ATT&CK Technique</TableCell>
                {matrix.countermeasures.map(cm => (
                  <TableCell
                    key={cm.id}
                    align="center"
                    sx={{
                      fontWeight: 'bold',
                      minWidth: 120,
                      cursor: 'pointer',
                      backgroundColor: selectedCountermeasure === cm.id ? 'action.selected' : 'inherit',
                      '&:hover': { backgroundColor: 'action.hover' },
                    }}
                    onClick={() => {
                      setSelectedCountermeasure(cm.id);
                      onCountermeasureClick?.(cm.id);
                    }}
                  >
                    <Tooltip title={`${cm.name} (${cm.category})`}>
                      <Box>
                        <Typography variant="caption" noWrap>
                          {cm.id}
                        </Typography>
                        <Chip
                          label={cm.category}
                          size="small"
                          sx={{
                            backgroundColor: getCategoryColor(cm.category),
                            color: 'white',
                            fontSize: '0.65rem',
                            height: 18,
                            mt: 0.5,
                          }}
                        />
                      </Box>
                    </Tooltip>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {matrix.techniques.map(tech => (
                <TableRow
                  key={tech.id}
                  sx={{
                    backgroundColor: selectedTechnique === tech.id ? 'action.selected' : 'inherit',
                    '&:hover': { backgroundColor: 'action.hover' },
                  }}
                >
                  <TableCell
                    sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                    onClick={() => {
                      setSelectedTechnique(tech.id);
                      onTechniqueClick?.(tech.id);
                    }}
                  >
                    <Tooltip title={tech.name}>
                      <Typography variant="body2" noWrap>
                        {tech.id}: {tech.name}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  {matrix.countermeasures.map(cm => {
                    const effectiveness = matrixData[tech.id][cm.id];
                    const hasMapping = effectiveness > 0;

                    return (
                      <TableCell
                        key={`${tech.id}-${cm.id}`}
                        align="center"
                        sx={{
                          backgroundColor: hasMapping
                            ? `rgba(76, 175, 80, ${effectiveness / 100})`
                            : 'inherit',
                          color: effectiveness > 50 ? 'white' : 'inherit',
                          cursor: hasMapping ? 'pointer' : 'default',
                        }}
                      >
                        {hasMapping ? (
                          <Tooltip title={`Effectiveness: ${effectiveness}%`}>
                            <Typography variant="body2" fontWeight="bold">
                              {effectiveness}%
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.disabled">
                            -
                          </Typography>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Legend */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Heatmap Legend: Darker green = higher effectiveness. Click technique/countermeasure for details.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// =====================================================
// 2. DEFENSIVE COVERAGE HEATMAP
// =====================================================

interface DefensiveCoverageHeatmapProps {
  coverage: {
    overall: { percentage: number; level: string };
    byCategory: Record<string, { percentage: number; level: string }>;
  };
  showCategoryBreakdown?: boolean;
}

export function DefensiveCoverageHeatmap({
  coverage,
  showCategoryBreakdown = true,
}: DefensiveCoverageHeatmapProps) {
  const getCoverageLevelColor = (percentage: number): string => {
    if (percentage >= 90) return '#2e7d32';
    if (percentage >= 70) return '#388e3c';
    if (percentage >= 50) return '#fbc02d';
    if (percentage >= 25) return '#f57c00';
    return '#d32f2f';
  };

  const getCoverageLevelIcon = (level: string) => {
    switch (level) {
      case 'comprehensive':
        return <CheckCircle sx={{ color: '#2e7d32' }} />;
      case 'substantial':
        return <CheckCircle sx={{ color: '#388e3c' }} />;
      case 'partial':
        return <Warning sx={{ color: '#fbc02d' }} />;
      case 'minimal':
        return <Warning sx={{ color: '#f57c00' }} />;
      case 'none':
        return <ErrorIcon sx={{ color: '#d32f2f' }} />;
      default:
        return <Info />;
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <Shield sx={{ mr: 1, verticalAlign: 'middle' }} />
          Defensive Coverage Analysis
        </Typography>

        {/* Overall Coverage */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center">
              {getCoverageLevelIcon(coverage.overall.level)}
              <Typography variant="subtitle1" sx={{ ml: 1 }}>
                Overall Coverage: {coverage.overall.level.charAt(0).toUpperCase() + coverage.overall.level.slice(1)}
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight="bold" color={getCoverageLevelColor(coverage.overall.percentage)}>
              {coverage.overall.percentage.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={coverage.overall.percentage}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: getCoverageLevelColor(coverage.overall.percentage),
              },
            }}
          />
        </Box>

        {/* Category Breakdown */}
        {showCategoryBreakdown && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              Coverage by Category
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(coverage.byCategory).map(([category, data]) => (
                <Grid item xs={12} sm={6} md={4} key={category}>
                  <Paper sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: getCategoryColor(category),
                          mr: 1,
                        }}
                      />
                      <Typography variant="body2" fontWeight="bold">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Typography>
                    </Box>
                    <Typography variant="h6" color={getCoverageLevelColor(data.percentage)}>
                      {data.percentage.toFixed(0)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={data.percentage}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        mt: 1,
                        backgroundColor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getCoverageLevelColor(data.percentage),
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {data.level}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================
// 3. COUNTERMEASURE PRIORITIZER
// =====================================================

interface CountermeasurePrioritizerProps {
  prioritized: PrioritizedCountermeasure[];
  onImplement?: (countermeasureId: string) => void;
  onViewDetails?: (countermeasureId: string) => void;
}

export function CountermeasurePrioritizer({
  prioritized,
  onImplement,
  onViewDetails,
}: CountermeasurePrioritizerProps) {
  const [selectedItem, setSelectedItem] = useState<PrioritizedCountermeasure | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const handleViewDetails = (item: PrioritizedCountermeasure) => {
    setSelectedItem(item);
    setDetailsDialogOpen(true);
    onViewDetails?.(item.countermeasure.id);
  };

  const getPriorityLevelLabel = (level: string): { label: string; color: string } => {
    const levels: Record<string, { label: string; color: string }> = {
      critical: { label: 'CRITICAL', color: '#d32f2f' },
      high: { label: 'HIGH', color: '#f57c00' },
      medium: { label: 'MEDIUM', color: '#fbc02d' },
      low: { label: 'LOW', color: '#388e3c' },
    };
    return levels[level] || { label: level.toUpperCase(), color: '#757575' };
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
          Prioritized Implementation Recommendations
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Countermeasures ranked by risk reduction potential, feasibility, and ROI
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Rank</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Countermeasure</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">
                  Priority
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">
                  Complexity
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">
                  Est. Cost
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">
                  ROI
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">
                  Payback
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {prioritized.map((item, index) => {
                const priorityLabel = getPriorityLevelLabel(item.priorityLevel);

                return (
                  <TableRow
                    key={item.countermeasure.id}
                    sx={{
                      '&:hover': { backgroundColor: 'action.hover' },
                      borderLeft: `4px solid ${getPriorityColor(item.priority)}`,
                    }}
                  >
                    <TableCell>
                      <Typography variant="h6" color="text.secondary">
                        #{index + 1}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {item.countermeasure.name}
                      </Typography>
                      <Box display="flex" gap={0.5} mt={0.5}>
                        <Chip
                          label={item.countermeasure.category}
                          size="small"
                          sx={{
                            backgroundColor: getCategoryColor(item.countermeasure.category),
                            color: 'white',
                            fontSize: '0.7rem',
                            height: 20,
                          }}
                        />
                        <Chip
                          label={`${item.estimatedImpact.techniquesAddressed.length} techniques`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={priorityLabel.label}
                        sx={{
                          backgroundColor: priorityLabel.color,
                          color: 'white',
                          fontWeight: 'bold',
                        }}
                      />
                      <Typography variant="caption" display="block" mt={0.5}>
                        {item.priority}/100
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={item.countermeasure.implementationComplexity.replace('_', ' ').toUpperCase()}
                        size="small"
                        sx={{
                          backgroundColor: getComplexityColor(item.countermeasure.implementationComplexity),
                          color: 'white',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatCurrency(item.implementationPlan.estimatedCost)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center">
                        {item.roi.roi >= 1 ? (
                          <TrendingUp sx={{ color: '#388e3c', mr: 0.5 }} fontSize="small" />
                        ) : (
                          <TrendingDown sx={{ color: '#d32f2f', mr: 0.5 }} fontSize="small" />
                        )}
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={item.roi.roi >= 1 ? 'success.main' : 'error.main'}
                        >
                          {item.roi.roi.toFixed(2)}x
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{item.roi.paybackPeriod} mo</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewDetails(item)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Implement">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => onImplement?.(item.countermeasure.id)}
                        >
                          <CheckCircle fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Details Dialog */}
        <Dialog
          open={detailsDialogOpen}
          onClose={() => setDetailsDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          {selectedItem && (
            <>
              <DialogTitle>
                {selectedItem.countermeasure.name}
                <Chip
                  label={getPriorityLevelLabel(selectedItem.priorityLevel).label}
                  size="small"
                  sx={{
                    ml: 2,
                    backgroundColor: getPriorityLevelLabel(selectedItem.priorityLevel).color,
                    color: 'white',
                  }}
                />
              </DialogTitle>
              <DialogContent>
                <Typography variant="body2" paragraph>
                  {selectedItem.countermeasure.description}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Prioritization Factors
                    </Typography>
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="caption">Risk Reduction</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={selectedItem.factors.riskReduction}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption">{selectedItem.factors.riskReduction}/100</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption">Coverage Increase</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={selectedItem.factors.coverageIncrease}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption">{selectedItem.factors.coverageIncrease}/100</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption">Feasibility</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={selectedItem.factors.feasibility}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption">{selectedItem.factors.feasibility}/100</Typography>
                      </Box>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Estimated Impact
                    </Typography>
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        <strong>Techniques Addressed:</strong> {selectedItem.estimatedImpact.techniquesAddressed.length}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Coverage Improvement:</strong> +{selectedItem.estimatedImpact.coverageImprovement.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2">
                        <strong>Implementation Time:</strong> {selectedItem.implementationPlan.estimatedDuration} days
                      </Typography>
                      <Typography variant="body2">
                        <strong>Estimated Cost:</strong> {formatCurrency(selectedItem.implementationPlan.estimatedCost)}
                      </Typography>
                    </Stack>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>
                  Available Tools
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {selectedItem.countermeasure.tools.map(tool => (
                    <Chip key={tool.name} label={`${tool.name} (${tool.type})`} size="small" variant="outlined" />
                  ))}
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    onImplement?.(selectedItem.countermeasure.id);
                    setDetailsDialogOpen(false);
                  }}
                >
                  Implement
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </CardContent>
    </Card>
  );
}

// =====================================================
// 4. ARCHITECTURE DOCUMENT GENERATOR
// =====================================================

interface ArchitectureDocGeneratorProps {
  matrixId: string;
  onGenerate: () => Promise<any>;
}

export function ArchitectureDocGenerator({ matrixId, onGenerate }: ArchitectureDocGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [document, setDocument] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const result = await onGenerate();
      setDocument(result.document);
    } catch (err: any) {
      setError(err.message || 'Failed to generate architecture document');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (format: 'pdf' | 'docx') => {
    // In production, trigger download from server
    console.log(`Downloading ${format} for document:`, document.title);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
          Security Architecture Document Generator
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Generate comprehensive security architecture documentation from defense matrix
        </Typography>

        {!document && !generating && (
          <Button
            variant="contained"
            size="large"
            onClick={handleGenerate}
            startIcon={<Assessment />}
            fullWidth
          >
            Generate Architecture Document
          </Button>
        )}

        {generating && (
          <Box display="flex" flexDirection="column" alignItems="center" py={4}>
            <CircularProgress size={60} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Generating security architecture document...
            </Typography>
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        {document && !generating && (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Architecture document generated successfully!
            </Alert>

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                {document.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Version {document.version} | Generated: {new Date(document.generatedAt).toLocaleString()}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" paragraph>
                <strong>Executive Summary:</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                {document.executiveSummary}
              </Typography>

              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, backgroundColor: '#e3f2fd', textAlign: 'center' }}>
                    <Typography variant="h5">{document.currentState.defenseMatrix.metadata.totalTechniques}</Typography>
                    <Typography variant="caption">Attack Techniques</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, backgroundColor: '#e8f5e9', textAlign: 'center' }}>
                    <Typography variant="h5">{document.currentState.defenseMatrix.metadata.totalCountermeasures}</Typography>
                    <Typography variant="caption">Countermeasures</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, backgroundColor: '#fff3e0', textAlign: 'center' }}>
                    <Typography variant="h5">{document.roadmap.phases.length}</Typography>
                    <Typography variant="caption">Implementation Phases</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Paper>

            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={() => handleDownload('pdf')}
                fullWidth
              >
                Download PDF
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => handleDownload('docx')}
                fullWidth
              >
                Download DOCX
              </Button>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  D3FENDMatrixViewer,
  DefensiveCoverageHeatmap,
  CountermeasurePrioritizer,
  ArchitectureDocGenerator,
};
