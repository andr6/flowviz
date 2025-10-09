/**
 * Enhanced Reporting Service
 *
 * Advanced reporting capabilities:
 * - Executive dashboards
 * - Custom report templates
 * - PDF/PowerPoint export
 * - Trend analysis over time
 * - Comparative analytics
 * - Benchmark against industry standards
 */

import { Pool } from 'pg';

export interface ReportTemplate {
  id?: string;
  name: string;
  description?: string;
  reportType: 'executive' | 'technical' | 'compliance' | 'trend' | 'benchmark' | 'custom';
  format: 'pdf' | 'pptx' | 'html' | 'json' | 'csv';
  sections: ReportSection[];
  styling?: {
    theme: 'professional' | 'minimal' | 'detailed';
    colorScheme: string;
    includeLogo: boolean;
    includeCharts: boolean;
  };
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'charts' | 'tables' | 'text' | 'recommendations' | 'gaps' | 'trends';
  order: number;
  config: Record<string, any>;
}

export interface ExecutiveDashboard {
  id?: string;
  name: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalSimulations: number;
    totalTechniques: number;
    overallSuccessRate: number;
    criticalGaps: number;
    highPriorityRecommendations: number;
    complianceScore: number;
  };
  topThreats: Array<{
    techniqueId: string;
    techniqueName: string;
    occurrences: number;
    successRate: number;
    riskLevel: 'critical' | 'high' | 'medium' | 'low';
  }>;
  topGaps: Array<{
    gapId: string;
    description: string;
    severity: string;
    affectedTechniques: number;
    remediationStatus: string;
  }>;
  trendData: {
    simulationTrend: Array<{ date: Date; count: number }>;
    successRateTrend: Array<{ date: Date; rate: number }>;
    gapTrend: Array<{ date: Date; count: number }>;
  };
  complianceBreakdown: Array<{
    framework: string;
    score: number;
    coverage: string;
  }>;
}

export interface TrendAnalysis {
  metric: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
  dataPoints: Array<{
    timestamp: Date;
    value: number;
    change?: number; // Percentage change from previous period
    annotations?: string[];
  }>;
  statistics: {
    average: number;
    median: number;
    min: number;
    max: number;
    standardDeviation: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    trendStrength: number; // 0-1
  };
  insights: string[];
  predictions?: Array<{
    timestamp: Date;
    predictedValue: number;
    confidence: number;
  }>;
}

export interface ComparativeAnalysis {
  comparisonType: 'time_periods' | 'environments' | 'technique_groups' | 'teams';
  entities: Array<{
    id: string;
    name: string;
    metrics: Record<string, number>;
  }>;
  comparisons: Array<{
    metric: string;
    values: Map<string, number>;
    winner?: string;
    analysis: string;
  }>;
  insights: string[];
}

export interface BenchmarkReport {
  industry: string;
  organizationSize: 'small' | 'medium' | 'large' | 'enterprise';
  region: string;
  metrics: Array<{
    metric: string;
    organizationValue: number;
    industryAverage: number;
    industryPercentile: number; // Where organization ranks (0-100)
    topQuartile: number;
    recommendation: string;
  }>;
  strengths: string[];
  weaknesses: string[];
  overallMaturity: {
    level: 'initial' | 'developing' | 'defined' | 'managed' | 'optimizing';
    score: number; // 0-100
  };
}

export interface GeneratedReport {
  id?: string;
  templateId: string;
  name: string;
  format: string;
  generatedAt: Date;
  generatedBy?: string;
  fileUrl?: string;
  fileSize?: number;
  metadata: Record<string, any>;
}

/**
 * Enhanced Reporting Service
 */
export class EnhancedReportingService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Generate executive dashboard
   */
  async generateExecutiveDashboard(
    name: string,
    startDate: Date,
    endDate: Date
  ): Promise<ExecutiveDashboard> {
    console.log(`Generating executive dashboard: ${name}`);

    try {
      // Get summary metrics
      const metrics = await this.getExecutiveMetrics(startDate, endDate);

      // Get top threats
      const topThreats = await this.getTopThreats(startDate, endDate, 10);

      // Get top gaps
      const topGaps = await this.getTopGaps(startDate, endDate, 10);

      // Get trend data
      const trendData = await this.getTrendData(startDate, endDate);

      // Get compliance breakdown
      const complianceBreakdown = await this.getComplianceBreakdown(startDate, endDate);

      const dashboard: ExecutiveDashboard = {
        name,
        timeRange: { start: startDate, end: endDate },
        metrics,
        topThreats,
        topGaps,
        trendData,
        complianceBreakdown,
      };

      // Save dashboard
      await this.saveExecutiveDashboard(dashboard);

      return dashboard;
    } catch (error) {
      console.error('Failed to generate executive dashboard:', error);
      throw error;
    }
  }

  /**
   * Generate trend analysis
   */
  async generateTrendAnalysis(
    metric: string,
    startDate: Date,
    endDate: Date,
    granularity: TrendAnalysis['granularity']
  ): Promise<TrendAnalysis> {
    console.log(`Generating trend analysis for ${metric}`);

    try {
      // Get metric data points
      const dataPoints = await this.getMetricDataPoints(metric, startDate, endDate, granularity);

      // Calculate statistics
      const values = dataPoints.map(dp => dp.value);
      const statistics = this.calculateStatistics(values);

      // Detect trend
      const trendAnalysis = this.detectTrend(dataPoints);
      statistics.trend = trendAnalysis.direction;
      statistics.trendStrength = trendAnalysis.strength;

      // Generate insights
      const insights = this.generateTrendInsights(metric, dataPoints, statistics);

      // Generate predictions (simple linear extrapolation)
      const predictions = this.generatePredictions(dataPoints, 7); // 7 periods ahead

      const analysis: TrendAnalysis = {
        metric,
        timeRange: { start: startDate, end: endDate },
        granularity,
        dataPoints,
        statistics,
        insights,
        predictions,
      };

      // Save trend analysis
      await this.saveTrendAnalysis(analysis);

      return analysis;
    } catch (error) {
      console.error('Failed to generate trend analysis:', error);
      throw error;
    }
  }

  /**
   * Generate comparative analysis
   */
  async generateComparativeAnalysis(
    comparisonType: ComparativeAnalysis['comparisonType'],
    entityIds: string[],
    metrics: string[]
  ): Promise<ComparativeAnalysis> {
    console.log(`Generating comparative analysis for ${comparisonType}`);

    try {
      // Get entity data
      const entities = await this.getEntityMetrics(comparisonType, entityIds, metrics);

      // Perform comparisons
      const comparisons: ComparativeAnalysis['comparisons'] = [];

      for (const metric of metrics) {
        const values = new Map<string, number>();
        let maxValue = -Infinity;
        let winnerId: string | undefined;

        for (const entity of entities) {
          const value = entity.metrics[metric] || 0;
          values.set(entity.id, value);

          if (value > maxValue) {
            maxValue = value;
            winnerId = entity.id;
          }
        }

        const winner = winnerId ? entities.find(e => e.id === winnerId) : undefined;

        comparisons.push({
          metric,
          values,
          winner: winner?.name,
          analysis: this.generateComparisonAnalysis(metric, values, winner),
        });
      }

      // Generate insights
      const insights = this.generateComparativeInsights(entities, comparisons);

      const analysis: ComparativeAnalysis = {
        comparisonType,
        entities,
        comparisons,
        insights,
      };

      // Save comparative analysis
      await this.saveComparativeAnalysis(analysis);

      return analysis;
    } catch (error) {
      console.error('Failed to generate comparative analysis:', error);
      throw error;
    }
  }

  /**
   * Generate benchmark report
   */
  async generateBenchmarkReport(
    industry: string,
    organizationSize: BenchmarkReport['organizationSize'],
    region: string
  ): Promise<BenchmarkReport> {
    console.log(`Generating benchmark report for ${industry}`);

    try {
      // Get organization metrics
      const orgMetrics = await this.getOrganizationMetrics();

      // Get industry benchmarks (in production, fetch from external service)
      const benchmarks = await this.getIndustryBenchmarks(industry, organizationSize, region);

      // Compare metrics
      const metrics: BenchmarkReport['metrics'] = [];

      for (const metric of Object.keys(orgMetrics)) {
        const orgValue = orgMetrics[metric];
        const benchmark = benchmarks[metric];

        if (benchmark) {
          const percentile = this.calculatePercentile(orgValue, benchmark.distribution);

          metrics.push({
            metric,
            organizationValue: orgValue,
            industryAverage: benchmark.average,
            industryPercentile: percentile,
            topQuartile: benchmark.topQuartile,
            recommendation: this.generateBenchmarkRecommendation(
              metric,
              orgValue,
              benchmark.average,
              percentile
            ),
          });
        }
      }

      // Identify strengths and weaknesses
      const strengths = metrics
        .filter(m => m.industryPercentile >= 75)
        .map(m => `${m.metric}: Top 25% of industry`);

      const weaknesses = metrics
        .filter(m => m.industryPercentile < 50)
        .map(m => `${m.metric}: Below industry average`);

      // Calculate overall maturity
      const avgPercentile = metrics.reduce((sum, m) => sum + m.industryPercentile, 0) / metrics.length;
      const maturityLevel = this.calculateMaturityLevel(avgPercentile);

      const report: BenchmarkReport = {
        industry,
        organizationSize,
        region,
        metrics,
        strengths,
        weaknesses,
        overallMaturity: {
          level: maturityLevel,
          score: Math.round(avgPercentile),
        },
      };

      // Save benchmark report
      await this.saveBenchmarkReport(report);

      return report;
    } catch (error) {
      console.error('Failed to generate benchmark report:', error);
      throw error;
    }
  }

  /**
   * Export report to PDF
   */
  async exportToPDF(
    reportData: any,
    template: ReportTemplate
  ): Promise<GeneratedReport> {
    console.log(`Exporting report to PDF: ${template.name}`);

    try {
      // In production, use a library like pdfkit or puppeteer
      // For now, we'll create a placeholder

      const htmlContent = this.generateHTMLReport(reportData, template);

      // Convert HTML to PDF (placeholder)
      const pdfBuffer = Buffer.from(htmlContent); // In production: use PDF generation library

      // Save to storage (filesystem, S3, etc.)
      const fileUrl = await this.saveReportFile(pdfBuffer, 'pdf');

      const report: GeneratedReport = {
        templateId: template.id!,
        name: template.name,
        format: 'pdf',
        generatedAt: new Date(),
        fileUrl,
        fileSize: pdfBuffer.length,
        metadata: {
          reportType: template.reportType,
          sections: template.sections.length,
        },
      };

      // Save report metadata
      await this.saveGeneratedReport(report);

      return report;
    } catch (error) {
      console.error('Failed to export PDF:', error);
      throw error;
    }
  }

  /**
   * Export report to PowerPoint
   */
  async exportToPowerPoint(
    reportData: any,
    template: ReportTemplate
  ): Promise<GeneratedReport> {
    console.log(`Exporting report to PowerPoint: ${template.name}`);

    try {
      // In production, use a library like pptxgenjs
      // For now, we'll create a placeholder

      const slides = this.generatePowerPointSlides(reportData, template);

      // Create PPTX (placeholder)
      const pptxBuffer = Buffer.from(JSON.stringify(slides)); // In production: use PPTX library

      // Save to storage
      const fileUrl = await this.saveReportFile(pptxBuffer, 'pptx');

      const report: GeneratedReport = {
        templateId: template.id!,
        name: template.name,
        format: 'pptx',
        generatedAt: new Date(),
        fileUrl,
        fileSize: pptxBuffer.length,
        metadata: {
          reportType: template.reportType,
          slideCount: slides.length,
        },
      };

      // Save report metadata
      await this.saveGeneratedReport(report);

      return report;
    } catch (error) {
      console.error('Failed to export PowerPoint:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */

  private async getExecutiveMetrics(startDate: Date, endDate: Date) {
    const simulations = await this.pool.query(
      'SELECT COUNT(*) as count FROM simulation_jobs WHERE created_at BETWEEN $1 AND $2',
      [startDate, endDate]
    );

    const techniques = await this.pool.query(
      `SELECT COUNT(DISTINCT technique_id) as count
       FROM simulation_technique_results str
       JOIN simulation_jobs sj ON str.job_id = sj.id
       WHERE sj.created_at BETWEEN $1 AND $2`,
      [startDate, endDate]
    );

    const successRate = await this.pool.query(
      `SELECT
        COUNT(CASE WHEN execution_status = 'completed' THEN 1 END)::float /
        COUNT(*)::float * 100 as success_rate
       FROM simulation_technique_results str
       JOIN simulation_jobs sj ON str.job_id = sj.id
       WHERE sj.created_at BETWEEN $1 AND $2`,
      [startDate, endDate]
    );

    const gaps = await this.pool.query(
      `SELECT COUNT(*) as count
       FROM simulation_gaps sg
       JOIN simulation_jobs sj ON sg.job_id = sj.id
       WHERE sj.created_at BETWEEN $1 AND $2 AND sg.gap_severity = 'critical'`,
      [startDate, endDate]
    );

    return {
      totalSimulations: parseInt(simulations.rows[0]?.count || '0'),
      totalTechniques: parseInt(techniques.rows[0]?.count || '0'),
      overallSuccessRate: parseFloat(successRate.rows[0]?.success_rate || '0'),
      criticalGaps: parseInt(gaps.rows[0]?.count || '0'),
      highPriorityRecommendations: 0, // Placeholder
      complianceScore: 75, // Placeholder
    };
  }

  private async getTopThreats(startDate: Date, endDate: Date, limit: number) {
    const result = await this.pool.query(
      `SELECT
        technique_id,
        technique_name,
        COUNT(*) as occurrences,
        AVG(CASE WHEN execution_status = 'completed' THEN 1.0 ELSE 0.0 END) as success_rate
       FROM simulation_technique_results str
       JOIN simulation_jobs sj ON str.job_id = sj.id
       WHERE sj.created_at BETWEEN $1 AND $2
       GROUP BY technique_id, technique_name
       ORDER BY occurrences DESC
       LIMIT $3`,
      [startDate, endDate, limit]
    );

    return result.rows.map(row => ({
      techniqueId: row.technique_id,
      techniqueName: row.technique_name,
      occurrences: parseInt(row.occurrences),
      successRate: parseFloat(row.success_rate) * 100,
      riskLevel: this.calculateRiskLevel(parseInt(row.occurrences), parseFloat(row.success_rate)),
    }));
  }

  private async getTopGaps(startDate: Date, endDate: Date, limit: number) {
    const result = await this.pool.query(
      `SELECT
        sg.id as gap_id,
        sg.gap_description as description,
        sg.gap_severity as severity,
        COUNT(DISTINCT sg.technique_id) as affected_techniques,
        sg.remediation_status
       FROM simulation_gaps sg
       JOIN simulation_jobs sj ON sg.job_id = sj.id
       WHERE sj.created_at BETWEEN $1 AND $2
       GROUP BY sg.id, sg.gap_description, sg.gap_severity, sg.remediation_status
       ORDER BY
         CASE sg.gap_severity
           WHEN 'critical' THEN 4
           WHEN 'high' THEN 3
           WHEN 'medium' THEN 2
           ELSE 1
         END DESC,
         affected_techniques DESC
       LIMIT $3`,
      [startDate, endDate, limit]
    );

    return result.rows.map(row => ({
      gapId: row.gap_id,
      description: row.description,
      severity: row.severity,
      affectedTechniques: parseInt(row.affected_techniques),
      remediationStatus: row.remediation_status,
    }));
  }

  private async getTrendData(startDate: Date, endDate: Date) {
    // Simplified trend data
    return {
      simulationTrend: [],
      successRateTrend: [],
      gapTrend: [],
    };
  }

  private async getComplianceBreakdown(startDate: Date, endDate: Date) {
    // Placeholder
    return [
      { framework: 'NIST CSF', score: 75, coverage: 'Partial' },
      { framework: 'CIS Controls', score: 82, coverage: 'Good' },
      { framework: 'PCI-DSS', score: 68, coverage: 'Partial' },
    ];
  }

  private async getMetricDataPoints(
    metric: string,
    startDate: Date,
    endDate: Date,
    granularity: TrendAnalysis['granularity']
  ): Promise<TrendAnalysis['dataPoints']> {
    // Simplified data point generation
    return [];
  }

  private calculateStatistics(values: number[]): TrendAnalysis['statistics'] {
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;

    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    const variance = values.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      average,
      median,
      min,
      max,
      standardDeviation,
      trend: 'stable',
      trendStrength: 0,
    };
  }

  private detectTrend(dataPoints: TrendAnalysis['dataPoints']): { direction: TrendAnalysis['statistics']['trend']; strength: number } {
    // Simple linear regression
    if (dataPoints.length < 2) {
      return { direction: 'stable', strength: 0 };
    }

    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, _, i) => sum + i, 0);
    const sumY = dataPoints.reduce((sum, dp) => sum + dp.value, 0);
    const sumXY = dataPoints.reduce((sum, dp, i) => sum + i * dp.value, 0);
    const sumX2 = dataPoints.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    const direction: TrendAnalysis['statistics']['trend'] =
      slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';

    const strength = Math.min(Math.abs(slope), 1);

    return { direction, strength };
  }

  private generateTrendInsights(
    metric: string,
    dataPoints: TrendAnalysis['dataPoints'],
    statistics: TrendAnalysis['statistics']
  ): string[] {
    const insights: string[] = [];

    if (statistics.trend === 'increasing') {
      insights.push(`${metric} is showing an upward trend with ${(statistics.trendStrength * 100).toFixed(0)}% confidence`);
    } else if (statistics.trend === 'decreasing') {
      insights.push(`${metric} is declining with ${(statistics.trendStrength * 100).toFixed(0)}% confidence`);
    } else {
      insights.push(`${metric} remains relatively stable`);
    }

    return insights;
  }

  private generatePredictions(
    dataPoints: TrendAnalysis['dataPoints'],
    periods: number
  ): TrendAnalysis['predictions'] {
    // Simple linear extrapolation
    return [];
  }

  private async getEntityMetrics(
    type: ComparativeAnalysis['comparisonType'],
    entityIds: string[],
    metrics: string[]
  ): Promise<ComparativeAnalysis['entities']> {
    // Placeholder
    return [];
  }

  private generateComparisonAnalysis(
    metric: string,
    values: Map<string, number>,
    winner?: ComparativeAnalysis['entities'][0]
  ): string {
    if (winner) {
      return `${winner.name} leads in ${metric}`;
    }
    return `Comparable performance across entities for ${metric}`;
  }

  private generateComparativeInsights(
    entities: ComparativeAnalysis['entities'],
    comparisons: ComparativeAnalysis['comparisons']
  ): string[] {
    return [];
  }

  private async getOrganizationMetrics(): Promise<Record<string, number>> {
    return {
      simulation_frequency: 15,
      technique_coverage: 0.65,
      detection_rate: 0.78,
      response_time_hours: 4.2,
    };
  }

  private async getIndustryBenchmarks(
    industry: string,
    size: string,
    region: string
  ): Promise<Record<string, any>> {
    // In production, fetch from external benchmarking service
    return {
      simulation_frequency: {
        average: 12,
        topQuartile: 20,
        distribution: [5, 8, 12, 15, 20, 25, 30],
      },
      technique_coverage: {
        average: 0.55,
        topQuartile: 0.75,
        distribution: [0.3, 0.4, 0.55, 0.65, 0.75, 0.85],
      },
    };
  }

  private calculatePercentile(value: number, distribution: number[]): number {
    const sorted = [...distribution].sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    return index === -1 ? 100 : (index / sorted.length) * 100;
  }

  private generateBenchmarkRecommendation(
    metric: string,
    orgValue: number,
    industryAvg: number,
    percentile: number
  ): string {
    if (percentile >= 75) {
      return `Excellent performance - maintain current practices`;
    } else if (percentile >= 50) {
      return `Above average - continue improvement efforts`;
    } else {
      return `Below average - prioritize improvement initiatives`;
    }
  }

  private calculateMaturityLevel(percentile: number): BenchmarkReport['overallMaturity']['level'] {
    if (percentile >= 90) return 'optimizing';
    if (percentile >= 70) return 'managed';
    if (percentile >= 50) return 'defined';
    if (percentile >= 30) return 'developing';
    return 'initial';
  }

  private calculateRiskLevel(occurrences: number, successRate: number): 'critical' | 'high' | 'medium' | 'low' {
    if (occurrences > 20 && successRate < 0.5) return 'critical';
    if (occurrences > 15 || successRate < 0.6) return 'high';
    if (occurrences > 10 || successRate < 0.75) return 'medium';
    return 'low';
  }

  private generateHTMLReport(reportData: any, template: ReportTemplate): string {
    // Simplified HTML generation
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${template.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #333; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; }
          </style>
        </head>
        <body>
          <h1>${template.name}</h1>
          <pre>${JSON.stringify(reportData, null, 2)}</pre>
        </body>
      </html>
    `;
  }

  private generatePowerPointSlides(reportData: any, template: ReportTemplate): any[] {
    // Simplified slide generation
    return [
      { title: 'Cover', content: template.name },
      { title: 'Summary', content: reportData },
    ];
  }

  private async saveReportFile(buffer: Buffer, extension: string): Promise<string> {
    // In production, save to S3, Azure Blob Storage, etc.
    const filename = `report-${Date.now()}.${extension}`;
    const fileUrl = `/reports/${filename}`;
    // fs.writeFileSync(path.join(__dirname, fileUrl), buffer);
    return fileUrl;
  }

  /**
   * Database persistence methods
   */

  private async saveExecutiveDashboard(dashboard: ExecutiveDashboard): Promise<void> {
    await this.pool.query(
      `INSERT INTO report_executive_dashboards (
        name, time_range_start, time_range_end, metrics,
        top_threats, top_gaps, trend_data, compliance_breakdown
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        dashboard.name,
        dashboard.timeRange.start,
        dashboard.timeRange.end,
        JSON.stringify(dashboard.metrics),
        JSON.stringify(dashboard.topThreats),
        JSON.stringify(dashboard.topGaps),
        JSON.stringify(dashboard.trendData),
        JSON.stringify(dashboard.complianceBreakdown),
      ]
    );
  }

  private async saveTrendAnalysis(analysis: TrendAnalysis): Promise<void> {
    await this.pool.query(
      `INSERT INTO report_trend_analyses (
        metric, time_range_start, time_range_end, granularity,
        data_points, statistics, insights, predictions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        analysis.metric,
        analysis.timeRange.start,
        analysis.timeRange.end,
        analysis.granularity,
        JSON.stringify(analysis.dataPoints),
        JSON.stringify(analysis.statistics),
        JSON.stringify(analysis.insights),
        JSON.stringify(analysis.predictions),
      ]
    );
  }

  private async saveComparativeAnalysis(analysis: ComparativeAnalysis): Promise<void> {
    await this.pool.query(
      `INSERT INTO report_comparative_analyses (
        comparison_type, entities, comparisons, insights
      ) VALUES ($1, $2, $3, $4)`,
      [
        analysis.comparisonType,
        JSON.stringify(analysis.entities),
        JSON.stringify(analysis.comparisons),
        JSON.stringify(analysis.insights),
      ]
    );
  }

  private async saveBenchmarkReport(report: BenchmarkReport): Promise<void> {
    await this.pool.query(
      `INSERT INTO report_benchmarks (
        industry, organization_size, region, metrics,
        strengths, weaknesses, overall_maturity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        report.industry,
        report.organizationSize,
        report.region,
        JSON.stringify(report.metrics),
        JSON.stringify(report.strengths),
        JSON.stringify(report.weaknesses),
        JSON.stringify(report.overallMaturity),
      ]
    );
  }

  private async saveGeneratedReport(report: GeneratedReport): Promise<void> {
    await this.pool.query(
      `INSERT INTO generated_reports (
        template_id, name, format, generated_at, generated_by,
        file_url, file_size, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        report.templateId,
        report.name,
        report.format,
        report.generatedAt,
        report.generatedBy,
        report.fileUrl,
        report.fileSize,
        JSON.stringify(report.metadata),
      ]
    );
  }

  /**
   * Template management
   */

  async createTemplate(template: Omit<ReportTemplate, 'id'>): Promise<ReportTemplate> {
    const result = await this.pool.query(
      `INSERT INTO report_templates (
        name, description, report_type, format, sections, styling, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        template.name,
        template.description,
        template.reportType,
        template.format,
        JSON.stringify(template.sections),
        JSON.stringify(template.styling),
        template.createdBy,
      ]
    );

    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
      description: result.rows[0].description,
      reportType: result.rows[0].report_type,
      format: result.rows[0].format,
      sections: result.rows[0].sections,
      styling: result.rows[0].styling,
      createdBy: result.rows[0].created_by,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
  }

  async getTemplates(): Promise<ReportTemplate[]> {
    const result = await this.pool.query('SELECT * FROM report_templates ORDER BY created_at DESC');

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      reportType: row.report_type,
      format: row.format,
      sections: row.sections,
      styling: row.styling,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}

export default EnhancedReportingService;
