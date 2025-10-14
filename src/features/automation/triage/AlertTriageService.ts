/**
 * Alert Triage Automation Service
 *
 * Automatically triages, categorizes, and prioritizes security alerts
 * using ML-based scoring, enrichment data, and configurable rules
 */

import { EventEmitter } from 'events';
import { SIEMAlert } from '../../siem-connectors/connectors/BaseSIEMConnector';
import { WorkflowEngine } from '../workflow/WorkflowEngine';
import { logger } from '../../../shared/utils/logger';

export interface TriageRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number; // Higher number = higher priority

  // Conditions
  conditions: {
    severity?: string[];
    sources?: string[];
    iocTypes?: string[];
    iocCount?: { min?: number; max?: number };
    keywords?: string[];
    regex?: string[];
    customExpression?: string;
  };

  // Actions
  actions: {
    assignPriority?: 'critical' | 'high' | 'medium' | 'low';
    assignCategory?: string;
    assignTags?: string[];
    autoEnrich?: boolean;
    createTicket?: boolean;
    notify?: {
      channel: string;
      recipients: string[];
      template?: string;
    };
    escalate?: boolean;
    autoResolve?: boolean;
    triggerWorkflow?: string; // Workflow ID
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  matchCount: number;
}

export interface TriageResult {
  alertId: string;
  originalSeverity: string;
  triagePriority: 'critical' | 'high' | 'medium' | 'low';
  category?: string;
  tags: string[];
  score: number; // 0-100
  confidence: number; // 0-1
  reasoning: string[];
  matchedRules: string[];
  enrichmentRequired: boolean;
  ticketRequired: boolean;
  notificationRequired: boolean;
  escalationRequired: boolean;
  autoResolved: boolean;
  workflowsTriggered: string[];
  metadata: Record<string, any>;
  triagedAt: Date;
}

export interface TriageConfig {
  enabled: boolean;
  autoEnrich: boolean;
  autoTicket: boolean;
  enrichmentProviders?: string[];
  scoreThresholds: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  falsePositiveDetection: boolean;
  duplicateDetection: boolean;
  duplicateWindow: number; // minutes
}

export class AlertTriageService extends EventEmitter {
  private config: TriageConfig;
  private rules: Map<string, TriageRule>;
  private workflowEngine?: WorkflowEngine;
  private triageHistory: Map<string, TriageResult[]>;
  private alertFingerprints: Map<string, { alertId: string; timestamp: Date }>;

  constructor(config: TriageConfig, workflowEngine?: WorkflowEngine) {
    super();
    this.config = config;
    this.rules = new Map();
    this.workflowEngine = workflowEngine;
    this.triageHistory = new Map();
    this.alertFingerprints = new Map();

    // Initialize default rules
    this.initializeDefaultRules();

    logger.info('Alert Triage Service initialized');
  }

  /**
   * Triage a single alert
   */
  async triageAlert(alert: SIEMAlert): Promise<TriageResult> {
    logger.debug(`Triaging alert: ${alert.id} - ${alert.title}`);

    const result: TriageResult = {
      alertId: alert.id,
      originalSeverity: alert.severity,
      triagePriority: alert.severity,
      tags: [],
      score: 0,
      confidence: 0.5,
      reasoning: [],
      matchedRules: [],
      enrichmentRequired: false,
      ticketRequired: false,
      notificationRequired: false,
      escalationRequired: false,
      autoResolved: false,
      workflowsTriggered: [],
      metadata: {},
      triagedAt: new Date(),
    };

    try {
      // Step 1: Check for duplicates
      if (this.config.duplicateDetection) {
        const isDuplicate = this.checkDuplicate(alert);
        if (isDuplicate) {
          result.autoResolved = true;
          result.reasoning.push('Duplicate alert detected within time window');
          result.tags.push('duplicate');
          this.emit('alertTriaged', { alert, result });
          return result;
        }
      }

      // Step 2: Calculate base score
      result.score = this.calculateBaseScore(alert);

      // Step 3: Apply triage rules
      const matchedRules = this.applyTriageRules(alert, result);
      result.matchedRules = matchedRules.map(r => r.id);

      // Step 4: Adjust score based on enrichment (if available)
      if (alert.iocs && alert.iocs.length > 0) {
        const enrichmentScore = this.calculateEnrichmentScore(alert);
        result.score = Math.min(100, result.score + enrichmentScore);
      }

      // Step 5: Detect false positives
      if (this.config.falsePositiveDetection) {
        const isFalsePositive = this.detectFalsePositive(alert, result);
        if (isFalsePositive) {
          result.autoResolved = true;
          result.score = Math.max(0, result.score - 30);
          result.reasoning.push('Likely false positive based on patterns');
          result.tags.push('false-positive');
        }
      }

      // Step 6: Determine final priority based on score
      result.triagePriority = this.scoreToPriority(result.score);

      // Step 7: Calculate confidence
      result.confidence = this.calculateConfidence(alert, result);

      // Step 8: Execute rule actions
      await this.executeRuleActions(alert, result, matchedRules);

      // Step 9: Store in history
      this.storeTriageResult(alert.id, result);

      // Step 10: Store fingerprint for duplicate detection
      this.storeAlertFingerprint(alert);

      logger.info(
        `Alert triaged: ${alert.id} - Priority: ${result.triagePriority}, ` +
        `Score: ${result.score}, Confidence: ${result.confidence.toFixed(2)}`
      );

      this.emit('alertTriaged', { alert, result });

      return result;

    } catch (error) {
      logger.error(`Alert triage failed for ${alert.id}:`, error);
      this.emit('triageError', { alert, error });
      throw error;
    }
  }

  /**
   * Triage multiple alerts in batch
   */
  async triageAlerts(alerts: SIEMAlert[]): Promise<TriageResult[]> {
    logger.info(`Triaging ${alerts.length} alerts in batch`);

    const results = await Promise.all(
      alerts.map(alert => this.triageAlert(alert))
    );

    return results;
  }

  /**
   * Calculate base score for alert
   */
  private calculateBaseScore(alert: SIEMAlert): number {
    let score = 0;

    // Severity scoring
    const severityScores: Record<string, number> = {
      critical: 80,
      high: 60,
      medium: 40,
      low: 20,
    };
    score += severityScores[alert.severity] || 20;

    // IOC count scoring
    const iocCount = alert.iocs?.length || 0;
    if (iocCount > 0) {
      score += Math.min(15, iocCount * 3);
    }

    // Recent detection bonus
    const hoursSinceDetection =
      (Date.now() - alert.detectedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceDetection < 1) {
      score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate enrichment score
   */
  private calculateEnrichmentScore(alert: SIEMAlert): number {
    let score = 0;

    // TODO: Check IOC enrichment data if available
    // For now, just bonus for having IOCs
    const iocCount = alert.iocs?.length || 0;
    score += Math.min(10, iocCount * 2);

    return score;
  }

  /**
   * Apply triage rules to alert
   */
  private applyTriageRules(alert: SIEMAlert, result: TriageResult): TriageRule[] {
    const matchedRules: TriageRule[] = [];

    // Sort rules by priority (highest first)
    const sortedRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.evaluateRuleConditions(rule, alert)) {
        matchedRules.push(rule);
        rule.matchCount++;

        // Apply rule actions to result
        if (rule.actions.assignPriority) {
          result.triagePriority = rule.actions.assignPriority;
          result.reasoning.push(`Rule '${rule.name}': Set priority to ${rule.actions.assignPriority}`);
        }

        if (rule.actions.assignCategory) {
          result.category = rule.actions.assignCategory;
          result.reasoning.push(`Rule '${rule.name}': Categorized as ${rule.actions.assignCategory}`);
        }

        if (rule.actions.assignTags) {
          result.tags.push(...rule.actions.assignTags);
        }

        if (rule.actions.autoEnrich) {
          result.enrichmentRequired = true;
        }

        if (rule.actions.createTicket) {
          result.ticketRequired = true;
        }

        if (rule.actions.notify) {
          result.notificationRequired = true;
        }

        if (rule.actions.escalate) {
          result.escalationRequired = true;
        }

        if (rule.actions.autoResolve) {
          result.autoResolved = true;
          result.reasoning.push(`Rule '${rule.name}': Auto-resolved`);
        }
      }
    }

    return matchedRules;
  }

  /**
   * Evaluate rule conditions
   */
  private evaluateRuleConditions(rule: TriageRule, alert: SIEMAlert): boolean {
    const conditions = rule.conditions;

    // Check severity
    if (conditions.severity && conditions.severity.length > 0) {
      if (!conditions.severity.includes(alert.severity)) {
        return false;
      }
    }

    // Check sources
    if (conditions.sources && conditions.sources.length > 0) {
      if (!conditions.sources.includes(alert.source)) {
        return false;
      }
    }

    // Check IOC types
    if (conditions.iocTypes && conditions.iocTypes.length > 0) {
      const alertIocTypes = alert.iocs?.map(ioc => ioc.type) || [];
      const hasMatchingType = conditions.iocTypes.some(type =>
        alertIocTypes.includes(type)
      );
      if (!hasMatchingType) {
        return false;
      }
    }

    // Check IOC count
    if (conditions.iocCount) {
      const iocCount = alert.iocs?.length || 0;
      if (conditions.iocCount.min && iocCount < conditions.iocCount.min) {
        return false;
      }
      if (conditions.iocCount.max && iocCount > conditions.iocCount.max) {
        return false;
      }
    }

    // Check keywords
    if (conditions.keywords && conditions.keywords.length > 0) {
      const alertText = `${alert.title} ${alert.description}`.toLowerCase();
      const hasKeyword = conditions.keywords.some(keyword =>
        alertText.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) {
        return false;
      }
    }

    // Check regex patterns
    if (conditions.regex && conditions.regex.length > 0) {
      const alertText = `${alert.title} ${alert.description}`;
      const matchesRegex = conditions.regex.some(pattern => {
        try {
          return new RegExp(pattern, 'i').test(alertText);
        } catch {
          return false;
        }
      });
      if (!matchesRegex) {
        return false;
      }
    }

    // Check custom expression
    if (conditions.customExpression) {
      try {
        const func = new Function(
          'alert',
          `return ${conditions.customExpression};`
        );
        if (!func(alert)) {
          return false;
        }
      } catch (error) {
        logger.warn(`Rule expression evaluation failed: ${rule.name}`, error);
        return false;
      }
    }

    return true;
  }

  /**
   * Execute rule actions
   */
  private async executeRuleActions(
    alert: SIEMAlert,
    result: TriageResult,
    matchedRules: TriageRule[]
  ): Promise<void> {
    for (const rule of matchedRules) {
      // Trigger workflows
      if (rule.actions.triggerWorkflow && this.workflowEngine) {
        try {
          const execution = await this.workflowEngine.executeWorkflow(
            rule.actions.triggerWorkflow,
            {
              type: 'alert_triage',
              data: { alert, triageResult: result },
            }
          );

          result.workflowsTriggered.push(execution.id);
          logger.info(`Triggered workflow ${rule.actions.triggerWorkflow} for alert ${alert.id}`);

        } catch (error) {
          logger.error(
            `Failed to trigger workflow ${rule.actions.triggerWorkflow}:`,
            error
          );
        }
      }
    }
  }

  /**
   * Detect false positives
   */
  private detectFalsePositive(alert: SIEMAlert, result: TriageResult): boolean {
    // Simple heuristics for false positive detection
    const indicators: string[] = [];

    // Low severity with no IOCs
    if (alert.severity === 'low' && (!alert.iocs || alert.iocs.length === 0)) {
      indicators.push('Low severity with no IOCs');
    }

    // Internal IP addresses only
    const hasOnlyInternalIPs = alert.iocs?.every(ioc => {
      if (ioc.type !== 'ip') return false;
      const ip = ioc.value;
      return (
        ip.startsWith('10.') ||
        ip.startsWith('192.168.') ||
        ip.startsWith('172.')
      );
    });

    if (hasOnlyInternalIPs) {
      indicators.push('Only internal IP addresses');
    }

    // Add indicators to reasoning
    if (indicators.length > 0) {
      result.reasoning.push(...indicators);
      return indicators.length >= 2; // Require at least 2 indicators
    }

    return false;
  }

  /**
   * Check for duplicate alerts
   */
  private checkDuplicate(alert: SIEMAlert): boolean {
    const fingerprint = this.generateAlertFingerprint(alert);
    const existing = this.alertFingerprints.get(fingerprint);

    if (!existing) {
      return false;
    }

    // Check if within duplicate window
    const minutesSince =
      (Date.now() - existing.timestamp.getTime()) / (1000 * 60);

    return minutesSince <= this.config.duplicateWindow;
  }

  /**
   * Generate alert fingerprint for duplicate detection
   */
  private generateAlertFingerprint(alert: SIEMAlert): string {
    const parts = [
      alert.source,
      alert.title.toLowerCase(),
      alert.severity,
      alert.iocs?.map(ioc => ioc.value).sort().join(',') || '',
    ];

    return parts.join('|');
  }

  /**
   * Store alert fingerprint
   */
  private storeAlertFingerprint(alert: SIEMAlert): void {
    const fingerprint = this.generateAlertFingerprint(alert);
    this.alertFingerprints.set(fingerprint, {
      alertId: alert.id,
      timestamp: new Date(),
    });

    // Cleanup old fingerprints (older than 2x duplicate window)
    const cutoffTime = Date.now() - this.config.duplicateWindow * 2 * 60 * 1000;
    for (const [fp, data] of this.alertFingerprints.entries()) {
      if (data.timestamp.getTime() < cutoffTime) {
        this.alertFingerprints.delete(fp);
      }
    }
  }

  /**
   * Convert score to priority
   */
  private scoreToPriority(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= this.config.scoreThresholds.critical) return 'critical';
    if (score >= this.config.scoreThresholds.high) return 'high';
    if (score >= this.config.scoreThresholds.medium) return 'medium';
    return 'low';
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(alert: SIEMAlert, result: TriageResult): number {
    let confidence = 0.5;

    // Increase confidence based on number of matched rules
    confidence += result.matchedRules.length * 0.1;

    // Increase confidence if IOCs are present
    if (alert.iocs && alert.iocs.length > 0) {
      confidence += 0.2;
    }

    // Decrease confidence for low-quality alerts
    if (!alert.description || alert.description.length < 20) {
      confidence -= 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Store triage result in history
   */
  private storeTriageResult(alertId: string, result: TriageResult): void {
    const history = this.triageHistory.get(alertId) || [];
    history.push(result);
    this.triageHistory.set(alertId, history);
  }

  /**
   * Add triage rule
   */
  addRule(rule: TriageRule): void {
    this.rules.set(rule.id, rule);
    logger.info(`Triage rule added: ${rule.name} (${rule.id})`);
    this.emit('ruleAdded', { rule });
  }

  /**
   * Remove triage rule
   */
  removeRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.rules.delete(ruleId);
      logger.info(`Triage rule removed: ${rule.name} (${ruleId})`);
      this.emit('ruleRemoved', { ruleId, rule });
    }
  }

  /**
   * Get triage rule
   */
  getRule(ruleId: string): TriageRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all triage rules
   */
  getAllRules(): TriageRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get triage history for alert
   */
  getTriageHistory(alertId: string): TriageResult[] {
    return this.triageHistory.get(alertId) || [];
  }

  /**
   * Get triage statistics
   */
  getStats(): {
    totalRules: number;
    enabledRules: number;
    totalTriaged: number;
    autoResolved: number;
    ticketsCreated: number;
    workflowsTriggered: number;
  } {
    const allResults = Array.from(this.triageHistory.values()).flat();

    return {
      totalRules: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
      totalTriaged: allResults.length,
      autoResolved: allResults.filter(r => r.autoResolved).length,
      ticketsCreated: allResults.filter(r => r.ticketRequired).length,
      workflowsTriggered: allResults.reduce((sum, r) => sum + r.workflowsTriggered.length, 0),
    };
  }

  /**
   * Initialize default triage rules
   */
  private initializeDefaultRules(): void {
    // Rule 1: Critical alerts with multiple IOCs
    this.addRule({
      id: 'critical-multi-ioc',
      name: 'Critical Alert with Multiple IOCs',
      description: 'Escalate critical alerts that have multiple IOCs',
      enabled: true,
      priority: 100,
      conditions: {
        severity: ['critical'],
        iocCount: { min: 3 },
      },
      actions: {
        assignPriority: 'critical',
        assignCategory: 'high-priority-threat',
        assignTags: ['urgent', 'multi-ioc'],
        autoEnrich: true,
        createTicket: true,
        notify: {
          channel: 'slack',
          recipients: ['security-team'],
        },
        escalate: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      matchCount: 0,
    });

    // Rule 2: Known malware detection
    this.addRule({
      id: 'known-malware',
      name: 'Known Malware Detection',
      description: 'Auto-escalate alerts related to known malware',
      enabled: true,
      priority: 90,
      conditions: {
        keywords: ['malware', 'trojan', 'ransomware', 'backdoor'],
      },
      actions: {
        assignPriority: 'critical',
        assignCategory: 'malware',
        assignTags: ['malware', 'incident'],
        autoEnrich: true,
        createTicket: true,
        escalate: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      matchCount: 0,
    });

    // Rule 3: Low severity informational alerts
    this.addRule({
      id: 'low-severity-info',
      name: 'Low Severity Informational',
      description: 'Auto-resolve low severity informational alerts',
      enabled: true,
      priority: 10,
      conditions: {
        severity: ['low'],
        keywords: ['informational', 'info', 'notice'],
        iocCount: { max: 0 },
      },
      actions: {
        assignPriority: 'low',
        assignCategory: 'informational',
        assignTags: ['info'],
        autoResolve: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      matchCount: 0,
    });

    logger.info('Default triage rules initialized');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TriageConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Triage configuration updated');
  }
}
