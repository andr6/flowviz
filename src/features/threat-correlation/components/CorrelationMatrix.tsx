/**
 * Correlation Matrix
 * Visualizes correlation scores between attack flows in a heatmap
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tooltip,
  CircularProgress,
  Alert,
  Button,
  IconButton,
} from '@mui/material';
import { Download, ZoomIn, ZoomOut } from '@mui/icons-material';

import type { CorrelationMatrix as CorrelationMatrixType, CorrelationMatrixCell } from '../types';

interface CorrelationMatrixProps {
  flowIds?: string[];
  minScore?: number;
  onCellClick?: (cell: CorrelationMatrixCell) => void;
}

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({
  flowIds,
  minScore = 0.3,
  onCellClick,
}) => {
  const [matrix, setMatrix] = useState<CorrelationMatrixType | null>(null);
  const [loading, setLoading] = useState(true);
  const [cellSize, setCellSize] = useState(40);
  const [hoveredCell, setHoveredCell] = useState<{ i: number; j: number } | null>(null);

  useEffect(() => {
    loadMatrix();
  }, [flowIds, minScore]);

  const loadMatrix = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (flowIds) params.append('flowIds', flowIds.join(','));
      params.append('minScore', minScore.toString());

      const response = await fetch(`/api/correlation/matrix?${params}`);
      const data = await response.json();
      setMatrix(data);
    } catch (error) {
      console.error('Failed to load correlation matrix:', error);
    } finally {
      setLoading(false);
    }
  };

  const getColorForScore = (score: number): string => {
    if (score >= 0.8) return '#dc2626'; // Red - high correlation
    if (score >= 0.6) return '#f59e0b'; // Orange
    if (score >= 0.4) return '#fbbf24'; // Yellow
    if (score >= 0.2) return '#a3e635'; // Light green
    return '#10b981'; // Green - low correlation
  };

  const handleExport = () => {
    if (!matrix) return;
    
    // Export as CSV
    const csv = generateCSV(matrix);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `correlation-matrix-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateCSV = (matrix: CorrelationMatrixType): string => {
    const headers = ['Flow', ...matrix.flows.map(f => f.name || f.id.slice(0, 8))];
    const rows = matrix.matrix.map((row, i) => [
      matrix.flows[i].name || matrix.flows[i].id.slice(0, 8),
      ...row.map(cell => cell.score.toFixed(3)),
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!matrix || matrix.flows.length === 0) {
    return (
      <Alert severity="info">
        No correlation data available. Run analysis to generate correlation matrix.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Correlation Matrix
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {matrix.flows.length} flows, {matrix.statistics.totalCorrelations} correlations detected
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton size="small" onClick={() => setCellSize(Math.max(20, cellSize - 10))}>
            <ZoomOut />
          </IconButton>
          <IconButton size="small" onClick={() => setCellSize(Math.min(60, cellSize + 10))}>
            <ZoomIn />
          </IconButton>
          <Button
            size="small"
            startIcon={<Download />}
            onClick={handleExport}
            variant="outlined"
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Statistics */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 4 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Total Correlations
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {matrix.statistics.totalCorrelations}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Avg Score
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {(matrix.statistics.avgScore * 100).toFixed(1)}%
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Highest Score
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {(matrix.statistics.highestScore * 100).toFixed(1)}%
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Matrix Visualization */}
      <Paper sx={{ p: 2, overflowX: 'auto' }}>
        <Box sx={{ display: 'inline-block' }}>
          {/* Column headers */}
          <Box sx={{ display: 'flex', ml: `${cellSize + 120}px` }}>
            {matrix.flows.map((flow, i) => (
              <Box
                key={i}
                sx={{
                  width: cellSize,
                  height: cellSize + 40,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    fontSize: 10,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: cellSize + 40,
                  }}
                >
                  {flow.name || `Flow ${i + 1}`}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Matrix rows */}
          {matrix.matrix.map((row, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center' }}>
              {/* Row header */}
              <Box
                sx={{
                  width: 120,
                  pr: 1,
                  textAlign: 'right',
                }}
              >
                <Typography variant="caption" sx={{ fontSize: 10 }}>
                  {matrix.flows[i].name || `Flow ${i + 1}`}
                </Typography>
              </Box>

              {/* Matrix cells */}
              {row.map((cell, j) => (
                <Tooltip
                  key={j}
                  title={
                    i === j
                      ? 'Self'
                      : `Correlation: ${(cell.score * 100).toFixed(1)}%\nType: ${cell.type}`
                  }
                  arrow
                >
                  <Box
                    sx={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: i === j ? '#f3f4f6' : getColorForScore(cell.score),
                      border: '1px solid white',
                      cursor: i === j ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: hoveredCell?.i === i || hoveredCell?.j === j ? 1 : 0.9,
                      transform:
                        hoveredCell?.i === i && hoveredCell?.j === j
                          ? 'scale(1.1)'
                          : 'scale(1)',
                      zIndex: hoveredCell?.i === i && hoveredCell?.j === j ? 10 : 1,
                      position: 'relative',
                    }}
                    onClick={() => i !== j && cell.hasCorrelation && onCellClick?.(cell)}
                    onMouseEnter={() => setHoveredCell({ i, j })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {i !== j && cell.hasCorrelation && cellSize >= 35 && (
                      <Typography variant="caption" sx={{ fontSize: 9, color: 'white', fontWeight: 600 }}>
                        {Math.round(cell.score * 100)}
                      </Typography>
                    )}
                  </Box>
                </Tooltip>
              ))}
            </Box>
          ))}

          {/* Legend */}
          <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Correlation Score:
            </Typography>
            {[
              { label: 'Low (< 0.4)', color: '#10b981' },
              { label: 'Medium (0.4-0.6)', color: '#fbbf24' },
              { label: 'High (0.6-0.8)', color: '#f59e0b' },
              { label: 'Very High (≥ 0.8)', color: '#dc2626' },
            ].map(({ label, color }) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    backgroundColor: color,
                    border: '1px solid white',
                  }}
                />
                <Typography variant="caption">{label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
