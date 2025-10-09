-- Advanced Threat Correlation Engine Schema

-- Threat Correlations Table
CREATE TABLE threat_correlations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id_1 UUID REFERENCES saved_flows(id) ON DELETE CASCADE,
    flow_id_2 UUID REFERENCES saved_flows(id) ON DELETE CASCADE,

    -- Correlation metrics
    correlation_score FLOAT NOT NULL, -- 0.0 to 1.0
    correlation_type VARCHAR(50) NOT NULL, -- ioc_overlap, ttp_similarity, infrastructure_shared, temporal, behavioral
    confidence_level VARCHAR(20), -- low, medium, high

    -- Shared elements
    shared_indicators JSONB DEFAULT '[]',
    shared_ttps JSONB DEFAULT '[]',
    shared_infrastructure JSONB DEFAULT '[]',

    -- Correlation details
    ioc_overlap_count INTEGER DEFAULT 0,
    ttp_similarity_score FLOAT,
    temporal_proximity_hours FLOAT,
    infrastructure_overlap_score FLOAT,

    -- Metadata
    detected_at TIMESTAMP DEFAULT NOW(),
    detection_method VARCHAR(100), -- automated, manual, ml_based
    analyzed_by UUID REFERENCES users(id),

    -- Status
    validated BOOLEAN DEFAULT false,
    validated_by UUID REFERENCES users(id),
    validated_at TIMESTAMP,

    metadata JSONB DEFAULT '{}',

    -- Ensure we don't duplicate correlations
    CONSTRAINT unique_correlation UNIQUE(flow_id_1, flow_id_2)
);

-- Campaigns Table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Campaign metrics
    confidence_score FLOAT, -- Overall confidence (0.0 to 1.0)
    sophistication_level VARCHAR(50), -- low, medium, high, advanced
    campaign_status VARCHAR(50) DEFAULT 'active', -- active, dormant, concluded

    -- Timeline
    first_seen TIMESTAMP NOT NULL,
    last_seen TIMESTAMP NOT NULL,
    duration_days INTEGER,

    -- Related flows
    related_flows UUID[] NOT NULL,
    flow_count INTEGER,

    -- Attack patterns
    shared_ttps TEXT[],
    ttp_pattern_signature TEXT,
    primary_tactics TEXT[],

    -- Indicators
    shared_iocs JSONB DEFAULT '[]',
    indicators_count INTEGER DEFAULT 0,
    unique_ioc_count INTEGER DEFAULT 0,

    -- Infrastructure
    c2_servers TEXT[],
    domains TEXT[],
    infrastructure_fingerprint TEXT,

    -- Attribution
    suspected_actor VARCHAR(100),
    attribution_confidence VARCHAR(20), -- low, medium, high
    attribution_reasoning TEXT,
    known_apt_group VARCHAR(100),

    -- Impact assessment
    affected_organizations TEXT[],
    affected_systems_count INTEGER,
    estimated_impact VARCHAR(50), -- minimal, moderate, significant, severe

    -- Analysis
    behavior_summary TEXT,
    objectives TEXT[],
    capabilities TEXT[],

    -- Tracking
    organization_id UUID REFERENCES organizations(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    metadata JSONB DEFAULT '{}'
);

-- Campaign Events Table (for timeline)
CREATE TABLE campaign_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,

    -- Event details
    event_type VARCHAR(100), -- flow_detected, ioc_discovered, infrastructure_identified, ttp_observed
    event_title VARCHAR(255) NOT NULL,
    event_description TEXT,

    -- Related entities
    flow_id UUID REFERENCES saved_flows(id),
    correlation_id UUID REFERENCES threat_correlations(id),

    -- Event data
    event_data JSONB DEFAULT '{}',

    -- Timeline
    event_timestamp TIMESTAMP NOT NULL,
    added_at TIMESTAMP DEFAULT NOW(),

    metadata JSONB DEFAULT '{}'
);

-- Threat Actor Profiles (for attribution)
CREATE TABLE threat_actor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_name VARCHAR(200) NOT NULL UNIQUE,
    aliases TEXT[],

    -- Classification
    actor_type VARCHAR(50), -- nation_state, cybercrime, hacktivist, insider
    origin_country VARCHAR(100),
    target_sectors TEXT[],
    target_regions TEXT[],

    -- Behavioral patterns
    known_ttps TEXT[],
    ttp_signature TEXT,
    typical_tools TEXT[],
    typical_malware TEXT[],

    -- Infrastructure patterns
    infrastructure_patterns JSONB,
    typical_c2_characteristics TEXT[],

    -- Operational patterns
    typical_timeframes TEXT,
    operation_tempo VARCHAR(50), -- slow, moderate, fast, burst
    sophistication_indicators TEXT[],

    -- Attribution markers
    attribution_markers JSONB,
    code_signing_certs TEXT[],
    language_indicators TEXT[],

    -- Metadata
    first_observed TIMESTAMP,
    last_observed TIMESTAMP,
    active_campaigns INTEGER DEFAULT 0,

    description TEXT,
    references TEXT[],

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Campaign Attribution Links
CREATE TABLE campaign_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES threat_actor_profiles(id),

    -- Attribution details
    confidence_score FLOAT, -- 0.0 to 1.0
    attribution_method VARCHAR(100), -- ttp_matching, infrastructure_overlap, behavioral_analysis, code_similarity

    -- Matching factors
    matched_ttps TEXT[],
    matched_infrastructure TEXT[],
    matched_behaviors TEXT[],

    reasoning TEXT,

    -- Validation
    validated BOOLEAN DEFAULT false,
    validated_by UUID REFERENCES users(id),
    validated_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Correlation Analysis Jobs (for tracking background analysis)
CREATE TABLE correlation_analysis_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50), -- full_scan, incremental, targeted

    -- Scope
    flow_ids UUID[],
    organization_id UUID REFERENCES organizations(id),

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
    progress_percentage INTEGER DEFAULT 0,

    -- Results
    correlations_found INTEGER DEFAULT 0,
    campaigns_detected INTEGER DEFAULT 0,

    -- Execution
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    execution_time_seconds INTEGER,

    -- Configuration
    min_correlation_threshold FLOAT DEFAULT 0.6,
    include_temporal_analysis BOOLEAN DEFAULT true,

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),

    metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX idx_correlations_flow1 ON threat_correlations(flow_id_1);
CREATE INDEX idx_correlations_flow2 ON threat_correlations(flow_id_2);
CREATE INDEX idx_correlations_score ON threat_correlations(correlation_score DESC);
CREATE INDEX idx_correlations_type ON threat_correlations(correlation_type);
CREATE INDEX idx_campaigns_status ON campaigns(campaign_status, last_seen DESC);
CREATE INDEX idx_campaigns_org ON campaigns(organization_id);
CREATE INDEX idx_campaigns_actor ON campaigns(suspected_actor);
CREATE INDEX idx_campaigns_flows ON campaigns USING GIN(related_flows);
CREATE INDEX idx_campaign_events_campaign ON campaign_events(campaign_id, event_timestamp DESC);
CREATE INDEX idx_actor_profiles_name ON threat_actor_profiles(actor_name);
CREATE INDEX idx_actor_profiles_ttps ON threat_actor_profiles USING GIN(known_ttps);
CREATE INDEX idx_campaign_attributions_campaign ON campaign_attributions(campaign_id);
CREATE INDEX idx_analysis_jobs_status ON correlation_analysis_jobs(status, created_at DESC);
