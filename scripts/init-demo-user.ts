#!/usr/bin/env tsx
/**
 * ThreatFlow Demo User Initialization Script
 * Creates a demo organization and admin user for testing
 */

import dotenv from 'dotenv';

import { databaseService } from '../src/shared/services/database/DatabaseService.ts';
import { logger } from '../src/shared/utils/logger.js';

// Load environment variables
dotenv.config();

interface DemoUser {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface DemoOrganization {
  name: string;
  domain: string;
  subscriptionTier: string;
  maxUsers: number;
}

const DEMO_ORGANIZATION: DemoOrganization = {
  name: 'ThreatFlow Demo',
  domain: 'threatflow-demo.local',
  subscriptionTier: 'enterprise',
  maxUsers: 50
};

const DEMO_USER: DemoUser = {
  email: 'admin@threatflow-demo.local',
  username: 'admin',
  password: 'ThreatFlow@2024',
  firstName: 'Demo',
  lastName: 'Administrator',
  role: 'admin'
};

async function createDemoOrganization() {
  try {
    logger.info('Creating demo organization...');
    
    const query = `
      INSERT INTO organizations (name, domain, subscription_tier, max_users, max_investigations, settings)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (domain) DO UPDATE SET
        name = EXCLUDED.name,
        subscription_tier = EXCLUDED.subscription_tier,
        max_users = EXCLUDED.max_users,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [
      DEMO_ORGANIZATION.name,
      DEMO_ORGANIZATION.domain,
      DEMO_ORGANIZATION.subscriptionTier,
      DEMO_ORGANIZATION.maxUsers,
      1000, // max_investigations
      JSON.stringify({
        features: ['threat_intelligence', 'picus_integration', 'siem_integration'],
        security_controls: true,
        api_access: true
      })
    ];

    const client = await databaseService.pool.connect();
    try {
      const result = await client.query(query, values);
      const organization = result.rows[0];
      logger.info(`✅ Demo organization created: ${organization.name} (ID: ${organization.id})`);
      return organization;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Failed to create demo organization:', error);
    throw error;
  }
}

async function createDemoUser(organizationId: string) {
  try {
    logger.info('Creating demo admin user...');
    
    // First check if user already exists
    const existingUser = await databaseService.getUserByEmail(DEMO_USER.email);
    if (existingUser) {
      logger.info('✅ Demo user already exists:', existingUser.email);
      return existingUser;
    }

    // Create new user
    const newUser = await databaseService.createUser({
      organization_id: organizationId,
      email: DEMO_USER.email,
      username: DEMO_USER.username,
      password: DEMO_USER.password,
      first_name: DEMO_USER.firstName,
      last_name: DEMO_USER.lastName,
      role: DEMO_USER.role,
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
      is_active: true,
      preferences: {
        theme: 'dark',
        notifications: true,
        defaultView: 'dashboard'
      }
    });

    logger.info(`✅ Demo user created: ${newUser.email} (ID: ${newUser.id})`);
    return newUser;
  } catch (error) {
    logger.error('Failed to create demo user:', error);
    throw error;
  }
}

async function initializeDemoData() {
  try {
    logger.info('🚀 Initializing ThreatFlow demo data...');
    
    // Initialize database connection
    await databaseService.initialize();
    logger.info('✅ Database connection established');

    // Create demo organization
    const organization = await createDemoOrganization();
    
    // Create demo user
    const user = await createDemoUser(organization.id);
    
    logger.info('🎉 Demo initialization complete!');
    logger.info('');
    logger.info('='.repeat(60));
    logger.info('🔐 DEMO LOGIN CREDENTIALS');
    logger.info('='.repeat(60));
    logger.info(`Email:    ${DEMO_USER.email}`);
    logger.info(`Username: ${DEMO_USER.username}`);
    logger.info(`Password: ${DEMO_USER.password}`);
    logger.info(`Role:     ${DEMO_USER.role}`);
    logger.info('='.repeat(60));
    logger.info('');
    logger.info('🌐 Access the application at: http://localhost:5173');
    logger.info('📡 API endpoints available at: http://localhost:3001/api');
    logger.info('');

  } catch (error) {
    logger.error('❌ Failed to initialize demo data:', error);
    
    if (error.code === '28P01') {
      logger.error('');
      logger.error('💡 Database authentication failed. Please check:');
      logger.error('1. PostgreSQL is running');
      logger.error('2. Database credentials in .env file');
      logger.error('3. Database and user exist with proper permissions');
      logger.error('');
      logger.error('🔧 Quick setup commands:');
      logger.error('sudo -u postgres psql');
      logger.error('CREATE USER threatflow_user WITH PASSWORD \'your_secure_password\';');
      logger.error('CREATE DATABASE threatflow_db OWNER threatflow_user;');
      logger.error('GRANT ALL PRIVILEGES ON DATABASE threatflow_db TO threatflow_user;');
    }
    
    process.exit(1);
  } finally {
    // Close database connection
    if (databaseService.pool) {
      await databaseService.pool.end();
    }
  }
}

// Run the initialization
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDemoData();
}

export { initializeDemoData, DEMO_USER, DEMO_ORGANIZATION };