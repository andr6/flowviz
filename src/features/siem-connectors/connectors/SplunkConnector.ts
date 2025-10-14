/**
 * Splunk SIEM Connector
 *
 * Integration with Splunk Enterprise and Splunk Cloud for alert ingestion
 * and enrichment push-back
 */

import fetch from 'node-fetch';
import { BaseSIEMConnector, SIEMConfig, SIEMAlert, SIEMEnrichment } from './BaseSIEMConnector';
import { logger } from '../../../shared/utils/logger';

export interface SplunkConfig extends SIEMConfig {
  // Splunk-specific config
  searchApp?: string;           // Default: 'search'
  index?: string;               // Index to search
  notableEventIndex?: string;   // Index for notable events
  kvStore?: string;             // KV store collection for enrichments

  // Search configuration
  searchEarliestTime?: string;  // e.g., '-1h', '-24h'
  searchLatestTime?: string;    // e.g., 'now'
}

export class SplunkConnector extends BaseSIEMConnector {
  private sessionKey?: string;

  constructor(config: SplunkConfig) {
    super({
      ...config,
      type: 'splunk',
    });
  }

  /**
   * Test connection to Splunk
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.authenticate();

      // Test with a simple search
      const response = await fetch(
        `${this.config.url}/services/search/jobs?output_mode=json`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Splunk ${this.sessionKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Splunk API returned ${response.status}`);
      }

      logger.info(`Splunk connection test successful`);
      return true;

    } catch (error) {
      logger.error('Splunk connection test failed:', error);
      return false;
    }
  }

  /**
   * Authenticate with Splunk and get session key
   */
  private async authenticate(): Promise<void> {
    if (this.config.apiKey) {
      // Use API key (token) authentication
      this.sessionKey = this.config.apiKey;
      return;
    }

    if (!this.config.username || !this.config.password) {
      throw new Error('Splunk credentials not provided');
    }

    // Username/password authentication
    const params = new URLSearchParams({
      username: this.config.username,
      password: this.config.password,
    });

    const response = await fetch(
      `${this.config.url}/services/auth/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      throw new Error(`Splunk authentication failed: ${response.status}`);
    }

    const text = await response.text();

    // Parse session key from XML response
    const match = text.match(/<sessionKey>([^<]+)<\/sessionKey>/);
    if (!match) {
      throw new Error('Failed to extract session key from response');
    }

    this.sessionKey = match[1];
    logger.info('Splunk authentication successful');
  }

  /**
   * Ingest alerts (notable events) from Splunk
   */
  async ingestAlerts(options?: {
    since?: Date;
    limit?: number;
    query?: string;
  }): Promise<SIEMAlert[]> {
    try {
      await this.authenticate();

      const splunkConfig = this.config as SplunkConfig;
      const earliestTime = options?.since
        ? new Date(options.since).toISOString()
        : (splunkConfig.searchEarliestTime || '-1h');
      const latestTime = splunkConfig.searchLatestTime || 'now';

      // Build search query for notable events
      let searchQuery = options?.query || `
        search index=${splunkConfig.notableEventIndex || 'notable'}
        | sort -_time
        | head ${options?.limit || 100}
      `.trim();

      // Create search job
      const jobId = await this.createSearchJob(searchQuery, earliestTime, latestTime);

      // Wait for search to complete
      await this.waitForSearchCompletion(jobId);

      // Get search results
      const results = await this.getSearchResults(jobId);

      // Parse results into SIEMAlert format
      const alerts = results.map(result => this.parseSplunkEventToAlert(result));

      logger.info(`Ingested ${alerts.length} alerts from Splunk`);

      return alerts;

    } catch (error) {
      logger.error('Failed to ingest alerts from Splunk:', error);
      throw error;
    }
  }

  /**
   * Create a search job in Splunk
   */
  private async createSearchJob(
    search: string,
    earliestTime: string,
    latestTime: string
  ): Promise<string> {
    const params = new URLSearchParams({
      search,
      earliest_time: earliestTime,
      latest_time: latestTime,
      output_mode: 'json',
    });

    const response = await fetch(
      `${this.config.url}/services/search/jobs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Splunk ${this.sessionKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create search job: ${response.status}`);
    }

    const data = await response.json();
    const jobId = data.sid;

    logger.debug(`Created Splunk search job: ${jobId}`);

    return jobId;
  }

  /**
   * Wait for search job to complete
   */
  private async waitForSearchCompletion(jobId: string, maxWaitMs: number = 60000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const response = await fetch(
        `${this.config.url}/services/search/jobs/${jobId}?output_mode=json`,
        {
          headers: {
            'Authorization': `Splunk ${this.sessionKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to check job status: ${response.status}`);
      }

      const data = await response.json();
      const entry = data.entry[0];
      const content = entry.content;

      const isDone = content.isDone;
      const isFailed = content.isFailed;

      if (isFailed) {
        throw new Error('Search job failed');
      }

      if (isDone) {
        logger.debug(`Search job ${jobId} completed`);
        return;
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Search job ${jobId} timed out after ${maxWaitMs}ms`);
  }

  /**
   * Get results from completed search job
   */
  private async getSearchResults(jobId: string): Promise<any[]> {
    const response = await fetch(
      `${this.config.url}/services/search/jobs/${jobId}/results?output_mode=json&count=0`,
      {
        headers: {
          'Authorization': `Splunk ${this.sessionKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get search results: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  /**
   * Parse Splunk event to SIEMAlert format
   */
  private parseSplunkEventToAlert(event: any): SIEMAlert {
    const iocs = this.extractIOCs(event);

    return {
      id: event._key || event.event_id || `splunk-${Date.now()}-${Math.random()}`,
      source: this.config.name,
      title: event.rule_name || event.search_name || event.title || 'Untitled Alert',
      description: event.description || event.message || '',
      severity: this.mapSplunkSeverity(event.severity || event.urgency),
      status: this.mapSplunkStatus(event.status),

      iocs,

      createdAt: event._time ? new Date(event._time) : new Date(),
      updatedAt: new Date(),
      detectedAt: event._time ? new Date(event._time) : new Date(),

      metadata: {
        ruleId: event.rule_id || event.search_id,
        ruleName: event.rule_name || event.search_name,
        source: event.src || event.src_ip,
        destination: event.dest || event.dest_ip,
        user: event.user || event.src_user,
        host: event.host || event.dest_host,
        process: event.process_name,
        ...event,
      },

      raw: event,
    };
  }

  /**
   * Map Splunk severity to standard severity levels
   */
  private mapSplunkSeverity(severity: any): 'low' | 'medium' | 'high' | 'critical' {
    const severityStr = String(severity).toLowerCase();

    if (['critical', 'high', '4', '5'].includes(severityStr)) {
      return 'critical';
    } else if (['medium', '3'].includes(severityStr)) {
      return 'high';
    } else if (['low', '2'].includes(severityStr)) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Map Splunk status to standard status
   */
  private mapSplunkStatus(status: any): 'new' | 'in_progress' | 'resolved' | 'closed' {
    const statusStr = String(status).toLowerCase();

    if (['new', 'unassigned', '0'].includes(statusStr)) {
      return 'new';
    } else if (['in progress', 'assigned', 'investigating', '1', '2'].includes(statusStr)) {
      return 'in_progress';
    } else if (['resolved', 'fixed', '4'].includes(statusStr)) {
      return 'resolved';
    } else if (['closed', '5'].includes(statusStr)) {
      return 'closed';
    } else {
      return 'new';
    }
  }

  /**
   * Push enrichment data back to Splunk
   */
  async pushEnrichment(enrichment: SIEMEnrichment): Promise<boolean> {
    try {
      await this.authenticate();

      const splunkConfig = this.config as SplunkConfig;

      if (splunkConfig.kvStore) {
        // Push to KV store
        return await this.pushToKVStore(enrichment);
      } else {
        // Push as event to index
        return await this.pushAsEvent(enrichment);
      }

    } catch (error) {
      logger.error('Failed to push enrichment to Splunk:', error);
      return false;
    }
  }

  /**
   * Push enrichment to KV store collection
   */
  private async pushToKVStore(enrichment: SIEMEnrichment): Promise<boolean> {
    const splunkConfig = this.config as SplunkConfig;
    const app = splunkConfig.searchApp || 'search';
    const collection = splunkConfig.kvStore;

    for (const ioc of enrichment.iocs) {
      const record = {
        _key: `${ioc.type}_${ioc.value}`,
        ioc_type: ioc.type,
        ioc_value: ioc.value,
        verdict: ioc.enrichment.verdict,
        score: ioc.enrichment.score,
        confidence: ioc.enrichment.confidence,
        threats: ioc.enrichment.threats?.join(', ') || '',
        providers: ioc.enrichment.providers?.join(', ') || '',
        enriched_at: enrichment.timestamp.toISOString(),
      };

      const response = await fetch(
        `${this.config.url}/servicesNS/nobody/${app}/storage/collections/data/${collection}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Splunk ${this.sessionKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(record),
        }
      );

      if (!response.ok) {
        logger.warn(`Failed to push IOC ${ioc.value} to KV store: ${response.status}`);
      }
    }

    logger.info(`Pushed enrichment for alert ${enrichment.alertId} to Splunk KV store`);
    return true;
  }

  /**
   * Push enrichment as event to Splunk index
   */
  private async pushAsEvent(enrichment: SIEMEnrichment): Promise<boolean> {
    const splunkConfig = this.config as SplunkConfig;
    const index = splunkConfig.index || 'main';

    const events = enrichment.iocs.map(ioc => ({
      sourcetype: 'threatflow:enrichment',
      index,
      event: {
        alert_id: enrichment.alertId,
        ioc_type: ioc.type,
        ioc_value: ioc.value,
        verdict: ioc.enrichment.verdict,
        score: ioc.enrichment.score,
        confidence: ioc.enrichment.confidence,
        threats: ioc.enrichment.threats,
        providers: ioc.enrichment.providers,
        enriched_at: enrichment.timestamp.toISOString(),
      },
    }));

    const response = await fetch(
      `${this.config.url}/services/collector/event`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Splunk ${this.sessionKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(events),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to push events to Splunk: ${response.status}`);
    }

    logger.info(`Pushed enrichment for alert ${enrichment.alertId} to Splunk index`);
    return true;
  }

  /**
   * Update notable event status
   */
  async updateAlertStatus(
    alertId: string,
    status: string,
    comment?: string
  ): Promise<boolean> {
    try {
      await this.authenticate();

      const splunkConfig = this.config as SplunkConfig;
      const index = splunkConfig.notableEventIndex || 'notable';

      // Update via modular alert action
      const searchQuery = `
        | makeresults
        | eval event_id="${alertId}", status="${status}"
        ${comment ? `| eval comment="${comment}"` : ''}
        | sendalert notable_event_update
      `.trim();

      const jobId = await this.createSearchJob(searchQuery, '-1h', 'now');
      await this.waitForSearchCompletion(jobId);

      logger.info(`Updated Splunk alert ${alertId} status to ${status}`);
      return true;

    } catch (error) {
      logger.error('Failed to update alert status in Splunk:', error);
      return false;
    }
  }
}
