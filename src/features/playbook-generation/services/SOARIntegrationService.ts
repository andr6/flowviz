/**
 * SOAR Integration Service
 *
 * Integrates incident response playbooks with major SOAR platforms:
 * - Cortex XSOAR (Palo Alto)
 * - Splunk SOAR (Phantom)
 * - IBM Resilient
 * - ServiceNow SecOps
 * - Generic REST API
 */

import { Pool } from 'pg';
import type {
  IncidentPlaybook,
  SOARPlatform,
  SOARConfig,
  SOARIntegration,
  SyncStatus,
  SOARExportFormat,
} from '../types';

// ============================================================================
// Base SOAR Integration Interface
// ============================================================================

interface SOARPlatformAdapter {
  connect(config: SOARConfig): Promise<boolean>;
  syncPlaybook(playbook: IncidentPlaybook): Promise<string>; // Returns platform playbook ID
  getPlaybook(platformPlaybookId: string): Promise<any>;
  updatePlaybook(platformPlaybookId: string, playbook: IncidentPlaybook): Promise<void>;
  deletePlaybook(platformPlaybookId: string): Promise<void>;
  executePlaybook(platformPlaybookId: string, params: any): Promise<string>; // Returns execution ID
  getExecutionStatus(executionId: string): Promise<any>;
  testConnection(): Promise<boolean>;
}

// ============================================================================
// SOAR Integration Service
// ============================================================================

export class SOARIntegrationService {
  private pool: Pool;
  private adapters: Map<SOARPlatform, SOARPlatformAdapter>;

  constructor(pool: Pool) {
    this.pool = pool;
    this.adapters = new Map();
    this.initializeAdapters();
  }

  private initializeAdapters(): void {
    this.adapters.set('cortex_xsoar', new CortexXSOARAdapter());
    this.adapters.set('splunk_soar', new SplunkSOARAdapter());
    this.adapters.set('ibm_resilient', new IBMResilientAdapter());
    this.adapters.set('servicenow', new ServiceNowAdapter());
    this.adapters.set('custom', new GenericRESTAdapter());
  }

  // ==========================================================================
  // Integration Management
  // ==========================================================================

  /**
   * Create new SOAR integration
   */
  async createIntegration(
    playbookId: string,
    platform: SOARPlatform,
    config: SOARConfig
  ): Promise<SOARIntegration> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`Unsupported SOAR platform: ${platform}`);
    }

    try {
      // Test connection first
      const connected = await adapter.connect(config);
      if (!connected) {
        throw new Error('Failed to connect to SOAR platform');
      }

      // Get playbook
      const playbook = await this.getPlaybook(playbookId);
      if (!playbook) {
        throw new Error(`Playbook not found: ${playbookId}`);
      }

      // Sync playbook to SOAR platform
      const platformPlaybookId = await adapter.syncPlaybook(playbook);

      // Create integration record
      const integration: SOARIntegration = {
        id: this.generateId(),
        playbookId,
        platform,
        platformPlaybookId,
        platformUrl: config.apiUrl,
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
        integrationConfig: config,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to database
      await this.saveIntegration(integration);

      return integration;
    } catch (error) {
      throw new Error(`SOAR integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync playbook to SOAR platform
   */
  async syncPlaybook(integrationId: string): Promise<void> {
    const integration = await this.getIntegration(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    const adapter = this.adapters.get(integration.platform);
    if (!adapter) {
      throw new Error(`No adapter for platform: ${integration.platform}`);
    }

    try {
      // Update sync status
      await this.updateIntegrationStatus(integrationId, 'syncing');

      // Get current playbook
      const playbook = await this.getPlaybook(integration.playbookId);
      if (!playbook) {
        throw new Error(`Playbook not found: ${integration.playbookId}`);
      }

      // Connect to SOAR
      await adapter.connect(integration.integrationConfig);

      // Check if playbook exists on platform
      try {
        await adapter.getPlaybook(integration.platformPlaybookId);
        // Playbook exists, update it
        await adapter.updatePlaybook(integration.platformPlaybookId, playbook);
      } catch {
        // Playbook doesn't exist, create new
        const newId = await adapter.syncPlaybook(playbook);
        integration.platformPlaybookId = newId;
      }

      // Update integration status
      await this.updateIntegrationStatus(integrationId, 'synced', new Date());
    } catch (error) {
      await this.updateIntegrationStatus(
        integrationId,
        'failed',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  /**
   * Test SOAR platform connection
   */
  async testConnection(platform: SOARPlatform, config: SOARConfig): Promise<boolean> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    try {
      return await adapter.testConnection();
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Execute playbook on SOAR platform
   */
  async executePlaybook(integrationId: string, params: any): Promise<string> {
    const integration = await this.getIntegration(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    const adapter = this.adapters.get(integration.platform);
    if (!adapter) {
      throw new Error(`No adapter for platform: ${integration.platform}`);
    }

    await adapter.connect(integration.integrationConfig);
    return await adapter.executePlaybook(integration.platformPlaybookId, params);
  }

  /**
   * Get playbook execution status from SOAR platform
   */
  async getExecutionStatus(integrationId: string, executionId: string): Promise<any> {
    const integration = await this.getIntegration(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    const adapter = this.adapters.get(integration.platform);
    if (!adapter) {
      throw new Error(`No adapter for platform: ${integration.platform}`);
    }

    await adapter.connect(integration.integrationConfig);
    return await adapter.getExecutionStatus(executionId);
  }

  /**
   * Disconnect SOAR integration
   */
  async disconnectIntegration(integrationId: string): Promise<void> {
    await this.pool.query('DELETE FROM soar_integrations WHERE id = $1', [integrationId]);
  }

  // ==========================================================================
  // Database Operations
  // ==========================================================================

  private async getPlaybook(playbookId: string): Promise<IncidentPlaybook | null> {
    const result = await this.pool.query(
      'SELECT playbook_data FROM playbooks WHERE id = $1',
      [playbookId]
    );
    return result.rows[0] ? result.rows[0].playbook_data : null;
  }

  private async getIntegration(integrationId: string): Promise<SOARIntegration | null> {
    const result = await this.pool.query<SOARIntegration>(
      'SELECT * FROM soar_integrations WHERE id = $1',
      [integrationId]
    );
    return result.rows[0] || null;
  }

  private async saveIntegration(integration: SOARIntegration): Promise<void> {
    await this.pool.query(
      `INSERT INTO soar_integrations (
        id, playbook_id, platform, platform_playbook_id, platform_url,
        sync_status, last_synced_at, integration_config, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        integration.id,
        integration.playbookId,
        integration.platform,
        integration.platformPlaybookId,
        integration.platformUrl,
        integration.syncStatus,
        integration.lastSyncedAt,
        JSON.stringify(integration.integrationConfig),
        integration.createdAt,
        integration.updatedAt,
      ]
    );
  }

  private async updateIntegrationStatus(
    integrationId: string,
    status: SyncStatus,
    syncedAt?: Date,
    error?: string
  ): Promise<void> {
    await this.pool.query(
      `UPDATE soar_integrations
       SET sync_status = $1, last_synced_at = $2, sync_error = $3, updated_at = NOW()
       WHERE id = $4`,
      [status, syncedAt, error, integrationId]
    );
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Cortex XSOAR Adapter
// ============================================================================

class CortexXSOARAdapter implements SOARPlatformAdapter {
  private config?: SOARConfig;

  async connect(config: SOARConfig): Promise<boolean> {
    this.config = config;
    return await this.testConnection();
  }

  async testConnection(): Promise<boolean> {
    if (!this.config) return false;

    try {
      const response = await fetch(`${this.config.apiUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': this.config.apiKey || '',
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async syncPlaybook(playbook: IncidentPlaybook): Promise<string> {
    if (!this.config) throw new Error('Not connected');

    const xsoarPlaybook = this.convertToXSOARFormat(playbook);

    const response = await fetch(`${this.config.apiUrl}/playbook/save`, {
      method: 'POST',
      headers: {
        'Authorization': this.config.apiKey || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(xsoarPlaybook),
    });

    if (!response.ok) {
      throw new Error(`XSOAR sync failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id || playbook.id;
  }

  async getPlaybook(platformPlaybookId: string): Promise<any> {
    if (!this.config) throw new Error('Not connected');

    const response = await fetch(`${this.config.apiUrl}/playbook/${platformPlaybookId}`, {
      headers: {
        'Authorization': this.config.apiKey || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get playbook: ${response.statusText}`);
    }

    return await response.json();
  }

  async updatePlaybook(platformPlaybookId: string, playbook: IncidentPlaybook): Promise<void> {
    if (!this.config) throw new Error('Not connected');

    const xsoarPlaybook = this.convertToXSOARFormat(playbook);
    xsoarPlaybook.id = platformPlaybookId;

    const response = await fetch(`${this.config.apiUrl}/playbook/save`, {
      method: 'POST',
      headers: {
        'Authorization': this.config.apiKey || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(xsoarPlaybook),
    });

    if (!response.ok) {
      throw new Error(`Failed to update playbook: ${response.statusText}`);
    }
  }

  async deletePlaybook(platformPlaybookId: string): Promise<void> {
    if (!this.config) throw new Error('Not connected');

    const response = await fetch(`${this.config.apiUrl}/playbook/${platformPlaybookId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': this.config.apiKey || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete playbook: ${response.statusText}`);
    }
  }

  async executePlaybook(platformPlaybookId: string, params: any): Promise<string> {
    if (!this.config) throw new Error('Not connected');

    const response = await fetch(`${this.config.apiUrl}/playbook/run`, {
      method: 'POST',
      headers: {
        'Authorization': this.config.apiKey || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playbookId: platformPlaybookId,
        ...params,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to execute playbook: ${response.statusText}`);
    }

    const result = await response.json();
    return result.investigationId || result.executionId;
  }

  async getExecutionStatus(executionId: string): Promise<any> {
    if (!this.config) throw new Error('Not connected');

    const response = await fetch(`${this.config.apiUrl}/investigation/${executionId}`, {
      headers: {
        'Authorization': this.config.apiKey || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get execution status: ${response.statusText}`);
    }

    return await response.json();
  }

  private convertToXSOARFormat(playbook: IncidentPlaybook): any {
    return {
      id: playbook.id,
      version: -1,
      name: playbook.name,
      description: playbook.description,
      tags: playbook.tags,
      starttaskid: '0',
      tasks: this.convertPhasesToTasks(playbook.phases),
      view: '{}',
      inputs: [],
      outputs: [],
      quiet: true,
    };
  }

  private convertPhasesToTasks(phases: any[]): Record<string, any> {
    const tasks: Record<string, any> = {};
    let taskId = 0;

    for (const phase of phases) {
      tasks[taskId.toString()] = {
        id: taskId.toString(),
        taskid: phase.id,
        type: 'title',
        task: {
          id: phase.id,
          name: phase.phaseName,
          description: phase.description,
        },
        nexttasks: {},
      };
      taskId++;
    }

    return tasks;
  }
}

// ============================================================================
// Splunk SOAR Adapter
// ============================================================================

class SplunkSOARAdapter implements SOARPlatformAdapter {
  private config?: SOARConfig;

  async connect(config: SOARConfig): Promise<boolean> {
    this.config = config;
    return await this.testConnection();
  }

  async testConnection(): Promise<boolean> {
    if (!this.config) return false;

    try {
      const response = await fetch(`${this.config.apiUrl}/rest/system_info`, {
        headers: {
          'ph-auth-token': this.config.apiKey || '',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async syncPlaybook(playbook: IncidentPlaybook): Promise<string> {
    if (!this.config) throw new Error('Not connected');

    const phantomPlaybook = this.convertToPhantomFormat(playbook);

    const response = await fetch(`${this.config.apiUrl}/rest/playbook`, {
      method: 'POST',
      headers: {
        'ph-auth-token': this.config.apiKey || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(phantomPlaybook),
    });

    if (!response.ok) {
      throw new Error(`Splunk SOAR sync failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id || playbook.id;
  }

  async getPlaybook(platformPlaybookId: string): Promise<any> {
    if (!this.config) throw new Error('Not connected');

    const response = await fetch(`${this.config.apiUrl}/rest/playbook/${platformPlaybookId}`, {
      headers: {
        'ph-auth-token': this.config.apiKey || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get playbook: ${response.statusText}`);
    }

    return await response.json();
  }

  async updatePlaybook(platformPlaybookId: string, playbook: IncidentPlaybook): Promise<void> {
    if (!this.config) throw new Error('Not connected');

    const phantomPlaybook = this.convertToPhantomFormat(playbook);

    const response = await fetch(`${this.config.apiUrl}/rest/playbook/${platformPlaybookId}`, {
      method: 'POST',
      headers: {
        'ph-auth-token': this.config.apiKey || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(phantomPlaybook),
    });

    if (!response.ok) {
      throw new Error(`Failed to update playbook: ${response.statusText}`);
    }
  }

  async deletePlaybook(platformPlaybookId: string): Promise<void> {
    if (!this.config) throw new Error('Not connected');

    const response = await fetch(`${this.config.apiUrl}/rest/playbook/${platformPlaybookId}`, {
      method: 'DELETE',
      headers: {
        'ph-auth-token': this.config.apiKey || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete playbook: ${response.statusText}`);
    }
  }

  async executePlaybook(platformPlaybookId: string, params: any): Promise<string> {
    if (!this.config) throw new Error('Not connected');

    const response = await fetch(`${this.config.apiUrl}/rest/playbook_run`, {
      method: 'POST',
      headers: {
        'ph-auth-token': this.config.apiKey || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playbook_id: platformPlaybookId,
        container_id: params.containerId,
        ...params,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to execute playbook: ${response.statusText}`);
    }

    const result = await response.json();
    return result.playbook_run_id;
  }

  async getExecutionStatus(executionId: string): Promise<any> {
    if (!this.config) throw new Error('Not connected');

    const response = await fetch(`${this.config.apiUrl}/rest/playbook_run/${executionId}`, {
      headers: {
        'ph-auth-token': this.config.apiKey || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get execution status: ${response.statusText}`);
    }

    return await response.json();
  }

  private convertToPhantomFormat(playbook: IncidentPlaybook): any {
    return {
      name: playbook.name,
      description: playbook.description,
      tags: playbook.tags.join(','),
      active: true,
      python_version: '3',
    };
  }
}

// ============================================================================
// IBM Resilient Adapter
// ============================================================================

class IBMResilientAdapter implements SOARPlatformAdapter {
  private config?: SOARConfig;

  async connect(config: SOARConfig): Promise<boolean> {
    this.config = config;
    return await this.testConnection();
  }

  async testConnection(): Promise<boolean> {
    if (!this.config) return false;

    try {
      const auth = Buffer.from(`${this.config.username}:${this.config.apiKey}`).toString('base64');
      const response = await fetch(`${this.config.apiUrl}/rest/orgs`, {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async syncPlaybook(playbook: IncidentPlaybook): Promise<string> {
    // IBM Resilient playbook implementation
    throw new Error('IBM Resilient sync not yet implemented');
  }

  async getPlaybook(platformPlaybookId: string): Promise<any> {
    throw new Error('IBM Resilient get not yet implemented');
  }

  async updatePlaybook(platformPlaybookId: string, playbook: IncidentPlaybook): Promise<void> {
    throw new Error('IBM Resilient update not yet implemented');
  }

  async deletePlaybook(platformPlaybookId: string): Promise<void> {
    throw new Error('IBM Resilient delete not yet implemented');
  }

  async executePlaybook(platformPlaybookId: string, params: any): Promise<string> {
    throw new Error('IBM Resilient execute not yet implemented');
  }

  async getExecutionStatus(executionId: string): Promise<any> {
    throw new Error('IBM Resilient status not yet implemented');
  }
}

// ============================================================================
// ServiceNow Adapter
// ============================================================================

class ServiceNowAdapter implements SOARPlatformAdapter {
  private config?: SOARConfig;

  async connect(config: SOARConfig): Promise<boolean> {
    this.config = config;
    return await this.testConnection();
  }

  async testConnection(): Promise<boolean> {
    if (!this.config) return false;

    try {
      const auth = Buffer.from(`${this.config.username}:${this.config.apiKey}`).toString('base64');
      const response = await fetch(`${this.config.apiUrl}/api/now/table/sys_user?sysparm_limit=1`, {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async syncPlaybook(playbook: IncidentPlaybook): Promise<string> {
    // ServiceNow playbook implementation
    throw new Error('ServiceNow sync not yet implemented');
  }

  async getPlaybook(platformPlaybookId: string): Promise<any> {
    throw new Error('ServiceNow get not yet implemented');
  }

  async updatePlaybook(platformPlaybookId: string, playbook: IncidentPlaybook): Promise<void> {
    throw new Error('ServiceNow update not yet implemented');
  }

  async deletePlaybook(platformPlaybookId: string): Promise<void> {
    throw new Error('ServiceNow delete not yet implemented');
  }

  async executePlaybook(platformPlaybookId: string, params: any): Promise<string> {
    throw new Error('ServiceNow execute not yet implemented');
  }

  async getExecutionStatus(executionId: string): Promise<any> {
    throw new Error('ServiceNow status not yet implemented');
  }
}

// ============================================================================
// Generic REST API Adapter
// ============================================================================

class GenericRESTAdapter implements SOARPlatformAdapter {
  private config?: SOARConfig;

  async connect(config: SOARConfig): Promise<boolean> {
    this.config = config;
    return await this.testConnection();
  }

  async testConnection(): Promise<boolean> {
    if (!this.config) return false;

    try {
      const response = await fetch(this.config.apiUrl, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async syncPlaybook(playbook: IncidentPlaybook): Promise<string> {
    if (!this.config) throw new Error('Not connected');

    const response = await fetch(`${this.config.apiUrl}/playbooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(playbook),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id || playbook.id;
  }

  async getPlaybook(platformPlaybookId: string): Promise<any> {
    if (!this.config) throw new Error('Not connected');

    const response = await fetch(`${this.config.apiUrl}/playbooks/${platformPlaybookId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get playbook: ${response.statusText}`);
    }

    return await response.json();
  }

  async updatePlaybook(platformPlaybookId: string, playbook: IncidentPlaybook): Promise<void> {
    if (!this.config) throw new Error('Not connected');

    const response = await fetch(`${this.config.apiUrl}/playbooks/${platformPlaybookId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(playbook),
    });

    if (!response.ok) {
      throw new Error(`Failed to update playbook: ${response.statusText}`);
    }
  }

  async deletePlaybook(platformPlaybookId: string): Promise<void> {
    if (!this.config) throw new Error('Not connected');

    const response = await fetch(`${this.config.apiUrl}/playbooks/${platformPlaybookId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete playbook: ${response.statusText}`);
    }
  }

  async executePlaybook(platformPlaybookId: string, params: any): Promise<string> {
    if (!this.config) throw new Error('Not connected');

    const response = await fetch(`${this.config.apiUrl}/playbooks/${platformPlaybookId}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to execute playbook: ${response.statusText}`);
    }

    const result = await response.json();
    return result.executionId;
  }

  async getExecutionStatus(executionId: string): Promise<any> {
    if (!this.config) throw new Error('Not connected');

    const response = await fetch(`${this.config.apiUrl}/executions/${executionId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get execution status: ${response.statusText}`);
    }

    return await response.json();
  }
}
