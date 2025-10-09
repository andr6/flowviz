/**
 * Ticketing Integration Service
 *
 * Unified service for integrating with ticketing/ITSM platforms
 * - Jira
 * - ServiceNow
 * - Azure DevOps
 * - GitHub Issues
 * - Custom ticketing systems
 */

import { Pool } from 'pg';

export type TicketingPlatform = 'jira' | 'servicenow' | 'azure_devops' | 'github' | 'custom';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface TicketingConfig {
  id?: string;
  platform: TicketingPlatform;
  name: string;
  baseUrl: string;
  apiKey: string;
  username?: string;
  projectKey?: string;
  organizationId?: string;
  repositoryOwner?: string;
  repositoryName?: string;
  additionalConfig?: Record<string, any>;
  enabled: boolean;
}

export interface Ticket {
  id?: string;
  ticketingConfigId: string;
  externalTicketId?: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignee?: string;
  labels?: string[];
  sourceType: 'gap' | 'finding' | 'recommendation' | 'alert';
  sourceId: string;
  jobId?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TicketCreateResult {
  success: boolean;
  ticketId?: string;
  externalTicketId?: string;
  url?: string;
  message?: string;
}

export interface TicketUpdateResult {
  success: boolean;
  message?: string;
}

/**
 * Ticketing Integration Service
 */
export class TicketingIntegrationService {
  private pool: Pool;
  private configs: Map<string, TicketingConfig> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
    this.loadConfigurations();
  }

  /**
   * Load ticketing configurations from database
   */
  private async loadConfigurations(): Promise<void> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM ticketing_integrations WHERE enabled = true'
      );

      for (const row of result.rows) {
        this.configs.set(row.id, {
          id: row.id,
          platform: row.platform,
          name: row.name,
          baseUrl: row.base_url,
          apiKey: row.api_key,
          username: row.username,
          projectKey: row.project_key,
          organizationId: row.organization_id,
          repositoryOwner: row.repository_owner,
          repositoryName: row.repository_name,
          additionalConfig: row.additional_config,
          enabled: row.enabled,
        });
      }
    } catch (error) {
      console.error('Failed to load ticketing configurations:', error);
    }
  }

  /**
   * Add ticketing configuration
   */
  async addConfiguration(config: Omit<TicketingConfig, 'id'>): Promise<TicketingConfig> {
    const result = await this.pool.query(
      `INSERT INTO ticketing_integrations (
        platform, name, base_url, api_key, username, project_key,
        organization_id, repository_owner, repository_name,
        additional_config, enabled, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *`,
      [
        config.platform,
        config.name,
        config.baseUrl,
        config.apiKey,
        config.username,
        config.projectKey,
        config.organizationId,
        config.repositoryOwner,
        config.repositoryName,
        JSON.stringify(config.additionalConfig || {}),
        config.enabled,
      ]
    );

    const saved: TicketingConfig = {
      id: result.rows[0].id,
      platform: result.rows[0].platform,
      name: result.rows[0].name,
      baseUrl: result.rows[0].base_url,
      apiKey: result.rows[0].api_key,
      username: result.rows[0].username,
      projectKey: result.rows[0].project_key,
      organizationId: result.rows[0].organization_id,
      repositoryOwner: result.rows[0].repository_owner,
      repositoryName: result.rows[0].repository_name,
      additionalConfig: result.rows[0].additional_config,
      enabled: result.rows[0].enabled,
    };

    this.configs.set(saved.id!, saved);
    return saved;
  }

  /**
   * Test ticketing system connection
   */
  async testConnection(configId: string): Promise<{ success: boolean; message: string }> {
    const config = this.configs.get(configId);
    if (!config) {
      return { success: false, message: 'Configuration not found' };
    }

    try {
      switch (config.platform) {
        case 'jira':
          return await this.testJiraConnection(config);
        case 'servicenow':
          return await this.testServiceNowConnection(config);
        case 'azure_devops':
          return await this.testAzureDevOpsConnection(config);
        case 'github':
          return await this.testGitHubConnection(config);
        default:
          return { success: false, message: 'Platform not supported' };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Create ticket in ticketing system
   */
  async createTicket(ticket: Ticket): Promise<TicketCreateResult> {
    const config = this.configs.get(ticket.ticketingConfigId);
    if (!config) {
      return { success: false, message: 'Configuration not found' };
    }

    try {
      let result: TicketCreateResult;

      switch (config.platform) {
        case 'jira':
          result = await this.createJiraTicket(config, ticket);
          break;
        case 'servicenow':
          result = await this.createServiceNowTicket(config, ticket);
          break;
        case 'azure_devops':
          result = await this.createAzureDevOpsTicket(config, ticket);
          break;
        case 'github':
          result = await this.createGitHubIssue(config, ticket);
          break;
        default:
          return { success: false, message: 'Platform not supported' };
      }

      if (result.success) {
        // Save ticket to database
        const dbResult = await this.pool.query(
          `INSERT INTO tickets (
            ticketing_config_id, external_ticket_id, title, description,
            priority, status, assignee, labels, source_type, source_id,
            job_id, metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
          RETURNING id`,
          [
            ticket.ticketingConfigId,
            result.externalTicketId,
            ticket.title,
            ticket.description,
            ticket.priority,
            ticket.status,
            ticket.assignee,
            JSON.stringify(ticket.labels || []),
            ticket.sourceType,
            ticket.sourceId,
            ticket.jobId,
            JSON.stringify(ticket.metadata || {}),
          ]
        );

        result.ticketId = dbResult.rows[0].id;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Ticket creation failed',
      };
    }
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(
    ticketId: string,
    status: TicketStatus,
    comment?: string
  ): Promise<TicketUpdateResult> {
    try {
      const ticketResult = await this.pool.query(
        'SELECT * FROM tickets WHERE id = $1',
        [ticketId]
      );

      if (ticketResult.rows.length === 0) {
        return { success: false, message: 'Ticket not found' };
      }

      const ticket = ticketResult.rows[0];
      const config = this.configs.get(ticket.ticketing_config_id);

      if (!config) {
        return { success: false, message: 'Configuration not found' };
      }

      let result: TicketUpdateResult;

      switch (config.platform) {
        case 'jira':
          result = await this.updateJiraTicket(config, ticket.external_ticket_id, status, comment);
          break;
        case 'servicenow':
          result = await this.updateServiceNowTicket(config, ticket.external_ticket_id, status, comment);
          break;
        case 'azure_devops':
          result = await this.updateAzureDevOpsTicket(config, ticket.external_ticket_id, status, comment);
          break;
        case 'github':
          result = await this.updateGitHubIssue(config, ticket.external_ticket_id, status, comment);
          break;
        default:
          return { success: false, message: 'Platform not supported' };
      }

      if (result.success) {
        // Update ticket in database
        await this.pool.query(
          'UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2',
          [status, ticketId]
        );
      }

      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Update failed',
      };
    }
  }

  /**
   * Create tickets from gap analysis results
   */
  async createTicketsFromGaps(
    jobId: string,
    ticketingConfigId: string,
    gapIds: string[]
  ): Promise<TicketCreateResult[]> {
    const results: TicketCreateResult[] = [];

    for (const gapId of gapIds) {
      const gapResult = await this.pool.query(
        'SELECT * FROM control_gaps WHERE id = $1',
        [gapId]
      );

      if (gapResult.rows.length === 0) {
        results.push({ success: false, message: `Gap ${gapId} not found` });
        continue;
      }

      const gap = gapResult.rows[0];

      const ticket: Ticket = {
        ticketingConfigId,
        title: `Control Gap: ${gap.technique_name} (${gap.technique_id})`,
        description: this.formatGapDescription(gap),
        priority: gap.severity === 'high' ? 'high' : gap.severity === 'critical' ? 'critical' : 'medium',
        status: 'open',
        labels: ['security', 'attack-simulation', gap.technique_id],
        sourceType: 'gap',
        sourceId: gapId,
        jobId,
        metadata: {
          techniqueId: gap.technique_id,
          techniqueName: gap.technique_name,
          severity: gap.severity,
          category: gap.category,
        },
      };

      const result = await this.createTicket(ticket);
      results.push(result);
    }

    return results;
  }

  /**
   * Create tickets from recommendations
   */
  async createTicketsFromRecommendations(
    recommendationIds: string[],
    ticketingConfigId: string
  ): Promise<TicketCreateResult[]> {
    const results: TicketCreateResult[] = [];

    for (const recId of recommendationIds) {
      const recResult = await this.pool.query(
        'SELECT * FROM remediation_recommendations WHERE id = $1',
        [recId]
      );

      if (recResult.rows.length === 0) {
        results.push({ success: false, message: `Recommendation ${recId} not found` });
        continue;
      }

      const rec = recResult.rows[0];

      const ticket: Ticket = {
        ticketingConfigId,
        title: rec.title,
        description: this.formatRecommendationDescription(rec),
        priority: rec.priority,
        status: 'open',
        labels: ['security', 'remediation'],
        sourceType: 'recommendation',
        sourceId: recId,
        jobId: rec.job_id,
        metadata: {
          estimatedEffort: rec.estimated_effort,
          category: rec.category,
        },
      };

      const result = await this.createTicket(ticket);
      results.push(result);
    }

    return results;
  }

  // ============================================================================
  // Jira Integration
  // ============================================================================

  private async testJiraConnection(config: TicketingConfig): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${config.baseUrl}/rest/api/3/myself`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.username}:${config.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: response.ok,
        message: response.ok ? 'Connected to Jira successfully' : 'Connection failed',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private async createJiraTicket(config: TicketingConfig, ticket: Ticket): Promise<TicketCreateResult> {
    try {
      const issue = {
        fields: {
          project: { key: config.projectKey },
          summary: ticket.title,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: ticket.description }],
              },
            ],
          },
          issuetype: { name: 'Task' },
          priority: { name: this.mapPriorityToJira(ticket.priority) },
          labels: ticket.labels || [],
        },
      };

      const response = await fetch(`${config.baseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.username}:${config.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issue),
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          externalTicketId: result.key,
          url: `${config.baseUrl}/browse/${result.key}`,
          message: 'Ticket created successfully',
        };
      } else {
        const error = await response.text();
        return { success: false, message: `Failed to create Jira ticket: ${error}` };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Ticket creation failed',
      };
    }
  }

  private async updateJiraTicket(
    config: TicketingConfig,
    ticketId: string,
    status: TicketStatus,
    comment?: string
  ): Promise<TicketUpdateResult> {
    try {
      // Add comment if provided
      if (comment) {
        await fetch(`${config.baseUrl}/rest/api/3/issue/${ticketId}/comment`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.username}:${config.apiKey}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            body: {
              type: 'doc',
              version: 1,
              content: [{ type: 'paragraph', content: [{ type: 'text', text: comment }] }],
            },
          }),
        });
      }

      return { success: true, message: 'Ticket updated successfully' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Update failed',
      };
    }
  }

  // ============================================================================
  // ServiceNow Integration
  // ============================================================================

  private async testServiceNowConnection(config: TicketingConfig): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${config.baseUrl}/api/now/table/sys_user?sysparm_limit=1`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.username}:${config.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: response.ok,
        message: response.ok ? 'Connected to ServiceNow successfully' : 'Connection failed',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private async createServiceNowTicket(config: TicketingConfig, ticket: Ticket): Promise<TicketCreateResult> {
    try {
      const incident = {
        short_description: ticket.title,
        description: ticket.description,
        priority: this.mapPriorityToServiceNow(ticket.priority),
        category: 'Security',
        subcategory: 'Vulnerability',
        u_source: 'Attack Simulation',
      };

      const response = await fetch(`${config.baseUrl}/api/now/table/incident`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.username}:${config.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incident),
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          externalTicketId: result.result.number,
          url: `${config.baseUrl}/nav_to.do?uri=incident.do?sys_id=${result.result.sys_id}`,
          message: 'Ticket created successfully',
        };
      } else {
        const error = await response.text();
        return { success: false, message: `Failed to create ServiceNow ticket: ${error}` };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Ticket creation failed',
      };
    }
  }

  private async updateServiceNowTicket(
    config: TicketingConfig,
    ticketId: string,
    status: TicketStatus,
    comment?: string
  ): Promise<TicketUpdateResult> {
    try {
      const update: any = {
        state: this.mapStatusToServiceNow(status),
      };

      if (comment) {
        update.comments = comment;
      }

      const response = await fetch(`${config.baseUrl}/api/now/table/incident?number=${ticketId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.username}:${config.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
      });

      return {
        success: response.ok,
        message: response.ok ? 'Ticket updated successfully' : 'Update failed',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Update failed',
      };
    }
  }

  // ============================================================================
  // Azure DevOps Integration
  // ============================================================================

  private async testAzureDevOpsConnection(config: TicketingConfig): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(
        `https://dev.azure.com/${config.organizationId}/_apis/projects?api-version=6.0`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`:${config.apiKey}`).toString('base64')}`,
          },
        }
      );

      return {
        success: response.ok,
        message: response.ok ? 'Connected to Azure DevOps successfully' : 'Connection failed',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private async createAzureDevOpsTicket(config: TicketingConfig, ticket: Ticket): Promise<TicketCreateResult> {
    try {
      const workItem = [
        { op: 'add', path: '/fields/System.Title', value: ticket.title },
        { op: 'add', path: '/fields/System.Description', value: ticket.description },
        { op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority', value: this.mapPriorityToAzureDevOps(ticket.priority) },
        { op: 'add', path: '/fields/System.Tags', value: (ticket.labels || []).join('; ') },
      ];

      const response = await fetch(
        `https://dev.azure.com/${config.organizationId}/${config.projectKey}/_apis/wit/workitems/$Task?api-version=6.0`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`:${config.apiKey}`).toString('base64')}`,
            'Content-Type': 'application/json-patch+json',
          },
          body: JSON.stringify(workItem),
        }
      );

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          externalTicketId: result.id.toString(),
          url: result._links.html.href,
          message: 'Ticket created successfully',
        };
      } else {
        const error = await response.text();
        return { success: false, message: `Failed to create Azure DevOps ticket: ${error}` };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Ticket creation failed',
      };
    }
  }

  private async updateAzureDevOpsTicket(
    config: TicketingConfig,
    ticketId: string,
    status: TicketStatus,
    comment?: string
  ): Promise<TicketUpdateResult> {
    try {
      const updates: any[] = [
        { op: 'add', path: '/fields/System.State', value: this.mapStatusToAzureDevOps(status) },
      ];

      if (comment) {
        updates.push({
          op: 'add',
          path: '/fields/System.History',
          value: comment,
        });
      }

      const response = await fetch(
        `https://dev.azure.com/${config.organizationId}/${config.projectKey}/_apis/wit/workitems/${ticketId}?api-version=6.0`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Basic ${Buffer.from(`:${config.apiKey}`).toString('base64')}`,
            'Content-Type': 'application/json-patch+json',
          },
          body: JSON.stringify(updates),
        }
      );

      return {
        success: response.ok,
        message: response.ok ? 'Ticket updated successfully' : 'Update failed',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Update failed',
      };
    }
  }

  // ============================================================================
  // GitHub Issues Integration
  // ============================================================================

  private async testGitHubConnection(config: TicketingConfig): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${config.apiKey}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      return {
        success: response.ok,
        message: response.ok ? 'Connected to GitHub successfully' : 'Connection failed',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private async createGitHubIssue(config: TicketingConfig, ticket: Ticket): Promise<TicketCreateResult> {
    try {
      const issue = {
        title: ticket.title,
        body: ticket.description,
        labels: ticket.labels || [],
      };

      const response = await fetch(
        `https://api.github.com/repos/${config.repositoryOwner}/${config.repositoryName}/issues`,
        {
          method: 'POST',
          headers: {
            Authorization: `token ${config.apiKey}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(issue),
        }
      );

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          externalTicketId: result.number.toString(),
          url: result.html_url,
          message: 'Issue created successfully',
        };
      } else {
        const error = await response.text();
        return { success: false, message: `Failed to create GitHub issue: ${error}` };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Issue creation failed',
      };
    }
  }

  private async updateGitHubIssue(
    config: TicketingConfig,
    ticketId: string,
    status: TicketStatus,
    comment?: string
  ): Promise<TicketUpdateResult> {
    try {
      // Add comment if provided
      if (comment) {
        await fetch(
          `https://api.github.com/repos/${config.repositoryOwner}/${config.repositoryName}/issues/${ticketId}/comments`,
          {
            method: 'POST',
            headers: {
              Authorization: `token ${config.apiKey}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ body: comment }),
          }
        );
      }

      // Update issue state if closed
      if (status === 'closed' || status === 'resolved') {
        const response = await fetch(
          `https://api.github.com/repos/${config.repositoryOwner}/${config.repositoryName}/issues/${ticketId}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `token ${config.apiKey}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ state: 'closed' }),
          }
        );

        return {
          success: response.ok,
          message: response.ok ? 'Issue updated successfully' : 'Update failed',
        };
      }

      return { success: true, message: 'Comment added successfully' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Update failed',
      };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private formatGapDescription(gap: any): string {
    return `
## Control Gap Identified

**Technique**: ${gap.technique_name} (${gap.technique_id})
**Severity**: ${gap.severity}
**Category**: ${gap.category}

### Description
${gap.description}

### Affected Assets
${gap.affected_assets ? gap.affected_assets.join(', ') : 'N/A'}

### Recommended Actions
${gap.recommendation || 'Review security controls and implement appropriate defenses.'}

---
*Generated by ThreatFlow Attack Simulation*
`;
  }

  private formatRecommendationDescription(rec: any): string {
    return `
## Remediation Recommendation

**Priority**: ${rec.priority}
**Estimated Effort**: ${rec.estimated_effort}
**Category**: ${rec.category}

### Description
${rec.description}

### Implementation Steps
${rec.implementation_steps ? rec.implementation_steps.map((step: any, i: number) => `${i + 1}. ${step.description}`).join('\n') : 'See recommendation details'}

---
*Generated by ThreatFlow Attack Simulation*
`;
  }

  private mapPriorityToJira(priority: TicketPriority): string {
    const map: Record<TicketPriority, string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Highest',
    };
    return map[priority];
  }

  private mapPriorityToServiceNow(priority: TicketPriority): string {
    const map: Record<TicketPriority, string> = {
      low: '4',
      medium: '3',
      high: '2',
      critical: '1',
    };
    return map[priority];
  }

  private mapPriorityToAzureDevOps(priority: TicketPriority): number {
    const map: Record<TicketPriority, number> = {
      low: 4,
      medium: 3,
      high: 2,
      critical: 1,
    };
    return map[priority];
  }

  private mapStatusToServiceNow(status: TicketStatus): string {
    const map: Record<TicketStatus, string> = {
      open: '1',
      in_progress: '2',
      resolved: '6',
      closed: '7',
    };
    return map[status];
  }

  private mapStatusToAzureDevOps(status: TicketStatus): string {
    const map: Record<TicketStatus, string> = {
      open: 'New',
      in_progress: 'Active',
      resolved: 'Resolved',
      closed: 'Closed',
    };
    return map[status];
  }
}

export default TicketingIntegrationService;
