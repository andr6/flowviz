import { EventEmitter } from 'events';
import type {
  ExecutiveDashboardData,
  SecurityMetric,
  ThreatTrendData,
  SOCPerformanceMetric,
  SecurityPosture,
  IncidentSummary,
  ThreatLandscape,
  ComplianceStatus,
  DashboardFilter,
  AlertConfiguration
} from '../types/ExecutiveDashboard';

export class ReportingService extends EventEmitter {
  private dashboardData: ExecutiveDashboardData | null = null;
  private filters: DashboardFilter;
  private alertConfigs: Map<string, AlertConfiguration> = new Map();
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.filters = {
      timeRange: '30d',
      severity: [],
      businessUnit: [],
      assetTypes: [],
      complianceFrameworks: []
    };
    this.startAutoRefresh();
  }

  async generateExecutiveDashboard(filters?: DashboardFilter): Promise<ExecutiveDashboardData> {
    if (filters) {
      this.filters = { ...this.filters, ...filters };
    }

    const [
      securityMetrics,
      threatTrends,
      socPerformance,
      securityPosture,
      incidentSummary,
      threatLandscape,
      complianceStatus
    ] = await Promise.all([
      this.calculateSecurityMetrics(),
      this.generateThreatTrends(),
      this.calculateSOCPerformance(),
      this.assessSecurityPosture(),
      this.generateIncidentSummary(),
      this.analyzeThreatLandscape(),
      this.getComplianceStatus()
    ]);

    this.dashboardData = {
      securityMetrics,
      threatTrends,
      socPerformance,
      securityPosture,
      incidentSummary,
      threatLandscape,
      complianceStatus,
      lastRefresh: new Date()
    };

    this.emit('dashboardUpdated', this.dashboardData);
    this.checkAlertThresholds();

    return this.dashboardData;
  }

  private async calculateSecurityMetrics(): Promise<SecurityMetric[]> {
    const timeRange = this.getTimeRangeMs();
    const currentPeriod = await this.fetchMetricsData(timeRange);
    const previousPeriod = await this.fetchMetricsData(timeRange, timeRange);

    return [
      {
        id: 'total-threats',
        name: 'Total Threats Detected',
        value: currentPeriod.totalThreats || 1247,
        previousValue: previousPeriod.totalThreats || 1156,
        trend: this.calculateTrend(currentPeriod.totalThreats || 1247, previousPeriod.totalThreats || 1156),
        trendPercentage: this.calculateTrendPercentage(1247, 1156),
        severity: 'medium',
        description: 'Total security threats detected across all systems',
        lastUpdated: new Date()
      },
      {
        id: 'critical-alerts',
        name: 'Critical Alerts',
        value: currentPeriod.criticalAlerts || 23,
        previousValue: previousPeriod.criticalAlerts || 31,
        trend: this.calculateTrend(23, 31),
        trendPercentage: this.calculateTrendPercentage(23, 31),
        severity: 'critical',
        description: 'High-priority security alerts requiring immediate attention',
        lastUpdated: new Date()
      },
      {
        id: 'mttr',
        name: 'Mean Time to Response',
        value: '14.2 min',
        previousValue: '18.7 min',
        trend: 'down',
        trendPercentage: 24.1,
        severity: 'low',
        description: 'Average time from alert generation to first response',
        lastUpdated: new Date()
      },
      {
        id: 'security-score',
        name: 'Security Posture Score',
        value: 847,
        previousValue: 823,
        trend: 'up',
        trendPercentage: 2.9,
        unit: '/1000',
        severity: 'medium',
        description: 'Overall security posture based on multiple factors',
        lastUpdated: new Date()
      },
      {
        id: 'compliance-rate',
        name: 'Compliance Rate',
        value: '94.2%',
        previousValue: '91.8%',
        trend: 'up',
        trendPercentage: 2.6,
        severity: 'low',
        description: 'Percentage of controls meeting compliance requirements',
        lastUpdated: new Date()
      },
      {
        id: 'false-positive-rate',
        name: 'False Positive Rate',
        value: '8.3%',
        previousValue: '12.1%',
        trend: 'down',
        trendPercentage: 31.4,
        severity: 'low',
        description: 'Percentage of alerts determined to be false positives',
        lastUpdated: new Date()
      }
    ];
  }

  private async generateThreatTrends(): Promise<ThreatTrendData[]> {
    const days = this.getTimeRangeDays();
    const trends: ThreatTrendData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        totalThreats: Math.floor(Math.random() * 100) + 50,
        criticalThreats: Math.floor(Math.random() * 10) + 2,
        highThreats: Math.floor(Math.random() * 20) + 8,
        mediumThreats: Math.floor(Math.random() * 30) + 15,
        lowThreats: Math.floor(Math.random() * 40) + 25,
        resolvedThreats: Math.floor(Math.random() * 80) + 40,
        falsePositives: Math.floor(Math.random() * 15) + 5
      });
    }
    
    return trends;
  }

  private async calculateSOCPerformance(): Promise<SOCPerformanceMetric[]> {
    const generateTrendData = (base: number, variance: number, days: number) => {
      const trends = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        trends.push({
          timestamp: date,
          value: base + (Math.random() - 0.5) * variance
        });
      }
      return trends;
    };

    return [
      {
        metric: 'Mean Time to Detection (MTTD)',
        current: 8.3,
        target: 10.0,
        unit: 'minutes',
        status: 'on-track',
        trend: generateTrendData(8.3, 3, 30)
      },
      {
        metric: 'Mean Time to Response (MTTR)',
        current: 14.2,
        target: 15.0,
        unit: 'minutes',
        status: 'on-track',
        trend: generateTrendData(14.2, 5, 30)
      },
      {
        metric: 'Alert Accuracy Rate',
        current: 91.7,
        target: 90.0,
        unit: '%',
        status: 'on-track',
        trend: generateTrendData(91.7, 8, 30)
      },
      {
        metric: 'Threat Coverage',
        current: 96.4,
        target: 95.0,
        unit: '%',
        status: 'on-track',
        trend: generateTrendData(96.4, 3, 30)
      },
      {
        metric: 'SOC Analyst Efficiency',
        current: 78.2,
        target: 80.0,
        unit: '%',
        status: 'warning',
        trend: generateTrendData(78.2, 10, 30)
      }
    ];
  }

  private async assessSecurityPosture(): Promise<SecurityPosture> {
    return {
      overall: 84.7,
      categories: {
        identity: 89.2,
        endpoints: 82.1,
        network: 86.5,
        data: 81.8,
        applications: 84.9
      },
      improvements: [
        'Implement MFA for all admin accounts',
        'Update endpoint protection policies',
        'Enhance network segmentation',
        'Improve data classification coverage'
      ],
      risks: [
        'Legacy systems without security updates',
        'Excessive privileged access',
        'Unencrypted data in transit',
        'Weak password policies in some departments'
      ]
    };
  }

  private async generateIncidentSummary(): Promise<IncidentSummary> {
    return {
      total: 1247,
      open: 23,
      resolved: 1224,
      averageResolutionTime: 14.2,
      mttr: 14.2,
      mttd: 8.3,
      severityBreakdown: {
        critical: 23,
        high: 89,
        medium: 342,
        low: 793
      }
    };
  }

  private async analyzeThreatLandscape(): Promise<ThreatLandscape> {
    return {
      topThreats: [
        { name: 'Phishing', count: 234, severity: 'high', trend: 'increasing' },
        { name: 'Malware', count: 187, severity: 'critical', trend: 'stable' },
        { name: 'Ransomware', count: 67, severity: 'critical', trend: 'decreasing' },
        { name: 'Data Exfiltration', count: 45, severity: 'high', trend: 'increasing' },
        { name: 'Insider Threat', count: 23, severity: 'medium', trend: 'stable' }
      ],
      attackVectors: [
        { vector: 'Email', percentage: 42.3, incidents: 527 },
        { vector: 'Web Applications', percentage: 28.7, incidents: 358 },
        { vector: 'Network', percentage: 18.9, incidents: 236 },
        { vector: 'USB/Removable Media', percentage: 6.2, incidents: 77 },
        { vector: 'Social Engineering', percentage: 3.9, incidents: 49 }
      ],
      geographicDistribution: [
        { country: 'United States', threatCount: 423, riskLevel: 'medium' },
        { country: 'China', threatCount: 287, riskLevel: 'high' },
        { country: 'Russia', threatCount: 156, riskLevel: 'high' },
        { country: 'North Korea', threatCount: 89, riskLevel: 'critical' },
        { country: 'Iran', threatCount: 67, riskLevel: 'high' }
      ]
    };
  }

  private async getComplianceStatus(): Promise<ComplianceStatus[]> {
    return [
      {
        framework: 'NIST Cybersecurity Framework',
        overallScore: 94.2,
        controlsTotal: 108,
        controlsCompliant: 102,
        controlsPartial: 4,
        controlsNonCompliant: 2,
        lastAssessment: new Date('2024-09-15'),
        nextAssessment: new Date('2024-12-15'),
        criticalGaps: ['Incident Response Plan Update', 'Supply Chain Risk Management']
      },
      {
        framework: 'ISO 27001',
        overallScore: 91.8,
        controlsTotal: 114,
        controlsCompliant: 105,
        controlsPartial: 6,
        controlsNonCompliant: 3,
        lastAssessment: new Date('2024-08-20'),
        nextAssessment: new Date('2024-11-20'),
        criticalGaps: ['Access Control Review', 'Vulnerability Management', 'Business Continuity']
      },
      {
        framework: 'SOC 2 Type II',
        overallScore: 96.7,
        controlsTotal: 67,
        controlsCompliant: 65,
        controlsPartial: 2,
        controlsNonCompliant: 0,
        lastAssessment: new Date('2024-09-01'),
        nextAssessment: new Date('2025-03-01'),
        criticalGaps: ['Monitoring Controls Enhancement']
      }
    ];
  }

  private async fetchMetricsData(timeRange: number, offset: number = 0): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      totalThreats: Math.floor(Math.random() * 2000) + 1000,
      criticalAlerts: Math.floor(Math.random() * 50) + 10
    };
  }

  private calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'up' : 'down';
  }

  private calculateTrendPercentage(current: number, previous: number): number {
    return Math.abs(((current - previous) / previous) * 100);
  }

  private getTimeRangeMs(): number {
    const ranges = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000
    };
    return ranges[this.filters.timeRange];
  }

  private getTimeRangeDays(): number {
    const ranges = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    return ranges[this.filters.timeRange];
  }

  private checkAlertThresholds(): void {
    if (!this.dashboardData) return;

    this.dashboardData.securityMetrics.forEach(metric => {
      const config = this.alertConfigs.get(metric.id);
      if (!config || !config.enabled) return;

      const value = typeof metric.value === 'number' ? metric.value : parseFloat(metric.value.toString());
      
      if (value >= config.thresholds.critical) {
        this.emit('criticalAlert', { metric, level: 'critical', config });
      } else if (value >= config.thresholds.warning) {
        this.emit('alert', { metric, level: 'warning', config });
      }
    });
  }

  private startAutoRefresh(): void {
    this.refreshInterval = setInterval(() => {
      this.generateExecutiveDashboard();
    }, 5 * 60 * 1000); // Refresh every 5 minutes
  }

  public configureAlert(config: AlertConfiguration): void {
    this.alertConfigs.set(config.metricId, config);
    this.emit('alertConfigured', config);
  }

  public getAlertConfiguration(metricId: string): AlertConfiguration | undefined {
    return this.alertConfigs.get(metricId);
  }

  public getDashboardData(): ExecutiveDashboardData | null {
    return this.dashboardData;
  }

  public updateFilters(filters: Partial<DashboardFilter>): void {
    this.filters = { ...this.filters, ...filters };
    this.generateExecutiveDashboard();
  }

  public exportDashboard(format: 'pdf' | 'excel' | 'json'): Promise<Blob> {
    return new Promise((resolve) => {
      const data = JSON.stringify(this.dashboardData, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      resolve(blob);
    });
  }

  public dispose(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.removeAllListeners();
  }
}