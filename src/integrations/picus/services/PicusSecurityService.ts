import { EventEmitter } from 'events';

import { logger } from '../../../shared/utils/logger.js';
import { picusConfigManager, PicusConfig } from '../config/PicusConfig';
import {
  PicusAuthToken,
  PicusThreat,
  PicusAction,
  PicusAgent,
  PicusScenario,
  PicusAPIResponse,
  PicusListParams,
  PicusCreateThreatRequest,
  PicusCreateActionRequest,
  PicusEnrichmentResult,
  PicusIOC,
  PicusIOA,
  PicusActionExecution
} from '../types/PicusTypes';

export class PicusSecurityService extends EventEmitter {
  private config: PicusConfig | null = null;
  private isInitialized = false;
  private tokenRefreshTimer?: NodeJS.Timeout;
  private rateLimitTracker = new Map<string, { count: number; resetAt: number }>();

  constructor(configManager = picusConfigManager) {
    super();
    // Configuration will be loaded during initialize()
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {return;}

    try {
      logger.info('Initializing Picus Security Service...');
      
      // Load configuration
      this.config = await picusConfigManager.initialize();
      
      if (!this.config) {
        logger.warn('Picus Security Service disabled: Configuration not available');
        return;
      }

      // Validate configuration
      if (!picusConfigManager.validateConfig()) {
        logger.error('Picus Security Service disabled: Invalid configuration');
        return;
      }
      
      // Authenticate and get initial token
      if (!this.config.accessToken || picusConfigManager.isAccessTokenExpired()) {
        await this.authenticate();
      }
      
      // Set up token refresh timer
      this.setupTokenRefresh();
      
      // Test connection
      await this.testConnection();
      
      this.isInitialized = true;
      logger.info('✅ Picus Security Service initialized');
      
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize Picus Security Service:', error);
      throw error;
    }
  }

  private async authenticate(): Promise<PicusAuthToken> {
    if (!this.config) {
      throw new Error('Picus configuration not available');
    }

    try {
      logger.debug('Authenticating with Picus Security API...');
      
      // Use refresh token method as per Python example
      const response = await this.makeRequest<{ token: string; expire_at: number }>('/v1/auth/token', {
        method: 'POST',
        body: JSON.stringify({
          refresh_token: this.config.refreshToken
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.success && response.data) {
        const tokenData = response.data;
        const accessToken = tokenData.token;
        const expiresAt = tokenData.expire_at;
        
        // Update configuration manager
        await picusConfigManager.updateAccessToken(accessToken, expiresAt);
        
        // Update local config
        this.config.accessToken = accessToken;
        this.config.tokenExpiresAt = expiresAt;
        
        logger.info('✅ Successfully authenticated with Picus Security API');
        logger.debug(`Token expires at: ${expiresAt} (current: ${Math.floor(Date.now() / 1000)})`);
        
        this.emit('authenticated', { access_token: accessToken, expires_in: expiresAt - Math.floor(Date.now() / 1000) });
        
        return { 
          access_token: accessToken, 
          refresh_token: this.config.refreshToken,
          expires_in: expiresAt - Math.floor(Date.now() / 1000),
          token_type: 'Bearer'
        };
      } else {
        throw new Error(`Authentication failed: ${response.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Picus authentication failed:', error);
      throw error;
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.config.refreshToken) {
      await this.authenticate();
      return;
    }

    try {
      logger.debug('Refreshing Picus access token...');
      
      const response = await this.makeRequest<PicusAuthToken>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: this.config.refreshToken
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.success && response.data) {
        const tokenData = response.data;
        this.config.accessToken = tokenData.access_token;
        this.config.refreshToken = tokenData.refresh_token;
        this.config.tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
        
        logger.debug('Access token refreshed successfully');
        this.emit('tokenRefreshed', tokenData);
      } else {
        logger.warn('Token refresh failed, re-authenticating...');
        await this.authenticate();
      }
    } catch (error) {
      logger.error('Token refresh failed:', error);
      await this.authenticate();
    }
  }

  private setupTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
    }

    // Refresh token 5 minutes before expiry
    const refreshInterval = 55 * 60 * 1000; // 55 minutes
    this.tokenRefreshTimer = setInterval(() => {
      this.refreshAccessToken().catch(error => {
        logger.error('Scheduled token refresh failed:', error);
      });
    }, refreshInterval);
  }

  private async testConnection(): Promise<void> {
    try {
      logger.debug('Testing Picus API connection...');
      
      const response = await this.makeRequest<any>('/agents', {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error(`Connection test failed: ${response.error?.message || 'Unknown error'}`);
      }
      
      logger.debug('Picus API connection test successful');
    } catch (error) {
      logger.error('Picus API connection test failed:', error);
      throw error;
    }
  }

  // Core API Methods

  async createThreatFromIOCs(request: {
    name: string;
    description?: string;
    iocs: Array<{ type: string; value: string; context?: string; confidence?: number }>;
    ioas?: Array<{ type: string; description: string; behavior_pattern: string; mitre_technique?: string }>;
    category?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    mitre_techniques?: string[];
    tags?: string[];
  }): Promise<PicusThreat> {
    try {
      logger.info(`Creating Picus threat from IOCs: ${request.name}`);
      
      // Convert ThreatFlow IOCs to Picus format
      const picusIOCs: Omit<PicusIOC, 'id'>[] = request.iocs.map(ioc => ({
        type: this.mapToPicusIOCType(ioc.type),
        value: ioc.value,
        context: ioc.context,
        confidence: ioc.confidence || 0.7,
        tags: []
      }));

      // Convert IOAs if provided
      const picusIOAs: Omit<PicusIOA, 'id'>[] = request.ioas?.map(ioa => ({
        type: this.mapToPicusIOAType(ioa.type),
        description: ioa.description,
        behavior_pattern: ioa.behavior_pattern,
        mitre_technique: ioa.mitre_technique || 'T1001',
        confidence: 0.8,
        tags: []
      })) || [];

      const createRequest: PicusCreateThreatRequest = {
        name: request.name,
        description: request.description,
        category: request.category || 'custom',
        severity: request.severity || 'medium',
        mitre_attack_techniques: request.mitre_techniques || [],
        tags: request.tags || [],
        iocs: picusIOCs,
        ioas: picusIOAs
      };

      const response = await this.makeRequest<PicusThreat>('/threats', {
        method: 'POST',
        body: JSON.stringify(createRequest),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      if (response.success && response.data) {
        logger.info(`Successfully created Picus threat: ${response.data.id}`);
        this.emit('threatCreated', response.data);
        return response.data;
      } else {
        throw new Error(`Failed to create threat: ${response.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Error creating Picus threat from IOCs:', error);
      throw error;
    }
  }

  async createValidationAction(request: {
    name: string;
    description?: string;
    threatId: string;
    targetAgents: string[];
    simulationMode?: 'safe' | 'live';
    schedule?: 'immediate' | 'delayed';
    notifyOnCompletion?: boolean;
  }): Promise<PicusAction> {
    try {
      logger.info(`Creating Picus validation action: ${request.name}`);
      
      const createRequest: PicusCreateActionRequest = {
        name: request.name,
        description: request.description,
        action_type: 'threat_simulation',
        threat_id: request.threatId,
        target_agents: request.targetAgents,
        parameters: {
          simulation_mode: request.simulationMode || 'safe',
          target_environment: 'production',
          notification_settings: {
            on_completion: request.notifyOnCompletion || true,
            on_failure: true,
            recipients: []
          }
        },
        schedule: request.schedule === 'immediate' ? {
          type: 'immediate'
        } : {
          type: 'scheduled',
          start_time: new Date(Date.now() + 60000).toISOString() // 1 minute from now
        }
      };

      const response = await this.makeRequest<PicusAction>('/actions', {
        method: 'POST',
        body: JSON.stringify(createRequest),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      if (response.success && response.data) {
        logger.info(`Successfully created Picus action: ${response.data.id}`);
        this.emit('actionCreated', response.data);
        return response.data;
      } else {
        throw new Error(`Failed to create action: ${response.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Error creating Picus validation action:', error);
      throw error;
    }
  }

  async enrichIOCsWithPicus(iocs: Array<{ type: string; value: string; context?: string }>): Promise<PicusEnrichmentResult> {
    try {
      logger.info(`Enriching ${iocs.length} IOCs with Picus intelligence`);
      
      // Create temporary threat for validation
      const tempThreat = await this.createThreatFromIOCs({
        name: `ThreatFlow_Enrichment_${Date.now()}`,
        description: 'Temporary threat for IOC enrichment',
        iocs,
        category: 'enrichment',
        severity: 'medium'
      });

      // Search for similar threats
      const similarThreats = await this.findSimilarThreats(tempThreat.id);
      
      // Get validation recommendations
      const recommendations = await this.getRecommendationsForThreat(tempThreat.id);
      
      // Analyze security control coverage
      const detectionCoverage = await this.analyzeDetectionCoverage(tempThreat.mitre_attack_techniques);
      
      const enrichmentResult: PicusEnrichmentResult = {
        source: 'picus',
        threat_validation: {
          is_validated: true,
          validation_score: this.calculateValidationScore(tempThreat),
          validation_date: new Date().toISOString()
        },
        recommended_actions: recommendations,
        similar_threats: similarThreats,
        security_controls_bypassed: [],
        detection_coverage: detectionCoverage
      };

      // Clean up temporary threat
      await this.deleteThreat(tempThreat.id);
      
      logger.info(`IOC enrichment completed with ${similarThreats.length} similar threats found`);
      this.emit('enrichmentCompleted', { iocs, result: enrichmentResult });
      
      return enrichmentResult;
    } catch (error) {
      logger.error('Error enriching IOCs with Picus:', error);
      throw error;
    }
  }

  // Threat Management Methods

  async getThreats(params?: PicusListParams): Promise<PicusAPIResponse<PicusThreat[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) {queryParams.append('page', params.page.toString());}
      if (params?.limit) {queryParams.append('limit', params.limit.toString());}
      if (params?.sort_by) {queryParams.append('sort_by', params.sort_by);}
      if (params?.sort_order) {queryParams.append('sort_order', params.sort_order);}
      if (params?.search) {queryParams.append('search', params.search);}

      const response = await this.makeRequest<PicusThreat[]>(`/threats?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      return response;
    } catch (error) {
      logger.error('Error getting Picus threats:', error);
      throw error;
    }
  }

  async getThreat(threatId: string): Promise<PicusThreat | null> {
    try {
      const response = await this.makeRequest<PicusThreat>(`/threats/${threatId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      return response.success ? response.data || null : null;
    } catch (error) {
      logger.error('Error getting Picus threat:', error);
      throw error;
    }
  }

  async updateThreat(threatId: string, updates: Partial<PicusCreateThreatRequest>): Promise<PicusThreat> {
    try {
      const response = await this.makeRequest<PicusThreat>(`/threats/${threatId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      if (response.success && response.data) {
        this.emit('threatUpdated', response.data);
        return response.data;
      } else {
        throw new Error(`Failed to update threat: ${response.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Error updating Picus threat:', error);
      throw error;
    }
  }

  async deleteThreat(threatId: string): Promise<void> {
    try {
      const response = await this.makeRequest<void>(`/threats/${threatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      if (response.success) {
        this.emit('threatDeleted', threatId);
      } else {
        throw new Error(`Failed to delete threat: ${response.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Error deleting Picus threat:', error);
      throw error;
    }
  }

  // Action Management Methods

  async getActions(params?: PicusListParams): Promise<PicusAPIResponse<PicusAction[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) {queryParams.append('page', params.page.toString());}
      if (params?.limit) {queryParams.append('limit', params.limit.toString());}
      if (params?.sort_by) {queryParams.append('sort_by', params.sort_by);}
      if (params?.sort_order) {queryParams.append('sort_order', params.sort_order);}

      const response = await this.makeRequest<PicusAction[]>(`/actions?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      return response;
    } catch (error) {
      logger.error('Error getting Picus actions:', error);
      throw error;
    }
  }

  async getAction(actionId: string): Promise<PicusAction | null> {
    try {
      const response = await this.makeRequest<PicusAction>(`/actions/${actionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      return response.success ? response.data || null : null;
    } catch (error) {
      logger.error('Error getting Picus action:', error);
      throw error;
    }
  }

  async executeAction(actionId: string): Promise<PicusActionExecution> {
    try {
      logger.info(`Executing Picus action: ${actionId}`);
      
      const response = await this.makeRequest<PicusActionExecution>(`/actions/${actionId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      if (response.success && response.data) {
        logger.info(`Successfully executed Picus action: ${actionId}`);
        this.emit('actionExecuted', response.data);
        return response.data;
      } else {
        throw new Error(`Failed to execute action: ${response.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Error executing Picus action:', error);
      throw error;
    }
  }

  // Agent Management Methods

  async getAgents(params?: PicusListParams): Promise<PicusAPIResponse<PicusAgent[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) {queryParams.append('page', params.page.toString());}
      if (params?.limit) {queryParams.append('limit', params.limit.toString());}
      if (params?.search) {queryParams.append('search', params.search);}

      const response = await this.makeRequest<PicusAgent[]>(`/agents?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      return response;
    } catch (error) {
      logger.error('Error getting Picus agents:', error);
      throw error;
    }
  }

  async getAvailableAgents(): Promise<PicusAgent[]> {
    try {
      const response = await this.getAgents({ limit: 100 });
      return response.data?.filter(agent => agent.status === 'online') || [];
    } catch (error) {
      logger.error('Error getting available Picus agents:', error);
      return [];
    }
  }

  // Scenario Management Methods

  async getScenarios(params?: PicusListParams): Promise<PicusAPIResponse<PicusScenario[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) {queryParams.append('page', params.page.toString());}
      if (params?.limit) {queryParams.append('limit', params.limit.toString());}
      if (params?.search) {queryParams.append('search', params.search);}

      const response = await this.makeRequest<PicusScenario[]>(`/scenarios?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      return response;
    } catch (error) {
      logger.error('Error getting Picus scenarios:', error);
      throw error;
    }
  }

  // Helper Methods

  private async findSimilarThreats(threatId: string): Promise<Array<{ threat_id: string; name: string; similarity_score: number; common_iocs: number; common_techniques: string[] }>> {
    try {
      const response = await this.makeRequest<any>(`/threats/${threatId}/similar`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      return response.data?.similar_threats || [];
    } catch (error) {
      logger.debug('Similar threats endpoint not available or failed');
      return [];
    }
  }

  private async getRecommendationsForThreat(threatId: string): Promise<any[]> {
    try {
      const response = await this.makeRequest<any>(`/threats/${threatId}/recommendations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      return response.data?.recommendations || [];
    } catch (error) {
      logger.debug('Recommendations endpoint not available or failed');
      return [];
    }
  }

  private async analyzeDetectionCoverage(techniques: string[]): Promise<any> {
    // Mock implementation - would call actual Picus API
    return {
      total_techniques: techniques.length,
      covered_techniques: Math.floor(techniques.length * 0.8),
      coverage_percentage: 80,
      gaps: techniques.slice(0, Math.floor(techniques.length * 0.2)).map(technique => ({
        technique,
        description: `Detection gap for ${technique}`,
        risk_level: 'medium'
      }))
    };
  }

  private calculateValidationScore(threat: PicusThreat): number {
    let score = 0.5; // Base score
    
    // Add score based on IOCs
    score += Math.min(0.3, threat.iocs.length * 0.05);
    
    // Add score based on MITRE techniques
    score += Math.min(0.2, threat.mitre_attack_techniques.length * 0.02);
    
    // Add score based on severity
    const severityScores = { 'low': 0.1, 'medium': 0.2, 'high': 0.3, 'critical': 0.4 };
    score += severityScores[threat.severity] || 0.1;
    
    return Math.min(1.0, score);
  }

  private mapToPicusIOCType(threatFlowType: string): any {
    const typeMapping: Record<string, string> = {
      'ip-addr': 'ip_address',
      'domain-name': 'domain',
      'url': 'url',
      'file-hash-md5': 'file_hash_md5',
      'file-hash-sha1': 'file_hash_sha1',
      'file-hash-sha256': 'file_hash_sha256',
      'email-addr': 'email_address',
      'file-path': 'file_path',
      'registry-key': 'registry_key',
      'process-name': 'process_name',
      'mutex': 'mutex'
    };
    
    return typeMapping[threatFlowType] || 'file_hash_sha256';
  }

  private mapToPicusIOAType(threatFlowType: string): any {
    const typeMapping: Record<string, string> = {
      'network-traffic': 'network_connection',
      'file': 'file_creation',
      'windows-registry-key': 'registry_modification',
      'process': 'process_execution',
      'service': 'service_installation'
    };
    
    return typeMapping[threatFlowType] || 'process_execution';
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit): Promise<PicusAPIResponse<T>> {
    try {
      // Check rate limiting
      await this.checkRateLimit(endpoint);
      
      const url = `${this.config.baseUrl}${endpoint}`;
      
      logger.debug(`Making Picus API request: ${options.method} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'ThreatFlow/2.0',
          ...options.headers
        }
      });

      // Update rate limit tracking
      this.updateRateLimitTracker(endpoint, response);
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: {
            code: response.status.toString(),
            message: data.message || response.statusText,
            details: data
          }
        };
      }
      
      return {
        success: true,
        data: data as T
      };
    } catch (error) {
      logger.error(`Picus API request failed for ${endpoint}:`, error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
          details: error
        }
      };
    }
  }

  private async checkRateLimit(endpoint: string): Promise<void> {
    const now = Date.now();
    const key = endpoint.split('?')[0]; // Remove query parameters for rate limiting
    const limit = this.rateLimitTracker.get(key);
    
    if (limit && limit.resetAt > now && limit.count >= 100) { // 100 requests per minute default
      const waitTime = limit.resetAt - now;
      logger.warn(`Rate limit exceeded for ${key}, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  private updateRateLimitTracker(endpoint: string, response: Response): void {
    const key = endpoint.split('?')[0];
    const now = Date.now();
    const resetTime = now + 60000; // Reset after 1 minute
    
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    
    if (remaining && reset) {
      this.rateLimitTracker.set(key, {
        count: 100 - parseInt(remaining),
        resetAt: parseInt(reset) * 1000
      });
    } else {
      // Fallback rate limiting
      const current = this.rateLimitTracker.get(key) || { count: 0, resetAt: resetTime };
      if (current.resetAt <= now) {
        current.count = 1;
        current.resetAt = resetTime;
      } else {
        current.count++;
      }
      this.rateLimitTracker.set(key, current);
    }
  }

  // Cleanup methods

  async shutdown(): Promise<void> {
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
    }
    
    this.removeAllListeners();
    this.isInitialized = false;
    
    logger.info('Picus Security Service shut down');
  }

  // Public getters

  get isConnected(): boolean {
    return this.isInitialized && !!this.config.accessToken;
  }

  get tokenExpiresAt(): string | undefined {
    return this.config.tokenExpiresAt;
  }
}

export const createPicusSecurityService = (): PicusSecurityService => {
  return new PicusSecurityService();
};

// Backward compatibility - accept config but ignore it
export const createPicusSecurityServiceWithConfig = (config?: any): PicusSecurityService => {
  logger.warn('createPicusSecurityServiceWithConfig is deprecated - configuration is now managed automatically');
  return new PicusSecurityService();
};

// Create a singleton instance with default configuration
const defaultConfig: PicusConfig = {
  baseUrl: process.env.PICUS_BASE_URL || 'https://your-picus-instance.picussecurity.com',
  accessToken: process.env.PICUS_API_TOKEN,
  clientId: process.env.PICUS_CLIENT_ID,
  clientSecret: process.env.PICUS_CLIENT_SECRET,
};

export const picusSecurityService = new PicusSecurityService(defaultConfig);