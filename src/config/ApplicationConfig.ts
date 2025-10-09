import { logger } from '../shared/utils/logger.js';

/**
 * Centralized application configuration with validation
 * All environment variables are validated and provide sensible defaults
 */

export interface DatabaseConfig {
  url: string;
  pool: {
    min: number;
    max: number;
    connectionTimeout: number;
    idleTimeout: number;
  };
}

export interface SecurityConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  session: {
    secret: string;
  };
  bcrypt: {
    rounds: number;
  };
  rateLimits: {
    articles: number;
    images: number;
    streaming: number;
  };
  requestLimits: {
    maxSize: string;
    maxArticleSize: number;
    maxImageSize: number;
  };
}

export interface AIProviderConfig {
  anthropic?: {
    apiKey: string;
    model: string;
  };
  openai?: {
    apiKey: string;
    model: string;
  };
  openrouter?: {
    apiKey: string;
    model: string;
  };
  ollama?: {
    baseUrl: string;
    model: string;
  };
}

export interface ServerConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  allowedOrigins: string[];
}

export interface ApplicationConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  security: SecurityConfig;
  aiProviders: AIProviderConfig;
}

/**
 * Load and validate configuration from environment variables
 */
function loadConfiguration(): ApplicationConfig {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Server configuration
  const server: ServerConfig = {
    port: parseInt(process.env.PORT || '3001'),
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:3000',
    ],
  };

  // Validate server config
  if (server.port < 1024 || server.port > 65535) {
    errors.push(`Invalid PORT: ${server.port}. Must be between 1024-65535`);
  }

  if (!['development', 'production', 'test'].includes(server.nodeEnv)) {
    errors.push(`Invalid NODE_ENV: ${server.nodeEnv}. Must be development, production, or test`);
  }

  // Database configuration
  const database: DatabaseConfig = {
    url: process.env.DATABASE_URL || '',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '5'),
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '10000'),
    },
  };

  // Validate database config
  if (database.pool.min > database.pool.max) {
    errors.push(`DB_POOL_MIN (${database.pool.min}) cannot exceed DB_POOL_MAX (${database.pool.max})`);
  }

  if (database.pool.max > 100) {
    warnings.push(`DB_POOL_MAX (${database.pool.max}) is very high. Ensure database can handle this load.`);
  }

  if (database.pool.connectionTimeout < 1000 || database.pool.connectionTimeout > 60000) {
    warnings.push(`DB_CONNECTION_TIMEOUT (${database.pool.connectionTimeout}ms) should be between 1-60 seconds`);
  }

  // Security configuration
  const security: SecurityConfig = {
    jwt: {
      secret: process.env.JWT_SECRET || '',
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    session: {
      secret: process.env.SESSION_SECRET || '',
    },
    bcrypt: {
      rounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    },
    rateLimits: {
      articles: parseInt(process.env.RATE_LIMIT_ARTICLES || '10'),
      images: parseInt(process.env.RATE_LIMIT_IMAGES || '50'),
      streaming: parseInt(process.env.RATE_LIMIT_STREAMING || '5'),
    },
    requestLimits: {
      maxSize: process.env.MAX_REQUEST_SIZE || '10mb',
      maxArticleSize: parseInt(process.env.MAX_ARTICLE_SIZE || '5242880'),
      maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE || '3145728'),
    },
  };

  // Validate security config
  if (!security.jwt.secret || security.jwt.secret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  if (!security.session.secret || security.session.secret.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters long');
  }

  if (security.bcrypt.rounds < 10 || security.bcrypt.rounds > 15) {
    warnings.push(`BCRYPT_ROUNDS (${security.bcrypt.rounds}) should be between 10-15 for security vs performance balance`);
  }

  // Validate rate limits are reasonable
  if (security.rateLimits.streaming < 1 || security.rateLimits.streaming > 100) {
    warnings.push(`RATE_LIMIT_STREAMING (${security.rateLimits.streaming}) seems unusual. Consider 1-20 range.`);
  }

  // AI Providers configuration (optional)
  const aiProviders: AIProviderConfig = {};

  // Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    if (process.env.ANTHROPIC_API_KEY.startsWith('sk-') && process.env.ANTHROPIC_API_KEY.length > 20) {
      aiProviders.anthropic = {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      };
    } else {
      errors.push('ANTHROPIC_API_KEY format appears invalid');
    }
  }

  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    if (process.env.OPENAI_API_KEY.startsWith('sk-') && process.env.OPENAI_API_KEY.length > 20) {
      aiProviders.openai = {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o',
      };
    } else {
      errors.push('OPENAI_API_KEY format appears invalid');
    }
  }

  // OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    if (process.env.OPENROUTER_API_KEY.startsWith('sk-') && process.env.OPENROUTER_API_KEY.length > 20) {
      aiProviders.openrouter = {
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
      };
    } else {
      errors.push('OPENROUTER_API_KEY format appears invalid');
    }
  }

  // Ollama
  if (process.env.OLLAMA_BASE_URL) {
    try {
      new URL(process.env.OLLAMA_BASE_URL);
      aiProviders.ollama = {
        baseUrl: process.env.OLLAMA_BASE_URL,
        model: process.env.OLLAMA_MODEL || 'llama3.2-vision:latest',
      };
    } catch {
      errors.push('OLLAMA_BASE_URL is not a valid URL');
    }
  }

  // Validate at least one AI provider is configured
  if (Object.keys(aiProviders).length === 0) {
    warnings.push('No AI providers configured. Application will run in demo mode only.');
  }

  // Log validation results
  if (warnings.length > 0) {
    logger.warn('Configuration warnings:', { warnings });
  }

  if (errors.length > 0) {
    logger.error('Configuration errors:', { errors });
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }

  logger.info('Configuration loaded successfully', {
    server: { port: server.port, nodeEnv: server.nodeEnv },
    providers: Object.keys(aiProviders),
    database: !!database.url,
  });

  return {
    server,
    database,
    security,
    aiProviders,
  };
}

/**
 * Generate a secure random secret for development
 */
export function generateSecureSecret(): string {
  return require('crypto').randomBytes(32).toString('hex');
}

/**
 * Validate that secrets are not using default/example values
 */
export function validateSecrets(config: ApplicationConfig): void {
  const insecurePatterns = [
    'your_',
    'example',
    'change_this',
    'default',
    'secret',
    'password',
    'test',
  ];

  const secrets = [
    config.security.jwt.secret,
    config.security.session.secret,
  ];

  secrets.forEach((secret, index) => {
    const secretName = index === 0 ? 'JWT_SECRET' : 'SESSION_SECRET';
    
    if (insecurePatterns.some(pattern => secret.toLowerCase().includes(pattern))) {
      throw new Error(`${secretName} contains insecure pattern. Generate a new secret with: openssl rand -hex 32`);
    }
  });
}

// Export singleton configuration
let configInstance: ApplicationConfig | null = null;

export function getApplicationConfig(): ApplicationConfig {
  if (!configInstance) {
    configInstance = loadConfiguration();
    
    // Validate secrets in production
    if (configInstance.server.nodeEnv === 'production') {
      validateSecrets(configInstance);
    }
  }
  
  return configInstance;
}

// For testing - reset configuration
export function resetConfiguration(): void {
  configInstance = null;
}