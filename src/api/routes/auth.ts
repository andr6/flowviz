import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';

import { authService, AuthenticatedRequest } from '../../shared/services/auth/AuthService';
import { databaseService } from '../../shared/services/database/DatabaseService';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 refresh attempts per window
  message: 'Too many token refresh attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

/**
 * @route POST /api/auth/login
 * @desc Login with email and password
 * @access Public
 */
router.post('/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      try {
        const result = await authService.login(
          { email, password },
          ipAddress,
          userAgent
        );

        if (!result) {
          return res.status(401).json({
            error: 'Invalid credentials'
          });
        }

        res.json({
          success: true,
          user: {
            id: result.user.id,
            email: result.user.email,
            username: result.user.username,
            firstName: result.user.first_name,
            lastName: result.user.last_name,
            role: result.user.role,
            organizationId: result.user.organization_id
          },
          tokens: result.tokens
        });
      } catch (dbError) {
        // SECURITY FIX: Secure demo mode with proper validation
        const { securityFixes } = await import('../../server/middleware/SecurityFixesService');
        
        // Only allow demo access in development with rate limiting
        const isDemoAllowed = await securityFixes.validateDemoAccess(req);
        
        if (isDemoAllowed && 
            email === 'admin@threatflow-demo.local' && 
            password === 'ThreatFlow@2024' &&
            process.env.NODE_ENV !== 'production') {
          
          logger.warn('Database unavailable, using SECURE demo mode for authentication', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });
          
          const demoUser = {
            id: 'demo-user-id',
            email: 'admin@threatflow-demo.local',
            username: 'admin',
            firstName: 'Demo',
            lastName: 'Administrator',
            role: 'admin',
            organizationId: 'demo-org-id'
          };

          // SECURITY FIX: Generate cryptographically secure tokens
          const demoTokens = {
            accessToken: securityFixes.generateSecureToken('access'),
            refreshToken: securityFixes.generateSecureToken('refresh'),
            expiresIn: 3600,
            tokenType: 'Bearer' as const
          };

          res.json({
            success: true,
            user: demoUser,
            tokens: demoTokens
          });
        } else {
          return res.status(401).json({
            error: 'Invalid credentials'
          });
        }
      }
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        error: 'Authentication failed'
      });
    }
  }
);

/**
 * @route POST /api/auth/sso
 * @desc SSO login with provider token
 * @access Public
 */
router.post('/sso',
  authLimiter,
  [
    body('provider').isIn(['azure', 'google', 'okta']).withMessage('Valid SSO provider required'),
    body('token').notEmpty().withMessage('SSO token is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { provider, token, email, firstName, lastName } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      // In a real implementation, you would validate the SSO token with the provider
      // For demo purposes, we'll simulate a valid SSO response
      const ssoProfile = {
        provider,
        subject: `${provider}_${Date.now()}`, // This would come from the SSO token
        email,
        firstName,
        lastName
      };

      const result = await authService.loginWithSSO(
        ssoProfile,
        ipAddress,
        userAgent
      );

      if (!result) {
        return res.status(401).json({
          error: 'SSO authentication failed'
        });
      }

      res.json({
        success: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          role: result.user.role,
          organizationId: result.user.organization_id
        },
        tokens: result.tokens,
        isNewUser: result.isNewUser
      });
    } catch (error) {
      logger.error('SSO login error:', error);
      res.status(500).json({
        error: 'SSO authentication failed'
      });
    }
  }
);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh',
  refreshLimiter,
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { refreshToken } = req.body;

      const tokens = await authService.refreshToken(refreshToken);

      if (!tokens) {
        return res.status(401).json({
          error: 'Invalid refresh token'
        });
      }

      res.json({
        success: true,
        tokens
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({
        error: 'Token refresh failed'
      });
    }
  }
);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout',
  authService.authenticate(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user) {
        const ipAddress = req.ip;
        const userAgent = req.get('User-Agent');
        
        await authService.logout(req.user.id, ipAddress, userAgent);
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        error: 'Logout failed'
      });
    }
  }
);

// ==========================================
// USER PROFILE ENDPOINTS
// ==========================================

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile',
  authService.authenticate(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          username: req.user.username,
          firstName: req.user.first_name,
          lastName: req.user.last_name,
          role: req.user.role,
          organizationId: req.user.organization_id,
          permissions: authService.getUserPermissions(req.user),
          preferences: req.user.preferences,
          lastLogin: req.user.last_login,
          createdAt: req.user.created_at
        }
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        error: 'Failed to get user profile'
      });
    }
  }
);

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile',
  authService.authenticate(),
  [
    body('firstName').optional().isLength({ min: 1, max: 100 }).withMessage('First name must be 1-100 characters'),
    body('lastName').optional().isLength({ min: 1, max: 100 }).withMessage('Last name must be 1-100 characters'),
    body('preferences').optional().isObject().withMessage('Preferences must be an object')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const { firstName, lastName, preferences } = req.body;

      // In a full implementation, you would update the user in the database
      // For now, we'll just return success
      
      res.json({
        success: true,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        error: 'Failed to update profile'
      });
    }
  }
);

// ==========================================
// USER MANAGEMENT ENDPOINTS (Admin only)
// ==========================================

/**
 * @route GET /api/auth/users
 * @desc Get organization users
 * @access Private (team_lead, admin)
 */
router.get('/users',
  authService.authenticate(),
  authService.requireRole(['team_lead', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || !req.organizationId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // In a full implementation, you would fetch users from the database
      // For now, return a sample response
      
      res.json({
        success: true,
        users: [
          {
            id: req.user.id,
            email: req.user.email,
            username: req.user.username,
            firstName: req.user.first_name,
            lastName: req.user.last_name,
            role: req.user.role,
            isActive: req.user.is_active,
            lastLogin: req.user.last_login,
            createdAt: req.user.created_at
          }
        ],
        total: 1
      });
    } catch (error) {
      logger.error('Get users error:', error);
      res.status(500).json({
        error: 'Failed to get users'
      });
    }
  }
);

/**
 * @route POST /api/auth/users
 * @desc Create new user
 * @access Private (admin)
 */
router.post('/users',
  authService.authenticate(),
  authService.requireRole('admin'),
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('username').isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
    body('firstName').isLength({ min: 1, max: 100 }).withMessage('First name is required'),
    body('lastName').isLength({ min: 1, max: 100 }).withMessage('Last name is required'),
    body('role').isIn(['analyst', 'senior_analyst', 'team_lead', 'admin']).withMessage('Valid role is required'),
    body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      if (!req.user || !req.organizationId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { email, username, firstName, lastName, role, password } = req.body;

      const newUser = await databaseService.createUser({
        organization_id: req.organizationId,
        email,
        username,
        password,
        first_name: firstName,
        last_name: lastName,
        role,
        permissions: [],
        is_active: true,
        preferences: {}
      });

      res.status(201).json({
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role,
          isActive: newUser.is_active,
          createdAt: newUser.created_at
        }
      });
    } catch (error) {
      logger.error('Create user error:', error);
      
      if (error instanceof Error && error.message.includes('duplicate')) {
        return res.status(409).json({
          error: 'User with this email or username already exists'
        });
      }
      
      res.status(500).json({
        error: 'Failed to create user'
      });
    }
  }
);

/**
 * @route GET /api/auth/permissions
 * @desc Get user permissions
 * @access Private
 */
router.get('/permissions',
  authService.authenticate(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const permissions = authService.getUserPermissions(req.user);

      res.json({
        success: true,
        permissions,
        role: req.user.role
      });
    } catch (error) {
      logger.error('Get permissions error:', error);
      res.status(500).json({
        error: 'Failed to get permissions'
      });
    }
  }
);

export default router;