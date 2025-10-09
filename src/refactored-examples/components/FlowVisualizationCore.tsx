// REFACTORED: Core visualization logic extracted from monolithic component
import React from 'react';
import { ReactFlow, Background, Controls } from 'reactflow';
import { useFlowVisualization } from '../hooks/useFlowVisualization';
import { FlowViewMode } from '../types';

interface FlowVisualizationCoreProps {
  nodes: any[];
  edges: any[];
  viewMode: FlowViewMode;
  isStreaming: boolean;
  onNodeClick: (event: React.MouseEvent, node: any) => void;
  onPaneClick: () => void;
  nodeTypes: Record<string, React.ComponentType>;
}

export function FlowVisualizationCore({
  nodes,
  edges,
  viewMode,
  isStreaming,
  onNodeClick,
  onPaneClick,
  nodeTypes
}: FlowVisualizationCoreProps) {
  const {
    onNodesChange,
    onEdgesChange,
    defaultEdgeOptions,
    reactFlowStyle,
    snapGrid
  } = useFlowVisualization({ isStreaming });

  if (viewMode !== '2d') {
    return null; // Other view modes handled by separate components
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      nodesDraggable={!isStreaming}
      nodesConnectable={false}
      elementsSelectable={true}
      fitView={false}
      attributionPosition="bottom-left"
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
        variant="dots"
        gap={20}
        size={1}
      />
      <Controls
        style={{
          backgroundColor: 'rgba(13, 17, 23, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px'
        }}
        showZoom={true}
        showFitView={true}
        showInteractive={false}
        position="bottom-right"
      />
    </ReactFlow>
  );
}