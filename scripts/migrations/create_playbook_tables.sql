-- Automated Playbook Generation - Database Schema
-- This migration creates tables for incident response playbook generation and management

-- ============================================================================
-- PLAYBOOKS TABLE
-- Stores generated incident response playbooks
-- ============================================================================
CREATE TABLE IF NOT EXISTS playbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    flow_id UUID,  -- Optional: Associated attack flow
    campaign_id UUID,  -- Optional: Associated campaign

    -- Metadata
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    estimated_time_minutes INTEGER DEFAULT 60,
    required_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'review', 'approved', 'active', 'archived', 'deprecated'
    )),
    version INTEGER DEFAULT 1,

    -- Generation info
    generated_from VARCHAR(50) CHECK (generated_from IN ('flow', 'campaign', 'manual', 'template')),
    ai_generated BOOLEAN DEFAULT true,
    generation_confidence FLOAT CHECK (generation_confidence >= 0 AND generation_confidence <= 1),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    last_executed TIMESTAMP,

    -- Ownership
    created_by UUID,
    approved_by UUID,

    -- Execution stats
    execution_count INTEGER DEFAULT 0,
    avg_execution_time_minutes INTEGER,
    success_rate FLOAT,

    -- Full playbook data
    playbook_data JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- External integration
    soar_platform VARCHAR(50),
    soar_playbook_id VARCHAR(255),
    soar_synced_at TIMESTAMP
);

-- ============================================================================
-- PLAYBOOK PHASES TABLE
-- Stores individual phases of a playbook (Detection, Containment, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS playbook_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,

    phase_name VARCHAR(100) NOT NULL CHECK (phase_name IN (
        'preparation', 'detection', 'analysis', 'containment',
        'eradication', 'recovery', 'post_incident'
    )),
    phase_order INTEGER NOT NULL,
    description TEXT,

    -- Timing
    estimated_duration_minutes INTEGER,
    is_parallel BOOLEAN DEFAULT false,
    dependencies UUID[],  -- Other phase IDs that must complete first

    -- Actions in this phase
    actions JSONB DEFAULT '[]'::jsonb,

    -- Status tracking
    is_automated BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE (playbook_id, phase_order)
);

-- ============================================================================
-- PLAYBOOK ACTIONS TABLE
-- Individual actions within playbook phases
-- ============================================================================
CREATE TABLE IF NOT EXISTS playbook_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES playbook_phases(id) ON DELETE CASCADE,
    playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,

    action_order INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'manual', 'automated', 'api_call', 'script', 'notification',
        'approval', 'data_collection', 'analysis', 'documentation'
    )),

    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,

    -- Execution details
    command TEXT,  -- For automated actions
    api_endpoint TEXT,  -- For API calls
    script_path TEXT,  -- For script execution
    parameters JSONB DEFAULT '{}'::jsonb,

    -- Requirements
    required_tools TEXT[],
    required_permissions TEXT[],
    requires_approval BOOLEAN DEFAULT false,

    -- Timing
    estimated_duration_minutes INTEGER DEFAULT 5,
    timeout_minutes INTEGER,

    -- Success criteria
    success_criteria TEXT,
    rollback_action_id UUID,  -- Action to run if this fails

    -- Metadata
    mitre_technique_id VARCHAR(20),  -- T1566, etc.
    d3fend_technique_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE (phase_id, action_order)
);

-- ============================================================================
-- DETECTION RULES TABLE
-- Detection rules generated from attack flows
-- ============================================================================
CREATE TABLE IF NOT EXISTS playbook_detection_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,

    rule_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Rule content
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN (
        'sigma', 'yara', 'snort', 'suricata', 'splunk_spl',
        'kql', 'elastic_dsl', 'custom'
    )),
    rule_content TEXT NOT NULL,
    rule_metadata JSONB DEFAULT '{}'::jsonb,

    -- MITRE mapping
    mitre_technique_id VARCHAR(20),
    mitre_tactic VARCHAR(100),

    -- Effectiveness
    confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
    false_positive_rate FLOAT,
    detection_count INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,
    tested BOOLEAN DEFAULT false,
    deployed BOOLEAN DEFAULT false,

    -- Platforms
    applicable_platforms TEXT[],  -- windows, linux, macos, network

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PLAYBOOK EXECUTIONS TABLE
-- Tracks playbook execution history
-- ============================================================================
CREATE TABLE IF NOT EXISTS playbook_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_id UUID NOT NULL REFERENCES playbooks(id),

    -- Execution context
    incident_id VARCHAR(255),  -- From SIEM/ticketing system
    campaign_id UUID,
    flow_id UUID,

    -- Timing
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    duration_minutes INTEGER,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'running' CHECK (status IN (
        'pending', 'running', 'paused', 'completed', 'failed', 'cancelled'
    )),

    -- Results
    success BOOLEAN,
    completion_percentage INTEGER DEFAULT 0,
    actions_completed INTEGER DEFAULT 0,
    actions_failed INTEGER DEFAULT 0,

    -- People involved
    executed_by UUID,
    approved_by UUID[],

    -- Data
    execution_log JSONB DEFAULT '[]'::jsonb,
    artifacts_collected JSONB DEFAULT '[]'::jsonb,
    notes TEXT,

    -- Lessons learned
    what_worked_well TEXT,
    what_needs_improvement TEXT,
    recommendations TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PLAYBOOK TEMPLATES TABLE
-- Reusable playbook templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS playbook_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),  -- phishing, malware, ddos, data_breach, etc.

    template_data JSONB NOT NULL,

    -- Usage stats
    usage_count INTEGER DEFAULT 0,
    avg_rating FLOAT,

    -- Metadata
    is_public BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    tags TEXT[]
);

-- ============================================================================
-- SOAR INTEGRATIONS TABLE
-- Tracks SOAR platform integration status
-- ============================================================================
CREATE TABLE IF NOT EXISTS soar_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,

    platform VARCHAR(50) NOT NULL CHECK (platform IN (
        'cortex_xsoar', 'splunk_soar', 'ibm_resilient',
        'servicenow', 'demisto', 'swimlane', 'custom'
    )),

    platform_playbook_id VARCHAR(255) NOT NULL,
    platform_url TEXT,

    -- Sync status
    sync_status VARCHAR(50) DEFAULT 'pending' CHECK (sync_status IN (
        'pending', 'syncing', 'synced', 'failed', 'out_of_sync'
    )),
    last_synced_at TIMESTAMP,
    sync_error TEXT,

    -- Configuration
    integration_config JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE (playbook_id, platform)
);

-- ============================================================================
-- D3FEND MAPPINGS TABLE
-- Maps MITRE ATT&CK techniques to D3FEND countermeasures
-- ============================================================================
CREATE TABLE IF NOT EXISTS d3fend_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ATT&CK technique
    attack_technique_id VARCHAR(20) NOT NULL,  -- T1566
    attack_technique_name VARCHAR(255),
    attack_tactic VARCHAR(100),

    -- D3FEND countermeasure
    d3fend_technique_id VARCHAR(50) NOT NULL,  -- D3-DA
    d3fend_technique_name VARCHAR(255) NOT NULL,
    d3fend_category VARCHAR(100),

    -- Effectiveness
    effectiveness_score FLOAT CHECK (effectiveness_score >= 0 AND effectiveness_score <= 1),
    implementation_difficulty VARCHAR(20) CHECK (implementation_difficulty IN ('low', 'medium', 'high')),
    cost_estimate VARCHAR(20) CHECK (cost_estimate IN ('low', 'medium', 'high')),

    -- Details
    description TEXT,
    implementation_notes TEXT,
    required_tools TEXT[],

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE (attack_technique_id, d3fend_technique_id)
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- Playbooks indexes
CREATE INDEX idx_playbooks_flow_id ON playbooks(flow_id);
CREATE INDEX idx_playbooks_campaign_id ON playbooks(campaign_id);
CREATE INDEX idx_playbooks_status ON playbooks(status);
CREATE INDEX idx_playbooks_severity ON playbooks(severity);
CREATE INDEX idx_playbooks_created_at ON playbooks(created_at DESC);
CREATE INDEX idx_playbooks_tags ON playbooks USING gin(tags);
CREATE INDEX idx_playbooks_soar_platform ON playbooks(soar_platform);
CREATE INDEX idx_playbooks_data ON playbooks USING gin(playbook_data);

-- Phases indexes
CREATE INDEX idx_phases_playbook_id ON playbook_phases(playbook_id);
CREATE INDEX idx_phases_order ON playbook_phases(playbook_id, phase_order);

-- Actions indexes
CREATE INDEX idx_actions_phase_id ON playbook_actions(phase_id);
CREATE INDEX idx_actions_playbook_id ON playbook_actions(playbook_id);
CREATE INDEX idx_actions_type ON playbook_actions(action_type);
CREATE INDEX idx_actions_mitre ON playbook_actions(mitre_technique_id);

-- Detection rules indexes
CREATE INDEX idx_detection_rules_playbook_id ON playbook_detection_rules(playbook_id);
CREATE INDEX idx_detection_rules_type ON playbook_detection_rules(rule_type);
CREATE INDEX idx_detection_rules_mitre ON playbook_detection_rules(mitre_technique_id);
CREATE INDEX idx_detection_rules_active ON playbook_detection_rules(is_active) WHERE is_active = true;

-- Executions indexes
CREATE INDEX idx_executions_playbook_id ON playbook_executions(playbook_id);
CREATE INDEX idx_executions_started_at ON playbook_executions(started_at DESC);
CREATE INDEX idx_executions_status ON playbook_executions(status);
CREATE INDEX idx_executions_incident_id ON playbook_executions(incident_id);

-- Templates indexes
CREATE INDEX idx_templates_category ON playbook_templates(category);
CREATE INDEX idx_templates_tags ON playbook_templates USING gin(tags);
CREATE INDEX idx_templates_public ON playbook_templates(is_public) WHERE is_public = true;

-- SOAR integrations indexes
CREATE INDEX idx_soar_integrations_playbook_id ON soar_integrations(playbook_id);
CREATE INDEX idx_soar_integrations_platform ON soar_integrations(platform);
CREATE INDEX idx_soar_integrations_status ON soar_integrations(sync_status);

-- D3FEND mappings indexes
CREATE INDEX idx_d3fend_attack_technique ON d3fend_mappings(attack_technique_id);
CREATE INDEX idx_d3fend_technique ON d3fend_mappings(d3fend_technique_id);
CREATE INDEX idx_d3fend_effectiveness ON d3fend_mappings(effectiveness_score DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update playbook timestamp on change
CREATE TRIGGER update_playbooks_timestamp
    BEFORE UPDATE ON playbooks
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_detection_rules_timestamp
    BEFORE UPDATE ON playbook_detection_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_templates_timestamp
    BEFORE UPDATE ON playbook_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get playbook with all related data
CREATE OR REPLACE FUNCTION get_full_playbook(playbook_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'playbook', row_to_json(p.*),
        'phases', (
            SELECT json_agg(row_to_json(ph.*) ORDER BY ph.phase_order)
            FROM playbook_phases ph
            WHERE ph.playbook_id = playbook_uuid
        ),
        'actions', (
            SELECT json_agg(row_to_json(a.*) ORDER BY a.action_order)
            FROM playbook_actions a
            WHERE a.playbook_id = playbook_uuid
        ),
        'detection_rules', (
            SELECT json_agg(row_to_json(dr.*))
            FROM playbook_detection_rules dr
            WHERE dr.playbook_id = playbook_uuid
        ),
        'executions', (
            SELECT json_agg(row_to_json(e.*) ORDER BY e.started_at DESC)
            FROM playbook_executions e
            WHERE e.playbook_id = playbook_uuid
            LIMIT 10
        )
    ) INTO result
    FROM playbooks p
    WHERE p.id = playbook_uuid;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Active playbooks with execution stats
CREATE OR REPLACE VIEW active_playbooks_summary AS
SELECT
    p.id,
    p.name,
    p.severity,
    p.status,
    p.estimated_time_minutes,
    p.execution_count,
    p.success_rate,
    (SELECT COUNT(*) FROM playbook_phases WHERE playbook_id = p.id) as phase_count,
    (SELECT COUNT(*) FROM playbook_actions WHERE playbook_id = p.id) as action_count,
    (SELECT COUNT(*) FROM playbook_detection_rules WHERE playbook_id = p.id) as rule_count,
    p.created_at,
    p.last_executed
FROM playbooks p
WHERE p.status IN ('approved', 'active')
ORDER BY p.severity DESC, p.execution_count DESC;

-- Playbook effectiveness metrics
CREATE OR REPLACE VIEW playbook_effectiveness AS
SELECT
    p.id,
    p.name,
    p.execution_count,
    p.success_rate,
    AVG(pe.duration_minutes) as avg_duration_minutes,
    COUNT(CASE WHEN pe.success = true THEN 1 END) as successful_executions,
    COUNT(CASE WHEN pe.success = false THEN 1 END) as failed_executions,
    MAX(pe.started_at) as last_execution
FROM playbooks p
LEFT JOIN playbook_executions pe ON p.id = pe.playbook_id
GROUP BY p.id, p.name, p.execution_count, p.success_rate;

-- ============================================================================
-- SEED DATA - Sample D3FEND Mappings
-- ============================================================================

INSERT INTO d3fend_mappings (attack_technique_id, attack_technique_name, attack_tactic, d3fend_technique_id, d3fend_technique_name, d3fend_category, effectiveness_score, implementation_difficulty, cost_estimate, description)
VALUES
    ('T1566', 'Phishing', 'Initial Access', 'D3-DNSAL', 'DNS Allowlisting', 'Network Isolation', 0.7, 'medium', 'medium', 'Restrict DNS queries to approved domains'),
    ('T1566', 'Phishing', 'Initial Access', 'D3-UAA', 'User Account Authentication', 'Authentication', 0.8, 'low', 'low', 'Multi-factor authentication prevents credential theft'),
    ('T1059', 'Command and Scripting Interpreter', 'Execution', 'D3-PSA', 'Process Spawn Analysis', 'Process Monitoring', 0.9, 'medium', 'medium', 'Detect suspicious process creation patterns'),
    ('T1486', 'Data Encrypted for Impact', 'Impact', 'D3-BA', 'Backup', 'Data Backup', 0.95, 'low', 'medium', 'Regular backups enable recovery from ransomware'),
    ('T1071', 'Application Layer Protocol', 'Command and Control', 'D3-NTA', 'Network Traffic Analysis', 'Network Monitoring', 0.8, 'high', 'high', 'Detect C2 communications in network traffic')
ON CONFLICT (attack_technique_id, d3fend_technique_id) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE playbooks IS 'Generated incident response playbooks from attack flows';
COMMENT ON TABLE playbook_phases IS 'Individual phases within a playbook (detection, containment, etc.)';
COMMENT ON TABLE playbook_actions IS 'Specific actions to perform in each phase';
COMMENT ON TABLE playbook_detection_rules IS 'Detection rules generated from attack patterns';
COMMENT ON TABLE playbook_executions IS 'Historical record of playbook executions';
COMMENT ON TABLE playbook_templates IS 'Reusable playbook templates for common scenarios';
COMMENT ON TABLE soar_integrations IS 'SOAR platform integration tracking';
COMMENT ON TABLE d3fend_mappings IS 'MITRE ATT&CK to D3FEND defensive countermeasure mappings';

COMMENT ON COLUMN playbooks.generation_confidence IS 'AI confidence in generated playbook (0.0-1.0)';
COMMENT ON COLUMN playbooks.soar_platform IS 'Integrated SOAR platform (xsoar, phantom, etc.)';
COMMENT ON COLUMN playbook_actions.action_type IS 'Type: manual, automated, api_call, script, etc.';
COMMENT ON COLUMN playbook_detection_rules.rule_type IS 'Detection rule format (sigma, yara, spl, kql, etc.)';
COMMENT ON COLUMN d3fend_mappings.effectiveness_score IS 'How effective this countermeasure is (0.0-1.0)';
