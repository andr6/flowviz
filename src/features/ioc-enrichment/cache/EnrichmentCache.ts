/**
 * Enrichment Cache
 *
 * LRU cache for storing enriched IOC results to reduce API calls
 * and improve response times
 */

import { logger } from '../../../shared/utils/logger';
import { AggregatedIOC } from '../aggregation/AggregationEngine';

export interface CacheConfig {
  enabled: boolean;
  ttl: number;           // Time to live in seconds
  maxSize?: number;      // Maximum number of entries (LRU eviction)
  cleanupInterval?: number; // Cleanup interval in milliseconds
}

interface CacheEntry {
  data: AggregatedIOC;
  timestamp: number;     // When the entry was cached
  expiresAt: number;     // When the entry expires
  hits: number;          // Number of cache hits
  lastAccessed: number;  // Last access timestamp
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  expiredEntries: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  enabled: true,
  ttl: 3600,           // 1 hour
  maxSize: 10000,      // 10k entries
  cleanupInterval: 300000, // 5 minutes
};

export class EnrichmentCache {
  private config: CacheConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = {
    size: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
    evictions: 0,
    expiredEntries: 0,
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.enabled && this.config.cleanupInterval) {
      this.startCleanupTimer();
    }
  }

  /**
   * Get a cached enrichment result
   */
  async get(ioc: string, iocType: string): Promise<AggregatedIOC | null> {
    if (!this.config.enabled) {
      return null;
    }

    const key = this.getCacheKey(ioc, iocType);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      logger.debug(`Cache entry expired for ${iocType}: ${ioc}`);
      this.cache.delete(key);
      this.stats.size--;
      this.stats.expiredEntries++;
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access statistics
    entry.hits++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.updateHitRate();

    logger.debug(`Cache hit for ${iocType}: ${ioc} (hits: ${entry.hits})`);
    return entry.data;
  }

  /**
   * Store an enrichment result in cache
   */
  async set(ioc: string, iocType: string, data: AggregatedIOC): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const key = this.getCacheKey(ioc, iocType);
    const now = Date.now();

    const entry: CacheEntry = {
      data,
      timestamp: now,
      expiresAt: now + (this.config.ttl * 1000),
      hits: 0,
      lastAccessed: now,
    };

    // Check if we need to evict (LRU)
    if (this.config.maxSize && this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;

    logger.debug(`Cached enrichment for ${iocType}: ${ioc} (expires in ${this.config.ttl}s)`);
  }

  /**
   * Remove a specific entry from cache
   */
  async delete(ioc: string, iocType: string): Promise<boolean> {
    const key = this.getCacheKey(ioc, iocType);
    const deleted = this.cache.delete(key);

    if (deleted) {
      this.stats.size--;
      logger.debug(`Deleted cache entry for ${iocType}: ${ioc}`);
    }

    return deleted;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.size = 0;
    logger.info(`Cleared ${size} cache entries`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Update cache configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    const wasEnabled = this.config.enabled;

    this.config = { ...this.config, ...config };

    // Handle enable/disable transitions
    if (!wasEnabled && this.config.enabled) {
      this.startCleanupTimer();
    } else if (wasEnabled && !this.config.enabled) {
      this.stopCleanupTimer();
      this.clear();
    }

    logger.info('Cache config updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Generate cache key from IOC and type
   */
  private getCacheKey(ioc: string, iocType: string): string {
    // Normalize the IOC (lowercase, trim)
    const normalized = ioc.toLowerCase().trim();
    return `${iocType}:${normalized}`;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    // Find the entry with the oldest lastAccessed time
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      logger.debug(`Evicted LRU cache entry: ${oldestKey}`);
    }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(
      () => this.cleanupExpired(),
      this.config.cleanupInterval
    );

    logger.debug('Cache cleanup timer started');
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      logger.debug('Cache cleanup timer stopped');
    }
  }

  /**
   * Remove all expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.stats.size = this.cache.size;
      this.stats.expiredEntries += expiredCount;
      logger.debug(`Cleaned up ${expiredCount} expired cache entries`);
    }
  }

  /**
   * Get all cache entries (for debugging/monitoring)
   */
  getAllEntries(): Array<{
    key: string;
    ioc: string;
    iocType: string;
    verdict: string;
    score: number;
    timestamp: Date;
    expiresAt: Date;
    hits: number;
    ttl: number;
  }> {
    const entries: Array<any> = [];

    for (const [key, entry] of this.cache.entries()) {
      const [iocType, ioc] = key.split(':');
      entries.push({
        key,
        ioc,
        iocType,
        verdict: entry.data.consensus.reputation.verdict,
        score: entry.data.consensus.reputation.score,
        timestamp: new Date(entry.timestamp),
        expiresAt: new Date(entry.expiresAt),
        hits: entry.hits,
        ttl: Math.max(0, Math.floor((entry.expiresAt - Date.now()) / 1000)),
      });
    }

    return entries.sort((a, b) => b.hits - a.hits); // Sort by popularity
  }

  /**
   * Get entries that will expire soon
   */
  getExpiringSoon(withinSeconds: number = 300): Array<{
    key: string;
    ioc: string;
    iocType: string;
    ttl: number;
  }> {
    const now = Date.now();
    const threshold = now + (withinSeconds * 1000);
    const expiring: Array<any> = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= threshold && entry.expiresAt > now) {
        const [iocType, ioc] = key.split(':');
        expiring.push({
          key,
          ioc,
          iocType,
          ttl: Math.floor((entry.expiresAt - now) / 1000),
        });
      }
    }

    return expiring.sort((a, b) => a.ttl - b.ttl);
  }

  /**
   * Preload cache with IOCs (useful for warming up)
   */
  async preload(
    entries: Array<{ ioc: string; iocType: string; data: AggregatedIOC }>
  ): Promise<number> {
    let loaded = 0;

    for (const entry of entries) {
      await this.set(entry.ioc, entry.iocType, entry.data);
      loaded++;
    }

    logger.info(`Preloaded ${loaded} entries into cache`);
    return loaded;
  }

  /**
   * Export cache to JSON (for persistence)
   */
  export(): string {
    const entries: Array<any> = [];

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        data: entry.data,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt,
        hits: entry.hits,
      });
    }

    return JSON.stringify({
      version: '1.0',
      exportedAt: Date.now(),
      entries,
    });
  }

  /**
   * Import cache from JSON
   */
  async import(json: string): Promise<number> {
    try {
      const imported = JSON.parse(json);
      const now = Date.now();
      let loaded = 0;

      for (const entry of imported.entries) {
        // Only import entries that haven't expired
        if (entry.expiresAt > now) {
          this.cache.set(entry.key, {
            data: entry.data,
            timestamp: entry.timestamp,
            expiresAt: entry.expiresAt,
            hits: entry.hits || 0,
            lastAccessed: now,
          });
          loaded++;
        }
      }

      this.stats.size = this.cache.size;
      logger.info(`Imported ${loaded} entries into cache`);
      return loaded;

    } catch (error) {
      logger.error('Failed to import cache:', error);
      throw new Error('Cache import failed');
    }
  }

  /**
   * Cleanup and destroy cache instance
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.cache.clear();
    this.stats = {
      size: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      evictions: 0,
      expiredEntries: 0,
    };
    logger.info('Cache destroyed');
  }
}
