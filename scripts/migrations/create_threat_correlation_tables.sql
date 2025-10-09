-- Threat Correlation Engine - Database Schema
-- This migration creates tables for advanced threat correlation and campaign detection

-- ============================================================================
-- THREAT CORRELATIONS TABLE
-- Stores relationships between attack flows based on shared indicators
-- ============================================================================
CREATE TABLE IF NOT EXISTS threat_correlations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id_1 UUID NOT NULL,
    flow_id_2 UUID NOT NULL,
    correlation_score FLOAT NOT NULL CHECK (correlation_score >= 0 AND correlation_score <= 1),
    correlation_type VARCHAR(50) NOT NULL CHECK (correlation_type IN (
        'ioc_overlap',
        'ttp_similarity',
        'infrastructure_shared',
        'temporal_proximity',
        'target_overlap',
        'malware_family'
    )),
    shared_indicators JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    detected_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Ensure we don't duplicate correlations (A->B is same as B->A)
    CONSTRAINT unique_correlation UNIQUE (
        LEAST(flow_id_1, flow_id_2),
        GREATEST(flow_id_1, flow_id_2),
        correlation_type
    )
);

-- ============================================================================
-- CAMPAIGNS TABLE
-- Represents coordinated attack campaigns detected across multiple flows
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'monitoring', 'resolved', 'archived')),
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    first_seen TIMESTAMP NOT NULL,
    last_seen TIMESTAMP NOT NULL,
    related_flows UUID[] DEFAULT ARRAY[]::UUID[],
    shared_ttps TEXT[] DEFAULT ARRAY[]::TEXT[],
    shared_iocs JSONB DEFAULT '[]'::jsonb,
    suspected_actor VARCHAR(100),
    suspected_actor_confidence FLOAT,
    indicators_count INTEGER DEFAULT 0,
    affected_assets JSONB DEFAULT '[]'::jsonb,
    mitigation_status JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT check_dates CHECK (last_seen >= first_seen)
);

-- ============================================================================
-- CAMPAIGN FLOWS TABLE
-- Junction table linking campaigns to their constituent flows
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaign_flows (
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    flow_id UUID NOT NULL,
    added_at TIMESTAMP DEFAULT NOW(),
    relevance_score FLOAT CHECK (relevance_score >= 0 AND relevance_score <= 1),
    notes TEXT,

    PRIMARY KEY (campaign_id, flow_id)
);

-- ============================================================================
-- CAMPAIGN INDICATORS TABLE
-- Tracks all IOCs associated with a campaign
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaign_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    indicator_type VARCHAR(50) NOT NULL CHECK (indicator_type IN (
        'ip', 'domain', 'url', 'hash', 'email', 'cve', 'registry_key', 'file_path', 'mutex'
    )),
    indicator_value TEXT NOT NULL,
    first_seen TIMESTAMP NOT NULL,
    last_seen TIMESTAMP NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    source_flows UUID[] DEFAULT ARRAY[]::UUID[],
    enrichment_data JSONB DEFAULT '{}'::jsonb,

    CONSTRAINT unique_campaign_indicator UNIQUE (campaign_id, indicator_type, indicator_value)
);

-- ============================================================================
-- CAMPAIGN TTPS TABLE
-- Tracks MITRE ATT&CK techniques associated with a campaign
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaign_ttps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    technique_id VARCHAR(20) NOT NULL, -- T1566, T1059, etc.
    technique_name VARCHAR(200),
    tactic VARCHAR(100),
    occurrence_count INTEGER DEFAULT 1,
    first_seen TIMESTAMP NOT NULL,
    last_seen TIMESTAMP NOT NULL,
    source_flows UUID[] DEFAULT ARRAY[]::UUID[],

    CONSTRAINT unique_campaign_ttp UNIQUE (campaign_id, technique_id)
);

-- ============================================================================
-- CAMPAIGN TIMELINE TABLE
-- Tracks significant events in a campaign's lifecycle
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaign_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'campaign_detected',
        'new_flow_added',
        'new_indicator_found',
        'actor_attributed',
        'mitigation_applied',
        'status_changed',
        'severity_escalated',
        'campaign_merged'
    )),
    event_timestamp TIMESTAMP NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID,

    CONSTRAINT timeline_order CHECK (event_timestamp IS NOT NULL)
);

-- ============================================================================
-- CORRELATION ANALYTICS TABLE
-- Stores analytics and metrics about correlation patterns
-- ============================================================================
CREATE TABLE IF NOT EXISTS correlation_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_date DATE NOT NULL,
    total_flows_analyzed INTEGER DEFAULT 0,
    correlations_found INTEGER DEFAULT 0,
    campaigns_detected INTEGER DEFAULT 0,
    avg_correlation_score FLOAT,
    top_correlation_types JSONB DEFAULT '[]'::jsonb,
    top_shared_indicators JSONB DEFAULT '[]'::jsonb,
    metrics JSONB DEFAULT '{}'::jsonb,

    CONSTRAINT unique_analysis_date UNIQUE (analysis_date)
);

-- ============================================================================
-- INDEXES for Performance Optimization
-- ============================================================================

-- Threat Correlations Indexes
CREATE INDEX idx_correlations_flow1 ON threat_correlations(flow_id_1);
CREATE INDEX idx_correlations_flow2 ON threat_correlations(flow_id_2);
CREATE INDEX idx_correlations_score ON threat_correlations(correlation_score DESC);
CREATE INDEX idx_correlations_type ON threat_correlations(correlation_type);
CREATE INDEX idx_correlations_detected ON threat_correlations(detected_at DESC);
CREATE INDEX idx_correlations_shared_indicators ON threat_correlations USING gin(shared_indicators);

-- Campaigns Indexes
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_severity ON campaigns(severity);
CREATE INDEX idx_campaigns_confidence ON campaigns(confidence_score DESC);
CREATE INDEX idx_campaigns_actor ON campaigns(suspected_actor);
CREATE INDEX idx_campaigns_dates ON campaigns(first_seen, last_seen);
CREATE INDEX idx_campaigns_flows ON campaigns USING gin(related_flows);
CREATE INDEX idx_campaigns_ttps ON campaigns USING gin(shared_ttps);
CREATE INDEX idx_campaigns_tags ON campaigns USING gin(tags);

-- Campaign Flows Indexes
CREATE INDEX idx_campaign_flows_campaign ON campaign_flows(campaign_id);
CREATE INDEX idx_campaign_flows_flow ON campaign_flows(flow_id);
CREATE INDEX idx_campaign_flows_relevance ON campaign_flows(relevance_score DESC);

-- Campaign Indicators Indexes
CREATE INDEX idx_campaign_indicators_campaign ON campaign_indicators(campaign_id);
CREATE INDEX idx_campaign_indicators_type ON campaign_indicators(indicator_type);
CREATE INDEX idx_campaign_indicators_value ON campaign_indicators(indicator_value);
CREATE INDEX idx_campaign_indicators_confidence ON campaign_indicators(confidence DESC);
CREATE INDEX idx_campaign_indicators_sources ON campaign_indicators USING gin(source_flows);

-- Campaign TTPs Indexes
CREATE INDEX idx_campaign_ttps_campaign ON campaign_ttps(campaign_id);
CREATE INDEX idx_campaign_ttps_technique ON campaign_ttps(technique_id);
CREATE INDEX idx_campaign_ttps_tactic ON campaign_ttps(tactic);
CREATE INDEX idx_campaign_ttps_count ON campaign_ttps(occurrence_count DESC);

-- Campaign Timeline Indexes
CREATE INDEX idx_campaign_timeline_campaign ON campaign_timeline(campaign_id);
CREATE INDEX idx_campaign_timeline_type ON campaign_timeline(event_type);
CREATE INDEX idx_campaign_timeline_timestamp ON campaign_timeline(event_timestamp DESC);

-- Correlation Analytics Indexes
CREATE INDEX idx_correlation_analytics_date ON correlation_analytics(analysis_date DESC);

-- ============================================================================
-- TRIGGERS for Auto-updating Timestamps
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_threat_correlations_timestamp
    BEFORE UPDATE ON threat_correlations
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_campaigns_timestamp
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- VIEWS for Common Queries
-- ============================================================================

-- Active campaigns with summary statistics
CREATE OR REPLACE VIEW active_campaigns_summary AS
SELECT
    c.id,
    c.name,
    c.confidence_score,
    c.severity,
    c.suspected_actor,
    c.first_seen,
    c.last_seen,
    cardinality(c.related_flows) as flow_count,
    c.indicators_count,
    cardinality(c.shared_ttps) as ttp_count,
    (SELECT COUNT(*) FROM campaign_timeline WHERE campaign_id = c.id) as timeline_events,
    c.status,
    c.created_at
FROM campaigns c
WHERE c.status IN ('active', 'monitoring')
ORDER BY c.confidence_score DESC, c.last_seen DESC;

-- High-confidence correlations
CREATE OR REPLACE VIEW high_confidence_correlations AS
SELECT
    tc.id,
    tc.flow_id_1,
    tc.flow_id_2,
    tc.correlation_score,
    tc.correlation_type,
    tc.shared_indicators,
    tc.detected_at
FROM threat_correlations tc
WHERE tc.correlation_score >= 0.7
ORDER BY tc.correlation_score DESC, tc.detected_at DESC;

-- Campaign indicator summary
CREATE OR REPLACE VIEW campaign_indicator_summary AS
SELECT
    ci.campaign_id,
    ci.indicator_type,
    COUNT(*) as indicator_count,
    AVG(ci.confidence) as avg_confidence,
    MIN(ci.first_seen) as earliest_seen,
    MAX(ci.last_seen) as latest_seen
FROM campaign_indicators ci
GROUP BY ci.campaign_id, ci.indicator_type
ORDER BY ci.campaign_id, indicator_count DESC;

-- ============================================================================
-- FUNCTIONS for Complex Operations
-- ============================================================================

-- Function to merge two campaigns
CREATE OR REPLACE FUNCTION merge_campaigns(
    source_campaign_id UUID,
    target_campaign_id UUID
)
RETURNS UUID AS $$
DECLARE
    merged_flows UUID[];
    merged_ttps TEXT[];
BEGIN
    -- Update target campaign with merged data
    UPDATE campaigns c
    SET
        related_flows = ARRAY(
            SELECT DISTINCT unnest(c.related_flows ||
                (SELECT related_flows FROM campaigns WHERE id = source_campaign_id))
        ),
        shared_ttps = ARRAY(
            SELECT DISTINCT unnest(c.shared_ttps ||
                (SELECT shared_ttps FROM campaigns WHERE id = source_campaign_id))
        ),
        first_seen = LEAST(c.first_seen,
            (SELECT first_seen FROM campaigns WHERE id = source_campaign_id)),
        last_seen = GREATEST(c.last_seen,
            (SELECT last_seen FROM campaigns WHERE id = source_campaign_id)),
        indicators_count = c.indicators_count +
            (SELECT indicators_count FROM campaigns WHERE id = source_campaign_id),
        updated_at = NOW()
    WHERE c.id = target_campaign_id;

    -- Move all indicators to target campaign
    UPDATE campaign_indicators
    SET campaign_id = target_campaign_id
    WHERE campaign_id = source_campaign_id;

    -- Move all TTPs to target campaign
    UPDATE campaign_ttps
    SET campaign_id = target_campaign_id
    WHERE campaign_id = source_campaign_id;

    -- Move timeline events
    UPDATE campaign_timeline
    SET campaign_id = target_campaign_id
    WHERE campaign_id = source_campaign_id;

    -- Add merge event to timeline
    INSERT INTO campaign_timeline (campaign_id, event_type, event_timestamp, description)
    VALUES (
        target_campaign_id,
        'campaign_merged',
        NOW(),
        'Merged with campaign ' || source_campaign_id
    );

    -- Delete source campaign
    DELETE FROM campaigns WHERE id = source_campaign_id;

    RETURN target_campaign_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA / SEED
-- ============================================================================

-- Insert initial analytics record
INSERT INTO correlation_analytics (analysis_date, total_flows_analyzed)
VALUES (CURRENT_DATE, 0)
ON CONFLICT (analysis_date) DO NOTHING;

-- ============================================================================
-- COMMENTS for Documentation
-- ============================================================================

COMMENT ON TABLE threat_correlations IS 'Stores correlation relationships between attack flows';
COMMENT ON TABLE campaigns IS 'Represents detected attack campaigns spanning multiple incidents';
COMMENT ON TABLE campaign_flows IS 'Links campaigns to their constituent flows';
COMMENT ON TABLE campaign_indicators IS 'Tracks IOCs associated with campaigns';
COMMENT ON TABLE campaign_ttps IS 'Tracks MITRE ATT&CK techniques used in campaigns';
COMMENT ON TABLE campaign_timeline IS 'Audit trail of campaign lifecycle events';
COMMENT ON TABLE correlation_analytics IS 'Analytics and metrics about correlation patterns';

COMMENT ON COLUMN threat_correlations.correlation_score IS 'Correlation strength from 0.0 (weak) to 1.0 (strong)';
COMMENT ON COLUMN campaigns.confidence_score IS 'Campaign detection confidence from 0.0 to 1.0';
COMMENT ON COLUMN campaigns.severity IS 'Campaign threat severity level';
COMMENT ON COLUMN campaigns.suspected_actor IS 'Attributed threat actor or APT group';
