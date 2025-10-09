export interface Case {
  id: string;
  organizationId: string;
  caseNumber: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  priority: 1 | 2 | 3 | 4 | 5; // 1 = highest
  status: CaseStatus;
  category: CaseCategory;
  subCategory?: string;
  
  // Assignment and ownership
  assignedTo?: string;
  teamAssigned?: string;
  createdBy: string;
  
  // Timeline
  createdAt: string;
  updatedAt: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  
  // SLA and metrics
  slaDeadline?: string;
  escalationLevel: number;
  timeToFirstResponse?: number; // minutes
  timeToResolution?: number; // minutes
  
  // Relations
  parentCaseId?: string;
  childCaseIds: string[];
  relatedCaseIds: string[];
  linkedAlertIds: string[];
  linkedInvestigationIds: string[];
  
  // Evidence and artifacts
  evidence: Evidence[];
  artifacts: Artifact[];
  indicators: CaseIndicator[];
  
  // Workflow and tasks
  workflow?: CaseWorkflow;
  tasks: CaseTask[];
  
  // Communication
  communications: CaseCommunication[];
  stakeholders: CaseStakeholder[];
  
  // Compliance and legal
  complianceFlags: string[];
  legalHold: boolean;
  retentionPeriod?: number; // days
  
  // Metadata
  tags: string[];
  customFields: Record<string, any>;
  mitreAttackTechniques: string[];
  affectedSystems: string[];
  
  // Resolution
  rootCause?: string;
  resolution?: string;
  lessonsLearned?: string[];
  preventiveMeasures?: string[];
}

export type CaseStatus = 
  | 'new'
  | 'assigned'
  | 'in_progress'
  | 'waiting_for_info'
  | 'escalated'
  | 'resolved'
  | 'closed'
  | 'cancelled';

export type CaseCategory = 
  | 'malware'
  | 'phishing'
  | 'data_breach'
  | 'unauthorized_access'
  | 'denial_of_service'
  | 'insider_threat'
  | 'policy_violation'
  | 'system_compromise'
  | 'network_intrusion'
  | 'social_engineering'
  | 'fraud'
  | 'compliance_violation'
  | 'other';

export interface Evidence {
  id: string;
  type: 'file' | 'log' | 'screenshot' | 'memory_dump' | 'network_capture' | 'document' | 'other';
  name: string;
  description: string;
  filePath?: string;
  hash?: string;
  size?: number;
  mimeType?: string;
  collectedBy: string;
  collectedAt: string;
  chainOfCustody: ChainOfCustodyEntry[];
  tags: string[];
  metadata: Record<string, any>;
}

export interface ChainOfCustodyEntry {
  timestamp: string;
  action: 'collected' | 'transferred' | 'analyzed' | 'stored' | 'accessed';
  userId: string;
  location: string;
  notes?: string;
}

export interface Artifact {
  id: string;
  type: 'ioc' | 'tool_output' | 'report' | 'timeline' | 'analysis' | 'other';
  name: string;
  description: string;
  content: any;
  createdBy: string;
  createdAt: string;
  tags: string[];
  metadata: Record<string, any>;
}

export interface CaseIndicator {
  id: string;
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'registry_key' | 'file_path' | 'process' | 'other';
  value: string;
  context: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  source: string;
  firstSeen: string;
  lastSeen: string;
  threatIntelligence?: {
    reputation: 'benign' | 'suspicious' | 'malicious';
    sources: string[];
    campaigns?: string[];
    malwareFamilies?: string[];
  };
  tags: string[];
}

export interface CaseTask {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  priority: 1 | 2 | 3;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  dueDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  dependencies: string[]; // task IDs
  deliverables: string[];
  notes: string;
}

export type TaskType = 
  | 'investigation'
  | 'containment'
  | 'eradication'
  | 'recovery'
  | 'communication'
  | 'documentation'
  | 'forensics'
  | 'legal'
  | 'compliance'
  | 'monitoring'
  | 'other';

export interface CaseWorkflow {
  id: string;
  name: string;
  version: string;
  stages: WorkflowStage[];
  currentStage: string;
  transitions: WorkflowTransition[];
  automationRules: AutomationRule[];
}

export interface WorkflowStage {
  id: string;
  name: string;
  description: string;
  requiredRoles: string[];
  requiredTasks: string[];
  slaHours?: number;
  approvals: ApprovalRequirement[];
  notifications: NotificationRule[];
}

export interface WorkflowTransition {
  fromStage: string;
  toStage: string;
  conditions: TransitionCondition[];
  automatedActions: AutomatedAction[];
}

export interface TransitionCondition {
  type: 'task_completed' | 'approval_received' | 'time_elapsed' | 'field_value' | 'custom';
  parameters: Record<string, any>;
}

export interface AutomatedAction {
  type: 'assign_user' | 'send_notification' | 'create_task' | 'update_field' | 'escalate' | 'integrate_siem';
  parameters: Record<string, any>;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomatedAction[];
  isEnabled: boolean;
}

export interface AutomationTrigger {
  type: 'case_created' | 'case_updated' | 'task_completed' | 'time_based' | 'field_changed';
  parameters: Record<string, any>;
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'in' | 'regex';
  value: any;
}

export interface ApprovalRequirement {
  id: string;
  type: 'manager' | 'legal' | 'compliance' | 'technical_lead' | 'external';
  requiredRole: string;
  description: string;
  isRequired: boolean;
}

export interface NotificationRule {
  id: string;
  trigger: 'stage_entry' | 'stage_exit' | 'sla_warning' | 'escalation';
  recipients: NotificationRecipient[];
  template: string;
  channels: NotificationChannel[];
}

export interface NotificationRecipient {
  type: 'user' | 'role' | 'team' | 'external';
  identifier: string;
}

export type NotificationChannel = 'email' | 'slack' | 'teams' | 'webhook' | 'sms';

export interface CaseCommunication {
  id: string;
  type: 'note' | 'email' | 'call' | 'meeting' | 'external' | 'system';
  subject?: string;
  content: string;
  author: string;
  recipients?: string[];
  direction: 'inbound' | 'outbound' | 'internal';
  timestamp: string;
  isPrivate: boolean;
  attachments: string[];
  linkedEvidence: string[];
  tags: string[];
}

export interface CaseStakeholder {
  id: string;
  userId: string;
  role: StakeholderRole;
  department?: string;
  contactInfo: ContactInfo;
  permissions: StakeholderPermission[];
  addedBy: string;
  addedAt: string;
  notificationPreferences: NotificationPreferences;
}

export type StakeholderRole = 
  | 'primary_investigator'
  | 'secondary_investigator'
  | 'case_manager'
  | 'legal_counsel'
  | 'compliance_officer'
  | 'business_owner'
  | 'technical_contact'
  | 'external_consultant'
  | 'management'
  | 'observer';

export interface ContactInfo {
  email: string;
  phone?: string;
  alternateEmail?: string;
  preferredContact: 'email' | 'phone' | 'slack' | 'teams';
}

export interface StakeholderPermission {
  action: 'view' | 'edit' | 'comment' | 'approve' | 'close' | 'delete';
  scope: 'case' | 'evidence' | 'communications' | 'tasks' | 'workflow';
}

export interface NotificationPreferences {
  channels: NotificationChannel[];
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  eventTypes: string[];
  quietHours?: {
    start: string; // HH:mm
    end: string; // HH:mm
    timezone: string;
  };
}

export interface CaseMetrics {
  totalCases: number;
  openCases: number;
  resolvedCases: number;
  avgTimeToResolution: number; // hours
  avgTimeToFirstResponse: number; // hours
  slaComplianceRate: number; // percentage
  escalationRate: number; // percentage
  casesByCategory: Record<CaseCategory, number>;
  casesBySeverity: Record<string, number>;
  casesByStatus: Record<CaseStatus, number>;
  topInvestigators: Array<{
    userId: string;
    caseCount: number;
    avgResolutionTime: number;
  }>;
  trendsOverTime: Array<{
    period: string;
    newCases: number;
    resolvedCases: number;
    avgResolutionTime: number;
  }>;
}

export interface CaseTemplate {
  id: string;
  name: string;
  description: string;
  category: CaseCategory;
  defaultSeverity: Case['severity'];
  defaultPriority: Case['priority'];
  defaultWorkflowId?: string;
  defaultTasks: Omit<CaseTask, 'id' | 'createdAt' | 'createdBy'>[];
  requiredFields: string[];
  customFields: Array<{
    name: string;
    type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';
    options?: string[];
    required: boolean;
    defaultValue?: any;
  }>;
  stakeholderRoles: StakeholderRole[];
  complianceRequirements: string[];
  tags: string[];
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}