import { EventEmitter } from 'events';

import { logger } from '../../shared/utils/logger.js';

import { BaseSIEMConnector, SIEMConfig, SIEMAlert, SIEMIndicator, ThreatFlowIOCExport } from './base-siem-connector';
import SplunkConnector from './splunk-connector';


export interface SIEMIntegrationConfig {
  organizationId: string;
  integrations: SIEMConfig[];
  globalSettings: {
    autoCorrelation: boolean;
    correlationTimeWindow: number; // hours
    minConfidenceThreshold: number;
    enableRealTimeSync: boolean;
    syncInterval: number; // minutes
  };
}

export interface CorrelationResult {
  integrationId: string;
  integrationName: string;
  correlatedAlerts: SIEMAlert[];
  correlationScore: number;
  recommendations: string[];
  executionTime: number;
}

export interface SyncStatus {
  integrationId: string;
  status: 'success' | 'error' | 'running';
  lastSync: Date;
  errorMessage?: string;
  alertsProcessed: number;
}

class SIEMIntegrationService extends EventEmitter {
  private connectors: Map<string, BaseSIEMConnector> = new Map();
  private config: SIEMIntegrationConfig;
  private syncIntervals: Map<string, NodeJS.Timer> = new Map();

  constructor() {
    super();
    this.config = {
      organizationId: '',
      integrations: [],
      globalSettings: {
        autoCorrelation: true,
        correlationTimeWindow: 24,
        minConfidenceThreshold: 0.5,
        enableRealTimeSync: false,
        syncInterval: 30
      }
    };
  }

  // ==========================================
  // INITIALIZATION AND CONFIGURATION
  // ==========================================

  async initialize(organizationId: string): Promise<void> {
    try {
      logger.info(`Initializing SIEM integration service for organization: ${organizationId}`);
      
      this.config.organizationId = organizationId;
      
      // Load existing integrations from database
      await this.loadIntegrationsFromDatabase();
      
      // Initialize connectors
      for (const integrationConfig of this.config.integrations) {
        await this.addIntegration(integrationConfig);
      }

      logger.info(`SIEM integration service initialized with ${this.connectors.size} connectors`);
    } catch (error) {
      logger.error('Failed to initialize SIEM integration service:', error);
      throw error;
    }
  }

  async addIntegration(siemConfig: SIEMConfig): Promise<void> {
    try {
      const connector = this.createConnector(siemConfig);
      
      // Set up event handlers
      this.setupConnectorEventHandlers(connector);
      
      // Initialize connector
      await connector.initialize();
      
      // Store connector
      this.connectors.set(siemConfig.id, connector);
      
      // Save to database
      await this.saveIntegrationToDatabase(siemConfig);
      
      // Set up sync interval if enabled
      if (this.config.globalSettings.enableRealTimeSync && siemConfig.isActive) {
        this.setupSyncInterval(siemConfig.id);
      }

      logger.info(`SIEM integration added: ${siemConfig.name} (${siemConfig.type})`);
      this.emit('integration_added', siemConfig);
    } catch (error) {
      logger.error(`Failed to add SIEM integration: ${siemConfig.name}`, error);
      throw error;
    }
  }

  async removeIntegration(integrationId: string): Promise<void> {
    try {
      const connector = this.connectors.get(integrationId);
      if (connector) {
        // Shutdown connector
        await connector.shutdown();
        this.connectors.delete(integrationId);
      }

      // Clear sync interval
      const interval = this.syncIntervals.get(integrationId);
      if (interval) {
        clearInterval(interval);
        this.syncIntervals.delete(integrationId);
      }

      // Remove from database
      await this.removeIntegrationFromDatabase(integrationId);

      logger.info(`SIEM integration removed: ${integrationId}`);
      this.emit('integration_removed', integrationId);
    } catch (error) {
      logger.error(`Failed to remove SIEM integration: ${integrationId}`, error);
      throw error;
    }
  }

  async updateIntegration(integrationId: string, updates: Partial<SIEMConfig>): Promise<void> {
    try {
      const connector = this.connectors.get(integrationId);
      if (!connector) {
        throw new Error(`Integration not found: ${integrationId}`);
      }

      // Update connector configuration
      connector.updateConfig(updates);
      
      // Re-initialize if connection details changed
      if (updates.baseUrl || updates.authentication) {
        await connector.initialize();
      }

      // Update database
      await this.updateIntegrationInDatabase(integrationId, updates);

      logger.info(`SIEM integration updated: ${integrationId}`);
      this.emit('integration_updated', { integrationId, updates });
    } catch (error) {
      logger.error(`Failed to update SIEM integration: ${integrationId}`, error);
      throw error;
    }
  }

  // ==========================================
  // THREAT INTELLIGENCE CORRELATION
  // ==========================================

  async correlateWithAllSIEMs(iocData: ThreatFlowIOCExport, investigationId?: string): Promise<CorrelationResult[]> {
    const results: CorrelationResult[] = [];
    const timeRange = {
      start: new Date(Date.now() - this.config.globalSettings.correlationTimeWindow * 60 * 60 * 1000),
      end: new Date()
    };

    const correlationPromises = Array.from(this.connectors.entries()).map(async ([id, connector]) => {
      const startTime = Date.now();
      
      try {
        if (!connector.getConfig().isActive) {
          return null;
        }

        const correlation = await connector.correlateFindings(iocData, timeRange);
        
        // Filter alerts by confidence threshold
        const filteredAlerts = correlation.correlatedAlerts.filter(
          alert => (alert.confidence || 0) >= this.config.globalSettings.minConfidenceThreshold
        );

        const result: CorrelationResult = {
          integrationId: id,
          integrationName: connector.getConfig().name,
          correlatedAlerts: filteredAlerts,
          correlationScore: correlation.correlationScore,
          recommendations: correlation.recommendations,
          executionTime: Date.now() - startTime
        };

        // Store correlated alerts in database
        if (investigationId && filteredAlerts.length > 0) {
          await this.storeCorrelatedAlerts(investigationId, id, filteredAlerts);
        }

        return result;
      } catch (error) {
        logger.error(`Correlation failed for ${connector.getConfig().name}:`, error);
        return {
          integrationId: id,
          integrationName: connector.getConfig().name,
          correlatedAlerts: [],
          correlationScore: 0,
          recommendations: [`Error correlating with ${connector.getConfig().name}: ${error instanceof Error ? error.message : 'Unknown error'}`],
          executionTime: Date.now() - startTime
        };
      }
    });

    const correlationResults = await Promise.all(correlationPromises);
    results.push(...correlationResults.filter(result => result !== null) as CorrelationResult[]);

    // Log correlation summary
    const totalAlerts = results.reduce((sum, result) => sum + result.correlatedAlerts.length, 0);
    const avgScore = results.length > 0 
      ? results.reduce((sum, result) => sum + result.correlationScore, 0) / results.length 
      : 0;

    logger.info(`Threat correlation completed: ${totalAlerts} alerts found across ${results.length} SIEMs (avg score: ${avgScore.toFixed(2)})`);

    this.emit('correlation_completed', {
      investigationId,
      results,
      summary: { totalAlerts, avgScore, integrationCount: results.length }
    });

    return results;
  }

  async correlateWithSIEM(integrationId: string, iocData: ThreatFlowIOCExport): Promise<CorrelationResult | null> {
    const connector = this.connectors.get(integrationId);
    if (!connector || !connector.getConfig().isActive) {
      return null;
    }

    const startTime = Date.now();
    
    try {
      const timeRange = {
        start: new Date(Date.now() - this.config.globalSettings.correlationTimeWindow * 60 * 60 * 1000),
        end: new Date()
      };

      const correlation = await connector.correlateFindings(iocData, timeRange);
      
      return {
        integrationId,
        integrationName: connector.getConfig().name,
        correlatedAlerts: correlation.correlatedAlerts,
        correlationScore: correlation.correlationScore,
        recommendations: correlation.recommendations,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error(`Correlation failed for ${connector.getConfig().name}:`, error);
      throw error;
    }
  }

  // ==========================================
  // IOC MANAGEMENT
  // ==========================================

  async pushIOCsToSIEM(integrationId: string, iocs: SIEMIndicator[]): Promise<boolean> {
    const connector = this.connectors.get(integrationId);
    if (!connector || !connector.getConfig().isActive) {
      throw new Error(`Integration not found or inactive: ${integrationId}`);
    }

    try {
      const success = await connector.pushIOCs(iocs);
      
      if (success) {
        logger.info(`Successfully pushed ${iocs.length} IOCs to ${connector.getConfig().name}`);
        this.emit('iocs_pushed', { integrationId, iocCount: iocs.length });
      }

      return success;
    } catch (error) {
      logger.error(`Failed to push IOCs to ${connector.getConfig().name}:`, error);
      throw error;
    }
  }

  async pushIOCsToAllSIEMs(iocs: SIEMIndicator[]): Promise<{ [integrationId: string]: boolean }> {
    const results: { [integrationId: string]: boolean } = {};

    const pushPromises = Array.from(this.connectors.entries()).map(async ([id, connector]) => {
      if (!connector.getConfig().isActive) {
        results[id] = false;
        return;
      }

      try {
        results[id] = await connector.pushIOCs(iocs);
      } catch (error) {
        logger.error(`Failed to push IOCs to ${connector.getConfig().name}:`, error);
        results[id] = false;
      }
    });

    await Promise.all(pushPromises);

    const successCount = Object.values(results).filter(success => success).length;
    logger.info(`IOCs pushed to ${successCount}/${Object.keys(results).length} SIEM integrations`);

    return results;
  }

  // ==========================================
  // ALERT MANAGEMENT
  // ==========================================

  async getAlertsFromSIEM(integrationId: string, timeRange?: { start: Date; end: Date }, limit: number = 100): Promise<SIEMAlert[]> {
    const connector = this.connectors.get(integrationId);
    if (!connector || !connector.getConfig().isActive) {
      throw new Error(`Integration not found or inactive: ${integrationId}`);
    }

    try {
      return await connector.getAlerts(timeRange, limit);
    } catch (error) {
      logger.error(`Failed to get alerts from ${connector.getConfig().name}:`, error);
      throw error;
    }
  }

  async updateAlertStatus(integrationId: string, alertId: string, status: SIEMAlert['status'], comment?: string): Promise<boolean> {
    const connector = this.connectors.get(integrationId);
    if (!connector || !connector.getConfig().isActive) {
      throw new Error(`Integration not found or inactive: ${integrationId}`);
    }

    try {
      const success = await connector.updateAlertStatus(alertId, status, comment);
      
      if (success) {
        this.emit('alert_status_updated', { integrationId, alertId, status, comment });
      }

      return success;
    } catch (error) {
      logger.error(`Failed to update alert status in ${connector.getConfig().name}:`, error);
      throw error;
    }
  }

  // ==========================================
  // THREAT HUNTING
  // ==========================================

  async createThreatHunt(integrationId: string, huntName: string, iocData: ThreatFlowIOCExport): Promise<string> {
    const connector = this.connectors.get(integrationId);
    if (!connector || !connector.getConfig().isActive) {
      throw new Error(`Integration not found or inactive: ${integrationId}`);
    }

    try {
      const huntId = await connector.createSearch(huntName, '', iocData);
      
      logger.info(`Threat hunt created: ${huntName} in ${connector.getConfig().name}`);
      this.emit('hunt_created', { integrationId, huntId, huntName });
      
      return huntId;
    } catch (error) {
      logger.error(`Failed to create threat hunt in ${connector.getConfig().name}:`, error);
      throw error;
    }
  }

  // ==========================================
  // HEALTH AND MONITORING
  // ==========================================

  async getIntegrationStatus(integrationId?: string): Promise<{ [id: string]: any }> {
    const statuses: { [id: string]: any } = {};

    if (integrationId) {
      const connector = this.connectors.get(integrationId);
      if (connector) {
        statuses[integrationId] = {
          config: connector.getConfig(),
          status: connector.getConnectionStatus(),
          lastHealthCheck: await connector.healthCheck()
        };
      }
    } else {
      for (const [id, connector] of this.connectors) {
        try {
          statuses[id] = {
            config: connector.getConfig(),
            status: connector.getConnectionStatus(),
            lastHealthCheck: await connector.healthCheck()
          };
        } catch (error) {
          statuses[id] = {
            config: connector.getConfig(),
            status: { isConnected: false, error: error instanceof Error ? error.message : 'Health check failed' },
            lastHealthCheck: { isConnected: false, error: error instanceof Error ? error.message : 'Health check failed' }
          };
        }
      }
    }

    return statuses;
  }

  async performHealthCheck(): Promise<void> {
    const healthCheckPromises = Array.from(this.connectors.values()).map(async (connector) => {
      try {
        await connector.healthCheck();
      } catch (error) {
        logger.error(`Health check failed for ${connector.getConfig().name}:`, error);
      }
    });

    await Promise.all(healthCheckPromises);
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  private createConnector(config: SIEMConfig): BaseSIEMConnector {
    switch (config.type) {
      case 'splunk':
        return new SplunkConnector(config);
      // Add other SIEM connectors here as they're implemented
      case 'qradar':
      case 'sentinel':
      case 'elastic':
      case 'chronicle':
      default:
        throw new Error(`Unsupported SIEM type: ${config.type}`);
    }
  }

  private setupConnectorEventHandlers(connector: BaseSIEMConnector): void {
    const config = connector.getConfig();

    connector.on('connected', () => {
      logger.info(`SIEM connector connected: ${config.name}`);
      this.emit('integration_connected', config.id);
    });

    connector.on('connection_failed', (error: string) => {
      logger.error(`SIEM connector connection failed: ${config.name} - ${error}`);
      this.emit('integration_connection_failed', { id: config.id, error });
    });

    connector.on('disconnected', () => {
      logger.info(`SIEM connector disconnected: ${config.name}`);
      this.emit('integration_disconnected', config.id);
    });

    connector.on('health_check', (status: any) => {
      this.emit('integration_health_check', { id: config.id, status });
    });
  }

  private setupSyncInterval(integrationId: string): void {
    const intervalMs = this.config.globalSettings.syncInterval * 60 * 1000;
    
    const interval = setInterval(async () => {
      try {
        await this.syncAlertsFromSIEM(integrationId);
      } catch (error) {
        logger.error(`Sync failed for integration ${integrationId}:`, error);
      }
    }, intervalMs);

    this.syncIntervals.set(integrationId, interval);
  }

  private async syncAlertsFromSIEM(integrationId: string): Promise<SyncStatus> {
    const connector = this.connectors.get(integrationId);
    if (!connector) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    const syncStart = Date.now();
    
    try {
      const timeRange = {
        start: new Date(Date.now() - this.config.globalSettings.syncInterval * 60 * 1000),
        end: new Date()
      };

      const alerts = await connector.getAlerts(timeRange);
      
      // Process and store alerts
      // This would integrate with your investigation management system
      
      const status: SyncStatus = {
        integrationId,
        status: 'success',
        lastSync: new Date(),
        alertsProcessed: alerts.length
      };

      this.emit('sync_completed', status);
      return status;
    } catch (error) {
      const status: SyncStatus = {
        integrationId,
        status: 'error',
        lastSync: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Sync failed',
        alertsProcessed: 0
      };

      this.emit('sync_failed', status);
      return status;
    }
  }

  private async loadIntegrationsFromDatabase(): Promise<void> {
    // Implementation would load from database
    // For now, return empty to allow manual configuration
  }

  private async saveIntegrationToDatabase(config: SIEMConfig): Promise<void> {
    // Implementation would save to database
  }

  private async updateIntegrationInDatabase(integrationId: string, updates: Partial<SIEMConfig>): Promise<void> {
    // Implementation would update in database
  }

  private async removeIntegrationFromDatabase(integrationId: string): Promise<void> {
    // Implementation would remove from database
  }

  private async storeCorrelatedAlerts(investigationId: string, integrationId: string, alerts: SIEMAlert[]): Promise<void> {
    // Implementation would store correlated alerts in database
  }
}

export const siemIntegrationService = new SIEMIntegrationService();