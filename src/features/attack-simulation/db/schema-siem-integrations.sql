-- SIEM Integration Schema
-- Database tables for SIEM platform integrations

-- SIEM configurations table
CREATE TABLE IF NOT EXISTS siem_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('splunk', 'sentinel', 'elastic', 'qradar', 'chronicle', 'custom')),
  name VARCHAR(200) NOT NULL,
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL, -- Encrypted in production
  tenant_id VARCHAR(200),
  workspace_id VARCHAR(200),
  additional_config JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(platform, name)
);

-- Detection rules deployed to SIEM
CREATE TABLE IF NOT EXISTS siem_detection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siem_config_id UUID NOT NULL REFERENCES siem_integrations(id) ON DELETE CASCADE,
  rule_id VARCHAR(200) NOT NULL,
  rule_name VARCHAR(200) NOT NULL,
  description TEXT,
  technique_id VARCHAR(20) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  query TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  enabled BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deployed_by UUID REFERENCES users(id),
  last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(siem_config_id, rule_id)
);

-- SIEM alert correlation tracking
CREATE TABLE IF NOT EXISTS siem_alert_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES simulation_jobs(id) ON DELETE CASCADE,
  siem_config_id UUID NOT NULL REFERENCES siem_integrations(id) ON DELETE CASCADE,
  technique_id VARCHAR(20) NOT NULL,
  technique_name VARCHAR(200),
  matched_alerts_count INTEGER DEFAULT 0,
  detection_time_seconds INTEGER, -- Time from execution to first alert
  alerts_data JSONB DEFAULT '[]'::jsonb,
  correlation_confidence FLOAT DEFAULT 0.0 CHECK (correlation_confidence >= 0 AND correlation_confidence <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, siem_config_id, technique_id)
);

-- SIEM query history
CREATE TABLE IF NOT EXISTS siem_query_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siem_config_id UUID NOT NULL REFERENCES siem_integrations(id) ON DELETE CASCADE,
  query_type VARCHAR(50) NOT NULL, -- 'alert_query', 'rule_deployment', 'correlation'
  query_params JSONB NOT NULL,
  results_count INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'timeout')),
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_by UUID REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_siem_integrations_platform ON siem_integrations(platform);
CREATE INDEX IF NOT EXISTS idx_siem_integrations_enabled ON siem_integrations(enabled);
CREATE INDEX IF NOT EXISTS idx_siem_detection_rules_config ON siem_detection_rules(siem_config_id);
CREATE INDEX IF NOT EXISTS idx_siem_detection_rules_technique ON siem_detection_rules(technique_id);
CREATE INDEX IF NOT EXISTS idx_siem_alert_correlations_job ON siem_alert_correlations(job_id);
CREATE INDEX IF NOT EXISTS idx_siem_alert_correlations_config ON siem_alert_correlations(siem_config_id);
CREATE INDEX IF NOT EXISTS idx_siem_query_history_config ON siem_query_history(siem_config_id);
CREATE INDEX IF NOT EXISTS idx_siem_query_history_executed_at ON siem_query_history(executed_at);

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_siem_integration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_siem_integration_timestamp
BEFORE UPDATE ON siem_integrations
FOR EACH ROW
EXECUTE FUNCTION update_siem_integration_timestamp();

-- Comments for documentation
COMMENT ON TABLE siem_integrations IS 'SIEM platform configurations for integration';
COMMENT ON TABLE siem_detection_rules IS 'Detection rules deployed to SIEM platforms';
COMMENT ON TABLE siem_alert_correlations IS 'Correlation between simulations and SIEM alerts';
COMMENT ON TABLE siem_query_history IS 'History of SIEM queries for auditing';

COMMENT ON COLUMN siem_integrations.api_key IS 'API key for SIEM platform (should be encrypted at rest)';
COMMENT ON COLUMN siem_alert_correlations.detection_time_seconds IS 'Time in seconds from technique execution to first SIEM alert';
COMMENT ON COLUMN siem_alert_correlations.correlation_confidence IS 'Confidence score (0-1) for the correlation match';
