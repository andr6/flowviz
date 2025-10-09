-- Compliance Mapping Schema
-- Database tables for compliance framework mapping and reporting

-- Compliance frameworks supported
-- nist_csf, nist_800_53, cis_controls, pci_dss, iso_27001, hipaa, soc2, gdpr

-- Compliance controls master table
CREATE TABLE IF NOT EXISTS compliance_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework VARCHAR(50) NOT NULL CHECK (framework IN ('nist_csf', 'nist_800_53', 'cis_controls', 'pci_dss', 'iso_27001', 'hipaa', 'soc2', 'gdpr')),
  control_id VARCHAR(50) NOT NULL,
  control_title VARCHAR(500) NOT NULL,
  control_description TEXT,
  category VARCHAR(100),
  priority VARCHAR(10) CHECK (priority IN ('P1', 'P2', 'P3')),
  implementation_guidance TEXT,
  related_controls TEXT[], -- Array of related control IDs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(framework, control_id)
);

-- Mappings between MITRE ATT&CK techniques and compliance controls
CREATE TABLE IF NOT EXISTS compliance_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id VARCHAR(20) NOT NULL,
  technique_name VARCHAR(200) NOT NULL,
  framework VARCHAR(50) NOT NULL CHECK (framework IN ('nist_csf', 'nist_800_53', 'cis_controls', 'pci_dss', 'iso_27001', 'hipaa', 'soc2', 'gdpr')),
  control_id VARCHAR(50) NOT NULL,
  control_title VARCHAR(500) NOT NULL,
  control_description TEXT,
  mapping_rationale TEXT, -- Why this technique maps to this control
  coverage_level VARCHAR(20) NOT NULL DEFAULT 'partial' CHECK (coverage_level IN ('full', 'partial', 'related')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(technique_id, framework, control_id)
);

-- Compliance reports generated from simulation jobs
CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES simulation_jobs(id) ON DELETE CASCADE,
  framework VARCHAR(50) NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  control_coverage JSONB NOT NULL, -- {total, covered, partiallyCovered, notCovered}
  gaps_by_category JSONB NOT NULL, -- Array of {category, gaps}
  recommendations JSONB NOT NULL, -- Array of recommendation strings
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  generated_by UUID REFERENCES users(id),
  UNIQUE(job_id, framework)
);

-- Compliance gap details
CREATE TABLE IF NOT EXISTS compliance_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES compliance_reports(id) ON DELETE CASCADE,
  framework VARCHAR(50) NOT NULL,
  control_id VARCHAR(50) NOT NULL,
  control_title VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  affected_techniques JSONB NOT NULL, -- Array of technique objects
  recommendation TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'remediated', 'accepted_risk')),
  assigned_to UUID REFERENCES users(id),
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance assessment history
CREATE TABLE IF NOT EXISTS compliance_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  frameworks VARCHAR(50)[] NOT NULL, -- Array of frameworks to assess against
  scope TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),

  -- Results
  job_ids UUID[], -- Array of simulation job IDs included in assessment
  overall_scores JSONB, -- {framework: score}
  summary_findings TEXT,

  -- Metadata
  assessed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance baseline configurations
CREATE TABLE IF NOT EXISTS compliance_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  framework VARCHAR(50) NOT NULL,
  required_controls TEXT[] NOT NULL, -- Array of control IDs that must be met
  minimum_score INTEGER DEFAULT 70 CHECK (minimum_score >= 0 AND minimum_score <= 100),
  auto_remediate BOOLEAN DEFAULT false,

  -- Enforcement rules
  block_on_failure BOOLEAN DEFAULT false,
  notification_channels JSONB DEFAULT '[]'::jsonb,
  escalation_policy JSONB,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance evidence collection
CREATE TABLE IF NOT EXISTS compliance_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_id UUID REFERENCES compliance_gaps(id) ON DELETE CASCADE,
  control_id VARCHAR(50) NOT NULL,
  framework VARCHAR(50) NOT NULL,
  evidence_type VARCHAR(50) NOT NULL CHECK (evidence_type IN ('simulation_result', 'log', 'screenshot', 'document', 'attestation')),
  evidence_title VARCHAR(200) NOT NULL,
  evidence_description TEXT,
  evidence_data JSONB, -- Structured data
  file_url TEXT,
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  collected_by UUID REFERENCES users(id)
);

-- Compliance audit trail
CREATE TABLE IF NOT EXISTS compliance_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('gap', 'report', 'assessment', 'baseline')),
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed', 'assigned', 'remediated')),
  changes JSONB, -- Before/after state
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_controls_framework ON compliance_controls(framework);
CREATE INDEX IF NOT EXISTS idx_compliance_controls_category ON compliance_controls(category);
CREATE INDEX IF NOT EXISTS idx_compliance_controls_priority ON compliance_controls(priority);
CREATE INDEX IF NOT EXISTS idx_compliance_mappings_technique ON compliance_mappings(technique_id);
CREATE INDEX IF NOT EXISTS idx_compliance_mappings_framework ON compliance_mappings(framework);
CREATE INDEX IF NOT EXISTS idx_compliance_mappings_control ON compliance_mappings(control_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_job ON compliance_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_framework ON compliance_reports(framework);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_score ON compliance_reports(overall_score);
CREATE INDEX IF NOT EXISTS idx_compliance_gaps_report ON compliance_gaps(report_id);
CREATE INDEX IF NOT EXISTS idx_compliance_gaps_severity ON compliance_gaps(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_gaps_status ON compliance_gaps(status);
CREATE INDEX IF NOT EXISTS idx_compliance_gaps_assigned ON compliance_gaps(assigned_to);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_status ON compliance_assessments(status);
CREATE INDEX IF NOT EXISTS idx_compliance_assessments_dates ON compliance_assessments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_compliance_baselines_framework ON compliance_baselines(framework);
CREATE INDEX IF NOT EXISTS idx_compliance_baselines_active ON compliance_baselines(is_active);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_gap ON compliance_evidence(gap_id);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_control ON compliance_evidence(control_id, framework);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_trail_entity ON compliance_audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_trail_date ON compliance_audit_trail(performed_at);

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_compliance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_compliance_control_timestamp
BEFORE UPDATE ON compliance_controls
FOR EACH ROW
EXECUTE FUNCTION update_compliance_timestamp();

CREATE TRIGGER trigger_update_compliance_gap_timestamp
BEFORE UPDATE ON compliance_gaps
FOR EACH ROW
EXECUTE FUNCTION update_compliance_timestamp();

CREATE TRIGGER trigger_update_compliance_assessment_timestamp
BEFORE UPDATE ON compliance_assessments
FOR EACH ROW
EXECUTE FUNCTION update_compliance_timestamp();

CREATE TRIGGER trigger_update_compliance_baseline_timestamp
BEFORE UPDATE ON compliance_baselines
FOR EACH ROW
EXECUTE FUNCTION update_compliance_timestamp();

-- Audit trail triggers
CREATE OR REPLACE FUNCTION create_compliance_audit_entry()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO compliance_audit_trail (entity_type, entity_id, action, changes)
    VALUES (TG_TABLE_NAME::TEXT, NEW.id, 'created', row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO compliance_audit_trail (entity_type, entity_id, action, changes)
    VALUES (TG_TABLE_NAME::TEXT, NEW.id, 'updated', jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW)));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO compliance_audit_trail (entity_type, entity_id, action, changes)
    VALUES (TG_TABLE_NAME::TEXT, OLD.id, 'deleted', row_to_json(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_compliance_gaps
AFTER INSERT OR UPDATE OR DELETE ON compliance_gaps
FOR EACH ROW
EXECUTE FUNCTION create_compliance_audit_entry();

CREATE TRIGGER trigger_audit_compliance_assessments
AFTER INSERT OR UPDATE OR DELETE ON compliance_assessments
FOR EACH ROW
EXECUTE FUNCTION create_compliance_audit_entry();

-- Comments for documentation
COMMENT ON TABLE compliance_controls IS 'Master table of compliance framework controls (NIST, CIS, PCI-DSS, etc.)';
COMMENT ON TABLE compliance_mappings IS 'Mappings between MITRE ATT&CK techniques and compliance controls';
COMMENT ON TABLE compliance_reports IS 'Compliance assessment reports generated from simulation jobs';
COMMENT ON TABLE compliance_gaps IS 'Identified gaps in compliance coverage with remediation tracking';
COMMENT ON TABLE compliance_assessments IS 'Periodic compliance assessments across multiple frameworks';
COMMENT ON TABLE compliance_baselines IS 'Compliance baseline requirements and enforcement policies';
COMMENT ON TABLE compliance_evidence IS 'Evidence collection for compliance audits and assessments';
COMMENT ON TABLE compliance_audit_trail IS 'Audit trail for all compliance-related changes';

COMMENT ON COLUMN compliance_mappings.coverage_level IS 'Level of coverage: full (complete), partial (some coverage), or related (tangentially related)';
COMMENT ON COLUMN compliance_reports.overall_score IS 'Compliance score from 0-100 based on control coverage and gap severity';
COMMENT ON COLUMN compliance_gaps.affected_techniques IS 'JSONB array of techniques that affect this control gap';
COMMENT ON COLUMN compliance_baselines.auto_remediate IS 'Whether to automatically trigger remediation workflows for gaps';
COMMENT ON COLUMN compliance_evidence.evidence_data IS 'Structured evidence data specific to evidence type';
