import { EventEmitter } from 'events';
import { logger } from '../../shared/utils/logger.js';

// ==========================================
// FEED TYPES
// ==========================================

export interface ThreatFeed {
  id: string;
  name: string;
  description: string;
  type: FeedType;
  source: FeedSource;
  enabled: boolean;

  // Configuration
  config: FeedConfig;

  // Scheduling
  refreshInterval: number; // minutes
  lastUpdate?: Date;
  nextUpdate?: Date;

  // Statistics
  stats: FeedStatistics;

  // Quality metrics
  reliability: number; // 0-1
  confidence: number; // 0-1
  falsePositiveRate: number; // 0-1

  // Filtering
  filters?: FeedFilters;

  // Organization
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  tags: string[];
  customFields: Record<string, any>;
}

export type FeedType =
  | 'taxii'
  | 'rss'
  | 'json_api'
  | 'csv'
  | 'stix_file'
  | 'misp_feed'
  | 'opencti'
  | 'custom';

export interface FeedSource {
  url: string;
  authType?: 'none' | 'api_key' | 'basic' | 'bearer' | 'certificate';
  apiKey?: string;
  username?: string;
  password?: string;
  headers?: Record<string, string>;
  certificate?: {
    cert: string;
    key: string;
    ca?: string;
  };
}

export interface FeedConfig {
  // TAXII specific
  taxii?: {
    apiRoot: string;
    collectionId: string;
    version: '2.0' | '2.1';
  };

  // RSS specific
  rss?: {
    itemSelector: string;
    dateField: string;
    contentField: string;
  };

  // JSON API specific
  jsonApi?: {
    dataPath: string; // JSON path to data array
    mappings: Record<string, string>; // field mappings
    pagination?: {
      type: 'offset' | 'cursor' | 'page';
      limitParam: string;
      offsetParam?: string;
      cursorParam?: string;
      pageParam?: string;
    };
  };

  // CSV specific
  csv?: {
    delimiter: string;
    hasHeader: boolean;
    columnMappings: Record<number, string>;
  };

  // Common
  deduplication: boolean;
  autoEnrich: boolean;
  createAlerts: boolean;
  minConfidence?: number;
}

export interface FeedStatistics {
  totalItems: number;
  newItems: number;
  updatedItems: number;
  duplicateItems: number;
  failedItems: number;
  lastFetch?: Date;
  lastSuccessful?: Date;
  lastFailed?: Date;
  avgFetchTime: number; // ms
  successRate: number; // 0-1
}

export interface FeedFilters {
  types?: string[]; // IOC types to include
  severities?: string[]; // Minimum severity
  tags?: string[]; // Required tags
  excludeTags?: string[]; // Excluded tags
  confidence?: number; // Minimum confidence
  maxAge?: number; // Days
  customRules?: FilterRule[];
}

export interface FilterRule {
  id: string;
  name: string;
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'gt' | 'lt' | 'gte' | 'lte';
  value: any;
  action: 'include' | 'exclude';
}

export interface FeedItem {
  id: string;
  feedId: string;
  type: string;
  value: string;
  timestamp: Date;
  firstSeen: Date;
  lastSeen: Date;
  confidence: number;
  severity: string;
  tags: string[];
  metadata: Record<string, any>;
  raw: any;
}

export interface FeedFetchResult {
  success: boolean;
  feedId: string;
  feedName: string;
  itemsFetched: number;
  itemsNew: number;
  itemsUpdated: number;
  itemsDuplicate: number;
  itemsFailed: number;
  duration: number; // ms
  errors: string[];
  timestamp: Date;
}

// ==========================================
// PREDEFINED FEEDS
// ==========================================

export const PREDEFINED_FEEDS = {
  abuse_ch_urlhaus: {
    name: 'URLhaus (abuse.ch)',
    description: 'Malware URL feed from URLhaus',
    type: 'csv' as FeedType,
    source: {
      url: 'https://urlhaus.abuse.ch/downloads/csv_recent/',
      authType: 'none' as const
    },
    config: {
      csv: {
        delimiter: ',',
        hasHeader: true,
        columnMappings: {
          2: 'url',
          3: 'status',
          4: 'threat',
          5: 'tags'
        }
      },
      deduplication: true,
      autoEnrich: true,
      createAlerts: false
    },
    refreshInterval: 60
  },
  abuse_ch_feodotracker: {
    name: 'Feodo Tracker (abuse.ch)',
    description: 'Feodo/Emotet C2 tracker',
    type: 'json_api' as FeedType,
    source: {
      url: 'https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json',
      authType: 'none' as const
    },
    config: {
      jsonApi: {
        dataPath: '$',
        mappings: {
          'dst_ip': 'value',
          'dst_port': 'port',
          'malware': 'tags',
          'first_seen': 'firstSeen'
        }
      },
      deduplication: true,
      autoEnrich: true,
      createAlerts: true
    },
    refreshInterval: 60
  },
  alienvault_otx: {
    name: 'AlienVault OTX',
    description: 'Open Threat Exchange feed',
    type: 'json_api' as FeedType,
    source: {
      url: 'https://otx.alienvault.com/api/v1/pulses/subscribed',
      authType: 'api_key' as const,
      headers: {
        'X-OTX-API-KEY': '<API_KEY>'
      }
    },
    config: {
      jsonApi: {
        dataPath: '$.results',
        mappings: {
          'indicator': 'value',
          'type': 'type',
          'description': 'description'
        }
      },
      deduplication: true,
      autoEnrich: true,
      createAlerts: false
    },
    refreshInterval: 120
  }
};

// ==========================================
// FEED MANAGER SERVICE
// ==========================================

export class ThreatIntelligenceFeedManager extends EventEmitter {
  private isInitialized = false;
  private feeds: Map<string, ThreatFeed> = new Map();
  private fetchIntervals: Map<string, NodeJS.Timeout> = new Map();
  private feedItems: Map<string, FeedItem[]> = new Map();
  private fetchHistory: FeedFetchResult[] = [];

  async initialize(): Promise<void> {
    if (this.isInitialized) {return;}

    try {
      logger.info('Initializing Threat Intelligence Feed Manager...');

      await Promise.all([
        this.loadFeeds(),
        this.loadFeedItems(),
        this.startFeedSchedulers()
      ]);

      this.isInitialized = true;
      logger.info('✅ Threat Intelligence Feed Manager initialized');

      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize Feed Manager:', error);
      throw error;
    }
  }

  // ==========================================
  // FEED MANAGEMENT
  // ==========================================

  /**
   * Create new feed
   */
  async createFeed(feedData: {
    name: string;
    description: string;
    type: FeedType;
    source: FeedSource;
    config: FeedConfig;
    refreshInterval: number;
    filters?: FeedFilters;
    organizationId: string;
    createdBy: string;
    tags?: string[];
  }): Promise<ThreatFeed> {
    try {
      logger.info(`Creating feed: ${feedData.name}`);

      const feed: ThreatFeed = {
        id: this.generateUUID(),
        name: feedData.name,
        description: feedData.description,
        type: feedData.type,
        source: feedData.source,
        enabled: true,
        config: feedData.config,
        refreshInterval: feedData.refreshInterval,
        stats: {
          totalItems: 0,
          newItems: 0,
          updatedItems: 0,
          duplicateItems: 0,
          failedItems: 0,
          avgFetchTime: 0,
          successRate: 1.0
        },
        reliability: 0.8,
        confidence: 0.7,
        falsePositiveRate: 0.1,
        filters: feedData.filters,
        organizationId: feedData.organizationId,
        createdBy: feedData.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: feedData.tags || [],
        customFields: {}
      };

      // Test feed connection
      await this.testFeedConnection(feed);

      this.feeds.set(feed.id, feed);
      await this.saveFeedToDatabase(feed);

      // Start scheduler if enabled
      if (feed.enabled) {
        this.startFeedScheduler(feed);
      }

      logger.info(`✅ Feed created: ${feed.name}`);
      this.emit('feed_created', feed);

      return feed;
    } catch (error) {
      logger.error('Failed to create feed:', error);
      throw error;
    }
  }

  /**
   * Create feed from predefined template
   */
  async createPredefinedFeed(
    feedKey: keyof typeof PREDEFINED_FEEDS,
    organizationId: string,
    createdBy: string,
    customConfig?: Partial<FeedConfig>
  ): Promise<ThreatFeed> {
    const template = PREDEFINED_FEEDS[feedKey];
    if (!template) {
      throw new Error(`Unknown predefined feed: ${feedKey}`);
    }

    return this.createFeed({
      ...template,
      config: { ...template.config, ...customConfig },
      organizationId,
      createdBy,
      tags: [feedKey]
    });
  }

  /**
   * Fetch from feed
   */
  async fetchFeed(feedId: string, manual: boolean = false): Promise<FeedFetchResult> {
    const startTime = Date.now();
    const feed = this.feeds.get(feedId);

    if (!feed) {
      throw new Error(`Feed not found: ${feedId}`);
    }

    logger.info(`Fetching from feed: ${feed.name}${manual ? ' (manual)' : ''}`);

    const result: FeedFetchResult = {
      success: false,
      feedId: feed.id,
      feedName: feed.name,
      itemsFetched: 0,
      itemsNew: 0,
      itemsUpdated: 0,
      itemsDuplicate: 0,
      itemsFailed: 0,
      duration: 0,
      errors: [],
      timestamp: new Date()
    };

    try {
      // Fetch items based on feed type
      const items = await this.fetchFeedItems(feed);
      result.itemsFetched = items.length;

      // Process items
      for (const item of items) {
        try {
          // Apply filters
          if (!this.passesFilters(item, feed.filters)) {
            continue;
          }

          // Check for duplicates
          if (feed.config.deduplication && await this.isDuplicate(item)) {
            result.itemsDuplicate++;
            await this.updateExistingItem(item);
            result.itemsUpdated++;
            continue;
          }

          // Store item
          await this.storeFeedItem(item);
          result.itemsNew++;

          // Auto-enrich if enabled
          if (feed.config.autoEnrich) {
            await this.enrichFeedItem(item);
          }

          // Create alert if enabled
          if (feed.config.createAlerts && this.shouldCreateAlert(item)) {
            await this.createAlertFromItem(item);
          }

        } catch (error) {
          result.itemsFailed++;
          result.errors.push(
            `Item ${item.value}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Update feed statistics
      feed.stats.totalItems += result.itemsNew;
      feed.stats.newItems = result.itemsNew;
      feed.stats.updatedItems = result.itemsUpdated;
      feed.stats.duplicateItems = result.itemsDuplicate;
      feed.stats.failedItems = result.itemsFailed;
      feed.stats.lastFetch = new Date();
      feed.stats.lastSuccessful = new Date();
      feed.stats.avgFetchTime = (feed.stats.avgFetchTime + (Date.now() - startTime)) / 2;
      feed.lastUpdate = new Date();
      feed.nextUpdate = new Date(Date.now() + feed.refreshInterval * 60 * 1000);

      result.success = true;
      result.duration = Date.now() - startTime;

      await this.updateFeedInDatabase(feed);
      this.fetchHistory.push(result);

      logger.info(`✅ Feed fetch complete: ${result.itemsNew} new, ${result.itemsUpdated} updated, ${result.itemsDuplicate} duplicates`);
      this.emit('feed_fetched', { feed, result });

      return result;
    } catch (error) {
      feed.stats.lastFailed = new Date();
      result.success = false;
      result.duration = Date.now() - startTime;
      result.errors.push(error instanceof Error ? error.message : String(error));

      logger.error(`Failed to fetch feed ${feed.name}:`, error);
      this.emit('feed_fetch_failed', { feed, result, error });

      return result;
    }
  }

  /**
   * Enable/disable feed
   */
  async toggleFeed(feedId: string, enabled: boolean): Promise<void> {
    const feed = this.feeds.get(feedId);
    if (!feed) {
      throw new Error(`Feed not found: ${feedId}`);
    }

    feed.enabled = enabled;
    feed.updatedAt = new Date();

    if (enabled) {
      this.startFeedScheduler(feed);
    } else {
      this.stopFeedScheduler(feedId);
    }

    await this.updateFeedInDatabase(feed);
    logger.info(`Feed ${feed.name} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Delete feed
   */
  async deleteFeed(feedId: string): Promise<void> {
    const feed = this.feeds.get(feedId);
    if (!feed) {
      throw new Error(`Feed not found: ${feedId}`);
    }

    this.stopFeedScheduler(feedId);
    this.feeds.delete(feedId);
    this.feedItems.delete(feedId);

    await this.deleteFeedFromDatabase(feedId);

    logger.info(`Feed deleted: ${feed.name}`);
    this.emit('feed_deleted', feed);
  }

  // ==========================================
  // FEED FETCHING
  // ==========================================

  private async fetchFeedItems(feed: ThreatFeed): Promise<FeedItem[]> {
    switch (feed.type) {
      case 'taxii':
        return this.fetchTAXIIFeed(feed);
      case 'rss':
        return this.fetchRSSFeed(feed);
      case 'json_api':
        return this.fetchJSONApiFeed(feed);
      case 'csv':
        return this.fetchCSVFeed(feed);
      case 'misp_feed':
        return this.fetchMISPFeed(feed);
      default:
        throw new Error(`Unsupported feed type: ${feed.type}`);
    }
  }

  private async fetchTAXIIFeed(feed: ThreatFeed): Promise<FeedItem[]> {
    logger.debug(`Fetching TAXII feed: ${feed.name}`);
    // Integrate with STIX/TAXII service
    return [];
  }

  private async fetchRSSFeed(feed: ThreatFeed): Promise<FeedItem[]> {
    logger.debug(`Fetching RSS feed: ${feed.name}`);
    // Parse RSS feed
    return [];
  }

  private async fetchJSONApiFeed(feed: ThreatFeed): Promise<FeedItem[]> {
    logger.debug(`Fetching JSON API feed: ${feed.name}`);
    // Fetch and parse JSON API
    return [];
  }

  private async fetchCSVFeed(feed: ThreatFeed): Promise<FeedItem[]> {
    logger.debug(`Fetching CSV feed: ${feed.name}`);
    // Download and parse CSV
    return [];
  }

  private async fetchMISPFeed(feed: ThreatFeed): Promise<FeedItem[]> {
    logger.debug(`Fetching MISP feed: ${feed.name}`);
    // Integrate with MISP service
    return [];
  }

  // ==========================================
  // ITEM PROCESSING
  // ==========================================

  private passesFilters(item: FeedItem, filters?: FeedFilters): boolean {
    if (!filters) {return true;}

    // Type filter
    if (filters.types && !filters.types.includes(item.type)) {
      return false;
    }

    // Severity filter
    if (filters.severities && !filters.severities.includes(item.severity)) {
      return false;
    }

    // Tags filter
    if (filters.tags && !filters.tags.some(tag => item.tags.includes(tag))) {
      return false;
    }

    // Exclude tags
    if (filters.excludeTags && filters.excludeTags.some(tag => item.tags.includes(tag))) {
      return false;
    }

    // Confidence filter
    if (filters.confidence && item.confidence < filters.confidence) {
      return false;
    }

    // Age filter
    if (filters.maxAge) {
      const ageInDays = (Date.now() - item.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays > filters.maxAge) {
        return false;
      }
    }

    // Custom rules
    if (filters.customRules) {
      for (const rule of filters.customRules) {
        if (!this.evaluateFilterRule(item, rule)) {
          return false;
        }
      }
    }

    return true;
  }

  private evaluateFilterRule(item: FeedItem, rule: FilterRule): boolean {
    const value = (item as any)[rule.field] || item.metadata[rule.field];

    let match = false;
    switch (rule.operator) {
      case 'equals':
        match = value === rule.value;
        break;
      case 'contains':
        match = String(value).includes(String(rule.value));
        break;
      case 'matches':
        match = new RegExp(String(rule.value)).test(String(value));
        break;
      case 'gt':
        match = value > rule.value;
        break;
      case 'lt':
        match = value < rule.value;
        break;
      case 'gte':
        match = value >= rule.value;
        break;
      case 'lte':
        match = value <= rule.value;
        break;
    }

    return rule.action === 'include' ? match : !match;
  }

  private async isDuplicate(item: FeedItem): Promise<boolean> {
    // Check database for existing item with same value
    return false;
  }

  private async updateExistingItem(item: FeedItem): Promise<void> {
    // Update lastSeen timestamp
    logger.debug(`Updating existing item: ${item.value}`);
  }

  private async storeFeedItem(item: FeedItem): Promise<void> {
    // Store in database
    const items = this.feedItems.get(item.feedId) || [];
    items.push(item);
    this.feedItems.set(item.feedId, items);
  }

  private async enrichFeedItem(item: FeedItem): Promise<void> {
    // Integrate with IOC enrichment service
    logger.debug(`Enriching feed item: ${item.value}`);
  }

  private shouldCreateAlert(item: FeedItem): boolean {
    // Determine if alert should be created based on severity/confidence
    return item.severity === 'critical' || item.severity === 'high';
  }

  private async createAlertFromItem(item: FeedItem): Promise<void> {
    // Create alert in alert triage system
    logger.debug(`Creating alert from item: ${item.value}`);
  }

  // ==========================================
  // SCHEDULING
  // ==========================================

  private startFeedScheduler(feed: ThreatFeed): void {
    if (!feed.enabled || feed.refreshInterval <= 0) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        await this.fetchFeed(feed.id, false);
      } catch (error) {
        logger.error(`Scheduled fetch failed for ${feed.name}:`, error);
      }
    }, feed.refreshInterval * 60 * 1000);

    this.fetchIntervals.set(feed.id, interval);
    logger.info(`Started scheduler for ${feed.name} (every ${feed.refreshInterval} minutes)`);
  }

  private stopFeedScheduler(feedId: string): void {
    const interval = this.fetchIntervals.get(feedId);
    if (interval) {
      clearInterval(interval);
      this.fetchIntervals.delete(feedId);
    }
  }

  private async startFeedSchedulers(): Promise<void> {
    for (const feed of this.feeds.values()) {
      if (feed.enabled) {
        this.startFeedScheduler(feed);
      }
    }
  }

  private async testFeedConnection(feed: ThreatFeed): Promise<void> {
    logger.debug(`Testing connection to feed: ${feed.name}`);
    // Test connection to feed source
  }

  // ==========================================
  // DATABASE OPERATIONS
  // ==========================================

  private async loadFeeds(): Promise<void> {
    logger.debug('Loading feeds from database...');
  }

  private async loadFeedItems(): Promise<void> {
    logger.debug('Loading feed items from database...');
  }

  private async saveFeedToDatabase(feed: ThreatFeed): Promise<void> {
    logger.debug(`Saving feed ${feed.name} to database...`);
  }

  private async updateFeedInDatabase(feed: ThreatFeed): Promise<void> {
    logger.debug(`Updating feed ${feed.name} in database...`);
  }

  private async deleteFeedFromDatabase(feedId: string): Promise<void> {
    logger.debug(`Deleting feed ${feedId} from database...`);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // ==========================================
  // PUBLIC QUERY METHODS
  // ==========================================

  async getFeed(feedId: string): Promise<ThreatFeed | null> {
    return this.feeds.get(feedId) || null;
  }

  async listFeeds(organizationId?: string): Promise<ThreatFeed[]> {
    const feeds = Array.from(this.feeds.values());
    return organizationId
      ? feeds.filter(f => f.organizationId === organizationId)
      : feeds;
  }

  async getFeedItems(feedId: string, limit: number = 100): Promise<FeedItem[]> {
    const items = this.feedItems.get(feedId) || [];
    return items.slice(0, limit);
  }

  async getFetchHistory(feedId?: string, limit: number = 50): Promise<FeedFetchResult[]> {
    const history = feedId
      ? this.fetchHistory.filter(h => h.feedId === feedId)
      : this.fetchHistory;
    return history.slice(-limit);
  }

  async getFeedStatistics(organizationId?: string): Promise<{
    totalFeeds: number;
    activeFeeds: number;
    totalItems: number;
    avgFetchTime: number;
    overallSuccessRate: number;
  }> {
    const feeds = await this.listFeeds(organizationId);
    const activeFeeds = feeds.filter(f => f.enabled);

    return {
      totalFeeds: feeds.length,
      activeFeeds: activeFeeds.length,
      totalItems: feeds.reduce((sum, f) => sum + f.stats.totalItems, 0),
      avgFetchTime: feeds.reduce((sum, f) => sum + f.stats.avgFetchTime, 0) / feeds.length || 0,
      overallSuccessRate: feeds.reduce((sum, f) => sum + f.stats.successRate, 0) / feeds.length || 1
    };
  }
}

// Singleton instance
export const feedManager = new ThreatIntelligenceFeedManager();
