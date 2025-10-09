import { Node, Edge } from 'reactflow';

export type ConfidenceLevel = 'very-low' | 'low' | 'medium' | 'high' | 'very-high';

export interface ConfidenceScore {
  score: number; // 0-100
  level: ConfidenceLevel;
  source: string;
  timestamp: number;
  factors: ConfidenceFactor[];
}

export interface ConfidenceFactor {
  id: string;
  name: string;
  weight: number;
  value: number;
  description: string;
  category: 'data-quality' | 'source-reliability' | 'technique-evidence' | 'temporal-relevance' | 'threat-intel';
}

export interface NodeConfidence {
  nodeId: string;
  overallScore: ConfidenceScore;
  detectionConfidence: ConfidenceScore;
  attributionConfidence: ConfidenceScore;
  behaviorConfidence: ConfidenceScore;
}

export interface EdgeConfidence {
  edgeId: string;
  overallScore: ConfidenceScore;
  causalityConfidence: ConfidenceScore;
  sequenceConfidence: ConfidenceScore;
}

// Predefined confidence factors
export const CONFIDENCE_FACTORS: { [key: string]: Omit<ConfidenceFactor, 'value'> } = {
  'data-completeness': {
    id: 'data-completeness',
    name: 'Data Completeness',
    weight: 0.25,
    description: 'How complete the available data is',
    category: 'data-quality',
  },
  'source-reliability': {
    id: 'source-reliability',
    name: 'Source Reliability',
    weight: 0.20,
    description: 'Trustworthiness of the data source',
    category: 'source-reliability',
  },
  'technique-prevalence': {
    id: 'technique-prevalence',
    name: 'Technique Prevalence',
    weight: 0.15,
    description: 'How commonly this technique is observed',
    category: 'technique-evidence',
  },
  'temporal-relevance': {
    id: 'temporal-relevance',
    name: 'Temporal Relevance',
    weight: 0.15,
    description: 'How recent and relevant the observation is',
    category: 'temporal-relevance',
  },
  'attribution-evidence': {
    id: 'attribution-evidence',
    name: 'Attribution Evidence',
    weight: 0.10,
    description: 'Strength of evidence linking to threat actor',
    category: 'threat-intel',
  },
  'behavioral-consistency': {
    id: 'behavioral-consistency',
    name: 'Behavioral Consistency',
    weight: 0.10,
    description: 'Consistency with known behavioral patterns',
    category: 'technique-evidence',
  },
  'detection-accuracy': {
    id: 'detection-accuracy',
    name: 'Detection Accuracy',
    weight: 0.05,
    description: 'Accuracy of the detection mechanism',
    category: 'data-quality',
  },
};

// Confidence level mappings
export const CONFIDENCE_LEVELS: { [key: string]: { min: number; max: number; color: string; label: string; description: string } } = {
  'very-low': {
    min: 0,
    max: 20,
    color: '#dc3545',
    label: 'Very Low',
    description: 'Minimal confidence - high uncertainty',
  },
  'low': {
    min: 21,
    max: 40,
    color: '#fd7e14',
    label: 'Low',
    description: 'Low confidence - significant uncertainty',
  },
  'medium': {
    min: 41,
    max: 60,
    color: '#ffc107',
    label: 'Medium',
    description: 'Moderate confidence - some uncertainty',
  },
  'high': {
    min: 61,
    max: 80,
    color: '#20c997',
    label: 'High',
    description: 'High confidence - low uncertainty',
  },
  'very-high': {
    min: 81,
    max: 100,
    color: '#28a745',
    label: 'Very High',
    description: 'Very high confidence - minimal uncertainty',
  },
};

class ConfidenceIndicatorService {
  private nodeConfidence: Map<string, NodeConfidence> = new Map();
  private edgeConfidence: Map<string, EdgeConfidence> = new Map();

  // Calculate confidence level from score
  private getConfidenceLevel(score: number): ConfidenceLevel {
    for (const [level, config] of Object.entries(CONFIDENCE_LEVELS)) {
      if (score >= config.min && score <= config.max) {
        return level as ConfidenceLevel;
      }
    }
    return 'medium';
  }

  // Calculate weighted confidence score from factors
  private calculateScore(factors: ConfidenceFactor[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    factors.forEach(factor => {
      weightedSum += factor.value * factor.weight;
      totalWeight += factor.weight;
    });

    return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
  }

  // Extract confidence data from node metadata
  private extractNodeConfidenceFactors(node: Node): ConfidenceFactor[] {
    const factors: ConfidenceFactor[] = [];
    const nodeData = node.data || {};

    // Data completeness based on available fields
    const availableFields = ['technique_id', 'tactic', 'description', 'severity', 'timestamp'].filter(
      field => nodeData[field] !== undefined && nodeData[field] !== null && nodeData[field] !== ''
    );
    const completenessValue = (availableFields.length / 5) * 100;
    
    factors.push({
      ...CONFIDENCE_FACTORS['data-completeness'],
      value: completenessValue,
    });

    // Source reliability based on data source
    let reliabilityValue = 50; // Default medium
    if (nodeData.source) {
      const reliableSources = ['mitre', 'nist', 'cisa', 'crowdstrike', 'fireeye'];
      if (reliableSources.some(source => nodeData.source.toLowerCase().includes(source))) {
        reliabilityValue = 85;
      } else if (nodeData.source.toLowerCase().includes('osint') || nodeData.source.toLowerCase().includes('community')) {
        reliabilityValue = 60;
      }
    }
    
    factors.push({
      ...CONFIDENCE_FACTORS['source-reliability'],
      value: reliabilityValue,
    });

    // Technique prevalence based on MITRE ATT&CK data
    let prevalenceValue = 50; // Default medium
    if (nodeData.technique_id) {
      // Common techniques get higher confidence
      const commonTechniques = ['T1059', 'T1055', 'T1083', 'T1082', 'T1012'];
      if (commonTechniques.some(tech => nodeData.technique_id.includes(tech))) {
        prevalenceValue = 75;
      }
    }
    
    factors.push({
      ...CONFIDENCE_FACTORS['technique-prevalence'],
      value: prevalenceValue,
    });

    // Temporal relevance based on timestamp
    let temporalValue = 50; // Default medium
    if (nodeData.timestamp) {
      const timestamp = new Date(nodeData.timestamp).getTime();
      const now = Date.now();
      const daysSinceEvent = (now - timestamp) / (1000 * 60 * 60 * 24);
      
      if (daysSinceEvent <= 7) {
        temporalValue = 90; // Very recent
      } else if (daysSinceEvent <= 30) {
        temporalValue = 75; // Recent
      } else if (daysSinceEvent <= 90) {
        temporalValue = 60; // Moderately recent
      } else {
        temporalValue = 30; // Old data
      }
    }
    
    factors.push({
      ...CONFIDENCE_FACTORS['temporal-relevance'],
      value: temporalValue,
    });

    // Attribution evidence based on threat actor data
    let attributionValue = 40; // Default low-medium
    if (nodeData.threat_actor || nodeData.campaign) {
      attributionValue = 70;
    }
    
    factors.push({
      ...CONFIDENCE_FACTORS['attribution-evidence'],
      value: attributionValue,
    });

    // Behavioral consistency based on tactic/technique alignment
    let behaviorValue = 50; // Default medium
    if (nodeData.tactic && nodeData.technique_id) {
      // Check if technique aligns with tactic (simplified logic)
      behaviorValue = 70;
    }
    
    factors.push({
      ...CONFIDENCE_FACTORS['behavioral-consistency'],
      value: behaviorValue,
    });

    // Detection accuracy based on detection method
    let detectionValue = 60; // Default medium-high
    if (nodeData.detection_method) {
      if (nodeData.detection_method.toLowerCase().includes('signature') || 
          nodeData.detection_method.toLowerCase().includes('hash')) {
        detectionValue = 85; // High accuracy methods
      } else if (nodeData.detection_method.toLowerCase().includes('behavioral') || 
                 nodeData.detection_method.toLowerCase().includes('heuristic')) {
        detectionValue = 65; // Medium-high accuracy
      }
    }
    
    factors.push({
      ...CONFIDENCE_FACTORS['detection-accuracy'],
      value: detectionValue,
    });

    return factors;
  }

  // Calculate node confidence
  calculateNodeConfidence(node: Node): NodeConfidence {
    const factors = this.extractNodeConfidenceFactors(node);
    const overallScore = this.calculateScore(factors);
    
    const baseScore: ConfidenceScore = {
      score: overallScore,
      level: this.getConfidenceLevel(overallScore),
      source: 'automated-analysis',
      timestamp: Date.now(),
      factors,
    };

    // Calculate specific confidence scores
    const detectionFactors = factors.filter(f => 
      ['data-completeness', 'source-reliability', 'detection-accuracy'].includes(f.id)
    );
    const detectionScore = this.calculateScore(detectionFactors);

    const attributionFactors = factors.filter(f => 
      ['attribution-evidence', 'behavioral-consistency', 'source-reliability'].includes(f.id)
    );
    const attributionScore = this.calculateScore(attributionFactors);

    const behaviorFactors = factors.filter(f => 
      ['behavioral-consistency', 'technique-prevalence', 'temporal-relevance'].includes(f.id)
    );
    const behaviorScore = this.calculateScore(behaviorFactors);

    const confidence: NodeConfidence = {
      nodeId: node.id,
      overallScore: baseScore,
      detectionConfidence: {
        ...baseScore,
        score: detectionScore,
        level: this.getConfidenceLevel(detectionScore),
        factors: detectionFactors,
      },
      attributionConfidence: {
        ...baseScore,
        score: attributionScore,
        level: this.getConfidenceLevel(attributionScore),
        factors: attributionFactors,
      },
      behaviorConfidence: {
        ...baseScore,
        score: behaviorScore,
        level: this.getConfidenceLevel(behaviorScore),
        factors: behaviorFactors,
      },
    };

    this.nodeConfidence.set(node.id, confidence);
    return confidence;
  }

  // Calculate edge confidence
  calculateEdgeConfidence(edge: Edge, sourceNode: Node, targetNode: Node): EdgeConfidence {
    const factors: ConfidenceFactor[] = [];

    // Sequence confidence based on temporal data
    let sequenceValue = 50; // Default medium
    if (sourceNode.data?.timestamp && targetNode.data?.timestamp) {
      const sourceTime = new Date(sourceNode.data.timestamp).getTime();
      const targetTime = new Date(targetNode.data.timestamp).getTime();
      
      if (targetTime > sourceTime) {
        const timeDiff = (targetTime - sourceTime) / (1000 * 60); // minutes
        if (timeDiff > 0 && timeDiff < 60) {
          sequenceValue = 85; // Strong temporal sequence
        } else if (timeDiff < 720) {
          sequenceValue = 70; // Reasonable sequence
        }
      }
    }

    factors.push({
      ...CONFIDENCE_FACTORS['temporal-relevance'],
      id: 'sequence-temporal',
      name: 'Sequence Temporal',
      description: 'Temporal alignment of the sequence',
      value: sequenceValue,
    });

    // Causality confidence based on technique relationships
    let causalityValue = 60; // Default medium-high
    if (sourceNode.data?.tactic && targetNode.data?.tactic) {
      // Check logical flow between tactics
      const tacticFlow = ['reconnaissance', 'initial-access', 'execution', 'persistence', 'privilege-escalation'];
      const sourceIndex = tacticFlow.indexOf(sourceNode.data.tactic.toLowerCase());
      const targetIndex = tacticFlow.indexOf(targetNode.data.tactic.toLowerCase());
      
      if (sourceIndex !== -1 && targetIndex !== -1 && targetIndex > sourceIndex) {
        causalityValue = 80; // Logical tactic progression
      }
    }

    factors.push({
      ...CONFIDENCE_FACTORS['behavioral-consistency'],
      id: 'causality-behavioral',
      name: 'Causality Behavioral',
      description: 'Behavioral consistency of the causal relationship',
      value: causalityValue,
    });

    const overallScore = this.calculateScore(factors);

    const confidence: EdgeConfidence = {
      edgeId: edge.id,
      overallScore: {
        score: overallScore,
        level: this.getConfidenceLevel(overallScore),
        source: 'automated-analysis',
        timestamp: Date.now(),
        factors,
      },
      causalityConfidence: {
        score: causalityValue,
        level: this.getConfidenceLevel(causalityValue),
        source: 'automated-analysis',
        timestamp: Date.now(),
        factors: factors.filter(f => f.id.includes('causality')),
      },
      sequenceConfidence: {
        score: sequenceValue,
        level: this.getConfidenceLevel(sequenceValue),
        source: 'automated-analysis',
        timestamp: Date.now(),
        factors: factors.filter(f => f.id.includes('sequence')),
      },
    };

    this.edgeConfidence.set(edge.id, confidence);
    return confidence;
  }

  // Get node confidence
  getNodeConfidence(nodeId: string): NodeConfidence | null {
    return this.nodeConfidence.get(nodeId) || null;
  }

  // Get edge confidence
  getEdgeConfidence(edgeId: string): EdgeConfidence | null {
    return this.edgeConfidence.get(edgeId) || null;
  }

  // Get all node confidences
  getAllNodeConfidences(): NodeConfidence[] {
    return Array.from(this.nodeConfidence.values());
  }

  // Get all edge confidences
  getAllEdgeConfidences(): EdgeConfidence[] {
    return Array.from(this.edgeConfidence.values());
  }

  // Calculate confidence for all nodes
  calculateAllNodeConfidences(nodes: Node[]): void {
    nodes.forEach(node => this.calculateNodeConfidence(node));
  }

  // Calculate confidence for all edges
  calculateAllEdgeConfidences(edges: Edge[], nodes: Node[]): void {
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    
    edges.forEach(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      
      if (sourceNode && targetNode) {
        this.calculateEdgeConfidence(edge, sourceNode, targetNode);
      }
    });
  }

  // Get confidence statistics
  getConfidenceStats(): {
    nodeStats: { [key: string]: number };
    edgeStats: { [key: string]: number };
    avgConfidence: number;
  } {
    const nodeStats: { [key: string]: number } = {};
    const edgeStats: { [key: string]: number } = {};
    let totalScore = 0;
    let totalCount = 0;

    // Calculate node statistics
    Array.from(this.nodeConfidence.values()).forEach(confidence => {
      const level = confidence.overallScore.level;
      nodeStats[level] = (nodeStats[level] || 0) + 1;
      totalScore += confidence.overallScore.score;
      totalCount++;
    });

    // Calculate edge statistics
    Array.from(this.edgeConfidence.values()).forEach(confidence => {
      const level = confidence.overallScore.level;
      edgeStats[level] = (edgeStats[level] || 0) + 1;
      totalScore += confidence.overallScore.score;
      totalCount++;
    });

    return {
      nodeStats,
      edgeStats,
      avgConfidence: totalCount > 0 ? Math.round((totalScore / totalCount) * 100) / 100 : 0,
    };
  }

  // Clear all confidence data
  clear(): void {
    this.nodeConfidence.clear();
    this.edgeConfidence.clear();
  }

  // Update node confidence with manual score
  updateNodeConfidence(nodeId: string, score: number, source: string = 'manual'): boolean {
    const existing = this.nodeConfidence.get(nodeId);
    if (!existing) {return false;}

    existing.overallScore.score = score;
    existing.overallScore.level = this.getConfidenceLevel(score);
    existing.overallScore.source = source;
    existing.overallScore.timestamp = Date.now();

    return true;
  }

  // Update edge confidence with manual score
  updateEdgeConfidence(edgeId: string, score: number, source: string = 'manual'): boolean {
    const existing = this.edgeConfidence.get(edgeId);
    if (!existing) {return false;}

    existing.overallScore.score = score;
    existing.overallScore.level = this.getConfidenceLevel(score);
    existing.overallScore.source = source;
    existing.overallScore.timestamp = Date.now();

    return true;
  }
}

// Export singleton instance
export const confidenceIndicatorService = new ConfidenceIndicatorService();