-- Phase 4 Database Schema
-- Advanced features: ML, Reporting, Additional Integrations

-- ============================================================================
-- MACHINE LEARNING MODELS
-- ============================================================================

-- ML models registry
CREATE TABLE IF NOT EXISTS ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('anomaly_detection', 'gap_prediction', 'prioritization', 'recommendation', 'pattern_recognition')),
  version VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'training' CHECK (status IN ('training', 'trained', 'deployed', 'deprecated')),
  algorithm VARCHAR(100) NOT NULL,
  features TEXT[] NOT NULL,
  hyperparameters JSONB DEFAULT '{}'::jsonb,
  training_data_size INTEGER,
  accuracy FLOAT,
  precision FLOAT,
  recall FLOAT,
  f1_score FLOAT,
  trained_at TIMESTAMP WITH TIME ZONE,
  deployed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, version)
);

-- Anomaly detection results
CREATE TABLE IF NOT EXISTS ml_anomaly_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES simulation_jobs(id) ON DELETE CASCADE,
  anomalies JSONB NOT NULL,
  overall_anomaly_score FLOAT,
  analysis_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gap predictions
CREATE TABLE IF NOT EXISTS ml_gap_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id VARCHAR(50) NOT NULL,
  predicted_severity VARCHAR(20) CHECK (predicted_severity IN ('low', 'medium', 'high', 'critical')),
  gap_probability FLOAT,
  confidence FLOAT,
  predicted_mitigations JSONB,
  risk_factors JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Technique priorities
CREATE TABLE IF NOT EXISTS ml_technique_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id VARCHAR(50) NOT NULL,
  priority_score INTEGER,
  priority_rank INTEGER,
  factors JSONB,
  recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow recommendations
CREATE TABLE IF NOT EXISTS ml_workflow_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES simulation_jobs(id) ON DELETE CASCADE,
  recommendation_type VARCHAR(50) CHECK (recommendation_type IN ('new_workflow', 'workflow_optimization', 'action_addition', 'condition_adjustment')),
  confidence FLOAT,
  description TEXT,
  suggested_workflow JSONB,
  expected_benefit TEXT,
  implementation_complexity VARCHAR(20) CHECK (implementation_complexity IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pattern recognition
CREATE TABLE IF NOT EXISTS ml_pattern_recognition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type VARCHAR(50) CHECK (pattern_type IN ('attack_chain', 'failure_cluster', 'success_cluster', 'temporal_pattern', 'environmental_correlation')),
  description TEXT,
  occurrences INTEGER,
  confidence FLOAT,
  affected_techniques TEXT[],
  time_range_start TIMESTAMP WITH TIME ZONE,
  time_range_end TIMESTAMP WITH TIME ZONE,
  insights TEXT[],
  recommendations TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ENHANCED REPORTING
-- ============================================================================

-- Report templates
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('executive', 'technical', 'compliance', 'trend', 'benchmark', 'custom')),
  format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'pptx', 'html', 'json', 'csv')),
  sections JSONB NOT NULL,
  styling JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Executive dashboards
CREATE TABLE IF NOT EXISTS report_executive_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  time_range_start TIMESTAMP WITH TIME ZONE,
  time_range_end TIMESTAMP WITH TIME ZONE,
  metrics JSONB,
  top_threats JSONB,
  top_gaps JSONB,
  trend_data JSONB,
  compliance_breakdown JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trend analyses
CREATE TABLE IF NOT EXISTS report_trend_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric VARCHAR(200) NOT NULL,
  time_range_start TIMESTAMP WITH TIME ZONE,
  time_range_end TIMESTAMP WITH TIME ZONE,
  granularity VARCHAR(20) CHECK (granularity IN ('hourly', 'daily', 'weekly', 'monthly')),
  data_points JSONB,
  statistics JSONB,
  insights TEXT[],
  predictions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comparative analyses
CREATE TABLE IF NOT EXISTS report_comparative_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_type VARCHAR(50) CHECK (comparison_type IN ('time_periods', 'environments', 'technique_groups', 'teams')),
  entities JSONB,
  comparisons JSONB,
  insights TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Benchmark reports
CREATE TABLE IF NOT EXISTS report_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry VARCHAR(100),
  organization_size VARCHAR(20) CHECK (organization_size IN ('small', 'medium', 'large', 'enterprise')),
  region VARCHAR(100),
  metrics JSONB,
  strengths TEXT[],
  weaknesses TEXT[],
  overall_maturity JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated reports
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES report_templates(id),
  name VARCHAR(200) NOT NULL,
  format VARCHAR(20),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by UUID REFERENCES users(id),
  file_url TEXT,
  file_size INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- EDR INTEGRATIONS
-- ============================================================================

-- EDR platform integrations
CREATE TABLE IF NOT EXISTS edr_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('crowdstrike', 'carbon_black', 'sentinelone', 'microsoft_defender', 'cortex_xdr')),
  name VARCHAR(200) NOT NULL,
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  client_id VARCHAR(200),
  client_secret TEXT,
  tenant_id VARCHAR(200),
  enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(platform, name)
);

-- EDR alerts
CREATE TABLE IF NOT EXISTS edr_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES edr_integrations(id) ON DELETE CASCADE,
  alert_id VARCHAR(200) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  alert_type VARCHAR(100),
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  hostname VARCHAR(200),
  process_name VARCHAR(500),
  command_line TEXT,
  username VARCHAR(200),
  timestamp TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'resolved', 'false_positive')),
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(config_id, alert_id)
);

-- EDR simulation correlations
CREATE TABLE IF NOT EXISTS edr_simulation_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES simulation_jobs(id) ON DELETE CASCADE,
  edr_config_id UUID REFERENCES edr_integrations(id) ON DELETE CASCADE,
  matched INTEGER,
  unmatched INTEGER,
  correlations JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CLOUD SECURITY INTEGRATIONS
-- ============================================================================

-- Cloud security platform integrations
CREATE TABLE IF NOT EXISTS cloud_security_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('aws_security_hub', 'azure_security_center', 'gcp_security_command_center')),
  name VARCHAR(200) NOT NULL,
  region VARCHAR(100),
  account_id VARCHAR(200),
  subscription_id VARCHAR(200),
  project_id VARCHAR(200),
  credentials JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, name)
);

-- Cloud security findings
CREATE TABLE IF NOT EXISTS cloud_security_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES cloud_security_integrations(id) ON DELETE CASCADE,
  finding_id VARCHAR(200) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  finding_type VARCHAR(100),
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resource JSONB,
  compliance JSONB,
  remediation JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  raw_data JSONB,
  UNIQUE(config_id, finding_id)
);

-- ============================================================================
-- VULNERABILITY SCANNER INTEGRATIONS
-- ============================================================================

-- Vulnerability scanner integrations
CREATE TABLE IF NOT EXISTS vuln_scanner_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('tenable', 'qualys', 'rapid7', 'openvas', 'nessus')),
  name VARCHAR(200) NOT NULL,
  api_url TEXT NOT NULL,
  access_key TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(platform, name)
);

-- Vulnerability scans
CREATE TABLE IF NOT EXISTS vulnerability_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES vuln_scanner_integrations(id) ON DELETE CASCADE,
  scan_name VARCHAR(200) NOT NULL,
  targets TEXT[],
  status VARCHAR(20) CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  findings JSONB,
  statistics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vulnerability findings
CREATE TABLE IF NOT EXISTS vulnerability_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES vulnerability_scans(id) ON DELETE CASCADE,
  cve VARCHAR(50),
  title VARCHAR(500),
  description TEXT,
  severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  cvss_score FLOAT,
  affected_hosts TEXT[],
  port INTEGER,
  protocol VARCHAR(20),
  solution TEXT,
  references TEXT[],
  exploit_available BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CONFIGURATION MANAGEMENT INTEGRATIONS
-- ============================================================================

-- Configuration management integrations
CREATE TABLE IF NOT EXISTS config_mgmt_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('ansible', 'puppet', 'chef', 'saltstack')),
  name VARCHAR(200) NOT NULL,
  server_url TEXT NOT NULL,
  credentials JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(platform, name)
);

-- Remediation playbooks
CREATE TABLE IF NOT EXISTS config_mgmt_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES config_mgmt_integrations(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  platform VARCHAR(50) NOT NULL,
  playbook_content TEXT NOT NULL,
  tags TEXT[],
  variables JSONB,
  targets TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Playbook executions
CREATE TABLE IF NOT EXISTS config_mgmt_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID REFERENCES config_mgmt_playbooks(id) ON DELETE CASCADE,
  status VARCHAR(20) CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  targets TEXT[],
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  output TEXT,
  errors TEXT[],
  changes_applied INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- ML indexes
CREATE INDEX IF NOT EXISTS idx_ml_models_type ON ml_models(type);
CREATE INDEX IF NOT EXISTS idx_ml_models_status ON ml_models(status);
CREATE INDEX IF NOT EXISTS idx_ml_anomaly_detections_job ON ml_anomaly_detections(job_id);
CREATE INDEX IF NOT EXISTS idx_ml_gap_predictions_technique ON ml_gap_predictions(technique_id);
CREATE INDEX IF NOT EXISTS idx_ml_technique_priorities_rank ON ml_technique_priorities(priority_rank);
CREATE INDEX IF NOT EXISTS idx_ml_workflow_recommendations_job ON ml_workflow_recommendations(job_id);

-- Reporting indexes
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(report_type);
CREATE INDEX IF NOT EXISTS idx_generated_reports_template ON generated_reports(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_generated_at ON generated_reports(generated_at);

-- EDR indexes
CREATE INDEX IF NOT EXISTS idx_edr_integrations_platform ON edr_integrations(platform);
CREATE INDEX IF NOT EXISTS idx_edr_alerts_config ON edr_alerts(config_id);
CREATE INDEX IF NOT EXISTS idx_edr_alerts_timestamp ON edr_alerts(timestamp);
CREATE INDEX IF NOT EXISTS idx_edr_simulation_correlations_job ON edr_simulation_correlations(job_id);

-- Cloud security indexes
CREATE INDEX IF NOT EXISTS idx_cloud_security_integrations_provider ON cloud_security_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_cloud_security_findings_config ON cloud_security_findings(config_id);
CREATE INDEX IF NOT EXISTS idx_cloud_security_findings_severity ON cloud_security_findings(severity);

-- Vulnerability scanner indexes
CREATE INDEX IF NOT EXISTS idx_vuln_scanner_integrations_platform ON vuln_scanner_integrations(platform);
CREATE INDEX IF NOT EXISTS idx_vulnerability_scans_config ON vulnerability_scans(config_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_scans_status ON vulnerability_scans(status);
CREATE INDEX IF NOT EXISTS idx_vulnerability_findings_scan ON vulnerability_findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_vulnerability_findings_cve ON vulnerability_findings(cve);

-- Configuration management indexes
CREATE INDEX IF NOT EXISTS idx_config_mgmt_integrations_platform ON config_mgmt_integrations(platform);
CREATE INDEX IF NOT EXISTS idx_config_mgmt_playbooks_config ON config_mgmt_playbooks(config_id);
CREATE INDEX IF NOT EXISTS idx_config_mgmt_executions_playbook ON config_mgmt_executions(playbook_id);
CREATE INDEX IF NOT EXISTS idx_config_mgmt_executions_status ON config_mgmt_executions(status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_phase4_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ml_models_timestamp
BEFORE UPDATE ON ml_models
FOR EACH ROW
EXECUTE FUNCTION update_phase4_timestamp();

CREATE TRIGGER trigger_update_ml_gap_predictions_timestamp
BEFORE UPDATE ON ml_gap_predictions
FOR EACH ROW
EXECUTE FUNCTION update_phase4_timestamp();

CREATE TRIGGER trigger_update_report_templates_timestamp
BEFORE UPDATE ON report_templates
FOR EACH ROW
EXECUTE FUNCTION update_phase4_timestamp();

CREATE TRIGGER trigger_update_edr_integrations_timestamp
BEFORE UPDATE ON edr_integrations
FOR EACH ROW
EXECUTE FUNCTION update_phase4_timestamp();

CREATE TRIGGER trigger_update_cloud_security_integrations_timestamp
BEFORE UPDATE ON cloud_security_integrations
FOR EACH ROW
EXECUTE FUNCTION update_phase4_timestamp();

CREATE TRIGGER trigger_update_vuln_scanner_integrations_timestamp
BEFORE UPDATE ON vuln_scanner_integrations
FOR EACH ROW
EXECUTE FUNCTION update_phase4_timestamp();

CREATE TRIGGER trigger_update_config_mgmt_integrations_timestamp
BEFORE UPDATE ON config_mgmt_integrations
FOR EACH ROW
EXECUTE FUNCTION update_phase4_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE ml_models IS 'Machine learning models for anomaly detection, prediction, and recommendations';
COMMENT ON TABLE ml_anomaly_detections IS 'Results of anomaly detection analysis on simulation jobs';
COMMENT ON TABLE ml_gap_predictions IS 'Predicted security gaps based on ML analysis';
COMMENT ON TABLE ml_technique_priorities IS 'ML-based prioritization of techniques for simulation';
COMMENT ON TABLE ml_workflow_recommendations IS 'Automated workflow recommendations based on simulation results';
COMMENT ON TABLE ml_pattern_recognition IS 'Recognized patterns across multiple simulations';

COMMENT ON TABLE report_templates IS 'Customizable report templates for various audiences';
COMMENT ON TABLE report_executive_dashboards IS 'Executive-level dashboards with high-level metrics';
COMMENT ON TABLE report_trend_analyses IS 'Trend analysis over time for various metrics';
COMMENT ON TABLE report_comparative_analyses IS 'Comparative analysis between entities or time periods';
COMMENT ON TABLE report_benchmarks IS 'Industry benchmark comparisons';
COMMENT ON TABLE generated_reports IS 'Generated reports in various formats (PDF, PPTX, etc.)';

COMMENT ON TABLE edr_integrations IS 'EDR platform integrations (CrowdStrike, Carbon Black, etc.)';
COMMENT ON TABLE edr_alerts IS 'Alerts from EDR platforms';
COMMENT ON TABLE edr_simulation_correlations IS 'Correlations between simulations and EDR alerts';

COMMENT ON TABLE cloud_security_integrations IS 'Cloud security platform integrations (AWS, Azure, GCP)';
COMMENT ON TABLE cloud_security_findings IS 'Security findings from cloud security platforms';

COMMENT ON TABLE vuln_scanner_integrations IS 'Vulnerability scanner integrations (Tenable, Qualys, etc.)';
COMMENT ON TABLE vulnerability_scans IS 'Vulnerability scan jobs';
COMMENT ON TABLE vulnerability_findings IS 'Vulnerability findings from scans';

COMMENT ON TABLE config_mgmt_integrations IS 'Configuration management integrations (Ansible, Puppet, etc.)';
COMMENT ON TABLE config_mgmt_playbooks IS 'Remediation playbooks for automated remediation';
COMMENT ON TABLE config_mgmt_executions IS 'Playbook execution history';
