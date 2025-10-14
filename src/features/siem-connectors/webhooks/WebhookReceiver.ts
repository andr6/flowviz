/**
 * Webhook Receiver Service
 *
 * Generic webhook handler for receiving real-time alerts from SIEM platforms
 * Supports multiple authentication methods, signature verification, and rate limiting
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { SIEMAlert } from '../connectors/BaseSIEMConnector';
import { logger } from '../../../shared/utils/logger';

export interface WebhookConfig {
  enabled: boolean;
  path: string;
  secret?: string;
  signatureHeader?: string;
  signatureAlgorithm?: 'sha256' | 'sha1' | 'md5';
  ipWhitelist?: string[];
  rateLimit?: {
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
  };
  authentication?: {
    type: 'none' | 'bearer' | 'basic' | 'hmac' | 'custom';
    token?: string;
    username?: string;
    password?: string;
  };
}

export interface WebhookRequest {
  headers: Record<string, string | string[] | undefined>;
  body: any;
  sourceIp: string;
  timestamp: Date;
}

export interface WebhookResponse {
  success: boolean;
  message?: string;
  alertId?: string;
  errors?: string[];
}

export interface ParsedWebhook {
  siemType: string;
  alerts: SIEMAlert[];
  metadata: {
    webhookId: string;
    sourceIp: string;
    timestamp: Date;
    signature?: string;
  };
}

export class WebhookReceiver extends EventEmitter {
  private config: WebhookConfig;
  private requestCounts: Map<string, { minute: number; hour: number; lastReset: Date }>;
  private parsers: Map<string, (body: any) => SIEMAlert[]>;

  constructor(config: WebhookConfig) {
    super();
    this.config = config;
    this.requestCounts = new Map();
    this.parsers = new Map();

    // Register default parsers
    this.registerDefaultParsers();

    logger.info(`WebhookReceiver initialized for path: ${config.path}`);
  }

  /**
   * Process incoming webhook request
   */
  async processWebhook(request: WebhookRequest): Promise<WebhookResponse> {
    const webhookId = this.generateWebhookId();

    try {
      // Step 1: IP whitelist check
      if (!this.checkIpWhitelist(request.sourceIp)) {
        logger.warn(`Webhook rejected - IP not whitelisted: ${request.sourceIp}`);
        return {
          success: false,
          message: 'IP not whitelisted',
        };
      }

      // Step 2: Rate limiting
      if (!this.checkRateLimit(request.sourceIp)) {
        logger.warn(`Webhook rejected - rate limit exceeded: ${request.sourceIp}`);
        return {
          success: false,
          message: 'Rate limit exceeded',
        };
      }

      // Step 3: Authentication
      if (!this.authenticateRequest(request)) {
        logger.warn(`Webhook rejected - authentication failed: ${request.sourceIp}`);
        return {
          success: false,
          message: 'Authentication failed',
        };
      }

      // Step 4: Signature verification
      if (this.config.secret && !this.verifySignature(request)) {
        logger.warn(`Webhook rejected - signature verification failed: ${request.sourceIp}`);
        return {
          success: false,
          message: 'Signature verification failed',
        };
      }

      // Step 5: Parse webhook body
      const parsed = await this.parseWebhook(request);

      if (!parsed || parsed.alerts.length === 0) {
        logger.warn(`Webhook parsing failed or no alerts found: ${webhookId}`);
        return {
          success: false,
          message: 'Failed to parse webhook or no alerts found',
        };
      }

      // Step 6: Emit alerts for processing
      parsed.alerts.forEach(alert => {
        this.emit('alertReceived', {
          webhookId,
          siemType: parsed.siemType,
          alert,
          metadata: parsed.metadata,
        });
      });

      logger.info(
        `Webhook processed successfully: ${webhookId}, ` +
        `SIEM: ${parsed.siemType}, Alerts: ${parsed.alerts.length}`
      );

      return {
        success: true,
        message: `Processed ${parsed.alerts.length} alert(s)`,
        alertId: webhookId,
      };

    } catch (error) {
      logger.error(`Webhook processing error: ${webhookId}`, error);
      this.emit('webhookError', {
        webhookId,
        error,
        request,
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Register a custom parser for a specific SIEM type
   */
  registerParser(siemType: string, parser: (body: any) => SIEMAlert[]): void {
    this.parsers.set(siemType.toLowerCase(), parser);
    logger.info(`Registered webhook parser for SIEM type: ${siemType}`);
  }

  /**
   * Check if source IP is whitelisted
   */
  private checkIpWhitelist(sourceIp: string): boolean {
    if (!this.config.ipWhitelist || this.config.ipWhitelist.length === 0) {
      return true; // No whitelist configured, allow all
    }

    return this.config.ipWhitelist.includes(sourceIp);
  }

  /**
   * Check rate limits for source IP
   */
  private checkRateLimit(sourceIp: string): boolean {
    if (!this.config.rateLimit) {
      return true; // No rate limit configured
    }

    const now = new Date();
    const counts = this.requestCounts.get(sourceIp);

    if (!counts) {
      this.requestCounts.set(sourceIp, {
        minute: 1,
        hour: 1,
        lastReset: now,
      });
      return true;
    }

    // Reset counters if needed
    const timeSinceReset = now.getTime() - counts.lastReset.getTime();
    if (timeSinceReset > 60000) {
      // Reset minute counter
      counts.minute = 1;
      counts.lastReset = now;
    }
    if (timeSinceReset > 3600000) {
      // Reset hour counter
      counts.hour = 1;
    }

    // Check limits
    if (counts.minute > this.config.rateLimit.maxRequestsPerMinute) {
      return false;
    }
    if (counts.hour > this.config.rateLimit.maxRequestsPerHour) {
      return false;
    }

    // Increment counters
    counts.minute++;
    counts.hour++;

    return true;
  }

  /**
   * Authenticate webhook request
   */
  private authenticateRequest(request: WebhookRequest): boolean {
    if (!this.config.authentication || this.config.authentication.type === 'none') {
      return true;
    }

    const auth = this.config.authentication;
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      return false;
    }

    const authHeaderStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    switch (auth.type) {
      case 'bearer':
        return authHeaderStr === `Bearer ${auth.token}`;

      case 'basic':
        if (!auth.username || !auth.password) return false;
        const expectedBasic = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        return authHeaderStr === `Basic ${expectedBasic}`;

      case 'hmac':
        // HMAC verification is handled in verifySignature
        return true;

      case 'custom':
        // Custom authentication logic can be added here
        return true;

      default:
        return false;
    }
  }

  /**
   * Verify webhook signature
   */
  private verifySignature(request: WebhookRequest): boolean {
    if (!this.config.secret || !this.config.signatureHeader) {
      return true;
    }

    const signature = request.headers[this.config.signatureHeader.toLowerCase()];
    if (!signature) {
      return false;
    }

    const signatureStr = Array.isArray(signature) ? signature[0] : signature;
    const algorithm = this.config.signatureAlgorithm || 'sha256';

    // Calculate expected signature
    const bodyStr = typeof request.body === 'string'
      ? request.body
      : JSON.stringify(request.body);

    const expectedSignature = crypto
      .createHmac(algorithm, this.config.secret)
      .update(bodyStr)
      .digest('hex');

    // Some services prefix signatures with algorithm name
    const cleanSignature = signatureStr.replace(/^(sha256|sha1|md5)=/, '');

    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Parse webhook body to SIEMAlert format
   */
  private async parseWebhook(request: WebhookRequest): Promise<ParsedWebhook | null> {
    const body = request.body;

    // Try to detect SIEM type from request
    const siemType = this.detectSIEMType(request);

    if (!siemType) {
      logger.warn('Could not detect SIEM type from webhook');
      return null;
    }

    const parser = this.parsers.get(siemType.toLowerCase());

    if (!parser) {
      logger.warn(`No parser registered for SIEM type: ${siemType}`);
      return null;
    }

    try {
      const alerts = parser(body);

      return {
        siemType,
        alerts,
        metadata: {
          webhookId: this.generateWebhookId(),
          sourceIp: request.sourceIp,
          timestamp: request.timestamp,
          signature: request.headers[this.config.signatureHeader?.toLowerCase() || ''] as string,
        },
      };

    } catch (error) {
      logger.error(`Error parsing webhook for SIEM type ${siemType}:`, error);
      return null;
    }
  }

  /**
   * Detect SIEM type from request
   */
  private detectSIEMType(request: WebhookRequest): string | null {
    const body = request.body;
    const headers = request.headers;

    // Splunk detection
    if (headers['user-agent']?.includes('Splunk') || body.search_name || body.sid) {
      return 'splunk';
    }

    // Sentinel detection
    if (body.WorkspaceId || body.SubscriptionId || body.TenantId) {
      return 'sentinel';
    }

    // QRadar detection
    if (body.offense_id || headers['x-ibm-qradar']) {
      return 'qradar';
    }

    // Elastic detection
    if (body.kibana || body.elastic || headers['x-elastic-product']) {
      return 'elastic';
    }

    // Generic detection - look for common alert fields
    if (body.alert || body.event || body.incident) {
      return 'generic';
    }

    return null;
  }

  /**
   * Register default parsers for common SIEM formats
   */
  private registerDefaultParsers(): void {
    // Splunk webhook parser
    this.registerParser('splunk', (body: any): SIEMAlert[] => {
      const results = body.result || body.results || [body];

      return results.map((result: any) => ({
        id: result.event_id || result._key || `splunk-webhook-${Date.now()}-${Math.random()}`,
        source: 'Splunk (Webhook)',
        title: result.rule_name || result.search_name || result.title || 'Splunk Alert',
        description: result.description || result.message || '',
        severity: this.mapSeverity(result.severity || result.urgency),
        status: 'new' as const,
        iocs: this.extractIOCs(result),
        createdAt: result._time ? new Date(result._time) : new Date(),
        updatedAt: new Date(),
        detectedAt: result._time ? new Date(result._time) : new Date(),
        metadata: {
          ruleId: result.rule_id || result.search_id,
          ruleName: result.rule_name || result.search_name,
          ...result,
        },
        raw: result,
      }));
    });

    // Sentinel webhook parser
    this.registerParser('sentinel', (body: any): SIEMAlert[] => {
      const alerts = body.value || [body];

      return alerts.map((alert: any) => ({
        id: alert.id || alert.SystemAlertId || `sentinel-webhook-${Date.now()}-${Math.random()}`,
        source: 'Microsoft Sentinel (Webhook)',
        title: alert.AlertDisplayName || alert.AlertName || 'Sentinel Alert',
        description: alert.Description || alert.AlertDescription || '',
        severity: this.mapSeverity(alert.Severity || alert.AlertSeverity),
        status: 'new' as const,
        iocs: this.extractIOCs(alert),
        createdAt: alert.TimeGenerated ? new Date(alert.TimeGenerated) : new Date(),
        updatedAt: new Date(),
        detectedAt: alert.TimeGenerated ? new Date(alert.TimeGenerated) : new Date(),
        metadata: {
          ruleId: alert.AlertRuleId,
          ruleName: alert.AlertRule,
          workspaceId: alert.WorkspaceId,
          ...alert,
        },
        raw: alert,
      }));
    });

    // QRadar webhook parser
    this.registerParser('qradar', (body: any): SIEMAlert[] => {
      const offenses = body.offense || body.offenses || [body];

      return offenses.map((offense: any) => ({
        id: offense.id || offense.offense_id || `qradar-webhook-${Date.now()}-${Math.random()}`,
        source: 'IBM QRadar (Webhook)',
        title: offense.description || offense.offense_type || 'QRadar Offense',
        description: offense.offense_notes || '',
        severity: this.mapSeverity(offense.severity),
        status: 'new' as const,
        iocs: this.extractIOCs(offense),
        createdAt: offense.start_time ? new Date(offense.start_time) : new Date(),
        updatedAt: new Date(),
        detectedAt: offense.start_time ? new Date(offense.start_time) : new Date(),
        metadata: {
          offenseId: offense.id || offense.offense_id,
          offenseType: offense.offense_type,
          magnitude: offense.magnitude,
          credibility: offense.credibility,
          relevance: offense.relevance,
          ...offense,
        },
        raw: offense,
      }));
    });

    // Elastic webhook parser
    this.registerParser('elastic', (body: any): SIEMAlert[] => {
      const alerts = body.alerts || body.hits?.hits || [body];

      return alerts.map((alert: any) => {
        const source = alert._source || alert;

        return {
          id: alert._id || source.kibana?.alert?.uuid || `elastic-webhook-${Date.now()}-${Math.random()}`,
          source: 'Elastic Security (Webhook)',
          title: source.rule?.name || source.kibana?.alert?.rule?.name || 'Elastic Alert',
          description: source.rule?.description || source.kibana?.alert?.rule?.description || '',
          severity: this.mapSeverity(source.kibana?.alert?.severity || source.severity),
          status: 'new' as const,
          iocs: this.extractIOCs(source),
          createdAt: source['@timestamp'] ? new Date(source['@timestamp']) : new Date(),
          updatedAt: new Date(),
          detectedAt: source['@timestamp'] ? new Date(source['@timestamp']) : new Date(),
          metadata: {
            ruleId: source.kibana?.alert?.rule?.uuid,
            ruleName: source.kibana?.alert?.rule?.name,
            ...source,
          },
          raw: alert,
        };
      });
    });

    // Generic webhook parser
    this.registerParser('generic', (body: any): SIEMAlert[] => {
      const alerts = body.alerts || body.events || body.incidents || [body];

      return alerts.map((alert: any) => ({
        id: alert.id || alert.alert_id || alert.event_id || `generic-webhook-${Date.now()}-${Math.random()}`,
        source: 'Generic SIEM (Webhook)',
        title: alert.title || alert.name || alert.description || 'Generic Alert',
        description: alert.description || alert.message || alert.details || '',
        severity: this.mapSeverity(alert.severity || alert.priority),
        status: 'new' as const,
        iocs: this.extractIOCs(alert),
        createdAt: alert.timestamp ? new Date(alert.timestamp) : new Date(),
        updatedAt: new Date(),
        detectedAt: alert.timestamp ? new Date(alert.timestamp) : new Date(),
        metadata: alert,
        raw: alert,
      }));
    });
  }

  /**
   * Map various severity formats to standard levels
   */
  private mapSeverity(severity: any): 'low' | 'medium' | 'high' | 'critical' {
    const severityStr = String(severity).toLowerCase();

    if (['critical', 'high', '4', '5', 'informational'].includes(severityStr)) {
      return 'critical';
    } else if (['medium', 'warning', '3'].includes(severityStr)) {
      return 'high';
    } else if (['low', '2', '1'].includes(severityStr)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Extract IOCs from alert data
   */
  private extractIOCs(alertData: any): Array<{ type: string; value: string }> {
    const iocs: Array<{ type: string; value: string }> = [];
    const dataStr = JSON.stringify(alertData);

    // IP addresses
    const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    const ips = dataStr.match(ipRegex) || [];
    ips.forEach(ip => {
      if (!iocs.find(i => i.value === ip)) {
        iocs.push({ type: 'ip', value: ip });
      }
    });

    // Domains
    const domainRegex = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\b/gi;
    const domains = dataStr.match(domainRegex) || [];
    domains.forEach(domain => {
      if (!iocs.find(i => i.value === domain)) {
        iocs.push({ type: 'domain', value: domain });
      }
    });

    // File hashes
    const hashRegexes = [
      /\b[a-f0-9]{32}\b/gi,  // MD5
      /\b[a-f0-9]{40}\b/gi,  // SHA1
      /\b[a-f0-9]{64}\b/gi,  // SHA256
    ];

    hashRegexes.forEach(regex => {
      const hashes = dataStr.match(regex) || [];
      hashes.forEach(hash => {
        if (!iocs.find(i => i.value === hash)) {
          iocs.push({ type: 'hash', value: hash });
        }
      });
    });

    // URLs
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const urls = dataStr.match(urlRegex) || [];
    urls.forEach(url => {
      if (!iocs.find(i => i.value === url)) {
        iocs.push({ type: 'url', value: url });
      }
    });

    return iocs;
  }

  /**
   * Generate unique webhook ID
   */
  private generateWebhookId(): string {
    return `webhook-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Get webhook statistics
   */
  getStats(): {
    totalRequests: number;
    ipStats: Array<{ ip: string; minute: number; hour: number }>;
  } {
    const ipStats: Array<{ ip: string; minute: number; hour: number }> = [];
    let totalRequests = 0;

    this.requestCounts.forEach((counts, ip) => {
      totalRequests += counts.hour;
      ipStats.push({
        ip,
        minute: counts.minute,
        hour: counts.hour,
      });
    });

    return { totalRequests, ipStats };
  }

  /**
   * Clear rate limit counters
   */
  clearRateLimits(): void {
    this.requestCounts.clear();
    logger.info('Webhook rate limit counters cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WebhookConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Webhook receiver configuration updated');
  }
}
