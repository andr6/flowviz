import dagre from 'dagre';
import { Node, Edge, Position } from 'reactflow';

// Layout algorithms for different visualization modes
export type LayoutType = 'hierarchical' | 'force-directed' | 'timeline' | 'circular' | 'grid';

interface LayoutOptions {
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  nodeSpacing?: number;
  rankSpacing?: number;
  animate?: boolean;
}

// Force-directed layout using simple physics simulation
export const applyForceDirectedLayout = (
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[], edges: Edge[] } => {
  const {
    nodeSpacing = 150,
    animate = true
  } = options;

  // Simple force-directed algorithm
  const layoutNodes = nodes.map(node => ({
    ...node,
    position: node.position || { x: Math.random() * 800, y: Math.random() * 600 }
  }));

  // Create adjacency list for connected nodes
  const adjacencyList = new Map<string, string[]>();
  nodes.forEach(node => adjacencyList.set(node.id, []));
  
  edges.forEach(edge => {
    adjacencyList.get(edge.source)?.push(edge.target);
    adjacencyList.get(edge.target)?.push(edge.source);
  });

  // Apply force-directed positioning
  const iterations = 50;
  const repulsionStrength = 10000;
  const attractionStrength = 0.01;
  const damping = 0.9;

  for (let iter = 0; iter < iterations; iter++) {
    layoutNodes.forEach(node => {
      let fx = 0, fy = 0;

      // Repulsion forces between all nodes
      layoutNodes.forEach(other => {
        if (node.id !== other.id) {
          const dx = node.position.x - other.position.x;
          const dy = node.position.y - other.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsionStrength / (distance * distance);
          
          fx += (dx / distance) * force;
          fy += (dy / distance) * force;
        }
      });

      // Attraction forces for connected nodes
      const neighbors = adjacencyList.get(node.id) || [];
      neighbors.forEach(neighborId => {
        const neighbor = layoutNodes.find(n => n.id === neighborId);
        if (neighbor) {
          const dx = neighbor.position.x - node.position.x;
          const dy = neighbor.position.y - node.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = attractionStrength * distance;
          
          fx += dx * force;
          fy += dy * force;
        }
      });

      // Apply forces with damping
      node.position.x += fx * damping;
      node.position.y += fy * damping;
    });
  }

  // Center the layout
  const bounds = getBounds(layoutNodes);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  
  layoutNodes.forEach(node => {
    node.position.x -= centerX;
    node.position.y -= centerY;
  });

  return {
    nodes: layoutNodes.map(node => ({
      ...node,
      style: animate ? {
        ...node.style,
        transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
      } : node.style
    })),
    edges
  };
};

// Hierarchical layout using Dagre
export const applyHierarchicalLayout = (
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[], edges: Edge[] } => {
  const {
    direction = 'TB',
    nodeSpacing = 150,
    rankSpacing = 100,
    animate = true
  } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: nodeSpacing,
    ranksep: rankSpacing,
    marginx: 50,
    marginy: 50
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: node.width || 200, 
      height: node.height || 100 
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Apply dagre layout
  dagre.layout(dagreGraph);

  // Update node positions
  const layoutNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: direction === 'LR' || direction === 'RL' ? Position.Left : Position.Top,
      sourcePosition: direction === 'LR' || direction === 'RL' ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - (node.width || 200) / 2,
        y: nodeWithPosition.y - (node.height || 100) / 2,
      },
      style: animate ? {
        ...node.style,
        transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
      } : node.style
    };
  });

  return { nodes: layoutNodes, edges };
};

// Timeline layout based on attack phases or temporal data
export const applyTimelineLayout = (
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[], edges: Edge[] } => {
  const {
    nodeSpacing = 200,
    animate = true
  } = options;

  // Define MITRE ATT&CK tactic order for timeline
  const tacticOrder = [
    'TA0043', // Reconnaissance
    'TA0042', // Resource Development
    'TA0001', // Initial Access
    'TA0002', // Execution
    'TA0003', // Persistence
    'TA0004', // Privilege Escalation
    'TA0005', // Defense Evasion
    'TA0006', // Credential Access
    'TA0007', // Discovery
    'TA0008', // Lateral Movement
    'TA0009', // Collection
    'TA0011', // Command and Control
    'TA0010', // Exfiltration
    'TA0040', // Impact
  ];

  // Group nodes by tactic or timestamp
  const nodeGroups = new Map<string, Node[]>();
  
  nodes.forEach(node => {
    let groupKey = 'unknown';
    
    // Try to group by MITRE tactic
    if (node.data?.tactic_id) {
      groupKey = node.data.tactic_id;
    } else if (node.data?.timestamp) {
      // Group by time periods if timestamps are available
      const date = new Date(node.data.timestamp);
      groupKey = date.toISOString().split('T')[0]; // Group by day
    } else if (node.type) {
      // Fallback to node type grouping
      groupKey = node.type;
    }
    
    if (!nodeGroups.has(groupKey)) {
      nodeGroups.set(groupKey, []);
    }
    nodeGroups.get(groupKey)!.push(node);
  });

  // Sort groups by tactic order or chronologically
  const sortedGroups = Array.from(nodeGroups.entries()).sort(([a], [b]) => {
    const aIndex = tacticOrder.indexOf(a);
    const bIndex = tacticOrder.indexOf(b);
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    } else if (aIndex !== -1) {
      return -1;
    } else if (bIndex !== -1) {
      return 1;
    } else {
      return a.localeCompare(b);
    }
  });

  // Layout nodes in timeline format
  const layoutNodes: Node[] = [];
  let currentX = 0;
  const startY = 100;

  sortedGroups.forEach(([groupKey, groupNodes], groupIndex) => {
    const groupWidth = Math.max(300, groupNodes.length * 150);
    let currentY = startY;
    
    groupNodes.forEach((node, nodeIndex) => {
      const x = currentX + (nodeIndex % 3) * 150 + 75; // 3 columns max per group
      const y = currentY + Math.floor(nodeIndex / 3) * 120;
      
      layoutNodes.push({
        ...node,
        position: { x, y },
        data: {
          ...node.data,
          timelineGroup: groupKey,
          timelineIndex: groupIndex
        },
        style: animate ? {
          ...node.style,
          transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
        } : node.style
      });
    });
    
    currentX += groupWidth + 100; // Space between groups
  });

  return { nodes: layoutNodes, edges };
};

// Circular layout for network-style visualization
export const applyCircularLayout = (
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[], edges: Edge[] } => {
  const {
    nodeSpacing = 200,
    animate = true
  } = options;

  const centerX = 0;
  const centerY = 0;
  const radius = Math.max(200, nodes.length * 30);

  const layoutNodes = nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    return {
      ...node,
      position: { x, y },
      style: animate ? {
        ...node.style,
        transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
      } : node.style
    };
  });

  return { nodes: layoutNodes, edges };
};

// Grid layout for organized display
export const applyGridLayout = (
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[], edges: Edge[] } => {
  const {
    nodeSpacing = 200,
    animate = true
  } = options;

  const cols = Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / cols);

  const layoutNodes = nodes.map((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * nodeSpacing;
    const y = row * nodeSpacing;

    return {
      ...node,
      position: { x, y },
      style: animate ? {
        ...node.style,
        transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
      } : node.style
    };
  });

  return { nodes: layoutNodes, edges };
};

// Main layout function that dispatches to specific algorithms
export const applyAdvancedLayout = (
  nodes: Node[],
  edges: Edge[],
  layoutType: LayoutType,
  options: LayoutOptions = {}
): { nodes: Node[], edges: Edge[] } => {
  switch (layoutType) {
    case 'hierarchical':
      return applyHierarchicalLayout(nodes, edges, options);
    case 'force-directed':
      return applyForceDirectedLayout(nodes, edges, options);
    case 'timeline':
      return applyTimelineLayout(nodes, edges, options);
    case 'circular':
      return applyCircularLayout(nodes, edges, options);
    case 'grid':
      return applyGridLayout(nodes, edges, options);
    default:
      return { nodes, edges };
  }
};

// Utility function to get bounds of nodes
const getBounds = (nodes: Node[]) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  nodes.forEach(node => {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x);
    maxY = Math.max(maxY, node.position.y);
  });
  
  return { minX, minY, maxX, maxY };
};

// Animation helper for smooth transitions
export const animateLayoutTransition = (
  fromNodes: Node[],
  toNodes: Node[],
  duration: number = 800
): Promise<Node[]> => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const animatedNodes = [...fromNodes];

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = easeInOutCubic(progress);

      animatedNodes.forEach((node, index) => {
        const targetNode = toNodes.find(n => n.id === node.id);
        if (targetNode) {
          node.position.x = lerp(fromNodes[index].position.x, targetNode.position.x, easeProgress);
          node.position.y = lerp(fromNodes[index].position.y, targetNode.position.y, easeProgress);
        }
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve(toNodes);
      }
    };

    animate();
  });
};

// Easing function for smooth animations
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

// Linear interpolation
const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};