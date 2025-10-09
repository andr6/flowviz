-- =====================================================
-- MITRE D3FEND MAPPING DATABASE SCHEMA
-- =====================================================
-- Purpose: Store D3FEND defensive countermeasures and
--          mappings to MITRE ATT&CK techniques
-- Features: Technique-to-defense mapping, coverage analysis,
--          implementation tracking, ROI calculation
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- D3FEND COUNTERMEASURES
-- =====================================================

-- Table: d3fend_countermeasures
-- Purpose: Store D3FEND defensive countermeasures
CREATE TABLE IF NOT EXISTS d3fend_countermeasures (
  id VARCHAR(50) PRIMARY KEY, -- D3FEND ID (e.g., "D3-DA")
  name VARCHAR(500) NOT NULL,
  description TEXT,

  -- Classification
  category VARCHAR(30) NOT NULL CHECK (category IN ('hardening', 'detection', 'isolation', 'deception', 'eviction', 'restoration')),
  artifact_type VARCHAR(30) NOT NULL CHECK (artifact_type IN ('digital_artifact', 'network_artifact', 'system_artifact', 'user_artifact', 'application_artifact')),

  -- Implementation characteristics
  implementation_complexity VARCHAR(20) CHECK (implementation_complexity IN ('low', 'medium', 'high', 'very_high')),
  implementation_cost VARCHAR(20) CHECK (implementation_cost IN ('low', 'medium', 'high', 'very_high')),
  maintenance_effort VARCHAR(20) CHECK (maintenance_effort IN ('low', 'medium', 'high')),

  -- Technical details
  technical_requirements JSONB DEFAULT '[]'::jsonb, -- Array of requirements
  tools JSONB DEFAULT '[]'::jsonb, -- Array of tool objects
  prerequisites JSONB DEFAULT '[]'::jsonb, -- Array of prerequisites

  -- D3FEND reference
  d3fend_url TEXT,
  references JSONB DEFAULT '[]'::jsonb, -- Array of reference objects

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for d3fend_countermeasures
CREATE INDEX IF NOT EXISTS idx_d3fend_cm_category ON d3fend_countermeasures(category);
CREATE INDEX IF NOT EXISTS idx_d3fend_cm_artifact_type ON d3fend_countermeasures(artifact_type);
CREATE INDEX IF NOT EXISTS idx_d3fend_cm_complexity ON d3fend_countermeasures(implementation_complexity);
CREATE INDEX IF NOT EXISTS idx_d3fend_cm_cost ON d3fend_countermeasures(implementation_cost);

-- =====================================================
-- ATT&CK TO D3FEND MAPPINGS
-- =====================================================

-- Table: d3fend_attack_mappings
-- Purpose: Map MITRE ATT&CK techniques to D3FEND countermeasures
CREATE TABLE IF NOT EXISTS d3fend_attack_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Mapping
  attack_technique_id VARCHAR(20) NOT NULL, -- ATT&CK ID (e.g., "T1566")
  countermeasure_id VARCHAR(50) NOT NULL REFERENCES d3fend_countermeasures(id),

  -- Effectiveness ratings (0-100)
  effectiveness_prevention INTEGER CHECK (effectiveness_prevention >= 0 AND effectiveness_prevention <= 100),
  effectiveness_detection INTEGER CHECK (effectiveness_detection >= 0 AND effectiveness_detection <= 100),
  effectiveness_response INTEGER CHECK (effectiveness_response >= 0 AND effectiveness_response <= 100),
  effectiveness_overall INTEGER CHECK (effectiveness_overall >= 0 AND effectiveness_overall <= 100),

  -- Mapping confidence
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),

  -- Priority
  priority INTEGER CHECK (priority >= 1 AND priority <= 10),
  reasoning TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(attack_technique_id, countermeasure_id)
);

-- Indexes for d3fend_attack_mappings
CREATE INDEX IF NOT EXISTS idx_d3fend_mapping_technique ON d3fend_attack_mappings(attack_technique_id);
CREATE INDEX IF NOT EXISTS idx_d3fend_mapping_countermeasure ON d3fend_attack_mappings(countermeasure_id);
CREATE INDEX IF NOT EXISTS idx_d3fend_mapping_effectiveness ON d3fend_attack_mappings(effectiveness_overall DESC);
CREATE INDEX IF NOT EXISTS idx_d3fend_mapping_priority ON d3fend_attack_mappings(priority DESC);

-- =====================================================
-- DEFENSE MATRICES
-- =====================================================

-- Table: defense_matrices
-- Purpose: Store generated defense matrices for attack flows
CREATE TABLE IF NOT EXISTS defense_matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Associated flow
  flow_id UUID, -- Reference to attack flow
  flow_name VARCHAR(500),

  -- Matrix data (full DefenseMatrix object)
  matrix_data JSONB NOT NULL,

  -- Summary metrics
  total_techniques INTEGER,
  total_countermeasures INTEGER,
  unique_categories TEXT[],
  avg_coverage_per_technique FLOAT,

  -- Coverage scores
  overall_coverage_percentage FLOAT,
  overall_coverage_level VARCHAR(20) CHECK (overall_coverage_level IN ('none', 'minimal', 'partial', 'substantial', 'comprehensive')),

  -- Generation
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  generated_by VARCHAR(200),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for defense_matrices
CREATE INDEX IF NOT EXISTS idx_defense_matrices_flow ON defense_matrices(flow_id);
CREATE INDEX IF NOT EXISTS idx_defense_matrices_generated ON defense_matrices(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_defense_matrices_coverage ON defense_matrices(overall_coverage_percentage);

-- =====================================================
-- ENVIRONMENTS
-- =====================================================

-- Table: security_environments
-- Purpose: Define environments for coverage assessment
CREATE TABLE IF NOT EXISTS security_environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('production', 'staging', 'development', 'test')),

  -- Constraints
  budget DECIMAL(15, 2),
  allowed_tools TEXT[],
  restricted_categories TEXT[],
  compliance_requirements TEXT[],
  performance_impact_limit INTEGER CHECK (performance_impact_limit >= 0 AND performance_impact_limit <= 100),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for security_environments
CREATE INDEX IF NOT EXISTS idx_security_envs_type ON security_environments(type);
CREATE INDEX IF NOT EXISTS idx_security_envs_active ON security_environments(is_active);

-- =====================================================
-- ASSETS
-- =====================================================

-- Table: security_assets
-- Purpose: Track assets within environments
CREATE TABLE IF NOT EXISTS security_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id UUID REFERENCES security_environments(id) ON DELETE CASCADE,

  -- Asset details
  name VARCHAR(200) NOT NULL,
  description TEXT,
  asset_type VARCHAR(100), -- server, workstation, network_device, application, etc.
  criticality VARCHAR(20) NOT NULL CHECK (criticality IN ('critical', 'high', 'medium', 'low')),

  -- Exposure
  exposed_techniques TEXT[] NOT NULL DEFAULT '{}', -- ATT&CK technique IDs

  -- Location/connectivity
  ip_addresses INET[],
  hostnames TEXT[],
  network_segment VARCHAR(200),

  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for security_assets
CREATE INDEX IF NOT EXISTS idx_security_assets_environment ON security_assets(environment_id);
CREATE INDEX IF NOT EXISTS idx_security_assets_criticality ON security_assets(criticality);
CREATE INDEX IF NOT EXISTS idx_security_assets_type ON security_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_security_assets_techniques ON security_assets USING gin(exposed_techniques);

-- =====================================================
-- DEPLOYED DEFENSES
-- =====================================================

-- Table: deployed_defenses
-- Purpose: Track deployed defensive countermeasures in environments
CREATE TABLE IF NOT EXISTS deployed_defenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Environment and countermeasure
  environment_id UUID REFERENCES security_environments(id) ON DELETE CASCADE,
  countermeasure_id VARCHAR(50) REFERENCES d3fend_countermeasures(id),

  -- Deployment status
  status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('deployed', 'planned', 'testing', 'deprecated')),
  deployed_at TIMESTAMP WITH TIME ZONE,
  version VARCHAR(50),

  -- Coverage
  coverage_asset_ids UUID[], -- Specific assets covered
  coverage_groups TEXT[], -- Asset groups/segments covered

  -- Effectiveness (measured)
  measured_effectiveness_prevention INTEGER CHECK (measured_effectiveness_prevention >= 0 AND measured_effectiveness_prevention <= 100),
  measured_effectiveness_detection INTEGER CHECK (measured_effectiveness_detection >= 0 AND measured_effectiveness_detection <= 100),
  measured_effectiveness_response INTEGER CHECK (measured_effectiveness_response >= 0 AND measured_effectiveness_response <= 100),
  measured_effectiveness_overall INTEGER CHECK (measured_effectiveness_overall >= 0 AND measured_effectiveness_overall <= 100),

  -- Implementation details
  implementation_notes TEXT,
  configuration JSONB DEFAULT '{}'::jsonb,

  -- Ownership
  owner_team VARCHAR(200),
  owner_contact VARCHAR(200),

  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for deployed_defenses
CREATE INDEX IF NOT EXISTS idx_deployed_defenses_environment ON deployed_defenses(environment_id);
CREATE INDEX IF NOT EXISTS idx_deployed_defenses_countermeasure ON deployed_defenses(countermeasure_id);
CREATE INDEX IF NOT EXISTS idx_deployed_defenses_status ON deployed_defenses(status);
CREATE INDEX IF NOT EXISTS idx_deployed_defenses_deployed_at ON deployed_defenses(deployed_at);

-- =====================================================
-- COVERAGE ASSESSMENTS
-- =====================================================

-- Table: coverage_assessments
-- Purpose: Store environment coverage assessment results
CREATE TABLE IF NOT EXISTS coverage_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Environment
  environment_id UUID REFERENCES security_environments(id),

  -- Assessment timing
  assessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assessment_period_start TIMESTAMP WITH TIME ZONE,
  assessment_period_end TIMESTAMP WITH TIME ZONE,

  -- Overall coverage
  overall_coverage_percentage FLOAT,
  overall_coverage_level VARCHAR(20) CHECK (overall_coverage_level IN ('none', 'minimal', 'partial', 'substantial', 'comprehensive')),
  implemented_controls INTEGER,
  total_controls INTEGER,

  -- Detailed coverage (full CoverageAnalysis object)
  detailed_coverage JSONB NOT NULL,

  -- Deployment status
  total_countermeasures INTEGER,
  deployed_countermeasures INTEGER,
  planned_countermeasures INTEGER,
  testing_countermeasures INTEGER,
  not_deployed_countermeasures INTEGER,
  deployment_percentage FLOAT,

  -- Risk assessment
  overall_risk VARCHAR(20) CHECK (overall_risk IN ('critical', 'high', 'medium', 'low')),
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  critical_gaps INTEGER,
  exposed_techniques_count INTEGER,

  -- Recommendations
  recommendations JSONB DEFAULT '[]'::jsonb,
  prioritized_actions JSONB DEFAULT '[]'::jsonb,

  -- Assessor
  assessed_by VARCHAR(200),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for coverage_assessments
CREATE INDEX IF NOT EXISTS idx_coverage_assessments_environment ON coverage_assessments(environment_id);
CREATE INDEX IF NOT EXISTS idx_coverage_assessments_assessed_at ON coverage_assessments(assessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_coverage_assessments_coverage ON coverage_assessments(overall_coverage_percentage);
CREATE INDEX IF NOT EXISTS idx_coverage_assessments_risk ON coverage_assessments(risk_score DESC);

-- =====================================================
-- COUNTERMEASURE PRIORITIZATION
-- =====================================================

-- Table: countermeasure_prioritizations
-- Purpose: Store prioritized implementation plans
CREATE TABLE IF NOT EXISTS countermeasure_prioritizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Related assessment
  assessment_id UUID REFERENCES coverage_assessments(id) ON DELETE CASCADE,

  -- Countermeasure
  countermeasure_id VARCHAR(50) REFERENCES d3fend_countermeasures(id),

  -- Priority
  priority_score INTEGER CHECK (priority_score >= 0 AND priority_score <= 100),
  priority_level VARCHAR(20) CHECK (priority_level IN ('critical', 'high', 'medium', 'low')),

  -- Prioritization factors (0-100 each)
  factor_risk_reduction INTEGER,
  factor_coverage_increase INTEGER,
  factor_urgency INTEGER,
  factor_feasibility INTEGER,
  factor_cost_effectiveness INTEGER,
  factor_strategic_alignment INTEGER,

  -- Impact estimation
  techniques_addressed TEXT[],
  gaps_closed INTEGER,
  coverage_improvement FLOAT,
  risk_reduction FLOAT,
  assets_protected UUID[],

  -- Implementation plan
  estimated_duration_days INTEGER,
  estimated_cost DECIMAL(15, 2),
  required_resources TEXT[],
  dependencies TEXT[],
  implementation_risks TEXT[],

  -- ROI
  initial_cost DECIMAL(15, 2),
  annual_cost DECIMAL(15, 2),
  risk_reduction_value DECIMAL(15, 2),
  roi FLOAT,
  payback_period_months INTEGER,
  net_present_value DECIMAL(15, 2),

  -- Full prioritization data
  prioritization_data JSONB,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for countermeasure_prioritizations
CREATE INDEX IF NOT EXISTS idx_cm_prioritization_assessment ON countermeasure_prioritizations(assessment_id);
CREATE INDEX IF NOT EXISTS idx_cm_prioritization_countermeasure ON countermeasure_prioritizations(countermeasure_id);
CREATE INDEX IF NOT EXISTS idx_cm_prioritization_priority ON countermeasure_prioritizations(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_cm_prioritization_roi ON countermeasure_prioritizations(roi DESC);

-- =====================================================
-- ARCHITECTURE DOCUMENTS
-- =====================================================

-- Table: architecture_documents
-- Purpose: Store generated security architecture documents
CREATE TABLE IF NOT EXISTS architecture_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Document metadata
  title VARCHAR(500) NOT NULL,
  version VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived')),

  -- Associated defense matrix
  defense_matrix_id UUID REFERENCES defense_matrices(id),

  -- Full document (ArchitectureDocument object)
  document_data JSONB NOT NULL,

  -- Executive summary
  executive_summary TEXT,

  -- Key metrics
  total_techniques INTEGER,
  total_countermeasures INTEGER,
  overall_coverage_percentage FLOAT,
  overall_risk_score INTEGER,

  -- Roadmap summary
  total_phases INTEGER,
  estimated_timeline VARCHAR(100),
  total_estimated_cost DECIMAL(15, 2),

  -- Generation
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  generated_by VARCHAR(200),

  -- Approval
  approved_by VARCHAR(200),
  approved_at TIMESTAMP WITH TIME ZONE,

  -- Files
  pdf_url TEXT,
  docx_url TEXT,

  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for architecture_documents
CREATE INDEX IF NOT EXISTS idx_arch_docs_matrix ON architecture_documents(defense_matrix_id);
CREATE INDEX IF NOT EXISTS idx_arch_docs_status ON architecture_documents(status);
CREATE INDEX IF NOT EXISTS idx_arch_docs_generated ON architecture_documents(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_arch_docs_coverage ON architecture_documents(overall_coverage_percentage);

-- =====================================================
-- AUDIT LOG
-- =====================================================

-- Table: d3fend_audit_log
-- Purpose: Audit trail for D3FEND mapping activities
CREATE TABLE IF NOT EXISTS d3fend_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event details
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('mapping_created', 'mapping_updated', 'matrix_generated', 'assessment_performed', 'countermeasure_deployed', 'architecture_generated', 'countermeasure_prioritized')),
  event_category VARCHAR(30) NOT NULL CHECK (event_category IN ('mapping', 'analysis', 'deployment', 'documentation')),

  -- Actor
  user_id VARCHAR(200),
  user_name VARCHAR(200),
  ip_address VARCHAR(45),

  -- Target
  target_type VARCHAR(50), -- countermeasure, mapping, matrix, assessment, etc.
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

-- Indexes for d3fend_audit_log
CREATE INDEX IF NOT EXISTS idx_d3fend_audit_timestamp ON d3fend_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_d3fend_audit_event_type ON d3fend_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_d3fend_audit_user ON d3fend_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_d3fend_audit_target ON d3fend_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_d3fend_audit_status ON d3fend_audit_log(status);

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
CREATE TRIGGER update_d3fend_countermeasures_updated_at
  BEFORE UPDATE ON d3fend_countermeasures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_d3fend_attack_mappings_updated_at
  BEFORE UPDATE ON d3fend_attack_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_defense_matrices_updated_at
  BEFORE UPDATE ON defense_matrices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_environments_updated_at
  BEFORE UPDATE ON security_environments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_assets_updated_at
  BEFORE UPDATE ON security_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deployed_defenses_updated_at
  BEFORE UPDATE ON deployed_defenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_architecture_documents_updated_at
  BEFORE UPDATE ON architecture_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS
-- =====================================================

-- View: v_defense_coverage_summary
-- Purpose: Quick overview of defense coverage by environment
CREATE OR REPLACE VIEW v_defense_coverage_summary AS
SELECT
  e.id as environment_id,
  e.name as environment_name,
  e.type as environment_type,
  COUNT(DISTINCT dd.countermeasure_id) as deployed_countermeasures,
  COUNT(DISTINCT dd.countermeasure_id) FILTER (WHERE dd.status = 'deployed') as active_countermeasures,
  COUNT(DISTINCT dd.countermeasure_id) FILTER (WHERE dd.status = 'planned') as planned_countermeasures,
  COUNT(DISTINCT a.id) as total_assets,
  COUNT(DISTINCT a.id) FILTER (WHERE a.criticality = 'critical') as critical_assets,
  CASE
    WHEN COUNT(DISTINCT dd.countermeasure_id) = 0 THEN 0
    ELSE ROUND((COUNT(DISTINCT dd.countermeasure_id) FILTER (WHERE dd.status = 'deployed')::NUMERIC / COUNT(DISTINCT dd.countermeasure_id)) * 100, 2)
  END as deployment_percentage
FROM security_environments e
LEFT JOIN deployed_defenses dd ON e.id = dd.environment_id
LEFT JOIN security_assets a ON e.id = a.environment_id
WHERE e.is_active = true
GROUP BY e.id, e.name, e.type;

-- View: v_top_countermeasures_by_coverage
-- Purpose: Most effective countermeasures by technique coverage
CREATE OR REPLACE VIEW v_top_countermeasures_by_coverage AS
SELECT
  cm.id,
  cm.name,
  cm.category,
  cm.artifact_type,
  COUNT(DISTINCT dam.attack_technique_id) as techniques_covered,
  AVG(dam.effectiveness_overall)::INTEGER as avg_effectiveness,
  COUNT(DISTINCT dd.environment_id) FILTER (WHERE dd.status = 'deployed') as deployed_in_environments,
  cm.implementation_complexity,
  cm.implementation_cost
FROM d3fend_countermeasures cm
LEFT JOIN d3fend_attack_mappings dam ON cm.id = dam.countermeasure_id
LEFT JOIN deployed_defenses dd ON cm.id = dd.countermeasure_id
GROUP BY cm.id, cm.name, cm.category, cm.artifact_type, cm.implementation_complexity, cm.implementation_cost
ORDER BY techniques_covered DESC, avg_effectiveness DESC;

-- View: v_technique_defense_gaps
-- Purpose: Identify techniques with insufficient defensive coverage
CREATE OR REPLACE VIEW v_technique_defense_gaps AS
SELECT
  dam.attack_technique_id,
  COUNT(DISTINCT dam.countermeasure_id) as available_countermeasures,
  COUNT(DISTINCT dd.id) FILTER (WHERE dd.status = 'deployed') as deployed_countermeasures,
  CASE
    WHEN COUNT(DISTINCT dam.countermeasure_id) = 0 THEN 0
    ELSE ROUND((COUNT(DISTINCT dd.id) FILTER (WHERE dd.status = 'deployed')::NUMERIC / COUNT(DISTINCT dam.countermeasure_id)) * 100, 2)
  END as deployment_percentage,
  CASE
    WHEN COUNT(DISTINCT dd.id) FILTER (WHERE dd.status = 'deployed') = 0 THEN 'critical'
    WHEN COUNT(DISTINCT dd.id) FILTER (WHERE dd.status = 'deployed') < COUNT(DISTINCT dam.countermeasure_id) * 0.5 THEN 'high'
    WHEN COUNT(DISTINCT dd.id) FILTER (WHERE dd.status = 'deployed') < COUNT(DISTINCT dam.countermeasure_id) * 0.75 THEN 'medium'
    ELSE 'low'
  END as gap_severity
FROM d3fend_attack_mappings dam
LEFT JOIN deployed_defenses dd ON dam.countermeasure_id = dd.countermeasure_id
GROUP BY dam.attack_technique_id
HAVING COUNT(DISTINCT dd.id) FILTER (WHERE dd.status = 'deployed') < COUNT(DISTINCT dam.countermeasure_id);

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert marker for schema initialization
INSERT INTO d3fend_audit_log (event_type, event_category, user_name, status, event_data)
VALUES ('mapping_created', 'mapping', 'system', 'success', '{"note": "D3FEND schema initialized"}'::jsonb)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE d3fend_countermeasures IS 'D3FEND defensive countermeasures catalog';
COMMENT ON TABLE d3fend_attack_mappings IS 'Mappings between ATT&CK techniques and D3FEND countermeasures';
COMMENT ON TABLE defense_matrices IS 'Generated defense matrices for attack flows';
COMMENT ON TABLE security_environments IS 'Security environment definitions for coverage assessment';
COMMENT ON TABLE security_assets IS 'Assets within security environments';
COMMENT ON TABLE deployed_defenses IS 'Deployed defensive countermeasures tracking';
COMMENT ON TABLE coverage_assessments IS 'Environment coverage assessment results';
COMMENT ON TABLE countermeasure_prioritizations IS 'Prioritized countermeasure implementation plans';
COMMENT ON TABLE architecture_documents IS 'Generated security architecture documents';
COMMENT ON TABLE d3fend_audit_log IS 'Audit trail for D3FEND mapping activities';

-- =====================================================
-- GRANTS (adjust based on your user roles)
-- =====================================================

-- Example grants (uncomment and adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO d3fend_service;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO d3fend_service;

-- =====================================================
-- END OF SCHEMA
-- =====================================================
