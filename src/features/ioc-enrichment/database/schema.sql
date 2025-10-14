-- IOC Enrichment Database Schema
-- Stores enrichment history, ML training data, and provider accuracy tracking

-- Enrichment History Table
CREATE TABLE IF NOT EXISTS ioc_enrichment_history (
    id SERIAL PRIMARY KEY,
    ioc VARCHAR(500) NOT NULL,
    ioc_type VARCHAR(50) NOT NULL,

    -- Consensus results
    consensus_score INTEGER NOT NULL,
    consensus_verdict VARCHAR(20) NOT NULL,
    consensus_confidence DECIMAL(5,4) NOT NULL,
    consensus_agreement DECIMAL(5,4) NOT NULL,
    provider_count INTEGER NOT NULL,

    -- ML scoring
    ml_confidence_score DECIMAL(5,4),
    ml_reliability_score DECIMAL(5,4),
    ml_recommended_action VARCHAR(20),

    -- Metadata
    geolocation_country VARCHAR(100),
    geolocation_city VARCHAR(200),
    network_asn VARCHAR(100),
    network_organization VARCHAR(500),
    network_isp VARCHAR(500),

    -- Performance stats
    processing_time INTEGER NOT NULL,
    successful_providers INTEGER NOT NULL,
    failed_providers INTEGER NOT NULL,
    cached_result BOOLEAN NOT NULL DEFAULT false,

    -- Full JSON results (for complete data)
    full_result JSONB,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Indexes
    CONSTRAINT ioc_enrichment_history_ioc_ioc_type_key UNIQUE (ioc, ioc_type, created_at)
);

CREATE INDEX idx_ioc_enrichment_history_ioc ON ioc_enrichment_history(ioc);
CREATE INDEX idx_ioc_enrichment_history_ioc_type ON ioc_enrichment_history(ioc_type);
CREATE INDEX idx_ioc_enrichment_history_verdict ON ioc_enrichment_history(consensus_verdict);
CREATE INDEX idx_ioc_enrichment_history_created_at ON ioc_enrichment_history(created_at DESC);
CREATE INDEX idx_ioc_enrichment_history_full_result ON ioc_enrichment_history USING GIN (full_result);

-- Provider Results Table (denormalized for quick querying)
CREATE TABLE IF NOT EXISTS provider_enrichment_results (
    id SERIAL PRIMARY KEY,
    enrichment_id INTEGER NOT NULL REFERENCES ioc_enrichment_history(id) ON DELETE CASCADE,
    provider_name VARCHAR(100) NOT NULL,

    success BOOLEAN NOT NULL,
    verdict VARCHAR(20),
    score INTEGER,
    confidence DECIMAL(5,4),
    response_time INTEGER NOT NULL,
    cached BOOLEAN NOT NULL DEFAULT false,

    error_message TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provider_enrichment_results_enrichment_id ON provider_enrichment_results(enrichment_id);
CREATE INDEX idx_provider_enrichment_results_provider_name ON provider_enrichment_results(provider_name);
CREATE INDEX idx_provider_enrichment_results_verdict ON provider_enrichment_results(verdict);

-- Threats Table
CREATE TABLE IF NOT EXISTS enrichment_threats (
    id SERIAL PRIMARY KEY,
    enrichment_id INTEGER NOT NULL REFERENCES ioc_enrichment_history(id) ON DELETE CASCADE,

    threat_type VARCHAR(50) NOT NULL,
    threat_name VARCHAR(500) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    sources TEXT[] NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enrichment_threats_enrichment_id ON enrichment_threats(enrichment_id);
CREATE INDEX idx_enrichment_threats_threat_type ON enrichment_threats(threat_type);
CREATE INDEX idx_enrichment_threats_threat_name ON enrichment_threats(threat_name);

-- Related Indicators Table
CREATE TABLE IF NOT EXISTS enrichment_related_indicators (
    id SERIAL PRIMARY KEY,
    enrichment_id INTEGER NOT NULL REFERENCES ioc_enrichment_history(id) ON DELETE CASCADE,

    indicator_type VARCHAR(50) NOT NULL,
    indicator_value VARCHAR(500) NOT NULL,
    relationship VARCHAR(200) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    sources TEXT[] NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enrichment_related_indicators_enrichment_id ON enrichment_related_indicators(enrichment_id);
CREATE INDEX idx_enrichment_related_indicators_indicator_type ON enrichment_related_indicators(indicator_type);
CREATE INDEX idx_enrichment_related_indicators_indicator_value ON enrichment_related_indicators(indicator_value);

-- Tags Table
CREATE TABLE IF NOT EXISTS enrichment_tags (
    id SERIAL PRIMARY KEY,
    enrichment_id INTEGER NOT NULL REFERENCES ioc_enrichment_history(id) ON DELETE CASCADE,

    tag VARCHAR(200) NOT NULL,
    count INTEGER NOT NULL,
    sources TEXT[] NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enrichment_tags_enrichment_id ON enrichment_tags(enrichment_id);
CREATE INDEX idx_enrichment_tags_tag ON enrichment_tags(tag);

-- ML Training Data Table
CREATE TABLE IF NOT EXISTS ml_training_data (
    id SERIAL PRIMARY KEY,
    enrichment_id INTEGER REFERENCES ioc_enrichment_history(id) ON DELETE CASCADE,

    ioc VARCHAR(500) NOT NULL,
    ioc_type VARCHAR(50) NOT NULL,

    -- Features (extracted from enrichment)
    provider_agreement DECIMAL(5,4),
    verdict_consistency DECIMAL(5,4),
    score_variance DECIMAL(10,4),
    highest_confidence DECIMAL(5,4),
    lowest_confidence DECIMAL(5,4),
    avg_confidence DECIMAL(5,4),
    metadata_completeness DECIMAL(5,4),
    related_indicator_count INTEGER,
    threat_count INTEGER,
    tag_count INTEGER,
    provider_count INTEGER,
    high_trust_providers INTEGER,

    -- Ground truth
    actual_verdict VARCHAR(20) NOT NULL,
    user_feedback VARCHAR(20) NOT NULL, -- correct, incorrect, uncertain

    -- Full features JSON
    features JSONB,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ml_training_data_ioc ON ml_training_data(ioc);
CREATE INDEX idx_ml_training_data_actual_verdict ON ml_training_data(actual_verdict);
CREATE INDEX idx_ml_training_data_user_feedback ON ml_training_data(user_feedback);
CREATE INDEX idx_ml_training_data_created_at ON ml_training_data(created_at DESC);

-- Provider Accuracy Tracking Table
CREATE TABLE IF NOT EXISTS provider_accuracy_tracking (
    id SERIAL PRIMARY KEY,
    provider_name VARCHAR(100) NOT NULL,
    ioc VARCHAR(500) NOT NULL,
    ioc_type VARCHAR(50) NOT NULL,

    predicted_verdict VARCHAR(20) NOT NULL,
    actual_verdict VARCHAR(20) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    correct BOOLEAN NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provider_accuracy_tracking_provider_name ON provider_accuracy_tracking(provider_name);
CREATE INDEX idx_provider_accuracy_tracking_correct ON provider_accuracy_tracking(correct);
CREATE INDEX idx_provider_accuracy_tracking_created_at ON provider_accuracy_tracking(created_at DESC);

-- Provider Statistics (aggregated view)
CREATE TABLE IF NOT EXISTS provider_statistics (
    id SERIAL PRIMARY KEY,
    provider_name VARCHAR(100) NOT NULL UNIQUE,

    total_predictions INTEGER NOT NULL DEFAULT 0,
    correct_predictions INTEGER NOT NULL DEFAULT 0,
    incorrect_predictions INTEGER NOT NULL DEFAULT 0,
    accuracy DECIMAL(5,4) NOT NULL DEFAULT 0,

    avg_confidence DECIMAL(5,4),
    avg_response_time INTEGER,

    recommended_weight DECIMAL(5,4),
    trend VARCHAR(20), -- improving, declining, stable

    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provider_statistics_provider_name ON provider_statistics(provider_name);
CREATE INDEX idx_provider_statistics_accuracy ON provider_statistics(accuracy DESC);

-- Views for analytics

-- Recent enrichments by verdict
CREATE OR REPLACE VIEW recent_enrichments_by_verdict AS
SELECT
    consensus_verdict,
    COUNT(*) as count,
    AVG(consensus_score) as avg_score,
    AVG(consensus_confidence) as avg_confidence,
    AVG(processing_time) as avg_processing_time
FROM ioc_enrichment_history
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY consensus_verdict;

-- Provider performance summary
CREATE OR REPLACE VIEW provider_performance_summary AS
SELECT
    provider_name,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE success = true) as successful_requests,
    COUNT(*) FILTER (WHERE success = false) as failed_requests,
    AVG(response_time) FILTER (WHERE success = true) as avg_response_time,
    COUNT(*) FILTER (WHERE cached = true) as cached_requests,
    ROUND(COUNT(*) FILTER (WHERE success = true)::NUMERIC / COUNT(*) * 100, 2) as success_rate
FROM provider_enrichment_results
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY provider_name;

-- Most common threats
CREATE OR REPLACE VIEW most_common_threats AS
SELECT
    threat_type,
    threat_name,
    COUNT(*) as occurrence_count,
    AVG(confidence) as avg_confidence
FROM enrichment_threats
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY threat_type, threat_name
ORDER BY occurrence_count DESC
LIMIT 50;

-- IOC enrichment trends
CREATE OR REPLACE VIEW ioc_enrichment_trends AS
SELECT
    DATE(created_at) as date,
    ioc_type,
    COUNT(*) as enrichment_count,
    AVG(processing_time) as avg_processing_time,
    COUNT(*) FILTER (WHERE cached_result = true) as cached_count
FROM ioc_enrichment_history
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), ioc_type
ORDER BY date DESC, enrichment_count DESC;

-- Functions

-- Function to update provider statistics
CREATE OR REPLACE FUNCTION update_provider_statistics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO provider_statistics (
        provider_name,
        total_predictions,
        correct_predictions,
        incorrect_predictions,
        accuracy
    )
    SELECT
        provider_name,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE correct = true) as correct,
        COUNT(*) FILTER (WHERE correct = false) as incorrect,
        ROUND(COUNT(*) FILTER (WHERE correct = true)::NUMERIC / COUNT(*), 4) as accuracy
    FROM provider_accuracy_tracking
    WHERE provider_name = NEW.provider_name
    GROUP BY provider_name
    ON CONFLICT (provider_name)
    DO UPDATE SET
        total_predictions = EXCLUDED.total_predictions,
        correct_predictions = EXCLUDED.correct_predictions,
        incorrect_predictions = EXCLUDED.incorrect_predictions,
        accuracy = EXCLUDED.accuracy,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update provider statistics
CREATE TRIGGER trigger_update_provider_statistics
AFTER INSERT ON provider_accuracy_tracking
FOR EACH ROW
EXECUTE FUNCTION update_provider_statistics();

-- Function to clean up old enrichment data
CREATE OR REPLACE FUNCTION cleanup_old_enrichment_data(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ioc_enrichment_history
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE ioc_enrichment_history IS 'Stores complete history of IOC enrichments with consensus results';
COMMENT ON TABLE provider_enrichment_results IS 'Individual provider results for each enrichment';
COMMENT ON TABLE enrichment_threats IS 'Threats detected during enrichment';
COMMENT ON TABLE enrichment_related_indicators IS 'Related indicators discovered during enrichment';
COMMENT ON TABLE enrichment_tags IS 'Tags associated with enrichments';
COMMENT ON TABLE ml_training_data IS 'Training data for ML confidence scoring';
COMMENT ON TABLE provider_accuracy_tracking IS 'Tracks provider accuracy over time';
COMMENT ON TABLE provider_statistics IS 'Aggregated provider performance statistics';
