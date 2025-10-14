/**
 * Base SIEM Connector
 *
 * Abstract base class for all SIEM integrations providing common functionality
 * for authentication, alert ingestion, enrichment push-back, and bidirectional sync
 */

import { EventEmitter } from 'events';
import { logger } from '../../../shared/utils/logger';

export interface SIEMConfig {
  name: string;
  type: 'splunk' | 'sentinel' | 'qradar' | 'elastic' | 'generic';
  enabled: boolean;

  // Connection details
  url: string;
  apiKey?: string;
  username?: string;
  password?: string;
  tenantId?: string; // For Azure Sentinel

  // Sync configuration
  syncEnabled: boolean;
  syncInterval: number; // milliseconds
  lastSyncTime?: Date;

  // Feature flags
  features: {
    alertIngestion: boolean;
    enrichmentPushback: boolean;
    caseSync: boolean;
    customFields: boolean;
  };

  // Rate limiting
  rateLimit?: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };

  // Retry configuration
  retry?: {
    maxAttempts: number;
    backoffMs: number;
  };
}

export interface SIEMAlert {
  id: string;
  source: string; // SIEM name
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'in_progress' | 'resolved' | 'closed';

  // IOCs extracted from alert
  iocs: Array<{
    type: string;
    value: string;
    context?: string;
  }>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  detectedAt: Date;

  // Metadata
  metadata: {
    ruleId?: string;
    ruleName?: string;
    source?: string;
    destination?: string;
    user?: string;
    host?: string;
    process?: string;
    [key: string]: any;
  };

  // Raw alert data
  raw: any;
}

export interface SIEMEnrichment {
  alertId: string;
  iocs: Array<{
    type: string;
    value: string;
    enrichment: {
      verdict: string;
      score: number;
      confidence: number;
      threats?: string[];
      providers?: string[];
    };
  }>;
  timestamp: Date;
}

export interface SIEMSyncResult {
  success: boolean;
  alertsIngested: number;
  enrichmentsPushed: number;
  errors: string[];
  timestamp: Date;
}

export abstract class BaseSIEMConnector extends EventEmitter {
  protected config: SIEMConfig;
  protected syncTimer?: NodeJS.Timeout;
  protected connected: boolean = false;

  constructor(config: SIEMConfig) {
    super();
    this.config = config;

    logger.info(`Initializing ${config.name} connector`);
  }

  /**
   * Test connection to SIEM
   * Must be implemented by subclasses
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Ingest alerts from SIEM
   * Must be implemented by subclasses
   */
  abstract ingestAlerts(options?: {
    since?: Date;
    limit?: number;
    query?: string;
  }): Promise<SIEMAlert[]>;

  /**
   * Push enrichment data back to SIEM
   * Must be implemented by subclasses
   */
  abstract pushEnrichment(enrichment: SIEMEnrichment): Promise<boolean>;

  /**
   * Update alert status in SIEM
   * Optional - implement if supported
   */
  async updateAlertStatus(
    alertId: string,
    status: string,
    comment?: string
  ): Promise<boolean> {
    logger.warn(`updateAlertStatus not implemented for ${this.config.name}`);
    return false;
  }

  /**
   * Create custom field/property in SIEM
   * Optional - implement if supported
   */
  async createCustomField(
    fieldName: string,
    fieldType: string,
    description?: string
  ): Promise<boolean> {
    logger.warn(`createCustomField not implemented for ${this.config.name}`);
    return false;
  }

  /**
   * Initialize connection and start sync if enabled
   */
  async initialize(): Promise<void> {
    try {
      logger.info(`Connecting to ${this.config.name}...`);

      const connected = await this.testConnection();

      if (!connected) {
        throw new Error(`Failed to connect to ${this.config.name}`);
      }

      this.connected = true;
      logger.info(`✓ Connected to ${this.config.name}`);

      // Start sync if enabled
      if (this.config.syncEnabled) {
        this.startSync();
      }

      this.emit('connected', { connector: this.config.name });

    } catch (error) {
      logger.error(`Failed to initialize ${this.config.name}:`, error);
      this.emit('error', { connector: this.config.name, error });
      throw error;
    }
  }

  /**
   * Start periodic sync
   */
  startSync(): void {
    if (this.syncTimer) {
      this.stopSync();
    }

    logger.info(
      `Starting sync for ${this.config.name} every ${this.config.syncInterval}ms`
    );

    this.syncTimer = setInterval(
      () => this.performSync(),
      this.config.syncInterval
    );

    // Perform initial sync
    this.performSync();
  }

  /**
   * Stop periodic sync
   */
  stopSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
      logger.info(`Stopped sync for ${this.config.name}`);
    }
  }

  /**
   * Perform a single sync operation
   */
  async performSync(): Promise<SIEMSyncResult> {
    const startTime = Date.now();
    const result: SIEMSyncResult = {
      success: true,
      alertsIngested: 0,
      enrichmentsPushed: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      logger.info(`Starting sync for ${this.config.name}`);

      // Ingest new alerts
      if (this.config.features.alertIngestion) {
        try {
          const alerts = await this.ingestAlerts({
            since: this.config.lastSyncTime,
            limit: 100,
          });

          result.alertsIngested = alerts.length;

          // Emit alerts for processing
          alerts.forEach(alert => {
            this.emit('alertIngested', { connector: this.config.name, alert });
          });

          logger.info(
            `Ingested ${alerts.length} alerts from ${this.config.name}`
          );

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Alert ingestion failed: ${errorMsg}`);
          logger.error(`Alert ingestion failed for ${this.config.name}:`, error);
        }
      }

      // Update last sync time
      this.config.lastSyncTime = new Date();

      this.emit('syncComplete', { connector: this.config.name, result });

      logger.info(
        `Sync complete for ${this.config.name} in ${Date.now() - startTime}ms`
      );

    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMsg);
      logger.error(`Sync failed for ${this.config.name}:`, error);
      this.emit('syncError', { connector: this.config.name, error });
    }

    return result;
  }

  /**
   * Disconnect from SIEM
   */
  async disconnect(): Promise<void> {
    this.stopSync();
    this.connected = false;
    logger.info(`Disconnected from ${this.config.name}`);
    this.emit('disconnected', { connector: this.config.name });
  }

  /**
   * Get connector configuration
   */
  getConfig(): SIEMConfig {
    return { ...this.config };
  }

  /**
   * Update connector configuration
   */
  updateConfig(config: Partial<SIEMConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info(`Updated config for ${this.config.name}`);

    // Restart sync if interval changed
    if (config.syncInterval && this.syncTimer) {
      this.startSync();
    }
  }

  /**
   * Check if connector is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Extract IOCs from alert data
   * Common helper method for all connectors
   */
  protected extractIOCs(alertData: any): Array<{ type: string; value: string; context?: string }> {
    const iocs: Array<{ type: string; value: string; context?: string }> = [];

    // IP addresses
    const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    const ips = JSON.stringify(alertData).match(ipRegex) || [];
    ips.forEach(ip => {
      if (!iocs.find(i => i.value === ip)) {
        iocs.push({ type: 'ip', value: ip });
      }
    });

    // Domains
    const domainRegex = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\b/gi;
    const domains = JSON.stringify(alertData).match(domainRegex) || [];
    domains.forEach(domain => {
      if (!iocs.find(i => i.value === domain)) {
        iocs.push({ type: 'domain', value: domain });
      }
    });

    // File hashes (MD5, SHA1, SHA256)
    const md5Regex = /\b[a-f0-9]{32}\b/gi;
    const sha1Regex = /\b[a-f0-9]{40}\b/gi;
    const sha256Regex = /\b[a-f0-9]{64}\b/gi;

    const hashes = [
      ...(JSON.stringify(alertData).match(md5Regex) || []),
      ...(JSON.stringify(alertData).match(sha1Regex) || []),
      ...(JSON.stringify(alertData).match(sha256Regex) || []),
    ];

    hashes.forEach(hash => {
      if (!iocs.find(i => i.value === hash)) {
        iocs.push({ type: 'hash', value: hash });
      }
    });

    // URLs
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const urls = JSON.stringify(alertData).match(urlRegex) || [];
    urls.forEach(url => {
      if (!iocs.find(i => i.value === url)) {
        iocs.push({ type: 'url', value: url });
      }
    });

    return iocs;
  }

  /**
   * Rate limiting helper
   */
  protected async rateLimit(): Promise<void> {
    if (!this.config.rateLimit) return;

    // Simple delay-based rate limiting
    const delayMs = 1000 / this.config.rateLimit.requestsPerSecond;
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * Retry helper with exponential backoff
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    const maxAttempts = this.config.retry?.maxAttempts || 3;
    const backoffMs = this.config.retry?.backoffMs || 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxAttempts) {
          logger.error(`${context} failed after ${maxAttempts} attempts:`, error);
          throw error;
        }

        const delay = backoffMs * Math.pow(2, attempt - 1);
        logger.warn(`${context} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error(`${context} failed after retries`);
  }
}
