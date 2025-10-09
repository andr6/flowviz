/**
 * Picus Security Platform Integration Adapter
 *
 * Enhanced integration with Picus for attack simulation and validation
 */

import {
  SimulationTechnique,
  ExecutionMode,
  ValidationResult,
  ValidationResultStatus,
  Artifact,
} from '../../types';

interface PicusConfig {
  apiUrl: string;
  apiKey: string;
  tenantId?: string;
}

interface PicusTechnique {
  id: string;
  name: string;
  mitreId: string;
  category: string;
  severity: string;
}

interface PicusValidationResponse {
  validationId: string;
  status: string;
  result: {
    detected: boolean;
    prevented: boolean;
    detectedBy: string[];
    preventedBy: string[];
    detectionTime?: number;
    evidence: any;
    artifacts: any[];
  };
}

/**
 * Picus Platform Adapter
 * Integrates with Picus Security Platform for attack simulation
 */
export class PicusAdapter {
  private config: PicusConfig | null = null;
  private baseUrl: string = '';

  constructor(config?: PicusConfig) {
    if (config) {
      this.configure(config);
    }
  }

  /**
   * Configure adapter with Picus credentials
   */
  configure(config: PicusConfig): void {
    this.config = config;
    this.baseUrl = config.apiUrl.replace(/\/$/, '');
  }

  /**
   * Test connection to Picus platform
   */
  async testConnection(): Promise<{ connected: boolean; message?: string }> {
    if (!this.config) {
      return { connected: false, message: 'Picus not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return { connected: true, message: 'Connected to Picus successfully' };
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
   * Convert MITRE ATT&CK technique to Picus technique
   */
  async convertToPicusTechnique(technique: SimulationTechnique): Promise<PicusTechnique | null> {
    if (!this.config) {
      throw new Error('Picus not configured');
    }

    try {
      // Query Picus for matching technique
      const response = await fetch(
        `${this.baseUrl}/api/v1/techniques/search?mitreId=${technique.id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`Failed to find Picus technique for ${technique.id}`);
        return null;
      }

      const data = await response.json();
      return data.techniques?.[0] || null;
    } catch (error) {
      console.error(`Error converting technique ${technique.id}:`, error);
      return null;
    }
  }

  /**
   * Execute technique using Picus platform
   */
  async executeTechnique(
    technique: SimulationTechnique,
    mode: ExecutionMode = 'safe',
    targetEnvironment?: string
  ): Promise<ValidationResult> {
    if (!this.config) {
      throw new Error('Picus not configured');
    }

    // Convert to Picus technique
    const picusTechnique = await this.convertToPicusTechnique(technique);

    if (!picusTechnique) {
      return this.createFailedResult(technique, 'Technique not supported by Picus');
    }

    try {
      // Execute validation
      const response = await fetch(`${this.baseUrl}/api/v1/validations/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          techniqueId: picusTechnique.id,
          mode: mode === 'live' ? 'production' : 'safe',
          environment: targetEnvironment,
          mitreId: technique.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Picus validation failed: ${response.statusText}`);
      }

      const validationResponse: PicusValidationResponse = await response.json();

      // Poll for results
      const result = await this.pollValidationResult(validationResponse.validationId);

      return this.convertToValidationResult(technique, result, validationResponse.validationId);
    } catch (error) {
      return this.createFailedResult(
        technique,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Poll for validation result
   */
  private async pollValidationResult(validationId: string, maxAttempts: number = 30): Promise<any> {
    if (!this.config) {
      throw new Error('Picus not configured');
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(
        `${this.baseUrl}/api/v1/validations/${validationId}/status`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get validation status: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'completed') {
        return data.result;
      }

      if (data.status === 'failed') {
        throw new Error(`Validation failed: ${data.error}`);
      }

      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Validation timeout');
  }

  /**
   * Convert Picus result to ValidationResult
   */
  private convertToValidationResult(
    technique: SimulationTechnique,
    picusResult: any,
    validationId: string
  ): ValidationResult {
    const resultStatus: ValidationResultStatus = this.determineResultStatus(picusResult);

    const artifacts: Artifact[] = (picusResult.artifacts || []).map((art: any, index: number) => ({
      id: `${validationId}-artifact-${index}`,
      type: art.type || 'log',
      name: art.name || `Artifact ${index + 1}`,
      description: art.description,
      url: art.url,
      data: art.data,
      collectedAt: new Date(art.timestamp || Date.now()),
    }));

    return {
      id: validationId,
      jobId: '', // Will be set by the service
      techniqueId: technique.id,
      techniqueName: technique.name,
      tactic: technique.tactic,
      subTechniqueId: technique.subTechniqueId,
      executionOrder: 0,
      executedAt: new Date(),
      durationSeconds: picusResult.durationSeconds,
      resultStatus,
      wasDetected: picusResult.detected || false,
      wasPrevented: picusResult.prevented || false,
      detectionTimeSeconds: picusResult.detectionTime,
      detectedBy: picusResult.detectedBy || [],
      detectionRulesTriggered: picusResult.detectionRules || [],
      alertsGenerated: picusResult.alertCount || 0,
      preventedBy: picusResult.preventedBy || [],
      preventionMechanism: picusResult.preventionMechanism,
      evidence: picusResult.evidence || {},
      artifacts,
      screenshots: picusResult.screenshots || [],
      confidenceScore: picusResult.confidence || 100,
      falsePositive: false,
      notes: picusResult.notes,
      resultData: picusResult,
      createdAt: new Date(),
    };
  }

  /**
   * Determine result status from Picus result
   */
  private determineResultStatus(picusResult: any): ValidationResultStatus {
    if (picusResult.prevented) {
      return 'blocked';
    }

    if (picusResult.detected) {
      return 'detected';
    }

    if (picusResult.executed) {
      return 'success';
    }

    if (picusResult.error) {
      return 'failed';
    }

    if (picusResult.skipped) {
      return 'skipped';
    }

    if (picusResult.timeout) {
      return 'timeout';
    }

    return 'success';
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
   * Get Picus platform capabilities
   */
  async getCapabilities(): Promise<{
    supportedTechniques: string[];
    supportedPlatforms: string[];
    supportedModes: string[];
  }> {
    if (!this.config) {
      return {
        supportedTechniques: [],
        supportedPlatforms: [],
        supportedModes: [],
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/capabilities`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get capabilities');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Picus capabilities:', error);
      return {
        supportedTechniques: [],
        supportedPlatforms: [],
        supportedModes: [],
      };
    }
  }

  /**
   * Get validation history from Picus
   */
  async getValidationHistory(limit: number = 50): Promise<any[]> {
    if (!this.config) {
      return [];
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/validations/history?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get validation history');
      }

      const data = await response.json();
      return data.validations || [];
    } catch (error) {
      console.error('Error getting validation history:', error);
      return [];
    }
  }
}

export default PicusAdapter;
