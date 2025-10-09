-- Ticketing Integration Schema
-- Database tables for ticketing/ITSM platform integrations

-- Ticketing system configurations
CREATE TABLE IF NOT EXISTS ticketing_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('jira', 'servicenow', 'azure_devops', 'github', 'custom')),
  name VARCHAR(200) NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL, -- Encrypted in production
  username VARCHAR(200),
  project_key VARCHAR(100), -- Jira project key
  organization_id VARCHAR(200), -- Azure DevOps organization
  repository_owner VARCHAR(200), -- GitHub repo owner
  repository_name VARCHAR(200), -- GitHub repo name
  additional_config JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(platform, name)
);

-- Tickets created from simulations
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticketing_config_id UUID NOT NULL REFERENCES ticketing_integrations(id) ON DELETE CASCADE,
  external_ticket_id VARCHAR(200), -- Ticket ID in external system
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assignee VARCHAR(200),
  labels JSONB DEFAULT '[]'::jsonb,
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('gap', 'finding', 'recommendation', 'alert')),
  source_id UUID NOT NULL, -- ID of the gap/finding/recommendation
  job_id UUID REFERENCES simulation_jobs(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(ticketing_config_id, external_ticket_id)
);

-- Ticket status history
CREATE TABLE IF NOT EXISTS ticket_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  from_status VARCHAR(20),
  to_status VARCHAR(20) NOT NULL,
  comment TEXT,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ticket comments/updates
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  author VARCHAR(200),
  is_internal BOOLEAN DEFAULT false, -- Internal comment vs synced to external system
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Ticketing sync log
CREATE TABLE IF NOT EXISTS ticketing_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticketing_config_id UUID NOT NULL REFERENCES ticketing_integrations(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'status_change', 'comment'
  sync_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'success', 'failed', 'retrying')),
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_by UUID REFERENCES users(id)
);

-- Auto-ticketing rules
CREATE TABLE IF NOT EXISTS auto_ticketing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  ticketing_config_id UUID NOT NULL REFERENCES ticketing_integrations(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,

  -- Trigger conditions
  trigger_on_source_type VARCHAR(50) CHECK (trigger_on_source_type IN ('gap', 'finding', 'recommendation', 'alert')),
  min_severity VARCHAR(20) CHECK (min_severity IN ('low', 'medium', 'high', 'critical')),
  technique_ids TEXT[], -- Array of MITRE ATT&CK technique IDs
  categories TEXT[], -- Array of categories to match

  -- Ticket template
  title_template TEXT NOT NULL,
  description_template TEXT NOT NULL,
  default_priority VARCHAR(20) DEFAULT 'medium',
  default_assignee VARCHAR(200),
  default_labels JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(name)
);

-- Rule execution history
CREATE TABLE IF NOT EXISTS auto_ticketing_rule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES auto_ticketing_rules(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
  source_id UUID NOT NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  execution_status VARCHAR(20) NOT NULL CHECK (execution_status IN ('success', 'failed', 'skipped')),
  reason TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ticketing_integrations_platform ON ticketing_integrations(platform);
CREATE INDEX IF NOT EXISTS idx_ticketing_integrations_enabled ON ticketing_integrations(enabled);
CREATE INDEX IF NOT EXISTS idx_tickets_config ON tickets(ticketing_config_id);
CREATE INDEX IF NOT EXISTS idx_tickets_source ON tickets(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_tickets_job ON tickets(job_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_status_history_ticket ON ticket_status_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticketing_sync_log_config ON ticketing_sync_log(ticketing_config_id);
CREATE INDEX IF NOT EXISTS idx_ticketing_sync_log_ticket ON ticketing_sync_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticketing_sync_log_status ON ticketing_sync_log(sync_status);
CREATE INDEX IF NOT EXISTS idx_auto_ticketing_rules_enabled ON auto_ticketing_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_auto_ticketing_rule_executions_rule ON auto_ticketing_rule_executions(rule_id);

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_ticketing_integration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ticketing_integration_timestamp
BEFORE UPDATE ON ticketing_integrations
FOR EACH ROW
EXECUTE FUNCTION update_ticketing_integration_timestamp();

CREATE TRIGGER trigger_update_ticket_timestamp
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION update_ticketing_integration_timestamp();

CREATE TRIGGER trigger_update_auto_ticketing_rule_timestamp
BEFORE UPDATE ON auto_ticketing_rules
FOR EACH ROW
EXECUTE FUNCTION update_ticketing_integration_timestamp();

-- Function to track ticket status changes
CREATE OR REPLACE FUNCTION track_ticket_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ticket_status_history (ticket_id, from_status, to_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_ticket_status_change
AFTER UPDATE ON tickets
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION track_ticket_status_change();

-- Comments for documentation
COMMENT ON TABLE ticketing_integrations IS 'Ticketing/ITSM platform configurations';
COMMENT ON TABLE tickets IS 'Tickets created from simulation results';
COMMENT ON TABLE ticket_status_history IS 'History of ticket status transitions';
COMMENT ON TABLE ticket_comments IS 'Comments and updates on tickets';
COMMENT ON TABLE ticketing_sync_log IS 'Log of synchronization operations with external ticketing systems';
COMMENT ON TABLE auto_ticketing_rules IS 'Automated ticketing rules based on simulation results';
COMMENT ON TABLE auto_ticketing_rule_executions IS 'History of automatic ticket creation rule executions';

COMMENT ON COLUMN ticketing_integrations.api_key IS 'API key for ticketing platform (should be encrypted at rest)';
COMMENT ON COLUMN tickets.external_ticket_id IS 'Ticket ID in the external ticketing system';
COMMENT ON COLUMN tickets.source_type IS 'Type of source that created the ticket: gap, finding, recommendation, or alert';
COMMENT ON COLUMN tickets.source_id IS 'UUID of the source record (gap_id, finding_id, etc.)';
COMMENT ON COLUMN auto_ticketing_rules.title_template IS 'Template for ticket title with variables like {technique_name}, {severity}';
COMMENT ON COLUMN auto_ticketing_rules.description_template IS 'Template for ticket description with variables';
