/**
 * Report Template Service
 *
 * Specialized report templates for different audiences:
 * - Compliance-focused (NIST, ISO 27001, PCI-DSS)
 * - Risk-focused (CVSS, FAIR)
 * - Operational (SOC performance, SLA tracking)
 * - Strategic (threat landscape, budget justification)
 */

import { Pool } from 'pg';
import { ExecutiveReport } from './ExecutiveReportingService';

export interface ReportTemplate {
  id?: string;
  name: string;
  description: string;
  category: 'compliance' | 'risk' | 'operational' | 'strategic';
  targetAudience: 'executives' | 'board' | 'compliance_officers' | 'technical_team' | 'risk_managers';
  format: 'pdf' | 'pptx' | 'html';
  sections: ReportSection[];
  styling?: TemplateStyles;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReportSection {
  id: string;
  title: string;
  order: number;
  type: 'executive_summary' | 'metrics' | 'trends' | 'risks' | 'compliance' | 'recommendations' | 'costs' | 'custom';
  content: SectionContent;
  layout?: 'full_width' | 'two_column' | 'grid';
  visuals?: Visual[];
}

export interface SectionContent {
  dataSource: string;
  fields: string[];
  filters?: Record<string, any>;
  formatting?: {
    highlightCritical?: boolean;
    showTrends?: boolean;
    includeCharts?: boolean;
  };
}

export interface Visual {
  type: 'chart' | 'table' | 'scorecard' | 'heatmap' | 'timeline';
  chartType?: 'bar' | 'line' | 'pie' | 'donut' | 'gauge' | 'radar';
  data: string; // Data field reference
  options?: Record<string, any>;
}

export interface TemplateStyles {
  theme: 'professional' | 'executive' | 'technical' | 'compliance';
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  includeLogo: boolean;
  logoUrl?: string;
  headerStyle?: string;
  footerStyle?: string;
}

/**
 * Report Template Service
 */
export class ReportTemplateService {
  private pool: Pool;
  private standardTemplates: Map<string, ReportTemplate> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
    this.initializeStandardTemplates();
  }

  /**
   * Initialize standard report templates
   */
  private initializeStandardTemplates(): void {
    // Compliance-focused templates
    this.standardTemplates.set('nist_csf_compliance', this.createNISTCSFTemplate());
    this.standardTemplates.set('iso_27001_compliance', this.createISO27001Template());
    this.standardTemplates.set('pci_dss_compliance', this.createPCIDSSTemplate());

    // Risk-focused templates
    this.standardTemplates.set('cvss_risk_assessment', this.createCVSSRiskTemplate());
    this.standardTemplates.set('fair_risk_analysis', this.createFAIRRiskTemplate());

    // Operational templates
    this.standardTemplates.set('soc_performance', this.createSOCPerformanceTemplate());
    this.standardTemplates.set('sla_tracking', this.createSLATrackingTemplate());

    // Strategic templates
    this.standardTemplates.set('threat_landscape', this.createThreatLandscapeTemplate());
    this.standardTemplates.set('budget_justification', this.createBudgetJustificationTemplate());
    this.standardTemplates.set('executive_briefing', this.createExecutiveBriefingTemplate());
  }

  /**
   * Create NIST CSF Compliance Template
   */
  private createNISTCSFTemplate(): ReportTemplate {
    return {
      name: 'NIST Cybersecurity Framework Compliance Report',
      description: 'Comprehensive NIST CSF compliance assessment with gap analysis',
      category: 'compliance',
      targetAudience: 'compliance_officers',
      format: 'pdf',
      sections: [
        {
          id: 'executive_summary',
          title: 'Executive Summary',
          order: 1,
          type: 'executive_summary',
          content: {
            dataSource: 'compliance_status',
            fields: ['overallScore', 'criticalGaps', 'auditReadiness'],
          },
          layout: 'full_width',
        },
        {
          id: 'framework_overview',
          title: 'NIST CSF Framework Coverage',
          order: 2,
          type: 'compliance',
          content: {
            dataSource: 'compliance_status.frameworks',
            fields: ['controlsCovered', 'totalControls', 'status'],
            filters: { name: 'NIST CSF' },
          },
          layout: 'two_column',
          visuals: [
            {
              type: 'chart',
              chartType: 'donut',
              data: 'controlsCovered',
            },
            {
              type: 'chart',
              chartType: 'radar',
              data: 'functionCoverage',
            },
          ],
        },
        {
          id: 'function_analysis',
          title: 'Function-by-Function Analysis',
          order: 3,
          type: 'compliance',
          content: {
            dataSource: 'nist_functions',
            fields: ['function', 'coverage', 'gaps', 'recommendations'],
          },
          layout: 'grid',
        },
        {
          id: 'gap_remediation',
          title: 'Gap Remediation Plan',
          order: 4,
          type: 'recommendations',
          content: {
            dataSource: 'compliance_status.remediationProgress',
            fields: ['completed', 'inProgress', 'notStarted'],
          },
          layout: 'full_width',
        },
      ],
      styling: {
        theme: 'compliance',
        primaryColor: '#003f5c',
        secondaryColor: '#58508d',
        fontFamily: 'Arial, sans-serif',
        includeLogo: true,
      },
    };
  }

  /**
   * Create ISO 27001 Compliance Template
   */
  private createISO27001Template(): ReportTemplate {
    return {
      name: 'ISO 27001 Information Security Compliance Report',
      description: 'ISO 27001:2022 compliance status with control assessments',
      category: 'compliance',
      targetAudience: 'compliance_officers',
      format: 'pdf',
      sections: [
        {
          id: 'scope_context',
          title: 'Scope and Context',
          order: 1,
          type: 'executive_summary',
          content: {
            dataSource: 'iso_scope',
            fields: ['organizationContext', 'informationSecurityScope', 'applicableControls'],
          },
          layout: 'full_width',
        },
        {
          id: 'control_assessment',
          title: 'Annex A Control Assessment',
          order: 2,
          type: 'compliance',
          content: {
            dataSource: 'iso_controls',
            fields: ['controlId', 'controlTitle', 'implementationStatus', 'effectiveness'],
          },
          layout: 'grid',
          visuals: [
            {
              type: 'heatmap',
              data: 'controlEffectiveness',
            },
          ],
        },
        {
          id: 'risk_treatment',
          title: 'Risk Treatment Plan',
          order: 3,
          type: 'risks',
          content: {
            dataSource: 'risk_treatment',
            fields: ['riskId', 'treatmentOption', 'owner', 'deadline'],
          },
          layout: 'two_column',
        },
      ],
      styling: {
        theme: 'compliance',
        primaryColor: '#2c3e50',
        secondaryColor: '#3498db',
        fontFamily: 'Helvetica, sans-serif',
        includeLogo: true,
      },
    };
  }

  /**
   * Create PCI-DSS Compliance Template
   */
  private createPCIDSSTemplate(): ReportTemplate {
    return {
      name: 'PCI-DSS v4.0 Compliance Report',
      description: 'Payment Card Industry Data Security Standard compliance assessment',
      category: 'compliance',
      targetAudience: 'compliance_officers',
      format: 'pdf',
      sections: [
        {
          id: 'compliance_status',
          title: 'PCI-DSS Compliance Status',
          order: 1,
          type: 'compliance',
          content: {
            dataSource: 'pci_status',
            fields: ['requirements', 'compliant', 'nonCompliant', 'notApplicable'],
          },
          layout: 'full_width',
          visuals: [
            {
              type: 'chart',
              chartType: 'bar',
              data: 'requirementStatus',
            },
          ],
        },
        {
          id: 'requirement_analysis',
          title: '12 Requirements Analysis',
          order: 2,
          type: 'compliance',
          content: {
            dataSource: 'pci_requirements',
            fields: ['requirement', 'status', 'findings', 'remediation'],
          },
          layout: 'grid',
        },
        {
          id: 'compensating_controls',
          title: 'Compensating Controls',
          order: 3,
          type: 'compliance',
          content: {
            dataSource: 'compensating_controls',
            fields: ['requirement', 'control', 'justification', 'effectiveness'],
          },
          layout: 'two_column',
        },
      ],
      styling: {
        theme: 'compliance',
        primaryColor: '#d32f2f',
        secondaryColor: '#f57c00',
        fontFamily: 'Arial, sans-serif',
        includeLogo: true,
      },
    };
  }

  /**
   * Create CVSS Risk Assessment Template
   */
  private createCVSSRiskTemplate(): ReportTemplate {
    return {
      name: 'CVSS-Based Risk Assessment Report',
      description: 'Common Vulnerability Scoring System risk analysis',
      category: 'risk',
      targetAudience: 'risk_managers',
      format: 'pdf',
      sections: [
        {
          id: 'risk_overview',
          title: 'Risk Overview',
          order: 1,
          type: 'risks',
          content: {
            dataSource: 'risk_score',
            fields: ['overall', 'breakdown', 'riskLevel', 'trend'],
          },
          layout: 'full_width',
          visuals: [
            {
              type: 'chart',
              chartType: 'gauge',
              data: 'overall',
            },
          ],
        },
        {
          id: 'cvss_distribution',
          title: 'CVSS Score Distribution',
          order: 2,
          type: 'metrics',
          content: {
            dataSource: 'vulnerability_scores',
            fields: ['critical', 'high', 'medium', 'low'],
          },
          layout: 'two_column',
          visuals: [
            {
              type: 'chart',
              chartType: 'bar',
              data: 'cvss_distribution',
            },
          ],
        },
        {
          id: 'risk_treatment',
          title: 'Risk Treatment Recommendations',
          order: 3,
          type: 'recommendations',
          content: {
            dataSource: 'risk_score.recommendations',
            fields: ['priority', 'action', 'expectedRiskReduction', 'estimatedCost'],
          },
          layout: 'grid',
        },
      ],
      styling: {
        theme: 'professional',
        primaryColor: '#e53935',
        secondaryColor: '#fb8c00',
        fontFamily: 'Arial, sans-serif',
        includeLogo: true,
      },
    };
  }

  /**
   * Create FAIR Risk Analysis Template
   */
  private createFAIRRiskTemplate(): ReportTemplate {
    return {
      name: 'FAIR Risk Analysis Report',
      description: 'Factor Analysis of Information Risk quantitative assessment',
      category: 'risk',
      targetAudience: 'risk_managers',
      format: 'pdf',
      sections: [
        {
          id: 'fair_overview',
          title: 'FAIR Model Overview',
          order: 1,
          type: 'risks',
          content: {
            dataSource: 'fair_analysis',
            fields: ['lossEventFrequency', 'lossVulnerability', 'riskExposure'],
          },
          layout: 'full_width',
        },
        {
          id: 'financial_impact',
          title: 'Financial Impact Analysis',
          order: 2,
          type: 'costs',
          content: {
            dataSource: 'risk_score.financialImpact',
            fields: ['estimatedAnnualLoss', 'preventedLosses', 'investmentROI'],
          },
          layout: 'two_column',
          visuals: [
            {
              type: 'chart',
              chartType: 'line',
              data: 'annualLossTrend',
            },
          ],
        },
        {
          id: 'risk_scenarios',
          title: 'Risk Scenarios',
          order: 3,
          type: 'risks',
          content: {
            dataSource: 'risk_scenarios',
            fields: ['scenario', 'probability', 'impact', 'expectedLoss'],
          },
          layout: 'grid',
        },
      ],
      styling: {
        theme: 'professional',
        primaryColor: '#1976d2',
        secondaryColor: '#0288d1',
        fontFamily: 'Helvetica, sans-serif',
        includeLogo: true,
      },
    };
  }

  /**
   * Create SOC Performance Template
   */
  private createSOCPerformanceTemplate(): ReportTemplate {
    return {
      name: 'Security Operations Center Performance Report',
      description: 'SOC metrics, KPIs, and operational effectiveness',
      category: 'operational',
      targetAudience: 'technical_team',
      format: 'pdf',
      sections: [
        {
          id: 'key_metrics',
          title: 'Key Performance Indicators',
          order: 1,
          type: 'metrics',
          content: {
            dataSource: 'response_metrics',
            fields: ['mttd', 'mttr', 'mtti', 'mttic'],
            formatting: {
              highlightCritical: true,
              showTrends: true,
            },
          },
          layout: 'grid',
          visuals: [
            {
              type: 'scorecard',
              data: 'kpis',
            },
          ],
        },
        {
          id: 'incident_analysis',
          title: 'Incident Analysis',
          order: 2,
          type: 'metrics',
          content: {
            dataSource: 'response_metrics.incidentsByPriority',
            fields: ['critical', 'high', 'medium', 'low'],
          },
          layout: 'two_column',
          visuals: [
            {
              type: 'chart',
              chartType: 'pie',
              data: 'incidentDistribution',
            },
          ],
        },
        {
          id: 'sla_performance',
          title: 'SLA Compliance',
          order: 3,
          type: 'metrics',
          content: {
            dataSource: 'response_metrics.slaCompliance',
            fields: ['critical', 'high', 'medium', 'low', 'overall'],
          },
          layout: 'full_width',
          visuals: [
            {
              type: 'chart',
              chartType: 'bar',
              data: 'slaCompliance',
            },
          ],
        },
        {
          id: 'automation_metrics',
          title: 'Automation & Efficiency',
          order: 4,
          type: 'metrics',
          content: {
            dataSource: 'response_metrics',
            fields: ['automationRate', 'escalationRate', 'falsePositiveRate'],
          },
          layout: 'two_column',
        },
      ],
      styling: {
        theme: 'technical',
        primaryColor: '#00695c',
        secondaryColor: '#00897b',
        fontFamily: 'Consolas, monospace',
        includeLogo: true,
      },
    };
  }

  /**
   * Create SLA Tracking Template
   */
  private createSLATrackingTemplate(): ReportTemplate {
    return {
      name: 'Service Level Agreement Tracking Report',
      description: 'SLA compliance and performance metrics',
      category: 'operational',
      targetAudience: 'technical_team',
      format: 'pdf',
      sections: [
        {
          id: 'sla_summary',
          title: 'SLA Summary',
          order: 1,
          type: 'metrics',
          content: {
            dataSource: 'sla_summary',
            fields: ['totalIncidents', 'slaMetPercentage', 'slaMissedCount'],
          },
          layout: 'full_width',
        },
        {
          id: 'priority_breakdown',
          title: 'SLA Performance by Priority',
          order: 2,
          type: 'metrics',
          content: {
            dataSource: 'response_metrics.slaCompliance',
            fields: ['critical', 'high', 'medium', 'low'],
          },
          layout: 'grid',
          visuals: [
            {
              type: 'chart',
              chartType: 'bar',
              data: 'slaByPriority',
            },
          ],
        },
        {
          id: 'trend_analysis',
          title: 'SLA Trend Analysis',
          order: 3,
          type: 'trends',
          content: {
            dataSource: 'sla_trends',
            fields: ['week', 'compliance', 'target'],
          },
          layout: 'full_width',
          visuals: [
            {
              type: 'chart',
              chartType: 'line',
              data: 'slaTrend',
            },
          ],
        },
      ],
      styling: {
        theme: 'technical',
        primaryColor: '#5e35b1',
        secondaryColor: '#7e57c2',
        fontFamily: 'Arial, sans-serif',
        includeLogo: true,
      },
    };
  }

  /**
   * Create Threat Landscape Template
   */
  private createThreatLandscapeTemplate(): ReportTemplate {
    return {
      name: 'Threat Landscape Analysis Report',
      description: 'Strategic threat intelligence and landscape overview',
      category: 'strategic',
      targetAudience: 'executives',
      format: 'pptx',
      sections: [
        {
          id: 'landscape_overview',
          title: 'Threat Landscape Overview',
          order: 1,
          type: 'executive_summary',
          content: {
            dataSource: 'threat_metrics',
            fields: ['totalFlowsAnalyzed', 'uniqueTechniquesObserved', 'topTechniques'],
          },
          layout: 'full_width',
        },
        {
          id: 'top_threats',
          title: 'Top 10 Observed Techniques',
          order: 2,
          type: 'metrics',
          content: {
            dataSource: 'threat_metrics.topTechniques',
            fields: ['techniqueId', 'techniqueName', 'occurrences', 'severity', 'businessImpact'],
          },
          layout: 'grid',
          visuals: [
            {
              type: 'chart',
              chartType: 'bar',
              data: 'topTechniques',
            },
          ],
        },
        {
          id: 'attack_vectors',
          title: 'Attack Vector Distribution',
          order: 3,
          type: 'metrics',
          content: {
            dataSource: 'threat_metrics.attackVectorDistribution',
            fields: ['email', 'web', 'network', 'physical', 'other'],
          },
          layout: 'two_column',
          visuals: [
            {
              type: 'chart',
              chartType: 'donut',
              data: 'attackVectors',
            },
          ],
        },
        {
          id: 'industry_comparison',
          title: 'Industry Comparison',
          order: 4,
          type: 'metrics',
          content: {
            dataSource: 'threat_metrics.industryComparison',
            fields: ['organizationRank', 'averageThreatsPerMonth', 'organizationThreatsPerMonth'],
          },
          layout: 'full_width',
        },
      ],
      styling: {
        theme: 'executive',
        primaryColor: '#1a237e',
        secondaryColor: '#303f9f',
        fontFamily: 'Georgia, serif',
        includeLogo: true,
      },
    };
  }

  /**
   * Create Budget Justification Template
   */
  private createBudgetJustificationTemplate(): ReportTemplate {
    return {
      name: 'Security Budget Justification Report',
      description: 'ROI analysis and budget justification for security investments',
      category: 'strategic',
      targetAudience: 'executives',
      format: 'pptx',
      sections: [
        {
          id: 'investment_summary',
          title: 'Security Investment Summary',
          order: 1,
          type: 'costs',
          content: {
            dataSource: 'cost_analysis',
            fields: ['totalSecuritySpend', 'preventedLosses', 'netROI'],
          },
          layout: 'full_width',
          visuals: [
            {
              type: 'scorecard',
              data: 'roi',
            },
          ],
        },
        {
          id: 'cost_breakdown',
          title: 'Cost Breakdown',
          order: 2,
          type: 'costs',
          content: {
            dataSource: 'cost_analysis',
            fields: [
              'threatIntelligenceCost',
              'investigationCosts',
              'toolsAndPlatforms',
              'personnelCosts',
              'incidentResponseCosts',
            ],
          },
          layout: 'two_column',
          visuals: [
            {
              type: 'chart',
              chartType: 'pie',
              data: 'costBreakdown',
            },
          ],
        },
        {
          id: 'roi_analysis',
          title: 'Return on Investment Analysis',
          order: 3,
          type: 'costs',
          content: {
            dataSource: 'cost_analysis',
            fields: ['totalSecuritySpend', 'preventedLosses', 'netROI'],
          },
          layout: 'full_width',
        },
        {
          id: 'industry_benchmark',
          title: 'Industry Benchmark Comparison',
          order: 4,
          type: 'costs',
          content: {
            dataSource: 'cost_analysis.benchmarkComparison',
            fields: ['industryAverage', 'organizationSpend', 'percentile'],
          },
          layout: 'two_column',
        },
        {
          id: 'recommendations',
          title: 'Investment Recommendations',
          order: 5,
          type: 'recommendations',
          content: {
            dataSource: 'recommendations',
            fields: ['title', 'estimatedCost', 'estimatedBenefit', 'roi', 'businessJustification'],
            filters: { category: 'strategic' },
          },
          layout: 'grid',
        },
      ],
      styling: {
        theme: 'executive',
        primaryColor: '#004d40',
        secondaryColor: '#00695c',
        fontFamily: 'Arial, sans-serif',
        includeLogo: true,
      },
    };
  }

  /**
   * Create Executive Briefing Template
   */
  private createExecutiveBriefingTemplate(): ReportTemplate {
    return {
      name: 'Executive Security Briefing (1-Page)',
      description: 'Concise executive briefing with key metrics and highlights',
      category: 'strategic',
      targetAudience: 'board',
      format: 'pdf',
      sections: [
        {
          id: 'key_highlights',
          title: 'Key Highlights',
          order: 1,
          type: 'executive_summary',
          content: {
            dataSource: 'summary.executiveHighlights',
            fields: ['highlights'],
          },
          layout: 'full_width',
        },
        {
          id: 'metrics_snapshot',
          title: 'Metrics Snapshot',
          order: 2,
          type: 'metrics',
          content: {
            dataSource: 'summary',
            fields: [
              'securityPostureScore',
              'totalThreatsAnalyzed',
              'criticalThreatsIdentified',
              'threatsNeutralized',
            ],
          },
          layout: 'grid',
          visuals: [
            {
              type: 'scorecard',
              data: 'metrics',
            },
          ],
        },
        {
          id: 'risk_status',
          title: 'Risk Status',
          order: 3,
          type: 'risks',
          content: {
            dataSource: 'risk_score',
            fields: ['overall', 'riskLevel', 'trend'],
          },
          layout: 'two_column',
          visuals: [
            {
              type: 'chart',
              chartType: 'gauge',
              data: 'riskScore',
            },
          ],
        },
        {
          id: 'key_actions',
          title: 'Key Actions Required',
          order: 4,
          type: 'recommendations',
          content: {
            dataSource: 'recommendations',
            fields: ['title', 'priority', 'timeframe'],
            filters: { priority: 'critical' },
          },
          layout: 'full_width',
        },
      ],
      styling: {
        theme: 'executive',
        primaryColor: '#37474f',
        secondaryColor: '#546e7a',
        fontFamily: 'Helvetica, sans-serif',
        includeLogo: true,
      },
    };
  }

  /**
   * Get standard template
   */
  getStandardTemplate(templateId: string): ReportTemplate | undefined {
    return this.standardTemplates.get(templateId);
  }

  /**
   * List all standard templates
   */
  listStandardTemplates(): ReportTemplate[] {
    return Array.from(this.standardTemplates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: ReportTemplate['category']): ReportTemplate[] {
    return Array.from(this.standardTemplates.values()).filter(t => t.category === category);
  }

  /**
   * Get templates by audience
   */
  getTemplatesByAudience(audience: ReportTemplate['targetAudience']): ReportTemplate[] {
    return Array.from(this.standardTemplates.values()).filter(t => t.targetAudience === audience);
  }

  /**
   * Apply template to report data
   */
  async applyTemplate(
    templateId: string,
    reportData: ExecutiveReport
  ): Promise<{ template: ReportTemplate; formattedData: any }> {
    const template = this.getStandardTemplate(templateId);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Format data according to template sections
    const formattedData = this.formatDataForTemplate(template, reportData);

    return { template, formattedData };
  }

  /**
   * Format data for template
   */
  private formatDataForTemplate(template: ReportTemplate, reportData: ExecutiveReport): any {
    const formatted: any = {};

    for (const section of template.sections) {
      const dataPath = section.content.dataSource.split('.');
      let data: any = reportData;

      // Navigate to data source
      for (const key of dataPath) {
        data = data?.[key];
      }

      // Extract requested fields
      if (section.content.fields) {
        const sectionData: any = {};
        for (const field of section.content.fields) {
          sectionData[field] = data?.[field];
        }
        formatted[section.id] = sectionData;
      } else {
        formatted[section.id] = data;
      }
    }

    return formatted;
  }

  /**
   * Save custom template
   */
  async saveCustomTemplate(template: Omit<ReportTemplate, 'id'>): Promise<ReportTemplate> {
    const result = await this.pool.query(
      `INSERT INTO report_templates (
        name, description, category, target_audience, format,
        sections, styling
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        template.name,
        template.description,
        template.category,
        template.targetAudience,
        template.format,
        JSON.stringify(template.sections),
        JSON.stringify(template.styling),
      ]
    );

    return {
      id: result.rows[0].id,
      ...template,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
  }
}

export default ReportTemplateService;
