-- Scheduling System Schema
-- Database tables for recurring attack simulation scheduling

-- Simulation schedules
CREATE TABLE IF NOT EXISTS simulation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,

  -- Schedule configuration
  schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('cron', 'one_time', 'interval')),
  cron_expression VARCHAR(100), -- For cron type: "0 0 * * *"
  scheduled_time TIMESTAMP WITH TIME ZONE, -- For one_time type
  interval_minutes INTEGER, -- For interval type
  timezone VARCHAR(50) DEFAULT 'UTC',

  -- Simulation parameters
  simulation_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- techniques, platform, mode, etc.

  -- Execution window constraints
  business_hours_only BOOLEAN DEFAULT false,
  maintenance_windows JSONB DEFAULT '[]'::jsonb, -- Array of {dayOfWeek, startTime, endTime}

  -- Execution tracking
  last_execution_at TIMESTAMP WITH TIME ZONE,
  last_execution_job_id UUID REFERENCES simulation_jobs(id) ON DELETE SET NULL,
  last_execution_status VARCHAR(20) CHECK (last_execution_status IN ('success', 'failed', 'cancelled')),
  next_execution_at TIMESTAMP WITH TIME ZONE,
  execution_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,

  -- Limits and controls
  max_executions INTEGER, -- Stop after N executions
  expires_at TIMESTAMP WITH TIME ZONE, -- Schedule expiration
  retry_on_failure BOOLEAN DEFAULT false,
  max_retries INTEGER DEFAULT 3,

  -- Notifications
  notify_on_start BOOLEAN DEFAULT false,
  notify_on_complete BOOLEAN DEFAULT false,
  notify_on_failure BOOLEAN DEFAULT true,
  notification_channels JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(name)
);

-- Scheduled executions log
CREATE TABLE IF NOT EXISTS scheduled_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES simulation_schedules(id) ON DELETE CASCADE,
  job_id UUID REFERENCES simulation_jobs(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schedule execution statistics (aggregated)
CREATE TABLE IF NOT EXISTS schedule_execution_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES simulation_schedules(id) ON DELETE CASCADE,

  -- Time period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Statistics
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  cancelled_executions INTEGER DEFAULT 0,
  average_execution_time_seconds INTEGER,
  success_rate FLOAT,

  -- Aggregated at
  aggregated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(schedule_id, period_start, period_end)
);

-- Schedule change history
CREATE TABLE IF NOT EXISTS schedule_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES simulation_schedules(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'enabled', 'disabled', 'deleted')),
  changed_fields JSONB,
  previous_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_simulation_schedules_enabled ON simulation_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_simulation_schedules_next_execution ON simulation_schedules(next_execution_at);
CREATE INDEX IF NOT EXISTS idx_simulation_schedules_schedule_type ON simulation_schedules(schedule_type);
CREATE INDEX IF NOT EXISTS idx_simulation_schedules_expires ON simulation_schedules(expires_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_executions_schedule ON scheduled_executions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_executions_status ON scheduled_executions(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_executions_scheduled_for ON scheduled_executions(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_schedule_execution_stats_schedule ON schedule_execution_stats(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_execution_stats_period ON schedule_execution_stats(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_schedule_change_history_schedule ON schedule_change_history(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_change_history_changed_at ON schedule_change_history(changed_at);

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_schedule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_schedule_timestamp
BEFORE UPDATE ON simulation_schedules
FOR EACH ROW
EXECUTE FUNCTION update_schedule_timestamp();

-- Track schedule changes
CREATE OR REPLACE FUNCTION track_schedule_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_action VARCHAR(50);
  v_changed_fields JSONB;
  v_previous_values JSONB;
  v_new_values JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_new_values := row_to_json(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.enabled = true AND NEW.enabled = false THEN
      v_action := 'disabled';
    ELSIF OLD.enabled = false AND NEW.enabled = true THEN
      v_action := 'enabled';
    ELSE
      v_action := 'updated';
    END IF;
    v_previous_values := row_to_json(OLD);
    v_new_values := row_to_json(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_previous_values := row_to_json(OLD);
  END IF;

  INSERT INTO schedule_change_history (
    schedule_id, action, previous_values, new_values
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    v_action,
    v_previous_values,
    v_new_values
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_schedule_changes
AFTER INSERT OR UPDATE OR DELETE ON simulation_schedules
FOR EACH ROW
EXECUTE FUNCTION track_schedule_changes();

-- Update execution count on schedule
CREATE OR REPLACE FUNCTION update_schedule_on_execution()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' OR NEW.status = 'failed' THEN
    UPDATE simulation_schedules
    SET
      last_execution_at = NEW.started_at,
      last_execution_job_id = NEW.job_id,
      last_execution_status = CASE
        WHEN NEW.status = 'completed' THEN 'success'
        ELSE 'failed'
      END,
      execution_count = CASE
        WHEN NEW.status = 'completed' THEN execution_count + 1
        ELSE execution_count
      END,
      failure_count = CASE
        WHEN NEW.status = 'failed' THEN failure_count + 1
        ELSE failure_count
      END
    WHERE id = NEW.schedule_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_schedule_on_execution
AFTER UPDATE ON scheduled_executions
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_schedule_on_execution();

-- Function to get active schedules due for execution
CREATE OR REPLACE FUNCTION get_due_schedules(p_buffer_minutes INTEGER DEFAULT 5)
RETURNS TABLE (
  schedule_id UUID,
  schedule_name VARCHAR(200),
  next_execution_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id as schedule_id,
    name as schedule_name,
    next_execution_at
  FROM simulation_schedules
  WHERE enabled = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_executions IS NULL OR execution_count < max_executions)
    AND next_execution_at IS NOT NULL
    AND next_execution_at <= (NOW() + (p_buffer_minutes || ' minutes')::INTERVAL)
  ORDER BY next_execution_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE simulation_schedules IS 'Scheduled attack simulation configurations with cron/interval/one-time scheduling';
COMMENT ON TABLE scheduled_executions IS 'Log of scheduled simulation executions with status tracking';
COMMENT ON TABLE schedule_execution_stats IS 'Aggregated statistics for schedule performance over time periods';
COMMENT ON TABLE schedule_change_history IS 'Audit trail of all schedule configuration changes';

COMMENT ON COLUMN simulation_schedules.schedule_type IS 'Type of schedule: cron (recurring), one_time (single execution), or interval (every N minutes)';
COMMENT ON COLUMN simulation_schedules.cron_expression IS 'Standard cron expression (e.g., "0 0 * * *" for daily at midnight)';
COMMENT ON COLUMN simulation_schedules.simulation_config IS 'JSONB configuration for simulation parameters (techniques, platform, mode, etc.)';
COMMENT ON COLUMN simulation_schedules.business_hours_only IS 'If true, only execute during business hours (Monday-Friday, 9 AM - 5 PM)';
COMMENT ON COLUMN simulation_schedules.maintenance_windows IS 'JSONB array of maintenance windows when simulations should NOT run';
COMMENT ON COLUMN scheduled_executions.retry_count IS 'Number of retry attempts for failed executions';
