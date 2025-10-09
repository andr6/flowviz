import { Node, Edge } from 'reactflow';

export type ImpactLevel = 'minimal' | 'low' | 'medium' | 'high' | 'severe';

export interface ImpactScore {
  overall: number; // 0-100
  level: ImpactLevel;
  breakdown: {
    confidentiality: number;
    integrity: number;
    availability: number;
    reputation: number;
    financial: number;
    operational: number;
  };
  factors: ImpactFactor[];
  timestamp: number;
}

export interface ImpactFactor {
  id: string;
  name: string;
  category: 'technical' | 'business' | 'regulatory' | 'operational';
  weight: number;
  score: number;
  description: string;
  evidence: string[];
  mitigation?: string;
}

export interface NodeImpact {
  nodeId: string;
  impact: ImpactScore;
  riskRating: 'very-low' | 'low' | 'medium' | 'high' | 'critical';
  criticalPath: boolean;
  dependencies: string[]; // Node IDs that depend on this node
  affectedAssets: string[];
  businessProcesses: string[];
}

// Impact level definitions
export const IMPACT_LEVELS: { [key: string]: { min: number; max: number; color: string; label: string; description: string } } = {
  'minimal': {
    min: 0,
    max: 20,
    color: '#28a745',
    label: 'Minimal',
    description: 'Little to no impact on operations',
  },
  'low': {
    min: 21,
    max: 40,
    color: '#20c997',
    label: 'Low',
    description: 'Minor disruption or damage',
  },
  'medium': {
    min: 41,
    max: 60,
    color: '#ffc107',
    label: 'Medium',
    description: 'Moderate impact with manageable consequences',
  },
  'high': {
    min: 61,
    max: 80,
    color: '#fd7e14',
    label: 'High',
    description: 'Significant impact requiring immediate attention',
  },
  'severe': {
    min: 81,
    max: 100,
    color: '#dc3545',
    label: 'Severe',
    description: 'Critical impact with severe consequences',
  },
};

// Predefined impact factors
export const IMPACT_FACTORS: { [key: string]: Omit<ImpactFactor, 'score' | 'evidence'> } = {
  'data-exposure': {
    id: 'data-exposure',
    name: 'Data Exposure Risk',
    category: 'technical',
    weight: 0.25,
    description: 'Risk of sensitive data being exposed or stolen',
    mitigation: 'Implement data encryption and access controls',
  },
  'system-availability': {
    id: 'system-availability',
    name: 'System Availability Impact',
    category: 'operational',
    weight: 0.20,
    description: 'Impact on system uptime and availability',
    mitigation: 'Implement redundancy and backup systems',
  },
  'business-disruption': {
    id: 'business-disruption',
    name: 'Business Process Disruption',
    category: 'business',
    weight: 0.20,
    description: 'Disruption to critical business processes',
    mitigation: 'Develop business continuity plans',
  },
  'financial-loss': {
    id: 'financial-loss',
    name: 'Financial Impact',
    category: 'business',
    weight: 0.15,
    description: 'Direct and indirect financial losses',
    mitigation: 'Implement financial controls and insurance',
  },
  'reputation-damage': {
    id: 'reputation-damage',
    name: 'Reputation Damage',
    category: 'business',
    weight: 0.10,
    description: 'Damage to organizational reputation',
    mitigation: 'Develop crisis communication plans',
  },
  'regulatory-compliance': {
    id: 'regulatory-compliance',
    name: 'Regulatory Compliance Impact',
    category: 'regulatory',
    weight: 0.05,
    description: 'Impact on regulatory compliance requirements',
    mitigation: 'Ensure compliance monitoring and reporting',
  },
  'lateral-movement-risk': {
    id: 'lateral-movement-risk',
    name: 'Lateral Movement Risk',
    category: 'technical',
    weight: 0.05,
    description: 'Risk of attacker moving to other systems',
    mitigation: 'Implement network segmentation and monitoring',
  },
};

// Asset criticality ratings
export const ASSET_CRITICALITY: { [key: string]: number } = {
  'domain-controller': 95,
  'database-server': 90,
  'email-server': 85,
  'web-server': 80,
  'file-server': 75,
  'workstation': 60,
  'printer': 30,
  'iot-device': 40,
  'network-device': 85,
  'backup-system': 80,
  'monitoring-system': 70,
};

// Business process criticality
export const BUSINESS_PROCESS_CRITICALITY: { [key: string]: number } = {
  'financial-transactions': 95,
  'customer-service': 85,
  'manufacturing': 90,
  'supply-chain': 80,
  'hr-operations': 70,
  'it-operations': 85,
  'research-development': 75,
  'marketing': 60,
  'legal-compliance': 80,
};

class ImpactScoringService {
  private nodeImpacts: Map<string, NodeImpact> = new Map();
  private assetCriticality: Map<string, number> = new Map();
  private businessProcesses: Map<string, number> = new Map();

  constructor() {
    // Initialize default asset criticality
    Object.entries(ASSET_CRITICALITY).forEach(([asset, criticality]) => {
      this.assetCriticality.set(asset, criticality);
    });

    // Initialize default business process criticality
    Object.entries(BUSINESS_PROCESS_CRITICALITY).forEach(([process, criticality]) => {
      this.businessProcesses.set(process, criticality);
    });
  }

  // Get impact level from score
  private getImpactLevel(score: number): ImpactLevel {
    for (const [level, config] of Object.entries(IMPACT_LEVELS)) {
      if (score >= config.min && score <= config.max) {
        return level as ImpactLevel;
      }
    }
    return 'medium';
  }

  // Calculate risk rating from impact and likelihood
  private calculateRiskRating(impactScore: number, likelihood: number = 50): NodeImpact['riskRating'] {
    const riskScore = (impactScore * likelihood) / 100;
    
    if (riskScore >= 80) {return 'critical';}
    if (riskScore >= 60) {return 'high';}
    if (riskScore >= 40) {return 'medium';}
    if (riskScore >= 20) {return 'low';}
    return 'very-low';
  }

  // Extract impact factors from node data
  private extractImpactFactors(node: Node): ImpactFactor[] {
    const factors: ImpactFactor[] = [];
    const nodeData = node.data || {};

    // Data exposure risk
    let dataExposureScore = 30; // Default low-medium
    const evidence: string[] = [];
    
    if (nodeData.data_types || nodeData.sensitive_data) {
      dataExposureScore = 80;
      evidence.push('Contains sensitive data types');
    }
    if (nodeData.pii || nodeData.personal_data) {
      dataExposureScore = 90;
      evidence.push('Contains personally identifiable information');
    }
    if (nodeData.financial_data) {
      dataExposureScore = 95;
      evidence.push('Contains financial data');
    }

    factors.push({
      ...IMPACT_FACTORS['data-exposure'],
      score: dataExposureScore,
      evidence,
    });

    // System availability impact
    let availabilityScore = 40; // Default medium
    const availabilityEvidence: string[] = [];
    
    if (nodeData.system_type === 'critical' || nodeData.criticality === 'high') {
      availabilityScore = 85;
      availabilityEvidence.push('Critical system component');
    }
    if (nodeData.technique_id && ['T1486', 'T1489', 'T1490'].includes(nodeData.technique_id)) {
      availabilityScore = 90; // Ransomware/destructive techniques
      availabilityEvidence.push('Destructive attack technique');
    }

    factors.push({
      ...IMPACT_FACTORS['system-availability'],
      score: availabilityScore,
      evidence: availabilityEvidence,
    });

    // Business disruption
    let businessScore = 50; // Default medium
    const businessEvidence: string[] = [];
    
    const assetType = nodeData.asset_type || nodeData.type || '';
    const assetCriticality = this.assetCriticality.get(assetType.toLowerCase()) || 50;
    businessScore = Math.max(businessScore, assetCriticality);
    
    if (assetCriticality > 80) {
      businessEvidence.push(`High criticality asset: ${assetType}`);
    }

    factors.push({
      ...IMPACT_FACTORS['business-disruption'],
      score: businessScore,
      evidence: businessEvidence,
    });

    // Financial impact
    let financialScore = 30; // Default low
    const financialEvidence: string[] = [];
    
    if (nodeData.financial_system || nodeData.payment_processing) {
      financialScore = 90;
      financialEvidence.push('Financial system or payment processing');
    }
    if (nodeData.revenue_impact) {
      financialScore = 75;
      financialEvidence.push('Direct revenue impact');
    }

    factors.push({
      ...IMPACT_FACTORS['financial-loss'],
      score: financialScore,
      evidence: financialEvidence,
    });

    // Reputation damage
    let reputationScore = 35; // Default low-medium
    const reputationEvidence: string[] = [];
    
    if (nodeData.public_facing || nodeData.customer_facing) {
      reputationScore = 70;
      reputationEvidence.push('Public or customer-facing system');
    }
    if (nodeData.brand_impact || nodeData.media_exposure) {
      reputationScore = 80;
      reputationEvidence.push('High brand or media exposure risk');
    }

    factors.push({
      ...IMPACT_FACTORS['reputation-damage'],
      score: reputationScore,
      evidence: reputationEvidence,
    });

    // Regulatory compliance
    let regulatoryScore = 20; // Default low
    const regulatoryEvidence: string[] = [];
    
    if (nodeData.compliance_scope || nodeData.regulated_data) {
      regulatoryScore = 75;
      regulatoryEvidence.push('Under regulatory compliance scope');
    }
    if (nodeData.hipaa || nodeData.pci_dss || nodeData.gdpr) {
      regulatoryScore = 85;
      regulatoryEvidence.push('Subject to specific regulations (HIPAA, PCI-DSS, GDPR)');
    }

    factors.push({
      ...IMPACT_FACTORS['regulatory-compliance'],
      score: regulatoryScore,
      evidence: regulatoryEvidence,
    });

    // Lateral movement risk
    let lateralScore = 40; // Default medium
    const lateralEvidence: string[] = [];
    
    if (nodeData.network_access || nodeData.privileged_access) {
      lateralScore = 75;
      lateralEvidence.push('Has network or privileged access');
    }
    if (nodeData.domain_controller || nodeData.admin_access) {
      lateralScore = 95;
      lateralEvidence.push('Domain controller or administrative access');
    }

    factors.push({
      ...IMPACT_FACTORS['lateral-movement-risk'],
      score: lateralScore,
      evidence: lateralEvidence,
    });

    return factors;
  }

  // Calculate weighted impact score
  private calculateImpactScore(factors: ImpactFactor[]): ImpactScore {
    let weightedSum = 0;
    let totalWeight = 0;

    factors.forEach(factor => {
      weightedSum += factor.score * factor.weight;
      totalWeight += factor.weight;
    });

    const overallScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight)) : 0;

    // Calculate CIA triad breakdown
    const confidentialityFactors = factors.filter(f => 
      ['data-exposure', 'lateral-movement-risk'].includes(f.id)
    );
    const integrityFactors = factors.filter(f => 
      ['data-exposure', 'system-availability'].includes(f.id)
    );
    const availabilityFactors = factors.filter(f => 
      ['system-availability', 'business-disruption'].includes(f.id)
    );

    const confidentiality = this.calculateCategoryScore(confidentialityFactors);
    const integrity = this.calculateCategoryScore(integrityFactors);
    const availability = this.calculateCategoryScore(availabilityFactors);

    // Business impact breakdown
    const reputation = factors.find(f => f.id === 'reputation-damage')?.score || 0;
    const financial = factors.find(f => f.id === 'financial-loss')?.score || 0;
    const operational = factors.find(f => f.id === 'business-disruption')?.score || 0;

    return {
      overall: overallScore,
      level: this.getImpactLevel(overallScore),
      breakdown: {
        confidentiality,
        integrity,
        availability,
        reputation,
        financial,
        operational,
      },
      factors,
      timestamp: Date.now(),
    };
  }

  // Calculate category score from factors
  private calculateCategoryScore(factors: ImpactFactor[]): number {
    if (factors.length === 0) {return 0;}
    
    let weightedSum = 0;
    let totalWeight = 0;

    factors.forEach(factor => {
      weightedSum += factor.score * factor.weight;
      totalWeight += factor.weight;
    });

    return totalWeight > 0 ? Math.round((weightedSum / totalWeight)) : 0;
  }

  // Calculate impact for a single node
  calculateNodeImpact(node: Node, allNodes: Node[], allEdges: Edge[]): NodeImpact {
    const factors = this.extractImpactFactors(node);
    const impact = this.calculateImpactScore(factors);
    
    // Determine if node is on critical path
    const criticalPath = this.isOnCriticalPath(node, allNodes, allEdges);
    
    // Find dependencies (nodes that depend on this node)
    const dependencies = allEdges
      .filter(edge => edge.source === node.id)
      .map(edge => edge.target);

    // Extract affected assets and business processes
    const affectedAssets = this.extractAffectedAssets(node);
    const businessProcesses = this.extractBusinessProcesses(node);

    // Calculate risk rating (assuming medium likelihood for now)
    const riskRating = this.calculateRiskRating(impact.overall, 60);

    const nodeImpact: NodeImpact = {
      nodeId: node.id,
      impact,
      riskRating,
      criticalPath,
      dependencies,
      affectedAssets,
      businessProcesses,
    };

    this.nodeImpacts.set(node.id, nodeImpact);
    return nodeImpact;
  }

  // Check if node is on critical path
  private isOnCriticalPath(node: Node, allNodes: Node[], allEdges: Edge[]): boolean {
    // Simplified critical path detection
    // A node is on critical path if it's connected to high-impact nodes
    const nodeData = node.data || {};
    
    // Check if it's a critical asset type
    if (nodeData.asset_type && this.assetCriticality.get(nodeData.asset_type.toLowerCase()) >= 80) {
      return true;
    }

    // Check if it has many dependencies
    const incomingEdges = allEdges.filter(edge => edge.target === node.id).length;
    const outgoingEdges = allEdges.filter(edge => edge.source === node.id).length;
    
    if (incomingEdges + outgoingEdges >= 3) {
      return true;
    }

    return false;
  }

  // Extract affected assets from node data
  private extractAffectedAssets(node: Node): string[] {
    const nodeData = node.data || {};
    const assets: string[] = [];
    
    if (nodeData.asset_type) {assets.push(nodeData.asset_type);}
    if (nodeData.affected_systems) {
      assets.push(...(Array.isArray(nodeData.affected_systems) 
        ? nodeData.affected_systems 
        : [nodeData.affected_systems]));
    }
    if (nodeData.target_systems) {
      assets.push(...(Array.isArray(nodeData.target_systems) 
        ? nodeData.target_systems 
        : [nodeData.target_systems]));
    }

    return [...new Set(assets)];
  }

  // Extract business processes from node data
  private extractBusinessProcesses(node: Node): string[] {
    const nodeData = node.data || {};
    const processes: string[] = [];
    
    if (nodeData.business_process) {
      processes.push(...(Array.isArray(nodeData.business_process) 
        ? nodeData.business_process 
        : [nodeData.business_process]));
    }
    if (nodeData.affected_processes) {
      processes.push(...(Array.isArray(nodeData.affected_processes) 
        ? nodeData.affected_processes 
        : [nodeData.affected_processes]));
    }

    return [...new Set(processes)];
  }

  // Calculate impact for all nodes
  calculateAllNodeImpacts(nodes: Node[], edges: Edge[]): void {
    nodes.forEach(node => {
      this.calculateNodeImpact(node, nodes, edges);
    });
  }

  // Get node impact
  getNodeImpact(nodeId: string): NodeImpact | null {
    return this.nodeImpacts.get(nodeId) || null;
  }

  // Get all node impacts
  getAllNodeImpacts(): NodeImpact[] {
    return Array.from(this.nodeImpacts.values());
  }

  // Get nodes by impact level
  getNodesByImpactLevel(level: ImpactLevel): NodeImpact[] {
    return Array.from(this.nodeImpacts.values())
      .filter(impact => impact.impact.level === level);
  }

  // Get critical path nodes
  getCriticalPathNodes(): NodeImpact[] {
    return Array.from(this.nodeImpacts.values())
      .filter(impact => impact.criticalPath);
  }

  // Get impact statistics
  getImpactStatistics(): {
    byLevel: { [level: string]: number };
    byRiskRating: { [rating: string]: number };
    averageImpact: number;
    criticalPathNodes: number;
    highestImpactNode: NodeImpact | null;
  } {
    const impacts = Array.from(this.nodeImpacts.values());
    
    const byLevel: { [level: string]: number } = {};
    const byRiskRating: { [rating: string]: number } = {};
    let totalImpact = 0;
    let criticalPathNodes = 0;
    let highestImpactNode: NodeImpact | null = null;

    impacts.forEach(impact => {
      byLevel[impact.impact.level] = (byLevel[impact.impact.level] || 0) + 1;
      byRiskRating[impact.riskRating] = (byRiskRating[impact.riskRating] || 0) + 1;
      
      totalImpact += impact.impact.overall;
      
      if (impact.criticalPath) {
        criticalPathNodes++;
      }

      if (!highestImpactNode || impact.impact.overall > highestImpactNode.impact.overall) {
        highestImpactNode = impact;
      }
    });

    return {
      byLevel,
      byRiskRating,
      averageImpact: impacts.length > 0 ? Math.round(totalImpact / impacts.length) : 0,
      criticalPathNodes,
      highestImpactNode,
    };
  }

  // Apply visual impact indicators to nodes
  applyImpactVisualization(nodes: Node[]): Node[] {
    return nodes.map(node => {
      const impact = this.nodeImpacts.get(node.id);
      if (!impact) {return node;}

      const levelConfig = IMPACT_LEVELS[impact.impact.level];
      
      return {
        ...node,
        style: {
          ...node.style,
          borderColor: levelConfig.color,
          borderWidth: impact.criticalPath ? 3 : 2,
          boxShadow: impact.riskRating === 'critical' 
            ? `0 0 12px ${levelConfig.color}60`
            : `0 0 6px ${levelConfig.color}40`,
        },
        data: {
          ...node.data,
          impactScore: impact.impact.overall,
          impactLevel: impact.impact.level,
          riskRating: impact.riskRating,
          criticalPath: impact.criticalPath,
        },
        className: [
          node.className || '',
          'impact-node',
          `impact-${impact.impact.level}`,
          `risk-${impact.riskRating}`,
          impact.criticalPath ? 'critical-path' : '',
        ].filter(Boolean).join(' '),
      };
    });
  }

  // Set custom asset criticality
  setAssetCriticality(assetType: string, criticality: number): void {
    this.assetCriticality.set(assetType.toLowerCase(), Math.max(0, Math.min(100, criticality)));
  }

  // Set custom business process criticality
  setBusinessProcessCriticality(processName: string, criticality: number): void {
    this.businessProcesses.set(processName.toLowerCase(), Math.max(0, Math.min(100, criticality)));
  }

  // Update node impact manually
  updateNodeImpact(nodeId: string, overallScore: number): boolean {
    const existing = this.nodeImpacts.get(nodeId);
    if (!existing) {return false;}

    existing.impact.overall = Math.max(0, Math.min(100, overallScore));
    existing.impact.level = this.getImpactLevel(existing.impact.overall);
    existing.riskRating = this.calculateRiskRating(existing.impact.overall);
    existing.impact.timestamp = Date.now();

    return true;
  }

  // Clear all impact data
  clear(): void {
    this.nodeImpacts.clear();
  }

  // Export impact data
  exportImpactData(): {
    impacts: NodeImpact[];
    assetCriticality: [string, number][];
    businessProcesses: [string, number][];
  } {
    return {
      impacts: Array.from(this.nodeImpacts.values()),
      assetCriticality: Array.from(this.assetCriticality.entries()),
      businessProcesses: Array.from(this.businessProcesses.entries()),
    };
  }

  // Import impact data
  importImpactData(data: {
    impacts?: NodeImpact[];
    assetCriticality?: [string, number][];
    businessProcesses?: [string, number][];
  }): void {
    if (data.impacts) {
      this.nodeImpacts.clear();
      data.impacts.forEach(impact => {
        this.nodeImpacts.set(impact.nodeId, impact);
      });
    }

    if (data.assetCriticality) {
      data.assetCriticality.forEach(([asset, criticality]) => {
        this.assetCriticality.set(asset, criticality);
      });
    }

    if (data.businessProcesses) {
      data.businessProcesses.forEach(([process, criticality]) => {
        this.businessProcesses.set(process, criticality);
      });
    }
  }
}

// Export singleton instance
export const impactScoringService = new ImpactScoringService();