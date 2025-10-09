-- Automated Response Workflow Schema
-- Database tables for workflow automation and orchestration

-- Automated workflows
CREATE TABLE IF NOT EXISTS automated_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  enabled BOOLEAN DEFAULT true,

  -- Trigger configuration
  trigger VARCHAR(50) NOT NULL CHECK (trigger IN ('job_complete', 'gap_detected', 'technique_failed', 'technique_passed', 'manual', 'scheduled')),
  trigger_conditions JSONB DEFAULT '[]'::jsonb, -- Array of condition objects

  -- Actions configuration
  actions JSONB NOT NULL, -- Array of action objects

  -- Notification settings
  notify_on_success BOOLEAN DEFAULT false,
  notify_on_failure BOOLEAN DEFAULT true,
  notification_channels JSONB DEFAULT '[]'::jsonb, -- Array of channel names/emails

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow executions
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES automated_workflows(id) ON DELETE CASCADE,

  -- Execution context
  job_id UUID REFERENCES simulation_jobs(id) ON DELETE SET NULL,
  source_type VARCHAR(50), -- 'gap', 'finding', 'technique', etc.
  source_id UUID, -- ID of the triggering source

  -- Execution status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Execution details
  execution_log JSONB DEFAULT '[]'::jsonb, -- Array of action execution logs
  error TEXT,

  -- Metadata
  triggered_by UUID REFERENCES users(id)
);

-- Workflow notifications
CREATE TABLE IF NOT EXISTS workflow_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  channels JSONB NOT NULL, -- Array of notification channels
  subject VARCHAR(500),
  message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivery_status JSONB DEFAULT '{}'::jsonb -- Status for each channel
);

-- Workflow report requests
CREATE TABLE IF NOT EXISTS workflow_report_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL,
  format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'html', 'json', 'xlsx')),
  include_charts BOOLEAN DEFAULT true,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  report_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Workflow schedule
CREATE TABLE IF NOT EXISTS workflow_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES automated_workflows(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,

  -- Schedule configuration
  cron_expression VARCHAR(100) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',

  -- Execution context for scheduled runs
  default_context JSONB DEFAULT '{}'::jsonb,

  -- Schedule metadata
  last_execution_at TIMESTAMP WITH TIME ZONE,
  next_execution_at TIMESTAMP WITH TIME ZONE,
  execution_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(workflow_id, cron_expression)
);

-- Workflow templates
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50), -- 'security', 'compliance', 'incident_response', etc.

  -- Template configuration
  trigger VARCHAR(50) NOT NULL,
  default_conditions JSONB DEFAULT '[]'::jsonb,
  action_templates JSONB NOT NULL,

  -- Metadata
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow action library
CREATE TABLE IF NOT EXISTS workflow_action_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  action_type VARCHAR(50) NOT NULL,

  -- Action configuration schema
  config_schema JSONB NOT NULL, -- JSON Schema for validation
  default_config JSONB DEFAULT '{}'::jsonb,

  -- Action metadata
  category VARCHAR(50),
  tags TEXT[],
  is_custom BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow execution statistics
CREATE TABLE IF NOT EXISTS workflow_execution_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES automated_workflows(id) ON DELETE CASCADE,

  -- Time period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Statistics
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  average_execution_time_seconds INTEGER,
  total_actions_executed INTEGER DEFAULT 0,

  -- Aggregated at
  aggregated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(workflow_id, period_start, period_end)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_automated_workflows_enabled ON automated_workflows(enabled);
CREATE INDEX IF NOT EXISTS idx_automated_workflows_trigger ON automated_workflows(trigger);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_job ON workflow_executions(job_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_execution ON workflow_notifications(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_report_requests_execution ON workflow_report_requests(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_report_requests_status ON workflow_report_requests(status);
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_workflow ON workflow_schedules(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_enabled ON workflow_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_next_execution ON workflow_schedules(next_execution_at);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_public ON workflow_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_workflow_action_library_type ON workflow_action_library(action_type);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_stats_workflow ON workflow_execution_stats(workflow_id);

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_workflow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_workflow_timestamp
BEFORE UPDATE ON automated_workflows
FOR EACH ROW
EXECUTE FUNCTION update_workflow_timestamp();

CREATE TRIGGER trigger_update_workflow_schedule_timestamp
BEFORE UPDATE ON workflow_schedules
FOR EACH ROW
EXECUTE FUNCTION update_workflow_timestamp();

-- Function to update schedule execution tracking
CREATE OR REPLACE FUNCTION track_workflow_schedule_execution()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' OR NEW.status = 'failed' THEN
    UPDATE workflow_schedules
    SET
      last_execution_at = NOW(),
      execution_count = execution_count + 1,
      failure_count = CASE WHEN NEW.status = 'failed' THEN failure_count + 1 ELSE failure_count END
    WHERE workflow_id = NEW.workflow_id
    AND EXISTS (
      SELECT 1 FROM workflow_schedules WHERE workflow_id = NEW.workflow_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_workflow_schedule_execution
AFTER UPDATE ON workflow_executions
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND (NEW.status = 'completed' OR NEW.status = 'failed'))
EXECUTE FUNCTION track_workflow_schedule_execution();

-- Function to increment template usage
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NOT NULL AND NEW.workflow_id IS NOT NULL THEN
    UPDATE workflow_templates
    SET usage_count = usage_count + 1
    WHERE id IN (
      SELECT id FROM workflow_templates
      WHERE name IN (
        SELECT name FROM automated_workflows WHERE id = NEW.workflow_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_template_usage
AFTER INSERT ON workflow_executions
FOR EACH ROW
EXECUTE FUNCTION increment_template_usage();

-- Comments for documentation
COMMENT ON TABLE automated_workflows IS 'Automated response workflows triggered by simulation events';
COMMENT ON TABLE workflow_executions IS 'History of workflow execution runs';
COMMENT ON TABLE workflow_notifications IS 'Notifications sent by workflows';
COMMENT ON TABLE workflow_report_requests IS 'Report generation requests from workflows';
COMMENT ON TABLE workflow_schedules IS 'Scheduled workflow executions (cron-like)';
COMMENT ON TABLE workflow_templates IS 'Reusable workflow templates';
COMMENT ON TABLE workflow_action_library IS 'Library of available workflow actions';
COMMENT ON TABLE workflow_execution_stats IS 'Aggregated statistics for workflow performance';

COMMENT ON COLUMN automated_workflows.trigger_conditions IS 'JSONB array of condition objects for triggering workflow';
COMMENT ON COLUMN automated_workflows.actions IS 'JSONB array of action configuration objects';
COMMENT ON COLUMN workflow_executions.execution_log IS 'JSONB array tracking each action execution with timestamps and results';
COMMENT ON COLUMN workflow_schedules.cron_expression IS 'Cron expression for scheduling (e.g., "0 0 * * *" for daily)';
COMMENT ON COLUMN workflow_action_library.config_schema IS 'JSON Schema defining required and optional configuration fields for the action';
