/**
 * CALDERA Integration Adapter
 *
 * Integration with MITRE CALDERA for adversary emulation
 */

import {
  SimulationTechnique,
  ExecutionMode,
  ValidationResult,
  ValidationResultStatus,
  Artifact,
} from '../../types';

interface CalderaConfig {
  apiUrl: string;
  apiKey: string;
}

interface CalderaAbility {
  ability_id: string;
  name: string;
  description: string;
  tactic: string;
  technique_id: string;
  technique_name: string;
  executors: CalderaExecutor[];
}

interface CalderaExecutor {
  name: string;
  platform: string;
  command: string;
  cleanup?: string;
  payloads?: string[];
}

interface CalderaOperation {
  id: string;
  name: string;
  state: string;
  adversary: {
    adversary_id: string;
    name: string;
  };
  agents: CalderaAgent[];
}

interface CalderaAgent {
  paw: string;
  host: string;
  platform: string;
  executors: string[];
}

interface CalderaLink {
  id: string;
  ability: CalderaAbility;
  status: number;
  score: number;
  output: string;
  pid: number;
  finish: string;
}

/**
 * CALDERA Adapter
 * Integrates with MITRE CALDERA for automated adversary emulation
 */
export class CalderaAdapter {
  private config: CalderaConfig | null = null;
  private baseUrl: string = '';

  constructor(config?: CalderaConfig) {
    if (config) {
      this.configure(config);
    }
  }

  /**
   * Configure adapter with CALDERA credentials
   */
  configure(config: CalderaConfig): void {
    this.config = config;
    this.baseUrl = config.apiUrl.replace(/\/$/, '');
  }

  /**
   * Test connection to CALDERA
   */
  async testConnection(): Promise<{ connected: boolean; message?: string }> {
    if (!this.config) {
      return { connected: false, message: 'CALDERA not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v2/health`, {
        method: 'GET',
        headers: {
          'KEY': this.config.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return { connected: true, message: 'Connected to CALDERA successfully' };
      } else {
        return { connected: false, message: `Connection failed: ${response.statusText}` };
      }
    } catch (error) {
      return {
        connected: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find CALDERA ability for technique
   */
  async findAbility(techniqueId: string): Promise<CalderaAbility | null> {
    if (!this.config) {
      throw new Error('CALDERA not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v2/abilities`, {
        method: 'GET',
        headers: {
          'KEY': this.config.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get abilities: ${response.statusText}`);
      }

      const abilities: CalderaAbility[] = await response.json();

      // Find ability matching the technique ID
      return abilities.find(a => a.technique_id === techniqueId) || null;
    } catch (error) {
      console.error(`Failed to find ability for ${techniqueId}:`, error);
      return null;
    }
  }

  /**
   * Get available agents
   */
  async getAgents(): Promise<CalderaAgent[]> {
    if (!this.config) {
      throw new Error('CALDERA not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v2/agents`, {
        method: 'GET',
        headers: {
          'KEY': this.config.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get agents: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get agents:', error);
      return [];
    }
  }

  /**
   * Create operation
   */
  async createOperation(
    name: string,
    adversaryId: string,
    agentPaw: string
  ): Promise<CalderaOperation> {
    if (!this.config) {
      throw new Error('CALDERA not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v2/operations`, {
        method: 'POST',
        headers: {
          'KEY': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          adversary: { adversary_id: adversaryId },
          auto_close: false,
          state: 'running',
          group: agentPaw,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create operation: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(
        `Failed to create CALDERA operation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute ability
   */
  async executeAbility(
    operationId: string,
    abilityId: string,
    agentPaw: string
  ): Promise<CalderaLink> {
    if (!this.config) {
      throw new Error('CALDERA not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v2/operations/${operationId}/links`, {
        method: 'POST',
        headers: {
          'KEY': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ability_id: abilityId,
          paw: agentPaw,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to execute ability: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(
        `Failed to execute ability: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get operation results
   */
  async getOperationResults(operationId: string): Promise<CalderaLink[]> {
    if (!this.config) {
      throw new Error('CALDERA not configured');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/v2/operations/${operationId}/links`,
        {
          method: 'GET',
          headers: {
            'KEY': this.config.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get operation results: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get operation results:', error);
      return [];
    }
  }

  /**
   * Execute technique using CALDERA
   */
  async executeTechnique(
    technique: SimulationTechnique,
    mode: ExecutionMode = 'safe',
    targetEnvironment?: string
  ): Promise<ValidationResult> {
    try {
      // Find matching ability
      const ability = await this.findAbility(technique.id);

      if (!ability) {
        return this.createFailedResult(technique, 'No CALDERA ability found for this technique');
      }

      // Get available agents
      const agents = await this.getAgents();

      if (agents.length === 0) {
        return this.createFailedResult(technique, 'No CALDERA agents available');
      }

      // Select agent
      const agent = this.selectAgent(agents, technique.platforms);

      if (!agent) {
        return this.createFailedResult(technique, 'No compatible CALDERA agent found');
      }

      if (mode === 'safe') {
        // In safe mode, just return simulation data
        return this.createSimulatedResult(technique, ability);
      }

      // Create operation
      const operation = await this.createOperation(
        `ThreatFlow-${technique.id}-${Date.now()}`,
        'auto-generated',
        agent.paw
      );

      // Execute ability
      const link = await this.executeAbility(operation.id, ability.ability_id, agent.paw);

      // Wait for completion
      const completedLink = await this.waitForCompletion(operation.id, link.id);

      return this.convertToValidationResult(technique, ability, completedLink);
    } catch (error) {
      return this.createFailedResult(
        technique,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Select appropriate agent based on platform
   */
  private selectAgent(agents: CalderaAgent[], platforms?: string[]): CalderaAgent | null {
    if (agents.length === 0) return null;

    // If no platform specified, return first agent
    if (!platforms || platforms.length === 0) {
      return agents[0];
    }

    // Find agent that matches platform
    const matchingAgent = agents.find(agent =>
      platforms.some(p => agent.platform.toLowerCase().includes(p.toLowerCase()))
    );

    return matchingAgent || agents[0];
  }

  /**
   * Wait for link completion
   */
  private async waitForCompletion(
    operationId: string,
    linkId: string,
    maxAttempts: number = 30
  ): Promise<CalderaLink> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const links = await this.getOperationResults(operationId);
      const link = links.find(l => l.id === linkId);

      if (link && link.finish) {
        return link;
      }

      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Link execution timeout');
  }

  /**
   * Convert to ValidationResult
   */
  private convertToValidationResult(
    technique: SimulationTechnique,
    ability: CalderaAbility,
    link: CalderaLink
  ): ValidationResult {
    // Status 0 = success, non-zero = failure
    const resultStatus: ValidationResultStatus = link.status === 0 ? 'success' : 'failed';

    const artifacts: Artifact[] = [
      {
        id: `${link.id}-output`,
        type: 'log',
        name: 'Execution Output',
        description: 'CALDERA ability execution output',
        data: link.output,
        collectedAt: new Date(link.finish),
      },
    ];

    // Simulated detection - in real implementation, this would integrate with EDR/SIEM
    const wasDetected = link.score > 0; // CALDERA visibility score
    const detectedBy = wasDetected ? ['CALDERA Agent', 'Host Telemetry'] : [];

    return {
      id: link.id,
      jobId: '',
      techniqueId: technique.id,
      techniqueName: technique.name,
      tactic: technique.tactic || ability.tactic,
      subTechniqueId: technique.subTechniqueId,
      executionOrder: 0,
      executedAt: new Date(link.finish),
      resultStatus,
      wasDetected,
      wasPrevented: false,
      detectedBy,
      detectionRulesTriggered: [],
      alertsGenerated: wasDetected ? 1 : 0,
      preventedBy: [],
      evidence: {
        abilityId: ability.ability_id,
        abilityName: ability.name,
        output: link.output,
        status: link.status,
        score: link.score,
        pid: link.pid,
      },
      artifacts,
      screenshots: [],
      confidenceScore: link.score,
      falsePositive: false,
      notes: `CALDERA ability: ${ability.name}`,
      resultData: {
        ability,
        link,
      },
      createdAt: new Date(),
    };
  }

  /**
   * Create simulated result (safe mode)
   */
  private createSimulatedResult(
    technique: SimulationTechnique,
    ability: CalderaAbility
  ): ValidationResult {
    return {
      id: `simulated-${Date.now()}`,
      jobId: '',
      techniqueId: technique.id,
      techniqueName: technique.name,
      tactic: technique.tactic || ability.tactic,
      executionOrder: 0,
      executedAt: new Date(),
      resultStatus: 'success',
      wasDetected: false,
      wasPrevented: false,
      detectedBy: [],
      detectionRulesTriggered: [],
      alertsGenerated: 0,
      preventedBy: [],
      evidence: {
        mode: 'safe',
        abilityId: ability.ability_id,
        abilityName: ability.name,
        description: ability.description,
        executors: ability.executors,
      },
      artifacts: [],
      screenshots: [],
      confidenceScore: 100,
      falsePositive: false,
      notes: `Safe mode simulation - no actual execution. Would execute: ${ability.name}`,
      resultData: { ability },
      createdAt: new Date(),
    };
  }

  /**
   * Create failed validation result
   */
  private createFailedResult(technique: SimulationTechnique, errorMessage: string): ValidationResult {
    return {
      id: `failed-${Date.now()}`,
      jobId: '',
      techniqueId: technique.id,
      techniqueName: technique.name,
      tactic: technique.tactic,
      executionOrder: 0,
      executedAt: new Date(),
      resultStatus: 'failed',
      wasDetected: false,
      wasPrevented: false,
      detectedBy: [],
      detectionRulesTriggered: [],
      alertsGenerated: 0,
      preventedBy: [],
      evidence: { error: errorMessage },
      artifacts: [],
      screenshots: [],
      falsePositive: false,
      notes: `Execution failed: ${errorMessage}`,
      resultData: { error: errorMessage },
      createdAt: new Date(),
    };
  }

  /**
   * Get CALDERA adversary profiles
   */
  async getAdversaries(): Promise<any[]> {
    if (!this.config) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v2/adversaries`, {
        method: 'GET',
        headers: {
          'KEY': this.config.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get adversaries');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get adversaries:', error);
      return [];
    }
  }

  /**
   * Stop operation
   */
  async stopOperation(operationId: string): Promise<void> {
    if (!this.config) {
      throw new Error('CALDERA not configured');
    }

    try {
      await fetch(`${this.baseUrl}/api/v2/operations/${operationId}`, {
        method: 'PATCH',
        headers: {
          'KEY': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state: 'finished' }),
      });
    } catch (error) {
      console.error(`Failed to stop operation ${operationId}:`, error);
    }
  }
}

export default CalderaAdapter;
