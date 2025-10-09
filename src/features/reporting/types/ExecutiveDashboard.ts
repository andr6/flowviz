export interface SecurityMetric {
  id: string;
  name: string;
  value: number | string;
  previousValue?: number | string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage?: number;
  unit?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  lastUpdated: Date;
}

export interface ThreatTrendData {
  date: string;
  totalThreats: number;
  criticalThreats: number;
  highThreats: number;
  mediumThreats: number;
  lowThreats: number;
  resolvedThreats: number;
  falsePositives: number;
}

export interface SOCPerformanceMetric {
  metric: string;
  current: number;
  target: number;
  unit: string;
  status: 'on-track' | 'warning' | 'critical';
  trend: TrendData[];
}

export interface TrendData {
  timestamp: Date;
  value: number;
}

export interface SecurityPosture {
  overall: number;
  categories: {
    identity: number;
    endpoints: number;
    network: number;
    data: number;
    applications: number;
  };
  improvements: string[];
  risks: string[];
}

export interface IncidentSummary {
  total: number;
  open: number;
  resolved: number;
  averageResolutionTime: number;
  mttr: number;
  mttd: number;
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface ThreatLandscape {
  topThreats: Array<{
    name: string;
    count: number;
    severity: string;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  attackVectors: Array<{
    vector: string;
    percentage: number;
    incidents: number;
  }>;
  geographicDistribution: Array<{
    country: string;
    threatCount: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

export interface ComplianceStatus {
  framework: string;
  overallScore: number;
  controlsTotal: number;
  controlsCompliant: number;
  controlsPartial: number;
  controlsNonCompliant: number;
  lastAssessment: Date;
  nextAssessment: Date;
  criticalGaps: string[];
}

export interface ExecutiveDashboardData {
  securityMetrics: SecurityMetric[];
  threatTrends: ThreatTrendData[];
  socPerformance: SOCPerformanceMetric[];
  securityPosture: SecurityPosture;
  incidentSummary: IncidentSummary;
  threatLandscape: ThreatLandscape;
  complianceStatus: ComplianceStatus[];
  lastRefresh: Date;
}

export interface DashboardFilter {
  timeRange: '24h' | '7d' | '30d' | '90d' | '1y';
  severity?: string[];
  businessUnit?: string[];
  assetTypes?: string[];
  complianceFrameworks?: string[];
}

export interface AlertConfiguration {
  metricId: string;
  thresholds: {
    warning: number;
    critical: number;
  };
  enabled: boolean;
  notificationMethods: ('email' | 'sms' | 'slack' | 'webhook')[];
  recipients: string[];
}