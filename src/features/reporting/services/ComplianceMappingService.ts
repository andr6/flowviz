import { EventEmitter } from 'events';
import type {
  ComplianceFramework,
  ComplianceAssessment,
  ComplianceFinding,
  ComplianceMapping,
  ComplianceDashboard,
  FrameworkStatus,
  ComplianceControl,
  ComplianceDomain,
  RemediationAction,
  ComplianceReport
} from '../types/ComplianceMapping';

export class ComplianceMappingService extends EventEmitter {
  private frameworks: Map<string, ComplianceFramework> = new Map();
  private assessments: Map<string, ComplianceAssessment> = new Map();
  private mappings: Map<string, ComplianceMapping> = new Map();
  private findings: Map<string, ComplianceFinding[]> = new Map();

  constructor() {
    super();
    this.initializeFrameworks();
  }

  private initializeFrameworks(): void {
    const frameworks: ComplianceFramework[] = [
      {
        id: 'nist-csf-1.1',
        name: 'NIST Cybersecurity Framework',
        version: '1.1',
        description: 'Framework for improving critical infrastructure cybersecurity',
        organization: 'National Institute of Standards and Technology',
        publishedDate: new Date('2018-04-16'),
        lastUpdated: new Date('2018-04-16'),
        totalControls: 108,
        applicableIndustries: ['critical infrastructure', 'healthcare', 'financial', 'energy', 'government'],
        certificationRequired: false,
        auditFrequency: 'annual',
        documentation: {
          officialUrl: 'https://www.nist.gov/cyberframework',
          implementationGuideUrl: 'https://www.nist.gov/cyberframework/implementation-guide',
          assessmentToolUrl: 'https://www.nist.gov/cyberframework/assessment-tool'
        },
        domains: [
          {
            id: 'identify',
            name: 'Identify (ID)',
            description: 'Develop organizational understanding to manage cybersecurity risk',
            weight: 0.2,
            controls: this.generateNISTControls('ID', 'Identify')
          },
          {
            id: 'protect',
            name: 'Protect (PR)',
            description: 'Develop and implement appropriate safeguards',
            weight: 0.3,
            controls: this.generateNISTControls('PR', 'Protect')
          },
          {
            id: 'detect',
            name: 'Detect (DE)',
            description: 'Develop and implement activities to identify cybersecurity events',
            weight: 0.2,
            controls: this.generateNISTControls('DE', 'Detect')
          },
          {
            id: 'respond',
            name: 'Respond (RS)',
            description: 'Develop and implement appropriate activities regarding cybersecurity incident',
            weight: 0.15,
            controls: this.generateNISTControls('RS', 'Respond')
          },
          {
            id: 'recover',
            name: 'Recover (RC)',
            description: 'Develop and implement appropriate activities to maintain resilience',
            weight: 0.15,
            controls: this.generateNISTControls('RC', 'Recover')
          }
        ]
      },
      {
        id: 'iso27001-2013',
        name: 'ISO/IEC 27001:2013',
        version: '2013',
        description: 'Information security management systems — Requirements',
        organization: 'International Organization for Standardization',
        publishedDate: new Date('2013-10-01'),
        lastUpdated: new Date('2013-10-01'),
        totalControls: 114,
        applicableIndustries: ['all'],
        certificationRequired: true,
        auditFrequency: 'annual',
        documentation: {
          officialUrl: 'https://www.iso.org/standard/54534.html'
        },
        domains: [
          {
            id: 'a5',
            name: 'A.5 Information Security Policies',
            description: 'Management direction and support for information security',
            weight: 0.1,
            controls: this.generateISO27001Controls('A.5')
          },
          {
            id: 'a6',
            name: 'A.6 Organization of Information Security',
            description: 'Internal organization and mobile devices/teleworking',
            weight: 0.15,
            controls: this.generateISO27001Controls('A.6')
          },
          {
            id: 'a7',
            name: 'A.7 Human Resource Security',
            description: 'Security aspects of human resources',
            weight: 0.1,
            controls: this.generateISO27001Controls('A.7')
          },
          {
            id: 'a8',
            name: 'A.8 Asset Management',
            description: 'Responsibility for assets and information classification',
            weight: 0.15,
            controls: this.generateISO27001Controls('A.8')
          },
          {
            id: 'a9',
            name: 'A.9 Access Control',
            description: 'Business requirements and user access management',
            weight: 0.2,
            controls: this.generateISO27001Controls('A.9')
          },
          {
            id: 'a10',
            name: 'A.10 Cryptography',
            description: 'Cryptographic controls',
            weight: 0.05,
            controls: this.generateISO27001Controls('A.10')
          },
          {
            id: 'a11',
            name: 'A.11 Physical and Environmental Security',
            description: 'Secure areas and equipment',
            weight: 0.1,
            controls: this.generateISO27001Controls('A.11')
          },
          {
            id: 'a12',
            name: 'A.12 Operations Security',
            description: 'Operational procedures and responsibilities',
            weight: 0.15,
            controls: this.generateISO27001Controls('A.12')
          }
        ]
      },
      {
        id: 'soc2',
        name: 'SOC 2 Type II',
        version: '2017',
        description: 'Service Organization Control 2 Type II',
        organization: 'American Institute of CPAs',
        publishedDate: new Date('2017-01-01'),
        lastUpdated: new Date('2017-01-01'),
        totalControls: 67,
        applicableIndustries: ['technology', 'saas', 'cloud'],
        certificationRequired: true,
        auditFrequency: 'annual',
        documentation: {
          officialUrl: 'https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome.html'
        },
        domains: [
          {
            id: 'security',
            name: 'Security',
            description: 'Protection against unauthorized access',
            weight: 0.4,
            controls: this.generateSOC2Controls('Security')
          },
          {
            id: 'availability',
            name: 'Availability',
            description: 'System operation, use, and performance',
            weight: 0.2,
            controls: this.generateSOC2Controls('Availability')
          },
          {
            id: 'processing-integrity',
            name: 'Processing Integrity',
            description: 'System processing is complete, valid, accurate',
            weight: 0.2,
            controls: this.generateSOC2Controls('Processing Integrity')
          },
          {
            id: 'confidentiality',
            name: 'Confidentiality',
            description: 'Information designated as confidential is protected',
            weight: 0.1,
            controls: this.generateSOC2Controls('Confidentiality')
          },
          {
            id: 'privacy',
            name: 'Privacy',
            description: 'Personal information is protected',
            weight: 0.1,
            controls: this.generateSOC2Controls('Privacy')
          }
        ]
      }
    ];

    frameworks.forEach(framework => {
      this.frameworks.set(framework.id, framework);
    });

    this.initializeCrosswalk();
  }

  private generateNISTControls(prefix: string, category: string): ComplianceControl[] {
    const controlCounts = { ID: 6, PR: 13, DE: 3, RS: 5, RC: 3 };
    const count = controlCounts[prefix as keyof typeof controlCounts] || 5;
    
    return Array.from({ length: count }, (_, i) => ({
      id: `${prefix}.${(i + 1).toString().padStart(2, '0')}`,
      frameworkId: 'nist-csf-1.1',
      domainId: prefix.toLowerCase(),
      number: `${prefix}.${i + 1}`,
      title: `${category} Control ${i + 1}`,
      description: `Detailed description for ${category} control ${i + 1}`,
      category: 'technical',
      level: 'intermediate',
      priority: 'medium',
      implementationGuidance: `Implementation guidance for ${prefix}.${i + 1}`,
      testingProcedures: [`Test procedure 1 for ${prefix}.${i + 1}`, `Test procedure 2 for ${prefix}.${i + 1}`],
      evidenceRequirements: [`Evidence requirement 1 for ${prefix}.${i + 1}`],
      relatedControls: [],
      dependencies: [],
      automatable: Math.random() > 0.5,
      frequency: 'monthly'
    }));
  }

  private generateISO27001Controls(domain: string): ComplianceControl[] {
    const controlCounts = { 'A.5': 2, 'A.6': 7, 'A.7': 6, 'A.8': 10, 'A.9': 14, 'A.10': 2, 'A.11': 15, 'A.12': 7 };
    const count = controlCounts[domain as keyof typeof controlCounts] || 5;
    
    return Array.from({ length: count }, (_, i) => ({
      id: `${domain}.${i + 1}`,
      frameworkId: 'iso27001-2013',
      domainId: domain.toLowerCase().replace('.', ''),
      number: `${domain}.${i + 1}`,
      title: `${domain} Control ${i + 1}`,
      description: `ISO 27001 control description for ${domain}.${i + 1}`,
      category: 'administrative',
      level: 'intermediate',
      priority: 'medium',
      implementationGuidance: `ISO 27001 implementation guidance for ${domain}.${i + 1}`,
      testingProcedures: [`ISO test procedure for ${domain}.${i + 1}`],
      evidenceRequirements: [`ISO evidence requirement for ${domain}.${i + 1}`],
      relatedControls: [],
      dependencies: [],
      automatable: Math.random() > 0.7,
      frequency: 'quarterly'
    }));
  }

  private generateSOC2Controls(trust: string): ComplianceControl[] {
    const controlCounts = { 'Security': 20, 'Availability': 12, 'Processing Integrity': 10, 'Confidentiality': 8, 'Privacy': 17 };
    const count = controlCounts[trust as keyof typeof controlCounts] || 10;
    
    return Array.from({ length: count }, (_, i) => ({
      id: `${trust.replace(' ', '')}.${i + 1}`,
      frameworkId: 'soc2',
      domainId: trust.toLowerCase().replace(' ', '-'),
      number: `${trust}.${i + 1}`,
      title: `${trust} Control ${i + 1}`,
      description: `SOC 2 control description for ${trust} ${i + 1}`,
      category: 'technical',
      level: 'advanced',
      priority: 'high',
      implementationGuidance: `SOC 2 implementation guidance for ${trust}.${i + 1}`,
      testingProcedures: [`SOC 2 test procedure for ${trust}.${i + 1}`],
      evidenceRequirements: [`SOC 2 evidence requirement for ${trust}.${i + 1}`],
      relatedControls: [],
      dependencies: [],
      automatable: Math.random() > 0.6,
      frequency: 'continuous'
    }));
  }

  private initializeCrosswalk(): void {
    const nistToIso: ComplianceMapping = {
      id: 'nist-to-iso27001',
      name: 'NIST CSF to ISO 27001 Mapping',
      description: 'Cross-mapping between NIST Cybersecurity Framework and ISO 27001 controls',
      sourceFramework: 'nist-csf-1.1',
      targetFrameworks: ['iso27001-2013'],
      mappingType: 'conceptual',
      confidence: 0.85,
      createdBy: 'system',
      createdDate: new Date(),
      lastUpdated: new Date(),
      approved: true,
      usage: [],
      mappings: [
        {
          sourceControlId: 'ID.01',
          targetMappings: [
            { frameworkId: 'iso27001-2013', controlId: 'A.8.1', relationship: 'related', coverage: 0.7 },
            { frameworkId: 'iso27001-2013', controlId: 'A.8.2', relationship: 'subset', coverage: 0.5 }
          ],
          mappingRationale: 'Asset management controls align with identification functions',
          confidence: 0.8,
          reviewRequired: false
        },
        {
          sourceControlId: 'PR.01',
          targetMappings: [
            { frameworkId: 'iso27001-2013', controlId: 'A.9.1', relationship: 'equivalent', coverage: 0.9 }
          ],
          mappingRationale: 'Access control requirements are directly comparable',
          confidence: 0.95,
          reviewRequired: false
        }
      ]
    };

    this.mappings.set(nistToIso.id, nistToIso);
  }

  async getFrameworks(): Promise<ComplianceFramework[]> {
    return Array.from(this.frameworks.values());
  }

  async getFramework(id: string): Promise<ComplianceFramework | null> {
    return this.frameworks.get(id) || null;
  }

  async createAssessment(assessment: Omit<ComplianceAssessment, 'id'>): Promise<string> {
    const id = `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newAssessment: ComplianceAssessment = {
      ...assessment,
      id,
      findings: [],
      overallScore: 0,
      riskRating: 'medium'
    };

    this.assessments.set(id, newAssessment);
    this.emit('assessmentCreated', newAssessment);
    return id;
  }

  async getAssessment(id: string): Promise<ComplianceAssessment | null> {
    return this.assessments.get(id) || null;
  }

  async listAssessments(frameworkId?: string): Promise<ComplianceAssessment[]> {
    const assessments = Array.from(this.assessments.values());
    
    if (frameworkId) {
      return assessments.filter(assessment => assessment.frameworkId === frameworkId);
    }
    
    return assessments;
  }

  async updateAssessmentFinding(assessmentId: string, finding: ComplianceFinding): Promise<void> {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }

    const existingIndex = assessment.findings.findIndex(f => f.controlId === finding.controlId);
    if (existingIndex >= 0) {
      assessment.findings[existingIndex] = finding;
    } else {
      assessment.findings.push(finding);
    }

    this.recalculateAssessmentScore(assessment);
    this.assessments.set(assessmentId, assessment);
    this.emit('findingUpdated', { assessmentId, finding });
  }

  private recalculateAssessmentScore(assessment: ComplianceAssessment): void {
    if (assessment.findings.length === 0) {
      assessment.overallScore = 0;
      return;
    }

    const totalScore = assessment.findings.reduce((sum, finding) => sum + finding.score, 0);
    assessment.overallScore = totalScore / assessment.findings.length;

    if (assessment.overallScore >= 90) {
      assessment.riskRating = 'low';
    } else if (assessment.overallScore >= 70) {
      assessment.riskRating = 'medium';
    } else if (assessment.overallScore >= 50) {
      assessment.riskRating = 'high';
    } else {
      assessment.riskRating = 'critical';
    }
  }

  async getComplianceDashboard(): Promise<ComplianceDashboard> {
    const frameworks = Array.from(this.frameworks.values());
    const assessments = Array.from(this.assessments.values());

    const frameworkStatus: FrameworkStatus[] = frameworks.map(framework => {
      const latestAssessment = assessments
        .filter(a => a.frameworkId === framework.id)
        .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0];

      const totalControls = framework.domains.reduce((sum, domain) => sum + domain.controls.length, 0);
      
      let compliantControls = 0;
      let partialControls = 0;
      let nonCompliantControls = 0;
      let notApplicableControls = 0;

      if (latestAssessment) {
        latestAssessment.findings.forEach(finding => {
          switch (finding.status) {
            case 'compliant':
              compliantControls++;
              break;
            case 'partial':
              partialControls++;
              break;
            case 'non-compliant':
              nonCompliantControls++;
              break;
            case 'not-applicable':
              notApplicableControls++;
              break;
          }
        });
      }

      const compliance = totalControls > 0 ? ((compliantControls + partialControls * 0.5) / totalControls) * 100 : 0;

      return {
        frameworkId: framework.id,
        frameworkName: framework.name,
        compliance,
        totalControls,
        compliantControls,
        partialControls,
        nonCompliantControls,
        notApplicableControls,
        lastAssessment: latestAssessment?.startDate || new Date(),
        nextAssessment: this.calculateNextAssessment(latestAssessment?.startDate || new Date(), framework.auditFrequency),
        certification: framework.certificationRequired ? {
          status: compliance > 95 ? 'certified' : 'pending',
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          certifyingBody: framework.organization
        } : undefined
      };
    });

    const overallCompliance = frameworkStatus.reduce((sum, fs) => sum + fs.compliance, 0) / frameworkStatus.length;

    const allFindings = assessments.flatMap(a => a.findings);
    const riskDistribution = {
      critical: allFindings.filter(f => f.riskLevel === 'critical').length,
      high: allFindings.filter(f => f.riskLevel === 'high').length,
      medium: allFindings.filter(f => f.riskLevel === 'medium').length,
      low: allFindings.filter(f => f.riskLevel === 'low').length
    };

    const assessmentProgress = assessments
      .filter(a => a.status === 'in-progress')
      .map(assessment => {
        const framework = frameworks.find(f => f.id === assessment.frameworkId);
        const totalControls = framework?.domains.reduce((sum, domain) => sum + domain.controls.length, 0) || 0;
        
        return {
          assessmentId: assessment.id,
          frameworkName: framework?.name || 'Unknown',
          progress: (assessment.findings.length / totalControls) * 100,
          status: assessment.status,
          startDate: assessment.startDate,
          expectedEndDate: assessment.endDate || new Date(),
          assignedAssessors: assessment.assessors.length,
          completedControls: assessment.findings.length,
          totalControls
        };
      });

    return {
      overallCompliance,
      frameworkStatus,
      riskDistribution,
      assessmentProgress,
      upcomingDeadlines: this.generateUpcomingDeadlines(),
      trendsData: this.generateTrendsData(),
      topRisks: this.generateTopRisks(),
      remediationProgress: this.generateRemediationProgress()
    };
  }

  private calculateNextAssessment(lastAssessment: Date, frequency: string): Date {
    const nextDate = new Date(lastAssessment);
    
    switch (frequency) {
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'biannual':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case 'annual':
      default:
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
    
    return nextDate;
  }

  private generateUpcomingDeadlines() {
    return [
      {
        id: 'deadline_1',
        type: 'assessment' as const,
        title: 'ISO 27001 Annual Assessment',
        framework: 'ISO 27001',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'on-track' as const,
        assignedTo: 'Security Team',
        priority: 'high' as const
      },
      {
        id: 'deadline_2',
        type: 'certification' as const,
        title: 'SOC 2 Certification Renewal',
        framework: 'SOC 2',
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: 'at-risk' as const,
        assignedTo: 'Compliance Officer',
        priority: 'critical' as const
      }
    ];
  }

  private generateTrendsData() {
    const trends = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        overallCompliance: 75 + Math.random() * 20,
        frameworks: {
          'NIST CSF': 80 + Math.random() * 15,
          'ISO 27001': 85 + Math.random() * 10,
          'SOC 2': 90 + Math.random() * 8
        },
        newFindings: Math.floor(Math.random() * 20) + 5,
        resolvedFindings: Math.floor(Math.random() * 25) + 8,
        riskReduction: Math.random() * 10
      });
    }
    return trends;
  }

  private generateTopRisks() {
    return [
      {
        id: 'risk_1',
        description: 'Inadequate access control procedures',
        framework: 'ISO 27001',
        controlId: 'A.9.1',
        riskLevel: 'critical' as const,
        likelihood: 0.8,
        impact: 0.9,
        riskScore: 0.72,
        businessImpact: 'Potential unauthorized access to sensitive data',
        mitigationStatus: 'in-progress' as const,
        owner: 'IT Security Manager',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'risk_2',
        description: 'Missing incident response procedures',
        framework: 'NIST CSF',
        controlId: 'RS.01',
        riskLevel: 'high' as const,
        likelihood: 0.6,
        impact: 0.8,
        riskScore: 0.48,
        businessImpact: 'Delayed response to security incidents',
        mitigationStatus: 'planned' as const,
        owner: 'CISO',
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
      }
    ];
  }

  private generateRemediationProgress() {
    return [
      {
        gapId: 'gap_1',
        title: 'Implement Multi-Factor Authentication',
        framework: 'NIST CSF',
        priority: 'critical' as const,
        progress: 75,
        status: 'in-progress' as const,
        assignedTo: 'IT Team',
        targetDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        estimatedCost: 50000,
        actualCost: 37500
      },
      {
        gapId: 'gap_2',
        title: 'Update Privacy Policies',
        framework: 'SOC 2',
        priority: 'medium' as const,
        progress: 30,
        status: 'in-progress' as const,
        assignedTo: 'Legal Team',
        targetDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
        estimatedCost: 15000
      }
    ];
  }

  async getMappings(sourceFramework?: string, targetFramework?: string): Promise<ComplianceMapping[]> {
    const mappings = Array.from(this.mappings.values());
    
    return mappings.filter(mapping => {
      if (sourceFramework && mapping.sourceFramework !== sourceFramework) return false;
      if (targetFramework && !mapping.targetFrameworks.includes(targetFramework)) return false;
      return true;
    });
  }

  async generateReport(assessmentId: string, type: 'assessment' | 'gap-analysis' | 'executive-summary'): Promise<ComplianceReport> {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }

    const framework = this.frameworks.get(assessment.frameworkId);
    if (!framework) {
      throw new Error(`Framework ${assessment.frameworkId} not found`);
    }

    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const report: ComplianceReport = {
      id: reportId,
      type,
      framework: framework.name,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${framework.name}`,
      generatedDate: new Date(),
      reportPeriod: {
        startDate: assessment.startDate,
        endDate: assessment.endDate || new Date()
      },
      scope: assessment.scope,
      executiveSummary: this.generateExecutiveSummary(assessment, framework),
      findings: assessment.findings,
      recommendations: this.generateRecommendations(assessment.findings),
      appendices: [],
      generatedBy: 'system',
      confidentiality: 'internal',
      format: 'pdf'
    };

    this.emit('reportGenerated', report);
    return report;
  }

  private generateExecutiveSummary(assessment: ComplianceAssessment, framework: ComplianceFramework): string {
    const compliantFindings = assessment.findings.filter(f => f.status === 'compliant').length;
    const totalFindings = assessment.findings.length;
    const complianceRate = totalFindings > 0 ? (compliantFindings / totalFindings) * 100 : 0;

    return `This assessment evaluated ${framework.name} compliance across ${totalFindings} controls. ` +
           `The organization achieved ${complianceRate.toFixed(1)}% compliance with an overall risk rating of ${assessment.riskRating}. ` +
           `Key areas for improvement include access control, incident response, and data protection measures.`;
  }

  private generateRecommendations(findings: ComplianceFinding[]): string[] {
    const recommendations = [
      'Implement a comprehensive security awareness training program',
      'Establish regular vulnerability assessments and penetration testing',
      'Develop and maintain an incident response plan',
      'Enhance access control mechanisms with multi-factor authentication'
    ];

    const criticalFindings = findings.filter(f => f.riskLevel === 'critical');
    if (criticalFindings.length > 0) {
      recommendations.unshift('Address critical compliance gaps as highest priority');
    }

    return recommendations;
  }

  dispose(): void {
    this.removeAllListeners();
  }
}