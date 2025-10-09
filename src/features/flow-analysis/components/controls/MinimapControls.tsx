import React, { useCallback, useEffect, useState } from 'react';
import { 
  Box, 
  IconButton, 
  Tooltip, 
  Fade,
  Paper,
  Typography
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  ZoomOutMap as FitViewIcon,
  CenterFocusStrong as CenterIcon,
  Map as MapIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { useReactFlow, MiniMap } from 'reactflow';

import { THEME } from '../constants';

interface MinimapControlsProps {
  visible?: boolean;
  onToggleVisibility?: () => void;
  nodes?: any[];
  edges?: any[];
  nodeColor?: (node: any) => string;
}

const MinimapControls: React.FC<MinimapControlsProps> = ({
  visible = true,
  onToggleVisibility,
  nodes = [],
  edges = [],
  nodeColor
}) => {
  const reactFlowInstance = useReactFlow();
  const [showMinimap, setShowMinimap] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

  // Update zoom level and viewport when ReactFlow changes
  useEffect(() => {
    if (reactFlowInstance) {
      const updateViewport = () => {
        const currentViewport = reactFlowInstance.getViewport();
        setViewport(currentViewport);
        setZoomLevel(Math.round(currentViewport.zoom * 100));
      };

      // Initial update
      updateViewport();

      // Listen for viewport changes
      const handleMove = () => updateViewport();
      const handleZoom = () => updateViewport();

      // Add event listeners if they exist
      if (reactFlowInstance.getNodes) {
        updateViewport();
      }

      return () => {
        // Cleanup if needed
      };
    }
  }, [reactFlowInstance]);

  const handleZoomIn = useCallback(() => {
    reactFlowInstance?.zoomIn();
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance?.zoomOut();
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    reactFlowInstance?.fitView({ 
      padding: 0.1, 
      duration: 800,
      maxZoom: 1.5,
      minZoom: 0.1
    });
  }, [reactFlowInstance]);

  const handleCenter = useCallback(() => {
    reactFlowInstance?.setCenter(0, 0, { duration: 800 });
  }, [reactFlowInstance]);

  const getNodeColor = useCallback((node: any) => {
    if (nodeColor) {
      return nodeColor(node);
    }
    
    // Default node coloring based on type
    switch (node.type) {
      case 'action':
        return '#ef4444'; // Red for attack actions
      case 'tool':
        return '#3b82f6'; // Blue for tools
      case 'malware':
        return '#dc2626'; // Dark red for malware
      case 'asset':
        return '#10b981'; // Green for assets
      case 'infrastructure':
        return '#f59e0b'; // Orange for infrastructure
      case 'url':
        return '#8b5cf6'; // Purple for URLs
      case 'vulnerability':
        return '#f97316'; // Orange-red for vulnerabilities
      default:
        return '#6b7280'; // Gray for others
    }
  }, [nodeColor]);

  if (!visible) return null;

  return (
    <Fade in={visible} timeout={300}>
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        {/* Zoom Controls */}
        <Paper
          elevation={8}
          sx={{
            background: THEME.background.secondary,
            border: THEME.border.default,
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            boxShadow: THEME.shadow.panel,
            p: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5
          }}
        >
          {/* Zoom Level Display */}
          <Box sx={{ 
            textAlign: 'center', 
            py: 0.5,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            mb: 0.5
          }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: THEME.text.secondary,
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              {zoomLevel}%
            </Typography>
          </Box>

          {/* Zoom In */}
          <Tooltip title="Zoom In" placement="right" arrow>
            <IconButton
              onClick={handleZoomIn}
              size="small"
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                width: 32,
                height: 32,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#fff'
                }
              }}
            >
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Zoom Out */}
          <Tooltip title="Zoom Out" placement="right" arrow>
            <IconButton
              onClick={handleZoomOut}
              size="small"
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                width: 32,
                height: 32,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#fff'
                }
              }}
            >
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Fit View */}
          <Tooltip title="Fit to View" placement="right" arrow>
            <IconButton
              onClick={handleFitView}
              size="small"
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                width: 32,
                height: 32,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#fff'
                }
              }}
            >
              <FitViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Center View */}
          <Tooltip title="Center View" placement="right" arrow>
            <IconButton
              onClick={handleCenter}
              size="small"
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                width: 32,
                height: 32,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#fff'
                }
              }}
            >
              <CenterIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Toggle Minimap */}
          <Tooltip title={showMinimap ? "Hide Minimap" : "Show Minimap"} placement="right" arrow>
            <IconButton
              onClick={() => setShowMinimap(!showMinimap)}
              size="small"
              sx={{
                color: showMinimap ? '#4ade80' : 'rgba(255, 255, 255, 0.8)',
                backgroundColor: showMinimap ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${showMinimap ? 'rgba(74, 222, 128, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '8px',
                width: 32,
                height: 32,
                '&:hover': {
                  backgroundColor: showMinimap ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  borderColor: showMinimap ? 'rgba(74, 222, 128, 0.4)' : 'rgba(255, 255, 255, 0.2)',
                  color: showMinimap ? '#4ade80' : '#fff'
                }
              }}
            >
              {showMinimap ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Paper>

        {/* Enhanced Minimap */}
        {showMinimap && (
          <Fade in={showMinimap} timeout={300}>
            <Paper
              elevation={8}
              sx={{
                background: THEME.background.secondary,
                border: THEME.border.default,
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                boxShadow: THEME.shadow.panel,
                overflow: 'hidden',
                width: 200,
                height: 150
              }}
            >
              {/* Minimap Header */}
              <Box sx={{ 
                p: 1,
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <MapIcon sx={{ fontSize: 14, color: THEME.text.secondary }} />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: THEME.text.secondary,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  Overview
                </Typography>
                <Box sx={{ 
                  ml: 'auto',
                  fontSize: '0.6rem',
                  color: THEME.text.secondary,
                  opacity: 0.7
                }}>
                  {nodes.length} nodes
                </Box>
              </Box>

              {/* Minimap Component */}
              <Box sx={{ height: 'calc(100% - 36px)', position: 'relative' }}>
                <MiniMap
                  nodeColor={getNodeColor}
                  nodeStrokeWidth={1}
                  nodeStrokeColor="rgba(255, 255, 255, 0.2)"
                  maskColor="rgba(13, 17, 23, 0.8)"
                  maskStrokeColor="rgba(255, 255, 255, 0.3)"
                  maskStrokeWidth={2}
                  pannable={true}
                  zoomable={true}
                  style={{
                    backgroundColor: 'rgba(13, 17, 23, 0.95)',
                    borderRadius: '0 0 12px 12px'
                  }}
                />
                
                {/* Minimap Overlay Info */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    borderRadius: '4px',
                    px: 1,
                    py: 0.5
                  }}
                >
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '0.6rem'
                    }}
                  >
                    Drag to navigate
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Fade>
        )}

        {/* Navigation Hint */}
        {nodes.length > 10 && (
          <Fade in={true} timeout={500}>
            <Paper
              sx={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                backdropFilter: 'blur(10px)',
                p: 1,
                maxWidth: 200
              }}
            >
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#60a5fa',
                  fontSize: '0.7rem',
                  lineHeight: 1.3
                }}
              >
                💡 Use minimap to navigate large flows quickly
              </Typography>
            </Paper>
          </Fade>
        )}
      </Box>
    </Fade>
  );
};

export default MinimapControls;