import { z } from 'zod';

import { AI_MODELS, DEFAULT_AI_MODELS, NETWORK, SECURITY } from '../../constants/AppConstants';

// Configuration validation schemas
const DatabaseConfigSchema = z.object({
  url: z.string().url(),
  poolMin: z.number().min(1).default(5),
  poolMax: z.number().min(1).default(20),
  connectionTimeout: z.number().min(1000).default(30000),
  idleTimeout: z.number().min(1000).default(10000),
});

const AuthConfigSchema = z.object({
  jwtSecret: z.string().min(32),
  jwtExpiresIn: z.string().default(SECURITY.JWT.ACCESS_TOKEN_EXPIRY),
  jwtRefreshExpiresIn: z.string().default(SECURITY.JWT.REFRESH_TOKEN_EXPIRY),
  bcryptRounds: z.number().min(8).max(15).default(SECURITY.BCRYPT.ROUNDS),
  sessionSecret: z.string().min(32),
});

const AIProviderConfigSchema = z.object({
  anthropic: z.object({
    apiKey: z.string().optional(),
    model: z.string().default(AI_MODELS.CLAUDE.SONNET_3_5),
    baseUrl: z.string().url().default(NETWORK.HOSTS.APIS.ANTHROPIC),
  }),
  openai: z.object({
    apiKey: z.string().optional(),
    model: z.string().default(AI_MODELS.OPENAI.GPT_4O),
    baseUrl: z.string().url().default(NETWORK.HOSTS.APIS.OPENAI),
  }),
  ollama: z.object({
    baseUrl: z.string().url().default(`http://localhost:${NETWORK.PORTS.DEVELOPMENT.OLLAMA}`),
    model: z.string().default(AI_MODELS.OLLAMA.LLAMA_3_2_VISION),
  }),
  openrouter: z.object({
    apiKey: z.string().optional(),
    model: z.string().default('anthropic/claude-3.5-sonnet'),
    baseUrl: z.string().url().default(NETWORK.HOSTS.APIS.OPENROUTER),
  }),
});

const ServerConfigSchema = z.object({
  port: z.number().min(1).max(65535).default(NETWORK.PORTS.DEVELOPMENT.BACKEND),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  corsOrigins: z.array(z.string()).default([
    `http://localhost:${NETWORK.PORTS.DEVELOPMENT.FRONTEND[0]}`,
    `http://localhost:${NETWORK.PORTS.DEVELOPMENT.FRONTEND[1]}`, 
    'http://localhost:3000',
    `http://127.0.0.1:${NETWORK.PORTS.DEVELOPMENT.FRONTEND[0]}`,
    `http://127.0.0.1:${NETWORK.PORTS.DEVELOPMENT.FRONTEND[1]}`,
    'http://127.0.0.1:3000'
  ]),
  maxRequestSize: z.string().default('10mb'),
});

const SecurityConfigSchema = z.object({
  rateLimits: z.object({
    articles: z.number().default(10),
    images: z.number().default(50),
    streaming: z.number().default(5),
  }),
  maxSizes: z.object({
    article: z.number().default(5242880), // 5MB
    image: z.number().default(3145728),   // 3MB
    request: z.string().default('10mb'),
  }),
});

const ConfigSchema = z.object({
  database: DatabaseConfigSchema.optional(),
  auth: AuthConfigSchema.optional(),
  aiProviders: AIProviderConfigSchema,
  server: ServerConfigSchema,
  security: SecurityConfigSchema,
});

export type AppConfig = z.infer<typeof ConfigSchema>;

/**
 * Centralized configuration service with type safety and validation
 * Replaces scattered environment variable access throughout the codebase
 */
class ConfigurationService {
  private config: AppConfig | null = null;
  private static instance: ConfigurationService;

  private constructor() {}

  static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }

  /**
   * Load and validate configuration from environment variables
   * @throws {Error} If configuration is invalid
   */
  load(): AppConfig {
    if (this.config) {
      return this.config;
    }

    const rawConfig = {
      database: process.env.DATABASE_URL ? {
        url: process.env.DATABASE_URL,
        poolMin: parseInt(process.env.DB_POOL_MIN || '5'),
        poolMax: parseInt(process.env.DB_POOL_MAX || '20'),
        connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
        idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '10000'),
      } : undefined,

      auth: (process.env.JWT_SECRET && process.env.SESSION_SECRET) ? {
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || SECURITY.JWT.ACCESS_TOKEN_EXPIRY,
        jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || SECURITY.JWT.REFRESH_TOKEN_EXPIRY,
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || SECURITY.BCRYPT.ROUNDS.toString()),
        sessionSecret: process.env.SESSION_SECRET,
      } : undefined,

      aiProviders: {
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: process.env.CLAUDE_MODEL || DEFAULT_AI_MODELS.claude,
        },
        openai: {
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL || DEFAULT_AI_MODELS.openai,
        },
        ollama: {
          baseUrl: process.env.OLLAMA_BASE_URL || `http://localhost:${NETWORK.PORTS.DEVELOPMENT.OLLAMA}`,
          model: process.env.OLLAMA_MODEL || DEFAULT_AI_MODELS.ollama,
        },
        openrouter: {
          apiKey: process.env.OPENROUTER_API_KEY,
          model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
        },
      },

      server: {
        port: parseInt(process.env.PORT || NETWORK.PORTS.DEVELOPMENT.BACKEND.toString()),
        nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
        corsOrigins: process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [
          `http://localhost:${NETWORK.PORTS.DEVELOPMENT.FRONTEND[0]}`,
          `http://localhost:${NETWORK.PORTS.DEVELOPMENT.FRONTEND[1]}`,
          'http://localhost:3000',
          `http://127.0.0.1:${NETWORK.PORTS.DEVELOPMENT.FRONTEND[0]}`,
          `http://127.0.0.1:${NETWORK.PORTS.DEVELOPMENT.FRONTEND[1]}`,
          'http://127.0.0.1:3000'
        ],
        maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
      },

      security: {
        rateLimits: {
          articles: parseInt(process.env.RATE_LIMIT_ARTICLES || '10'),
          images: parseInt(process.env.RATE_LIMIT_IMAGES || '50'),
          streaming: parseInt(process.env.RATE_LIMIT_STREAMING || '5'),
        },
        maxSizes: {
          article: parseInt(process.env.MAX_ARTICLE_SIZE || '5242880'),
          image: parseInt(process.env.MAX_IMAGE_SIZE || '3145728'),
          request: process.env.MAX_REQUEST_SIZE || '10mb',
        },
      },
    };

    try {
      this.config = ConfigSchema.parse(rawConfig);
      return this.config;
    } catch (error) {
      console.error('❌ Configuration validation failed:', error);
      throw new Error(`Invalid configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get validated configuration
   * @throws {Error} If configuration not loaded
   */
  get(): AppConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }

  // Convenience getters
  getDatabaseConfig() { return this.get().database; }
  getAuthConfig() { return this.get().auth; }
  getAIProvidersConfig() { return this.get().aiProviders; }
  getServerConfig() { return this.get().server; }
  getSecurityConfig() { return this.get().security; }

  /**
   * Validate that required API keys are present
   */
  validateApiKeys(): { valid: boolean; missing: string[]; warnings: string[] } {
    const config = this.get();
    const missing: string[] = [];
    const warnings: string[] = [];

    // Check for at least one AI provider
    const hasAnyApiKey = Boolean(
      config.aiProviders.anthropic.apiKey ||
      config.aiProviders.openai.apiKey ||
      config.aiProviders.openrouter.apiKey
    );

    if (!hasAnyApiKey) {
      missing.push('At least one AI provider API key (ANTHROPIC_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY)');
    }

    // Enterprise features warnings
    if (!config.database) {
      warnings.push('DATABASE_URL not configured - enterprise features disabled');
    }

    if (!config.auth) {
      warnings.push('JWT_SECRET/SESSION_SECRET not configured - authentication disabled');
    }

    return {
      valid: missing.length === 0,
      missing,
      warnings
    };
  }

  /**
   * Check if enterprise mode is enabled (requires database and auth)
   */
  isEnterpriseMode(): boolean {
    const config = this.get();
    return Boolean(config.database && config.auth);
  }

  /**
   * Get CORS origins for server configuration
   */
  getCorsOrigins(): string[] {
    return this.getServerConfig().corsOrigins;
  }

  /**
   * Get available AI providers with API keys
   */
  getAvailableProviders(): Array<'anthropic' | 'openai' | 'openrouter' | 'ollama'> {
    const config = this.getAIProvidersConfig();
    const available: Array<'anthropic' | 'openai' | 'openrouter' | 'ollama'> = [];

    if (config.anthropic.apiKey) {available.push('anthropic');}
    if (config.openai.apiKey) {available.push('openai');}
    if (config.openrouter.apiKey) {available.push('openrouter');}
    // Ollama is always available if running locally
    available.push('ollama');

    return available;
  }
}

export const configService = ConfigurationService.getInstance();

// Export for testing and direct usage
export { ConfigurationService };

// Type helpers for consuming code
export type AIProvider = keyof AppConfig['aiProviders'];
export type NodeEnvironment = AppConfig['server']['nodeEnv'];