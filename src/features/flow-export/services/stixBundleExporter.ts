import { Node, Edge } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

// STIX 2.1 Bundle types
interface STIXBundle {
  type: 'bundle';
  id: string;
  spec_version: '2.1';
  created: string;
  modified: string;
  objects: STIXObject[];
}

interface STIXObject {
  type: string;
  spec_version: '2.1';
  id: string;
  created: string;
  modified: string;
  [key: string]: any;
}

interface STIXRelationship extends STIXObject {
  type: 'relationship';
  relationship_type: string;
  source_ref: string;
  target_ref: string;
  description?: string;
}

export class STIXBundleExporter {
  private stixObjects: Map<string, STIXObject> = new Map();
  private relationships: STIXRelationship[] = [];
  private createdTime: string;
  private modifiedTime: string;

  constructor() {
    const now = new Date();
    this.createdTime = now.toISOString();
    this.modifiedTime = now.toISOString();
  }

  /**
   * Convert React Flow nodes and edges to a valid STIX 2.1 bundle
   */
  exportToSTIXBundle(nodes: Node[], edges: Edge[]): STIXBundle {
    this.stixObjects.clear();
    this.relationships = [];

    // Process nodes
    nodes.forEach(node => {
      const stixObject = this.convertNodeToSTIX(node);
      if (stixObject) {
        this.stixObjects.set(node.id, stixObject);
      }
    });

    // Process edges as relationships
    edges.forEach(edge => {
      const relationship = this.convertEdgeToSTIXRelationship(edge);
      if (relationship) {
        this.relationships.push(relationship);
      }
    });

    // Create the bundle
    const bundle: STIXBundle = {
      type: 'bundle',
      id: `bundle--${uuidv4()}`,
      spec_version: '2.1',
      created: this.createdTime,
      modified: this.modifiedTime,
      objects: [
        ...Array.from(this.stixObjects.values()),
        ...this.relationships
      ]
    };

    return bundle;
  }

  /**
   * Convert a React Flow node to a STIX Domain Object
   */
  private convertNodeToSTIX(node: Node): STIXObject | null {
    const nodeData = node.data;
    const nodeType = nodeData?.type || node.type;
    
    // Generate STIX ID based on node type
    const stixId = this.generateSTIXId(nodeType, node.id);

    switch (nodeType) {
      case 'action':
      case 'attack-action':
        return this.createAttackPattern(stixId, nodeData);
      
      case 'tool':
        return this.createTool(stixId, nodeData);
      
      case 'malware':
        return this.createMalware(stixId, nodeData);
      
      case 'infrastructure':
        return this.createInfrastructure(stixId, nodeData);
      
      case 'vulnerability':
        return this.createVulnerability(stixId, nodeData);
      
      case 'asset':
      case 'attack-asset':
        return this.createIdentity(stixId, nodeData);
      
      case 'url':
        return this.createIndicator(stixId, nodeData, 'url');
      
      case 'AND_operator':
      case 'OR_operator':
        return this.createGrouping(stixId, nodeData);
      
      default:
        console.warn(`Unknown node type: ${nodeType}`);
        return null;
    }
  }

  /**
   * Generate a proper STIX ID
   */
  private generateSTIXId(type: string, nodeId: string): string {
    const stixType = this.mapToSTIXType(type);
    return `${stixType}--${uuidv4()}`;
  }

  /**
   * Map node types to STIX object types
   */
  private mapToSTIXType(nodeType: string): string {
    const typeMap: Record<string, string> = {
      'action': 'attack-pattern',
      'attack-action': 'attack-pattern',
      'tool': 'tool',
      'malware': 'malware',
      'infrastructure': 'infrastructure',
      'vulnerability': 'vulnerability',
      'asset': 'identity',
      'attack-asset': 'identity',
      'url': 'indicator',
      'AND_operator': 'grouping',
      'OR_operator': 'grouping'
    };
    return typeMap[nodeType] || 'x-custom-object';
  }

  /**
   * Create a STIX Attack Pattern from an action node
   */
  private createAttackPattern(id: string, data: any): STIXObject {
    return {
      type: 'attack-pattern',
      spec_version: '2.1',
      id,
      created: this.createdTime,
      modified: this.modifiedTime,
      name: data.name || 'Unknown Technique',
      description: data.description,
      external_references: this.createMITREReferences(data),
      kill_chain_phases: this.createKillChainPhases(data),
      x_mitre_technique_id: data.technique_id,
      x_mitre_tactic: data.tactic_name,
      x_source_excerpt: data.source_excerpt,
      x_confidence: data.confidence
    };
  }

  /**
   * Create MITRE ATT&CK external references
   */
  private createMITREReferences(data: any): any[] {
    const refs = [];
    
    if (data.technique_id) {
      refs.push({
        source_name: 'mitre-attack',
        external_id: data.technique_id,
        url: `https://attack.mitre.org/techniques/${data.technique_id.replace('.', '/')}`
      });
    }
    
    if (data.tactic_id) {
      refs.push({
        source_name: 'mitre-attack', 
        external_id: data.tactic_id,
        url: `https://attack.mitre.org/tactics/${data.tactic_id}/`
      });
    }
    
    return refs;
  }

  /**
   * Create kill chain phases for MITRE ATT&CK
   */
  private createKillChainPhases(data: any): any[] {
    if (!data.tactic_name) {return [];}
    
    return [{
      kill_chain_name: 'mitre-attack',
      phase_name: data.tactic_name.toLowerCase().replace(/ /g, '-')
    }];
  }

  /**
   * Create a STIX Tool object
   */
  private createTool(id: string, data: any): STIXObject {
    return {
      type: 'tool',
      spec_version: '2.1',
      id,
      created: this.createdTime,
      modified: this.modifiedTime,
      name: data.name || 'Unknown Tool',
      description: data.description,
      tool_types: data.tool_types || ['unknown'],
      x_command_line: data.command_line,
      x_source_excerpt: data.source_excerpt,
      x_confidence: data.confidence
    };
  }

  /**
   * Create a STIX Malware object
   */
  private createMalware(id: string, data: any): STIXObject {
    return {
      type: 'malware',
      spec_version: '2.1',
      id,
      created: this.createdTime,
      modified: this.modifiedTime,
      name: data.name || 'Unknown Malware',
      description: data.description,
      malware_types: data.malware_types || ['unknown'],
      is_family: true, // STIX 2.1 requires this to be true for malware families
      x_command_line: data.command_line,
      x_source_excerpt: data.source_excerpt,
      x_confidence: data.confidence
    };
  }

  /**
   * Create a STIX Infrastructure object
   */
  private createInfrastructure(id: string, data: any): STIXObject {
    return {
      type: 'infrastructure',
      spec_version: '2.1',
      id,
      created: this.createdTime,
      modified: this.modifiedTime,
      name: data.name || 'Unknown Infrastructure',
      description: data.description,
      infrastructure_types: data.infrastructure_types || ['unknown'],
      x_source_excerpt: data.source_excerpt,
      x_confidence: data.confidence
    };
  }

  /**
   * Create a STIX Vulnerability object
   */
  private createVulnerability(id: string, data: any): STIXObject {
    const vuln: STIXObject = {
      type: 'vulnerability',
      spec_version: '2.1',
      id,
      created: this.createdTime,
      modified: this.modifiedTime,
      name: data.name || data.cve_id || 'Unknown Vulnerability',
      description: data.description
    };

    if (data.cve_id) {
      vuln.external_references = [{
        source_name: 'cve',
        external_id: data.cve_id,
        url: `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${data.cve_id}`
      }];
    }

    if (data.cvss_score) {
      vuln.x_cvss_score = data.cvss_score;
    }

    vuln.x_source_excerpt = data.source_excerpt;
    vuln.x_confidence = data.confidence;

    return vuln;
  }

  /**
   * Create a STIX Identity object (for assets)
   */
  private createIdentity(id: string, data: any): STIXObject {
    return {
      type: 'identity',
      spec_version: '2.1',
      id,
      created: this.createdTime,
      modified: this.modifiedTime,
      name: data.name || 'Unknown Asset',
      description: data.description,
      identity_class: this.mapAssetToIdentityClass(data.role || data.asset_type),
      sectors: this.inferSectors(data),
      x_asset_type: data.asset_type,
      x_role: data.role,
      x_impact: data.impact,
      x_source_excerpt: data.source_excerpt,
      x_confidence: data.confidence
    };
  }

  /**
   * Map asset types to STIX identity classes
   */
  private mapAssetToIdentityClass(assetType: string): string {
    const lowerType = (assetType || '').toLowerCase();
    if (lowerType.includes('system') || lowerType.includes('server')) {
      return 'system';
    } else if (lowerType.includes('user') || lowerType.includes('person')) {
      return 'individual';
    } else if (lowerType.includes('org') || lowerType.includes('company')) {
      return 'organization';
    }
    return 'system';
  }

  /**
   * Infer sectors from asset data
   */
  private inferSectors(data: any): string[] {
    const description = (data.description || '').toLowerCase();
    const sectors = [];
    
    if (description.includes('financial') || description.includes('bank')) {
      sectors.push('financial-services');
    }
    if (description.includes('health') || description.includes('medical')) {
      sectors.push('healthcare');
    }
    if (description.includes('government') || description.includes('federal')) {
      sectors.push('government');
    }
    if (description.includes('tech') || description.includes('software')) {
      sectors.push('technology');
    }
    
    return sectors.length > 0 ? sectors : ['general'];
  }

  /**
   * Create a STIX Indicator object
   */
  private createIndicator(id: string, data: any, indicatorType: string): STIXObject {
    return {
      type: 'indicator',
      spec_version: '2.1',
      id,
      created: this.createdTime,
      modified: this.modifiedTime,
      name: data.name || 'Unknown Indicator',
      description: data.description,
      indicator_types: [indicatorType],
      pattern: this.createSTIXPattern(data, indicatorType),
      pattern_type: 'stix',
      valid_from: this.createdTime,
      x_source_excerpt: data.source_excerpt,
      x_confidence: data.confidence
    };
  }

  /**
   * Create a STIX pattern for indicators
   */
  private createSTIXPattern(data: any, type: string): string {
    const value = data.value || data.name;
    switch (type) {
      case 'url':
        return `[url:value = '${value}']`;
      case 'ip-address':
        return `[ipv4-addr:value = '${value}']`;
      case 'domain':
        return `[domain-name:value = '${value}']`;
      default:
        return `[x-custom:value = '${value}']`;
    }
  }

  /**
   * Create a STIX Grouping object (for operators)
   */
  private createGrouping(id: string, data: any): STIXObject {
    return {
      type: 'grouping',
      spec_version: '2.1',
      id,
      created: this.createdTime,
      modified: this.modifiedTime,
      name: data.name || `${data.operator} Operator`,
      context: 'suspicious-activity',
      object_refs: [], // Will be populated with relationships
      x_operator_type: data.operator,
      x_source_excerpt: data.source_excerpt,
      x_confidence: data.confidence
    };
  }

  /**
   * Convert an edge to a STIX Relationship
   */
  private convertEdgeToSTIXRelationship(edge: Edge): STIXRelationship | null {
    const sourceSTIX = this.stixObjects.get(edge.source);
    const targetSTIX = this.stixObjects.get(edge.target);
    
    if (!sourceSTIX || !targetSTIX) {
      console.warn(`Missing STIX objects for edge: ${edge.source} -> ${edge.target}`);
      return null;
    }

    const relationshipType = this.mapEdgeLabelToSTIXRelationship(edge.label || 'related-to');

    return {
      type: 'relationship',
      spec_version: '2.1',
      id: `relationship--${uuidv4()}`,
      created: this.createdTime,
      modified: this.modifiedTime,
      relationship_type: relationshipType,
      source_ref: sourceSTIX.id,
      target_ref: targetSTIX.id,
      description: edge.label
    };
  }

  /**
   * Map edge labels to STIX relationship types
   */
  private mapEdgeLabelToSTIXRelationship(label: string): string {
    const lowerLabel = label.toLowerCase();
    
    // STIX 2.1 standard relationship types only
    if (lowerLabel.includes('uses')) {return 'uses';}
    if (lowerLabel.includes('targets')) {return 'targets';}
    if (lowerLabel.includes('indicates')) {return 'indicates';}
    if (lowerLabel.includes('mitigates')) {return 'mitigates';}
    if (lowerLabel.includes('delivers')) {return 'delivers';}
    if (lowerLabel.includes('hosts')) {return 'hosts';}
    if (lowerLabel.includes('downloads')) {return 'downloads';}
    if (lowerLabel.includes('drops')) {return 'drops';}
    if (lowerLabel.includes('exploits')) {return 'exploits';}
    if (lowerLabel.includes('variant')) {return 'variant-of';}
    if (lowerLabel.includes('impersonates')) {return 'impersonates';}
    if (lowerLabel.includes('communicates')) {return 'communicates-with';}
    if (lowerLabel.includes('controls')) {return 'controls';}
    if (lowerLabel.includes('owns')) {return 'owns';}
    if (lowerLabel.includes('authored')) {return 'authored-by';}
    if (lowerLabel.includes('located')) {return 'located-at';}
    if (lowerLabel.includes('consists')) {return 'consists-of';}
    if (lowerLabel.includes('uses')) {return 'uses';}
    
    // For attack flow sequences, use 'related-to' with description
    if (lowerLabel.includes('followed by') || lowerLabel.includes('leads to')) {return 'related-to';}
    if (lowerLabel.includes('enables')) {return 'related-to';}
    if (lowerLabel.includes('requires')) {return 'related-to';}
    if (lowerLabel.includes('affects')) {return 'related-to';}
    
    // Default
    return 'related-to';
  }
}