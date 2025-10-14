import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';

// ==========================================
// MULTI-TENANCY TYPES
// ==========================================

export interface Organization {
  id: string;
  name: string;
  slug: string; // URL-friendly identifier
  domain: string; // Primary email domain

  // Subscription & Billing
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  billingEmail: string;
  subscriptionStatus: 'active' | 'suspended' | 'cancelled' | 'trial';
  trialEndsAt?: Date;
  subscriptionEndsAt?: Date;

  // Resource Quotas
  quotas: ResourceQuotas;
  usage: ResourceUsage;

  // Configuration
  settings: OrganizationSettings;
  features: FeatureFlags;

  // Data Isolation
  dataRegion: string; // e.g., 'us-east-1', 'eu-west-1'
  storageClass: 'standard' | 'high_performance' | 'archive';
  retentionDays: number;

  // Security
  allowedIPs?: string[];
  requireMFA: boolean;
  ssoRequired: boolean;
  ssoProviders: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date; // Soft delete

  contactInfo: ContactInfo;
  billingInfo?: BillingInfo;

  // Parent/Child hierarchy for enterprises
  parentOrganizationId?: string;
  childOrganizations: string[];
}

export interface ResourceQuotas {
  // Users
  maxUsers: number;
  maxActiveUsers: number;

  // Data
  maxIOCsPerMonth: number;
  maxEnrichmentsPerMonth: number;
  maxStorageGB: number;
  maxRetentionDays: number;

  // Features
  maxWorkflows: number;
  maxFeeds: number;
  maxIntegrations: number;
  maxDashboards: number;

  // API
  maxAPICallsPerMinute: number;
  maxAPICallsPerDay: number;

  // Advanced Features
  maxInvestigations: number;
  maxCases: number;
  maxThreatActors: number;
  maxCampaigns: number;
}

export interface ResourceUsage {
  period: string; // e.g., '2025-10'

  // Current usage
  activeUsers: number;
  iocsIngested: number;
  enrichmentsPerformed: number;
  storageUsedGB: number;

  // API usage
  apiCallsToday: number;
  apiCallsThisMonth: number;

  // Features
  activeWorkflows: number;
  activeFeeds: number;
  activeIntegrations: number;
  activeDashboards: number;

  // Advanced
  activeInvestigations: number;
  activeCases: number;

  lastUpdated: Date;
}

export interface OrganizationSettings {
  timezone: string;
  dateFormat: string;
  allowGuestAccess: boolean;
  allowAPIAccess: boolean;
  requireApprovalForNewUsers: boolean;
  autoDeactivateInactiveUsers: boolean;
  inactivityThresholdDays: number;
  defaultUserRole: string;
  allowedEmailDomains: string[];
  blockedEmailDomains: string[];
}

export interface FeatureFlags {
  threatIntelligence: boolean;
  hunting: boolean;
  caseManagement: boolean;
  workflows: boolean;
  feeds: boolean;
  stixExport: boolean;
  mispIntegration: boolean;
  communitySharing: boolean;
  advancedAnalytics: boolean;
  mlFeatures: boolean;
  apiAccess: boolean;
  ssoIntegration: boolean;
  auditLogs: boolean;
  complianceReports: boolean;
}

export interface ContactInfo {
  primaryContact: string;
  email: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
}

export interface BillingInfo {
  billingContact: string;
  billingEmail: string;
  paymentMethod?: string;
  taxId?: string;
  currency: string;
}

export interface TenantIsolationContext {
  organizationId: string;
  allowCrossOrganization: boolean;
  canAccessOrganizations: string[];
}

// ==========================================
// MULTI-TENANCY SERVICE
// ==========================================

export class MultiTenancyService extends EventEmitter {
  private isInitialized = false;
  private organizations: Map<string, Organization> = new Map();
  private domainToOrgMap: Map<string, string> = new Map();
  private slugToOrgMap: Map<string, string> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitialized) {return;}

    try {
      logger.info('Initializing Multi-Tenancy Service...');

      await Promise.all([
        this.loadOrganizations(),
        this.initializeQuotaMonitoring()
      ]);

      this.isInitialized = true;
      logger.info('✅ Multi-Tenancy Service initialized');

      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize Multi-Tenancy Service:', error);
      throw error;
    }
  }

  // ==========================================
  // ORGANIZATION MANAGEMENT
  // ==========================================

  /**
   * Create new organization
   */
  async createOrganization(orgData: {
    name: string;
    slug: string;
    domain: string;
    plan: Organization['plan'];
    billingEmail: string;
    contactInfo: ContactInfo;
    dataRegion?: string;
  }): Promise<Organization> {
    try {
      // Validate slug uniqueness
      if (this.slugToOrgMap.has(orgData.slug)) {
        throw new Error(`Organization slug '${orgData.slug}' already exists`);
      }

      // Validate domain uniqueness
      if (this.domainToOrgMap.has(orgData.domain)) {
        throw new Error(`Domain '${orgData.domain}' already registered`);
      }

      logger.info(`Creating organization: ${orgData.name}`);

      const quotas = this.getDefaultQuotasForPlan(orgData.plan);

      const organization: Organization = {
        id: this.generateUUID(),
        name: orgData.name,
        slug: orgData.slug,
        domain: orgData.domain,
        plan: orgData.plan,
        billingEmail: orgData.billingEmail,
        subscriptionStatus: orgData.plan === 'free' ? 'active' : 'trial',
        trialEndsAt: orgData.plan !== 'free'
          ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
          : undefined,
        quotas,
        usage: this.initializeUsage(),
        settings: this.getDefaultSettings(),
        features: this.getFeaturesForPlan(orgData.plan),
        dataRegion: orgData.dataRegion || 'us-east-1',
        storageClass: orgData.plan === 'enterprise' ? 'high_performance' : 'standard',
        retentionDays: orgData.plan === 'enterprise' ? 365 : 90,
        requireMFA: orgData.plan === 'enterprise',
        ssoRequired: false,
        ssoProviders: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        contactInfo: orgData.contactInfo,
        childOrganizations: []
      };

      this.organizations.set(organization.id, organization);
      this.domainToOrgMap.set(organization.domain, organization.id);
      this.slugToOrgMap.set(organization.slug, organization.id);

      await this.saveOrganizationToDatabase(organization);

      logger.info(`✅ Organization created: ${organization.name} (${organization.id})`);
      this.emit('organization_created', organization);

      return organization;
    } catch (error) {
      logger.error('Failed to create organization:', error);
      throw error;
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganization(organizationId: string): Promise<Organization | null> {
    return this.organizations.get(organizationId) || null;
  }

  /**
   * Get organization by domain
   */
  async getOrganizationByDomain(domain: string): Promise<Organization | null> {
    const orgId = this.domainToOrgMap.get(domain);
    return orgId ? this.organizations.get(orgId) || null : null;
  }

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    const orgId = this.slugToOrgMap.get(slug);
    return orgId ? this.organizations.get(orgId) || null : null;
  }

  /**
   * Update organization
   */
  async updateOrganization(
    organizationId: string,
    updates: Partial<Organization>
  ): Promise<Organization> {
    const org = this.organizations.get(organizationId);
    if (!org) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    const updated: Organization = {
      ...org,
      ...updates,
      updatedAt: new Date()
    };

    this.organizations.set(organizationId, updated);
    await this.updateOrganizationInDatabase(updated);

    logger.info(`Organization updated: ${updated.name}`);
    this.emit('organization_updated', updated);

    return updated;
  }

  /**
   * Upgrade/Downgrade plan
   */
  async changePlan(
    organizationId: string,
    newPlan: Organization['plan']
  ): Promise<Organization> {
    const org = this.organizations.get(organizationId);
    if (!org) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    logger.info(`Changing plan for ${org.name}: ${org.plan} → ${newPlan}`);

    const newQuotas = this.getDefaultQuotasForPlan(newPlan);
    const newFeatures = this.getFeaturesForPlan(newPlan);

    const updated = await this.updateOrganization(organizationId, {
      plan: newPlan,
      quotas: newQuotas,
      features: newFeatures,
      subscriptionStatus: 'active'
    });

    this.emit('plan_changed', { organization: updated, oldPlan: org.plan, newPlan });

    return updated;
  }

  // ==========================================
  // RESOURCE QUOTA MANAGEMENT
  // ==========================================

  /**
   * Check if organization can perform action
   */
  async checkQuota(
    organizationId: string,
    resource: keyof ResourceQuotas,
    requestedAmount: number = 1
  ): Promise<{ allowed: boolean; reason?: string; usage?: number; quota?: number }> {
    const org = this.organizations.get(organizationId);
    if (!org) {
      return { allowed: false, reason: 'Organization not found' };
    }

    const quota = org.quotas[resource] as number;
    const usageKey = this.getUsageKeyForQuota(resource);
    const currentUsage = (org.usage[usageKey as keyof ResourceUsage] as number) || 0;

    if (currentUsage + requestedAmount > quota) {
      return {
        allowed: false,
        reason: `Quota exceeded for ${resource}`,
        usage: currentUsage,
        quota
      };
    }

    return { allowed: true, usage: currentUsage, quota };
  }

  /**
   * Increment usage counter
   */
  async incrementUsage(
    organizationId: string,
    resource: keyof ResourceQuotas,
    amount: number = 1
  ): Promise<void> {
    const org = this.organizations.get(organizationId);
    if (!org) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    const usageKey = this.getUsageKeyForQuota(resource);
    const currentUsage = (org.usage[usageKey as keyof ResourceUsage] as number) || 0;

    (org.usage[usageKey as keyof ResourceUsage] as number) = currentUsage + amount;
    org.usage.lastUpdated = new Date();

    await this.updateOrganizationInDatabase(org);

    // Check if approaching quota
    const quota = org.quotas[resource] as number;
    if (currentUsage + amount > quota * 0.8) {
      this.emit('quota_warning', {
        organizationId,
        resource,
        usage: currentUsage + amount,
        quota,
        percentage: ((currentUsage + amount) / quota) * 100
      });
    }
  }

  /**
   * Reset monthly usage counters
   */
  async resetMonthlyUsage(organizationId: string): Promise<void> {
    const org = this.organizations.get(organizationId);
    if (!org) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    const now = new Date();
    org.usage.period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    org.usage.iocsIngested = 0;
    org.usage.enrichmentsPerformed = 0;
    org.usage.apiCallsToday = 0;
    org.usage.apiCallsThisMonth = 0;
    org.usage.lastUpdated = now;

    await this.updateOrganizationInDatabase(org);
    logger.info(`Monthly usage reset for organization: ${org.name}`);
  }

  // ==========================================
  // TENANT ISOLATION
  // ==========================================

  /**
   * Get isolation context for user
   */
  async getIsolationContext(userId: string): Promise<TenantIsolationContext> {
    // Would look up user's organization and permissions
    return {
      organizationId: 'org-123', // From user
      allowCrossOrganization: false,
      canAccessOrganizations: []
    };
  }

  /**
   * Enforce tenant isolation in query
   */
  applyTenantFilter(
    query: any,
    context: TenantIsolationContext
  ): any {
    if (context.allowCrossOrganization) {
      if (context.canAccessOrganizations.length > 0) {
        return {
          ...query,
          organization_id: { $in: context.canAccessOrganizations }
        };
      }
      return query; // Can access all
    }

    return {
      ...query,
      organization_id: context.organizationId
    };
  }

  /**
   * Verify user can access resource
   */
  async verifyAccess(
    userId: string,
    resourceOrganizationId: string
  ): Promise<boolean> {
    const context = await this.getIsolationContext(userId);

    if (context.organizationId === resourceOrganizationId) {
      return true;
    }

    if (context.allowCrossOrganization &&
        context.canAccessOrganizations.includes(resourceOrganizationId)) {
      return true;
    }

    return false;
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  private getDefaultQuotasForPlan(plan: Organization['plan']): ResourceQuotas {
    const quotaTemplates: Record<Organization['plan'], ResourceQuotas> = {
      free: {
        maxUsers: 3,
        maxActiveUsers: 3,
        maxIOCsPerMonth: 1000,
        maxEnrichmentsPerMonth: 500,
        maxStorageGB: 1,
        maxRetentionDays: 30,
        maxWorkflows: 5,
        maxFeeds: 2,
        maxIntegrations: 1,
        maxDashboards: 3,
        maxAPICallsPerMinute: 10,
        maxAPICallsPerDay: 1000,
        maxInvestigations: 10,
        maxCases: 10,
        maxThreatActors: 50,
        maxCampaigns: 20
      },
      starter: {
        maxUsers: 10,
        maxActiveUsers: 10,
        maxIOCsPerMonth: 10000,
        maxEnrichmentsPerMonth: 5000,
        maxStorageGB: 10,
        maxRetentionDays: 90,
        maxWorkflows: 25,
        maxFeeds: 10,
        maxIntegrations: 5,
        maxDashboards: 10,
        maxAPICallsPerMinute: 100,
        maxAPICallsPerDay: 10000,
        maxInvestigations: 100,
        maxCases: 100,
        maxThreatActors: 200,
        maxCampaigns: 100
      },
      professional: {
        maxUsers: 50,
        maxActiveUsers: 50,
        maxIOCsPerMonth: 100000,
        maxEnrichmentsPerMonth: 50000,
        maxStorageGB: 100,
        maxRetentionDays: 180,
        maxWorkflows: 100,
        maxFeeds: 50,
        maxIntegrations: 25,
        maxDashboards: 50,
        maxAPICallsPerMinute: 1000,
        maxAPICallsPerDay: 100000,
        maxInvestigations: 1000,
        maxCases: 1000,
        maxThreatActors: 1000,
        maxCampaigns: 500
      },
      enterprise: {
        maxUsers: -1, // Unlimited
        maxActiveUsers: -1,
        maxIOCsPerMonth: -1,
        maxEnrichmentsPerMonth: -1,
        maxStorageGB: 1000,
        maxRetentionDays: 365,
        maxWorkflows: -1,
        maxFeeds: -1,
        maxIntegrations: -1,
        maxDashboards: -1,
        maxAPICallsPerMinute: -1,
        maxAPICallsPerDay: -1,
        maxInvestigations: -1,
        maxCases: -1,
        maxThreatActors: -1,
        maxCampaigns: -1
      }
    };

    return quotaTemplates[plan];
  }

  private getFeaturesForPlan(plan: Organization['plan']): FeatureFlags {
    const featureTemplates: Record<Organization['plan'], FeatureFlags> = {
      free: {
        threatIntelligence: true,
        hunting: false,
        caseManagement: false,
        workflows: false,
        feeds: true,
        stixExport: false,
        mispIntegration: false,
        communitySharing: true,
        advancedAnalytics: false,
        mlFeatures: false,
        apiAccess: true,
        ssoIntegration: false,
        auditLogs: false,
        complianceReports: false
      },
      starter: {
        threatIntelligence: true,
        hunting: true,
        caseManagement: true,
        workflows: true,
        feeds: true,
        stixExport: true,
        mispIntegration: false,
        communitySharing: true,
        advancedAnalytics: true,
        mlFeatures: false,
        apiAccess: true,
        ssoIntegration: false,
        auditLogs: true,
        complianceReports: false
      },
      professional: {
        threatIntelligence: true,
        hunting: true,
        caseManagement: true,
        workflows: true,
        feeds: true,
        stixExport: true,
        mispIntegration: true,
        communitySharing: true,
        advancedAnalytics: true,
        mlFeatures: true,
        apiAccess: true,
        ssoIntegration: true,
        auditLogs: true,
        complianceReports: true
      },
      enterprise: {
        threatIntelligence: true,
        hunting: true,
        caseManagement: true,
        workflows: true,
        feeds: true,
        stixExport: true,
        mispIntegration: true,
        communitySharing: true,
        advancedAnalytics: true,
        mlFeatures: true,
        apiAccess: true,
        ssoIntegration: true,
        auditLogs: true,
        complianceReports: true
      }
    };

    return featureTemplates[plan];
  }

  private getDefaultSettings(): OrganizationSettings {
    return {
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      allowGuestAccess: false,
      allowAPIAccess: true,
      requireApprovalForNewUsers: true,
      autoDeactivateInactiveUsers: false,
      inactivityThresholdDays: 90,
      defaultUserRole: 'analyst',
      allowedEmailDomains: [],
      blockedEmailDomains: []
    };
  }

  private initializeUsage(): ResourceUsage {
    const now = new Date();
    return {
      period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      activeUsers: 0,
      iocsIngested: 0,
      enrichmentsPerformed: 0,
      storageUsedGB: 0,
      apiCallsToday: 0,
      apiCallsThisMonth: 0,
      activeWorkflows: 0,
      activeFeeds: 0,
      activeIntegrations: 0,
      activeDashboards: 0,
      activeInvestigations: 0,
      activeCases: 0,
      lastUpdated: now
    };
  }

  private getUsageKeyForQuota(quota: keyof ResourceQuotas): string {
    const mapping: Record<string, string> = {
      'maxUsers': 'activeUsers',
      'maxActiveUsers': 'activeUsers',
      'maxIOCsPerMonth': 'iocsIngested',
      'maxEnrichmentsPerMonth': 'enrichmentsPerformed',
      'maxStorageGB': 'storageUsedGB',
      'maxWorkflows': 'activeWorkflows',
      'maxFeeds': 'activeFeeds',
      'maxIntegrations': 'activeIntegrations',
      'maxDashboards': 'activeDashboards',
      'maxAPICallsPerDay': 'apiCallsToday',
      'maxInvestigations': 'activeInvestigations',
      'maxCases': 'activeCases'
    };

    return mapping[quota] || quota;
  }

  private async initializeQuotaMonitoring(): Promise<void> {
    // Start monitoring job for quota enforcement
    setInterval(async () => {
      try {
        for (const org of this.organizations.values()) {
          await this.checkAndEnforceQuotas(org);
        }
      } catch (error) {
        logger.error('Quota monitoring error:', error);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  private async checkAndEnforceQuotas(org: Organization): Promise<void> {
    // Check if organization is over quota
    const overQuota: string[] = [];

    for (const [quota, limit] of Object.entries(org.quotas)) {
      if (limit === -1) continue; // Unlimited

      const usageKey = this.getUsageKeyForQuota(quota as keyof ResourceQuotas);
      const currentUsage = (org.usage[usageKey as keyof ResourceUsage] as number) || 0;

      if (currentUsage > limit) {
        overQuota.push(quota);
      }
    }

    if (overQuota.length > 0) {
      this.emit('quota_exceeded', { organization: org, resources: overQuota });
    }
  }

  private async loadOrganizations(): Promise<void> {
    // Load from database
    logger.debug('Loading organizations from database...');
  }

  private async saveOrganizationToDatabase(org: Organization): Promise<void> {
    logger.debug(`Saving organization ${org.name} to database...`);
  }

  private async updateOrganizationInDatabase(org: Organization): Promise<void> {
    logger.debug(`Updating organization ${org.name} in database...`);
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

  async listOrganizations(): Promise<Organization[]> {
    return Array.from(this.organizations.values());
  }

  async getOrganizationStats(organizationId: string): Promise<{
    quotas: ResourceQuotas;
    usage: ResourceUsage;
    utilization: Record<string, number>;
  }> {
    const org = this.organizations.get(organizationId);
    if (!org) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    const utilization: Record<string, number> = {};
    for (const [quota, limit] of Object.entries(org.quotas)) {
      if (limit === -1) {
        utilization[quota] = 0;
        continue;
      }

      const usageKey = this.getUsageKeyForQuota(quota as keyof ResourceQuotas);
      const currentUsage = (org.usage[usageKey as keyof ResourceUsage] as number) || 0;
      utilization[quota] = (currentUsage / limit) * 100;
    }

    return {
      quotas: org.quotas,
      usage: org.usage,
      utilization
    };
  }
}

// Singleton instance
export const multiTenancyService = new MultiTenancyService();
