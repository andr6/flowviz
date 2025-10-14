import { EventEmitter } from 'events';
import { logger } from '../../shared/utils/logger.js';

// ==========================================
// OpenIOC TYPES
// ==========================================

export interface OpenIOC {
  id: string;
  version: string;
  created_date: string;
  last_modified: string;
  published_date?: string;
  short_description: string;
  description: string;
  author: string;
  links: OpenIOCLink[];
  criteria: OpenIOCCriteria;
  parameters?: OpenIOCParameters;
  metadata?: Record<string, any>;
}

export interface OpenIOCLink {
  rel: string;
  href: string;
}

export interface OpenIOCCriteria {
  operator: 'AND' | 'OR';
  items: OpenIOCIndicator[];
}

export interface OpenIOCIndicator {
  id: string;
  condition: 'is' | 'contains' | 'matches' | 'starts-with' | 'ends-with' | 'greater-than' | 'less-than';
  document: string; // e.g., "FileItem", "ProcessItem", "RegistryItem"
  search: string; // Path to field, e.g., "FileItem/Md5sum"
  content: {
    type: 'string' | 'int' | 'date' | 'md5' | 'sha1' | 'sha256';
    value: string;
  };
  context?: {
    search: string;
    type: string;
  };
  negate?: boolean;
}

export interface OpenIOCParameters {
  param: Array<{
    id: string;
    name: string;
    value: string;
  }>;
}

// ==========================================
// COMMUNITY SHARING TYPES
// ==========================================

export interface CommunityContribution {
  id: string;
  organizationId: string;
  contributorId: string;
  contributorName?: string; // Anonymized if privacy enabled

  // Content
  type: ContributionType;
  data: SharedIOC | SharedThreatActor | SharedCampaign | SharedPlaybook;

  // Privacy & Sharing
  sharingLevel: SharingLevel;
  tlp: TLP; // Traffic Light Protocol
  anonymize: boolean;

  // Quality & Trust
  reputation: number; // 0-100
  verifiedBy: string[];
  votes: ContributionVotes;
  feedback: ContributionFeedback[];

  // Metadata
  tags: string[];
  categories: string[];
  confidence: number;
  timestamp: Date;
  expiresAt?: Date;

  // Statistics
  downloads: number;
  views: number;
  reports: number;
}

export type ContributionType =
  | 'ioc'
  | 'threat_actor'
  | 'campaign'
  | 'playbook'
  | 'hunt_query'
  | 'yara_rule'
  | 'sigma_rule';

export type SharingLevel =
  | 'private'          // Organization only
  | 'community'        // Verified community members
  | 'public'           // Anyone
  | 'trusted_partners'; // Specific trusted organizations

export type TLP =
  | 'white'   // Unlimited distribution
  | 'green'   // Community
  | 'amber'   // Limited distribution
  | 'red';    // Restricted

export interface SharedIOC {
  type: string;
  value: string;
  description?: string;
  first_seen: Date;
  last_seen?: Date;
  severity: string;
  context?: string;
  related_iocs?: string[];
  mitre_techniques?: string[];
}

export interface SharedThreatActor {
  name: string;
  aliases: string[];
  description: string;
  sophistication: string;
  motivations: string[];
  targets: string[];
  techniques: string[];
  tools: string[];
}

export interface SharedCampaign {
  name: string;
  description: string;
  actors: string[];
  targets: string[];
  techniques: string[];
  timeline: {
    start: Date;
    end?: Date;
  };
}

export interface SharedPlaybook {
  name: string;
  description: string;
  scenario: string;
  steps: any[];
  mitre_tactics: string[];
}

export interface ContributionVotes {
  upvotes: number;
  downvotes: number;
  userVotes: Map<string, 'up' | 'down'>;
}

export interface ContributionFeedback {
  id: string;
  userId: string;
  type: 'comment' | 'correction' | 'confirmation' | 'false_positive';
  content: string;
  timestamp: Date;
  helpful: number;
}

export interface CommunityStatistics {
  totalContributions: number;
  activeContributors: number;
  topContributors: ContributorRank[];
  contributionsByType: Record<ContributionType, number>;
  avgReputation: number;
  recentActivity: CommunityContribution[];
}

export interface ContributorRank {
  contributorId: string;
  contributorName: string;
  contributions: number;
  avgReputation: number;
  totalDownloads: number;
  rank: number;
}

export interface SearchFilters {
  types?: ContributionType[];
  sharingLevels?: SharingLevel[];
  tlp?: TLP[];
  minReputation?: number;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// ==========================================
// COMMUNITY INTELLIGENCE SERVICE
// ==========================================

export class CommunityIntelligenceService extends EventEmitter {
  private isInitialized = false;
  private contributions: Map<string, CommunityContribution> = new Map();
  private contributorReputations: Map<string, number> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitialized) {return;}

    try {
      logger.info('Initializing Community Intelligence Service...');

      await Promise.all([
        this.loadContributions(),
        this.loadReputations()
      ]);

      this.isInitialized = true;
      logger.info('✅ Community Intelligence Service initialized');

      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize Community Intelligence Service:', error);
      throw error;
    }
  }

  // ==========================================
  // OpenIOC SUPPORT
  // ==========================================

  /**
   * Import OpenIOC definition
   */
  async importOpenIOC(iocXml: string): Promise<OpenIOC> {
    try {
      logger.info('Importing OpenIOC definition...');

      // Parse XML to OpenIOC object
      const ioc = await this.parseOpenIOC(iocXml);

      // Extract and store indicators
      await this.extractIndicatorsFromIOC(ioc);

      logger.info(`✅ Imported OpenIOC: ${ioc.short_description}`);
      this.emit('openioc_imported', ioc);

      return ioc;
    } catch (error) {
      logger.error('Failed to import OpenIOC:', error);
      throw error;
    }
  }

  /**
   * Export to OpenIOC format
   */
  async exportToOpenIOC(indicators: {
    type: string;
    value: string;
    description?: string;
  }[], metadata: {
    short_description: string;
    description: string;
    author: string;
  }): Promise<OpenIOC> {
    try {
      logger.info('Exporting to OpenIOC format...');

      const ioc: OpenIOC = {
        id: this.generateUUID(),
        version: '1.1',
        created_date: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        short_description: metadata.short_description,
        description: metadata.description,
        author: metadata.author,
        links: [],
        criteria: {
          operator: 'OR',
          items: indicators.map(ind => this.convertToOpenIOCIndicator(ind))
        }
      };

      logger.info(`✅ Created OpenIOC with ${indicators.length} indicators`);
      return ioc;
    } catch (error) {
      logger.error('Failed to export to OpenIOC:', error);
      throw error;
    }
  }

  /**
   * Validate OpenIOC definition
   */
  validateOpenIOC(ioc: OpenIOC): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!ioc.id) errors.push('Missing IOC ID');
    if (!ioc.short_description) errors.push('Missing short description');
    if (!ioc.author) errors.push('Missing author');
    if (!ioc.criteria || !ioc.criteria.items || ioc.criteria.items.length === 0) {
      errors.push('No indicators defined');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ==========================================
  // COMMUNITY SHARING
  // ==========================================

  /**
   * Share intelligence with community
   */
  async shareIntelligence(contributionData: {
    type: ContributionType;
    data: any;
    sharingLevel: SharingLevel;
    tlp: TLP;
    anonymize: boolean;
    tags?: string[];
    organizationId: string;
    contributorId: string;
  }): Promise<CommunityContribution> {
    try {
      logger.info(`Sharing ${contributionData.type} with community...`);

      // Anonymize if requested
      const contributorName = contributionData.anonymize
        ? this.anonymizeContributor(contributionData.contributorId)
        : await this.getContributorName(contributionData.contributorId);

      const contribution: CommunityContribution = {
        id: this.generateUUID(),
        organizationId: contributionData.organizationId,
        contributorId: contributionData.contributorId,
        contributorName,
        type: contributionData.type,
        data: contributionData.data,
        sharingLevel: contributionData.sharingLevel,
        tlp: contributionData.tlp,
        anonymize: contributionData.anonymize,
        reputation: 50, // Start at neutral
        verifiedBy: [],
        votes: {
          upvotes: 0,
          downvotes: 0,
          userVotes: new Map()
        },
        feedback: [],
        tags: contributionData.tags || [],
        categories: this.categorizeContribution(contributionData.type, contributionData.data),
        confidence: this.calculateInitialConfidence(contributionData.data),
        timestamp: new Date(),
        downloads: 0,
        views: 0,
        reports: 0
      };

      this.contributions.set(contribution.id, contribution);
      await this.saveContributionToDatabase(contribution);

      // Update contributor reputation
      await this.updateContributorReputation(contributionData.contributorId, 5);

      logger.info(`✅ Shared ${contributionData.type} to community (ID: ${contribution.id})`);
      this.emit('intelligence_shared', contribution);

      return contribution;
    } catch (error) {
      logger.error('Failed to share intelligence:', error);
      throw error;
    }
  }

  /**
   * Search community intelligence
   */
  async searchCommunity(
    query: string,
    filters?: SearchFilters
  ): Promise<CommunityContribution[]> {
    try {
      logger.info(`Searching community: ${query}`);

      let results = Array.from(this.contributions.values());

      // Apply filters
      if (filters) {
        if (filters.types) {
          results = results.filter(c => filters.types!.includes(c.type));
        }
        if (filters.sharingLevels) {
          results = results.filter(c => filters.sharingLevels!.includes(c.sharingLevel));
        }
        if (filters.tlp) {
          results = results.filter(c => filters.tlp!.includes(c.tlp));
        }
        if (filters.minReputation) {
          results = results.filter(c => c.reputation >= filters.minReputation!);
        }
        if (filters.tags) {
          results = results.filter(c =>
            filters.tags!.some(tag => c.tags.includes(tag))
          );
        }
        if (filters.dateRange) {
          results = results.filter(c =>
            c.timestamp >= filters.dateRange!.start &&
            c.timestamp <= filters.dateRange!.end
          );
        }
      }

      // Text search
      if (query) {
        results = results.filter(c =>
          this.matchesQuery(c, query)
        );
      }

      // Sort by reputation and relevance
      results.sort((a, b) => b.reputation - a.reputation);

      return results;
    } catch (error) {
      logger.error('Failed to search community:', error);
      throw error;
    }
  }

  /**
   * Vote on contribution
   */
  async voteContribution(
    contributionId: string,
    userId: string,
    vote: 'up' | 'down'
  ): Promise<void> {
    const contribution = this.contributions.get(contributionId);
    if (!contribution) {
      throw new Error(`Contribution not found: ${contributionId}`);
    }

    const previousVote = contribution.votes.userVotes.get(userId);

    // Remove previous vote if exists
    if (previousVote) {
      if (previousVote === 'up') contribution.votes.upvotes--;
      if (previousVote === 'down') contribution.votes.downvotes--;
    }

    // Add new vote
    contribution.votes.userVotes.set(userId, vote);
    if (vote === 'up') contribution.votes.upvotes++;
    if (vote === 'down') contribution.votes.downvotes++;

    // Update reputation
    const netVotes = contribution.votes.upvotes - contribution.votes.downvotes;
    contribution.reputation = 50 + Math.min(Math.max(netVotes * 2, -50), 50);

    await this.updateContributionInDatabase(contribution);
    this.emit('contribution_voted', { contribution, vote, userId });
  }

  /**
   * Add feedback to contribution
   */
  async addFeedback(
    contributionId: string,
    userId: string,
    feedbackData: {
      type: 'comment' | 'correction' | 'confirmation' | 'false_positive';
      content: string;
    }
  ): Promise<ContributionFeedback> {
    const contribution = this.contributions.get(contributionId);
    if (!contribution) {
      throw new Error(`Contribution not found: ${contributionId}`);
    }

    const feedback: ContributionFeedback = {
      id: this.generateUUID(),
      userId,
      type: feedbackData.type,
      content: feedbackData.content,
      timestamp: new Date(),
      helpful: 0
    };

    contribution.feedback.push(feedback);
    await this.updateContributionInDatabase(contribution);

    logger.info(`Feedback added to contribution ${contributionId}`);
    this.emit('feedback_added', { contribution, feedback });

    return feedback;
  }

  /**
   * Download contribution
   */
  async downloadContribution(
    contributionId: string,
    userId: string
  ): Promise<CommunityContribution> {
    const contribution = this.contributions.get(contributionId);
    if (!contribution) {
      throw new Error(`Contribution not found: ${contributionId}`);
    }

    // Check access permissions
    if (!await this.canAccessContribution(contribution, userId)) {
      throw new Error('Access denied to this contribution');
    }

    // Increment download counter
    contribution.downloads++;
    await this.updateContributionInDatabase(contribution);

    // Award contributor reputation
    await this.updateContributorReputation(contribution.contributorId, 1);

    this.emit('contribution_downloaded', { contribution, userId });
    return contribution;
  }

  /**
   * Get community statistics
   */
  async getCommunityStatistics(): Promise<CommunityStatistics> {
    const contributions = Array.from(this.contributions.values());

    // Calculate top contributors
    const contributorStats = new Map<string, {
      contributions: number;
      totalReputation: number;
      totalDownloads: number;
    }>();

    for (const contrib of contributions) {
      const stats = contributorStats.get(contrib.contributorId) || {
        contributions: 0,
        totalReputation: 0,
        totalDownloads: 0
      };

      stats.contributions++;
      stats.totalReputation += contrib.reputation;
      stats.totalDownloads += contrib.downloads;

      contributorStats.set(contrib.contributorId, stats);
    }

    const topContributors: ContributorRank[] = Array.from(contributorStats.entries())
      .map(([id, stats]) => ({
        contributorId: id,
        contributorName: 'Anonymous', // Would look up actual name
        contributions: stats.contributions,
        avgReputation: stats.totalReputation / stats.contributions,
        totalDownloads: stats.totalDownloads,
        rank: 0
      }))
      .sort((a, b) => b.contributions - a.contributions)
      .slice(0, 10)
      .map((c, i) => ({ ...c, rank: i + 1 }));

    // Count by type
    const contributionsByType: Record<string, number> = {};
    for (const contrib of contributions) {
      contributionsByType[contrib.type] = (contributionsByType[contrib.type] || 0) + 1;
    }

    return {
      totalContributions: contributions.length,
      activeContributors: contributorStats.size,
      topContributors,
      contributionsByType: contributionsByType as Record<ContributionType, number>,
      avgReputation: contributions.reduce((sum, c) => sum + c.reputation, 0) / contributions.length || 0,
      recentActivity: contributions
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 20)
    };
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  private async parseOpenIOC(xml: string): Promise<OpenIOC> {
    // Parse XML to OpenIOC object
    // This would use an XML parser like xml2js
    logger.debug('Parsing OpenIOC XML...');

    return {
      id: this.generateUUID(),
      version: '1.1',
      created_date: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      short_description: 'Parsed IOC',
      description: 'Parsed from XML',
      author: 'Unknown',
      links: [],
      criteria: {
        operator: 'OR',
        items: []
      }
    };
  }

  private async extractIndicatorsFromIOC(ioc: OpenIOC): Promise<void> {
    logger.debug(`Extracting indicators from IOC: ${ioc.short_description}`);

    for (const indicator of ioc.criteria.items) {
      // Convert OpenIOC indicator to internal format
      // This would integrate with IOC enrichment service
    }
  }

  private convertToOpenIOCIndicator(indicator: {
    type: string;
    value: string;
    description?: string;
  }): OpenIOCIndicator {
    // Map internal IOC types to OpenIOC format
    const documentMapping: Record<string, { document: string; search: string }> = {
      'md5': { document: 'FileItem', search: 'FileItem/Md5sum' },
      'sha1': { document: 'FileItem', search: 'FileItem/Sha1sum' },
      'sha256': { document: 'FileItem', search: 'FileItem/Sha256sum' },
      'ip': { document: 'Network', search: 'Network/IPAddress' },
      'domain': { document: 'Network', search: 'Network/DNS' },
      'url': { document: 'UrlHistoryItem', search: 'UrlHistoryItem/URL' }
    };

    const mapping = documentMapping[indicator.type] || { document: 'FileItem', search: 'FileItem/FullPath' };

    return {
      id: this.generateUUID(),
      condition: 'is',
      document: mapping.document,
      search: mapping.search,
      content: {
        type: 'string',
        value: indicator.value
      }
    };
  }

  private anonymizeContributor(contributorId: string): string {
    // Generate anonymous handle
    const hash = this.simpleHash(contributorId);
    return `Contributor-${hash.substring(0, 8)}`;
  }

  private async getContributorName(contributorId: string): Promise<string> {
    // Look up contributor name from database
    return 'Unknown Contributor';
  }

  private categorizeContribution(type: ContributionType, data: any): string[] {
    const categories: string[] = [type];

    // Add specific categories based on data
    if (data.severity) {
      categories.push(`severity:${data.severity}`);
    }
    if (data.mitre_techniques) {
      categories.push('mitre_mapped');
    }

    return categories;
  }

  private calculateInitialConfidence(data: any): number {
    // Calculate confidence based on data completeness
    let confidence = 0.5;

    if (data.description) confidence += 0.1;
    if (data.mitre_techniques) confidence += 0.1;
    if (data.context) confidence += 0.1;
    if (data.related_iocs) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private matchesQuery(contribution: CommunityContribution, query: string): boolean {
    const lowerQuery = query.toLowerCase();

    // Search in data
    const dataStr = JSON.stringify(contribution.data).toLowerCase();
    if (dataStr.includes(lowerQuery)) return true;

    // Search in tags
    if (contribution.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
      return true;
    }

    return false;
  }

  private async canAccessContribution(contribution: CommunityContribution, userId: string): Promise<boolean> {
    // Check TLP and sharing level permissions
    switch (contribution.sharingLevel) {
      case 'private':
        return contribution.organizationId === await this.getUserOrganization(userId);
      case 'public':
        return true;
      case 'community':
        return await this.isVerifiedUser(userId);
      case 'trusted_partners':
        return await this.isTrustedPartner(userId, contribution.organizationId);
      default:
        return false;
    }
  }

  private async getUserOrganization(userId: string): Promise<string> {
    // Look up user organization
    return 'unknown';
  }

  private async isVerifiedUser(userId: string): Promise<boolean> {
    // Check if user is verified
    return true;
  }

  private async isTrustedPartner(userId: string, orgId: string): Promise<boolean> {
    // Check trusted partner relationship
    return false;
  }

  private async updateContributorReputation(contributorId: string, delta: number): Promise<void> {
    const current = this.contributorReputations.get(contributorId) || 50;
    const updated = Math.min(Math.max(current + delta, 0), 100);
    this.contributorReputations.set(contributorId, updated);

    await this.saveReputationToDatabase(contributorId, updated);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private async loadContributions(): Promise<void> {
    logger.debug('Loading community contributions from database...');
  }

  private async loadReputations(): Promise<void> {
    logger.debug('Loading contributor reputations from database...');
  }

  private async saveContributionToDatabase(contribution: CommunityContribution): Promise<void> {
    logger.debug(`Saving contribution ${contribution.id} to database...`);
  }

  private async updateContributionInDatabase(contribution: CommunityContribution): Promise<void> {
    logger.debug(`Updating contribution ${contribution.id} in database...`);
  }

  private async saveReputationToDatabase(contributorId: string, reputation: number): Promise<void> {
    logger.debug(`Saving reputation for ${contributorId}: ${reputation}`);
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

  async getContribution(contributionId: string): Promise<CommunityContribution | null> {
    return this.contributions.get(contributionId) || null;
  }

  async listContributions(organizationId?: string, limit: number = 100): Promise<CommunityContribution[]> {
    const contributions = Array.from(this.contributions.values());
    const filtered = organizationId
      ? contributions.filter(c => c.organizationId === organizationId)
      : contributions;

    return filtered.slice(0, limit);
  }

  async getContributorReputation(contributorId: string): Promise<number> {
    return this.contributorReputations.get(contributorId) || 50;
  }
}

// Singleton instance
export const communityIntelligenceService = new CommunityIntelligenceService();
