import { EventEmitter } from 'events';

import { logger } from '../../../shared/utils/logger.js';
import { 
  Case, 
  CaseStatus, 
  CaseCategory, 
  CaseTask, 
  CaseCommunication,
  CaseWorkflow,
  CaseMetrics,
  CaseTemplate,
  Evidence,
  CaseIndicator
} from '../types/Case';

export class CaseManagementService extends EventEmitter {
  private isInitialized = false;
  private caseNumberCounter = 1000;

  async initialize(): Promise<void> {
    if (this.isInitialized) {return;}

    try {
      logger.info('Initializing Case Management Service...');
      
      // Load case number counter from database
      await this.loadCaseCounter();
      
      // Initialize default workflows and templates
      await this.initializeDefaults();
      
      this.isInitialized = true;
      logger.info('✅ Case Management Service initialized');
      
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize Case Management Service:', error);
      throw error;
    }
  }

  async createCase(caseData: {
    title: string;
    description: string;
    severity: Case['severity'];
    priority: Case['priority'];
    category: CaseCategory;
    subCategory?: string;
    organizationId: string;
    createdBy: string;
    assignedTo?: string;
    templateId?: string;
    linkedAlertIds?: string[];
    tags?: string[];
    customFields?: Record<string, any>;
  }): Promise<Case> {
    try {
      logger.info(`Creating new case: ${caseData.title}`);
      
      // Generate case number
      const caseNumber = await this.generateCaseNumber(caseData.organizationId);
      
      // Load template if specified
      let template: CaseTemplate | null = null;
      if (caseData.templateId) {
        template = await this.getCaseTemplate(caseData.templateId);
      }
      
      // Calculate SLA deadline
      const slaHours = this.calculateSLAHours(caseData.severity, caseData.priority);
      const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();
      
      const newCase: Case = {
        id: `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        organizationId: caseData.organizationId,
        caseNumber,
        title: caseData.title,
        description: caseData.description,
        severity: caseData.severity,
        priority: caseData.priority,
        status: 'new',
        category: caseData.category,
        subCategory: caseData.subCategory,
        assignedTo: caseData.assignedTo,
        createdBy: caseData.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        slaDeadline,
        escalationLevel: 0,
        parentCaseId: undefined,
        childCaseIds: [],
        relatedCaseIds: [],
        linkedAlertIds: caseData.linkedAlertIds || [],
        linkedInvestigationIds: [],
        evidence: [],
        artifacts: [],
        indicators: [],
        tasks: [],
        communications: [],
        stakeholders: [],
        complianceFlags: template?.complianceRequirements || [],
        legalHold: false,
        tags: [...(caseData.tags || []), ...(template?.tags || [])],
        customFields: caseData.customFields || {},
        mitreAttackTechniques: [],
        affectedSystems: [],
      };
      
      // Apply template defaults
      if (template) {
        newCase.workflow = await this.getWorkflow(template.defaultWorkflowId);
        
        // Create default tasks from template
        for (const taskTemplate of template.defaultTasks) {
          const task: CaseTask = {
            ...taskTemplate,
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdBy: caseData.createdBy,
            createdAt: new Date().toISOString(),
            assignedTo: caseData.assignedTo,
            notes: '',
            dependencies: [],
            deliverables: []
          };
          newCase.tasks.push(task);
        }
      }
      
      // Store in database
      await this.storeCase(newCase);
      
      // Create initial communication entry
      const initialNote: CaseCommunication = {
        id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'note',
        content: 'Case created',
        author: caseData.createdBy,
        direction: 'internal',
        timestamp: new Date().toISOString(),
        isPrivate: false,
        attachments: [],
        linkedEvidence: [],
        tags: ['system', 'creation']
      };
      
      await this.addCommunication(newCase.id, initialNote);
      
      // Assign to user if specified
      if (caseData.assignedTo) {
        await this.assignCase(newCase.id, caseData.assignedTo, caseData.createdBy);
      }
      
      logger.info(`Case created: ${newCase.caseNumber} (${newCase.id})`);
      this.emit('caseCreated', newCase);
      
      return newCase;
      
    } catch (error) {
      logger.error('Error creating case:', error);
      throw error;
    }
  }

  async assignCase(caseId: string, assigneeId: string, assignedBy: string): Promise<void> {
    try {
      const currentCase = await this.getCase(caseId);
      if (!currentCase) {
        throw new Error(`Case not found: ${caseId}`);
      }
      
      const oldAssignee = currentCase.assignedTo;
      currentCase.assignedTo = assigneeId;
      currentCase.updatedAt = new Date().toISOString();
      
      // Update status if currently new
      if (currentCase.status === 'new') {
        currentCase.status = 'assigned';
      }
      
      await this.updateCase(currentCase);
      
      // Add communication entry
      const assignmentNote: CaseCommunication = {
        id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'note',
        content: oldAssignee 
          ? `Case reassigned from ${oldAssignee} to ${assigneeId}`
          : `Case assigned to ${assigneeId}`,
        author: assignedBy,
        direction: 'internal',
        timestamp: new Date().toISOString(),
        isPrivate: false,
        attachments: [],
        linkedEvidence: [],
        tags: ['assignment', 'system']
      };
      
      await this.addCommunication(caseId, assignmentNote);
      
      logger.info(`Case ${currentCase.caseNumber} assigned to ${assigneeId}`);
      this.emit('caseAssigned', { caseId, assigneeId, assignedBy });
      
    } catch (error) {
      logger.error('Error assigning case:', error);
      throw error;
    }
  }

  async updateCaseStatus(caseId: string, newStatus: CaseStatus, updatedBy: string, notes?: string): Promise<void> {
    try {
      const currentCase = await this.getCase(caseId);
      if (!currentCase) {
        throw new Error(`Case not found: ${caseId}`);
      }
      
      const oldStatus = currentCase.status;
      currentCase.status = newStatus;
      currentCase.updatedAt = new Date().toISOString();
      
      // Set timestamps based on status
      switch (newStatus) {
        case 'in_progress':
          if (!currentCase.firstResponseAt) {
            currentCase.firstResponseAt = new Date().toISOString();
            currentCase.timeToFirstResponse = Math.floor(
              (Date.now() - new Date(currentCase.createdAt).getTime()) / (1000 * 60)
            );
          }
          break;
        case 'resolved':
          currentCase.resolvedAt = new Date().toISOString();
          currentCase.timeToResolution = Math.floor(
            (Date.now() - new Date(currentCase.createdAt).getTime()) / (1000 * 60)
          );
          break;
        case 'closed':
          currentCase.closedAt = new Date().toISOString();
          if (!currentCase.resolvedAt) {
            currentCase.resolvedAt = new Date().toISOString();
            currentCase.timeToResolution = Math.floor(
              (Date.now() - new Date(currentCase.createdAt).getTime()) / (1000 * 60)
            );
          }
          break;
      }
      
      await this.updateCase(currentCase);
      
      // Add communication entry
      const statusNote: CaseCommunication = {
        id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'note',
        content: `Status changed from ${oldStatus} to ${newStatus}${notes ? `\n\nNotes: ${notes}` : ''}`,
        author: updatedBy,
        direction: 'internal',
        timestamp: new Date().toISOString(),
        isPrivate: false,
        attachments: [],
        linkedEvidence: [],
        tags: ['status-change', 'system']
      };
      
      await this.addCommunication(caseId, statusNote);
      
      logger.info(`Case ${currentCase.caseNumber} status updated: ${oldStatus} -> ${newStatus}`);
      this.emit('caseStatusUpdated', { caseId, oldStatus, newStatus, updatedBy });
      
    } catch (error) {
      logger.error('Error updating case status:', error);
      throw error;
    }
  }

  async addEvidence(caseId: string, evidence: Omit<Evidence, 'id' | 'chainOfCustody'>): Promise<Evidence> {
    try {
      const currentCase = await this.getCase(caseId);
      if (!currentCase) {
        throw new Error(`Case not found: ${caseId}`);
      }
      
      const newEvidence: Evidence = {
        ...evidence,
        id: `evidence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        chainOfCustody: [{
          timestamp: new Date().toISOString(),
          action: 'collected',
          userId: evidence.collectedBy,
          location: 'digital',
          notes: 'Evidence added to case'
        }]
      };
      
      currentCase.evidence.push(newEvidence);
      currentCase.updatedAt = new Date().toISOString();
      
      await this.updateCase(currentCase);
      
      // Add communication entry
      const evidenceNote: CaseCommunication = {
        id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'note',
        content: `Evidence added: ${evidence.name} (${evidence.type})`,
        author: evidence.collectedBy,
        direction: 'internal',
        timestamp: new Date().toISOString(),
        isPrivate: false,
        attachments: [],
        linkedEvidence: [newEvidence.id],
        tags: ['evidence', 'system']
      };
      
      await this.addCommunication(caseId, evidenceNote);
      
      logger.info(`Evidence added to case ${currentCase.caseNumber}: ${evidence.name}`);
      this.emit('evidenceAdded', { caseId, evidence: newEvidence });
      
      return newEvidence;
      
    } catch (error) {
      logger.error('Error adding evidence:', error);
      throw error;
    }
  }

  async addIndicator(caseId: string, indicator: Omit<CaseIndicator, 'id'>): Promise<CaseIndicator> {
    try {
      const currentCase = await this.getCase(caseId);
      if (!currentCase) {
        throw new Error(`Case not found: ${caseId}`);
      }
      
      const newIndicator: CaseIndicator = {
        ...indicator,
        id: `indicator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      currentCase.indicators.push(newIndicator);
      currentCase.updatedAt = new Date().toISOString();
      
      await this.updateCase(currentCase);
      
      logger.info(`Indicator added to case ${currentCase.caseNumber}: ${indicator.value}`);
      this.emit('indicatorAdded', { caseId, indicator: newIndicator });
      
      return newIndicator;
      
    } catch (error) {
      logger.error('Error adding indicator:', error);
      throw error;
    }
  }

  async addCommunication(caseId: string, communication: Omit<CaseCommunication, 'id'>): Promise<CaseCommunication> {
    try {
      const currentCase = await this.getCase(caseId);
      if (!currentCase) {
        throw new Error(`Case not found: ${caseId}`);
      }
      
      const newCommunication: CaseCommunication = {
        ...communication,
        id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      currentCase.communications.push(newCommunication);
      currentCase.updatedAt = new Date().toISOString();
      
      await this.updateCase(currentCase);
      
      logger.debug(`Communication added to case ${currentCase.caseNumber}`);
      this.emit('communicationAdded', { caseId, communication: newCommunication });
      
      return newCommunication;
      
    } catch (error) {
      logger.error('Error adding communication:', error);
      throw error;
    }
  }

  async createTask(caseId: string, task: Omit<CaseTask, 'id' | 'createdAt'>): Promise<CaseTask> {
    try {
      const currentCase = await this.getCase(caseId);
      if (!currentCase) {
        throw new Error(`Case not found: ${caseId}`);
      }
      
      const newTask: CaseTask = {
        ...task,
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };
      
      currentCase.tasks.push(newTask);
      currentCase.updatedAt = new Date().toISOString();
      
      await this.updateCase(currentCase);
      
      logger.info(`Task created for case ${currentCase.caseNumber}: ${task.title}`);
      this.emit('taskCreated', { caseId, task: newTask });
      
      return newTask;
      
    } catch (error) {
      logger.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTaskStatus(caseId: string, taskId: string, status: CaseTask['status'], updatedBy: string): Promise<void> {
    try {
      const currentCase = await this.getCase(caseId);
      if (!currentCase) {
        throw new Error(`Case not found: ${caseId}`);
      }
      
      const task = currentCase.tasks.find(t => t.id === taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }
      
      const oldStatus = task.status;
      task.status = status;
      
      if (status === 'completed') {
        task.completedAt = new Date().toISOString();
      }
      
      currentCase.updatedAt = new Date().toISOString();
      await this.updateCase(currentCase);
      
      logger.info(`Task ${task.title} status updated: ${oldStatus} -> ${status}`);
      this.emit('taskStatusUpdated', { caseId, taskId, oldStatus, status, updatedBy });
      
    } catch (error) {
      logger.error('Error updating task status:', error);
      throw error;
    }
  }

  async getCases(organizationId: string, filters?: {
    status?: CaseStatus[];
    severity?: Case['severity'][];
    category?: CaseCategory[];
    assignedTo?: string;
    createdBy?: string;
    dateRange?: { start: string; end: string };
    tags?: string[];
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ cases: Case[]; total: number }> {
    try {
      // In a full implementation, this would build dynamic SQL queries
      // For now, return mock data
      
      const mockCases: Case[] = []; // Would be populated from database
      
      return { cases: mockCases, total: mockCases.length };
    } catch (error) {
      logger.error('Error getting cases:', error);
      throw error;
    }
  }

  async getCase(caseId: string): Promise<Case | null> {
    try {
      // Mock implementation - would query database
      return null;
    } catch (error) {
      logger.error('Error getting case:', error);
      throw error;
    }
  }

  async getCaseMetrics(organizationId: string, dateRange?: { start: string; end: string }): Promise<CaseMetrics> {
    try {
      // Mock implementation - would calculate from database
      const mockMetrics: CaseMetrics = {
        totalCases: 0,
        openCases: 0,
        resolvedCases: 0,
        avgTimeToResolution: 0,
        avgTimeToFirstResponse: 0,
        slaComplianceRate: 0,
        escalationRate: 0,
        casesByCategory: {} as Record<CaseCategory, number>,
        casesBySeverity: {},
        casesByStatus: {} as Record<CaseStatus, number>,
        topInvestigators: [],
        trendsOverTime: []
      };
      
      return mockMetrics;
    } catch (error) {
      logger.error('Error getting case metrics:', error);
      throw error;
    }
  }

  private async generateCaseNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const orgPrefix = organizationId.substring(0, 4).toUpperCase();
    const caseNum = String(++this.caseNumberCounter).padStart(5, '0');
    return `${orgPrefix}-${year}-${caseNum}`;
  }

  private calculateSLAHours(severity: Case['severity'], priority: Case['priority']): number {
    // SLA calculation based on severity and priority
    const slaMatrix = {
      'critical': { 1: 2, 2: 4, 3: 8, 4: 16, 5: 24 },
      'high': { 1: 4, 2: 8, 3: 16, 4: 24, 5: 48 },
      'medium': { 1: 8, 2: 16, 3: 24, 4: 48, 5: 72 },
      'low': { 1: 24, 2: 48, 3: 72, 4: 96, 5: 168 },
      'info': { 1: 48, 2: 72, 3: 96, 4: 168, 5: 336 }
    };
    
    return slaMatrix[severity][priority] || 24;
  }

  private async storeCase(caseData: Case): Promise<void> {
    // Implementation would store case in database
    logger.debug(`Storing case: ${caseData.caseNumber}`);
  }

  private async updateCase(caseData: Case): Promise<void> {
    // Implementation would update case in database
    logger.debug(`Updating case: ${caseData.caseNumber}`);
  }

  private async loadCaseCounter(): Promise<void> {
    // Load current case number counter from database
    // For now, start at 1000
    this.caseNumberCounter = 1000;
  }

  private async initializeDefaults(): Promise<void> {
    // Initialize default workflows and templates
    logger.debug('Initializing default workflows and templates');
  }

  private async getCaseTemplate(templateId: string): Promise<CaseTemplate | null> {
    // Load case template from database
    return null;
  }

  private async getWorkflow(workflowId?: string): Promise<CaseWorkflow | undefined> {
    // Load workflow from database
    return undefined;
  }

  // Escalation and SLA monitoring
  async checkSLAViolations(): Promise<void> {
    try {
      // This would be called periodically to check for SLA violations
      logger.debug('Checking for SLA violations');
    } catch (error) {
      logger.error('Error checking SLA violations:', error);
    }
  }

  async escalateCase(caseId: string, escalatedBy: string, reason: string): Promise<void> {
    try {
      const currentCase = await this.getCase(caseId);
      if (!currentCase) {
        throw new Error(`Case not found: ${caseId}`);
      }
      
      currentCase.escalationLevel++;
      currentCase.status = 'escalated';
      currentCase.updatedAt = new Date().toISOString();
      
      await this.updateCase(currentCase);
      
      // Add escalation communication
      const escalationNote: CaseCommunication = {
        id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'note',
        content: `Case escalated (Level ${currentCase.escalationLevel})\n\nReason: ${reason}`,
        author: escalatedBy,
        direction: 'internal',
        timestamp: new Date().toISOString(),
        isPrivate: false,
        attachments: [],
        linkedEvidence: [],
        tags: ['escalation', 'system']
      };
      
      await this.addCommunication(caseId, escalationNote);
      
      logger.info(`Case ${currentCase.caseNumber} escalated to level ${currentCase.escalationLevel}`);
      this.emit('caseEscalated', { caseId, escalationLevel: currentCase.escalationLevel, reason, escalatedBy });
      
    } catch (error) {
      logger.error('Error escalating case:', error);
      throw error;
    }
  }

  // Bulk operations
  async bulkAssignCases(caseIds: string[], assigneeId: string, assignedBy: string): Promise<void> {
    try {
      for (const caseId of caseIds) {
        await this.assignCase(caseId, assigneeId, assignedBy);
      }
      
      logger.info(`Bulk assigned ${caseIds.length} cases to ${assigneeId}`);
      this.emit('bulkCasesAssigned', { caseIds, assigneeId, assignedBy });
      
    } catch (error) {
      logger.error('Error bulk assigning cases:', error);
      throw error;
    }
  }

  async bulkUpdateStatus(caseIds: string[], newStatus: CaseStatus, updatedBy: string): Promise<void> {
    try {
      for (const caseId of caseIds) {
        await this.updateCaseStatus(caseId, newStatus, updatedBy);
      }
      
      logger.info(`Bulk updated ${caseIds.length} cases to status: ${newStatus}`);
      this.emit('bulkCasesStatusUpdated', { caseIds, newStatus, updatedBy });
      
    } catch (error) {
      logger.error('Error bulk updating case status:', error);
      throw error;
    }
  }
}

export const caseManagementService = new CaseManagementService();