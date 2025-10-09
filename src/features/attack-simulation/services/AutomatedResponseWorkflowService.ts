/**
 * Automated Response Workflow Service
 *
 * Orchestrates automated responses to simulation results including:
 * - Workflow definition and execution
 * - Action chaining and conditionals
 * - Integration with SIEM, ticketing, and notification systems
 * - Workflow scheduling and triggering
 */

import { Pool } from 'pg';
import { SiemIntegrationService } from './integrations/SiemIntegrationService';
import { TicketingIntegrationService } from './integrations/TicketingIntegrationService';

export type WorkflowTrigger = 'job_complete' | 'gap_detected' | 'technique_failed' | 'technique_passed' | 'manual' | 'scheduled';
export type ActionType =
  | 'create_ticket'
  | 'deploy_detection_rule'
  | 'send_notification'
  | 'update_status'
  | 'execute_remediation'
  | 'escalate'
  | 'create_report'
  | 'custom_webhook';

export type ConditionOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';

export interface WorkflowCondition {
  field: string; // e.g., 'severity', 'technique_id', 'detection_score'
  operator: ConditionOperator;
  value: any;
  logicalOperator?: 'AND' | 'OR'; // For combining multiple conditions
}

export interface WorkflowAction {
  id: string;
  type: ActionType;
  config: Record<string, any>;
  order: number;
  continueOnError: boolean;
  delaySeconds?: number;
  retryConfig?: {
    maxRetries: number;
    retryDelaySeconds: number;
  };
}

export interface Workflow {
  id?: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  triggerConditions?: WorkflowCondition[];
  actions: WorkflowAction[];
  notifyOnSuccess?: boolean;
  notifyOnFailure?: boolean;
  notificationChannels?: string[];
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WorkflowExecution {
  id?: string;
  workflowId: string;
  jobId?: string;
  sourceType?: string;
  sourceId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  executionLog: WorkflowExecutionLog[];
  error?: string;
}

export interface WorkflowExecutionLog {
  actionId: string;
  actionType: ActionType;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  retryCount?: number;
}

/**
 * Automated Response Workflow Service
 */
export class AutomatedResponseWorkflowService {
  private pool: Pool;
  private siemService: SiemIntegrationService;
  private ticketingService: TicketingIntegrationService;
  private workflows: Map<string, Workflow> = new Map();

  constructor(pool: Pool, siemService: SiemIntegrationService, ticketingService: TicketingIntegrationService) {
    this.pool = pool;
    this.siemService = siemService;
    this.ticketingService = ticketingService;
    this.loadWorkflows();
  }

  /**
   * Load workflows from database
   */
  private async loadWorkflows(): Promise<void> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM automated_workflows WHERE enabled = true'
      );

      for (const row of result.rows) {
        this.workflows.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          enabled: row.enabled,
          trigger: row.trigger,
          triggerConditions: row.trigger_conditions,
          actions: row.actions,
          notifyOnSuccess: row.notify_on_success,
          notifyOnFailure: row.notify_on_failure,
          notificationChannels: row.notification_channels,
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  }

  /**
   * Create new workflow
   */
  async createWorkflow(workflow: Omit<Workflow, 'id'>): Promise<Workflow> {
    const result = await this.pool.query(
      `INSERT INTO automated_workflows (
        name, description, enabled, trigger, trigger_conditions,
        actions, notify_on_success, notify_on_failure, notification_channels,
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *`,
      [
        workflow.name,
        workflow.description,
        workflow.enabled,
        workflow.trigger,
        JSON.stringify(workflow.triggerConditions || []),
        JSON.stringify(workflow.actions),
        workflow.notifyOnSuccess,
        workflow.notifyOnFailure,
        JSON.stringify(workflow.notificationChannels || []),
        workflow.createdBy,
      ]
    );

    const saved: Workflow = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      description: result.rows[0].description,
      enabled: result.rows[0].enabled,
      trigger: result.rows[0].trigger,
      triggerConditions: result.rows[0].trigger_conditions,
      actions: result.rows[0].actions,
      notifyOnSuccess: result.rows[0].notify_on_success,
      notifyOnFailure: result.rows[0].notify_on_failure,
      notificationChannels: result.rows[0].notification_channels,
      createdBy: result.rows[0].created_by,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };

    this.workflows.set(saved.id!, saved);
    return saved;
  }

  /**
   * Trigger workflows based on event
   */
  async triggerWorkflows(
    trigger: WorkflowTrigger,
    context: {
      jobId?: string;
      sourceType?: string;
      sourceId?: string;
      data?: any;
    }
  ): Promise<WorkflowExecution[]> {
    const matchingWorkflows = Array.from(this.workflows.values()).filter(
      wf => wf.enabled && wf.trigger === trigger
    );

    const executions: WorkflowExecution[] = [];

    for (const workflow of matchingWorkflows) {
      // Check trigger conditions
      if (workflow.triggerConditions && workflow.triggerConditions.length > 0) {
        const conditionsMet = this.evaluateConditions(workflow.triggerConditions, context.data);
        if (!conditionsMet) {
          continue;
        }
      }

      // Create execution record
      const execution = await this.createExecution(workflow.id!, context);
      executions.push(execution);

      // Execute workflow asynchronously
      this.executeWorkflow(execution).catch(error => {
        console.error(`Workflow execution ${execution.id} failed:`, error);
      });
    }

    return executions;
  }

  /**
   * Execute a workflow
   */
  private async executeWorkflow(execution: WorkflowExecution): Promise<void> {
    try {
      await this.updateExecutionStatus(execution.id!, 'running');

      const workflow = this.workflows.get(execution.workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Sort actions by order
      const sortedActions = [...workflow.actions].sort((a, b) => a.order - b.order);

      // Execute actions sequentially
      for (const action of sortedActions) {
        const logEntry: WorkflowExecutionLog = {
          actionId: action.id,
          actionType: action.type,
          status: 'pending',
          startedAt: new Date(),
        };

        try {
          // Add delay if configured
          if (action.delaySeconds && action.delaySeconds > 0) {
            await this.delay(action.delaySeconds * 1000);
          }

          logEntry.status = 'running';
          await this.appendExecutionLog(execution.id!, logEntry);

          // Execute action with retry logic
          const result = await this.executeActionWithRetry(action, execution);

          logEntry.status = 'success';
          logEntry.completedAt = new Date();
          logEntry.result = result;
          await this.appendExecutionLog(execution.id!, logEntry);
        } catch (error) {
          logEntry.status = 'failed';
          logEntry.completedAt = new Date();
          logEntry.error = error instanceof Error ? error.message : 'Action failed';
          await this.appendExecutionLog(execution.id!, logEntry);

          if (!action.continueOnError) {
            throw error;
          }
        }
      }

      await this.updateExecutionStatus(execution.id!, 'completed');

      // Send success notification if configured
      if (workflow.notifyOnSuccess) {
        await this.sendWorkflowNotification(execution, 'success');
      }
    } catch (error) {
      await this.updateExecutionStatus(
        execution.id!,
        'failed',
        error instanceof Error ? error.message : 'Workflow execution failed'
      );

      // Send failure notification if configured
      const workflow = this.workflows.get(execution.workflowId);
      if (workflow?.notifyOnFailure) {
        await this.sendWorkflowNotification(execution, 'failure');
      }
    }
  }

  /**
   * Execute action with retry logic
   */
  private async executeActionWithRetry(
    action: WorkflowAction,
    execution: WorkflowExecution,
    retryCount: number = 0
  ): Promise<any> {
    try {
      return await this.executeAction(action, execution);
    } catch (error) {
      if (action.retryConfig && retryCount < action.retryConfig.maxRetries) {
        console.log(`Retrying action ${action.id}, attempt ${retryCount + 1}/${action.retryConfig.maxRetries}`);

        await this.delay(action.retryConfig.retryDelaySeconds * 1000);
        return await this.executeActionWithRetry(action, execution, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Execute individual action
   */
  private async executeAction(action: WorkflowAction, execution: WorkflowExecution): Promise<any> {
    switch (action.type) {
      case 'create_ticket':
        return await this.executeCreateTicketAction(action, execution);

      case 'deploy_detection_rule':
        return await this.executeDeployDetectionRuleAction(action, execution);

      case 'send_notification':
        return await this.executeSendNotificationAction(action, execution);

      case 'update_status':
        return await this.executeUpdateStatusAction(action, execution);

      case 'escalate':
        return await this.executeEscalateAction(action, execution);

      case 'create_report':
        return await this.executeCreateReportAction(action, execution);

      case 'custom_webhook':
        return await this.executeCustomWebhookAction(action, execution);

      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }

  /**
   * Create ticket action
   */
  private async executeCreateTicketAction(action: WorkflowAction, execution: WorkflowExecution): Promise<any> {
    const { ticketingConfigId, title, description, priority, labels, sourceType, sourceId } = action.config;

    return await this.ticketingService.createTicket({
      ticketingConfigId,
      title: this.interpolateTemplate(title, execution),
      description: this.interpolateTemplate(description, execution),
      priority: priority || 'medium',
      status: 'open',
      labels: labels || [],
      sourceType: sourceType || execution.sourceType || 'alert',
      sourceId: sourceId || execution.sourceId || execution.jobId!,
      jobId: execution.jobId,
    });
  }

  /**
   * Deploy detection rule action
   */
  private async executeDeployDetectionRuleAction(action: WorkflowAction, execution: WorkflowExecution): Promise<any> {
    const { siemConfigId, rule } = action.config;

    return await this.siemService.deployDetectionRule(siemConfigId, rule);
  }

  /**
   * Send notification action
   */
  private async executeSendNotificationAction(action: WorkflowAction, execution: WorkflowExecution): Promise<any> {
    const { channels, subject, message, severity } = action.config;

    // Implementation would integrate with notification service
    // For now, just log and save to database
    await this.pool.query(
      `INSERT INTO workflow_notifications (
        execution_id, channels, subject, message, severity, sent_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        execution.id,
        JSON.stringify(channels || []),
        this.interpolateTemplate(subject, execution),
        this.interpolateTemplate(message, execution),
        severity || 'info',
      ]
    );

    return { success: true, message: 'Notification sent' };
  }

  /**
   * Update status action
   */
  private async executeUpdateStatusAction(action: WorkflowAction, execution: WorkflowExecution): Promise<any> {
    const { targetType, targetId, newStatus } = action.config;

    let table: string;
    switch (targetType) {
      case 'job':
        table = 'simulation_jobs';
        break;
      case 'gap':
        table = 'control_gaps';
        break;
      case 'recommendation':
        table = 'remediation_recommendations';
        break;
      default:
        throw new Error(`Unsupported target type: ${targetType}`);
    }

    await this.pool.query(`UPDATE ${table} SET status = $1, updated_at = NOW() WHERE id = $2`, [
      newStatus,
      targetId || execution.sourceId,
    ]);

    return { success: true, message: 'Status updated' };
  }

  /**
   * Escalate action
   */
  private async executeEscalateAction(action: WorkflowAction, execution: WorkflowExecution): Promise<any> {
    const { escalateTo, reason, ticketingConfigId } = action.config;

    // Create high-priority ticket for escalation
    return await this.ticketingService.createTicket({
      ticketingConfigId,
      title: `ESCALATION: ${this.interpolateTemplate(action.config.title || 'Security Issue', execution)}`,
      description: `Escalated to: ${escalateTo}\n\nReason: ${reason}\n\n${this.interpolateTemplate(
        action.config.description || '',
        execution
      )}`,
      priority: 'critical',
      status: 'open',
      assignee: escalateTo,
      labels: ['escalation', 'urgent'],
      sourceType: execution.sourceType || 'alert',
      sourceId: execution.sourceId || execution.jobId!,
      jobId: execution.jobId,
    });
  }

  /**
   * Create report action
   */
  private async executeCreateReportAction(action: WorkflowAction, execution: WorkflowExecution): Promise<any> {
    const { reportType, format, includeCharts } = action.config;

    // Save report generation request
    const result = await this.pool.query(
      `INSERT INTO workflow_report_requests (
        execution_id, report_type, format, include_charts, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id`,
      [execution.id, reportType, format || 'pdf', includeCharts || false, 'pending']
    );

    return { success: true, reportRequestId: result.rows[0].id };
  }

  /**
   * Custom webhook action
   */
  private async executeCustomWebhookAction(action: WorkflowAction, execution: WorkflowExecution): Promise<any> {
    const { url, method, headers, body } = action.config;

    const response = await fetch(url, {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(this.interpolateObject(body, execution)),
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Evaluate workflow conditions
   */
  private evaluateConditions(conditions: WorkflowCondition[], data: any): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    let result = true;
    let currentLogicalOp: 'AND' | 'OR' = 'AND';

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, data);

      if (currentLogicalOp === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      currentLogicalOp = condition.logicalOperator || 'AND';
    }

    return result;
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(condition: WorkflowCondition, data: any): boolean {
    const fieldValue = this.getNestedValue(data, condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Get nested object value by path
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Interpolate template with execution context
   */
  private interpolateTemplate(template: string, execution: WorkflowExecution): string {
    // Replace placeholders like {jobId}, {sourceId}, etc.
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return (execution as any)[key] || match;
    });
  }

  /**
   * Interpolate object with execution context
   */
  private interpolateObject(obj: any, execution: WorkflowExecution): any {
    if (typeof obj === 'string') {
      return this.interpolateTemplate(obj, execution);
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateObject(item, execution));
    } else if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateObject(value, execution);
      }
      return result;
    }
    return obj;
  }

  /**
   * Create workflow execution record
   */
  private async createExecution(
    workflowId: string,
    context: {
      jobId?: string;
      sourceType?: string;
      sourceId?: string;
      data?: any;
    }
  ): Promise<WorkflowExecution> {
    const result = await this.pool.query(
      `INSERT INTO workflow_executions (
        workflow_id, job_id, source_type, source_id, status,
        execution_log, started_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *`,
      [
        workflowId,
        context.jobId,
        context.sourceType,
        context.sourceId,
        'pending',
        JSON.stringify([]),
      ]
    );

    return {
      id: result.rows[0].id,
      workflowId: result.rows[0].workflow_id,
      jobId: result.rows[0].job_id,
      sourceType: result.rows[0].source_type,
      sourceId: result.rows[0].source_id,
      status: result.rows[0].status,
      startedAt: result.rows[0].started_at,
      executionLog: [],
    };
  }

  /**
   * Update execution status
   */
  private async updateExecutionStatus(executionId: string, status: string, error?: string): Promise<void> {
    const updates: string[] = ['status = $1'];
    const values: any[] = [status];
    let paramCount = 2;

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updates.push(`completed_at = NOW()`);
    }

    if (error) {
      updates.push(`error = $${paramCount++}`);
      values.push(error);
    }

    values.push(executionId);

    await this.pool.query(
      `UPDATE workflow_executions SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );
  }

  /**
   * Append to execution log
   */
  private async appendExecutionLog(executionId: string, logEntry: WorkflowExecutionLog): Promise<void> {
    await this.pool.query(
      `UPDATE workflow_executions
       SET execution_log = execution_log || $1::jsonb
       WHERE id = $2`,
      [JSON.stringify(logEntry), executionId]
    );
  }

  /**
   * Send workflow notification
   */
  private async sendWorkflowNotification(execution: WorkflowExecution, type: 'success' | 'failure'): Promise<void> {
    const workflow = this.workflows.get(execution.workflowId);
    if (!workflow || !workflow.notificationChannels || workflow.notificationChannels.length === 0) {
      return;
    }

    const subject = `Workflow ${workflow.name} ${type === 'success' ? 'completed successfully' : 'failed'}`;
    const message = `Execution ID: ${execution.id}\nStatus: ${execution.status}\n${
      execution.error ? `Error: ${execution.error}` : ''
    }`;

    await this.pool.query(
      `INSERT INTO workflow_notifications (
        execution_id, channels, subject, message, severity, sent_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [execution.id, JSON.stringify(workflow.notificationChannels), subject, message, type === 'failure' ? 'error' : 'info']
    );
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get workflow executions
   */
  async getWorkflowExecutions(workflowId?: string, limit: number = 50): Promise<WorkflowExecution[]> {
    let query = 'SELECT * FROM workflow_executions WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (workflowId) {
      query += ` AND workflow_id = $${paramCount++}`;
      params.push(workflowId);
    }

    query += ` ORDER BY started_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await this.pool.query(query, params);

    return result.rows.map(row => ({
      id: row.id,
      workflowId: row.workflow_id,
      jobId: row.job_id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      executionLog: row.execution_log,
      error: row.error,
    }));
  }
}

export default AutomatedResponseWorkflowService;
