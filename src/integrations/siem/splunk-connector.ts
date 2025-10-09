import { logger } from '../../shared/utils/logger.js';

import { BaseSIEMConnector, SIEMConfig, SIEMConnectionStatus, SIEMAlert, SIEMQuery, SIEMQueryResult, SIEMIndicator, SIEMEvent, ThreatFlowIOCExport } from './base-siem-connector';

interface SplunkSearchResponse {
  results: Array<{
    _time: string;
    _raw: string;
    [key: string]: any;
  }>;
  preview: boolean;
  offset: number;
  messages: Array<{
    type: string;
    text: string;
  }>;
}

interface SplunkJobResponse {
  sid: string;
  entry: Array<{
    name: string;
    content: {
      dispatchState: 'QUEUED' | 'PARSING' | 'RUNNING' | 'FINALIZING' | 'DONE' | 'FAILED';
      doneProgress: number;
      eventCount: number;
      resultCount: number;
    };
  }>;
}

export class SplunkConnector extends BaseSIEMConnector {
  private baseApiUrl: string;

  constructor(config: SIEMConfig) {
    super(config);
    this.baseApiUrl = `${config.baseUrl}/services`;
  }

  async testConnection(): Promise<SIEMConnectionStatus> {
    try {
      const response = await fetch(`${this.baseApiUrl}/server/info`, 
        this.makeAuthenticatedRequest('', {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        })
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        isConnected: true,
        lastChecked: new Date(),
        version: data.entry?.[0]?.content?.version,
        capabilities: ['query', 'alerts', 'push_iocs', 'create_searches']
      };
    } catch (error) {
      logger.error('Splunk connection test failed:', error);
      return {
        isConnected: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  async query(query: SIEMQuery): Promise<SIEMQueryResult> {
    const startTime = Date.now();
    
    try {
      // Build Splunk search query
      let splunkQuery = `search ${query.query}`;
      
      if (query.timeRange) {
        const earliest = Math.floor(query.timeRange.start.getTime() / 1000);
        const latest = Math.floor(query.timeRange.end.getTime() / 1000);
        splunkQuery += ` earliest=${earliest} latest=${latest}`;
      }

      if (query.fields && query.fields.length > 0) {
        splunkQuery += ` | fields ${query.fields.join(', ')}`;
      }

      if (query.limit) {
        splunkQuery += ` | head ${query.limit}`;
      }

      // Create search job
      const jobResponse = await this.createSearchJob(splunkQuery);
      
      // Wait for job completion
      await this.waitForJobCompletion(jobResponse.sid);
      
      // Get results
      const results = await this.getJobResults(jobResponse.sid);
      
      // Clean up job
      await this.deleteJob(jobResponse.sid);

      const events: SIEMEvent[] = results.results.map(result => ({
        timestamp: new Date(result._time),
        source: result.source || 'splunk',
        eventType: result.eventtype || 'unknown',
        data: result,
        indicators: this.extractIndicatorsFromEvent(result)
      }));

      return {
        events,
        totalCount: results.results.length,
        executionTime: Date.now() - startTime,
        query: splunkQuery
      };
    } catch (error) {
      logger.error('Splunk query failed:', error);
      throw error;
    }
  }

  async getAlerts(timeRange?: { start: Date; end: Date }, limit: number = 100): Promise<SIEMAlert[]> {
    try {
      let query = 'search index=notable OR sourcetype=stash';
      
      if (timeRange) {
        const earliest = Math.floor(timeRange.start.getTime() / 1000);
        const latest = Math.floor(timeRange.end.getTime() / 1000);
        query += ` earliest=${earliest} latest=${latest}`;
      }
      
      query += ` | head ${limit} | sort -_time`;

      const queryResult = await this.query({
        query: query.replace('search ', ''),
        limit
      });

      return queryResult.events.map(event => this.eventToAlert(event));
    } catch (error) {
      logger.error('Failed to get Splunk alerts:', error);
      throw error;
    }
  }

  async getAlert(alertId: string): Promise<SIEMAlert | null> {
    try {
      const query = `search index=notable OR sourcetype=stash | search rule_id="${alertId}" OR event_id="${alertId}"`;
      
      const queryResult = await this.query({
        query: query.replace('search ', ''),
        limit: 1
      });

      if (queryResult.events.length === 0) {
        return null;
      }

      return this.eventToAlert(queryResult.events[0]);
    } catch (error) {
      logger.error('Failed to get Splunk alert:', error);
      return null;
    }
  }

  async updateAlertStatus(alertId: string, status: SIEMAlert['status'], comment?: string): Promise<boolean> {
    try {
      // In Splunk, this would typically involve updating a notable event
      const updateData = {
        status: this.mapStatusToSplunk(status),
        comment: comment || '',
        reviewer: 'ThreatFlow',
        time: new Date().toISOString()
      };

      const response = await fetch(`${this.baseApiUrl}/notable_update`, 
        this.makeAuthenticatedRequest('', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: new URLSearchParams({
            ruleIds: alertId,
            newStatus: updateData.status,
            comment: updateData.comment
          })
        })
      );

      return response.ok;
    } catch (error) {
      logger.error('Failed to update Splunk alert status:', error);
      return false;
    }
  }

  async pushIOCs(iocs: SIEMIndicator[]): Promise<boolean> {
    try {
      // Create a lookup table with IOCs
      const lookupData = iocs.map(ioc => ({
        indicator: ioc.value,
        type: ioc.type,
        confidence: ioc.confidence || 0.5,
        context: ioc.context || '',
        first_seen: ioc.firstSeen?.toISOString() || new Date().toISOString(),
        last_seen: ioc.lastSeen?.toISOString() || new Date().toISOString(),
        source: 'ThreatFlow'
      }));

      // Upload to Splunk KV Store or create a CSV lookup
      const response = await fetch(`${this.baseApiUrl}/data/lookup-table-files/threatflow_iocs.csv`, 
        this.makeAuthenticatedRequest('', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/csv'
          },
          body: this.convertToCSV(lookupData)
        })
      );

      if (response.ok) {
        // Create saved search for IOC monitoring
        await this.createIOCMonitoringSearch(iocs);
      }

      return response.ok;
    } catch (error) {
      logger.error('Failed to push IOCs to Splunk:', error);
      return false;
    }
  }

  async createSearch(searchName: string, query: string, iocData: ThreatFlowIOCExport): Promise<string> {
    try {
      const splunkQuery = this.buildThreatHuntQuery(iocData);
      
      const searchData = {
        name: searchName,
        search: splunkQuery,
        description: `ThreatFlow hunt based on investigation ${iocData.metadata.investigation_id}`,
        'is_scheduled': '1',
        'cron_schedule': '0 */4 * * *', // Run every 4 hours
        'actions': 'email',
        'action.email.to': 'soc@company.com'
      };

      const response = await fetch(`${this.baseApiUrl}/saved/searches`, 
        this.makeAuthenticatedRequest('', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams(searchData)
        })
      );

      if (response.ok) {
        const result = await response.json();
        return result.entry?.[0]?.name || searchName;
      }

      throw new Error(`Failed to create search: ${response.statusText}`);
    } catch (error) {
      logger.error('Failed to create Splunk search:', error);
      throw error;
    }
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  private async createSearchJob(query: string): Promise<{ sid: string }> {
    const response = await fetch(`${this.baseApiUrl}/search/jobs`, 
      this.makeAuthenticatedRequest('', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          search: query,
          output_mode: 'json'
        })
      })
    );

    if (!response.ok) {
      throw new Error(`Failed to create search job: ${response.statusText}`);
    }

    const data = await response.json();
    return { sid: data.sid };
  }

  private async waitForJobCompletion(sid: string, timeout: number = 300000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const response = await fetch(`${this.baseApiUrl}/search/jobs/${sid}`, 
        this.makeAuthenticatedRequest('', {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        })
      );

      if (!response.ok) {
        throw new Error(`Failed to check job status: ${response.statusText}`);
      }

      const job: SplunkJobResponse = await response.json();
      const jobState = job.entry[0].content.dispatchState;

      if (jobState === 'DONE') {
        return;
      } else if (jobState === 'FAILED') {
        throw new Error('Search job failed');
      }

      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Search job timeout');
  }

  private async getJobResults(sid: string): Promise<SplunkSearchResponse> {
    const response = await fetch(`${this.baseApiUrl}/search/jobs/${sid}/results`, 
      this.makeAuthenticatedRequest('', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
    );

    if (!response.ok) {
      throw new Error(`Failed to get job results: ${response.statusText}`);
    }

    return await response.json();
  }

  private async deleteJob(sid: string): Promise<void> {
    try {
      await fetch(`${this.baseApiUrl}/search/jobs/${sid}`, 
        this.makeAuthenticatedRequest('', {
          method: 'DELETE'
        })
      );
    } catch (error) {
      logger.warn('Failed to delete Splunk job:', error);
    }
  }

  private eventToAlert(event: SIEMEvent): SIEMAlert {
    const data = event.data;
    
    return {
      id: data.rule_id || data.event_id || `splunk_${event.timestamp.getTime()}`,
      title: data.rule_title || data.title || 'Splunk Alert',
      description: data.rule_description || data.description,
      severity: this.mapSplunkSeverity(data.severity || data.urgency),
      status: this.mapSplunkStatus(data.status),
      timestamp: event.timestamp,
      source: 'Splunk',
      indicators: event.indicators || [],
      rawData: data,
      confidence: parseFloat(data.confidence) || 0.5,
      tags: data.tag ? (Array.isArray(data.tag) ? data.tag : [data.tag]) : []
    };
  }

  private extractIndicatorsFromEvent(event: any): SIEMIndicator[] {
    const indicators: SIEMIndicator[] = [];
    
    // Extract common IOC types from Splunk events
    if (event.src_ip) {indicators.push({ type: 'ip', value: event.src_ip });}
    if (event.dest_ip) {indicators.push({ type: 'ip', value: event.dest_ip });}
    if (event.domain) {indicators.push({ type: 'domain', value: event.domain });}
    if (event.url) {indicators.push({ type: 'url', value: event.url });}
    if (event.hash) {indicators.push({ type: 'hash', value: event.hash });}
    if (event.filename) {indicators.push({ type: 'filename', value: event.filename });}
    
    return indicators;
  }

  private mapSplunkSeverity(severity: string): SIEMAlert['severity'] {
    switch (severity?.toLowerCase()) {
      case 'critical': case '1': case 'high': return 'critical';
      case 'medium': case '2': return 'high';
      case 'low': case '3': return 'medium';
      case 'informational': case '4': return 'low';
      default: return 'medium';
    }
  }

  private mapSplunkStatus(status: string): SIEMAlert['status'] {
    switch (status?.toLowerCase()) {
      case 'new': case 'unassigned': return 'open';
      case 'assigned': case 'in progress': return 'acknowledged';
      case 'resolved': case 'closed': return 'resolved';
      default: return 'open';
    }
  }

  private mapStatusToSplunk(status: SIEMAlert['status']): string {
    switch (status) {
      case 'open': return 'new';
      case 'acknowledged': return 'in_progress';
      case 'resolved': return 'resolved';
      case 'closed': return 'closed';
      default: return 'new';
    }
  }

  private buildThreatHuntQuery(iocData: ThreatFlowIOCExport): string {
    const iocQueries = iocData.indicators.map(ioc => this.buildIOCQuery(ioc));
    const baseQuery = iocQueries.join(' OR ');
    
    return `search ${baseQuery} | eval threat_confidence=case(${
      iocData.indicators.map(ioc => `match(_raw, "${ioc.value}"), ${ioc.confidence}`).join(', ')
    }, 1=1, 0.3) | where threat_confidence > 0.5 | stats count by source, dest_ip, src_ip, user | sort -count`;
  }

  private async createIOCMonitoringSearch(iocs: SIEMIndicator[]): Promise<void> {
    const iocValues = iocs.map(ioc => `"${ioc.value}"`).join(' OR ');
    const monitoringQuery = `search ${iocValues} | eval ioc_match="true" | stats count by source, dest_ip, src_ip | sort -count`;
    
    await this.createSearch('ThreatFlow_IOC_Monitoring', monitoringQuery, {
      indicators: iocs.map(ioc => ({
        type: ioc.type,
        value: ioc.value,
        confidence: ioc.confidence || 0.5,
        severity: 'medium',
        context: ioc.context,
        tags: []
      })),
      activities: [],
      metadata: {
        export_timestamp: new Date().toISOString(),
        tool: 'ThreatFlow',
        version: '1.0.0'
      }
    });
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) {return '';}
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  protected buildIOCQuery(indicator: SIEMIndicator): string {
    // Splunk-specific query building
    switch (indicator.type.toLowerCase()) {
      case 'ip':
      case 'ipv4':
        return `src_ip="${indicator.value}" OR dest_ip="${indicator.value}" OR clientip="${indicator.value}"`;
      case 'domain':
        return `domain="${indicator.value}" OR query="${indicator.value}" OR site="${indicator.value}"`;
      case 'url':
        return `url="*${indicator.value}*" OR uri="*${indicator.value}*" OR cs_uri_stem="*${indicator.value}*"`;
      case 'hash':
      case 'md5':
      case 'sha1':
      case 'sha256':
        return `hash="${indicator.value}" OR md5="${indicator.value}" OR sha1="${indicator.value}" OR sha256="${indicator.value}" OR file_hash="${indicator.value}"`;
      case 'email':
        return `sender="${indicator.value}" OR recipient="${indicator.value}" OR from="${indicator.value}" OR to="${indicator.value}"`;
      case 'filename':
        return `filename="*${indicator.value}*" OR file_name="*${indicator.value}*" OR process_name="*${indicator.value}*"`;
      default:
        return `"${indicator.value}"`;
    }
  }
}

export default SplunkConnector;