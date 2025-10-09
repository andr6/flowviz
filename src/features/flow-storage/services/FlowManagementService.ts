// Flow Management Service
// Handles versioning, comparison, merging, collaboration, and templates

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    technique?: string;
    description?: string;
    confidence?: number;
    sources?: string[];
    timestamp?: Date;
    [key: string]: any;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: {
    label?: string;
    relationship?: string;
    confidence?: number;
    [key: string]: any;
  };
}

export interface FlowMetadata {
  id: string;
  name: string;
  description?: string;
  author: string;
  created: Date;
  lastModified: Date;
  tags: string[];
  category: string;
  isTemplate: boolean;
  isPublic: boolean;
  permissions: {
    view: string[];
    edit: string[];
    comment: string[];
  };
  stats: {
    nodeCount: number;
    edgeCount: number;
    techniques: string[];
    confidence: number;
  };
}

export interface FlowVersion {
  id: string;
  flowId: string;
  version: string;
  author: string;
  created: Date;
  message: string;
  changes: FlowChange[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  metadata: FlowMetadata;
  parentVersion?: string;
  tags: string[];
}

export interface FlowChange {
  type: 'added' | 'modified' | 'deleted';
  target: 'node' | 'edge' | 'metadata';
  id: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
  author: string;
}

export interface FlowComment {
  id: string;
  flowId: string;
  versionId?: string;
  nodeId?: string;
  edgeId?: string;
  author: string;
  content: string;
  created: Date;
  edited?: Date;
  replies: FlowComment[];
  resolved: boolean;
  type: 'general' | 'suggestion' | 'question' | 'issue';
  priority: 'low' | 'medium' | 'high';
}

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'apt' | 'malware' | 'phishing' | 'ransomware' | 'insider-threat' | 'network-attack' | 'custom';
  author: string;
  created: Date;
  downloads: number;
  rating: number;
  reviews: number;
  tags: string[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables: TemplateVariable[];
  instructions: string;
  useCases: string[];
  isPublic: boolean;
  isVerified: boolean;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'number';
  description: string;
  required: boolean;
  defaultValue?: any;
  options?: string[];
  placeholder?: string;
}

export interface FlowComparison {
  flowA: FlowVersion;
  flowB: FlowVersion;
  differences: {
    nodesAdded: FlowNode[];
    nodesRemoved: FlowNode[];
    nodesModified: Array<{
      node: FlowNode;
      changes: FlowChange[];
    }>;
    edgesAdded: FlowEdge[];
    edgesRemoved: FlowEdge[];
    edgesModified: Array<{
      edge: FlowEdge;
      changes: FlowChange[];
    }>;
    metadataChanges: FlowChange[];
  };
  similarity: number;
  analysisDate: Date;
}

export interface FlowMergeConfig {
  strategy: 'union' | 'intersection' | 'priority' | 'manual';
  conflictResolution: 'prefer-a' | 'prefer-b' | 'manual' | 'smart';
  preserveMetadata: boolean;
  mergeComments: boolean;
  autoResolveConflicts: boolean;
}

export interface FlowMergeResult {
  mergedFlow: {
    nodes: FlowNode[];
    edges: FlowEdge[];
    metadata: FlowMetadata;
  };
  conflicts: Array<{
    type: 'node' | 'edge' | 'metadata';
    id: string;
    conflictType: 'duplicate' | 'modification' | 'relationship';
    optionA: any;
    optionB: any;
    suggestion?: any;
  }>;
  statistics: {
    totalElements: number;
    mergedElements: number;
    conflictsResolved: number;
    conflictsRemaining: number;
  };
}

export class FlowManagementService {
  private flows: Map<string, FlowVersion[]> = new Map();
  private templates: Map<string, FlowTemplate> = new Map();
  private comments: Map<string, FlowComment[]> = new Map();
  private collaborators: Map<string, string[]> = new Map();

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultTemplates();
  }

  // Flow Versioning
  async createVersion(
    flowId: string,
    nodes: FlowNode[],
    edges: FlowEdge[],
    metadata: FlowMetadata,
    message: string,
    author: string
  ): Promise<string> {
    const versions = this.flows.get(flowId) || [];
    const latestVersion = this.getLatestVersion(flowId);
    
    const changes = latestVersion 
      ? this.calculateChanges(latestVersion, { nodes, edges, metadata }, author)
      : [];

    const newVersion: FlowVersion = {
      id: `${flowId}-v${versions.length + 1}`,
      flowId,
      version: this.generateVersionNumber(versions.length),
      author,
      created: new Date(),
      message,
      changes,
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      metadata: { ...metadata, lastModified: new Date() },
      parentVersion: latestVersion?.id,
      tags: []
    };

    versions.push(newVersion);
    this.flows.set(flowId, versions);
    this.saveToStorage();

    return newVersion.id;
  }

  async getVersionHistory(flowId: string): Promise<FlowVersion[]> {
    return this.flows.get(flowId) || [];
  }

  async getVersion(flowId: string, versionId: string): Promise<FlowVersion | null> {
    const versions = this.flows.get(flowId) || [];
    return versions.find(v => v.id === versionId) || null;
  }

  async getLatestVersion(flowId: string): Promise<FlowVersion | null> {
    const versions = this.flows.get(flowId) || [];
    return versions.length > 0 ? versions[versions.length - 1] : null;
  }

  async deleteVersion(flowId: string, versionId: string): Promise<boolean> {
    const versions = this.flows.get(flowId) || [];
    const index = versions.findIndex(v => v.id === versionId);
    
    if (index === -1) return false;
    
    // Don't allow deletion of the only version
    if (versions.length === 1) return false;
    
    versions.splice(index, 1);
    this.flows.set(flowId, versions);
    this.saveToStorage();
    
    return true;
  }

  async tagVersion(flowId: string, versionId: string, tags: string[]): Promise<boolean> {
    const version = await this.getVersion(flowId, versionId);
    if (!version) return false;
    
    version.tags = [...new Set([...version.tags, ...tags])];
    this.saveToStorage();
    
    return true;
  }

  // Flow Comparison
  async compareFlows(
    flowAId: string,
    versionAId: string,
    flowBId: string,
    versionBId: string
  ): Promise<FlowComparison | null> {
    const versionA = await this.getVersion(flowAId, versionAId);
    const versionB = await this.getVersion(flowBId, versionBId);
    
    if (!versionA || !versionB) return null;

    const differences = this.calculateDifferences(versionA, versionB);
    const similarity = this.calculateSimilarity(versionA, versionB);

    return {
      flowA: versionA,
      flowB: versionB,
      differences,
      similarity,
      analysisDate: new Date()
    };
  }

  async compareVersions(flowId: string, versionIds: string[]): Promise<FlowComparison[]> {
    const comparisons: FlowComparison[] = [];
    
    for (let i = 0; i < versionIds.length - 1; i++) {
      for (let j = i + 1; j < versionIds.length; j++) {
        const comparison = await this.compareFlows(
          flowId, versionIds[i],
          flowId, versionIds[j]
        );
        if (comparison) {
          comparisons.push(comparison);
        }
      }
    }
    
    return comparisons;
  }

  // Flow Merging
  async mergeFlows(
    flows: Array<{ flowId: string; versionId: string }>,
    config: FlowMergeConfig,
    author: string
  ): Promise<FlowMergeResult> {
    const versions = await Promise.all(
      flows.map(f => this.getVersion(f.flowId, f.versionId))
    );
    
    const validVersions = versions.filter(v => v !== null) as FlowVersion[];
    
    if (validVersions.length < 2) {
      throw new Error('At least two valid flows are required for merging');
    }

    return this.performMerge(validVersions, config, author);
  }

  async saveMergedFlow(
    mergeResult: FlowMergeResult,
    flowId: string,
    message: string,
    author: string
  ): Promise<string> {
    return this.createVersion(
      flowId,
      mergeResult.mergedFlow.nodes,
      mergeResult.mergedFlow.edges,
      mergeResult.mergedFlow.metadata,
      message,
      author
    );
  }

  // Collaboration
  async addComment(
    flowId: string,
    comment: Omit<FlowComment, 'id' | 'created' | 'replies'>
  ): Promise<string> {
    const comments = this.comments.get(flowId) || [];
    const newComment: FlowComment = {
      ...comment,
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created: new Date(),
      replies: []
    };
    
    comments.push(newComment);
    this.comments.set(flowId, comments);
    this.saveToStorage();
    
    return newComment.id;
  }

  async replyToComment(
    flowId: string,
    commentId: string,
    reply: Omit<FlowComment, 'id' | 'created' | 'replies'>
  ): Promise<string> {
    const comments = this.comments.get(flowId) || [];
    const comment = this.findCommentById(comments, commentId);
    
    if (!comment) throw new Error('Comment not found');
    
    const newReply: FlowComment = {
      ...reply,
      id: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created: new Date(),
      replies: []
    };
    
    comment.replies.push(newReply);
    this.comments.set(flowId, comments);
    this.saveToStorage();
    
    return newReply.id;
  }

  async getComments(flowId: string): Promise<FlowComment[]> {
    return this.comments.get(flowId) || [];
  }

  async resolveComment(flowId: string, commentId: string): Promise<boolean> {
    const comments = this.comments.get(flowId) || [];
    const comment = this.findCommentById(comments, commentId);
    
    if (!comment) return false;
    
    comment.resolved = true;
    this.comments.set(flowId, comments);
    this.saveToStorage();
    
    return true;
  }

  async shareFlow(
    flowId: string,
    userIds: string[],
    permissions: Array<'view' | 'edit' | 'comment'>
  ): Promise<boolean> {
    const collaborators = this.collaborators.get(flowId) || [];
    const newCollaborators = [...new Set([...collaborators, ...userIds])];
    
    this.collaborators.set(flowId, newCollaborators);
    
    // Update flow permissions in latest version
    const latestVersion = await this.getLatestVersion(flowId);
    if (latestVersion) {
      permissions.forEach(permission => {
        latestVersion.metadata.permissions[permission] = [
          ...new Set([...latestVersion.metadata.permissions[permission], ...userIds])
        ];
      });
    }
    
    this.saveToStorage();
    return true;
  }

  // Templates
  async createTemplate(
    name: string,
    description: string,
    category: FlowTemplate['category'],
    nodes: FlowNode[],
    edges: FlowEdge[],
    variables: TemplateVariable[],
    author: string,
    instructions: string = '',
    useCases: string[] = [],
    tags: string[] = []
  ): Promise<string> {
    const template: FlowTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      category,
      author,
      created: new Date(),
      downloads: 0,
      rating: 0,
      reviews: 0,
      tags,
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      variables,
      instructions,
      useCases,
      isPublic: false,
      isVerified: false
    };
    
    this.templates.set(template.id, template);
    this.saveToStorage();
    
    return template.id;
  }

  async getTemplates(category?: FlowTemplate['category']): Promise<FlowTemplate[]> {
    const templates = Array.from(this.templates.values());
    return category ? templates.filter(t => t.category === category) : templates;
  }

  async getTemplate(templateId: string): Promise<FlowTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async instantiateTemplate(
    templateId: string,
    variables: Record<string, any>,
    author: string
  ): Promise<{ nodes: FlowNode[]; edges: FlowEdge[]; metadata: FlowMetadata }> {
    const template = await this.getTemplate(templateId);
    if (!template) throw new Error('Template not found');
    
    const nodes = this.substituteVariables(template.nodes, variables);
    const edges = this.substituteVariables(template.edges, variables);
    
    const metadata: FlowMetadata = {
      id: `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: this.substituteVariables(template.name, variables),
      description: this.substituteVariables(template.description, variables),
      author,
      created: new Date(),
      lastModified: new Date(),
      tags: [...template.tags],
      category: template.category,
      isTemplate: false,
      isPublic: false,
      permissions: {
        view: [author],
        edit: [author],
        comment: [author]
      },
      stats: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        techniques: nodes.map(n => n.data.technique).filter(Boolean),
        confidence: 0.8
      }
    };
    
    // Increment download count
    template.downloads++;
    this.saveToStorage();
    
    return { nodes, edges, metadata };
  }

  // Private helper methods
  private calculateChanges(
    oldVersion: FlowVersion,
    newFlow: { nodes: FlowNode[]; edges: FlowEdge[]; metadata: FlowMetadata },
    author: string
  ): FlowChange[] {
    const changes: FlowChange[] = [];
    const timestamp = new Date();
    
    // Compare nodes
    const oldNodes = new Map(oldVersion.nodes.map(n => [n.id, n]));
    const newNodes = new Map(newFlow.nodes.map(n => [n.id, n]));
    
    // Added nodes
    for (const [id, node] of newNodes) {
      if (!oldNodes.has(id)) {
        changes.push({
          type: 'added',
          target: 'node',
          id,
          newValue: node,
          timestamp,
          author
        });
      }
    }
    
    // Deleted nodes
    for (const [id] of oldNodes) {
      if (!newNodes.has(id)) {
        changes.push({
          type: 'deleted',
          target: 'node',
          id,
          oldValue: oldNodes.get(id),
          timestamp,
          author
        });
      }
    }
    
    // Modified nodes
    for (const [id, newNode] of newNodes) {
      const oldNode = oldNodes.get(id);
      if (oldNode && JSON.stringify(oldNode) !== JSON.stringify(newNode)) {
        changes.push({
          type: 'modified',
          target: 'node',
          id,
          oldValue: oldNode,
          newValue: newNode,
          timestamp,
          author
        });
      }
    }
    
    // Similar logic for edges and metadata...
    
    return changes;
  }

  private calculateDifferences(versionA: FlowVersion, versionB: FlowVersion) {
    const nodesA = new Map(versionA.nodes.map(n => [n.id, n]));
    const nodesB = new Map(versionB.nodes.map(n => [n.id, n]));
    
    const nodesAdded = versionB.nodes.filter(n => !nodesA.has(n.id));
    const nodesRemoved = versionA.nodes.filter(n => !nodesB.has(n.id));
    const nodesModified = versionB.nodes
      .filter(n => nodesA.has(n.id) && JSON.stringify(nodesA.get(n.id)) !== JSON.stringify(n))
      .map(node => ({
        node,
        changes: this.calculateFieldChanges(nodesA.get(node.id)!, node, 'system')
      }));
    
    // Similar logic for edges...
    
    return {
      nodesAdded,
      nodesRemoved,
      nodesModified,
      edgesAdded: [],
      edgesRemoved: [],
      edgesModified: [],
      metadataChanges: []
    };
  }

  private calculateSimilarity(versionA: FlowVersion, versionB: FlowVersion): number {
    const totalElementsA = versionA.nodes.length + versionA.edges.length;
    const totalElementsB = versionB.nodes.length + versionB.edges.length;
    
    if (totalElementsA === 0 && totalElementsB === 0) return 1.0;
    
    const commonNodes = versionA.nodes.filter(nodeA => 
      versionB.nodes.some(nodeB => nodeA.id === nodeB.id)
    ).length;
    
    const commonEdges = versionA.edges.filter(edgeA => 
      versionB.edges.some(edgeB => edgeA.id === edgeB.id)
    ).length;
    
    const commonElements = commonNodes + commonEdges;
    const maxElements = Math.max(totalElementsA, totalElementsB);
    
    return maxElements > 0 ? commonElements / maxElements : 0;
  }

  private performMerge(
    versions: FlowVersion[],
    config: FlowMergeConfig,
    author: string
  ): FlowMergeResult {
    // Simplified merge implementation
    const allNodes = new Map<string, FlowNode>();
    const allEdges = new Map<string, FlowEdge>();
    const conflicts: FlowMergeResult['conflicts'] = [];
    
    versions.forEach(version => {
      version.nodes.forEach(node => {
        if (allNodes.has(node.id)) {
          // Conflict detected
          conflicts.push({
            type: 'node',
            id: node.id,
            conflictType: 'duplicate',
            optionA: allNodes.get(node.id),
            optionB: node
          });
        } else {
          allNodes.set(node.id, node);
        }
      });
      
      version.edges.forEach(edge => {
        if (allEdges.has(edge.id)) {
          conflicts.push({
            type: 'edge',
            id: edge.id,
            conflictType: 'duplicate',
            optionA: allEdges.get(edge.id),
            optionB: edge
          });
        } else {
          allEdges.set(edge.id, edge);
        }
      });
    });
    
    const mergedMetadata: FlowMetadata = {
      id: `merged-${Date.now()}`,
      name: `Merged Flow - ${new Date().toISOString()}`,
      description: 'Merged from multiple flows',
      author,
      created: new Date(),
      lastModified: new Date(),
      tags: [],
      category: 'custom',
      isTemplate: false,
      isPublic: false,
      permissions: {
        view: [author],
        edit: [author],
        comment: [author]
      },
      stats: {
        nodeCount: allNodes.size,
        edgeCount: allEdges.size,
        techniques: [],
        confidence: 0.8
      }
    };
    
    return {
      mergedFlow: {
        nodes: Array.from(allNodes.values()),
        edges: Array.from(allEdges.values()),
        metadata: mergedMetadata
      },
      conflicts,
      statistics: {
        totalElements: allNodes.size + allEdges.size,
        mergedElements: allNodes.size + allEdges.size - conflicts.length,
        conflictsResolved: 0,
        conflictsRemaining: conflicts.length
      }
    };
  }

  private calculateFieldChanges(
    oldItem: any,
    newItem: any,
    author: string
  ): FlowChange[] {
    const changes: FlowChange[] = [];
    const timestamp = new Date();
    
    // Simple field-by-field comparison
    for (const key in newItem) {
      if (oldItem[key] !== newItem[key]) {
        changes.push({
          type: 'modified',
          target: 'node',
          id: newItem.id,
          field: key,
          oldValue: oldItem[key],
          newValue: newItem[key],
          timestamp,
          author
        });
      }
    }
    
    return changes;
  }

  private findCommentById(comments: FlowComment[], id: string): FlowComment | null {
    for (const comment of comments) {
      if (comment.id === id) return comment;
      const found = this.findCommentById(comment.replies, id);
      if (found) return found;
    }
    return null;
  }

  private substituteVariables(template: any, variables: Record<string, any>): any {
    if (typeof template === 'string') {
      return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return variables[varName] || match;
      });
    }
    
    if (Array.isArray(template)) {
      return template.map(item => this.substituteVariables(item, variables));
    }
    
    if (typeof template === 'object' && template !== null) {
      const result: any = {};
      for (const key in template) {
        result[key] = this.substituteVariables(template[key], variables);
      }
      return result;
    }
    
    return template;
  }

  private generateVersionNumber(count: number): string {
    const major = Math.floor(count / 100) + 1;
    const minor = Math.floor((count % 100) / 10);
    const patch = count % 10;
    return `${major}.${minor}.${patch}`;
  }

  private initializeDefaultTemplates() {
    // Add some default templates
    const defaultTemplates: Partial<FlowTemplate>[] = [
      {
        name: 'APT Campaign Analysis',
        category: 'apt',
        description: 'Template for analyzing Advanced Persistent Threat campaigns',
        tags: ['apt', 'campaign', 'analysis'],
        useCases: ['Nation-state attacks', 'Long-term infiltration', 'Data exfiltration']
      },
      {
        name: 'Ransomware Incident Response',
        category: 'ransomware',
        description: 'Template for ransomware incident response and analysis',
        tags: ['ransomware', 'incident', 'response'],
        useCases: ['Ransomware attacks', 'Encryption malware', 'Recovery planning']
      },
      {
        name: 'Phishing Campaign Investigation',
        category: 'phishing',
        description: 'Template for investigating phishing campaigns and email threats',
        tags: ['phishing', 'email', 'social-engineering'],
        useCases: ['Email phishing', 'Credential harvesting', 'Social engineering']
      }
    ];
    
    // Initialize with minimal data for now
    defaultTemplates.forEach((template, index) => {
      if (template.name) {
        this.templates.set(`default-${index}`, {
          id: `default-${index}`,
          name: template.name,
          description: template.description || '',
          category: template.category || 'custom',
          author: 'system',
          created: new Date(),
          downloads: 0,
          rating: 4.5,
          reviews: 0,
          tags: template.tags || [],
          nodes: [],
          edges: [],
          variables: [],
          instructions: '',
          useCases: template.useCases || [],
          isPublic: true,
          isVerified: true
        });
      }
    });
  }

  private loadFromStorage() {
    try {
      const flowsData = localStorage.getItem('flow_versions');
      if (flowsData) {
        const parsed = JSON.parse(flowsData);
        this.flows = new Map(Object.entries(parsed));
      }
      
      const templatesData = localStorage.getItem('flow_templates');
      if (templatesData) {
        const parsed = JSON.parse(templatesData);
        this.templates = new Map(Object.entries(parsed));
      }
      
      const commentsData = localStorage.getItem('flow_comments');
      if (commentsData) {
        const parsed = JSON.parse(commentsData);
        this.comments = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.error('Failed to load flow management data:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('flow_versions', JSON.stringify(Object.fromEntries(this.flows)));
      localStorage.setItem('flow_templates', JSON.stringify(Object.fromEntries(this.templates)));
      localStorage.setItem('flow_comments', JSON.stringify(Object.fromEntries(this.comments)));
    } catch (error) {
      console.error('Failed to save flow management data:', error);
    }
  }
}

// Global instance
export const flowManagement = new FlowManagementService();