-- ============================================================================
-- Attack Simulation & Purple Teaming Integration - Database Schema
-- ============================================================================
--
-- This schema supports automated attack simulation and validation of defensive
-- controls using platforms like Picus Security, Atomic Red Team, CALDERA, etc.
--
-- Version: 1.0
-- Date: 2025-10-07
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Simulation Plans
-- ============================================================================

CREATE TABLE simulation_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Source
    flow_id UUID,
    campaign_id UUID,
    playbook_id UUID,
    source_type VARCHAR(50) CHECK (source_type IN ('flow', 'campaign', 'playbook', 'manual', 'template')),

    -- Configuration
    target_environment VARCHAR(100) NOT NULL,
    execution_mode VARCHAR(50) DEFAULT 'safe' CHECK (execution_mode IN ('safe', 'simulation', 'live', 'validation')),
    platform VARCHAR(50) CHECK (platform IN ('picus', 'atomic_red_team', 'caldera', 'attackiq', 'custom')),

    -- Techniques
    techniques JSONB NOT NULL DEFAULT '[]',
    technique_count INTEGER DEFAULT 0,

    -- Schedule
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    recurrence VARCHAR(50),

    -- Plan data
    plan_data JSONB NOT NULL,

    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'failed', 'cancelled')),

    -- Metadata
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    approved_by VARCHAR(255),
    approved_at TIMESTAMP
);

CREATE INDEX idx_simulation_plans_flow ON simulation_plans(flow_id);
CREATE INDEX idx_simulation_plans_campaign ON simulation_plans(campaign_id);
CREATE INDEX idx_simulation_plans_status ON simulation_plans(status);
CREATE INDEX idx_simulation_plans_platform ON simulation_plans(platform);
CREATE INDEX idx_simulation_plans_scheduled ON simulation_plans(scheduled_start);

-- ============================================================================
-- Simulation Jobs (Executions)
-- ============================================================================

CREATE TABLE simulation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES simulation_plans(id) ON DELETE CASCADE,

    -- Execution details
    job_number INTEGER NOT NULL,
    execution_mode VARCHAR(50) NOT NULL,
    target_environment VARCHAR(100) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    platform_job_id VARCHAR(255),

    -- Timing
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    duration_seconds INTEGER,

    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'initializing', 'running', 'paused', 'completed', 'failed', 'cancelled')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

    -- Results summary
    total_techniques INTEGER DEFAULT 0,
    techniques_executed INTEGER DEFAULT 0,
    techniques_successful INTEGER DEFAULT 0,
    techniques_failed INTEGER DEFAULT 0,
    techniques_blocked INTEGER DEFAULT 0,

    -- Scores
    detection_score FLOAT CHECK (detection_score >= 0 AND detection_score <= 100),
    prevention_score FLOAT CHECK (prevention_score >= 0 AND prevention_score <= 100),
    overall_score FLOAT CHECK (overall_score >= 0 AND overall_score <= 100),

    -- Data
    job_data JSONB NOT NULL,
    execution_log JSONB DEFAULT '[]',

    -- Error handling
    error_message TEXT,
    error_details JSONB,

    -- Metadata
    executed_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_simulation_jobs_plan ON simulation_jobs(plan_id);
CREATE INDEX idx_simulation_jobs_status ON simulation_jobs(status);
CREATE INDEX idx_simulation_jobs_started ON simulation_jobs(started_at);
CREATE INDEX idx_simulation_jobs_platform ON simulation_jobs(platform);

-- ============================================================================
-- Validation Results
-- ============================================================================

CREATE TABLE validation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES simulation_jobs(id) ON DELETE CASCADE,

    -- Technique details
    technique_id VARCHAR(50) NOT NULL,
    technique_name VARCHAR(255) NOT NULL,
    tactic VARCHAR(100),
    sub_technique_id VARCHAR(50),

    -- Execution
    execution_order INTEGER NOT NULL,
    executed_at TIMESTAMP DEFAULT NOW(),
    duration_seconds INTEGER,

    -- Result
    result_status VARCHAR(50) CHECK (result_status IN ('success', 'blocked', 'detected', 'failed', 'skipped', 'timeout')),
    was_detected BOOLEAN DEFAULT FALSE,
    was_prevented BOOLEAN DEFAULT FALSE,
    detection_time_seconds INTEGER,

    -- Detection details
    detected_by VARCHAR(255)[],
    detection_rules_triggered VARCHAR(255)[],
    alerts_generated INTEGER DEFAULT 0,

    -- Prevention details
    prevented_by VARCHAR(255)[],
    prevention_mechanism VARCHAR(255),

    -- Evidence
    evidence JSONB DEFAULT '{}',
    artifacts JSONB DEFAULT '[]',
    screenshots TEXT[],

    -- Analysis
    confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
    false_positive BOOLEAN DEFAULT FALSE,
    notes TEXT,

    -- Result data
    result_data JSONB NOT NULL,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_validation_results_job ON validation_results(job_id);
CREATE INDEX idx_validation_results_technique ON validation_results(technique_id);
CREATE INDEX idx_validation_results_status ON validation_results(result_status);
CREATE INDEX idx_validation_results_detected ON validation_results(was_detected);
CREATE INDEX idx_validation_results_prevented ON validation_results(was_prevented);

-- ============================================================================
-- Control Coverage
-- ============================================================================

CREATE TABLE control_coverage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Reference
    job_id UUID REFERENCES simulation_jobs(id) ON DELETE CASCADE,
    organization_id VARCHAR(255),

    -- Control information
    control_id VARCHAR(100) NOT NULL,
    control_name VARCHAR(255) NOT NULL,
    control_type VARCHAR(100) CHECK (control_type IN ('preventive', 'detective', 'corrective', 'deterrent')),
    control_family VARCHAR(100),

    -- Coverage
    mitre_techniques_covered VARCHAR(50)[],
    coverage_percentage FLOAT CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),

    -- Effectiveness
    effectiveness_score FLOAT CHECK (effectiveness_score >= 0 AND effectiveness_score <= 100),
    tests_passed INTEGER DEFAULT 0,
    tests_failed INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(50) CHECK (status IN ('effective', 'partially_effective', 'ineffective', 'not_tested', 'bypassed')),

    -- Compliance mapping
    nist_controls VARCHAR(50)[],
    cis_controls VARCHAR(50)[],
    iso_controls VARCHAR(50)[],

    -- Data
    coverage_data JSONB NOT NULL,

    -- Metadata
    assessed_at TIMESTAMP DEFAULT NOW(),
    next_assessment TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_control_coverage_job ON control_coverage(job_id);
CREATE INDEX idx_control_coverage_control ON control_coverage(control_id);
CREATE INDEX idx_control_coverage_status ON control_coverage(status);
CREATE INDEX idx_control_coverage_type ON control_coverage(control_type);

-- ============================================================================
-- Gap Analysis
-- ============================================================================

CREATE TABLE gap_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES simulation_jobs(id) ON DELETE CASCADE,

    -- Gap identification
    gap_type VARCHAR(50) CHECK (gap_type IN ('detection', 'prevention', 'visibility', 'response', 'coverage')),
    severity VARCHAR(50) CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),

    -- Technique/control affected
    technique_id VARCHAR(50),
    technique_name VARCHAR(255),
    control_id VARCHAR(100),
    control_name VARCHAR(255),

    -- Gap details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    impact_description TEXT,
    risk_score FLOAT CHECK (risk_score >= 0 AND risk_score <= 10),

    -- Evidence
    evidence JSONB DEFAULT '{}',
    affected_assets TEXT[],

    -- Status
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'accepted', 'false_positive')),

    -- Resolution
    assigned_to VARCHAR(255),
    due_date TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(255),
    resolution_notes TEXT,

    -- Data
    gap_data JSONB NOT NULL,

    -- Metadata
    identified_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_gap_analysis_job ON gap_analysis(job_id);
CREATE INDEX idx_gap_analysis_type ON gap_analysis(gap_type);
CREATE INDEX idx_gap_analysis_severity ON gap_analysis(severity);
CREATE INDEX idx_gap_analysis_status ON gap_analysis(status);
CREATE INDEX idx_gap_analysis_technique ON gap_analysis(technique_id);

-- ============================================================================
-- Remediation Recommendations
-- ============================================================================

CREATE TABLE remediation_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gap_id UUID REFERENCES gap_analysis(id) ON DELETE CASCADE,
    job_id UUID REFERENCES simulation_jobs(id) ON DELETE CASCADE,

    -- Recommendation details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) CHECK (category IN ('technical', 'process', 'people', 'policy')),

    -- Implementation
    implementation_steps JSONB DEFAULT '[]',
    estimated_effort_hours INTEGER,
    estimated_cost VARCHAR(50) CHECK (estimated_cost IN ('low', 'medium', 'high', 'very_high')),
    complexity VARCHAR(50) CHECK (complexity IN ('low', 'medium', 'high')),

    -- Priority
    priority INTEGER CHECK (priority >= 1 AND priority <= 5),
    risk_reduction FLOAT CHECK (risk_reduction >= 0 AND risk_reduction <= 100),

    -- Requirements
    required_tools TEXT[],
    required_skills TEXT[],
    required_resources TEXT[],

    -- Dependencies
    prerequisites TEXT[],
    dependencies UUID[],

    -- Tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_progress', 'testing', 'completed', 'rejected', 'deferred')),
    assigned_to VARCHAR(255),
    due_date TIMESTAMP,

    -- Completion
    implemented_at TIMESTAMP,
    implemented_by VARCHAR(255),
    validation_notes TEXT,
    effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),

    -- Data
    recommendation_data JSONB NOT NULL,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_remediation_gap ON remediation_recommendations(gap_id);
CREATE INDEX idx_remediation_job ON remediation_recommendations(job_id);
CREATE INDEX idx_remediation_status ON remediation_recommendations(status);
CREATE INDEX idx_remediation_priority ON remediation_recommendations(priority);
CREATE INDEX idx_remediation_category ON remediation_recommendations(category);

-- ============================================================================
-- Platform Integrations
-- ============================================================================

CREATE TABLE platform_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Platform details
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('picus', 'atomic_red_team', 'caldera', 'attackiq', 'custom')),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Configuration
    api_url VARCHAR(500),
    api_key_encrypted TEXT,
    username VARCHAR(255),
    additional_config JSONB DEFAULT '{}',

    -- Status
    status VARCHAR(50) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error', 'testing')),
    last_connected TIMESTAMP,
    last_sync TIMESTAMP,
    connection_error TEXT,

    -- Capabilities
    supports_safe_mode BOOLEAN DEFAULT TRUE,
    supports_scheduling BOOLEAN DEFAULT TRUE,
    supports_live_execution BOOLEAN DEFAULT FALSE,
    max_concurrent_jobs INTEGER DEFAULT 1,

    -- Usage
    jobs_executed INTEGER DEFAULT 0,
    last_job_at TIMESTAMP,

    -- Metadata
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_platform_integrations_platform ON platform_integrations(platform);
CREATE INDEX idx_platform_integrations_status ON platform_integrations(status);

-- ============================================================================
-- Simulation Templates
-- ============================================================================

CREATE TABLE simulation_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Template details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),

    -- Template data
    template_type VARCHAR(50) CHECK (template_type IN ('technique_set', 'full_scenario', 'apt_emulation', 'compliance_test')),
    techniques JSONB NOT NULL DEFAULT '[]',
    configuration JSONB NOT NULL DEFAULT '{}',

    -- Usage
    usage_count INTEGER DEFAULT 0,
    avg_execution_time INTEGER,
    avg_success_rate FLOAT,

    -- Metadata
    is_public BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_simulation_templates_type ON simulation_templates(template_type);
CREATE INDEX idx_simulation_templates_category ON simulation_templates(category);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER simulation_plans_updated
    BEFORE UPDATE ON simulation_plans
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER control_coverage_updated
    BEFORE UPDATE ON control_coverage
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER gap_analysis_updated
    BEFORE UPDATE ON gap_analysis
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER remediation_updated
    BEFORE UPDATE ON remediation_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER platform_integrations_updated
    BEFORE UPDATE ON platform_integrations
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- Views
-- ============================================================================

-- Active simulations summary
CREATE VIEW active_simulations AS
SELECT
    sj.id,
    sp.name,
    sp.platform,
    sp.target_environment,
    sj.status,
    sj.progress_percentage,
    sj.techniques_executed,
    sj.total_techniques,
    sj.detection_score,
    sj.prevention_score,
    sj.overall_score,
    sj.started_at,
    EXTRACT(EPOCH FROM (NOW() - sj.started_at))::INTEGER as running_seconds
FROM simulation_jobs sj
JOIN simulation_plans sp ON sj.plan_id = sp.id
WHERE sj.status IN ('running', 'initializing', 'paused')
ORDER BY sj.started_at DESC;

-- Control effectiveness summary
CREATE VIEW control_effectiveness_summary AS
SELECT
    control_id,
    control_name,
    control_type,
    AVG(effectiveness_score) as avg_effectiveness,
    SUM(tests_passed) as total_tests_passed,
    SUM(tests_failed) as total_tests_failed,
    COUNT(*) as assessment_count,
    MAX(assessed_at) as last_assessed
FROM control_coverage
GROUP BY control_id, control_name, control_type;

-- Gap analysis summary
CREATE VIEW gap_analysis_summary AS
SELECT
    gap_type,
    severity,
    status,
    COUNT(*) as gap_count,
    AVG(risk_score) as avg_risk_score,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count
FROM gap_analysis
GROUP BY gap_type, severity, status;

-- Simulation statistics
CREATE VIEW simulation_statistics AS
SELECT
    sp.platform,
    COUNT(sj.id) as total_jobs,
    COUNT(CASE WHEN sj.status = 'completed' THEN 1 END) as completed_jobs,
    COUNT(CASE WHEN sj.status = 'failed' THEN 1 END) as failed_jobs,
    AVG(sj.detection_score) as avg_detection_score,
    AVG(sj.prevention_score) as avg_prevention_score,
    AVG(sj.overall_score) as avg_overall_score,
    AVG(sj.duration_seconds) as avg_duration_seconds,
    MAX(sj.started_at) as last_execution
FROM simulation_plans sp
LEFT JOIN simulation_jobs sj ON sp.id = sj.plan_id
GROUP BY sp.platform;

-- ============================================================================
-- Functions
-- ============================================================================

-- Calculate overall score for a job
CREATE OR REPLACE FUNCTION calculate_job_score(p_job_id UUID)
RETURNS TABLE(detection_score FLOAT, prevention_score FLOAT, overall_score FLOAT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (COUNT(CASE WHEN was_detected THEN 1 END)::FLOAT / NULLIF(COUNT(*)::FLOAT, 0) * 100) as detection_score,
        (COUNT(CASE WHEN was_prevented THEN 1 END)::FLOAT / NULLIF(COUNT(*)::FLOAT, 0) * 100) as prevention_score,
        ((COUNT(CASE WHEN was_detected THEN 1 END)::FLOAT + COUNT(CASE WHEN was_prevented THEN 1 END)::FLOAT) /
         NULLIF(COUNT(*)::FLOAT * 2, 0) * 100) as overall_score
    FROM validation_results
    WHERE job_id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- Insert sample platform integration
INSERT INTO platform_integrations (platform, name, description, status, supports_safe_mode, supports_live_execution)
VALUES
    ('picus', 'Picus Security Platform', 'Continuous security validation platform', 'active', TRUE, TRUE),
    ('atomic_red_team', 'Atomic Red Team', 'Open-source library of tests', 'active', TRUE, FALSE),
    ('caldera', 'MITRE CALDERA', 'Automated adversary emulation platform', 'active', TRUE, TRUE),
    ('attackiq', 'AttackIQ', 'Breach and attack simulation platform', 'inactive', TRUE, TRUE);

-- Insert sample templates
INSERT INTO simulation_templates (name, description, template_type, category, techniques, is_public)
VALUES
    ('Basic Phishing Simulation', 'Test detection of common phishing techniques', 'technique_set', 'phishing',
     '[{"id": "T1566.001", "name": "Spearphishing Attachment"}, {"id": "T1566.002", "name": "Spearphishing Link"}]'::JSONB, TRUE),
    ('Ransomware Kill Chain', 'Simulate ransomware attack stages', 'full_scenario', 'ransomware',
     '[{"id": "T1059", "name": "Command and Scripting Interpreter"}, {"id": "T1486", "name": "Data Encrypted for Impact"}]'::JSONB, TRUE),
    ('APT29 Emulation', 'Emulate APT29 tactics and techniques', 'apt_emulation', 'apt',
     '[{"id": "T1078", "name": "Valid Accounts"}, {"id": "T1021", "name": "Remote Services"}]'::JSONB, TRUE);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Additional composite indexes
CREATE INDEX idx_validation_results_job_status ON validation_results(job_id, result_status);
CREATE INDEX idx_gap_analysis_severity_status ON gap_analysis(severity, status);
CREATE INDEX idx_remediation_priority_status ON remediation_recommendations(priority, status);

-- Full-text search indexes
CREATE INDEX idx_simulation_plans_name_search ON simulation_plans USING gin(to_tsvector('english', name));
CREATE INDEX idx_gap_analysis_description_search ON gap_analysis USING gin(to_tsvector('english', description));

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE simulation_plans IS 'Stores attack simulation plans that can be scheduled and executed';
COMMENT ON TABLE simulation_jobs IS 'Tracks individual execution instances of simulation plans';
COMMENT ON TABLE validation_results IS 'Stores detailed results for each technique tested in a simulation';
COMMENT ON TABLE control_coverage IS 'Tracks defensive control coverage and effectiveness';
COMMENT ON TABLE gap_analysis IS 'Identifies security gaps discovered during simulations';
COMMENT ON TABLE remediation_recommendations IS 'Provides actionable recommendations to address identified gaps';
COMMENT ON TABLE platform_integrations IS 'Manages connections to external attack simulation platforms';
COMMENT ON TABLE simulation_templates IS 'Stores reusable simulation templates for common scenarios';

-- ============================================================================
-- Grants (adjust as needed for your security model)
-- ============================================================================

-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO simulation_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO simulation_user;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify tables created
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'simulation_plans', 'simulation_jobs', 'validation_results',
        'control_coverage', 'gap_analysis', 'remediation_recommendations',
        'platform_integrations', 'simulation_templates'
    );

    RAISE NOTICE 'Attack Simulation schema migration complete. Created % tables.', table_count;
END $$;
