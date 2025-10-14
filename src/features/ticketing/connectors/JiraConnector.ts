/**
 * Jira Integration Connector
 *
 * Comprehensive Jira integration for automated ticket management
 * Supports Jira Cloud, Server, and Data Center
 */

import fetch from 'node-fetch';
import { EventEmitter } from 'events';
import { logger } from '../../../shared/utils/logger';
import { SIEMAlert } from '../../siem-connectors/connectors/BaseSIEMConnector';
import { TriageResult } from '../../automation/triage/AlertTriageService';

export interface JiraConfig {
  url: string;
  email?: string;
  apiToken?: string;
  username?: string;
  password?: string;
  cloudId?: string; // For Jira Cloud

  // Default project settings
  defaultProject: string;
  defaultIssueType: string; // e.g., 'Bug', 'Task', 'Security Incident'
  defaultPriority?: string; // e.g., 'High', 'Critical'
  defaultAssignee?: string;
  defaultComponents?: string[];
  defaultLabels?: string[];

  // Custom field mappings
  customFields?: Record<string, string>;

  // Transition settings
  transitionOnResolve?: string; // e.g., 'Done', 'Resolved'
  transitionOnClose?: string; // e.g., 'Closed'

  // Integration settings
  linkType?: string; // e.g., 'relates to', 'blocks'
  attachScreenshots?: boolean;
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description: string;
    project: { key: string; name: string };
    issuetype: { name: string };
    priority?: { name: string };
    status: { name: string };
    assignee?: { displayName: string; emailAddress: string };
    reporter?: { displayName: string };
    created: string;
    updated: string;
    labels?: string[];
    components?: Array<{ name: string }>;
    [key: string]: any;
  };
}

export interface CreateIssueRequest {
  project: string;
  issueType: string;
  summary: string;
  description: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
  components?: string[];
  customFields?: Record<string, any>;
  alert?: SIEMAlert;
  triageResult?: TriageResult;
}

export interface UpdateIssueRequest {
  issueKey: string;
  summary?: string;
  description?: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
  comment?: string;
  transition?: string;
  customFields?: Record<string, any>;
}

export class JiraConnector extends EventEmitter {
  private config: JiraConfig;
  private baseUrl: string;
  private authHeader: string;

  constructor(config: JiraConfig) {
    super();
    this.config = config;
    this.baseUrl = config.url.replace(/\/$/, '');
    this.authHeader = this.buildAuthHeader();

    logger.info(`Jira Connector initialized: ${this.baseUrl}`);
  }

  /**
   * Build authentication header
   */
  private buildAuthHeader(): string {
    if (this.config.apiToken && this.config.email) {
      // Jira Cloud authentication (email + API token)
      const credentials = Buffer.from(
        `${this.config.email}:${this.config.apiToken}`
      ).toString('base64');
      return `Basic ${credentials}`;
    } else if (this.config.username && this.config.password) {
      // Jira Server authentication (username + password)
      const credentials = Buffer.from(
        `${this.config.username}:${this.config.password}`
      ).toString('base64');
      return `Basic ${credentials}`;
    } else {
      throw new Error('Invalid Jira authentication configuration');
    }
  }

  /**
   * Test connection to Jira
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/rest/api/2/myself`, {
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Jira API returned ${response.status}`);
      }

      const user = await response.json();
      logger.info(`Jira connection test successful: ${user.displayName}`);

      return true;

    } catch (error) {
      logger.error('Jira connection test failed:', error);
      return false;
    }
  }

  /**
   * Create a Jira issue
   */
  async createIssue(request: CreateIssueRequest): Promise<JiraIssue> {
    try {
      // Build issue payload
      const payload: any = {
        fields: {
          project: { key: request.project || this.config.defaultProject },
          issuetype: { name: request.issueType || this.config.defaultIssueType },
          summary: request.summary,
          description: this.formatDescription(request),
          priority: request.priority
            ? { name: request.priority }
            : this.config.defaultPriority
              ? { name: this.config.defaultPriority }
              : undefined,
        },
      };

      // Add assignee if specified
      if (request.assignee || this.config.defaultAssignee) {
        payload.fields.assignee = {
          name: request.assignee || this.config.defaultAssignee,
        };
      }

      // Add labels
      const labels = [
        ...(request.labels || []),
        ...(this.config.defaultLabels || []),
      ];
      if (labels.length > 0) {
        payload.fields.labels = labels;
      }

      // Add components
      const components = [
        ...(request.components || []),
        ...(this.config.defaultComponents || []),
      ];
      if (components.length > 0) {
        payload.fields.components = components.map(name => ({ name }));
      }

      // Add custom fields
      if (request.customFields || this.config.customFields) {
        Object.assign(
          payload.fields,
          this.mapCustomFields(request.customFields || {})
        );
      }

      // Create issue
      const response = await fetch(`${this.baseUrl}/rest/api/2/issue`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create Jira issue: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const issueKey = result.key;

      logger.info(`Created Jira issue: ${issueKey}`);

      // Get full issue details
      const issue = await this.getIssue(issueKey);

      this.emit('issueCreated', { issue, alert: request.alert });

      return issue;

    } catch (error) {
      logger.error('Failed to create Jira issue:', error);
      this.emit('error', { error, request });
      throw error;
    }
  }

  /**
   * Update a Jira issue
   */
  async updateIssue(request: UpdateIssueRequest): Promise<JiraIssue> {
    try {
      const payload: any = { fields: {} };

      // Build update payload
      if (request.summary) {
        payload.fields.summary = request.summary;
      }

      if (request.description) {
        payload.fields.description = request.description;
      }

      if (request.priority) {
        payload.fields.priority = { name: request.priority };
      }

      if (request.assignee) {
        payload.fields.assignee = { name: request.assignee };
      }

      if (request.labels) {
        payload.fields.labels = request.labels;
      }

      if (request.customFields) {
        Object.assign(payload.fields, this.mapCustomFields(request.customFields));
      }

      // Update issue
      const response = await fetch(
        `${this.baseUrl}/rest/api/2/issue/${request.issueKey}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update Jira issue: ${response.status} - ${errorText}`);
      }

      // Add comment if specified
      if (request.comment) {
        await this.addComment(request.issueKey, request.comment);
      }

      // Perform transition if specified
      if (request.transition) {
        await this.transitionIssue(request.issueKey, request.transition);
      }

      logger.info(`Updated Jira issue: ${request.issueKey}`);

      // Get updated issue details
      const issue = await this.getIssue(request.issueKey);

      this.emit('issueUpdated', { issue });

      return issue;

    } catch (error) {
      logger.error(`Failed to update Jira issue ${request.issueKey}:`, error);
      this.emit('error', { error, request });
      throw error;
    }
  }

  /**
   * Get a Jira issue
   */
  async getIssue(issueKey: string): Promise<JiraIssue> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/api/2/issue/${issueKey}`,
        {
          headers: {
            'Authorization': this.authHeader,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get Jira issue: ${response.status}`);
      }

      const issue = await response.json();
      return issue as JiraIssue;

    } catch (error) {
      logger.error(`Failed to get Jira issue ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Search for Jira issues
   */
  async searchIssues(jql: string, maxResults: number = 50): Promise<JiraIssue[]> {
    try {
      const params = new URLSearchParams({
        jql,
        maxResults: maxResults.toString(),
      });

      const response = await fetch(
        `${this.baseUrl}/rest/api/2/search?${params.toString()}`,
        {
          headers: {
            'Authorization': this.authHeader,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to search Jira issues: ${response.status}`);
      }

      const result = await response.json();
      return result.issues as JiraIssue[];

    } catch (error) {
      logger.error('Failed to search Jira issues:', error);
      throw error;
    }
  }

  /**
   * Add comment to Jira issue
   */
  async addComment(issueKey: string, comment: string): Promise<void> {
    try {
      const payload = {
        body: comment,
      };

      const response = await fetch(
        `${this.baseUrl}/rest/api/2/issue/${issueKey}/comment`,
        {
          method: 'POST',
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to add comment: ${response.status}`);
      }

      logger.debug(`Added comment to Jira issue: ${issueKey}`);

    } catch (error) {
      logger.error(`Failed to add comment to ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Transition Jira issue
   */
  async transitionIssue(issueKey: string, transitionName: string): Promise<void> {
    try {
      // Get available transitions
      const transitionsResponse = await fetch(
        `${this.baseUrl}/rest/api/2/issue/${issueKey}/transitions`,
        {
          headers: {
            'Authorization': this.authHeader,
            'Accept': 'application/json',
          },
        }
      );

      if (!transitionsResponse.ok) {
        throw new Error('Failed to get transitions');
      }

      const transitionsData = await transitionsResponse.json();
      const transition = transitionsData.transitions.find(
        (t: any) => t.name.toLowerCase() === transitionName.toLowerCase()
      );

      if (!transition) {
        throw new Error(`Transition not found: ${transitionName}`);
      }

      // Perform transition
      const payload = {
        transition: { id: transition.id },
      };

      const response = await fetch(
        `${this.baseUrl}/rest/api/2/issue/${issueKey}/transitions`,
        {
          method: 'POST',
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to transition issue: ${response.status}`);
      }

      logger.info(`Transitioned Jira issue ${issueKey} to: ${transitionName}`);

    } catch (error) {
      logger.error(`Failed to transition ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Link Jira issues
   */
  async linkIssues(
    inwardIssue: string,
    outwardIssue: string,
    linkType: string
  ): Promise<void> {
    try {
      const payload = {
        type: { name: linkType || this.config.linkType || 'Relates' },
        inwardIssue: { key: inwardIssue },
        outwardIssue: { key: outwardIssue },
      };

      const response = await fetch(`${this.baseUrl}/rest/api/2/issueLink`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to link issues: ${response.status}`);
      }

      logger.info(`Linked Jira issues: ${inwardIssue} -> ${outwardIssue}`);

    } catch (error) {
      logger.error('Failed to link Jira issues:', error);
      throw error;
    }
  }

  /**
   * Create issue from alert
   */
  async createIssueFromAlert(
    alert: SIEMAlert,
    triageResult?: TriageResult
  ): Promise<JiraIssue> {
    const summary = `[${alert.severity.toUpperCase()}] ${alert.title}`;

    const description = this.buildAlertDescription(alert, triageResult);

    const priority = this.mapSeverityToPriority(
      triageResult?.triagePriority || alert.severity
    );

    const labels = [
      'security',
      'automated',
      alert.severity,
      ...(triageResult?.tags || []),
    ];

    return await this.createIssue({
      project: this.config.defaultProject,
      issueType: this.config.defaultIssueType,
      summary,
      description,
      priority,
      labels,
      alert,
      triageResult,
    });
  }

  /**
   * Update issue from alert
   */
  async updateIssueFromAlert(
    issueKey: string,
    alert: SIEMAlert,
    comment?: string
  ): Promise<JiraIssue> {
    const updateComment = comment || `Alert updated: ${alert.status}`;

    return await this.updateIssue({
      issueKey,
      comment: updateComment,
    });
  }

  /**
   * Format issue description
   */
  private formatDescription(request: CreateIssueRequest): string {
    if (request.alert) {
      return this.buildAlertDescription(request.alert, request.triageResult);
    }

    return request.description;
  }

  /**
   * Build description for alert-based issue
   */
  private buildAlertDescription(
    alert: SIEMAlert,
    triageResult?: TriageResult
  ): string {
    const lines: string[] = [];

    lines.push('h2. Alert Details');
    lines.push(`*Source:* ${alert.source}`);
    lines.push(`*Severity:* ${alert.severity.toUpperCase()}`);
    lines.push(`*Status:* ${alert.status}`);
    lines.push(`*Detected:* ${alert.detectedAt.toISOString()}`);
    lines.push('');

    lines.push('h3. Description');
    lines.push(alert.description || 'No description provided');
    lines.push('');

    if (alert.iocs && alert.iocs.length > 0) {
      lines.push('h3. Indicators of Compromise (IOCs)');
      alert.iocs.forEach(ioc => {
        lines.push(`* *${ioc.type}:* {code}${ioc.value}{code}`);
      });
      lines.push('');
    }

    if (alert.metadata) {
      lines.push('h3. Metadata');
      Object.entries(alert.metadata).forEach(([key, value]) => {
        if (value && typeof value !== 'object') {
          lines.push(`* *${key}:* ${value}`);
        }
      });
      lines.push('');
    }

    if (triageResult) {
      lines.push('h2. Triage Analysis');
      lines.push(`*Priority:* ${triageResult.triagePriority.toUpperCase()}`);
      lines.push(`*Score:* ${triageResult.score}/100`);
      lines.push(`*Confidence:* ${(triageResult.confidence * 100).toFixed(1)}%`);

      if (triageResult.category) {
        lines.push(`*Category:* ${triageResult.category}`);
      }

      if (triageResult.reasoning.length > 0) {
        lines.push('');
        lines.push('h3. Reasoning');
        triageResult.reasoning.forEach(reason => {
          lines.push(`* ${reason}`);
        });
      }
    }

    lines.push('');
    lines.push('---');
    lines.push('_Automatically generated by ThreatFlow_');

    return lines.join('\n');
  }

  /**
   * Map severity to Jira priority
   */
  private mapSeverityToPriority(severity: string): string {
    const mapping: Record<string, string> = {
      critical: 'Highest',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    };

    return mapping[severity.toLowerCase()] || 'Medium';
  }

  /**
   * Map custom fields
   */
  private mapCustomFields(customFields: Record<string, any>): Record<string, any> {
    const mapped: Record<string, any> = {};

    if (this.config.customFields) {
      Object.entries(customFields).forEach(([key, value]) => {
        const fieldId = this.config.customFields?.[key];
        if (fieldId) {
          mapped[fieldId] = value;
        }
      });
    }

    return mapped;
  }

  /**
   * Get connector configuration
   */
  getConfig(): JiraConfig {
    return { ...this.config };
  }

  /**
   * Update connector configuration
   */
  updateConfig(config: Partial<JiraConfig>): void {
    this.config = { ...this.config, ...config };
    this.authHeader = this.buildAuthHeader();
    logger.info('Jira connector configuration updated');
  }
}
