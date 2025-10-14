/**
 * Workflow Engine Core
 *
 * Orchestrates automated security response workflows with support for
 * sequential/parallel execution, conditional logic, error handling, and state management
 */

import { EventEmitter } from 'events';
import { logger } from '../../../shared/utils/logger';

export type WorkflowActionType =
  | 'enrichment'
  | 'notification'
  | 'ticket'
  | 'firewall'
  | 'edr'
  | 'email'
  | 'webhook'
  | 'script'
  | 'decision'
  | 'wait'
  | 'http';

export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

export interface WorkflowAction {
  id: string;
  type: WorkflowActionType;
  name: string;
  description?: string;

  // Action configuration
  config: Record<string, any>;

  // Execution settings
  timeout?: number; // milliseconds
  retryOnFailure?: boolean;
  maxRetries?: number;
  continueOnFailure?: boolean;

  // Conditional execution
  condition?: WorkflowCondition;

  // Dependencies (for parallel workflows)
  dependsOn?: string[]; // Array of action IDs
}

export interface WorkflowCondition {
  type: 'expression' | 'script' | 'always' | 'never';
  expression?: string; // e.g., "severity === 'critical' && iocs.length > 0"
  script?: string; // JavaScript code to evaluate
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: string;

  // Trigger configuration
  trigger: {
    type: 'manual' | 'alert' | 'webhook' | 'scheduled' | 'event';
    config: Record<string, any>;
  };

  // Workflow actions
  actions: WorkflowAction[];

  // Execution settings
  executionMode: 'sequential' | 'parallel' | 'dag'; // DAG = Directed Acyclic Graph
  timeout?: number; // Overall workflow timeout

  // Error handling
  onError?: 'stop' | 'continue' | 'rollback';
  errorActions?: WorkflowAction[]; // Actions to run on error

  // Metadata
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  tags?: string[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;

  // Execution state
  status: WorkflowStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds

  // Trigger context
  trigger: {
    type: string;
    data: any;
    timestamp: Date;
  };

  // Action executions
  actionExecutions: ActionExecution[];

  // Results
  output?: any;
  error?: string;

  // Metadata
  metadata: Record<string, any>;
}

export interface ActionExecution {
  actionId: string;
  actionName: string;
  actionType: WorkflowActionType;

  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  duration?: number;

  input?: any;
  output?: any;
  error?: string;

  retryCount: number;
  logs: string[];
}

export interface WorkflowContext {
  workflow: Workflow;
  execution: WorkflowExecution;
  trigger: any;
  variables: Map<string, any>;
  actionResults: Map<string, any>;
}

export class WorkflowEngine extends EventEmitter {
  private workflows: Map<string, Workflow>;
  private executions: Map<string, WorkflowExecution>;
  private actionHandlers: Map<WorkflowActionType, ActionHandler>;
  private maxConcurrentExecutions: number;
  private activeExecutions: number;

  constructor(config?: { maxConcurrentExecutions?: number }) {
    super();
    this.workflows = new Map();
    this.executions = new Map();
    this.actionHandlers = new Map();
    this.maxConcurrentExecutions = config?.maxConcurrentExecutions || 10;
    this.activeExecutions = 0;

    logger.info('Workflow Engine initialized');
  }

  /**
   * Register a workflow
   */
  registerWorkflow(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
    logger.info(`Workflow registered: ${workflow.name} (${workflow.id})`);
    this.emit('workflowRegistered', { workflow });
  }

  /**
   * Unregister a workflow
   */
  unregisterWorkflow(workflowId: string): void {
    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      this.workflows.delete(workflowId);
      logger.info(`Workflow unregistered: ${workflow.name} (${workflowId})`);
      this.emit('workflowUnregistered', { workflowId, workflow });
    }
  }

  /**
   * Register an action handler
   */
  registerActionHandler(type: WorkflowActionType, handler: ActionHandler): void {
    this.actionHandlers.set(type, handler);
    logger.info(`Action handler registered: ${type}`);
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    trigger: { type: string; data: any }
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (!workflow.enabled) {
      throw new Error(`Workflow is disabled: ${workflow.name}`);
    }

    // Check concurrent execution limit
    if (this.activeExecutions >= this.maxConcurrentExecutions) {
      throw new Error('Maximum concurrent executions reached');
    }

    // Create execution record
    const execution: WorkflowExecution = {
      id: this.generateExecutionId(),
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: 'pending',
      startTime: new Date(),
      trigger: {
        type: trigger.type,
        data: trigger.data,
        timestamp: new Date(),
      },
      actionExecutions: workflow.actions.map(action => ({
        actionId: action.id,
        actionName: action.name,
        actionType: action.type,
        status: 'pending',
        retryCount: 0,
        logs: [],
      })),
      metadata: {},
    };

    this.executions.set(execution.id, execution);
    this.emit('executionStarted', { execution });

    // Execute workflow asynchronously
    this.runWorkflow(workflow, execution, trigger.data).catch(error => {
      logger.error(`Workflow execution error: ${execution.id}`, error);
    });

    return execution;
  }

  /**
   * Run workflow execution
   */
  private async runWorkflow(
    workflow: Workflow,
    execution: WorkflowExecution,
    triggerData: any
  ): Promise<void> {
    this.activeExecutions++;
    execution.status = 'running';
    this.emit('executionStatusChanged', { execution });

    try {
      // Create workflow context
      const context: WorkflowContext = {
        workflow,
        execution,
        trigger: triggerData,
        variables: new Map(),
        actionResults: new Map(),
      };

      // Execute actions based on execution mode
      switch (workflow.executionMode) {
        case 'sequential':
          await this.executeSequential(context);
          break;
        case 'parallel':
          await this.executeParallel(context);
          break;
        case 'dag':
          await this.executeDAG(context);
          break;
      }

      // Workflow completed successfully
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      logger.info(
        `Workflow completed: ${workflow.name} (${execution.id}) in ${execution.duration}ms`
      );

      this.emit('executionCompleted', { execution });

    } catch (error) {
      // Workflow failed
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.duration = execution.endTime!.getTime() - execution.startTime.getTime();
      execution.error = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`Workflow failed: ${workflow.name} (${execution.id})`, error);

      // Execute error actions if configured
      if (workflow.errorActions && workflow.errorActions.length > 0) {
        await this.executeErrorActions(workflow, execution, error);
      }

      this.emit('executionFailed', { execution, error });

    } finally {
      this.activeExecutions--;
    }
  }

  /**
   * Execute actions sequentially
   */
  private async executeSequential(context: WorkflowContext): Promise<void> {
    for (const action of context.workflow.actions) {
      const actionExecution = context.execution.actionExecutions.find(
        ae => ae.actionId === action.id
      )!;

      // Check if action should be skipped based on condition
      if (action.condition && !this.evaluateCondition(action.condition, context)) {
        actionExecution.status = 'skipped';
        logger.debug(`Action skipped: ${action.name} (condition not met)`);
        continue;
      }

      await this.executeAction(action, actionExecution, context);

      // Check if workflow should continue
      if (actionExecution.status === 'failed' && !action.continueOnFailure) {
        if (context.workflow.onError === 'stop') {
          throw new Error(`Action failed: ${action.name}`);
        }
      }
    }
  }

  /**
   * Execute actions in parallel
   */
  private async executeParallel(context: WorkflowContext): Promise<void> {
    const promises = context.workflow.actions.map(async action => {
      const actionExecution = context.execution.actionExecutions.find(
        ae => ae.actionId === action.id
      )!;

      // Check condition
      if (action.condition && !this.evaluateCondition(action.condition, context)) {
        actionExecution.status = 'skipped';
        return;
      }

      await this.executeAction(action, actionExecution, context);
    });

    await Promise.all(promises);
  }

  /**
   * Execute actions using DAG (Directed Acyclic Graph)
   */
  private async executeDAG(context: WorkflowContext): Promise<void> {
    const completed = new Set<string>();
    const inProgress = new Set<string>();

    const executeWithDependencies = async (action: WorkflowAction): Promise<void> => {
      // Check if already executed or in progress
      if (completed.has(action.id) || inProgress.has(action.id)) {
        return;
      }

      // Wait for dependencies
      if (action.dependsOn && action.dependsOn.length > 0) {
        const dependencyPromises = action.dependsOn.map(depId => {
          const depAction = context.workflow.actions.find(a => a.id === depId);
          if (!depAction) {
            throw new Error(`Dependency not found: ${depId}`);
          }
          return executeWithDependencies(depAction);
        });

        await Promise.all(dependencyPromises);
      }

      // Execute action
      inProgress.add(action.id);

      const actionExecution = context.execution.actionExecutions.find(
        ae => ae.actionId === action.id
      )!;

      // Check condition
      if (action.condition && !this.evaluateCondition(action.condition, context)) {
        actionExecution.status = 'skipped';
        completed.add(action.id);
        inProgress.delete(action.id);
        return;
      }

      await this.executeAction(action, actionExecution, context);

      completed.add(action.id);
      inProgress.delete(action.id);
    };

    // Execute all actions with dependencies
    const promises = context.workflow.actions.map(action =>
      executeWithDependencies(action)
    );

    await Promise.all(promises);
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: WorkflowAction,
    actionExecution: ActionExecution,
    context: WorkflowContext
  ): Promise<void> {
    const handler = this.actionHandlers.get(action.type);

    if (!handler) {
      throw new Error(`No handler registered for action type: ${action.type}`);
    }

    actionExecution.status = 'running';
    actionExecution.startTime = new Date();
    actionExecution.logs.push(`Action started: ${action.name}`);

    logger.debug(`Executing action: ${action.name} (${action.type})`);

    const maxRetries = action.maxRetries || 0;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Prepare input for action
        const input = this.prepareActionInput(action, context);
        actionExecution.input = input;

        // Execute action with timeout
        const timeout = action.timeout || 30000;
        const result = await this.executeWithTimeout(
          () => handler.execute(input, context),
          timeout
        );

        // Action completed successfully
        actionExecution.status = 'completed';
        actionExecution.endTime = new Date();
        actionExecution.duration =
          actionExecution.endTime.getTime() - actionExecution.startTime!.getTime();
        actionExecution.output = result;
        actionExecution.logs.push(`Action completed successfully`);

        // Store result in context
        context.actionResults.set(action.id, result);

        logger.debug(
          `Action completed: ${action.name} in ${actionExecution.duration}ms`
        );

        this.emit('actionCompleted', { action, actionExecution, context });

        return;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        actionExecution.retryCount = attempt;

        if (attempt < maxRetries && action.retryOnFailure) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          actionExecution.logs.push(
            `Action failed (attempt ${attempt + 1}/${maxRetries + 1}), ` +
            `retrying in ${delay}ms: ${lastError.message}`
          );
          logger.warn(
            `Action retry: ${action.name} (attempt ${attempt + 1}/${maxRetries + 1})`
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          actionExecution.status = 'failed';
          actionExecution.endTime = new Date();
          actionExecution.duration =
            actionExecution.endTime.getTime() - actionExecution.startTime!.getTime();
          actionExecution.error = lastError.message;
          actionExecution.logs.push(`Action failed: ${lastError.message}`);

          logger.error(`Action failed: ${action.name}`, lastError);

          this.emit('actionFailed', { action, actionExecution, error: lastError, context });

          if (!action.continueOnFailure) {
            throw lastError;
          }

          return;
        }
      }
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Action timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Prepare input for action execution
   */
  private prepareActionInput(
    action: WorkflowAction,
    context: WorkflowContext
  ): any {
    const input = {
      ...action.config,
      trigger: context.trigger,
      variables: Object.fromEntries(context.variables),
      actionResults: Object.fromEntries(context.actionResults),
    };

    return input;
  }

  /**
   * Evaluate workflow condition
   */
  private evaluateCondition(
    condition: WorkflowCondition,
    context: WorkflowContext
  ): boolean {
    switch (condition.type) {
      case 'always':
        return true;

      case 'never':
        return false;

      case 'expression':
        if (!condition.expression) return true;
        return this.evaluateExpression(condition.expression, context);

      case 'script':
        if (!condition.script) return true;
        return this.evaluateScript(condition.script, context);

      default:
        return true;
    }
  }

  /**
   * Evaluate expression condition
   */
  private evaluateExpression(expression: string, context: WorkflowContext): boolean {
    try {
      // Create evaluation context
      const evalContext = {
        trigger: context.trigger,
        variables: Object.fromEntries(context.variables),
        actionResults: Object.fromEntries(context.actionResults),
        workflow: context.workflow,
      };

      // Simple expression evaluation (can be enhanced with a proper expression parser)
      const func = new Function('context', `with(context) { return ${expression}; }`);
      return Boolean(func(evalContext));

    } catch (error) {
      logger.error('Expression evaluation error:', error);
      return false;
    }
  }

  /**
   * Evaluate script condition
   */
  private evaluateScript(script: string, context: WorkflowContext): boolean {
    try {
      // Create evaluation context
      const evalContext = {
        trigger: context.trigger,
        variables: Object.fromEntries(context.variables),
        actionResults: Object.fromEntries(context.actionResults),
        workflow: context.workflow,
      };

      // Execute script (sandboxed)
      const func = new Function('context', script);
      return Boolean(func(evalContext));

    } catch (error) {
      logger.error('Script evaluation error:', error);
      return false;
    }
  }

  /**
   * Execute error actions
   */
  private async executeErrorActions(
    workflow: Workflow,
    execution: WorkflowExecution,
    error: any
  ): Promise<void> {
    logger.info(`Executing error actions for workflow: ${workflow.name}`);

    for (const action of workflow.errorActions || []) {
      try {
        const handler = this.actionHandlers.get(action.type);
        if (!handler) continue;

        const input = {
          ...action.config,
          error: error instanceof Error ? error.message : String(error),
          execution,
        };

        await handler.execute(input, {
          workflow,
          execution,
          trigger: execution.trigger.data,
          variables: new Map(),
          actionResults: new Map(),
        });

      } catch (errorActionError) {
        logger.error(
          `Error action failed: ${action.name}`,
          errorActionError
        );
      }
    }
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get all executions for a workflow
   */
  getWorkflowExecutions(workflowId: string): WorkflowExecution[] {
    return Array.from(this.executions.values()).filter(
      e => e.workflowId === workflowId
    );
  }

  /**
   * Cancel workflow execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);

    if (!execution) {
      return false;
    }

    if (execution.status !== 'running') {
      return false;
    }

    execution.status = 'cancelled';
    execution.endTime = new Date();
    execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

    logger.info(`Workflow execution cancelled: ${executionId}`);
    this.emit('executionCancelled', { execution });

    return true;
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    totalWorkflows: number;
    enabledWorkflows: number;
    totalExecutions: number;
    activeExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
  } {
    const workflows = Array.from(this.workflows.values());
    const executions = Array.from(this.executions.values());

    return {
      totalWorkflows: workflows.length,
      enabledWorkflows: workflows.filter(w => w.enabled).length,
      totalExecutions: executions.length,
      activeExecutions: this.activeExecutions,
      completedExecutions: executions.filter(e => e.status === 'completed').length,
      failedExecutions: executions.filter(e => e.status === 'failed').length,
    };
  }
}

/**
 * Action Handler Interface
 */
export interface ActionHandler {
  execute(input: any, context: WorkflowContext): Promise<any>;
}
