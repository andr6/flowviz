/**
 * Comprehensive Health Check Service
 * Monitors all critical application dependencies and services
 */
import { Request, Response } from 'express';

import { databaseService } from '../../shared/services/database/DatabaseService';
import { logger } from '../../shared/utils/logger.js';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: ServiceStatus[];
  metrics: SystemMetrics;
  dependencies: DependencyStatus[];
}

interface ServiceStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  lastCheck: string;
  details?: string;
  critical: boolean;
}

interface SystemMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  diskSpace?: number;
  activeConnections: number;
  errorRate: number;
}

interface DependencyStatus {
  name: string;
  url: string;
  status: 'reachable' | 'unreachable' | 'timeout';
  responseTime: number;
  error?: string;
}

export class HealthCheckService {
  private static instance: HealthCheckService;
  private startTime: number = Date.now();
  private errorCount: number = 0;
  private checkCount: number = 0;

  public static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  private constructor() {}

  /**
   * Comprehensive health check endpoint
   */
  public async performHealthCheck(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.checkCount++;
      
      // Run all health checks in parallel for speed
      const [
        databaseStatus,
        aiProvidersStatus,
        systemMetrics,
        dependencyStatus
      ] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkAIProviders(),
        this.getSystemMetrics(),
        this.checkExternalDependencies()
      ]);

      const services: ServiceStatus[] = [
        this.extractResult(databaseStatus, 'Database', true),
        ...this.extractResults(aiProvidersStatus, 'AI Providers', false),
        this.extractResult(dependencyStatus, 'External APIs', false)
      ];

      const overallStatus = this.calculateOverallStatus(services);
      const responseTime = Date.now() - startTime;

      const healthResult: HealthCheckResult = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: process.env.APP_VERSION || '2.0.0',
        services,
        metrics: this.extractResult(systemMetrics, 'metrics', false) as SystemMetrics,
        dependencies: this.extractResult(dependencyStatus, 'dependencies', false) as DependencyStatus[]
      };

      // Set appropriate HTTP status
      const httpStatus = overallStatus === 'healthy' ? 200 
                       : overallStatus === 'degraded' ? 200 
                       : 503;

      res.status(httpStatus).json(healthResult);

      // Log health check results
      if (overallStatus === 'unhealthy') {
        logger.error('Health check failed', { 
          services: services.filter(s => s.status !== 'up'),
          responseTime 
        });
      } else if (overallStatus === 'degraded') {
        logger.warn('Health check degraded', { 
          services: services.filter(s => s.status === 'degraded'),
          responseTime 
        });
      }

    } catch (error) {
      this.errorCount++;
      logger.error('Health check endpoint failed', error);
      
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check system failure',
        uptime: Date.now() - this.startTime
      });
    }
  }

  /**
   * Database connectivity check
   */
  private async checkDatabase(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      const isHealthy = await databaseService.healthCheck();
      const responseTime = Date.now() - startTime;

      if (isHealthy) {
        // Additional database performance check
        const client = await databaseService.pool.connect();
        try {
          await client.query('SELECT 1 as health_check');
          client.release();
          
          return {
            name: 'PostgreSQL Database',
            status: responseTime < 1000 ? 'up' : 'degraded',
            responseTime,
            lastCheck: new Date().toISOString(),
            details: `Connected, query time: ${responseTime}ms`,
            critical: true
          };
        } catch (queryError) {
          client.release();
          throw queryError;
        }
      } else {
        throw new Error('Database health check failed');
      }
    } catch (error) {
      return {
        name: 'PostgreSQL Database',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        details: `Error: ${error.message}`,
        critical: true
      };
    }
  }

  /**
   * AI Providers availability check
   */
  private async checkAIProviders(): Promise<ServiceStatus[]> {
    const providers = [
      { name: 'Anthropic Claude', url: 'https://api.anthropic.com', key: process.env.ANTHROPIC_API_KEY },
      { name: 'OpenAI', url: 'https://api.openai.com', key: process.env.OPENAI_API_KEY },
      { name: 'OpenRouter', url: 'https://openrouter.ai', key: process.env.OPENROUTER_API_KEY },
      { name: 'Ollama', url: process.env.OLLAMA_BASE_URL || 'http://localhost:11434', key: 'local' }
    ];

    const results = await Promise.allSettled(
      providers.map(provider => this.checkAIProvider(provider))
    );

    return results.map((result, index) => {
      const provider = providers[index];
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: provider.name,
          status: 'down' as const,
          responseTime: 0,
          lastCheck: new Date().toISOString(),
          details: `Check failed: ${result.reason?.message || 'Unknown error'}`,
          critical: false
        };
      }
    });
  }

  /**
   * Individual AI provider check
   */
  private async checkAIProvider(provider: { name: string; url: string; key?: string }): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    if (!provider.key || provider.key === '') {
      return {
        name: provider.name,
        status: 'down',
        responseTime: 0,
        lastCheck: new Date().toISOString(),
        details: 'API key not configured',
        critical: false
      };
    }

    try {
      // Simple connectivity check with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(provider.url, {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      return {
        name: provider.name,
        status: response.ok ? 'up' : 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: `HTTP ${response.status}`,
        critical: false
      };
    } catch (error) {
      return {
        name: provider.name,
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        details: `Error: ${error.message}`,
        critical: false
      };
    }
  }

  /**
   * System metrics collection
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    
    return {
      memoryUsage,
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      activeConnections: (process as any)._getActiveRequests?.()?.length || 0,
      errorRate: this.checkCount > 0 ? (this.errorCount / this.checkCount) * 100 : 0
    };
  }

  /**
   * External dependencies check
   */
  private async checkExternalDependencies(): Promise<DependencyStatus[]> {
    const dependencies = [
      'https://api.anthropic.com',
      'https://api.openai.com',
      'https://openrouter.ai'
    ];

    const results = await Promise.allSettled(
      dependencies.map(url => this.checkDependency(url))
    );

    return results.map((result, index) => {
      const url = dependencies[index];
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: url,
          url,
          status: 'unreachable' as const,
          responseTime: 0,
          error: result.reason?.message || 'Check failed'
        };
      }
    });
  }

  /**
   * Individual dependency check
   */
  private async checkDependency(url: string): Promise<DependencyStatus> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      return {
        name: new URL(url).hostname,
        url,
        status: response.ok ? 'reachable' : 'unreachable',
        responseTime
      };
    } catch (error) {
      return {
        name: new URL(url).hostname,
        url,
        status: error.name === 'AbortError' ? 'timeout' : 'unreachable',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Calculate overall system status
   */
  private calculateOverallStatus(services: ServiceStatus[]): 'healthy' | 'degraded' | 'unhealthy' {
    const criticalServices = services.filter(s => s.critical);
    const allServices = services;

    // If any critical service is down, system is unhealthy
    if (criticalServices.some(s => s.status === 'down')) {
      return 'unhealthy';
    }

    // If critical services are degraded or non-critical services are down, system is degraded
    if (criticalServices.some(s => s.status === 'degraded') || 
        allServices.some(s => s.status === 'down')) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Helper to extract results from Promise.allSettled
   */
  private extractResult(result: PromiseSettledResult<any>, name: string, critical: boolean): any {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        name,
        status: 'down',
        responseTime: 0,
        lastCheck: new Date().toISOString(),
        details: `Error: ${result.reason?.message || 'Unknown error'}`,
        critical
      };
    }
  }

  private extractResults(result: PromiseSettledResult<any>, name: string, critical: boolean): any[] {
    if (result.status === 'fulfilled') {
      return Array.isArray(result.value) ? result.value : [result.value];
    } else {
      return [{
        name,
        status: 'down',
        responseTime: 0,
        lastCheck: new Date().toISOString(),
        details: `Error: ${result.reason?.message || 'Unknown error'}`,
        critical
      }];
    }
  }

  /**
   * Simple liveness probe (faster endpoint for load balancers)
   */
  public async livenessProbe(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime
    });
  }

  /**
   * Readiness probe (checks if app can serve traffic)
   */
  public async readinessProbe(req: Request, res: Response): Promise<void> {
    try {
      // Quick database check
      const dbHealthy = await databaseService.healthCheck();
      
      if (dbHealthy) {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          status: 'not_ready',
          reason: 'Database not available',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      res.status(503).json({
        status: 'not_ready',
        reason: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

export const healthCheckService = HealthCheckService.getInstance();