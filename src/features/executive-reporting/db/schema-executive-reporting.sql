-- =====================================================
-- EXECUTIVE REPORTING & METRICS DATABASE SCHEMA
-- =====================================================
-- Purpose: Business intelligence layer for leadership visibility
-- Features: MTTD/MTTR tracking, risk scoring, compliance tracking,
--          cost analysis, trend analysis, executive reporting
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search optimization

-- =====================================================
-- INVESTIGATIONS & INCIDENT TRACKING
-- =====================================================

-- Table: investigations
-- Purpose: Track security investigations for MTTD/MTTR calculation
CREATE TABLE IF NOT EXISTS investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'informational')),
  status VARCHAR(30) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'investigating', 'contained', 'resolved', 'closed', 'false_positive')),

  -- Timestamps for MTTD/MTTR calculation
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  detected_at TIMESTAMP WITH TIME ZONE, -- When threat was detected
  assigned_at TIMESTAMP WITH TIME ZONE, -- When assigned to analyst
  investigating_at TIMESTAMP WITH TIME ZONE, -- When investigation started
  contained_at TIMESTAMP WITH TIME ZONE, -- When threat was contained
  responded_at TIMESTAMP WITH TIME ZONE, -- When initial response occurred
  resolved_at TIMESTAMP WITH TIME ZONE, -- When fully resolved
  closed_at TIMESTAMP WITH TIME ZONE, -- When case was closed

  -- Metrics (calculated)
  mttd_seconds INTEGER, -- Mean Time To Detect
  mttr_seconds INTEGER, -- Mean Time To Respond
  mtti_seconds INTEGER, -- Mean Time To Investigate
  mttic_seconds INTEGER, -- Mean Time To Contain

  -- Investigation details
  assigned_to VARCHAR(200),
  team VARCHAR(100),
  source VARCHAR(100), -- siem, edr, user_report, threat_intel, etc.
  attack_flow_id UUID, -- Reference to related attack flow

  -- Classification
  attack_techniques TEXT[], -- MITRE ATT&CK technique IDs
  threat_actors TEXT[], -- Associated threat actors
  iocs JSONB DEFAULT '[]'::jsonb, -- Indicators of Compromise

  -- Impact assessment
  affected_systems INTEGER DEFAULT 0,
  affected_users INTEGER DEFAULT 0,
  data_compromised BOOLEAN DEFAULT false,
  estimated_cost DECIMAL(15, 2), -- Financial impact

  -- Compliance
  requires_disclosure BOOLEAN DEFAULT false,
  compliance_frameworks TEXT[], -- GDPR, HIPAA, PCI-DSS, etc.

  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for investigations
CREATE INDEX IF NOT EXISTS idx_investigations_created_at ON investigations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investigations_detected_at ON investigations(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_investigations_severity ON investigations(severity);
CREATE INDEX IF NOT EXISTS idx_investigations_status ON investigations(status);
CREATE INDEX IF NOT EXISTS idx_investigations_team ON investigations(team);
CREATE INDEX IF NOT EXISTS idx_investigations_attack_flow ON investigations(attack_flow_id);
CREATE INDEX IF NOT EXISTS idx_investigations_techniques ON investigations USING gin(attack_techniques);
CREATE INDEX IF NOT EXISTS idx_investigations_iocs ON investigations USING gin(iocs);

-- =====================================================
-- THREAT INTELLIGENCE & METRICS
-- =====================================================

-- Table: threat_intelligence
-- Purpose: Store threat data for metrics calculation
CREATE TABLE IF NOT EXISTS threat_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  threat_type VARCHAR(50) NOT NULL CHECK (threat_type IN ('malware', 'phishing', 'ransomware', 'apt', 'insider_threat', 'vulnerability', 'data_breach', 'ddos', 'other')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'informational')),
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),

  -- MITRE ATT&CK mapping
  attack_techniques TEXT[] NOT NULL DEFAULT '{}',
  tactics TEXT[] NOT NULL DEFAULT '{}',

  -- Threat attribution
  threat_actor VARCHAR(200),
  campaign VARCHAR(200),

  -- Temporal
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- IOCs
  iocs JSONB DEFAULT '[]'::jsonb,

  -- Impact
  affected_industries TEXT[],
  affected_regions TEXT[],
  target_sectors TEXT[],

  -- Intelligence sources
  sources JSONB DEFAULT '[]'::jsonb, -- Array of {source: string, url: string, confidence: number}

  -- Status
  status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'monitoring', 'mitigated', 'expired', 'false_positive')),

  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for threat_intelligence
CREATE INDEX IF NOT EXISTS idx_threat_intel_severity ON threat_intelligence(severity);
CREATE INDEX IF NOT EXISTS idx_threat_intel_type ON threat_intelligence(threat_type);
CREATE INDEX IF NOT EXISTS idx_threat_intel_first_seen ON threat_intelligence(first_seen DESC);
CREATE INDEX IF NOT EXISTS idx_threat_intel_last_seen ON threat_intelligence(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_threat_intel_techniques ON threat_intelligence USING gin(attack_techniques);
CREATE INDEX IF NOT EXISTS idx_threat_intel_tactics ON threat_intelligence USING gin(tactics);
CREATE INDEX IF NOT EXISTS idx_threat_intel_actor ON threat_intelligence(threat_actor);
CREATE INDEX IF NOT EXISTS idx_threat_intel_status ON threat_intelligence(status);

-- =====================================================
-- EXECUTIVE REPORTS
-- =====================================================

-- Table: executive_reports
-- Purpose: Store generated executive reports
CREATE TABLE IF NOT EXISTS executive_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(500) NOT NULL,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('executive_briefing', 'monthly_security', 'quarterly_board', 'annual_review', 'custom', 'compliance', 'risk_assessment', 'operational', 'strategic')),

  -- Timeframe
  timeframe_start TIMESTAMP WITH TIME ZONE NOT NULL,
  timeframe_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Report data (full ExecutiveReport object)
  report_data JSONB NOT NULL,

  -- Summary metrics (denormalized for quick access)
  total_threats INTEGER,
  total_investigations INTEGER,
  critical_incidents INTEGER,
  overall_risk_score INTEGER,
  control_coverage_percentage FLOAT,
  mttd_seconds INTEGER,
  mttr_seconds INTEGER,

  -- Template used
  template_id VARCHAR(100),
  template_name VARCHAR(200),

  -- Generation
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  generated_by VARCHAR(200),

  -- Distribution
  distributed_to TEXT[], -- Email addresses or user IDs
  distributed_at TIMESTAMP WITH TIME ZONE,

  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'published', 'archived')),
  approved_by VARCHAR(200),
  approved_at TIMESTAMP WITH TIME ZONE,

  -- Files
  pdf_url TEXT,
  pptx_url TEXT,
  html_url TEXT,

  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for executive_reports
CREATE INDEX IF NOT EXISTS idx_exec_reports_timeframe_start ON executive_reports(timeframe_start DESC);
CREATE INDEX IF NOT EXISTS idx_exec_reports_timeframe_end ON executive_reports(timeframe_end DESC);
CREATE INDEX IF NOT EXISTS idx_exec_reports_type ON executive_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_exec_reports_status ON executive_reports(status);
CREATE INDEX IF NOT EXISTS idx_exec_reports_generated_at ON executive_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_exec_reports_risk_score ON executive_reports(overall_risk_score);

-- =====================================================
-- RISK SCORES & TRENDS
-- =====================================================

-- Table: risk_scores
-- Purpose: Historical risk score tracking for trend analysis
CREATE TABLE IF NOT EXISTS risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Timeframe
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  timeframe_start TIMESTAMP WITH TIME ZONE NOT NULL,
  timeframe_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Overall risk score (0-100)
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('critical', 'high', 'medium', 'low', 'minimal')),

  -- Risk breakdown components
  threat_exposure_score INTEGER CHECK (threat_exposure_score >= 0 AND threat_exposure_score <= 100),
  vulnerability_density_score INTEGER CHECK (vulnerability_density_score >= 0 AND vulnerability_density_score <= 100),
  control_effectiveness_score INTEGER CHECK (control_effectiveness_score >= 0 AND control_effectiveness_score <= 100),
  incident_frequency_score INTEGER CHECK (incident_frequency_score >= 0 AND incident_frequency_score <= 100),
  impact_severity_score INTEGER CHECK (impact_severity_score >= 0 AND impact_severity_score <= 100),

  -- Trend
  trend VARCHAR(20) CHECK (trend IN ('increasing', 'stable', 'decreasing')),
  trend_confidence FLOAT CHECK (trend_confidence >= 0 AND trend_confidence <= 1),
  previous_score INTEGER,
  score_change INTEGER,

  -- Financial impact
  estimated_annual_loss DECIMAL(15, 2),
  potential_breach_cost DECIMAL(15, 2),

  -- Recommendations
  recommendations JSONB DEFAULT '[]'::jsonb,

  -- Context
  total_threats_analyzed INTEGER,
  total_vulnerabilities INTEGER,
  active_controls INTEGER,
  incidents_count INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for risk_scores
CREATE INDEX IF NOT EXISTS idx_risk_scores_calculated_at ON risk_scores(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_scores_overall ON risk_scores(overall_score);
CREATE INDEX IF NOT EXISTS idx_risk_scores_level ON risk_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_scores_trend ON risk_scores(trend);

-- =====================================================
-- METRICS CACHE
-- =====================================================

-- Table: metrics_cache
-- Purpose: Cache calculated metrics for performance
CREATE TABLE IF NOT EXISTS metrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key VARCHAR(200) NOT NULL UNIQUE,
  metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('summary', 'threat', 'response', 'risk', 'cost', 'compliance', 'trend')),

  -- Timeframe
  timeframe_start TIMESTAMP WITH TIME ZONE NOT NULL,
  timeframe_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Cached data
  metric_data JSONB NOT NULL,

  -- Cache metadata
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for metrics_cache
CREATE INDEX IF NOT EXISTS idx_metrics_cache_key ON metrics_cache(metric_key);
CREATE INDEX IF NOT EXISTS idx_metrics_cache_type ON metrics_cache(metric_type);
CREATE INDEX IF NOT EXISTS idx_metrics_cache_expires ON metrics_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_metrics_cache_timeframe ON metrics_cache(timeframe_start, timeframe_end);

-- =====================================================
-- COMPLIANCE TRACKING
-- =====================================================

-- Table: compliance_assessments
-- Purpose: Track compliance status across frameworks
CREATE TABLE IF NOT EXISTS compliance_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Framework
  framework VARCHAR(50) NOT NULL CHECK (framework IN ('nist_csf', 'iso_27001', 'pci_dss', 'hipaa', 'gdpr', 'sox', 'fedramp', 'cmmc', 'custom')),
  framework_version VARCHAR(20),

  -- Assessment period
  assessment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Overall compliance
  compliance_score FLOAT NOT NULL CHECK (compliance_score >= 0 AND compliance_score <= 100),
  compliance_level VARCHAR(30) CHECK (compliance_level IN ('fully_compliant', 'mostly_compliant', 'partially_compliant', 'non_compliant', 'not_assessed')),

  -- Controls
  total_controls INTEGER NOT NULL,
  implemented_controls INTEGER NOT NULL,
  partial_controls INTEGER DEFAULT 0,
  missing_controls INTEGER DEFAULT 0,

  -- Gaps
  critical_gaps INTEGER DEFAULT 0,
  high_gaps INTEGER DEFAULT 0,
  medium_gaps INTEGER DEFAULT 0,
  low_gaps INTEGER DEFAULT 0,

  -- Assessment details
  assessment_type VARCHAR(30) CHECK (assessment_type IN ('self_assessment', 'internal_audit', 'external_audit', 'continuous_monitoring')),
  assessor VARCHAR(200),

  -- Results
  findings JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  remediation_plan JSONB DEFAULT '{}'::jsonb,

  -- Status
  status VARCHAR(30) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'approved', 'archived')),

  -- Files
  report_url TEXT,
  evidence_urls JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for compliance_assessments
CREATE INDEX IF NOT EXISTS idx_compliance_framework ON compliance_assessments(framework);
CREATE INDEX IF NOT EXISTS idx_compliance_date ON compliance_assessments(assessment_date DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_score ON compliance_assessments(compliance_score);
CREATE INDEX IF NOT EXISTS idx_compliance_level ON compliance_assessments(compliance_level);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON compliance_assessments(status);

-- =====================================================
-- COST ANALYSIS
-- =====================================================

-- Table: security_costs
-- Purpose: Track security operations costs for ROI analysis
CREATE TABLE IF NOT EXISTS security_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cost details
  cost_category VARCHAR(50) NOT NULL CHECK (cost_category IN ('personnel', 'tools_software', 'infrastructure', 'training', 'consulting', 'incident_response', 'breach_costs', 'compliance', 'other')),
  cost_type VARCHAR(30) NOT NULL CHECK (cost_type IN ('capital', 'operational', 'incident', 'project')),

  -- Amount
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  fiscal_year INTEGER,
  fiscal_quarter INTEGER CHECK (fiscal_quarter >= 1 AND fiscal_quarter <= 4),

  -- Description
  description TEXT,
  cost_center VARCHAR(100),
  budget_category VARCHAR(100),

  -- Associated entities
  investigation_id UUID REFERENCES investigations(id),
  project_name VARCHAR(200),

  -- ROI tracking
  expected_roi FLOAT,
  actual_roi FLOAT,
  roi_notes TEXT,

  -- Approval
  approved BOOLEAN DEFAULT false,
  approved_by VARCHAR(200),
  approved_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for security_costs
CREATE INDEX IF NOT EXISTS idx_costs_category ON security_costs(cost_category);
CREATE INDEX IF NOT EXISTS idx_costs_type ON security_costs(cost_type);
CREATE INDEX IF NOT EXISTS idx_costs_period_start ON security_costs(period_start);
CREATE INDEX IF NOT EXISTS idx_costs_fiscal ON security_costs(fiscal_year, fiscal_quarter);
CREATE INDEX IF NOT EXISTS idx_costs_investigation ON security_costs(investigation_id);

-- =====================================================
-- REPORT TEMPLATES
-- =====================================================

-- Table: report_templates
-- Purpose: Store custom report templates
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Template configuration
  category VARCHAR(30) NOT NULL CHECK (category IN ('compliance', 'risk', 'operational', 'strategic', 'custom')),
  target_audience VARCHAR(50) NOT NULL CHECK (target_audience IN ('executives', 'board', 'compliance_officers', 'technical_team', 'risk_managers', 'all')),
  format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'pptx', 'html', 'xlsx', 'json')),

  -- Template structure
  sections JSONB NOT NULL, -- Array of section definitions
  styling JSONB DEFAULT '{}'::jsonb,

  -- Usage
  is_standard BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,

  -- Scheduling
  can_schedule BOOLEAN DEFAULT false,
  default_frequency VARCHAR(20) CHECK (default_frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'custom')),

  -- Ownership
  created_by VARCHAR(200),
  organization_id UUID,

  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for report_templates
CREATE INDEX IF NOT EXISTS idx_templates_template_id ON report_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON report_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_audience ON report_templates(target_audience);
CREATE INDEX IF NOT EXISTS idx_templates_active ON report_templates(is_active);

-- =====================================================
-- REPORT SCHEDULING
-- =====================================================

-- Table: scheduled_reports
-- Purpose: Automate regular report generation and distribution
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Template
  template_id UUID REFERENCES report_templates(id) NOT NULL,

  -- Schedule
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'custom')),
  cron_expression VARCHAR(100), -- For custom schedules
  timezone VARCHAR(50) DEFAULT 'UTC',

  -- Next run
  next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_run_at TIMESTAMP WITH TIME ZONE,

  -- Report configuration
  timeframe_type VARCHAR(30) NOT NULL CHECK (timeframe_type IN ('last_24h', 'last_7d', 'last_30d', 'last_quarter', 'last_year', 'custom')),
  custom_timeframe_days INTEGER,

  -- Distribution
  recipients TEXT[] NOT NULL, -- Email addresses or user IDs
  distribution_format VARCHAR(20) NOT NULL CHECK (distribution_format IN ('pdf', 'pptx', 'html', 'xlsx', 'json')),

  -- Email settings
  email_subject VARCHAR(500),
  email_body TEXT,
  attach_report BOOLEAN DEFAULT true,

  -- Status
  is_active BOOLEAN DEFAULT true,
  status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'failed', 'disabled')),

  -- Execution history
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  last_error TEXT,

  -- Ownership
  created_by VARCHAR(200),
  organization_id UUID,

  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for scheduled_reports
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_template ON scheduled_reports(template_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_status ON scheduled_reports(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports(is_active);

-- =====================================================
-- TREND ANALYSIS
-- =====================================================

-- Table: metric_trends
-- Purpose: Store time series data for trend analysis
CREATE TABLE IF NOT EXISTS metric_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metric identification
  metric_name VARCHAR(100) NOT NULL,
  metric_category VARCHAR(50) NOT NULL CHECK (metric_category IN ('threat', 'response', 'risk', 'cost', 'compliance', 'performance', 'custom')),

  -- Time series data
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  value DECIMAL(15, 4) NOT NULL,

  -- Aggregation level
  aggregation_level VARCHAR(20) NOT NULL CHECK (aggregation_level IN ('hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly')),

  -- Statistical data
  min_value DECIMAL(15, 4),
  max_value DECIMAL(15, 4),
  avg_value DECIMAL(15, 4),
  std_dev DECIMAL(15, 4),

  -- Trend indicators
  moving_average DECIMAL(15, 4),
  trend_direction VARCHAR(20) CHECK (trend_direction IN ('up', 'down', 'stable')),
  percent_change DECIMAL(8, 4),

  -- Context
  sample_size INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for metric_trends
CREATE INDEX IF NOT EXISTS idx_metric_trends_name ON metric_trends(metric_name);
CREATE INDEX IF NOT EXISTS idx_metric_trends_category ON metric_trends(metric_category);
CREATE INDEX IF NOT EXISTS idx_metric_trends_timestamp ON metric_trends(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metric_trends_aggregation ON metric_trends(aggregation_level);
CREATE UNIQUE INDEX IF NOT EXISTS idx_metric_trends_unique ON metric_trends(metric_name, aggregation_level, timestamp);

-- =====================================================
-- EXECUTIVE DASHBOARDS
-- =====================================================

-- Table: executive_dashboards
-- Purpose: Store custom executive dashboard configurations
CREATE TABLE IF NOT EXISTS executive_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Dashboard configuration
  layout JSONB NOT NULL, -- Grid layout configuration
  widgets JSONB NOT NULL, -- Array of widget configurations

  -- Refresh settings
  auto_refresh BOOLEAN DEFAULT true,
  refresh_interval_minutes INTEGER DEFAULT 15,

  -- Access control
  is_public BOOLEAN DEFAULT false,
  owner_id VARCHAR(200),
  shared_with TEXT[], -- User IDs or roles

  -- Usage statistics
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for executive_dashboards
CREATE INDEX IF NOT EXISTS idx_dashboards_owner ON executive_dashboards(owner_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_active ON executive_dashboards(is_active);
CREATE INDEX IF NOT EXISTS idx_dashboards_default ON executive_dashboards(is_default);

-- =====================================================
-- AUDIT LOG
-- =====================================================

-- Table: executive_reporting_audit_log
-- Purpose: Audit trail for executive reporting activities
CREATE TABLE IF NOT EXISTS executive_reporting_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event details
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('report_generated', 'report_viewed', 'report_distributed', 'report_approved', 'dashboard_accessed', 'metric_calculated', 'template_created', 'template_modified', 'schedule_created', 'schedule_executed', 'data_exported')),
  event_category VARCHAR(30) NOT NULL CHECK (event_category IN ('reporting', 'security', 'compliance', 'access', 'configuration')),

  -- Actor
  user_id VARCHAR(200),
  user_name VARCHAR(200),
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Target
  target_type VARCHAR(50), -- report, dashboard, template, schedule
  target_id UUID,
  target_name VARCHAR(500),

  -- Event data
  event_data JSONB DEFAULT '{}'::jsonb,

  -- Result
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failure', 'error', 'warning')),
  error_message TEXT,

  -- Timestamp
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON executive_reporting_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON executive_reporting_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON executive_reporting_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON executive_reporting_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_status ON executive_reporting_audit_log(status);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_investigations_updated_at BEFORE UPDATE ON investigations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_threat_intelligence_updated_at BEFORE UPDATE ON threat_intelligence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_executive_reports_updated_at BEFORE UPDATE ON executive_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metrics_cache_updated_at BEFORE UPDATE ON metrics_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_assessments_updated_at BEFORE UPDATE ON compliance_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_costs_updated_at BEFORE UPDATE ON security_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON report_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_reports_updated_at BEFORE UPDATE ON scheduled_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_executive_dashboards_updated_at BEFORE UPDATE ON executive_dashboards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: calculate_investigation_metrics
-- Purpose: Auto-calculate MTTD/MTTR when timestamps are updated
CREATE OR REPLACE FUNCTION calculate_investigation_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate MTTD (Mean Time To Detect)
  IF NEW.detected_at IS NOT NULL AND NEW.created_at IS NOT NULL THEN
    NEW.mttd_seconds := EXTRACT(EPOCH FROM (NEW.detected_at - NEW.created_at))::INTEGER;
  END IF;

  -- Calculate MTTR (Mean Time To Respond)
  IF NEW.responded_at IS NOT NULL AND NEW.detected_at IS NOT NULL THEN
    NEW.mttr_seconds := EXTRACT(EPOCH FROM (NEW.responded_at - NEW.detected_at))::INTEGER;
  END IF;

  -- Calculate MTTI (Mean Time To Investigate)
  IF NEW.investigating_at IS NOT NULL AND NEW.assigned_at IS NOT NULL THEN
    NEW.mtti_seconds := EXTRACT(EPOCH FROM (NEW.investigating_at - NEW.assigned_at))::INTEGER;
  END IF;

  -- Calculate MTTIC (Mean Time To Contain)
  IF NEW.contained_at IS NOT NULL AND NEW.investigating_at IS NOT NULL THEN
    NEW.mttic_seconds := EXTRACT(EPOCH FROM (NEW.contained_at - NEW.investigating_at))::INTEGER;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_investigation_metrics_trigger
  BEFORE INSERT OR UPDATE ON investigations
  FOR EACH ROW
  EXECUTE FUNCTION calculate_investigation_metrics();

-- Function: update_template_usage
-- Purpose: Increment template usage count when report is generated
CREATE OR REPLACE FUNCTION update_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE report_templates
    SET usage_count = usage_count + 1
    WHERE template_id = NEW.template_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_usage_trigger
  AFTER INSERT ON executive_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_template_usage();

-- Function: update_scheduled_report_execution
-- Purpose: Update execution statistics when scheduled report runs
CREATE OR REPLACE FUNCTION update_scheduled_report_execution()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE scheduled_reports
  SET
    total_executions = total_executions + 1,
    successful_executions = CASE WHEN NEW.status = 'approved' OR NEW.status = 'published'
                                  THEN successful_executions + 1
                                  ELSE successful_executions END,
    failed_executions = CASE WHEN NEW.status = 'draft'
                              THEN failed_executions + 1
                              ELSE failed_executions END,
    last_run_at = NEW.generated_at
  WHERE template_id = (SELECT id FROM report_templates WHERE template_id = NEW.template_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger would need adjustment based on how scheduled reports link to executive_reports

-- =====================================================
-- VIEWS
-- =====================================================

-- View: v_executive_summary_metrics
-- Purpose: Quick access to key executive metrics
CREATE OR REPLACE VIEW v_executive_summary_metrics AS
SELECT
  COUNT(DISTINCT i.id) FILTER (WHERE i.created_at >= CURRENT_DATE - INTERVAL '30 days') as threats_last_30d,
  COUNT(DISTINCT i.id) FILTER (WHERE i.created_at >= CURRENT_DATE - INTERVAL '7 days') as threats_last_7d,
  COUNT(DISTINCT i.id) FILTER (WHERE i.severity = 'critical' AND i.created_at >= CURRENT_DATE - INTERVAL '30 days') as critical_threats_last_30d,
  ROUND(AVG(i.mttd_seconds) FILTER (WHERE i.mttd_seconds IS NOT NULL AND i.created_at >= CURRENT_DATE - INTERVAL '30 days'))::INTEGER as avg_mttd_last_30d,
  ROUND(AVG(i.mttr_seconds) FILTER (WHERE i.mttr_seconds IS NOT NULL AND i.created_at >= CURRENT_DATE - INTERVAL '30 days'))::INTEGER as avg_mttr_last_30d,
  (SELECT overall_score FROM risk_scores ORDER BY calculated_at DESC LIMIT 1) as current_risk_score,
  (SELECT risk_level FROM risk_scores ORDER BY calculated_at DESC LIMIT 1) as current_risk_level,
  SUM(sc.amount) FILTER (WHERE sc.period_start >= CURRENT_DATE - INTERVAL '30 days') as total_costs_last_30d,
  COUNT(DISTINCT ca.id) FILTER (WHERE ca.assessment_date >= CURRENT_DATE - INTERVAL '90 days') as compliance_assessments_last_90d
FROM investigations i
CROSS JOIN security_costs sc
CROSS JOIN compliance_assessments ca;

-- View: v_investigation_performance
-- Purpose: Investigation team performance metrics
CREATE OR REPLACE VIEW v_investigation_performance AS
SELECT
  i.team,
  i.assigned_to,
  COUNT(*) as total_investigations,
  COUNT(*) FILTER (WHERE i.status = 'resolved') as resolved_count,
  COUNT(*) FILTER (WHERE i.status = 'closed') as closed_count,
  ROUND(AVG(i.mttd_seconds))::INTEGER as avg_mttd,
  ROUND(AVG(i.mttr_seconds))::INTEGER as avg_mttr,
  ROUND(AVG(i.mtti_seconds))::INTEGER as avg_mtti,
  ROUND(AVG(i.mttic_seconds))::INTEGER as avg_mttic,
  COUNT(*) FILTER (WHERE i.severity = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE i.severity = 'high') as high_count,
  MAX(i.updated_at) as last_activity
FROM investigations i
WHERE i.assigned_to IS NOT NULL
GROUP BY i.team, i.assigned_to;

-- View: v_threat_intelligence_summary
-- Purpose: Threat intelligence overview
CREATE OR REPLACE VIEW v_threat_intelligence_summary AS
SELECT
  ti.threat_type,
  ti.severity,
  COUNT(*) as threat_count,
  COUNT(DISTINCT ti.threat_actor) FILTER (WHERE ti.threat_actor IS NOT NULL) as unique_actors,
  COUNT(*) FILTER (WHERE ti.status = 'active') as active_threats,
  jsonb_agg(DISTINCT elem) FILTER (WHERE elem IS NOT NULL) as all_techniques
FROM threat_intelligence ti
CROSS JOIN LATERAL unnest(ti.attack_techniques) as elem
GROUP BY ti.threat_type, ti.severity;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert standard metric trend categories
INSERT INTO metric_trends (metric_name, metric_category, timestamp, value, aggregation_level, metadata)
VALUES
  ('initialization_marker', 'custom', CURRENT_TIMESTAMP, 0, 'daily', '{"note": "Schema initialized"}'::jsonb)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE investigations IS 'Tracks security investigations with MTTD/MTTR metrics';
COMMENT ON TABLE threat_intelligence IS 'Stores threat data for metrics and analysis';
COMMENT ON TABLE executive_reports IS 'Generated executive reports with full data';
COMMENT ON TABLE risk_scores IS 'Historical risk score tracking for trends';
COMMENT ON TABLE metrics_cache IS 'Performance cache for calculated metrics';
COMMENT ON TABLE compliance_assessments IS 'Compliance framework assessment results';
COMMENT ON TABLE security_costs IS 'Security operations cost tracking';
COMMENT ON TABLE report_templates IS 'Custom report template configurations';
COMMENT ON TABLE scheduled_reports IS 'Automated report generation schedules';
COMMENT ON TABLE metric_trends IS 'Time series data for trend analysis';
COMMENT ON TABLE executive_dashboards IS 'Custom executive dashboard layouts';
COMMENT ON TABLE executive_reporting_audit_log IS 'Audit trail for reporting activities';

-- =====================================================
-- GRANTS (adjust based on your user roles)
-- =====================================================

-- Example grants (uncomment and adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO executive_reporting_service;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO executive_reporting_service;

-- =====================================================
-- END OF SCHEMA
-- =====================================================
