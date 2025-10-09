/**
 * Security Fixes Service
 * Critical security vulnerability patches and preventive measures
 */
import crypto from 'crypto';

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

import { logger } from '../../shared/utils/logger.js';

export class SecurityFixesService {
  
  /**
   * CRITICAL FIX: Secure JWT token generation 
   * Replaces predictable demo tokens with cryptographically secure ones
   */
  public static generateSecureToken(type: 'access' | 'refresh'): string {
    const payload = {
      type,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID(), // Unique token ID
      entropy: crypto.randomBytes(16).toString('hex') // Additional randomness
    };

    // Use environment JWT_SECRET or generate temporary secure secret
    const secret = process.env.JWT_SECRET || this.generateFallbackSecret();
    
    if (!process.env.JWT_SECRET) {
      logger.error('SECURITY WARNING: JWT_SECRET not configured, using temporary secret');
    }

    // Simple JWT-like structure with HMAC signature
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${payloadEncoded}`)
      .digest('base64url');

    return `${header}.${payloadEncoded}.${signature}`;
  }

  /**
   * Generate cryptographically secure fallback secret
   */
  private static generateFallbackSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * CRITICAL FIX: Input sanitization for XSS prevention
   */
  public static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      // Remove potentially dangerous HTML/JS
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/data:text\/html/gi, '')
      // Escape remaining HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      // Limit length to prevent DoS
      .slice(0, 50000);
  }

  /**
   * CRITICAL FIX: SSRF protection middleware
   */
  public static createSSRFProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      const { url } = req.query;
      
      if (url && typeof url === 'string') {
        try {
          const parsedUrl = new URL(url);
          
          // Block internal/private networks
          const forbiddenHosts = [
            'localhost',
            '127.0.0.1',
            '0.0.0.0',
            '10.',
            '172.',
            '192.168.',
            '169.254.',
            'metadata.google.internal',
            'instance-data'
          ];

          const isBlocked = forbiddenHosts.some(blocked => 
            parsedUrl.hostname.includes(blocked) || 
            parsedUrl.hostname.startsWith(blocked)
          );

          if (isBlocked) {
            logger.warn(`SSRF attempt blocked: ${url}`, { 
              ip: req.ip, 
              userAgent: req.get('User-Agent') 
            });
            
            return res.status(403).json({
              error: 'Access to internal/private networks is not allowed',
              code: 'SSRF_BLOCKED'
            });
          }

          // Only allow HTTPS for external requests (security)
          if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
            return res.status(400).json({
              error: 'Only HTTPS URLs are allowed for external requests',
              code: 'INSECURE_PROTOCOL'
            });
          }

        } catch (error) {
          return res.status(400).json({
            error: 'Invalid URL format',
            code: 'INVALID_URL'
          });
        }
      }

      next();
    };
  }

  /**
   * CRITICAL FIX: API Key protection middleware
   */
  public static createAPIKeyProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Prevent API keys from being logged
      const sanitizedBody = { ...req.body };
      
      ['apiKey', 'api_key', 'secret', 'token', 'password'].forEach(key => {
        if (sanitizedBody[key]) {
          sanitizedBody[key] = '[REDACTED]';
        }
      });

      // Override req.body for logging purposes
      (req as any).sanitizedBody = sanitizedBody;

      // Validate API key format before processing
      if (req.body?.config?.apiKey) {
        const apiKey = req.body.config.apiKey;
        
        // Basic API key format validation
        if (typeof apiKey !== 'string' || apiKey.length < 10) {
          return res.status(400).json({
            error: 'Invalid API key format',
            code: 'INVALID_API_KEY'
          });
        }

        // Check for obviously fake/test keys
        const testPatterns = [
          'test', 'demo', 'fake', 'example', 'placeholder',
          '12345', 'abcde', 'xxxxx'
        ];
        
        if (testPatterns.some(pattern => apiKey.toLowerCase().includes(pattern))) {
          logger.warn('Suspicious API key detected', { ip: req.ip });
          return res.status(400).json({
            error: 'Test/demo API keys are not allowed',
            code: 'INVALID_API_KEY'
          });
        }
      }

      next();
    };
  }

  /**
   * CRITICAL FIX: Content-type validation
   */
  public static createContentTypeValidation() {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentType = req.headers['content-type'];

      // For file uploads, ensure proper content type
      if (req.path.includes('/parse-pdf')) {
        if (!contentType?.includes('application/pdf')) {
          return res.status(400).json({
            error: 'Invalid content type for PDF upload',
            code: 'INVALID_CONTENT_TYPE'
          });
        }
      }

      // For JSON endpoints, ensure proper content type
      if (req.method === 'POST' && req.path.includes('/api/')) {
        if (contentType && !contentType.includes('application/json') && 
            !contentType.includes('application/pdf')) {
          return res.status(400).json({
            error: 'Invalid content type. Expected application/json',
            code: 'INVALID_CONTENT_TYPE'
          });
        }
      }

      next();
    };
  }

  /**
   * CRITICAL FIX: Enhanced rate limiting
   */
  public static createSecureRateLimiting() {
    // More aggressive rate limiting for sensitive endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 3, // 3 attempts per window (reduced from 5)
      message: 'Too many authentication attempts',
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path.startsWith('/health') || req.path.startsWith('/ready');
      }
    });

    const apiLimiter = rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 20, // 20 requests per window
      message: 'Too many API requests',
      standardHeaders: true,
      legacyHeaders: false
    });

    return {
      auth: authLimiter,
      api: apiLimiter
    };
  }

  /**
   * CRITICAL FIX: Request timeout protection
   */
  public static createTimeoutProtection(timeoutMs: number = 30000) {
    return (req: Request, res: Response, next: NextFunction) => {
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          logger.warn('Request timeout', { 
            path: req.path, 
            method: req.method,
            ip: req.ip 
          });
          
          res.status(408).json({
            error: 'Request timeout',
            code: 'REQUEST_TIMEOUT'
          });
        }
      }, timeoutMs);

      // Clear timeout when response is sent
      res.on('finish', () => {
        clearTimeout(timeout);
      });

      req.on('close', () => {
        clearTimeout(timeout);
      });

      next();
    };
  }

  /**
   * CRITICAL FIX: Memory usage monitoring
   */
  public static createMemoryProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      const memoryUsage = process.memoryUsage();
      const memoryLimitMB = 500; // 500MB limit
      const currentMemoryMB = memoryUsage.heapUsed / 1024 / 1024;

      if (currentMemoryMB > memoryLimitMB) {
        logger.error('Memory usage too high', { 
          currentMB: currentMemoryMB, 
          limitMB: memoryLimitMB 
        });
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        return res.status(503).json({
          error: 'Service temporarily unavailable due to high memory usage',
          code: 'MEMORY_LIMIT_EXCEEDED'
        });
      }

      next();
    };
  }

  /**
   * CRITICAL FIX: Security headers middleware
   */
  public static createSecurityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Additional security headers
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      
      // Remove server information
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      next();
    };
  }

  /**
   * CRITICAL FIX: Demo user security
   */
  public static async validateDemoAccess(req: Request): Promise<boolean> {
    // Only allow demo access in development mode
    if (process.env.NODE_ENV === 'production') {
      logger.error('Demo access attempted in production', { 
        ip: req.ip, 
        userAgent: req.get('User-Agent') 
      });
      return false;
    }

    // Rate limit demo access
    const demoAttempts = await this.getDemoAttempts(req.ip);
    if (demoAttempts > 10) {
      logger.warn('Too many demo access attempts', { ip: req.ip });
      return false;
    }

    return true;
  }

  private static demoAttempts = new Map<string, { count: number; timestamp: number }>();

  private static async getDemoAttempts(ip: string): Promise<number> {
    const now = Date.now();
    const entry = this.demoAttempts.get(ip);
    
    if (!entry || now - entry.timestamp > 15 * 60 * 1000) { // 15 minutes
      this.demoAttempts.set(ip, { count: 1, timestamp: now });
      return 1;
    }

    entry.count++;
    return entry.count;
  }
}

export const securityFixes = SecurityFixesService;