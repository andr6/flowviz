/**
 * Compliance Mapping Service
 *
 * Maps attack techniques and simulation results to compliance frameworks:
 * - NIST CSF (Cybersecurity Framework)
 * - NIST 800-53
 * - CIS Controls
 * - PCI-DSS
 * - ISO 27001
 * - HIPAA
 * - SOC 2
 * - GDPR
 */

import { Pool } from 'pg';

export type ComplianceFramework =
  | 'nist_csf'
  | 'nist_800_53'
  | 'cis_controls'
  | 'pci_dss'
  | 'iso_27001'
  | 'hipaa'
  | 'soc2'
  | 'gdpr';

export interface ComplianceMapping {
  id?: string;
  techniqueId: string;
  techniqueName: string;
  framework: ComplianceFramework;
  controlId: string;
  controlTitle: string;
  controlDescription?: string;
  mappingRationale?: string;
  coverageLevel: 'full' | 'partial' | 'related';
  createdAt?: Date;
}

export interface ComplianceGap {
  framework: ComplianceFramework;
  controlId: string;
  controlTitle: string;
  affectedTechniques: Array<{
    techniqueId: string;
    techniqueName: string;
    detectionStatus: string;
    preventionStatus: string;
  }>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

export interface ComplianceReport {
  framework: ComplianceFramework;
  jobId: string;
  generatedAt: Date;
  overallScore: number; // 0-100
  controlCoverage: {
    total: number;
    covered: number;
    partiallyCovered: number;
    notCovered: number;
  };
  gapsByCategory: Array<{
    category: string;
    gaps: ComplianceGap[];
  }>;
  recommendations: string[];
}

export interface ComplianceControl {
  framework: ComplianceFramework;
  controlId: string;
  controlTitle: string;
  controlDescription: string;
  category?: string;
  priority?: 'P1' | 'P2' | 'P3';
  implementationGuidance?: string;
  relatedControls?: string[];
}

/**
 * Compliance Mapping Service
 */
export class ComplianceMappingService {
  private pool: Pool;
  private mappings: Map<string, ComplianceMapping[]> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
    this.loadMappings();
  }

  /**
   * Load compliance mappings from database
   */
  private async loadMappings(): Promise<void> {
    try {
      const result = await this.pool.query('SELECT * FROM compliance_mappings');

      for (const row of result.rows) {
        const mapping: ComplianceMapping = {
          id: row.id,
          techniqueId: row.technique_id,
          techniqueName: row.technique_name,
          framework: row.framework,
          controlId: row.control_id,
          controlTitle: row.control_title,
          controlDescription: row.control_description,
          mappingRationale: row.mapping_rationale,
          coverageLevel: row.coverage_level,
          createdAt: row.created_at,
        };

        const key = `${row.technique_id}-${row.framework}`;
        if (!this.mappings.has(key)) {
          this.mappings.set(key, []);
        }
        this.mappings.get(key)!.push(mapping);
      }
    } catch (error) {
      console.error('Failed to load compliance mappings:', error);
    }
  }

  /**
   * Get compliance mappings for a technique
   */
  async getMappingsForTechnique(techniqueId: string, framework?: ComplianceFramework): Promise<ComplianceMapping[]> {
    let query = 'SELECT * FROM compliance_mappings WHERE technique_id = $1';
    const params: any[] = [techniqueId];

    if (framework) {
      query += ' AND framework = $2';
      params.push(framework);
    }

    query += ' ORDER BY framework, control_id';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Generate compliance report for simulation job
   */
  async generateComplianceReport(jobId: string, framework: ComplianceFramework): Promise<ComplianceReport> {
    // Get simulation results
    const resultsQuery = await this.pool.query(
      'SELECT * FROM validation_results WHERE job_id = $1',
      [jobId]
    );

    const results = resultsQuery.rows;

    // Get technique IDs from results
    const techniqueIds = results.map((r: any) => r.technique_id);

    // Get relevant controls for this framework
    const controlsQuery = await this.pool.query(
      `SELECT DISTINCT cm.control_id, cm.control_title, cm.control_description,
        cc.category, cc.priority
       FROM compliance_mappings cm
       LEFT JOIN compliance_controls cc ON cm.framework = cc.framework AND cm.control_id = cc.control_id
       WHERE cm.framework = $1 AND cm.technique_id = ANY($2)`,
      [framework, techniqueIds]
    );

    const controls = controlsQuery.rows;

    // Calculate coverage
    const controlCoverage = await this.calculateControlCoverage(framework, results);

    // Identify gaps
    const gaps = await this.identifyComplianceGaps(framework, results);

    // Group gaps by category
    const gapsByCategory = this.groupGapsByCategory(gaps);

    // Calculate overall score
    const overallScore = this.calculateComplianceScore(controlCoverage, gaps);

    // Generate recommendations
    const recommendations = this.generateRecommendations(gaps, framework);

    return {
      framework,
      jobId,
      generatedAt: new Date(),
      overallScore,
      controlCoverage,
      gapsByCategory,
      recommendations,
    };
  }

  /**
   * Calculate control coverage
   */
  private async calculateControlCoverage(
    framework: ComplianceFramework,
    results: any[]
  ): Promise<{
    total: number;
    covered: number;
    partiallyCovered: number;
    notCovered: number;
  }> {
    // Get all controls for this framework
    const totalControlsQuery = await this.pool.query(
      'SELECT COUNT(DISTINCT control_id) as count FROM compliance_controls WHERE framework = $1',
      [framework]
    );

    const totalControls = totalControlsQuery.rows[0].count;

    // Analyze results to determine coverage
    let covered = 0;
    let partiallyCovered = 0;

    for (const result of results) {
      const mappings = await this.getMappingsForTechnique(result.technique_id, framework);

      for (const mapping of mappings) {
        if (result.detection_status === 'detected' && result.prevention_status === 'prevented') {
          if (mapping.coverageLevel === 'full') {
            covered++;
          } else {
            partiallyCovered++;
          }
        } else if (
          result.detection_status === 'detected' ||
          result.prevention_status === 'prevented'
        ) {
          partiallyCovered++;
        }
      }
    }

    const notCovered = totalControls - covered - partiallyCovered;

    return {
      total: totalControls,
      covered,
      partiallyCovered,
      notCovered: Math.max(0, notCovered),
    };
  }

  /**
   * Identify compliance gaps
   */
  private async identifyComplianceGaps(framework: ComplianceFramework, results: any[]): Promise<ComplianceGap[]> {
    const gaps: ComplianceGap[] = [];

    // Group results by control
    const controlMap = new Map<string, any[]>();

    for (const result of results) {
      const mappings = await this.getMappingsForTechnique(result.technique_id, framework);

      for (const mapping of mappings) {
        if (!controlMap.has(mapping.controlId)) {
          controlMap.set(mapping.controlId, []);
        }
        controlMap.get(mapping.controlId)!.push({
          techniqueId: result.technique_id,
          techniqueName: result.technique_name,
          detectionStatus: result.detection_status,
          preventionStatus: result.prevention_status,
          mapping,
        });
      }
    }

    // Analyze each control for gaps
    for (const [controlId, techniques] of controlMap.entries()) {
      const hasGap = techniques.some(
        (t: any) =>
          t.detectionStatus !== 'detected' || t.preventionStatus !== 'prevented'
      );

      if (hasGap) {
        const controlInfo = techniques[0].mapping;
        const severity = this.determineSeverity(techniques);

        gaps.push({
          framework,
          controlId,
          controlTitle: controlInfo.controlTitle,
          affectedTechniques: techniques.map((t: any) => ({
            techniqueId: t.techniqueId,
            techniqueName: t.techniqueName,
            detectionStatus: t.detectionStatus,
            preventionStatus: t.preventionStatus,
          })),
          severity,
          recommendation: await this.generateControlRecommendation(controlId, framework, techniques),
        });
      }
    }

    return gaps;
  }

  /**
   * Determine severity of compliance gap
   */
  private determineSeverity(techniques: any[]): 'low' | 'medium' | 'high' | 'critical' {
    const notDetected = techniques.filter((t: any) => t.detectionStatus !== 'detected').length;
    const notPrevented = techniques.filter((t: any) => t.preventionStatus !== 'prevented').length;

    const ratio = (notDetected + notPrevented) / (techniques.length * 2);

    if (ratio >= 0.75) return 'critical';
    if (ratio >= 0.5) return 'high';
    if (ratio >= 0.25) return 'medium';
    return 'low';
  }

  /**
   * Generate control recommendation
   */
  private async generateControlRecommendation(
    controlId: string,
    framework: ComplianceFramework,
    techniques: any[]
  ): Promise<string> {
    const controlQuery = await this.pool.query(
      'SELECT * FROM compliance_controls WHERE framework = $1 AND control_id = $2',
      [framework, controlId]
    );

    if (controlQuery.rows.length > 0) {
      const control = controlQuery.rows[0];
      return control.implementation_guidance || `Implement controls to address ${control.control_title}`;
    }

    return `Review and implement appropriate controls for ${controlId}`;
  }

  /**
   * Group gaps by category
   */
  private groupGapsByCategory(gaps: ComplianceGap[]): Array<{ category: string; gaps: ComplianceGap[] }> {
    const categoryMap = new Map<string, ComplianceGap[]>();

    for (const gap of gaps) {
      const category = this.getCategoryForControl(gap.framework, gap.controlId);

      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(gap);
    }

    return Array.from(categoryMap.entries()).map(([category, gaps]) => ({
      category,
      gaps,
    }));
  }

  /**
   * Get category for control
   */
  private getCategoryForControl(framework: ComplianceFramework, controlId: string): string {
    // Framework-specific categorization
    switch (framework) {
      case 'nist_csf':
        if (controlId.startsWith('ID')) return 'Identify';
        if (controlId.startsWith('PR')) return 'Protect';
        if (controlId.startsWith('DE')) return 'Detect';
        if (controlId.startsWith('RS')) return 'Respond';
        if (controlId.startsWith('RC')) return 'Recover';
        break;

      case 'cis_controls':
        const controlNum = parseInt(controlId.split('.')[0]);
        if (controlNum <= 6) return 'Basic';
        if (controlNum <= 16) return 'Foundational';
        return 'Organizational';

      case 'pci_dss':
        const requirement = parseInt(controlId.split('.')[0]);
        if (requirement <= 6) return 'Build and Maintain a Secure Network';
        if (requirement <= 9) return 'Protect Cardholder Data';
        return 'Maintain a Vulnerability Management Program';

      default:
        return 'General';
    }

    return 'General';
  }

  /**
   * Calculate compliance score
   */
  private calculateComplianceScore(
    coverage: {
      total: number;
      covered: number;
      partiallyCovered: number;
      notCovered: number;
    },
    gaps: ComplianceGap[]
  ): number {
    // Base score from coverage
    const coverageScore = (coverage.covered / coverage.total) * 100;
    const partialScore = (coverage.partiallyCovered / coverage.total) * 50;

    // Penalty for severity of gaps
    const criticalGaps = gaps.filter(g => g.severity === 'critical').length;
    const highGaps = gaps.filter(g => g.severity === 'high').length;

    const gapPenalty = criticalGaps * 10 + highGaps * 5;

    const finalScore = Math.max(0, Math.min(100, coverageScore + partialScore - gapPenalty));

    return Math.round(finalScore);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(gaps: ComplianceGap[], framework: ComplianceFramework): string[] {
    const recommendations: string[] = [];

    // Priority 1: Critical gaps
    const criticalGaps = gaps.filter(g => g.severity === 'critical');
    if (criticalGaps.length > 0) {
      recommendations.push(
        `Address ${criticalGaps.length} critical compliance gap(s) immediately: ${criticalGaps
          .map(g => g.controlId)
          .slice(0, 3)
          .join(', ')}`
      );
    }

    // Priority 2: High severity gaps
    const highGaps = gaps.filter(g => g.severity === 'high');
    if (highGaps.length > 0) {
      recommendations.push(
        `Remediate ${highGaps.length} high-severity gap(s) within 30 days: ${highGaps
          .map(g => g.controlId)
          .slice(0, 3)
          .join(', ')}`
      );
    }

    // Priority 3: Common weaknesses
    const commonWeaknesses = this.identifyCommonWeaknesses(gaps);
    if (commonWeaknesses.length > 0) {
      recommendations.push(...commonWeaknesses);
    }

    // Framework-specific recommendations
    recommendations.push(...this.getFrameworkSpecificRecommendations(framework, gaps));

    return recommendations.slice(0, 10); // Limit to top 10 recommendations
  }

  /**
   * Identify common weaknesses
   */
  private identifyCommonWeaknesses(gaps: ComplianceGap[]): string[] {
    const recommendations: string[] = [];

    // Check for detection gaps
    const detectionGaps = gaps.filter(g =>
      g.affectedTechniques.some(t => t.detectionStatus !== 'detected')
    );
    if (detectionGaps.length > 5) {
      recommendations.push('Enhance detection capabilities across multiple controls');
    }

    // Check for prevention gaps
    const preventionGaps = gaps.filter(g =>
      g.affectedTechniques.some(t => t.preventionStatus !== 'prevented')
    );
    if (preventionGaps.length > 5) {
      recommendations.push('Strengthen preventive controls to block attacks before execution');
    }

    return recommendations;
  }

  /**
   * Get framework-specific recommendations
   */
  private getFrameworkSpecificRecommendations(framework: ComplianceFramework, gaps: ComplianceGap[]): string[] {
    const recommendations: string[] = [];

    switch (framework) {
      case 'nist_csf':
        recommendations.push('Implement continuous monitoring aligned with NIST CSF Detect function');
        break;

      case 'pci_dss':
        recommendations.push('Conduct quarterly vulnerability scans as required by PCI-DSS');
        break;

      case 'cis_controls':
        recommendations.push('Prioritize implementation of CIS Critical Security Controls 1-6');
        break;

      case 'iso_27001':
        recommendations.push('Update risk assessment to reflect identified gaps in ISO 27001 controls');
        break;

      case 'hipaa':
        recommendations.push('Review and update HIPAA Security Rule compliance documentation');
        break;

      case 'soc2':
        recommendations.push('Document remediation plan for SOC 2 audit preparation');
        break;
    }

    return recommendations;
  }

  /**
   * Import compliance mappings from file
   */
  async importMappings(mappings: ComplianceMapping[]): Promise<{ imported: number; failed: number }> {
    let imported = 0;
    let failed = 0;

    for (const mapping of mappings) {
      try {
        await this.pool.query(
          `INSERT INTO compliance_mappings (
            technique_id, technique_name, framework, control_id,
            control_title, control_description, mapping_rationale,
            coverage_level, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (technique_id, framework, control_id) DO UPDATE SET
            technique_name = EXCLUDED.technique_name,
            control_title = EXCLUDED.control_title,
            control_description = EXCLUDED.control_description,
            mapping_rationale = EXCLUDED.mapping_rationale,
            coverage_level = EXCLUDED.coverage_level`,
          [
            mapping.techniqueId,
            mapping.techniqueName,
            mapping.framework,
            mapping.controlId,
            mapping.controlTitle,
            mapping.controlDescription,
            mapping.mappingRationale,
            mapping.coverageLevel,
          ]
        );
        imported++;
      } catch (error) {
        console.error(`Failed to import mapping for ${mapping.techniqueId}:`, error);
        failed++;
      }
    }

    // Reload mappings
    await this.loadMappings();

    return { imported, failed };
  }

  /**
   * Get compliance controls for framework
   */
  async getControlsForFramework(framework: ComplianceFramework, category?: string): Promise<ComplianceControl[]> {
    let query = 'SELECT * FROM compliance_controls WHERE framework = $1';
    const params: any[] = [framework];

    if (category) {
      query += ' AND category = $2';
      params.push(category);
    }

    query += ' ORDER BY control_id';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Save compliance report
   */
  async saveComplianceReport(report: ComplianceReport): Promise<string> {
    const result = await this.pool.query(
      `INSERT INTO compliance_reports (
        job_id, framework, overall_score, control_coverage,
        gaps_by_category, recommendations, generated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        report.jobId,
        report.framework,
        report.overallScore,
        JSON.stringify(report.controlCoverage),
        JSON.stringify(report.gapsByCategory),
        JSON.stringify(report.recommendations),
        report.generatedAt,
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Get compliance reports for job
   */
  async getReportsForJob(jobId: string): Promise<ComplianceReport[]> {
    const result = await this.pool.query(
      'SELECT * FROM compliance_reports WHERE job_id = $1 ORDER BY generated_at DESC',
      [jobId]
    );

    return result.rows.map(row => ({
      framework: row.framework,
      jobId: row.job_id,
      generatedAt: row.generated_at,
      overallScore: row.overall_score,
      controlCoverage: row.control_coverage,
      gapsByCategory: row.gaps_by_category,
      recommendations: row.recommendations,
    }));
  }
}

export default ComplianceMappingService;
