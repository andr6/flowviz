import bcrypt from 'bcrypt';
import { Pool, PoolConfig } from 'pg';

import { logger } from '../../utils/logger.js';

export interface DatabaseConfig extends PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | object;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface User {
  id: string;
  organization_id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  role: 'analyst' | 'senior_analyst' | 'team_lead' | 'admin';
  permissions: string[];
  sso_provider?: string;
  sso_subject?: string;
  last_login?: Date;
  is_active: boolean;
  preferences: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Investigation {
  id: string;
  organization_id: string;
  created_by: string;
  assigned_to?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  classification?: string;
  tags: string[];
  metadata: Record<string, any>;
  source_url?: string;
  source_type?: string;
  created_at: Date;
  updated_at: Date;
  closed_at?: Date;
}

export interface Indicator {
  id: string;
  organization_id: string;
  investigation_id?: string;
  type: string;
  value: string;
  context?: string;
  confidence?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source?: string;
  first_seen: Date;
  last_seen: Date;
  is_active: boolean;
  tags: string[];
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Activity {
  id: string;
  organization_id: string;
  investigation_id?: string;
  name: string;
  description?: string;
  mitre_technique_id?: string;
  mitre_tactic?: string;
  confidence?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  signatures: string[];
  context?: string;
  tags: string[];
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLogEntry {
  id: string;
  organization_id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

class DatabaseService {
  private pool: Pool;
  private isInitialized: boolean = false;

  constructor() {
    const config: DatabaseConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'threatflow',
      user: process.env.DB_USER || 'threatflow_user',
      password: process.env.DB_PASSWORD || 'threatflow_password',
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };

    this.pool = new Pool(config);

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Database pool error:', err);
    });

    // Handle client connection errors
    this.pool.on('connect', () => {
      logger.info('Database client connected');
    });
  }

  async initialize(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.isInitialized = true;
      logger.info('Database service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database service:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    await this.pool.end();
    this.isInitialized = false;
    logger.info('Database service shut down');
  }

  private checkInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Database service not initialized');
    }
  }

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'> & { password?: string }): Promise<User> {
    this.checkInitialized();
    
    const client = await this.pool.connect();
    try {
      let passwordHash = null;
      if (userData.password) {
        passwordHash = await bcrypt.hash(userData.password, 12);
      }

      const query = `
        INSERT INTO users (organization_id, email, username, password_hash, first_name, last_name, role, permissions, sso_provider, sso_subject, is_active, preferences)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const values = [
        userData.organization_id,
        userData.email,
        userData.username,
        passwordHash,
        userData.first_name,
        userData.last_name,
        userData.role,
        JSON.stringify(userData.permissions),
        userData.sso_provider,
        userData.sso_subject,
        userData.is_active,
        JSON.stringify(userData.preferences)
      ];

      const result = await client.query(query, values);
      const user = result.rows[0];
      
      // Log audit event
      await this.logAudit({
        organization_id: userData.organization_id,
        action: 'create_user',
        resource_type: 'user',
        resource_id: user.id,
        details: { email: userData.email, role: userData.role }
      });

      return this.mapUserFromDB(user);
    } finally {
      client.release();
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    this.checkInitialized();
    
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
      const result = await client.query(query, [email]);
      
      return result.rows[0] ? this.mapUserFromDB(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    this.checkInitialized();
    
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
      const result = await client.query(query, [userId]);
      
      return result.rows[0] ? this.mapUserFromDB(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    this.checkInitialized();
    
    const client = await this.pool.connect();
    try {
      const query = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1';
      await client.query(query, [userId]);
    } finally {
      client.release();
    }
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    this.checkInitialized();
    
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
      const result = await client.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      if (!user.password_hash) {
        return null; // SSO-only user
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      return isValid ? this.mapUserFromDB(user) : null;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // INVESTIGATION MANAGEMENT
  // ==========================================

  async createInvestigation(investigationData: Omit<Investigation, 'id' | 'created_at' | 'updated_at'>): Promise<Investigation> {
    this.checkInitialized();
    
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO investigations (organization_id, created_by, assigned_to, title, description, priority, status, classification, tags, metadata, source_url, source_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const values = [
        investigationData.organization_id,
        investigationData.created_by,
        investigationData.assigned_to,
        investigationData.title,
        investigationData.description,
        investigationData.priority,
        investigationData.status,
        investigationData.classification,
        JSON.stringify(investigationData.tags),
        JSON.stringify(investigationData.metadata),
        investigationData.source_url,
        investigationData.source_type
      ];

      const result = await client.query(query, values);
      const investigation = result.rows[0];
      
      // Log audit event
      await this.logAudit({
        organization_id: investigationData.organization_id,
        user_id: investigationData.created_by,
        action: 'create_investigation',
        resource_type: 'investigation',
        resource_id: investigation.id,
        details: { title: investigationData.title, priority: investigationData.priority }
      });

      return this.mapInvestigationFromDB(investigation);
    } finally {
      client.release();
    }
  }

  async getInvestigation(investigationId: string, organizationId: string): Promise<Investigation | null> {
    this.checkInitialized();
    
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM investigations WHERE id = $1 AND organization_id = $2';
      const result = await client.query(query, [investigationId, organizationId]);
      
      return result.rows[0] ? this.mapInvestigationFromDB(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async getInvestigationsByUser(userId: string, organizationId: string, limit: number = 50): Promise<Investigation[]> {
    this.checkInitialized();
    
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT i.* FROM investigations i
        LEFT JOIN investigation_collaborators ic ON i.id = ic.investigation_id
        WHERE i.organization_id = $1 
        AND (i.created_by = $2 OR i.assigned_to = $2 OR ic.user_id = $2)
        ORDER BY i.updated_at DESC
        LIMIT $3
      `;
      
      const result = await client.query(query, [organizationId, userId, limit]);
      return result.rows.map(row => this.mapInvestigationFromDB(row));
    } finally {
      client.release();
    }
  }

  async updateInvestigationStatus(investigationId: string, status: Investigation['status'], userId: string): Promise<void> {
    this.checkInitialized();
    
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE investigations 
        SET status = $1, closed_at = CASE WHEN $1 IN ('resolved', 'closed') THEN CURRENT_TIMESTAMP ELSE closed_at END
        WHERE id = $2
        RETURNING organization_id
      `;
      
      const result = await client.query(query, [status, investigationId]);
      
      if (result.rows.length > 0) {
        // Log audit event
        await this.logAudit({
          organization_id: result.rows[0].organization_id,
          user_id: userId,
          action: 'update_investigation_status',
          resource_type: 'investigation',
          resource_id: investigationId,
          details: { new_status: status }
        });
      }
    } finally {
      client.release();
    }
  }

  // ==========================================
  // INDICATOR MANAGEMENT
  // ==========================================

  async createIndicator(indicatorData: Omit<Indicator, 'id' | 'created_at' | 'updated_at'>): Promise<Indicator> {
    this.checkInitialized();
    
    const client = await this.pool.connect();
    try {
      // Check for existing indicator to avoid duplicates
      const existingQuery = 'SELECT id FROM indicators WHERE type = $1 AND value = $2 AND organization_id = $3';
      const existing = await client.query(existingQuery, [indicatorData.type, indicatorData.value, indicatorData.organization_id]);
      
      if (existing.rows.length > 0) {
        // Update existing indicator
        const updateQuery = `
          UPDATE indicators 
          SET last_seen = CURRENT_TIMESTAMP, investigation_id = COALESCE($1, investigation_id), is_active = true
          WHERE id = $2
          RETURNING *
        `;
        const result = await client.query(updateQuery, [indicatorData.investigation_id, existing.rows[0].id]);
        return this.mapIndicatorFromDB(result.rows[0]);
      }

      const query = `
        INSERT INTO indicators (organization_id, investigation_id, type, value, context, confidence, severity, source, tags, metadata, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        indicatorData.organization_id,
        indicatorData.investigation_id,
        indicatorData.type,
        indicatorData.value,
        indicatorData.context,
        indicatorData.confidence,
        indicatorData.severity,
        indicatorData.source,
        JSON.stringify(indicatorData.tags),
        JSON.stringify(indicatorData.metadata),
        indicatorData.is_active
      ];

      const result = await client.query(query, values);
      return this.mapIndicatorFromDB(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getIndicatorsByInvestigation(investigationId: string): Promise<Indicator[]> {
    this.checkInitialized();
    
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM indicators WHERE investigation_id = $1 ORDER BY created_at DESC';
      const result = await client.query(query, [investigationId]);
      
      return result.rows.map(row => this.mapIndicatorFromDB(row));
    } finally {
      client.release();
    }
  }

  async searchIndicators(organizationId: string, searchTerm: string, type?: string, limit: number = 100): Promise<Indicator[]> {
    this.checkInitialized();
    
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT * FROM indicators 
        WHERE organization_id = $1 AND is_active = true
        AND (value ILIKE $2 OR context ILIKE $2)
      `;
      const params: any[] = [organizationId, `%${searchTerm}%`];

      if (type) {
        query += ' AND type = $3';
        params.push(type);
      }

      query += ` ORDER BY last_seen DESC LIMIT $${  params.length + 1}`;
      params.push(limit);

      const result = await client.query(query, params);
      return result.rows.map(row => this.mapIndicatorFromDB(row));
    } finally {
      client.release();
    }
  }

  // ==========================================
  // AUDIT LOGGING
  // ==========================================

  async logAudit(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): Promise<void> {
    this.checkInitialized();
    
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO audit_log (organization_id, user_id, action, resource_type, resource_id, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      
      const values = [
        entry.organization_id,
        entry.user_id,
        entry.action,
        entry.resource_type,
        entry.resource_id,
        JSON.stringify(entry.details),
        entry.ip_address,
        entry.user_agent
      ];

      await client.query(query, values);
    } finally {
      client.release();
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private mapUserFromDB(dbUser: any): User {
    return {
      id: dbUser.id,
      organization_id: dbUser.organization_id,
      email: dbUser.email,
      username: dbUser.username,
      first_name: dbUser.first_name,
      last_name: dbUser.last_name,
      role: dbUser.role,
      permissions: dbUser.permissions ? JSON.parse(dbUser.permissions) : [],
      sso_provider: dbUser.sso_provider,
      sso_subject: dbUser.sso_subject,
      last_login: dbUser.last_login,
      is_active: dbUser.is_active,
      preferences: dbUser.preferences ? JSON.parse(dbUser.preferences) : {},
      created_at: dbUser.created_at,
      updated_at: dbUser.updated_at
    };
  }

  private mapInvestigationFromDB(dbInvestigation: any): Investigation {
    return {
      id: dbInvestigation.id,
      organization_id: dbInvestigation.organization_id,
      created_by: dbInvestigation.created_by,
      assigned_to: dbInvestigation.assigned_to,
      title: dbInvestigation.title,
      description: dbInvestigation.description,
      priority: dbInvestigation.priority,
      status: dbInvestigation.status,
      classification: dbInvestigation.classification,
      tags: dbInvestigation.tags ? JSON.parse(dbInvestigation.tags) : [],
      metadata: dbInvestigation.metadata ? JSON.parse(dbInvestigation.metadata) : {},
      source_url: dbInvestigation.source_url,
      source_type: dbInvestigation.source_type,
      created_at: dbInvestigation.created_at,
      updated_at: dbInvestigation.updated_at,
      closed_at: dbInvestigation.closed_at
    };
  }

  private mapIndicatorFromDB(dbIndicator: any): Indicator {
    return {
      id: dbIndicator.id,
      organization_id: dbIndicator.organization_id,
      investigation_id: dbIndicator.investigation_id,
      type: dbIndicator.type,
      value: dbIndicator.value,
      context: dbIndicator.context,
      confidence: dbIndicator.confidence,
      severity: dbIndicator.severity,
      source: dbIndicator.source,
      first_seen: dbIndicator.first_seen,
      last_seen: dbIndicator.last_seen,
      is_active: dbIndicator.is_active,
      tags: dbIndicator.tags ? JSON.parse(dbIndicator.tags) : [],
      metadata: dbIndicator.metadata ? JSON.parse(dbIndicator.metadata) : {},
      created_at: dbIndicator.created_at,
      updated_at: dbIndicator.updated_at
    };
  }
}

export const databaseService = new DatabaseService();