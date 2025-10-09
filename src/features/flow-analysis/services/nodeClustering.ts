import { Node } from 'reactflow';

export interface ClusterConfig {
  id: string;
  name: string;
  color: string;
  tactics: string[];
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface ClusteredNode extends Node {
  clusterId?: string;
  originalPosition?: { x: number; y: number };
  clusterPosition?: { x: number; y: number };
}

export interface NodeCluster {
  id: string;
  name: string;
  color: string;
  nodes: ClusteredNode[];
  position: { x: number; y: number };
  size: { width: number; height: number };
  collapsed: boolean;
}

// MITRE ATT&CK Tactics mapping
export const MITRE_TACTICS = {
  'reconnaissance': {
    name: 'Reconnaissance',
    color: '#FF6B6B',
    description: 'Gathering information to plan future adversary operations'
  },
  'resource-development': {
    name: 'Resource Development',
    color: '#4ECDC4',
    description: 'Establishing resources to support operations'
  },
  'initial-access': {
    name: 'Initial Access',
    color: '#45B7D1',
    description: 'Gaining foothold within network'
  },
  'execution': {
    name: 'Execution',
    color: '#96CEB4',
    description: 'Running malicious code'
  },
  'persistence': {
    name: 'Persistence',
    color: '#FFEAA7',
    description: 'Maintaining access to systems'
  },
  'privilege-escalation': {
    name: 'Privilege Escalation',
    color: '#DDA0DD',
    description: 'Gaining higher-level permissions'
  },
  'defense-evasion': {
    name: 'Defense Evasion',
    color: '#F19CBB',
    description: 'Avoiding detection'
  },
  'credential-access': {
    name: 'Credential Access',
    color: '#A8E6CF',
    description: 'Stealing credentials'
  },
  'discovery': {
    name: 'Discovery',
    color: '#FFD93D',
    description: 'Learning about the environment'
  },
  'lateral-movement': {
    name: 'Lateral Movement',
    color: '#6BCF7F',
    description: 'Moving through the environment'
  },
  'collection': {
    name: 'Collection',
    color: '#4D96FF',
    description: 'Gathering data of interest'
  },
  'command-and-control': {
    name: 'Command and Control',
    color: '#9B59B6',
    description: 'Communicating with compromised systems'
  },
  'exfiltration': {
    name: 'Exfiltration',
    color: '#E67E22',
    description: 'Stealing data'
  },
  'impact': {
    name: 'Impact',
    color: '#E74C3C',
    description: 'Manipulate, interrupt, or destroy systems'
  }
};

class NodeClusteringService {
  private clusters: NodeCluster[] = [];
  private clusteringEnabled: boolean = false;

  // Extract tactic from node data
  private extractTactic(node: Node): string {
    // Look for MITRE technique ID in node data
    const techniqueId = node.data?.technique_id || node.data?.id || '';
    const tacticHint = node.data?.tactic || node.data?.category || '';
    
    // Map common patterns to tactics
    const tacticMappings: { [key: string]: string } = {
      // Common technique patterns
      'T1190': 'initial-access',
      'T1566': 'initial-access', 
      'T1059': 'execution',
      'T1055': 'defense-evasion',
      'T1003': 'credential-access',
      'T1083': 'discovery',
      'T1057': 'discovery',
      'T1021': 'lateral-movement',
      'T1041': 'exfiltration',
      'T1486': 'impact',
      
      // Keyword mappings
      'reconnaissance': 'reconnaissance',
      'scan': 'reconnaissance',
      'recon': 'reconnaissance',
      'execute': 'execution',
      'run': 'execution',
      'command': 'execution',
      'persist': 'persistence',
      'maintain': 'persistence',
      'escalate': 'privilege-escalation',
      'elevate': 'privilege-escalation',
      'evade': 'defense-evasion',
      'bypass': 'defense-evasion',
      'hide': 'defense-evasion',
      'credential': 'credential-access',
      'password': 'credential-access',
      'discover': 'discovery',
      'enumerate': 'discovery',
      'move': 'lateral-movement',
      'spread': 'lateral-movement',
      'collect': 'collection',
      'gather': 'collection',
      'c2': 'command-and-control',
      'control': 'command-and-control',
      'exfil': 'exfiltration',
      'steal': 'exfiltration',
      'destroy': 'impact',
      'encrypt': 'impact',
      'ransom': 'impact'
    };

    // Check direct tactic hint first
    if (tacticHint && MITRE_TACTICS[tacticHint.toLowerCase().replace(/\s+/g, '-')]) {
      return tacticHint.toLowerCase().replace(/\s+/g, '-');
    }

    // Check technique ID
    if (techniqueId && tacticMappings[techniqueId]) {
      return tacticMappings[techniqueId];
    }

    // Check node label/name for keywords
    const nodeText = (node.data?.label || node.data?.name || '').toLowerCase();
    for (const [keyword, tactic] of Object.entries(tacticMappings)) {
      if (nodeText.includes(keyword)) {
        return tactic;
      }
    }

    // Default fallback based on node type
    const nodeType = node.data?.type || '';
    switch (nodeType) {
      case 'initial': return 'initial-access';
      case 'execution': return 'execution';
      case 'lateral': return 'lateral-movement';
      case 'data': return 'collection';
      case 'network': return 'command-and-control';
      case 'impact': return 'impact';
      default: return 'discovery'; // Default tactic
    }
  }

  // Calculate cluster layout positions
  private calculateClusterPositions(clusterCount: number, canvasSize: { width: number; height: number }) {
    const positions: { x: number; y: number }[] = [];
    const padding = 100;
    const clusterSize = 300;
    
    // Calculate grid layout
    const cols = Math.ceil(Math.sqrt(clusterCount));
    const rows = Math.ceil(clusterCount / cols);
    
    for (let i = 0; i < clusterCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      positions.push({
        x: padding + col * (clusterSize + padding),
        y: padding + row * (clusterSize + padding)
      });
    }
    
    return positions;
  }

  // Cluster nodes by tactic
  clusterNodesByTactic(nodes: Node[], canvasSize: { width: number; height: number } = { width: 1200, height: 800 }): NodeCluster[] {
    const tacticGroups: { [key: string]: ClusteredNode[] } = {};
    
    // Group nodes by tactic
    nodes.forEach(node => {
      const tactic = this.extractTactic(node);
      
      if (!tacticGroups[tactic]) {
        tacticGroups[tactic] = [];
      }
      
      const clusteredNode: ClusteredNode = {
        ...node,
        clusterId: tactic,
        originalPosition: node.position,
        clusterPosition: node.position
      };
      
      tacticGroups[tactic].push(clusteredNode);
    });

    // Create clusters
    const tacticKeys = Object.keys(tacticGroups);
    const clusterPositions = this.calculateClusterPositions(tacticKeys.length, canvasSize);
    
    this.clusters = tacticKeys.map((tactic, index) => {
      const tacticInfo = MITRE_TACTICS[tactic] || {
        name: tactic.charAt(0).toUpperCase() + tactic.slice(1),
        color: '#666666',
        description: 'Unknown tactic'
      };
      
      const clusterNodes = tacticGroups[tactic];
      const position = clusterPositions[index] || { x: 100, y: 100 };
      
      // Position nodes within cluster
      this.positionNodesInCluster(clusterNodes, position);
      
      return {
        id: tactic,
        name: tacticInfo.name,
        color: tacticInfo.color,
        nodes: clusterNodes,
        position,
        size: { width: 280, height: 200 },
        collapsed: false
      };
    });

    this.clusteringEnabled = true;
    return this.clusters;
  }

  // Position nodes within a cluster
  private positionNodesInCluster(nodes: ClusteredNode[], clusterPosition: { x: number; y: number }) {
    const clusterPadding = 20;
    const nodeSpacing = 80;
    const maxNodesPerRow = 3;
    
    nodes.forEach((node, index) => {
      const row = Math.floor(index / maxNodesPerRow);
      const col = index % maxNodesPerRow;
      
      node.clusterPosition = {
        x: clusterPosition.x + clusterPadding + col * nodeSpacing,
        y: clusterPosition.y + clusterPadding + 40 + row * nodeSpacing // +40 for cluster header
      };
      
      // Update actual position for clustered view
      node.position = node.clusterPosition;
    });
  }

  // Get clustered nodes for rendering
  getClusteredNodes(): ClusteredNode[] {
    if (!this.clusteringEnabled) {return [];}
    
    return this.clusters.flatMap(cluster => 
      cluster.collapsed 
        ? [] // Hide nodes when cluster is collapsed
        : cluster.nodes
    );
  }

  // Get cluster data
  getClusters(): NodeCluster[] {
    return this.clusters;
  }

  // Toggle cluster collapse/expand
  toggleCluster(clusterId: string): NodeCluster | null {
    const cluster = this.clusters.find(c => c.id === clusterId);
    if (cluster) {
      cluster.collapsed = !cluster.collapsed;
      return cluster;
    }
    return null;
  }

  // Disable clustering and restore original positions
  disableClustering(nodes: Node[]): Node[] {
    this.clusteringEnabled = false;
    
    return nodes.map(node => {
      const clusteredNode = node as ClusteredNode;
      if (clusteredNode.originalPosition) {
        return {
          ...node,
          position: clusteredNode.originalPosition
        };
      }
      return node;
    });
  }

  // Check if clustering is enabled
  isClusteringEnabled(): boolean {
    return this.clusteringEnabled;
  }

  // Get nodes in a specific cluster
  getNodesInCluster(clusterId: string): ClusteredNode[] {
    const cluster = this.clusters.find(c => c.id === clusterId);
    return cluster ? cluster.nodes : [];
  }

  // Search nodes across all clusters
  searchNodes(query: string): ClusteredNode[] {
    const searchTerm = query.toLowerCase();
    return this.clusters.flatMap(cluster =>
      cluster.nodes.filter(node =>
        node.data?.label?.toLowerCase().includes(searchTerm) ||
        node.data?.technique_id?.toLowerCase().includes(searchTerm) ||
        node.data?.name?.toLowerCase().includes(searchTerm) ||
        cluster.name.toLowerCase().includes(searchTerm)
      )
    );
  }

  // Get cluster statistics
  getClusterStats() {
    return {
      totalClusters: this.clusters.length,
      totalNodes: this.clusters.reduce((sum, cluster) => sum + cluster.nodes.length, 0),
      clustersCollapsed: this.clusters.filter(c => c.collapsed).length,
      nodesByTactic: this.clusters.map(cluster => ({
        tactic: cluster.name,
        nodeCount: cluster.nodes.length,
        collapsed: cluster.collapsed
      }))
    };
  }
}

// Export singleton instance
export const nodeClusteringService = new NodeClusteringService();