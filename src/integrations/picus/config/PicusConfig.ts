import { logger } from '../../../shared/utils/logger';

export interface PicusConfig {
  baseUrl: string;
  refreshToken: string;
  accessToken?: string;
  tokenExpiresAt?: number;
  clientId?: string;
  clientSecret?: string;
  enabled: boolean;
}

export interface PicusTokenData {
  refresh_token: string;
  access_token?: string;
  timestamp: number;
  created_at: string;
  expires_at?: number;
}

export class PicusConfigManager {
  private static instance: PicusConfigManager;
  private tokenFile: string = 'picus-tokens.json';
  private config: PicusConfig | null = null;

  private constructor() {}

  static getInstance(): PicusConfigManager {
    if (!PicusConfigManager.instance) {
      PicusConfigManager.instance = new PicusConfigManager();
    }
    return PicusConfigManager.instance;
  }

  /**
   * Initialize Picus configuration from environment variables and token file
   */
  async initialize(): Promise<PicusConfig | null> {
    try {
      // Get base configuration from environment
      const baseUrl = process.env.PICUS_BASE_URL || process.env.PICUS_API_URL;
      
      if (!baseUrl) {
        logger.warn('Picus integration disabled: PICUS_BASE_URL not configured');
        return null;
      }

      // Clean up base URL
      const cleanBaseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes

      // Get refresh token from environment or token file
      let refreshToken = process.env.PICUS_REFRESH_TOKEN;
      let tokenData: PicusTokenData | null = null;

      if (!refreshToken) {
        tokenData = await this.loadTokensFromFile();
        if (tokenData) {
          refreshToken = tokenData.refresh_token;
        }
      }

      if (!refreshToken || refreshToken === 'your_refresh_token_here') {
        logger.error('Picus integration disabled: No valid refresh token found');
        logger.info('Please configure PICUS_REFRESH_TOKEN environment variable or update picus-tokens.json');
        await this.createDefaultTokenFile();
        return null;
      }

      this.config = {
        baseUrl: cleanBaseUrl,
        refreshToken,
        accessToken: tokenData?.access_token,
        tokenExpiresAt: tokenData?.expires_at,
        clientId: process.env.PICUS_CLIENT_ID,
        clientSecret: process.env.PICUS_CLIENT_SECRET,
        enabled: true,
      };

      logger.info('✅ Picus configuration initialized successfully');
      logger.debug(`Picus Base URL: ${cleanBaseUrl}`);
      
      return this.config;

    } catch (error) {
      logger.error('Failed to initialize Picus configuration:', error);
      return null;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): PicusConfig | null {
    return this.config;
  }

  /**
   * Update access token and expiration
   */
  async updateAccessToken(accessToken: string, expiresAt: number): Promise<void> {
    if (!this.config) {
      throw new Error('Picus configuration not initialized');
    }

    this.config.accessToken = accessToken;
    this.config.tokenExpiresAt = expiresAt;

    // Save to file
    await this.saveTokensToFile({
      refresh_token: this.config.refreshToken,
      access_token: accessToken,
      expires_at: expiresAt,
      timestamp: Date.now(),
      created_at: new Date().toISOString(),
    });

    logger.debug('✅ Picus access token updated and saved');
  }

  /**
   * Update refresh token (when regenerated)
   */
  async updateRefreshToken(refreshToken: string): Promise<void> {
    if (!this.config) {
      throw new Error('Picus configuration not initialized');
    }

    this.config.refreshToken = refreshToken;

    // Save to file
    await this.saveTokensToFile({
      refresh_token: refreshToken,
      access_token: this.config.accessToken,
      expires_at: this.config.tokenExpiresAt,
      timestamp: Date.now(),
      created_at: new Date().toISOString(),
    });

    logger.info('✅ Picus refresh token updated and saved');
  }

  /**
   * Check if access token is expired
   */
  isAccessTokenExpired(): boolean {
    if (!this.config || !this.config.tokenExpiresAt) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000); // Unix timestamp
    return currentTime >= this.config.tokenExpiresAt;
  }

  /**
   * Check if refresh token is older than 6 months
   */
  async isRefreshTokenExpired(): Promise<boolean> {
    try {
      const tokenData = await this.loadTokensFromFile();
      if (!tokenData) {
        return true;
      }

      const tokenAge = Date.now() - tokenData.timestamp;
      const sixMonthsInMs = 180 * 24 * 60 * 60 * 1000; // 180 days

      return tokenAge > sixMonthsInMs;
    } catch {
      return true;
    }
  }

  /**
   * Load tokens from JSON file
   */
  private async loadTokensFromFile(): Promise<PicusTokenData | null> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const tokenFilePath = path.join(process.cwd(), this.tokenFile);
      
      if (!(await this.fileExists(tokenFilePath))) {
        return null;
      }

      const fileContent = await fs.readFile(tokenFilePath, 'utf-8');
      const tokenData = JSON.parse(fileContent);

      // Validate token data structure
      if (!tokenData.refresh_token || !tokenData.timestamp) {
        logger.warn('Invalid token file structure');
        return null;
      }

      return tokenData;

    } catch (error) {
      logger.warn('Error loading tokens from file:', error);
      return null;
    }
  }

  /**
   * Save tokens to JSON file
   */
  private async saveTokensToFile(tokenData: PicusTokenData): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const tokenFilePath = path.join(process.cwd(), this.tokenFile);
      
      await fs.writeFile(tokenFilePath, JSON.stringify(tokenData, null, 2), 'utf-8');
      
      // Set restrictive file permissions (owner read/write only)
      try {
        await fs.chmod(tokenFilePath, 0o600);
      } catch (chmodError) {
        logger.warn('Could not set restrictive permissions on token file:', chmodError);
      }

    } catch (error) {
      logger.error('Error saving tokens to file:', error);
      throw error;
    }
  }

  /**
   * Create default token file with example structure
   */
  private async createDefaultTokenFile(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const tokenFilePath = path.join(process.cwd(), this.tokenFile);
      
      // Don't overwrite existing file
      if (await this.fileExists(tokenFilePath)) {
        return;
      }

      const defaultTokenData: PicusTokenData = {
        refresh_token: 'your_refresh_token_here',
        timestamp: Date.now(),
        created_at: new Date().toISOString(),
      };

      await fs.writeFile(tokenFilePath, JSON.stringify(defaultTokenData, null, 2), 'utf-8');
      
      // Set restrictive permissions
      try {
        await fs.chmod(tokenFilePath, 0o600);
      } catch (chmodError) {
        logger.warn('Could not set restrictive permissions on token file:', chmodError);
      }

      logger.info(`📋 Default Picus token file created: ${this.tokenFile}`);
      logger.info('⚠️  Please update the refresh_token in the file with your real token!');

    } catch (error) {
      logger.error('Error creating default token file:', error);
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate Picus configuration
   */
  validateConfig(): boolean {
    if (!this.config) {
      return false;
    }

    const required = ['baseUrl', 'refreshToken'];
    const missing = required.filter(key => !this.config![key as keyof PicusConfig]);

    if (missing.length > 0) {
      logger.error(`Picus configuration missing required fields: ${missing.join(', ')}`);
      return false;
    }

    // Check for placeholder values
    if (this.config.refreshToken === 'your_refresh_token_here') {
      logger.error('Picus refresh token is still using placeholder value');
      return false;
    }

    // Validate base URL format
    try {
      new URL(this.config.baseUrl);
    } catch {
      logger.error('Picus base URL is not a valid URL');
      return false;
    }

    return true;
  }

  /**
   * Get configuration summary for debugging
   */
  getConfigSummary(): any {
    if (!this.config) {
      return { enabled: false, reason: 'Not initialized' };
    }

    return {
      enabled: this.config.enabled,
      baseUrl: this.config.baseUrl,
      hasRefreshToken: !!this.config.refreshToken && this.config.refreshToken !== 'your_refresh_token_here',
      hasAccessToken: !!this.config.accessToken,
      tokenExpired: this.isAccessTokenExpired(),
      configValid: this.validateConfig(),
    };
  }
}

// Export singleton instance
export const picusConfigManager = PicusConfigManager.getInstance();