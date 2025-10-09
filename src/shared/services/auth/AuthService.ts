import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { logger } from '../../utils/logger.js';
import { databaseService, User } from '../database/DatabaseService';

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  bcryptRounds: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SSOProfile {
  provider: string;
  subject: string;
  email: string;
  firstName?: string;
  lastName?: string;
  groups?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  organizationId?: string;
}

export interface Permission {
  action: string;
  resource: string;
  conditions?: Record<string, any>;
}

export interface RolePermissions {
  analyst: Permission[];
  senior_analyst: Permission[];
  team_lead: Permission[];
  admin: Permission[];
}

class AuthService {
  private config: AuthConfig;
  private rolePermissions: RolePermissions;

  constructor() {
    this.config = {
      jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12')
    };

    this.initializeRolePermissions();
  }

  private initializeRolePermissions(): void {
    this.rolePermissions = {
      analyst: [
        { action: 'read', resource: 'investigation' },
        { action: 'create', resource: 'investigation' },
        { action: 'read', resource: 'indicator' },
        { action: 'create', resource: 'indicator' },
        { action: 'read', resource: 'activity' },
        { action: 'create', resource: 'activity' },
        { action: 'read', resource: 'note' },
        { action: 'create', resource: 'note', conditions: { owner: true } },
        { action: 'update', resource: 'note', conditions: { owner: true } },
        { action: 'export', resource: 'data', conditions: { format: ['json', 'png'] } }
      ],
      senior_analyst: [
        ...this.rolePermissions?.analyst || [],
        { action: 'update', resource: 'investigation' },
        { action: 'assign', resource: 'investigation' },
        { action: 'update', resource: 'indicator' },
        { action: 'update', resource: 'activity' },
        { action: 'delete', resource: 'note', conditions: { owner: true } },
        { action: 'export', resource: 'data', conditions: { format: ['json', 'png', 'stix'] } },
        { action: 'integrate', resource: 'siem', conditions: { read_only: true } }
      ],
      team_lead: [
        ...this.rolePermissions?.senior_analyst || [],
        { action: 'delete', resource: 'investigation' },
        { action: 'read', resource: 'audit_log' },
        { action: 'manage', resource: 'team_member' },
        { action: 'configure', resource: 'siem_integration' },
        { action: 'read', resource: 'organization_settings' },
        { action: 'update', resource: 'organization_settings', conditions: { limited: true } }
      ],
      admin: [
        { action: '*', resource: '*' } // Full access
      ]
    };
  }

  // ==========================================
  // AUTHENTICATION METHODS
  // ==========================================

  async login(credentials: LoginCredentials, ipAddress?: string, userAgent?: string): Promise<{ user: User; tokens: AuthTokens } | null> {
    try {
      const user = await databaseService.verifyPassword(credentials.email, credentials.password);
      
      if (!user) {
        await this.logAuthEvent('login_failed', { email: credentials.email }, ipAddress, userAgent);
        return null;
      }

      // Update last login
      await databaseService.updateUserLastLogin(user.id);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Log successful login
      await this.logAuthEvent('login_success', { user_id: user.id }, ipAddress, userAgent);

      // Log audit event
      await databaseService.logAudit({
        organization_id: user.organization_id,
        user_id: user.id,
        action: 'login',
        details: { method: 'password' },
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return { user, tokens };
    } catch (error) {
      logger.error('Login error:', error);
      throw new Error('Authentication failed');
    }
  }

  async loginWithSSO(ssoProfile: SSOProfile, ipAddress?: string, userAgent?: string): Promise<{ user: User; tokens: AuthTokens; isNewUser: boolean } | null> {
    try {
      let user = await databaseService.getUserByEmail(ssoProfile.email);
      let isNewUser = false;

      if (!user) {
        // Create new user from SSO profile
        const organizationId = await this.getOrganizationIdFromEmail(ssoProfile.email);
        if (!organizationId) {
          throw new Error('Organization not found for email domain');
        }

        user = await databaseService.createUser({
          organization_id: organizationId,
          email: ssoProfile.email,
          username: ssoProfile.email.split('@')[0],
          first_name: ssoProfile.firstName,
          last_name: ssoProfile.lastName,
          role: 'analyst', // Default role, can be updated by admin
          permissions: [],
          sso_provider: ssoProfile.provider,
          sso_subject: ssoProfile.subject,
          is_active: true,
          preferences: {}
        });
        isNewUser = true;
      }

      // Update last login
      await databaseService.updateUserLastLogin(user.id);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Log successful SSO login
      await this.logAuthEvent('sso_login_success', { 
        user_id: user.id, 
        provider: ssoProfile.provider,
        is_new_user: isNewUser 
      }, ipAddress, userAgent);

      // Log audit event
      await databaseService.logAudit({
        organization_id: user.organization_id,
        user_id: user.id,
        action: 'login',
        details: { method: 'sso', provider: ssoProfile.provider, is_new_user: isNewUser },
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return { user, tokens, isNewUser };
    } catch (error) {
      logger.error('SSO login error:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens | null> {
    try {
      const decoded = jwt.verify(refreshToken, this.config.jwtSecret) as any;
      
      if (decoded.type !== 'refresh') {
        return null;
      }

      const user = await databaseService.getUserById(decoded.userId);
      if (!user) {
        return null;
      }

      return await this.generateTokens(user);
    } catch (error) {
      logger.error('Token refresh error:', error);
      return null;
    }
  }

  async logout(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      const user = await databaseService.getUserById(userId);
      if (user) {
        await this.logAuthEvent('logout', { user_id: userId }, ipAddress, userAgent);
        
        await databaseService.logAudit({
          organization_id: user.organization_id,
          user_id: userId,
          action: 'logout',
          details: {},
          ip_address: ipAddress,
          user_agent: userAgent
        });
      }
    } catch (error) {
      logger.error('Logout error:', error);
    }
  }

  // ==========================================
  // TOKEN MANAGEMENT
  // ==========================================

  private async generateTokens(user: User): Promise<AuthTokens> {
    const tokenPayload = {
      userId: user.id,
      organizationId: user.organization_id,
      email: user.email,
      role: user.role,
      permissions: this.getUserPermissions(user)
    };

    const accessToken = jwt.sign(
      { ...tokenPayload, type: 'access' },
      this.config.jwtSecret,
      { expiresIn: this.config.jwtExpiresIn }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      this.config.jwtSecret,
      { expiresIn: this.config.refreshTokenExpiresIn }
    );

    // Get expiration time in seconds
    const decoded = jwt.decode(accessToken) as any;
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer'
    };
  }

  async verifyToken(token: string): Promise<User | null> {
    try {
      // Handle demo tokens when database is not available
      if (token.startsWith('demo-access-token-')) {
        logger.debug('Using demo token for authentication');
        return {
          id: 'demo-user-id',
          organization_id: 'demo-org-id',
          email: 'admin@threatflow-demo.local',
          username: 'admin',
          password_hash: null,
          first_name: 'Demo',
          last_name: 'Administrator',
          role: 'admin',
          permissions: [
            'create:threat',
            'read:threat',
            'update:threat',
            'delete:threat',
            'create:investigation',
            'read:investigation',
            'update:investigation',
            'delete:investigation',
            'admin:system',
            'admin:users',
            'admin:organization'
          ],
          sso_provider: null,
          sso_subject: null,
          last_login: null,
          is_active: true,
          preferences: {},
          created_at: new Date(),
          updated_at: new Date()
        };
      }

      const decoded = jwt.verify(token, this.config.jwtSecret) as any;
      
      if (decoded.type !== 'access') {
        return null;
      }

      const user = await databaseService.getUserById(decoded.userId);
      return user;
    } catch (error) {
      return null;
    }
  }

  // ==========================================
  // AUTHORIZATION METHODS
  // ==========================================

  getUserPermissions(user: User): Permission[] {
    const basePermissions = this.rolePermissions[user.role] || [];
    const customPermissions = user.permissions.map(p => {
      if (typeof p === 'string') {
        const [action, resource] = p.split(':');
        return { action, resource };
      }
      return p;
    });

    return [...basePermissions, ...customPermissions];
  }

  hasPermission(user: User, action: string, resource: string, context?: Record<string, any>): boolean {
    const permissions = this.getUserPermissions(user);

    return permissions.some(permission => {
      // Check for wildcard admin permission
      if (permission.action === '*' && permission.resource === '*') {
        return true;
      }

      // Check specific action/resource match
      if (permission.action === action && permission.resource === resource) {
        // Check conditions if they exist
        if (permission.conditions && context) {
          return this.checkPermissionConditions(permission.conditions, context);
        }
        return true;
      }

      // Check wildcard action
      if (permission.action === '*' && permission.resource === resource) {
        return true;
      }

      // Check wildcard resource
      if (permission.action === action && permission.resource === '*') {
        return true;
      }

      return false;
    });
  }

  private checkPermissionConditions(conditions: Record<string, any>, context: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      const contextValue = context[key];

      if (Array.isArray(value)) {
        if (!value.includes(contextValue)) {
          return false;
        }
      } else if (value === true && key === 'owner') {
        if (!context.owner || context.owner !== context.userId) {
          return false;
        }
      } else if (contextValue !== value) {
        return false;
      }
    }

    return true;
  }

  // ==========================================
  // MIDDLEWARE FUNCTIONS
  // ==========================================

  authenticate() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }

        const token = authHeader.substring(7);
        const user = await this.verifyToken(token);

        if (!user) {
          return res.status(401).json({ error: 'Invalid or expired token' });
        }

        req.user = user;
        req.organizationId = user.organization_id;
        next();
      } catch (error) {
        logger.error('Authentication middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    };
  }

  authorize(action: string, resource: string) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const context = {
          userId: req.user.id,
          organizationId: req.user.organization_id,
          owner: req.params.userId === req.user.id,
          ...req.body,
          ...req.query
        };

        if (!this.hasPermission(req.user, action, resource, context)) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
      } catch (error) {
        logger.error('Authorization middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    };
  }

  requireRole(roles: string | string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        
        if (!allowedRoles.includes(req.user.role)) {
          return res.status(403).json({ error: 'Insufficient role permissions' });
        }

        next();
      } catch (error) {
        logger.error('Role authorization middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    };
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private async getOrganizationIdFromEmail(email: string): Promise<string | null> {
    // This is a simplified implementation
    // In production, you might have more sophisticated domain-to-organization mapping
    const domain = email.split('@')[1];
    
    // For demo purposes, return the demo organization ID
    // In production, query the database based on domain
    if (domain === 'demo.threatflow.com' || domain === 'localhost') {
      return '00000000-0000-0000-0000-000000000001';
    }
    
    return null;
  }

  private async logAuthEvent(event: string, details: Record<string, any>, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      logger.info('Auth event:', {
        event,
        details,
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to log auth event:', error);
    }
  }
}

export const authService = new AuthService();