import { EventEmitter } from 'events';

import { databaseService } from '../../../shared/services/database/DatabaseService.js';
import { logger } from '../../../shared/utils/logger.js';
import { threatIntelligenceService } from '../../threat-intelligence/services/ThreatIntelligenceService.js';
import { ThreatIntelligenceQuery } from '../../threat-intelligence/types/ThreatFeed';

export interface Alert {
  id: string;
  organizationId: string;
  sourceSystem: string;
  alertId: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  priority: 1 | 2 | 3 | 4 | 5; // 1 = highest, 5 = lowest
  status: 'new' | 'investigating' | 'escalated' | 'resolved' | 'false_positive';
  assignedTo?: string;
  investigationId?: string;
  rawData: Record<string, any>;
  enrichmentData: Record<string, any>;
  autoTriageScore?: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface TriageRule {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  conditions: TriageCondition[];
  actions: TriageAction[];
  priority: number;
  isEnabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  executionCount: number;
  lastExecuted?: string;
}

export interface TriageCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'gt' | 'lt' | 'in';
  value: any;
  caseSensitive?: boolean;
}

export interface TriageAction {
  type: 'setPriority' | 'assignTo' | 'addTag' | 'escalate' | 'autoResolve' | 'enrichWithThreatIntel' | 'createInvestigation';
  parameters: Record<string, any>;
}

export interface AlertEnrichment {
  threatIntelligence?: {
    indicators: Array<{
      type: string;
      value: string;
      confidence: number;
      severity: string;
      source: string;
    }>;
    totalMatches: number;
    highConfidenceMatches: number;
  };
  geolocation?: {
    country: string;
    city: string;
    coordinates: [number, number];
  };
  reputation?: {
    score: number;
    verdict: 'benign' | 'suspicious' | 'malicious';
    sources: string[];
  };
  mitre?: {
    techniques: string[];
    tactics: string[];
  };
}

export class AlertTriageService extends EventEmitter {
  private isInitialized = false;
  private triageRules: Map<string, TriageRule> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitialized) {return;}

    try {
      logger.info('Initializing Alert Triage Service...');
      
      // Load triage rules from database
      await this.loadTriageRules();
      
      this.isInitialized = true;
      logger.info('✅ Alert Triage Service initialized');
      
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize Alert Triage Service:', error);
      throw error;
    }
  }

  async ingestAlert(alertData: {
    sourceSystem: string;
    alertId: string;
    title: string;
    description: string;
    severity: Alert['severity'];
    rawData: Record<string, any>;
    organizationId: string;
  }): Promise<Alert> {
    try {
      logger.info(`Ingesting alert from ${alertData.sourceSystem}: ${alertData.title}`);
      
      // Check for duplicate alerts
      const existingAlert = await this.findExistingAlert(
        alertData.organizationId,
        alertData.sourceSystem,
        alertData.alertId
      );
      
      if (existingAlert) {
        logger.info(`Alert already exists: ${existingAlert.id}`);
        return existingAlert;
      }
      
      // Create new alert
      const alert: Alert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        organizationId: alertData.organizationId,
        sourceSystem: alertData.sourceSystem,
        alertId: alertData.alertId,
        title: alertData.title,
        description: alertData.description,
        severity: alertData.severity,
        priority: this.calculateInitialPriority(alertData.severity),
        status: 'new',
        rawData: alertData.rawData,
        enrichmentData: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Store in database
      await this.storeAlert(alert);
      
      // Perform auto-triage
      await this.performAutoTriage(alert);
      
      logger.info(`Alert ingested and triaged: ${alert.id}`);
      this.emit('alertIngested', alert);
      
      return alert;
    } catch (error) {
      logger.error('Error ingesting alert:', error);
      throw error;
    }
  }

  async performAutoTriage(alert: Alert): Promise<void> {
    try {
      logger.debug(`Performing auto-triage for alert: ${alert.id}`);
      
      // Apply triage rules
      const applicableRules = await this.getApplicableRules(alert);
      let modified = false;
      
      for (const rule of applicableRules) {
        if (await this.evaluateRuleConditions(alert, rule.conditions)) {
          await this.executeRuleActions(alert, rule.actions);
          await this.updateRuleExecutionStats(rule.id);
          modified = true;
          
          logger.info(`Applied triage rule "${rule.name}" to alert ${alert.id}`);
        }
      }
      
      // Perform threat intelligence enrichment
      const enrichment = await this.enrichAlertWithThreatIntel(alert);
      if (enrichment) {
        alert.enrichmentData = { ...alert.enrichmentData, ...enrichment };
        modified = true;
      }
      
      // Calculate auto-triage score
      alert.autoTriageScore = this.calculateTriageScore(alert);
      modified = true;
      
      // Update alert if modified
      if (modified) {
        alert.updatedAt = new Date().toISOString();
        await this.updateAlert(alert);
        
        logger.info(`Auto-triage completed for alert ${alert.id} (score: ${alert.autoTriageScore})`);
        this.emit('alertTriaged', alert);
      }
      
    } catch (error) {
      logger.error(`Auto-triage failed for alert ${alert.id}:`, error);
      this.emit('triageError', { alert, error });
    }
  }

  async enrichAlertWithThreatIntel(alert: Alert): Promise<AlertEnrichment | null> {
    try {
      // Extract potential IOCs from alert data
      const indicators = this.extractIndicatorsFromAlert(alert);
      if (indicators.length === 0) {return null;}
      
      // Query threat intelligence
      const query: ThreatIntelligenceQuery = {
        indicators,
        confidence_min: 0.3,
        limit: 100,
        include_enrichment: true
      };
      
      const result = await threatIntelligenceService.queryThreatIntelligence(query);
      
      if (result.matches.length === 0) {return null;}
      
      // Build enrichment data
      const enrichment: AlertEnrichment = {
        threatIntelligence: {
          indicators: result.matches.map(match => ({
            type: match.indicator.type,
            value: match.indicator.value,
            confidence: match.indicator.confidence,
            severity: match.indicator.severity,
            source: match.feedName
          })),
          totalMatches: result.totalMatches,
          highConfidenceMatches: result.matches.filter(m => m.indicator.confidence > 0.7).length
        }
      };
      
      // If high-confidence threat intelligence matches found, increase priority
      if (enrichment.threatIntelligence.highConfidenceMatches > 0) {
        alert.priority = Math.max(1, alert.priority - 1) as Alert['priority'];
        
        logger.info(`Alert ${alert.id} priority increased due to high-confidence threat intel matches`);
      }
      
      return enrichment;
      
    } catch (error) {
      logger.error(`Threat intel enrichment failed for alert ${alert.id}:`, error);
      return null;
    }
  }

  private extractIndicatorsFromAlert(alert: Alert): string[] {
    const indicators: string[] = [];
    const text = JSON.stringify(alert.rawData).toLowerCase();
    
    // Extract IP addresses
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    const ips = text.match(ipRegex) || [];
    indicators.push(...ips.filter(ip => !this.isPrivateIP(ip)));
    
    // Extract domains
    const domainRegex = /\b[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}\b/g;
    const domains = text.match(domainRegex) || [];
    indicators.push(...domains);
    
    // Extract file hashes
    const sha256Regex = /\b[a-f0-9]{64}\b/g;
    const sha1Regex = /\b[a-f0-9]{40}\b/g;
    const md5Regex = /\b[a-f0-9]{32}\b/g;
    
    indicators.push(...(text.match(sha256Regex) || []));
    indicators.push(...(text.match(sha1Regex) || []));
    indicators.push(...(text.match(md5Regex) || []));
    
    return [...new Set(indicators)]; // Remove duplicates
  }

  private isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) {return true;}
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {return true;}
    if (parts[0] === 192 && parts[1] === 168) {return true;}
    if (parts[0] === 127) {return true;}
    return false;
  }

  private async getApplicableRules(alert: Alert): Promise<TriageRule[]> {
    return Array.from(this.triageRules.values())
      .filter(rule => rule.organizationId === alert.organizationId && rule.isEnabled)
      .sort((a, b) => a.priority - b.priority);
  }

  private async evaluateRuleConditions(alert: Alert, conditions: TriageCondition[]): Promise<boolean> {
    for (const condition of conditions) {
      if (!this.evaluateCondition(alert, condition)) {
        return false;
      }
    }
    return true;
  }

  private evaluateCondition(alert: Alert, condition: TriageCondition): boolean {
    let fieldValue = this.getFieldValue(alert, condition.field);
    let targetValue = condition.value;
    
    if (typeof fieldValue === 'string' && !condition.caseSensitive) {
      fieldValue = fieldValue.toLowerCase();
      if (typeof targetValue === 'string') {
        targetValue = targetValue.toLowerCase();
      }
    }
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === targetValue;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(targetValue);
      case 'startsWith':
        return typeof fieldValue === 'string' && fieldValue.startsWith(targetValue);
      case 'endsWith':
        return typeof fieldValue === 'string' && fieldValue.endsWith(targetValue);
      case 'regex':
        return typeof fieldValue === 'string' && new RegExp(targetValue).test(fieldValue);
      case 'gt':
        return Number(fieldValue) > Number(targetValue);
      case 'lt':
        return Number(fieldValue) < Number(targetValue);
      case 'in':
        return Array.isArray(targetValue) && targetValue.includes(fieldValue);
      default:
        return false;
    }
  }

  private getFieldValue(alert: Alert, field: string): any {
    // Support nested field access with dot notation
    const parts = field.split('.');
    let value: any = alert;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private async executeRuleActions(alert: Alert, actions: TriageAction[]): Promise<void> {
    for (const action of actions) {
      await this.executeAction(alert, action);
    }
  }

  private async executeAction(alert: Alert, action: TriageAction): Promise<void> {
    switch (action.type) {
      case 'setPriority':
        alert.priority = action.parameters.priority;
        break;
        
      case 'assignTo':
        alert.assignedTo = action.parameters.userId;
        break;
        
      case 'addTag':
        if (!alert.enrichmentData.tags) {
          alert.enrichmentData.tags = [];
        }
        alert.enrichmentData.tags.push(action.parameters.tag);
        break;
        
      case 'escalate':
        alert.status = 'escalated';
        alert.priority = Math.max(1, alert.priority - 1) as Alert['priority'];
        break;
        
      case 'autoResolve':
        alert.status = 'resolved';
        alert.resolvedAt = new Date().toISOString();
        break;
        
      case 'enrichWithThreatIntel':
        // This is handled separately in performAutoTriage
        break;
        
      case 'createInvestigation':
        // This would create a new investigation and link it to the alert
        // Implementation depends on investigation service
        break;
    }
  }

  private calculateTriageScore(alert: Alert): number {
    let score = 0.5; // Base score
    
    // Severity contribution
    const severityScores = {
      'critical': 1.0,
      'high': 0.8,
      'medium': 0.6,
      'low': 0.4,
      'info': 0.2
    };
    score += severityScores[alert.severity] * 0.3;
    
    // Threat intelligence contribution
    if (alert.enrichmentData.threatIntelligence) {
      const ti = alert.enrichmentData.threatIntelligence;
      if (ti.highConfidenceMatches > 0) {
        score += 0.3;
      } else if (ti.totalMatches > 0) {
        score += 0.1;
      }
    }
    
    // Priority contribution
    score += (6 - alert.priority) * 0.1;
    
    // Source system reliability (could be configurable)
    const sourceReliability = {
      'siem': 0.1,
      'edr': 0.15,
      'firewall': 0.05,
      'ids': 0.08
    };
    score += sourceReliability[alert.sourceSystem] || 0.05;
    
    return Math.min(1.0, Math.max(0.0, score));
  }

  private calculateInitialPriority(severity: Alert['severity']): Alert['priority'] {
    const priorityMap = {
      'critical': 1,
      'high': 2,
      'medium': 3,
      'low': 4,
      'info': 5
    };
    return priorityMap[severity] as Alert['priority'];
  }

  private async findExistingAlert(organizationId: string, sourceSystem: string, alertId: string): Promise<Alert | null> {
    try {
      const result = await databaseService.query(
        'SELECT * FROM alert_queue WHERE organization_id = $1 AND source_system = $2 AND alert_id = $3',
        [organizationId, sourceSystem, alertId]
      );
      
      if (result.rows.length === 0) {return null;}
      
      const row = result.rows[0];
      return this.mapRowToAlert(row);
    } catch (error) {
      logger.error('Error finding existing alert:', error);
      throw error;
    }
  }

  private async storeAlert(alert: Alert): Promise<void> {
    await databaseService.query(
      `INSERT INTO alert_queue 
       (id, organization_id, source_system, alert_id, title, description, severity, priority, 
        status, assigned_to, investigation_id, raw_data, enrichment_data, auto_triage_score,
        created_at, updated_at, resolved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        alert.id, alert.organizationId, alert.sourceSystem, alert.alertId, alert.title,
        alert.description, alert.severity, alert.priority, alert.status, alert.assignedTo,
        alert.investigationId, JSON.stringify(alert.rawData), JSON.stringify(alert.enrichmentData),
        alert.autoTriageScore, alert.createdAt, alert.updatedAt, alert.resolvedAt
      ]
    );
  }

  private async updateAlert(alert: Alert): Promise<void> {
    await databaseService.query(
      `UPDATE alert_queue SET 
       severity = $2, priority = $3, status = $4, assigned_to = $5, investigation_id = $6,
       enrichment_data = $7, auto_triage_score = $8, updated_at = $9, resolved_at = $10
       WHERE id = $1`,
      [
        alert.id, alert.severity, alert.priority, alert.status, alert.assignedTo,
        alert.investigationId, JSON.stringify(alert.enrichmentData), alert.autoTriageScore,
        alert.updatedAt, alert.resolvedAt
      ]
    );
  }

  private async loadTriageRules(): Promise<void> {
    // Implementation would load triage rules from database
    // For now, create some default rules
    logger.info('Loaded triage rules (placeholder implementation)');
  }

  private async updateRuleExecutionStats(ruleId: string): Promise<void> {
    // Update rule execution statistics
    logger.debug(`Updated execution stats for rule: ${ruleId}`);
  }

  private mapRowToAlert(row: any): Alert {
    return {
      id: row.id,
      organizationId: row.organization_id,
      sourceSystem: row.source_system,
      alertId: row.alert_id,
      title: row.title,
      description: row.description,
      severity: row.severity,
      priority: row.priority,
      status: row.status,
      assignedTo: row.assigned_to,
      investigationId: row.investigation_id,
      rawData: row.raw_data || {},
      enrichmentData: row.enrichment_data || {},
      autoTriageScore: row.auto_triage_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at
    };
  }

  // Public methods for alert management
  async getAlerts(organizationId: string, filters?: {
    status?: Alert['status'][];
    severity?: Alert['severity'][];
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ alerts: Alert[]; total: number }> {
    try {
      let sql = 'SELECT * FROM alert_queue WHERE organization_id = $1';
      const params: any[] = [organizationId];
      let paramIndex = 2;
      
      if (filters?.status && filters.status.length > 0) {
        sql += ` AND status = ANY($${paramIndex})`;
        params.push(filters.status);
        paramIndex++;
      }
      
      if (filters?.severity && filters.severity.length > 0) {
        sql += ` AND severity = ANY($${paramIndex})`;
        params.push(filters.severity);
        paramIndex++;
      }
      
      if (filters?.assignedTo) {
        sql += ` AND assigned_to = $${paramIndex}`;
        params.push(filters.assignedTo);
        paramIndex++;
      }
      
      sql += ' ORDER BY priority ASC, created_at DESC';
      
      if (filters?.limit) {
        sql += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }
      
      if (filters?.offset) {
        sql += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
      }
      
      const result = await databaseService.query(sql, params);
      const alerts = result.rows.map(row => this.mapRowToAlert(row));
      
      // Get total count
      const countResult = await databaseService.query(
        'SELECT COUNT(*) as total FROM alert_queue WHERE organization_id = $1',
        [organizationId]
      );
      const total = parseInt(countResult.rows[0]?.total || '0');
      
      return { alerts, total };
    } catch (error) {
      logger.error('Error getting alerts:', error);
      throw error;
    }
  }

  async getAlert(alertId: string): Promise<Alert | null> {
    try {
      const result = await databaseService.query(
        'SELECT * FROM alert_queue WHERE id = $1',
        [alertId]
      );
      
      if (result.rows.length === 0) {return null;}
      
      return this.mapRowToAlert(result.rows[0]);
    } catch (error) {
      logger.error('Error getting alert:', error);
      throw error;
    }
  }

  async assignAlert(alertId: string, userId: string): Promise<void> {
    try {
      await databaseService.query(
        'UPDATE alert_queue SET assigned_to = $1, updated_at = $2 WHERE id = $3',
        [userId, new Date().toISOString(), alertId]
      );
      
      logger.info(`Alert ${alertId} assigned to user ${userId}`);
      this.emit('alertAssigned', { alertId, userId });
    } catch (error) {
      logger.error('Error assigning alert:', error);
      throw error;
    }
  }

  async updateAlertStatus(alertId: string, status: Alert['status'], resolvedBy?: string): Promise<void> {
    try {
      const updateData: any[] = [status, new Date().toISOString()];
      let sql = 'UPDATE alert_queue SET status = $1, updated_at = $2';
      
      if (status === 'resolved' || status === 'false_positive') {
        sql += ', resolved_at = $3';
        updateData.push(new Date().toISOString());
      }
      
      sql += ` WHERE id = $${  updateData.length + 1}`;
      updateData.push(alertId);
      
      await databaseService.query(sql, updateData);
      
      logger.info(`Alert ${alertId} status updated to ${status}`);
      this.emit('alertStatusUpdated', { alertId, status });
    } catch (error) {
      logger.error('Error updating alert status:', error);
      throw error;
    }
  }
}

export const alertTriageService = new AlertTriageService();