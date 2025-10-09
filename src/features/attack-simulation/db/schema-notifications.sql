-- Notification System Schema
-- Database tables for multi-channel notification delivery

-- Notification channel configurations
CREATE TABLE IF NOT EXISTS notification_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'slack', 'teams', 'sms', 'pagerduty', 'webhook')),
  name VARCHAR(200) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB NOT NULL, -- Channel-specific configuration (SMTP, webhook URLs, API keys, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(channel, name)
);

-- Sent notifications log
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(50) NOT NULL,
  config_id UUID REFERENCES notification_configs(id) ON DELETE SET NULL,
  recipients JSONB NOT NULL, -- Array of recipients (emails, phone numbers, user IDs, etc.)
  subject VARCHAR(500),
  message TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  metadata JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
  message_id VARCHAR(200), -- External message ID from provider
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE
);

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  channel VARCHAR(50) NOT NULL,
  subject_template VARCHAR(500),
  message_template TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  variables TEXT[], -- List of variables that can be interpolated
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Notification subscriptions (user preferences)
CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, -- 'job_complete', 'gap_detected', 'workflow_failed', etc.
  channels VARCHAR(50)[] NOT NULL, -- Array of channels user wants to receive notifications on
  enabled BOOLEAN DEFAULT true,
  filter_conditions JSONB DEFAULT '{}'::jsonb, -- Conditions for when to send (severity, technique, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, event_type)
);

-- Notification delivery tracking
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  recipient VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'delivered', 'bounced', 'failed', 'opened', 'clicked')),
  status_details TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification rate limiting
CREATE TABLE IF NOT EXISTS notification_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(50) NOT NULL,
  recipient VARCHAR(200) NOT NULL,
  notifications_sent INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  window_duration_minutes INTEGER DEFAULT 60,
  max_per_window INTEGER DEFAULT 10,
  UNIQUE(channel, recipient, window_start)
);

-- Notification schedules (for recurring/scheduled notifications)
CREATE TABLE IF NOT EXISTS notification_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  template_id UUID REFERENCES notification_templates(id) ON DELETE CASCADE,
  recipients JSONB NOT NULL,
  variables JSONB DEFAULT '{}'::jsonb,
  cron_expression VARCHAR(100) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  enabled BOOLEAN DEFAULT true,
  last_execution_at TIMESTAMP WITH TIME ZONE,
  next_execution_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_configs_channel ON notification_configs(channel);
CREATE INDEX IF NOT EXISTS idx_notification_configs_enabled ON notification_configs(enabled);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_config ON notifications(config_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_channel ON notification_templates(channel);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user ON notification_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_event ON notification_subscriptions(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_enabled ON notification_subscriptions(enabled);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_notification ON notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_rate_limits_lookup ON notification_rate_limits(channel, recipient);
CREATE INDEX IF NOT EXISTS idx_notification_schedules_next_execution ON notification_schedules(next_execution_at);
CREATE INDEX IF NOT EXISTS idx_notification_schedules_enabled ON notification_schedules(enabled);

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_notification_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_config_timestamp
BEFORE UPDATE ON notification_configs
FOR EACH ROW
EXECUTE FUNCTION update_notification_config_timestamp();

CREATE TRIGGER trigger_update_notification_template_timestamp
BEFORE UPDATE ON notification_templates
FOR EACH ROW
EXECUTE FUNCTION update_notification_config_timestamp();

CREATE TRIGGER trigger_update_notification_subscription_timestamp
BEFORE UPDATE ON notification_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_notification_config_timestamp();

CREATE TRIGGER trigger_update_notification_schedule_timestamp
BEFORE UPDATE ON notification_schedules
FOR EACH ROW
EXECUTE FUNCTION update_notification_config_timestamp();

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_notification_rate_limit(
  p_channel VARCHAR(50),
  p_recipient VARCHAR(200),
  p_window_minutes INTEGER DEFAULT 60,
  p_max_per_window INTEGER DEFAULT 10
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  -- Count notifications sent to this recipient in the time window
  SELECT COUNT(*)
  INTO v_count
  FROM notifications
  WHERE channel = p_channel
    AND recipients::text LIKE '%' || p_recipient || '%'
    AND created_at >= v_window_start;

  RETURN v_count < p_max_per_window;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE notification_configs IS 'Configuration for notification channels (email, Slack, Teams, etc.)';
COMMENT ON TABLE notifications IS 'Log of all sent notifications with delivery status';
COMMENT ON TABLE notification_templates IS 'Reusable notification templates with variable interpolation';
COMMENT ON TABLE notification_subscriptions IS 'User notification preferences and event subscriptions';
COMMENT ON TABLE notification_delivery_log IS 'Detailed delivery tracking for each notification recipient';
COMMENT ON TABLE notification_rate_limits IS 'Rate limiting to prevent notification spam';
COMMENT ON TABLE notification_schedules IS 'Scheduled recurring notifications (cron-based)';

COMMENT ON COLUMN notification_configs.config IS 'Channel-specific configuration (SMTP settings, webhook URLs, API keys, etc.) - should be encrypted';
COMMENT ON COLUMN notifications.recipients IS 'JSONB array of recipients (emails, phone numbers, user IDs, channel IDs)';
COMMENT ON COLUMN notifications.metadata IS 'Additional context data (job_id, technique_id, severity, etc.)';
COMMENT ON COLUMN notification_templates.variables IS 'List of variable names that can be used in templates (e.g., {job_id}, {severity})';
COMMENT ON COLUMN notification_subscriptions.filter_conditions IS 'JSONB conditions for when to send notifications (e.g., {"severity": "high"})';
