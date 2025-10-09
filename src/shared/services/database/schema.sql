-- ThreatFlow Enterprise Database Schema
-- PostgreSQL Schema for Threat Intelligence Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- CORE TABLES
-- ==========================================

-- Organizations (Multi-tenant support)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  subscription_tier VARCHAR(50) DEFAULT 'basic',
  max_users INTEGER DEFAULT 10,
  max_investigations INTEGER DEFAULT 100,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users and Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- For local auth, nullable for SSO-only users
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'analyst', -- analyst, senior_analyst, team_lead, admin
  permissions JSONB DEFAULT '[]',
  sso_provider VARCHAR(50), -- azure, google, okta, etc.
  sso_subject VARCHAR(255),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions and Authentication Tokens
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INVESTIGATION TABLES
-- ==========================================

-- Investigation Cases
CREATE TABLE investigations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
  status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved, closed
  classification VARCHAR(50), -- confidential, restricted, internal, public
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  source_url TEXT,
  source_type VARCHAR(50), -- url, text, file, api
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Investigation Collaborators
CREATE TABLE investigation_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'viewer', -- owner, collaborator, viewer
  added_by UUID NOT NULL REFERENCES users(id),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(investigation_id, user_id)
);

-- Investigation Notes and Comments
CREATE TABLE investigation_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  parent_note_id UUID REFERENCES investigation_notes(id), -- For threaded comments
  content TEXT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'comment', -- comment, hypothesis, finding, action
  is_private BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- THREAT INTELLIGENCE TABLES
-- ==========================================

-- IOC (Indicators of Compromise)
CREATE TABLE indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  investigation_id UUID REFERENCES investigations(id),
  type VARCHAR(50) NOT NULL, -- ip, domain, url, hash, email, etc.
  value TEXT NOT NULL,
  context TEXT,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
  source VARCHAR(255),
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- IOA (Indicators of Attack/Activity)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  investigation_id UUID REFERENCES investigations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  mitre_technique_id VARCHAR(20),
  mitre_tactic VARCHAR(100),
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  severity VARCHAR(20) DEFAULT 'medium',
  signatures JSONB DEFAULT '[]',
  context TEXT,
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attack Flow Nodes (from visualization)
CREATE TABLE attack_flow_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
  node_id VARCHAR(255) NOT NULL, -- Original node ID from visualization
  node_type VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  description TEXT,
  mitre_technique_id VARCHAR(20),
  mitre_tactic VARCHAR(100),
  position_x DECIMAL,
  position_y DECIMAL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attack Flow Edges (relationships between nodes)
CREATE TABLE attack_flow_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
  edge_id VARCHAR(255) NOT NULL, -- Original edge ID from visualization
  source_node_id UUID NOT NULL REFERENCES attack_flow_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES attack_flow_nodes(id) ON DELETE CASCADE,
  edge_type VARCHAR(50),
  label VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INTEGRATION TABLES
-- ==========================================

-- SIEM Integrations
CREATE TABLE siem_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- splunk, qradar, sentinel, elastic
  config JSONB NOT NULL, -- Encrypted connection details
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(50) DEFAULT 'pending', -- pending, success, error
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SIEM Alert Correlation
CREATE TABLE siem_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  siem_integration_id UUID NOT NULL REFERENCES siem_integrations(id) ON DELETE CASCADE,
  investigation_id UUID REFERENCES investigations(id),
  external_id VARCHAR(255) NOT NULL, -- ID in SIEM system
  title VARCHAR(255),
  description TEXT,
  severity VARCHAR(20),
  status VARCHAR(50),
  raw_data JSONB,
  correlated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- AUDIT AND COMPLIANCE TABLES
-- ==========================================

-- Audit Log for all system activities
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- login, create_investigation, export_data, etc.
  resource_type VARCHAR(50), -- investigation, indicator, user, etc.
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Data Retention Policies
CREATE TABLE data_retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,
  retention_days INTEGER NOT NULL,
  auto_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_sso_subject ON users(sso_subject);

-- Investigation queries
CREATE INDEX idx_investigations_org_status ON investigations(organization_id, status);
CREATE INDEX idx_investigations_assigned ON investigations(assigned_to);
CREATE INDEX idx_investigations_created_by ON investigations(created_by);
CREATE INDEX idx_investigations_created_at ON investigations(created_at DESC);

-- Indicator searches
CREATE INDEX idx_indicators_type_value ON indicators(type, value);
CREATE INDEX idx_indicators_org_active ON indicators(organization_id, is_active);
CREATE INDEX idx_indicators_investigation ON indicators(investigation_id);
CREATE INDEX idx_indicators_first_seen ON indicators(first_seen DESC);

-- Activity searches
CREATE INDEX idx_activities_mitre ON activities(mitre_technique_id, mitre_tactic);
CREATE INDEX idx_activities_org_investigation ON activities(organization_id, investigation_id);

-- Session management
CREATE INDEX idx_sessions_user_active ON user_sessions(user_id, is_active);
CREATE INDEX idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- Audit queries
CREATE INDEX idx_audit_org_created ON audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_user_action ON audit_log(user_id, action);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);

-- SIEM integration
CREATE INDEX idx_siem_org_active ON siem_integrations(organization_id, is_active);
CREATE INDEX idx_siem_alerts_external ON siem_alerts(external_id);

-- ==========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==========================================

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_investigations_updated_at BEFORE UPDATE ON investigations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_indicators_updated_at BEFORE UPDATE ON indicators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ==========================================
-- THREAT INTELLIGENCE TABLES
-- ==========================================

-- Threat intelligence feeds
CREATE TABLE IF NOT EXISTS threat_feeds (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('misp', 'otx', 'virustotal', 'crowdstrike', 'mandiant', 'custom')),
    status VARCHAR(20) NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error', 'syncing')),
    last_sync TIMESTAMP WITH TIME ZONE,
    total_indicators INTEGER DEFAULT 0,
    new_indicators_24h INTEGER DEFAULT 0,
    confidence VARCHAR(10) DEFAULT 'medium' CHECK (confidence IN ('low', 'medium', 'high')),
    tags TEXT[],
    config JSONB NOT NULL DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_threat_feeds_status ON threat_feeds(status);
CREATE INDEX IF NOT EXISTS idx_threat_feeds_provider ON threat_feeds(provider);
CREATE INDEX IF NOT EXISTS idx_threat_feeds_last_sync ON threat_feeds(last_sync);

-- Threat indicators from feeds
CREATE TABLE IF NOT EXISTS threat_indicators (
    id VARCHAR(50) PRIMARY KEY,
    feed_id VARCHAR(50) NOT NULL REFERENCES threat_feeds(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    value TEXT NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.5,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    tags TEXT[],
    malware_family VARCHAR(255),
    threat_type VARCHAR(255),
    description TEXT,
    references TEXT[],
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tlp VARCHAR(10) DEFAULT 'white' CHECK (tlp IN ('white', 'green', 'amber', 'red')),
    source VARCHAR(255),
    context JSONB DEFAULT '{}',
    enrichment JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(feed_id, type, value)
);

CREATE INDEX IF NOT EXISTS idx_threat_indicators_value ON threat_indicators(value);
CREATE INDEX IF NOT EXISTS idx_threat_indicators_type ON threat_indicators(type);
CREATE INDEX IF NOT EXISTS idx_threat_indicators_feed_id ON threat_indicators(feed_id);
CREATE INDEX IF NOT EXISTS idx_threat_indicators_severity ON threat_indicators(severity);
CREATE INDEX IF NOT EXISTS idx_threat_indicators_confidence ON threat_indicators(confidence);
CREATE INDEX IF NOT EXISTS idx_threat_indicators_last_seen ON threat_indicators(last_seen);
CREATE INDEX IF NOT EXISTS idx_threat_indicators_tags ON threat_indicators USING GIN(tags);

-- ==========================================
-- SOC METRICS AND ANALYTICS TABLES
-- ==========================================

-- SOC dashboard metrics
CREATE TABLE IF NOT EXISTS soc_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    value DECIMAL(15,4) NOT NULL,
    unit VARCHAR(20),
    tags JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_soc_metrics_org_id ON soc_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_soc_metrics_type ON soc_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_soc_metrics_recorded_at ON soc_metrics(recorded_at);

-- Alert triage queue
CREATE TABLE IF NOT EXISTS alert_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_system VARCHAR(100) NOT NULL,
    alert_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'escalated', 'resolved', 'false_positive')),
    assigned_to UUID REFERENCES users(id),
    investigation_id UUID REFERENCES investigations(id),
    raw_data JSONB,
    enrichment_data JSONB DEFAULT '{}',
    auto_triage_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(organization_id, source_system, alert_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_queue_org_id ON alert_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_alert_queue_status ON alert_queue(status);
CREATE INDEX IF NOT EXISTS idx_alert_queue_severity ON alert_queue(severity);
CREATE INDEX IF NOT EXISTS idx_alert_queue_priority ON alert_queue(priority);
CREATE INDEX IF NOT EXISTS idx_alert_queue_assigned_to ON alert_queue(assigned_to);
CREATE INDEX IF NOT EXISTS idx_alert_queue_created_at ON alert_queue(created_at);

-- Threat hunting queries and results
CREATE TABLE IF NOT EXISTS threat_hunting_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    query_type VARCHAR(50) NOT NULL CHECK (query_type IN ('kql', 'spl', 'sql', 'yara', 'sigma')),
    query_content TEXT NOT NULL,
    data_sources TEXT[],
    mitre_techniques TEXT[],
    tags TEXT[],
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule_cron VARCHAR(100),
    last_executed TIMESTAMP WITH TIME ZONE,
    execution_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_threat_hunting_queries_org_id ON threat_hunting_queries(organization_id);
CREATE INDEX IF NOT EXISTS idx_threat_hunting_queries_created_by ON threat_hunting_queries(created_by);
CREATE INDEX IF NOT EXISTS idx_threat_hunting_queries_type ON threat_hunting_queries(query_type);

-- Threat hunting query results
CREATE TABLE IF NOT EXISTS threat_hunting_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_id UUID NOT NULL REFERENCES threat_hunting_queries(id) ON DELETE CASCADE,
    executed_by UUID NOT NULL REFERENCES users(id),
    result_count INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    results_data JSONB DEFAULT '{}',
    findings_summary JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed', 'timeout')),
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_threat_hunting_results_query_id ON threat_hunting_results(query_id);
CREATE INDEX IF NOT EXISTS idx_threat_hunting_results_executed_by ON threat_hunting_results(executed_by);
CREATE INDEX IF NOT EXISTS idx_threat_hunting_results_executed_at ON threat_hunting_results(executed_at);

-- SAMPLE DATA FOR DEVELOPMENT
-- ==========================================

-- Insert default organization
INSERT INTO organizations (id, name, domain, subscription_tier) VALUES 
('00000000-0000-0000-0000-000000000001', 'ThreatFlow Demo', 'demo.threatflow.com', 'enterprise');

-- Insert admin user (password: admin123!)
INSERT INTO users (id, organization_id, email, username, password_hash, first_name, last_name, role) VALUES 
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin@demo.threatflow.com', 'admin', '$2b$10$K7/w.0VKjI8aEqR1aDJ7OOxqWQYqP.iBdJxOwnC4tHlJlDOdW3m6a', 'System', 'Administrator', 'admin');

-- Insert sample investigation
INSERT INTO investigations (id, organization_id, created_by, title, description, priority, status) VALUES 
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Sample APT Investigation', 'Analysis of suspicious network activity indicating potential APT campaign', 'high', 'in_progress');