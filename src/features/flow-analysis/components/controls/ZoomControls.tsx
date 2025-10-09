import {
  ZoomIn,
  ZoomOut,
  CenterFocusStrong as CenterIcon,
  Fullscreen,
  FullscreenExit,
  AspectRatio as FitViewIcon,
  Map as MinimapIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import {
  Box,
  IconButton,
  Tooltip,
  Slider,
  Typography,
  Card,
  CardContent,
  Collapse,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useReactFlow, useViewport, Viewport, Node, Edge } from 'reactflow';

import { useThemeContext } from '../../../../shared/context/ThemeProvider';

interface ZoomControlsProps {
  nodes: Node[];
  edges: Edge[];
  onFullscreenToggle?: (isFullscreen: boolean) => void;
  isFullscreen?: boolean;
}

interface MinimapProps {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
  width?: number;
  height?: number;
}

const Minimap: React.FC<MinimapProps> = ({
  nodes,
  edges,
  viewport,
  onViewportChange,
  width = 200,
  height = 150,
}) => {
  const { theme } = useThemeContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate node bounds
  const getNodeBounds = useCallback(() => {
    if (nodes.length === 0) {return { minX: 0, minY: 0, maxX: width, maxY: height };}

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
      const x = node.position.x;
      const y = node.position.y;
      const nodeWidth = node.width || 150;
      const nodeHeight = node.height || 50;
      
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + nodeWidth);
      maxY = Math.max(maxY, y + nodeHeight);
    });

    return { minX, minY, maxX, maxY };
  }, [nodes, width, height]);

  // Draw minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {return;}

    const ctx = canvas.getContext('2d');
    if (!ctx) {return;}

    const bounds = getNodeBounds();
    const graphWidth = bounds.maxX - bounds.minX;
    const graphHeight = bounds.maxY - bounds.minY;

    // Clear canvas
    ctx.fillStyle = theme.colors.background.primary;
    ctx.fillRect(0, 0, width, height);

    // Calculate scaling
    const scaleX = width / Math.max(graphWidth, 1);
    const scaleY = height / Math.max(graphHeight, 1);
    const scale = Math.min(scaleX, scaleY, 1);

    const offsetX = (width - graphWidth * scale) / 2;
    const offsetY = (height - graphHeight * scale) / 2;

    // Draw edges
    ctx.strokeStyle = theme.colors.surface.border.default;
    ctx.lineWidth = 1;
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const sourceX = offsetX + (sourceNode.position.x - bounds.minX) * scale;
        const sourceY = offsetY + (sourceNode.position.y - bounds.minY) * scale;
        const targetX = offsetX + (targetNode.position.x - bounds.minX) * scale;
        const targetY = offsetY + (targetNode.position.y - bounds.minY) * scale;
        
        ctx.beginPath();
        ctx.moveTo(sourceX, sourceY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      const x = offsetX + (node.position.x - bounds.minX) * scale;
      const y = offsetY + (node.position.y - bounds.minY) * scale;
      const nodeWidth = Math.max((node.width || 150) * scale, 3);
      const nodeHeight = Math.max((node.height || 50) * scale, 3);

      // Node background
      ctx.fillStyle = theme.colors.brand.primary;
      ctx.fillRect(x - nodeWidth/2, y - nodeHeight/2, nodeWidth, nodeHeight);

      // Node border
      ctx.strokeStyle = theme.colors.surface.border.emphasis;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x - nodeWidth/2, y - nodeHeight/2, nodeWidth, nodeHeight);
    });

    // Draw viewport rectangle
    const viewportX = offsetX - (bounds.minX * viewport.zoom + viewport.x) * scale;
    const viewportY = offsetY - (bounds.minY * viewport.zoom + viewport.y) * scale;
    const viewportWidth = width * scale / viewport.zoom;
    const viewportHeight = height * scale / viewport.zoom;

    ctx.strokeStyle = theme.colors.brand.primary;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
    ctx.setLineDash([]);

    // Fill viewport with semi-transparent overlay
    ctx.fillStyle = `${theme.colors.brand.primary}20`;
    ctx.fillRect(viewportX, viewportY, viewportWidth, viewportHeight);

  }, [nodes, edges, viewport, theme, width, height, getNodeBounds]);

  // Handle minimap interactions
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) {return;}

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const bounds = getNodeBounds();
    const graphWidth = bounds.maxX - bounds.minX;
    const graphHeight = bounds.maxY - bounds.minY;
    const scaleX = width / Math.max(graphWidth, 1);
    const scaleY = height / Math.max(graphHeight, 1);
    const scale = Math.min(scaleX, scaleY, 1);
    
    const offsetX = (width - graphWidth * scale) / 2;
    const offsetY = (height - graphHeight * scale) / 2;

    // Convert minimap coordinates to graph coordinates
    const graphX = bounds.minX + (x - offsetX) / scale;
    const graphY = bounds.minY + (y - offsetY) / scale;

    // Update viewport to center on clicked point
    onViewportChange({
      x: -graphX * viewport.zoom + window.innerWidth / 2,
      y: -graphY * viewport.zoom + window.innerHeight / 2,
      zoom: viewport.zoom,
    });
  }, [viewport, onViewportChange, getNodeBounds, width, height]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) {return;}
    handleMouseDown(event);
  }, [isDragging, handleMouseDown]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <Box
      sx={{
        border: `2px solid ${theme.colors.surface.border.default}`,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        backgroundColor: theme.colors.background.secondary,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ display: 'block' }}
      />
    </Box>
  );
};

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  nodes,
  edges,
  onFullscreenToggle,
  isFullscreen = false,
}) => {
  const { theme } = useThemeContext();
  const { zoomIn, zoomOut, zoomTo, fitView, setCenter } = useReactFlow();
  const viewport = useViewport();
  const [expanded, setExpanded] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [autoFit, setAutoFit] = useState(false);

  // Zoom levels
  const minZoom = 0.1;
  const maxZoom = 4;
  const zoomStep = 0.2;

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 300 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 300 });
  }, [zoomOut]);

  const handleZoomToFit = useCallback(() => {
    fitView({ 
      duration: 500, 
      padding: 0.1,
      includeHiddenNodes: false 
    });
  }, [fitView]);

  const handleCenter = useCallback(() => {
    if (nodes.length === 0) {return;}

    // Calculate center of all nodes
    let totalX = 0, totalY = 0;
    nodes.forEach(node => {
      totalX += node.position.x;
      totalY += node.position.y;
    });

    const centerX = totalX / nodes.length;
    const centerY = totalY / nodes.length;

    setCenter(centerX, centerY, { duration: 500, zoom: viewport.zoom });
  }, [nodes, setCenter, viewport.zoom]);

  const handleZoomSliderChange = useCallback((_: Event, value: number | number[]) => {
    const zoom = Array.isArray(value) ? value[0] : value;
    zoomTo(zoom, { duration: 200 });
  }, [zoomTo]);

  const handleFullscreenToggle = useCallback(() => {
    onFullscreenToggle?.(!isFullscreen);
  }, [onFullscreenToggle, isFullscreen]);

  const handleViewportChange = useCallback((newViewport: Viewport) => {
    // This would be handled by the parent component
    // For now, we'll just use the existing zoom/pan methods
    zoomTo(newViewport.zoom, { duration: 200 });
    setCenter(-newViewport.x / newViewport.zoom, -newViewport.y / newViewport.zoom, { 
      duration: 200, 
      zoom: newViewport.zoom 
    });
  }, [zoomTo, setCenter]);

  // Auto-fit when enabled and nodes change
  useEffect(() => {
    if (autoFit && nodes.length > 0) {
      const timer = setTimeout(() => {
        handleZoomToFit();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [nodes, autoFit, handleZoomToFit]);

  const zoomPercentage = Math.round(viewport.zoom * 100);

  return (
    <Card
      sx={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: theme.colors.background.glassHeavy,
        backdropFilter: theme.effects.blur.xl,
        border: `1px solid ${theme.colors.surface.border.default}`,
        borderRadius: theme.borderRadius.lg,
        zIndex: 1000,
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Main Controls Row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Zoom Out */}
          <Tooltip title="Zoom Out">
            <IconButton
              size="small"
              onClick={handleZoomOut}
              disabled={viewport.zoom <= minZoom}
              sx={{
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.secondary,
                border: `1px solid ${theme.colors.surface.border.default}`,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                  border: `1px solid ${theme.colors.brand.primary}`,
                },
                '&:disabled': {
                  opacity: 0.5,
                },
              }}
            >
              <ZoomOut fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Zoom Level Display */}
          <Box
            sx={{
              minWidth: 60,
              textAlign: 'center',
              px: 1,
              py: 0.5,
              backgroundColor: theme.colors.background.secondary,
              border: `1px solid ${theme.colors.surface.border.default}`,
              borderRadius: theme.borderRadius.sm,
            }}
          >
            <Typography
              sx={{
                color: theme.colors.text.primary,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.medium,
                fontFamily: theme.typography.fontFamily.mono,
              }}
            >
              {zoomPercentage}%
            </Typography>
          </Box>

          {/* Zoom In */}
          <Tooltip title="Zoom In">
            <IconButton
              size="small"
              onClick={handleZoomIn}
              disabled={viewport.zoom >= maxZoom}
              sx={{
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.secondary,
                border: `1px solid ${theme.colors.surface.border.default}`,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                  border: `1px solid ${theme.colors.brand.primary}`,
                },
                '&:disabled': {
                  opacity: 0.5,
                },
              }}
            >
              <ZoomIn fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Fit View */}
          <Tooltip title="Fit to View">
            <IconButton
              size="small"
              onClick={handleZoomToFit}
              sx={{
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.secondary,
                border: `1px solid ${theme.colors.surface.border.default}`,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                  border: `1px solid ${theme.colors.brand.primary}`,
                },
              }}
            >
              <FitViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Center View */}
          <Tooltip title="Center View">
            <IconButton
              size="small"
              onClick={handleCenter}
              sx={{
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.secondary,
                border: `1px solid ${theme.colors.surface.border.default}`,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                  border: `1px solid ${theme.colors.brand.primary}`,
                },
              }}
            >
              <CenterIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Fullscreen Toggle */}
          <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
            <IconButton
              size="small"
              onClick={handleFullscreenToggle}
              sx={{
                color: theme.colors.text.primary,
                backgroundColor: isFullscreen 
                  ? theme.colors.brand.light 
                  : theme.colors.background.secondary,
                border: `1px solid ${
                  isFullscreen 
                    ? theme.colors.brand.primary 
                    : theme.colors.surface.border.default
                }`,
                '&:hover': {
                  backgroundColor: theme.colors.surface.hover,
                  border: `1px solid ${theme.colors.brand.primary}`,
                },
              }}
            >
              {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* Expand/Collapse Advanced Controls */}
          <Tooltip title={expanded ? "Hide Advanced" : "Show Advanced"}>
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{
                color: theme.colors.text.tertiary,
                '&:hover': {
                  color: theme.colors.brand.primary,
                  backgroundColor: theme.colors.surface.hover,
                },
              }}
            >
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Advanced Controls */}
        <Collapse in={expanded}>
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.colors.surface.border.subtle}` }}>
            {/* Zoom Slider */}
            <Box sx={{ mb: 2 }}>
              <Typography
                sx={{
                  color: theme.colors.text.secondary,
                  fontSize: theme.typography.fontSize.xs,
                  mb: 1,
                  fontFamily: theme.typography.fontFamily.primary,
                }}
              >
                Zoom Level
              </Typography>
              <Slider
                value={viewport.zoom}
                min={minZoom}
                max={maxZoom}
                step={0.1}
                onChange={handleZoomSliderChange}
                sx={{
                  color: theme.colors.brand.primary,
                  height: 4,
                  '& .MuiSlider-thumb': {
                    width: 16,
                    height: 16,
                    backgroundColor: theme.colors.brand.primary,
                    border: `2px solid ${theme.colors.background.secondary}`,
                    '&:hover': {
                      boxShadow: `0 0 0 8px ${theme.colors.brand.primary}20`,
                    },
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: theme.colors.brand.primary,
                    border: 'none',
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: theme.colors.surface.border.default,
                  },
                }}
              />
            </Box>

            {/* Options */}
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoFit}
                    onChange={(e) => setAutoFit(e.target.checked)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: theme.colors.brand.primary,
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: theme.colors.brand.primary,
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ 
                    color: theme.colors.text.primary,
                    fontSize: theme.typography.fontSize.xs,
                    fontFamily: theme.typography.fontFamily.primary,
                  }}>
                    Auto-fit on change
                  </Typography>
                }
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showMinimap}
                    onChange={(e) => setShowMinimap(e.target.checked)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: theme.colors.brand.primary,
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: theme.colors.brand.primary,
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ 
                    color: theme.colors.text.primary,
                    fontSize: theme.typography.fontSize.xs,
                    fontFamily: theme.typography.fontFamily.primary,
                  }}>
                    Show minimap
                  </Typography>
                }
              />
            </Box>

            {/* Minimap */}
            {showMinimap && (
              <Box>
                <Divider sx={{ borderColor: theme.colors.surface.border.subtle, mb: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <MinimapIcon sx={{ color: theme.colors.text.tertiary, fontSize: 16 }} />
                  <Typography
                    sx={{
                      color: theme.colors.text.secondary,
                      fontSize: theme.typography.fontSize.xs,
                      fontFamily: theme.typography.fontFamily.primary,
                    }}
                  >
                    Overview
                  </Typography>
                </Box>
                <Minimap
                  nodes={nodes}
                  edges={edges}
                  viewport={viewport}
                  onViewportChange={handleViewportChange}
                  width={200}
                  height={120}
                />
              </Box>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};