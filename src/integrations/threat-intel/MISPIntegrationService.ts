import { EventEmitter } from 'events';
import { logger } from '../../shared/utils/logger.js';

// ==========================================
// MISP TYPES
// ==========================================

export interface MISPServer {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number; // minutes
  organizations: MISPOrganization[];
  lastSync?: Date;
  organizationId: string;
}

export interface MISPOrganization {
  id: string;
  uuid: string;
  name: string;
  description?: string;
  type?: string;
  nationality?: string;
  sector?: string;
  contacts?: string[];
}

export interface MISPEvent {
  id: string;
  uuid: string;
  info: string;
  date: string;
  threat_level_id: number; // 1=High, 2=Medium, 3=Low, 4=Undefined
  analysis: number; // 0=Initial, 1=Ongoing, 2=Complete
  published: boolean;
  orgc_id: string;
  org_id: string;
  distribution: number; // 0=Your org, 1=Community, 2=Connected, 3=All, 4=Sharing group
  sharing_group_id?: string;
  timestamp: number;
  publish_timestamp: number;
  attributes: MISPAttribute[];
  objects: MISPObject[];
  tags: MISPTag[];
  galaxy: MISPGalaxy[];
  event_creator_email: string;
  attribute_count: number;
  org: MISPOrganization;
  orgc: MISPOrganization;
  related_events?: MISPRelatedEvent[];
}

export interface MISPAttribute {
  id: string;
  uuid: string;
  event_id: string;
  object_id?: string;
  object_relation?: string;
  category: string;
  type: string;
  value: string;
  to_ids: boolean;
  timestamp: number;
  distribution: number;
  sharing_group_id?: string;
  comment?: string;
  deleted: boolean;
  disable_correlation: boolean;
  first_seen?: string;
  last_seen?: string;
  tags?: MISPTag[];
}

export interface MISPObject {
  id: string;
  uuid: string;
  name: string; // e.g., "file", "ip-port", "domain-ip"
  meta_category: string;
  description: string;
  template_uuid: string;
  template_version: string;
  event_id: string;
  timestamp: number;
  distribution: number;
  sharing_group_id?: string;
  comment?: string;
  deleted: boolean;
  attributes: MISPAttribute[];
}

export interface MISPTag {
  id: string;
  name: string;
  colour: string;
  exportable: boolean;
  hide_tag: boolean;
  numerical_value?: number;
}

export interface MISPGalaxy {
  id: string;
  uuid: string;
  name: string;
  type: string;
  description: string;
  version: string;
  icon?: string;
  namespace: string;
  kill_chain_order?: Record<string, number>;
  galaxy_clusters: MISPGalaxyCluster[];
}

export interface MISPGalaxyCluster {
  id: string;
  uuid: string;
  type: string;
  value: string;
  description: string;
  source: string;
  authors: string[];
  tag_name: string;
  meta?: Record<string, any>;
  galaxy_elements?: MISPGalaxyElement[];
}

export interface MISPGalaxyElement {
  key: string;
  value: string;
}

export interface MISPRelatedEvent {
  Event: {
    id: string;
    uuid: string;
    info: string;
    date: string;
    threat_level_id: number;
  };
}

export interface MISPTaxonomy {
  id: string;
  namespace: string;
  description: string;
  version: string;
  enabled: boolean;
  exclusive: boolean;
  predicates: MISPTaxonomyPredicate[];
}

export interface MISPTaxonomyPredicate {
  value: string;
  expanded?: string;
  description?: string;
  colour?: string;
  exclusive?: boolean;
  entries?: MISPTaxonomyEntry[];
}

export interface MISPTaxonomyEntry {
  value: string;
  expanded?: string;
  description?: string;
  colour?: string;
  numerical_value?: number;
}

// ==========================================
// INTEGRATION OPTIONS
// ==========================================

export interface MISPImportOptions {
  importAttributes: boolean;
  importObjects: boolean;
  importTags: boolean;
  importGalaxies: boolean;
  filterByThreatLevel?: number[];
  filterByDistribution?: number[];
  filterByPublished?: boolean;
  organizationId: string;
  importedBy: string;
}

export interface MISPExportOptions {
  includeAttributes: boolean;
  includeObjects: boolean;
  includeTags: boolean;
  includeGalaxies: boolean;
  toIds: boolean; // Mark attributes for IDS export
  distribution: number;
  threatLevel: number;
  analysis: number;
  published: boolean;
}

export interface MISPSyncResult {
  success: boolean;
  eventsImported: number;
  attributesImported: number;
  objectsImported: number;
  errors: string[];
  warnings: string[];
}

// ==========================================
// ATTRIBUTE TYPE MAPPING
// ==========================================

export const MISP_ATTRIBUTE_TYPES = {
  // Network activity
  'ip-src': 'Source IP',
  'ip-dst': 'Destination IP',
  'domain': 'Domain',
  'hostname': 'Hostname',
  'url': 'URL',
  'uri': 'URI',
  'email-src': 'Source email',
  'email-dst': 'Destination email',

  // File hashes
  'md5': 'MD5',
  'sha1': 'SHA1',
  'sha256': 'SHA256',
  'sha512': 'SHA512',
  'ssdeep': 'SSDEEP',
  'imphash': 'Import hash',

  // File attributes
  'filename': 'Filename',
  'filepath': 'File path',
  'filesize': 'File size',

  // Malware
  'malware-type': 'Malware type',
  'malware-sample': 'Malware sample',

  // Vulnerability
  'vulnerability': 'Vulnerability',
  'cve': 'CVE ID',

  // Financial
  'btc': 'Bitcoin address',
  'iban': 'IBAN',

  // Other
  'text': 'Free text',
  'comment': 'Comment',
  'other': 'Other'
} as const;

// ==========================================
// MISP INTEGRATION SERVICE
// ==========================================

export class MISPIntegrationService extends EventEmitter {
  private isInitialized = false;
  private mispServers: Map<string, MISPServer> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private taxonomies: Map<string, MISPTaxonomy> = new Map();
  private galaxies: Map<string, MISPGalaxy> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitialized) {return;}

    try {
      logger.info('Initializing MISP Integration Service...');

      await Promise.all([
        this.loadMISPServers(),
        this.loadTaxonomies(),
        this.loadGalaxies(),
        this.startSyncSchedulers()
      ]);

      this.isInitialized = true;
      logger.info('✅ MISP Integration Service initialized');

      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize MISP Integration Service:', error);
      throw error;
    }
  }

  // ==========================================
  // MISP SERVER MANAGEMENT
  // ==========================================

  /**
   * Register MISP server
   */
  async registerMISPServer(serverConfig: {
    name: string;
    url: string;
    apiKey: string;
    autoSync: boolean;
    syncInterval: number;
    organizationId: string;
  }): Promise<MISPServer> {
    try {
      logger.info(`Registering MISP server: ${serverConfig.name}`);

      // Test connection and get organizations
      const organizations = await this.getMISPOrganizations(
        serverConfig.url,
        serverConfig.apiKey
      );

      const server: MISPServer = {
        id: this.generateUUID(),
        name: serverConfig.name,
        url: serverConfig.url,
        apiKey: serverConfig.apiKey,
        enabled: true,
        autoSync: serverConfig.autoSync,
        syncInterval: serverConfig.syncInterval,
        organizations,
        organizationId: serverConfig.organizationId
      };

      this.mispServers.set(server.id, server);
      await this.saveMISPServerToDatabase(server);

      // Start auto-sync if enabled
      if (server.autoSync) {
        this.startServerSync(server);
      }

      logger.info(`✅ MISP server registered: ${server.name} (${organizations.length} organizations)`);
      this.emit('misp_server_registered', server);

      return server;
    } catch (error) {
      logger.error('Failed to register MISP server:', error);
      throw error;
    }
  }

  // ==========================================
  // EVENT IMPORT/EXPORT
  // ==========================================

  /**
   * Import MISP event
   */
  async importMISPEvent(
    serverId: string,
    eventId: string,
    options: MISPImportOptions
  ): Promise<void> {
    try {
      const server = this.mispServers.get(serverId);
      if (!server) {
        throw new Error(`MISP server not found: ${serverId}`);
      }

      logger.info(`Importing MISP event ${eventId} from ${server.name}...`);

      const event = await this.fetchMISPEvent(server, eventId);

      // Filter by threat level
      if (options.filterByThreatLevel &&
          !options.filterByThreatLevel.includes(event.threat_level_id)) {
        logger.debug(`Skipping event ${eventId}: threat level ${event.threat_level_id}`);
        return;
      }

      // Filter by publication status
      if (options.filterByPublished !== undefined &&
          event.published !== options.filterByPublished) {
        logger.debug(`Skipping event ${eventId}: published=${event.published}`);
        return;
      }

      // Import attributes
      if (options.importAttributes) {
        for (const attr of event.attributes) {
          await this.importMISPAttribute(attr, event, options);
        }
      }

      // Import objects
      if (options.importObjects) {
        for (const obj of event.objects) {
          await this.importMISPObject(obj, event, options);
        }
      }

      // Import tags
      if (options.importTags) {
        await this.importMISPTags(event.tags, event, options);
      }

      // Import galaxies
      if (options.importGalaxies) {
        for (const galaxy of event.galaxy) {
          await this.importMISPGalaxy(galaxy, event, options);
        }
      }

      logger.info(`✅ Imported MISP event: ${event.info}`);
      this.emit('event_imported', { server, event });
    } catch (error) {
      logger.error('Failed to import MISP event:', error);
      throw error;
    }
  }

  /**
   * Export to MISP event
   */
  async exportToMISP(
    serverId: string,
    data: {
      info: string;
      attributes: Array<{
        type: string;
        value: string;
        category: string;
        comment?: string;
      }>;
      tags?: string[];
    },
    options: MISPExportOptions
  ): Promise<MISPEvent> {
    try {
      const server = this.mispServers.get(serverId);
      if (!server) {
        throw new Error(`MISP server not found: ${serverId}`);
      }

      logger.info(`Exporting to MISP: ${data.info}`);

      // Create event
      const event: Partial<MISPEvent> = {
        info: data.info,
        distribution: options.distribution,
        threat_level_id: options.threatLevel,
        analysis: options.analysis,
        published: options.published,
        attributes: data.attributes.map(attr => ({
          type: attr.type,
          value: attr.value,
          category: attr.category,
          comment: attr.comment || '',
          to_ids: options.toIds,
          distribution: options.distribution,
          timestamp: Date.now() / 1000,
          deleted: false,
          disable_correlation: false
        } as MISPAttribute))
      };

      // Add tags
      if (options.includeTags && data.tags) {
        event.tags = data.tags.map(tag => ({
          name: tag,
          colour: '#000000',
          exportable: true,
          hide_tag: false
        } as MISPTag));
      }

      // Create event on MISP server
      const createdEvent = await this.createMISPEvent(server, event);

      logger.info(`✅ Created MISP event: ${createdEvent.id}`);
      this.emit('event_exported', { server, event: createdEvent });

      return createdEvent;
    } catch (error) {
      logger.error('Failed to export to MISP:', error);
      throw error;
    }
  }

  /**
   * Sync from MISP server
   */
  async syncFromMISP(
    serverId: string,
    since?: Date
  ): Promise<MISPSyncResult> {
    try {
      const server = this.mispServers.get(serverId);
      if (!server) {
        throw new Error(`MISP server not found: ${serverId}`);
      }

      logger.info(`Syncing from MISP server: ${server.name}`);

      const result: MISPSyncResult = {
        success: true,
        eventsImported: 0,
        attributesImported: 0,
        objectsImported: 0,
        errors: [],
        warnings: []
      };

      // Fetch recent events
      const events = await this.fetchMISPEvents(server, since);

      logger.info(`Found ${events.length} events to sync`);

      for (const event of events) {
        try {
          await this.importMISPEvent(server.id, event.id, {
            importAttributes: true,
            importObjects: true,
            importTags: true,
            importGalaxies: true,
            filterByPublished: true,
            organizationId: server.organizationId,
            importedBy: 'misp_sync'
          });

          result.eventsImported++;
          result.attributesImported += event.attribute_count;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`Event ${event.id}: ${errorMsg}`);
          logger.error(`Failed to import event ${event.id}:`, error);
        }
      }

      // Update last sync time
      server.lastSync = new Date();
      await this.updateMISPServerInDatabase(server);

      logger.info(`✅ Sync complete: ${result.eventsImported} events, ${result.attributesImported} attributes`);
      this.emit('sync_completed', { server, result });

      return result;
    } catch (error) {
      logger.error('Failed to sync from MISP:', error);
      throw error;
    }
  }

  // ==========================================
  // TAXONOMY & GALAXY SUPPORT
  // ==========================================

  /**
   * Get MISP taxonomies
   */
  async getTaxonomies(serverId?: string): Promise<MISPTaxonomy[]> {
    if (serverId) {
      const server = this.mispServers.get(serverId);
      if (!server) {
        throw new Error(`MISP server not found: ${serverId}`);
      }
      return this.fetchMISPTaxonomies(server);
    }
    return Array.from(this.taxonomies.values());
  }

  /**
   * Get MISP galaxies
   */
  async getGalaxies(serverId?: string): Promise<MISPGalaxy[]> {
    if (serverId) {
      const server = this.mispServers.get(serverId);
      if (!server) {
        throw new Error(`MISP server not found: ${serverId}`);
      }
      return this.fetchMISPGalaxies(server);
    }
    return Array.from(this.galaxies.values());
  }

  /**
   * Search galaxy clusters
   */
  async searchGalaxyClusters(
    query: string,
    galaxyType?: string
  ): Promise<MISPGalaxyCluster[]> {
    const results: MISPGalaxyCluster[] = [];

    for (const galaxy of this.galaxies.values()) {
      if (galaxyType && galaxy.type !== galaxyType) {
        continue;
      }

      for (const cluster of galaxy.galaxy_clusters) {
        if (cluster.value.toLowerCase().includes(query.toLowerCase()) ||
            cluster.description.toLowerCase().includes(query.toLowerCase())) {
          results.push(cluster);
        }
      }
    }

    return results;
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  private async importMISPAttribute(
    attr: MISPAttribute,
    event: MISPEvent,
    options: MISPImportOptions
  ): Promise<void> {
    logger.debug(`Importing attribute: ${attr.type} = ${attr.value}`);

    // Convert MISP attribute to internal IOC format
    // This would integrate with IOC enrichment service
  }

  private async importMISPObject(
    obj: MISPObject,
    event: MISPEvent,
    options: MISPImportOptions
  ): Promise<void> {
    logger.debug(`Importing object: ${obj.name}`);

    // Import object and its attributes
    for (const attr of obj.attributes) {
      await this.importMISPAttribute(attr, event, options);
    }
  }

  private async importMISPTags(
    tags: MISPTag[],
    event: MISPEvent,
    options: MISPImportOptions
  ): Promise<void> {
    logger.debug(`Importing ${tags.length} tags`);
    // Store tags in database
  }

  private async importMISPGalaxy(
    galaxy: MISPGalaxy,
    event: MISPEvent,
    options: MISPImportOptions
  ): Promise<void> {
    logger.debug(`Importing galaxy: ${galaxy.name}`);

    // Map galaxy to MITRE ATT&CK or other frameworks
    if (galaxy.type === 'mitre-attack-pattern') {
      // Map to MITRE ATT&CK techniques
    }
  }

  private async fetchMISPEvent(server: MISPServer, eventId: string): Promise<MISPEvent> {
    // Fetch event from MISP API
    logger.debug(`Fetching MISP event: ${eventId}`);

    // Mock implementation
    return {
      id: eventId,
      uuid: this.generateUUID(),
      info: 'Mock MISP Event',
      date: new Date().toISOString().split('T')[0],
      threat_level_id: 2,
      analysis: 1,
      published: true,
      orgc_id: '1',
      org_id: '1',
      distribution: 1,
      timestamp: Date.now() / 1000,
      publish_timestamp: Date.now() / 1000,
      attributes: [],
      objects: [],
      tags: [],
      galaxy: [],
      event_creator_email: 'admin@misp.local',
      attribute_count: 0,
      org: { id: '1', uuid: this.generateUUID(), name: 'Org' },
      orgc: { id: '1', uuid: this.generateUUID(), name: 'Orgc' }
    };
  }

  private async fetchMISPEvents(server: MISPServer, since?: Date): Promise<MISPEvent[]> {
    // Fetch events from MISP API
    logger.debug(`Fetching MISP events since: ${since}`);
    return [];
  }

  private async createMISPEvent(server: MISPServer, event: Partial<MISPEvent>): Promise<MISPEvent> {
    // Create event via MISP API
    logger.debug(`Creating MISP event: ${event.info}`);

    // Mock implementation
    return {
      ...event,
      id: this.generateUUID(),
      uuid: this.generateUUID(),
      timestamp: Date.now() / 1000,
      publish_timestamp: Date.now() / 1000,
      event_creator_email: 'threatflow@local',
      attribute_count: event.attributes?.length || 0,
      org: { id: '1', uuid: this.generateUUID(), name: 'ThreatFlow' },
      orgc: { id: '1', uuid: this.generateUUID(), name: 'ThreatFlow' }
    } as MISPEvent;
  }

  private async getMISPOrganizations(url: string, apiKey: string): Promise<MISPOrganization[]> {
    // Fetch organizations from MISP
    logger.debug(`Fetching MISP organizations from: ${url}`);
    return [];
  }

  private async fetchMISPTaxonomies(server: MISPServer): Promise<MISPTaxonomy[]> {
    // Fetch taxonomies from MISP
    logger.debug(`Fetching MISP taxonomies from: ${server.name}`);
    return [];
  }

  private async fetchMISPGalaxies(server: MISPServer): Promise<MISPGalaxy[]> {
    // Fetch galaxies from MISP
    logger.debug(`Fetching MISP galaxies from: ${server.name}`);
    return [];
  }

  private startServerSync(server: MISPServer): void {
    if (!server.enabled || !server.autoSync || server.syncInterval <= 0) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        await this.syncFromMISP(server.id);
      } catch (error) {
        logger.error(`Auto-sync failed for ${server.name}:`, error);
      }
    }, server.syncInterval * 60 * 1000);

    this.syncIntervals.set(server.id, interval);
    logger.info(`Started auto-sync for ${server.name} (every ${server.syncInterval} minutes)`);
  }

  private async startSyncSchedulers(): Promise<void> {
    for (const server of this.mispServers.values()) {
      if (server.enabled && server.autoSync) {
        this.startServerSync(server);
      }
    }
  }

  private async loadMISPServers(): Promise<void> {
    // Load from database
    logger.debug('Loading MISP servers from database...');
  }

  private async loadTaxonomies(): Promise<void> {
    // Load taxonomies
    logger.debug('Loading MISP taxonomies...');
  }

  private async loadGalaxies(): Promise<void> {
    // Load galaxies
    logger.debug('Loading MISP galaxies...');
  }

  private async saveMISPServerToDatabase(server: MISPServer): Promise<void> {
    // Save to database
    logger.debug(`Saving MISP server ${server.name} to database...`);
  }

  private async updateMISPServerInDatabase(server: MISPServer): Promise<void> {
    // Update in database
    logger.debug(`Updating MISP server ${server.name} in database...`);
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

  async getMISPServer(serverId: string): Promise<MISPServer | null> {
    return this.mispServers.get(serverId) || null;
  }

  async listMISPServers(organizationId?: string): Promise<MISPServer[]> {
    const servers = Array.from(this.mispServers.values());
    return organizationId
      ? servers.filter(s => s.organizationId === organizationId)
      : servers;
  }

  async getSyncHistory(serverId: string, limit: number = 50): Promise<MISPSyncResult[]> {
    // Retrieve sync history from database
    return [];
  }
}

// Singleton instance
export const mispIntegrationService = new MISPIntegrationService();
