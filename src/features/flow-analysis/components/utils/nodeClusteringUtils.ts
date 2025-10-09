import { Node, Edge } from 'reactflow';

// Clustering algorithms and utilities
export interface ClusterConfig {
  algorithm: 'tactic' | 'type' | 'similarity' | 'temporal' | 'custom';
  maxClusters?: number;
  minClusterSize?: number;
  similarityThreshold?: number;
  customGroupingFn?: (node: Node) => string;
}

export interface NodeCluster {
  id: string;
  label: string;
  nodes: Node[];
  color: string;
  position: { x: number; y: number };
  expanded: boolean;
  metadata: {
    type: string;
    count: number;
    avgConfidence?: number;
    [key: string]: any;
  };
}

// MITRE ATT&CK tactic-based clustering
export const clusterByTactic = (
  nodes: Node[],
  edges: Edge[]
): NodeCluster[] => {
  const tacticMap = new Map<string, Node[]>();
  const tacticColors = {
    'TA0043': '#ef4444', // Reconnaissance - Red
    'TA0042': '#f97316', // Resource Development - Orange
    'TA0001': '#eab308', // Initial Access - Yellow
    'TA0002': '#84cc16', // Execution - Lime
    'TA0003': '#22c55e', // Persistence - Green
    'TA0004': '#10b981', // Privilege Escalation - Emerald
    'TA0005': '#06b6d4', // Defense Evasion - Cyan
    'TA0006': '#3b82f6', // Credential Access - Blue
    'TA0007': '#6366f1', // Discovery - Indigo
    'TA0008': '#8b5cf6', // Lateral Movement - Purple
    'TA0009': '#a855f7', // Collection - Violet
    'TA0011': '#d946ef', // Command and Control - Fuchsia
    'TA0010': '#ec4899', // Exfiltration - Pink
    'TA0040': '#f43f5e', // Impact - Rose
  };

  const tacticNames = {
    'TA0043': 'Reconnaissance',
    'TA0042': 'Resource Development',
    'TA0001': 'Initial Access',
    'TA0002': 'Execution',
    'TA0003': 'Persistence',
    'TA0004': 'Privilege Escalation',
    'TA0005': 'Defense Evasion',
    'TA0006': 'Credential Access',
    'TA0007': 'Discovery',
    'TA0008': 'Lateral Movement',
    'TA0009': 'Collection',
    'TA0011': 'Command and Control',
    'TA0010': 'Exfiltration',
    'TA0040': 'Impact',
  };

  // Group nodes by tactic
  nodes.forEach(node => {
    const tacticId = node.data?.tactic_id || 'unknown';
    if (!tacticMap.has(tacticId)) {
      tacticMap.set(tacticId, []);
    }
    tacticMap.get(tacticId)!.push(node);
  });

  // Convert to clusters
  const clusters: NodeCluster[] = [];
  let clusterIndex = 0;

  tacticMap.forEach((clusterNodes, tacticId) => {
    const color = tacticColors[tacticId] || '#6b7280';
    const label = tacticNames[tacticId] || `Tactic ${tacticId}`;
    
    clusters.push({
      id: `tactic-${tacticId}`,
      label,
      nodes: clusterNodes,
      color,
      position: { x: clusterIndex * 300, y: 0 },
      expanded: true,
      metadata: {
        type: 'tactic',
        count: clusterNodes.length,
        tacticId,
        avgConfidence: calculateAverageConfidence(clusterNodes)
      }
    });
    
    clusterIndex++;
  });

  return clusters;
};

// Node type-based clustering
export const clusterByType = (
  nodes: Node[],
  edges: Edge[]
): NodeCluster[] => {
  const typeMap = new Map<string, Node[]>();
  const typeColors = {
    'action': '#ef4444',
    'tool': '#3b82f6',
    'malware': '#dc2626',
    'asset': '#10b981',
    'infrastructure': '#f59e0b',
    'url': '#8b5cf6',
    'vulnerability': '#f97316',
    'operator': '#6b7280'
  };

  // Group nodes by type
  nodes.forEach(node => {
    const nodeType = node.type || 'unknown';
    if (!typeMap.has(nodeType)) {
      typeMap.set(nodeType, []);
    }
    typeMap.get(nodeType)!.push(node);
  });

  // Convert to clusters
  const clusters: NodeCluster[] = [];
  let clusterIndex = 0;

  typeMap.forEach((clusterNodes, nodeType) => {
    const color = typeColors[nodeType] || '#6b7280';
    const label = nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
    
    clusters.push({
      id: `type-${nodeType}`,
      label: `${label}s`,
      nodes: clusterNodes,
      color,
      position: { x: clusterIndex * 250, y: 0 },
      expanded: true,
      metadata: {
        type: 'node-type',
        count: clusterNodes.length,
        nodeType,
        avgConfidence: calculateAverageConfidence(clusterNodes)
      }
    });
    
    clusterIndex++;
  });

  return clusters;
};

// Similarity-based clustering using content analysis
export const clusterBySimilarity = (
  nodes: Node[],
  edges: Edge[],
  threshold: number = 0.7
): NodeCluster[] => {
  const clusters: NodeCluster[] = [];
  const processedNodes = new Set<string>();
  
  nodes.forEach((node, index) => {
    if (processedNodes.has(node.id)) return;
    
    const similarNodes = [node];
    processedNodes.add(node.id);
    
    // Find similar nodes
    for (let i = index + 1; i < nodes.length; i++) {
      const otherNode = nodes[i];
      if (processedNodes.has(otherNode.id)) continue;
      
      const similarity = calculateNodeSimilarity(node, otherNode);
      if (similarity >= threshold) {
        similarNodes.push(otherNode);
        processedNodes.add(otherNode.id);
      }
    }
    
    // Create cluster if we have similar nodes
    if (similarNodes.length > 1) {
      clusters.push({
        id: `similarity-${clusters.length}`,
        label: `Similar Group ${clusters.length + 1}`,
        nodes: similarNodes,
        color: getClusterColor(clusters.length),
        position: { x: clusters.length * 280, y: 0 },
        expanded: true,
        metadata: {
          type: 'similarity',
          count: similarNodes.length,
          avgSimilarity: threshold,
          avgConfidence: calculateAverageConfidence(similarNodes)
        }
      });
    }
  });
  
  return clusters;
};

// Temporal clustering based on timestamps or attack phases
export const clusterByTemporal = (
  nodes: Node[],
  edges: Edge[]
): NodeCluster[] => {
  const timeGroups = new Map<string, Node[]>();
  
  nodes.forEach(node => {
    let timeGroup = 'unknown';
    
    if (node.data?.timestamp) {
      // Group by time periods (e.g., hour, day)
      const date = new Date(node.data.timestamp);
      timeGroup = date.toISOString().split('T')[0]; // Group by day
    } else if (node.data?.phase) {
      // Group by attack phase
      timeGroup = node.data.phase;
    } else if (node.data?.tactic_id) {
      // Fallback to tactic-based temporal grouping
      const tacticOrder = [
        'TA0043', 'TA0042', 'TA0001', 'TA0002', 'TA0003',
        'TA0004', 'TA0005', 'TA0006', 'TA0007', 'TA0008',
        'TA0009', 'TA0011', 'TA0010', 'TA0040'
      ];
      const tacticIndex = tacticOrder.indexOf(node.data.tactic_id);
      timeGroup = tacticIndex !== -1 ? `phase-${Math.floor(tacticIndex / 3)}` : 'unknown';
    }
    
    if (!timeGroups.has(timeGroup)) {
      timeGroups.set(timeGroup, []);
    }
    timeGroups.get(timeGroup)!.push(node);
  });
  
  // Convert to clusters
  const clusters: NodeCluster[] = [];
  let clusterIndex = 0;
  
  timeGroups.forEach((clusterNodes, timeGroup) => {
    clusters.push({
      id: `temporal-${timeGroup}`,
      label: `Time Period: ${timeGroup}`,
      nodes: clusterNodes,
      color: getClusterColor(clusterIndex),
      position: { x: clusterIndex * 320, y: 0 },
      expanded: true,
      metadata: {
        type: 'temporal',
        count: clusterNodes.length,
        timeGroup,
        avgConfidence: calculateAverageConfidence(clusterNodes)
      }
    });
    
    clusterIndex++;
  });
  
  return clusters;
};

// Main clustering function
export const clusterNodes = (
  nodes: Node[],
  edges: Edge[],
  config: ClusterConfig
): NodeCluster[] => {
  switch (config.algorithm) {
    case 'tactic':
      return clusterByTactic(nodes, edges);
    case 'type':
      return clusterByType(nodes, edges);
    case 'similarity':
      return clusterBySimilarity(
        nodes, 
        edges, 
        config.similarityThreshold || 0.7
      );
    case 'temporal':
      return clusterByTemporal(nodes, edges);
    case 'custom':
      return clusterByCustomFunction(nodes, edges, config.customGroupingFn!);
    default:
      return [];
  }
};

// Custom clustering function
const clusterByCustomFunction = (
  nodes: Node[],
  edges: Edge[],
  groupingFn: (node: Node) => string
): NodeCluster[] => {
  const groups = new Map<string, Node[]>();
  
  nodes.forEach(node => {
    const groupKey = groupingFn(node);
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(node);
  });
  
  const clusters: NodeCluster[] = [];
  let clusterIndex = 0;
  
  groups.forEach((clusterNodes, groupKey) => {
    clusters.push({
      id: `custom-${groupKey}`,
      label: groupKey,
      nodes: clusterNodes,
      color: getClusterColor(clusterIndex),
      position: { x: clusterIndex * 300, y: 0 },
      expanded: true,
      metadata: {
        type: 'custom',
        count: clusterNodes.length,
        groupKey,
        avgConfidence: calculateAverageConfidence(clusterNodes)
      }
    });
    
    clusterIndex++;
  });
  
  return clusters;
};

// Utility functions
const calculateNodeSimilarity = (node1: Node, node2: Node): number => {
  let similarity = 0;
  let factors = 0;
  
  // Compare node types
  if (node1.type === node2.type) {
    similarity += 0.3;
  }
  factors++;
  
  // Compare tactics
  if (node1.data?.tactic_id && node2.data?.tactic_id) {
    if (node1.data.tactic_id === node2.data.tactic_id) {
      similarity += 0.4;
    }
    factors++;
  }
  
  // Compare descriptions (simple text similarity)
  if (node1.data?.description && node2.data?.description) {
    const desc1 = node1.data.description.toLowerCase();
    const desc2 = node2.data.description.toLowerCase();
    const words1 = new Set(desc1.split(/\s+/));
    const words2 = new Set(desc2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    similarity += (intersection.size / union.size) * 0.3;
    factors++;
  }
  
  return factors > 0 ? similarity / factors : 0;
};

const calculateAverageConfidence = (nodes: Node[]): number => {
  const confidenceValues = nodes
    .map(node => {
      const conf = node.data?.confidence;
      if (conf === 'high') return 0.9;
      if (conf === 'medium') return 0.6;
      if (conf === 'low') return 0.3;
      return 0.5; // default
    })
    .filter(val => val !== null);
  
  return confidenceValues.length > 0
    ? confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length
    : 0.5;
};

const getClusterColor = (index: number): string => {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
    '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
  ];
  return colors[index % colors.length];
};

// Cluster layout functions
export const layoutClusters = (
  clusters: NodeCluster[],
  containerWidth: number = 1200,
  containerHeight: number = 800
): NodeCluster[] => {
  const clusterSpacing = 350;
  const rowHeight = 300;
  const columnsPerRow = Math.floor(containerWidth / clusterSpacing) || 1;
  
  return clusters.map((cluster, index) => {
    const row = Math.floor(index / columnsPerRow);
    const col = index % columnsPerRow;
    
    return {
      ...cluster,
      position: {
        x: col * clusterSpacing + 50,
        y: row * rowHeight + 50
      }
    };
  });
};

// Expand/collapse cluster functionality
export const toggleClusterExpansion = (
  cluster: NodeCluster,
  expanded: boolean
): { nodes: Node[], clusterNode?: Node } => {
  if (expanded) {
    // Expand: show individual nodes
    return {
      nodes: cluster.nodes.map((node, index) => ({
        ...node,
        position: {
          x: cluster.position.x + (index % 3) * 100,
          y: cluster.position.y + Math.floor(index / 3) * 80
        },
        style: {
          ...node.style,
          opacity: 1,
          transition: 'all 0.5s ease-in-out'
        }
      }))
    };
  } else {
    // Collapse: show cluster node
    const clusterNode: Node = {
      id: `cluster-${cluster.id}`,
      type: 'cluster',
      position: cluster.position,
      data: {
        label: cluster.label,
        count: cluster.nodes.length,
        color: cluster.color,
        metadata: cluster.metadata,
        nodes: cluster.nodes
      },
      style: {
        backgroundColor: cluster.color,
        border: `2px solid ${cluster.color}`,
        borderRadius: '12px',
        transition: 'all 0.5s ease-in-out'
      }
    };
    
    return { nodes: [], clusterNode };
  }
};