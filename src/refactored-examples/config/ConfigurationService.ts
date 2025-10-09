// CENTRALIZED CONFIGURATION SERVICE - Replace hardcoded values throughout codebase
import { z } from 'zod';

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
  jwtExpiresIn: z.string().default('15m'),
  jwtRefreshExpiresIn: z.string().default('7d'),
  bcryptRounds: z.number().min(8).max(15).default(12),
  sessionSecret: z.string().min(32),
});

const AIProviderConfigSchema = z.object({
  anthropic: z.object({
    apiKey: z.string().optional(),
    model: z.string().default('claude-sonnet-4-20250514'),
    baseUrl: z.string().url().default('https://api.anthropic.com'),
  }),
  openai: z.object({
    apiKey: z.string().optional(),
    model: z.string().default('gpt-4o'),
    baseUrl: z.string().url().default('https://api.openai.com'),
  }),
  ollama: z.object({
    baseUrl: z.string().url().default('http://localhost:11434'),
    model: z.string().default('llama3.2-vision:latest'),
  }),
  openrouter: z.object({
    apiKey: z.string().optional(),
    model: z.string().default('anthropic/claude-3.5-sonnet'),
    baseUrl: z.string().url().default('https://openrouter.ai'),
  }),
});

const ServerConfigSchema = z.object({
  port: z.number().min(1).max(65535).default(3001),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  corsOrigins: z.array(z.string()).default([
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
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
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
        jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
        sessionSecret: process.env.SESSION_SECRET,
      } : undefined,

      aiProviders: {
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
        },
        openai: {
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL || 'gpt-4o',
        },
        ollama: {
          baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          model: process.env.OLLAMA_MODEL || 'llama3.2-vision:latest',
        },
        openrouter: {
          apiKey: process.env.OPENROUTER_API_KEY,
          model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
        },
      },

      server: {
        port: parseInt(process.env.PORT || '3001'),
        nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
        corsOrigins: process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:3000',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:5174',
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
      console.error('Configuration validation failed:', error);
      throw new Error(`Invalid configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

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

  // Validation helpers
  validateApiKeys(): { valid: boolean; missing: string[] } {
    const config = this.get();
    const missing: string[] = [];

    if (!config.aiProviders.anthropic.apiKey) missing.push('ANTHROPIC_API_KEY');
    if (!config.aiProviders.openai.apiKey) missing.push('OPENAI_API_KEY');
    if (!config.aiProviders.openrouter.apiKey) missing.push('OPENROUTER_API_KEY');

    return {
      valid: missing.length === 0,
      missing
    };
  }

  isEnterpriseMode(): boolean {
    const config = this.get();
    return Boolean(config.database && config.auth);
  }
}

export const configService = ConfigurationService.getInstance();