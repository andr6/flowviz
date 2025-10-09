import { Node, Edge } from 'reactflow';

export type ExportFormat = 'pdf' | 'docx' | 'pptx' | 'html' | 'json' | 'csv' | 'xml' | 'stix' | 'afb' | 'png' | 'svg';
export type TemplateType = 'executive' | 'technical' | 'incident' | 'briefing' | 'full' | 'summary' | 'custom';

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  format: ExportFormat;
  version: string;
  author: string;
  createdAt: number;
  updatedAt: number;
  isBuiltIn: boolean;
  isActive: boolean;
  config: TemplateConfig;
  sections: TemplateSection[];
  styling: TemplateStyling;
  metadata: TemplateMetadata;
}

export interface TemplateConfig {
  includeTimestamp: boolean;
  includeLogo: boolean;
  includeSignature: boolean;
  pageOrientation: 'portrait' | 'landscape';
  pageSize: 'A4' | 'letter' | 'legal' | 'tabloid' | 'A3' | 'A5';
  margins: { top: number; right: number; bottom: number; left: number };
  fontSize: { base: number; heading: number; caption: number };
  language: string;
  timezone: string;
  dateFormat: string;
  numberFormat: string;
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  customFields: { [key: string]: any };
}

export interface TemplateSection {
  id: string;
  name: string;
  type: SectionType;
  order: number;
  enabled: boolean;
  required: boolean;
  content: SectionContent;
  styling?: SectionStyling;
  conditions?: SectionCondition[];
}

export type SectionType = 
  | 'cover' 
  | 'toc' 
  | 'executive_summary' 
  | 'timeline' 
  | 'attack_flow' 
  | 'tactics_techniques'
  | 'indicators'
  | 'recommendations'
  | 'appendix'
  | 'references'
  | 'custom_text'
  | 'custom_chart'
  | 'custom_table';

export interface SectionContent {
  title?: string;
  subtitle?: string;
  template?: string; // Template string with variables
  includeGraphs: boolean;
  includeCharts: boolean;
  includeTables: boolean;
  includeImages: boolean;
  chartTypes?: ChartType[];
  tableColumns?: string[];
  customContent?: any;
}

export interface SectionStyling {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  padding?: number;
  margin?: number;
  pageBreakBefore?: boolean;
  pageBreakAfter?: boolean;
}

export interface SectionCondition {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'exists' | 'not_exists';
  value: any;
}

export interface TemplateStyling {
  theme: 'light' | 'dark' | 'professional' | 'corporate' | 'minimal';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  headerStyle: HeaderStyle;
  footerStyle: FooterStyle;
  graphStyle: GraphStyle;
  tableStyle: TableStyle;
}

export interface HeaderStyle {
  enabled: boolean;
  height: number;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  includeDate: boolean;
  includePageNumber: boolean;
  customText?: string;
}

export interface FooterStyle {
  enabled: boolean;
  height: number;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  includePageNumber: boolean;
  includeDisclaimer: boolean;
  customText?: string;
}

export interface GraphStyle {
  backgroundColor: string;
  nodeColors: { [key: string]: string };
  edgeColors: { [key: string]: string };
  fontSize: number;
  showLabels: boolean;
  showLegend: boolean;
  layout: 'hierarchical' | 'force' | 'circular' | 'grid';
}

export interface TableStyle {
  headerBackgroundColor: string;
  headerTextColor: string;
  rowBackgroundColor: string;
  alternateRowColor: string;
  borderColor: string;
  fontSize: number;
  showBorders: boolean;
  showGridLines: boolean;
}

export interface TemplateMetadata {
  tags: string[];
  category: string;
  industry?: string;
  framework?: string;
  compliance?: string[];
  audience: 'executive' | 'technical' | 'analyst' | 'general';
  estimatedPages?: number;
  generationTime?: number;
  fileSize?: number;
}

export type ChartType = 'bar' | 'pie' | 'line' | 'timeline' | 'heatmap' | 'sankey' | 'treemap';

export interface ExportData {
  nodes: Node[];
  edges: Edge[];
  metadata: {
    title?: string;
    description?: string;
    author?: string;
    organization?: string;
    analysisDate: number;
    generatedAt: number;
    version: string;
    source?: string;
    confidence?: number;
    tags?: string[];
    [key: string]: any;
  };
  statistics: {
    nodeCount: number;
    edgeCount: number;
    tacticCount: number;
    techniqueCount: number;
    uniqueActors: string[];
    timeSpan?: { start: number; end: number };
    criticalityBreakdown: { [level: string]: number };
  };
  insights?: {
    keyFindings: string[];
    recommendations: string[];
    riskAssessment: string;
    impactAnalysis: string;
    mitigationStrategies: string[];
  };
}

// Built-in templates
const BUILTIN_TEMPLATES: ExportTemplate[] = [
  {
    id: 'executive-summary-pdf',
    name: 'Executive Summary Report',
    description: 'High-level overview suitable for executives and decision makers',
    type: 'executive',
    format: 'pdf',
    version: '1.0',
    author: 'ThreatFlow',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltIn: true,
    isActive: true,
    config: {
      includeTimestamp: true,
      includeLogo: true,
      includeSignature: false,
      pageOrientation: 'portrait',
      pageSize: 'A4',
      margins: { top: 25, right: 25, bottom: 25, left: 25 },
      fontSize: { base: 11, heading: 16, caption: 9 },
      language: 'en-US',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      numberFormat: 'en-US',
      confidentialityLevel: 'internal',
      customFields: {},
    },
    sections: [
      {
        id: 'cover',
        name: 'Cover Page',
        type: 'cover',
        order: 1,
        enabled: true,
        required: true,
        content: {
          title: 'Threat Intelligence Analysis',
          subtitle: 'Executive Summary Report',
          includeGraphs: false,
          includeCharts: false,
          includeTables: false,
          includeImages: true,
        },
      },
      {
        id: 'executive_summary',
        name: 'Executive Summary',
        type: 'executive_summary',
        order: 2,
        enabled: true,
        required: true,
        content: {
          title: 'Executive Summary',
          template: `This analysis identified {{nodeCount}} techniques across {{tacticCount}} tactics, affecting {{affectedSystems}} systems. 
          Key findings include {{keyFindings}}. Immediate action is recommended for {{criticalCount}} critical items.`,
          includeGraphs: false,
          includeCharts: true,
          includeTables: false,
          includeImages: false,
          chartTypes: ['pie', 'bar'],
        },
      },
      {
        id: 'attack_flow',
        name: 'Attack Flow Overview',
        type: 'attack_flow',
        order: 3,
        enabled: true,
        required: false,
        content: {
          title: 'Attack Flow Overview',
          includeGraphs: true,
          includeCharts: false,
          includeTables: false,
          includeImages: true,
        },
      },
      {
        id: 'recommendations',
        name: 'Recommendations',
        type: 'recommendations',
        order: 4,
        enabled: true,
        required: true,
        content: {
          title: 'Recommendations',
          template: `Based on this analysis, we recommend: {{recommendations}}`,
          includeGraphs: false,
          includeCharts: false,
          includeTables: true,
          includeImages: false,
          tableColumns: ['Priority', 'Recommendation', 'Timeline', 'Owner'],
        },
      },
    ],
    styling: {
      theme: 'professional',
      primaryColor: '#1976d2',
      secondaryColor: '#dc004e',
      accentColor: '#ffc107',
      backgroundColor: '#ffffff',
      textColor: '#333333',
      fontFamily: 'Arial, sans-serif',
      headerStyle: {
        enabled: true,
        height: 60,
        backgroundColor: '#1976d2',
        textColor: '#ffffff',
        fontSize: 12,
        includeDate: true,
        includePageNumber: true,
      },
      footerStyle: {
        enabled: true,
        height: 40,
        backgroundColor: '#f5f5f5',
        textColor: '#666666',
        fontSize: 10,
        includePageNumber: true,
        includeDisclaimer: true,
        customText: 'Confidential - Internal Use Only',
      },
      graphStyle: {
        backgroundColor: '#ffffff',
        nodeColors: {
          'initial-access': '#ff6b6b',
          'execution': '#4ecdc4',
          'persistence': '#45b7d1',
          'privilege-escalation': '#f9ca24',
          'defense-evasion': '#6c5ce7',
        },
        edgeColors: { default: '#95a5a6' },
        fontSize: 10,
        showLabels: true,
        showLegend: true,
        layout: 'hierarchical',
      },
      tableStyle: {
        headerBackgroundColor: '#1976d2',
        headerTextColor: '#ffffff',
        rowBackgroundColor: '#ffffff',
        alternateRowColor: '#f8f9fa',
        borderColor: '#dee2e6',
        fontSize: 10,
        showBorders: true,
        showGridLines: true,
      },
    },
    metadata: {
      tags: ['executive', 'summary', 'high-level'],
      category: 'report',
      audience: 'executive',
      estimatedPages: 5,
    },
  },
  {
    id: 'technical-detailed-pdf',
    name: 'Technical Analysis Report',
    description: 'Comprehensive technical analysis for security analysts',
    type: 'technical',
    format: 'pdf',
    version: '1.0',
    author: 'ThreatFlow',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltIn: true,
    isActive: true,
    config: {
      includeTimestamp: true,
      includeLogo: true,
      includeSignature: true,
      pageOrientation: 'portrait',
      pageSize: 'A4',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      fontSize: { base: 10, heading: 14, caption: 8 },
      language: 'en-US',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
      numberFormat: 'en-US',
      confidentialityLevel: 'confidential',
      customFields: {},
    },
    sections: [
      {
        id: 'cover',
        name: 'Cover Page',
        type: 'cover',
        order: 1,
        enabled: true,
        required: true,
        content: {
          title: 'Technical Threat Analysis',
          subtitle: 'Detailed Technical Report',
          includeGraphs: false,
          includeCharts: false,
          includeTables: false,
          includeImages: true,
        },
      },
      {
        id: 'toc',
        name: 'Table of Contents',
        type: 'toc',
        order: 2,
        enabled: true,
        required: false,
        content: {
          title: 'Table of Contents',
          includeGraphs: false,
          includeCharts: false,
          includeTables: false,
          includeImages: false,
        },
      },
      {
        id: 'timeline',
        name: 'Attack Timeline',
        type: 'timeline',
        order: 3,
        enabled: true,
        required: false,
        content: {
          title: 'Attack Timeline',
          includeGraphs: false,
          includeCharts: true,
          includeTables: true,
          includeImages: false,
          chartTypes: ['timeline', 'line'],
          tableColumns: ['Timestamp', 'Tactic', 'Technique', 'Description', 'Indicators'],
        },
      },
      {
        id: 'attack_flow',
        name: 'Attack Flow Analysis',
        type: 'attack_flow',
        order: 4,
        enabled: true,
        required: true,
        content: {
          title: 'Attack Flow Analysis',
          includeGraphs: true,
          includeCharts: false,
          includeTables: false,
          includeImages: true,
        },
      },
      {
        id: 'tactics_techniques',
        name: 'Tactics & Techniques',
        type: 'tactics_techniques',
        order: 5,
        enabled: true,
        required: true,
        content: {
          title: 'MITRE ATT&CK Tactics and Techniques',
          includeGraphs: false,
          includeCharts: true,
          includeTables: true,
          includeImages: false,
          chartTypes: ['bar', 'heatmap'],
          tableColumns: ['Tactic', 'Technique', 'ID', 'Confidence', 'Evidence', 'Mitigation'],
        },
      },
      {
        id: 'indicators',
        name: 'Indicators of Compromise',
        type: 'indicators',
        order: 6,
        enabled: true,
        required: true,
        content: {
          title: 'Indicators of Compromise',
          includeGraphs: false,
          includeCharts: false,
          includeTables: true,
          includeImages: false,
          tableColumns: ['Type', 'Value', 'Confidence', 'Source', 'First Seen', 'Context'],
        },
      },
      {
        id: 'recommendations',
        name: 'Technical Recommendations',
        type: 'recommendations',
        order: 7,
        enabled: true,
        required: true,
        content: {
          title: 'Technical Recommendations',
          template: `Technical recommendations: {{technicalRecommendations}}`,
          includeGraphs: false,
          includeCharts: false,
          includeTables: true,
          includeImages: false,
          tableColumns: ['Priority', 'Recommendation', 'Technical Details', 'Implementation', 'Validation'],
        },
      },
      {
        id: 'appendix',
        name: 'Appendix',
        type: 'appendix',
        order: 8,
        enabled: true,
        required: false,
        content: {
          title: 'Appendix',
          includeGraphs: false,
          includeCharts: false,
          includeTables: true,
          includeImages: false,
        },
      },
    ],
    styling: {
      theme: 'professional',
      primaryColor: '#2c3e50',
      secondaryColor: '#e74c3c',
      accentColor: '#3498db',
      backgroundColor: '#ffffff',
      textColor: '#2c3e50',
      fontFamily: 'Calibri, sans-serif',
      headerStyle: {
        enabled: true,
        height: 50,
        backgroundColor: '#2c3e50',
        textColor: '#ffffff',
        fontSize: 11,
        includeDate: true,
        includePageNumber: true,
      },
      footerStyle: {
        enabled: true,
        height: 35,
        backgroundColor: '#ecf0f1',
        textColor: '#7f8c8d',
        fontSize: 9,
        includePageNumber: true,
        includeDisclaimer: true,
        customText: 'CONFIDENTIAL - Technical Analysis Report',
      },
      graphStyle: {
        backgroundColor: '#ffffff',
        nodeColors: {
          'reconnaissance': '#9b59b6',
          'initial-access': '#e74c3c',
          'execution': '#f39c12',
          'persistence': '#27ae60',
          'privilege-escalation': '#3498db',
          'defense-evasion': '#e67e22',
        },
        edgeColors: { default: '#7f8c8d' },
        fontSize: 9,
        showLabels: true,
        showLegend: true,
        layout: 'force',
      },
      tableStyle: {
        headerBackgroundColor: '#2c3e50',
        headerTextColor: '#ffffff',
        rowBackgroundColor: '#ffffff',
        alternateRowColor: '#f8f9fa',
        borderColor: '#bdc3c7',
        fontSize: 9,
        showBorders: true,
        showGridLines: true,
      },
    },
    metadata: {
      tags: ['technical', 'detailed', 'analysis', 'comprehensive'],
      category: 'technical-report',
      audience: 'technical',
      estimatedPages: 15,
    },
  },
];

class ExportTemplateService {
  private templates: Map<string, ExportTemplate> = new Map();
  private activeTemplate: string | null = null;

  constructor() {
    // Initialize with built-in templates
    BUILTIN_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  // Get all templates
  getAllTemplates(): ExportTemplate[] {
    return Array.from(this.templates.values()).sort((a, b) => {
      if (a.isBuiltIn && !b.isBuiltIn) {return -1;}
      if (!a.isBuiltIn && b.isBuiltIn) {return 1;}
      return a.name.localeCompare(b.name);
    });
  }

  // Get templates by type
  getTemplatesByType(type: TemplateType): ExportTemplate[] {
    return this.getAllTemplates().filter(t => t.type === type);
  }

  // Get templates by format
  getTemplatesByFormat(format: ExportFormat): ExportTemplate[] {
    return this.getAllTemplates().filter(t => t.format === format);
  }

  // Get active templates
  getActiveTemplates(): ExportTemplate[] {
    return this.getAllTemplates().filter(t => t.isActive);
  }

  // Get template by ID
  getTemplate(id: string): ExportTemplate | null {
    return this.templates.get(id) || null;
  }

  // Create new template
  createTemplate(template: Omit<ExportTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version'>): ExportTemplate {
    const newTemplate: ExportTemplate = {
      ...template,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: '1.0',
      isBuiltIn: false,
    };

    this.templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  // Update template
  updateTemplate(id: string, updates: Partial<ExportTemplate>): ExportTemplate | null {
    const template = this.templates.get(id);
    if (!template) {return null;}

    if (template.isBuiltIn) {
      throw new Error('Cannot modify built-in templates');
    }

    const updatedTemplate: ExportTemplate = {
      ...template,
      ...updates,
      id: template.id, // Preserve ID
      updatedAt: Date.now(),
    };

    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  // Clone template
  cloneTemplate(id: string, name?: string): ExportTemplate | null {
    const template = this.templates.get(id);
    if (!template) {return null;}

    const clonedTemplate: ExportTemplate = {
      ...JSON.parse(JSON.stringify(template)), // Deep clone
      id: `clone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name || `${template.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isBuiltIn: false,
    };

    this.templates.set(clonedTemplate.id, clonedTemplate);
    return clonedTemplate;
  }

  // Delete template
  deleteTemplate(id: string): boolean {
    const template = this.templates.get(id);
    if (!template) {return false;}

    if (template.isBuiltIn) {
      throw new Error('Cannot delete built-in templates');
    }

    return this.templates.delete(id);
  }

  // Set active template
  setActiveTemplate(id: string): boolean {
    const template = this.templates.get(id);
    if (!template) {return false;}

    this.activeTemplate = id;
    return true;
  }

  // Get active template
  getActiveTemplate(): ExportTemplate | null {
    return this.activeTemplate ? this.templates.get(this.activeTemplate) || null : null;
  }

  // Render template with data
  renderTemplate(templateId: string, data: ExportData, customVariables?: { [key: string]: any }): RenderedTemplate {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const variables = this.extractVariables(data, customVariables);
    const renderedSections = template.sections
      .filter(section => section.enabled)
      .filter(section => this.evaluateConditions(section.conditions || [], variables))
      .sort((a, b) => a.order - b.order)
      .map(section => this.renderSection(section, variables, data));

    return {
      template,
      sections: renderedSections,
      variables,
      metadata: {
        generatedAt: Date.now(),
        templateVersion: template.version,
        dataHash: this.hashData(data),
      },
    };
  }

  // Extract variables from data
  private extractVariables(data: ExportData, custom?: { [key: string]: any }): { [key: string]: any } {
    const variables = {
      // Basic counts
      nodeCount: data.nodes.length,
      edgeCount: data.edges.length,
      tacticCount: data.statistics.tacticCount,
      techniqueCount: data.statistics.techniqueCount,
      
      // Metadata
      title: data.metadata.title || 'Threat Analysis',
      description: data.metadata.description || '',
      author: data.metadata.author || '',
      organization: data.metadata.organization || '',
      analysisDate: new Date(data.metadata.analysisDate).toLocaleDateString(),
      generatedAt: new Date().toLocaleDateString(),
      
      // Statistics
      uniqueActors: data.statistics.uniqueActors.join(', '),
      criticalCount: data.statistics.criticalityBreakdown.critical || 0,
      highCount: data.statistics.criticalityBreakdown.high || 0,
      mediumCount: data.statistics.criticalityBreakdown.medium || 0,
      lowCount: data.statistics.criticalityBreakdown.low || 0,
      
      // Insights
      keyFindings: data.insights?.keyFindings || [],
      recommendations: data.insights?.recommendations || [],
      riskAssessment: data.insights?.riskAssessment || '',
      impactAnalysis: data.insights?.impactAnalysis || '',
      mitigationStrategies: data.insights?.mitigationStrategies || [],
      
      // Time span
      timeSpan: data.statistics.timeSpan ? 
        `${new Date(data.statistics.timeSpan.start).toLocaleDateString()} - ${new Date(data.statistics.timeSpan.end).toLocaleDateString()}` : 
        'Not specified',
      
      // Custom variables
      ...custom,
    };

    return variables;
  }

  // Evaluate section conditions
  private evaluateConditions(conditions: SectionCondition[], variables: { [key: string]: any }): boolean {
    if (conditions.length === 0) {return true;}

    return conditions.every(condition => {
      const value = variables[condition.field];
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'contains':
          return typeof value === 'string' && value.includes(condition.value);
        case 'gt':
          return typeof value === 'number' && value > condition.value;
        case 'lt':
          return typeof value === 'number' && value < condition.value;
        case 'gte':
          return typeof value === 'number' && value >= condition.value;
        case 'lte':
          return typeof value === 'number' && value <= condition.value;
        case 'exists':
          return value !== undefined && value !== null;
        case 'not_exists':
          return value === undefined || value === null;
        default:
          return true;
      }
    });
  }

  // Render section with variables
  private renderSection(section: TemplateSection, variables: { [key: string]: any }, data: ExportData): RenderedSection {
    let content = section.content.template || '';
    
    // Replace template variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      const replacement = Array.isArray(value) ? value.join(', ') : String(value);
      content = content.replace(regex, replacement);
    });

    return {
      section,
      renderedContent: content,
      charts: this.generateCharts(section, data),
      tables: this.generateTables(section, data),
      graphs: section.content.includeGraphs ? [data] : [],
    };
  }

  // Generate charts for section
  private generateCharts(section: TemplateSection, data: ExportData): ChartData[] {
    if (!section.content.includeCharts || !section.content.chartTypes) {return [];}

    const charts: ChartData[] = [];

    section.content.chartTypes.forEach(chartType => {
      switch (chartType) {
        case 'pie':
          charts.push({
            type: 'pie',
            title: 'Techniques by Tactic',
            data: this.generateTacticDistributionData(data),
          });
          break;
        case 'bar':
          charts.push({
            type: 'bar',
            title: 'Criticality Breakdown',
            data: this.generateCriticalityData(data),
          });
          break;
        case 'timeline':
          if (data.statistics.timeSpan) {
            charts.push({
              type: 'timeline',
              title: 'Attack Timeline',
              data: this.generateTimelineData(data),
            });
          }
          break;
      }
    });

    return charts;
  }

  // Generate tables for section
  private generateTables(section: TemplateSection, data: ExportData): TableData[] {
    if (!section.content.includeTables || !section.content.tableColumns) {return [];}

    const tables: TableData[] = [];

    switch (section.type) {
      case 'tactics_techniques':
        tables.push({
          title: 'Tactics and Techniques',
          headers: section.content.tableColumns,
          rows: this.generateTacticsTable(data, section.content.tableColumns),
        });
        break;
      case 'indicators':
        tables.push({
          title: 'Indicators of Compromise',
          headers: section.content.tableColumns,
          rows: this.generateIndicatorsTable(data, section.content.tableColumns),
        });
        break;
      case 'recommendations':
        tables.push({
          title: 'Recommendations',
          headers: section.content.tableColumns,
          rows: this.generateRecommendationsTable(data, section.content.tableColumns),
        });
        break;
    }

    return tables;
  }

  // Generate data methods (simplified implementations)
  private generateTacticDistributionData(data: ExportData): any[] {
    const tacticCounts: { [key: string]: number } = {};
    data.nodes.forEach(node => {
      const tactic = node.data?.tactic || 'Unknown';
      tacticCounts[tactic] = (tacticCounts[tactic] || 0) + 1;
    });

    return Object.entries(tacticCounts).map(([name, value]) => ({ name, value }));
  }

  private generateCriticalityData(data: ExportData): any[] {
    return Object.entries(data.statistics.criticalityBreakdown).map(([name, value]) => ({ name, value }));
  }

  private generateTimelineData(data: ExportData): any[] {
    return data.nodes
      .filter(node => node.data?.timestamp)
      .map(node => ({
        timestamp: new Date(node.data.timestamp),
        technique: node.data?.technique_id || node.id,
        tactic: node.data?.tactic || 'Unknown',
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private generateTacticsTable(data: ExportData, columns: string[]): any[][] {
    return data.nodes.map(node => 
      columns.map(col => {
        switch (col.toLowerCase()) {
          case 'tactic': return node.data?.tactic || 'Unknown';
          case 'technique': return node.data?.technique || node.data?.name || 'Unknown';
          case 'id': return node.data?.technique_id || node.id;
          case 'confidence': return node.data?.confidence || 'Medium';
          case 'evidence': return node.data?.evidence || 'Detected';
          case 'mitigation': return node.data?.mitigation || 'See recommendations';
          default: return node.data?.[col] || '';
        }
      })
    );
  }

  private generateIndicatorsTable(data: ExportData, columns: string[]): any[][] {
    // Extract indicators from node data
    const indicators: any[][] = [];
    data.nodes.forEach(node => {
      if (node.data?.indicators) {
        node.data.indicators.forEach((indicator: any) => {
          indicators.push(columns.map(col => indicator[col.toLowerCase()] || ''));
        });
      }
    });
    return indicators;
  }

  private generateRecommendationsTable(data: ExportData, columns: string[]): any[][] {
    const recommendations = data.insights?.recommendations || [];
    return recommendations.map((rec, index) => 
      columns.map(col => {
        switch (col.toLowerCase()) {
          case 'priority': return index < 3 ? 'High' : index < 6 ? 'Medium' : 'Low';
          case 'recommendation': return rec;
          case 'timeline': return index < 3 ? 'Immediate' : '1-3 months';
          case 'owner': return 'Security Team';
          default: return '';
        }
      })
    );
  }

  // Generate hash for data integrity
  private hashData(data: ExportData): string {
    const hashInput = JSON.stringify({
      nodeCount: data.nodes.length,
      edgeCount: data.edges.length,
      timestamp: data.metadata.analysisDate,
    });
    
    // Simple hash implementation
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  // Export templates
  exportTemplates(): ExportTemplate[] {
    return this.getAllTemplates().filter(t => !t.isBuiltIn);
  }

  // Import templates
  importTemplates(templates: ExportTemplate[]): void {
    templates.forEach(template => {
      if (!template.isBuiltIn) {
        this.templates.set(template.id, template);
      }
    });
  }

  // Reset to built-in templates
  resetToBuiltIn(): void {
    this.templates.clear();
    BUILTIN_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template);
    });
    this.activeTemplate = null;
  }
}

// Additional interfaces for rendered output
export interface RenderedTemplate {
  template: ExportTemplate;
  sections: RenderedSection[];
  variables: { [key: string]: any };
  metadata: {
    generatedAt: number;
    templateVersion: string;
    dataHash: string;
  };
}

export interface RenderedSection {
  section: TemplateSection;
  renderedContent: string;
  charts: ChartData[];
  tables: TableData[];
  graphs: ExportData[];
}

export interface ChartData {
  type: ChartType;
  title: string;
  data: any[];
}

export interface TableData {
  title: string;
  headers: string[];
  rows: any[][];
}

// Export singleton instance
export const exportTemplateService = new ExportTemplateService();