// Core ML & AI Types for ThreatFlow Platform

export interface AnomalyDetectionModel {
  id: string;
  name: string;
  modelType: 'isolation_forest' | 'one_class_svm' | 'autoencoder' | 'statistical' | 'ensemble';
  trainingData: TrainingDataset;
  hyperparameters: Record<string, any>;
  performance: ModelPerformance;
  lastTrained: string;
  status: 'training' | 'ready' | 'degraded' | 'failed';
  version: string;
  features: string[];
  thresholds: AnomalyThresholds;
}

export interface TrainingDataset {
  id: string;
  name: string;
  size: number;
  features: DataFeature[];
  timeRange: {
    start: string;
    end: string;
  };
  quality: DataQuality;
  preprocessing: PreprocessingConfig;
}

export interface DataFeature {
  name: string;
  type: 'numerical' | 'categorical' | 'temporal' | 'text' | 'binary';
  importance: number;
  missing_rate: number;
  statistics: FeatureStatistics;
  encoding?: string;
}

export interface FeatureStatistics {
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  median?: number;
  mode?: string | number;
  unique_count?: number;
  null_count: number;
}

export interface DataQuality {
  completeness: number;
  consistency: number;
  accuracy: number;
  validity: number;
  uniqueness: number;
  overall_score: number;
  issues: QualityIssue[];
}

export interface QualityIssue {
  type: 'missing_values' | 'outliers' | 'duplicates' | 'inconsistent_format' | 'invalid_values';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_records: number;
  recommendation: string;
}

export interface PreprocessingConfig {
  normalization: 'min_max' | 'z_score' | 'robust' | 'none';
  feature_selection: boolean;
  dimensionality_reduction?: 'pca' | 'umap' | 'tsne';
  outlier_removal: boolean;
  encoding_strategy: 'one_hot' | 'label' | 'target' | 'embedding';
  time_series_features?: TimeSeriesFeatures;
}

export interface TimeSeriesFeatures {
  window_size: number;
  lag_features: number[];
  rolling_statistics: string[];
  seasonal_features: boolean;
  trend_features: boolean;
}

export interface ModelPerformance {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  auc_roc?: number;
  confusion_matrix?: number[][];
  feature_importance: Record<string, number>;
  training_time: number;
  inference_time: number;
  model_size: number;
  cross_validation_scores?: number[];
}

export interface AnomalyThresholds {
  contamination_rate: number;
  anomaly_score_threshold: number;
  confidence_threshold: number;
  severity_thresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface AnomalyDetection {
  id: string;
  timestamp: string;
  data_point: Record<string, any>;
  anomaly_score: number;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  model_id: string;
  feature_contributions: Record<string, number>;
  explanation: AnomalyExplanation;
  status: 'new' | 'investigating' | 'confirmed' | 'false_positive' | 'resolved';
  assignee?: string;
  notes?: string;
  related_incidents?: string[];
}

export interface AnomalyExplanation {
  primary_factors: string[];
  statistical_summary: string;
  comparison_to_baseline: Record<string, number>;
  time_context: string;
  recommended_actions: string[];
  risk_assessment: string;
}

// Predictive Analytics Types
export interface PredictiveModel {
  id: string;
  name: string;
  model_type: 'lstm' | 'arima' | 'prophet' | 'xgboost' | 'random_forest' | 'ensemble';
  prediction_target: 'attack_likelihood' | 'technique_probability' | 'campaign_evolution' | 'vulnerability_emergence';
  time_horizon: string; // e.g., '7d', '30d', '90d'
  training_data: TrainingDataset;
  performance: ModelPerformance;
  last_trained: string;
  predictions: PredictionResult[];
  status: 'training' | 'ready' | 'degraded' | 'failed';
  feature_engineering: FeatureEngineering;
}

export interface FeatureEngineering {
  temporal_features: boolean;
  interaction_features: boolean;
  aggregation_features: AggregationFeature[];
  external_features: ExternalFeature[];
  feature_transformations: FeatureTransformation[];
}

export interface AggregationFeature {
  name: string;
  source_field: string;
  aggregation_type: 'count' | 'sum' | 'mean' | 'std' | 'min' | 'max' | 'percentile';
  time_window: string;
  group_by?: string[];
}

export interface ExternalFeature {
  name: string;
  source: 'threat_intelligence' | 'vulnerability_feeds' | 'geopolitical' | 'economic' | 'seasonal';
  update_frequency: string;
  data_quality: number;
}

export interface FeatureTransformation {
  name: string;
  transformation_type: 'log' | 'sqrt' | 'reciprocal' | 'polynomial' | 'binning' | 'scaling';
  parameters: Record<string, any>;
}

export interface PredictionResult {
  id: string;
  timestamp: string;
  prediction_date: string;
  predicted_value: number;
  confidence_interval: {
    lower: number;
    upper: number;
    confidence_level: number;
  };
  probability_distribution?: Record<string, number>;
  feature_contributions: Record<string, number>;
  model_id: string;
  explanation: PredictionExplanation;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommended_actions: string[];
}

export interface PredictionExplanation {
  key_drivers: string[];
  trend_analysis: string;
  seasonal_factors: string[];
  external_factors: string[];
  uncertainty_factors: string[];
  confidence_rationale: string;
}

// Auto-Classification Types
export interface ClassificationModel {
  id: string;
  name: string;
  model_type: 'naive_bayes' | 'svm' | 'random_forest' | 'neural_network' | 'transformer' | 'ensemble';
  classification_target: 'threat_type' | 'malware_family' | 'attack_technique' | 'threat_actor' | 'campaign';
  classes: ClassDefinition[];
  training_data: TrainingDataset;
  performance: ModelPerformance;
  last_trained: string;
  status: 'training' | 'ready' | 'degraded' | 'failed';
  text_processing: TextProcessingConfig;
  feature_extraction: FeatureExtractionConfig;
}

export interface ClassDefinition {
  id: string;
  name: string;
  description: string;
  examples: string[];
  keywords: string[];
  patterns: string[];
  confidence_threshold: number;
  color: string;
  icon?: string;
}

export interface TextProcessingConfig {
  tokenization: 'word' | 'subword' | 'character';
  lowercase: boolean;
  remove_stopwords: boolean;
  stemming: boolean;
  lemmatization: boolean;
  remove_punctuation: boolean;
  min_word_length: number;
  max_features: number;
  ngram_range: [number, number];
}

export interface FeatureExtractionConfig {
  vectorization: 'tfidf' | 'word2vec' | 'doc2vec' | 'bert' | 'fasttext';
  dimensionality: number;
  context_window?: number;
  pretrained_model?: string;
  fine_tuning: boolean;
}

export interface ClassificationResult {
  id: string;
  timestamp: string;
  input_text: string;
  predicted_class: string;
  confidence: number;
  probability_distribution: Record<string, number>;
  model_id: string;
  feature_importance: Record<string, number>;
  explanation: ClassificationExplanation;
  human_verified?: boolean;
  feedback?: ClassificationFeedback;
}

export interface ClassificationExplanation {
  key_features: string[];
  text_highlights: TextHighlight[];
  similar_examples: string[];
  confidence_rationale: string;
  alternative_classifications: Array<{
    class: string;
    probability: number;
    reasoning: string;
  }>;
}

export interface TextHighlight {
  text: string;
  start_pos: number;
  end_pos: number;
  importance: number;
  feature_type: 'keyword' | 'pattern' | 'context' | 'semantic';
}

export interface ClassificationFeedback {
  user_id: string;
  timestamp: string;
  correct_class: string;
  feedback_type: 'correction' | 'confirmation' | 'uncertainty';
  notes?: string;
  confidence: number;
}

// Behavioral Analysis Types
export interface BehavioralModel {
  id: string;
  name: string;
  entity_type: 'threat_actor' | 'malware' | 'campaign' | 'technique' | 'infrastructure';
  analysis_type: 'sequence' | 'pattern' | 'evolution' | 'clustering' | 'network';
  training_data: TrainingDataset;
  model_parameters: BehavioralParameters;
  behavioral_profiles: BehavioralProfile[];
  last_updated: string;
  status: 'training' | 'ready' | 'degraded' | 'failed';
}

export interface BehavioralParameters {
  sequence_length: number;
  similarity_threshold: number;
  clustering_algorithm: 'kmeans' | 'dbscan' | 'hierarchical' | 'spectral';
  distance_metric: 'euclidean' | 'cosine' | 'jaccard' | 'hamming';
  time_decay_factor: number;
  novelty_threshold: number;
}

export interface BehavioralProfile {
  id: string;
  entity_id: string;
  entity_name: string;
  profile_type: 'baseline' | 'current' | 'anomalous' | 'predicted';
  behavioral_patterns: BehavioralPattern[];
  statistical_summary: BehavioralStatistics;
  evolution_timeline: EvolutionPoint[];
  confidence: number;
  last_updated: string;
}

export interface BehavioralPattern {
  id: string;
  pattern_type: 'sequence' | 'frequency' | 'timing' | 'relationship' | 'resource_usage';
  pattern_data: Record<string, any>;
  frequency: number;
  first_observed: string;
  last_observed: string;
  confidence: number;
  examples: string[];
  variations: PatternVariation[];
}

export interface PatternVariation {
  variation_id: string;
  description: string;
  similarity_score: number;
  frequency: number;
  context: string;
}

export interface BehavioralStatistics {
  activity_frequency: Record<string, number>;
  time_patterns: Record<string, number>;
  technique_preferences: Record<string, number>;
  target_preferences: Record<string, number>;
  tool_preferences: Record<string, number>;
  infrastructure_patterns: Record<string, any>;
  evolution_rate: number;
  predictability_score: number;
}

export interface EvolutionPoint {
  timestamp: string;
  changes: BehavioralChange[];
  significance: number;
  context: string;
  trigger_events?: string[];
}

export interface BehavioralChange {
  change_type: 'new_technique' | 'technique_modification' | 'target_shift' | 'tool_change' | 'infrastructure_change';
  description: string;
  impact_score: number;
  confidence: number;
  evidence: string[];
}

export interface BehavioralAnomaly {
  id: string;
  timestamp: string;
  entity_id: string;
  entity_type: string;
  anomaly_type: 'deviation' | 'novelty' | 'evolution' | 'clustering_change';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  behavioral_context: BehavioralContext;
  evidence: BehavioralEvidence[];
  recommendations: string[];
  status: 'new' | 'investigating' | 'confirmed' | 'false_positive' | 'resolved';
}

export interface BehavioralContext {
  baseline_profile: string;
  current_behavior: Record<string, any>;
  deviation_metrics: Record<string, number>;
  temporal_context: string;
  related_entities: string[];
}

export interface BehavioralEvidence {
  evidence_type: 'statistical' | 'pattern' | 'sequence' | 'frequency' | 'timing';
  evidence_data: Record<string, any>;
  confidence: number;
  source: string;
  timestamp: string;
}

// Natural Language Processing Types
export interface NLPModel {
  id: string;
  name: string;
  model_type: 'bert' | 'gpt' | 'spacy' | 'custom_transformer' | 'rule_based' | 'hybrid';
  task_type: 'named_entity_recognition' | 'relation_extraction' | 'sentiment_analysis' | 'summarization' | 'classification';
  language: string;
  model_version: string;
  performance: ModelPerformance;
  configuration: NLPConfiguration;
  entity_types: EntityType[];
  relation_types: RelationType[];
  last_updated: string;
  status: 'training' | 'ready' | 'degraded' | 'failed';
}

export interface NLPConfiguration {
  max_sequence_length: number;
  batch_size: number;
  learning_rate: number;
  fine_tuning_layers: number;
  dropout_rate: number;
  attention_heads: number;
  hidden_size: number;
  vocabulary_size: number;
  preprocessing: TextProcessingConfig;
}

export interface EntityType {
  id: string;
  name: string;
  description: string;
  examples: string[];
  patterns: string[];
  context_clues: string[];
  confidence_threshold: number;
  color: string;
  category: 'threat_actor' | 'malware' | 'technique' | 'infrastructure' | 'vulnerability' | 'ioc' | 'location' | 'organization';
}

export interface RelationType {
  id: string;
  name: string;
  description: string;
  source_entity_types: string[];
  target_entity_types: string[];
  patterns: string[];
  examples: string[];
  confidence_threshold: number;
}

export interface NLPExtractionResult {
  id: string;
  timestamp: string;
  source_text: string;
  source_id: string;
  source_type: 'report' | 'article' | 'social_media' | 'forum' | 'email' | 'document';
  extracted_entities: ExtractedEntity[];
  extracted_relations: ExtractedRelation[];
  sentiment_analysis?: SentimentResult;
  text_summary?: string;
  key_phrases: string[];
  language_detected: string;
  confidence: number;
  processing_time: number;
}

export interface ExtractedEntity {
  id: string;
  text: string;
  entity_type: string;
  start_pos: number;
  end_pos: number;
  confidence: number;
  normalized_form?: string;
  context: string;
  attributes: Record<string, any>;
  linked_entities?: string[];
  verification_status: 'unverified' | 'verified' | 'disputed' | 'false_positive';
}

export interface ExtractedRelation {
  id: string;
  relation_type: string;
  source_entity: string;
  target_entity: string;
  confidence: number;
  context: string;
  text_span: string;
  attributes: Record<string, any>;
  verification_status: 'unverified' | 'verified' | 'disputed' | 'false_positive';
}

export interface SentimentResult {
  overall_sentiment: 'positive' | 'negative' | 'neutral';
  sentiment_score: number;
  confidence: number;
  aspect_sentiments: AspectSentiment[];
  emotion_analysis?: EmotionAnalysis;
}

export interface AspectSentiment {
  aspect: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
}

export interface EmotionAnalysis {
  primary_emotion: string;
  emotion_scores: Record<string, number>;
  confidence: number;
}

// ML Pipeline and Orchestration Types
export interface MLPipeline {
  id: string;
  name: string;
  description: string;
  pipeline_type: 'training' | 'inference' | 'evaluation' | 'data_processing';
  stages: PipelineStage[];
  schedule: PipelineSchedule;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'scheduled';
  last_run: string;
  next_run?: string;
  metrics: PipelineMetrics;
  dependencies: string[];
}

export interface PipelineStage {
  id: string;
  name: string;
  stage_type: 'data_ingestion' | 'preprocessing' | 'feature_engineering' | 'training' | 'evaluation' | 'deployment';
  configuration: Record<string, any>;
  inputs: string[];
  outputs: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  execution_time?: number;
  error_message?: string;
  artifacts: PipelineArtifact[];
}

export interface PipelineSchedule {
  enabled: boolean;
  cron_expression?: string;
  triggers: PipelineTrigger[];
  retry_policy: RetryPolicy;
}

export interface PipelineTrigger {
  trigger_type: 'schedule' | 'data_change' | 'model_degradation' | 'manual' | 'external_event';
  configuration: Record<string, any>;
  enabled: boolean;
}

export interface RetryPolicy {
  max_retries: number;
  retry_delay: number;
  backoff_strategy: 'linear' | 'exponential' | 'fixed';
}

export interface PipelineMetrics {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  average_execution_time: number;
  resource_usage: ResourceUsage;
  data_quality_metrics: DataQuality;
}

export interface ResourceUsage {
  cpu_usage: number;
  memory_usage: number;
  storage_usage: number;
  gpu_usage?: number;
  network_io: number;
  cost_estimate: number;
}

export interface PipelineArtifact {
  id: string;
  name: string;
  artifact_type: 'model' | 'dataset' | 'metrics' | 'visualization' | 'report';
  file_path: string;
  size: number;
  created_at: string;
  metadata: Record<string, any>;
  version: string;
}

// ML Monitoring and Alerting Types
export interface ModelMonitoring {
  model_id: string;
  monitoring_config: MonitoringConfiguration;
  drift_detection: DriftDetectionConfig;
  performance_monitoring: PerformanceMonitoringConfig;
  data_quality_monitoring: DataQualityMonitoringConfig;
  alerts: ModelAlert[];
  metrics_history: ModelMetricsHistory[];
  last_checked: string;
}

export interface MonitoringConfiguration {
  enabled: boolean;
  check_frequency: string;
  alert_thresholds: AlertThresholds;
  monitoring_features: string[];
  baseline_period: string;
  comparison_period: string;
}

export interface DriftDetectionConfig {
  enabled: boolean;
  detection_methods: DriftDetectionMethod[];
  drift_threshold: number;
  feature_drift_threshold: number;
  window_size: number;
  reference_window: string;
}

export interface DriftDetectionMethod {
  method: 'kolmogorov_smirnov' | 'chi_squared' | 'population_stability_index' | 'js_divergence' | 'wasserstein';
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface PerformanceMonitoringConfig {
  enabled: boolean;
  metrics: string[];
  degradation_threshold: number;
  comparison_baseline: 'training' | 'validation' | 'production_baseline';
  alert_on_degradation: boolean;
}

export interface DataQualityMonitoringConfig {
  enabled: boolean;
  quality_checks: DataQualityCheck[];
  alert_threshold: number;
  check_frequency: string;
}

export interface DataQualityCheck {
  check_type: 'completeness' | 'uniqueness' | 'validity' | 'consistency' | 'accuracy';
  field_name?: string;
  expected_range?: [number, number];
  pattern?: string;
  reference_data?: string;
  threshold: number;
}

export interface AlertThresholds {
  performance_degradation: number;
  data_drift: number;
  data_quality: number;
  prediction_confidence: number;
  error_rate: number;
  latency: number;
}

export interface ModelAlert {
  id: string;
  timestamp: string;
  alert_type: 'performance_degradation' | 'data_drift' | 'data_quality' | 'prediction_anomaly' | 'system_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  model_id: string;
  description: string;
  metrics: Record<string, number>;
  recommended_actions: string[];
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'suppressed';
  assignee?: string;
  resolution_notes?: string;
}

export interface ModelMetricsHistory {
  timestamp: string;
  model_id: string;
  performance_metrics: Record<string, number>;
  data_quality_metrics: Record<string, number>;
  drift_metrics: Record<string, number>;
  system_metrics: ResourceUsage;
  prediction_distribution: Record<string, number>;
  feature_statistics: Record<string, FeatureStatistics>;
}

// Integration and API Types
export interface MLServiceAPI {
  anomaly_detection: AnomalyDetectionAPI;
  predictive_analytics: PredictiveAnalyticsAPI;
  auto_classification: AutoClassificationAPI;
  behavioral_analysis: BehavioralAnalysisAPI;
  nlp_processing: NLPProcessingAPI;
  model_management: ModelManagementAPI;
  pipeline_orchestration: PipelineOrchestrationAPI;
}

export interface AnomalyDetectionAPI {
  detectAnomalies(data: Record<string, any>[], modelId?: string): Promise<AnomalyDetection[]>;
  trainModel(config: AnomalyDetectionModel): Promise<string>;
  getAnomalies(filters?: AnomalyFilters): Promise<AnomalyDetection[]>;
  updateAnomalyStatus(anomalyId: string, status: string, notes?: string): Promise<void>;
  getModelPerformance(modelId: string): Promise<ModelPerformance>;
}

export interface PredictiveAnalyticsAPI {
  generatePredictions(modelId: string, inputData?: Record<string, any>): Promise<PredictionResult[]>;
  trainPredictiveModel(config: PredictiveModel): Promise<string>;
  getPredictions(filters?: PredictionFilters): Promise<PredictionResult[]>;
  validatePrediction(predictionId: string, actualValue: number): Promise<void>;
  getModelAccuracy(modelId: string, timeRange?: string): Promise<ModelPerformance>;
}

export interface AutoClassificationAPI {
  classifyText(text: string, modelId?: string): Promise<ClassificationResult>;
  trainClassificationModel(config: ClassificationModel): Promise<string>;
  getClassifications(filters?: ClassificationFilters): Promise<ClassificationResult[]>;
  provideFeedback(classificationId: string, feedback: ClassificationFeedback): Promise<void>;
  getModelPerformance(modelId: string): Promise<ModelPerformance>;
}

export interface BehavioralAnalysisAPI {
  analyzeBehavior(entityId: string, entityType: string): Promise<BehavioralProfile>;
  detectBehavioralAnomalies(entityId?: string): Promise<BehavioralAnomaly[]>;
  updateBehavioralProfile(profileId: string, data: Partial<BehavioralProfile>): Promise<void>;
  compareBehaviors(entityId1: string, entityId2: string): Promise<BehaviorComparison>;
  getBehavioralTrends(entityType: string, timeRange?: string): Promise<BehavioralTrend[]>;
}

export interface NLPProcessingAPI {
  extractEntities(text: string, modelId?: string): Promise<NLPExtractionResult>;
  processDocument(documentId: string, processingConfig?: NLPConfiguration): Promise<NLPExtractionResult>;
  trainNLPModel(config: NLPModel): Promise<string>;
  validateExtraction(extractionId: string, corrections: EntityCorrection[]): Promise<void>;
  getExtractionHistory(filters?: ExtractionFilters): Promise<NLPExtractionResult[]>;
}

export interface ModelManagementAPI {
  getAllModels(modelType?: string): Promise<MLModelInfo[]>;
  getModelDetails(modelId: string): Promise<MLModelInfo>;
  deployModel(modelId: string, deploymentConfig: DeploymentConfig): Promise<string>;
  retireModel(modelId: string): Promise<void>;
  compareModels(modelIds: string[]): Promise<ModelComparison>;
}

export interface PipelineOrchestrationAPI {
  createPipeline(pipeline: MLPipeline): Promise<string>;
  runPipeline(pipelineId: string, parameters?: Record<string, any>): Promise<string>;
  getPipelineStatus(pipelineId: string): Promise<PipelineStatus>;
  getPipelineHistory(pipelineId: string): Promise<PipelineExecution[]>;
  schedulePipeline(pipelineId: string, schedule: PipelineSchedule): Promise<void>;
}

// Filter and Query Types
export interface AnomalyFilters {
  modelId?: string;
  severity?: string[];
  status?: string[];
  timeRange?: TimeRange;
  confidenceRange?: [number, number];
  assignee?: string;
}

export interface PredictionFilters {
  modelId?: string;
  predictionTarget?: string;
  timeRange?: TimeRange;
  confidenceRange?: [number, number];
  riskLevel?: string[];
}

export interface ClassificationFilters {
  modelId?: string;
  predictedClass?: string[];
  confidenceRange?: [number, number];
  humanVerified?: boolean;
  timeRange?: TimeRange;
}

export interface ExtractionFilters {
  modelId?: string;
  entityTypes?: string[];
  sourceType?: string[];
  timeRange?: TimeRange;
  confidenceRange?: [number, number];
  verificationStatus?: string[];
}

export interface TimeRange {
  start: string;
  end: string;
}

// Additional Supporting Types
export interface BehaviorComparison {
  entity1_id: string;
  entity2_id: string;
  similarity_score: number;
  common_patterns: BehavioralPattern[];
  differences: BehavioralDifference[];
  comparison_metrics: Record<string, number>;
}

export interface BehavioralDifference {
  aspect: string;
  entity1_value: any;
  entity2_value: any;
  significance: number;
  description: string;
}

export interface BehavioralTrend {
  timestamp: string;
  entity_type: string;
  trend_metrics: Record<string, number>;
  emerging_patterns: BehavioralPattern[];
  declining_patterns: BehavioralPattern[];
  significance: number;
}

export interface EntityCorrection {
  entity_id: string;
  correct_type: string;
  correct_text?: string;
  feedback_type: 'correction' | 'addition' | 'deletion';
  confidence: number;
}

export interface MLModelInfo {
  id: string;
  name: string;
  type: string;
  version: string;
  status: string;
  performance: ModelPerformance;
  deployment_info?: DeploymentInfo;
  created_at: string;
  last_updated: string;
}

export interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  resource_allocation: ResourceAllocation;
  scaling_config: ScalingConfig;
  monitoring_config: MonitoringConfiguration;
}

export interface DeploymentInfo {
  environment: string;
  deployment_date: string;
  endpoint_url?: string;
  resource_usage: ResourceUsage;
  health_status: 'healthy' | 'degraded' | 'unhealthy';
}

export interface ResourceAllocation {
  cpu_cores: number;
  memory_gb: number;
  storage_gb: number;
  gpu_count?: number;
}

export interface ScalingConfig {
  min_instances: number;
  max_instances: number;
  target_cpu_utilization: number;
  scale_up_threshold: number;
  scale_down_threshold: number;
}

export interface ModelComparison {
  models: MLModelInfo[];
  comparison_metrics: Record<string, Record<string, number>>;
  recommendations: string[];
  best_performing_model: string;
}

export interface PipelineStatus {
  pipeline_id: string;
  status: string;
  current_stage?: string;
  progress_percentage: number;
  start_time?: string;
  estimated_completion?: string;
  stages_status: Record<string, string>;
}

export interface PipelineExecution {
  execution_id: string;
  pipeline_id: string;
  start_time: string;
  end_time?: string;
  status: string;
  trigger_type: string;
  stages_execution: StageExecution[];
  artifacts_generated: PipelineArtifact[];
  resource_usage: ResourceUsage;
}

export interface StageExecution {
  stage_id: string;
  start_time: string;
  end_time?: string;
  status: string;
  execution_time?: number;
  resource_usage: ResourceUsage;
  outputs: Record<string, any>;
  error_details?: string;
}