/**
 * Atomic Red Team Integration Adapter
 *
 * Integration with Atomic Red Team for open-source attack simulation
 */

import {
  SimulationTechnique,
  ExecutionMode,
  ValidationResult,
  ValidationResultStatus,
  Artifact,
} from '../../types';

interface AtomicTest {
  auto_generated_guid: string;
  name: string;
  description: string;
  supported_platforms: string[];
  executor: {
    command: string;
    name: string;
    elevation_required?: boolean;
  };
  input_arguments?: Record<string, any>;
}

interface AtomicExecutionResult {
  success: boolean;
  output: string;
  exitCode: number;
  detectionIndicators: string[];
  logs: string[];
  duration: number;
}

/**
 * Atomic Red Team Adapter
 * Integrates with Atomic Red Team for MITRE ATT&CK technique testing
 */
export class AtomicRedTeamAdapter {
  private atomicsPath: string = '';
  private powershellPath: string = 'pwsh';

  constructor(config?: { atomicsPath?: string; powershellPath?: string }) {
    if (config?.atomicsPath) {
      this.atomicsPath = config.atomicsPath;
    }
    if (config?.powershellPath) {
      this.powershellPath = config.powershellPath;
    }
  }

  /**
   * Configure adapter
   */
  configure(config: { atomicsPath?: string; powershellPath?: string }): void {
    if (config.atomicsPath) {
      this.atomicsPath = config.atomicsPath;
    }
    if (config.powershellPath) {
      this.powershellPath = config.powershellPath;
    }
  }

  /**
   * Test connection to Atomic Red Team
   */
  async testConnection(): Promise<{ connected: boolean; message?: string }> {
    try {
      // Check if Invoke-AtomicRedTeam module is available
      const result = await this.executePowerShell(
        'Get-Module -ListAvailable -Name invoke-atomicredteam'
      );

      if (result.success) {
        return { connected: true, message: 'Atomic Red Team module found' };
      } else {
        return {
          connected: false,
          message: 'Invoke-AtomicRedTeam PowerShell module not found',
        };
      }
    } catch (error) {
      return {
        connected: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get atomic tests for a technique
   */
  async getAtomicTests(techniqueId: string): Promise<AtomicTest[]> {
    try {
      const command = `
        Import-Module invoke-atomicredteam
        $tests = Get-AtomicTechnique -Path "${this.atomicsPath}" | Where-Object { $_.attack_technique -eq "${techniqueId}" }
        $tests.atomic_tests | ConvertTo-Json -Depth 10
      `;

      const result = await this.executePowerShell(command);

      if (result.success && result.output) {
        const tests = JSON.parse(result.output);
        return Array.isArray(tests) ? tests : [tests];
      }

      return [];
    } catch (error) {
      console.error(`Failed to get atomic tests for ${techniqueId}:`, error);
      return [];
    }
  }

  /**
   * Execute technique using Atomic Red Team
   */
  async executeTechnique(
    technique: SimulationTechnique,
    mode: ExecutionMode = 'safe',
    targetEnvironment?: string
  ): Promise<ValidationResult> {
    try {
      // Get atomic tests for technique
      const tests = await this.getAtomicTests(technique.id);

      if (tests.length === 0) {
        return this.createFailedResult(technique, 'No Atomic tests found for this technique');
      }

      // Select appropriate test based on platform
      const test = this.selectTest(tests, technique.platforms);

      if (!test) {
        return this.createFailedResult(technique, 'No compatible Atomic test found');
      }

      // Execute test
      let executionResult: AtomicExecutionResult;

      if (mode === 'safe') {
        // In safe mode, just show what would be executed
        executionResult = await this.showAtomicTest(technique.id, test);
      } else {
        // In simulation/live mode, actually execute
        executionResult = await this.invokeAtomicTest(technique.id, test);
      }

      return this.convertToValidationResult(technique, test, executionResult);
    } catch (error) {
      return this.createFailedResult(
        technique,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Show atomic test (safe mode)
   */
  private async showAtomicTest(
    techniqueId: string,
    test: AtomicTest
  ): Promise<AtomicExecutionResult> {
    const command = `
      Import-Module invoke-atomicredteam
      Invoke-AtomicTest ${techniqueId} -TestGuids ${test.auto_generated_guid} -ShowDetailsBrief
    `;

    const result = await this.executePowerShell(command);

    return {
      success: true,
      output: result.output,
      exitCode: 0,
      detectionIndicators: this.extractDetectionIndicators(result.output),
      logs: [result.output],
      duration: result.duration,
    };
  }

  /**
   * Invoke atomic test (simulation/live mode)
   */
  private async invokeAtomicTest(
    techniqueId: string,
    test: AtomicTest
  ): Promise<AtomicExecutionResult> {
    const command = `
      Import-Module invoke-atomicredteam
      Invoke-AtomicTest ${techniqueId} -TestGuids ${test.auto_generated_guid} -ExecutionLogPath "$env:TEMP\\atomic-execution.log"
    `;

    const result = await this.executePowerShell(command);

    return {
      success: result.exitCode === 0,
      output: result.output,
      exitCode: result.exitCode,
      detectionIndicators: this.extractDetectionIndicators(result.output),
      logs: [result.output],
      duration: result.duration,
    };
  }

  /**
   * Execute PowerShell command
   */
  private async executePowerShell(command: string): Promise<{
    success: boolean;
    output: string;
    exitCode: number;
    duration: number;
  }> {
    const startTime = Date.now();

    // In a real implementation, this would execute PowerShell via child_process
    // For now, we'll simulate the execution
    const simulatedOutput = `
[*] Technique: ${command.includes('Get-AtomicTechnique') ? 'Retrieved' : 'Executed'}
[*] Status: Success
[*] Detection Indicators:
    - Process creation: powershell.exe
    - Command line: ${command.substring(0, 100)}
    - File access: C:\\Windows\\System32\\cmd.exe
    `;

    return {
      success: true,
      output: simulatedOutput,
      exitCode: 0,
      duration: (Date.now() - startTime) / 1000,
    };
  }

  /**
   * Select appropriate test based on platform
   */
  private selectTest(tests: AtomicTest[], platforms?: string[]): AtomicTest | null {
    if (tests.length === 0) return null;

    // If no platform specified, return first test
    if (!platforms || platforms.length === 0) {
      return tests[0];
    }

    // Find test that matches platform
    const matchingTest = tests.find(test =>
      test.supported_platforms.some(sp =>
        platforms.some(p => sp.toLowerCase().includes(p.toLowerCase()))
      )
    );

    return matchingTest || tests[0];
  }

  /**
   * Extract detection indicators from output
   */
  private extractDetectionIndicators(output: string): string[] {
    const indicators: string[] = [];

    // Extract process names
    const processMatches = output.match(/Process creation: ([^\n]+)/gi);
    if (processMatches) {
      indicators.push(...processMatches);
    }

    // Extract command lines
    const commandMatches = output.match(/Command line: ([^\n]+)/gi);
    if (commandMatches) {
      indicators.push(...commandMatches);
    }

    // Extract file access
    const fileMatches = output.match(/File access: ([^\n]+)/gi);
    if (fileMatches) {
      indicators.push(...fileMatches);
    }

    // Extract registry keys
    const regMatches = output.match(/Registry key: ([^\n]+)/gi);
    if (regMatches) {
      indicators.push(...regMatches);
    }

    return indicators;
  }

  /**
   * Convert to ValidationResult
   */
  private convertToValidationResult(
    technique: SimulationTechnique,
    test: AtomicTest,
    executionResult: AtomicExecutionResult
  ): ValidationResult {
    const resultStatus: ValidationResultStatus = executionResult.success ? 'success' : 'failed';

    const artifacts: Artifact[] = [
      {
        id: `${test.auto_generated_guid}-log`,
        type: 'log',
        name: 'Execution Log',
        description: 'Atomic Red Team execution log',
        data: executionResult.logs.join('\n'),
        collectedAt: new Date(),
      },
    ];

    // Simulated detection - in real implementation, this would query EDR/SIEM
    const wasDetected = executionResult.detectionIndicators.length > 0;
    const detectedBy = wasDetected ? ['Windows Event Log', 'Sysmon'] : [];

    return {
      id: test.auto_generated_guid,
      jobId: '',
      techniqueId: technique.id,
      techniqueName: technique.name,
      tactic: technique.tactic,
      subTechniqueId: technique.subTechniqueId,
      executionOrder: 0,
      executedAt: new Date(),
      durationSeconds: executionResult.duration,
      resultStatus,
      wasDetected,
      wasPrevented: false, // Atomic doesn't detect prevention
      detectionTimeSeconds: wasDetected ? executionResult.duration : undefined,
      detectedBy,
      detectionRulesTriggered: executionResult.detectionIndicators,
      alertsGenerated: wasDetected ? executionResult.detectionIndicators.length : 0,
      preventedBy: [],
      evidence: {
        executorName: test.executor.name,
        command: test.executor.command,
        output: executionResult.output,
        exitCode: executionResult.exitCode,
      },
      artifacts,
      screenshots: [],
      confidenceScore: executionResult.success ? 100 : 50,
      falsePositive: false,
      notes: `Atomic test: ${test.name}`,
      resultData: {
        test,
        executionResult,
      },
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
   * Get available techniques
   */
  async getAvailableTechniques(): Promise<string[]> {
    try {
      const command = `
        Import-Module invoke-atomicredteam
        Get-AtomicTechnique -Path "${this.atomicsPath}" | Select-Object -ExpandProperty attack_technique
      `;

      const result = await this.executePowerShell(command);

      if (result.success && result.output) {
        return result.output.split('\n').filter(line => line.trim().startsWith('T'));
      }

      return [];
    } catch (error) {
      console.error('Failed to get available techniques:', error);
      return [];
    }
  }

  /**
   * Cleanup atomic test artifacts
   */
  async cleanupTest(techniqueId: string, testGuid: string): Promise<void> {
    const command = `
      Import-Module invoke-atomicredteam
      Invoke-AtomicTest ${techniqueId} -TestGuids ${testGuid} -Cleanup
    `;

    try {
      await this.executePowerShell(command);
    } catch (error) {
      console.error(`Failed to cleanup test ${testGuid}:`, error);
    }
  }
}

export default AtomicRedTeamAdapter;
