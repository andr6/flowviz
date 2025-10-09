import { EventEmitter } from 'events';
import { logger } from '../../../shared/utils/logger.js';
import { siemIntegrationService } from '../../../integrations/siem/SIEMIntegrationService.js';

export interface ThreatHunt {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  hypothesis: string;
  status: HuntStatus;
  priority: 1 | 2 | 3 | 4 | 5; // 1 = highest
  
  // Hunt metadata
  category: HuntCategory;
  techniques: string[]; // MITRE ATT&CK technique IDs
  platforms: string[]; // Windows, Linux, macOS, Network, etc.
  dataSources: string[]; // Process monitoring, Network traffic, File monitoring, etc.
  
  // Query and execution
  queries: HuntQuery[];
  currentQuery?: string;
  executionPlan: ExecutionStep[];
  
  // Timeline and tracking
  createdBy: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  scheduledFor?: string;
  
  // Results and findings
  findings: HuntFinding[];
  indicators: HuntIndicator[];
  confidence: number; // 0-1
  
  // Collaboration
  collaborators: HuntCollaborator[];
  comments: HuntComment[];
  
  // Settings
  isRecurring: boolean;
  recurringSchedule?: RecurringSchedule;
  alertThreshold?: number;
  notificationSettings: NotificationSettings;
  
  // Analytics
  analytics: HuntAnalytics;
  
  // Metadata
  tags: string[];
  customFields: Record<string, any>;
}

export type HuntStatus = 
  | 'draft'
  | 'scheduled'
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type HuntCategory =
  | 'apt_detection'
  | 'insider_threat'
  | 'malware_analysis'
  | 'lateral_movement'
  | 'data_exfiltration'
  | 'command_control'
  | 'persistence'
  | 'privilege_escalation'
  | 'defense_evasion'
  | 'discovery'
  | 'collection'
  | 'impact'
  | 'initial_access'
  | 'execution'
  | 'custom';

export interface HuntQuery {
  id: string;
  name: string;
  description: string;
  queryType: QueryType;
  queryLanguage: QueryLanguage;
  query: string;
  dataSource: string;
  timeRange: TimeRange;
  
  // Execution
  status: QueryStatus;
  executedAt?: string;
  executionTime?: number; // milliseconds
  
  // Results
  resultCount?: number;
  results?: QueryResult[];
  
  // Validation
  isValid: boolean;
  validationErrors: string[];
  
  // Dependencies
  dependsOn: string[]; // query IDs
  
  // Output
  outputFormat: 'table' | 'chart' | 'timeline' | 'network_graph';
  visualization?: VisualizationConfig;
}

export type QueryType = 
  | 'detection'
  | 'hunting'
  | 'investigation'
  | 'baseline'
  | 'correlation'
  | 'enrichment';

export type QueryLanguage =
  | 'splunk_spl'
  | 'kql' // Kusto Query Language (Sentinel, Defender)
  | 'sql'
  | 'elasticsearch_dsl'
  | 'sigma'
  | 'yara'
  | 'custom';

export type QueryStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface TimeRange {
  start: Date;
  end: Date;
  timezone: string;
}

export interface QueryResult {
  id: string;
  timestamp: Date;
  source: string;
  eventType: string;
  data: Record<string, any>;
  relevanceScore: number; // 0-1
  annotations: ResultAnnotation[];
}

export interface ResultAnnotation {
  id: string;
  type: 'ioc' | 'anomaly' | 'behavior' | 'note';
  content: string;
  author: string;
  timestamp: Date;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
}

export interface VisualizationConfig {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'timeline' | 'network' | 'geographic';
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  timeGranularity?: 'minute' | 'hour' | 'day' | 'week' | 'month';
  filters?: Record<string, any>;
  colorScheme?: string;
  interactive: boolean;
}

export interface ExecutionStep {
  id: string;
  name: string;
  description: string;
  type: 'query' | 'analysis' | 'enrichment' | 'validation' | 'notification';
  queryId?: string;
  dependsOn: string[];
  
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // milliseconds
  
  // Results
  output?: any;
  errors?: string[];
  
  // Configuration
  configuration: Record<string, any>;
  retryPolicy?: RetryPolicy;
}

export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number; // milliseconds
  backoffMultiplier: number;
  maxDelay: number; // milliseconds
}

export interface HuntFinding {
  id: string;
  huntId: string;
  queryId?: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  
  // MITRE ATT&CK mapping
  techniques: string[];
  tactics: string[];
  
  // Evidence
  evidence: FindingEvidence[];
  indicators: string[]; // IOC IDs
  affectedAssets: string[];
  
  // Timeline
  firstSeen: Date;
  lastSeen: Date;
  detectedAt: Date;
  
  // Classification
  category: FindingCategory;
  falsePositiveReason?: string;
  
  // Actions
  actions: FindingAction[];
  
  // Status tracking
  status: 'new' | 'investigating' | 'confirmed' | 'false_positive' | 'resolved';
  assignedTo?: string;
  
  // Metadata
  tags: string[];
  customFields: Record<string, any>;
}

export type FindingCategory =
  | 'malicious_activity'
  | 'suspicious_behavior'
  | 'policy_violation'
  | 'anomaly'
  | 'vulnerability'
  | 'misconfiguration'
  | 'intelligence_match';

export interface FindingEvidence {
  id: string;
  type: 'log_entry' | 'file' | 'network_flow' | 'process' | 'registry' | 'memory' | 'other';
  name: string;
  source: string;
  timestamp: Date;
  data: Record<string, any>;
  hash?: string;
  preservation: EvidencePreservation;
}

export interface EvidencePreservation {
  isPreserved: boolean;
  preservedAt?: Date;
  preservationMethod: 'copy' | 'hash' | 'snapshot' | 'live_collection';
  location: string;
  chainOfCustody: ChainOfCustodyEntry[];
}

export interface ChainOfCustodyEntry {
  timestamp: Date;
  action: 'collected' | 'transferred' | 'analyzed' | 'stored' | 'accessed';
  userId: string;
  location: string;
  notes?: string;
}

export interface FindingAction {
  id: string;
  type: 'contain' | 'investigate' | 'block' | 'alert' | 'escalate' | 'document';
  description: string;
  automated: boolean;
  executedAt?: Date;
  executedBy?: string;
  status: 'pending' | 'completed' | 'failed';
  result?: string;
}

export interface HuntIndicator {
  id: string;
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'filename' | 'registry_key' | 'process' | 'user_agent' | 'certificate' | 'mutex' | 'other';
  value: string;
  description: string;
  context: string;
  
  // Threat intelligence
  threatIntelligence?: {
    reputation: 'benign' | 'suspicious' | 'malicious';
    sources: string[];
    firstSeen?: Date;
    lastSeen?: Date;
    campaigns?: string[];
    malwareFamilies?: string[];
    actors?: string[];
  };
  
  // Tracking
  discoveredAt: Date;
  discoveredBy: string;
  confidence: number; // 0-1
  
  // Actions
  actions: IndicatorAction[];
  
  // Metadata
  tags: string[];
  ttl?: number; // Time to live in days
}

export interface IndicatorAction {
  type: 'block' | 'monitor' | 'enrich' | 'share' | 'whitelist';
  source: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  result?: string;
}

export interface HuntCollaborator {
  userId: string;
  role: 'lead' | 'analyst' | 'observer' | 'contributor';
  permissions: CollaboratorPermission[];
  addedAt: Date;
  addedBy: string;
  notificationPreferences: NotificationSettings;
}

export interface CollaboratorPermission {
  action: 'view' | 'edit' | 'execute' | 'delete' | 'share';
  scope: 'hunt' | 'queries' | 'findings' | 'indicators';
}

export interface HuntComment {
  id: string;
  content: string;
  author: string;
  timestamp: Date;
  type: 'general' | 'query' | 'finding' | 'indicator';
  referenceId?: string; // ID of related object
  isPrivate: boolean;
  attachments: string[];
}

export interface RecurringSchedule {
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  interval: number; // every N frequency units
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  timeOfDay?: string; // HH:MM format
  timezone: string;
  endDate?: Date;
  maxExecutions?: number;
}

export interface NotificationSettings {
  enabled: boolean;
  channels: NotificationChannel[];
  events: NotificationEvent[];
  recipients: NotificationRecipient[];
  conditions: NotificationCondition[];
}

export type NotificationChannel = 'email' | 'slack' | 'teams' | 'webhook' | 'dashboard';

export type NotificationEvent = 
  | 'hunt_started'
  | 'hunt_completed'
  | 'hunt_failed'
  | 'finding_discovered'
  | 'high_confidence_match'
  | 'threshold_exceeded'
  | 'schedule_changed';

export interface NotificationRecipient {
  type: 'user' | 'team' | 'role' | 'external';
  identifier: string;
}

export interface NotificationCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

export interface HuntAnalytics {
  executionCount: number;
  avgExecutionTime: number; // milliseconds
  totalFindingsCount: number;
  highConfidenceFindingsCount: number;
  falsePositiveRate: number; // 0-1
  
  // Performance metrics
  queryPerformance: QueryPerformance[];
  dataSourceMetrics: DataSourceMetrics[];
  
  // Trends
  executionHistory: ExecutionHistoryEntry[];
  findingsTrend: FindingsTrendEntry[];
  
  // Effectiveness
  mttr: number; // Mean time to resolve findings (hours)
  coverage: number; // Percentage of targeted techniques covered
  accuracy: number; // Confirmed findings / total findings
}

export interface QueryPerformance {
  queryId: string;
  avgExecutionTime: number;
  successRate: number;
  avgResultCount: number;
  lastExecuted: Date;
}

export interface DataSourceMetrics {
  source: string;
  queryCount: number;
  avgResponseTime: number;
  errorRate: number;
  availability: number; // 0-1
}

export interface ExecutionHistoryEntry {
  timestamp: Date;
  status: HuntStatus;
  duration: number;
  findingsCount: number;
  errors?: string[];
}

export interface FindingsTrendEntry {
  period: Date;
  findingsCount: number;
  highConfidenceCount: number;
  falsePositiveCount: number;
  resolvedCount: number;
}

export interface HuntTemplate {
  id: string;
  name: string;
  description: string;
  category: HuntCategory;
  techniques: string[];
  platforms: string[];
  dataSources: string[];
  
  // Template content
  huntStructure: Partial<ThreatHunt>;
  queryTemplates: Partial<HuntQuery>[];
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  version: string;
  tags: string[];
  isPublic: boolean;
  
  // Usage statistics
  usageCount: number;
  rating: number; // 1-5
  reviews: TemplateReview[];
}

export interface TemplateReview {
  userId: string;
  rating: number;
  comment?: string;
  timestamp: Date;
}

export interface HuntMetrics {
  totalHunts: number;
  activeHunts: number;
  completedHunts: number;
  failedHunts: number;
  
  avgHuntDuration: number; // hours
  avgFindingsPerHunt: number;
  totalFindings: number;
  confirmedFindings: number;
  falsePositiveRate: number;
  
  huntsByCategory: Record<HuntCategory, number>;
  huntsByStatus: Record<HuntStatus, number>;
  topHunters: Array<{
    userId: string;
    huntCount: number;
    findingsCount: number;
    accuracy: number;
  }>;
  
  techniquesCovered: string[];
  coveragePercentage: number;
  
  trendsOverTime: Array<{
    period: string;
    newHunts: number;
    completedHunts: number;
    findingsDiscovered: number;
  }>;
}

export class ThreatHuntingService extends EventEmitter {
  private isInitialized = false;
  private activeHunts: Map<string, ThreatHunt> = new Map();
  private huntTemplates: Map<string, HuntTemplate> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitialized) {return;}

    try {
      logger.info('Initializing Threat Hunting Service...');
      
      // Load existing hunts and templates
      await this.loadHuntsFromDatabase();
      await this.loadTemplatesFromDatabase();
      
      // Initialize default templates
      await this.initializeDefaultTemplates();
      
      // Resume any paused or scheduled hunts
      await this.resumeInterruptedHunts();
      
      this.isInitialized = true;
      logger.info('✅ Threat Hunting Service initialized');
      
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize Threat Hunting Service:', error);
      throw error;
    }
  }

  // ==========================================
  // HUNT MANAGEMENT
  // ==========================================

  async createHunt(huntData: {
    name: string;
    description: string;
    hypothesis: string;
    organizationId: string;
    category: HuntCategory;
    createdBy: string;
    techniques?: string[];
    platforms?: string[];
    dataSources?: string[];
    templateId?: string;
  }): Promise<ThreatHunt> {
    try {
      const hunt: ThreatHunt = {
        id: this.generateHuntId(),
        organizationId: huntData.organizationId,
        name: huntData.name,
        description: huntData.description,
        hypothesis: huntData.hypothesis,
        status: 'draft',
        priority: 3,
        category: huntData.category,
        techniques: huntData.techniques || [],
        platforms: huntData.platforms || [],
        dataSources: huntData.dataSources || [],
        queries: [],
        executionPlan: [],
        createdBy: huntData.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        findings: [],
        indicators: [],
        confidence: 0,
        collaborators: [],
        comments: [],
        isRecurring: false,
        notificationSettings: {
          enabled: false,
          channels: [],
          events: [],
          recipients: [],
          conditions: []
        },
        analytics: this.initializeAnalytics(),
        tags: [],
        customFields: {},
        escalationLevel: 0
      };

      // Apply template if specified
      if (huntData.templateId) {
        const template = this.huntTemplates.get(huntData.templateId);
        if (template) {
          hunt.queries = template.queryTemplates.map(qt => this.createQueryFromTemplate(qt, hunt.id));
          hunt.executionPlan = this.generateExecutionPlan(hunt.queries);
        }
      }

      // Save to database
      await this.saveHuntToDatabase(hunt);
      
      logger.info(`Threat hunt created: ${hunt.name} (${hunt.id})`);
      this.emit('hunt_created', hunt);
      
      return hunt;
    } catch (error) {
      logger.error('Failed to create threat hunt:', error);
      throw error;
    }
  }

  async updateHunt(huntId: string, updates: Partial<ThreatHunt>): Promise<ThreatHunt> {
    try {
      const hunt = await this.getHunt(huntId);
      if (!hunt) {
        throw new Error(`Hunt not found: ${huntId}`);
      }

      const updatedHunt = {
        ...hunt,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await this.saveHuntToDatabase(updatedHunt);
      
      logger.info(`Threat hunt updated: ${huntId}`);
      this.emit('hunt_updated', updatedHunt);
      
      return updatedHunt;
    } catch (error) {
      logger.error('Failed to update threat hunt:', error);
      throw error;
    }
  }

  async deleteHunt(huntId: string): Promise<void> {
    try {
      const hunt = await this.getHunt(huntId);
      if (!hunt) {
        throw new Error(`Hunt not found: ${huntId}`);
      }

      // Stop hunt if running
      if (hunt.status === 'running') {
        await this.stopHunt(huntId);
      }

      // Remove from active hunts
      this.activeHunts.delete(huntId);

      // Delete from database
      await this.deleteHuntFromDatabase(huntId);
      
      logger.info(`Threat hunt deleted: ${huntId}`);
      this.emit('hunt_deleted', huntId);
    } catch (error) {
      logger.error('Failed to delete threat hunt:', error);
      throw error;
    }
  }

  async getHunt(huntId: string): Promise<ThreatHunt | null> {
    // Check active hunts first
    if (this.activeHunts.has(huntId)) {
      return this.activeHunts.get(huntId)!;
    }

    // Load from database
    return await this.loadHuntFromDatabase(huntId);
  }

  async getHunts(organizationId: string, filters?: {
    status?: HuntStatus[];
    category?: HuntCategory[];
    createdBy?: string;
    assignedTo?: string;
    tags?: string[];
  }): Promise<ThreatHunt[]> {
    return await this.loadHuntsFromDatabase(organizationId, filters);
  }

  // ==========================================
  // HUNT EXECUTION
  // ==========================================

  async startHunt(huntId: string): Promise<void> {
    try {
      const hunt = await this.getHunt(huntId);
      if (!hunt) {
        throw new Error(`Hunt not found: ${huntId}`);
      }

      if (hunt.status === 'running') {
        throw new Error('Hunt is already running');
      }

      // Validate hunt before starting
      const validation = await this.validateHunt(hunt);
      if (!validation.isValid) {
        throw new Error(`Hunt validation failed: ${validation.errors.join(', ')}`);
      }

      // Update hunt status
      hunt.status = 'running';
      hunt.startedAt = new Date().toISOString();
      hunt.analytics.executionCount++;

      this.activeHunts.set(huntId, hunt);
      await this.saveHuntToDatabase(hunt);

      // Execute hunt
      this.executeHunt(hunt);

      logger.info(`Threat hunt started: ${huntId}`);
      this.emit('hunt_started', hunt);
    } catch (error) {
      logger.error('Failed to start threat hunt:', error);
      throw error;
    }
  }

  async stopHunt(huntId: string): Promise<void> {
    try {
      const hunt = this.activeHunts.get(huntId);
      if (!hunt) {
        throw new Error(`Active hunt not found: ${huntId}`);
      }

      hunt.status = 'paused';
      hunt.updatedAt = new Date().toISOString();

      await this.saveHuntToDatabase(hunt);

      logger.info(`Threat hunt stopped: ${huntId}`);
      this.emit('hunt_stopped', hunt);
    } catch (error) {
      logger.error('Failed to stop threat hunt:', error);
      throw error;
    }
  }

  private async executeHunt(hunt: ThreatHunt): Promise<void> {
    try {
      const startTime = Date.now();

      // Execute queries in order based on execution plan
      for (const step of hunt.executionPlan) {
        if (step.type === 'query' && step.queryId) {
          const query = hunt.queries.find(q => q.id === step.queryId);
          if (query) {
            await this.executeQuery(hunt, query);
          }
        }
      }

      // Calculate execution time
      const executionTime = Date.now() - startTime;
      hunt.analytics.avgExecutionTime = 
        (hunt.analytics.avgExecutionTime + executionTime) / hunt.analytics.executionCount;

      // Update hunt status
      hunt.status = 'completed';
      hunt.completedAt = new Date().toISOString();
      hunt.updatedAt = new Date().toISOString();

      // Calculate confidence based on findings
      hunt.confidence = this.calculateHuntConfidence(hunt);

      await this.saveHuntToDatabase(hunt);
      this.activeHunts.delete(hunt.id);

      logger.info(`Threat hunt completed: ${hunt.id} (${executionTime}ms)`);
      this.emit('hunt_completed', hunt);

      // Send notifications if configured
      if (hunt.notificationSettings.enabled) {
        await this.sendHuntNotifications(hunt, 'hunt_completed');
      }
    } catch (error) {
      hunt.status = 'failed';
      hunt.updatedAt = new Date().toISOString();
      await this.saveHuntToDatabase(hunt);
      
      logger.error(`Threat hunt execution failed: ${hunt.id}`, error);
      this.emit('hunt_failed', { hunt, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async executeQuery(hunt: ThreatHunt, query: HuntQuery): Promise<void> {
    try {
      query.status = 'running';
      query.executedAt = new Date().toISOString();
      
      const startTime = Date.now();

      // Execute query through SIEM integration
      if (siemIntegrationService && query.dataSource) {
        const searchId = await siemIntegrationService.createThreatHunt(
          query.dataSource,
          query.name,
          {
            // Transform hunt data to SIEM format
            indicators: hunt.indicators.map(ind => ({
              type: ind.type as any,
              value: ind.value,
              description: ind.description,
              context: ind.context,
              confidence: ind.confidence,
              tags: ind.tags
            })),
            techniques: hunt.techniques,
            timeRange: query.timeRange,
            query: query.query
          }
        );

        // Store search ID for tracking
        query.resultCount = 0; // Would be updated with actual results
        query.results = []; // Would be populated with actual results
      }

      query.executionTime = Date.now() - startTime;
      query.status = 'completed';

      // Analyze results for findings
      if (query.results && query.results.length > 0) {
        const findings = await this.analyzeQueryResults(hunt, query);
        hunt.findings.push(...findings);
      }

      await this.saveHuntToDatabase(hunt);
    } catch (error) {
      query.status = 'failed';
      query.validationErrors = [error instanceof Error ? error.message : 'Query execution failed'];
      logger.error(`Query execution failed: ${query.id}`, error);
      throw error;
    }
  }

  private async analyzeQueryResults(hunt: ThreatHunt, query: HuntQuery): Promise<HuntFinding[]> {
    const findings: HuntFinding[] = [];

    // This would contain the actual analysis logic
    // For now, creating mock findings based on query results
    if (query.results && query.results.length > 0) {
      const finding: HuntFinding = {
        id: this.generateFindingId(),
        huntId: hunt.id,
        queryId: query.id,
        title: `Potential threat detected in ${query.name}`,
        description: `Analysis of ${query.name} revealed ${query.results.length} suspicious events`,
        severity: 'medium',
        confidence: 0.7,
        techniques: hunt.techniques,
        tactics: [],
        evidence: [],
        indicators: [],
        affectedAssets: [],
        firstSeen: new Date(),
        lastSeen: new Date(),
        detectedAt: new Date(),
        category: 'suspicious_behavior',
        actions: [],
        status: 'new',
        tags: hunt.tags,
        customFields: {}
      };

      findings.push(finding);
    }

    return findings;
  }

  // ==========================================
  // QUERY MANAGEMENT
  // ==========================================

  async addQueryToHunt(huntId: string, queryData: Partial<HuntQuery>): Promise<HuntQuery> {
    try {
      const hunt = await this.getHunt(huntId);
      if (!hunt) {
        throw new Error(`Hunt not found: ${huntId}`);
      }

      const query: HuntQuery = {
        id: this.generateQueryId(),
        name: queryData.name || 'Untitled Query',
        description: queryData.description || '',
        queryType: queryData.queryType || 'hunting',
        queryLanguage: queryData.queryLanguage || 'splunk_spl',
        query: queryData.query || '',
        dataSource: queryData.dataSource || '',
        timeRange: queryData.timeRange || {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date(),
          timezone: 'UTC'
        },
        status: 'pending',
        isValid: false,
        validationErrors: [],
        dependsOn: queryData.dependsOn || [],
        outputFormat: queryData.outputFormat || 'table'
      };

      // Validate query
      const validation = await this.validateQuery(query);
      query.isValid = validation.isValid;
      query.validationErrors = validation.errors;

      hunt.queries.push(query);
      hunt.executionPlan = this.generateExecutionPlan(hunt.queries);
      hunt.updatedAt = new Date().toISOString();

      await this.saveHuntToDatabase(hunt);

      logger.info(`Query added to hunt: ${query.name} -> ${huntId}`);
      this.emit('query_added', { hunt, query });

      return query;
    } catch (error) {
      logger.error('Failed to add query to hunt:', error);
      throw error;
    }
  }

  private async validateQuery(query: HuntQuery): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation
    if (!query.query.trim()) {
      errors.push('Query content is required');
    }

    if (!query.dataSource) {
      errors.push('Data source is required');
    }

    // Query language-specific validation would go here
    // For now, just basic checks
    if (query.queryLanguage === 'splunk_spl' && !query.query.includes('search')) {
      // This is a simplified check - real validation would be more comprehensive
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async validateHunt(hunt: ThreatHunt): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (hunt.queries.length === 0) {
      errors.push('Hunt must have at least one query');
    }

    // Validate all queries
    for (const query of hunt.queries) {
      if (!query.isValid) {
        errors.push(`Invalid query: ${query.name} - ${query.validationErrors.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private generateHuntId(): string {
    return `hunt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFindingId(): string {
    return `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeAnalytics(): HuntAnalytics {
    return {
      executionCount: 0,
      avgExecutionTime: 0,
      totalFindingsCount: 0,
      highConfidenceFindingsCount: 0,
      falsePositiveRate: 0,
      queryPerformance: [],
      dataSourceMetrics: [],
      executionHistory: [],
      findingsTrend: [],
      mttr: 0,
      coverage: 0,
      accuracy: 0
    };
  }

  private generateExecutionPlan(queries: HuntQuery[]): ExecutionStep[] {
    // Generate execution plan based on query dependencies
    const plan: ExecutionStep[] = [];
    const processedQueries = new Set<string>();

    const addQueryToPlan = (query: HuntQuery) => {
      if (processedQueries.has(query.id)) return;

      // Add dependencies first
      for (const depId of query.dependsOn) {
        const depQuery = queries.find(q => q.id === depId);
        if (depQuery && !processedQueries.has(depId)) {
          addQueryToplan(depQuery);
        }
      }

      plan.push({
        id: `step_${plan.length + 1}`,
        name: `Execute ${query.name}`,
        description: query.description,
        type: 'query',
        queryId: query.id,
        dependsOn: query.dependsOn,
        status: 'pending',
        configuration: {},
      });

      processedQueries.add(query.id);
    };

    queries.forEach(addQueryToplan);
    return plan;
  }

  private calculateHuntConfidence(hunt: ThreatHunt): number {
    if (hunt.findings.length === 0) return 0;

    const avgConfidence = hunt.findings.reduce((sum, finding) => sum + finding.confidence, 0) / hunt.findings.length;
    return Math.min(1, avgConfidence);
  }

  private createQueryFromTemplate(template: Partial<HuntQuery>, huntId: string): HuntQuery {
    return {
      id: this.generateQueryId(),
      name: template.name || 'Template Query',
      description: template.description || '',
      queryType: template.queryType || 'hunting',
      queryLanguage: template.queryLanguage || 'splunk_spl',
      query: template.query || '',
      dataSource: template.dataSource || '',
      timeRange: template.timeRange || {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
        timezone: 'UTC'
      },
      status: 'pending',
      isValid: false,
      validationErrors: [],
      dependsOn: template.dependsOn || [],
      outputFormat: template.outputFormat || 'table'
    };
  }

  // ==========================================
  // DATABASE OPERATIONS (MOCK)
  // ==========================================

  private async saveHuntToDatabase(hunt: ThreatHunt): Promise<void> {
    // Database save implementation would go here
  }

  private async loadHuntFromDatabase(huntId: string): Promise<ThreatHunt | null> {
    // Database load implementation would go here
    return null;
  }

  private async loadHuntsFromDatabase(organizationId?: string, filters?: any): Promise<ThreatHunt[]> {
    // Database load implementation would go here
    return [];
  }

  private async deleteHuntFromDatabase(huntId: string): Promise<void> {
    // Database delete implementation would go here
  }

  private async loadTemplatesFromDatabase(): Promise<void> {
    // Load hunt templates from database
  }

  private async initializeDefaultTemplates(): Promise<void> {
    // Initialize default hunt templates
  }

  private async resumeInterruptedHunts(): Promise<void> {
    // Resume hunts that were interrupted
  }

  private async sendHuntNotifications(hunt: ThreatHunt, event: NotificationEvent): Promise<void> {
    // Send notifications based on hunt settings
  }
}

export const threatHuntingService = new ThreatHuntingService();