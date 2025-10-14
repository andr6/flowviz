import { EventEmitter } from 'events';
import { logger } from '../../shared/utils/logger.js';

// ==========================================
// STIX 2.1 TYPES
// ==========================================

export interface STIXBundle {
  type: 'bundle';
  id: string;
  spec_version: '2.1';
  objects: STIXObject[];
  created?: string;
  modified?: string;
}

export interface STIXObject {
  type: string;
  spec_version: '2.1';
  id: string;
  created: string;
  modified: string;
  created_by_ref?: string;
  revoked?: boolean;
  labels?: string[];
  confidence?: number;
  lang?: string;
  external_references?: ExternalReference[];
  object_marking_refs?: string[];
  granular_markings?: GranularMarking[];
  extensions?: Record<string, any>;
}

export interface ExternalReference {
  source_name: string;
  description?: string;
  url?: string;
  hashes?: Record<string, string>;
  external_id?: string;
}

export interface GranularMarking {
  lang?: string;
  marking_ref?: string;
  selectors: string[];
}

export interface STIXIndicator extends STIXObject {
  type: 'indicator';
  name: string;
  description?: string;
  indicator_types: string[];
  pattern: string;
  pattern_type: string;
  pattern_version?: string;
  valid_from: string;
  valid_until?: string;
  kill_chain_phases?: KillChainPhase[];
}

export interface STIXMalware extends STIXObject {
  type: 'malware';
  name: string;
  description?: string;
  malware_types: string[];
  is_family: boolean;
  aliases?: string[];
  kill_chain_phases?: KillChainPhase[];
  first_seen?: string;
  last_seen?: string;
  operating_system_refs?: string[];
  architecture_execution_envs?: string[];
  implementation_languages?: string[];
  capabilities?: string[];
}

export interface STIXThreatActor extends STIXObject {
  type: 'threat-actor';
  name: string;
  description?: string;
  threat_actor_types: string[];
  aliases?: string[];
  first_seen?: string;
  last_seen?: string;
  roles?: string[];
  goals?: string[];
  sophistication?: string;
  resource_level?: string;
  primary_motivation?: string;
  secondary_motivations?: string[];
  personal_motivations?: string[];
}

export interface STIXRelationship extends STIXObject {
  type: 'relationship';
  relationship_type: string;
  source_ref: string;
  target_ref: string;
  description?: string;
  start_time?: string;
  stop_time?: string;
}

export interface KillChainPhase {
  kill_chain_name: string;
  phase_name: string;
}

// ==========================================
// TAXII 2.1 TYPES
// ==========================================

export interface TAXIIServer {
  id: string;
  name: string;
  url: string;
  apiRoot: string;
  username?: string;
  password?: string;
  apiKey?: string;
  enabled: boolean;
  collections: TAXIICollection[];
  lastSync?: Date;
  syncInterval: number; // minutes
  organizationId: string;
}

export interface TAXIICollection {
  id: string;
  title: string;
  description?: string;
  can_read: boolean;
  can_write: boolean;
  media_types: string[];
  alias?: string;
}

export interface TAXIIDiscovery {
  title: string;
  description?: string;
  contact?: string;
  default: string;
  api_roots: string[];
}

export interface TAXIICollectionContent {
  id: string;
  type: string;
  more: boolean;
  objects: STIXObject[];
  next?: string;
}

// ==========================================
// IMPORT/EXPORT OPTIONS
// ==========================================

export interface STIXImportOptions {
  validateSchema: boolean;
  deduplicateObjects: boolean;
  mergeExisting: boolean;
  preserveRelationships: boolean;
  organizationId: string;
  importedBy: string;
  tags?: string[];
}

export interface STIXExportOptions {
  includeRelationships: boolean;
  includeMarkings: boolean;
  includeExtensions: boolean;
  filterByConfidence?: number;
  filterByTypes?: string[];
  organizationId?: string;
}

export interface ImportResult {
  success: boolean;
  bundleId: string;
  objectsImported: number;
  objectsFailed: number;
  relationshipsImported: number;
  errors: ImportError[];
  summary: {
    indicators: number;
    malware: number;
    threat_actors: number;
    attack_patterns: number;
    campaigns: number;
    relationships: number;
    other: number;
  };
}

export interface ImportError {
  objectId: string;
  objectType: string;
  error: string;
  severity: 'warning' | 'error';
}

// ==========================================
// STIX/TAXII INTEGRATION SERVICE
// ==========================================

export class STIXTAXIIIntegrationService extends EventEmitter {
  private isInitialized = false;
  private taxiiServers: Map<string, TAXIIServer> = new Map();
  private stixBundles: Map<string, STIXBundle> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitialized) {return;}

    try {
      logger.info('Initializing STIX/TAXII Integration Service...');

      await Promise.all([
        this.loadTAXIIServers(),
        this.loadSTIXBundles(),
        this.startSyncSchedulers()
      ]);

      this.isInitialized = true;
      logger.info('✅ STIX/TAXII Integration Service initialized');

      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize STIX/TAXII Integration Service:', error);
      throw error;
    }
  }

  // ==========================================
  // STIX IMPORT/EXPORT
  // ==========================================

  /**
   * Import STIX 2.1 bundle
   */
  async importSTIXBundle(
    bundle: STIXBundle | string,
    options: STIXImportOptions
  ): Promise<ImportResult> {
    try {
      logger.info('Importing STIX bundle...');

      // Parse bundle if string
      const parsedBundle: STIXBundle = typeof bundle === 'string'
        ? JSON.parse(bundle)
        : bundle;

      // Validate
      if (options.validateSchema) {
        this.validateSTIXBundle(parsedBundle);
      }

      // Process objects
      const result: ImportResult = {
        success: true,
        bundleId: parsedBundle.id,
        objectsImported: 0,
        objectsFailed: 0,
        relationshipsImported: 0,
        errors: [],
        summary: {
          indicators: 0,
          malware: 0,
          threat_actors: 0,
          attack_patterns: 0,
          campaigns: 0,
          relationships: 0,
          other: 0
        }
      };

      const objectMap = new Map<string, STIXObject>();

      // First pass: import all objects
      for (const obj of parsedBundle.objects) {
        try {
          // Deduplicate
          if (options.deduplicateObjects) {
            const existing = await this.findExistingObject(obj.id);
            if (existing && !options.mergeExisting) {
              logger.debug(`Skipping duplicate object: ${obj.id}`);
              continue;
            }
          }

          // Import based on type
          await this.importSTIXObject(obj, options);
          objectMap.set(obj.id, obj);
          result.objectsImported++;

          // Update summary
          this.updateImportSummary(result.summary, obj.type);

        } catch (error) {
          result.objectsFailed++;
          result.errors.push({
            objectId: obj.id,
            objectType: obj.type,
            error: error instanceof Error ? error.message : String(error),
            severity: 'error'
          });
          logger.error(`Failed to import object ${obj.id}:`, error);
        }
      }

      // Second pass: import relationships if enabled
      if (options.preserveRelationships) {
        const relationships = parsedBundle.objects.filter(
          obj => obj.type === 'relationship'
        ) as STIXRelationship[];

        for (const rel of relationships) {
          try {
            await this.importRelationship(rel, objectMap, options);
            result.relationshipsImported++;
          } catch (error) {
            result.errors.push({
              objectId: rel.id,
              objectType: 'relationship',
              error: error instanceof Error ? error.message : String(error),
              severity: 'warning'
            });
          }
        }
      }

      // Store bundle
      this.stixBundles.set(parsedBundle.id, parsedBundle);
      await this.saveBundleToDatabase(parsedBundle, options.organizationId);

      logger.info(`✅ Imported STIX bundle: ${result.objectsImported} objects, ${result.relationshipsImported} relationships`);
      this.emit('bundle_imported', { bundle: parsedBundle, result });

      return result;
    } catch (error) {
      logger.error('Failed to import STIX bundle:', error);
      throw error;
    }
  }

  /**
   * Export data to STIX 2.1 bundle
   */
  async exportSTIXBundle(
    objectIds: string[],
    options: STIXExportOptions
  ): Promise<STIXBundle> {
    try {
      logger.info(`Exporting ${objectIds.length} objects to STIX bundle...`);

      const objects: STIXObject[] = [];

      // Export each object
      for (const objectId of objectIds) {
        const obj = await this.exportSTIXObject(objectId, options);
        if (obj) {
          objects.push(obj);
        }
      }

      // Include relationships
      if (options.includeRelationships) {
        const relationships = await this.exportRelationships(objectIds, options);
        objects.push(...relationships);
      }

      // Create bundle
      const bundle: STIXBundle = {
        type: 'bundle',
        id: `bundle--${this.generateUUID()}`,
        spec_version: '2.1',
        objects,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      };

      logger.info(`✅ Exported STIX bundle with ${objects.length} objects`);
      this.emit('bundle_exported', bundle);

      return bundle;
    } catch (error) {
      logger.error('Failed to export STIX bundle:', error);
      throw error;
    }
  }

  // ==========================================
  // TAXII SERVER MANAGEMENT
  // ==========================================

  /**
   * Register TAXII server
   */
  async registerTAXIIServer(serverConfig: {
    name: string;
    url: string;
    apiRoot: string;
    username?: string;
    password?: string;
    apiKey?: string;
    syncInterval: number; // minutes
    organizationId: string;
  }): Promise<TAXIIServer> {
    try {
      logger.info(`Registering TAXII server: ${serverConfig.name}`);

      // Discover server
      const discovery = await this.discoverTAXIIServer(serverConfig.url);

      // Get collections
      const collections = await this.getTAXIICollections(
        serverConfig.url,
        serverConfig.apiRoot,
        serverConfig.username,
        serverConfig.password,
        serverConfig.apiKey
      );

      const server: TAXIIServer = {
        id: this.generateUUID(),
        name: serverConfig.name,
        url: serverConfig.url,
        apiRoot: serverConfig.apiRoot,
        username: serverConfig.username,
        password: serverConfig.password,
        apiKey: serverConfig.apiKey,
        enabled: true,
        collections,
        syncInterval: serverConfig.syncInterval,
        organizationId: serverConfig.organizationId
      };

      this.taxiiServers.set(server.id, server);
      await this.saveTAXIIServerToDatabase(server);

      // Start sync scheduler
      this.startServerSync(server);

      logger.info(`✅ TAXII server registered: ${server.name} (${collections.length} collections)`);
      this.emit('taxii_server_registered', server);

      return server;
    } catch (error) {
      logger.error('Failed to register TAXII server:', error);
      throw error;
    }
  }

  /**
   * Sync from TAXII server
   */
  async syncFromTAXIIServer(
    serverId: string,
    collectionId?: string
  ): Promise<ImportResult[]> {
    try {
      const server = this.taxiiServers.get(serverId);
      if (!server) {
        throw new Error(`TAXII server not found: ${serverId}`);
      }

      logger.info(`Syncing from TAXII server: ${server.name}`);

      const results: ImportResult[] = [];
      const collections = collectionId
        ? server.collections.filter(c => c.id === collectionId)
        : server.collections.filter(c => c.can_read);

      for (const collection of collections) {
        try {
          const content = await this.getTAXIICollectionContent(
            server,
            collection.id
          );

          const bundle: STIXBundle = {
            type: 'bundle',
            id: `bundle--${this.generateUUID()}`,
            spec_version: '2.1',
            objects: content.objects
          };

          const result = await this.importSTIXBundle(bundle, {
            validateSchema: true,
            deduplicateObjects: true,
            mergeExisting: true,
            preserveRelationships: true,
            organizationId: server.organizationId,
            importedBy: 'taxii_sync',
            tags: [`taxii:${server.name}`, `collection:${collection.title}`]
          });

          results.push(result);
        } catch (error) {
          logger.error(`Failed to sync collection ${collection.title}:`, error);
        }
      }

      // Update last sync time
      server.lastSync = new Date();
      await this.updateTAXIIServerInDatabase(server);

      logger.info(`✅ Synced ${results.length} collections from ${server.name}`);
      this.emit('taxii_sync_completed', { server, results });

      return results;
    } catch (error) {
      logger.error('Failed to sync from TAXII server:', error);
      throw error;
    }
  }

  /**
   * Publish to TAXII server
   */
  async publishToTAXIIServer(
    serverId: string,
    collectionId: string,
    bundle: STIXBundle
  ): Promise<void> {
    try {
      const server = this.taxiiServers.get(serverId);
      if (!server) {
        throw new Error(`TAXII server not found: ${serverId}`);
      }

      const collection = server.collections.find(c => c.id === collectionId);
      if (!collection) {
        throw new Error(`Collection not found: ${collectionId}`);
      }

      if (!collection.can_write) {
        throw new Error(`Collection ${collection.title} is read-only`);
      }

      logger.info(`Publishing to TAXII collection: ${collection.title}`);

      await this.postToTAXIICollection(server, collectionId, bundle);

      logger.info(`✅ Published bundle to ${collection.title}`);
      this.emit('bundle_published', { server, collection, bundle });
    } catch (error) {
      logger.error('Failed to publish to TAXII server:', error);
      throw error;
    }
  }

  // ==========================================
  // TAXII SERVER IMPLEMENTATION
  // ==========================================

  /**
   * Serve STIX bundles via TAXII 2.1 server
   */
  async serveTAXIIDiscovery(): Promise<TAXIIDiscovery> {
    return {
      title: 'ThreatFlow TAXII Server',
      description: 'TAXII 2.1 server for threat intelligence sharing',
      contact: 'security@threatflow.local',
      default: '/api/v1/taxii/',
      api_roots: ['/api/v1/taxii/']
    };
  }

  async serveTAXIICollections(organizationId: string): Promise<TAXIICollection[]> {
    // Return available collections for organization
    return [
      {
        id: 'indicators',
        title: 'Indicators of Compromise',
        description: 'IOCs from threat intelligence feeds',
        can_read: true,
        can_write: true,
        media_types: ['application/stix+json;version=2.1']
      },
      {
        id: 'threat-actors',
        title: 'Threat Actors',
        description: 'Threat actor profiles and campaigns',
        can_read: true,
        can_write: false,
        media_types: ['application/stix+json;version=2.1']
      },
      {
        id: 'malware',
        title: 'Malware',
        description: 'Malware families and samples',
        can_read: true,
        can_write: true,
        media_types: ['application/stix+json;version=2.1']
      }
    ];
  }

  async serveTAXIICollectionContent(
    collectionId: string,
    organizationId: string,
    addedAfter?: Date,
    limit: number = 100
  ): Promise<TAXIICollectionContent> {
    // Retrieve STIX objects for collection
    const objects = await this.getCollectionObjects(
      collectionId,
      organizationId,
      addedAfter,
      limit
    );

    return {
      id: collectionId,
      type: 'bundle',
      more: objects.length === limit,
      objects
    };
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  private validateSTIXBundle(bundle: STIXBundle): void {
    if (bundle.type !== 'bundle') {
      throw new Error('Invalid bundle type');
    }
    if (bundle.spec_version !== '2.1') {
      throw new Error(`Unsupported STIX version: ${bundle.spec_version}`);
    }
    if (!Array.isArray(bundle.objects)) {
      throw new Error('Bundle objects must be an array');
    }
  }

  private async importSTIXObject(
    obj: STIXObject,
    options: STIXImportOptions
  ): Promise<void> {
    // Import based on type
    switch (obj.type) {
      case 'indicator':
        await this.importIndicator(obj as STIXIndicator, options);
        break;
      case 'malware':
        await this.importMalware(obj as STIXMalware, options);
        break;
      case 'threat-actor':
        await this.importThreatActor(obj as STIXThreatActor, options);
        break;
      default:
        await this.importGenericObject(obj, options);
    }
  }

  private async importIndicator(indicator: STIXIndicator, options: STIXImportOptions): Promise<void> {
    // Convert STIX indicator to internal IOC format
    logger.debug(`Importing indicator: ${indicator.name}`);
    // Implementation would integrate with IOC enrichment service
  }

  private async importMalware(malware: STIXMalware, options: STIXImportOptions): Promise<void> {
    logger.debug(`Importing malware: ${malware.name}`);
    // Implementation would integrate with malware tracking
  }

  private async importThreatActor(actor: STIXThreatActor, options: STIXImportOptions): Promise<void> {
    logger.debug(`Importing threat actor: ${actor.name}`);
    // Implementation would integrate with AdvancedThreatIntelligenceService
  }

  private async importGenericObject(obj: STIXObject, options: STIXImportOptions): Promise<void> {
    logger.debug(`Importing generic object: ${obj.type} (${obj.id})`);
    // Store in database for future reference
  }

  private async importRelationship(
    rel: STIXRelationship,
    objectMap: Map<string, STIXObject>,
    options: STIXImportOptions
  ): Promise<void> {
    logger.debug(`Importing relationship: ${rel.relationship_type}`);
    // Create relationship in database
  }

  private async exportSTIXObject(objectId: string, options: STIXExportOptions): Promise<STIXObject | null> {
    // Retrieve object from database and convert to STIX format
    logger.debug(`Exporting object: ${objectId}`);
    // Implementation would retrieve and convert internal objects to STIX
    return null;
  }

  private async exportRelationships(objectIds: string[], options: STIXExportOptions): Promise<STIXRelationship[]> {
    // Export relationships between objects
    return [];
  }

  private updateImportSummary(summary: ImportResult['summary'], type: string): void {
    switch (type) {
      case 'indicator':
        summary.indicators++;
        break;
      case 'malware':
        summary.malware++;
        break;
      case 'threat-actor':
        summary.threat_actors++;
        break;
      case 'attack-pattern':
        summary.attack_patterns++;
        break;
      case 'campaign':
        summary.campaigns++;
        break;
      case 'relationship':
        summary.relationships++;
        break;
      default:
        summary.other++;
    }
  }

  private async discoverTAXIIServer(url: string): Promise<TAXIIDiscovery> {
    // Implement TAXII discovery
    logger.debug(`Discovering TAXII server: ${url}`);
    return {
      title: 'External TAXII Server',
      default: url,
      api_roots: [url]
    };
  }

  private async getTAXIICollections(
    url: string,
    apiRoot: string,
    username?: string,
    password?: string,
    apiKey?: string
  ): Promise<TAXIICollection[]> {
    // Fetch collections from TAXII server
    logger.debug(`Fetching collections from: ${apiRoot}`);
    return [];
  }

  private async getTAXIICollectionContent(
    server: TAXIIServer,
    collectionId: string
  ): Promise<TAXIICollectionContent> {
    // Fetch content from TAXII collection
    logger.debug(`Fetching content from collection: ${collectionId}`);
    return {
      id: collectionId,
      type: 'bundle',
      more: false,
      objects: []
    };
  }

  private async postToTAXIICollection(
    server: TAXIIServer,
    collectionId: string,
    bundle: STIXBundle
  ): Promise<void> {
    // Post bundle to TAXII collection
    logger.debug(`Posting to collection: ${collectionId}`);
  }

  private async getCollectionObjects(
    collectionId: string,
    organizationId: string,
    addedAfter?: Date,
    limit: number = 100
  ): Promise<STIXObject[]> {
    // Retrieve objects for TAXII collection serving
    return [];
  }

  private startServerSync(server: TAXIIServer): void {
    if (!server.enabled || server.syncInterval <= 0) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        await this.syncFromTAXIIServer(server.id);
      } catch (error) {
        logger.error(`Auto-sync failed for ${server.name}:`, error);
      }
    }, server.syncInterval * 60 * 1000);

    this.syncIntervals.set(server.id, interval);
    logger.info(`Started auto-sync for ${server.name} (every ${server.syncInterval} minutes)`);
  }

  private async startSyncSchedulers(): Promise<void> {
    for (const server of this.taxiiServers.values()) {
      if (server.enabled) {
        this.startServerSync(server);
      }
    }
  }

  private async loadTAXIIServers(): Promise<void> {
    // Load from database
    logger.debug('Loading TAXII servers from database...');
  }

  private async loadSTIXBundles(): Promise<void> {
    // Load from database
    logger.debug('Loading STIX bundles from database...');
  }

  private async saveBundleToDatabase(bundle: STIXBundle, organizationId: string): Promise<void> {
    // Save to database
    logger.debug(`Saving bundle ${bundle.id} to database...`);
  }

  private async saveTAXIIServerToDatabase(server: TAXIIServer): Promise<void> {
    // Save to database
    logger.debug(`Saving TAXII server ${server.name} to database...`);
  }

  private async updateTAXIIServerInDatabase(server: TAXIIServer): Promise<void> {
    // Update in database
    logger.debug(`Updating TAXII server ${server.name} in database...`);
  }

  private async findExistingObject(objectId: string): Promise<STIXObject | null> {
    // Check database for existing object
    return null;
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

  async getSTIXBundle(bundleId: string): Promise<STIXBundle | null> {
    return this.stixBundles.get(bundleId) || null;
  }

  async listSTIXBundles(organizationId?: string): Promise<STIXBundle[]> {
    // Filter and return bundles
    return Array.from(this.stixBundles.values());
  }

  async getTAXIIServer(serverId: string): Promise<TAXIIServer | null> {
    return this.taxiiServers.get(serverId) || null;
  }

  async listTAXIIServers(organizationId?: string): Promise<TAXIIServer[]> {
    const servers = Array.from(this.taxiiServers.values());
    return organizationId
      ? servers.filter(s => s.organizationId === organizationId)
      : servers;
  }

  async getImportHistory(organizationId: string, limit: number = 50): Promise<ImportResult[]> {
    // Retrieve import history from database
    return [];
  }
}

// Singleton instance
export const stixTaxiiService = new STIXTAXIIIntegrationService();
