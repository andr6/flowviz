import { toPng } from 'html-to-image';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow
} from 'reactflow';

import 'reactflow/dist/style.css';
import { Box } from '@mui/material';

import ErrorBoundary from '../../../shared/components/ErrorBoundary';
import LoadingIndicator from '../../../shared/components/LoadingIndicator';
import { AttackFlowV3Exporter } from '../../flow-export/services/attackFlowV3Exporter';
import { STIXBundleExporter } from '../../flow-export/services/stixBundleExporter';
import { IOCDisplayPanel } from '../../ioc-analysis/components/IOCDisplayPanel';
import { IOCAnalysisService } from '../../ioc-analysis/services/IOCAnalysisService';
import { IOCIOAAnalysisResult } from '../../ioc-analysis/types/IOC';
import { confidenceIndicatorService } from '../services/confidenceIndicators';
import { StreamingDirectFlowClient, ProviderSettings } from '../services/streamingDirectFlowClient';

import NodeDetailsPanel from './components/NodeDetailsPanel/NodeDetailsPanel';

// Import new Interactive Visualization Improvements
import { THEME, NODE_TYPES, SIMPLIFIED_NODE_TYPES } from './constants';
import { AdvancedFilterPanel } from './controls/AdvancedFilterPanel';
import { ScreenshotModeControls } from './controls/ScreenshotModeControls';
import ViewSwitcher, { ViewMode } from './controls/ViewSwitcher';
import EnhancedVisualizationControls from './EnhancedVisualizationControls';
import FloatingConnectionLine from './edges/FloatingConnectionLine';
import { useNodeSelection } from './hooks/useNodeSelection';
import { useStoryMode } from './hooks/useStoryMode';
import { ConfidenceOverlay } from './overlays/ConfidenceOverlay';
import { InteractiveLegend } from './overlays/InteractiveLegend';
import { getLayoutedElements } from './utils/layoutUtils';
import IOCView from './views/IOCView';
import TabbedTacticView from './views/TabbedTacticView';
import TimelineView from './views/TimelineView';

export interface StreamingFlowVisualizationProps {
  url: string; // Can be URL, text content, or PDF file
  pdfFile?: File; // Optional PDF file
  loadedFlow?: {
    nodes: any[];
    edges: any[];
    viewport?: any;
  };
  onExportAvailable?: (exportFn: (format: 'png' | 'json' | 'afb') => void) => void;
  onClearAvailable?: (clearFn: () => void) => void;
  onStoryModeAvailable?: (storyData: {
    storyState: any;
    controls: any;
    currentStepData: any;
    onResetView: () => void;
  } | null) => void;
  onSaveAvailable?: (saveFn: (viewport?: any) => { nodes: any[], edges: any[], viewport: any }) => void;
  onStreamingStart?: () => void;
  onStreamingEnd?: () => void;
  onProgress?: (stage: string, message: string) => void;
  onError?: (error: Error) => void;
  cinematicMode?: boolean;
  edgeColor?: string;
  edgeStyle?: string;
  edgeCurve?: string;
  storyModeSpeed?: number;
  showConfidenceOverlay?: boolean;
  showScreenshotControls?: boolean;
  providerSettings?: ProviderSettings;
  // New Interactive Visualization props
  enableAdvancedVisualization?: boolean;
  collaborativeMode?: boolean;
  currentUser?: {
    id: string;
    name: string;
    color: string;
  };
  savedFlows?: Array<{
    id: string;
    name: string;
    nodes: any[];
    edges: any[];
    createdAt: string;
  }>;
}

const StreamingFlowVisualizationContent: React.FC<StreamingFlowVisualizationProps> = ({ 
  url,
  pdfFile,
  loadedFlow,
  onExportAvailable,
  onClearAvailable,
  onStoryModeAvailable,
  onSaveAvailable,
  onStreamingStart,
  onStreamingEnd,
  onProgress,
  onError,
  cinematicMode = true,
  edgeColor = 'default',
  edgeStyle = 'solid',
  edgeCurve = 'smooth',
  storyModeSpeed = 3,
  showConfidenceOverlay = false,
  showScreenshotControls = false,
  providerSettings,
  enableAdvancedVisualization = true,
  collaborativeMode = false,
  currentUser,
  savedFlows = []
}) => {
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const [iocAnalysisResult, setIocAnalysisResult] = useState<IOCIOAAnalysisResult | null>(null);
  const [showIocPanel, setShowIocPanel] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [useSimplifiedNodes, setUseSimplifiedNodes] = useState(false);
  const [nodeConfidences, setNodeConfidences] = useState([]);
  const [edgeConfidences, setEdgeConfidences] = useState([]);
  const [screenshotTaken, setScreenshotTaken] = useState<string | null>(null);
  
  // Interactive Visualization state
  const [showAdvancedVisualization, setShowAdvancedVisualization] = useState(false);
  const [showInteractiveLegend, setShowInteractiveLegend] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentVisualizationMode, setCurrentVisualizationMode] = useState<'2d' | '3d' | 'split' | 'hierarchical' | 'collaborative' | 'diff'>('2d');
  const [appliedFilters, setAppliedFilters] = useState<any>(null);
  const [filteredNodes, setFilteredNodes] = useState<any[]>([]);
  const [filteredEdges, setFilteredEdges] = useState<any[]>([]);
  
  // IOC Analysis service instance
  const iocAnalysisServiceRef = useRef<IOCAnalysisService | null>(null);
  
  // Calculate confidence indicators when nodes/edges change
  useEffect(() => {
    if (nodes.length > 0) {
      confidenceIndicatorService.calculateAllNodeConfidences(nodes);
      confidenceIndicatorService.calculateAllEdgeConfidences(edges, nodes);
      setNodeConfidences(confidenceIndicatorService.getAllNodeConfidences());
      setEdgeConfidences(confidenceIndicatorService.getAllEdgeConfidences());
    }
  }, [nodes, edges]);
  
  // Apply filters to nodes and edges
  useEffect(() => {
    if (appliedFilters && nodes.length > 0) {
      // Apply advanced filters
      const filtered = nodes.filter(node => {
        if (appliedFilters.timeRange) {
          const nodeTime = new Date(node.data?.timestamp || Date.now());
          if (nodeTime < appliedFilters.timeRange.start || nodeTime > appliedFilters.timeRange.end) {
            return false;
          }
        }
        if (appliedFilters.severityLevels?.length > 0) {
          const severity = node.data?.severity || 'medium';
          if (!appliedFilters.severityLevels.includes(severity)) {
            return false;
          }
        }
        if (appliedFilters.actors?.length > 0) {
          const actor = node.data?.actor || 'unknown';
          if (!appliedFilters.actors.includes(actor)) {
            return false;
          }
        }
        if (appliedFilters.techniques?.length > 0) {
          const technique = node.data?.technique || '';
          if (!appliedFilters.techniques.some(t => technique.includes(t))) {
            return false;
          }
        }
        return true;
      });
      
      const filteredNodeIds = new Set(filtered.map(n => n.id));
      const filteredEdgeList = edges.filter(edge => 
        filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
      );
      
      setFilteredNodes(filtered);
      setFilteredEdges(filteredEdgeList);
    } else {
      setFilteredNodes(nodes);
      setFilteredEdges(edges);
    }
  }, [appliedFilters, nodes, edges]);
  
  // Initialize IOC analysis service
  useEffect(() => {
    if (!iocAnalysisServiceRef.current) {
      iocAnalysisServiceRef.current = new IOCAnalysisService();
    }
  }, []);

  // Auto-switch to simplified nodes for performance
  useEffect(() => {
    if (nodes.length > 30) {
      setUseSimplifiedNodes(true);
      if (viewMode === 'graph' && nodes.length > 50) {
        setViewMode('tactic'); // Auto-switch to tactic view for very large graphs
      }
    } else {
      setUseSimplifiedNodes(false);
    }
  }, [nodes.length, viewMode]);
  
  // Determine content type based on URL format
  const contentType = useMemo(() => {
    if (!url) {return 'url';}
    return url.startsWith('http://') || url.startsWith('https://') ? 'url' : 'text';
  }, [url]);
  
  // Helper function to generate edge style and type based on settings
  const getEdgeConfig = useCallback(() => {
    const strokeColor = edgeColor === 'white' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(59, 130, 246, 0.8)';
    const strokeDasharray = edgeStyle === 'dashed' ? '5 5' : undefined;
    
    let type = 'default'; // smooth/curved
    if (edgeCurve === 'straight') {
      type = 'straight';
    } else if (edgeCurve === 'step') {
      type = 'step';
    }
    
    return {
      type,
      style: {
        stroke: strokeColor,
        strokeWidth: 2,
        strokeDasharray
      }
    };
  }, [edgeColor, edgeStyle, edgeCurve]);
  
  // Update existing edges when style settings change
  useEffect(() => {
    const edgeConfig = getEdgeConfig();
    setEdges((currentEdges) => 
      currentEdges.map(edge => ({
        ...edge,
        type: edgeConfig.type,
        style: edgeConfig.style
      }))
    );
  }, [getEdgeConfig, setEdges]);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingClientRef = useRef<StreamingDirectFlowClient | null>(null);
  
  // Keyboard indicator state
  const [keyIndicator, setKeyIndicator] = useState<{
    action: string;
    visible: boolean;
  } | null>(null);

  // Show keyboard indicator with animation
  const showKeyIndicator = useCallback((action: string) => {
    setKeyIndicator({ action, visible: true });
    
    // Hide after animation
    setTimeout(() => {
      setKeyIndicator(prev => prev ? { ...prev, visible: false } : null);
    }, 600);
    
    // Remove from DOM after fade out
    setTimeout(() => {
      setKeyIndicator(null);
    }, 900);
  }, []);

  // Use refs to avoid unstable dependencies
  const isStreamingRef = useRef(isStreaming);
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  const handleEdgesChange = useCallback((changes: any) => {
    if (isStreamingRef.current) {
      onEdgesChange(changes);
    }
    // After streaming: ignore all edge changes for performance
  }, [onEdgesChange]);

  const {
    selectedNode,
    handleNodeClick,
    handlePaneClick,
    closeNodeDetails
  } = useNodeSelection();

  // Wrapper function for views that only pass a node (not an event)
  const handleNodeSelect = useCallback((node: any) => {
    if (node?.data) {
      handleNodeClick({} as React.MouseEvent, node);
    }
  }, [handleNodeClick]);

  // Story mode hook
  const {
    storyState,
    controls: storyControls,
    currentStepData
  } = useStoryMode({
    nodes,
    edges,
    reactFlowInstance,
    storyModeSpeed
  });

  // Memoize React Flow props to prevent unnecessary re-renders
  const defaultEdgeOptions = useMemo(() => ({
    type: 'default',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 15,
      height: 15,
      color: 'rgba(255, 255, 255, 0.5)',
    },
    style: {
      stroke: 'rgba(255, 255, 255, 0.5)',
      strokeWidth: 1.5,
      strokeDasharray: '4 4',
    },
    labelStyle: {
      fontSize: 11,
      fill: 'rgba(255, 255, 255, 0.7)',
      fontWeight: 500,
    },
    labelBgStyle: {
      fill: 'rgba(13, 17, 23, 0.95)',
      fillOpacity: 0.95,
    },
  }), []);

  const snapGrid = useMemo(() => [15, 15] as [number, number], []);

  const reactFlowStyle = useMemo(() => ({
    backgroundColor: THEME.background.primary
  }), []);

  const nodeTypes = useMemo(() => {
    return useSimplifiedNodes ? SIMPLIFIED_NODE_TYPES : NODE_TYPES;
  }, [useSimplifiedNodes]);


  // Handle loading saved flow
  useEffect(() => {
    if (loadedFlow) {
      console.log('📂 Loading saved flow with', loadedFlow.nodes.length, 'nodes and', loadedFlow.edges.length, 'edges');
      setNodes(loadedFlow.nodes);
      
      // Apply current edge styling to loaded edges
      const edgeConfig = getEdgeConfig();
      const styledEdges = loadedFlow.edges.map(edge => ({
        ...edge,
        type: edgeConfig.type,
        style: edgeConfig.style
      }));
      setEdges(styledEdges);
      
      // Restore viewport if available
      if (loadedFlow.viewport && reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.setViewport(loadedFlow.viewport);
        }, 100);
      } else if (reactFlowInstance) {
        // Fit view if no viewport data
        setTimeout(() => {
          reactFlowInstance.fitView({ duration: 800, padding: 0.1 });
        }, 100);
      }
      
      return; // Skip streaming if loading saved flow
    }
  }, [loadedFlow, reactFlowInstance, setNodes, setEdges, getEdgeConfig]);

  // Start streaming when URL is provided
  useEffect(() => {
    if (!url || isStreaming || streamingClientRef.current || loadedFlow) {return;}

    const startStreaming = async () => {
      setIsStreaming(true);
      setShowLoadingIndicator(true); // Show loading indicator when starting
      onStreamingStart?.(); // Notify parent that streaming has started
      
      console.log('🚀 Starting streaming direct flow extraction...');
      
      streamingClientRef.current = new StreamingDirectFlowClient();
      
      await streamingClientRef.current.extractDirectFlowStreaming(pdfFile || url, {
        onProgress: (stage, message) => {
          onProgress?.(stage, message);
        },
        
        onNode: (node) => {
          // Hide loading indicator when first node appears
          setShowLoadingIndicator(false);
          
          setNodes((prevNodes) => {
            // Add node with initial hidden state to avoid position blip
            const cleanNode = {
              ...node,
              style: {
                opacity: 0,
                transition: 'opacity 0.3s ease-in-out'
              }
            };
            const newNodes = [...prevNodes, cleanNode];
            console.log(`✨ Added node ${node.id} (${node.type}) - Total: ${newNodes.length}`);
            return newNodes;
          });
        },
        
        onEdge: (edge) => {
          setEdges((prevEdges) => {
            // Check if edge already exists to prevent duplicates
            if (prevEdges.some(e => e.id === edge.id)) {
              console.log(`⚠️ Edge already exists: ${edge.id}`);
              return prevEdges;
            }
            
            console.log(`🔗 Adding edge: ${edge.id} (${edge.source} → ${edge.target})`);
            
            const edgeConfig = getEdgeConfig();
            return [...prevEdges, {
              ...edge,
              type: edgeConfig.type,
              style: edgeConfig.style
            }];
          });
        },
        
        onIOCAnalysis: async (iocAnalysis) => {
          console.log('🔍 Processing IOC/IOA data from stream...');
          try {
            if (iocAnalysisServiceRef.current) {
              // Process the AI-extracted IOC/IOA data
              const analysisResult = await iocAnalysisServiceRef.current.analyzeContent({
                text: contentType === 'url' ? '' : url, // Don't analyze URL string for URL content type
                aiExtractedData: { ioc_analysis: iocAnalysis },
                metadata: {
                  source: contentType === 'url' ? url : 'text-content',
                  title: `ThreatFlow Analysis - ${new Date().toISOString()}`,
                  tags: ['threatflow', 'streaming-analysis']
                }
              });
              
              setIocAnalysisResult(analysisResult);
              setShowIocPanel(true);
              console.log(`📊 IOC/IOA Analysis complete: ${analysisResult.summary.totalIOCs} IOCs, ${analysisResult.summary.totalIOAs} IOAs`);
            }
          } catch (error) {
            console.error('❌ IOC/IOA processing failed:', error);
          }
        },
        
        onComplete: () => {
          console.log('✅ Streaming completed');
          setIsStreaming(false);
          setShowLoadingIndicator(false); // Hide loading indicator on complete
          onStreamingEnd?.(); // Notify parent that streaming has ended
          
          // Clean up nodes - remove any streaming artifacts
          setTimeout(() => {
            setNodes((currentNodes) => 
              currentNodes.map(node => ({
                ...node,
                style: undefined, // Remove any inline styles
                dragging: false,
                selected: false,
              }))
            );
            
          }, 100);
          
          setTimeout(() => {
            if (reactFlowInstance) {
              reactFlowInstance.fitView({ 
                padding: 0.15, 
                duration: 800,
                maxZoom: 1.5,
                minZoom: 0.1
              });
            }
          }, 600);
        },
        
        onError: (err) => {
          console.error('❌ Streaming error:', err);
          setIsStreaming(false);
          setShowLoadingIndicator(false); // Hide loading indicator on error
          onStreamingEnd?.(); // Notify parent that streaming has ended (even on error)
          onError?.(err); // Pass error to parent for snackbar display
        }
      }, providerSettings);
    };

    startStreaming();
  }, [url]); // Only depend on URL to avoid re-runs

  // Track when re-layout needed
  const [needsLayout, setNeedsLayout] = useState(false);
  
  // Re-layout the graph only during streaming
  useEffect(() => {
    if (!isStreaming) {return;} // Early exit if not streaming
    
    if (nodes.length > 0 || edges.length > 0) {
      console.log(`🎯 Layout trigger: ${nodes.length} nodes, ${edges.length} edges, streaming: ${isStreaming}`);
      // Only update layout during streaming
      const timeoutId = setTimeout(() => {
        setNeedsLayout(true);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [nodes.length, edges.length, isStreaming]);

  // Apply layout when needed - ONLY during streaming
  useEffect(() => {
    if (needsLayout && nodes.length > 0 && isStreaming) {
      // Apply Dagre layout with side-node post-processing
      const layouted = getLayoutedElements(nodes, edges);
      
      // Update nodes with new positions and make them visible
      const layoutedNodesWithStyle = layouted.nodes.map(n => ({
        ...n,
        style: {
          opacity: 1,
          transition: 'opacity 0.5s ease-in-out'
        }
      }));
      
      setNodes(layoutedNodesWithStyle);
      // Don't override edges here - they are managed by the streaming callbacks
      
      // Keep the view centered on the graph during streaming
      if (reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.fitView({ 
            padding: 0.2, 
            duration: 200,
            maxZoom: 1.2,
            minZoom: 0.1
          });
        }, 50);
      }
      
      setNeedsLayout(false);
    }
  }, [needsLayout, reactFlowInstance, isStreaming]);

  // Remove mouse enter handler for better performance

  // Memoized drag handlers with completely stable dependencies
  const handleNodeDragStart = useCallback(() => {
  }, []);

  const handleNodeDragStop = useCallback(() => {
  }, []);

  const handleSelectionDragStart = useCallback(() => {
  }, []);

  const handleSelectionDragStop = useCallback(() => {
  }, []);

  const handleExport = useCallback(async (format: 'png' | 'json' | 'afb') => {
    const filename = `attack-flow-${Date.now()}`;
    
    if (format === 'png') {
      // Export as PNG - capture the entire visualization container to include node details
      const element = selectedNode 
        ? document.querySelector('.flow-visualization-container') as HTMLElement
        : document.querySelector('.react-flow') as HTMLElement;
        
      if (!element) {
        console.error('Visualization element not found');
        return;
      }

      try {
        // Hide React Flow controls, attribution, and close button during export
        const controlsElement = element.querySelector('.react-flow__controls') as HTMLElement;
        const attributionElement = element.querySelector('.react-flow__attribution') as HTMLElement;
        const closeButtonElement = element.querySelector('.node-details-close-button') as HTMLElement;
        const originalControlsDisplay = controlsElement?.style.display;
        const originalAttributionDisplay = attributionElement?.style.display;
        const originalCloseButtonDisplay = closeButtonElement?.style.display;
        
        if (controlsElement) {
          controlsElement.style.display = 'none';
        }
        if (attributionElement) {
          attributionElement.style.display = 'none';
        }
        if (closeButtonElement) {
          closeButtonElement.style.display = 'none';
        }

        const dataUrl = await toPng(element, {
          backgroundColor: '#0d1117',
          width: element.offsetWidth,
          height: element.offsetHeight,
          style: {
            transform: 'none',
          },
        });

        // Restore controls, attribution, and close button visibility
        if (controlsElement) {
          controlsElement.style.display = originalControlsDisplay || '';
        }
        if (attributionElement) {
          attributionElement.style.display = originalAttributionDisplay || '';
        }
        if (closeButtonElement) {
          closeButtonElement.style.display = originalCloseButtonDisplay || '';
        }

        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = dataUrl;
        link.click();
      } catch (error) {
        console.error('Error exporting to PNG:', error);
        
        // Restore controls, attribution, and close button visibility even on error
        const controlsElement = element.querySelector('.react-flow__controls') as HTMLElement;
        const attributionElement = element.querySelector('.react-flow__attribution') as HTMLElement;
        const closeButtonElement = element.querySelector('.node-details-close-button') as HTMLElement;
        if (controlsElement) {
          controlsElement.style.display = '';
        }
        if (attributionElement) {
          attributionElement.style.display = '';
        }
        if (closeButtonElement) {
          closeButtonElement.style.display = '';
        }
      }
    } else if (format === 'json') {
      // Export as STIX bundle
      const exporter = new STIXBundleExporter();
      const stixBundle = exporter.exportToSTIXBundle(nodes, edges);
      
      // Add metadata
      const exportData = {
        ...stixBundle,
        x_flowviz_metadata: {
          viewport: reactFlowInstance?.getViewport(),
          exportedAt: new Date().toISOString(),
          tool: 'ThreatFlow',
          version: '1.0.0',
          streaming: true
        }
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.download = `${filename}-stix.json`;
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
    } else if (format === 'afb') {
      // Export as Attack Flow V3 for MITRE ATT&CK Flow Builder
      const v3Exporter = new AttackFlowV3Exporter();
      v3Exporter.exportToFile(nodes, edges, `${filename}.afb`);
      console.log('✅ Attack Flow V3 export completed');
    }
  }, [nodes, edges, reactFlowInstance]);

  const handleClear = useCallback(() => {
    console.log('🧹 Clearing streaming visualization');
    setNodes([]);
    setEdges([]);
    setIsStreaming(false);
    
    // Reset IOC analysis data
    setIocAnalysisResult(null);
    setShowIocPanel(false);
    
    // Reset streaming client
    if (streamingClientRef.current) {
      streamingClientRef.current = null;
    }
  }, [setNodes, setEdges]);

  const handleGetSaveData = useCallback(() => {
    return {
      nodes,
      edges,
      viewport: reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 }
    };
  }, [nodes, edges, reactFlowInstance]);

  useEffect(() => {
    if (onExportAvailable) {
      onExportAvailable(handleExport);
    }
  }, [onExportAvailable]);

  useEffect(() => {
    if (onSaveAvailable) {
      onSaveAvailable(handleGetSaveData);
    }
  }, [onSaveAvailable]);

  useEffect(() => {
    if (onClearAvailable) {
      onClearAvailable(handleClear);
    }
  }, [onClearAvailable]);

  // Notify parent about story mode availability
  useEffect(() => {
    if (onStoryModeAvailable && !isStreaming && storyState.steps.length > 0) {
      onStoryModeAvailable({
        storyState,
        controls: storyControls,
        currentStepData,
        onResetView: () => {
          if (reactFlowInstance) {
            reactFlowInstance.fitView({ duration: 800, padding: 0.1 });
          }
        }
      });
    } else if (onStoryModeAvailable && (isStreaming || storyState.steps.length === 0)) {
      onStoryModeAvailable(null);
    }
  }, [onStoryModeAvailable, isStreaming, storyState, storyControls, currentStepData]);

  // Keyboard controls for story mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard shortcuts when story mode is available
      if (storyState.steps.length === 0) {return;}
      
      // Prevent default behavior only for specific keys
      if (event.code === 'Space' || event.code === 'ArrowLeft' || event.code === 'ArrowRight' || event.code === 'Escape') {
        // Don't interfere with typing in inputs
        const activeElement = document.activeElement;
        if (activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement).isContentEditable === true
        )) {
          return;
        }
        
        event.preventDefault();
        
        switch (event.code) {
          case 'Space':
            if (storyState.isPlaying) {
              storyControls.pauseStory();
              showKeyIndicator('Pause');
            } else {
              storyControls.playStory();
              showKeyIndicator('Play');
            }
            break;
          case 'ArrowRight':
            storyControls.nextStep();
            showKeyIndicator('Next Step');
            break;
          case 'ArrowLeft':
            storyControls.prevStep();
            showKeyIndicator('Previous Step');
            break;
          case 'Escape':
            // Stop story mode and fit view for clean overview
            storyControls.pauseStory();
            storyControls.resetStory();
            if (reactFlowInstance) {
              reactFlowInstance.fitView({ duration: 800, padding: 0.1 });
              showKeyIndicator('Fit View');
            }
            break;
        }
      }
    };

    // Add event listener to window for global keyboard handling
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [storyState, storyControls, showKeyIndicator]);

  return (
    <Box
      className="flow-visualization-container"
      sx={{
        width: '100%',
        height: '100vh',
        backgroundColor: THEME.background.primary,
        position: 'relative'
      }}
    >
      {/* Cinematic Story Mode Overlay */}
      {storyState.steps.length > 0 && cinematicMode && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 5,
            opacity: storyState.isPlaying || storyState.currentStep > 0 ? 1 : 0,
            transition: 'opacity 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {/* Top Fade */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '25%',
              background: 'linear-gradient(to bottom, rgba(13, 17, 23, 0.6) 0%, rgba(13, 17, 23, 0.3) 50%, transparent 100%)',
              backdropFilter: 'blur(1px)',
            }}
          />
          
          {/* Bottom Fade */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '25%',
              background: 'linear-gradient(to top, rgba(13, 17, 23, 0.6) 0%, rgba(13, 17, 23, 0.3) 50%, transparent 100%)',
              backdropFilter: 'blur(1px)',
            }}
          />
          
          {/* Left Fade */}
          <Box
            sx={{
              position: 'absolute',
              top: '25%',
              bottom: '25%',
              left: 0,
              width: '15%',
              background: 'linear-gradient(to right, rgba(13, 17, 23, 0.4) 0%, rgba(13, 17, 23, 0.2) 50%, transparent 100%)',
            }}
          />
          
          {/* Right Fade */}
          <Box
            sx={{
              position: 'absolute',
              top: '25%',
              bottom: '25%',
              right: 0,
              width: '15%',
              background: 'linear-gradient(to left, rgba(13, 17, 23, 0.4) 0%, rgba(13, 17, 23, 0.2) 50%, transparent 100%)',
            }}
          />
        </Box>
      )}

      {/* View Switcher */}
      <ViewSwitcher
        currentView={viewMode}
        onViewChange={setViewMode}
        nodeCount={nodes.length}
        disabled={isStreaming}
      />

      {/* Floating Keyboard Indicator */}
      {keyIndicator && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            opacity: keyIndicator.visible ? 1 : 0,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: keyIndicator.visible 
              ? 'keyIndicatorIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
              : 'keyIndicatorOut 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '@keyframes keyIndicatorIn': {
              '0%': {
                opacity: 0,
                transform: 'translate(-50%, -50%) scale(0.8)',
              },
              '100%': {
                opacity: 1,
                transform: 'translate(-50%, -50%) scale(1)',
              }
            },
            '@keyframes keyIndicatorOut': {
              '0%': {
                opacity: 1,
                transform: 'translate(-50%, -50%) scale(1)',
              },
              '100%': {
                opacity: 0,
                transform: 'translate(-50%, -50%) scale(0.9)',
              }
            }
          }}
        >
          {/* Action Indicator */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 3,
              py: 1.5,
              background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
              minWidth: 80,
            }}
          >
            {keyIndicator.action}
          </Box>
        </Box>
      )}
      
      {/* Main Visualization Area */}
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {viewMode === 'graph' && (
          <Box sx={{ flex: 1 }}>
            <ReactFlow
              nodes={filteredNodes}
              edges={filteredEdges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              nodeTypes={nodeTypes}
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
              onNodeDragStart={handleNodeDragStart}
              onNodeDragStop={handleNodeDragStop}
              onSelectionDragStart={handleSelectionDragStart}
              onSelectionDragStop={handleSelectionDragStop}
              nodesDraggable={!isStreaming}
              nodesConnectable={false}
              elementsSelectable={true}
              fitView={false}
              attributionPosition="bottom-left"
              connectionLineComponent={FloatingConnectionLine}
              snapToGrid={false}
              snapGrid={snapGrid}
              deleteKeyCode={null}
              multiSelectionKeyCode={null}
              panOnDrag={true}
              selectNodesOnDrag={false}
              elevateEdgesOnSelect={false}
              defaultEdgeOptions={defaultEdgeOptions}
              style={reactFlowStyle}
              disableKeyboardA11y={true}
              onlyRenderVisibleElements={true}
              nodeOrigin={[0.5, 0.5]}
              minZoom={0.1}
              maxZoom={4}
              zoomOnScroll={true}
              zoomOnPinch={true}
              zoomOnDoubleClick={true}
              panOnScrollMode="free"
            >
              <Background
                color="rgba(255, 255, 255, 0.1)"
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
              />
              <Controls
                style={{
                  backgroundColor: THEME.background.secondary,
                  border: THEME.border.default,
                  borderRadius: '8px'
                }}
                showZoom={true}
                showFitView={true}
                showInteractive={false}
                position="bottom-right"
              />
            </ReactFlow>
            
            {/* Enhanced Visualization Controls */}
            <EnhancedVisualizationControls
              nodes={nodes}
              edges={edges}
              onNodesChange={setNodes}
              onEdgesChange={setEdges}
              visible={!isStreaming && nodes.length > 0}
              enableClustering={true}
              enableAnimation={true}
              enableScreenshots={true}
              enableMinimap={true}
              enableAdvancedFilters={true}
            />
            
            {/* Loading Indicator - centered in the graph during loading */}
            <LoadingIndicator isVisible={showLoadingIndicator} contentType={contentType} />
            
            {/* Confidence Overlay */}
            <ConfidenceOverlay
              visible={showConfidenceOverlay}
              onToggleVisibility={() => {}} // Controlled by parent
              nodeConfidences={nodeConfidences}
              edgeConfidences={edgeConfidences}
              onRefreshConfidence={() => {
                confidenceIndicatorService.calculateAllNodeConfidences(nodes);
                confidenceIndicatorService.calculateAllEdgeConfidences(edges, nodes);
                setNodeConfidences(confidenceIndicatorService.getAllNodeConfidences());
                setEdgeConfidences(confidenceIndicatorService.getAllEdgeConfidences());
              }}
            />
            
            {/* Screenshot Mode Controls */}
            <ScreenshotModeControls
              visible={showScreenshotControls}
              onToggleVisibility={() => {}} // Controlled by parent
              onScreenshotTaken={(dataUrl) => {
                setScreenshotTaken(dataUrl);
                // Optional: Show success toast or notification
                console.log('Screenshot captured successfully');
              }}
            />
          </Box>
        )}

        {viewMode === 'tactic' && (
          <Box sx={{ flex: 1, p: 2 }}>
            <TabbedTacticView
              nodes={nodes}
              edges={edges}
              onNodeSelect={handleNodeSelect}
              selectedNodeId={selectedNode?.id}
              iocAnalysisResult={iocAnalysisResult}
            />
          </Box>
        )}

        {viewMode === 'timeline' && (
          <Box sx={{ flex: 1, p: 2 }}>
            <TimelineView
              nodes={nodes}
              edges={edges}
              onNodeSelect={handleNodeSelect}
              selectedNodeId={selectedNode?.id}
            />
          </Box>
        )}

        {viewMode === 'ioc' && (
          <Box sx={{ flex: 1, p: 2 }}>
            <IOCView
              iocAnalysisResult={iocAnalysisResult}
            />
          </Box>
        )}

        {viewMode === 'hybrid' && (
          <Box sx={{ flex: 1, display: 'flex', gap: 2, p: 2 }}>
            <Box sx={{ flex: 2 }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                nodeTypes={nodeTypes}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                nodesDraggable={!isStreaming}
                nodesConnectable={false}
                elementsSelectable={true}
                fitView={false}
                style={reactFlowStyle}
                onlyRenderVisibleElements={true}
                minZoom={0.2}
                maxZoom={2}
              >
                <Background
                  color="rgba(255, 255, 255, 0.1)"
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={1}
                />
                <Controls position="bottom-right" />
              </ReactFlow>
            </Box>
            <Box sx={{ flex: 1, maxWidth: 400 }}>
              <TabbedTacticView
                nodes={nodes}
                edges={edges}
                onNodeSelect={handleNodeSelect}
                selectedNodeId={selectedNode?.id}
                iocAnalysisResult={iocAnalysisResult}
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* Node Details Panel */}      
      {selectedNode && (
        <NodeDetailsPanel
          node={selectedNode}
          onClose={closeNodeDetails}
        />
      )}

      {/* IOC/IOA Analysis Panel */}
      {showIocPanel && iocAnalysisResult && (
        <IOCDisplayPanel
          analysisResult={iocAnalysisResult}
          onClose={() => setShowIocPanel(false)}
          onExport={(format) => {
            if (iocAnalysisServiceRef.current && iocAnalysisResult) {
              return iocAnalysisServiceRef.current.exportAnalysis(iocAnalysisResult, format);
            }
            return Promise.resolve('');
          }}
        />
      )}
      
      {/* Advanced Filter Panel */}
      {showAdvancedFilters && enableAdvancedVisualization && (
        <AdvancedFilterPanel
          onFilterChange={(filters) => {
            console.log('Filters applied:', filters);
            setAppliedFilters(filters);
          }}
          onPresetSelect={(preset) => {
            console.log('Filter preset selected:', preset);
            // Apply preset filters based on common threat scenarios
            const presetFilters = {
              'high-severity': {
                severityLevels: ['high', 'critical'],
                timeRange: null,
                actors: [],
                techniques: []
              },
              'apt-activity': {
                severityLevels: ['high', 'critical'],
                actors: ['APT1', 'APT28', 'APT29', 'Lazarus'],
                techniques: ['T1566', 'T1059', 'T1055'],
                timeRange: null
              },
              'recent-activity': {
                timeRange: {
                  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                  end: new Date()
                },
                severityLevels: [],
                actors: [],
                techniques: []
              }
            };
            setAppliedFilters(presetFilters[preset] || null);
          }}
          filterStats={{
            totalNodes: nodes.length,
            filteredNodes: filteredNodes.length,
            severityDistribution: {
              low: nodes.filter(n => n.data?.severity === 'low').length,
              medium: nodes.filter(n => n.data?.severity === 'medium').length,
              high: nodes.filter(n => n.data?.severity === 'high').length,
              critical: nodes.filter(n => n.data?.severity === 'critical').length,
            },
            topActors: Array.from(new Set(nodes.map(n => n.data?.actor).filter(Boolean))).slice(0, 5),
            topTechniques: Array.from(new Set(nodes.map(n => n.data?.technique).filter(Boolean))).slice(0, 10)
          }}
        />
      )}
      
      {/* Interactive MITRE ATT&CK Legend */}
      {showInteractiveLegend && enableAdvancedVisualization && (
        <InteractiveLegend
          isVisible={showInteractiveLegend}
          onToggle={() => setShowInteractiveLegend(!showInteractiveLegend)}
          usedTechniques={Array.from(new Set(filteredNodes.map(node => node.data?.technique).filter(Boolean)))}
        />
      )}

    </Box>
  );
};

const StreamingFlowVisualization: React.FC<StreamingFlowVisualizationProps> = (props) => {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <StreamingFlowVisualizationContent {...props} />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
};

export default StreamingFlowVisualization;