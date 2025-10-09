import { EventEmitter } from 'events';

import { logger } from '../../shared/utils/logger.js';

export interface SIEMConfig {
  id: string;
  name: string;
  type: 'splunk' | 'qradar' | 'sentinel' | 'elastic' | 'chronicle';
  baseUrl: string;
  authentication: SIEMAuthentication;
  settings: Record<string, any>;
  isActive: boolean;
}

export interface SIEMAuthentication {
  type: 'api_key' | 'basic' | 'oauth' | 'token';
  credentials: Record<string, string>;
}

export interface SIEMAlert {
  id: string;
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved' | 'closed';
  timestamp: Date;
  source: string;
  indicators: SIEMIndicator[];
  rawData: Record<string, any>;
  confidence?: number;
  tags?: string[];
}

export interface SIEMIndicator {
  type: string;
  value: string;
  confidence?: number;
  context?: string;
  firstSeen?: Date;
  lastSeen?: Date;
}

export interface SIEMQuery {
  query: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
  fields?: string[];
}

export interface SIEMQueryResult {
  events: SIEMEvent[];
  totalCount: number;
  executionTime: number;
  query: string;
}

export interface SIEMEvent {
  timestamp: Date;
  source: string;
  eventType: string;
  data: Record<string, any>;
  indicators?: SIEMIndicator[];
}

export interface ThreatFlowIOCExport {
  indicators: Array<{
    type: string;
    value: string;
    confidence: number;
    severity: string;
    context?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }>;
  activities: Array<{
    name: string;
    mitre_technique_id?: string;
    mitre_tactic?: string;
    confidence: number;
    severity: string;
    signatures: string[];
    context?: string;
    tags?: string[];
  }>;
  metadata: {
    investigation_id?: string;
    export_timestamp: string;
    tool: string;
    version: string;
  };
}

export interface SIEMConnectionStatus {
  isConnected: boolean;
  lastChecked: Date;
  version?: string;
  capabilities?: string[];
  error?: string;
}

export abstract class BaseSIEMConnector extends EventEmitter {
  protected config: SIEMConfig;
  protected connectionStatus: SIEMConnectionStatus;

  constructor(config: SIEMConfig) {
    super();
    this.config = config;
    this.connectionStatus = {
      isConnected: false,
      lastChecked: new Date()
    };
  }

  // ==========================================
  // ABSTRACT METHODS (Must be implemented by subclasses)
  // ==========================================

  /**
   * Test connection to SIEM system
   */
  abstract testConnection(): Promise<SIEMConnectionStatus>;

  /**
   * Execute query in SIEM system
   */
  abstract query(query: SIEMQuery): Promise<SIEMQueryResult>;

  /**
   * Get alerts from SIEM system
   */
  abstract getAlerts(timeRange?: { start: Date; end: Date }, limit?: number): Promise<SIEMAlert[]>;

  /**
   * Get specific alert by ID
   */
  abstract getAlert(alertId: string): Promise<SIEMAlert | null>;

  /**
   * Update alert status in SIEM system
   */
  abstract updateAlertStatus(alertId: string, status: SIEMAlert['status'], comment?: string): Promise<boolean>;

  /**
   * Push IOCs to SIEM system for monitoring
   */
  abstract pushIOCs(iocs: SIEMIndicator[]): Promise<boolean>;

  /**
   * Create search based on ThreatFlow analysis
   */
  abstract createSearch(searchName: string, query: string, iocData: ThreatFlowIOCExport): Promise<string>;

  // ==========================================
  // COMMON METHODS (Implemented by base class)
  // ==========================================

  /**
   * Get connector configuration
   */
  getConfig(): SIEMConfig {
    // Return config without sensitive data
    return {
      ...this.config,
      authentication: {
        type: this.config.authentication.type,
        credentials: {} // Don't expose credentials
      }
    };
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): SIEMConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SIEMConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config_updated', this.config);
  }

  /**
   * Enable/disable connector
   */
  setActive(isActive: boolean): void {
    this.config.isActive = isActive;
    this.emit('status_changed', { isActive });
  }

  /**
   * Initialize connector
   */
  async initialize(): Promise<void> {
    try {
      logger.info(`Initializing SIEM connector: ${this.config.name} (${this.config.type})`);
      
      this.connectionStatus = await this.testConnection();
      
      if (this.connectionStatus.isConnected) {
        logger.info(`SIEM connector initialized successfully: ${this.config.name}`);
        this.emit('connected');
      } else {
        logger.warn(`SIEM connector failed to initialize: ${this.config.name}`);
        this.emit('connection_failed', this.connectionStatus.error);
      }
    } catch (error) {
      logger.error(`SIEM connector initialization error: ${this.config.name}`, error);
      this.connectionStatus = {
        isConnected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      this.emit('connection_failed', this.connectionStatus.error);
      throw error;
    }
  }

  /**
   * Shutdown connector
   */
  async shutdown(): Promise<void> {
    logger.info(`Shutting down SIEM connector: ${this.config.name}`);
    this.removeAllListeners();
    this.connectionStatus.isConnected = false;
    this.emit('disconnected');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<SIEMConnectionStatus> {
    try {
      this.connectionStatus = await this.testConnection();
      this.emit('health_check', this.connectionStatus);
      return this.connectionStatus;
    } catch (error) {
      this.connectionStatus = {
        isConnected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Health check failed'
      };
      this.emit('health_check', this.connectionStatus);
      return this.connectionStatus;
    }
  }

  /**
   * Correlate ThreatFlow findings with SIEM alerts
   */
  async correlateFindings(iocData: ThreatFlowIOCExport, timeRange?: { start: Date; end: Date }): Promise<{
    correlatedAlerts: SIEMAlert[];
    correlationScore: number;
    recommendations: string[];
  }> {
    try {
      const correlatedAlerts: SIEMAlert[] = [];
      let totalCorrelationScore = 0;
      const recommendations: string[] = [];

      // Query SIEM for each indicator
      for (const indicator of iocData.indicators) {
        const query: SIEMQuery = {
          query: this.buildIOCQuery(indicator),
          timeRange: timeRange || {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            end: new Date()
          },
          limit: 100
        };

        const queryResult = await this.query(query);
        
        if (queryResult.events.length > 0) {
          // Convert events to alerts if needed
          const alerts = await this.eventsToAlerts(queryResult.events, indicator);
          correlatedAlerts.push(...alerts);
          
          // Calculate correlation score based on event count and indicator confidence
          const eventScore = Math.min(queryResult.events.length / 10, 1); // Max score of 1 for 10+ events
          const confidenceScore = indicator.confidence || 0.5;
          totalCorrelationScore += eventScore * confidenceScore;

          // Add recommendations
          if (queryResult.events.length > 5) {
            recommendations.push(`High activity detected for ${indicator.type}: ${indicator.value} (${queryResult.events.length} events)`);
          }
        }
      }

      // Generate MITRE ATT&CK based recommendations
      for (const activity of iocData.activities) {
        if (activity.mitre_technique_id) {
          recommendations.push(`Monitor for MITRE technique ${activity.mitre_technique_id}: ${activity.name}`);
        }
      }

      const averageCorrelationScore = iocData.indicators.length > 0 
        ? totalCorrelationScore / iocData.indicators.length 
        : 0;

      return {
        correlatedAlerts: this.deduplicateAlerts(correlatedAlerts),
        correlationScore: Math.min(averageCorrelationScore, 1),
        recommendations: [...new Set(recommendations)] // Remove duplicates
      };
    } catch (error) {
      logger.error('Correlation error:', error);
      throw error;
    }
  }

  // ==========================================
  // PROTECTED HELPER METHODS
  // ==========================================

  protected buildIOCQuery(indicator: SIEMIndicator): string {
    // Base implementation - should be overridden by specific connectors
    switch (indicator.type.toLowerCase()) {
      case 'ip':
      case 'ipv4':
        return `src_ip="${indicator.value}" OR dest_ip="${indicator.value}" OR ip="${indicator.value}"`;
      case 'domain':
        return `domain="${indicator.value}" OR url="*${indicator.value}*"`;
      case 'url':
        return `url="${indicator.value}" OR uri="${indicator.value}"`;
      case 'hash':
      case 'md5':
      case 'sha1':
      case 'sha256':
        return `hash="${indicator.value}" OR md5="${indicator.value}" OR sha1="${indicator.value}" OR sha256="${indicator.value}"`;
      case 'email':
        return `sender="${indicator.value}" OR recipient="${indicator.value}" OR email="${indicator.value}"`;
      case 'filename':
        return `filename="${indicator.value}" OR file_name="${indicator.value}"`;
      default:
        return `"${indicator.value}"`; // Generic search
    }
  }

  protected async eventsToAlerts(events: SIEMEvent[], relatedIndicator: SIEMIndicator): Promise<SIEMAlert[]> {
    // Group events into alerts (base implementation)
    const alertsMap = new Map<string, SIEMAlert>();

    for (const event of events) {
      const alertKey = `${event.source}_${event.eventType}_${relatedIndicator.value}`;
      
      if (!alertsMap.has(alertKey)) {
        alertsMap.set(alertKey, {
          id: alertKey,
          title: `Potential threat activity: ${relatedIndicator.type} ${relatedIndicator.value}`,
          description: `Detected activity related to ${relatedIndicator.type}: ${relatedIndicator.value}`,
          severity: this.mapConfidenceToSeverity(relatedIndicator.confidence || 0.5),
          status: 'open',
          timestamp: event.timestamp,
          source: event.source,
          indicators: [relatedIndicator],
          rawData: event.data,
          confidence: relatedIndicator.confidence
        });
      }
    }

    return Array.from(alertsMap.values());
  }

  protected mapConfidenceToSeverity(confidence: number): SIEMAlert['severity'] {
    if (confidence >= 0.8) {return 'critical';}
    if (confidence >= 0.6) {return 'high';}
    if (confidence >= 0.4) {return 'medium';}
    return 'low';
  }

  protected deduplicateAlerts(alerts: SIEMAlert[]): SIEMAlert[] {
    const uniqueAlerts = new Map<string, SIEMAlert>();

    for (const alert of alerts) {
      const key = `${alert.title}_${alert.source}`;
      if (!uniqueAlerts.has(key) || alert.timestamp > uniqueAlerts.get(key)!.timestamp) {
        uniqueAlerts.set(key, alert);
      }
    }

    return Array.from(uniqueAlerts.values());
  }

  protected makeAuthenticatedRequest(url: string, options: RequestInit = {}): RequestInit {
    const headers = new Headers(options.headers);

    switch (this.config.authentication.type) {
      case 'api_key':
        headers.set('Authorization', `Bearer ${this.config.authentication.credentials.api_key}`);
        break;
      case 'basic':
        const basicAuth = Buffer.from(
          `${this.config.authentication.credentials.username}:${this.config.authentication.credentials.password}`
        ).toString('base64');
        headers.set('Authorization', `Basic ${basicAuth}`);
        break;
      case 'token':
        headers.set('Authorization', `Token ${this.config.authentication.credentials.token}`);
        break;
      case 'oauth':
        headers.set('Authorization', `Bearer ${this.config.authentication.credentials.access_token}`);
        break;
    }

    return {
      ...options,
      headers
    };
  }
}

export default BaseSIEMConnector;