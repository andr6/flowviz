export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  description: string;
  organization: string;
  publishedDate: Date;
  lastUpdated: Date;
  domains: ComplianceDomain[];
  totalControls: number;
  applicableIndustries: string[];
  certificationRequired: boolean;
  auditFrequency: 'annual' | 'biannual' | 'quarterly' | 'monthly';
  documentation: {
    officialUrl: string;
    implementationGuideUrl?: string;
    assessmentToolUrl?: string;
  };
}

export interface ComplianceDomain {
  id: string;
  name: string;
  description: string;
  controls: ComplianceControl[];
  weight: number;
}

export interface ComplianceControl {
  id: string;
  frameworkId: string;
  domainId: string;
  number: string;
  title: string;
  description: string;
  category: 'administrative' | 'technical' | 'physical';
  level: 'basic' | 'intermediate' | 'advanced';
  priority: 'low' | 'medium' | 'high' | 'critical';
  implementationGuidance: string;
  testingProcedures: string[];
  evidenceRequirements: string[];
  relatedControls: string[];
  mitreTechniques?: string[];
  cisControls?: string[];
  dependencies: string[];
  automatable: boolean;
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
}

export interface ComplianceAssessment {
  id: string;
  frameworkId: string;
  name: string;
  description: string;
  scope: AssessmentScope;
  assessmentType: 'self' | 'internal' | 'external' | 'certification';
  startDate: Date;
  endDate?: Date;
  status: 'planning' | 'in-progress' | 'review' | 'completed' | 'certified';
  assessors: Assessor[];
  findings: ComplianceFinding[];
  overallScore: number;
  riskRating: 'low' | 'medium' | 'high' | 'critical';
  nextAssessment?: Date;
  reportUrl?: string;
  certificationExpiry?: Date;
}

export interface AssessmentScope {
  businessUnits: string[];
  systems: string[];
  locations: string[];
  processes: string[];
  dataTypes: string[];
  excludedAreas?: string[];
  rationaleForExclusions?: string;
}

export interface Assessor {
  id: string;
  name: string;
  role: 'lead' | 'technical' | 'business' | 'external';
  qualifications: string[];
  contactInfo: {
    email: string;
    phone?: string;
  };
}

export interface ComplianceFinding {
  id: string;
  assessmentId: string;
  controlId: string;
  status: 'compliant' | 'partial' | 'non-compliant' | 'not-applicable' | 'not-tested';
  maturityLevel: 1 | 2 | 3 | 4 | 5;
  score: number;
  evidence: Evidence[];
  gaps: ComplianceGap[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  businessImpact: string;
  estimatedCost?: number;
  timeframe: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
  assignedTo?: string;
  dueDate?: Date;
  lastReviewDate: Date;
  nextReviewDate: Date;
}

export interface Evidence {
  id: string;
  type: 'document' | 'screenshot' | 'configuration' | 'log' | 'interview' | 'observation';
  title: string;
  description: string;
  source: string;
  collectedDate: Date;
  fileUrl?: string;
  metadata?: Record<string, any>;
  reviewer?: string;
  reviewDate?: Date;
  approved: boolean;
}

export interface ComplianceGap {
  id: string;
  description: string;
  type: 'policy' | 'procedure' | 'technical' | 'training' | 'governance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  currentState: string;
  targetState: string;
  remediationActions: RemediationAction[];
  riskExposure: string;
  compensatingControls?: string[];
}

export interface RemediationAction {
  id: string;
  description: string;
  category: 'policy' | 'technical' | 'process' | 'training' | 'governance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  cost: 'low' | 'medium' | 'high';
  timeframe: 'immediate' | '1-month' | '3-months' | '6-months' | '12-months';
  assignedTo?: string;
  status: 'planned' | 'in-progress' | 'blocked' | 'completed' | 'deferred';
  startDate?: Date;
  targetDate?: Date;
  completedDate?: Date;
  dependencies: string[];
  successCriteria: string[];
  progress: number;
}

export interface ComplianceMapping {
  id: string;
  name: string;
  description: string;
  sourceFramework: string;
  targetFrameworks: string[];
  mappings: ControlMapping[];
  mappingType: 'direct' | 'partial' | 'conceptual' | 'gap-analysis';
  confidence: number;
  createdBy: string;
  createdDate: Date;
  lastUpdated: Date;
  reviewedBy?: string;
  reviewDate?: Date;
  approved: boolean;
  usage: MappingUsage[];
}

export interface ControlMapping {
  sourceControlId: string;
  targetMappings: TargetMapping[];
  mappingRationale: string;
  confidence: number;
  reviewRequired: boolean;
  lastReviewed?: Date;
}

export interface TargetMapping {
  frameworkId: string;
  controlId: string;
  relationship: 'equivalent' | 'subset' | 'superset' | 'related' | 'contradictory';
  coverage: number;
  notes?: string;
}

export interface MappingUsage {
  context: string;
  usedBy: string;
  usageDate: Date;
  feedback?: string;
  rating?: number;
}

export interface ComplianceDashboard {
  overallCompliance: number;
  frameworkStatus: FrameworkStatus[];
  riskDistribution: RiskDistribution;
  assessmentProgress: AssessmentProgress[];
  upcomingDeadlines: ComplianceDeadline[];
  trendsData: ComplianceTrend[];
  topRisks: ComplianceRisk[];
  remediationProgress: RemediationProgress[];
}

export interface FrameworkStatus {
  frameworkId: string;
  frameworkName: string;
  compliance: number;
  totalControls: number;
  compliantControls: number;
  partialControls: number;
  nonCompliantControls: number;
  notApplicableControls: number;
  lastAssessment: Date;
  nextAssessment: Date;
  certification?: {
    status: 'certified' | 'pending' | 'expired' | 'not-certified';
    validUntil?: Date;
    certifyingBody?: string;
  };
}

export interface RiskDistribution {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface AssessmentProgress {
  assessmentId: string;
  frameworkName: string;
  progress: number;
  status: string;
  startDate: Date;
  expectedEndDate: Date;
  assignedAssessors: number;
  completedControls: number;
  totalControls: number;
}

export interface ComplianceDeadline {
  id: string;
  type: 'assessment' | 'remediation' | 'certification' | 'audit';
  title: string;
  framework: string;
  dueDate: Date;
  status: 'on-track' | 'at-risk' | 'overdue';
  assignedTo: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ComplianceTrend {
  date: string;
  overallCompliance: number;
  frameworks: Record<string, number>;
  newFindings: number;
  resolvedFindings: number;
  riskReduction: number;
}

export interface ComplianceRisk {
  id: string;
  description: string;
  framework: string;
  controlId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  likelihood: number;
  impact: number;
  riskScore: number;
  businessImpact: string;
  mitigationStatus: 'planned' | 'in-progress' | 'mitigated' | 'accepted';
  owner: string;
  dueDate?: Date;
}

export interface RemediationProgress {
  gapId: string;
  title: string;
  framework: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  status: 'planned' | 'in-progress' | 'blocked' | 'completed' | 'deferred';
  assignedTo: string;
  targetDate: Date;
  estimatedCost: number;
  actualCost?: number;
}

export interface ComplianceReport {
  id: string;
  type: 'assessment' | 'gap-analysis' | 'certification' | 'executive-summary';
  framework: string;
  title: string;
  generatedDate: Date;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  scope: AssessmentScope;
  executiveSummary: string;
  findings: ComplianceFinding[];
  recommendations: string[];
  appendices: ReportAppendix[];
  generatedBy: string;
  reviewedBy?: string;
  approvedBy?: string;
  confidentiality: 'public' | 'internal' | 'confidential' | 'restricted';
  format: 'pdf' | 'html' | 'docx';
  fileUrl?: string;
}

export interface ReportAppendix {
  id: string;
  title: string;
  type: 'evidence' | 'procedures' | 'documentation' | 'technical-details';
  content: string;
  attachments?: string[];
}