/**
 * Playbook Generator Service
 *
 * Core service for automated incident response playbook generation.
 * Transforms attack flows into actionable playbooks with detection rules,
 * containment actions, eradication steps, and recovery procedures.
 */

import { Pool } from 'pg';
import type { SavedFlow } from '../../flow-storage/types/SavedFlow';
import type { AttackFlowNode, AttackAction, AttackAsset } from '../../flow-analysis/types/attack-flow';
import type {
  IncidentPlaybook,
  PlaybookPhase,
  Action,
  DetectionRule,
  MITRETechnique,
  DefensiveAction,
  D3FENDMapping,
  PlaybookGenerationRequest,
  PlaybookGenerationResponse,
  GenerationContext,
  PlaybookSeverity,
  PhaseName,
  ActionType,
  DetectionRuleType,
  SOARPlatform,
  SOARExportFormat,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

export interface PlaybookGeneratorConfig {
  enableDetectionRules: boolean;
  enableAutomation: boolean;
  defaultSeverity: PlaybookSeverity;
  maxActionsPerPhase: number;
  minConfidenceThreshold: number;
  includeSourceExcerpts: boolean;
  estimatedTimeMultiplier: number;
}

const DEFAULT_CONFIG: PlaybookGeneratorConfig = {
  enableDetectionRules: true,
  enableAutomation: true,
  defaultSeverity: 'medium',
  maxActionsPerPhase: 10,
  minConfidenceThreshold: 0.5,
  includeSourceExcerpts: true,
  estimatedTimeMultiplier: 1.5, // Add buffer to time estimates
};

// ============================================================================
// Main Service Class
// ============================================================================

export class PlaybookGeneratorService {
  private pool: Pool;
  private config: PlaybookGeneratorConfig;

  constructor(pool: Pool, config: Partial<PlaybookGeneratorConfig> = {}) {
    this.pool = pool;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // Primary Generation Methods
  // ==========================================================================

  /**
   * Generate complete playbook from saved flow
   */
  async generatePlaybook(
    request: PlaybookGenerationRequest
  ): Promise<PlaybookGenerationResponse> {
    const startTime = Date.now();

    try {
      // Load flow data
      const flow = await this.loadFlow(request.sourceId!);
      if (!flow) {
        throw new Error(`Flow not found: ${request.sourceId}`);
      }

      // Build generation context
      const context = await this.buildGenerationContext(flow);

      // Generate playbook structure
      const playbook: IncidentPlaybook = {
        id: this.generateId(),
        name: request.name,
        description: flow.metadata.description || `Incident response playbook for ${flow.title}`,
        flowId: flow.id,
        campaignId: request.sourceId && request.source === 'campaign' ? request.sourceId : undefined,

        // Metadata
        severity: request.severity,
        estimatedTimeMinutes: 0, // Will be calculated
        requiredRoles: request.requiredRoles || ['SOC Analyst', 'Incident Responder'],
        tags: request.tags || this.inferTags(flow),

        // Status
        status: 'draft',
        version: 1,

        // Generation info
        generatedFrom: request.source,
        aiGenerated: true,
        generationConfidence: this.calculateConfidence(context),

        // Phases and rules (to be populated)
        phases: [],
        detectionRules: [],

        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),

        // Stats
        executionCount: 0,
      };

      // Generate phases
      playbook.phases = await this.generatePhases(playbook, context, request);

      // Calculate total estimated time
      playbook.estimatedTimeMinutes = this.calculateTotalTime(playbook.phases);

      // Generate detection rules if requested
      if (request.includeDetectionRules && this.config.enableDetectionRules) {
        playbook.detectionRules = await this.createDetectionRules(
          context.techniques,
          playbook.id
        );
      }

      // Save to database
      await this.savePlaybook(playbook);

      // Build response
      const generationTime = Date.now() - startTime;
      const response: PlaybookGenerationResponse = {
        playbook,
        generationTime,
        confidence: playbook.generationConfidence!,
        warnings: this.generateWarnings(playbook, context),
        suggestions: this.generateSuggestions(playbook, context),
      };

      return response;
    } catch (error) {
      throw new Error(`Playbook generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate all phases for a playbook
   */
  private async generatePhases(
    playbook: IncidentPlaybook,
    context: GenerationContext,
    request: PlaybookGenerationRequest
  ): Promise<PlaybookPhase[]> {
    const phasesToGenerate: PhaseName[] = request.customizePhases || [
      'preparation',
      'detection',
      'analysis',
      'containment',
      'eradication',
      'recovery',
      'post_incident',
    ];

    const phases: PlaybookPhase[] = [];

    for (let i = 0; i < phasesToGenerate.length; i++) {
      const phaseName = phasesToGenerate[i];
      const phase = await this.generatePhase(playbook.id, phaseName, i, context, request);
      phases.push(phase);
    }

    return phases;
  }

  /**
   * Generate a single phase
   */
  private async generatePhase(
    playbookId: string,
    phaseName: PhaseName,
    phaseOrder: number,
    context: GenerationContext,
    request: PlaybookGenerationRequest
  ): Promise<PlaybookPhase> {
    const phase: PlaybookPhase = {
      id: this.generateId(),
      playbookId,
      phaseName,
      phaseOrder,
      description: this.getPhaseDescription(phaseName),
      estimatedDurationMinutes: 0, // Will be calculated
      isParallel: false,
      actions: [],
      isAutomated: false,
      requiresApproval: this.requiresApproval(phaseName),
      createdAt: new Date(),
    };

    // Generate actions based on phase type
    switch (phaseName) {
      case 'preparation':
        phase.actions = await this.generatePreparationActions(phase.id, playbookId, context);
        break;
      case 'detection':
        phase.actions = await this.generateDetectionActions(phase.id, playbookId, context);
        break;
      case 'analysis':
        phase.actions = await this.generateAnalysisActions(phase.id, playbookId, context);
        break;
      case 'containment':
        phase.actions = await this.generateContainmentActions(phase.id, playbookId, context);
        break;
      case 'eradication':
        phase.actions = await this.generateEradicationActions(phase.id, playbookId, context);
        break;
      case 'recovery':
        phase.actions = await this.generateRecoveryActions(phase.id, playbookId, context);
        break;
      case 'post_incident':
        phase.actions = await this.generatePostIncidentActions(phase.id, playbookId, context);
        break;
    }

    // Calculate phase duration
    phase.estimatedDurationMinutes = phase.actions.reduce(
      (sum, action) => sum + action.estimatedDurationMinutes,
      0
    );

    // Check if phase can be automated
    phase.isAutomated = phase.actions.every(
      (a) => a.actionType === 'automated' || a.actionType === 'script' || a.actionType === 'api_call'
    );

    return phase;
  }

  // ==========================================================================
  // Phase-Specific Action Generators
  // ==========================================================================

  private async generatePreparationActions(
    phaseId: string,
    playbookId: string,
    context: GenerationContext
  ): Promise<Action[]> {
    const actions: Action[] = [];

    // Baseline preparation actions
    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: 1,
        actionType: 'manual',
        title: 'Assemble incident response team',
        description: 'Notify and assemble the appropriate incident response team members',
        instructions: 'Contact: SOC Lead, Security Engineer, System Administrator, Legal/Compliance (if needed)',
        estimatedDurationMinutes: 10,
        requiresApproval: false,
      })
    );

    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: 2,
        actionType: 'manual',
        title: 'Initialize incident tracking',
        description: 'Create incident ticket and establish communication channels',
        instructions: 'Create JIRA/ServiceNow ticket, set up Slack channel, document initial observations',
        estimatedDurationMinutes: 5,
        requiresApproval: false,
      })
    );

    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: 3,
        actionType: 'data_collection',
        title: 'Gather baseline system information',
        description: 'Collect current state of affected systems before investigation',
        instructions: 'Document network topology, running processes, active connections, system logs',
        estimatedDurationMinutes: 15,
        requiresApproval: false,
      })
    );

    return actions;
  }

  private async generateDetectionActions(
    phaseId: string,
    playbookId: string,
    context: GenerationContext
  ): Promise<Action[]> {
    const actions: Action[] = [];
    let order = 1;

    // SIEM monitoring
    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: order++,
        actionType: 'automated',
        title: 'Query SIEM for indicators',
        description: 'Search SIEM for all known indicators of compromise',
        instructions: 'Use SIEM correlation rules to identify matching events',
        apiEndpoint: '/api/siem/query',
        estimatedDurationMinutes: 5,
        requiresApproval: false,
      })
    );

    // Detection rules deployment
    if (context.techniques.length > 0) {
      actions.push(
        this.createAction({
          phaseId,
          playbookId,
          actionOrder: order++,
          actionType: 'automated',
          title: 'Deploy detection rules',
          description: `Deploy ${context.techniques.length} detection rules for identified techniques`,
          instructions: 'Apply Sigma/YARA rules to SIEM and EDR platforms',
          estimatedDurationMinutes: 10,
          requiresApproval: false,
          mitreTechniqueId: context.techniques[0]?.techniqueId,
        })
      );
    }

    // IOC scanning
    if (context.iocs && context.iocs.length > 0) {
      actions.push(
        this.createAction({
          phaseId,
          playbookId,
          actionOrder: order++,
          actionType: 'automated',
          title: 'Scan for IOCs across infrastructure',
          description: `Scan all systems for ${context.iocs.length} indicators of compromise`,
          instructions: 'Use EDR/XDR to scan for IPs, domains, file hashes, registry keys',
          estimatedDurationMinutes: 20,
          requiresApproval: false,
        })
      );
    }

    // Network monitoring
    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: order++,
        actionType: 'manual',
        title: 'Review network traffic logs',
        description: 'Analyze network logs for suspicious connections',
        instructions: 'Check firewall logs, proxy logs, DNS queries for anomalies',
        estimatedDurationMinutes: 15,
        requiresApproval: false,
      })
    );

    return actions;
  }

  private async generateAnalysisActions(
    phaseId: string,
    playbookId: string,
    context: GenerationContext
  ): Promise<Action[]> {
    const actions: Action[] = [];
    let order = 1;

    // Threat intelligence correlation
    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: order++,
        actionType: 'automated',
        title: 'Correlate with threat intelligence',
        description: 'Check indicators against threat intelligence feeds',
        instructions: 'Query MISP, STIX/TAXII feeds, VirusTotal, AlienVault OTX',
        apiEndpoint: '/api/threat-intel/enrich',
        estimatedDurationMinutes: 10,
        requiresApproval: false,
      })
    );

    // Malware analysis
    if (context.attackFlow) {
      const hasMalware = this.detectMalwareNodes(context.attackFlow);
      if (hasMalware) {
        actions.push(
          this.createAction({
            phaseId,
            playbookId,
            actionOrder: order++,
            actionType: 'manual',
            title: 'Perform malware analysis',
            description: 'Analyze suspicious files in isolated sandbox',
            instructions: 'Use sandbox (Cuckoo, ANY.RUN) for dynamic analysis, static analysis tools for file inspection',
            estimatedDurationMinutes: 45,
            requiresApproval: false,
            requiredTools: ['Sandbox environment', 'IDA Pro / Ghidra', 'VirusTotal'],
          })
        );
      }
    }

    // Timeline reconstruction
    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: order++,
        actionType: 'manual',
        title: 'Reconstruct attack timeline',
        description: 'Build comprehensive timeline of attack activities',
        instructions: 'Correlate logs from multiple sources, identify initial access, lateral movement, objectives',
        estimatedDurationMinutes: 30,
        requiresApproval: false,
      })
    );

    // Impact assessment
    if (context.affectedAssets && context.affectedAssets.length > 0) {
      actions.push(
        this.createAction({
          phaseId,
          playbookId,
          actionOrder: order++,
          actionType: 'manual',
          title: 'Assess impact and scope',
          description: `Determine full impact across ${context.affectedAssets.length} affected assets`,
          instructions: 'Identify all compromised systems, data accessed, and potential business impact',
          estimatedDurationMinutes: 20,
          requiresApproval: false,
        })
      );
    }

    // Attribution
    if (context.threatActor) {
      actions.push(
        this.createAction({
          phaseId,
          playbookId,
          actionOrder: order++,
          actionType: 'manual',
          title: 'Threat actor attribution',
          description: 'Identify potential threat actor or campaign',
          instructions: 'Compare TTPs with known threat actors, check for attribution indicators',
          estimatedDurationMinutes: 30,
          requiresApproval: false,
        })
      );
    }

    return actions;
  }

  private async generateContainmentActions(
    phaseId: string,
    playbookId: string,
    context: GenerationContext
  ): Promise<Action[]> {
    const actions: Action[] = [];
    let order = 1;

    // Network isolation
    if (context.affectedAssets && context.affectedAssets.length > 0) {
      actions.push(
        this.createAction({
          phaseId,
          playbookId,
          actionOrder: order++,
          actionType: 'script',
          title: 'Isolate affected systems',
          description: `Isolate ${context.affectedAssets.length} affected systems from network`,
          instructions: 'Use EDR to isolate endpoints, or disable network ports at switch level',
          scriptPath: '/scripts/isolate-systems.sh',
          estimatedDurationMinutes: 15,
          requiresApproval: true,
          requiredPermissions: ['network_admin', 'edr_operator'],
          successCriteria: 'Systems no longer have network connectivity',
        })
      );
    }

    // Block IOCs
    if (context.iocs && context.iocs.length > 0) {
      actions.push(
        this.createAction({
          phaseId,
          playbookId,
          actionOrder: order++,
          actionType: 'api_call',
          title: 'Block malicious indicators',
          description: `Block ${context.iocs.length} IOCs at perimeter`,
          instructions: 'Add IPs/domains to firewall blocklist, update IDS/IPS rules',
          apiEndpoint: '/api/firewall/block',
          parameters: { iocs: context.iocs },
          estimatedDurationMinutes: 10,
          requiresApproval: true,
          requiredPermissions: ['firewall_admin'],
        })
      );
    }

    // Disable accounts
    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: order++,
        actionType: 'approval',
        title: 'Disable compromised accounts',
        description: 'Disable user accounts showing signs of compromise',
        instructions: 'Disable in AD/IdP, force password reset, revoke active sessions',
        estimatedDurationMinutes: 15,
        requiresApproval: true,
        requiredPermissions: ['identity_admin'],
      })
    );

    // Containment for techniques
    const containmentActions = await this.mapToMITREDefend(context.techniques);
    for (const defensive of containmentActions.slice(0, 3)) {
      actions.push(
        this.createAction({
          phaseId,
          playbookId,
          actionOrder: order++,
          actionType: 'manual',
          title: defensive.d3fendTechniqueName,
          description: defensive.description,
          instructions: defensive.implementationSteps.join('\n'),
          estimatedDurationMinutes: 20,
          requiresApproval: defensive.difficulty === 'high',
          requiredTools: defensive.requiredTools,
          d3fendTechniqueId: defensive.d3fendTechniqueId,
        })
      );
    }

    return actions;
  }

  private async generateEradicationActions(
    phaseId: string,
    playbookId: string,
    context: GenerationContext
  ): Promise<Action[]> {
    const actions: Action[] = [];
    let order = 1;

    // Remove malware
    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: order++,
        actionType: 'script',
        title: 'Remove malware and artifacts',
        description: 'Remove all malicious files, registry keys, scheduled tasks',
        instructions: 'Use EDR to remove malware, clean registry, remove persistence mechanisms',
        scriptPath: '/scripts/eradicate-malware.sh',
        estimatedDurationMinutes: 30,
        requiresApproval: false,
        requiredTools: ['EDR platform', 'PowerShell'],
      })
    );

    // Patch vulnerabilities
    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: order++,
        actionType: 'manual',
        title: 'Patch exploited vulnerabilities',
        description: 'Apply patches for all exploited vulnerabilities',
        instructions: 'Deploy security patches via WSUS/SCCM, verify patch application',
        estimatedDurationMinutes: 60,
        requiresApproval: true,
        requiredPermissions: ['patch_management'],
      })
    );

    // Reset credentials
    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: order++,
        actionType: 'manual',
        title: 'Reset compromised credentials',
        description: 'Reset passwords and credentials for all affected accounts',
        instructions: 'Force password resets in AD, rotate service account credentials, update API keys',
        estimatedDurationMinutes: 45,
        requiresApproval: false,
        requiredPermissions: ['identity_admin'],
      })
    );

    // System rebuild
    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: order++,
        actionType: 'manual',
        title: 'Rebuild severely compromised systems',
        description: 'Reimage systems that cannot be reliably cleaned',
        instructions: 'Backup critical data, reimage from golden image, restore data from clean backup',
        estimatedDurationMinutes: 120,
        requiresApproval: true,
        requiredPermissions: ['system_admin'],
      })
    );

    return actions;
  }

  private async generateRecoveryActions(
    phaseId: string,
    playbookId: string,
    context: GenerationContext
  ): Promise<Action[]> {
    const actions: Action[] = [];
    let order = 1;

    // Restore services
    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: order++,
        actionType: 'manual',
        title: 'Restore affected services',
        description: 'Bring systems and services back online in controlled manner',
        instructions: 'Start with least critical systems, monitor for re-infection, gradually restore services',
        estimatedDurationMinutes: 60,
        requiresApproval: true,
      })
    );

    // Verify integrity
    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: order++,
        actionType: 'automated',
        title: 'Verify system integrity',
        description: 'Verify all systems are clean and functioning normally',
        instructions: 'Run integrity scans, verify no IOCs present, check for anomalies',
        estimatedDurationMinutes: 30,
        requiresApproval: false,
      })
    );

    // Restore monitoring
    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: order++,
        actionType: 'manual',
        title: 'Restore normal monitoring',
        description: 'Return security monitoring to normal operational state',
        instructions: 'Remove temporary detection rules, restore normal alert thresholds',
        estimatedDurationMinutes: 15,
        requiresApproval: false,
      })
    );

    // Communication
    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: order++,
        actionType: 'notification',
        title: 'Notify stakeholders of recovery',
        description: 'Inform relevant stakeholders that incident has been resolved',
        instructions: 'Send notification to business owners, management, affected users',
        estimatedDurationMinutes: 10,
        requiresApproval: false,
      })
    );

    return actions;
  }

  private async generatePostIncidentActions(
    phaseId: string,
    playbookId: string,
    context: GenerationContext
  ): Promise<Action[]> {
    const actions: Action[] = [];
    let order = 1;

    // Incident report
    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: order++,
        actionType: 'documentation',
        title: 'Complete incident report',
        description: 'Document all details of incident and response',
        instructions: 'Include timeline, IOCs, actions taken, lessons learned, recommendations',
        estimatedDurationMinutes: 90,
        requiresApproval: false,
      })
    );

    // Lessons learned
    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: order++,
        actionType: 'manual',
        title: 'Conduct lessons learned session',
        description: 'Hold post-mortem meeting with incident response team',
        instructions: 'Discuss what worked, what didn\'t, process improvements needed',
        estimatedDurationMinutes: 60,
        requiresApproval: false,
      })
    );

    // Update defenses
    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: order++,
        actionType: 'manual',
        title: 'Implement preventive measures',
        description: 'Apply lessons learned to prevent recurrence',
        instructions: 'Update detection rules, harden systems, improve monitoring',
        estimatedDurationMinutes: 120,
        requiresApproval: true,
      })
    );

    // Compliance reporting
    actions.push(
      this.createAction({
        phaseId,
        playbookId,
        actionOrder: order++,
        actionType: 'documentation',
        title: 'Regulatory compliance reporting',
        description: 'File required compliance reports if applicable',
        instructions: 'Determine if breach notification required (GDPR, state laws), file reports as needed',
        estimatedDurationMinutes: 60,
        requiresApproval: true,
        requiredRoles: ['Legal', 'Compliance Officer'],
      })
    );

    return actions;
  }

  // ==========================================================================
  // MITRE D3FEND Mapping
  // ==========================================================================

  /**
   * Map MITRE ATT&CK techniques to D3FEND defensive countermeasures
   */
  async mapToMITREDefend(techniques: MITRETechnique[]): Promise<DefensiveAction[]> {
    const defensiveActions: DefensiveAction[] = [];

    for (const technique of techniques) {
      try {
        // Query database for D3FEND mappings
        const result = await this.pool.query<D3FENDMapping>(
          `SELECT * FROM d3fend_mappings
           WHERE attack_technique_id = $1
           ORDER BY effectiveness_score DESC
           LIMIT 3`,
          [technique.techniqueId]
        );

        for (const mapping of result.rows) {
          defensiveActions.push({
            d3fendTechniqueId: mapping.d3fendTechniqueId,
            d3fendTechniqueName: mapping.d3fendTechniqueName,
            category: mapping.d3fendCategory,
            description: mapping.description || `Countermeasure for ${technique.techniqueName}`,
            implementationSteps: this.generateImplementationSteps(mapping),
            requiredTools: mapping.requiredTools || [],
            effectiveness: mapping.effectivenessScore,
            difficulty: mapping.implementationDifficulty,
            cost: mapping.costEstimate,
          });
        }
      } catch (error) {
        console.error(`Failed to map technique ${technique.techniqueId}:`, error);
      }
    }

    return defensiveActions;
  }

  private generateImplementationSteps(mapping: D3FENDMapping): string[] {
    // Generate generic implementation steps based on D3FEND category
    const steps: string[] = [];

    if (mapping.implementationNotes) {
      steps.push(mapping.implementationNotes);
    }

    // Add category-specific steps
    switch (mapping.d3fendCategory.toLowerCase()) {
      case 'network isolation':
        steps.push('Configure network segmentation');
        steps.push('Implement VLAN separation');
        steps.push('Deploy micro-segmentation if possible');
        break;
      case 'process termination':
        steps.push('Identify malicious processes');
        steps.push('Terminate processes via EDR');
        steps.push('Verify termination was successful');
        break;
      case 'credential access':
        steps.push('Reset affected credentials');
        steps.push('Enable MFA if not already active');
        steps.push('Monitor for unauthorized access attempts');
        break;
      default:
        steps.push('Implement recommended countermeasure');
        steps.push('Verify effectiveness');
        steps.push('Document results');
    }

    return steps;
  }

  // ==========================================================================
  // Detection Rule Generation
  // ==========================================================================

  /**
   * Generate detection rules for identified techniques
   */
  async createDetectionRules(
    techniques: MITRETechnique[],
    playbookId: string
  ): Promise<DetectionRule[]> {
    const rules: DetectionRule[] = [];

    for (const technique of techniques) {
      // Generate Sigma rule
      const sigmaRule = this.generateSigmaRule(technique);
      if (sigmaRule) {
        rules.push({
          id: this.generateId(),
          playbookId,
          ruleName: `Sigma: ${technique.techniqueName}`,
          description: `Detection rule for ${technique.techniqueId}`,
          ruleType: 'sigma',
          ruleContent: sigmaRule,
          mitreTechniqueId: technique.techniqueId,
          mitreTactic: technique.tactic,
          confidenceScore: 0.8,
          detectionCount: 0,
          isActive: false,
          tested: false,
          deployed: false,
          applicablePlatforms: ['Windows', 'Linux', 'macOS'],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Generate YARA rule if malware-related
      if (this.isMalwareRelated(technique)) {
        const yaraRule = this.generateYARARule(technique);
        if (yaraRule) {
          rules.push({
            id: this.generateId(),
            playbookId,
            ruleName: `YARA: ${technique.techniqueName}`,
            description: `Malware detection for ${technique.techniqueId}`,
            ruleType: 'yara',
            ruleContent: yaraRule,
            mitreTechniqueId: technique.techniqueId,
            mitreTactic: technique.tactic,
            confidenceScore: 0.7,
            detectionCount: 0,
            isActive: false,
            tested: false,
            deployed: false,
            applicablePlatforms: ['Endpoint', 'Network'],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    return rules;
  }

  private generateSigmaRule(technique: MITRETechnique): string {
    // Generate basic Sigma rule template
    return `title: ${technique.techniqueName} Detection
id: ${this.generateId()}
status: experimental
description: Detects ${technique.techniqueName} (${technique.techniqueId})
references:
    - https://attack.mitre.org/techniques/${technique.techniqueId}
author: ThreatFlow Playbook Generator
date: ${new Date().toISOString().split('T')[0]}
tags:
    - attack.${technique.tactic?.toLowerCase().replace(/ /g, '_')}
    - attack.${technique.techniqueId.toLowerCase()}
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        # Add specific detection logic based on technique
        EventID: 1
    condition: selection
falsepositives:
    - Unknown
level: medium`;
  }

  private generateYARARule(technique: MITRETechnique): string {
    return `rule ${technique.techniqueId.replace(/\./g, '_')}_Detection
{
    meta:
        description = "Detects ${technique.techniqueName}"
        technique = "${technique.techniqueId}"
        author = "ThreatFlow Playbook Generator"
        date = "${new Date().toISOString().split('T')[0]}"

    strings:
        // Add specific strings based on technique
        $s1 = { 4D 5A 90 00 } // PE header

    condition:
        uint16(0) == 0x5A4D and
        $s1
}`;
  }

  // ==========================================================================
  // SOAR Export
  // ==========================================================================

  /**
   * Export playbook to SOAR platform format
   */
  exportToSOAR(
    playbook: IncidentPlaybook,
    platform: SOARPlatform,
    format: 'json' | 'yaml' | 'xml' = 'json'
  ): SOARExportFormat {
    const content = this.generateSOARContent(playbook, platform);

    let formattedContent: string;
    switch (format) {
      case 'yaml':
        formattedContent = this.convertToYAML(content);
        break;
      case 'xml':
        formattedContent = this.convertToXML(content);
        break;
      default:
        formattedContent = JSON.stringify(content, null, 2);
    }

    return {
      platform,
      format,
      content: formattedContent,
    };
  }

  private generateSOARContent(playbook: IncidentPlaybook, platform: SOARPlatform): any {
    // Generate platform-specific format
    switch (platform) {
      case 'cortex_xsoar':
        return this.generateXSOARFormat(playbook);
      case 'splunk_soar':
        return this.generateSplunkSOARFormat(playbook);
      default:
        return this.generateGenericFormat(playbook);
    }
  }

  private generateXSOARFormat(playbook: IncidentPlaybook): any {
    return {
      id: playbook.id,
      version: -1,
      name: playbook.name,
      description: playbook.description,
      starttaskid: '0',
      tasks: this.convertPhasesToXSOARTasks(playbook.phases),
      view: '{}',
      inputs: [],
      outputs: [],
      quiet: true,
    };
  }

  private convertPhasesToXSOARTasks(phases: PlaybookPhase[]): Record<string, any> {
    const tasks: Record<string, any> = {};
    let taskId = 0;

    for (const phase of phases) {
      tasks[taskId.toString()] = {
        id: taskId.toString(),
        taskid: this.generateId(),
        type: 'title',
        task: {
          id: this.generateId(),
          name: phase.phaseName,
          description: phase.description,
        },
        nexttasks: {},
      };
      taskId++;

      for (const action of phase.actions) {
        tasks[taskId.toString()] = {
          id: taskId.toString(),
          taskid: action.id,
          type: this.mapActionTypeToXSOAR(action.actionType),
          task: {
            id: action.id,
            name: action.title,
            description: action.description,
            script: action.scriptPath,
          },
          nexttasks: {},
        };
        taskId++;
      }
    }

    return tasks;
  }

  private mapActionTypeToXSOAR(actionType: ActionType): string {
    const mapping: Record<ActionType, string> = {
      manual: 'regular',
      automated: 'playbook',
      api_call: 'http',
      script: 'regular',
      notification: 'email',
      approval: 'condition',
      data_collection: 'regular',
      analysis: 'regular',
      documentation: 'regular',
    };
    return mapping[actionType] || 'regular';
  }

  private generateSplunkSOARFormat(playbook: IncidentPlaybook): any {
    return {
      playbook: {
        name: playbook.name,
        description: playbook.description,
        tags: playbook.tags,
        phases: playbook.phases.map(phase => ({
          name: phase.phaseName,
          description: phase.description,
          actions: phase.actions.map(action => ({
            name: action.title,
            description: action.description,
            action_type: action.actionType,
            parameters: action.parameters,
          })),
        })),
      },
    };
  }

  private generateGenericFormat(playbook: IncidentPlaybook): any {
    return {
      id: playbook.id,
      name: playbook.name,
      description: playbook.description,
      severity: playbook.severity,
      phases: playbook.phases,
      detection_rules: playbook.detectionRules,
      metadata: {
        version: playbook.version,
        created_at: playbook.createdAt,
        generated_from: playbook.generatedFrom,
      },
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private async loadFlow(flowId: string): Promise<SavedFlow | null> {
    try {
      const result = await this.pool.query<any>(
        'SELECT * FROM saved_flows WHERE id = $1',
        [flowId]
      );
      return result.rows[0] ? result.rows[0].flow_data : null;
    } catch (error) {
      console.error('Failed to load flow:', error);
      return null;
    }
  }

  private async buildGenerationContext(flow: SavedFlow): Promise<GenerationContext> {
    // Extract techniques from flow
    const techniques = this.extractTechniques(flow);

    // Extract IOCs
    const iocs = this.extractIOCs(flow);

    // Extract affected assets
    const affectedAssets = this.extractAffectedAssets(flow);

    return {
      attackFlow: flow,
      techniques,
      iocs,
      affectedAssets,
      threatActor: this.extractThreatActor(flow),
    };
  }

  private extractTechniques(flow: SavedFlow): MITRETechnique[] {
    const techniques: MITRETechnique[] = [];

    for (const node of flow.nodes) {
      const data = node.data as any;
      if (data.technique_id) {
        techniques.push({
          techniqueId: data.technique_id,
          techniqueName: data.name || 'Unknown Technique',
          tactic: data.tactic_name || 'Unknown',
          description: data.description,
        });
      }
    }

    return techniques;
  }

  private extractIOCs(flow: SavedFlow): any[] {
    const iocs: any[] = [];

    for (const node of flow.nodes) {
      const data = node.data as any;
      if (data.indicator_type && data.indicator_value) {
        iocs.push({
          type: data.indicator_type,
          value: data.indicator_value,
          reputation: data.indicator_reputation,
        });
      }
    }

    return iocs;
  }

  private extractAffectedAssets(flow: SavedFlow): string[] {
    const assets = new Set<string>();

    for (const node of flow.nodes) {
      const data = node.data as any;
      if (node.type === 'asset' || data.type === 'attack-asset') {
        assets.add(data.name || 'Unknown Asset');
      }
    }

    return Array.from(assets);
  }

  private extractThreatActor(flow: SavedFlow): string | undefined {
    for (const tag of flow.metadata.tags) {
      if (tag.toLowerCase().startsWith('apt') || tag.toLowerCase().includes('actor')) {
        return tag;
      }
    }
    return undefined;
  }

  private inferTags(flow: SavedFlow): string[] {
    const tags = new Set<string>(flow.metadata.tags);

    // Add technique-based tags
    for (const node of flow.nodes) {
      const data = node.data as any;
      if (data.tactic_name) {
        tags.add(data.tactic_name.toLowerCase().replace(/ /g, '-'));
      }
    }

    return Array.from(tags);
  }

  private calculateConfidence(context: GenerationContext): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence if we have techniques
    if (context.techniques.length > 0) {
      confidence += 0.2;
    }

    // Higher confidence if we have IOCs
    if (context.iocs && context.iocs.length > 0) {
      confidence += 0.1;
    }

    // Higher confidence if we have affected assets
    if (context.affectedAssets && context.affectedAssets.length > 0) {
      confidence += 0.1;
    }

    // Higher confidence if we have threat actor
    if (context.threatActor) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private calculateTotalTime(phases: PlaybookPhase[]): number {
    const total = phases.reduce((sum, phase) => sum + (phase.estimatedDurationMinutes || 0), 0);
    return Math.round(total * this.config.estimatedTimeMultiplier);
  }

  private generateWarnings(playbook: IncidentPlaybook, context: GenerationContext): string[] {
    const warnings: string[] = [];

    if (context.techniques.length === 0) {
      warnings.push('No MITRE ATT&CK techniques identified - playbook may be generic');
    }

    if (playbook.generationConfidence! < 0.6) {
      warnings.push('Low confidence score - manual review recommended');
    }

    if (!context.iocs || context.iocs.length === 0) {
      warnings.push('No IOCs identified - detection capabilities limited');
    }

    return warnings;
  }

  private generateSuggestions(playbook: IncidentPlaybook, context: GenerationContext): string[] {
    const suggestions: string[] = [];

    suggestions.push('Review and customize actions for your environment');
    suggestions.push('Test detection rules before deploying to production');
    suggestions.push('Update time estimates based on your team capabilities');

    if (playbook.detectionRules.length > 0) {
      suggestions.push('Deploy detection rules to SIEM/EDR platforms');
    }

    if (!playbook.soarPlatform) {
      suggestions.push('Consider integrating with SOAR platform for automation');
    }

    return suggestions;
  }

  private getPhaseDescription(phaseName: PhaseName): string {
    const descriptions: Record<PhaseName, string> = {
      preparation: 'Initial preparation and team mobilization',
      detection: 'Detect and identify malicious activity',
      analysis: 'Analyze scope and impact of incident',
      containment: 'Contain the threat and prevent spread',
      eradication: 'Remove threats from environment',
      recovery: 'Restore normal operations',
      post_incident: 'Post-incident review and improvements',
    };
    return descriptions[phaseName];
  }

  private requiresApproval(phaseName: PhaseName): boolean {
    return ['containment', 'eradication', 'recovery'].includes(phaseName);
  }

  private detectMalwareNodes(attackFlow: any): boolean {
    if (!attackFlow || !attackFlow.nodes) return false;
    return attackFlow.nodes.some((n: any) =>
      n.type === 'malware' || n.data?.type === 'malware'
    );
  }

  private isMalwareRelated(technique: MITRETechnique): boolean {
    const malwareTactics = ['execution', 'persistence', 'defense-evasion'];
    return technique.tactic ? malwareTactics.includes(technique.tactic.toLowerCase()) : false;
  }

  private createAction(partial: Partial<Action>): Action {
    return {
      id: this.generateId(),
      phaseId: partial.phaseId!,
      playbookId: partial.playbookId!,
      actionOrder: partial.actionOrder!,
      actionType: partial.actionType!,
      title: partial.title!,
      description: partial.description,
      instructions: partial.instructions,
      command: partial.command,
      apiEndpoint: partial.apiEndpoint,
      scriptPath: partial.scriptPath,
      parameters: partial.parameters,
      requiredTools: partial.requiredTools,
      requiredPermissions: partial.requiredPermissions,
      requiresApproval: partial.requiresApproval || false,
      estimatedDurationMinutes: partial.estimatedDurationMinutes || 10,
      timeoutMinutes: partial.timeoutMinutes,
      successCriteria: partial.successCriteria,
      rollbackActionId: partial.rollbackActionId,
      mitreTechniqueId: partial.mitreTechniqueId,
      d3fendTechniqueId: partial.d3fendTechniqueId,
      requiredRoles: partial.requiredRoles,
      createdAt: new Date(),
    };
  }

  private async savePlaybook(playbook: IncidentPlaybook): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Save playbook
      await client.query(
        `INSERT INTO playbooks (
          id, name, description, flow_id, campaign_id,
          severity, estimated_time_minutes, required_roles, tags,
          status, version, generated_from, ai_generated, generation_confidence,
          playbook_data, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          playbook.id, playbook.name, playbook.description, playbook.flowId, playbook.campaignId,
          playbook.severity, playbook.estimatedTimeMinutes, playbook.requiredRoles, playbook.tags,
          playbook.status, playbook.version, playbook.generatedFrom, playbook.aiGenerated,
          playbook.generationConfidence, JSON.stringify(playbook), playbook.createdAt, playbook.updatedAt,
        ]
      );

      // Save phases
      for (const phase of playbook.phases) {
        await client.query(
          `INSERT INTO playbook_phases (
            id, playbook_id, phase_name, phase_order, description,
            estimated_duration_minutes, is_parallel, is_automated, requires_approval,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            phase.id, phase.playbookId, phase.phaseName, phase.phaseOrder, phase.description,
            phase.estimatedDurationMinutes, phase.isParallel, phase.isAutomated, phase.requiresApproval,
            phase.createdAt,
          ]
        );

        // Save actions
        for (const action of phase.actions) {
          await client.query(
            `INSERT INTO playbook_actions (
              id, phase_id, playbook_id, action_order, action_type,
              title, description, instructions, command, api_endpoint, script_path,
              parameters, required_tools, required_permissions, requires_approval,
              estimated_duration_minutes, timeout_minutes, success_criteria,
              mitre_technique_id, d3fend_technique_id, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
            [
              action.id, action.phaseId, action.playbookId, action.actionOrder, action.actionType,
              action.title, action.description, action.instructions, action.command, action.apiEndpoint,
              action.scriptPath, JSON.stringify(action.parameters), action.requiredTools,
              action.requiredPermissions, action.requiresApproval, action.estimatedDurationMinutes,
              action.timeoutMinutes, action.successCriteria, action.mitreTechniqueId,
              action.d3fendTechniqueId, action.createdAt,
            ]
          );
        }
      }

      // Save detection rules
      for (const rule of playbook.detectionRules) {
        await client.query(
          `INSERT INTO playbook_detection_rules (
            id, playbook_id, rule_name, description, rule_type, rule_content,
            mitre_technique_id, mitre_tactic, confidence_score, detection_count,
            is_active, tested, deployed, applicable_platforms, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            rule.id, rule.playbookId, rule.ruleName, rule.description, rule.ruleType, rule.ruleContent,
            rule.mitreTechniqueId, rule.mitreTactic, rule.confidenceScore, rule.detectionCount,
            rule.isActive, rule.tested, rule.deployed, rule.applicablePlatforms, rule.createdAt,
            rule.updatedAt,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private convertToYAML(obj: any): string {
    // Simple YAML converter (for production, use js-yaml library)
    return JSON.stringify(obj, null, 2);
  }

  private convertToXML(obj: any): string {
    // Simple XML converter (for production, use xml2js library)
    return `<?xml version="1.0"?>\n<playbook>${JSON.stringify(obj)}</playbook>`;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
