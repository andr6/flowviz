import React, { useState, useCallback, useEffect } from 'react';
import { Box, Fade } from '@mui/material';
import { useReactFlow } from 'reactflow';

// Import all our enhanced components
import MinimapControls from './controls/MinimapControls';
import LayoutControls from './controls/LayoutControls';
import { ScreenshotModeControls } from './controls/ScreenshotModeControls';
import { AdvancedFilterPanel } from './controls/AdvancedFilterPanel';

// Import utilities
import { applyAdvancedLayout, LayoutType } from './utils/advancedLayoutUtils';
import { clusterNodes, ClusterConfig, NodeCluster } from './utils/nodeClusteringUtils';
import { 
  AnimationController, 
  createAttackProgressionAnimation,
  AnimationSequence 
} from './utils/animationUtils';

import { THEME } from './constants';

interface EnhancedVisualizationControlsProps {
  nodes: any[];
  edges: any[];
  onNodesChange: (nodes: any[]) => void;
  onEdgesChange: (edges: any[]) => void;
  visible?: boolean;
  enableClustering?: boolean;
  enableAnimation?: boolean;
  enableScreenshots?: boolean;
  enableMinimap?: boolean;
  enableAdvancedFilters?: boolean;
}

const EnhancedVisualizationControls: React.FC<EnhancedVisualizationControlsProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  visible = true,
  enableClustering = true,
  enableAnimation = true,
  enableScreenshots = true,
  enableMinimap = true,
  enableAdvancedFilters = true
}) => {
  const reactFlowInstance = useReactFlow();
  
  // State management
  const [currentLayout, setCurrentLayout] = useState<LayoutType>('hierarchical');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [showScreenshotControls, setShowScreenshotControls] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [clusters, setClusters] = useState<NodeCluster[]>([]);
  const [animationController] = useState(new AnimationController());
  
  // Clustering state
  const [clusteringEnabled, setClusteringEnabled] = useState(false);
  const [clusterConfig, setClusterConfig] = useState<ClusterConfig>({
    algorithm: 'tactic',
    maxClusters: 10,
    minClusterSize: 2
  });

  // Layout change handler
  const handleLayoutChange = useCallback(async (layout: LayoutType, options?: any) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    try {
      const { nodes: layoutedNodes, edges: layoutedEdges } = applyAdvancedLayout(
        nodes,
        edges,
        layout,
        {
          animate: animationEnabled,
          ...options
        }
      );
      
      onNodesChange(layoutedNodes);
      onEdgesChange(layoutedEdges);
      setCurrentLayout(layout);
      
      // Auto-fit view after layout
      if (reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.fitView({ 
            duration: 800, 
            padding: 0.1,
            maxZoom: 1.5 
          });
        }, 100);
      }
    } catch (error) {
      console.error('Layout change failed:', error);
    } finally {
      setTimeout(() => setIsAnimating(false), 1000);
    }
  }, [nodes, edges, onNodesChange, onEdgesChange, isAnimating, animationEnabled, reactFlowInstance]);

  // Clustering handler
  const handleClusteringToggle = useCallback((enabled: boolean) => {
    setClusteringEnabled(enabled);
    
    if (enabled) {
      const newClusters = clusterNodes(nodes, edges, clusterConfig);
      setClusters(newClusters);
      
      // Apply cluster layout
      // This would require additional implementation to actually show clusters
      console.log('Clustering enabled with', newClusters.length, 'clusters');
    } else {
      setClusters([]);
    }
  }, [nodes, edges, clusterConfig]);

  // Animation handlers
  const handleStartAnimation = useCallback(() => {
    if (!enableAnimation || nodes.length === 0) return;
    
    const animation = createAttackProgressionAnimation(nodes, edges, 2000);
    animationController.setAnimation(animation);
    
    animationController.setCallbacks({
      onStepChange: (step, stepIndex) => {
        console.log(`Animation step ${stepIndex + 1}: ${step.description}`);
        
        // Highlight nodes/edges for current step
        const updatedNodes = nodes.map(node => ({
          ...node,
          style: {
            ...node.style,
            opacity: step.nodeIds.includes(node.id) ? 1 : 0.3,
            transform: step.nodeIds.includes(node.id) ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.5s ease-in-out'
          }
        }));
        
        onNodesChange(updatedNodes);
      },
      onComplete: () => {
        console.log('Animation completed');
        // Reset all nodes to normal opacity
        const resetNodes = nodes.map(node => ({
          ...node,
          style: {
            ...node.style,
            opacity: 1,
            transform: 'scale(1)'
          }
        }));
        onNodesChange(resetNodes);
      }
    });
    
    animationController.play();
  }, [nodes, edges, enableAnimation, animationController, onNodesChange]);

  // Screenshot handler
  const handleScreenshotTaken = useCallback((dataUrl: string) => {
    console.log('Screenshot taken successfully');
    // Could show a success notification or automatically download
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with typing in inputs
      }
      
      switch (event.key.toLowerCase()) {
        case 'h':
          handleLayoutChange('hierarchical');
          break;
        case 'f':
          handleLayoutChange('force-directed');
          break;
        case 't':
          handleLayoutChange('timeline');
          break;
        case 'c':
          handleLayoutChange('circular');
          break;
        case 'g':
          handleLayoutChange('grid');
          break;
        case 'm':
          setShowMinimap(!showMinimap);
          break;
        case 'p':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setShowScreenshotControls(true);
          }
          break;
        case 'a':
          if (enableAnimation) {
            handleStartAnimation();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleLayoutChange, showMinimap, enableAnimation, handleStartAnimation]);

  // Node color function for minimap
  const getNodeColor = useCallback((node: any) => {
    switch (node.type) {
      case 'action':
        return '#ef4444';
      case 'tool':
        return '#3b82f6';
      case 'malware':
        return '#dc2626';
      case 'asset':
        return '#10b981';
      case 'infrastructure':
        return '#f59e0b';
      case 'url':
        return '#8b5cf6';
      case 'vulnerability':
        return '#f97316';
      default:
        return '#6b7280';
    }
  }, []);

  if (!visible) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none', // Allow clicks to pass through
        zIndex: 5
      }}
    >
      {/* Layout Controls */}
      <LayoutControls
        visible={visible}
        currentLayout={currentLayout}
        onLayoutChange={handleLayoutChange}
        isAnimating={isAnimating}
        animationEnabled={animationEnabled}
        onAnimationToggle={setAnimationEnabled}
      />

      {/* Minimap and Zoom Controls */}
      {enableMinimap && (
        <MinimapControls
          visible={showMinimap}
          onToggleVisibility={setShowMinimap}
          nodes={nodes}
          edges={edges}
          nodeColor={getNodeColor}
        />
      )}

      {/* Screenshot Controls */}
      {enableScreenshots && (
        <ScreenshotModeControls
          visible={showScreenshotControls}
          onToggleVisibility={setShowScreenshotControls}
          onScreenshotTaken={handleScreenshotTaken}
        />
      )}

      {/* Advanced Filter Panel */}
      {enableAdvancedFilters && showAdvancedFilters && (
        <AdvancedFilterPanel
          onFilterChange={(filters) => {
            console.log('Filters applied:', filters);
            // Apply filters to nodes/edges
          }}
          onPresetSelect={(preset) => {
            console.log('Filter preset selected:', preset);
          }}
          filterStats={{
            totalNodes: nodes.length,
            filteredNodes: nodes.length,
            severityDistribution: {
              low: nodes.filter(n => n.data?.severity === 'low').length,
              medium: nodes.filter(n => n.data?.severity === 'medium').length,
              high: nodes.filter(n => n.data?.severity === 'high').length,
              critical: nodes.filter(n => n.data?.severity === 'critical').length,
            },
            topActors: [],
            topTechniques: []
          }}
        />
      )}

      {/* Quick Actions Hint */}
      <Fade in={true} timeout={1000}>
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            backgroundColor: 'rgba(13, 17, 23, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)',
            p: 1,
            pointerEvents: 'auto',
            maxWidth: 250,
            fontSize: '0.7rem',
            color: 'rgba(255, 255, 255, 0.7)',
            lineHeight: 1.3
          }}
        >
          <strong>Quick Actions:</strong><br />
          H/F/T/C/G - Layouts<br />
          M - Toggle minimap<br />
          Ctrl+P - Screenshot<br />
          A - Play animation
        </Box>
      </Fade>
    </Box>
  );
};

export default EnhancedVisualizationControls;